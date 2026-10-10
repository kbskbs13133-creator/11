"use client";
import { signOut } from "next-auth/react";
import { useT } from "./LocaleProvider";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const tr = useT();
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className={`whitespace-nowrap text-sm text-slate-500 transition hover:text-brand-600 ${className}`}>
      {tr("로그아웃")}
    </button>
  );
}
