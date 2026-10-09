"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import type { ProductDTO, VipLevelDTO } from "@/lib/serializers";
import { AMOUNT_REGEX, formatAmount, formatRate, termLabel } from "@/lib/format";
import { centsToString, dailyInterestCents, expectedInterestCents, rate4ToString, toCents, toRate4 } from "@/lib/clientMath";

function kstTodayPlus(days: number) {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

export default function DepositModal({
  product,
  vip,
  available,
  onClose,
}: {
  product: ProductDTO;
  vip: VipLevelDTO;
  available: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [termDays, setTermDays] = useState(product.rates[0]?.termDays ?? 0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rate = product.rates.find((r) => r.termDays === termDays);
  const preview = useMemo(() => {
    if (!rate) return null;
    const total4 = toRate4(rate.rate) + toRate4(vip.bonusRate);
    const cents = AMOUNT_REGEX.test(amount) ? toCents(amount) : null;
    const expected = cents ? expectedInterestCents(cents, total4) : 0n;
    return {
      totalRate: rate4ToString(total4),
      expected: centsToString(expected),
      daily: centsToString(dailyInterestCents(expected, termDays)),
      valid: cents !== null && cents > 0n,
      exceeds: cents !== null && cents > (toCents(available) ?? 0n),
    };
  }, [rate, vip.bonusRate, amount, termDays, available]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!preview?.valid) return setError("예치 금액을 올바르게 입력해주세요. (소수점 2자리까지)");
    if (preview.exceeds) return setError("사용 가능 포인트를 초과했습니다.");
    setSaving(true);
    try {
      await api("/api/deposits", { method: "POST", json: { productId: product.id, termDays, amount } });
      toast("예치가 완료되었습니다. 내일부터 매일 이자가 지급됩니다.", "success");
      onClose();
      router.push("/my-deposits");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`예치 신청 · ${product.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="label">예치 기간</span>
          <div className="grid grid-cols-2 gap-2">
            {product.rates.map((r) => (
              <button
                type="button"
                key={r.termDays}
                onClick={() => setTermDays(r.termDays)}
                className={`rounded-xl border p-3 text-left transition ${
                  termDays === r.termDays ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold">{termLabel(r.termDays)}</div>
                <div className="text-xs text-slate-500">{r.termDays}일 · {formatRate(r.rate)}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0" htmlFor="amount">예치 금액</label>
            <span className="text-xs text-slate-500">사용 가능 {formatAmount(available)}</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input id="amount" className="input pr-8" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/,/g, ""))} autoFocus />
              <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-400">P</span>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setAmount(available)}>전액</button>
          </div>
        </div>

        {preview && (
          <dl className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">상품 기본이율</dt><dd>{formatRate(rate!.rate)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">VIP {vip.level} 추가이율</dt><dd>+{formatRate(vip.bonusRate)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>총 이율 ({termLabel(termDays)})</dt><dd className="text-brand-600">{formatRate(preview.totalRate)}</dd></div>
            <hr className="my-2 border-slate-200" />
            <div className="flex justify-between"><dt className="text-slate-500">예상 일 이자</dt><dd>{formatAmount(preview.daily)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">만기 예상 총이자</dt><dd className="font-semibold text-emerald-600">+{formatAmount(preview.expected)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">만기일 (원금 자동 반환)</dt><dd>{kstTodayPlus(termDays)}</dd></div>
          </dl>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving || !preview?.valid}>{saving ? "처리 중..." : "예치하기"}</button>
        </div>
      </form>
    </Modal>
  );
}
