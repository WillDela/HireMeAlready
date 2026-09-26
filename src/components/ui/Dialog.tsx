"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Native <dialog> as a modal sheet: focus is contained, Escape closes, and
 * focus returns to the opener. Controlled with `open` / `onClose`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "danger";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "sheet surface-day m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 text-ink",
        "backdrop:bg-[oklch(0.18_0.04_266/0.55)]",
        className,
      )}
    >
      <div className={cn("h-1.5", tone === "danger" ? "bg-stamp" : "bg-manila-deep")} aria-hidden="true" />
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            {title}
          </h2>
          <button type="button" className="icon-btn -mt-1.5 -mr-2" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {description ? (
          <p id={descId} className="mt-2 text-[0.9375rem] text-ink-2">
            {description}
          </p>
        ) : null}
        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}
