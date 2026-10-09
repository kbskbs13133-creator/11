import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { depositSchema } from "@/lib/validators";
import { depositDTO } from "@/lib/serializers";
import { lockUser, pendingWithdrawSum } from "@/lib/balance";
import { calcExpectedInterest } from "@/lib/interest";
import { toDec } from "@/lib/money";
import { addDays, kstToday } from "@/lib/date";
import { formatAmount } from "@/lib/format";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const me = await requireUserApi();
  const deposits = await prisma.deposit.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" } });
  return ok({ deposits: deposits.map(depositDTO) });
});

export const POST = handler(async (req: Request) => {
  const me = await requireUserApi();
  const body = depositSchema.parse(await req.json());
  const principal = toDec(body.amount);

  const deposit = await prisma.$transaction(async (tx) => {
    // 1) 상품/기간 검증
    const product = await tx.product.findUnique({ where: { id: body.productId }, include: { rates: true } });
    if (!product || !product.isActive) throw new ApiError(400, "현재 예치할 수 없는 상품입니다.");
    const rate = product.rates.find((r) => r.termDays === body.termDays);
    if (!rate) throw new ApiError(400, "선택한 기간은 이 상품에서 제공되지 않습니다.");

    // 2) 유저 잠금 + 사용 가능 잔액 확인 (처리중 환전 신청액 제외)
    const user = await lockUser(tx, me.id);
    const available = user.pointBalance.sub(await pendingWithdrawSum(tx, me.id));
    if (principal.gt(available)) {
      throw new ApiError(400, `사용 가능 포인트가 부족합니다. (사용 가능: ${formatAmount(available.toFixed(2))})`);
    }

    // 3) 이율 스냅샷: 총이율 = 상품 기본이율 + VIP 추가이율
    const vipBonusRate = user.vip.bonusRate;
    const totalRate = rate.rate.add(vipBonusRate);
    const expectedInterest = calcExpectedInterest(principal, totalRate);
    const startDate = kstToday();
    const endDate = addDays(startDate, body.termDays);

    // 4) 포인트 차감 + 예치 생성
    await tx.user.update({ where: { id: me.id }, data: { pointBalance: { decrement: principal } } });
    return tx.deposit.create({
      data: {
        userId: me.id,
        productId: product.id,
        productName: product.name,
        principal,
        termDays: body.termDays,
        baseRate: rate.rate,
        vipLevel: user.vipLevel,
        vipBonusRate,
        totalRate,
        expectedInterest,
        startDate,
        endDate,
      },
    });
  });

  return ok({ deposit: depositDTO(deposit) }, 201);
});
