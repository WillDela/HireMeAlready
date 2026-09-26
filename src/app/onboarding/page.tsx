"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, FileText, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { userResume, type Role } from "@/lib/mock";
import { useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { ParsedResumeEditor, type EditableResume } from "@/components/ParsedResumeEditor";
import { ResumeUploader } from "@/components/ResumeUploader";
import { Wordmark } from "@/components/shell/Wordmark";
import { Button } from "@/components/ui/Button";
import { LoadingSheets } from "@/components/ui/States";
import { StatePreview } from "@/components/ui/StatePreview";

const steps = ["Upload resume", "Check the details", "Default role"];

export default function OnboardingPage() {
  const router = useRouter();
  const forced = useForcedState();
  const [, setRole] = useRole();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{ name: string; size: string } | null>(null);
  const [resume, setResume] = useState<EditableResume>({
    summary: userResume.summary,
    skills: userResume.skills.slice(0, 8),
    experience: userResume.experience.slice(0, 2),
  });
  const [role, setChosen] = useState<Role>("interviewee");
  const [finishing, setFinishing] = useState(false);

  function finish() {
    setRole(role);
    setFinishing(true);
    window.setTimeout(() => router.push("/dashboard"), 700);
  }

  return (
    <div className="desk min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6 sm:px-6">
        <span className="text-ink">
          <Wordmark compact />
        </span>
        <button type="button" onClick={() => router.push("/dashboard")} className="text-[0.875rem] font-semibold text-manila-ink underline hover:text-ink">
          Skip for now
        </button>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6">
        <h1 className="wide text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] md:text-[2.625rem]">
          Set up your file
        </h1>
        <p className="mt-2.5 max-w-[56ch] text-manila-ink">
          Your resume lets us match you with the right interviewers and lets them ask about your real work.
        </p>

        <ol className="mt-8 flex flex-wrap gap-x-6 gap-y-2" aria-label="Setup progress">
          {steps.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 text-[0.875rem] font-semibold",
                i === step ? "text-ink" : i < step ? "text-manila-ink" : "text-manila-ink/70",
              )}
            >
              <span
                className={cn(
                  "tnum grid h-6 w-6 place-items-center rounded-full border-[1.5px] text-[0.75rem] font-bold",
                  i < step && "border-ink bg-ink text-paper",
                  i === step && "border-ink bg-hi text-hi-ink",
                  i > step && "border-manila-edge",
                )}
              >
                {i < step ? <Check size={13} aria-hidden="true" /> : i + 1}
              </span>
              {s}
              {i < step ? <span className="visually-hidden"> (done)</span> : null}
            </li>
          ))}
        </ol>

        <div className="relative mt-8 pt-7">
          <div className="folder-tab w-32" aria-hidden="true" />
          <div className="sheet rounded-tl-none p-6 sm:p-8">
            {step === 0 ? (
              <section aria-labelledby="s1">
                <h2 id="s1" className="text-[1.375rem] font-bold">
                  Upload your resume
                </h2>
                <p className="mt-1 text-ink-2">We read it for skills and experience. You&apos;ll check everything next.</p>
                {forced === "loading" ? (
                  <LoadingSheets className="mt-6" label="Reading your resume…" layout="form" rows={2} />
                ) : (
                  <ResumeUploader
                    className="mt-6"
                    forceError={
                      forced === "error"
                        ? "We couldn't read any text in resume-scan.pdf. It may be a photo of a page. Upload the original PDF or a Word file."
                        : null
                    }
                    onUploaded={(f) => {
                      setFile(f);
                      setStep(1);
                    }}
                  />
                )}
              </section>
            ) : null}

            {step === 1 ? (
              <section aria-labelledby="s2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 id="s2" className="text-[1.375rem] font-bold">
                      Check what we found
                    </h2>
                    <p className="mt-1 text-ink-2">Fix anything we misread. Interviewers see this version.</p>
                  </div>
                  <p className="flex items-center gap-2 rounded-[3px] bg-paper-2 px-3 py-2 text-[0.875rem]">
                    <FileText size={16} aria-hidden="true" className="text-ink-2" />
                    <span className="font-semibold">{file?.name ?? userResume.fileName}</span>
                    <span className="text-ink-2">{file?.size ?? userResume.fileSize}</span>
                  </p>
                </div>
                <div className="mt-7">
                  {forced === "empty" ? (
                    <div className="rounded-[3px] bg-paper-2 p-5 text-[0.9375rem]">
                      <p className="font-bold">We couldn&apos;t find skills or roles in this file.</p>
                      <p className="mt-1 text-ink-2">Add them below, or go back and upload a different version.</p>
                    </div>
                  ) : null}
                  <ParsedResumeEditor
                    value={forced === "empty" ? { summary: "", skills: [], experience: [] } : resume}
                    onChange={setResume}
                  />
                </div>
                <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-edge pt-6">
                  <Button variant="ghost" onClick={() => setStep(0)} icon={<ArrowLeft size={16} aria-hidden="true" />}>
                    Upload a different file
                  </Button>
                  <Button size="lg" onClick={() => setStep(2)}>
                    Looks right
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section aria-labelledby="s3">
                <h2 id="s3" className="text-[1.375rem] font-bold">
                  How will you usually practice?
                </h2>
                <p className="mt-1 text-ink-2">This is your default. Switch any time from the top bar.</p>
                <fieldset className="mt-6">
                  <legend className="visually-hidden">Default role</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "interviewee",
                          title: "Interviewee",
                          body: "You answer. Practice with the AI or get matched with a person who interviews you.",
                          icon: UserRound,
                        },
                        {
                          value: "interviewer",
                          title: "Interviewer",
                          body: "You ask. See the candidate's resume and suggested questions, then leave feedback.",
                          icon: Users,
                        },
                      ] as const
                    ).map((opt) => {
                      const checked = role === opt.value;
                      const Icon = opt.icon;
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            "relative flex cursor-pointer flex-col rounded-[4px] border-2 p-5 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                            checked ? "border-ink bg-ink text-paper" : "border-edge hover:border-ink-2",
                          )}
                        >
                          <input
                            type="radio"
                            name="default-role"
                            value={opt.value}
                            checked={checked}
                            onChange={() => setChosen(opt.value)}
                            className="visually-hidden"
                          />
                          <Icon size={24} aria-hidden="true" />
                          <span className="mt-3 text-[1.125rem] font-bold">{opt.title}</span>
                          <span className={cn("mt-1 text-[0.9375rem]", checked ? "opacity-85" : "text-ink-2")}>{opt.body}</span>
                          {checked ? (
                            <Check size={20} aria-hidden="true" className="absolute top-4 right-4" />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-edge pt-6">
                  <Button variant="ghost" onClick={() => setStep(1)} icon={<ArrowLeft size={16} aria-hidden="true" />}>
                    Back
                  </Button>
                  <Button size="lg" onClick={finish} loading={finishing} loadingLabel="Opening your desk…">
                    Finish setup
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </main>
      <StatePreview className="fixed right-3 bottom-3 z-40" />
    </div>
  );
}
