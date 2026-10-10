"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("비밀번호가 일치하지 않습니다.");
    setLoading(true);
    try {
      await api("/api/signup", { method: "POST", json: { name: form.name, email: form.email, password: form.password } });
      router.push("/login?signup=1");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <p className="eyebrow">CREATE ACCOUNT</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">회원가입</h2>
      </div>
      <div>
        <label className="label" htmlFor="name">이름</label>
        <input id="name" className="input" value={form.name} onChange={set("name")} required maxLength={30} />
      </div>
      <div>
        <label className="label" htmlFor="email">이메일</label>
        <input id="email" type="email" className="input" value={form.email} onChange={set("email")} required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">비밀번호 (8자 이상)</label>
        <input id="password" type="password" className="input" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">비밀번호 확인</label>
        <input id="confirm" type="password" className="input" value={form.confirm} onChange={set("confirm")} required autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "가입 중..." : "회원가입"}
      </button>
      <p className="text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">로그인</Link>
      </p>
    </form>
  );
}
