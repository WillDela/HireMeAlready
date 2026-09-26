// Server-only helpers for the ElevenLabs Agents API. Owner: Stream C.

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
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": apiKey(), "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`ElevenLabs ${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
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

