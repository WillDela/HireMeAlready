"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { MicOff } from "lucide-react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { AiSessionResponse } from "@/lib/contracts";
import { apiFetch } from "@/lib/use-api";
import { AiOrb, type AiState } from "@/components/call/AiOrb";
import { Button } from "@/components/ui/Button";

/** Lets the call page end the voice session before it finalizes the interview. */
export type AiInterviewerHandle = { end: () => void };

type Props = {
  interviewId: string;
  active: boolean;
  muted: boolean;
  /** The agent hung up on its own (it does after the last question). */
  onAgentEnded: () => void;
  handle?: Ref<AiInterviewerHandle>;
};

/** Starts the ElevenLabs voice session for `interviewId` once `active` and drives the orb. */
function AiInterviewerSession({ interviewId, active, muted, onAgentEnded, handle }: Props) {
  const [caption, setCaption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Set once we end the session ourselves, so the disconnect that follows isn't treated
  // as the agent hanging up or as a dropped connection.
  const endingRef = useRef(false);
  const onAgentEndedRef = useRef(onAgentEnded);
  useEffect(() => {
    onAgentEndedRef.current = onAgentEnded;
  });

  const conversation = useConversation({
    onMessage: ({ message, role }) => {
      if (role === "agent") setCaption(message);
    },
    onConnect: ({ conversationId }) => {
      // Links the ElevenLabs conversation to the interview so the transcript can be
      // pulled when it ends. Also marks the interview ACTIVE.
      apiFetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ elevenConversation: conversationId }),
      }).catch((err) => console.error("Couldn't link the AI conversation to this interview:", err));
    },
    onDisconnect: (details) => {
      if (endingRef.current) return;
      if (details.reason === "agent") {
        endingRef.current = true;
        onAgentEndedRef.current();
      } else if (details.reason === "error") {
        setError("The connection to the AI interviewer dropped.");
      }
    },
    onError: (message) => {
      console.error("AI interviewer error:", message);
      if (!endingRef.current) setError(message || "The AI interviewer ran into a problem.");
    },
  });
  // `conversation` is a fresh object each render; its methods are what we need.
  const { startSession, endSession, setMuted } = conversation;

  const end = useCallback(() => {
    endingRef.current = true;
    endSession();
  }, [endSession]);
  useImperativeHandle(handle, () => ({ end }), [end]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    apiFetch<AiSessionResponse>("/api/ai/signed-url", {
      method: "POST",
      body: JSON.stringify({ interviewId }),
    })
      .then(({ signedUrl, dynamicVariables }) => {
        // The user may have left (or retried) while the URL was on its way.
        if (!cancelled && !endingRef.current) startSession({ signedUrl, dynamicVariables });
      })
      .catch((err) => {
        console.error("Failed to start the AI interviewer:", err);
        if (!cancelled) setError("We couldn't reach the AI interviewer.");
      });
    return () => {
      cancelled = true;
    };
    // startSession is stable for the life of this ConversationProvider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, interviewId, attempt]);

  useEffect(() => {
    if (conversation.status === "connected") setMuted(muted);
  }, [conversation.status, muted, setMuted]);

  // Leaving the page (End, back button, closed tab) always closes the voice session.
  useEffect(() => {
    // Reset on (re)mount: in dev, Strict Mode runs this cleanup once before remounting.
    endingRef.current = false;
    return () => {
      endingRef.current = true;
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <section
        aria-label="AI interviewer"
        role="alert"
        className="flex h-full flex-col items-center justify-center rounded-[6px] bg-night-2 px-6 text-center"
      >
        <MicOff size={30} aria-hidden="true" className="text-stamp" />
        <p className="mt-3 text-[1.25rem] font-bold">The AI interviewer couldn&apos;t start</p>
        <p className="mt-2 max-w-[46ch] text-ink-2">
          {error} Check that this site can use your microphone, then try again.
        </p>
        <Button
          className="mt-5"
          onClick={() => {
            endSession();
            setError(null);
            setCaption(null);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </Button>
      </section>
    );
  }

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
          <span className="text-ink-2">
            {state === "thinking" ? "Connecting to your interviewer…" : "Take your time. Answer out loud."}
          </span>
        )}
      </p>
    </section>
  );
}

/** The AI branch of the call room: a live ElevenLabs conversation for `interviewId`. */
export function AiInterviewer(props: Props) {
  return (
    <ConversationProvider>
      <AiInterviewerSession {...props} />
    </ConversationProvider>
  );
}
