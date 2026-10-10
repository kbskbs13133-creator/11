// 다국어(EN/KO) 공용 헬퍼 — 소스에는 한국어 원문을 그대로 두고, 영어는 dict.ts 에서 조회합니다.
import { EN } from "./dict";

export type Locale = "en" | "ko";
export const LOCALES: Locale[] = ["en", "ko"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export function normalizeLocale(v: string | null | undefined): Locale {
  return v === "ko" ? "ko" : v === "en" ? "en" : DEFAULT_LOCALE;
}

export type Vars = Record<string, string | number>;
export type Translator = ((ko: string, vars?: Vars) => string) & { locale: Locale };

function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** 같은 한국어라도 문맥이 다르면 "취소@status" 처럼 @문맥 을 붙여 구분 (한국어 화면에는 @ 앞부분만 표시) */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  const ko = key.includes("@") ? key.slice(0, key.indexOf("@")) : key;
  let base = ko;
  if (locale === "en") {
    // "a@nav@tab" → "a@nav@tab" → "a@nav" → "a" 순으로 가장 구체적인 번역을 찾음
    let k = key;
    for (;;) {
      if (EN[k] !== undefined) { base = EN[k]; break; }
      const i = k.lastIndexOf("@");
      if (i < 0) break;
      k = k.slice(0, i);
    }
  }
  return fill(base, vars);
}

export function makeT(locale: Locale): Translator {
  const fn = ((ko: string, vars?: Vars) => translate(locale, ko, vars)) as Translator;
  fn.locale = locale;
  return fn;
}

/** DB 데이터(상품명·등급명 등)의 영문 값이 있으면 영어 모드에서 사용 */
export function L(locale: Locale, ko: string, en?: string | null): string {
  return locale === "en" && en && en.trim() ? en : ko;
}

/** 서버 오류 메시지(한국어) → 현재 언어. 동적 메시지는 패턴으로 변환 */
const PATTERNS: [RegExp, string][] = [
  [/^사용 가능 포인트가 부족합니다\. \(사용 가능: (.+)\)$/, "Insufficient available points. (Available: $1)"],
  [/^환전 가능 포인트가 부족합니다\. \(가능: (.+)\)$/, "Insufficient points to withdraw. (Available: $1)"],
  [/^회원 잔액이 부족하여 승인할 수 없습니다\. \(현재 잔액: (.+)\)$/, "Cannot approve: the member's balance is insufficient. (Current balance: $1)"],
  [/^상품은 최대 (\d+)개까지 등록할 수 있습니다\.$/, "You can register up to $1 products."],
  [/^요청 실패 \((\d+)\)$/, "Request failed ($1)"],
];
export function translateMessage(locale: Locale, msg: string): string {
  if (locale !== "en") return msg;
  if (EN[msg]) return EN[msg];
  for (const [re, en] of PATTERNS) if (re.test(msg)) return msg.replace(re, en);
  return msg;
}
