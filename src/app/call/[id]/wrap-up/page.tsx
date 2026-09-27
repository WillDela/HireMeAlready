"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { candidateResume, type CallSession } from "@/lib/mock";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { useApiResource } from "@/lib/use-api";
import { useCallSession } from "@/lib/use-call-session";
import type { HistoryDetail } from "@/lib/views";
import { InterviewerFeedback } from "@/components/call/InterviewerFeedback";
import { Wordmark } from "@/components/shell/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned } from "@/components/ui/States";
import { StatePreview } from "@/components/ui/StatePreview";
import { PeerWrapUp } from "./PeerWrapUp";

const processingSteps = ["Transcribing the recording", "Scoring your answers", "Writing your feedback"];

/** Where the real finalize pipeline is: 0 transcript, 1 analysis, 3 done. */
function stepOf(detail: HistoryDetail): number {
  if (detail.transcriptStatus !== "ready") return 0;
  if (detail.analysisStatus !== "ready") return 1;
  return processingSteps.length;
}

const hasFailed = (d: HistoryDetail) => d.transcriptStatus === "failed" || d.analysisStatus === "failed";
const isSettled = (d: HistoryDetail) => hasFailed(d) || d.analysisStatus === "ready";

/** Polls the interview until its transcript and analysis are filed (or fail). */
function LiveProcessing({ id, hold }: { id: string; hold: boolean }) {
  const { data, status, retry } = useApiResource<HistoryDetail>(`/api/interviews/${id}`, {
    pollWhile: (d) => !isSettled(d),
  });

  if (status === "error" && !data) {
    return (
      <div className="mx-auto max-w-lg">
        <ErrorReturned title="We couldn't check on this interview" onRetry={retry}>
          Your interview is saved. Check your connection and try again.
        </ErrorReturned>
      </div>
    );
  }
  if (data && hasFailed(data)) {
    const answered = data.transcript.some((turn) => turn.isYou);
    return data.transcriptStatus === "ready" && !answered ? (
      <div className="sheet mx-auto max-w-lg">
        <EmptyFolder title="Nothing to score" action={<ButtonLink href="/practice/ai">Try again</ButtonLink>}>
          We didn&apos;t catch any answers in this interview, so there&apos;s nothing to score. Check your
          microphone and give it another go.
        </EmptyFolder>
      </div>
    ) : (
      <div className="mx-auto max-w-lg">
        <ErrorReturned title="We couldn't process this interview">
          Something went wrong while we were getting the transcript or scoring it. Your interview is still in{" "}
          <Link href={`/history/${id}`} className="font-semibold underline">
            your history
          </Link>
          .
        </ErrorReturned>
      </div>
    );
  }
  return <Processing historyId={id} step={data ? stepOf(data) : 0} hold={hold} />;
}

/** The design preview's version: steps on a timer (mock interviews only). */
function MockProcessing({ historyId, hold }: { historyId: string; hold: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (hold || step >= processingSteps.length) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), 1300);
    return () => window.clearTimeout(t);
  }, [step, hold]);
  return <Processing historyId={historyId} step={step} hold={hold} />;
}

function Processing({ historyId, step, hold }: { historyId: string; step: number; hold: boolean }) {
  const router = useRouter();
  const done = step >= processingSteps.length;

  useEffect(() => {
    if (hold || !done) return;
    const t = window.setTimeout(() => router.push(`/history/${historyId}`), 1800);
    return () => window.clearTimeout(t);
  }, [done, hold, historyId, router]);

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
        <Link href="/practice" className="font-semibold text-ink-2 underline hover:text-ink">
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
  const { status, session } = useCallSession(id);
  if (status === "missing") notFound();
  if (!session) {
    return (
      <div role="status" className="desk grid min-h-dvh place-items-center">
        <Spinner size={22} />
      </div>
    );
  }
  // Mock sessions point at mock history ids; real ones at themselves.
  const isMock = session.historyId !== id;

  return (
    <div className="desk min-h-dvh">
      <header className="mx-auto flex max-w-2xl px-4 pt-6 text-ink sm:px-0">
        <Link href="/practice" aria-label="hire-me-already, home">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="px-4 pt-10 pb-20 sm:px-6">
        {/* A real peer interview rates/awaits feedback; mock and AI interviews show processing. */}
        {!isMock && session.type === "human" ? (
          <PeerWrapUp id={id} />
        ) : (
          <SessionWrapUp id={id} session={session} isMock={isMock} />
        )}
      </main>
    </div>
  );
}

function SessionWrapUp({ id, session, isMock }: { id: string; session: CallSession; isMock: boolean }) {
  const [role] = useRole();
  const forced = useForcedState();

  // Only mock sessions reach here as human interviews; real ones go to PeerWrapUp.
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
      ) : isMock ? (
        <MockProcessing historyId={session.historyId} hold={forced === "loading"} />
      ) : (
        <LiveProcessing id={id} hold={forced === "loading"} />
      )}
      <StatePreview className="fixed right-3 bottom-3 z-40" />
    </>
  );
}
