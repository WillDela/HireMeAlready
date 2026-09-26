import { HttpError } from "@/lib/api";
import { AnalysisResult } from "@/lib/contracts";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Dimension, TranscriptTurn } from "@/lib/mock";
import { type HistoryDetail, type HistoryItem, formatDate, initialsFor } from "@/lib/views";

// Past interviews for /history, /history/[id] and the dashboard's last-interview card.
// Read-only: interviews are created and finished elsewhere (the queue, AI practice, and
// the finalize pipeline that writes transcripts and analyses).

const interviewInclude = {
  participants: { include: { user: { include: { profile: true } } } },
  analysis: true,
} satisfies Prisma.InterviewInclude;
type InterviewRow = Prisma.InterviewGetPayload<{ include: typeof interviewInclude }>;

const AI_NAME = "AI interviewer";

// What each AnalysisResult score measures, shown under its score card.
const DIMENSIONS: { key: keyof AnalysisResult["scores"]; name: string; rationale: string }[] = [
  { key: "communication", name: "Communication", rationale: "How clearly and concisely you got each answer across." },
  { key: "structure", name: "Structure", rationale: "Whether answers had a clear setup, what you did, and the result." },
  { key: "technicalDepth", name: "Technical depth", rationale: "How far you went into the how and the why." },
  { key: "relevance", name: "Relevance", rationale: "How closely your answers fit the question and the role." },
];

/** GET /api/interviews: your completed interviews, newest first. */
export async function listInterviews(userId: string): Promise<HistoryItem[]> {
  const interviews = await db.interview.findMany({
    where: { status: "COMPLETED", participants: { some: { userId } } },
    include: interviewInclude,
  });
  return interviews
    .sort((a, b) => when(b).getTime() - when(a).getTime())
    .map((iv) => {
      const analysis = myAnalysis(iv, userId);
      return { ...toSummary(iv, userId, analysis), workOnNext: analysis?.improvements[0] ?? null };
    });
}

/** GET /api/interviews/:id, for participants only. */
export async function getInterviewDetail(interviewId: string, userId: string): Promise<HistoryDetail> {
  const iv = await db.interview.findFirst({
    where: { id: interviewId, participants: { some: { userId } } },
    include: {
      ...interviewInclude,
      segments: { orderBy: { startMs: "asc" } },
      feedback: { where: { subjectId: userId }, include: { author: true }, take: 1 },
    },
  });
  if (!iv) throw new HttpError(404, "Interview not found");

  const me = iv.participants.find((p) => p.userId === userId)!;
  const analysis = myAnalysis(iv, userId);
  const summary = toSummary(iv, userId, analysis);

  const transcript: TranscriptTurn[] = iv.segments.map((s) => {
    const speaker =
      s.speaker === "AI"
        ? null
        : (iv.participants.find((p) => p.userId === s.userId) ?? iv.participants.find((p) => p.role === s.speaker));
    return {
      id: s.id,
      speaker: speaker ? speaker.user.name : AI_NAME,
      isYou: speaker?.userId === userId,
      time: clock(s.startMs),
      text: s.text,
    };
  });

  const others = iv.participants.filter((p) => p.userId !== userId);
  const friendships = others.length
    ? await db.friendship.findMany({
        where: {
          OR: others.flatMap((p) => [
            { requesterId: userId, addresseeId: p.userId },
            { requesterId: p.userId, addresseeId: userId },
          ]),
        },
      })
    : [];

  const feedback = iv.feedback[0];
  return {
    ...summary,
    summary:
      analysis?.summary ??
      (me.role === "INTERVIEWER"
        ? `You interviewed ${summary.partner} for ${summary.jobTitle} at ${summary.company}.`
        : `A${iv.mode === "AI" ? "n AI" : " live"} practice interview for ${summary.jobTitle} at ${summary.company}.`),
    keyMoments: analysis ? keyMoments(analysis, iv.segments) : [],
    transcript,
    analysis: analysis
      ? {
          overall: outOf5(analysis.overallScore),
          dimensions: DIMENSIONS.map(
            ({ key, name, rationale }): Dimension => ({ name, rationale, score: outOf5(analysis.scores[key]) }),
          ),
          strengths: analysis.strengths,
          // AnalysisResult has no separate tip per improvement; the page hides an empty one.
          improvements: analysis.improvements.map((point) => ({ point, tryThis: "" })),
        }
      : null,
    feedback: feedback
      ? {
          from: feedback.author.name,
          ratings: {
            communication: feedback.communication,
            technical: feedback.technical,
            confidence: feedback.confidence,
          },
          comments: feedback.comments,
        }
      : null,
    people:
      iv.mode === "PEER"
        ? others.map((p) => {
            const friendship = friendships.find((f) => f.requesterId === p.userId || f.addresseeId === p.userId);
            return {
              id: p.userId,
              name: p.user.name,
              initials: initialsFor(p.user.name, p.user.email),
              headline: p.user.profile?.headline ?? "",
              // Profile.shareContact gates the email; "" hides it.
              contact: p.user.profile?.shareContact === false ? "" : p.user.email,
              isFriend: friendship?.status === "ACCEPTED",
              requested: friendship?.status === "PENDING" && friendship.requesterId === userId,
            };
          })
        : [],
    analysisStatus:
      me.role === "INTERVIEWER"
        ? "interviewer"
        : analysis
          ? "ready"
          : iv.analysis?.status === "FAILED" || (!iv.analysis && iv.transcriptStatus === "FAILED")
            ? "failed"
            : "pending",
    transcriptStatus: iv.segments.length ? "ready" : iv.transcriptStatus === "FAILED" ? "failed" : "pending",
  };
}

