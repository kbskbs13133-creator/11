import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { scanWallet } from "@/lib/crypto/scan";
import { cryptoDepositDTO } from "@/lib/serializers";
import { getBalanceSummary } from "@/lib/balance";
import { s2 } from "@/lib/money";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_INTERVAL_MS = 15_000; // 회원별 체인 조회 최소 간격 (무료 API 한도 보호)

/** 충전 화면이 열려 있는 동안 주기적으로 호출 → 내 주소만 즉시 확인 */
export const POST = handler(async () => {
  const me = await requireUserApi();
  const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: me.id } });
  let scanned = false;
  let credited = 0;
  if (wallet && (!wallet.lastScannedAt || Date.now() - wallet.lastScannedAt.getTime() >= MIN_INTERVAL_MS)) {
    const r = await scanWallet(wallet.id);
    scanned = true;
    credited = r.credited;
  }
  const [deposits, summary] = await Promise.all([
    prisma.cryptoDeposit.findMany({ where: { userId: me.id }, orderBy: { detectedAt: "desc" }, take: 20 }),
    getBalanceSummary(me.id),
  ]);
  return ok({ scanned, credited, deposits: deposits.map(cryptoDepositDTO), balance: s2(summary.balance), available: s2(summary.available) });
});
