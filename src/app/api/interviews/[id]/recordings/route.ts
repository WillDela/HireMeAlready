import { handleRoute } from "@/lib/api";
import { ConfirmRecordingInput } from "@/lib/contracts";
import { confirmRecording } from "@/lib/recordings";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/recordings { recordingId }: your recording of a peer call
// finished uploading. The finalize pipeline, started when the call ended, picks it up.
export function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/recordings">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { recordingId } = ConfirmRecordingInput.parse(await request.json());
    return confirmRecording(id, user.id, recordingId);
  });
}
