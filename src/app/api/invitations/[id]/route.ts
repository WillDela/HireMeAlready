import { after } from "next/server";
import { handleRoute } from "@/lib/api";
import { RespondInviteInput } from "@/lib/contracts";
import { cancelInvite, respondToInvite } from "@/lib/invitations";
import { prepareSuggestedQuestions } from "@/lib/matching";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/invitations/:id { status }: accept or decline an invite sent to you.
// Returns InvitationsResponse plus the interviewId; after an accept, go to its lobby.
export function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const { status } = RespondInviteInput.parse(await request.json());
    const result = await respondToInvite(user, id, status);
    // Suggested questions for the interviewer's side panel, as after a queue match.
    if (status === "ACCEPTED") after(() => prepareSuggestedQuestions(result.interviewId));
    return result;
  });
}

// DELETE /api/invitations/:id: call off an open invite (either side) before the call starts.
export function DELETE(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    return cancelInvite(user.id, id);
  });
}
