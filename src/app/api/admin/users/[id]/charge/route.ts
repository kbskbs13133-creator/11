import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { amountSchema } from "@/lib/validators";
import { lockUser } from "@/lib/balance";
import { s2, toDec } from "@/lib/money";

export const dynamic = "force-dynamic";

const schema = z.object({ amount: amountSchema, memo: z.string().trim().max(200).optional() });

/** 관리자 포인트 직접 충전 → 즉시 반영 + ADMIN_CHARGE(APPROVED) 기록 */
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const admin = await requireAdminApi();
  const body = schema.parse(await req.json());
  const amount = toDec(body.amount);

  const user = await prisma.$transaction(async (db) => {
    const u = await lockUser(db, params.id);
    if (u.role !== "USER") throw new ApiError(400, "일반 회원에게만 충전할 수 있습니다.");
    const updated = await db.user.update({ where: { id: u.id }, data: { pointBalance: { increment: amount } } });
    await db.pointTransaction.create({
      data: {
        userId: u.id,
        type: "ADMIN_CHARGE",
        amount,
        status: "APPROVED",
        memo: body.memo || "관리자 직접 충전",
        processedById: admin.id,
        processedAt: new Date(),
        balanceAfter: updated.pointBalance,
      },
    });
    return updated;
  });

  return ok({ user: { id: user.id, pointBalance: s2(user.pointBalance) } });
});
