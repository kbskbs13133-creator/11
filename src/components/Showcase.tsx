import Link from "next/link";
import { formatRate, termLabel } from "@/lib/format";
import type { ShowcaseData, ShowcaseProduct, ShowcaseVip } from "@/lib/showcase";

// 소개 페이지(/)와 회원 홈(/home)에서 함께 쓰는 섹션 컴포넌트

export const pp = (rate: string) => formatRate(rate).replace("%", "%p");

export function SectionTitle({ eyebrow, title, gold, tail, desc }: { eyebrow: string; title: string; gold: string; tail?: string; desc?: string }) {
  return (
    <div className="text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title} <span className="text-gold">{gold}</span>
        {tail}
      </h2>
      {desc && <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-500">{desc}</p>}
    </div>
  );
}

/** 상품·기간별 수익률이 흐르는 띠 */
export function RateTicker({ data }: { data: ShowcaseData }) {
  if (data.allRates.length === 0) return null;
  const items = [...data.allRates, ...data.allRates];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-ink-900/60 py-3.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-950 to-transparent" />
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-sm">
        {items.map((r, i) => (
          <span key={i} className="flex items-center gap-3 text-slate-500">
            <span className="h-1 w-1 rounded-full bg-brand-500" />
            {r.product} · {termLabel(r.termDays)}
            <b className="font-semibold text-brand-600">{formatRate(r.rate)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 상품 카드 그리드 (기간별 이율 막대) */
export function ProductShowcase({ products, maxRate, href, cta = "예치하기" }: { products: ShowcaseProduct[]; maxRate: number; href: string; cta?: string }) {
  if (products.length === 0) return <div className="card mt-10 text-center text-sm text-slate-500">곧 새로운 상품이 공개됩니다.</div>;
  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2">
      {products.map((p, idx) => {
        const top = p.rates.reduce((m, r) => (r.n > m.n ? r : m), p.rates[0]);
        return (
          <article
            key={p.id}
            className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-ink-700/80 to-ink-900/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-400/30 sm:p-7"
          >
            <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl transition group-hover:bg-brand-500/20" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-slate-400">NO. {String(idx + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{p.name}</h3>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-slate-400">최대</div>
                <div className="text-2xl font-bold text-gold">{formatRate(top.rate)}</div>
              </div>
            </div>
            {p.description && <p className="relative mt-3 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">{p.description}</p>}
            <ul className="relative mt-6 space-y-3">
              {p.rates.map((r) => (
                <li key={r.termDays} className="grid grid-cols-[64px_1fr_56px] items-center gap-3 text-sm">
                  <span className="text-slate-500">{termLabel(r.termDays)}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-700"
                      style={{ width: `${maxRate ? Math.max(6, (r.n / maxRate) * 100) : 0}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold tabular-nums text-slate-900">{formatRate(r.rate)}</span>
                </li>
              ))}
            </ul>
            <div className="relative mt-7 flex items-center justify-between border-t border-white/[0.06] pt-5">
              <span className="text-xs text-slate-400">{p.rates.length}개 기간 선택 가능</span>
              <Link href={href} className="text-sm font-semibold text-brand-600 transition group-hover:text-brand-700">
                {cta} →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export type Step = { t: string; d: string; href?: string; cta?: string };

/** 4단계 이용 방법 */
export function StepsSection({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.t} className="card group relative flex flex-col overflow-hidden !p-6 transition hover:border-brand-400/25">
          <span className="absolute -right-2 -top-4 text-7xl font-black text-white/[0.03]">{i + 1}</span>
          <span className="text-sm font-bold text-gold">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-3 font-bold text-slate-900">{s.t}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.d}</p>
          {s.href && (
            <Link href={s.href} className="mt-auto pt-4 text-xs font-semibold text-brand-600 transition group-hover:text-brand-700">
              {s.cta ?? "바로가기"} →
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

/** VIP 등급 카드 (myLevel 이 있으면 내 등급 표시) */
export function VipShowcase({ vips, topVip, myLevel }: { vips: ShowcaseVip[]; topVip: ShowcaseVip | null; myLevel?: number }) {
  return (
    <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {vips.map((v) => {
        const isTop = topVip?.level === v.level;
        const isMine = myLevel === v.level;
        const hi = myLevel !== undefined ? isMine : isTop;
        return (
          <div
            key={v.level}
            className={`relative rounded-2xl border p-5 text-center transition ${
              hi ? "border-brand-400/60 bg-gradient-to-b from-brand-50 to-ink-900 shadow-[0_20px_50px_-25px_rgba(214,178,100,0.6)]" : "border-white/[0.07] bg-ink-800/70"
            }`}
          >
            {(isMine || (myLevel === undefined && isTop)) && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-brand-700 to-brand-400 px-2.5 py-0.5 text-[10px] font-bold text-ink-950">
                {isMine ? "내 등급" : "BEST"}
              </span>
            )}
            <div className="text-[11px] font-semibold tracking-[0.2em] text-slate-400">VIP {v.level}</div>
            <div className="mt-1 font-bold text-slate-900">{v.name}</div>
            <div className={`mt-3 text-2xl font-bold ${hi ? "text-gold" : "text-brand-600"}`}>+{pp(v.bonusRate)}</div>
            <div className="mt-1 text-[11px] text-slate-400">추가 이율</div>
          </div>
        );
      })}
    </div>
  );
}
