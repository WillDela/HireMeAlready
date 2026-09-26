"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import type { PeerWrapUp as WrapUp } from "@/lib/contracts";
import { ApiError, apiFetch, useApiResource } from "@/lib/use-api";
import { InterviewerFeedback } from "@/components/call/InterviewerFeedback";
import type { FeedbackValues } from "@/components/FeedbackForm";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned } from "@/components/ui/States";

// The peer branch of /call/[id]/wrap-up: after a matched interview, the interviewer
// rates the candidate and the candidate waits for that feedback. Mock ids stay in page.tsx.

export function PeerWrapUp({ id }: { id: string }) {
  const url = `/api/interviews/${id}/feedback`;
  const wrapUp = useApiResource<WrapUp>(url, {
    // The candidate's screen updates once the interviewer sends their feedback.
    pollWhile: (w) => w.role === "INTERVIEWEE" && !w.feedbackSent && w.status === "COMPLETED",
    pollMs: 5000,
  });
  if (wrapUp.error?.status === 404) notFound();

  const data = wrapUp.data;
  if (!data) {
    return wrapUp.status === "error" ? (
      <div className="mx-auto max-w-lg">
        <ErrorReturned title="Couldn't open this interview" onRetry={wrapUp.retry}>
          Check your connection and try again.
        </ErrorReturned>
      </div>
    ) : (
      <p role="status" className="flex items-center justify-center gap-3 text-[1.0625rem] font-semibold">
        <Spinner size={22} /> Filing your interview…
      </p>
    );
  }

  if (data.status === "PENDING" || data.status === "ABANDONED") {
    return (
      <div className="sheet mx-auto max-w-lg">
        <title>Interview ended · hire-me-already</title>
        <EmptyFolder
          title="This interview didn't start"
          action={
            <>
              <ButtonLink href="/practice/live">Find someone else</ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">
                Back to Home
              </ButtonLink>
            </>
          }
        >
          The call ended before you were connected, so there&apos;s nothing to rate and nothing was filed.
        </EmptyFolder>
      </div>
    );
  }

  return data.role === "INTERVIEWER" ? (
    <RateCandidate wrapUp={data} url={url} onSent={wrapUp.mutate} />
  ) : (
    <AwaitFeedback wrapUp={data} />
  );
}

function RateCandidate({ wrapUp, url, onSent }: { wrapUp: WrapUp; url: string; onSent: (w: WrapUp) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: FeedbackValues) {
    setSubmitting(true);
    setError(null);
    try {
      onSent(await apiFetch<WrapUp>(url, { method: "POST", body: JSON.stringify(values) }));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status < 500
          ? err.message
          : "Your feedback didn't send. It's still here; submit again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <title>Leave feedback · hire-me-already</title>
      <InterviewerFeedback
        candidateName={wrapUp.partner.name}
        practicingFor={[wrapUp.jobTitle, wrapUp.company].filter(Boolean).join(" at ") || null}
        historyHref={`/history/${wrapUp.interviewId}`}
        sent={wrapUp.feedbackSent}
        submitting={submitting}
        error={error}
        onSubmit={submit}
      />
    </>
  );
}

function AwaitFeedback({ wrapUp }: { wrapUp: WrapUp }) {
  const first = wrapUp.partner.name.split(" ")[0];
  const done = wrapUp.feedbackSent;

  return (
    <section aria-labelledby="filed-heading" className="sheet mx-auto max-w-lg px-6 py-10 text-center sm:px-10">
      <title>Interview filed · hire-me-already</title>
      <Stamp tone="ink" land rotate={-8} className="text-[1.5rem]">
        Filed
      </Stamp>
      <h1 id="filed-heading" className="mt-6 text-[1.625rem] font-extrabold">
        Nice work. Your interview is filed
      </h1>
      <p className="mt-2 text-ink-2" role="status" aria-live="polite">
        {done
          ? `${first}'s feedback is in: ratings for communication, technical skill and confidence, plus their comments.`
          : `${first} is rating your answers now. Their feedback lands in your interview file, usually within a few minutes.`}
      </p>
      {!done ? (
        <p className="mt-5 flex items-center justify-center gap-2 text-[0.9375rem] font-semibold text-ink-2">
          <Spinner size={16} /> Waiting for {first}&apos;s feedback…
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/history/${wrapUp.interviewId}`}>{done ? "Read your feedback" : "Go to your interview file"}</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">
          Back to Home
        </ButtonLink>
      </div>
    </section>
  );
}
