import { handleRoute, HttpError } from "@/lib/api";
import { RespondFriendRequestInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getFriendsView } from "@/lib/friends";
import { notify } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/friends/:id { status }: accept or decline an incoming request. Only the
// addressee can respond.
export function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const { status } = RespondFriendRequestInput.parse(await request.json());

    const friendship = await db.friendship.findUnique({ where: { id } });
    if (!friendship || friendship.addresseeId !== user.id) throw new HttpError(404, "Request not found");
    if (friendship.status !== "PENDING") throw new HttpError(409, "That request was already handled");

    if (status === "DECLINED") {
      await db.friendship.delete({ where: { id } });
    } else {
      await db.friendship.update({ where: { id }, data: { status: "ACCEPTED" } });
      await notify(friendship.requesterId, {
        kind: "FRIEND_ACCEPTED",
        title: `${user.name} accepted your friend request`,
        body: `${user.name} is on your friends list now.`,
        href: "/friends",
      });
    }
    return getFriendsView(user.id);
  });
}

// DELETE /api/friends/:id: cancel an outgoing request, or remove an existing friend.
// Either side of the friendship can do this.
export function DELETE(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;

    const friendship = await db.friendship.findUnique({ where: { id } });
    if (!friendship || (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)) {
      throw new HttpError(404, "Not found");
    }
    await db.friendship.delete({ where: { id } });
    return getFriendsView(user.id);
  });
}
