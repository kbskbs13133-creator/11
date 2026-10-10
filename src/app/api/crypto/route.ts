import { handler, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { userCryptoState } from "@/lib/crypto/service";
import { watchWallet } from "@/lib/crypto/scan";

export const dynamic = "force-dynamic";

/** 충전 화면: 내 입금 주소(없으면 생성) + 시세 + 최근 코인 입금. 열면 자동 스캔 감시 대상에 포함 */
export const GET = handler(async () => {
  const me = await requireUserApi();
  const state = await userCryptoState(me.id, { create: true });
  if (state.walletId) await watchWallet(state.walletId);
  const { walletId: _w, ...rest } = state;
  return ok(rest);
});
