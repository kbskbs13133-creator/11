import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { depositDTO } from "@/lib/serializers";
import MyDeposits from "./MyDeposits";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("내 예치");

export default async function MyDepositsPage() {
  const me = await requireUserPage();
  const deposits = await prisma.deposit.findMany({ where: { userId: me.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return <MyDeposits deposits={deposits.map(depositDTO)} />;
}
