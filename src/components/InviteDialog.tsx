"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import type { InterviewRole, InvitationsResponse, PersonSummary } from "@/lib/contracts";
import { cn } from "@/lib/cn";
import { useRole } from "@/lib/prefs";
import { apiFetch, ApiError } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";

/** Invite a friend into a practice interview: pick your side of the table and what it's for. */
export function InviteDialog({
  person,
  onClose,
  onSent,
}: {
  person: PersonSummary | null;
  onClose: () => void;
  onSent: (next: InvitationsResponse) => void;
}) {
  const [defaultRole] = useRole();
  const [chosen, setChosen] = useState<InterviewRole | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = chosen ?? (defaultRole === "interviewer" ? "INTERVIEWER" : "INTERVIEWEE");
  const firstName = person?.name.split(" ")[0] ?? "";

  function close() {
    setChosen(null);
    setJobTitle("");
    setCompany("");
    setError(null);
    onClose();
  }

  async function send() {
    if (!person) return;
    setSending(true);
    setError(null);
    try {
      const next = await apiFetch<InvitationsResponse>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          userId: person.id,
          role,
          jobTitle: jobTitle.trim() || undefined,
          company: company.trim() || undefined,
        }),
      });
      onSent(next);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The invite didn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  const options = [
    { value: "INTERVIEWEE", title: "Interview me", body: `${firstName} asks the questions and gives you feedback.` },
    { value: "INTERVIEWER", title: `I'll interview ${firstName}`, body: `You ask. See their resume and suggested questions.` },
  ] as const;

  return (
    <Dialog
      open={person !== null}
      onClose={close}
      title={`Invite ${firstName} to interview`}
      description={`${firstName} gets a notification. Once they accept, you'll both meet in the lobby.`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <fieldset>
          <legend className="field-label">Your side of the table</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((opt) => {
              const checked = role === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-[4px] border-2 p-4 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                    checked ? "border-ink bg-ink text-paper" : "border-edge hover:border-ink-2",
                  )}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={opt.value}
                    checked={checked}
                    onChange={() => setChosen(opt.value)}
                    className="visually-hidden"
                  />
                  <span className="pr-6 font-bold">{opt.title}</span>
                  <span className={cn("mt-1 text-[0.875rem]", checked ? "opacity-85" : "text-ink-2")}>{opt.body}</span>
                  {checked ? <Check size={18} aria-hidden="true" className="absolute top-3.5 right-3.5" /> : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        <p className="mt-6 text-[0.9375rem] font-bold">
          {role === "INTERVIEWEE" ? "What are you preparing for?" : `What is ${firstName} preparing for?`}{" "}
          <span className="font-normal text-ink-2">(optional)</span>
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <TextField label="Company" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} />
          <TextField label="Job title" value={jobTitle} maxLength={120} onChange={(e) => setJobTitle(e.target.value)} />
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-[0.9375rem] text-stamp">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={sending} icon={<Send size={16} aria-hidden="true" />}>
            Send invite
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
