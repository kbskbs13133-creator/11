"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

export default function LoginForm() {
  const tr = useT();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const justSignedUp = params.get("signup") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (!res || res.error) {
      setLoading(false);
      setError(tr("이메일 또는 비밀번호가 올바르지 않습니다."));
      return;
    }
    const session = await getSession();
    const home = session?.user.role === "ADMIN" ? "/admin" : "/home";
    const callbackUrl = params.get("callbackUrl");
    // 역할에 맞지 않는 callbackUrl 은 무시 (미들웨어가 어차피 차단)
    const target =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") &&
      (session?.user.role === "ADMIN" ? callbackUrl.startsWith("/admin") : !callbackUrl.startsWith("/admin"))
        ? callbackUrl
        : home;
    window.location.href = target;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <p className="eyebrow">WELCOME BACK</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{tr("로그인")}</h2>
      </div>
      {justSignedUp && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{tr("회원가입이 완료되었습니다. 로그인해주세요.")}</p>
      )}
      <div>
        <label className="label" htmlFor="email">{tr("이메일")}</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">{tr("비밀번호")}</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? tr("로그인 중...") : tr("로그인")}
      </button>
      <p className="text-center text-sm text-slate-500">
        {tr("계정이 없으신가요?")}{" "}
        <Link href="/signup" className="font-semibold text-brand-600 hover:underline">{tr("회원가입")}</Link>
      </p>
    </form>
  );
}
