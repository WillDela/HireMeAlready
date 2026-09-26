"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TranscriptTurn } from "@/lib/mock";

function highlight(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded-[2px] bg-hi px-0.5 text-hi-ink">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Speaker-labelled, timecoded transcript with find-in-transcript. */
export function TranscriptView({ turns, className }: { turns: TranscriptTurn[]; className?: string }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const q = query.trim();
  const matches = useMemo(
    () => (q ? turns.filter((t) => t.text.toLowerCase().includes(q.toLowerCase())).length : 0),
    [turns, q],
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3 border-b border-edge px-5 py-3 sm:px-6">
        <label htmlFor={searchId} className="visually-hidden">
          Find in transcript
        </label>
        <div className="relative w-full max-w-xs">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find in transcript"
            className="input !min-h-10 !pl-9 text-[0.9375rem]"
          />
        </div>
        <p className="text-[0.8125rem] text-ink-2" aria-live="polite">
          {q ? `${matches} ${matches === 1 ? "answer" : "answers"} mention “${q}”` : `${turns.length} turns`}
        </p>
      </div>

      <ol
        tabIndex={0}
        aria-label="Transcript"
        className="max-h-[34rem] overflow-y-auto px-5 py-2 sm:px-6"
      >
        {turns.map((t) => (
          <li
            key={t.id}
            className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-b border-edge/70 py-4 last:border-b-0 sm:grid-cols-[3.75rem_9.5rem_1fr]"
          >
            <span className="tnum pt-0.5 text-[0.8125rem] text-ink-3">{t.time}</span>
            <span
              className={cn(
                "cond text-[0.8125rem] font-bold tracking-[0.07em] uppercase sm:pt-0.5",
                t.isYou ? "text-ink" : "text-manila-ink",
              )}
            >
              {t.speaker}
              {t.isYou ? <span className="visually-hidden"> (you)</span> : null}
            </span>
            <p className="col-start-2 mt-1 max-w-[68ch] text-[0.9875rem] leading-relaxed sm:col-start-3 sm:mt-0">
              {highlight(t.text, q)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
