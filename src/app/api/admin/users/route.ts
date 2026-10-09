import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { s2 } from "@/lib/money";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireAdminApi();
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return ok({
    users: users.map((u) => ({ id: u.id, email: u.email, name: u.name, vipLevel: u.vipLevel, pointBalance: s2(u.pointBalance), createdAt: u.createdAt })),
  });
});
