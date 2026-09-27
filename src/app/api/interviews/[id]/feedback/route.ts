import { handleRoute } from "@/lib/api";
import { FeedbackInput } from "@/lib/contracts";
import { getPeerWrapUp, submitPeerFeedback } from "@/lib/peer";
import { requireUser } from "@/lib/session";

// GET /api/interviews/:id/feedback: the PeerWrapUp for a participant of a peer interview.
export function GET(_request: Request, ctx: RouteContext<"/api/interviews/[id]/feedback">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return getPeerWrapUp(id, user.id);
  });
}

// POST /api/interviews/:id/feedback FeedbackInput: the interviewer's ratings; returns the PeerWrapUp.
export function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/feedback">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return submitPeerFeedback(id, user.id, FeedbackInput.parse(await request.json()));
  });
}
