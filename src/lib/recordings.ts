import { HttpError } from "@/lib/api";
import type { RecordingUploadInput, RecordingUploadResponse } from "@/lib/contracts";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/interviews";
import { finalizeInterview } from "@/lib/pipeline/finalize";
import { createUploadUrl, storageKeys } from "@/lib/storage";

// Peer-mode recordings. Each side of a peer call records only its own mic and uploads it
// when the call ends; once both are in, the finalize pipeline transcribes and merges them
// into the interview's transcript.

const EXTENSIONS = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" } as const;

// How long to wait for the other side's recording before transcribing without it (they
// may have closed the tab mid-upload).
const PARTNER_WAIT_MS = 60_000;
const PARTNER_POLL_MS = 3000;

/** POST /api/interviews/:id/recordings/upload-url: reserves a Recording and returns a presigned PUT. */
export async function createRecordingUpload(
  interviewId: string,
  userId: string,
  { mimeType, startedAgoMs }: RecordingUploadInput,
): Promise<RecordingUploadResponse> {
  const { interview, me } = await requireParticipant(interviewId, userId);
  if (interview.mode !== "PEER") throw new HttpError(404, "Interview not found");
  if (!interview.startedAt) throw new HttpError(409, "This interview never started, so there's nothing to record");

  const id = crypto.randomUUID();
  const storageKey = storageKeys.recording(interviewId, id, EXTENSIONS[mimeType]);
  await db.recording.create({
    data: {
      id,
      interviewId,
      participantId: me.id,
      storageKey,
      mimeType,
      startedAt: new Date(Date.now() - startedAgoMs),
    },
  });
  return { uploadUrl: await createUploadUrl(storageKey, mimeType), recordingId: id };
}

/** POST /api/interviews/:id/recordings: the upload finished. */
export async function confirmRecording(interviewId: string, userId: string, recordingId: string) {
  const { me } = await requireParticipant(interviewId, userId);
  const { count } = await db.recording.updateMany({
    where: { id: recordingId, interviewId, participantId: me.id },
    data: { status: "READY" },
  });
  if (count === 0) throw new HttpError(404, "Recording not found");
}

/**
 * Finalizes once everyone who joined (and allows recording) has uploaded, or after
 * PARTNER_WAIT_MS with whatever arrived. Both sides' confirms run this; only one finalizes.
 */
export async function finalizeWhenRecorded(interviewId: string) {
  const deadline = Date.now() + PARTNER_WAIT_MS;
  while (Date.now() < deadline && !(await allRecorded(interviewId))) await sleep(PARTNER_POLL_MS);

  const { count } = await db.interview.updateMany({
    where: { id: interviewId, transcriptStatus: "PENDING" },
    data: { transcriptStatus: "PROCESSING" },
  });
  if (count > 0) await finalizeInterview(interviewId);
}

async function allRecorded(interviewId: string) {
  const participants = await db.participant.findMany({
    where: { interviewId, joinedAt: { not: null }, user: { profile: { recordingConsent: true } } },
    include: { recordings: { select: { status: true } } },
  });
  return participants.every((p) => p.recordings.length > 0 && p.recordings.every((r) => r.status === "READY"));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
