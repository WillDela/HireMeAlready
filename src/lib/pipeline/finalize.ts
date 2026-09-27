import type { GeneratedQuestion, TranscriptLine } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getConversation } from "@/lib/elevenlabs";
import { analyzeInterview } from "@/lib/gemini";
import { outOf5 } from "@/lib/history";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";

// Owner: Stream C. Runs after an interview ends, via `after()`: POST /api/interviews/:id/end
// for AI mode, the PATCH /api/interviews/:id/peer `left` that ends a peer call. Collects
// the transcript, then runs Gemini's analysis on it. Both modes are transcribed live by
// ElevenLabs: AI mode reads the conversation's transcript back from ElevenLabs; peer mode
// already saved each line as it was said (src/lib/live-transcript.ts).

const CONVERSATION_POLL_MS = 2000;
const CONVERSATION_POLL_ATTEMPTS = 20; // ElevenLabs finishes processing a few seconds after the call ends; ~40s ceiling
// Each side's last sentence is committed and posted a few seconds after the call ends.
const PEER_LAST_LINES_MS = 8000;

function loadInterview(interviewId: string) {
  return db.interview.findUnique({
    where: { id: interviewId },
    include: {
      questions: { orderBy: { order: "asc" } },
      participants: true,
      feedback: true,
    },
  });
}

type InterviewForFinalize = NonNullable<Awaited<ReturnType<typeof loadInterview>>>;

export async function finalizeInterview(interviewId: string): Promise<void> {
  const interview = await loadInterview(interviewId);
  if (!interview) {
    log.warn("pipeline", "interview not found", { interview: interviewId });
    return;
  }
  const started = performance.now();
  const since = () => Math.round(performance.now() - started);
  log.info("pipeline", "finalizing", { interview: interviewId, mode: interview.mode });

  await db.interview.update({ where: { id: interviewId }, data: { transcriptStatus: "PROCESSING" } });
  try {
    let transcript: TranscriptLine[];
    if (interview.mode === "AI") {
      transcript = await finalizeAiTranscript(interview);
      await saveTranscript(interviewId, transcript);
    } else {
      transcript = await finalizePeerTranscript(interview);
    }
    await db.interview.update({ where: { id: interviewId }, data: { transcriptStatus: "READY" } });
    log.info("pipeline", "transcript ready", { interview: interviewId, lines: transcript.length, ms: since() });
    await runAnalysis(interview, transcript);
  } catch (err) {
    log.error("pipeline", "transcript failed", { interview: interviewId, ms: since(), err });
    await db.interview.update({ where: { id: interviewId }, data: { transcriptStatus: "FAILED" } });
  }
}

async function finalizeAiTranscript(interview: InterviewForFinalize): Promise<TranscriptLine[]> {
  if (!interview.elevenConversation) {
    throw new Error(`Interview ${interview.id} has no ElevenLabs conversation to finalize`);
  }
  let conversation = await getConversation(interview.elevenConversation);
  for (let attempt = 0; conversation.status !== "done" && conversation.status !== "failed" && attempt < CONVERSATION_POLL_ATTEMPTS; attempt++) {
    await sleep(CONVERSATION_POLL_MS);
    conversation = await getConversation(interview.elevenConversation);
  }
  log.info("pipeline", "ElevenLabs conversation fetched", {
    interview: interview.id,
    conversation: interview.elevenConversation,
    status: conversation.status,
    turns: conversation.transcript.length,
  });
  const lines = conversation.transcript
    .filter((turn): turn is typeof turn & { message: string } => Boolean(turn.message))
    .map(
      (turn): TranscriptLine => ({
        speaker: turn.role === "agent" ? "AI" : "INTERVIEWEE",
        startMs: Math.round(turn.time_in_call_secs * 1000),
        text: turn.message,
      }),
    );
  if (lines.length === 0) {
    throw new Error(`ElevenLabs conversation ${interview.elevenConversation} has no transcript (status: ${conversation.status})`);
  }
  return lines;
}

/** The lines both sides saved during the call, once the last ones are in. Already stored. */
async function finalizePeerTranscript(interview: InterviewForFinalize): Promise<TranscriptLine[]> {
  await sleep(PEER_LAST_LINES_MS);
  const segments = await db.transcriptSegment.findMany({
    where: { interviewId: interview.id },
    orderBy: { startMs: "asc" },
  });
  if (segments.length === 0) {
    throw new Error(`Interview ${interview.id} has no live transcript (did Scribe connect on either side?)`);
  }
  return segments.map(
    (s): TranscriptLine => ({
      speaker: s.speaker,
      userId: s.userId ?? undefined,
      startMs: s.startMs,
      endMs: s.endMs ?? undefined,
      text: s.text,
    }),
  );
}

async function saveTranscript(interviewId: string, transcript: TranscriptLine[]) {
  if (transcript.length === 0) return;
  await db.$transaction([
    db.transcriptSegment.deleteMany({ where: { interviewId } }),
    db.transcriptSegment.createMany({
      data: transcript.map((line) => ({
        interviewId,
        speaker: line.speaker,
        userId: line.userId,
        startMs: line.startMs,
        endMs: line.endMs,
        text: line.text,
      })),
    }),
  ]);
}

async function runAnalysis(interview: InterviewForFinalize, transcript: TranscriptLine[]) {
  const interviewee = interview.participants.find((p) => p.role === "INTERVIEWEE");
  if (!interviewee) {
    log.warn("pipeline", "no interviewee, skipping analysis", { interview: interview.id });
    return;
  }

  // Nothing the candidate said means nothing to score. Fail visibly rather than have
  // Gemini invent an assessment of an empty interview.
  if (!transcript.some((line) => line.speaker === "INTERVIEWEE")) {
    const error = "No answers were captured, so there's nothing to analyze.";
    log.warn("pipeline", "analysis skipped: no answers in transcript", { interview: interview.id });
    await db.analysis.upsert({
      where: { interviewId: interview.id },
      create: { interviewId: interview.id, subjectUserId: interviewee.userId, status: "FAILED", error },
      update: { status: "FAILED", result: undefined, error },
    });
    return;
  }

  await db.analysis.upsert({
    where: { interviewId: interview.id },
    create: { interviewId: interview.id, subjectUserId: interviewee.userId, status: "PROCESSING" },
    update: { status: "PROCESSING", error: null },
  });
  try {
    const humanFeedback = interview.feedback.map((f) => f.comments).filter(Boolean).join("\n") || undefined;
    const result = await analyzeInterview({
      transcript,
      questions: interview.questions.map(
        (q): GeneratedQuestion => ({
          text: q.text,
          category: q.category as GeneratedQuestion["category"],
          rationale: q.rationale ?? undefined,
          sourceUrl: q.sourceUrl ?? undefined,
        }),
      ),
      jobTitle: interview.jobTitle ?? "the role",
      feedback: humanFeedback,
    });
    await db.analysis.update({
      where: { interviewId: interview.id },
      data: { status: "READY", result, model: process.env.GEMINI_MODEL || null, error: null },
    });
    log.info("pipeline", "analysis ready", { interview: interview.id, score: result.overallScore });
    await notify(interviewee.userId, {
      kind: "RESULTS_READY",
      title: "Your results are filed",
      body: `${interview.company || interview.jobTitle || "Your interview"} · scored ${outOf5(result.overallScore)} of 5.`,
      href: `/history/${interview.id}`,
    });
  } catch (err) {
    log.error("pipeline", "analysis failed", { interview: interview.id, err });
    await db.analysis.update({
      where: { interviewId: interview.id },
      data: { status: "FAILED", error: String(err) },
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
