import { handleRoute, HttpError } from "@/lib/api";
import { SendFriendRequestInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getFriendsView } from "@/lib/friends";
import { notify } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

// GET /api/friends: your friends, plus incoming and outgoing pending requests.
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return getFriendsView(user.id);
  });
}

// POST /api/friends { userId }: send a friend request. If that person already sent
// you one, this accepts theirs instead of creating a duplicate.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { userId: targetId } = SendFriendRequestInput.parse(await request.json());
    if (targetId === user.id) throw new HttpError(400, "You can't friend yourself");

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, "Person not found");

    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: targetId },
          { requesterId: targetId, addresseeId: user.id },
        ],
      },
    });

    if (existing?.status === "ACCEPTED") throw new HttpError(409, "You're already friends");
    if (existing && existing.requesterId === targetId && existing.status === "PENDING") {
      // They already requested you — accept theirs instead of sending a second one.
      await db.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
      await notify(targetId, {
        kind: "FRIEND_ACCEPTED",
        title: `${user.name} accepted your friend request`,
        body: `${user.name} is on your friends list now.`,
        href: "/friends",
      });
    } else if (existing?.status === "PENDING") {
      // Our own request is still pending; sending again changes nothing.
    } else {
      if (existing) {
        // Our own earlier request, declined since: send it again.
        await db.friendship.update({ where: { id: existing.id }, data: { status: "PENDING" } });
      } else {
        await db.friendship.create({ data: { requesterId: user.id, addresseeId: targetId, status: "PENDING" } });
      }
      await notify(targetId, {
        kind: "FRIEND_REQUEST",
        title: `${user.name} sent you a friend request`,
        body: "Accept it to practice together.",
        href: "/friends?tab=requests",
      });
    }

    return getFriendsView(user.id);
  });
}
