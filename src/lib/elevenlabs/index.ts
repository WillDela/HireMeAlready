// Server-only helpers for the ElevenLabs Agents API. Owner: Stream C.

import { timed } from "@/lib/log";

const API = "https://api.elevenlabs.io/v1";

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export function interviewerAgentId() {
  const id = process.env.ELEVENLABS_AGENT_ID;
  if (!id) throw new Error("ELEVENLABS_AGENT_ID is not set (run `npm run agent:sync`)");
  return id;
}

export async function elevenLabsFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  return timed("elevenlabs", `${method} ${path.split("?")[0]}`, async () => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      // A FormData body sets its own multipart Content-Type.
      headers: {
        "xi-api-key": apiKey(),
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`ElevenLabs ${method} ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  });
}

/** Short-lived URL the browser uses to start one conversation with the interviewer agent. */
export async function getSignedUrl(): Promise<string> {
  const { signed_url } = await elevenLabsFetch<{ signed_url: string }>(
    `/convai/conversation/get-signed-url?agent_id=${interviewerAgentId()}`,
  );
  return signed_url;
}

export type ElevenLabsConversation = {
  conversation_id: string;
  status: "initiated" | "in-progress" | "processing" | "done" | "failed";
  transcript: { role: "agent" | "user"; message: string | null; time_in_call_secs: number }[];
  metadata: { call_duration_secs?: number };
};

/** Conversation details incl. transcript. `status` becomes "done" a few seconds after the call ends. */
export function getConversation(conversationId: string) {
  return elevenLabsFetch<ElevenLabsConversation>(`/convai/conversations/${conversationId}`);
}

export type ScribeWord = {
  text: string;
  start?: number | null; // seconds from the start of the file
  end?: number | null;
  type: "word" | "spacing" | "audio_event";
  channel_index?: number;
};

type MultichannelTranscript = { transcripts: { channel_index?: number; text: string; words: ScribeWord[] }[] };

/**
 * Transcribes a recording with one speaker per channel (Scribe's multichannel mode):
 * each channel is transcribed on its own, with word timings on the file's one timeline.
 * Returns every word, tagged with its channel. Needs the key's speech_to_text permission.
 */
export async function transcribeChannels(audio: Buffer, mimeType: string, fileName: string): Promise<ScribeWord[]> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), fileName);
  form.append("model_id", "scribe_v2");
  form.append("use_multi_channel", "true");
  form.append("language_code", "en");
  form.append("timestamps_granularity", "word");
  const { transcripts } = await elevenLabsFetch<MultichannelTranscript>("/speech-to-text", { method: "POST", body: form });
  return transcripts.flatMap((t) => t.words.map((w) => ({ ...w, channel_index: w.channel_index ?? t.channel_index })));
}

