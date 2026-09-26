import { after } from "next/server";
import { handleRoute } from "@/lib/api";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/interviews";
import { finalizeInterview } from "@/lib/pipeline/finalize";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/end: marks the interview COMPLETED. For AI mode it then, in
// the background, pulls the ElevenLabs transcript and runs the analysis
// (src/lib/pipeline/finalize.ts). Peer mode finalizes once the recordings are uploaded
// (POST /api/interviews/:id/recordings, per docs/PLAN.md), not here, since at this point
// there's nothing to transcribe yet. Safe to call more than once: only the first call
// finalizes.
export function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const { interview } = await requireParticipant(id, user.id);

    // Conditional update so two racing calls (both sides of a peer call, or a retry)
    // can't both start a finalize.
    const { count } = await db.interview.updateMany({
      where: { id, status: { in: ["PENDING", "ACTIVE"] } },
      data: { status: "COMPLETED", endedAt: new Date() },
    });
    if (count > 0 && interview.mode === "AI") after(() => finalizeInterview(id));
    return { ok: true };
  });
}
