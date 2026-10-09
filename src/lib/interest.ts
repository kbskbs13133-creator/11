import { Prisma } from "@prisma/client";
import { floor2, type DecimalT } from "./money";

/**
 * 만기 시 총 이자 = 원금 × (총이율 / 100)   (소수 2자리 내림)
 */
export function calcExpectedInterest(principal: DecimalT, totalRate: DecimalT): DecimalT {
  return floor2(principal.mul(totalRate).div(100));
}

/**
 * n일차(1 ~ termDays) 지급 이자
 *  - 일일 이자 = 원금 × (총이율/100) / 예치기간 일수  (소수 2자리 내림)
 *  - 마지막 날에는 내림으로 생긴 잔여분을 보정하여, 누적 이자 합계가 정확히 만기 총이자와 일치하게 함
 */
export function calcDailyInterest(dayIndex: number, termDays: number, expectedInterest: DecimalT): DecimalT {
  const daily = floor2(expectedInterest.div(termDays));
  if (dayIndex >= termDays) {
    return expectedInterest.sub(daily.mul(termDays - 1));
  }
  return daily;
}

export const sumDecimals = (arr: DecimalT[]) => arr.reduce((a, b) => a.add(b), new Prisma.Decimal(0));
