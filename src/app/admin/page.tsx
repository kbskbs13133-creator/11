import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kstToday, dateKey } from "@/lib/date";
import { s2 } from "@/lib/money";
import { formatAmount } from "@/lib/format";
import BatchPanel from "./BatchPanel";
import { getT } from "@/lib/i18n/server";

export default async function AdminHome() {
  const tr = getT();
  const today = kstToday();
  const [userCount, pendingCount, activeAgg, todayInterest, productCount, runs] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.pointTransaction.count({ where: { status: "PENDING" } }),
    prisma.deposit.aggregate({ where: { status: "ACTIVE" }, _sum: { principal: true }, _count: true }),
    prisma.interestLog.aggregate({ where: { interestDate: today }, _sum: { amount: true }, _count: true }),
    prisma.product.count(),
    prisma.batchRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
  ]);

  const stats = [
    { label: tr("전체 회원"), value: tr("{n}명", { n: userCount }), href: "/admin/users" },
    { label: tr("처리 대기 신청"), value: tr("{n}건", { n: pendingCount }), href: "/admin/transactions", alert: pendingCount > 0 },
    { label: tr("진행중 예치 원금"), value: formatAmount(s2(activeAgg._sum.principal) ?? "0"), sub: tr("{n}건", { n: activeAgg._count }), href: "/admin/deposits" },
    { label: tr("오늘({date}) 지급 이자", { date: dateKey(today) }), value: formatAmount(s2(todayInterest._sum.amount) ?? "0"), sub: tr("{n}건", { n: todayInterest._count }), href: "/admin/deposits" },
    { label: tr("등록 상품"), value: tr("{n} / 10개", { n: productCount }), href: "/admin/products" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">{tr("관리자 개요")}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`card !p-4 transition hover:shadow-md ${s.alert ? "ring-2 ring-amber-300" : ""}`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold sm:text-xl ${s.alert ? "text-amber-600" : ""}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-slate-400">{s.sub}</p>}
          </Link>
        ))}
      </div>
      <BatchPanel
        today={dateKey(today)}
        runs={runs.map((r) => ({
          id: r.id,
          trigger: r.trigger,
          targetDate: r.targetDate.toISOString(),
          status: r.status,
          processedCount: r.processedCount,
          interestCount: r.interestCount,
          totalInterest: r.totalInterest.toFixed(2),
          completedCount: r.completedCount,
          failedCount: r.failedCount,
          startedAt: r.startedAt.toISOString(),
          finishedAt: r.finishedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
