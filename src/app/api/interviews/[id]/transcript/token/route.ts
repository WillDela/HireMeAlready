import { handleRoute } from "@/lib/api";
import type { TranscriptTokenResponse } from "@/lib/contracts";
import { createTranscriptToken } from "@/lib/live-transcript";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/transcript/token: a single-use ElevenLabs Scribe token for
// transcribing your side of an ACTIVE peer call (src/lib/live-transcript.ts).
export function POST(_request: Request, ctx: RouteContext<"/api/interviews/[id]/transcript/token">) {
  return handleRoute(async (): Promise<TranscriptTokenResponse> => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return createTranscriptToken(id, user.id);
  });
}
