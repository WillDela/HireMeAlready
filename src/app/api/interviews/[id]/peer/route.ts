import { handleRoute } from "@/lib/api";
import { PeerEventInput } from "@/lib/contracts";
import { getPeerSession, recordPeerEvent } from "@/lib/peer";
import { requireUser } from "@/lib/session";

// GET /api/interviews/:id/peer: the PeerSession for a participant of a peer interview; 404 otherwise.
export function GET(_request: Request, ctx: RouteContext<"/api/interviews/[id]/peer">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return getPeerSession(id, user.id);
  });
}

// PATCH /api/interviews/:id/peer { event: "connected" | "left" }: returns { status }.
export function PATCH(request: Request, ctx: RouteContext<"/api/interviews/[id]/peer">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return recordPeerEvent(id, user.id, PeerEventInput.parse(await request.json()));
  });
}
