import type { GeneratedQuestion, TranscriptLine } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getConversation, transcribeChannels, type ScribeWord } from "@/lib/elevenlabs";
import { analyzeInterview } from "@/lib/gemini";
import { outOf5 } from "@/lib/history";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";
import { getObjectBuffer } from "@/lib/storage";

// Owner: Stream C. Runs after an interview ends, via `after()`: POST /api/interviews/:id/end
// for AI mode, the PATCH /api/interviews/:id/peer `left` that ends a peer call. Collects
// the transcript, then runs Gemini's analysis on it. Both modes are transcribed by
// ElevenLabs: AI mode reads the conversation's transcript back from ElevenLabs; peer mode
// sends the call's two-channel recording to ElevenLabs Scribe (src/lib/recordings.ts).

const CONVERSATION_POLL_MS = 2000;
const CONVERSATION_POLL_ATTEMPTS = 20; // ElevenLabs finishes processing a few seconds after the call ends; ~40s ceiling
// Recordings upload right after the call. Take the first one in, after giving the other
// side's a moment (the earliest-started covers the most of the call).
const RECORDING_POLL_MS = 2000;
const SECOND_RECORDING_GRACE_MS = 10_000;
const RECORDING_WAIT_MS = 90_000;
const PEER_PAUSE_SECS = 1.5; // a longer silence starts a new transcript line

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
    const transcript =
      interview.mode === "AI" ? await finalizeAiTranscript(interview) : await finalizePeerTranscript(interview);
    await saveTranscript(interviewId, transcript);
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

/**
 * Both browsers upload a stereo recording of the call (channel 0: the uploader's mic,
 * channel 1: the other person as heard in the call). Waits for one like AI mode waits for
 * ElevenLabs, then transcribes it with Scribe's multichannel mode: both voices come from
 * one file on one clock, so their order and timing need no aligning.
 */
async function finalizePeerTranscript(interview: InterviewForFinalize): Promise<TranscriptLine[]> {
  const recording = await waitForRecording(interview);
  const uploader = interview.participants.find((p) => p.id === recording.participantId);
  const other = interview.participants.find((p) => p.id !== recording.participantId);
  if (!uploader || !other) throw new Error(`Interview ${interview.id} is missing a participant`);

  const audio = await getObjectBuffer(recording.storageKey);
  const words = await transcribeChannels(audio, recording.mimeType, recording.storageKey.split("/").pop()!);
  log.info("pipeline", "recording transcribed", { interview: interview.id, recording: recording.id, words: words.length });

  // Word times count from the start of the recording; place them on the interview's timeline.
  const offsetMs = recording.startedAt.getTime() - (interview.startedAt ?? interview.createdAt).getTime();
  const lastMs = interview.startedAt && interview.endedAt ? interview.endedAt.getTime() - interview.startedAt.getTime() : Infinity;
  const at = (secs: number) => Math.round(Math.min(Math.max(offsetMs + secs * 1000, 0), lastMs));
  const speakers = [uploader, other];

  const lines = channelTurns(words, speakers.length).map(
    (turn): TranscriptLine => ({
      speaker: speakers[turn.channel].role,
      userId: speakers[turn.channel].userId,
      startMs: at(turn.start),
      endMs: at(turn.end),
      text: turn.text,
    }),
  );
  if (lines.length === 0) throw new Error(`Recording ${recording.id} has no speech`);
  return lines;
}

/**
 * Groups a multichannel transcript's words into turns, in time order: a new turn when the
 * other channel speaks or after a pause, like the AI transcript's turns. Times in seconds.
 */
export function channelTurns(words: ScribeWord[], channels: number) {
  const turns: { channel: number; start: number; end: number; text: string }[] = [];
  const spoken = words
    .filter((w) => w.type === "word" && w.start != null && w.end != null && (w.channel_index ?? -1) >= 0)
    .filter((w) => w.channel_index! < channels)
    .sort((a, b) => a.start! - b.start!);
  for (const w of spoken) {
    const last = turns[turns.length - 1];
    if (last && last.channel === w.channel_index && w.start! - last.end <= PEER_PAUSE_SECS) {
      last.text += ` ${w.text}`;
      last.end = w.end!;
    } else {
      turns.push({ channel: w.channel_index!, start: w.start!, end: w.end!, text: w.text });
    }
  }
  return turns;
}

/** The uploaded recording that covers the most of the call: the earliest started. */
async function waitForRecording(interview: InterviewForFinalize) {
  const deadline = Date.now() + RECORDING_WAIT_MS;
  let firstSeen: number | null = null;
  for (;;) {
    const ready = await db.recording.findMany({
      where: { interviewId: interview.id, status: "READY" },
      orderBy: { startedAt: "asc" },
    });
    const now = Date.now();
    if (ready.length) firstSeen ??= now;
    // Both are in, the other side had its chance, or time's up.
    const settled =
      ready.length >= interview.participants.length ||
      (firstSeen !== null && now - firstSeen >= SECOND_RECORDING_GRACE_MS) ||
      now >= deadline;
    if (settled) {
      if (!ready.length) throw new Error(`Interview ${interview.id} has no uploaded recording`);
      return ready[0];
    }
    await sleep(RECORDING_POLL_MS);
  }
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
