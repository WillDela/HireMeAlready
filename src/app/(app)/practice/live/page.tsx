"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import type { QueueState } from "@/lib/contracts";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { apiFetch, useApiResource } from "@/lib/use-api";
import type { ResumeView } from "@/lib/views";
import { DeviceCheck } from "@/components/call/DeviceCheck";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned } from "@/components/ui/States";

type Phase = "idle" | "searching" | "matched" | "lobby" | "none" | "error";
type Match = Extract<QueueState, { state: "matched" }>;

const POLL_MS = 2000;
/** Give up (and offer AI practice) after this long without a match. */
const SEARCH_LIMIT_S = 120;
/** Consecutive failed polls before we show the error state. */
const MAX_POLL_FAILURES = 3;

/** Stop waiting. `keepalive` lets it finish while the page unloads. */
function leaveQueue(keepalive = false) {
  return fetch("/api/queue", { method: "DELETE", keepalive }).catch(() => undefined);
}

function SearchingRing() {
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden="true" className="text-ink">
      <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="3" />
      <circle cx="56" cy="56" r="44" stroke="currentColor" strokeWidth="1.25" />
      <g style={{ transformOrigin: "56px 56px", animation: "spin 2.4s linear infinite" }}>
        <circle cx="56" cy="56" r="34" stroke="currentColor" strokeWidth="3" strokeDasharray="10 12" strokeLinecap="round" />
      </g>
      <g style={{ transformOrigin: "56px 56px", animation: "spin 1.2s linear infinite reverse" }}>
        <path d="M56 32a24 24 0 0 1 24 24" stroke="var(--hi)" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function LivePracticePage() {
  const router = useRouter();
  const forced = useForcedState();
  const [role] = useRole();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [joining, setJoining] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [round, setRound] = useState(0); // restarts the search clock
  const resume = useApiResource<ResumeView | null>("/api/resume").data;
  const latest = resume?.experience[0];
  const partner = match?.partner;
  const seeking = role === "interviewee" ? "an interviewer" : "a candidate";
  const failures = useRef(0);
  const inQueue = useRef(false); // true from joining until we cancel or head into the call

  const apply = useCallback((s: QueueState) => {
    failures.current = 0;
    if (s.state === "matched") {
      setMatch(s);
      setPhase((p) => (p === "searching" ? "matched" : p));
    } else if (s.state === "waiting") {
      if (s.partnerLeft) {
        setNotice(`${s.partnerLeft.name} left. Looking again.`);
        setSeconds(0);
        setRound((r) => r + 1);
      }
      setMatch(null);
      setPhase((p) => (p === "matched" || p === "lobby" ? "searching" : p));
    } else {
      inQueue.current = false;
      setMatch(null);
      setPhase((p) => (p === "searching" || p === "matched" || p === "lobby" ? "idle" : p));
    }
  }, []);

  const polling = !forced && (phase === "searching" || phase === "matched" || phase === "lobby");
  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    let timer: number | undefined;
    async function poll() {
      try {
        const s = await apiFetch<QueueState>("/api/queue");
        if (!cancelled) apply(s);
      } catch {
        if (!cancelled && ++failures.current >= MAX_POLL_FAILURES) {
          inQueue.current = false;
          leaveQueue();
          setPhase("error");
          return;
        }
      }
      if (!cancelled) timer = window.setTimeout(poll, POLL_MS);
    }
    timer = window.setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [polling, apply]);

  useEffect(() => {
    if (phase !== "searching" || forced) return;
    const tick = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    const giveUp = window.setTimeout(() => {
      inQueue.current = false;
      leaveQueue();
      setPhase("none");
    }, SEARCH_LIMIT_S * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(giveUp);
    };
  }, [phase, forced, round]);

  // Leaving the page (or closing the tab) takes us out of line. If this never arrives,
  // our entry goes stale and nobody gets matched with it anyway.
  useEffect(() => {
    const onHide = () => {
      if (inQueue.current) leaveQueue(true);
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, []);

  async function start() {
    setSeconds(0);
    setRound((r) => r + 1);
    setNotice(null);
    setMatch(null);
    setPhase("searching");
    inQueue.current = true;
    try {
      apply(
        await apiFetch<QueueState>("/api/queue", {
          method: "POST",
          body: JSON.stringify({
            role: role === "interviewee" ? "INTERVIEWEE" : "INTERVIEWER",
            jobTitle: jobTitle.trim() || undefined,
            company: company.trim() || undefined,
          }),
        }),
      );
    } catch {
      inQueue.current = false;
      setPhase("error");
    }
  }

  async function cancel() {
    inQueue.current = false;
    setPhase("idle");
    setMatch(null);
    await leaveQueue();
  }

  async function findSomeoneElse() {
    await leaveQueue();
    await start();
  }

  const shown =
    forced === "loading" ? "searching" : forced === "error" ? "error" : forced === "empty" ? "none" : phase;

  return (
    <>
      <title>Live practice · hire-me-already</title>
      <PageHeader
        title={role === "interviewee" ? "Practice with a person" : "Interview a candidate"}
        description={
          role === "interviewee"
            ? "We'll match you with an interviewer who knows your field, using your resume and the role you're after."
            : "We'll match you with someone preparing for a role close to your experience."
        }
      />

      {shown === "idle" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <section aria-labelledby="find-heading" className="sheet p-6 sm:p-8">
            <h2 id="find-heading" className="text-[1.375rem] font-bold">
              {role === "interviewee" ? "What are you preparing for?" : "Who can you interview?"}
            </h2>
            {role === "interviewee" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
                <TextField label="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
            ) : (
              <p className="mt-2 text-ink-2">
                Candidates preparing for roles close to your experience{latest ? ` at ${latest.company}` : ""}.
              </p>
            )}
            <Button size="lg" className="mt-7 w-full sm:w-auto" onClick={start} icon={<Search size={18} aria-hidden="true" />}>
              {role === "interviewee" ? "Find a partner" : "Find a candidate"}
            </Button>
          </section>

          <aside aria-labelledby="match-on" className="rounded-[4px] border-2 border-dashed border-manila-edge p-6">
            <h2 id="match-on" className="text-[1rem] font-bold">
              What we match on
            </h2>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-manila-ink">
              <li>
                Your skills:{" "}
                <span className="font-semibold text-ink">
                  {resume?.skills.length ? resume.skills.slice(0, 3).join(", ") : "from your resume"}
                </span>
              </li>
              {latest ? (
                <li>
                  Your experience: <span className="font-semibold text-ink">{latest.title}, {latest.company}</span>
                </li>
              ) : null}
              {role === "interviewee" ? (
                <li>
                  Target: <span className="font-semibold text-ink">{jobTitle || "any role"}{company ? ` at ${company}` : ""}</span>
                </li>
              ) : null}
            </ul>
            <p className="mt-4 text-[0.8125rem] text-manila-ink">
              {role === "interviewee"
                ? "Your matched interviewer sees your resume. Change this in Settings."
                : "You'll see your candidate's resume once you're matched."}
            </p>
          </aside>
        </div>
      ) : null}

      {shown === "searching" ? (
        <section aria-labelledby="searching-heading" className="sheet mx-auto flex max-w-xl flex-col items-center px-6 py-12 text-center">
          <SearchingRing />
          <h2 id="searching-heading" className="mt-6 text-[1.5rem] font-extrabold tracking-[-0.01em]">
            Looking for {seeking}…
          </h2>
          <p className="mt-2 text-ink-2" role="status" aria-live="polite">
            {notice ??
              (role === "interviewee"
                ? `Someone who can interview you for ${jobTitle.trim() || "your target role"}${company.trim() ? ` at ${company.trim()}` : ""}.`
                : "Someone preparing for a role close to your experience.")}
          </p>
          <p className="tnum mt-4 text-[0.875rem] text-ink-3" aria-hidden="true">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} elapsed · usually under a minute
          </p>
          <Button
            variant="secondary"
            className="mt-7"
            onClick={() => {
              if (forced) setForcedState(null);
              cancel();
            }}
          >
            Cancel
          </Button>
        </section>
      ) : null}

      {shown === "none" ? (
        <div className="sheet mx-auto max-w-xl">
          <EmptyFolder
            title={`No ${role === "interviewee" ? "interviewers" : "candidates"} are free right now`}
            action={
              <>
                <Button onClick={() => { setForcedState(null); start(); }}>Keep looking</Button>
                <Button variant="secondary" onClick={() => router.push("/practice/ai")}>Practice with AI instead</Button>
              </>
            }
          >
            We searched for 2 minutes. Evenings are busiest; you can also invite a friend from the Friends page.
          </EmptyFolder>
        </div>
      ) : null}

      {shown === "error" ? (
        <div className="mx-auto max-w-xl">
          <ErrorReturned title="Matching isn't working right now" onRetry={() => { if (forced) setForcedState(null); setPhase("idle"); }}>
            This is on our side, not your connection. AI practice still works while we fix it.
          </ErrorReturned>
        </div>
      ) : null}

      {shown === "matched" && partner ? (
        <section aria-labelledby="matched-heading" className="relative mx-auto max-w-xl pt-7 sheet-in">
          <div className="folder-tab w-32" aria-hidden="true" />
          <div className="folder p-3 sm:p-4">
            <div className="sheet relative p-6 sm:p-8">
              <Stamp tone="ink" land rotate={-8} className="absolute top-6 right-6 text-[1rem]">
                Matched
              </Stamp>
              <div role="status" aria-live="polite">
                <h2 id="matched-heading" className="visually-hidden">
                  Match found: {partner.name}
                </h2>
              </div>
              <Avatar name={partner.name} initials={partner.initials} size={64} />
              <p className="mt-4 text-[1.5rem] leading-tight font-extrabold tracking-[-0.01em]">{partner.name}</p>
              <p className="text-ink-2">{partner.headline}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-edge pt-5 text-[0.9375rem]">
                <div>
                  <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Their role</dt>
                  <dd className="mt-1 font-bold">{partner.role === "INTERVIEWER" ? "Interviewer" : "Interviewee"}</dd>
                </div>
                <div>
                  <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Practice interviews</dt>
                  <dd className="tnum mt-1 font-bold">{partner.interviewsDone}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Matched on</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {partner.matchedOn.map((m) => (
                      <span key={m} className="rounded-[3px] bg-paper-2 px-2 py-1 text-[0.8125rem] font-medium">
                        {m}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col-reverse gap-2 px-2 pt-4 pb-1 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={findSomeoneElse}>
                Find someone else
              </Button>
              <Button size="lg" onClick={() => setPhase("lobby")}>
                Continue to lobby
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {shown === "lobby" && match && partner ? (
        <section aria-labelledby="lobby-heading" className="sheet-in">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={partner.name} initials={partner.initials} size={40} status="online" />
              <div>
                <h2 id="lobby-heading" className="text-[1.25rem] font-bold">
                  Lobby
                </h2>
                <p className="text-[0.9375rem] text-manila-ink">
                  You&apos;re matched with {partner.name}. The call starts when you both join.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPhase("matched")} icon={<ArrowLeft size={16} aria-hidden="true" />}>
              Back to match
            </Button>
          </div>
          <DeviceCheck
            permission="granted"
            onRetry={() => undefined}
            joining={joining}
            onJoin={() => {
              setJoining(true);
              inQueue.current = false; // the call page keeps the match alive from here
              router.push(`/call/${match.interviewId}`);
            }}
          />
        </section>
      ) : null}
    </>
  );
}
