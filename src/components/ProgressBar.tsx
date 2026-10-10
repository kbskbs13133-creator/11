export default function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "green" | "gray" }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === "green" ? "bg-emerald-500" : tone === "gray" ? "bg-slate-400" : "bg-gradient-to-r from-brand-300 via-brand-500 to-brand-700";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 예치 진행률 (경과일 / 기간) */
export function depositProgress(startDate: string, termDays: number, lastInterestDate: string | null, status: string) {
  if (status === "COMPLETED") return 100;
  if (!lastInterestDate) return 0;
  const elapsed = Math.round((new Date(lastInterestDate).getTime() - new Date(startDate).getTime()) / 86400000);
  return (elapsed / termDays) * 100;
}
