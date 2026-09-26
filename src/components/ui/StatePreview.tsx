"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { setForcedState, useForcedState, type ForcedState } from "@/lib/mock-state";

const options: { value: ForcedState | null; label: string }[] = [
  { value: null, label: "Live" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" },
  { value: "error", label: "Error" },
];

/**
 * Prototype-only control to review each screen's loading, empty and error
 * states against the mock data.
 */
export function StatePreview({ className }: { className?: string }) {
  const forced = useForcedState();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("surface-drawer pointer-events-auto", className)}>
      {open ? (
        <fieldset className="flex items-center gap-1 rounded-[5px] bg-drawer p-1 shadow-[0_10px_24px_-10px_oklch(0.1_0.03_266/0.6)]">
          <legend className="visually-hidden">Preview screen state (mock data)</legend>
          <span aria-hidden="true" className="cond px-2 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-2 uppercase">
            Mock state
          </span>
          {options.map((o) => {
            const checked = forced === o.value;
            return (
              <label
                key={o.label}
                className={cn(
                  "cursor-pointer rounded-[3px] px-2.5 py-1.5 text-[0.8125rem] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hi",
                  !checked && "text-ink hover:bg-drawer-2",
                )}
                style={checked ? { background: "var(--drawer-ink)", color: "var(--drawer)" } : undefined}
              >
                <input
                  type="radio"
                  name="mock-state"
                  className="visually-hidden"
                  checked={checked}
                  onChange={() => setForcedState(o.value)}
                />
                {o.label}
              </label>
            );
          })}
          <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setOpen(false)} aria-label="Close state preview">
            <X size={16} aria-hidden="true" />
          </button>
        </fieldset>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-[5px] bg-drawer px-3 py-2 text-[0.8125rem] font-semibold text-ink shadow-[0_10px_24px_-10px_oklch(0.1_0.03_266/0.6)]"
          aria-label={`Preview screen state. Current: ${forced ?? "live"}`}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          States
          {forced ? <span className="rounded-[3px] bg-hi px-1.5 text-[0.6875rem] font-bold text-hi-ink uppercase">{forced}</span> : null}
        </button>
      )}
    </div>
  );
}
