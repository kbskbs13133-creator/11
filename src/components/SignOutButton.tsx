"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className={`text-sm text-slate-500 hover:text-slate-800 ${className}`}>
      로그아웃
    </button>
  );
}
