"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForcedState, type Status } from "@/lib/mock-state";

/** Error from one of our API routes; `message` is the route's `{ error }` text. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

/**
 * Drop-in for useMockResource backed by a GET route: same `{ status, data, retry }`,
 * and `?state=loading|empty|error` still forces a state for review. `pollWhile`
 * keeps refetching (every `pollMs`) while it returns true, e.g. while a resume parses.
 */
export function useApiResource<T>(
  url: string | null,
  options: { isEmpty?: (data: T) => boolean; pollWhile?: (data: T) => boolean; pollMs?: number } = {},
) {
  const { pollMs = 2000 } = options;
  const forced = useForcedState();
  const [state, setState] = useState<{ phase: "loading" | "done" | "error"; data: T | null }>({
    phase: "loading",
    data: null,
  });
  const [attempt, setAttempt] = useState(0);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let timer: number | undefined;
    async function load() {
      try {
        const data = await apiFetch<T>(url!);
        if (cancelled) return;
        setState({ phase: "done", data });
        if (optionsRef.current.pollWhile?.(data)) timer = window.setTimeout(load, pollMs);
      } catch {
        if (!cancelled) setState((s) => ({ phase: "error", data: s.data }));
      }
    }
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url, attempt, pollMs]);

  /** Show the loading state and fetch again (the Retry button on error states). */
  const retry = useCallback(() => {
    setState((s) => ({ phase: "loading", data: s.data }));
    setAttempt((n) => n + 1);
  }, []);
  /** Fetch again in the background, keeping what's on screen. */
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  /** Replace the data locally, e.g. with a PATCH response. */
  const mutate = useCallback((data: T) => setState({ phase: "done", data }), []);

  const { phase, data } = state;
  const status: Status =
    forced ??
    (phase === "loading" ? "loading" : phase === "error" ? "error" : options.isEmpty?.(data as T) ? "empty" : "ready");

  return { status, data, retry, reload, mutate };
}
