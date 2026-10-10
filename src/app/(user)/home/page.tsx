import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { loadShowcase } from "@/lib/showcase";
import { s2, ZERO } from "@/lib/money";
import { formatAmount, formatRate, termLabel } from "@/lib/format";
import { ProductShowcase, RateTicker, SectionTitle, StepsSection, VipShowcase, pp } from "@/components/Showcase";

export const metadata = { title: "홈 | 포인트 예치 플랫폼" };

export default async function UserHomePage() {
  const me = await requireUserPage();
  const [summary, data, active, agg] = await Promise.all([
    getBalanceSummary(me.id),
    loadShowcase(),
    prisma.deposit.findMany({ where: { userId: me.id, status: "ACTIVE" }, select: { principal: true } }),
    prisma.deposit.aggregate({ where: { userId: me.id }, _sum: { accruedInterest: true } }),
  ]);
  const { user } = summary;
  const { products, vips, best, maxRate, topVip } = data;
  const activePrincipal = active.reduce((a, d) => a.add(d.principal), ZERO);
  const myBonus = user.vip.bonusRate.toString();
  const hasDeposit = active.length > 0;

  const stats = [
    { k: "보유 포인트", v: formatAmount(s2(summary.balance)), sub: `사용 가능 ${formatAmount(s2(summary.available))}`, href: "/wallet" },
    { k: "예치중 원금", v: formatAmount(s2(activePrincipal)), sub: `진행중 ${active.length}건`, href: "/my-deposits" },
    { k: "누적 수령 이자", v: `+${formatAmount(s2(agg._sum.accruedInterest) ?? "0")}`, sub: "매일 00:00 자동 지급", href: "/dashboard" },
    { k: "내 VIP 추가 이율", v: `+${pp(myBonus)}`, sub: `VIP ${user.vipLevel} · ${user.vip.name}`, href: "/products" },
  ];

  return (
    <div className="space-y-16 pb-6 sm:space-y-20">
      {/* ───────── 히어로 배너 ───────── */}
      <section className="relative overflow-hidden rounded-[28px] border border-brand-400/20 bg-ink-900 shadow-[0_50px_100px_-50px_rgba(214,178,100,0.45)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_center] opacity-60 sm:opacity-95" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/0" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />

        <div className="relative max-w-2xl px-6 pb-10 pt-10 sm:px-12 sm:pb-14 sm:pt-16 lg:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-ink-950/60 px-3 py-1 text-xs font-medium text-brand-700 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            VIP {user.vipLevel} · {user.vip.name} 회원
          </span>
          <h1 className="mt-6 text-[1.7rem] font-bold leading-[1.25] sm:leading-[1.22] tracking-tight text-slate-900 sm:text-5xl">
            {hasDeposit ? (
              <>
                {user.name}님의 포인트가
                <br />
                오늘도 <span className="text-gold">이자를 만들고</span> 있습니다
              </>
            ) : (
              <>
                {user.name}님, 환영합니다
                <br />
                <span className="text-gold">첫 예치</span>로 매일 이자를 받으세요
              </>
            )}
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-500">
            기간을 고르면 <b className="font-semibold text-slate-800">예치 시점의 이율</b>이 만기까지 적용되고, 매일 자정 이자가 정산됩니다.
            {Number(myBonus) > 0 && (
              <>
                {" "}현재 등급 혜택으로 모든 상품에 <b className="font-semibold text-brand-700">+{pp(myBonus)}</b>가 더해집니다.
              </>
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary !rounded-full !px-6 !py-3">
              예치 상품 보기 <span aria-hidden>→</span>
            </Link>
            <Link href="/wallet" className="btn-secondary !rounded-full !bg-ink-950/50 !px-6 !py-3 backdrop-blur">포인트 충전하기</Link>
          </div>
        </div>

        <dl className="relative grid grid-cols-3 divide-x divide-white/[0.08] border-t border-white/[0.08] bg-ink-950/60 backdrop-blur-md">
          <div className="px-4 py-4 sm:px-8 sm:py-5">
            <dt className="text-[10px] tracking-[0.18em] text-slate-400 sm:text-[11px]">BEST RATE</dt>
            <dd className="mt-1 text-lg font-bold text-gold sm:text-2xl">{best ? formatRate(best.rate) : "-"}</dd>
            <dd className="hidden truncate text-xs text-slate-500 sm:block">{best ? `${best.product} · ${termLabel(best.termDays)}` : ""}</dd>
          </div>
          <div className="px-4 py-4 sm:px-8 sm:py-5">
            <dt className="text-[10px] tracking-[0.18em] text-slate-400 sm:text-[11px]">MY BONUS</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl">+{pp(myBonus)}</dd>
            <dd className="hidden text-xs text-slate-500 sm:block">VIP 추가 이율</dd>
          </div>
          <div className="px-4 py-4 sm:px-8 sm:py-5">
            <dt className="text-[10px] tracking-[0.18em] text-slate-400 sm:text-[11px]">PAYOUT</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl">00:00</dd>
            <dd className="hidden text-xs text-slate-500 sm:block">매일 자정 자동 지급</dd>
          </div>
        </dl>
      </section>

      {/* ───────── 수익률 티커 (화면 폭 전체) ───────── */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 !mt-10">
        <RateTicker data={data} />
      </div>

      {/* ───────── 내 자산 요약 ───────── */}
      <section className="!mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">MY ASSETS</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">내 자산 한눈에 보기</h2>
          </div>
          <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">대시보드 →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Link
              key={s.k}
              href={s.href}
              className={`${i === 0 ? "card-gold" : "card"} group block !p-5 transition hover:-translate-y-0.5 hover:border-brand-400/30`}
            >
              <div className="text-xs text-slate-500">{s.k}</div>
              <div className={`mt-2 truncate text-xl font-bold tracking-tight sm:text-2xl ${i === 0 ? "text-gold" : i === 2 ? "text-emerald-600" : i === 3 ? "text-brand-600" : "text-slate-900"}`}>
                {s.v}
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{s.sub}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── 수익 구조 안내 ───────── */}
      <section>
        <Link
          href="/yield"
          className="group relative block overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.10] via-ink-900/80 to-brand-50/40 p-6 transition hover:border-sky-300/40 sm:p-8"
        >
          <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.28em] text-cyan-300">HOW YIELD IS GENERATED</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">이자는 어떻게 만들어지나요?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                DeFi 수익은 취하고, 가격 위험은 무기한 선물로 상쇄하는 <b className="text-slate-700">델타 뉴트럴 전략</b>의 구조와 위험 요소를 확인해 보세요.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-cyan-300 transition group-hover:translate-x-1">수익 구조 자세히 보기 →</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center text-[11px]">
              <div className="rounded-xl border border-cyan-300/25 bg-ink-900/70 px-2 py-3"><div className="font-semibold text-cyan-300">LONG</div><div className="mt-0.5 text-slate-500">DeFi</div></div>
              <span className="text-slate-400">+</span>
              <div className="rounded-xl border border-sky-400/25 bg-ink-900/70 px-2 py-3"><div className="font-semibold text-sky-300">SHORT</div><div className="mt-0.5 text-slate-500">Perp</div></div>
              <span className="text-slate-400">=</span>
              <div className="rounded-xl border border-brand-400/35 bg-brand-50/50 px-2 py-3"><div className="font-semibold text-brand-600">YIELD</div><div className="mt-0.5 text-slate-500">Δ≈0</div></div>
            </div>
          </div>
        </Link>
      </section>

      {/* ───────── 상품 ───────── */}
      <section>
        <SectionTitle eyebrow="PRODUCTS" title="지금 가입 가능한" gold="예치 상품" desc={Number(myBonus) > 0 ? `표시된 기본 이율에 회원님의 VIP 추가 이율 +${pp(myBonus)}가 더해집니다.` : "표시된 이율은 해당 기간 전체 기준이며, 매일 나누어 정산됩니다."} />
        <ProductShowcase products={products} maxRate={maxRate} href="/products" />
      </section>

      {/* ───────── 이용 방법 ───────── */}
      <section>
        <SectionTitle eyebrow="HOW IT WORKS" title="이렇게" gold="이용하세요" />
        <StepsSection
          steps={[
            { t: "포인트 충전", d: "지갑에서 충전을 신청하면 관리자 확인 후 바로 반영됩니다.", href: "/wallet", cta: "충전하러 가기" },
            { t: "상품 · 기간 선택", d: "원하는 상품과 기간을 고르면 그 시점의 이율이 만기까지 적용됩니다.", href: "/products", cta: "상품 보러 가기" },
            { t: "매일 이자 적립", d: "매일 자정, 하루치 이자가 보유 포인트에 자동으로 더해집니다.", href: "/dashboard", cta: "이자 내역 보기" },
            { t: "만기 원금 정산", d: "만기일이 되면 원금이 자동으로 정산되고 예치가 완료됩니다.", href: "/my-deposits", cta: "내 예치 보기" },
          ]}
        />
      </section>

      {/* ───────── VIP ───────── */}
      {vips.length > 0 && (
        <section>
          <SectionTitle eyebrow="VIP MEMBERSHIP" title="회원님의 등급은" gold={`VIP ${user.vipLevel} · ${user.vip.name}`} tail="입니다" desc="VIP 추가 이율은 모든 상품의 기본 이율에 더해지며, 예치 시점의 등급 기준으로 적용됩니다." />
          <VipShowcase vips={vips} topVip={topVip} myLevel={user.vipLevel} />
        </section>
      )}

      {/* ───────── CTA ───────── */}
      <section>
        <div className="card-gold relative !rounded-3xl !p-10 text-center sm:!p-14">
          <div aria-hidden className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
          <p className="eyebrow">START TODAY</p>
          <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-4xl">
            오늘 예치하면
            <br />
            <span className="text-gold">내일 00시부터</span> 이자가 쌓입니다
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="btn-primary !rounded-full !px-7 !py-3">지금 예치하기 →</Link>
            <Link href="/dashboard" className="btn-secondary !rounded-full !px-7 !py-3">대시보드로 이동</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
