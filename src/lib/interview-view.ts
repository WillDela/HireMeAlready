import type { InterviewDetail as ApiInterviewDetail, InterviewListItem } from "@/lib/contracts";
import type { InterviewDetail, InterviewSummary } from "@/lib/mock";

// Maps the interview API's shapes (src/lib/contracts.ts) onto the view shapes the
// History and dashboard components were designed around (src/lib/mock.ts).

/** Analysis scores are 0-100; the UI shows them out of 5. */
const outOfFive = (score: number) => Math.round((score / 20) * 10) / 10;

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function durationOf(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return "—";
  const minutes = Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));
  return `${minutes} min`;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function toSummaryView(item: InterviewListItem): InterviewSummary {
  const date = item.startedAt ?? item.createdAt;
  return {
    id: item.id,
    date: date.slice(0, 10),
    dateLabel: dateLabel(date),
    type: item.mode === "AI" ? "ai" : "human",
    company: item.company ?? "—",
    jobTitle: item.jobTitle ?? "",
    partner: item.partnerName ?? "AI interviewer",
    yourRole: item.myRole === "INTERVIEWER" ? "interviewer" : "interviewee",
    score: item.overallScore === null ? null : outOfFive(item.overallScore),
    duration: durationOf(item.startedAt, item.endedAt),
  };
}

/** `friendIds`: the viewer's friends, for the People tab's "Friends" tag. */
export function toDetailView(d: ApiInterviewDetail, myUserId: string, friendIds: Set<string>): InterviewDetail {
  const me = d.participants.find((p) => p.userId === myUserId);
  const partner = d.participants.find((p) => p.userId !== myUserId);
  const isInterviewee = me?.role !== "INTERVIEWER";
  const result = d.analysis?.status === "READY" ? d.analysis.result : null;
  const date = d.startedAt ?? d.createdAt;

  const speakerName = (line: ApiInterviewDetail["transcript"][number]) => {
    if (line.speaker === "AI") return "AI interviewer";
    const who = d.participants.find((p) => (line.userId ? p.userId === line.userId : p.role === line.speaker));
    return who?.name ?? (line.speaker === "INTERVIEWER" ? "Interviewer" : "Candidate");
  };
  const isMine = (line: ApiInterviewDetail["transcript"][number]) =>
    line.speaker !== "AI" && (line.userId ? line.userId === myUserId : line.speaker === me?.role);

  const pending: InterviewDetail["analysisPending"] =
    !isInterviewee || result
      ? undefined
      : d.analysis?.status === "FAILED" || d.transcriptStatus === "FAILED"
        ? "failed"
        : "processing";

  const feedback = d.feedback[0];

  return {
    ...toSummaryView({
      id: d.id,
      mode: d.mode,
      status: d.status,
      jobTitle: d.jobTitle,
      company: d.company,
      createdAt: d.createdAt,
      startedAt: d.startedAt,
      endedAt: d.endedAt,
      myRole: me?.role ?? "INTERVIEWEE",
      partnerName: partner?.name ?? null,
      overallScore: isInterviewee && result ? result.overallScore : null,
    }),
    date: date.slice(0, 10),
    summary:
      result?.summary ??
      (pending === "processing"
        ? "The analysis of this interview is still being written. Check back in a minute."
        : pending === "failed"
          ? "This interview couldn't be scored."
          : `A ${d.mode === "AI" ? "AI" : "live"} practice interview for ${d.jobTitle ?? "this role"}.`),
    keyMoments: [],
    transcript: d.transcript.map((line, i) => ({
      id: `t${i}`,
      speaker: speakerName(line),
      isYou: isMine(line),
      time: clock(line.startMs),
      text: line.text,
    })),
    analysis:
      isInterviewee && result
        ? {
            overall: outOfFive(result.overallScore),
            dimensions: [
              { name: "Communication", score: outOfFive(result.scores.communication), rationale: "" },
              { name: "Structure", score: outOfFive(result.scores.structure), rationale: "" },
              { name: "Technical depth", score: outOfFive(result.scores.technicalDepth), rationale: "" },
              { name: "Relevance", score: outOfFive(result.scores.relevance), rationale: "" },
            ],
            strengths: result.strengths,
            improvements: result.improvements.map((point) => ({ point })),
            perQuestion: result.perQuestion.map((q) => ({ ...q, score: outOfFive(q.score) })),
          }
        : null,
    analysisPending: pending,
    feedback: feedback
      ? {
          from: feedback.authorName,
          ratings: {
            communication: feedback.communication,
            technical: feedback.technical,
            confidence: feedback.confidence,
          },
          comments: feedback.comments,
        }
      : null,
    people: d.participants
      .filter((p) => p.userId !== myUserId)
      .map((p) => ({
        id: p.userId,
        name: p.name,
        initials: initialsOf(p.name),
        headline: p.role === "INTERVIEWER" ? "Your interviewer" : "Your candidate",
        contact: p.contact?.email ?? "",
        isFriend: friendIds.has(p.userId),
      })),
  };
}
