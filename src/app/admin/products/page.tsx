import { prisma } from "@/lib/prisma";
import { productDTO } from "@/lib/serializers";
import { MAX_PRODUCTS } from "@/lib/validators";
import ProductManager from "./ProductManager";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { rates: true, _count: { select: { deposits: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return <ProductManager initial={products.map(productDTO)} max={MAX_PRODUCTS} />;
}
