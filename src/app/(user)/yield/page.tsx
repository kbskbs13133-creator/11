import StrategyContent from "@/components/strategy/StrategyContent";

export const metadata = { title: "수익 구조 | 포인트 예치 플랫폼" };

export default function YieldStructurePage() {
  // 레이아웃의 좌우/상단 여백을 상쇄해 섹션이 넓게 보이도록 함
  return (
    <div className="-mx-4 -mt-6">
      <StrategyContent ctaHref="/products" ctaLabel="예치 상품 보기" />
    </div>
  );
}
