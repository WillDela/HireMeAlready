import type { NotificationKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { Notification } from "@/lib/mock";
import { timeAgo } from "@/lib/views";

// The top bar's bell. Anything that finishes on someone's behalf (a friend request,
// results, feedback, a parsed resume, a reviewed report) calls notify() after its own
// write succeeds; the bell polls GET /api/notifications every 30s.

const LIMIT = 30;

/**
 * Best-effort: a failed insert is logged and swallowed, so a notification can never
 * break the action that caused it.
 */
export async function notify(
  userId: string,
  n: { kind: NotificationKind; title: string; body: string; href: string },
) {
  try {
    await db.notification.create({ data: { userId, ...n } });
  } catch (err) {
    console.error(`Failed to notify ${userId} (${n.kind})`, err);
  }
}

/** GET /api/notifications: your latest notifications, newest first, as the bell shows them. */
export async function listNotifications(userId: string): Promise<Notification[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });
  const now = new Date();
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    time: timeAgo(n.createdAt, now),
    unread: n.readAt === null,
    href: n.href,
  }));
}

/** PATCH /api/notifications: marks one of your notifications read, or all of them when `id` is omitted. */
export async function markRead(userId: string, id?: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(id ? { id } : {}) },
    data: { readAt: new Date() },
  });
}
