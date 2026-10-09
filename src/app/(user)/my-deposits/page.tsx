import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { depositDTO } from "@/lib/serializers";
import MyDeposits from "./MyDeposits";

export const metadata = { title: "내 예치 | 포인트 예치 플랫폼" };

export default async function MyDepositsPage() {
  const me = await requireUserPage();
  const deposits = await prisma.deposit.findMany({ where: { userId: me.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return <MyDeposits deposits={deposits.map(depositDTO)} />;
}
