import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { BRAND } from "@/lib/brand";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import StrategyContent from "@/components/strategy/StrategyContent";

export async function generateMetadata(): Promise<Metadata> {
  const tr = getT();
  return {
    title: `${tr("수익 구조")} | Delta-Neutral Yield Strategy | ${BRAND.name}`,
    description: tr("DeFi 수익은 취하고 가격 위험은 무기한 선물로 상쇄하는 델타 뉴트럴 전략의 구조를 설명합니다."),
  };
}

export default function StrategyPage() {
  const tr = getT();
  return (
    <div className="relative overflow-x-clip">
      <PublicHeader active="strategy" />
      <StrategyContent ctaHref="/signup" ctaLabel={tr("예치 상품 살펴보기")} />
      <PublicFooter />
    </div>
  );
}
