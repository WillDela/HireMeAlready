"use client";

import { ArrowRightLeft, Check } from "lucide-react";
import { interviewInvites } from "@/lib/mock";
import { useMockResource } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { PracticeFolder } from "@/components/PracticeFolder";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

function Invites() {
  const [role] = useRole();
  const { status, data, retry } = useMockResource(interviewInvites, { isEmpty: (d) => d.length === 0 });
  const mine = data.filter((i) => i.yourRole === role);

  return (
    <section aria-labelledby="inv-heading" className="mt-14">
      <h2 id="inv-heading" className="text-[1.375rem] font-extrabold tracking-[-0.01em]">
        Invitations from friends
      </h2>
      <p className="mt-1 text-[0.9375rem] text-manila-ink">
        Showing invites where you&apos;d be the {role}. Switch role in the top bar to see the others.
      </p>
      <div className="mt-5">
        <StateView
          status={status === "ready" && mine.length === 0 ? "empty" : status}
          loading={<LoadingSheets label="Checking for invitations…" rows={2} />}
          error={
            <ErrorReturned compact title="Invitations didn't load" onRetry={retry}>
              Your friends&apos; invites are still waiting; we just couldn&apos;t fetch them.
            </ErrorReturned>
          }
          empty={
            <div className="sheet">
              <EmptyFolder compact title="No invitations right now" action={<ButtonLink href="/friends" variant="secondary" size="sm">Invite a friend</ButtonLink>}>
                When a friend invites you to a practice interview, it shows up here.
              </EmptyFolder>
            </div>
          }
        >
          <ul className="sheet divide-y divide-edge">
            {mine.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3.5">
                  <Avatar name={inv.from.name} initials={inv.from.initials} size={44} />
                  <div className="min-w-0">
                    <p className="font-bold">
                      {inv.from.name}{" "}
                      <span className="font-normal text-ink-2">
                        wants you to {inv.yourRole === "interviewer" ? "interview them" : "be interviewed"}
                      </span>
                    </p>
                    <p className="text-[0.875rem] text-ink-2">
                      {inv.jobTitle} · {inv.company} · {inv.sent}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pl-[3.625rem] sm:pl-0">
                  <ButtonLink href="/call/live-halcyon/lobby" size="sm">
                    Accept and go to lobby
                  </ButtonLink>
                  <Button variant="ghost" size="sm" aria-label={`Decline invitation from ${inv.from.name}`}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </StateView>
      </div>
    </section>
  );
}

export default function PracticePage() {
  const [role, setRole] = useRole();

  return (
    <>
      <title>Practice · hire-me-already</title>
      {role === "interviewee" ? (
        <>
          <PageHeader
            title="Practice"
            description="Two ways in. Both build questions from the company you're applying to and file a scored record afterwards."
          />
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
            <PracticeFolder
              title="Practice with AI"
              titleId="p-ai"
              action={<ButtonLink href="/practice/ai" size="lg" className="w-full">Set up an AI interview</ButtonLink>}
              footnote="No scheduling. Start whenever you're ready."
            >
              <ul className="space-y-2">
                {[
                  "Questions researched from the company and job description",
                  "Edit, reorder or add questions before you start",
                  "Scored on communication, depth, confidence and fit",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check size={17} aria-hidden="true" className="mt-0.5 flex-none text-ink" />
                    {t}
                  </li>
                ))}
              </ul>
            </PracticeFolder>
            <PracticeFolder
              title="Practice with a person"
              titleId="p-live"
              action={<ButtonLink href="/practice/live" size="lg" className="w-full">Find a partner</ButtonLink>}
              footnote="Your resume is shared with your matched interviewer."
            >
              <ul className="space-y-2">
                {[
                  "Matched with an interviewer using your resume",
                  "They get suggested questions for your target company",
                  "Written feedback and ratings after the call",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check size={17} aria-hidden="true" className="mt-0.5 flex-none text-ink" />
                    {t}
                  </li>
                ))}
              </ul>
            </PracticeFolder>
          </div>
        </>
      ) : (
        <>
          <PageHeader
            title="Practice as the interviewer"
            description="Sit on the other side of the table. Asking good questions teaches you what interviewers listen for."
          />
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <PracticeFolder
              title="Interview a candidate"
              titleId="p-int"
              action={<ButtonLink href="/practice/live" size="lg" className="w-full">Find a candidate</ButtonLink>}
              footnote="About 30 minutes, then a short feedback form."
            >
              <p>We match you with someone preparing for a role close to yours. During the call you&apos;ll have their file open:</p>
              <ul className="mt-3 space-y-2">
                {["Their parsed resume", "Suggested questions for their target company", "A private notes pad"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check size={17} aria-hidden="true" className="mt-0.5 flex-none text-ink" />
                    {t}
                  </li>
                ))}
              </ul>
            </PracticeFolder>
            <aside aria-labelledby="ai-note" className="self-start rounded-[4px] border-2 border-dashed border-manila-edge p-6 md:mt-7">
              <h2 id="ai-note" className="text-[1.125rem] font-bold">
                AI practice is for interviewees
              </h2>
              <p className="mt-2 text-[0.9375rem] text-manila-ink">
                The AI always plays the interviewer. Switch roles to practice answering its questions.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                icon={<ArrowRightLeft size={16} aria-hidden="true" />}
                onClick={() => setRole("interviewee")}
              >
                Switch to interviewee
              </Button>
            </aside>
          </div>
        </>
      )}
      <Invites />
    </>
  );
}
