"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, FileText, UserRound, Users } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/mock";
import { useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { apiFetch, useApiResource } from "@/lib/use-api";
import type { ResumeView } from "@/lib/views";
import { ParsedResumeEditor, type EditableResume } from "@/components/ParsedResumeEditor";
import { ResumeUploader } from "@/components/ResumeUploader";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { Wordmark } from "@/components/shell/Wordmark";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { LoadingSheets } from "@/components/ui/States";
import { StatePreview } from "@/components/ui/StatePreview";

const steps = ["Upload resume", "Check the details", "Default role"];

type ProfileDraft = { name: string; headline: string; targetRole: string; linkedinUrl: string };

export default function OnboardingPage() {
  const router = useRouter();
  const forced = useForcedState();
  const viewer = useCurrentUser();
  const [, setRole] = useRole();
  const [step, setStep] = useState(0);
  const { data: uploaded, mutate, reload } = useApiResource<ResumeView | null>(step >= 1 ? "/api/resume" : null, {
    pollWhile: (r) => r?.parseStatus === "PENDING" || r?.parseStatus === "PROCESSING",
  });
  // null until the user edits; until then the editor shows what the parser read.
  const [edits, setEdits] = useState<EditableResume | null>(null);
  // Filling in the profile by hand instead of uploading a resume.
  const [manual, setManual] = useState(false);
  // Same idea for the profile: null until edited, drafted from the resume until then.
  const [profileEdits, setProfileEdits] = useState<ProfileDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [role, setChosen] = useState<Role>("interviewee");
  const [busy, setBusy] = useState<"saving" | "finishing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed: EditableResume | null =
    uploaded?.parseStatus === "READY"
      ? { summary: uploaded.summary, skills: uploaded.skills, experience: uploaded.experience }
      : null;
  const resume = edits ?? parsed;

  const suggested = !manual && uploaded?.parseStatus === "READY" ? uploaded.suggested : null;
  const profile: ProfileDraft = profileEdits ?? {
    name: suggested?.name || viewer.name,
    headline: suggested?.headline || viewer.headline,
    targetRole: suggested?.targetRole || viewer.targetRole,
    linkedinUrl: suggested?.linkedinUrl || viewer.linkedinUrl,
  };
  const nameError =
    showErrors && !profile.name.trim() ? "Enter your name so partners know who they're talking to." : null;

  async function confirmDetails() {
    setError(null);
    setShowErrors(true);
    if (!profile.name.trim()) return;
    if (edits && !manual) {
      setBusy("saving");
      try {
        await apiFetch("/api/resume", {
          method: "PATCH",
          body: JSON.stringify({
            summary: edits.summary,
            skills: edits.skills,
            experience: edits.experience.map(({ title, company, start, end, bullets }) => ({
              title,
              company,
              start,
              end,
              bullets: bullets.filter(Boolean),
            })),
          }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Your changes didn't save. Try again.");
        return;
      } finally {
        setBusy(null);
      }
    }
    setStep(2);
  }

  async function finish() {
    setError(null);
    setBusy("finishing");
    try {
      await apiFetch("/api/profile/onboarding", {
        method: "POST",
        // Consent was given at sign up, which requires it.
        body: JSON.stringify({ ...profile, preferredRole: role.toUpperCase(), recordingConsent: true }),
      });
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "That didn't save. Try again.");
      return;
    }
    setRole(role);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="desk min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6 sm:px-6">
        <span className="text-ink">
          <Wordmark />
        </span>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
          className="text-[0.875rem] font-semibold text-manila-ink underline hover:text-ink"
        >
          Sign out
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
                <p className="mt-1 text-ink-2">
                  We read it for skills and experience and draft your profile from it. You&apos;ll check everything next.
                </p>
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
                    onUploaded={(r) => {
                      mutate(r);
                      setEdits(null);
                      setProfileEdits(null);
                      setManual(false);
                      setStep(1);
                      reload();
                    }}
                  />
                )}
                <p className="mt-6 text-[0.9375rem] text-ink-2">
                  No resume handy?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setManual(true);
                      setStep(1);
                    }}
                    className="font-semibold text-ink underline hover:text-manila-ink"
                  >
                    Fill out your profile by hand
                  </button>
                </p>
              </section>
            ) : null}

            {step === 1 ? (
              <section aria-labelledby="s2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 id="s2" className="text-[1.375rem] font-bold">
                      Check what we found
                    </h2>
                    <p className="mt-1 text-ink-2">
                      {manual
                        ? "Tell interviewers who you are. You can upload a resume later from the Resume page."
                        : "We drafted your profile from your resume. Fix anything we misread. Interviewers see this version."}
                    </p>
                  </div>
                  {!manual ? (
                    <p className="flex items-center gap-2 rounded-[3px] bg-paper-2 px-3 py-2 text-[0.875rem]">
                      <FileText size={16} aria-hidden="true" className="text-ink-2" />
                      <span className="font-semibold">{uploaded?.fileName}</span>
                      <span className="text-ink-2">{uploaded?.fileSize}</span>
                    </p>
                  ) : null}
                </div>
                <div className="mt-7">
                  {forced === "empty" ? (
                    <div className="rounded-[3px] bg-paper-2 p-5 text-[0.9375rem]">
                      <p className="font-bold">We couldn&apos;t find skills or roles in this file.</p>
                      <p className="mt-1 text-ink-2">Add them below, or go back and upload a different version.</p>
                    </div>
                  ) : null}
                  {forced === "empty" ? (
                    <ParsedResumeEditor value={{ summary: "", skills: [], experience: [] }} onChange={setEdits} />
                  ) : manual ? (
                    <ProfileFields value={profile} onChange={setProfileEdits} nameError={nameError} />
                  ) : uploaded?.parseStatus === "FAILED" ? (
                    <div role="alert" className="rounded-[3px] bg-stamp-wash p-5 text-[0.9375rem]">
                      <p className="font-bold">We couldn&apos;t read this file.</p>
                      <p className="mt-1">It may be a scan or a photo of a page. Go back and upload the PDF exported from your editor.</p>
                    </div>
                  ) : resume ? (
                    <>
                      <ProfileFields value={profile} onChange={setProfileEdits} nameError={nameError} />
                      <div className="mt-8 border-t border-edge pt-7">
                        <ParsedResumeEditor value={resume} onChange={setEdits} />
                      </div>
                    </>
                  ) : (
                    <LoadingSheets label="Reading your resume…" layout="form" rows={3} />
                  )}
                  {error ? (
                    <p role="alert" className="mt-5 text-[0.9375rem] text-stamp">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-edge pt-6">
                  <Button variant="ghost" onClick={() => setStep(0)} icon={<ArrowLeft size={16} aria-hidden="true" />}>
                    {manual ? "Upload a resume instead" : "Upload a different file"}
                  </Button>
                  <Button
                    size="lg"
                    onClick={confirmDetails}
                    disabled={!resume && !manual && forced !== "empty"}
                    loading={busy === "saving"}
                    loadingLabel="Saving…"
                  >
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
                {error ? (
                  <p role="alert" className="mt-5 text-[0.9375rem] text-stamp">
                    {error}
                  </p>
                ) : null}
                <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-edge pt-6">
                  <Button variant="ghost" onClick={() => setStep(1)} icon={<ArrowLeft size={16} aria-hidden="true" />}>
                    Back
                  </Button>
                  <Button size="lg" onClick={finish} loading={busy === "finishing"} loadingLabel="Opening your desk…">
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

/** Name, target role, headline and LinkedIn, drafted from the resume when there is one. */
function ProfileFields({
  value,
  onChange,
  nameError,
}: {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
  nameError: string | null;
}) {
  return (
    <fieldset className="grid gap-5 sm:grid-cols-2">
      <legend className="visually-hidden">Profile</legend>
      <TextField
        label="Full name"
        autoComplete="name"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        error={nameError}
      />
      <TextField
        label="Target role"
        value={value.targetRole}
        onChange={(e) => onChange({ ...value, targetRole: e.target.value })}
        placeholder="Software Engineer Intern"
        hint="The job you're practicing for."
      />
      <TextField
        label="Headline"
        value={value.headline}
        onChange={(e) => onChange({ ...value, headline: e.target.value })}
        placeholder="CS student at FIU building web apps"
        className="sm:col-span-2"
      />
      <TextField
        label="LinkedIn URL"
        type="url"
        value={value.linkedinUrl}
        onChange={(e) => onChange({ ...value, linkedinUrl: e.target.value })}
        placeholder="https://www.linkedin.com/in/…"
        className="sm:col-span-2"
      />
    </fieldset>
  );
}
