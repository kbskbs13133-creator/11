"use client";
import { useState } from "react";
import type { ProductDTO, VipLevelDTO } from "@/lib/serializers";
import RateTable from "@/components/RateTable";
import { VipBadge } from "@/components/Badge";
import { formatAmount, formatRate } from "@/lib/format";
import DepositModal from "./DepositModal";

export default function ProductList({ products, available, vip }: { products: ProductDTO[]; available: string; vip: VipLevelDTO }) {
  const [target, setTarget] = useState<ProductDTO | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">예치 상품</h1>
          <p className="mt-1 text-sm text-slate-500">매일 자정 이자가 자동 지급되고, 만기일에 원금이 자동 반환됩니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <VipBadge level={vip.level} name={vip.name} />
          {Number(vip.bonusRate) > 0 && <span className="text-brand-600">모든 상품 +{formatRate(vip.bonusRate)} 추가 적용</span>}
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
            사용 가능 <b>{formatAmount(available)}</b>
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="card text-center text-slate-500">현재 가입 가능한 상품이 없습니다.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">{p.name}</h2>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  최대 {formatRate(p.rates.reduce((m, r) => (Number(r.rate) > Number(m) ? r.rate : m), "0"))}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{p.description}</p>
              <RateTable rates={p.rates} vipBonus={vip.bonusRate} />
              <button className="btn-primary mt-auto w-full sm:w-auto sm:self-end" onClick={() => setTarget(p)}>
                예치하기
              </button>
            </div>
          ))}
        </div>
      )}

      {target && <DepositModal product={target} vip={vip} available={available} onClose={() => setTarget(null)} />}
    </div>
  );
}
