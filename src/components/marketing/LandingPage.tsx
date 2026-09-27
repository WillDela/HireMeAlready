import Link from "next/link";
import { Check } from "lucide-react";
import { PracticeFolder } from "@/components/PracticeFolder";
import { ScoreCard } from "@/components/ScoreCard";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Wordmark } from "@/components/shell/Wordmark";
import { DemoFolder } from "@/components/marketing/DemoFolder";

// The same four dimensions the real /history detail page scores against (src/lib/history.ts),
// so the sample below never drifts from what the product actually measures.
const SAMPLE_DIMENSIONS = [
  {
    name: "Communication",
    score: 4.2,
    rationale: "Led with the one-handed, cracked-screen scenario before jumping to a fix.",
  },
  {
    name: "Structure",
    score: 3.8,
    rationale: "Clear setup and action; the result was implied rather than stated.",
  },
  {
    name: "Technical depth",
    score: 4.5,
    rationale: "Named the specific interaction pattern that breaks under one-thumb use.",
  },
  {
    name: "Relevance",
    score: 4.0,
    rationale: "Tied straight back to the Driver Experience team's own mobile app.",
  },
];

function TopBar() {
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex h-16 max-w-[76rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <div className="text-ink">
          <Wordmark />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-[76rem] px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-10 lg:pt-20 lg:pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
        <div>
          <h1 className="wide max-w-[16ch] text-[clamp(2.5rem,5vw,3.5rem)] leading-[0.98] font-extrabold tracking-[-0.03em] text-ink">
            Rehearse the interview you&apos;re actually walking into.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-2">
            Upload your resume and the company you&apos;re interviewing at. We research it for questions your
            interviewer would actually ask, then file a scored record when you&apos;re done.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/signup" size="lg">
              Get started
            </ButtonLink>
            <Link href="/login" className="text-[0.9375rem] font-semibold text-ink underline underline-offset-2">
              Already have an account? Sign in
            </Link>
          </div>
          <p className="mt-6 max-w-[42ch] text-[0.8125rem] text-ink-3">
            Practice calls aren&apos;t recorded without your consent, and your resume is only shared with a
            matched interviewer.
          </p>
        </div>
        <DemoFolder className="mx-auto w-full max-w-[24rem] lg:mx-0" />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-t-2 border-ink bg-manila py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-10">
        <h2 className="wide max-w-[20ch] text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink md:text-[2.625rem]">
          Two ways in
        </h2>
        <p className="mt-3 max-w-[60ch] text-[1rem] text-manila-ink">
          Both build questions from the company you&apos;re applying to and file a scored record afterwards.
        </p>
        <div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2">
          <PracticeFolder
            title="Practice with AI"
            titleId="how-ai"
            headingLevel="h3"
            action={
              <ButtonLink href="/signup" size="lg" className="w-full">
                Start with AI
              </ButtonLink>
            }
            footnote="No scheduling. Start whenever you're ready."
          >
            <ul className="space-y-2">
              {[
                "Questions researched from the company and job description",
                "Edit, reorder or add questions before you start",
                "Scored on communication, structure, depth and relevance",
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
            titleId="how-live"
            headingLevel="h3"
            action={
              <ButtonLink href="/signup" size="lg" className="w-full">
                Find a partner
              </ButtonLink>
            }
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
      </div>
    </section>
  );
}

function ScoredFile() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="wide max-w-[20ch] text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink md:text-[2.625rem]">
              What comes back
            </h2>
            <p className="mt-3 max-w-[60ch] text-[1rem] text-manila-ink">
              Not just a pass or fail — a score on four dimensions, each with the specific moment that earned it.
            </p>
          </div>
          <span className="tag text-ink-3">Sample · {`Northwind Logistics interview`}</span>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SAMPLE_DIMENSIONS.map((d) => (
            <ScoreCard key={d.name} {...d} />
          ))}
        </div>
        <p className="mt-6 max-w-[60ch] text-[0.9375rem] text-ink-2">
          Work on next: <strong className="font-semibold text-ink">stating the result, not just the setup and action</strong>.
        </p>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="surface-drawer border-t-2 border-ink bg-drawer">
      <div className="mx-auto flex max-w-[76rem] flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
        <h2 className="wide max-w-[18ch] text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink md:text-[2.625rem]">
          Rehearse it before it counts.
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonLink href="/signup" size="lg">
            Get started
          </ButtonLink>
          <Link href="/login" className="text-[0.9375rem] font-semibold text-ink underline underline-offset-2">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-ink">
      <div className="mx-auto flex max-w-[76rem] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-10">
        <div className="text-ink">
          <Wordmark variant="horizontal" horizontalClassName="text-[1.25rem]" />
        </div>
        <p className="text-[0.8125rem] text-ink-3">Interview practice built around the company you&apos;re applying to.</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="desk min-h-dvh bg-page">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <TopBar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <HowItWorks />
        <ScoredFile />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
