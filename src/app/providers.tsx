"use client";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

export default function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <LocaleProvider locale={locale}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </LocaleProvider>
  );
}
