import type { GeneratedQuestion, TranscriptLine } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getConversation } from "@/lib/elevenlabs";
import { analyzeInterview, transcribeAudio } from "@/lib/gemini";
import { getObjectBuffer } from "@/lib/storage";

// Owner: Stream C. Runs after an interview ends (called from POST /api/interviews/:id/end
// via `after()`): pulls the transcript, saves it, then runs Gemini's analysis on it.
// AI mode reads the transcript from ElevenLabs; peer mode transcribes each participant's
// own recording and merges them by wall-clock offset.

const CONVERSATION_POLL_MS = 2000;
const CONVERSATION_POLL_ATTEMPTS = 10; // ElevenLabs finishes processing a few seconds after the call ends; ~20s ceiling

function loadInterview(interviewId: string) {
  return db.interview.findUnique({
    where: { id: interviewId },
    include: {
      questions: { orderBy: { order: "asc" } },
      participants: true,
      recordings: true,
      feedback: true,
    },
  });
}

type InterviewForFinalize = NonNullable<Awaited<ReturnType<typeof loadInterview>>>;

export async function finalizeInterview(interviewId: string): Promise<void> {
  const interview = await loadInterview(interviewId);
  if (!interview) return;

  await db.interview.update({ where: { id: interviewId }, data: { transcriptStatus: "PROCESSING" } });
  try {
    const transcript =
      interview.mode === "AI" ? await finalizeAiTranscript(interview) : await finalizePeerTranscript(interview);
    await saveTranscript(interviewId, transcript);
    await db.interview.update({ where: { id: interviewId }, data: { transcriptStatus: "READY" } });
    await runAnalysis(interview, transcript);
  } catch (err) {
    console.error(`Interview ${interviewId} failed to finalize`, err);
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
  return conversation.transcript
    .filter((turn): turn is typeof turn & { message: string } => Boolean(turn.message))
    .map((turn) => ({
      speaker: turn.role === "agent" ? "AI" : "INTERVIEWEE",
      startMs: Math.round(turn.time_in_call_secs * 1000),
      text: turn.message,
    }));
}

async function finalizePeerTranscript(interview: InterviewForFinalize): Promise<TranscriptLine[]> {
  const interviewStart = (interview.startedAt ?? interview.createdAt).getTime();
  const lines: TranscriptLine[] = [];
  for (const recording of interview.recordings) {
    const participant = interview.participants.find((p) => p.id === recording.participantId);
    if (!participant) continue;
    const buffer = await getObjectBuffer(recording.storageKey);
    const segments = await transcribeAudio(buffer, recording.mimeType);
    const offsetMs = recording.startedAt.getTime() - interviewStart;
    for (const segment of segments) {
      lines.push({
        speaker: participant.role,
        userId: participant.userId,
        startMs: offsetMs + segment.startMs,
        endMs: offsetMs + segment.endMs,
        text: segment.text,
      });
    }
  }
  return lines.sort((a, b) => a.startMs - b.startMs);
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
  if (!interviewee) return;

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
  } catch (err) {
    console.error(`Interview ${interview.id} failed to analyze`, err);
    await db.analysis.update({
      where: { interviewId: interview.id },
      data: { status: "FAILED", error: String(err) },
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
