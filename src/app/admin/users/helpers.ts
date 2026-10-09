import type { VipLevel } from "@prisma/client";
export { s2 } from "@/lib/money";
export const vipName = (v: VipLevel) => `${v.name} (+${v.bonusRate.toDecimalPlaces(4).toString()}%)`;
