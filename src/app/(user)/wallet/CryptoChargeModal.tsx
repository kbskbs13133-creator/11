"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Modal from "@/components/Modal";
import AmountInput from "@/components/AmountInput";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";
import { formatAmount, formatDateTime } from "@/lib/format";
import { centsToString, toCents } from "@/lib/clientMath";
import { ASSETS, CHARGE_PRESETS, type CryptoAssetId } from "@/lib/crypto/config";
import type { CryptoDepositDTO } from "@/lib/serializers";

type Prices = { BTC: string; ETH: string; USDT: string } | null;
type CryptoState = {
  configured: boolean;
  assets: { id: CryptoAssetId; address: string }[];
  prices: Prices;
  minDepositUsd: number;
  deposits: CryptoDepositDTO[];
};

const SCAN_MS = 20_000; // 화면이 열려 있는 동안 내 주소 확인 간격

export const ASSET_TONE: Record<CryptoAssetId, string> = {
  USDT_TRC20: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  USDT_ERC20: "bg-teal-500/15 text-teal-300 ring-teal-400/30",
  ETH: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30",
  BTC: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
};

export function AssetChip({ id, small = false }: { id: CryptoAssetId; small?: boolean }) {
  const a = ASSETS[id];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ring-1 ring-inset ${ASSET_TONE[id]} ${small ? "text-[10px]" : "text-xs"}`}>
      {a.symbol}
      {a.symbol === "USDT" && <span className="font-medium opacity-80">{a.id === "USDT_TRC20" ? "TRC-20" : "ERC-20"}</span>}
    </span>
  );
}

/** 코인 입금 상태 배지 */
export function CryptoStatus({ d }: { d: CryptoDepositDTO }) {
  const tr = useT();
  const need = ASSETS[d.asset as CryptoAssetId].confirmations;
  if (d.status === "CREDITED") return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{tr("충전 완료")}</span>;
  if (d.status === "BELOW_MIN") return <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{tr("최소 금액 미만")}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      {tr("확인 중 {c}/{n}", { c: Math.min(d.confirmations, need), n: need })}
    </span>
  );
}

/** 포인트(USD) → 보낼 코인 수량 (올림, 표시용) */
function coinNeeded(points: string, id: CryptoAssetId, prices: Prices): string | null {
  const p = Number(points || "0");
  if (!(p > 0)) return null;
  const a = ASSETS[id];
  if (a.symbol === "USDT") return p.toFixed(2).replace(/\.00$/, "");
  const price = Number(prices?.[a.symbol]);
  if (!(price > 0)) return null;
  const f = 10 ** a.displayDecimals;
  return (Math.ceil((p / price) * f) / f).toFixed(a.displayDecimals).replace(/0+$/, "").replace(/\.$/, "");
}

export default function CryptoChargeModal({ open, onClose, onCredited }: { open: boolean; onClose: () => void; onCredited: () => void }) {
  const tr = useT();
  const toast = useToast();
  const [state, setState] = useState<CryptoState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [asset, setAsset] = useState<CryptoAssetId>("USDT_TRC20");
  const [points, setPoints] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const prev = useRef(new Map<string, string>());

  const applyDeposits = useCallback(
    (list: CryptoDepositDTO[], announce: boolean) => {
      if (announce) {
        for (const d of list) {
          const before = prev.current.get(d.id);
          if (d.status === "CREDITED" && before !== "CREDITED") {
            toast(tr("코인 입금이 확인되어 {amount}가 충전되었습니다.", { amount: formatAmount(d.points) }), "success");
            onCredited();
          } else if (!before && d.status === "PENDING") {
            toast(tr("입금이 감지되었습니다. 컨펌 완료 후 자동으로 충전됩니다."), "info");
          }
        }
      }
      prev.current = new Map(list.map((d) => [d.id, d.status]));
      setState((s) => (s ? { ...s, deposits: list } : s));
    },
    [onCredited, toast, tr]
  );

  // 열릴 때: 주소/시세 로드
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoadError("");
    setPoints("");
    setCopied(false);
    api<CryptoState>("/api/crypto")
      .then((s) => {
        if (!alive) return;
        prev.current = new Map(s.deposits.map((d) => [d.id, d.status]));
        setState(s);
        if (s.assets.length && !s.assets.some((a) => a.id === asset)) setAsset(s.assets[0].id);
      })
      .catch((e) => alive && setLoadError((e as Error).message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scan = useCallback(
    async (manual = false) => {
      if (manual) setChecking(true);
      try {
        const r = await api<{ deposits: CryptoDepositDTO[] }>("/api/crypto/scan", { method: "POST" });
        applyDeposits(r.deposits, true);
      } catch {
        /* 다음 주기에 재시도 */
      } finally {
        if (manual) setChecking(false);
      }
    },
    [applyDeposits]
  );

  // 열려 있는 동안 주기적으로 내 주소 확인
  useEffect(() => {
    if (!open || !state?.configured) return;
    const t = setInterval(() => document.visibilityState === "visible" && scan(), SCAN_MS);
    return () => clearInterval(t);
  }, [open, state?.configured, scan]);

  const current = state?.assets.find((a) => a.id === asset) ?? null;
  const meta = ASSETS[asset];

  useEffect(() => {
    if (!current) return setQr("");
    QRCode.toString(current.address, { type: "svg", margin: 1, width: 168, color: { dark: "#0b0a08", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [current]);

  function addPreset(v: string) {
    const cur = toCents(points) ?? 0n;
    setPoints(centsToString(cur + BigInt(v) * 100n).replace(/\.00$/, ""));
  }

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.address);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = current.address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const need = coinNeeded(points, asset, state?.prices ?? null);
  const price = meta.symbol === "USDT" ? null : state?.prices?.[meta.symbol];

  return (
    <Modal open={open} onClose={onClose} title={tr("코인으로 포인트 충전")} wide>
      {!state && !loadError && <div className="py-16 text-center text-sm text-slate-500">{tr("입금 주소를 준비하고 있습니다...")}</div>}
      {loadError && <p className="rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-700">{loadError}</p>}
      {state && !state.configured && (
        <div className="rounded-xl bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">{tr("코인 입금 준비 중입니다. 잠시 후 다시 이용해주세요.")}</div>
      )}
      {state?.configured && current && (
        <div className="space-y-5">
          {/* 코인 / 네트워크 선택 */}
          <div>
            <p className="label">{tr("코인 / 네트워크")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {state.assets.map((a) => {
                const m = ASSETS[a.id];
                const on = a.id === asset;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAsset(a.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-brand-400/60 bg-brand-50 ring-1 ring-brand-400/30" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"}`}
                  >
                    <span className={`block text-sm font-bold ${on ? "text-brand-700" : "text-slate-800"}`}>{m.symbol}</span>
                    <span className="block text-[11px] text-slate-500">{m.network}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
            {/* 입금 주소 */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{tr("내 입금 주소")}</p>
                <AssetChip id={asset} />
              </div>
              <div className="mt-3 flex justify-center">
                <div className="rounded-xl bg-white p-2" style={{ width: 184, height: 184 }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR" />
              </div>
              <p className="mt-3 break-all rounded-lg bg-black/30 px-3 py-2 text-center font-mono text-[13px] leading-relaxed text-slate-800" data-testid="deposit-address">
                {current.address}
              </p>
              <button type="button" className="btn-secondary btn-sm mt-2 w-full" onClick={copy}>
                {copied ? tr("복사되었습니다") : tr("주소 복사")}
              </button>
            </div>

            {/* 계산기 + 안내 */}
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="crypto-points">{tr("충전할 포인트 (1 P = 1 USD)")}</label>
                <AmountInput id="crypto-points" value={points} onChange={setPoints} />
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {CHARGE_PRESETS.map((v) => (
                    <button type="button" key={v} className="btn-secondary btn-sm tabular-nums" onClick={() => addPreset(v)}>
                      +{formatAmount(v, false)}
                    </button>
                  ))}
                </div>
                {points && (
                  <button type="button" className="mt-2 text-xs text-slate-500 hover:text-brand-600" onClick={() => setPoints("")}>
                    {tr("금액 초기화")}
                  </button>
                )}
              </div>

              <div className="rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-inset ring-brand-400/20">
                <p className="text-xs text-slate-500">{tr("보낼 수량")}</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-gold" data-testid="coin-needed">
                  {need ? `≈ ${need} ${meta.symbol}` : `— ${meta.symbol}`}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {meta.symbol === "USDT"
                    ? tr("1 USDT = 1 P")
                    : price
                      ? tr("1 {sym} = ${price} (바이낸스 실시간)", { sym: meta.symbol, price: Number(price).toLocaleString("en-US", { maximumFractionDigits: 2 }) })
                      : tr("시세를 불러오지 못했습니다.")}
                </p>
              </div>

              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-500">
                <li className="rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-800">
                  {tr("반드시 {network} 네트워크로만 보내세요. 다른 네트워크나 다른 코인을 보내면 복구할 수 없습니다.", { network: `${meta.symbol} · ${meta.network}` })}
                </li>
                {meta.chain === "ETH" && <li>• {tr("ETH와 USDT(ERC-20)는 같은 주소를 사용합니다.")}</li>}
                <li>• {tr("{n} 컨펌 후 자동으로 충전됩니다.", { n: meta.confirmations })}</li>
                <li>• {tr("최소 입금액 ${min} — 미만 금액은 자동 충전되지 않습니다.", { min: state.minDepositUsd })}</li>
                {meta.symbol !== "USDT" && <li>• {tr("지급 포인트는 입금 확정 시점의 바이낸스 시세로 계산됩니다.")}</li>}
              </ul>
            </div>
          </div>

          {/* 최근 코인 입금 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{tr("최근 코인 입금")}</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => scan(true)} disabled={checking}>
                {checking ? tr("확인 중...") : tr("입금 확인")}
              </button>
            </div>
            {state.deposits.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-slate-500">
                {tr("송금하면 이 화면에서 자동으로 확인됩니다. 창을 닫아도 1~2분 안에 자동 반영됩니다.")}
              </p>
            ) : (
              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {state.deposits.map((d) => {
                  const m = ASSETS[d.asset as CryptoAssetId];
                  return (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <AssetChip id={d.asset as CryptoAssetId} small />
                        <span className="font-semibold tabular-nums text-slate-900">{d.amount} {m.symbol}</span>
                        <CryptoStatus d={d} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {d.points && d.status === "CREDITED" && <b className="text-emerald-600">+{formatAmount(d.points)}</b>}
                        <span>{formatDateTime(d.detectedAt)}</span>
                        <a className="text-brand-600 hover:underline" href={m.explorerTx + d.txHash} target="_blank" rel="noreferrer">TX ↗</a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
