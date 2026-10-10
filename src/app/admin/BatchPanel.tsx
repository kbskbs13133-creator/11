"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";
import { useT } from "@/components/LocaleProvider";

type Run = {
  id: string;
  trigger: string;
  targetDate: string;
  status: string;
  processedCount: number;
  interestCount: number;
  totalInterest: string;
  completedCount: number;
  failedCount: number;
  startedAt: string;
  finishedAt: string | null;
};

const triggerLabel: Record<string, string> = { CRON: "Cron", NODE: "node-cron", MANUAL: "수동" };
const statusTone = { SUCCESS: "green", PARTIAL: "amber", FAILED: "red", RUNNING: "blue" } as const;

export default function BatchPanel({ runs, today }: { runs: Run[]; today: string }) {
  const tr = useT();
  const router = useRouter();
  const toast = useToast();
  const [targetDate, setTargetDate] = useState("");
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  async function run() {
    const isSim = targetDate && targetDate !== today;
    if (isSim && !confirm(tr("기준일 {date} 로 배치를 실행합니다.\n미래 날짜를 지정하면 해당 날짜까지의 이자가 실제로 지급됩니다. (테스트 전용)\n계속하시겠습니까?", { date: targetDate }))) return;
    setRunning(true);
    try {
      const r = await api<{ targetDate: string; scanned: number; interestCount: number; totalInterest: string; completedCount: number; failedCount: number }>(
        "/api/admin/batch",
        { method: "POST", json: targetDate ? { targetDate } : {} }
      );
      const msg =
        tr("기준일 {date}: 대상 {scanned}건 · 이자 {interest}건 ({amount}) · 만기 해제 {completed}건", { date: r.targetDate, scanned: r.scanned, interest: r.interestCount, amount: formatAmount(r.totalInterest), completed: r.completedCount }) +
        (r.failedCount ? ` · ${tr("실패 {n}건", { n: r.failedCount })}` : "");
      setLast(msg);
      toast(tr("배치 실행 완료"), "success");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-bold">{tr("일일 이자 배치")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {tr("매일 00:00(KST) 자동 실행됩니다. (Vercel Cron 또는 node-cron) 이미 지급된 날짜는 중복 지급되지 않으므로 여러 번 실행해도 안전합니다.")}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <label className="label">{tr("기준일 (비우면 오늘 {today})", { today })}</label>
          <input type="date" className="input sm:w-48" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={run} disabled={running}>
          {running ? tr("실행 중...") : tr("▶ 배치 수동 실행")}
        </button>
      </div>
      {last && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{last}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>{tr("실행일시")}</th><th>{tr("방식")}</th><th>{tr("기준일")}</th><th>{tr("상태")}</th><th className="!text-right">{tr("이자 지급")}</th><th className="!text-right">{tr("지급액")}</th><th className="!text-right">{tr("만기 해제")}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">{tr("실행 이력이 없습니다.")}</td></tr>}
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="text-xs text-slate-500">{formatDateTime(r.startedAt)}</td>
                <td>{tr(triggerLabel[r.trigger] ?? r.trigger)}</td>
                <td>{formatDate(r.targetDate)}</td>
                <td>
                  <Badge tone={statusTone[r.status as keyof typeof statusTone] ?? "gray"}>{r.status}</Badge>
                  {r.failedCount > 0 && <span className="ml-1 text-xs text-rose-500">{tr("실패 {n}건", { n: r.failedCount })}</span>}
                </td>
                <td className="text-right">{tr("{n}건 / {d}일분", { n: r.processedCount, d: r.interestCount })}</td>
                <td className="text-right font-semibold text-emerald-600">{formatAmount(r.totalInterest)}</td>
                <td className="text-right">{tr("{n}건", { n: r.completedCount })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
