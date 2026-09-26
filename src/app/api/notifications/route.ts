import { handleRoute } from "@/lib/api";
import { MarkNotificationsReadInput } from "@/lib/contracts";
import { listNotifications, markRead } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

// GET /api/notifications: your latest 30, newest first (the top bar's bell).
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return listNotifications(user.id);
  });
}

// PATCH /api/notifications { id? }: mark one read, or all when `id` is omitted. Returns the list.
export function PATCH(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = MarkNotificationsReadInput.parse(await request.json());
    await markRead(user.id, id);
    return listNotifications(user.id);
  });
}
