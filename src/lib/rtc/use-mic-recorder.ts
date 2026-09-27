"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordingMimeType, RecordingUploadResponse } from "@/lib/contracts";
import { apiFetch } from "@/lib/use-api";

// Preferred first. Firefox records Ogg, Chrome WebM, Safari MP4.
const FORMATS = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
// Speech-quality audio: a 15-minute call is ~3.6 MB, well under Gemini's 20 MB inline limit.
const AUDIO_BITS_PER_SECOND = 32_000;

export type MicRecording = { blob: Blob; mimeType: RecordingMimeType; startedAt: number };

type Session = { recorder: MediaRecorder; done: Promise<MicRecording | null>; claimed: boolean };

/**
 * Records the local mic only, so each speaker's audio reaches transcription already
 * separated. Starts once `active` and `stream` has an audio track, and records the track
 * itself, so muting records silence and keeps timestamps aligned. Call `stop()` before
 * the mic is released: the first call resolves with the recording, later calls with null.
 */
export function useMicRecorder(stream: MediaStream | null, active: boolean) {
  const sessionRef = useRef<Session | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!active || !stream || sessionRef.current || typeof MediaRecorder === "undefined") return;
    const tracks = stream.getAudioTracks();
    const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
    if (!tracks.length || !format) {
      console.warn(`Not recording your side of the transcript: ${tracks.length ? "no supported audio format" : "no mic track"}`);
      return;
    }

    const recorder = new MediaRecorder(new MediaStream(tracks), {
      mimeType: format,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    const mimeType = format.split(";")[0] as RecordingMimeType;
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    recorder.onstart = () => setRecording(true);
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    // Also fires if the track ends on its own (the mic is unplugged or released).
    const done = new Promise<MicRecording | null>((resolve) => {
      recorder.onstop = () => {
        setRecording(false);
        resolve(chunks.length ? { blob: new Blob(chunks, { type: mimeType }), mimeType, startedAt } : null);
      };
    });
    sessionRef.current = { recorder, done, claimed: false };
    recorder.start();
  }, [active, stream]);

  // Leaving the page without stop() discards the recording.
  useEffect(
    () => () => {
      const recorder = sessionRef.current?.recorder;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    [],
  );

  const stop = useCallback(async (): Promise<MicRecording | null> => {
    const session = sessionRef.current;
    if (!session || session.claimed) return null;
    session.claimed = true;
    if (session.recorder.state !== "inactive") session.recorder.stop();
    return session.done;
  }, []);

  return { recording, stop };
}

/** Uploads your side of a peer call; the server transcribes it once both sides are in. */
export async function uploadRecording(interviewId: string, { blob, mimeType, startedAt }: MicRecording) {
  const { uploadUrl, recordingId } = await apiFetch<RecordingUploadResponse>(
    `/api/interviews/${interviewId}/recordings/upload-url`,
    { method: "POST", body: JSON.stringify({ mimeType, startedAgoMs: Date.now() - startedAt }) },
  );
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: blob });
  if (!put.ok) throw new Error(`Recording upload failed (${put.status})`);
  await apiFetch(`/api/interviews/${interviewId}/recordings`, {
    method: "POST",
    body: JSON.stringify({ recordingId }),
  });
}
