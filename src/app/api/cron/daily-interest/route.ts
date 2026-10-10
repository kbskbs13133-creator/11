import { NextResponse } from "next/server";
import { runDailyBatch } from "@/lib/batch";
import { scanDue } from "@/lib/crypto/scan";

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
    // 안전장치: 하루 1번 전체 회원 코인 입금 주소도 확인 (외부 1분 cron 누락 대비)
    const crypto = await scanDue({ all: true, budgetMs: 20_000 }).catch((e) => ({ error: (e as Error).message }));
    return NextResponse.json({ ...result, crypto });
  } catch (e) {
    console.error("[cron] daily-interest 실패", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
