"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/serializers";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import RateTable from "@/components/RateTable";
import ProductFormModal from "./ProductFormModal";
import { useT } from "@/components/LocaleProvider";
import { L } from "@/lib/i18n";

export default function ProductManager({ initial, max }: { initial: ProductDTO[]; max: number }) {
  const tr = useT();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const products = initial;
  const full = products.length >= max;

  async function remove(p: ProductDTO) {
    if (!confirm(tr("'{name}' 상품을 삭제하시겠습니까?", { name: L(tr.locale, p.name, p.nameEn) }))) return;
    try {
      await api(`/api/admin/products/${p.id}`, { method: "DELETE" });
      toast(tr("상품이 삭제되었습니다."), "success");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{tr("상품 관리")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tr("등록된 상품")} <b className={full ? "text-rose-600" : "text-slate-800"}>{products.length}</b> / {max}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)} disabled={full} title={full ? tr("최대 {n}개까지 등록 가능", { n: max }) : ""}>
          {tr("+ 상품 등록")}
        </button>
      </div>
      {full && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">{tr("상품은 최대 {n}개까지 등록할 수 있습니다. 새 상품을 등록하려면 기존 상품을 삭제해주세요.", { n: max })}</p>
      )}

      {products.length === 0 ? (
        <div className="card text-center text-slate-500">{tr("등록된 상품이 없습니다.")}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{L(tr.locale, p.name, p.nameEn)}</h2>
                    {p.isActive ? <Badge tone="green">{tr("활성")}</Badge> : <Badge tone="gray">{tr("비활성")}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{tr("정렬순서 {order} · 진행중 예치 {n}건", { order: p.sortOrder, n: p.activeDepositCount ?? 0 })}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setEditing(p)}>{tr("수정")}</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(p)}>{tr("삭제")}</button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{L(tr.locale, p.description, p.descriptionEn) || tr("설명 없음")}</p>
              <RateTable rates={p.rates} />
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ProductFormModal
          product={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
