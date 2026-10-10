"use client";
import { useT } from "@/components/LocaleProvider";
type Tone = "gray" | "blue" | "green" | "red" | "amber" | "purple" | "gold";

const tones: Record<Tone, string> = {
  gray: "bg-white/[0.04] text-slate-600 ring-white/10",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  gold: "bg-brand-50 text-brand-700 ring-brand-400/40",
};

export default function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function TxStatusBadge({ status }: { status: string }) {
  const tr = useT();
  if (status === "PENDING") return <Badge tone="amber">{tr("처리중")}</Badge>;
  if (status === "APPROVED") return <Badge tone="green">{tr("처리완료")}</Badge>;
  return <Badge tone="red">{tr("거절됨")}</Badge>;
}

export function TxTypeBadge({ type }: { type: string }) {
  const tr = useT();
  if (type === "CHARGE") return <Badge tone="blue">{tr("충전 신청")}</Badge>;
  if (type === "WITHDRAW") return <Badge tone="purple">{tr("환전 신청")}</Badge>;
  return <Badge tone="gray">{tr("관리자 충전")}</Badge>;
}

export function DepositStatusBadge({ status }: { status: string }) {
  const tr = useT();
  if (status === "ACTIVE") return <Badge tone="blue">{tr("진행중@status")}</Badge>;
  if (status === "COMPLETED") return <Badge tone="green">{tr("완료@status")}</Badge>;
  return <Badge tone="red">{tr("취소@status")}</Badge>;
}

export function VipBadge({ level, name }: { level: number; name?: string }) {
  const tone: Tone[] = ["gray", "gray", "blue", "purple", "amber", "gold"];
  return <Badge tone={tone[level] ?? "gray"}>VIP {level}{name ? ` · ${name}` : ""}</Badge>;
}
