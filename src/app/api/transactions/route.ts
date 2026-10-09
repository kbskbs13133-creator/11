import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { transactionRequestSchema } from "@/lib/validators";
import { transactionDTO } from "@/lib/serializers";
import { getBalanceSummary, lockUser, pendingWithdrawSum } from "@/lib/balance";
import { s2, toDec } from "@/lib/money";
import { formatAmount } from "@/lib/format";

export const dynamic = "force-dynamic";

/** 내 신청 내역 + 잔액 요약 (지갑 화면 폴링용) */
export const GET = handler(async () => {
  const me = await requireUserApi();
  const [transactions, summary] = await Promise.all([
    prisma.pointTransaction.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    getBalanceSummary(me.id),
  ]);
  return ok({
    transactions: transactions.map(transactionDTO),
    balance: s2(summary.balance),
    pendingWithdraw: s2(summary.pendingWithdraw),
    available: s2(summary.available),
  });
});

/** 충전 / 환전 신청 → 상태 PENDING (관리자 승인 시 실제 반영) */
export const POST = handler(async (req: Request) => {
  const me = await requireUserApi();
  const body = transactionRequestSchema.parse(await req.json());
  const amount = toDec(body.amount);

  const tx = await prisma.$transaction(async (db) => {
    if (body.type === "WITHDRAW") {
      const user = await lockUser(db, me.id);
      const available = user.pointBalance.sub(await pendingWithdrawSum(db, me.id));
      if (amount.gt(available)) {
        throw new ApiError(400, `환전 가능 포인트가 부족합니다. (가능: ${formatAmount(available.toFixed(2))})`);
      }
    }
    return db.pointTransaction.create({
      data: { userId: me.id, type: body.type, amount, memo: body.memo || null, status: "PENDING" },
    });
  });

  return ok({ transaction: transactionDTO(tx) }, 201);
});
