import { prisma } from "@/lib/prisma";
import { s2, vipName } from "./helpers";
import UserTable from "./UserTable";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const [users, vipLevels, activeSums] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "USER",
        ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.vipLevel.findMany({ orderBy: { level: "asc" } }),
    prisma.deposit.groupBy({ by: ["userId"], where: { status: "ACTIVE" }, _sum: { principal: true }, _count: true }),
  ]);
  const sumMap = new Map(activeSums.map((s) => [s.userId, s]));

  return (
    <UserTable
      q={q}
      vipLevels={vipLevels.map((v) => ({ level: v.level, name: vipName(v) }))}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        vipLevel: u.vipLevel,
        pointBalance: s2(u.pointBalance),
        activePrincipal: s2(sumMap.get(u.id)?._sum.principal ?? null) ?? "0.00",
        activeCount: sumMap.get(u.id)?._count ?? 0,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
