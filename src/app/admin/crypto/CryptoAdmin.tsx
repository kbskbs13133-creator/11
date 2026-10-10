"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";
import { formatAmount, formatDateTime } from "@/lib/format";
import { ASSETS, type CryptoAssetId } from "@/lib/crypto/config";
import type { CryptoDepositDTO } from "@/lib/serializers";
import { AssetChip, CryptoStatus } from "@/app/(user)/wallet/CryptoChargeModal";

type ChainCfg = { chain: string; envName: string; ok: boolean; error: string | null; mainAddress: string | null; assets: CryptoAssetId[] };
type Config = { chains: ChainCfg[]; etherscanKey: boolean; trongridKey: boolean; minDepositUsd: number; watchHours: number; walletCount: number; lastScanAt: string | null };
type Stat = { asset: CryptoAssetId; creditedCount: number; creditedAmount: string; creditedPoints: string; openCount: number };
type Row = CryptoDepositDTO & { userName: string; userEmail: string; toAddress: string };
type Data = { config: Config; stats: Stat[]; deposits: Row[] };

const STATUS_TABS = [
  { key: "ALL", label: "전체" },
  { key: "PENDING", label: "컨펌 대기" },
  { key: "CREDITED", label: "충전 완료" },
  { key: "BELOW_MIN", label: "최소 금액 미만" },
];

