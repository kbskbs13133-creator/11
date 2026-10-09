import { prisma } from "@/lib/prisma";
import { depositDTO } from "@/lib/serializers";
import { s2 } from "@/lib/money";
import type { DepositStatus, Prisma } from "@prisma/client";
import DepositMonitor from "./DepositMonitor";

export default async function AdminDepositsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const status = ["ACTIVE", "COMPLETED", "CANCELLED"].includes(searchParams.status ?? "") ? (searchParams.status as DepositStatus) : undefined;
  const q = searchParams.q?.trim() ?? "";
  const where: Prisma.DepositWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ user: { email: { contains: q, mode: "insensitive" } } }, { user: { name: { contains: q, mode: "insensitive" } } }, { productName: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [deposits, totals] = await Promise.all([
    prisma.deposit.findMany({ where, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.deposit.groupBy({ by: ["status"], _sum: { principal: true, accruedInterest: true }, _count: true }),
  ]);

  return (
    <DepositMonitor
      status={status ?? ""}
      q={q}
      totals={totals.map((t) => ({ status: t.status, count: t._count, principal: s2(t._sum.principal) ?? "0", interest: s2(t._sum.accruedInterest) ?? "0" }))}
      deposits={deposits.map((d) => ({ ...depositDTO(d), userName: d.user.name, userEmail: d.user.email }))}
    />
  );
}
