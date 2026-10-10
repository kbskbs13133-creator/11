"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

export default function LangToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[11px] font-semibold tracking-wider ${pending ? "opacity-60" : ""} ${className}`}
    >
      {(["en", "ko"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2 py-1 transition ${
            locale === l ? "bg-brand-500/90 text-ink-950" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {l === "en" ? "EN" : "KO"}
        </button>
      ))}
    </div>
  );
}
