import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/session";
import { getBalanceSummary } from "@/lib/balance";
import { depositDTO } from "@/lib/serializers";
import { s2, ZERO } from "@/lib/money";
import { formatAmount, formatDate, formatDateTime, formatRate, termLabel } from "@/lib/format";
import { DepositStatusBadge, VipBadge } from "@/components/Badge";
import ProgressBar, { depositProgress } from "@/components/ProgressBar";

export const metadata = { title: "대시보드 | 포인트 예치 플랫폼" };

export default async function DashboardPage() {
  const me = await requireUserPage();
  const [summary, active, agg, logs, pendingCount] = await Promise.all([
    getBalanceSummary(me.id),
    prisma.deposit.findMany({ where: { userId: me.id, status: "ACTIVE" }, orderBy: { endDate: "asc" } }),
    prisma.deposit.aggregate({ where: { userId: me.id }, _sum: { accruedInterest: true } }),
    prisma.interestLog.findMany({ where: { userId: me.id }, orderBy: [{ createdAt: "desc" }, { interestDate: "desc" }], take: 8, include: { deposit: { select: { productName: true } } } }),
    prisma.pointTransaction.count({ where: { userId: me.id, status: "PENDING" } }),
  ]);
  const activeDTO = active.map(depositDTO);
  const activePrincipal = active.reduce((a, d) => a.add(d.principal), ZERO);
  const { user } = summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">안녕하세요, {user.name}님</h1>
        <VipBadge level={user.vipLevel} name={user.vip.name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-900 text-white sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-blue-100">보유 포인트</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(s2(summary.balance))}</p>
          <p className="mt-2 text-xs text-blue-100">사용 가능 {formatAmount(s2(summary.available))}</p>
          <Link href="/wallet" className="mt-3 inline-block text-xs font-semibold text-white underline-offset-2 hover:underline">
            지갑 바로가기 →
          </Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">예치중 원금</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(s2(activePrincipal))}</p>
          <p className="mt-2 text-xs text-slate-500">진행중 {active.length}건</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">누적 수령 이자</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">+{formatAmount(s2(agg._sum.accruedInterest) ?? "0")}</p>
          <p className="mt-2 text-xs text-slate-500">매일 00:00 자동 지급</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">내 VIP 혜택</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">+{formatRate(user.vip.bonusRate.toString())}</p>
          <p className="mt-2 text-xs text-slate-500">VIP {user.vipLevel} · {user.vip.name} 추가 이율</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <Link href="/wallet" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
          처리중인 충전/환전 신청이 {pendingCount}건 있습니다. →
        </Link>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">진행중인 예치</h2>
          <Link href="/my-deposits" className="text-sm text-brand-600 hover:underline">전체 보기</Link>
        </div>
        {activeDTO.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-slate-500">진행중인 예치가 없습니다.</p>
            <Link href="/products" className="btn-primary mt-3">상품 둘러보기</Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeDTO.map((d) => (
              <Link key={d.id} href="/my-deposits" className="card block !p-4 transition hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{d.productName}</div>
                  <DepositStatusBadge status={d.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{termLabel(d.termDays)} · 총이율 {formatRate(d.totalRate)} · 만기 {formatDate(d.endDate)}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-slate-500">원금</div>
                    <div className="font-bold">{formatAmount(d.principal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">누적 이자 / 예상</div>
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
        <h2 className="text-lg font-bold">최근 이자 지급</h2>
        {logs.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">아직 지급된 이자가 없습니다.</div>
        ) : (
          <ul className="card divide-y divide-slate-100 !p-0">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.deposit.productName} <span className="text-xs text-slate-400">{l.dayIndex}일차</span></div>
                  <div className="text-xs text-slate-500">{formatDate(l.interestDate)} 귀속 · 지급 {formatDateTime(l.createdAt)}</div>
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