function when(iv: InterviewRow) {
  return iv.startedAt ?? iv.createdAt;
}

/** The analysis of your answers: only interviewees are analyzed, and only once it's READY. */
function myAnalysis(iv: InterviewRow, userId: string): AnalysisResult | null {
  const a = iv.analysis;
  if (!a || a.status !== "READY" || a.subjectUserId !== userId) return null;
  const parsed = AnalysisResult.safeParse(a.result);
  return parsed.success ? parsed.data : null;
}

function toSummary(iv: InterviewRow, userId: string, analysis: AnalysisResult | null): HistoryItem {
  const me = iv.participants.find((p) => p.userId === userId);
  const partner = iv.participants.find((p) => p.userId !== userId);
  const date = when(iv);
  return {
    id: iv.id,
    date: date.toISOString().slice(0, 10),
    dateLabel: formatDate(date),
    type: iv.mode === "AI" ? "ai" : "human",
    company: iv.company || "Practice interview",
    jobTitle: iv.jobTitle || "General practice",
    partner: iv.mode === "AI" ? AI_NAME : (partner?.user.name ?? "Your partner"),
    yourRole: me?.role === "INTERVIEWER" ? "interviewer" : "interviewee",
    score: analysis ? outOf5(analysis.overallScore) : null,
    duration: iv.startedAt && iv.endedAt ? clock(iv.endedAt.getTime() - iv.startedAt.getTime()) : "—",
    workOnNext: null,
  };
}

/** AnalysisResult scores are 0-100; the UI shows them out of 5. */
function outOf5(score: number) {
  return Math.round(score / 2) / 10;
}

function clock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Each question's feedback, pinned to when it was asked (if we can find it in the transcript). */
function keyMoments(analysis: AnalysisResult, segments: { speaker: string; startMs: number; text: string }[]) {
  const moments: { time: string; text: string }[] = [];
  for (const q of analysis.perQuestion) {
    const needle = normalize(q.question).slice(0, 40);
    const asked = segments.find((s) => s.speaker !== "INTERVIEWEE" && normalize(s.text).includes(needle));
    const time = asked ? clock(asked.startMs) : null;
    if (time && !moments.some((m) => m.time === time)) moments.push({ time, text: q.feedback });
  }
  return moments;
}
