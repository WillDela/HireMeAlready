import { after } from "next/server";
import { handleRoute } from "@/lib/api";
import { ConfirmRecordingInput } from "@/lib/contracts";
import { confirmRecording, finalizeWhenRecorded } from "@/lib/recordings";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/recordings { recordingId }: your recording finished uploading.
// In the background, once the other side's is in too (or after a minute), the peer
// interview is transcribed and analyzed (src/lib/pipeline/finalize.ts).
export function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/recordings">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { recordingId } = ConfirmRecordingInput.parse(await request.json());
    await confirmRecording(id, user.id, recordingId);
    after(() => finalizeWhenRecorded(id));
    return { ok: true };
  });
}
