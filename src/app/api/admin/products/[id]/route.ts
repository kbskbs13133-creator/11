import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { productSchema } from "@/lib/validators";
import { productDTO } from "@/lib/serializers";
import { toDec } from "@/lib/money";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export const PUT = handler(async (req: Request, { params }: Ctx) => {
  await requireAdminApi();
  const body = productSchema.parse(await req.json());

  const product = await prisma.$transaction(async (tx) => {
    const exists = await tx.product.findUnique({ where: { id: params.id } });
    if (!exists) throw new ApiError(404, "상품을 찾을 수 없습니다.");

    // 기간별 이율은 전체 교체 (기존 예치건은 이율이 스냅샷으로 저장되어 영향 없음)
    await tx.productRate.deleteMany({ where: { productId: params.id } });
    return tx.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        rates: { create: body.rates.map((r) => ({ termDays: r.termDays, rate: toDec(r.rate) })) },
      },
      include: { rates: true },
    });
  });

  return ok({ product: productDTO(product) });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdminApi();
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: params.id },
      include: { _count: { select: { deposits: true } } },
    });
    if (!product) throw new ApiError(404, "상품을 찾을 수 없습니다.");
    if (product._count.deposits > 0) {
      throw new ApiError(400, "예치 내역이 있는 상품은 삭제할 수 없습니다. 대신 '비활성'으로 변경해주세요.");
    }
    await tx.product.delete({ where: { id: params.id } }); // rates 는 onDelete: Cascade
  });
  return ok({ success: true });
});
