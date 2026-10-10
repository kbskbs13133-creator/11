import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { TopNav, BottomNav, type NavItem } from "@/components/NavLinks";
import SignOutButton from "@/components/SignOutButton";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const items: NavItem[] = [
  { href: "/home", label: "홈", icon: "home" },
  { href: "/dashboard", label: "대시보드", icon: "grid" },
  { href: "/products", label: "상품", icon: "chart" },
  { href: "/my-deposits", label: "내 예치", icon: "coins" },
  { href: "/wallet", label: "지갑", icon: "wallet" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <div className="min-h-screen overflow-x-clip pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/home" className="shrink-0">
            <Logo />
          </Link>
          <TopNav items={items} />
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[120px] truncate text-sm text-slate-600 sm:inline">{user.name}님</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
