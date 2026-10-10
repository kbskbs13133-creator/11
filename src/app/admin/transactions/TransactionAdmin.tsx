"use client";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { TxStatusBadge, TxTypeBadge } from "@/components/Badge";
import { formatAmount, formatDateTime } from "@/lib/format";
import type { TransactionDTO } from "@/lib/serializers";

type Row = TransactionDTO & { user: { id: string; name: string; email: string; balance: string }; processedBy: string | null };

const STATUS_TABS = [
  { key: "PENDING", label: "처리중" },
  { key: "APPROVED", label: "처리완료" },
  { key: "REJECTED", label: "거절됨" },
  { key: "", label: "전체" },
];
const TYPE_TABS = [
  { key: "", label: "전체 유형" },
  { key: "CHARGE", label: "충전 신청" },
  { key: "WITHDRAW", label: "환전 신청" },
  { key: "ADMIN_CHARGE", label: "관리자 충전" },
];

export default function TransactionAdmin() {
  const toast = useToast();
  const [status, setStatus] = useState("PENDING");
  const [type, setType] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    try {
      const data = await api<{ transactions: Row[] }>(`/api/admin/transactions?${params}`);
      setRows(data.transactions);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [status, type, toast]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 10000); // 신규 신청 자동 반영
    return () => clearInterval(t);
  }, [load]);

  async function approve(r: Row) {
    const label = r.type === "CHARGE" ? "충전" : "환전";
    if (!confirm(`${r.user.name}님의 ${label} 신청 ${formatAmount(r.amount)}을(를) 승인하시겠습니까?`)) return;
    setBusyId(r.id);
    try {
      await api(`/api/admin/transactions/${r.id}`, { method: "POST", json: { action: "approve" } });
      toast(`${label} 신청이 승인되었습니다.`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await api(`/api/admin/transactions/${rejectTarget.id}`, { method: "POST", json: { action: "reject", reason } });
      toast("신청이 거절되었습니다.", "success");
      setRejectTarget(null);
      setReason("");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">충전/환전 신청 관리</h1>
        <p className="mt-1 text-sm text-slate-500">승인 시 회원 포인트가 즉시 증감됩니다. 목록은 10초마다 자동 갱신됩니다.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {STATUS_TABS.map((t) => (
            <button key={t.key} onClick={() => setStatus(t.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === t.key ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-400/25" : "text-slate-500 hover:text-slate-800"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPE_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>신청일시</th>
              <th>회원</th>
              <th>유형</th>
              <th className="!text-right">금액</th>
              <th className="!text-right">회원 현재 잔액</th>
              <th>메모</th>
              <th>상태</th>
              <th className="!text-right">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-400">불러오는 중...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-400">내역이 없습니다.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</td>
                <td>
                  <div className="font-medium">{r.user.name}</div>
                  <div className="text-xs text-slate-500">{r.user.email}</div>
                </td>
                <td><TxTypeBadge type={r.type} /></td>
                <td className={`text-right font-semibold ${r.type === "WITHDRAW" ? "text-violet-700" : "text-blue-700"}`}>
                  {r.type === "WITHDRAW" ? "-" : "+"}{formatAmount(r.amount)}
                </td>
                <td className="text-right text-slate-600">{formatAmount(r.user.balance)}</td>
                <td className="max-w-[200px] truncate text-xs text-slate-500" title={r.memo ?? ""}>{r.memo ?? "-"}</td>
                <td>
                  <TxStatusBadge status={r.status} />
                  {r.status === "REJECTED" && r.rejectReason && <div className="mt-1 max-w-[180px] truncate text-xs text-rose-500" title={r.rejectReason}>{r.rejectReason}</div>}
                  {r.status !== "PENDING" && <div className="mt-1 text-[11px] text-slate-400">{r.processedBy} · {formatDateTime(r.processedAt)}</div>}
                </td>
                <td className="text-right">
                  {r.status === "PENDING" ? (
                    <div className="flex justify-end gap-1.5">
                      <button className="btn-success btn-sm" disabled={busyId === r.id} onClick={() => approve(r)}>승인</button>
                      <button className="btn-danger btn-sm" disabled={busyId === r.id} onClick={() => setRejectTarget(r)}>거절</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="신청 거절">
        {rejectTarget && (
          <form onSubmit={reject} className="space-y-4">
            <p className="text-sm text-slate-600">
              {rejectTarget.user.name}님의 {rejectTarget.type === "CHARGE" ? "충전" : "환전"} 신청 <b>{formatAmount(rejectTarget.amount)}</b>
            </p>
            <div>
              <label className="label">거절 사유 (회원에게 표시됩니다)</label>
              <textarea className="input min-h-[90px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required autoFocus placeholder="예: 입금 내역이 확인되지 않습니다." />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setRejectTarget(null)}>취소</button>
              <button className="btn-danger flex-1" disabled={busyId === rejectTarget.id}>거절하기</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
