"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/mock";
import { useRole } from "@/lib/prefs";

const roles: { value: Role; label: string }[] = [
  { value: "interviewee", label: "Interviewee" },
  { value: "interviewer", label: "Interviewer" },
];

/**
 * Two-position switch that fully inverts. Radio-group semantics: arrow keys
 * move the selection, Tab leaves the group.
 */
export function RoleToggle({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  const [role, setRole] = useRole();
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = (index + 1) % roles.length;
    setRole(roles[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span id={labelId} className={cn("text-[0.8125rem] font-semibold text-manila-ink", showLabel ? "max-md:sr-only" : "sr-only")}>
        Practicing as
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex rounded-[5px] border-[1.5px] border-ink p-[2px]"
      >
        {roles.map((r, i) => {
          const checked = role === r.value;
          return (
            <button
              key={r.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => setRole(r.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "h-8 rounded-[3px] px-3 text-[0.8125rem] font-bold cond tracking-[0.04em] uppercase transition-colors duration-150 sm:px-3.5",
                checked ? "bg-ink text-paper" : "text-ink hover:bg-[color-mix(in_oklch,var(--ink)_10%,transparent)]",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
