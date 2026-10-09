import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { lockUser } from "@/lib/balance";

export const dynamic = "force-dynamic";

/** 관리자 예치 강제 해지: 원금 반환 + CANCELLED (이미 지급된 이자는 유지) */
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdminApi();
  await prisma.$transaction(async (tx) => {
    const d = await tx.deposit.findUnique({ where: { id: params.id } });
    if (!d) throw new ApiError(404, "예치 내역을 찾을 수 없습니다.");
    await lockUser(tx, d.userId);
    const res = await tx.deposit.updateMany({
      where: { id: d.id, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (res.count === 0) throw new ApiError(409, "진행중인 예치만 해지할 수 있습니다.");
    await tx.user.update({ where: { id: d.userId }, data: { pointBalance: { increment: d.principal } } });
  });
  return ok({ success: true });
});
