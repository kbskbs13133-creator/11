import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { runDailyBatch } from "@/lib/batch";
import { kstToday, parseDateOnly, diffDays } from "@/lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 최근 배치 실행 이력 */
export const GET = handler(async () => {
  await requireAdminApi();
  const runs = await prisma.batchRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
  return ok({
    runs: runs.map((r) => ({ ...r, targetDate: r.targetDate.toISOString(), totalInterest: r.totalInterest.toFixed(2) })),
  });
});

const schema = z.object({ targetDate: z.string().optional() });

/** 관리자 수동 실행 (로컬 테스트용). targetDate 지정 시 해당 날짜 기준으로 시뮬레이션 */
export const POST = handler(async (req: Request) => {
  await requireAdminApi();
  const body = schema.parse(await req.json().catch(() => ({})));
  let targetDate: Date | undefined;
  if (body.targetDate) {
    try {
      targetDate = parseDateOnly(body.targetDate);
    } catch (e) {
      throw new ApiError(400, (e as Error).message);
    }
    if (Math.abs(diffDays(kstToday(), targetDate)) > 3650) throw new ApiError(400, "기준일 범위가 올바르지 않습니다.");
  }
  const result = await runDailyBatch({ trigger: "MANUAL", targetDate });
  return ok(result);
});
