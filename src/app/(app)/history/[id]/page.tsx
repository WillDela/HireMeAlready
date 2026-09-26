"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, Check, Lightbulb, Mail, UserPlus } from "lucide-react";
import { useApiResource } from "@/lib/use-api";
import type { HistoryDetail as InterviewDetail } from "@/lib/views";
import { TypeTag } from "@/components/InterviewTable";
import { ScoreCard } from "@/components/ScoreCard";
import { TranscriptView } from "@/components/TranscriptView";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { ScoreStamp, Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

type Tab = "summary" | "transcript" | "analysis" | "feedback" | "people";

function Summary({ iv, onJump }: { iv: InterviewDetail; onJump: () => void }) {
  return (
    <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <h2 className="text-[1.125rem] font-bold">Summary</h2>
        <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-relaxed">{iv.summary}</p>
        {iv.keyMoments.length ? (
          <>
            <h3 className="mt-8 text-[1rem] font-bold">Key moments</h3>
            <ol className="mt-3 space-y-3">
              {iv.keyMoments.map((m) => (
                <li key={m.time} className="flex gap-4">
                  <button
                    type="button"
                    onClick={onJump}
                    className="tnum h-fit flex-none rounded-[3px] bg-paper-2 px-2 py-0.5 text-[0.8125rem] font-semibold underline-offset-2 hover:underline"
                    aria-label={`${m.time}, open transcript`}
                  >
                    {m.time}
                  </button>
                  <span className="text-[0.9375rem]">{m.text}</span>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </div>
      <dl className="h-fit space-y-3 rounded-[3px] bg-paper-2 p-5 text-[0.9375rem]">
        {[
          ["Type", iv.type === "ai" ? "AI interview" : "Live, with a person"],
          ["Date", iv.dateLabel],
          ["Length", iv.duration],
          ["Your role", iv.yourRole === "interviewee" ? "Interviewee" : "Interviewer"],
          ["Partner", iv.partner],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">{k}</dt>
            <dd className="tnum font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Analysis({ iv }: { iv: InterviewDetail }) {
  if (!iv.analysis && iv.analysisStatus === "pending") {
    return (
      <EmptyFolder title="Scoring your answers">
        The analysis usually takes a minute or two after the interview ends. This page updates when it&apos;s ready.
      </EmptyFolder>
    );
  }
  if (!iv.analysis && iv.analysisStatus === "failed") {
    return (
      <EmptyFolder title="We couldn't score this one">
        Something went wrong reading this interview. Your transcript and any interviewer feedback are still in the other tabs.
      </EmptyFolder>
    );
  }
  if (!iv.analysis) {
    return (
      <EmptyFolder title="Not scored">
        You were the interviewer in this one, so there&apos;s no analysis of your answers. Your notes and feedback are in the other tabs.
      </EmptyFolder>
    );
  }
  const a = iv.analysis;
  return (
    <div className="p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        {a.dimensions.map((d) => (
          <ScoreCard key={d.name} {...d} className="!shadow-none border-[1.5px] border-edge" />
        ))}
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="str">
          <h2 id="str" className="text-[1.125rem] font-bold">
            What worked
          </h2>
          <ul className="mt-4 space-y-3">
            {a.strengths.map((s) => (
              <li key={s} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                <Check size={18} aria-hidden="true" className="mt-0.5 flex-none text-ink" />
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="imp">
          <h2 id="imp" className="text-[1.125rem] font-bold">
            What to work on
          </h2>
          <ul className="mt-4 space-y-5">
            {a.improvements.map((w) => (
              <li key={w.point} className="text-[0.9375rem] leading-relaxed">
                <p className="font-semibold">{w.point}</p>
                {w.tryThis ? (
                  <p className="mt-1.5 flex gap-2 text-ink-2">
                    <Lightbulb size={17} aria-hidden="true" className="mt-0.5 flex-none text-manila-ink" />
                    <span>
                      <span className="hl rounded-[2px] px-1 font-semibold">Try this</span> {w.tryThis}
                    </span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Feedback({ iv }: { iv: InterviewDetail }) {
  if (!iv.feedback) {
    return iv.type === "ai" ? (
      <EmptyFolder title="No interviewer feedback on AI interviews">
        The AI&apos;s scoring is in the AI Analysis tab. Practice with a person to get written feedback from a human.
      </EmptyFolder>
    ) : iv.yourRole === "interviewer" ? (
      <EmptyFolder title="You gave the feedback on this one">
        Feedback you write as an interviewer goes to the candidate&apos;s file.
      </EmptyFolder>
    ) : (
      <EmptyFolder title={`Waiting for ${iv.partner.split(" ")[0]}'s feedback`}>
        Interviewers usually send it within a day. We&apos;ll notify you when it arrives.
      </EmptyFolder>
    );
  }
  const f = iv.feedback;
  const rows: [string, number][] = [
    ["Communication", f.ratings.communication],
    ["Technical skill", f.ratings.technical],
    ["Confidence", f.ratings.confidence],
  ];
  return (
    <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <section aria-labelledby="ratings">
        <h2 id="ratings" className="text-[1.125rem] font-bold">
          Ratings from {f.from.split(" ")[0]}
        </h2>
        <dl className="mt-4 space-y-4">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="flex justify-between text-[0.9375rem] font-semibold">
                {k}
                <span className="tnum">{v} / 5</span>
              </dt>
              <dd className="mt-1.5 grid grid-cols-5 gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={n <= v ? "h-2 rounded-[1px] bg-ink" : "h-2 rounded-[1px] bg-[color-mix(in_oklch,var(--ink)_12%,transparent)]"} />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="comments">
        <h2 id="comments" className="text-[1.125rem] font-bold">
          Comments
        </h2>
        <figure className="ruled mt-4 rounded-[3px] border-[1.5px] border-edge px-5 py-3.5">
          <blockquote className="text-[1.0625rem] leading-[1.75rem]">{f.comments}</blockquote>
          <figcaption className="mt-2 flex items-center gap-2 text-[0.875rem] font-semibold text-ink-2">
            <Avatar name={f.from} initials={f.from.split(" ").map((p) => p[0]).join("")} size={24} />
            {f.from}
          </figcaption>
        </figure>
      </section>
    </div>
  );
}

function Transcript({ iv }: { iv: InterviewDetail }) {
  if (iv.transcript.length) return <TranscriptView turns={iv.transcript} />;
  return iv.transcriptStatus === "failed" ? (
    <EmptyFolder title="No transcript for this one">
      We couldn&apos;t get a transcript from the recording. Any analysis and feedback are still in the other tabs.
    </EmptyFolder>
  ) : (
    <EmptyFolder title="Transcript on its way">
      It&apos;s written up a minute or two after the interview ends. This page updates when it&apos;s ready.
    </EmptyFolder>
  );
}

function People({ iv }: { iv: InterviewDetail }) {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  if (iv.people.length === 0) {
    return (
      <EmptyFolder title="Just you and the AI">
        Live interviews list the other person here, so you can stay in touch or practice again.
      </EmptyFolder>
    );
  }
  return (
    <ul className="divide-y divide-edge">
      {iv.people.map((p) => (
        <li key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:px-7">
          <div className="flex flex-1 items-center gap-3.5">
            <Avatar name={p.name} initials={p.initials} size={48} />
            <div className="min-w-0">
              <p className="font-bold">{p.name}</p>
              <p className="text-[0.875rem] text-ink-2">{p.headline}</p>
              {p.contact ? (
                <a href={`mailto:${p.contact}`} className="mt-0.5 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold underline">
                  <Mail size={14} aria-hidden="true" />
                  {p.contact}
                </a>
              ) : null}
            </div>
          </div>
          <div className="pl-[3.875rem] sm:pl-0">
            {p.isFriend ? (
              <span className="tag text-ink">Friends</span>
            ) : sent[p.id] || p.requested ? (
              <Stamp tone="ink" land rotate={-5} className="text-[0.75rem]">
                Request sent
              </Stamp>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={<UserPlus size={15} aria-hidden="true" />}
                aria-label={`Add ${p.name} as a friend`}
                onClick={() => setSent((s) => ({ ...s, [p.id]: true }))}
              >
                Add friend
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("summary");
  // Keep checking while the transcript or analysis is still being written.
  const { status, data: iv, error, retry } = useApiResource<InterviewDetail>(`/api/interviews/${id}`, {
    pollWhile: (d) => d.transcriptStatus === "pending" || d.analysisStatus === "pending",
    pollMs: 5000,
  });
  if (error?.status === 404) notFound();

  return (
    <>
      <title>{`${iv?.company ?? "Interview"} · History`}</title>
      <Link href="/history" className="-mt-2 mb-4 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-manila-ink hover:text-ink">
        <ArrowLeft size={17} aria-hidden="true" /> All interviews
      </Link>

      {iv ? (
        <header className="mb-8 flex items-start justify-between gap-4 sm:items-end">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[0.875rem] text-manila-ink">
              <TypeTag type={iv.type} />
              <time dateTime={iv.date}>{iv.dateLabel}</time>
              <span aria-hidden="true">·</span>
              <span className="tnum">{iv.duration}</span>
            </p>
            <h1 className="wide mt-3 text-[2rem] leading-[1.02] font-extrabold tracking-[-0.025em] md:text-[2.75rem]">
              {iv.company}
            </h1>
            <p className="mt-1.5 text-[1.0625rem] text-manila-ink">
              {iv.jobTitle} · {iv.type === "ai" ? "with the AI interviewer" : `with ${iv.partner}`}
            </p>
          </div>
          <div className="flex-none pt-8 sm:pt-0 sm:pr-4">
            {status === "ready" && iv.score !== null ? (
              <>
                <span className="sm:hidden">
                  <ScoreStamp score={iv.score} size={84} land />
                </span>
                <span className="hidden sm:inline">
                  <ScoreStamp score={iv.score} size={128} land />
                </span>
              </>
            ) : status === "ready" ? (
              <Stamp tone="muted" rotate={-6} className="text-[1rem]">
                Not scored
              </Stamp>
            ) : null}
          </div>
        </header>
      ) : null}

      <StateView
        status={status}
        loading={<LoadingSheets label="Opening the file…" layout="detail" />}
        error={
          <ErrorReturned title="This interview didn't load" onRetry={retry}>
            The recording and transcript are safe. Try again in a moment.
          </ErrorReturned>
        }
        empty={
          <div className="sheet">
            <EmptyFolder title="This file is empty" action={<ButtonLink href="/history" variant="secondary">Back to History</ButtonLink>}>
              The transcript and analysis were deleted at your request. The date and company stay for your records.
            </EmptyFolder>
          </div>
        }
      >
        {iv ? (
          <FolderTabs
            label="Interview file"
            value={tab}
            onChange={(t) => setTab(t as Tab)}
            tabs={[
              { id: "summary", label: "Summary" },
              { id: "transcript", label: "Transcript" },
              { id: "analysis", label: "AI Analysis" },
              { id: "feedback", label: "Interviewer Feedback" },
              { id: "people", label: "People", count: iv.people.length },
            ]}
          >
            {tab === "summary" ? <Summary iv={iv} onJump={() => setTab("transcript")} /> : null}
            {tab === "transcript" ? <Transcript iv={iv} /> : null}
            {tab === "analysis" ? <Analysis iv={iv} /> : null}
            {tab === "feedback" ? <Feedback iv={iv} /> : null}
            {tab === "people" ? <People iv={iv} /> : null}
          </FolderTabs>
        ) : null}
      </StateView>
    </>
  );
}
