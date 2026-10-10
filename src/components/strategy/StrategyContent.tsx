import Link from "next/link";
import { RISK_NOTICE } from "@/components/PublicChrome";

/**
 * 수익 구조(델타 뉴트럴 전략) 설명 콘텐츠
 * - 공개 페이지(/strategy)와 회원 페이지(/yield)에서 공용으로 사용
 * - 그래프/수치는 모두 "구조 이해를 위한 가상 예시"입니다. 실제 운용 방식에 맞게 문구를 수정하세요.
 */

const C = { cyan: "#22d3ee", blue: "#60a5fa", gold: "#e3c27e", rose: "#f38693", grid: "rgba(255,255,255,0.06)" };

/* ───────── 작은 아이콘 ───────── */
const ICONS: Record<string, string> = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
  layers: "M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  harvest: "M4 20h16M7 16V9M12 16V5M17 16v-4",
  scale: "M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  minus: "M5 12h14",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  funding: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  check: "M5 12l5 5L20 7",
  x: "M6 6l12 12M18 6 6 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  pool: "M3 10h18M5 10V20M19 10V20M9 10v10M15 10v10M2 20h20M12 3l9 5H3z",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9h4.5a2 2 0 0 1 0 4H9m0-4v8m0-4h5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
};
function I({ n, className = "h-5 w-5" }: { n: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[n] ?? ICONS.grid} />
    </svg>
  );
}

