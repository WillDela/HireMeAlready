import { handleRoute } from "@/lib/api";
import { UploadUrlInput, type UploadUrlResponse } from "@/lib/contracts";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createUploadUrl, storageKeys } from "@/lib/storage";

const PDF = "application/pdf";

// POST /api/resume/upload-url: reserves a Resume row and returns a presigned PUT for the
// PDF. The browser PUTs with `Content-Type: application/pdf`, then calls POST /api/resume.
export function POST(request: Request) {
  return handleRoute(async (): Promise<UploadUrlResponse> => {
    const user = await requireUser();
    const { fileName, size } = UploadUrlInput.parse(await request.json());

    const id = crypto.randomUUID();
    const storageKey = storageKeys.resume(user.id, id);
    await db.resume.create({ data: { id, userId: user.id, storageKey, fileName, sizeBytes: size } });

    return { uploadUrl: await createUploadUrl(storageKey, PDF), storageKey, resumeId: id };
  });
}
