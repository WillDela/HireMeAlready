import { HttpError } from "@/lib/api";
import type { RecordingUploadInput, RecordingUploadResponse } from "@/lib/contracts";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/interviews";
import { createUploadUrl, storageKeys } from "@/lib/storage";

// Peer-call recordings. Each browser records the whole call as one stereo file (channel
// 0: its own mic, channel 1: the other person as heard in the call) and uploads it when
// the call ends. The finalize pipeline transcribes one of them with ElevenLabs Scribe's
// multichannel mode (src/lib/pipeline/finalize.ts).

const EXTENSIONS = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" } as const;

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
  return { ok: true };
}
