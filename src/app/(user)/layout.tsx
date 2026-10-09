import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { TopNav, BottomNav, type NavItem } from "@/components/NavLinks";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const items: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: "home" },
  { href: "/products", label: "상품", icon: "chart" },
  { href: "/my-deposits", label: "내 예치", icon: "coins" },
  { href: "/wallet", label: "지갑", icon: "wallet" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">P</span>
            <span className="hidden sm:inline">포인트 예치</span>
          </Link>
          <TopNav items={items} />
          <div className="flex items-center gap-3">
            <span className="max-w-[120px] truncate text-sm text-slate-600">{user.name}님</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
