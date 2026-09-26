"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { callSessions, candidateResume } from "@/lib/mock";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { InterviewerFeedback } from "@/components/call/InterviewerFeedback";
import { Wordmark } from "@/components/shell/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned } from "@/components/ui/States";
import { StatePreview } from "@/components/ui/StatePreview";
import { PeerWrapUp } from "./PeerWrapUp";

const processingSteps = ["Transcribing the recording", "Scoring your answers", "Writing your feedback"];

function Processing({ historyId, hold }: { historyId: string; hold: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const done = step >= processingSteps.length;

  useEffect(() => {
    if (hold) return;
    if (done) {
      const t = window.setTimeout(() => router.push(`/history/${historyId}`), 1800);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 1300);
    return () => window.clearTimeout(t);
  }, [step, done, hold, historyId, router]);

  return (
    <section aria-labelledby="proc-heading" className="sheet relative mx-auto max-w-lg overflow-hidden px-6 py-10 sm:px-10">
      <h1 id="proc-heading" className="wide text-[1.875rem] leading-[1.05] font-extrabold tracking-[-0.02em]">
        {done ? "Your results are filed" : "Processing your results"}
      </h1>
      <p className="mt-2 text-ink-2" role="status" aria-live="polite">
        {done ? "Opening your interview file…" : "This usually takes under a minute. You can leave; we'll notify you."}
      </p>
      <ol className="mt-8 space-y-4">
        {processingSteps.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3 text-[1rem]", i > step && "text-ink-3")}>
            {i < step ? (
              <Check size={20} aria-hidden="true" className="text-ink" />
            ) : i === step && !done ? (
              <Spinner size={20} />
            ) : (
              <span aria-hidden="true" className="h-5 w-5 rounded-full border-[1.5px] border-edge" />
            )}
            <span className={cn(i === step && !done && "font-semibold")}>{s}</span>
            {i < step ? <span className="visually-hidden"> (done)</span> : null}
          </li>
        ))}
      </ol>
      {done ? (
        <Stamp tone="ink" land rotate={-10} className="absolute right-8 bottom-8 text-[1.75rem]">
          Filed
        </Stamp>
      ) : null}
      <div className="mt-10 flex gap-4 text-[0.9375rem]">
        <Link href={`/history/${historyId}`} className="font-semibold underline">
          Go to the file now
        </Link>
        <Link href="/dashboard" className="font-semibold text-ink-2 underline hover:text-ink">
          Back to Home
        </Link>
      </div>
    </section>
  );
}

/** The prototype's interviewer form: pretends to send, and follows the State preview. */
function MockInterviewerFeedback({ historyId }: { historyId: string }) {
  const forced = useForcedState();
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");

  return (
    <InterviewerFeedback
      candidateName={candidateResume.name}
      practicingFor={candidateResume.target.split(" · ")[1] ?? null}
      historyHref={`/history/${historyId}`}
      sent={phase === "sent"}
      submitting={phase === "sending" || forced === "loading"}
      error={forced === "error" ? "Your feedback didn't send. It's still here; submit again." : null}
      onSubmit={() => {
        if (forced === "error") setForcedState(null);
        setPhase("sending");
        window.setTimeout(() => setPhase("sent"), 1000);
      }}
    />
  );
}

export default function WrapUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="desk min-h-dvh">
      <header className="mx-auto flex max-w-2xl px-4 pt-6 text-ink sm:px-0">
        <Link href="/dashboard" aria-label="hire-me-already, home">
          <Wordmark compact />
        </Link>
      </header>
      <main id="main" className="px-4 pt-10 pb-20 sm:px-6">
        {/* Mock ids keep the prototype below; any other id is a finished peer interview. */}
        {callSessions[id] ? <MockWrapUp id={id} /> : <PeerWrapUp id={id} />}
      </main>
    </div>
  );
}

function MockWrapUp({ id }: { id: string }) {
  const session = callSessions[id];
  const [role] = useRole();
  const forced = useForcedState();
  if (!session) notFound();

  const isInterviewer = session.type === "human" && role === "interviewer";

  return (
    <>
      <title>{isInterviewer ? "Leave feedback · hire-me-already" : "Processing · hire-me-already"}</title>
      {isInterviewer ? (
        <MockInterviewerFeedback historyId={session.historyId} />
      ) : forced === "error" ? (
        <div className="mx-auto max-w-lg">
          <ErrorReturned title="We couldn't process this interview" onRetry={() => setForcedState(null)}>
            The recording is saved, so nothing is lost. Try again, or we&apos;ll retry automatically and notify you.
          </ErrorReturned>
        </div>
      ) : forced === "empty" ? (
        <div className="sheet mx-auto max-w-lg">
          <EmptyFolder
            title="Too short to score"
            action={<ButtonLink href={session.type === "ai" ? "/practice/ai" : "/practice/live"}>Try again</ButtonLink>}
          >
            We need at least two answered questions to give you a fair score. Nothing was filed.
          </EmptyFolder>
        </div>
      ) : (
        <Processing historyId={session.historyId} hold={forced === "loading"} />
      )}
      <StatePreview className="fixed right-3 bottom-3 z-40" />
    </>
  );
}
