"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowRightLeft, ArrowUp, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  CreateInterviewInput,
  CreateInterviewResponse,
  QuestionSetInput,
  QuestionSetResponse,
} from "@/lib/contracts";
import { aiSetupDefaults, sourceLabel, type Question } from "@/lib/mock";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { ApiError, apiFetch } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyFolder, ErrorReturned } from "@/components/ui/States";

type Phase = "idle" | "generating" | "ready" | "error";

// The request doesn't report progress, so these advance on a timer and hold on the last
// step until the questions arrive. Roughly the pipeline in generateQuestions.
const researchSteps = (company: string) => [
  "Reading the role",
  `Searching for questions asked at ${company}`,
  "Checking which sources hold up",
  "Writing questions for the role",
];
const STEP_MS = 2500;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the web";
  }
};

function Generating({ company, step }: { company: string; step: number }) {
  return (
    <div role="status" aria-live="polite" className="sheet p-6">
      <h2 className="text-[1.125rem] font-bold">Writing questions for {company || "this company"}</h2>
      <ol className="mt-4 space-y-3">
        {researchSteps(company || "the company").map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3 text-[0.9375rem]", i > step && "text-ink-3")}>
            {i < step ? (
              <Check size={18} aria-hidden="true" className="text-ink" />
            ) : i === step ? (
              <Spinner size={18} />
            ) : (
              <span aria-hidden="true" className="h-[18px] w-[18px] rounded-full border-[1.5px] border-edge" />
            )}
            {s}
            {i < step ? <span className="visually-hidden"> (done)</span> : null}
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="ruled-skeleton mt-6 h-48 rounded-[3px]" />
    </div>
  );
}

function QuestionList({
  questions,
  onChange,
}: {
  questions: Question[];
  onChange: (q: Question[]) => void;
}) {
  function move(i: number, by: number) {
    const next = [...questions];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    onChange(next);
  }
  return (
    <ol className="divide-y divide-edge">
      {questions.map((q, i) => (
        <li key={q.id} className="group grid grid-cols-[2rem_1fr] gap-x-3 py-4 first:pt-1">
          <span aria-hidden="true" className="tnum cond pt-2 text-[1.25rem] font-extrabold text-ink-3">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <label htmlFor={`q-${q.id}`} className="visually-hidden">
              Question {i + 1}
            </label>
            <textarea
              id={`q-${q.id}`}
              value={q.text}
              rows={2}
              onChange={(e) => onChange(questions.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))}
              placeholder="Write your question"
              className="w-full resize-none [field-sizing:content] rounded-[3px] border-[1.5px] border-transparent bg-transparent px-2 py-1.5 text-[0.9875rem] leading-relaxed text-ink hover:border-edge focus-visible:border-ink focus-visible:bg-paper"
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-2">
              <span className="flex flex-wrap items-center gap-2">
                {q.sourceUrl ? (
                  <a
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tag text-manila-ink hover:underline"
                  >
                    Reported on {hostOf(q.sourceUrl)}
                  </a>
                ) : (
                  <span className="tag text-manila-ink">{sourceLabel[q.source]}</span>
                )}
                {q.note ? <span className="text-[0.8125rem] text-ink-2">{q.note}</span> : null}
              </span>
              <span className="flex gap-0.5">
                <button
                  type="button"
                  className="icon-btn !h-8 !w-8 disabled:opacity-30"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move question ${i + 1} up`}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn !h-8 !w-8 disabled:opacity-30"
                  onClick={() => move(i, 1)}
                  disabled={i === questions.length - 1}
                  aria-label={`Move question ${i + 1} down`}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn !h-8 !w-8 hover:!text-stamp"
                  onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                  aria-label={`Delete question ${i + 1}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AiSetupPage() {
  const router = useRouter();
  const forced = useForcedState();
  const [role, setRole] = useRole();
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jd, setJd] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  // What the current (or last) question set was generated for.
  const [target, setTarget] = useState<QuestionSetInput>({ company: "", jobTitle: "" });
  const [reportedCount, setReportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Files the edited questions as a real interview, then opens its lobby.
  async function startInterview() {
    setStarting(true);
    setStartError(null);
    const input: CreateInterviewInput = {
      mode: "AI",
      company: target.company,
      jobTitle: target.jobTitle,
      jobDescription: target.jobDescription,
      grounded: false,
      questions: questions
        .filter((q) => q.text.trim())
        .map((q) => ({
          text: q.text.trim(),
          // A question the user typed in has no category; it's about this role.
          category: q.category ?? "role-specific",
          source: q.source,
          rationale: q.note,
          sourceUrl: q.sourceUrl,
        })),
    };
    try {
      const { id } = await apiFetch<CreateInterviewResponse>("/api/interviews", {
        method: "POST",
        body: JSON.stringify(input),
      });
      router.push(`/call/${id}/lobby`);
    } catch (err) {
      setStarting(false);
      setStartError(err instanceof ApiError ? err.message : "We couldn't start the interview. Try again.");
    }
  }

  const shown: Phase =
    forced === "loading" ? "generating" : forced === "error" ? "error" : forced === "empty" ? "idle" : phase;

  useEffect(() => {
    if (phase !== "generating") return;
    const last = researchSteps("").length - 1;
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, last)), STEP_MS);
    return () => window.clearInterval(t);
  }, [phase]);

  const errors = {
    company: submitted && !company.trim() ? "Enter the company you're applying to." : null,
    jobTitle: submitted && !jobTitle.trim() ? "Enter the job title from the posting." : null,
  };

  async function run(input: QuestionSetInput) {
    const id = ++requestId.current;
    setTarget(input);
    setStep(0);
    setPhase("generating");
    try {
      const res = await apiFetch<QuestionSetResponse>("/api/ai/questions", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (id !== requestId.current) return; // a newer request replaced this one
      setQuestions(
        res.questions.map((q, i) => ({
          id: `q${id}-${i}`,
          text: q.text,
          source: q.source ?? "general",
          category: q.category,
          note: q.rationale,
          sourceUrl: q.sourceUrl,
        })),
      );
      setReportedCount(res.questions.filter((q) => q.sourceUrl).length);
      setPhase("ready");
    } catch (err) {
      if (id !== requestId.current) return;
      setErrorMessage(err instanceof ApiError && err.status === 400 ? err.message : null);
      setPhase("error");
    }
  }

  function generate(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!company.trim() || !jobTitle.trim()) return;
    run({ company: company.trim(), jobTitle: jobTitle.trim(), jobDescription: jd.trim() || undefined });
  }

  if (role === "interviewer") {
    return (
      <>
        <title>AI practice · hire-me-already</title>
        <PageHeader title="Practice with AI" />
        <div className="sheet max-w-xl">
          <EmptyFolder
            title="AI practice is for interviewees"
            action={
              <Button icon={<ArrowRightLeft size={16} aria-hidden="true" />} onClick={() => setRole("interviewee")}>
                Switch to interviewee
              </Button>
            }
          >
            You&apos;re practicing as the interviewer. The AI always asks the questions, so switch roles to answer them.
          </EmptyFolder>
        </div>
      </>
    );
  }

  const split = shown !== "idle";

  return (
    <>
      <title>AI practice · hire-me-already</title>
      <div className={cn(!split && "mx-auto max-w-[40rem]")}>
        <PageHeader
          title="Practice with AI"
          description="Tell us where you're applying. The AI researches the company and writes questions you can edit before you start."
        />
      </div>

      <div className={cn("grid items-start gap-8", split ? "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]" : "mx-auto max-w-[40rem]")}>
        <form onSubmit={generate} noValidate className="sheet space-y-5 p-6 sm:p-7 lg:sticky lg:top-24">
          <TextField
            label="Company"
            placeholder="e.g. Northwind Logistics"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            error={errors.company}
            autoComplete="organization"
          />
          <TextField
            label="Job title"
            placeholder="e.g. Senior Product Designer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            error={errors.jobTitle}
          />
          <TextAreaField
            label="Job description"
            rows={split ? 6 : 8}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the posting. Optional, but questions get much more specific."
            hint={jd ? `${jd.trim().split(/\s+/).length} words` : "Optional"}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              className="text-[0.875rem] font-semibold text-ink-2 underline hover:text-ink"
              onClick={() => {
                setCompany(aiSetupDefaults.company);
                setJobTitle(aiSetupDefaults.jobTitle);
                setJd(aiSetupDefaults.jobDescription);
              }}
            >
              Fill with an example
            </button>
            <Button
              type="submit"
              size="lg"
              loading={shown === "generating"}
              loadingLabel="Generating…"
              icon={<Sparkles size={17} aria-hidden="true" />}
            >
              {phase === "ready" ? "Generate again" : "Generate questions"}
            </Button>
          </div>
        </form>

        {split ? (
          <section aria-labelledby="preview-heading" aria-busy={shown === "generating"}>
            <h2 id="preview-heading" className="visually-hidden">
              Question preview
            </h2>
            {shown === "generating" ? (
              <Generating company={target.company} step={step} />
            ) : shown === "error" ? (
              <ErrorReturned
                title={`We couldn't write questions for ${target.company || "that company"}`}
                onRetry={() => {
                  setForcedState(null);
                  if (target.company) run(target);
                  else setPhase("idle");
                }}
              >
                {errorMessage ?? "The question writer is busy right now. Give it a minute and try again."}
              </ErrorReturned>
            ) : (
              <div className="relative pt-7 sheet-in">
                <div className="folder-tab">Question set</div>
                <div className="folder p-3 sm:p-4">
                  <div className="sheet p-5 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink/80 pb-3">
                      <p className="font-bold">
                        {target.jobTitle} · {target.company}
                      </p>
                      <p className="tnum text-[0.875rem] text-ink-2" aria-live="polite">
                        {questions.length} questions · about {Math.max(5, questions.length * 3 + 4)} min
                      </p>
                    </div>
                    <p className="pt-3 text-[0.875rem] text-ink-2">
                      {reportedCount > 0
                        ? `${reportedCount} ${reportedCount === 1 ? "was" : "were"} reported by candidates online, linked to where we found ${reportedCount === 1 ? "it" : "them"}. The rest are written for this role.`
                        : `We couldn't find interview reports for ${target.company} that we trust, so these are written for this role.`}
                    </p>
                    {questions.length === 0 ? (
                      <EmptyFolder compact title="No questions left">
                        Add your own below, or generate a fresh set.
                      </EmptyFolder>
                    ) : (
                      <QuestionList questions={questions} onChange={setQuestions} />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      icon={<Plus size={16} aria-hidden="true" />}
                      onClick={() => setQuestions((q) => [...q, { id: `custom-${Date.now()}`, text: "", source: "general" }])}
                    >
                      Add a question
                    </Button>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 px-2 pt-4 pb-1 sm:flex-row sm:items-center sm:justify-between">
                    {startError ? (
                      <p role="alert" className="text-[0.875rem] font-semibold text-stamp">
                        {startError}
                      </p>
                    ) : (
                      <p className="text-[0.8125rem] text-manila-ink">The AI asks these in order and adds follow-ups.</p>
                    )}
                    <Button
                      size="lg"
                      disabled={questions.filter((q) => q.text.trim()).length === 0}
                      loading={starting}
                      loadingLabel="Opening lobby…"
                      onClick={startInterview}
                    >
                      Start interview
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : (
          <p className="text-center text-[0.9375rem] text-manila-ink">
            Your questions appear beside the form, ready to edit.
          </p>
        )}
      </div>
    </>
  );
}