const short = (s: string, n = 8) => (s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

function Check({ ok }: { ok: boolean }) {
  return <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{ok ? "✓" : "!"}</span>;
}

export default function CryptoAdmin() {
  const tr = useT();
  const toast = useToast();
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>(`/api/admin/crypto?status=${status}&q=${encodeURIComponent(query)}`));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }, [status, query, toast]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 15_000);
    return () => clearInterval(t);
  }, [load]);

  async function scanNow(all: boolean) {
    setScanning(true);
    try {
      const r = await api<{ scanned: number; found: number; credited: number; remaining: number; errors: string[] }>(`/api/admin/crypto/scan${all ? "?all=1" : ""}`, { method: "POST" });
      toast(tr("스캔 완료: 지갑 {s}개 확인, 신규 입금 {f}건, 충전 {c}건", { s: r.scanned, f: r.found, c: r.credited }), r.errors.length ? "error" : "success");
      if (r.errors.length) console.warn("[crypto scan errors]", r.errors);
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setScanning(false);
    }
  }

  async function credit(id: string) {
    if (!confirm(tr("최소 금액 미만 입금을 현재 시세로 포인트 반영할까요?"))) return;
    setBusy(id);
    try {
      await api(`/api/admin/crypto/${id}/credit`, { method: "POST" });
      toast(tr("포인트가 반영되었습니다."), "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  const cfg = data?.config;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{tr("코인 입금 관리")}</h1>
          <p className="mt-1 text-sm text-slate-500">{tr("회원별 HD 지갑 주소로 들어온 입금을 자동 확인하고, 컨펌 완료 시 포인트로 자동 충전합니다. (1 P = 1 USD)")}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => scanNow(true)} disabled={scanning}>{tr("전체 지갑 스캔")}</button>
          <button className="btn-primary btn-sm" onClick={() => scanNow(false)} disabled={scanning}>{scanning ? tr("확인 중...") : tr("지금 스캔")}</button>
        </div>
      </div>

      {/* 설정 상태 */}
      {cfg && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{tr("지갑 설정 상태")}</h2>
            <span className="text-xs text-slate-500">
              {tr("회원 지갑 {n}개", { n: cfg.walletCount })} · {tr("마지막 스캔")} {cfg.lastScanAt ? formatDateTime(cfg.lastScanAt) : "-"}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {cfg.chains.map((c) => (
              <div key={c.chain} className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.assets.map((a) => <AssetChip key={a} id={a} small />)}
                  </div>
                  <Check ok={c.ok} />
                </div>
                <p className="mt-2 font-mono text-[11px] text-slate-500">{c.envName}</p>
                {c.ok ? (
                  <>
                    <p className="mt-2 text-[11px] text-slate-500">{tr("회사 메인 주소 (인덱스 0)")}</p>
                    <p className="break-all font-mono text-xs text-slate-800">{c.mainAddress}</p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-rose-600">{tr(c.error ?? "미설정")}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Check ok={cfg.etherscanKey} /> ETHERSCAN_API_KEY {cfg.etherscanKey ? "" : tr("(필수)")}</span>
            <span className="flex items-center gap-1.5"><Check ok={cfg.trongridKey} /> TRONGRID_API_KEY {cfg.trongridKey ? "" : tr("(필수)")}</span>
            <span>{tr("최소 입금액")} <b className="text-slate-800">${cfg.minDepositUsd}</b></span>
            <span>{tr("자동 감시 시간")} <b className="text-slate-800">{cfg.watchHours}h</b></span>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            {tr("1분 자동 확인: cron-job.org 에서 아래 주소를 1분마다 호출하도록 설정하세요. 헤더 Authorization: Bearer <CRON_SECRET>")}
            <br />
            <code className="break-all font-mono text-slate-700">{typeof window !== "undefined" ? window.location.origin : ""}/api/cron/crypto-scan</code>
          </p>
        </section>
      )}

      {/* 통계 */}
      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.stats.map((s) => (
            <div key={s.asset} className="card min-w-0 !p-4">
              <AssetChip id={s.asset} small />
              <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{s.creditedAmount} <span className="text-xs text-slate-500">{ASSETS[s.asset].symbol}</span></p>
              <p className="text-xs text-slate-500">{tr("충전 {n}건", { n: s.creditedCount })} · {formatAmount(s.creditedPoints)}</p>
              {s.openCount > 0 && <p className="mt-1 text-xs font-semibold text-amber-700">{tr("대기/미달 {n}건", { n: s.openCount })}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 목록 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.02] p-1 text-sm">
            {STATUS_TABS.map((t) => (
              <button key={t.key} onClick={() => setStatus(t.key)} className={`rounded-lg px-3 py-1.5 ${status === t.key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-slate-800"}`}>
                {tr(t.label)}
              </button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), setQuery(q))}>
            <input className="input !py-2 text-sm" placeholder={tr("회원/주소/TX 검색")} value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-secondary btn-sm">{tr("검색")}</button>
          </form>
        </div>
        <div className="card overflow-x-auto !p-0">
          <table className="table w-full min-w-[980px]">
            <thead>
              <tr>
                <th>{tr("감지 일시")}</th>
                <th>{tr("회원")}</th>
                <th>{tr("코인")}</th>
                <th className="!text-right">{tr("수량")}</th>
                <th>{tr("상태")}</th>
                <th className="!text-right">{tr("적용 시세")}</th>
                <th className="!text-right">{tr("지급 포인트")}</th>
                <th>{tr("입금 주소 / TX")}</th>
                <th className="!text-right">{tr("처리@action")}</th>
              </tr>
            </thead>
            <tbody>
              {!data && <tr><td colSpan={9} className="py-10 text-center text-slate-400">{tr("불러오는 중...")}</td></tr>}
              {data && data.deposits.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-slate-400">{tr("내역이 없습니다.")}</td></tr>}
              {data?.deposits.map((d) => {
                const m = ASSETS[d.asset as CryptoAssetId];
                return (
                  <tr key={d.id}>
                    <td className="text-xs text-slate-500">{formatDateTime(d.detectedAt)}</td>
                    <td>
                      <div className="font-medium">{d.userName}</div>
                      <div className="text-xs text-slate-500">{d.userEmail}</div>
                    </td>
                    <td><AssetChip id={d.asset as CryptoAssetId} small /></td>
                    <td className="text-right font-semibold tabular-nums">{d.amount}</td>
                    <td><CryptoStatus d={d} /></td>
                    <td className="text-right text-xs tabular-nums text-slate-600">{d.priceUsd ? `$${Number(d.priceUsd).toLocaleString("en-US")}` : "-"}</td>
                    <td className="text-right font-semibold tabular-nums text-emerald-600">{d.points ? formatAmount(d.points) : "-"}</td>
                    <td className="text-xs">
                      <a className="block font-mono text-slate-600 hover:text-brand-600" href={m.explorerAddr + d.toAddress} target="_blank" rel="noreferrer">{short(d.toAddress)}</a>
                      <a className="block font-mono text-brand-600 hover:underline" href={m.explorerTx + d.txHash} target="_blank" rel="noreferrer">TX {short(d.txHash, 6)} ↗</a>
                    </td>
                    <td className="text-right">
                      {d.status === "BELOW_MIN" && (
                        <button className="btn-secondary btn-sm whitespace-nowrap" disabled={busy === d.id} onClick={() => credit(d.id)}>{tr("수동 반영")}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
