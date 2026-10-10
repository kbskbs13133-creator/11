"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import AmountInput from "@/components/AmountInput";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { TxStatusBadge, TxTypeBadge } from "@/components/Badge";
import { AMOUNT_REGEX, formatAmount, formatDateTime } from "@/lib/format";
import type { CryptoDepositDTO, TransactionDTO } from "@/lib/serializers";
import { useT } from "@/components/LocaleProvider";
import { ASSETS, ASSET_ORDER, type CryptoAssetId } from "@/lib/crypto/config";
import CryptoChargeModal, { AssetChip, CryptoStatus } from "./CryptoChargeModal";

type WalletData = { transactions: TransactionDTO[]; cryptoPending: CryptoDepositDTO[]; balance: string; pendingWithdraw: string; available: string };

const POLL_PENDING_MS = 5000; // 처리중 신청이 있을 때 폴링 간격
const POLL_IDLE_MS = 30000; // 평상시 폴링 간격

const typeKey = (t: string) => (t === "CHARGE" ? "충전" : t === "WITHDRAW" ? "환전" : t === "CRYPTO_DEPOSIT" ? "코인 입금" : "관리자 충전");
const shortAddr = (a: string) => (a.length > 18 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

export default function Wallet({ initial, cryptoEnabled }: { initial: WalletData; cryptoEnabled: boolean }) {
  const tr = useT();
  const typeLabel = useCallback((t: string) => tr(typeKey(t)), [tr]);
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [wAsset, setWAsset] = useState<CryptoAssetId>("USDT_TRC20");
  const [wAddress, setWAddress] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "amber" | "green" | "red"; text: string } | null>(null);
  const prevStatus = useRef(new Map(initial.transactions.map((t) => [t.id, t.status])));

  const hasPending = data.transactions.some((t) => t.status === "PENDING");
  const cryptoWaiting = data.cryptoPending.some((d) => d.status === "PENDING");

  const refresh = useCallback(async () => {
    try {
      const next = await api<WalletData>("/api/transactions");
      // PENDING → APPROVED / REJECTED 로 바뀐 건 감지하여 안내
      for (const t of next.transactions) {
        const before = prevStatus.current.get(t.id);
        if (before === undefined && t.type === "CRYPTO_DEPOSIT") {
          const text = tr("코인 입금이 확인되어 {amount}가 충전되었습니다.", { amount: formatAmount(t.amount) });
          setNotice({ tone: "green", text });
          continue;
        }
        if (before === "PENDING" && t.status === "APPROVED") {
          const text = tr("{type} 신청({amount})이 처리되었습니다.", { type: typeLabel(t.type), amount: formatAmount(t.amount) });
          setNotice({ tone: "green", text });
          toast(text, "success");
        } else if (before === "PENDING" && t.status === "REJECTED") {
          const text = tr("{type} 신청({amount})이 거절되었습니다. 사유: {reason}", { type: typeLabel(t.type), amount: formatAmount(t.amount), reason: t.rejectReason ?? "-" });
          setNotice({ tone: "red", text });
          toast(text, "error");
        }
      }
      prevStatus.current = new Map(next.transactions.map((t) => [t.id, t.status]));
      setData(next);
    } catch {
      /* 네트워크 오류는 다음 폴링에서 재시도 */
    }
  }, [toast, tr, typeLabel]);

  // 폴링: 처리중 건이 있으면 5초, 없으면 30초 간격. 탭이 보일 때만 실행
  // 컨펌 대기 중인 코인 입금이 있으면 내 주소 확인도 함께 요청 (서버에서 15초 간격 제한)
  useEffect(() => {
    const ms = hasPending || cryptoWaiting ? POLL_PENDING_MS : POLL_IDLE_MS;
    let tick = 0;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible" || chargeOpen) return;
      tick++;
      if (cryptoWaiting && tick % 4 === 0) await api("/api/crypto/scan", { method: "POST" }).catch(() => null);
      refresh();
    }, ms);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasPending, cryptoWaiting, chargeOpen, refresh]);

  function openWithdraw() {
    setWithdrawOpen(true);
    setAmount("");
    setMemo("");
    setWAddress("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = amount.replace(/,/g, "").trim();
    if (!AMOUNT_REGEX.test(clean) || Number(clean) <= 0) return setError(tr("금액을 올바르게 입력해주세요. (소수점 2자리까지)"));
    if (!wAddress.trim()) return setError(tr("받을 지갑 주소를 입력해주세요."));
    setSubmitting(true);
    setError("");
    try {
      await api("/api/transactions", { method: "POST", json: { type: "WITHDRAW", amount: clean, memo: memo || undefined, cryptoAsset: wAsset, cryptoAddress: wAddress.trim() } });
      const text = tr("{type} 신청이 접수되었습니다. 처리중입니다. 관리자 승인 후 반영됩니다.", { type: typeLabel("WITHDRAW") });
      setNotice({ tone: "amber", text });
      setWithdrawOpen(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const noticeTone = { amber: "bg-amber-50 text-amber-800 ring-amber-200", green: "bg-emerald-50 text-emerald-800 ring-emerald-200", red: "bg-rose-50 text-rose-800 ring-rose-200" };

  return (
    <div className="space-y-5">
      <h1 className="page-title">{tr("지갑")}</h1>

      <div className="card-gold sm:!p-7">
        <p className="eyebrow">BALANCE</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-gold sm:text-4xl">{formatAmount(data.balance)}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <span>{tr("사용 가능")} <b className="text-slate-900">{formatAmount(data.available)}</b></span>
          {Number(data.pendingWithdraw) > 0 && <span>{tr("환전 처리중")} <b className="text-slate-900">{formatAmount(data.pendingWithdraw)}</b></span>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-primary !py-2.5" onClick={() => setChargeOpen(true)}>{tr("포인트 충전")}</button>
          <button className="btn-secondary !py-2.5" onClick={openWithdraw}>{tr("포인트 환전")}</button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          {cryptoEnabled ? tr("USDT · ETH · BTC 입금으로 충전 · 1 P = 1 USD") : tr("1 P = 1 USD")}
        </p>
      </div>

      {data.cryptoPending.length > 0 && (
        <div className="card !p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">{tr("확인 중인 코인 입금")}</p>
          <ul className="space-y-2">
            {data.cryptoPending.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <AssetChip id={d.asset as CryptoAssetId} small />
                  <b className="tabular-nums text-slate-900">{d.amount} {ASSETS[d.asset as CryptoAssetId].symbol}</b>
                  <CryptoStatus d={d} />
                </span>
                <span className="text-xs text-slate-500">
                  {d.status === "BELOW_MIN" ? tr("최소 입금액 미만으로 자동 충전되지 않았습니다. 고객센터에 문의해주세요.") : tr("컨펌 완료 후 자동 충전됩니다.")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(notice || hasPending) && (
        <div className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${noticeTone[notice?.tone ?? "amber"]}`}>
          <div className="flex items-start gap-2">
            {(notice?.tone ?? "amber") === "amber" && <span className="mt-1 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
            <span>{notice?.text ?? tr("처리중인 신청이 있습니다. 관리자 승인 시 자동으로 갱신됩니다.")}</span>
          </div>
          {notice && <button className="text-xs opacity-60 hover:opacity-100" onClick={() => setNotice(null)}>{tr("닫기")}</button>}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{tr("포인트 내역")}</h2>
          <button className="text-xs text-slate-500 hover:text-slate-800" onClick={refresh}>{tr("새로고침")}</button>
        </div>
        {data.transactions.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">{tr("내역이 없습니다.")}</div>
        ) : (
          <ul className="space-y-2">
            {data.transactions.map((t) => (
              <li key={t.id} className="card !p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TxTypeBadge type={t.type} />
                    <TxStatusBadge status={t.status} />
                  </div>
                  <span className={`text-base font-bold ${t.type === "WITHDRAW" ? "text-violet-700" : t.type === "CRYPTO_DEPOSIT" ? "text-emerald-600" : "text-blue-700"}`}>
                    {t.type === "WITHDRAW" ? "-" : "+"}{formatAmount(t.amount)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {t.type === "CRYPTO_DEPOSIT" || t.type === "ADMIN_CHARGE" ? "" : `${tr("신청")} `}
                    {formatDateTime(t.createdAt)}
                    {t.cryptoAsset && t.cryptoAddress ? ` · ${ASSETS[t.cryptoAsset as CryptoAssetId].symbol} · ${ASSETS[t.cryptoAsset as CryptoAssetId].network} → ${shortAddr(t.cryptoAddress)}` : ""}
                    {t.memo ? ` · ${tr(t.memo)}` : ""}
                  </span>
                  {t.processedAt && <span>{tr("처리")} {formatDateTime(t.processedAt)}</span>}
                </div>
                {t.status === "PENDING" && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{tr("처리중입니다. 관리자 승인 후 포인트에 반영됩니다.")}</p>}
                {t.status === "APPROVED" && t.type !== "ADMIN_CHARGE" && t.type !== "CRYPTO_DEPOSIT" && (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {tr("{type} 신청이 처리되었습니다.", { type: typeLabel(t.type) })}
                    {t.balanceAfter ? ` ${tr("(처리 후 잔액 {amount})", { amount: formatAmount(t.balanceAfter) })}` : ""}
                  </p>
                )}
                {t.status === "REJECTED" && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{tr("거절됨 · 사유:")} {t.rejectReason ?? "-"}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CryptoChargeModal open={chargeOpen} onClose={() => setChargeOpen(false)} onCredited={refresh} />

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title={tr("포인트 환전 신청")}>
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{tr("환전 가능 포인트:")} <b>{formatAmount(data.available)}</b></p>
          <div>
            <label className="label" htmlFor="req-amount">{tr("금액")} <span className="font-normal text-slate-400">(1 P = 1 USD)</span></label>
            <AmountInput id="req-amount" value={amount} onChange={setAmount} autoFocus />
            <button type="button" className="btn-secondary btn-sm mt-1 w-full" onClick={() => setAmount(data.available.replace(/\.00$/, ""))}>{tr("전액")}</button>
          </div>
          <div>
            <p className="label">{tr("받을 코인 / 네트워크")}</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSET_ORDER.map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setWAsset(id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${wAsset === id ? "border-brand-400/60 bg-brand-50 text-brand-700" : "border-white/[0.07] text-slate-600 hover:border-white/20"}`}
                >
                  <b className="text-sm">{ASSETS[id].symbol}</b> <span className="opacity-80">{ASSETS[id].network}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="req-address">{tr("받을 지갑 주소")}</label>
            <input id="req-address" className="input font-mono text-sm" value={wAddress} onChange={(e) => setWAddress(e.target.value)} maxLength={100} autoComplete="off" spellCheck={false}
              placeholder={wAsset === "BTC" ? "bc1q…" : wAsset === "USDT_TRC20" ? "T…" : "0x…"} />
          </div>
          <div>
            <label className="label" htmlFor="req-memo">{tr("메모 (선택)")}</label>
            <input id="req-memo" className="input" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} />
          </div>
          <p className="text-xs text-slate-500">{tr("관리자 확인 후 선택한 네트워크로 송금되며, 승인 시 포인트가 차감됩니다. 주소와 네트워크가 정확한지 꼭 확인해주세요.")}</p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setWithdrawOpen(false)}>{tr("취소")}</button>
            <button className="btn-primary flex-1" disabled={submitting}>{submitting ? tr("신청 중...") : tr("신청하기")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
