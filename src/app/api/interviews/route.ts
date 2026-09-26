import { handleRoute, HttpError } from "@/lib/api";
import { CreateInterviewInput, peerIdFor, type CreateInterviewResponse } from "@/lib/contracts";
import { db } from "@/lib/db";
import { generateQuestions } from "@/lib/gemini";
import { listInterviews } from "@/lib/interviews";
import { getActiveParsedResume } from "@/lib/resume";
import { requireUser } from "@/lib/session";

const QUESTION_COUNT = 7;

// GET /api/interviews: the caller's interviews (either mode), newest first.
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return listInterviews(user.id);
  });
}

// POST /api/interviews { mode: "AI", jobTitle, company, jobDescription?, questions? }:
// creates an AI practice interview with the caller as interviewee. Uses the questions the
// user previewed on /practice/ai, or generates them if none were sent. Peer interviews
// are created by the queue matcher instead (src/lib/matching.ts).
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const input = CreateInterviewInput.parse(await request.json());
    if (input.mode !== "AI") throw new HttpError(400, "Peer interviews start from the queue");

    const questions =
      input.questions ??
      (await generateQuestions({
        company: input.company,
        jobTitle: input.jobTitle,
        jobDescription: input.jobDescription || undefined,
        resume: await getActiveParsedResume(user.id),
        grounded: input.grounded,
        count: QUESTION_COUNT,
      }));

    const interview = await db.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          mode: "AI",
          status: "PENDING",
          jobTitle: input.jobTitle,
          company: input.company,
          jobDescription: input.jobDescription || null,
        },
      });
      await tx.participant.create({
        data: {
          interviewId: created.id,
          userId: user.id,
          role: "INTERVIEWEE",
          peerId: peerIdFor(created.id, "INTERVIEWEE"),
        },
      });
      await tx.question.createMany({
        data: questions.map((q, order) => ({
          interviewId: created.id,
          order,
          text: q.text,
          category: q.category,
          source: q.source ?? "general",
          rationale: q.rationale ?? null,
          sourceUrl: q.sourceUrl ?? null,
        })),
      });
      return created;
    });

    const body: CreateInterviewResponse = { id: interview.id };
    return body;
  });
}
