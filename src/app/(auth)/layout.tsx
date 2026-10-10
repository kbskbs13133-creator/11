import Link from "next/link";
import Logo from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* 배경 골드 글로우 */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-20%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="card border-brand-400/15 !p-6 sm:!p-7">{children}</div>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="transition hover:text-brand-600">← 메인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
