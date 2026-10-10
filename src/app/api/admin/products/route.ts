import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { MAX_PRODUCTS, productSchema } from "@/lib/validators";
import { productDTO } from "@/lib/serializers";
import { toDec } from "@/lib/money";

export const dynamic = "force-dynamic";

const PRODUCT_LOCK_KEY = 910001; // 상품 개수 제한 동시성 제어용 advisory lock 키

export const GET = handler(async () => {
  await requireAdminApi();
  const products = await prisma.product.findMany({
    include: { rates: true, _count: { select: { deposits: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return ok({ products: products.map(productDTO), max: MAX_PRODUCTS });
});

export const POST = handler(async (req: Request) => {
  await requireAdminApi();
  const body = productSchema.parse(await req.json());

  const product = await prisma.$transaction(async (tx) => {
    // 동시 등록으로 10개 제한을 넘지 않도록 트랜잭션 단위 잠금
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PRODUCT_LOCK_KEY})`;
    const count = await tx.product.count();
    if (count >= MAX_PRODUCTS) {
      throw new ApiError(400, `상품은 최대 ${MAX_PRODUCTS}개까지 등록할 수 있습니다.`);
    }
    return tx.product.create({
      data: {
        name: body.name,
        nameEn: body.nameEn,
        description: body.description,
        descriptionEn: body.descriptionEn,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        rates: { create: body.rates.map((r) => ({ termDays: r.termDays, rate: toDec(r.rate) })) },
      },
      include: { rates: true },
    });
  });

  return ok({ product: productDTO(product) }, 201);
});
