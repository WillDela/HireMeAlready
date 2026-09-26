"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { AiSessionResponse } from "@/lib/contracts";
import { apiFetch } from "@/lib/use-api";
import { AiOrb, type AiState } from "@/components/call/AiOrb";

/** Starts the ElevenLabs voice session for `interviewId` once `active` and drives the orb. */
function AiInterviewerSession({ interviewId, active }: { interviewId: string; active: boolean }) {
  const [caption, setCaption] = useState<string | null>(null);
  const startedRef = useRef(false);

  const conversation = useConversation({
    onMessage: ({ message, role }) => {
      if (role === "agent") setCaption(message);
    },
    onConnect: ({ conversationId }) => {
      // Best-effort: the interview may not have a real backing row yet if the
      // Interview API hasn't landed. The voice session still works either way.
      apiFetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ elevenConversation: conversationId }),
      }).catch(() => {});
    },
    onError: (message) => console.error("AI interviewer error:", message),
  });

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    apiFetch<AiSessionResponse>("/api/ai/signed-url", {
      method: "POST",
      body: JSON.stringify({ interviewId }),
    })
      .then(({ signedUrl, dynamicVariables }) => conversation.startSession({ signedUrl, dynamicVariables }))
      .catch((err) => console.error("Failed to start the AI interviewer:", err));
    // `conversation` is stable for the life of this ConversationProvider instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, interviewId]);

  useEffect(() => {
    return () => conversation.endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state: AiState =
    conversation.status !== "connected" ? "thinking" : conversation.isSpeaking ? "speaking" : "listening";

  return (
    <section
      aria-label="AI interviewer"
      className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[6px] bg-night-2 px-4"
    >
      <AiOrb state={state} className="w-[min(78vw,26rem)] sm:w-[min(52vh,26rem)]" />
      <p
        className="mt-4 max-w-[46ch] text-center text-[1.0625rem] leading-relaxed text-ink sm:text-[1.1875rem]"
        aria-live="polite"
      >
        {state === "speaking" && caption ? (
          caption
        ) : (
          <span className="text-ink-2">{state === "thinking" ? "…" : "Take your time. Answer out loud."}</span>
        )}
      </p>
    </section>
  );
}

/** The AI branch of the call room: a live ElevenLabs conversation for `interviewId`. */
export function AiInterviewer({ interviewId, active }: { interviewId: string; active: boolean }) {
  return (
    <ConversationProvider>
      <AiInterviewerSession interviewId={interviewId} active={active} />
    </ConversationProvider>
  );
}
