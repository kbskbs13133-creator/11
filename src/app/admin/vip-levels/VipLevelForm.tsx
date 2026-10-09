"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VipLevelDTO } from "@/lib/serializers";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { VipBadge } from "@/components/Badge";

export default function VipLevelForm({ initial, userCounts }: { initial: VipLevelDTO[]; userCounts: Record<number, number> }) {
  const router = useRouter();
  const toast = useToast();
  const [levels, setLevels] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (level: number, patch: Partial<VipLevelDTO>) =>
    setLevels((ls) => ls.map((l) => (l.level === level ? { ...l, ...patch } : l)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/admin/vip-levels", { method: "PUT", json: { levels } });
      toast("VIP 등급 설정이 저장되었습니다.", "success");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">VIP 등급 설정</h1>
        <p className="mt-1 text-sm text-slate-500">
          각 등급의 추가 이율은 유저가 예치할 때 상품 기본이율에 더해집니다. (총이율 = 기본이율 + VIP 추가이율)
          <br />변경 사항은 이후 신규 예치부터 적용되며, 기존 예치건은 예치 시점 이율이 유지됩니다.
        </p>
      </div>
      <form onSubmit={save} className="card space-y-3">
        {levels.map((l) => (
          <div key={l.level} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[140px_1fr_1fr_80px]">
            <div className="flex items-center gap-2">
              <VipBadge level={l.level} />
            </div>
            <div>
              <label className="label sm:sr-only">등급명</label>
              <input className="input" value={l.name} onChange={(e) => update(l.level, { name: e.target.value })} maxLength={20} required placeholder="등급명" />
            </div>
            <div className="relative">
              <label className="label sm:sr-only">추가 이율</label>
              <input className="input pr-20" inputMode="decimal" value={l.bonusRate} onChange={(e) => update(l.level, { bonusRate: e.target.value })} required />
              <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-slate-400">% 추가</span>
            </div>
            <div className="text-right text-xs text-slate-500">회원 {userCounts[l.level] ?? 0}명</div>
          </div>
        ))}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </form>
    </div>
  );
}
