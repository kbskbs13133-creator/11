import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./api";

type Tx = Prisma.TransactionClient;

/**
 * 트랜잭션 내에서 유저 행을 잠금(SELECT ... FOR UPDATE) 한 뒤 최신 상태를 반환.
 * 예치/환전 신청/승인 등 잔액에 영향을 주는 작업을 직렬화하여 이중 사용을 방지한다.
 */
export async function lockUser(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId }, include: { vip: true } });
  if (!user) throw new ApiError(404, "회원을 찾을 수 없습니다.");
  return user;
}

/** 처리중(PENDING) 환전 신청 합계 */
export async function pendingWithdrawSum(db: Tx | typeof prisma, userId: string) {
  const agg = await db.pointTransaction.aggregate({
    where: { userId, type: "WITHDRAW", status: "PENDING" },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? new Prisma.Decimal(0);
}

/** 사용 가능 포인트 = 보유 포인트 - 처리중 환전 신청액 */
export async function getBalanceSummary(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { vip: true } });
  const pending = await pendingWithdrawSum(prisma, userId);
  return { user, balance: user.pointBalance, pendingWithdraw: pending, available: user.pointBalance.sub(pending) };
}
