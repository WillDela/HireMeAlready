"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { FriendsResponse } from "@/lib/contracts";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { getInterview, lastInterview } from "@/lib/mock";
import { useMockResource } from "@/lib/mock-state";
import { apiFetch, useApiResource } from "@/lib/use-api";
import { FriendRow } from "@/components/FriendRow";
import { TypeTag } from "@/components/InterviewTable";
import { PracticeFolder } from "@/components/PracticeFolder";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PaperClip } from "@/components/ui/PaperClip";
import { ScoreStamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned, LoadingSheets } from "@/components/ui/States";

function LastScore() {
  const detail = getInterview(lastInterview.id);
  return (
    <section aria-labelledby="last-heading" className="sheet relative px-5 pt-11 pb-5 sm:px-6">
      <PaperClip className="left-7 rotate-[-8deg]" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="last-heading" className="text-[1.25rem] leading-snug font-extrabold tracking-[-0.01em]">
            <span className="visually-hidden">Last interview: </span>
            {lastInterview.company}
          </h2>
          <p className="text-[0.875rem] text-ink-2">{lastInterview.jobTitle}</p>
          <p className="mt-2 flex items-center gap-2 text-[0.8125rem] text-ink-2">
            <TypeTag type={lastInterview.type} />
            <time dateTime={lastInterview.date}>{lastInterview.dateLabel}</time>
          </p>
        </div>
        {lastInterview.score !== null ? <ScoreStamp score={lastInterview.score} size={104} land /> : null}
      </div>
      {detail?.analysis ? (
        <p className="mt-5 border-t border-edge pt-4 text-[0.9375rem] leading-relaxed">
          <span className="font-bold">Work on next: </span>
          <mark className="hl box-decoration-clone px-0.5">{detail.analysis.improvements[0].point}</mark>
        </p>
      ) : null}
      <Link
        href={`/history/${lastInterview.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-bold text-ink underline"
      >
        Open the full file <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

function Requests() {
  const { status, data, mutate } = useApiResource<FriendsResponse>("/api/friends");
  const [handled, setHandled] = useState<Record<string, "accepted" | "declined">>({});
  const list = data?.incoming ?? [];

  if (status === "loading" || status === "error") return null;

  async function respond(requestId: string, decision: "ACCEPTED" | "DECLINED") {
    setHandled((h) => ({ ...h, [requestId]: decision === "ACCEPTED" ? "accepted" : "declined" }));
    try {
      const next = await apiFetch<FriendsResponse>(`/api/friends/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: decision }),
      });
      window.setTimeout(() => mutate(next), decision === "DECLINED" ? 0 : 1600);
    } catch {
      setHandled((h) => Object.fromEntries(Object.entries(h).filter(([id]) => id !== requestId)));
    }
  }

  return (
    <section aria-labelledby="req-heading" className="sheet relative">
      <PaperClip className="left-1/2 rotate-[6deg]" />
      <div className="flex items-baseline justify-between border-b border-edge px-5 pt-5 pb-3.5 sm:px-6">
        <h2 id="req-heading" className="text-[1rem] font-bold">
          Friend requests
          {list.length ? <span className="tnum ml-2 text-ink-2">{list.length}</span> : null}
        </h2>
        <Link href="/friends?tab=requests" className="text-[0.875rem] font-semibold text-ink-2 underline hover:text-ink">
          All requests
        </Link>
      </div>
      {list.length === 0 ? (
        <EmptyFolder compact title="No pending requests" action={<ButtonLink href="/friends?tab=find" variant="secondary" size="sm">Find people</ButtonLink>}>
          Friends can invite you straight into a practice interview.
        </EmptyFolder>
      ) : (
        <ul className="divide-y divide-edge">
          {list.map((r) => (
            <FriendRow
              key={r.requestId}
              person={r}
              meta={`Sent ${new Date(r.sentAt).toLocaleDateString()}`}
              actions={
                handled[r.requestId] ? (
                  <p className="text-[0.875rem] font-semibold text-ink-2" role="status">
                    {handled[r.requestId] === "accepted" ? "Added to friends" : "Declined"}
                  </p>
                ) : (
                  <>
                    <Button size="sm" onClick={() => respond(r.requestId, "ACCEPTED")} aria-label={`Accept ${r.name}`}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => respond(r.requestId, "DECLINED")}
                      aria-label={`Decline ${r.name}`}
                    >
                      Decline
                    </Button>
                  </>
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const currentUser = useCurrentUser();
  const { status, retry } = useMockResource(lastInterview);

  return (
    <>
      <title>Home · hire-me-already</title>
      <header className="mb-10">
        <h1 className="wide max-w-[18ch] text-[2.5rem] leading-[0.98] font-extrabold tracking-[-0.03em] md:text-[3.5rem]">
          What are we rehearsing, {currentUser.firstName}?
        </h1>
        <p className="mt-3 max-w-[56ch] text-[1.0625rem] text-manila-ink">
          Every practice interview is built around the company you&apos;re applying to, and filed here with its score.
        </p>
      </header>

      <div className="grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(19rem,22rem)]">
        <PracticeFolder
          title="Practice with AI"
          titleId="ai-folder"
          action={
            <ButtonLink href="/practice/ai" size="lg" className="w-full">
              Set up an AI interview
            </ButtonLink>
          }
          footnote="Available any time. About 25 minutes."
        >
          <p>Name the company and role. The AI researches them, writes the questions, interviews you, and scores every answer.</p>
        </PracticeFolder>

        <PracticeFolder
          title="Practice with a person"
          titleId="live-folder"
          action={
            <ButtonLink href="/practice/live" size="lg" className="w-full">
              Find a partner
            </ButtonLink>
          }
          footnote="Matched using your resume and target role."
        >
          <p>Get matched with someone who plays the interviewer. They see your resume and questions picked for your company.</p>
        </PracticeFolder>

        <div className="pt-2 lg:pt-7">
          {status === "loading" ? (
            <LoadingSheets label="Pulling your latest file…" layout="list" rows={2} />
          ) : status === "error" ? (
            <ErrorReturned compact title="Your latest results didn't load" onRetry={retry}>
              Your interviews are safe. This is a problem on our side.
            </ErrorReturned>
          ) : status === "empty" ? (
            <div className="sheet">
              <EmptyFolder compact title="Your first score lands here">
                Finish a practice interview and its score, transcript and feedback get filed on this desk.
              </EmptyFolder>
            </div>
          ) : (
            <div className="sheet-in">
              <LastScore />
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <Requests />
        </div>
      </div>
    </>
  );
}
