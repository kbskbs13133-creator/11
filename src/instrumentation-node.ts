/**
 * 자체 서버(next start / next dev)에서 운영할 때 node-cron 으로 매일 00:00(KST) 배치를 실행한다.
 * Vercel 배포 시에는 vercel.json 의 Cron 이 /api/cron/daily-interest 를 호출하므로 비활성화.
 */
import cron from "node-cron";
import { runDailyBatch } from "./lib/batch";

const g = globalThis as unknown as { __dailyCronRegistered?: boolean };

if (process.env.ENABLE_NODE_CRON === "true" && !process.env.VERCEL && !g.__dailyCronRegistered) {
  g.__dailyCronRegistered = true; // dev 핫리로드 중복 등록 방지

  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const r = await runDailyBatch({ trigger: "NODE" });
        console.log(
          `[node-cron] 일일 배치 완료 ${r.targetDate}: 이자 ${r.interestCount}건 / ${r.totalInterest}P, 만기 ${r.completedCount}건`
        );
      } catch (e) {
        console.error("[node-cron] 일일 배치 실패", e);
      }
    },
    { timezone: "Asia/Seoul" }
  );
  console.log("[node-cron] 일일 이자 배치 스케줄 등록 (매일 00:00 Asia/Seoul)");
}
