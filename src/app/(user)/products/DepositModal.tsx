"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import AmountInput from "@/components/AmountInput";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import type { ProductDTO, VipLevelDTO } from "@/lib/serializers";
import { AMOUNT_REGEX, formatAmount, formatRate, termLabel } from "@/lib/format";
import { centsToString, dailyInterestCents, expectedInterestCents, rate4ToString, toCents, toRate4 } from "@/lib/clientMath";
import { useT } from "@/components/LocaleProvider";
import { L } from "@/lib/i18n";

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
  const tr = useT();
  const router = useRouter();
  const toast = useToast();
  const [termDays, setTermDays] = useState(product.rates[0]?.termDays ?? 0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rate = product.rates.find((r) => r.termDays === termDays);
  const availableCents = toCents(available) ?? 0n;

  /** 사용 가능 포인트의 pct% 만큼 현재 금액에 더함 (10% 두 번 → 20%). 원 단위 미만 절사, 최대 전액 */
  function addPercent(pct: number) {
    const step = ((availableCents * BigInt(pct)) / 100n / 100n) * 100n;
    const current = toCents(amount) ?? 0n;
    let next = current + step;
    if (next > availableCents) next = availableCents;
    setAmount(next > 0n ? centsToString(next).replace(/\.00$/, "") : "");
  }
  const amountCents = toCents(amount);
  const percentOfAvailable =
    amountCents && availableCents > 0n ? Number((amountCents * 1000n) / availableCents) / 10 : null;
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
    if (!preview?.valid) return setError(tr("예치 금액을 올바르게 입력해주세요. (소수점 2자리까지)"));
    if (preview.exceeds) return setError(tr("사용 가능 포인트를 초과했습니다."));
    setSaving(true);
    try {
      await api("/api/deposits", { method: "POST", json: { productId: product.id, termDays, amount } });
      toast(tr("예치가 완료되었습니다. 내일부터 매일 이자가 지급됩니다."), "success");
      onClose();
      router.push("/my-deposits");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`${tr("예치 신청")} · ${L(tr.locale, product.name, product.nameEn)}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="label">{tr("예치 기간")}</span>
          <div className="grid grid-cols-2 gap-2">
            {product.rates.map((r) => (
              <button
                type="button"
                key={r.termDays}
                onClick={() => setTermDays(r.termDays)}
                className={`rounded-xl border p-3 text-left transition ${
                  termDays === r.termDays ? "border-brand-400/70 bg-brand-50 ring-2 ring-brand-400/15" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="text-sm font-semibold">{termLabel(r.termDays, tr.locale)}</div>
                <div className="text-xs text-slate-500">{tr("{n}일", { n: r.termDays })} · {formatRate(r.rate)}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0" htmlFor="amount">{tr("예치 금액")}</label>
            <span className="text-xs text-slate-500">{tr("사용 가능 {amount}", { amount: formatAmount(available) })}</span>
          </div>
          <AmountInput id="amount" value={amount} onChange={setAmount} autoFocus />
          <div className="mt-1 grid grid-cols-4 gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => addPercent(10)}>10%</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => addPercent(50)}>50%</button>
            <button type="button" className="btn-secondary btn-sm !border-brand-400/40 !text-brand-700" onClick={() => setAmount(availableCents > 0n ? centsToString(availableCents).replace(/\.00$/, "") : "")}>{tr("전액")}</button>
            <button type="button" className="btn-secondary btn-sm !text-slate-500" onClick={() => setAmount("")}>{tr("초기화")}</button>
          </div>
          {percentOfAvailable !== null && (
            <p className="mt-2 text-xs text-slate-500">{tr("사용 가능 포인트의")} <b className="text-brand-600">{percentOfAvailable}%</b></p>
          )}
        </div>

        {preview && (
          <dl className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{tr("상품 기본이율")}</dt><dd>{formatRate(rate!.rate)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{tr("VIP {level} 추가이율", { level: vip.level })}</dt><dd>+{formatRate(vip.bonusRate)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>{tr("총 이율")} ({termLabel(termDays, tr.locale)})</dt><dd className="text-brand-600">{formatRate(preview.totalRate)}</dd></div>
            <hr className="my-2 border-slate-200" />
            <div className="flex justify-between"><dt className="text-slate-500">{tr("예상 일 이자")}</dt><dd>{formatAmount(preview.daily)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{tr("만기 예상 총이자")}</dt><dd className="font-semibold text-emerald-600">+{formatAmount(preview.expected)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{tr("만기일 (원금 자동 정산)")}</dt><dd className="whitespace-nowrap">{kstTodayPlus(termDays)}</dd></div>
          </dl>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>{tr("취소")}</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving || !preview?.valid}>{saving ? tr("처리 중...") : tr("예치하기")}</button>
        </div>
      </form>
    </Modal>
  );
}
