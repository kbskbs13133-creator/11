"use client";
import Link from "next/link";
import Icon from "./Icon";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

const isActive = (path: string, href: string, exact?: boolean) =>
  exact ? path === href : path === href || path.startsWith(href + "/");

/** 데스크톱 상단 가로 메뉴 */
export function TopNav({ items, exactHref }: { items: NavItem[]; exactHref?: string }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(path, it.href, it.href === exactHref) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/** 모바일 하단 탭 바 */
export function BottomNav({ items, exactHref }: { items: NavItem[]; exactHref?: string }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex overflow-x-auto">
        {items.map((it) => {
          const active = isActive(path, it.href, it.href === exactHref);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand-600" : "text-slate-500"}`}
            >
              <Icon name={it.icon} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
