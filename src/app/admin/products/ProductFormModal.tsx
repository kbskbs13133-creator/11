"use client";
import { useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { termLabel } from "@/lib/format";
import type { ProductDTO } from "@/lib/serializers";
import { useT } from "@/components/LocaleProvider";

type RateRow = { key: number; termDays: string; rate: string };

const PRESETS = [30, 90, 180, 365];

let keySeq = 1;

export default function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const tr = useT();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? "");
  const [nameEn, setNameEn] = useState(product?.nameEn ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0));
  const [rates, setRates] = useState<RateRow[]>(
    product?.rates.length
      ? product.rates.map((r) => ({ key: keySeq++, termDays: String(r.termDays), rate: r.rate }))
      : [{ key: keySeq++, termDays: "30", rate: "" }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateRate = (key: number, patch: Partial<RateRow>) =>
    setRates((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRate = (days = "") => setRates((rs) => [...rs, { key: keySeq++, termDays: days, rate: "" }]);
  const removeRate = (key: number) => setRates((rs) => rs.filter((r) => r.key !== key));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (rates.length === 0) return setError(tr("기간별 이율을 1개 이상 추가해주세요."));
    setSaving(true);
    try {
      const payload = {
        name,
        nameEn,
        description,
        descriptionEn,
        isActive,
        sortOrder: Number(sortOrder) || 0,
        rates: rates.map((r) => ({ termDays: Number(r.termDays), rate: r.rate.trim() })),
      };
      if (product) await api(`/api/admin/products/${product.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/products", { method: "POST", json: payload });
      toast(product ? tr("상품이 수정되었습니다.") : tr("상품이 등록되었습니다."), "success");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={product ? tr("상품 수정") : tr("상품 등록")} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="label">{tr("상품명")}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
          </div>
          <div>
            <label className="label">{tr("정렬순서")}</label>
            <input className="input" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{tr("영문 상품명 (선택)")}</label>
          <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={80} placeholder={tr("영어 화면에 표시됩니다. 비우면 상품명을 사용합니다.")} />
        </div>
        <div>
          <label className="label">{tr("설명")}</label>
          <textarea className="input min-h-[110px]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder={tr("유저에게 보여질 상품 설명 (줄바꿈 유지)")} />
        </div>
        <div>
          <label className="label">{tr("영문 설명 (선택)")}</label>
          <textarea className="input min-h-[90px]" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} maxLength={5000} placeholder={tr("영어 화면에 표시됩니다. 비우면 설명을 사용합니다.")} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {tr("활성화 (체크 해제 시 유저에게 노출되지 않고 신규 예치 불가)")}
        </label>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">{tr("기간별 이율")}</h3>
              <p className="text-xs text-slate-500">{tr("이율 = 해당 기간 동안의 총 수익률(%)")}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button type="button" key={p} className="btn-secondary btn-sm" onClick={() => addRate(String(p))}>
                  +{termLabel(p, tr.locale)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {rates.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input className="input pr-10" type="number" min={1} max={3650} placeholder={tr("기간")} value={r.termDays} onChange={(e) => updateRate(r.key, { termDays: e.target.value })} required />
                  <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-400">{tr("일")}</span>
                </div>
                <span className="hidden w-16 text-xs text-slate-400 sm:block">{Number(r.termDays) > 0 ? termLabel(Number(r.termDays), tr.locale) : ""}</span>
                <div className="relative flex-1">
                  <input className="input pr-8" inputMode="decimal" placeholder={tr("이율")} value={r.rate} onChange={(e) => updateRate(r.key, { rate: e.target.value })} required />
                  <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-400">%</span>
                </div>
                <button type="button" onClick={() => removeRate(r.key)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={tr("삭제")}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 w-full rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-500 hover:border-brand-500 hover:text-brand-600" onClick={() => addRate()}>
            {tr("+ 기간-이율 추가")}
          </button>
        </div>

        {product && (
          <p className="text-xs text-slate-500">{tr("※ 이율을 수정해도 기존 예치건은 예치 시점 이율(스냅샷)로 계속 계산됩니다.")}</p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{tr("취소")}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? tr("저장 중...") : tr("저장")}</button>
        </div>
      </form>
    </Modal>
  );
}
