import { ParsedResume, RESUME_MAX_BYTES } from "@/lib/contracts";
import { db } from "@/lib/db";
import { embedText, parseResume } from "@/lib/gemini";
import { createDownloadUrl, getObjectBuffer } from "@/lib/storage";
import { setResumeEmbedding } from "@/lib/vector";
import { toResumeView } from "@/lib/views";

/** The user's active resume (Profile.activeResumeId) as a screen view, or null. */
export async function getActiveResumeView(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.activeResumeId) return null;
  const resume = await db.resume.findUnique({ where: { id: profile.activeResumeId } });
  if (!resume) return null;
  return toResumeView(resume, await createDownloadUrl(resume.storageKey));
}

/** The user's active resume, parsed, or undefined if there's none or it isn't READY yet. */
export async function getActiveParsedResume(userId: string): Promise<ParsedResume | undefined> {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.activeResumeId) return undefined;
  const resume = await db.resume.findUnique({ where: { id: profile.activeResumeId } });
  if (resume?.parseStatus !== "READY" || !resume.parsed) return undefined;
  return ParsedResume.parse(resume.parsed);
}

/**
 * Background job (run through `after()`): PDF → Gemini parse → READY, then the
 * embedding used for matching. Parse errors mark the resume FAILED; an embedding
 * error only gets logged, since the parsed resume is still usable without it.
 */
export async function processResume(resumeId: string) {
  let parsed: ParsedResume;
  try {
    const resume = await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "PROCESSING" } });
    const pdf = await getObjectBuffer(resume.storageKey);
    // The presigned PUT can't enforce the declared size or type, so check what arrived.
    if (pdf.length > RESUME_MAX_BYTES) throw new Error(`Resume too large: ${pdf.length} bytes`);
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Not a PDF");
    parsed = ParsedResume.parse(await parseResume(pdf));
    await db.resume.update({ where: { id: resumeId }, data: { parsed, parseStatus: "READY" } });
  } catch (err) {
    console.error(`Resume ${resumeId} failed to parse`, err);
    await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "FAILED" } });
    return;
  }
  await embedResume(resumeId, parsed);
}

export async function embedResume(resumeId: string, parsed: ParsedResume) {
  try {
    const text = [parsed.summary, parsed.skills.join(", "), ...parsed.experience.map((e) => `${e.title} at ${e.company}`)]
      .filter(Boolean)
      .join("\n");
    await setResumeEmbedding(resumeId, await embedText(text));
  } catch (err) {
    console.error(`Resume ${resumeId} failed to embed`, err);
  }
}
