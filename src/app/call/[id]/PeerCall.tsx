"use client";

import { notFound, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserX, WifiOff } from "lucide-react";
import type { IceServersResponse, PeerSession } from "@/lib/contracts";
import { usePeerCall } from "@/lib/rtc/use-peer-call";
import { apiFetch, useApiResource } from "@/lib/use-api";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { CallControls } from "@/components/call/CallControls";
import { InterviewerSidePanel } from "@/components/call/InterviewerSidePanel";
import { ReportDialog } from "@/components/call/ReportDialog";
import { VideoTile } from "@/components/call/VideoTile";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorReturned } from "@/components/ui/States";

// The peer branch of /call/[id]: a real interview matched on /practice/live. Shared
// with Stream A (video) and the AI-interviews stream; mock ids stay in page.tsx.

function useElapsed(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setS((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PeerCall({ id }: { id: string }) {
  // Polling keeps our heartbeat alive, shows when the other person leaves, and picks
  // up suggested questions that arrive after the match.
  const session = useApiResource<PeerSession>(`/api/interviews/${id}/peer`, {
    pollWhile: (s) => s.status === "PENDING" || s.status === "ACTIVE",
  });
  if (session.error?.status === 404) notFound();

  if (!session.data) {
    return (
      <div className="surface-night grid h-dvh place-items-center px-4">
        {session.status === "error" ? (
          <ErrorReturned title="Couldn't open this interview" onRetry={session.retry}>
            Check your connection and try again.
          </ErrorReturned>
        ) : (
          <p role="status" className="flex items-center gap-3 text-[1.0625rem] font-semibold">
            <Spinner size={22} /> Connecting to the interview…
          </p>
        )}
      </div>
    );
  }
  return <PeerRoom session={session.data} />;
}

function PeerRoom({ session }: { session: PeerSession }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const turn = useApiResource<IceServersResponse>("/api/turn-credentials");
  const call = usePeerCall({
    selfPeerId: session.selfPeerId,
    remotePeerId: session.remotePeerId,
    isCaller: session.isCaller,
    iceServers: turn.data?.iceServers ?? null,
  });
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  // Closed by default on small screens. PeerRoom only renders client-side, after the session loads.
  const [panelOpen, setPanelOpen] = useState(() => !window.matchMedia("(max-width: 1023px)").matches);
  const [reportOpen, setReportOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const reported = useRef(false);

  const { partner, interviewId } = session;
  const firstName = partner.name.split(" ")[0];
  const isInterviewer = session.role === "INTERVIEWER";
  const connected = call.state === "connected";
  const partnerGone =
    !leaving && (call.state === "ended" || session.status === "COMPLETED" || session.status === "ABANDONED");
  const elapsed = useElapsed(connected && !partnerGone);
  const panelId = "candidate-file";

  // The first connection starts the interview for both of us.
  useEffect(() => {
    if (!connected || reported.current) return;
    reported.current = true;
    setEverConnected(true);
    apiFetch(`/api/interviews/${interviewId}/peer`, {
      method: "PATCH",
      body: JSON.stringify({ event: "connected" }),
    }).catch(() => {
      reported.current = false;
    });
  }, [connected, interviewId]);

  useEffect(() => {
    call.localStream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [call.localStream, micOn]);
  useEffect(() => {
    call.localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
  }, [call.localStream, cameraOn]);

  // Once they've gone, release the camera and mic.
  const { hangUp } = call;
  useEffect(() => {
    if (partnerGone) hangUp();
  }, [partnerGone, hangUp]);

  async function leave(to = "/dashboard") {
    setLeaving(true);
    hangUp();
    // TODO(PR 2): go to /call/{id}/wrap-up once the wrap-up and feedback routes land.
    await apiFetch(`/api/interviews/${interviewId}/peer`, {
      method: "PATCH",
      body: JSON.stringify({ event: "left" }),
    }).catch(() => undefined);
    router.push(to);
  }

  const place = [session.jobTitle, session.company].filter(Boolean).join(", ");
  const candidate = session.candidate ?? {
    name: partner.name,
    initials: partner.initials,
    target: place || partner.headline,
    fileName: "",
    fileSize: "",
    pages: 0,
    uploadedAt: "",
    summary: `${firstName} chose not to share their resume.`,
    skills: [],
    experience: [],
    education: [],
  };
  const turnFailed = turn.status === "error";

  return (
    <div className="surface-night flex h-dvh flex-col">
      <title>{`In interview · ${partner.name}`}</title>
      <header className="flex h-14 flex-none items-center gap-3 px-4 sm:px-5">
        <h1 className="min-w-0 truncate text-[0.9375rem] font-semibold">
          Interview with {partner.name}
          {place ? <span className="hidden text-ink-2 sm:inline"> · {place}</span> : null}
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
          <VideoTile stream={call.remoteStream} name={partner.name} initials={partner.initials} className="h-full w-full" />

          <div className="absolute right-6 bottom-5 w-24 shadow-[0_12px_28px_-10px_oklch(0.03_0.02_266/0.8)] sm:right-8 sm:bottom-6 sm:w-52">
            <VideoTile
              stream={call.localStream}
              name={currentUser.name}
              initials={currentUser.initials}
              self
              compact
              muted={!micOn}
              cameraOff={!cameraOn}
              className="aspect-[3/4] w-full ring-1 ring-night-3 sm:aspect-video"
            />
          </div>

          {partnerGone ? (
            <div role="status" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/90 px-6 text-center sm:inset-x-4">
              <div className="flex flex-col items-center">
                <UserX size={30} aria-hidden="true" className="text-ink-2" />
                <p className="mt-3 text-[1.25rem] font-bold">
                  {everConnected ? `${firstName} left the call` : `${firstName} left before the call started`}
                </p>
                {everConnected ? (
                  <Button className="mt-5" onClick={() => leave()}>
                    Finish
                  </Button>
                ) : (
                  <Button className="mt-5" onClick={() => leave("/practice/live")}>
                    Find someone else
                  </Button>
                )}
              </div>
            </div>
          ) : call.state === "failed" || turnFailed ? (
            <div role="alert" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/90 px-6 text-center sm:inset-x-4">
              <div className="flex flex-col items-center">
                <WifiOff size={30} aria-hidden="true" className="text-stamp" />
                <p className="mt-3 text-[1.25rem] font-bold">Connection lost</p>
                <p className="mt-2 max-w-[42ch] text-ink-2">
                  {turnFailed ? "We couldn't reach the call server." : call.error}
                </p>
                <Button className="mt-5" onClick={() => window.location.reload()}>
                  Rejoin
                </Button>
              </div>
            </div>
          ) : call.state === "waiting" || call.state === "connecting" ? (
            <div role="status" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/85 px-6 text-center sm:inset-x-4">
              <div>
                <p className="text-[1.25rem] font-bold">Waiting for {partner.name} to join</p>
                <p className="mt-2 text-ink-2">The timer starts when they arrive. You can check your mic meanwhile.</p>
              </div>
            </div>
          ) : !connected && !leaving ? (
            <div role="status" className="absolute inset-3 grid place-items-center rounded-[6px] bg-night/85 sm:inset-x-4">
              <p className="flex items-center gap-3 text-[1.0625rem] font-semibold">
                <Spinner size={22} /> Connecting to the interview…
              </p>
            </div>
          ) : null}
        </main>

        {isInterviewer ? (
          <InterviewerSidePanel
            id={panelId}
            open={panelOpen}
            onToggle={() => setPanelOpen((o) => !o)}
            candidate={candidate}
            questions={session.questions}
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
          endLabel="Leave"
          panel={isInterviewer ? { open: panelOpen, onToggle: () => setPanelOpen((o) => !o), id: panelId } : undefined}
        />
      </footer>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} subject={partner.name} onLeave={() => leave()} />

      <Dialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        tone="danger"
        title="Leave the interview?"
        description={`The call ends for both of you. You can't rejoin ${firstName} after leaving.`}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setEndOpen(false)} autoFocus>
            Keep going
          </Button>
          <Button variant="danger" onClick={() => leave()} disabled={leaving}>
            Leave call
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
