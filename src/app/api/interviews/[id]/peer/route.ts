import { after } from "next/server";
import { handleRoute } from "@/lib/api";
import { PeerEventInput } from "@/lib/contracts";
import { getPeerSession, recordPeerEvent } from "@/lib/peer";
import { finalizeInterview } from "@/lib/pipeline/finalize";
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
// The `left` that ends the interview then, in the background, transcribes the call's
// recording and runs the analysis (src/lib/pipeline/finalize.ts), like /end for AI mode.
export function PATCH(request: Request, ctx: RouteContext<"/api/interviews/[id]/peer">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { status, completedNow } = await recordPeerEvent(id, user.id, PeerEventInput.parse(await request.json()));
    if (completedNow) after(() => finalizeInterview(id));
    return { status };
  });
}
