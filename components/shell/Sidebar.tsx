"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag } from "lucide-react";
import { cn } from "@/lib/cn";
import { currentUser } from "@/lib/mock";
import { navItems } from "./nav";
import { Wordmark } from "./Wordmark";

/** Desktop: the file drawer down the left edge. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="surface-drawer sticky top-0 hidden h-dvh w-60 flex-none flex-col bg-drawer md:flex">
      <div className="px-6 pt-7 pb-8">
        <Link href="/dashboard" className="inline-block text-hi" aria-label="hire-me-already, home">
          <Wordmark />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[4px] px-3 text-[0.9375rem] font-semibold transition-colors duration-150",
                    active ? "hl font-bold" : "text-ink-2 hover:bg-drawer-2 hover:text-ink",
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {currentUser.isAdmin ? (
        <div className="border-t border-edge/60 px-3 py-4">
          <p className="cond px-3 pb-2 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Admin</p>
          <Link
            href="/admin/reports"
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[4px] px-3 text-[0.9375rem] font-semibold transition-colors duration-150",
              pathname.startsWith("/admin") ? "hl font-bold" : "text-ink-2 hover:bg-drawer-2 hover:text-ink",
            )}
          >
            <Flag size={19} aria-hidden="true" />
            Reports
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

/** Mobile: the same six destinations as a bottom tab bar. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="surface-drawer fixed inset-x-0 bottom-0 z-40 bg-drawer pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-6">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold cond tracking-[0.02em]",
                  active ? "text-ink" : "text-ink-2",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-11 place-items-center rounded-[4px] transition-colors duration-150",
                    active && "bg-hi text-hi-ink",
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
