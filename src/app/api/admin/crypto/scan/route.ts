import { handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { scanDue } from "@/lib/crypto/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 관리자 수동 스캔: 감시 대상 지갑 즉시 확인 (all=1 이면 전체 지갑) */
export const POST = handler(async (req: Request) => {
  await requireAdminApi();
  const all = new URL(req.url).searchParams.get("all") === "1";
  const r = await scanDue({ budgetMs: 45_000, all });
  return ok(r);
});
