import { handleRoute } from "@/lib/api";
import { SendInviteInput } from "@/lib/contracts";
import { listInvitations, sendInvite } from "@/lib/invitations";
import { requireUser } from "@/lib/session";

// GET /api/invitations: your open interview invites, sent and received.
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return listInvitations(user.id);
  });
}

// POST /api/invitations { userId, role, jobTitle?, company? }: invite a friend into a
// peer interview, with you playing `role`. Returns InvitationsResponse.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    return sendInvite(user, SendInviteInput.parse(await request.json()));
  });
}
