import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { productDTO } from "@/lib/serializers";
import { s2, sRate } from "@/lib/money";
import ProductList from "./ProductList";

export const metadata = { title: "상품 | 포인트 예치 플랫폼" };

export default async function ProductsPage() {
  const me = await requireUserPage();
  const [products, summary] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { rates: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getBalanceSummary(me.id),
  ]);

  return (
    <ProductList
      products={products.filter((p) => p.rates.length > 0).map(productDTO)}
      available={s2(summary.available)!}
      vip={{ level: summary.user.vipLevel, name: summary.user.vip.name, bonusRate: sRate(summary.user.vip.bonusRate) }}
    />
  );
}
