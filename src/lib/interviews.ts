import { HttpError } from "@/lib/api";
import {
  AnalysisResult,
  ParsedResume,
  type GeneratedQuestion,
  type InterviewDetail,
  type InterviewListItem,
  type QuestionCategory,
  type QuestionSource,
} from "@/lib/contracts";
import { db } from "@/lib/db";

/** The interview, if `userId` took part in it; 404 otherwise (so ids can't be probed). */
export async function requireParticipant(interviewId: string, userId: string) {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { participants: true },
  });
  const me = interview?.participants.find((p) => p.userId === userId);
  if (!interview || !me) throw new HttpError(404, "Interview not found");
  return { interview, me };
}

/** Analysis.result as an AnalysisResult, or null if it's missing or doesn't match. */
function parseAnalysis(result: unknown): AnalysisResult | null {
  const parsed = AnalysisResult.safeParse(result);
  return parsed.success ? parsed.data : null;
}

export async function listInterviews(userId: string): Promise<InterviewListItem[]> {
  const interviews = await db.interview.findMany({
    // Interviews that never started (e.g. the lobby was left) aren't history.
    where: { participants: { some: { userId } }, status: { not: "PENDING" } },
    include: { participants: { include: { user: true } }, analysis: true },
    orderBy: { createdAt: "desc" },
  });
  return interviews.map((iv) => {
    const me = iv.participants.find((p) => p.userId === userId)!;
    const partner = iv.participants.find((p) => p.userId !== userId);
    // Scores are about the interviewee, so an interviewer's own list shows none.
    const scored = me.role === "INTERVIEWEE" && iv.analysis?.status === "READY";
    return {
      id: iv.id,
      mode: iv.mode,
      status: iv.status,
      jobTitle: iv.jobTitle,
      company: iv.company,
      createdAt: iv.createdAt.toISOString(),
      startedAt: iv.startedAt?.toISOString() ?? null,
      endedAt: iv.endedAt?.toISOString() ?? null,
      myRole: me.role,
      partnerName: partner?.user.name ?? null,
      overallScore: scored ? (parseAnalysis(iv.analysis?.result)?.overallScore ?? null) : null,
    };
  });
}

export async function getInterviewDetail(interviewId: string, userId: string): Promise<InterviewDetail> {
  const iv = await db.interview.findUnique({
    where: { id: interviewId },
    include: {
      participants: { include: { user: { include: { profile: true } } } },
      questions: { orderBy: { order: "asc" } },
      segments: { orderBy: { startMs: "asc" } },
      analysis: true,
      feedback: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  const me = iv?.participants.find((p) => p.userId === userId);
  if (!iv || !me) throw new HttpError(404, "Interview not found");
  const partner = iv.participants.find((p) => p.userId !== userId);

  let partnerResume: InterviewDetail["partnerResume"] = null;
  const partnerProfile = partner?.user.profile;
  if (iv.mode === "PEER" && partnerProfile?.shareResume && partnerProfile.activeResumeId) {
    const resume = await db.resume.findUnique({ where: { id: partnerProfile.activeResumeId } });
    const parsed = resume?.parseStatus === "READY" ? ParsedResume.safeParse(resume.parsed) : null;
    if (parsed?.success) partnerResume = { summary: parsed.data.summary, skills: parsed.data.skills };
  }

  return {
    id: iv.id,
    mode: iv.mode,
    status: iv.status,
    jobTitle: iv.jobTitle,
    company: iv.company,
    createdAt: iv.createdAt.toISOString(),
    startedAt: iv.startedAt?.toISOString() ?? null,
    endedAt: iv.endedAt?.toISOString() ?? null,
    participants: iv.participants.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      role: p.role,
      contact: p.user.profile?.shareContact
        ? { email: p.user.email, linkedinUrl: p.user.profile.linkedinUrl ?? undefined }
        : undefined,
    })),
    questions: iv.questions.map(
      (q): GeneratedQuestion => ({
        text: q.text,
        category: q.category as QuestionCategory,
        source: q.source as QuestionSource,
        rationale: q.rationale ?? undefined,
        sourceUrl: q.sourceUrl ?? undefined,
      }),
    ),
    transcript: iv.segments.map((s) => ({
      speaker: s.speaker,
      userId: s.userId ?? undefined,
      startMs: s.startMs,
      endMs: s.endMs ?? undefined,
      text: s.text,
    })),
    transcriptStatus: iv.transcriptStatus,
    analysis: iv.analysis ? { status: iv.analysis.status, result: parseAnalysis(iv.analysis.result) } : null,
    feedback: iv.feedback.map((f) => ({
      communication: f.communication,
      technical: f.technical,
      confidence: f.confidence,
      comments: f.comments,
      authorName: f.author.name,
      createdAt: f.createdAt.toISOString(),
    })),
    myPeerId: iv.mode === "PEER" ? me.peerId : null,
    partnerPeerId: iv.mode === "PEER" ? (partner?.peerId ?? null) : null,
    partnerResume,
  };
}
