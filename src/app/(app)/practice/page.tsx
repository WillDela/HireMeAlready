"use client";

import { ArrowRightLeft, Check } from "lucide-react";
import { useRole } from "@/lib/prefs";
import { FriendInvites } from "@/components/FriendInvites";
import { PracticeFolder } from "@/components/PracticeFolder";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

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
      <FriendInvites />
    </>
  );
}
