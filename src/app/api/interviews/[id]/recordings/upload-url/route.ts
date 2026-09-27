import { handleRoute } from "@/lib/api";
import { RecordingUploadInput } from "@/lib/contracts";
import { createRecordingUpload } from "@/lib/recordings";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/recordings/upload-url { mimeType, startedAgoMs }: reserves a
// Recording of a peer call and returns a presigned PUT. The browser PUTs with
// `Content-Type: <mimeType>`, then calls POST /api/interviews/:id/recordings.
export function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/recordings/upload-url">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return createRecordingUpload(id, user.id, RecordingUploadInput.parse(await request.json()));
  });
}
