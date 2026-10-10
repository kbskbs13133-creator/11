import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { BRAND } from "@/lib/brand";
import { getLocale, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tr = getT();
  return {
    title: BRAND.title,
    description: tr("포인트 예치 기반 이자 지급 플랫폼"),
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
