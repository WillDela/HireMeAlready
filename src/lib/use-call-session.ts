"use client";

import { useEffect, useState } from "react";
import { callSessions, type CallSession } from "@/lib/mock";
import { apiFetch } from "@/lib/use-api";
import type { HistoryDetail } from "@/lib/views";

const AI_PARTNER = { id: "ai", name: "AI interviewer", initials: "AI", headline: "Asks your interview questions" };

function toCallSession(detail: HistoryDetail): CallSession {
  const partner = detail.people[0];
  return {
    id: detail.id,
    type: detail.type,
    company: detail.company,
    jobTitle: detail.jobTitle,
    partner:
      detail.type === "ai" || !partner
        ? AI_PARTNER
        : { id: partner.id, name: partner.name, initials: partner.initials, headline: partner.headline },
    historyId: detail.id,
  };
}

/**
 * The call room's session for `id`: a real interview from GET /api/interviews/:id, or one
 * of the mock `callSessions` (kept for the design/state previews). `missing` means
 * neither exists, or it isn't the caller's interview.
 */
export function useCallSession(id: string) {
  const mock = callSessions[id];
  const [state, setState] = useState<{ id: string; status: "loading" | "ready" | "missing"; session: CallSession | null }>(
    { id, status: "loading", session: null },
  );

  useEffect(() => {
    if (mock) return;
    let cancelled = false;
    apiFetch<HistoryDetail>(`/api/interviews/${id}`)
      .then((detail) => {
        if (!cancelled) setState({ id, status: "ready", session: toCallSession(detail) });
      })
      .catch(() => {
        if (!cancelled) setState({ id, status: "missing", session: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id, mock]);

  if (mock) return { status: "ready" as const, session: mock };
  // Ignore a result that belongs to a previous id.
  return state.id === id ? state : { status: "loading" as const, session: null };
}
