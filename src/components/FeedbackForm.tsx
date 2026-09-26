"use client";

import { useId, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";

const scale = ["Needs work", "Developing", "Solid", "Strong", "Excellent"];

const dimensions = [
  { key: "communication", label: "Communication", hint: "Clear, structured, easy to follow" },
  { key: "technical", label: "Technical skill", hint: "Depth and accuracy for the role" },
  { key: "confidence", label: "Confidence", hint: "Composure, especially under follow-ups" },
] as const;

type Key = (typeof dimensions)[number]["key"];
export type FeedbackValues = Record<Key, number> & { comments: string };

function Rating({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="border-b border-edge py-5 first-of-type:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        <output htmlFor={id} className="tnum text-[0.9375rem] font-semibold">
          <span className="cond mr-1.5 text-[1.5rem] font-extrabold">{value}</span>
          <span className="text-ink-2">{scale[value - 1]}</span>
        </output>
      </div>
      <p className="text-[0.875rem] text-ink-2">{hint}</p>
      <input
        id={id}
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} of 5, ${scale[value - 1]}`}
        className="range mt-2"
        style={{ ["--fill" as string]: `${((value - 1) / 4) * 100}%` }}
      />
      <div aria-hidden="true" className="tnum flex justify-between px-0.5 text-[0.75rem] text-ink-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/** Interviewer's post-call rating of the candidate. */
export function FeedbackForm({
  candidateName,
  onSubmit,
  submitting,
  error,
}: {
  candidateName: string;
  onSubmit: (values: FeedbackValues) => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const [values, setValues] = useState<Record<Key, number>>({ communication: 3, technical: 3, confidence: 3 });
  const [comments, setComments] = useState("");
  const [touched, setTouched] = useState(false);
  const first = candidateName.split(" ")[0];
  const commentError = touched && comments.trim().length < 20 ? `Add a sentence or two so ${first} knows what to work on.` : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (comments.trim().length < 20) return;
    onSubmit({ ...values, comments });
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="visually-hidden">Ratings from 1 to 5</legend>
        {dimensions.map((d) => (
          <Rating
            key={d.key}
            label={d.label}
            hint={d.hint}
            value={values[d.key]}
            onChange={(v) => setValues((s) => ({ ...s, [d.key]: v }))}
          />
        ))}
      </fieldset>

      <TextAreaField
        className="mt-6"
        label="Comments"
        hint={`${first} sees this word for word. Name one thing to keep and one to change.`}
        rows={5}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        onBlur={() => comments && setTouched(true)}
        error={commentError}
        inputClassName="ruled !py-0"
        required
      />

      {error ? (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          loadingLabel="Submitting…"
          icon={<Send size={17} aria-hidden="true" />}
        >
          Submit feedback
        </Button>
      </div>
    </form>
  );
}
