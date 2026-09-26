"use client";

import { useState, type FormEvent } from "react";
import { reportReasons } from "@/lib/mock";
import { apiFetch } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { Stamp } from "@/components/ui/Stamp";

const MAX = 500;

export function ReportDialog({
  open,
  onClose,
  subject,
  onLeave,
  interviewId,
}: {
  open: boolean;
  onClose: () => void;
  /** Who or what is being reported, e.g. the partner's name or "the AI interviewer". */
  subject: string;
  onLeave?: () => void;
  /** Files a real report against this interview. Without it (mock calls), sending is simulated. */
  interviewId?: string;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason("");
    setDetails("");
    setTouched(false);
    setPhase("form");
    setError(null);
  }

  function close() {
    onClose();
    // Let the close finish before clearing, so the sheet doesn't flash.
    window.setTimeout(reset, 200);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!reason) return;
    setPhase("sending");
    setError(null);
    if (!interviewId) {
      window.setTimeout(() => setPhase("sent"), 900);
      return;
    }
    try {
      await apiFetch(`/api/interviews/${interviewId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      setPhase("sent");
    } catch {
      setError("We couldn't send your report. Check your connection and try again.");
      setPhase("form");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      tone="danger"
      title={phase === "sent" ? "Report sent" : `Report ${subject}`}
      description={phase === "sent" ? undefined : "An admin reviews every report. The call keeps running while you fill this in."}
    >
      {phase === "sent" ? (
        <div>
          <Stamp tone="ink" land rotate={-6} className="text-[1rem]">
            Filed
          </Stamp>
          <p className="mt-4 text-[0.9375rem] text-ink-2">
            Thanks for telling us. You can stay in the call or leave now; leaving won&apos;t affect the report.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {onLeave ? (
              <Button variant="danger-outline" onClick={onLeave}>
                Leave call
              </Button>
            ) : null}
            <Button onClick={close}>Back to call</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <SelectField
            label="Reason"
            placeholder="Choose a reason"
            options={reportReasons}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={touched && !reason ? "Choose the reason that fits best." : null}
            required
          />
          <TextAreaField
            label="What happened? (optional)"
            rows={4}
            maxLength={MAX}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            hint={`${details.length} / ${MAX} characters`}
          />
          {error ? (
            <p role="alert" className="text-[0.875rem] font-semibold text-stamp">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={phase === "sending"} loadingLabel="Sending…">
              {error ? "Try again" : "Send report"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
