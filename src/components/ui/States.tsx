"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Status } from "@/lib/mock-state";
import { Button } from "./Button";
import { Stamp } from "./Stamp";

/* ------------------------------------------------------------------
   Loading: blank ruled sheets being drawn in.
   ------------------------------------------------------------------ */
export function LoadingSheets({
  label,
  layout = "list",
  rows = 4,
  className,
}: {
  label: string;
  layout?: "list" | "grid" | "detail" | "form";
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="visually-hidden">{label}</span>
      <p aria-hidden="true" className="mb-3 text-[0.8125rem] font-semibold text-manila-ink">
        {label}
      </p>
      {layout === "grid" ? (
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="sheet ruled-skeleton h-40 p-5">
              <div className="ink-bar w-1/2" />
            </div>
          ))}
        </div>
      ) : layout === "detail" ? (
        <div aria-hidden="true" className="sheet ruled-skeleton p-6">
          <div className="ink-bar h-5 w-2/5" />
          <div className="ink-bar mt-4 w-3/5" />
          <div className="ink-bar mt-10 w-4/5" />
          <div className="ink-bar mt-3 w-3/4" />
          <div className="ink-bar mt-3 w-2/3" />
          <div className="h-40" />
        </div>
      ) : layout === "form" ? (
        <div aria-hidden="true" className="sheet ruled-skeleton p-6">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="mb-6">
              <div className="ink-bar w-28" />
              <div className="mt-2 h-11 rounded-[3px] border-[1.5px] border-edge" />
            </div>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="sheet ruled-skeleton skeleton-plain divide-y divide-edge">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 flex-none rounded-full bg-[color-mix(in_oklch,var(--ink)_9%,transparent)]" />
              <div className="flex-1">
                <div className="ink-bar" style={{ width: `${55 - i * 7}%` }} />
                <div className="ink-bar mt-2 h-2 opacity-70" style={{ width: `${35 + i * 5}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Empty: an empty folder waiting for its first sheet.
   ------------------------------------------------------------------ */
export function EmptyFolder({
  title,
  children,
  action,
  label = "Empty",
  className,
  compact = false,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <div aria-hidden="true" className={cn("relative mb-6", compact ? "w-24" : "w-32")}>
        <div className="folder-tab !static !h-4 !px-4 !text-[0.5rem] w-1/2" />
        <div className={cn("rounded-[0_6px_6px_6px] border-2 border-dashed border-manila-edge bg-[color-mix(in_oklch,var(--manila-deep)_45%,transparent)]", compact ? "h-16" : "h-20")} />
      </div>
      <h3 className={cn("font-bold tracking-[-0.01em] text-ink", compact ? "text-[1.0625rem]" : "text-[1.25rem]")}>
        {title}
      </h3>
      {children ? <div className="mt-2 max-w-[42ch] text-[0.9375rem] text-ink-2">{children}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div> : null}
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Error: the sheet came back stamped RETURNED.
   ------------------------------------------------------------------ */
export function ErrorReturned({
  title,
  children,
  onRetry,
  className,
  compact = false,
}: {
  title: string;
  children?: ReactNode;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div role="alert" className={cn("sheet relative overflow-hidden", compact ? "p-5" : "p-6 sm:p-8", className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Stamp tone="stamp" rotate={-7} land className="self-start text-[1.125rem]">
          Returned
        </Stamp>
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.125rem] font-bold text-ink">{title}</h3>
          {children ? <div className="mt-1.5 max-w-[60ch] text-[0.9375rem] text-ink-2">{children}</div> : null}
          {onRetry ? (
            <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} icon={<RotateCcw size={15} aria-hidden="true" />}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Switches between the four material states. */
export function StateView({
  status,
  loading,
  empty,
  error,
  children,
}: {
  status: Status;
  loading: ReactNode;
  empty: ReactNode;
  error: ReactNode;
  children: ReactNode;
}) {
  if (status === "loading") return <>{loading}</>;
  if (status === "error") return <>{error}</>;
  if (status === "empty") return <>{empty}</>;
  return <div className="sheet-in">{children}</div>;
}
