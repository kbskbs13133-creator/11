/** 관리자 화면용 코인 입금 설정 상태 / 통계 */
import { prisma } from "../prisma";
import { ASSETS, ASSET_ORDER, cryptoEnv, type CryptoChainId } from "./config";
import { deriveAddress, validateXpub } from "./hd";

export async function cryptoAdminConfig() {
  const env = cryptoEnv();
  const chains = (["TRON", "ETH", "BTC"] as CryptoChainId[]).map((chain) => {
    const err = validateXpub(env.xpub[chain]);
    return {
      chain,
      envName: `CRYPTO_XPUB_${chain}`,
      ok: !err,
      error: err,
      // HD 인덱스 0 = 회사 메인(회수) 주소 — 오프라인 도구에 표시된 주소와 같아야 함
      mainAddress: err ? null : deriveAddress(chain, env.xpub[chain], 0),
      assets: ASSET_ORDER.filter((a) => ASSETS[a].chain === chain),
    };
  });
  const last = await prisma.cryptoWallet.aggregate({ _max: { lastScannedAt: true }, _count: { _all: true } });
  return {
    chains,
    etherscanKey: !!env.etherscanKey,
    trongridKey: !!env.trongridKey,
    minDepositUsd: env.minDepositUsd,
    watchHours: env.watchHours,
    walletCount: last._count._all,
    lastScanAt: last._max.lastScannedAt?.toISOString() ?? null,
  };
}

export async function cryptoAdminStats() {
  const rows = await prisma.cryptoDeposit.groupBy({ by: ["asset", "status"], _sum: { amount: true, points: true }, _count: { _all: true } });
  return ASSET_ORDER.map((asset) => {
    const credited = rows.find((r) => r.asset === asset && r.status === "CREDITED");
    const pending = rows.filter((r) => r.asset === asset && r.status !== "CREDITED").reduce((s, r) => s + r._count._all, 0);
    return {
      asset,
      creditedCount: credited?._count._all ?? 0,
      creditedAmount: credited?._sum.amount?.toFixed(ASSETS[asset].displayDecimals) ?? "0",
      creditedPoints: credited?._sum.points?.toFixed(2) ?? "0.00",
      openCount: pending,
    };
  });
}