function Eyebrow({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "gold" | "rose" }) {
  const c = tone === "gold" ? "text-brand-500" : tone === "rose" ? "text-rose-600" : "text-cyan-300";
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${c}`}>{children}</p>;
}

function Title({ en, ko, desc, center = false }: { en: React.ReactNode; ko: string; desc?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2 className="text-[1.7rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.4rem]">{en}</h2>
      <p className="mt-2 text-base font-medium text-slate-600 sm:text-lg">{ko}</p>
      {desc && <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-[15px]">{desc}</p>}
    </div>
  );
}

const glass = "rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm";
const blueText = "bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent";

/* ───────── 미니 차트 (히어로 공식) ───────── */
const WAVE = "M0 30 C10 18, 20 12, 30 20 S48 46, 60 38 S78 8, 90 16 S110 42, 120 28";
function MiniChart({ kind }: { kind: "long" | "short" | "net" }) {
  const color = kind === "long" ? C.cyan : kind === "short" ? C.blue : C.gold;
  return (
    <svg viewBox="0 0 120 60" className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <line x1="0" y1="30" x2="120" y2="30" stroke={C.grid} strokeDasharray="2 3" />
      {kind === "net" ? (
        <>
          <path d="M0 44 H20 V41 H40 V37 H60 V33 H80 V29 H100 V25 H120" fill="none" stroke={color} strokeWidth="1.8" />
          <path d="M0 44 H20 V41 H40 V37 H60 V33 H80 V29 H100 V25 H120 V60 H0Z" fill={color} opacity="0.08" />
        </>
      ) : (
        <path d={WAVE} fill="none" stroke={color} strokeWidth="1.8" transform={kind === "short" ? "translate(0,60) scale(1,-1)" : undefined} />
      )}
    </svg>
  );
}

/* ───────── 섹션들 ───────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 배경: 그리드 + 네트워크 + 빛 입자 */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-70" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 700">
        <defs>
          <pattern id="sg" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(148,197,255,0.06)" />
          </pattern>
          <radialGradient id="sfade" cx="0.5" cy="0.35" r="0.65">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="smask"><rect width="1200" height="700" fill="url(#sfade)" /></mask>
        </defs>
        <g mask="url(#smask)">
          <rect width="1200" height="700" fill="url(#sg)" />
          {[
            [180, 140, 340, 230], [340, 230, 520, 170], [520, 170, 700, 260], [700, 260, 880, 150], [880, 150, 1040, 240],
            [340, 230, 420, 380], [700, 260, 760, 420], [880, 150, 960, 60],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(96,165,250,0.18)" strokeWidth="1" />
          ))}
          {[[180, 140], [340, 230], [520, 170], [700, 260], [880, 150], [1040, 240], [420, 380], [760, 420], [960, 60]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 2} fill={i % 2 ? C.cyan : C.blue} opacity="0.7" />
          ))}
          {Array.from({ length: 36 }).map((_, i) => (
            <circle key={`p${i}`} cx={(i * 137) % 1200} cy={(i * 89) % 700} r={(i % 3) * 0.6 + 0.6} fill={i % 4 === 0 ? C.gold : "#cfe8ff"} opacity={0.15 + (i % 5) * 0.06} />
          ))}
        </g>
      </svg>
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-sky-500/[0.10] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.06] px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-cyan-200">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> DELTA-NEUTRAL YIELD STRATEGY
        </span>
        <h1 className="mt-7 text-[2.3rem] font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
          <span className="text-gold">Extract Yield.</span>
          <br />
          <span className={blueText}>Neutralize Price Risk.</span>
        </h1>
        <p className="mt-6 text-lg font-medium text-slate-700 sm:text-xl">수익은 취하고, 가격 위험은 상쇄합니다.</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
          높은 DeFi 수익을 확보하는 동시에, 무기한 선물(Perpetual Futures)로 시장 노출을 헤지하는 전문적인 델타 뉴트럴 전략입니다.{" "}
          <br className="hidden sm:block" />
          같은 자산을 <b className="font-semibold text-cyan-200">DeFi에서 보유(롱)</b>하고 <b className="font-semibold text-sky-300">선물 시장에서 같은 규모로 매도(숏)</b>해,
          가격 변동은 서로 상쇄시키고 <b className="font-semibold text-brand-600">이자 수익을 중심으로 남기는</b> 구조입니다.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a href="#solution" className="btn !rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 !px-6 !py-3 text-ink-950 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.7)] hover:brightness-110">
            전략 이해하기 <span className="hidden text-ink-950/70 sm:inline">· Understand the Strategy</span>
          </a>
          <a href="#risk" className="btn-secondary !rounded-full !px-6 !py-3">
            위험 고지 보기 <span className="hidden text-slate-400 sm:inline">· View Risk Framework</span>
          </a>
        </div>

        {/* 공식 다이어그램: LONG + SHORT = NEUTRAL + YIELD */}
        <div className={`${glass} mx-auto mt-14 grid max-w-4xl items-center gap-3 p-4 text-left sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-4 sm:p-6`}>
          {[
            { k: "long" as const, t: "LONG · DeFi", d: "자산 예치 → 이자/보상 수령", c: "text-cyan-300", delta: "Δ +1" },
            { k: "short" as const, t: "SHORT · Perp", d: "같은 수량 무기한 선물 숏", c: "text-sky-300", delta: "Δ −1" },
            { k: "net" as const, t: "NEUTRAL + YIELD", d: "가격 영향 상쇄, 이자 누적", c: "text-brand-600", delta: "Δ ≈ 0" },
          ].map((b, i) => (
            <div key={b.k} className="contents">
              {i > 0 && <div className="text-center text-2xl font-light text-slate-400">{i === 1 ? "+" : "="}</div>}
              <div className={`rounded-xl border p-4 ${b.k === "net" ? "border-brand-400/30 bg-brand-50/40" : "border-white/[0.06] bg-ink-900/60"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold tracking-[0.18em] ${b.c}`}>{b.t}</span>
                  <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{b.delta}</span>
                </div>
                <MiniChart kind={b.k} />
                <p className="text-xs text-slate-500">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">* 구조 이해를 돕기 위한 개념도이며 실제 수익률 그래프가 아닙니다.</p>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow tone="rose">01 · THE PROBLEM</Eyebrow>
          <div className="mt-4">
            <Title
              en="The Hidden Cost of High Yields"
              ko="높은 APY 뒤에 숨은 비용"
              desc={
                <>
                  일부 알트코인 DeFi 상품은 연 수십~수백 %의 APY를 제시합니다. 하지만 그 보상은 대부분 <b className="text-slate-700">변동성이 큰 토큰</b>으로 지급되고,
                  예치한 자산 자체도 같은 토큰인 경우가 많습니다. 토큰 가격이 하락하면 쌓인 이자보다 <b className="text-rose-700">원금 가치 하락이 더 커질 수 있습니다.</b>
                </>
              }
            />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { k: "제시 APY", v: "80%", c: "text-brand-600" },
              { k: "토큰 가격 변동", v: "−60%", c: "text-cyan-300" },
              { k: "실질 손익", v: "−45%", c: "text-rose-600" },
            ].map((s) => (
              <div key={s.k} className={`${glass} p-4`}>
                <div className={`text-xl font-semibold tabular-nums sm:text-2xl ${s.c}`}>{s.v}</div>
                <div className="mt-1 text-[11px] text-slate-500">{s.k}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">* 가상 예시 수치입니다.</p>
        </div>

        {/* 차트: 이자 누적 vs 가격 하락 */}
        <div className={`${glass} p-5 sm:p-7`}>
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded" style={{ background: C.gold }} /> 누적 이자 (APY)</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded" style={{ background: C.cyan }} /> 토큰 가격</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded border-t border-dashed" style={{ borderColor: C.rose }} /> 실질 자산 가치</span>
          </div>
          <svg viewBox="0 0 560 280" className="w-full" aria-label="높은 APY와 가격 하락 비교 개념도">
            {[50, 100, 150, 200, 250].map((y) => <line key={y} x1="40" y1={y} x2="550" y2={y} stroke={C.grid} />)}
            <line x1="40" y1="100" x2="550" y2="100" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" />
            <text x="34" y="104" textAnchor="end" fontSize="10" fill="#857c6b">원금</text>
            <path d="M40 100 C120 98, 200 92, 300 84 S460 70, 550 62" fill="none" stroke={C.gold} strokeWidth="2" />
            <path d="M40 100 C80 90, 110 130, 160 120 S240 170, 300 165 S400 215, 450 205 S520 240, 550 236" fill="none" stroke={C.cyan} strokeWidth="2" />
            <path d="M40 100 C100 100, 140 128, 200 133 S320 170, 380 176 S500 200, 550 196" fill="none" stroke={C.rose} strokeWidth="2" strokeDasharray="6 5" />
            <circle cx="550" cy="196" r="4" fill={C.rose} />
            <text x="540" y="186" textAnchor="end" fontSize="11" fill={C.rose}>원금 손실 구간</text>
            <text x="540" y="54" textAnchor="end" fontSize="11" fill={C.gold}>이자는 쌓이지만…</text>
            {["0M", "3M", "6M", "9M", "12M"].map((t, i) => (
              <text key={t} x={40 + i * 127.5} y="272" textAnchor="middle" fontSize="10" fill="#857c6b">{t}</text>
            ))}
          </svg>
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs leading-relaxed text-rose-800">
            핵심 문제: <b>수익률(Yield)</b>과 <b>가격 방향성(Price Exposure)</b>이 한 포지션에 묶여 있어, 이자를 받으려면 가격 위험까지 함께 떠안아야 합니다.
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section id="solution" className="relative scroll-mt-24 py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
      <div className="mx-auto max-w-6xl px-4">
        <Eyebrow>02 · THE SOLUTION</Eyebrow>
        <div className="mt-4">
          <Title
            en={<>Delta-Neutral <span className={blueText}>Yield Extraction</span></>}
            ko="델타 뉴트럴 수익 추출 — 이자와 가격 위험을 분리합니다"
            desc="같은 자산에 대해 크기가 같고 방향이 반대인 두 포지션을 동시에 보유합니다. 가격이 오르든 내리든 두 포지션의 손익은 서로 상쇄되고, 포트폴리오에는 주로 DeFi 수익(이자·보상)이 남습니다."
          />
        </div>

        {/* 구조 다이어그램 */}
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-[0.9fr_auto_1.3fr_auto_0.9fr]">
          <div className={`${glass} flex flex-col justify-center p-6 text-center`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-slate-700"><I n="coin" className="h-6 w-6" /></div>
            <div className="mt-3 text-[11px] font-semibold tracking-[0.2em] text-slate-400">CAPITAL</div>
            <div className="mt-1 font-semibold text-slate-900">운용 자본</div>
            <p className="mt-2 text-xs text-slate-500">자본을 두 개의 다리(Leg)로 나누어 배치</p>
          </div>
          <Arrow />
          <div className="grid gap-4">
            <div className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/[0.08] to-transparent p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-cyan-300">LEG A · LONG (DeFi)</span>
                <span className="font-mono text-xs text-cyan-200">Δ +1.0</span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">자산을 매입해 DeFi 프로토콜에 예치</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">대출 이자 · 유동성 수수료 · 인센티브 보상을 수령합니다. 가격이 오르면 이익, 내리면 손실.</p>
            </div>
            <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-blue-500/[0.08] to-transparent p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-sky-300">LEG B · SHORT (Perp)</span>
                <span className="font-mono text-xs text-sky-200">Δ −1.0</span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">같은 명목금액을 무기한 선물로 숏</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">가격이 내리면 이익, 오르면 손실. Leg A의 가격 손익을 반대 방향으로 상쇄합니다.</p>
            </div>
          </div>
          <Arrow />
          <div className="flex flex-col justify-center rounded-2xl border border-brand-400/35 bg-gradient-to-b from-brand-50/70 to-ink-900/80 p-6 text-center shadow-[0_30px_60px_-30px_rgba(214,178,100,0.5)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-brand-400/40 text-brand-600"><I n="scale" className="h-6 w-6" /></div>
            <div className="mt-3 font-mono text-sm text-brand-700">Net Δ ≈ 0</div>
            <div className="mt-1 font-semibold text-slate-900">가격 위험 상쇄</div>
            <p className="mt-2 text-xs text-slate-500">남는 것: <b className="text-brand-600">DeFi 수익</b> ± 펀딩비 − 비용</p>
          </div>
        </div>

        {/* 3단계 요약 */}
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Long in DeFi", k: "DeFi에서 자산 보유·예치", d: "수익이 발생하는 프로토콜에 자산을 예치해 이자와 보상을 받습니다.", c: "text-cyan-300" },
            { n: "02", t: "Short via Perpetuals", k: "같은 규모를 선물로 숏", d: "동일 수량을 무기한 선물로 매도해 가격 방향성 노출을 제거합니다.", c: "text-sky-300" },
            { n: "03", t: "Keep the Yield", k: "가격 위험 상쇄 → 수익 중심", d: "두 포지션의 가격 손익이 상쇄되고, 주로 이자 수익이 포트폴리오에 남습니다.", c: "text-brand-600" },
          ].map((s) => (
            <li key={s.n} className={`${glass} p-6`}>
              <div className={`font-mono text-sm ${s.c}`}>{s.n}</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{s.t}</div>
              <div className="text-sm font-medium text-slate-600">{s.k}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.d}</p>
            </li>
          ))}
        </ol>

        <Scenarios />
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-slate-400" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-6 w-6 rotate-90 md:rotate-0" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12h15M14 6l6 6-6 6" /></svg>
    </div>
  );
}

/** 가격 시나리오별 손익 막대 */
function Scenarios() {
  const sc = [
    { t: "가격 −30%", long: -30, short: 30, y: 1.5 },
    { t: "가격 보합", long: 0, short: 0, y: 1.5 },
    { t: "가격 +30%", long: 30, short: -30, y: 1.5 },
  ];
  const H = 64; // 30% = 64px
  const bar = (v: number, color: string, label: string) => {
    const h = Math.max(v === 0 ? 2 : 6, (Math.abs(v) / 30) * H);
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative w-8 sm:w-10" style={{ height: H * 2 }}>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
          <div className="absolute inset-x-0 rounded-sm" style={{ background: color, height: h, ...(v >= 0 ? { bottom: H } : { top: H }), opacity: 0.9 }} />
        </div>
        <span className={`font-mono text-[11px] tabular-nums ${v > 0 ? "text-emerald-600" : v < 0 ? "text-rose-600" : "text-slate-500"}`}>
          {v > 0 ? "+" : ""}{v}%
        </span>
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
    );
  };
  return (
    <div className={`${glass} mt-10 p-5 sm:p-8`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.2em] text-slate-400">SCENARIO ANALYSIS</div>
          <div className="mt-1 font-semibold text-slate-900">가격이 어떻게 움직여도, 순손익은 수익(Yield) 중심으로 수렴</div>
        </div>
        <span className="text-[11px] text-slate-400">가상 예시 · 기간 수익 1.5% 가정 · 펀딩비/수수료 제외</span>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {sc.map((s) => (
          <div key={s.t} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-4">
            <div className="text-center text-sm font-semibold text-slate-700">{s.t}</div>
            <div className="mt-4 flex justify-center gap-3 sm:gap-4">
              {bar(s.long, C.cyan, "롱")}
              {bar(s.short, C.blue, "숏")}
              {bar(s.y, C.gold, "수익")}
              {bar(s.long + s.short + s.y, "linear-gradient(#f3dca4,#b8913f)", "순손익")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { i: "search", en: "Select Opportunity", t: "고수익 기회 선정", d: "수익률뿐 아니라 프로토콜 안정성, 유동성, 선물 시장 존재 여부를 함께 평가합니다.", pts: ["프로토콜 감사·운영 이력 검토", "선물 시장 유동성·펀딩비 수준 확인", "기대 수익 대비 비용 산출"] },
    { i: "shield", en: "Establish Hedge", t: "선물 숏 헤지 구축", d: "현물 매수 전에 무기한 선물 숏을 먼저 구축해 진입 과정의 가격 노출을 최소화합니다.", pts: ["보수적 레버리지·증거금 버퍼", "분할 진입으로 슬리피지 관리"] },
    { i: "layers", en: "Acquire & Deposit", t: "자산 매입 및 DeFi 예치", d: "헤지와 같은 수량의 자산을 매입해 DeFi 프로토콜에 예치하고 수익 발생을 시작합니다.", pts: ["롱·숏 명목금액 일치 확인", "프로토콜별 예치 한도 분산"] },
    { i: "pulse", en: "Monitor Continuously", t: "펀딩비·베이시스·프로토콜 모니터링", d: "펀딩비 방향, 현·선물 가격 차이(베이시스), 프로토콜 상태와 증거금 비율을 상시 점검합니다.", pts: ["델타 이탈 시 리밸런싱", "펀딩비 역전 시 포지션 축소", "청산가 대비 증거금 여유 유지"] },
    { i: "harvest", en: "Harvest & Unwind", t: "수익 수확 및 포지션 정리", d: "누적된 수익을 정기적으로 수확하고, 만기 또는 조건 변화 시 두 포지션을 함께 정리합니다.", pts: ["롱·숏 동시 청산으로 가격 노출 차단", "실현 수익 정산"] },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <Eyebrow>03 · HOW IT WORKS</Eyebrow>
      <div className="mt-4">
        <Title en="How It Works" ko="운용 프로세스 5단계" desc="전략은 한 번 세팅하고 끝나는 구조가 아니라, 진입부터 정리까지 지속적인 관리가 필요한 프로세스입니다." />
      </div>
      <ol className="relative mt-12 space-y-4 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-gradient-to-b before:from-cyan-300/40 before:via-sky-400/20 before:to-brand-400/40 sm:before:left-[31px]">
        {steps.map((s, idx) => (
          <li key={s.en} className="relative grid grid-cols-[56px_1fr] gap-4 sm:grid-cols-[64px_1fr]">
            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-ink-800 text-cyan-300 shadow-[0_0_30px_-8px_rgba(34,211,238,0.35)] sm:h-16 sm:w-16">
              <I n={s.i} className="h-6 w-6" />
            </div>
            <div className={`${glass} grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]`}>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-slate-400">
                  <span className="font-mono text-cyan-300">STEP {idx + 1}</span> · {s.en.toUpperCase()}
                </div>
                <h3 className="mt-1.5 text-lg font-semibold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.d}</p>
              </div>
              <ul className="space-y-2 self-center rounded-xl border border-white/[0.05] bg-ink-900/50 p-4">
                {s.pts.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-600">
                    <I n="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 수익의 원천: 워터폴 + 플랫폼 이자 흐름 */
function YieldSources() {
  const items = [
    { k: "DeFi 예치 수익", v: 12, from: 0, color: C.cyan },
    { k: "펀딩비 수취", v: 6, from: 12, color: C.blue },
    { k: "거래·가스 비용", v: -2, from: 18, color: C.rose },
    { k: "헤지 유지 비용", v: -1, from: 16, color: C.rose },
    { k: "순 전략 수익", v: 15, from: 0, color: "linear-gradient(#f3dca4,#b8913f)" },
  ];
  const S = 10; // 1% = 10px, 최대 18% = 180px
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <Eyebrow tone="gold">04 · SOURCE OF YIELD</Eyebrow>
      <div className="mt-4">
        <Title
          en={<>Where Does the <span className="text-gold">Yield</span> Come From?</>}
          ko="수익은 어디에서 오나요?"
          desc="전략 수익은 크게 DeFi 예치 수익과 선물 펀딩비로 구성되며, 여기서 거래 비용과 헤지 유지 비용을 뺀 값이 순수익이 됩니다. 펀딩비는 시장 상황에 따라 비용(음수)이 될 수도 있습니다."
        />
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className={`${glass} p-5 sm:p-7`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-slate-400">YIELD WATERFALL</span>
            <span className="text-[11px] text-slate-400">가상 예시 · 연환산 %</span>
          </div>
          <div className="mt-6 grid grid-cols-5 items-end gap-2 sm:gap-4">
            {items.map((it) => {
              const top = Math.max(it.from, it.from + it.v);
              const h = Math.abs(it.v) * S;
              return (
                <div key={it.k} className="flex flex-col items-center">
                  <span className={`mb-1 font-mono text-xs tabular-nums ${it.v < 0 ? "text-rose-600" : it.k.startsWith("순") ? "text-brand-600" : "text-slate-700"}`}>
                    {it.v > 0 ? "+" : ""}{it.v}%
                  </span>
                  <div className="relative w-full max-w-[56px]" style={{ height: 190 }}>
                    <div className="absolute inset-x-0 rounded-md" style={{ background: it.color, height: h, bottom: top * S - h, opacity: 0.9 }} />
                  </div>
                  <span className="mt-2 text-center text-[10px] leading-tight text-slate-500 sm:text-[11px]">{it.k}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-px bg-white/15" />
        </div>
        <div className="grid gap-3">
          {[
            { i: "layers", t: "DeFi 예치 수익", d: "대출 이자, 유동성 공급 수수료, 프로토콜 인센티브 보상", c: "text-cyan-300" },
            { i: "funding", t: "펀딩비 (Funding Rate)", d: "롱 수요가 많은 시장에서는 숏 포지션이 펀딩비를 수취합니다. 반대로 역전되면 비용이 됩니다.", c: "text-sky-300" },
            { i: "minus", t: "비용", d: "거래 수수료, 가스비, 슬리피지, 리밸런싱 비용", c: "text-rose-600" },
          ].map((x) => (
            <div key={x.t} className={`${glass} flex gap-4 p-5`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ${x.c}`}><I n={x.i} /></div>
              <div>
                <div className="font-semibold text-slate-900">{x.t}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 플랫폼 이자로 이어지는 흐름 */}
      <div className="mt-10 rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-50/40 via-ink-900/60 to-ink-900/60 p-6 sm:p-8">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-brand-500">FROM STRATEGY TO YOUR DAILY INTEREST</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">회원님의 매일 이자는 이렇게 만들어집니다</div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-5">
          {[
            { i: "user", t: "포인트 예치", d: "회원이 상품·기간을 선택해 예치" },
            { i: "pool", t: "운용 풀", d: "예치 자금을 운용 풀로 통합" },
            { i: "scale", t: "델타 뉴트럴 운용", d: "롱(DeFi) + 숏(선물) 구조로 운용" },
            { i: "coin", t: "운용 수익", d: "DeFi 수익 ± 펀딩비 − 비용" },
            { i: "clock", t: "매일 00:00 정산", d: "기간 이율을 일 단위로 나눠 이자 정산" },
          ].map((s, i) => (
            <li key={s.t} className="relative rounded-2xl border border-white/[0.06] bg-ink-900/60 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><I n={s.i} className="h-4 w-4" /></span>
                <span className="font-mono text-[11px] text-slate-400">0{i + 1}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900">{s.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          * 이자 지급의 재원은 운용 성과이며, 운용 결과에 따라 상품 구성과 이율이 조정될 수 있습니다. 아래 위험 고지를 반드시 확인하세요.
        </p>
      </div>
    </section>
  );
}

function Benefits() {
  const b = [
    { i: "scale", en: "Market-Neutral Exposure", t: "시장 중립적 노출", d: "롱과 숏이 상쇄되어 시장 방향에 대한 노출을 낮게 유지합니다." },
    { i: "target", en: "Elevated DeFi Yields", t: "높은 DeFi 수익 확보", d: "가격 위험을 헤지한 상태에서 DeFi의 높은 수익 기회에 접근합니다." },
    { i: "shield", en: "Reduced Directional Risk", t: "방향성 위험 축소", d: "자산 가격 급락이 포트폴리오 전체 가치에 미치는 영향을 줄입니다." },
    { i: "grid", en: "Structured Approach", t: "구조화된 접근", d: "투기적 파밍이 아닌, 규칙과 한도에 기반한 체계적인 운용입니다." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <Eyebrow>05 · KEY BENEFITS</Eyebrow>
      <div className="mt-4"><Title en="Key Benefits" ko="이 구조의 핵심 장점" /></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {b.map((x) => (
          <div key={x.en} className={`${glass} group p-6 transition hover:border-cyan-300/25`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-300"><I n={x.i} /></div>
            <div className="mt-5 text-[11px] font-semibold tracking-[0.15em] text-slate-400">{x.en.toUpperCase()}</div>
            <div className="mt-1 font-semibold text-slate-900">{x.t}</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{x.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskFramework() {
  const risks = [
    { i: "funding", en: "Funding Rate Risk", t: "펀딩비 위험", lv: 3, d: "펀딩비가 음수로 역전되면 숏 포지션이 비용을 지불하게 되어 수익이 줄거나 손실이 발생할 수 있습니다.", m: "펀딩비 임계치 모니터링, 역전 지속 시 포지션 축소·정리" },
    { i: "code", en: "Smart Contract / Protocol Risk", t: "스마트 컨트랙트·프로토콜 위험", lv: 4, d: "해킹, 코드 결함, 오라클 오류, 거버넌스 공격 등으로 예치 자산 일부 또는 전부를 잃을 수 있습니다.", m: "감사·운영 이력 검증된 프로토콜 위주, 프로토콜별 예치 한도 분산" },
    { i: "drop", en: "Basis & Liquidity Risk", t: "베이시스·유동성 위험", lv: 3, d: "현물과 선물 가격 차이가 벌어지거나 시장 유동성이 부족하면, 헤지가 불완전해지고 청산 비용이 커질 수 있습니다.", m: "유동성 깊은 시장 위주 선정, 분할 진입·청산" },
    { i: "alert", en: "Liquidation Risk (Futures Leg)", t: "선물 포지션 청산 위험", lv: 4, d: "가격 급등 시 숏 포지션의 증거금이 부족해지면 강제 청산되어 헤지가 깨지고 손실이 확정될 수 있습니다.", m: "보수적 레버리지, 충분한 증거금 버퍼, 자동 알림 및 리밸런싱" },
    { i: "link", en: "Counterparty Risk", t: "거래상대방 위험", lv: 3, d: "거래소 파산, 출금 중단, 규제 조치 등으로 선물 포지션이나 증거금에 접근하지 못할 수 있습니다.", m: "복수 거래소 분산, 거래소별 노출 한도 관리" },
  ];
  return (
    <section id="risk" className="relative scroll-mt-24 py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/30 to-transparent" />
      <div className="mx-auto max-w-6xl px-4">
        <Eyebrow tone="rose">06 · RISK FRAMEWORK</Eyebrow>
        <div className="mt-4">
          <Title
            en="Risk Framework"
            ko="위험 고지 — 숨기지 않고 공개합니다"
            desc="델타 뉴트럴 전략은 가격 방향성 위험을 줄이지만, 위험을 없애지는 않습니다. 아래 위험들은 실제로 손실을 발생시킬 수 있으며, 전략은 지속적인 관리를 전제로 합니다."
          />
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.07] px-5 py-4">
          <I n="alert" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm leading-relaxed text-rose-800">
            <b>이 전략은 무위험(Risk-free)이 아닙니다.</b> 원금 손실이 발생할 수 있으며, 표시된 이율은 원금이나 수익을 보장하지 않습니다.
            능동적인 위험 관리가 필요한 구조입니다.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
          <div className="hidden grid-cols-[1.3fr_2fr_0.6fr_1.6fr] gap-4 bg-white/[0.03] px-6 py-3 text-[11px] font-semibold tracking-[0.15em] text-slate-400 lg:grid">
            <span>RISK</span><span>설명</span><span>영향도</span><span>관리 방식</span>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {risks.map((r) => (
              <li key={r.en} className="grid gap-3 bg-ink-900/40 px-5 py-5 sm:px-6 lg:grid-cols-[1.3fr_2fr_0.6fr_1.6fr] lg:items-center lg:gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/[0.06] text-rose-600"><I n={r.i} /></span>
                  <div>
                    <div className="font-semibold text-slate-900">{r.t}</div>
                    <div className="text-[11px] text-slate-400">{r.en}</div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-500">{r.d}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 lg:hidden">영향도</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`h-2 w-4 rounded-sm ${n <= r.lv ? (r.lv >= 4 ? "bg-rose-500" : "bg-amber-500") : "bg-white/10"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                  <I n="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> {r.m}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function WhoFor() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <Eyebrow>07 · SUITABILITY</Eyebrow>
      <div className="mt-4"><Title en="Who This Is For" ko="이런 분께 적합합니다 / 적합하지 않습니다" /></div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-6 sm:p-7">
          <div className="flex items-center gap-2 font-semibold text-emerald-700"><I n="check" /> 적합한 분</div>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            {["가격 방향성 노출을 통제하면서 수익을 추구하는 분", "전략 구조와 위험 요소를 이해하고 감내할 수 있는 분", "정해진 기간 동안 자금을 운용할 수 있는 분", "수익률뿐 아니라 위험 관리 방식을 중요하게 보는 분"].map((t) => (
              <li key={t} className="flex gap-2"><I n="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-6 sm:p-7">
          <div className="flex items-center gap-2 font-semibold text-rose-700"><I n="x" /> 적합하지 않은 분</div>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            {["원금 보장을 기대하는 분", "위험 고지를 충분히 이해하지 못한 분", "'넣어두기만 하면 되는' 완전 수동형 수익을 기대하는 분", "단기간 고수익만을 목표로 하는 분"].map((t) => (
              <li key={t} className="flex gap-2"><I n="x" className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-sky-500/[0.10] via-ink-900 to-brand-50/50 px-6 py-14 text-center sm:px-14 sm:py-20">
        <div aria-hidden className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <Eyebrow>STRUCTURED · RISK-MANAGED · DELTA-NEUTRAL</Eyebrow>
        <h2 className="mt-5 text-[1.9rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Structured Yield,
          <br />
          <span className={blueText}>Transparently Managed.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
          수익의 원천과 위험을 모두 공개합니다. 구조를 이해하셨다면, 기간별 상품과 이율을 확인해 보세요.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href={ctaHref} className="btn-primary !rounded-full !px-7 !py-3">{ctaLabel} →</Link>
          <a href="#risk" className="btn-secondary !rounded-full !px-7 !py-3">위험 고지 다시 보기</a>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-4xl text-center text-[11px] leading-relaxed text-slate-400">
        {RISK_NOTICE} 본 페이지의 그래프와 수치는 구조 이해를 위한 가상 예시이며 실제 또는 미래의 성과를 나타내지 않습니다.
      </p>
    </section>
  );
}

export default function StrategyContent({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <div className="relative">
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <YieldSources />
      <Benefits />
      <RiskFramework />
      <WhoFor />
      <FinalCta ctaHref={ctaHref} ctaLabel={ctaLabel} />
    </div>
  );
}
