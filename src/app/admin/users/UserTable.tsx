"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { formatAmount, formatDateTime } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  email: string;
  vipLevel: number;
  pointBalance: string;
  activePrincipal: string;
  activeCount: number;
  createdAt: string;
};

export default function UserTable({ users, vipLevels, q }: { users: Row[]; vipLevels: { level: number; name: string }[]; q: string }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState(q);
  const [chargeTarget, setChargeTarget] = useState<Row | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  async function changeVip(u: Row, level: number) {
    try {
      await api(`/api/admin/users/${u.id}/vip`, { method: "PATCH", json: { vipLevel: level } });
      toast(`${u.name}님의 VIP 등급이 ${level}단계로 변경되었습니다.`, "success");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function charge(e: React.FormEvent) {
    e.preventDefault();
    if (!chargeTarget) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${chargeTarget.id}/charge`, { method: "POST", json: { amount: amount.replace(/,/g, ""), memo } });
      toast(`${chargeTarget.name}님에게 ${formatAmount(amount.replace(/,/g, ""))} 충전 완료`, "success");
      setChargeTarget(null);
      setAmount("");
      setMemo("");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">회원 관리</h1>
          <p className="mt-1 text-sm text-slate-500">총 {users.length}명</p>
        </div>
        <form
          className="flex w-full gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`);
          }}
        >
          <input className="input sm:w-64" placeholder="이름 또는 이메일 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-secondary">검색</button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>회원</th>
              <th className="!text-right">보유 포인트</th>
              <th className="!text-right">예치중 원금</th>
              <th>VIP 등급</th>
              <th>가입일</th>
              <th className="!text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400">회원이 없습니다.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="text-right font-semibold">{formatAmount(u.pointBalance)}</td>
                <td className="text-right text-slate-600">
                  {formatAmount(u.activePrincipal)}
                  <div className="text-xs text-slate-400">{u.activeCount}건</div>
                </td>
                <td>
                  <select className="input !w-auto !py-1.5" value={u.vipLevel} onChange={(e) => changeVip(u, Number(e.target.value))}>
                    {vipLevels.map((v) => (
                      <option key={v.level} value={v.level}>VIP {v.level} · {v.name}</option>
                    ))}
                  </select>
                </td>
                <td className="text-xs text-slate-500">{formatDateTime(u.createdAt)}</td>
                <td className="text-right">
                  <button className="btn-primary btn-sm" onClick={() => setChargeTarget(u)}>포인트 충전</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!chargeTarget} onClose={() => setChargeTarget(null)} title="포인트 직접 충전">
        {chargeTarget && (
          <form onSubmit={charge} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="font-semibold">{chargeTarget.name} <span className="font-normal text-slate-500">({chargeTarget.email})</span></div>
              <div className="mt-1 text-slate-600">현재 보유: {formatAmount(chargeTarget.pointBalance)}</div>
            </div>
            <div>
              <label className="label">충전 금액</label>
              <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 100000" autoFocus required />
            </div>
            <div>
              <label className="label">메모 (선택)</label>
              <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} placeholder="이벤트 지급 등" />
            </div>
            <p className="text-xs text-slate-500">관리자 직접 충전은 승인 절차 없이 즉시 반영되며 내역에 기록됩니다.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setChargeTarget(null)}>취소</button>
              <button className="btn-primary flex-1" disabled={busy}>{busy ? "처리 중..." : "충전"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
