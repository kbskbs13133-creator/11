import { Prisma } from "@prisma/client";

export const Decimal = Prisma.Decimal;
export type DecimalT = Prisma.Decimal;

export const ZERO = new Prisma.Decimal(0);

/** 소수점 2자리 내림 (지급 금액은 항상 내림 → 마지막 날 잔여분 보정) */
export const floor2 = (d: DecimalT) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);

export const toDec = (v: string | number | DecimalT) => new Prisma.Decimal(v);

/** Decimal → 클라이언트 전달용 문자열 (항상 소수 2자리) */
export function s2(d: DecimalT): string;
export function s2(d: DecimalT | null | undefined): string | null;
export function s2(d: DecimalT | null | undefined): string | null {
  return d == null ? null : d.toFixed(2);
}
export const sRate = (d: DecimalT) => d.toDecimalPlaces(4).toString();
