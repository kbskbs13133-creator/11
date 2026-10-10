"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className={`whitespace-nowrap text-sm text-slate-500 transition hover:text-brand-600 ${className}`}>
      로그아웃
    </button>
  );
}
