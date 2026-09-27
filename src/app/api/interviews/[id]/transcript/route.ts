import { handleRoute } from "@/lib/api";
import { TranscriptLineInput } from "@/lib/contracts";
import { addTranscriptLine } from "@/lib/live-transcript";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/transcript { text, startedAgoMs, durationMs }: one line of
// your side of a peer call, as Scribe transcribed it live (src/lib/live-transcript.ts).
export function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/transcript">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return addTranscriptLine(id, user.id, TranscriptLineInput.parse(await request.json()));
  });
}
