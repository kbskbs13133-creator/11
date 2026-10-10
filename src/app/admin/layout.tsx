import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { TopNav, BottomNav, type NavItem } from "@/components/NavLinks";
import SignOutButton from "@/components/SignOutButton";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const items: NavItem[] = [
  { href: "/admin", label: "개요", icon: "grid" },
  { href: "/admin/users", label: "회원", icon: "users" },
  { href: "/admin/transactions", label: "신청", icon: "inbox" },
  { href: "/admin/products", label: "상품", icon: "box" },
  { href: "/admin/deposits", label: "예치", icon: "coins" },
  { href: "/admin/vip-levels", label: "VIP", icon: "star" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="shrink-0">
            <Logo letter="A" name="관리자 콘솔" sub="ADMIN CONSOLE" />
          </Link>
          <div className="hidden rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 md:block">
            <TopNav items={items} exactHref="/admin" />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[120px] truncate text-sm text-slate-500 sm:inline">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <BottomNav items={items} exactHref="/admin" />
    </div>
  );
}
