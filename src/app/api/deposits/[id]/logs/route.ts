import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { s2 } from "@/lib/money";

export const dynamic = "force-dynamic";

/** 내 예치건의 일별 이자 지급 로그 */
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireUserApi();
  const deposit = await prisma.deposit.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!deposit || deposit.userId !== me.id) throw new ApiError(404, "예치 내역을 찾을 수 없습니다.");
  const logs = await prisma.interestLog.findMany({ where: { depositId: params.id }, orderBy: { interestDate: "desc" } });
  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      interestDate: l.interestDate.toISOString(),
      dayIndex: l.dayIndex,
      amount: s2(l.amount),
      balanceAfter: s2(l.balanceAfter),
      createdAt: l.createdAt.toISOString(),
    })),
  });
});
