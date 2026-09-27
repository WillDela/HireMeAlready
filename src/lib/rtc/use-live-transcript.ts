"use client";

import { useEffect, useRef, useState } from "react";
import {
  CommitStrategy,
  RealtimeEvents,
  Scribe,
  type CommittedTranscriptWithTimestampsMessage,
  type RealtimeConnection,
} from "@elevenlabs/react";
import type { TranscriptTokenResponse } from "@/lib/contracts";
import { readDevicePrefs } from "@/lib/rtc/device-prefs";
import { apiFetch } from "@/lib/use-api";

// The speech-to-text the AI interviewer hears candidates with, so both kinds of interview
// are transcribed the same way.
const MODEL_ID = "scribe_v2_realtime";
// After you stop, how long Scribe gets to commit the sentence in progress.
const FLUSH_MS = 1500;
const RECONNECT_MS = 2000;
const MAX_RECONNECTS = 5;
const MAX_LINE_MS = 10 * 60 * 1000; // TranscriptLineInput's limit

/**
 * Transcribes your side of a peer call live with ElevenLabs Scribe while `active`. Streams
 * only your mic (the one picked in the lobby), so each line has one known speaker, and
 * posts every line as soon as Scribe commits it at a pause. `muted` sends silence, like
 * the call's mute. When `active` turns off, the sentence in progress is flushed first.
 */
export function useLiveTranscript({
  interviewId,
  active,
  muted,
}: {
  interviewId: string;
  active: boolean;
  muted: boolean;
}) {
  const [live, setLive] = useState(false);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
    setMuted(connectionRef.current, muted);
  }, [muted]);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let reconnects = 0;
    let retryTimer: number | undefined;
    let current: RealtimeConnection | null = null;

    const retry = () => {
      if (stopped || reconnects >= MAX_RECONNECTS) return;
      reconnects++;
      retryTimer = window.setTimeout(connect, RECONNECT_MS);
    };

    async function connect() {
      let token: string;
      try {
        ({ token } = await apiFetch<TranscriptTokenResponse>(`/api/interviews/${interviewId}/transcript/token`, {
          method: "POST",
        }));
      } catch (err) {
        console.error("Couldn't start the live transcript:", err);
        return retry();
      }
      if (stopped) return;

      const micId = readDevicePrefs().micId;
      const connection = Scribe.connect({
        token,
        modelId: MODEL_ID,
        languageCode: "en",
        commitStrategy: CommitStrategy.VAD,
        includeTimestamps: true,
        microphone: { deviceId: micId || undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      current = connection;
      connectionRef.current = connection;

      // Scribe's word timings count from when the mic starts streaming, right after the
      // socket opens.
      let audioStart = 0;
      connection.on(RealtimeEvents.OPEN, () => {
        audioStart = performance.now();
      });
      connection.on(RealtimeEvents.SESSION_STARTED, () => {
        reconnects = 0;
        setLive(true);
        setMuted(connection, mutedRef.current);
      });
      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS, (message) =>
        postLine(interviewId, message, audioStart),
      );
      connection.on(RealtimeEvents.ERROR, (err) => console.error("Live transcript error:", err));
      connection.on(RealtimeEvents.CLOSE, () => {
        if (connectionRef.current === connection) {
          connectionRef.current = null;
          setLive(false);
        }
        if (!stopped) retry(); // dropped mid-call: pick up with a fresh session
      });
    }

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      const connection = current;
      if (!connection) return;
      // Stop listening now, but let Scribe commit what was already said before closing.
      try {
        setMuted(connection, true);
        connection.commit();
      } catch {
        /* not open yet: nothing to flush */
      }
      window.setTimeout(() => connection.close(), FLUSH_MS);
    };
  }, [active, interviewId]);

  return { live };
}

function setMuted(connection: RealtimeConnection | null, muted: boolean) {
  try {
    if (muted) connection?.mute();
    else connection?.unmute();
  } catch {
    /* the mic isn't streaming yet; SESSION_STARTED applies it */
  }
}

/** Sends one committed line, timed from its first and last spoken word. */
function postLine(interviewId: string, { text, words }: CommittedTranscriptWithTimestampsMessage, audioStart: number) {
  const line = text.trim();
  if (!line) return;
  const spoken = (words ?? []).filter((w) => w.type === "word" && w.start !== undefined && w.end !== undefined);
  const now = performance.now();
  // Without word timings, the line goes where it was committed.
  const startedAt = audioStart && spoken.length ? audioStart + spoken[0].start! * 1000 : now;
  const endedAt = audioStart && spoken.length ? audioStart + spoken[spoken.length - 1].end! * 1000 : now;
  const ms = (value: number) => Math.min(MAX_LINE_MS, Math.max(0, Math.round(value)));
  apiFetch(`/api/interviews/${interviewId}/transcript`, {
    method: "POST",
    body: JSON.stringify({ text: line, startedAgoMs: ms(now - startedAt), durationMs: ms(endedAt - startedAt) }),
  }).catch((err) => console.error("Couldn't save a transcript line:", err));
}
