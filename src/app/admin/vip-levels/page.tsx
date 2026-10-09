import { prisma } from "@/lib/prisma";
import { vipDTO } from "@/lib/serializers";
import VipLevelForm from "./VipLevelForm";

export default async function AdminVipLevelsPage() {
  const [levels, counts] = await Promise.all([
    prisma.vipLevel.findMany({ orderBy: { level: "asc" } }),
    prisma.user.groupBy({ by: ["vipLevel"], where: { role: "USER" }, _count: true }),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c.vipLevel, c._count]));
  return <VipLevelForm initial={levels.map(vipDTO)} userCounts={countMap} />;
}
