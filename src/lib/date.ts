// 한국 시간(KST, UTC+9) 기준 날짜 유틸
// DB 의 @db.Date 컬럼에는 "KST 달력 날짜"를 UTC 자정 Date 로 표현해 저장한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 현재(또는 주어진 시각)의 KST 날짜 → UTC 자정 Date */
export function kstToday(now: Date = new Date()): Date {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** b - a (일) */
export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** "YYYY-MM-DD" → UTC 자정 Date */
export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("날짜 형식이 올바르지 않습니다 (YYYY-MM-DD).");
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const dateKey = (d: Date) => d.toISOString().slice(0, 10);
