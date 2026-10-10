// 클라이언트/서버 공용 포맷터 (Decimal 문자열을 부동소수 변환 없이 포맷)

export function formatAmount(value: string | number | null | undefined, withUnit = true): string {
  if (value === null || value === undefined || value === "") return "-";
  const str = typeof value === "number" ? value.toFixed(2) : String(value);
  const negative = str.startsWith("-");
  const [intPartRaw, fracRaw = ""] = str.replace("-", "").split(".");
  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = fracRaw.padEnd(2, "0").slice(0, 2);
  const body = frac === "00" ? intPart : `${intPart}.${frac}`;
  return `${negative ? "-" : ""}${body}${withUnit ? " P" : ""}`;
}

export function formatRate(value: string | number): string {
  let s = String(value);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return `${s}%`;
}

/** 기간(일) → 라벨 (ko: 12개월 / en: 12 months) */
export function termLabel(days: number, locale: "ko" | "en" = "ko"): string {
  if (locale === "en") {
    const u = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
    if (days === 365) return "12 months";
    if (days % 365 === 0) return u(days / 365, "year");
    if (days % 30 === 0) return u(days / 30, "month");
    if (days % 7 === 0) return u(days / 7, "week");
    return u(days, "day");
  }
  if (days === 365) return "12개월";
  if (days % 365 === 0) return `${days / 365}년`;
  if (days % 30 === 0) return `${days / 30}개월`;
  if (days % 7 === 0) return `${days / 7}주`;
  return `${days}일`;
}

/** @db.Date 로 저장된 KST 날짜(UTC 자정) → YYYY-MM-DD */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

/** 실제 시각(timestamp) → KST YYYY-MM-DD HH:mm */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${k.toISOString().slice(0, 10)} ${k.toISOString().slice(11, 16)}`;
}

/** 금액 입력 검증: 양수, 소수점 2자리까지 */
export const AMOUNT_REGEX = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/;
