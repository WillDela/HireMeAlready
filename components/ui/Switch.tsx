"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** On/off setting. The track inverts fully between states. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        {description ? (
          <p id={`${id}-d`} className="mt-0.5 max-w-[56ch] text-[0.875rem] text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 flex-none items-center rounded-full border-[1.5px] border-ink transition-colors duration-150 disabled:opacity-50",
          checked ? "bg-ink" : "bg-paper",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-5 w-5 rounded-full transition-transform duration-150 ease-[var(--ease-out-quint)]",
            checked ? "translate-x-[1.375rem] bg-paper" : "translate-x-[0.1875rem] bg-ink",
          )}
        />
      </button>
    </div>
  );
}
