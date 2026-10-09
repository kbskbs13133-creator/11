import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { vipLevelsSchema } from "@/lib/validators";
import { vipDTO } from "@/lib/serializers";
import { toDec } from "@/lib/money";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdminApi();
  const levels = await prisma.vipLevel.findMany({ orderBy: { level: "asc" } });
  return ok({ levels: levels.map(vipDTO) });
});

export const PUT = handler(async (req: Request) => {
  await requireAdminApi();
  const { levels } = vipLevelsSchema.parse(await req.json());
  const set = new Set(levels.map((l) => l.level));
  if (set.size !== 5) throw new ApiError(400, "VIP 1~5 등급을 모두 입력해주세요.");

  const updated = await prisma.$transaction(
    levels.map((l) =>
      prisma.vipLevel.upsert({
        where: { level: l.level },
        update: { name: l.name, bonusRate: toDec(l.bonusRate) },
        create: { level: l.level, name: l.name, bonusRate: toDec(l.bonusRate) },
      })
    )
  );
  return ok({ levels: updated.sort((a, b) => a.level - b.level).map(vipDTO) });
});
