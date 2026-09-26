"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

interface Common {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  labelHidden?: boolean;
}

function describedBy(id: string, hint?: ReactNode, error?: string | null) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Meta({ id, hint, error }: { id: string; hint?: ReactNode; error?: string | null }) {
  return (
    <>
      {hint && !error ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          <CircleAlert size={15} aria-hidden="true" className="mt-px flex-none" />
          {error}
        </p>
      ) : null}
    </>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  labelHidden,
  id: idProp,
  ...input
}: Common & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("field-label", labelHidden && "visually-hidden")}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
      <Meta id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  labelHidden,
  inputClassName,
  id: idProp,
  ...input
}: Common & ComponentProps<"textarea"> & { inputClassName?: string }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("field-label", labelHidden && "visually-hidden")}>
        {label}
      </label>
      <textarea
        id={id}
        className={cn("input", inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
      <Meta id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  labelHidden,
  options,
  placeholder,
  id: idProp,
  ...select
}: Common & ComponentProps<"select"> & { options: string[]; placeholder?: string }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("field-label", labelHidden && "visually-hidden")}>
        {label}
      </label>
      <select
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...select}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <Meta id={id} hint={hint} error={error} />
    </div>
  );
}

export function CheckboxField({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...input
}: Omit<Common, "labelHidden"> & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="check"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...input}
        />
        <label htmlFor={id} className="text-[0.9375rem] leading-snug text-ink">
          {label}
        </label>
      </div>
      <div className="pl-8">
        <Meta id={id} hint={hint} error={error} />
      </div>
    </div>
  );
}
