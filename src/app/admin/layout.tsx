import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { TopNav, BottomNav, type NavItem } from "@/components/NavLinks";
import SignOutButton from "@/components/SignOutButton";

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
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-black">A</span>
            <span className="hidden sm:inline">관리자 콘솔</span>
          </Link>
          <div className="rounded-xl bg-white p-1 md:block hidden">
            <TopNav items={items} exactHref="/admin" />
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-[120px] truncate text-sm text-slate-300">{user.name}</span>
            <SignOutButton className="!text-slate-300 hover:!text-white" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <BottomNav items={items} exactHref="/admin" />
    </div>
  );
}
