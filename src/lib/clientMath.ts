// 클라이언트용 정밀 계산 (BigInt 기반, 부동소수 미사용)
// 금액: 센트(소수 2자리) 단위 BigInt, 이율: 소수 4자리 단위 BigInt

export function toCents(amount: string): bigint | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!m) return null;
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}

export function toRate4(rate: string): bigint {
  const [i, f = ""] = rate.split(".");
  return BigInt(i || "0") * 10000n + BigInt(f.padEnd(4, "0").slice(0, 4) || "0");
}

export function centsToString(c: bigint): string {
  const neg = c < 0n;
  const abs = neg ? -c : c;
  return `${neg ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}

export function rate4ToString(r: bigint): string {
  const s = `${r / 10000n}.${(r % 10000n).toString().padStart(4, "0")}`;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

/** 만기 총이자(센트) = floor(원금 × 이율 / 100) */
export function expectedInterestCents(principalCents: bigint, rate4: bigint): bigint {
  return (principalCents * rate4) / 1_000_000n;
}

/** 일 이자(센트) = floor(만기 총이자 / 일수) */
export function dailyInterestCents(expected: bigint, termDays: number): bigint {
  return expected / BigInt(termDays);
}
