"use client";

import { useEffect, useState } from "react";
import { Check, Mic, MicOff, TriangleAlert, Video, VideoOff, Volume2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { currentUser, devices } from "@/lib/mock";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { VideoTile } from "./VideoTile";

export type Permission = "checking" | "granted" | "denied" | "none";

/** Simulated input level, 0-100, while the mic is on. */
function useMicLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!active) return;
    let t = 0;
    const id = window.setInterval(() => {
      t += 0.12;
      const speech = Math.abs(Math.sin(t * 2.7) * Math.sin(t * 0.9 + 1));
      setLevel(Math.round(8 + speech * 72 + Math.random() * 10));
    }, 90);
    return () => window.clearInterval(id);
  }, [active]);
  return active ? level : 0;
}

function MicMeter({ level, label }: { level: number; label: string }) {
  const segments = 18;
  const lit = Math.round((level / 100) * segments);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span id="mic-meter-label" className="text-[0.875rem] font-semibold">
          {label}
        </span>
        <span className="text-[0.8125rem] text-ink-2">{level > 12 ? "We can hear you" : "Say something to test"}</span>
      </div>
      <div
        role="meter"
        aria-labelledby="mic-meter-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={level}
        className="mt-2 flex h-4 gap-[3px]"
      >
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-[1px] transition-colors duration-75",
              i < lit ? (i >= segments - 2 ? "bg-stamp" : i >= segments - 6 ? "bg-hi" : "bg-ink") : "bg-[color-mix(in_oklch,var(--ink)_12%,transparent)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function PermissionRow({ label, state }: { label: string; state: "ok" | "blocked" | "checking" | "missing" }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="font-semibold">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-[0.875rem] font-semibold",
          state === "ok" && "text-ink",
          (state === "blocked" || state === "missing") && "text-stamp",
          state === "checking" && "text-ink-2",
        )}
      >
        {state === "ok" ? <Check size={16} aria-hidden="true" /> : null}
        {state === "blocked" || state === "missing" ? <X size={16} aria-hidden="true" /> : null}
        {state === "checking" ? <Spinner size={14} /> : null}
        {state === "ok" ? "Allowed" : state === "blocked" ? "Blocked" : state === "missing" ? "Not found" : "Checking…"}
      </span>
    </li>
  );
}

/** Lobby device check: preview, mic level, device pickers, permissions, join. */
export function DeviceCheck({
  permission,
  onJoin,
  onRetry,
  joinLabel = "Join call",
  joining = false,
}: {
  permission: Permission;
  onJoin: () => void;
  onRetry: () => void;
  joinLabel?: string;
  joining?: boolean;
}) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [testing, setTesting] = useState(false);
  const [camera, setCamera] = useState(devices.cameras[0]);
  const [mic, setMic] = useState(devices.microphones[0]);
  const [speaker, setSpeaker] = useState(devices.speakers[0]);
  const granted = permission === "granted";
  const level = useMicLevel(granted && micOn);

  useEffect(() => {
    if (!testing) return;
    const t = window.setTimeout(() => setTesting(false), 1600);
    return () => window.clearTimeout(t);
  }, [testing]);

  const rowState = (): "ok" | "blocked" | "checking" | "missing" =>
    permission === "granted" ? "ok" : permission === "denied" ? "blocked" : permission === "none" ? "missing" : "checking";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
      <div>
        <div className="relative">
          <VideoTile
            name={currentUser.name}
            initials={currentUser.initials}
            self
            cameraOff={!granted || !cameraOn}
            muted={!micOn}
            className="aspect-video w-full"
          >
            {permission === "checking" ? (
              <div className="absolute inset-0 grid place-items-center bg-night-2 text-ink-2">
                <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                  <Spinner size={18} /> Starting camera…
                </span>
              </div>
            ) : null}
          </VideoTile>
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              disabled={!granted}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full border-[1.5px] disabled:opacity-40",
                micOn ? "border-[oklch(0.955_0.012_95)] bg-[oklch(0.955_0.012_95)] text-night" : "border-[oklch(0.955_0.012_95/0.7)] bg-[oklch(0.15_0.02_266/0.6)] text-[oklch(0.75_0.15_29)]",
              )}
            >
              {micOn ? <Mic size={19} aria-hidden="true" /> : <MicOff size={19} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => setCameraOn((v) => !v)}
              disabled={!granted}
              aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full border-[1.5px] disabled:opacity-40",
                cameraOn ? "border-[oklch(0.955_0.012_95)] bg-[oklch(0.955_0.012_95)] text-night" : "border-[oklch(0.955_0.012_95/0.7)] bg-[oklch(0.15_0.02_266/0.6)] text-[oklch(0.75_0.15_29)]",
              )}
            >
              {cameraOn ? <Video size={19} aria-hidden="true" /> : <VideoOff size={19} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="sheet mt-4 p-4">
          <MicMeter level={level} label="Microphone level" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="perm-heading" className="sheet px-5 pt-4 pb-2">
          <h2 id="perm-heading" className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
            Permissions
          </h2>
          <ul className="divide-y divide-edge" aria-live="polite">
            <PermissionRow label="Camera" state={rowState()} />
            <PermissionRow label="Microphone" state={rowState()} />
          </ul>
        </section>

        {permission === "denied" ? (
          <div role="alert" className="sheet flex gap-3 p-5">
            <TriangleAlert size={20} aria-hidden="true" className="mt-0.5 flex-none text-stamp" />
            <div>
              <p className="font-bold">Your browser blocked the camera and microphone</p>
              <p className="mt-1 text-[0.9375rem] text-ink-2">
                Select the camera icon in the address bar, choose Allow for both, then check again.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
                Check again
              </Button>
            </div>
          </div>
        ) : null}
        {permission === "none" ? (
          <div role="alert" className="sheet flex gap-3 p-5">
            <TriangleAlert size={20} aria-hidden="true" className="mt-0.5 flex-none text-stamp" />
            <div>
              <p className="font-bold">No camera or microphone found</p>
              <p className="mt-1 text-[0.9375rem] text-ink-2">Plug one in or close apps that are using it, then check again.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
                Check again
              </Button>
            </div>
          </div>
        ) : null}

        <section aria-label="Devices" className="sheet space-y-4 p-5">
          <SelectField label="Camera" options={devices.cameras} value={camera} onChange={(e) => setCamera(e.target.value)} disabled={!granted} />
          <SelectField label="Microphone" options={devices.microphones} value={mic} onChange={(e) => setMic(e.target.value)} disabled={!granted} />
          <div className="flex items-end gap-2">
            <SelectField
              className="flex-1"
              label="Speakers"
              options={devices.speakers}
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              disabled={!granted}
            />
            <Button
              variant="secondary"
              className="!min-h-11"
              onClick={() => setTesting(true)}
              disabled={!granted || testing}
              icon={<Volume2 size={17} aria-hidden="true" />}
            >
              {testing ? "Playing…" : "Test"}
            </Button>
          </div>
        </section>

        <div>
          <Button size="lg" className="w-full" onClick={onJoin} disabled={!granted} loading={joining} loadingLabel="Joining…">
            {joinLabel}
          </Button>
          {!granted ? (
            <p className="mt-2 text-center text-[0.8125rem] text-manila-ink">
              {permission === "checking" ? "Checking your devices…" : "Allow your camera and microphone to join."}
            </p>
          ) : (
            <p className="mt-2 text-center text-[0.8125rem] text-manila-ink">This call is recorded for your feedback, as you agreed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
