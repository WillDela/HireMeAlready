// Re-runs the post-interview pipeline (transcript + analysis) for one interview, e.g. after
// a Gemini quota error left it FAILED. Writes to the database the app uses.
// Usage: npx tsx scripts/refinalize.mts <interviewId>
import "dotenv/config";
import { db } from "@/lib/db";
import { finalizeInterview } from "@/lib/pipeline/finalize";

const id = process.argv[2];
if (!id) {
  console.error("Usage: npx tsx scripts/refinalize.mts <interviewId>");
  process.exit(1);
}

await finalizeInterview(id);
const interview = await db.interview.findUnique({
  where: { id },
  include: { analysis: true, _count: { select: { segments: true } } },
});
if (!interview) {
  console.error(`No interview ${id}`);
} else {
  console.log(`transcript: ${interview.transcriptStatus} (${interview._count.segments} lines)`);
  console.log(`analysis: ${interview.analysis?.status ?? "none"}`);
  if (interview.analysis?.error) console.log(`analysis error: ${interview.analysis.error}`);
}
await db.$disconnect();
