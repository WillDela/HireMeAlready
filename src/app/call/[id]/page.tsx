"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { callSessions, candidateResume, suggestedQuestions } from "@/lib/mock";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { useRole } from "@/lib/prefs";
import { apiFetch } from "@/lib/use-api";
import { AiInterviewer } from "@/components/call/AiInterviewer";
import { CallControls } from "@/components/call/CallControls";
import { InterviewerSidePanel } from "@/components/call/InterviewerSidePanel";
import { ReportDialog } from "@/components/call/ReportDialog";
import { VideoTile } from "@/components/call/VideoTile";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { StatePreview } from "@/components/ui/StatePreview";

function useElapsed(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setS((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = callSessions[id];
  const router = useRouter();
  const currentUser = useCurrentUser();
  const forced = useForcedState();
  const [role] = useRole();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const connected = !forced;
  const elapsed = useElapsed(connected);

  // Close the mobile sheet by default on small screens.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setPanelOpen(false);
  }, []);

  if (!session) notFound();

  const isAi = session.type === "ai";
  const isInterviewer = !isAi && role === "interviewer";
  const partner = isInterviewer
    ? { name: candidateResume.name, initials: candidateResume.initials }
    : { name: session.partner.name, initials: session.partner.initials };
  const panelId = "candidate-file";

  function end() {
    // Best-effort: triggers transcript + analysis on the server. Non-blocking so the
    // UI never waits on it, and harmless if the interview API isn't wired up yet.
    apiFetch(`/api/interviews/${id}/end`, { method: "POST" }).catch(() => {});
    router.push(`/call/${id}/wrap-up`);
  }

  return (
    <div className="surface-night flex h-dvh flex-col">
      <title>{`In interview · ${session.company}`}</title>
      <header className="flex h-14 flex-none items-center gap-3 px-4 sm:px-5">
        <span className="stamp flex-none text-[0.6875rem] text-stamp" style={{ ["--r" as string]: "-3deg" }}>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-stamp motion-safe:animate-[blink_1.6s_ease-in-out_infinite]" />
          Rec
          <span className="visually-hidden"> Recording</span>
        </span>
        <h1 className="min-w-0 truncate text-[0.9375rem] font-semibold">
          {isAi ? "AI interview" : `Interview with ${partner.name}`}
          <span className="hidden text-ink-2 sm:inline"> · {session.jobTitle}, {session.company}</span>
        </h1>
        <p className="ml-auto flex-none">
          <span className="visually-hidden">Time elapsed </span>
          <time role="timer" aria-live="off" className="tnum cond rounded-[3px] bg-night-3 px-2.5 py-1 text-[1.0625rem] font-bold tracking-[0.04em]">
            {elapsed}
          </time>
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <main id="main" className="relative min-w-0 flex-1 px-3 pb-2 sm:px-4">
          {isAi ? (
            <AiInterviewer interviewId={id} active={connected} />
          ) : (
            <VideoTile
              name={partner.name}
              initials={partner.initials}
              speaking={connected && !isInterviewer}
              className="h-full w-full"
            />
          )}

          <div className="absolute right-6 bottom-5 w-24 shadow-[0_12px_28px_-10px_oklch(0.03_0.02_266/0.8)] sm:right-8 sm:bottom-6 sm:w-52">
            <VideoTile
              name={currentUser.name}
              initials={currentUser.initials}
              self
              compact
              muted={!micOn}
              cameraOff={!cameraOn}
              className="aspect-[3/4] w-full ring-1 ring-night-3 sm:aspect-video"
            />
          </div>

          {forced === "loading" ? (
            <div role="status" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/85 sm:inset-x-4">
              <p className="flex items-center gap-3 text-[1.0625rem] font-semibold">
                <Spinner size={22} /> Connecting to the interview…
              </p>
            </div>
          ) : null}
          {forced === "empty" ? (
            <div role="status" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/85 px-6 text-center sm:inset-x-4">
              <div>
                <p className="text-[1.25rem] font-bold">Waiting for {isAi ? "the AI interviewer" : partner.name} to join</p>
                <p className="mt-2 text-ink-2">The timer starts when they arrive. You can check your mic meanwhile.</p>
              </div>
            </div>
          ) : null}
          {forced === "error" ? (
            <div role="alert" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/90 px-6 text-center sm:inset-x-4">
              <div className="flex flex-col items-center">
                <WifiOff size={30} aria-hidden="true" className="text-stamp" />
                <p className="mt-3 text-[1.25rem] font-bold">Connection lost</p>
                <p className="mt-2 max-w-[42ch] text-ink-2">
                  Everything up to {elapsed} is saved. Rejoin within 5 minutes to continue the same interview.
                </p>
                <Button className="mt-5" onClick={() => setForcedState(null)}>
                  Rejoin
                </Button>
              </div>
            </div>
          ) : null}
        </main>

        {isInterviewer ? (
          <InterviewerSidePanel
            id={panelId}
            open={panelOpen}
            onToggle={() => setPanelOpen((o) => !o)}
            candidate={candidateResume}
            questions={suggestedQuestions}
            elapsed={elapsed}
          />
        ) : null}
      </div>

      <footer className="flex-none px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <CallControls
          micOn={micOn}
          cameraOn={cameraOn}
          onToggleMic={() => setMicOn((v) => !v)}
          onToggleCamera={() => setCameraOn((v) => !v)}
          onReport={() => setReportOpen(true)}
          onEnd={() => setEndOpen(true)}
          endLabel={isAi ? "End" : "Leave"}
          panel={isInterviewer ? { open: panelOpen, onToggle: () => setPanelOpen((o) => !o), id: panelId } : undefined}
        />
      </footer>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        subject={isAi ? "a problem with this interview" : partner.name}
        onLeave={end}
      />

      <Dialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        tone="danger"
        title={isAi ? "End the interview?" : "Leave the interview?"}
        description={
          isAi
            ? "The AI scores the answers you've given so far. You can't resume this interview later."
            : isInterviewer
              ? `The call ends for both of you. Next, you'll rate ${partner.name.split(" ")[0]}.`
              : `The call ends for both of you. ${partner.name.split(" ")[0]} will be asked for feedback.`
        }
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setEndOpen(false)} autoFocus>
            Keep going
          </Button>
          <Button variant="danger" onClick={end}>
            {isAi ? "End interview" : "Leave call"}
          </Button>
        </div>
      </Dialog>

      <StatePreview className="fixed bottom-5 left-4 z-20 hidden md:block" />
    </div>
  );
}
