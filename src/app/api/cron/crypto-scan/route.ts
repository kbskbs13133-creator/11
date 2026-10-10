import { NextResponse } from "next/server";
import { scanDue } from "@/lib/crypto/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 코인 입금 자동 확인 (무료 외부 cron: cron-job.org 에서 1분마다 호출)
 * 헤더: Authorization: Bearer <CRON_SECRET>
 * cron-job.org 실행 제한(30초)에 맞춰 25초 안에서 처리하고, 남은 지갑은 다음 호출에서 이어서 처리.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const r = await scanDue({ budgetMs: 25_000 });
    return NextResponse.json({ ok: true, scanned: r.scanned, credited: r.credited, remaining: r.remaining, errors: r.errors.length, ms: r.ms });
  } catch (e) {
    console.error("[cron] crypto-scan 실패", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
export const POST = GET;
