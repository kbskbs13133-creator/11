import { handler, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { s2, sRate } from "@/lib/money";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const me = await requireUserApi();
  const { user, balance, pendingWithdraw, available } = await getBalanceSummary(me.id);
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    balance: s2(balance),
    pendingWithdraw: s2(pendingWithdraw),
    available: s2(available),
    vip: { level: user.vipLevel, name: user.vip.name, bonusRate: sRate(user.vip.bonusRate) },
  });
});
