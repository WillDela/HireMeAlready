import { handleRoute } from "@/lib/api";
import { QuestionSetInput, type QuestionSetResponse } from "@/lib/contracts";
import { generateQuestions } from "@/lib/gemini";
import { getActiveParsedResume } from "@/lib/resume";
import { requireUser } from "@/lib/session";

const QUESTION_COUNT = 7;

// POST /api/ai/questions { company, jobTitle, jobDescription? }: questions for AI practice.
// Scrapes the web for questions candidates report from this company and keeps the ones
// that check out; the rest are written from the role, job description and the user's resume.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const input = QuestionSetInput.parse(await request.json());
    const questions = await generateQuestions({
      ...input,
      jobDescription: input.jobDescription || undefined,
      resume: await getActiveParsedResume(user.id),
      grounded: true,
      count: QUESTION_COUNT,
    });
    return { questions } satisfies QuestionSetResponse;
  });
}
