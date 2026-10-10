import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { depositDTO } from "@/lib/serializers";
import { s2, ZERO } from "@/lib/money";
import { formatAmount, formatDate, formatDateTime, formatRate, termLabel } from "@/lib/format";
import { DepositStatusBadge, VipBadge } from "@/components/Badge";
import ProgressBar, { depositProgress } from "@/components/ProgressBar";
import { pageTitle } from "@/lib/i18n/server";
import { getT } from "@/lib/i18n/server";
import { L } from "@/lib/i18n";

export const generateMetadata = pageTitle("대시보드");

export default async function DashboardPage() {
  const tr = getT();
  const me = await requireUserPage();
  const [summary, active, agg, logs, pendingCount] = await Promise.all([
    getBalanceSummary(me.id),
    prisma.deposit.findMany({ where: { userId: me.id, status: "ACTIVE" }, orderBy: { endDate: "asc" } }),
    prisma.deposit.aggregate({ where: { userId: me.id }, _sum: { accruedInterest: true } }),
    prisma.interestLog.findMany({ where: { userId: me.id }, orderBy: [{ createdAt: "desc" }, { interestDate: "desc" }], take: 8, include: { deposit: { select: { productName: true, productNameEn: true } } } }),
    prisma.pointTransaction.count({ where: { userId: me.id, status: "PENDING" } }),
  ]);
  const activeDTO = active.map(depositDTO);
  const activePrincipal = active.reduce((a, d) => a.add(d.principal), ZERO);
  const { user } = summary;
  const vipName = L(tr.locale, user.vip.name, user.vip.nameEn);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">MY ACCOUNT</p>
          <h1 className="page-title mt-1">{tr("안녕하세요, {name}님", { name: user.name })}</h1>
        </div>
        <VipBadge level={user.vipLevel} name={vipName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-gold sm:col-span-2 lg:col-span-1">
          <p className="eyebrow">BALANCE</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gold">{formatAmount(s2(summary.balance))}</p>
          <p className="mt-2 text-xs text-slate-500">{tr("사용 가능 {amount}", { amount: formatAmount(s2(summary.available)) })}</p>
          <Link href="/wallet" className="mt-3 inline-block text-xs font-semibold text-brand-600 underline-offset-2 hover:underline">
            {tr("지갑 바로가기 →")}
          </Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{tr("예치중 원금")}</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(s2(activePrincipal))}</p>
          <p className="mt-2 text-xs text-slate-500">{tr("진행중 {n}건", { n: active.length })}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{tr("누적 수령 이자")}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">+{formatAmount(s2(agg._sum.accruedInterest) ?? "0")}</p>
          <p className="mt-2 text-xs text-slate-500">{tr("매일 00:00 자동 지급")}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{tr("내 VIP 혜택")}</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">+{formatRate(user.vip.bonusRate.toString())}</p>
          <p className="mt-2 text-xs text-slate-500">{tr("VIP {level} · {name} 추가 이율", { level: user.vipLevel, name: vipName })}</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <Link href="/wallet" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
          {tr("처리중인 충전/환전 신청이 {n}건 있습니다. →", { n: pendingCount })}
        </Link>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{tr("진행중인 예치")}</h2>
          <Link href="/my-deposits" className="text-sm text-brand-600 hover:underline">{tr("전체 보기")}</Link>
        </div>
        {activeDTO.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-slate-500">{tr("진행중인 예치가 없습니다.")}</p>
            <Link href="/products" className="btn-primary mt-3">{tr("상품 둘러보기")}</Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeDTO.map((d) => (
              <Link key={d.id} href="/my-deposits" className="card block !p-4 transition hover:border-brand-400/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{L(tr.locale, d.productName, d.productNameEn)}</div>
                  <DepositStatusBadge status={d.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{termLabel(d.termDays, tr.locale)} · {tr("총이율")} {formatRate(d.totalRate)} · {tr("만기")} {formatDate(d.endDate)}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-slate-500">{tr("원금")}</div>
                    <div className="font-bold">{formatAmount(d.principal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{tr("누적 이자 / 예상")}</div>
                    <div className="font-semibold text-emerald-600">+{formatAmount(d.accruedInterest)} <span className="text-xs font-normal text-slate-400">/ {formatAmount(d.expectedInterest)}</span></div>
                  </div>
                </div>
                <div className="mt-3"><ProgressBar value={depositProgress(d.startDate, d.termDays, d.lastInterestDate, d.status)} /></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{tr("최근 이자 지급")}</h2>
        {logs.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">{tr("아직 지급된 이자가 없습니다.")}</div>
        ) : (
          <ul className="card divide-y divide-slate-100 !p-0">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{L(tr.locale, l.deposit.productName, l.deposit.productNameEn)} <span className="text-xs text-slate-400">{tr("{n}일차", { n: l.dayIndex })}</span></div>
                  <div className="text-xs text-slate-500">{tr("{date} 귀속", { date: formatDate(l.interestDate) })} · {tr("지급")} {formatDateTime(l.createdAt)}</div>
                </div>
                <div className="shrink-0 font-semibold text-emerald-600">+{formatAmount(s2(l.amount))}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
