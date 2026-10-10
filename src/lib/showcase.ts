import { prisma } from "@/lib/prisma";

// 소개/홈 페이지 공용 데이터 (활성 상품 + 기간별 이율 + VIP 등급)
export type ShowcaseRate = { termDays: number; rate: string; n: number };
export type ShowcaseProduct = { id: string; name: string; description: string; rates: ShowcaseRate[] };
export type ShowcaseVip = { level: number; name: string; bonusRate: string; n: number };
export type ShowcaseData = {
  products: ShowcaseProduct[];
  vips: ShowcaseVip[];
  allRates: (ShowcaseRate & { product: string })[];
  best: (ShowcaseRate & { product: string }) | null;
  maxRate: number;
  topVip: ShowcaseVip | null;
};

export async function loadShowcase(): Promise<ShowcaseData> {
  const [productsRaw, vipsRaw] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { rates: { orderBy: { termDays: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.vipLevel.findMany({ orderBy: { level: "asc" } }),
  ]);

  const products: ShowcaseProduct[] = productsRaw
    .filter((p) => p.rates.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      rates: p.rates.map((r) => ({ termDays: r.termDays, rate: r.rate.toString(), n: Number(r.rate.toString()) })),
    }));
  const vips: ShowcaseVip[] = vipsRaw.map((v) => ({
    level: v.level,
    name: v.name,
    bonusRate: v.bonusRate.toString(),
    n: Number(v.bonusRate.toString()),
  }));

  const allRates = products.flatMap((p) => p.rates.map((r) => ({ ...r, product: p.name })));
  const best = allRates.reduce<ShowcaseData["best"]>((m, r) => (!m || r.n > m.n ? r : m), null);
  const topVip = vips.reduce<ShowcaseVip | null>((m, v) => (!m || v.n > m.n ? v : m), null);
  return { products, vips, allRates, best, maxRate: best?.n ?? 0, topVip };
}
