/**
 * 코인 입금 감지 → 컨펌 확인 → 포인트 자동 반영
 *  - 중복 반영 방지: CryptoDeposit.uniqueKey 유니크 + PENDING 조건부 updateMany + 유저 행 잠금
 *  - 1 USD = 1 P, USDT = 1 USD, BTC/ETH 는 반영 시점 바이낸스 시세
 */
import { Prisma, type CryptoChain } from "@prisma/client";
import { prisma } from "../prisma";
import { lockUser } from "../balance";
import { floor2, sPlain, toDec } from "../money";
import { ASSETS, cryptoEnv, type CryptoChainId } from "./config";
import { deriveAddress, validateXpub } from "./hd";
import { fetchTransfers, getUsdPrices, type Transfer } from "./providers";

const CHAINS: CryptoChainId[] = ["TRON", "ETH", "BTC"];

/** 설정된(유효한 xpub 가 있는) 체인 목록 */
export function configuredChains(): CryptoChainId[] {
  const { xpub } = cryptoEnv();
  return CHAINS.filter((c) => xpub[c] && !validateXpub(xpub[c]));
}

/** 회원 지갑/주소 준비 (없으면 생성). id = HD 인덱스(1부터) */
export async function ensureWallet(userId: string) {
  const { xpub } = cryptoEnv();
  let wallet = await prisma.cryptoWallet.findUnique({ where: { userId }, include: { addresses: true } });
  if (!wallet) {
    try {
      await prisma.cryptoWallet.create({ data: { userId } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
    wallet = await prisma.cryptoWallet.findUniqueOrThrow({ where: { userId }, include: { addresses: true } });
  }
  const have = new Set(wallet.addresses.map((a) => a.chain));
  const missing = configuredChains().filter((c) => !have.has(c as CryptoChain));
  if (missing.length) {
    await prisma.cryptoAddress.createMany({
      data: missing.map((chain) => ({ walletId: wallet!.id, userId, chain: chain as CryptoChain, address: deriveAddress(chain, xpub[chain], wallet!.id) })),
      skipDuplicates: true,
    });
    wallet = await prisma.cryptoWallet.findUniqueOrThrow({ where: { userId }, include: { addresses: true } });
  }
  return wallet;
}

/** 충전 화면을 열면 일정 시간 동안 1분 주기 자동 스캔 대상에 포함 */
export async function watchWallet(walletId: number) {
  const until = new Date(Date.now() + cryptoEnv().watchHours * 3600_000);
  await prisma.cryptoWallet.update({ where: { id: walletId }, data: { watchUntil: until } });
}

export type ScanResult = { walletId: number; found: number; credited: number; errors: string[] };

/** 입금 1건 반영 (PENDING → CREDITED / BELOW_MIN). 반영되면 true */
export async function creditDeposit(
  depositId: string,
  prices: { BTC: string; ETH: string; USDT: string } | null,
  opts: { ignoreMin?: boolean; requirePending?: boolean } = {}
): Promise<boolean> {
  const d = await prisma.cryptoDeposit.findUnique({ where: { id: depositId } });
  if (!d) return false;
  const allowed = opts.ignoreMin ? ["PENDING", "BELOW_MIN"] : ["PENDING"];
  if (!allowed.includes(d.status)) return false;
  const meta = ASSETS[d.asset];
  const price = meta.symbol === "USDT" ? "1" : prices?.[meta.symbol];
  if (!price) return false; // 시세 실패 → 다음 스캔에서 재시도
  const priceUsd = toDec(price);
  const points = floor2(d.amount.mul(priceUsd));
  const { minDepositUsd } = cryptoEnv();

  return prisma.$transaction(async (db) => {
    if (!opts.ignoreMin && points.lt(minDepositUsd)) {
      await db.cryptoDeposit.updateMany({ where: { id: d.id, status: "PENDING" }, data: { status: "BELOW_MIN", priceUsd, points } });
      return false;
    }
    if (points.lte(0)) return false;
    const claimed = await db.cryptoDeposit.updateMany({
      where: { id: d.id, status: { in: allowed as ("PENDING" | "BELOW_MIN")[] } },
      data: { status: "CREDITED", priceUsd, points, creditedAt: new Date() },
    });
    if (claimed.count === 0) return false; // 다른 요청이 이미 처리
    const user = await lockUser(db, d.userId);
    const balanceAfter = user.pointBalance.add(points);
    await db.user.update({ where: { id: user.id }, data: { pointBalance: balanceAfter } });
    const amountStr = sPlain(d.amount, meta.decimals);
    const tx = await db.pointTransaction.create({
      data: {
        userId: user.id,
        type: "CRYPTO_DEPOSIT",
        amount: points,
        status: "APPROVED",
        memo: `${amountStr} ${meta.symbol} · ${meta.network}${meta.symbol === "USDT" ? "" : ` · 1 ${meta.symbol} = $${priceUsd.toDecimalPlaces(2).toString()}`}`, // "@" 금지 (i18n 문맥 구분자)
        processedAt: new Date(),
        balanceAfter,
      },
    });
    await db.cryptoDeposit.update({ where: { id: d.id }, data: { transactionId: tx.id } });
    return true;
  });
}

async function upsertTransfers(userId: string, addressId: string, transfers: Transfer[]) {
  let found = 0;
  for (const t of transfers) {
    const amount = toDec(t.amount);
    if (amount.lte(0)) continue;
    const existing = await prisma.cryptoDeposit.findUnique({ where: { uniqueKey: t.uniqueKey } });
    if (!existing) {
      await prisma.cryptoDeposit.createMany({
        data: [{ userId, addressId, asset: t.asset, txHash: t.txHash, uniqueKey: t.uniqueKey, fromAddress: t.from, amount, confirmations: t.confirmations, blockTime: t.blockTime }],
        skipDuplicates: true,
      });
      found++;
    } else if (existing.status === "PENDING" && t.confirmations > existing.confirmations) {
      await prisma.cryptoDeposit.update({ where: { id: existing.id }, data: { confirmations: t.confirmations, blockTime: t.blockTime ?? existing.blockTime } });
    }
  }
  return found;
}

/** 회원 지갑 1개 스캔 + 컨펌 충족 건 반영 */
export async function scanWallet(walletId: number): Promise<ScanResult> {
  const wallet = await prisma.cryptoWallet.findUniqueOrThrow({ where: { id: walletId }, include: { addresses: true } });
  const errors: string[] = [];
  let found = 0;
  await Promise.all(
    wallet.addresses.map(async (a) => {
      try {
        found += await upsertTransfers(wallet.userId, a.id, await fetchTransfers(a.chain as CryptoChainId, a.address));
      } catch (e) {
        errors.push(`${a.chain}: ${(e as Error).message}`);
      }
    })
  );
  await prisma.cryptoWallet.update({ where: { id: walletId }, data: { lastScannedAt: new Date() } });

  // 컨펌 충족된 PENDING 건 반영
  const pending = await prisma.cryptoDeposit.findMany({ where: { userId: wallet.userId, status: "PENDING" } });
  const ready = pending.filter((d) => d.confirmations >= ASSETS[d.asset].confirmations);
  let credited = 0;
  if (ready.length) {
    let prices: Awaited<ReturnType<typeof getUsdPrices>> | null = null;
    if (ready.some((d) => ASSETS[d.asset].symbol !== "USDT")) {
      try {
        prices = await getUsdPrices();
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    for (const d of ready) {
      try {
        if (await creditDeposit(d.id, prices)) credited++;
      } catch (e) {
        errors.push(`반영 실패(${d.id}): ${(e as Error).message}`);
      }
    }
  }
  return { walletId, found, credited, errors };
}

/**
 * 자동 스캔 대상 지갑 순회 (외부 cron 1분 주기 / 관리자 수동 / 일일 배치)
 *  - 대상: 감시 기간(watchUntil) 내 지갑 + 컨펌 대기 입금이 있는 지갑 (all=true 면 전체)
 *  - 무료 API 한도를 위해: 최근 2시간 내 충전 화면을 연 지갑·대기건 있는 지갑은 1분, 나머지는 10분 간격
 *  - budgetMs 안에서만 처리하고, 오래 스캔 안 된 지갑부터 순서대로
 */
export async function scanDue({ budgetMs = 25_000, all = false }: { budgetMs?: number; all?: boolean } = {}) {
  const started = Date.now();
  const now = new Date();
  const { watchHours } = cryptoEnv();
  const hotAfter = new Date(now.getTime() + (watchHours - 2) * 3600_000);
  const pendingUsers = (await prisma.cryptoDeposit.findMany({ where: { status: "PENDING" }, select: { userId: true }, distinct: ["userId"] })).map((x) => x.userId);

  const wallets = await prisma.cryptoWallet.findMany({
    where: all ? { addresses: { some: {} } } : { OR: [{ watchUntil: { gt: now } }, { userId: { in: pendingUsers } }] },
    orderBy: [{ lastScannedAt: { sort: "asc", nulls: "first" } }],
    select: { id: true, userId: true, watchUntil: true, lastScannedAt: true },
    take: 500,
  });

  const due = wallets.filter((w) => {
    if (all || !w.lastScannedAt) return true;
    const hot = pendingUsers.includes(w.userId) || (w.watchUntil && w.watchUntil > hotAfter);
    const interval = hot ? 50_000 : 9.5 * 60_000;
    return now.getTime() - w.lastScannedAt.getTime() >= interval;
  });

  const results: ScanResult[] = [];
  for (const w of due) {
    if (Date.now() - started > budgetMs) break;
    results.push(await scanWallet(w.id));
  }
  return {
    candidates: wallets.length,
    scanned: results.length,
    remaining: due.length - results.length,
    found: results.reduce((s, r) => s + r.found, 0),
    credited: results.reduce((s, r) => s + r.credited, 0),
    errors: results.flatMap((r) => r.errors).slice(0, 20),
    ms: Date.now() - started,
  };
}
