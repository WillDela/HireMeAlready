import { HttpError } from "@/lib/api";
import type { TranscriptLineInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { createScribeToken } from "@/lib/elevenlabs";
import { requireParticipant } from "@/lib/interviews";

// Peer-mode transcripts. Like the AI interviewer, each side of a peer call is transcribed
// live by ElevenLabs Scribe realtime: every browser streams only its own mic, so speakers
// arrive already separated, and posts each line as soon as Scribe commits it. The server
// stamps lines on its own clock, relative to Interview.startedAt, so both sides share one
// timeline and no line can fall outside the interview.

// Lines still arrive for a few seconds after someone leaves (the last sentence flushes).
const LATE_LINE_MS = 2 * 60 * 1000;

async function requirePeerCall(interviewId: string, userId: string) {
  const { interview, me } = await requireParticipant(interviewId, userId);
  if (interview.mode !== "PEER") throw new HttpError(404, "Interview not found");
  if (!interview.startedAt) throw new HttpError(409, "This interview hasn't started yet");
  return { interview: { ...interview, startedAt: interview.startedAt }, me };
}

/** POST /api/interviews/:id/transcript/token, while the call is on. */
export async function createTranscriptToken(interviewId: string, userId: string) {
  const { interview } = await requirePeerCall(interviewId, userId);
  if (interview.status !== "ACTIVE") throw new HttpError(409, "This interview isn't in progress");
  return { token: await createScribeToken() };
}

/** POST /api/interviews/:id/transcript: saves one of your lines as a TranscriptSegment. */
export async function addTranscriptLine(
  interviewId: string,
  userId: string,
  { text, startedAgoMs, durationMs }: TranscriptLineInput,
) {
  const { interview, me } = await requirePeerCall(interviewId, userId);
  const now = Date.now();
  if (interview.status !== "ACTIVE" && !(interview.endedAt && now - interview.endedAt.getTime() < LATE_LINE_MS)) {
    throw new HttpError(409, "This interview is over");
  }

  const start = interview.startedAt.getTime();
  const last = (interview.endedAt?.getTime() ?? now) - start;
  const clamp = (ms: number) => Math.round(Math.min(Math.max(ms, 0), last));
  const startMs = clamp(now - startedAgoMs - start);
  await db.transcriptSegment.create({
    data: {
      interviewId,
      speaker: me.role,
      userId,
      startMs,
      endMs: Math.max(startMs, clamp(now - startedAgoMs + durationMs - start)),
      text,
    },
  });
  return { ok: true };
}
