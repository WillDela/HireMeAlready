"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Disclosure popover: a button that shows a panel below it. Escape and
 * outside clicks close it; focus returns to the button on Escape.
 */
export function Popover({
  buttonLabel,
  buttonContent,
  buttonClassName,
  panelLabel,
  children,
  panelClassName,
}: {
  buttonLabel: string;
  buttonContent: ReactNode;
  buttonClassName?: string;
  panelLabel: string;
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={panelLabel}
        hidden={!open}
        className={cn(
          "sheet surface-day fixed inset-x-3 top-[4.25rem] z-50 sm:absolute sm:inset-x-auto sm:top-[calc(100%+0.5rem)] sm:right-0",
          panelClassName,
        )}
      >
        {open ? children(() => setOpen(false)) : null}
      </div>
    </div>
  );
}
