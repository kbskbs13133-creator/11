import type { VipLevel } from "@prisma/client";
export { s2 } from "@/lib/money";
import { L, type Locale } from "@/lib/i18n";
export const vipName = (v: VipLevel, locale: Locale = "ko") => `${L(locale, v.name, v.nameEn)} (+${v.bonusRate.toDecimalPlaces(4).toString()}%)`;
