import { after } from "next/server";
import { HttpError, handleRoute } from "@/lib/api";
import { ConfirmResumeInput, ParsedResume, ResumeEditInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/profile";
import { embedResume, getActiveResumeView, processResume } from "@/lib/resume";
import { requireUser } from "@/lib/session";

// GET /api/resume: the active resume (ResumeView), or null if none was uploaded.
// Poll it while parseStatus is PENDING or PROCESSING.
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return getActiveResumeView(user.id);
  });
}

// POST /api/resume { resumeId }: the PDF finished uploading. Makes it the active resume
// and parses it in the background.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { resumeId } = ConfirmResumeInput.parse(await request.json());

    const resume = await db.resume.findFirst({ where: { id: resumeId, userId: user.id } });
    if (!resume) throw new HttpError(404, "Resume not found");

    await getOrCreateProfile(user.id);
    await db.$transaction([
      db.resume.update({ where: { id: resumeId }, data: { parseStatus: "PENDING" } }),
      db.profile.update({ where: { userId: user.id }, data: { activeResumeId: resumeId } }),
    ]);
    after(() => processResume(resumeId));

    return getActiveResumeView(user.id);
  });
}

// PATCH /api/resume: the user's corrections to the parsed summary, skills and experience.
export function PATCH(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const edits = ResumeEditInput.parse(await request.json());

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    const resume = profile?.activeResumeId
      ? await db.resume.findUnique({ where: { id: profile.activeResumeId } })
      : null;
    if (!resume) throw new HttpError(404, "Upload a resume first");
    if (resume.parseStatus !== "READY") throw new HttpError(409, "Your resume is still being read");

    const parsed: ParsedResume = { ...(resume.parsed as ParsedResume), ...edits };
    await db.resume.update({ where: { id: resume.id }, data: { parsed } });
    after(() => embedResume(resume.id, parsed));

    return getActiveResumeView(user.id);
  });
}
