import { NextResponse } from "next/server";
import { runDailyBatch } from "@/lib/batch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 일일 이자 지급 배치 (Vercel Cron: vercel.json → 매일 15:00 UTC = 00:00 KST)
 * Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 헤더를 자동으로 붙여 호출한다.
 * 외부 cron(crontab 등)에서도 같은 헤더로 호출 가능.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDailyBatch({ trigger: "CRON" });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron] daily-interest 실패", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
