import Link from "next/link";
import { BRAND } from "@/lib/brand";
import Logo from "@/components/Logo";

// 비회원 공개 페이지(소개 /, 수익 구조 /strategy) 공용 헤더·푸터

export function PublicHeader({ active }: { active?: "strategy" }) {
  const link = (on: boolean) => `transition hover:text-brand-600 ${on ? "text-brand-600" : ""}`;
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="홈"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-500 md:flex">
          <Link href="/#products" className={link(false)}>상품</Link>
          <Link href="/strategy" className={link(active === "strategy")}>수익 구조</Link>
          <Link href="/#how" className={link(false)}>이용 방법</Link>
          <Link href="/#vip" className={link(false)}>VIP 혜택</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary btn-sm !rounded-full !px-4">로그인</Link>
          <Link href="/signup" className="btn-primary btn-sm !rounded-full !px-4">시작하기</Link>
        </div>
      </div>
      {/* 모바일: 간단 메뉴 */}
      <nav className="flex justify-center gap-6 border-t border-white/[0.04] py-2 text-xs text-slate-500 md:hidden">
        <Link href="/#products" className={link(false)}>상품</Link>
        <Link href="/strategy" className={link(active === "strategy")}>수익 구조</Link>
        <Link href="/#how" className={link(false)}>이용 방법</Link>
        <Link href="/#vip" className={link(false)}>VIP</Link>
      </nav>
    </header>
  );
}

export const RISK_NOTICE =
  "포인트 예치 이자는 운용 전략의 성과를 재원으로 하며, 운용 전략에는 펀딩비·스마트 컨트랙트·유동성·청산·거래상대방 위험이 따릅니다. 표시된 이율은 원금이나 수익을 보장하지 않으며, 상품 구성 및 이율은 운영 정책에 따라 변경될 수 있습니다. 본 내용은 정보 제공 목적이며 투자 권유나 금융 자문이 아닙니다.";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-xs text-slate-400 md:flex-row md:items-start md:justify-between">
        <Logo />
        <div className="max-w-xl space-y-2 leading-relaxed">
          <p>{RISK_NOTICE}</p>
          <p>
            <Link href="/strategy#risk" className="text-brand-600 hover:underline">수익 구조 및 위험 고지 전문 보기 →</Link>
          </p>
        </div>
        <p className="shrink-0">© {new Date().getFullYear()} {BRAND.title}</p>
      </div>
    </footer>
  );
}
