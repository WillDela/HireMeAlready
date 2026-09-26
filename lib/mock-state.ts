"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Simulated data loading for the prototype. Every screen resolves to one of
 * four states; `?state=loading|empty|error` (or the State preview control)
 * forces one so each can be reviewed.
 */
export type Status = "loading" | "ready" | "empty" | "error";
export type ForcedState = Exclude<Status, "ready">;

const FORCEABLE: ForcedState[] = ["loading", "empty", "error"];
const listeners = new Set<() => void>();

function readForced(): ForcedState | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("state");
  return FORCEABLE.includes(value as ForcedState) ? (value as ForcedState) : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function setForcedState(state: ForcedState | null) {
  const url = new URL(window.location.href);
  if (state) url.searchParams.set("state", state);
  else url.searchParams.delete("state");
  window.history.replaceState(window.history.state, "", url);
  listeners.forEach((l) => l());
}

export function useForcedState() {
  return useSyncExternalStore(subscribe, readForced, () => null);
}

export function useMockResource<T>(
  data: T,
  options: { isEmpty?: (data: T) => boolean; delay?: number } = {},
) {
  const { isEmpty, delay = 520 } = options;
  const forced = useForcedState();
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("done"), delay);
    return () => window.clearTimeout(timer);
  }, [attempt, delay]);

  const retry = useCallback(() => {
    if (readForced()) setForcedState(null);
    setPhase("loading");
    setAttempt((n) => n + 1);
  }, []);

  const status: Status =
    forced ?? (phase === "loading" ? "loading" : isEmpty?.(data) ? "empty" : "ready");

  return { status, data, retry };
}
