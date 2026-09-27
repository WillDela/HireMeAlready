"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordingMimeType, RecordingUploadResponse } from "@/lib/contracts";
import { apiFetch } from "@/lib/use-api";

// Preferred first. Chrome records WebM, Firefox Ogg, Safari MP4.
const FORMATS = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
// Two channels of speech: a 15-minute call is ~7 MB.
const AUDIO_BITS_PER_SECOND = 64_000;

export type CallRecording = { blob: Blob; mimeType: RecordingMimeType; startedAt: number };

type Session = { stop: () => Promise<CallRecording | null>; discard: () => void };

/**
 * Records the call as one stereo file for its transcript. Channel 0 is your mic, the
 * call's own echo-cancelled track (muting records silence); channel 1 is the other person
 * as you hear them. Both voices on one clock keep the transcript's order and timing exact,
 * and each channel has one speaker. Starts once `active` with both streams. Call `stop()`
 * before the call's tracks are released: the first call resolves with the recording,
 * later calls with null.
 */
export function useCallRecorder(localStream: MediaStream | null, remoteStream: MediaStream | null, active: boolean) {
  const sessionRef = useRef<Session | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!active || sessionRef.current || typeof MediaRecorder === "undefined") return;
    const mic = localStream?.getAudioTracks()[0];
    const partner = remoteStream?.getAudioTracks()[0];
    const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
    if (!mic || !partner || !format) {
      console.warn(`Not recording the call: ${!format ? "no supported audio format" : "no audio track"}`);
      return;
    }

    // Each merger input takes one (downmixed) source. Chrome only feeds a remote WebRTC
    // track into Web Audio while it's also playing in a media element, as VideoTile does.
    const context = new AudioContext();
    const merger = context.createChannelMerger(2);
    context.createMediaStreamSource(new MediaStream([mic])).connect(merger, 0, 0);
    context.createMediaStreamSource(new MediaStream([partner])).connect(merger, 0, 1);
    const destination = context.createMediaStreamDestination();
    destination.channelCount = 2;
    merger.connect(destination);

    const recorder = new MediaRecorder(destination.stream, { mimeType: format, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
    const mimeType = format.split(";")[0] as RecordingMimeType;
    const chunks: Blob[] = [];
    let startedAt = 0;
    let claimed = false;
    let resolve: (value: CallRecording | null) => void = () => {};
    const done = new Promise<CallRecording | null>((r) => (resolve = r));
    const finish = () => {
      setRecording(false);
      context.close().catch(() => undefined);
      resolve(startedAt && chunks.length ? { blob: new Blob(chunks, { type: mimeType }), mimeType, startedAt } : null);
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstart = () => {
      startedAt = Date.now();
      setRecording(true);
    };
    recorder.onstop = finish;

    const end = () => {
      if (recorder.state !== "inactive") recorder.stop();
      else finish(); // never started
    };
    sessionRef.current = {
      stop: () => {
        if (claimed) return Promise.resolve(null);
        claimed = true;
        end();
        return done;
      },
      discard: end,
    };

    // A suspended context records nothing, so start once it's running.
    context
      .resume()
      .then(() => {
        if (!claimed && recorder.state === "inactive") recorder.start();
      })
      .catch((err) => console.warn("Not recording the call: audio couldn't start", err));
  }, [active, localStream, remoteStream]);

  // Leaving the page without stop() discards the recording.
  useEffect(() => () => sessionRef.current?.discard(), []);

  const stop = useCallback(async () => sessionRef.current?.stop() ?? null, []);

  return { recording, stop };
}

/** Uploads a call recording; the server transcribes it once the call has ended. */
export async function uploadRecording(interviewId: string, { blob, mimeType, startedAt }: CallRecording) {
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
