import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { creditDeposit } from "@/lib/crypto/scan";
import { getUsdPrices } from "@/lib/crypto/providers";
import { ASSETS } from "@/lib/crypto/config";

export const dynamic = "force-dynamic";

/** 최소 입금액 미만(BELOW_MIN) 건 관리자 수동 반영 (현재 시세 적용) */
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdminApi();
  const d = await prisma.cryptoDeposit.findUnique({ where: { id: params.id } });
  if (!d) throw new ApiError(404, "입금 내역을 찾을 수 없습니다.");
  if (d.status !== "BELOW_MIN") throw new ApiError(409, "최소 금액 미만 건만 수동 반영할 수 있습니다.");
  if (d.confirmations < ASSETS[d.asset].confirmations) throw new ApiError(409, "아직 컨펌이 완료되지 않았습니다.");
  const prices = ASSETS[d.asset].symbol === "USDT" ? null : await getUsdPrices().catch(() => null);
  if (ASSETS[d.asset].symbol !== "USDT" && !prices) throw new ApiError(503, "시세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  const done = await creditDeposit(d.id, prices, { ignoreMin: true });
  if (!done) throw new ApiError(409, "이미 처리되었거나 반영할 수 없는 건입니다.");
  return ok({ ok: true });
});
