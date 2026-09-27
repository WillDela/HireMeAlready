"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, FileText, Flag, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/mock";
import { apiFetch, useApiResource } from "@/lib/use-api";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { signOut } from "@/lib/auth-client";
import { Avatar } from "@/components/ui/Avatar";
import { Popover } from "@/components/ui/Popover";
import { EmptyFolder } from "@/components/ui/States";
import { RoleToggle } from "./RoleToggle";
import { Wordmark } from "./Wordmark";

// Pages where interviewee vs interviewer changes nothing, so the role toggle is hidden.
const NO_ROLE_TOGGLE = ["/friends", "/resume", "/settings"];

export function TopBar() {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const showRoleToggle = !NO_ROLE_TOGGLE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // Polls every 30s so new results, feedback and requests show up without a reload.
  const notifications = useApiResource<Notification[]>("/api/notifications", {
    pollWhile: () => true,
    pollMs: 30_000,
  });
  const items = notifications.data ?? [];
  const unread = items.filter((n) => n.unread).length;

  /** Marks one notification read (or all, without `id`) right away, then tells the server. */
  function markRead(id?: string) {
    notifications.mutate(items.map((n) => (!id || n.id === id ? { ...n, unread: false } : n)));
    apiFetch<Notification[]>("/api/notifications", { method: "PATCH", body: JSON.stringify({ id }) })
      .then(notifications.mutate)
      .catch(() => notifications.reload());
  }

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-page">
      <div className="mx-auto flex h-16 max-w-[76rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/practice" className="text-ink md:hidden" aria-label="Hire Me Already, home">
          <Wordmark variant="vertical" verticalClassName="text-[0.9375rem]" />
        </Link>

        {showRoleToggle ? <RoleToggle className="ml-auto md:ml-0" /> : null}

        <div className={cn("flex items-center gap-1", showRoleToggle ? "md:ml-auto" : "ml-auto")}>
          <Popover
            buttonLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
            panelLabel="Notifications"
            buttonClassName="icon-btn relative"
            panelClassName="sm:w-[24rem]"
            buttonContent={
              <>
                <Bell size={20} aria-hidden="true" />
                {unread ? (
                  <span
                    aria-hidden="true"
                    className="tnum absolute top-1 right-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-stamp px-1 text-[0.6875rem] font-bold text-[oklch(0.99_0_0)]"
                  >
                    {unread}
                  </span>
                ) : null}
              </>
            }
          >
            {(close) => (
              <div>
                <div className="flex items-center justify-between border-b border-edge px-5 py-3.5">
                  <h2 className="text-[1rem] font-bold">Notifications</h2>
                  <button
                    type="button"
                    className="text-[0.8125rem] font-semibold text-ink-2 underline hover:text-ink disabled:no-underline disabled:opacity-50"
                    disabled={!unread}
                    onClick={() => markRead()}
                  >
                    Mark all read
                  </button>
                </div>
                {items.length === 0 ? (
                  <EmptyFolder compact title="You're all caught up">
                    Results, feedback and friend requests will show up here.
                  </EmptyFolder>
                ) : (
                  <ul className="max-h-[60vh] divide-y divide-edge overflow-y-auto">
                    {items.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={n.href}
                          onClick={() => {
                            if (n.unread) markRead(n.id);
                            close();
                          }}
                          className="flex gap-3 px-5 py-3.5 hover:bg-paper-2"
                        >
                          <span
                            aria-hidden="true"
                            className={cn("mt-2 h-2 w-2 flex-none rounded-full", n.unread ? "bg-stamp" : "bg-transparent")}
                          />
                          <span className="min-w-0">
                            <span className="block text-[0.9375rem] font-semibold">
                              {n.title}
                              {n.unread ? <span className="visually-hidden"> (unread)</span> : null}
                            </span>
                            <span className="block text-[0.875rem] text-ink-2">{n.body}</span>
                            <span className="mt-0.5 block text-[0.75rem] text-ink-3">{n.time}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Popover>

          <Popover
            buttonLabel={`Account menu for ${currentUser.name}`}
            panelLabel="Account"
            buttonClassName="rounded-full p-1"
            panelClassName="sm:w-[17rem]"
            buttonContent={<Avatar name={currentUser.name} initials={currentUser.initials} size={34} />}
          >
            {(close) => (
              <div>
                <div className="border-b border-edge px-5 py-4">
                  <p className="font-bold">{currentUser.name}</p>
                  <p className="text-[0.875rem] text-ink-2">{currentUser.email}</p>
                </div>
                <ul className="p-2">
                  {[
                    { href: "/settings", label: "Settings", icon: Settings },
                    { href: "/resume", label: "Your resume", icon: FileText },
                    ...(currentUser.isAdmin ? [{ href: "/admin/reports", label: "Admin: reports", icon: Flag }] : []),
                  ].map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={close}
                        className="flex min-h-11 items-center gap-3 rounded-[4px] px-3 text-[0.9375rem] font-medium hover:bg-paper-2"
                      >
                        <Icon size={18} aria-hidden="true" className="text-ink-2" />
                        {label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={async () => {
                        close();
                        await signOut();
                        router.push("/login");
                        router.refresh();
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-[4px] px-3 text-[0.9375rem] font-medium hover:bg-paper-2"
                    >
                      <LogOut size={18} aria-hidden="true" className="text-ink-2" />
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </Popover>
        </div>
      </div>
    </header>
  );
}
