import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { formatRate, termLabel } from "@/lib/format";
import { loadShowcase } from "@/lib/showcase";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ProductShowcase, RateTicker, SectionTitle, StepsSection, VipShowcase, pp } from "@/components/Showcase";

// 로그인한 사용자는 미들웨어에서 역할별 홈으로 이동하고, 비로그인 방문자에게만 이 소개 페이지가 보입니다.
export const dynamic = "force-dynamic";

export const metadata = {
  title: `${BRAND.title} | 맡겨둔 포인트가 매일 이자로`,
  description: "기간별 이율이 적용되는 포인트 예치 상품. 이자는 매일 자정 정산됩니다.",
};

export default async function LandingPage() {
  const data = await loadShowcase();
  const { products, vips, best, maxRate, topVip } = data;

  return (
    <div className="relative overflow-x-clip">
      <PublicHeader />

      {/* ───────── 히어로 ───────── */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full bg-brand-500/[0.12] blur-[140px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-50/60 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              매일 자정, 자동 이자 지급
            </span>
            <h1 className="mt-6 text-[2.35rem] font-bold leading-[1.18] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              잠들어 있는 포인트,
              <br />
              <span className="text-gold">매일 이자</span>로 깨우세요
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-slate-500">
              원하는 기간을 고르면 <b className="font-semibold text-slate-800">예치 시점의 이율</b>이 만기까지 적용됩니다.
              이자는 매일 자정 정산되고, 만기일에는 <b className="font-semibold text-slate-800">원금이 자동으로 정산</b>됩니다.{" "}
              <Link href="/strategy" className="whitespace-nowrap font-semibold text-brand-600 hover:underline">수익은 어디서 오나요? →</Link>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary !rounded-full !px-6 !py-3">
                지금 시작하기 <span aria-hidden>→</span>
              </Link>
              <a href="#products" className="btn-secondary !rounded-full !px-6 !py-3">상품 살펴보기</a>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/[0.06] pt-6 text-xs text-slate-500">
              <li>
                <div className="text-lg font-bold text-slate-900">매일</div>
                일 단위 이자 지급
              </li>
              <li>
                <div className="text-lg font-bold text-slate-900">자동</div>
                만기 원금 정산
              </li>
              <li>
                <div className="text-lg font-bold text-slate-900">+{pp(topVip?.bonusRate ?? "0")}</div>
                VIP 최대 추가 이율
              </li>
            </ul>
          </div>

          {/* 비주얼: 골드 메탈 카드 */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div aria-hidden className="absolute inset-6 rounded-[32px] bg-brand-500/20 blur-3xl" />
            <div className="relative aspect-[1.25] overflow-hidden rounded-[28px] border border-brand-400/30 bg-[#0d0b08] shadow-[0_50px_100px_-40px_rgba(214,178,100,0.45)]">
              {/* 동심원 라인 */}
              <svg aria-hidden viewBox="0 0 400 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f7e2ad" stopOpacity="0.9" />
                    <stop offset="0.5" stopColor="#b8913f" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#f3dba0" stopOpacity="0.05" />
                  </linearGradient>
                  <radialGradient id="g2" cx="0.78" cy="0.2" r="0.7">
                    <stop offset="0" stopColor="#d6b264" stopOpacity="0.45" />
                    <stop offset="1" stopColor="#d6b264" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="400" height="320" fill="url(#g2)" />
                {[40, 75, 110, 145, 180, 215, 250].map((r, i) => (
                  <circle key={r} cx="320" cy="60" r={r} fill="none" stroke="url(#g1)" strokeOpacity={0.55 - i * 0.06} strokeWidth="0.8" />
                ))}
                <path d="M0 250 C 90 200, 170 290, 260 230 S 380 190, 400 210" fill="none" stroke="url(#g1)" strokeWidth="1.2" />
                <path d="M0 270 C 100 225, 180 305, 270 250 S 380 215, 400 232" fill="none" stroke="url(#g1)" strokeOpacity="0.5" strokeWidth="0.8" />
              </svg>
              {/* 반짝임 */}
              <div aria-hidden className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_35%,rgba(247,226,173,0.10)_50%,transparent_65%)] bg-[length:200%_100%]" />

              <div className="relative flex h-full flex-col justify-between p-6 sm:px-8 sm:py-12">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow">BEST RATE</p>
                    <p className="mt-1 text-xs text-slate-500">{best ? `${best.product} · ${termLabel(best.termDays)}` : "상품 준비중"}</p>
                  </div>
                  <span className="h-9 w-12 rounded-md border border-brand-300/50 bg-gradient-to-br from-brand-700/80 via-brand-400/60 to-brand-300/40 shadow-inner" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">기간 적용 이율</p>
                  <p className="mt-1 text-6xl font-bold tracking-tight text-gold sm:text-7xl">
                    {best ? formatRate(best.rate) : "-"}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] tracking-[0.2em] text-slate-400">
                    <span>DAILY INTEREST</span>
                    <span>AUTO RETURN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 떠 있는 정보 칩 */}
            <div className="absolute -top-6 left-6 hidden animate-float rounded-2xl border border-white/10 bg-ink-800/90 px-4 py-3 shadow-2xl backdrop-blur sm:block">
              <p className="text-[10px] tracking-wider text-slate-400">매일 00:00</p>
              <p className="text-sm font-semibold text-emerald-600">이자 자동 지급</p>
            </div>
            <div className="absolute -bottom-7 right-6 hidden animate-float rounded-2xl border border-white/10 bg-ink-800/90 px-4 py-3 shadow-2xl backdrop-blur [animation-delay:1.5s] sm:block">
              <p className="text-[10px] tracking-wider text-slate-400">{topVip ? `VIP ${topVip.level} · ${topVip.name}` : "VIP"}</p>
              <p className="text-sm font-semibold text-brand-600">추가 이율 +{pp(topVip?.bonusRate ?? "0")}</p>
            </div>
          </div>
        </div>
      </section>

      <RateTicker data={data} />

      {/* ───────── 핵심 수치 ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] lg:grid-cols-4">
          {[
            { k: "운용 상품", v: `${products.length}개` },
            { k: "최고 기간 수익률", v: best ? formatRate(best.rate) : "-" },
            { k: "VIP 등급", v: `${vips.length}단계` },
            { k: "이자 지급", v: "매일 00:00" },
          ].map((s) => (
            <div key={s.k} className="bg-ink-900 px-6 py-6 text-center">
              <div className="text-2xl font-bold tracking-tight text-gold sm:text-3xl">{s.v}</div>
              <div className="mt-1 text-xs text-slate-500">{s.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 상품 ───────── */}
      <section id="products" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <SectionTitle eyebrow="PRODUCTS" title="기간을 고르면," gold="이율이 적용" tail="됩니다" desc="표시된 이율은 해당 기간 전체 기준이며 매일 나누어 정산됩니다. 운용 전략에는 위험이 따르므로 수익 구조와 위험 고지를 꼭 확인하세요." />
        <ProductShowcase products={products} maxRate={maxRate} href="/signup" />
      </section>

      {/* ───────── 이용 방법 ───────── */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <SectionTitle eyebrow="HOW IT WORKS" title="단 네 걸음이면" gold="충분합니다" />
        <StepsSection
          steps={[
            { t: "회원가입", d: "이메일과 비밀번호만으로 1분 안에 계정을 만듭니다." },
            { t: "포인트 충전", d: "충전을 신청하면 관리자 확인 후 즉시 반영됩니다." },
            { t: "상품 예치", d: "원하는 상품과 기간을 고르면 그 시점의 이율이 만기까지 적용됩니다." },
            { t: "매일 이자 · 만기 정산", d: "매일 자정 이자가 정산되고, 만기일에 원금이 정산됩니다." },
          ]}
        />
      </section>

      {/* ───────── VIP ───────── */}
      {vips.length > 0 && (
        <section id="vip" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <SectionTitle eyebrow="VIP MEMBERSHIP" title="등급이 높을수록," gold="이율도 높아집니다" desc="VIP 추가 이율은 모든 상품의 기본 이율에 더해지며, 예치 시점의 등급 기준으로 적용됩니다." />
          <VipShowcase vips={vips} topVip={topVip} />
        </section>
      )}

      {/* ───────── CTA ───────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10">
        <div className="card-gold relative !rounded-3xl !p-10 text-center sm:!p-14">
          <div aria-hidden className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
          <p className="eyebrow">START TODAY</p>
          <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-4xl">
            오늘 맡긴 포인트가
            <br />
            <span className="text-gold">내일 아침 이자</span>로 돌아옵니다
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-500">가입은 무료이며, 1분이면 충분합니다.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-primary !rounded-full !px-7 !py-3">무료로 시작하기 →</Link>
            <Link href="/login" className="btn-secondary !rounded-full !px-7 !py-3">로그인</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
