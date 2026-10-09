import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ vipLevel: z.number().int().min(1, "VIP 등급은 1~5입니다.").max(5, "VIP 등급은 1~5입니다.") });

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdminApi();
  const { vipLevel } = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user || user.role !== "USER") throw new ApiError(404, "회원을 찾을 수 없습니다.");

  // 등급 변경은 이후 신규 예치부터 적용 (기존 예치는 스냅샷 이율 유지)
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { vipLevel },
    select: { id: true, vipLevel: true },
  });
  return ok({ user: updated });
});
