"use client";
import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { api } from "@/lib/client";
import { DepositStatusBadge } from "@/components/Badge";
import ProgressBar, { depositProgress } from "@/components/ProgressBar";
import { formatAmount, formatDate, formatDateTime, formatRate, termLabel } from "@/lib/format";
import type { DepositDTO } from "@/lib/serializers";
import { useT } from "@/components/LocaleProvider";
import { L } from "@/lib/i18n";

type Log = { id: string; interestDate: string; dayIndex: number; amount: string; balanceAfter: string; createdAt: string };

const TABS = [
  { key: "ALL", label: "전체" },
  { key: "ACTIVE", label: "진행중@status" },
  { key: "COMPLETED", label: "완료@status" },
  { key: "CANCELLED", label: "취소@status" },
];

export default function MyDeposits({ deposits }: { deposits: DepositDTO[] }) {
  const tr = useT();
  const [tab, setTab] = useState("ALL");
  const [logTarget, setLogTarget] = useState<DepositDTO | null>(null);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const list = tab === "ALL" ? deposits : deposits.filter((d) => d.status === tab);

  async function openLogs(d: DepositDTO) {
    setLogTarget(d);
    setLogs(null);
    const data = await api<{ logs: Log[] }>(`/api/deposits/${d.id}/logs`).catch(() => ({ logs: [] }));
    setLogs(data.logs);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">{tr("내 예치 내역")}</h1>
        <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.key ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-400/25" : "text-slate-500 hover:text-slate-800"}`}>
              {tr(t.label)}
              <span className="ml-1 text-xs text-slate-400">{t.key === "ALL" ? deposits.length : deposits.filter((d) => d.status === t.key).length}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-slate-500">{tr("예치 내역이 없습니다.")}</p>
          <Link href="/products" className="btn-primary mt-3">{tr("상품 보러가기")}</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((d) => {
            const progress = depositProgress(d.startDate, d.termDays, d.lastInterestDate, d.status);
            return (
              <div key={d.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{L(tr.locale, d.productName, d.productNameEn)}</div>
                    <div className="text-xs text-slate-500">{termLabel(d.termDays, tr.locale)} ({tr("{n}일", { n: d.termDays })})</div>
                  </div>
                  <DepositStatusBadge status={d.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-xs text-slate-500">{tr("원금")}</dt><dd className="font-bold">{formatAmount(d.principal)}</dd></div>
                  <div><dt className="text-xs text-slate-500">{tr("누적 이자")}</dt><dd className="font-bold text-emerald-600">+{formatAmount(d.accruedInterest)}</dd></div>
                  <div><dt className="text-xs text-slate-500">{tr("총 이율")}</dt><dd>{formatRate(d.totalRate)} <span className="text-xs text-slate-400">({tr("기본")} {formatRate(d.baseRate)} + VIP{d.vipLevel} {formatRate(d.vipBonusRate)})</span></dd></div>
                  <div><dt className="text-xs text-slate-500">{tr("만기 예상 이자")}</dt><dd>{formatAmount(d.expectedInterest)}</dd></div>
                  <div><dt className="text-xs text-slate-500">{tr("시작일")}</dt><dd>{formatDate(d.startDate)}</dd></div>
                  <div><dt className="text-xs text-slate-500">{tr("만기일")}</dt><dd>{formatDate(d.endDate)}</dd></div>
                  <div><dt className="text-xs text-slate-500">{tr("마지막 이자 지급일")}</dt><dd>{formatDate(d.lastInterestDate)}</dd></div>
                  <div>
                    <dt className="text-xs text-slate-500">{d.status === "COMPLETED" ? tr("완료일시") : d.status === "CANCELLED" ? tr("해지일시") : tr("예치일시")}</dt>
                    <dd className="text-xs">{formatDateTime(d.completedAt ?? d.cancelledAt ?? d.createdAt)}</dd>
                  </div>
                </dl>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{tr("진행률")}</span><span>{Math.floor(progress)}%</span></div>
                  <ProgressBar value={progress} tone={d.status === "COMPLETED" ? "green" : d.status === "CANCELLED" ? "gray" : "brand"} />
                </div>
                {d.status === "COMPLETED" && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{tr("만기 완료 · 원금 {amount}이 포인트로 정산되었습니다.", { amount: formatAmount(d.principal) })}</p>}
                {d.status === "CANCELLED" && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{tr("관리자에 의해 해지되어 원금이 반환되었습니다.")}</p>}
                <button className="btn-secondary btn-sm w-full" onClick={() => openLogs(d)}>{tr("일별 이자 지급 내역")}</button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!logTarget} onClose={() => setLogTarget(null)} title={tr("이자 지급 내역")}>
        {logTarget && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {L(tr.locale, logTarget.productName, logTarget.productNameEn)} · {tr("원금")} {formatAmount(logTarget.principal)} · {tr("누적")} <b className="text-emerald-600">+{formatAmount(logTarget.accruedInterest)}</b>
            </p>
            {logs === null ? (
              <p className="py-6 text-center text-sm text-slate-400">{tr("불러오는 중...")}</p>
            ) : logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">{tr("아직 지급된 이자가 없습니다. 예치 다음 날 00:00부터 지급됩니다.")}</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                    <tr><th className="px-3 py-2 text-left">{tr("귀속일")}</th><th className="px-3 py-2 text-left">{tr("일차")}</th><th className="px-3 py-2 text-right">{tr("이자")}</th><th className="px-3 py-2 text-right">{tr("지급 후 잔액")}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">{formatDate(l.interestDate)}</td>
                        <td className="px-3 py-2 text-slate-500">{l.dayIndex}/{logTarget.termDays}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600">+{formatAmount(l.amount)}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{formatAmount(l.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
