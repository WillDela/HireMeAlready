"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import type { Experience, ParsedResume } from "@/lib/mock";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";

export type EditableResume = Pick<ParsedResume, "summary" | "skills" | "experience">;

/** Edit fields for what the parser pulled out of a resume. */
export function ParsedResumeEditor({
  value,
  onChange,
}: {
  value: EditableResume;
  onChange: (next: EditableResume) => void;
}) {
  const [draft, setDraft] = useState("");
  const skillId = useId();

  function addSkill() {
    const s = draft.trim();
    if (!s || value.skills.includes(s)) return;
    onChange({ ...value, skills: [...value.skills, s] });
    setDraft("");
  }

  function onSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  }

  function updateExp(id: string, patch: Partial<Experience>) {
    onChange({ ...value, experience: value.experience.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  }

  return (
    <div className="space-y-8">
      <TextAreaField
        label="Summary"
        rows={3}
        value={value.summary}
        onChange={(e) => onChange({ ...value, summary: e.target.value })}
        hint="Interviewers read this first."
      />

      <fieldset>
        <legend className="field-label">Skills</legend>
        <ul className="flex flex-wrap gap-2" aria-label="Skills">
          {value.skills.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-[3px] border-[1.5px] border-edge bg-paper-2 py-1 pr-1 pl-2.5 text-[0.875rem] font-medium">
              {s}
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded-[3px] text-ink-2 hover:bg-[color-mix(in_oklch,var(--ink)_10%,transparent)] hover:text-ink"
                aria-label={`Remove ${s}`}
                onClick={() => onChange({ ...value, skills: value.skills.filter((x) => x !== s) })}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {value.skills.length === 0 ? (
          <p className="text-[0.875rem] text-ink-2">No skills yet. Add the ones you want interviewers to ask about.</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <label htmlFor={skillId} className="visually-hidden">
            Add a skill
          </label>
          <input
            id={skillId}
            className="input max-w-xs"
            placeholder="Add a skill"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onSkillKey}
          />
          <Button variant="secondary" onClick={addSkill} disabled={!draft.trim()} icon={<Plus size={16} aria-hidden="true" />} className="!min-h-11">
            Add
          </Button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Experience</legend>
        <ol className="space-y-4">
          {value.experience.map((exp, i) => (
            <li key={exp.id} className="rounded-[3px] border-[1.5px] border-edge p-4">
              <p className="visually-hidden">Role {i + 1}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Title" value={exp.title} onChange={(e) => updateExp(exp.id, { title: e.target.value })} />
                <TextField label="Company" value={exp.company} onChange={(e) => updateExp(exp.id, { company: e.target.value })} />
                <TextField label="Start" value={exp.start} onChange={(e) => updateExp(exp.id, { start: e.target.value })} />
                <TextField label="End" value={exp.end} onChange={(e) => updateExp(exp.id, { end: e.target.value })} />
              </div>
              <TextAreaField
                className="mt-4"
                label="Highlights"
                rows={3}
                value={exp.bullets.join("\n")}
                onChange={(e) => updateExp(exp.id, { bullets: e.target.value.split("\n") })}
                hint="One per line."
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, experience: value.experience.filter((x) => x.id !== exp.id) })}
                  aria-label={`Remove ${exp.title} at ${exp.company}`}
                >
                  Remove role
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          icon={<Plus size={15} aria-hidden="true" />}
          onClick={() =>
            onChange({
              ...value,
              experience: [
                ...value.experience,
                { id: `new-${Date.now()}`, title: "", company: "", start: "", end: "", bullets: [] },
              ],
            })
          }
        >
          Add a role
        </Button>
      </fieldset>
    </div>
  );
}
