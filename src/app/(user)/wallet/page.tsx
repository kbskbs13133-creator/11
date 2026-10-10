import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { cryptoDepositDTO, transactionDTO } from "@/lib/serializers";
import { configuredChains } from "@/lib/crypto/scan";
import { s2 } from "@/lib/money";
import Wallet from "./Wallet";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("지갑");

export default async function WalletPage() {
  const me = await requireUserPage();
  const [list, summary, cryptoPending] = await Promise.all([
    prisma.pointTransaction.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    getBalanceSummary(me.id),
    prisma.cryptoDeposit.findMany({ where: { userId: me.id, status: { in: ["PENDING", "BELOW_MIN"] } }, orderBy: { detectedAt: "desc" }, take: 10 }),
  ]);
  return (
    <Wallet
      initial={{
        transactions: list.map(transactionDTO),
        cryptoPending: cryptoPending.map(cryptoDepositDTO),
        balance: s2(summary.balance)!,
        pendingWithdraw: s2(summary.pendingWithdraw)!,
        available: s2(summary.available)!,
      }}
      cryptoEnabled={configuredChains().length > 0}
    />
  );
}
