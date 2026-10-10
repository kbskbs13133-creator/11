import Link from "next/link";
import { BRAND } from "@/lib/brand";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { getT } from "@/lib/i18n/server";

// 비회원 공개 페이지(소개 /, 수익 구조 /strategy) 공용 헤더·푸터

export function PublicHeader({ active }: { active?: "strategy" }) {
  const tr = getT();
  const link = (on: boolean) => `transition hover:text-brand-600 ${on ? "text-brand-600" : ""}`;
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={tr("홈")}><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-500 md:flex">
          <Link href="/#products" className={link(false)}>{tr("상품")}</Link>
          <Link href="/strategy" className={link(active === "strategy")}>{tr("수익 구조")}</Link>
          <Link href="/#how" className={link(false)}>{tr("이용 방법")}</Link>
          <Link href="/#vip" className={link(false)}>{tr("VIP 혜택")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle className="hidden md:inline-flex" />
          <Link href="/login" className="btn-secondary btn-sm !rounded-full !px-4">{tr("로그인")}</Link>
          <Link href="/signup" className="btn-primary btn-sm !rounded-full !px-4">{tr("시작하기")}</Link>
        </div>
      </div>
      {/* 모바일: 간단 메뉴 */}
      <nav className="flex items-center justify-center gap-3.5 border-t border-white/[0.04] px-3 py-2 text-xs text-slate-500 md:hidden">
        <Link href="/#products" className={link(false)}>{tr("상품")}</Link>
        <Link href="/strategy" className={link(active === "strategy")}>{tr("수익 구조")}</Link>
        <Link href="/#how" className={link(false)}>{tr("이용 방법")}</Link>
        <Link href="/#vip" className={link(false)}>VIP</Link>
        <LangToggle />
      </nav>
    </header>
  );
}

export const RISK_NOTICE =
  "예치 이자는 운용 전략의 성과를 재원으로 하며, 운용 전략에는 펀딩비·스마트 컨트랙트·유동성·청산·거래상대방 위험이 따릅니다. 표시된 이율은 원금이나 수익을 보장하지 않으며, 상품 구성 및 이율은 운영 정책에 따라 변경될 수 있습니다. 본 내용은 정보 제공 목적이며 투자 권유나 금융 자문이 아닙니다.";

export function PublicFooter() {
  const tr = getT();
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-xs text-slate-400 md:flex-row md:items-start md:justify-between">
        <Logo />
        <div className="max-w-xl space-y-2 leading-relaxed">
          <p>{tr(RISK_NOTICE)}</p>
          <p>
            <Link href="/strategy" className="text-brand-600 hover:underline">{tr("수익 구조 자세히 보기 →")}</Link>
          </p>
        </div>
        <p className="shrink-0">© {new Date().getFullYear()} {BRAND.title}</p>
      </div>
    </footer>
  );
}
