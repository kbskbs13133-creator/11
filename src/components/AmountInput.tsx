"use client";
import { useT } from "./LocaleProvider";
import { toCents } from "@/lib/clientMath";

/** 입력값에서 숫자/소수점만 남기고 소수 2자리로 제한 → "1234567.5" 같은 원본 문자열 */
export function cleanAmount(input: string): string {
  let s = input.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  s = s.replace(/^0+(?=\d)/, ""); // 앞자리 0 제거
  return s.slice(0, 16);
}

/** "100000000" → "100,000,000" (입력 중인 소수점도 유지) */
export function commaAmount(raw: string): string {
  if (!raw) return "";
  const [i, f] = raw.split(".");
  const int = (i || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return f !== undefined ? `${int}.${f}` : int;
}

/** "123456789" → "1억 2,345만 6,789" */
export function koreanAmount(raw: string): string {
  const c = toCents(raw || "");
  if (c === null || c === 0n) return "";
  let n = c / 100n;
  const units = ["", "만", "억", "조"];
  const parts: string[] = [];
  for (let i = 0; n > 0n && i < units.length; i++) {
    const chunk = n % 10000n;
    if (chunk > 0n) parts.unshift(`${chunk.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${units[i]}`);
    n /= 10000n;
  }
  return parts.join(" ") || "0";
}

/** "123456789" → "123.46 million" (영문 읽기 보조) */
export function englishAmount(raw: string): string {
  const c = toCents(raw || "");
  if (c === null || c === 0n) return "";
  const n = c / 100n;
  const units: [bigint, string][] = [
    [1_000_000_000_000n, "trillion"],
    [1_000_000_000n, "billion"],
    [1_000_000n, "million"],
    [1_000n, "thousand"],
  ];
  for (const [base, word] of units) {
    if (n >= base) {
      const hundredths = (n * 100n) / base;
      const whole = hundredths / 100n;
      const frac = (hundredths % 100n).toString().padStart(2, "0").replace(/0+$/, "");
      return `${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${frac ? "." + frac : ""} ${word}`;
    }
  }
  return n.toString();
}

/** 천 단위 콤마가 자동으로 찍히는 포인트 금액 입력칸. value/onChange 는 콤마 없는 원본 문자열 */
export default function AmountInput({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (raw: string) => void;
  autoFocus?: boolean;
}) {
  const tr = useT();
  const kor = tr.locale === "en" ? englishAmount(value) : koreanAmount(value);
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          className="input pr-9 text-right text-lg font-semibold tracking-wide tabular-nums"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={commaAmount(value)}
          onChange={(e) => onChange(cleanAmount(e.target.value))}
          autoFocus={autoFocus}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-brand-500">P</span>
      </div>
      <p className="mt-1 h-4 text-right text-xs text-slate-400">{kor && `${kor} ${tr("포인트")}`}</p>
    </div>
  );
}
