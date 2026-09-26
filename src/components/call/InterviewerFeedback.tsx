"use client";

import { FeedbackForm, type FeedbackValues } from "@/components/FeedbackForm";
import { ButtonLink } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";

/** Wrap-up for the interviewer: rate the candidate, then a thank-you once it's sent. */
export function InterviewerFeedback({
  candidateName,
  practicingFor,
  historyHref,
  sent,
  submitting,
  error,
  onSubmit,
}: {
  candidateName: string;
  /** The role they're preparing for, if known. */
  practicingFor: string | null;
  historyHref: string;
  sent: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: FeedbackValues) => void;
}) {
  const first = candidateName.split(" ")[0];

  if (sent) {
    return (
      <section aria-labelledby="sent-heading" className="sheet mx-auto max-w-lg px-6 py-10 text-center sm:px-10">
        <Stamp tone="ink" land rotate={-8} className="text-[1.5rem]">
          Submitted
        </Stamp>
        <h1 id="sent-heading" className="mt-6 text-[1.625rem] font-extrabold">
          Thanks for interviewing {first}
        </h1>
        <p className="mt-2 text-ink-2" role="status">
          Your ratings and comments are in {first}&apos;s file now.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard">Back to Home</ButtonLink>
          <ButtonLink href={historyHref} variant="secondary">
            See this interview
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="fb-heading" className="mx-auto max-w-2xl">
      <h1 id="fb-heading" className="wide text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] md:text-[2.5rem]">
        How did {first} do?
      </h1>
      <p className="mt-2.5 max-w-[56ch] text-manila-ink">
        Rate honestly. {practicingFor ? `${first} is practicing for ${practicingFor}, and kind` : "Kind"}, specific feedback is
        the most useful thing you can give.
      </p>
      <div className="sheet mt-8 p-6 sm:p-8">
        <FeedbackForm candidateName={candidateName} submitting={submitting} error={error} onSubmit={onSubmit} />
      </div>
    </section>
  );
}
