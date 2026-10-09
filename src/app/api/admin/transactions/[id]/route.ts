import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { lockUser } from "@/lib/balance";
import { transactionDTO } from "@/lib/serializers";
import { formatAmount } from "@/lib/format";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1, "거절 사유를 입력해주세요.").max(200) }),
]);

/** 충전/환전 신청 승인 또는 거절 */
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const admin = await requireAdminApi();
  const body = schema.parse(await req.json());

  const result = await prisma.$transaction(async (db) => {
    const t = await db.pointTransaction.findUnique({ where: { id: params.id } });
    if (!t) throw new ApiError(404, "신청 내역을 찾을 수 없습니다.");
    if (t.type === "ADMIN_CHARGE") throw new ApiError(400, "관리자 충전 내역은 처리 대상이 아닙니다.");

    // 유저 행 잠금 → 잔액 변경 직렬화
    const user = await lockUser(db, t.userId);

    // PENDING 인 경우에만 상태 변경 (동시 승인/중복 처리 방지)
    const now = new Date();
    if (body.action === "reject") {
      const res = await db.pointTransaction.updateMany({
        where: { id: t.id, status: "PENDING" },
        data: { status: "REJECTED", rejectReason: body.reason, processedById: admin.id, processedAt: now },
      });
      if (res.count === 0) throw new ApiError(409, "이미 처리된 신청입니다.");
      return db.pointTransaction.findUniqueOrThrow({ where: { id: t.id } });
    }

    // 승인: 실제 포인트 증감
    let balanceAfter;
    if (t.type === "CHARGE") {
      balanceAfter = user.pointBalance.add(t.amount);
    } else {
      if (user.pointBalance.lt(t.amount)) {
        throw new ApiError(400, `회원 잔액이 부족하여 승인할 수 없습니다. (현재 잔액: ${formatAmount(user.pointBalance.toFixed(2))})`);
      }
      balanceAfter = user.pointBalance.sub(t.amount);
    }

    const res = await db.pointTransaction.updateMany({
      where: { id: t.id, status: "PENDING" },
      data: { status: "APPROVED", processedById: admin.id, processedAt: now, balanceAfter },
    });
    if (res.count === 0) throw new ApiError(409, "이미 처리된 신청입니다.");

    await db.user.update({
      where: { id: t.userId },
      data: { pointBalance: t.type === "CHARGE" ? { increment: t.amount } : { decrement: t.amount } },
    });
    return db.pointTransaction.findUniqueOrThrow({ where: { id: t.id } });
  });

  return ok({ transaction: transactionDTO(result) });
});
