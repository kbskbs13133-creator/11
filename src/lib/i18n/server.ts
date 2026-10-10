import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LOCALE_COOKIE, makeT, normalizeLocale, type Locale } from "./index";
import { BRAND } from "@/lib/brand";

export function getLocale(): Locale {
  return normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
}

export function getT() {
  return makeT(getLocale());
}

/** 페이지 메타데이터 제목 헬퍼: export const generateMetadata = pageTitle("대시보드"); */
export function pageTitle(ko: string) {
  return async function generateMetadata(): Promise<Metadata> {
    const tr = getT();
    return { title: `${tr(ko)} | ${BRAND.name}` };
  };
}
