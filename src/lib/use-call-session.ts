"use client";

import { useEffect, useState } from "react";
import type { InterviewDetail } from "@/lib/contracts";
import { callSessions, type CallSession } from "@/lib/mock";
import { apiFetch } from "@/lib/use-api";

const AI_PARTNER = { id: "ai", name: "AI interviewer", initials: "AI", headline: "Asks your interview questions" };

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

function toCallSession(detail: InterviewDetail, myUserId: string | undefined): CallSession {
  const partner = detail.participants.find((p) => p.userId !== myUserId);
  return {
    id: detail.id,
    type: detail.mode === "AI" ? "ai" : "human",
    company: detail.company ?? "",
    jobTitle: detail.jobTitle ?? "",
    partner:
      detail.mode === "AI" || !partner
        ? AI_PARTNER
        : { id: partner.userId, name: partner.name, initials: initialsOf(partner.name), headline: "" },
    historyId: detail.id,
  };
}

/**
 * The call room's session for `id`: a real interview from GET /api/interviews/:id, or one
 * of the mock `callSessions` (kept for the design/state previews). `missing` means
 * neither exists, or it isn't the caller's interview.
 */
export function useCallSession(id: string, myUserId: string | undefined) {
  const mock = callSessions[id];
  const [state, setState] = useState<{ id: string; status: "loading" | "ready" | "missing"; session: CallSession | null }>(
    { id, status: "loading", session: null },
  );

  useEffect(() => {
    if (mock) return;
    let cancelled = false;
    apiFetch<InterviewDetail>(`/api/interviews/${id}`)
      .then((detail) => {
        if (!cancelled) setState({ id, status: "ready", session: toCallSession(detail, myUserId) });
      })
      .catch(() => {
        if (!cancelled) setState({ id, status: "missing", session: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id, mock, myUserId]);

  if (mock) return { status: "ready" as const, session: mock };
  // Ignore a result that belongs to a previous id.
  return state.id === id ? state : { status: "loading" as const, session: null };
}
