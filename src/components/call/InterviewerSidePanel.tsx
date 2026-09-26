"use client";

import { useEffect, useId, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { sourceLabel, type ParsedResume, type Question } from "@/lib/mock";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { Stamp } from "@/components/ui/Stamp";

type Candidate = ParsedResume & { name: string; initials: string; target: string };

function ResumeTab({ candidate }: { candidate: Candidate }) {
  return (
    <div className="space-y-6 p-5">
      <section>
        <h3 className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Summary</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed">{candidate.summary}</p>
      </section>
      <section>
        <h3 className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Skills</h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {candidate.skills.map((s) => (
            <li key={s} className="rounded-[3px] bg-paper-2 px-2 py-1 text-[0.8125rem] font-medium">
              {s}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Experience</h3>
        <ol className="mt-2 space-y-4">
          {candidate.experience.map((e) => (
            <li key={e.id}>
              <p className="font-bold">{e.title}</p>
              <p className="text-[0.875rem] text-ink-2">
                {e.company} · {e.start}–{e.end}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.875rem] leading-relaxed marker:text-ink-3">
                {e.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Education</h3>
        {candidate.education.map((ed) => (
          <p key={ed.school} className="mt-1.5 text-[0.9375rem]">
            {ed.degree}, {ed.school} ({ed.year})
          </p>
        ))}
      </section>
    </div>
  );
}

function QuestionsTab({
  questions,
  asked,
  onToggle,
}: {
  questions: Question[];
  asked: Record<string, string>;
  onToggle: (id: string) => void;
}) {
  const count = Object.keys(asked).length;
  const base = useId();
  return (
    <div className="p-5">
      <p className="text-[0.875rem] text-ink-2" aria-live="polite">
        <span className="font-bold text-ink">{count}</span> of {questions.length} asked. Suggested from the company and
        role; ask in any order.
      </p>
      <ul className="mt-4 divide-y divide-edge">
        {questions.map((q) => {
          const time = asked[q.id];
          const id = `${base}-${q.id}`;
          return (
            <li key={q.id} className="flex items-start gap-3 py-3.5">
              <input id={id} type="checkbox" className="check" checked={Boolean(time)} onChange={() => onToggle(q.id)} />
              <div className="min-w-0 flex-1">
                <label htmlFor={id} className={cn("block text-[0.9375rem] leading-snug", time && "text-ink-2")}>
                  {q.text}
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="tag text-manila-ink">{sourceLabel[q.source]}</span>
                  {time ? (
                    <Stamp land tone="ink" rotate={-6} className="text-[0.6875rem]">
                      Asked {time}
                    </Stamp>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NotesTab({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  const id = useId();
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!notes) return;
    const t = window.setTimeout(() => setSaved("saved"), 700);
    return () => window.clearTimeout(t);
  }, [notes]);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="field-label !mb-0">
          Private notes
        </label>
        <span className="text-[0.8125rem] text-ink-2" role="status">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : "Only you see these"}
        </span>
      </div>
      <textarea
        id={id}
        value={notes}
        onChange={(e) => {
          setSaved("saving");
          onChange(e.target.value);
        }}
        placeholder="What they said, what to probe, what to put in feedback…"
        className="input ruled mt-2 min-h-[18rem] flex-1 !py-0"
      />
    </div>
  );
}

/**
 * The candidate's file, open beside the call. Interviewer only.
 * Desktop: a collapsible column. Mobile: a sheet over the call.
 */
export function InterviewerSidePanel({
  id,
  open,
  onToggle,
  candidate,
  questions,
  elapsed,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  candidate: Candidate;
  questions: Question[];
  elapsed: string;
}) {
  const [tab, setTab] = useState("questions");
  const [asked, setAsked] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  function toggle(qid: string) {
    setAsked((a) => {
      const next = { ...a };
      if (next[qid]) delete next[qid];
      else next[qid] = elapsed;
      return next;
    });
  }

  if (!open) {
    return (
      <div className="hidden border-l border-night-3 lg:flex">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-controls={id}
          className="flex w-12 flex-col items-center gap-3 bg-manila-deep pt-5 text-manila-ink surface-day hover:bg-manila"
        >
          <ChevronRight size={18} aria-hidden="true" className="rotate-180" />
          <span className="cond text-[0.75rem] font-bold tracking-[0.12em] uppercase [writing-mode:vertical-rl]">
            Open candidate file
          </span>
        </button>
      </div>
    );
  }

  const asked_count = Object.keys(asked).length;

  return (
    <aside
      id={id}
      aria-label={`Candidate file: ${candidate.name}`}
      className={cn(
        "surface-day z-30 flex flex-col bg-manila",
        "fixed inset-x-0 bottom-0 max-h-[78dvh] rounded-t-[10px] shadow-[0_-18px_40px_-12px_oklch(0.05_0.02_266/0.7)]",
        "lg:static lg:max-h-none lg:w-[24rem] lg:rounded-none lg:shadow-none xl:w-[27rem]",
      )}
    >
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.25rem] font-extrabold tracking-[-0.01em]">
            <span className="visually-hidden">Candidate file: </span>
            {candidate.name}
          </h2>
          <p className="truncate text-[0.875rem] text-manila-ink">{candidate.target}</p>
        </div>
        <button type="button" className="icon-btn -mr-2" onClick={onToggle} aria-label="Close candidate file" aria-expanded aria-controls={id}>
          <X size={20} aria-hidden="true" className="lg:hidden" />
          <ChevronRight size={20} aria-hidden="true" className="hidden lg:block" />
        </button>
      </div>

      <FolderTabs
        label="Candidate file"
        value={tab}
        onChange={setTab}
        className="flex min-h-0 flex-1 flex-col px-3"
        panelClassName="min-h-0 flex-1 overflow-y-auto !rounded-b-none"
        tabs={[
          { id: "resume", label: "Resume" },
          { id: "questions", label: "Questions", count: `${asked_count}/${questions.length}` },
          { id: "notes", label: "Notes" },
        ]}
      >
        {tab === "resume" ? <ResumeTab candidate={candidate} /> : null}
        {tab === "questions" ? <QuestionsTab questions={questions} asked={asked} onToggle={toggle} /> : null}
        {tab === "notes" ? <NotesTab notes={notes} onChange={setNotes} /> : null}
      </FolderTabs>
    </aside>
  );
}
