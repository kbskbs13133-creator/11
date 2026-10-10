import { BRAND } from "@/lib/brand";

/** 골드 모노그램 + 워드마크 */
export function LogoMark({ size = 32, letter = "P" }: { size?: number; letter?: string }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-[10px] font-black text-ink-950"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundImage: "linear-gradient(135deg,#f7e2ad 0%,#d6b264 48%,#9c7a34 100%)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.25) inset, 0 6px 18px -6px rgba(214,178,100,0.6)",
      }}
    >
      {letter}
    </span>
  );
}

export default function Logo({ letter = "P", sub = BRAND.tagline, name = BRAND.name }: { letter?: string; sub?: string; name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark letter={letter} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-tight text-slate-900">{name}</span>
        <span className="mt-1 hidden whitespace-nowrap text-[9px] font-semibold tracking-[0.28em] text-brand-500 min-[400px]:block">{sub}</span>
      </span>
    </span>
  );
}
