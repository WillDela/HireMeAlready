import type { FriendsResponse, PersonSearchResult, PersonSummary } from "@/lib/contracts";
import { db } from "@/lib/db";

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

export function toPerson(user: { id: string; name: string }, headline: string | null): PersonSummary {
  return { id: user.id, name: user.name, initials: initialsOf(user.name), headline: headline ?? "" };
}

/** Interviews (either mode) `userId` and each of `otherIds` both took part in. */
async function sharedInterviewCounts(userId: string, otherIds: string[]): Promise<Map<string, number>> {
  if (otherIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ userId: string; shared: bigint }[]>`
    SELECT p2."userId" AS "userId", COUNT(DISTINCT p1."interviewId")::bigint AS shared
    FROM "participant" p1
    JOIN "participant" p2 ON p2."interviewId" = p1."interviewId" AND p2."userId" != p1."userId"
    WHERE p1."userId" = ${userId} AND p2."userId" = ANY(${otherIds})
    GROUP BY p2."userId"
  `;
  return new Map(rows.map((r) => [r.userId, Number(r.shared)]));
}

export async function getFriendsView(userId: string): Promise<FriendsResponse> {
  const friendships = await db.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { include: { profile: true } },
      addressee: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const accepted = friendships.filter((f) => f.status === "ACCEPTED");
  const otherOf = (f: (typeof friendships)[number]) => (f.requesterId === userId ? f.addressee : f.requester);
  const sharedCounts = await sharedInterviewCounts(userId, accepted.map((f) => otherOf(f).id));

  return {
    friends: accepted.map((f) => {
      const other = otherOf(f);
      return {
        ...toPerson(other, other.profile?.headline ?? null),
        friendshipId: f.id,
        sharedInterviews: sharedCounts.get(other.id) ?? 0,
      };
    }),
    incoming: friendships
      .filter((f) => f.status === "PENDING" && f.addresseeId === userId)
      .map((f) => ({ ...toPerson(f.requester, f.requester.profile?.headline ?? null), requestId: f.id, sentAt: f.createdAt.toISOString() })),
    outgoing: friendships
      .filter((f) => f.status === "PENDING" && f.requesterId === userId)
      .map((f) => ({ ...toPerson(f.addressee, f.addressee.profile?.headline ?? null), requestId: f.id, sentAt: f.createdAt.toISOString() })),
  };
}

/** Discoverable people matching `query` by name, excluding the caller. */
export async function searchPeople(userId: string, query: string): Promise<PersonSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [users, friendships] = await Promise.all([
    db.user.findMany({
      where: {
        id: { not: userId },
        name: { contains: q, mode: "insensitive" },
        profile: { discoverable: true },
      },
      include: { profile: true },
      take: 20,
    }),
    db.friendship.findMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
  ]);

  const statusFor = (otherId: string): PersonSearchResult["status"] => {
    const f = friendships.find((x) => x.requesterId === otherId || x.addresseeId === otherId);
    if (!f) return "none";
    if (f.status === "ACCEPTED") return "friends";
    if (f.status === "PENDING") return f.requesterId === userId ? "outgoing" : "incoming";
    return "none";
  };

  return users.map((u) => ({ ...toPerson(u, u.profile?.headline ?? null), status: statusFor(u.id) }));
}
