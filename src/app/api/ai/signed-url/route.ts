import { z } from "zod";
import { HttpError, handleRoute } from "@/lib/api";
import type { AiSessionResponse, ParsedResume } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/elevenlabs";
import type { InterviewVariables } from "@/lib/elevenlabs/interviewer-agent";
import { requireUser } from "@/lib/session";

const Input = z.object({ interviewId: z.string().min(1) });

// POST /api/ai/signed-url { interviewId }: a short-lived ElevenLabs signed URL plus the
// dynamic variables for that interview's questions and candidate. The client uses this
// to start the voice session (@elevenlabs/react's useConversation().startSession(...)).
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { interviewId } = Input.parse(await request.json());

    const interview = await db.interview.findUnique({
      where: { id: interviewId },
      include: { questions: { orderBy: { order: "asc" } }, participants: true },
    });
    if (!interview || interview.mode !== "AI") throw new HttpError(404, "Interview not found");
    if (!interview.participants.some((p) => p.userId === user.id)) throw new HttpError(403, "Not your interview");

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    const resume = profile?.activeResumeId
      ? await db.resume.findUnique({ where: { id: profile.activeResumeId } })
      : null;
    const parsedResume = resume?.parseStatus === "READY" ? (resume.parsed as ParsedResume | null) : null;

    const dynamicVariables: InterviewVariables = {
      candidate_name: user.name.trim().split(/\s+/)[0] || user.name,
      job_title: interview.jobTitle || "the role",
      company: interview.company || "the company",
      resume_summary: parsedResume?.summary || "No resume provided.",
      questions: interview.questions.length
        ? interview.questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n")
        : "1. Tell me about yourself.",
    };

    const body: AiSessionResponse = { signedUrl: await getSignedUrl(), dynamicVariables };
    return body;
  });
}
