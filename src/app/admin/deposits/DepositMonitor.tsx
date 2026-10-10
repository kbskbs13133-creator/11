"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { DepositStatusBadge } from "@/components/Badge";
import ProgressBar, { depositProgress } from "@/components/ProgressBar";
import { formatAmount, formatDate, formatRate, termLabel } from "@/lib/format";
import type { DepositDTO } from "@/lib/serializers";
import { useT } from "@/components/LocaleProvider";
import { L } from "@/lib/i18n";

type Row = DepositDTO & { userName: string; userEmail: string };
type Total = { status: string; count: number; principal: string; interest: string };

const TABS = [
  { key: "", label: "전체" },
  { key: "ACTIVE", label: "진행중@status" },
  { key: "COMPLETED", label: "완료@status" },
  { key: "CANCELLED", label: "취소@status" },
];

export default function DepositMonitor({ deposits, totals, status, q }: { deposits: Row[]; totals: Total[]; status: string; q: string }) {
  const tr = useT();
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState(q);
  const [busy, setBusy] = useState<string | null>(null);

  const go = (s: string, query: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (query) p.set("q", query);
    router.push(`/admin/deposits${p.size ? `?${p}` : ""}`);
  };

  async function cancel(d: Row) {
    if (!confirm(tr("{user}님의 '{product}' 예치({amount})를 강제 해지하시겠습니까?\n원금이 반환되고 이후 이자는 지급되지 않습니다.", { user: d.userName, product: L(tr.locale, d.productName, d.productNameEn), amount: formatAmount(d.principal) }))) return;
    setBusy(d.id);
    try {
      await api(`/api/admin/deposits/${d.id}/cancel`, { method: "POST" });
      toast(tr("예치가 해지되었습니다."), "success");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  const t = (s: string) => totals.find((x) => x.status === s);

  return (
    <div className="space-y-5">
      <h1 className="page-title">{tr("예치 현황 모니터링")}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { s: "ACTIVE", label: tr("진행중@status"), color: "text-brand-600" },
          { s: "COMPLETED", label: tr("만기 완료"), color: "text-emerald-600" },
          { s: "CANCELLED", label: tr("해지"), color: "text-rose-600" },
        ].map(({ s, label, color }) => (
          <div key={s} className="card !p-4">
            <p className="text-xs text-slate-500">{label} · {tr("{n}건", { n: t(s)?.count ?? 0 })}</p>
            <p className={`mt-1 text-lg font-bold ${color}`}>{formatAmount(t(s)?.principal ?? "0")}</p>
            <p className="text-xs text-slate-500">{tr("지급 이자")} {formatAmount(t(s)?.interest ?? "0")}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => go(tab.key, search)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === tab.key ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-400/25" : "text-slate-500 hover:text-slate-800"}`}>
              {tr(tab.label)}
            </button>
          ))}
        </div>
        <form className="flex w-full gap-2 sm:w-auto" onSubmit={(e) => { e.preventDefault(); go(status, search); }}>
          <input className="input sm:w-64" placeholder={tr("회원명/이메일/상품명")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-secondary">{tr("검색")}</button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{tr("회원")}</th><th>{tr("상품 / 기간")}</th><th className="!text-right">{tr("원금")}</th><th className="!text-right">{tr("총이율")}</th>
              <th className="!text-right">{tr("누적 / 예상 이자")}</th><th>{tr("시작 ~ 만기")}</th><th>{tr("진행률")}</th><th>{tr("상태")}</th><th className="!text-right">{tr("관리")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deposits.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-slate-400">{tr("예치 내역이 없습니다.")}</td></tr>}
            {deposits.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td><div className="font-medium">{d.userName}</div><div className="text-xs text-slate-500">{d.userEmail}</div></td>
                <td><div>{L(tr.locale, d.productName, d.productNameEn)}</div><div className="text-xs text-slate-500">{termLabel(d.termDays, tr.locale)} ({tr("{n}일", { n: d.termDays })})</div></td>
                <td className="text-right font-semibold">{formatAmount(d.principal)}</td>
                <td className="text-right">
                  {formatRate(d.totalRate)}
                  <div className="text-[11px] text-slate-400">{formatRate(d.baseRate)} + VIP{d.vipLevel} {formatRate(d.vipBonusRate)}</div>
                </td>
                <td className="text-right"><span className="font-semibold text-emerald-600">{formatAmount(d.accruedInterest)}</span><div className="text-xs text-slate-400">/ {formatAmount(d.expectedInterest)}</div></td>
                <td className="text-xs">{formatDate(d.startDate)} ~ {formatDate(d.endDate)}<div className="text-slate-400">{tr("최근 지급")} {formatDate(d.lastInterestDate)}</div></td>
                <td className="min-w-[100px]"><ProgressBar value={depositProgress(d.startDate, d.termDays, d.lastInterestDate, d.status)} tone={d.status === "COMPLETED" ? "green" : d.status === "CANCELLED" ? "gray" : "brand"} /></td>
                <td><DepositStatusBadge status={d.status} /></td>
                <td className="text-right">
                  {d.status === "ACTIVE" ? <button className="btn-danger btn-sm" disabled={busy === d.id} onClick={() => cancel(d)}>{tr("강제 해지")}</button> : <span className="text-xs text-slate-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
