"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import AmountInput from "@/components/AmountInput";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { TxStatusBadge, TxTypeBadge } from "@/components/Badge";
import { AMOUNT_REGEX, formatAmount, formatDateTime } from "@/lib/format";
import type { TransactionDTO } from "@/lib/serializers";
import { centsToString, toCents } from "@/lib/clientMath";
import { useT } from "@/components/LocaleProvider";

type WalletData = { transactions: TransactionDTO[]; balance: string; pendingWithdraw: string; available: string };
type ReqType = "CHARGE" | "WITHDRAW";

const POLL_PENDING_MS = 5000; // 처리중 신청이 있을 때 폴링 간격
const POLL_IDLE_MS = 30000; // 평상시 폴링 간격

// 충전 빠른 선택 버튼 (누를 때마다 더해짐)
const CHARGE_PRESETS = ["100000", "1000000", "10000000", "100000000"];

const typeKey = (t: string) => (t === "CHARGE" ? "충전" : t === "WITHDRAW" ? "환전" : "관리자 충전");

export default function Wallet({ initial }: { initial: WalletData }) {
  const tr = useT();
  const typeLabel = useCallback((t: string) => tr(typeKey(t)), [tr]);
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<ReqType | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "amber" | "green" | "red"; text: string } | null>(null);
  const prevStatus = useRef(new Map(initial.transactions.map((t) => [t.id, t.status])));

  const hasPending = data.transactions.some((t) => t.status === "PENDING");

  const refresh = useCallback(async () => {
    try {
      const next = await api<WalletData>("/api/transactions");
      // PENDING → APPROVED / REJECTED 로 바뀐 건 감지하여 안내
      for (const t of next.transactions) {
        const before = prevStatus.current.get(t.id);
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
  useEffect(() => {
    const ms = hasPending ? POLL_PENDING_MS : POLL_IDLE_MS;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, ms);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasPending, refresh]);

  function addCharge(v: string) {
    const cur = toCents(amount) ?? 0n;
    const next = cur + BigInt(v) * 100n;
    setAmount(centsToString(next).replace(/\.00$/, ""));
  }

  function open(type: ReqType) {
    setModal(type);
    setAmount("");
    setMemo("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = amount.replace(/,/g, "").trim();
    if (!AMOUNT_REGEX.test(clean) || Number(clean) <= 0) return setError(tr("금액을 올바르게 입력해주세요. (소수점 2자리까지)"));
    setSubmitting(true);
    setError("");
    try {
      await api("/api/transactions", { method: "POST", json: { type: modal, amount: clean, memo: memo || undefined } });
      const text = tr("{type} 신청이 접수되었습니다. 처리중입니다. 관리자 승인 후 반영됩니다.", { type: typeLabel(modal!) });
      setNotice({ tone: "amber", text });
      setModal(null);
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
          <button className="btn-primary !py-2.5" onClick={() => open("CHARGE")}>{tr("포인트 충전")}</button>
          <button className="btn-secondary !py-2.5" onClick={() => open("WITHDRAW")}>{tr("포인트 환전")}</button>
        </div>
      </div>

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
          <h2 className="font-bold">{tr("신청 내역")}</h2>
          <button className="text-xs text-slate-500 hover:text-slate-800" onClick={refresh}>{tr("새로고침")}</button>
        </div>
        {data.transactions.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">{tr("신청 내역이 없습니다.")}</div>
        ) : (
          <ul className="space-y-2">
            {data.transactions.map((t) => (
              <li key={t.id} className="card !p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TxTypeBadge type={t.type} />
                    <TxStatusBadge status={t.status} />
                  </div>
                  <span className={`text-base font-bold ${t.type === "WITHDRAW" ? "text-violet-700" : "text-blue-700"}`}>
                    {t.type === "WITHDRAW" ? "-" : "+"}{formatAmount(t.amount)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span>{tr("신청")} {formatDateTime(t.createdAt)}{t.memo ? ` · ${tr(t.memo)}` : ""}</span>
                  {t.processedAt && <span>{tr("처리")} {formatDateTime(t.processedAt)}</span>}
                </div>
                {t.status === "PENDING" && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{tr("처리중입니다. 관리자 승인 후 포인트에 반영됩니다.")}</p>}
                {t.status === "APPROVED" && t.type !== "ADMIN_CHARGE" && (
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "CHARGE" ? tr("포인트 충전 신청") : tr("포인트 환전 신청")}>
        <form onSubmit={submit} className="space-y-4">
          {modal === "WITHDRAW" && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{tr("환전 가능 포인트:")} <b>{formatAmount(data.available)}</b></p>}
          <div>
            <label className="label" htmlFor="req-amount">{tr("금액")}</label>
            <AmountInput id="req-amount" value={amount} onChange={setAmount} autoFocus />
            {modal === "CHARGE" && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CHARGE_PRESETS.map((v) => (
                  <button type="button" key={v} className="btn-secondary btn-sm tabular-nums" onClick={() => addCharge(v)}>
                    +{formatAmount(v, false)}
                  </button>
                ))}
              </div>
            )}
            {modal === "CHARGE" && amount && (
              <button type="button" className="mt-2 text-xs text-slate-500 hover:text-brand-600" onClick={() => setAmount("")}>{tr("금액 초기화")}</button>
            )}
            {modal === "WITHDRAW" && (
              <button type="button" className="btn-secondary btn-sm mt-1 w-full" onClick={() => setAmount(data.available.replace(/\.00$/, ""))}>{tr("전액")}</button>
            )}
          </div>
          <div>
            <label className="label" htmlFor="req-memo">{modal === "CHARGE" ? tr("입금자명 / 메모 (선택)") : tr("받을 계좌 / 메모 (선택)")}</label>
            <input id="req-memo" className="input" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} />
          </div>
          <p className="text-xs text-slate-500">{modal === "CHARGE" ? tr("신청 후 관리자 승인 시 포인트가 적립됩니다.") : tr("신청 후 관리자 승인 시 포인트가 차감됩니다.")}</p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>{tr("취소")}</button>
            <button className="btn-primary flex-1" disabled={submitting}>{submitting ? tr("신청 중...") : tr("신청하기")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
