/** 코인 입금 API 공용 응답 빌더 */
import { prisma } from "../prisma";
import { cryptoDepositDTO } from "../serializers";
import { ASSETS, ASSET_ORDER, cryptoEnv } from "./config";
import { configuredChains, ensureWallet } from "./scan";
import { getUsdPrices } from "./providers";

export async function userCryptoState(userId: string, opts: { create: boolean }) {
  const chains = configuredChains();
  const { minDepositUsd } = cryptoEnv();
  if (!chains.length) return { configured: false as const, assets: [], prices: null, minDepositUsd, deposits: [], walletId: null };
  const wallet = opts.create ? await ensureWallet(userId) : await prisma.cryptoWallet.findUnique({ where: { userId }, include: { addresses: true } });
  const [prices, deposits] = await Promise.all([
    getUsdPrices().catch(() => null),
    prisma.cryptoDeposit.findMany({ where: { userId }, orderBy: { detectedAt: "desc" }, take: 20 }),
  ]);
  const byChain = new Map((wallet?.addresses ?? []).map((a) => [a.chain as string, a.address]));
  const assets = ASSET_ORDER.filter((id) => byChain.has(ASSETS[id].chain)).map((id) => ({ id, address: byChain.get(ASSETS[id].chain)! }));
  return { configured: true as const, assets, prices, minDepositUsd, deposits: deposits.map(cryptoDepositDTO), walletId: wallet?.id ?? null };
}
