import StrategyContent from "@/components/strategy/StrategyContent";
import { pageTitle } from "@/lib/i18n/server";
import { getT } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("수익 구조");

export default function YieldStructurePage() {
  const tr = getT();
  // 레이아웃의 좌우/상단 여백을 상쇄해 섹션이 넓게 보이도록 함
  return (
    <div className="-mx-4 -mt-6">
      <StrategyContent ctaHref="/products" ctaLabel={tr("예치 상품 보기")} />
    </div>
  );
}
