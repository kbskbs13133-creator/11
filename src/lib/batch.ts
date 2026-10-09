import { Prisma, type BatchTrigger } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, dateKey, diffDays, kstToday } from "./date";
import { calcDailyInterest, sumDecimals } from "./interest";

export type BatchResult = {
  batchRunId: string;
  targetDate: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  scanned: number;
  processedCount: number;
  interestCount: number;
  totalInterest: string;
  completedCount: number;
  failedCount: number;
  errors: string[];
};

type DepositOutcome = { interestCount: number; totalInterest: Prisma.Decimal; matured: boolean } | null;

/**
 * 예치 1건 처리 (하나의 $transaction)
 *  1. 마지막 지급일 다음 날 ~ min(기준일, 만기일) 까지 지급되지 않은 날짜별 일할 이자 계산
 *     (배치가 며칠 누락되어도 다음 실행 때 누락분을 날짜별로 정확히 보정 지급)
 *  2. User.pointBalance 증가 + InterestLog 기록 (depositId+interestDate 유니크로 중복 지급 차단)
 *  3. 기준일 >= 만기일이면 원금 반환 + 상태 COMPLETED
 *  - lastInterestDate 를 조건으로 한 낙관적 잠금으로 동시 실행 시에도 1회만 처리
 */
async function processDeposit(depositId: string, today: Date, batchRunId: string): Promise<DepositOutcome> {
  return prisma.$transaction(async (tx) => {
    const d = await tx.deposit.findUnique({ where: { id: depositId } });
    if (!d || d.status !== "ACTIVE") return null;

    const payUntil = today < d.endDate ? today : d.endDate;
    const matured = today >= d.endDate;
    const from = addDays(d.lastInterestDate ?? d.startDate, 1);

    const payments: { date: Date; dayIndex: number; amount: Prisma.Decimal }[] = [];
    for (let date = from; date <= payUntil; date = addDays(date, 1)) {
      const dayIndex = diffDays(d.startDate, date); // 1 ~ termDays
      if (dayIndex < 1 || dayIndex > d.termDays) continue;
      payments.push({ date, dayIndex, amount: calcDailyInterest(dayIndex, d.termDays, d.expectedInterest) });
    }
    if (payments.length === 0 && !matured) return null;

    const totalInterest = sumDecimals(payments.map((p) => p.amount));
    const principalReturn = matured ? d.principal : new Prisma.Decimal(0);
    const now = new Date();

    // 낙관적 잠금: 다른 실행이 먼저 처리했다면 count = 0
    const locked = await tx.deposit.updateMany({
      where: { id: d.id, status: "ACTIVE", lastInterestDate: d.lastInterestDate },
      data: {
        accruedInterest: { increment: totalInterest },
        ...(payments.length > 0 ? { lastInterestDate: payUntil } : {}),
        ...(matured ? { status: "COMPLETED", completedAt: now } : {}),
      },
    });
    if (locked.count === 0) return null;

    const user = await tx.user.update({
      where: { id: d.userId },
      data: { pointBalance: { increment: totalInterest.add(principalReturn) } },
      select: { pointBalance: true },
    });

    if (payments.length > 0) {
      // 지급 후 잔액(balanceAfter) 계산: 이자 → 원금 반환 순으로 반영되었다고 보고 역산
      let running = user.pointBalance.sub(totalInterest).sub(principalReturn);
      await tx.interestLog.createMany({
        data: payments.map((p) => {
          running = running.add(p.amount);
          return {
            depositId: d.id,
            userId: d.userId,
            interestDate: p.date,
            dayIndex: p.dayIndex,
            amount: p.amount,
            balanceAfter: running,
            batchRunId,
          };
        }),
      });
    }

    return { interestCount: payments.length, totalInterest, matured };
  });
}

/**
 * 일일 배치: ACTIVE 예치건 전체에 대해 이자 지급 + 만기 해제
 * @param targetDate 기준일 (KST 날짜, 기본값: 오늘). 테스트용으로 관리자가 지정 가능
 */
export async function runDailyBatch(opts: { trigger: BatchTrigger; targetDate?: Date }): Promise<BatchResult> {
  const today = opts.targetDate ?? kstToday();
  const run = await prisma.batchRun.create({ data: { trigger: opts.trigger, targetDate: today } });

  const targets = await prisma.deposit.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ lastInterestDate: null }, { lastInterestDate: { lt: today } }, { endDate: { lte: today } }],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let processedCount = 0;
  let interestCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let totalInterest = new Prisma.Decimal(0);
  const errors: string[] = [];

  for (const { id } of targets) {
    try {
      const r = await processDeposit(id, today, run.id);
      if (!r) continue;
      if (r.interestCount > 0) processedCount++;
      interestCount += r.interestCount;
      totalInterest = totalInterest.add(r.totalInterest);
      if (r.matured) completedCount++;
    } catch (e) {
      failedCount++;
      errors.push(`${id}: ${(e as Error).message}`);
      console.error(`[batch] deposit ${id} 처리 실패`, e);
    }
  }

  const status = failedCount === 0 ? "SUCCESS" : failedCount === targets.length ? "FAILED" : "PARTIAL";
  await prisma.batchRun.update({
    where: { id: run.id },
    data: {
      status,
      processedCount,
      interestCount,
      totalInterest,
      completedCount,
      failedCount,
      errorMessage: errors.length ? errors.slice(0, 50).join("\n") : null,
      finishedAt: new Date(),
    },
  });

  return {
    batchRunId: run.id,
    targetDate: dateKey(today),
    status,
    scanned: targets.length,
    processedCount,
    interestCount,
    totalInterest: totalInterest.toFixed(2),
    completedCount,
    failedCount,
    errors,
  };
}
