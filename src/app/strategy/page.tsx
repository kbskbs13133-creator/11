import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import StrategyContent from "@/components/strategy/StrategyContent";

export const metadata = {
  title: "수익 구조 | Delta-Neutral Yield Strategy",
  description: "DeFi 수익은 취하고 가격 위험은 무기한 선물로 상쇄하는 델타 뉴트럴 전략의 구조와 위험을 설명합니다.",
};

export default function StrategyPage() {
  return (
    <div className="relative overflow-x-clip">
      <PublicHeader active="strategy" />
      <StrategyContent ctaHref="/signup" ctaLabel="예치 상품 살펴보기" />
      <PublicFooter />
    </div>
  );
}
