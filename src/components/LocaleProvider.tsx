"use client";
import { createContext, useContext, useMemo } from "react";
import { makeT, type Locale, type Translator } from "@/lib/i18n";

const Ctx = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx);
}

export function useT(): Translator {
  const locale = useContext(Ctx);
  return useMemo(() => makeT(locale), [locale]);
}
