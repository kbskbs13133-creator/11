export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white">P</div>
          <h1 className="text-xl font-bold text-slate-900">포인트 예치 플랫폼</h1>
          <p className="mt-1 text-sm text-slate-500">예치하고, 매일 이자를 받으세요</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
