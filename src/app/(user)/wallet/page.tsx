import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { transactionDTO } from "@/lib/serializers";
import { s2 } from "@/lib/money";
import Wallet from "./Wallet";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("지갑");

export default async function WalletPage() {
  const me = await requireUserPage();
  const [list, summary] = await Promise.all([
    prisma.pointTransaction.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    getBalanceSummary(me.id),
  ]);
  return (
    <Wallet
      initial={{
        transactions: list.map(transactionDTO),
        balance: s2(summary.balance)!,
        pendingWithdraw: s2(summary.pendingWithdraw)!,
        available: s2(summary.available)!,
      }}
    />
  );
}
