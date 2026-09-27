"use client";

import { useState, type ReactNode } from "react";
import { Check, Mic, MicOff, TriangleAlert, Video, VideoOff, Volume2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  canPickSpeaker,
  playTestSound,
  useLocalMedia,
  useMicLevel,
  type DeviceOption,
  type DeviceStatus,
  type Permission,
} from "@/lib/rtc/use-local-media";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { VideoTile } from "./VideoTile";

export type { Permission };

/** Rows shown when a state is forced for review (via `?state=`). */
const FORCED_ROWS: Record<Permission, DeviceStatus> = {
  checking: "checking",
  granted: "ok",
  denied: "blocked",
  none: "missing",
  busy: "busy",
  unsupported: "blocked",
};

/** The saved device if it's still plugged in, else the first one listed. */
const pick = (options: DeviceOption[], id: string) =>
  options.some((o) => o.value === id) ? id : (options[0]?.value ?? "");

function MicMeter({
  stream,
  active,
  muted,
  label,
}: {
  stream: MediaStream | null;
  active: boolean;
  muted: boolean;
  label: string;
}) {
  const level = useMicLevel(stream, active);
  const segments = 18;
  const lit = Math.round((level / 100) * segments);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span id="mic-meter-label" className="text-[0.875rem] font-semibold">
          {label}
        </span>
        <span className="text-[0.8125rem] text-ink-2">
          {muted ? "You're muted" : level > 20 ? "We can hear you" : "Say something to test"}
        </span>
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

const ROW_TEXT: Record<DeviceStatus, string> = {
  ok: "Allowed",
  found: "Found",
  blocked: "Blocked",
  missing: "Not found",
  busy: "In use",
  checking: "Checking…",
};

function PermissionRow({ label, state }: { label: string; state: DeviceStatus }) {
  const bad = state === "blocked" || state === "missing" || state === "busy";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="font-semibold">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-[0.875rem] font-semibold",
          (state === "ok" || state === "found") && "text-ink",
          bad && "text-stamp",
          state === "checking" && "text-ink-2",
        )}
      >
        {state === "ok" || state === "found" ? <Check size={16} aria-hidden="true" /> : null}
        {bad ? <X size={16} aria-hidden="true" /> : null}
        {state === "checking" ? <Spinner size={14} /> : null}
        {ROW_TEXT[state]}
      </span>
    </li>
  );
}

function Problem({ title, children, onRetry }: { title: string; children: ReactNode; onRetry: () => void }) {
  return (
    <div role="alert" className="sheet flex gap-3 p-5">
      <TriangleAlert size={20} aria-hidden="true" className="mt-0.5 flex-none text-stamp" />
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-[0.9375rem] text-ink-2">{children}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Check again
        </Button>
      </div>
    </div>
  );
}

/**
 * Lobby device check: live camera preview, mic level, device pickers, speaker test,
 * permissions, join. Holds the real camera and mic until it unmounts.
 */
export function DeviceCheck({
  forcedPermission = null,
  onJoin,
  onRetry,
  joinLabel = "Join call",
  joining = false,
}: {
  /** Show this state instead of the real one, for reviewing each state. */
  forcedPermission?: Permission | null;
  onJoin: () => void;
  /** Called alongside the real re-check, e.g. to clear a forced state. */
  onRetry?: () => void;
  joinLabel?: string;
  joining?: boolean;
}) {
  const currentUser = useCurrentUser();
  const media = useLocalMedia();
  const [testing, setTesting] = useState(false);
  const [soundFailed, setSoundFailed] = useState(false);
  const permission = forcedPermission ?? media.permission;
  const granted = permission === "granted";
  const cameraRow = forcedPermission ? FORCED_ROWS[forcedPermission] : media.camera;
  const micRow = forcedPermission ? FORCED_ROWS[forcedPermission] : media.mic;
  const { cameraOn, micOn } = media.prefs;

  const { cameras, microphones } = media.devices;
  // Firefox and Safari don't list outputs or can't switch them; sound goes to the system default.
  const speakerChoice = media.devices.speakers.length > 0 && canPickSpeaker();
  const speakers = speakerChoice ? media.devices.speakers : [{ value: "", label: "System default" }];

  function retry() {
    onRetry?.();
    media.retry();
  }

  async function testSpeakers() {
    setTesting(true);
    setSoundFailed(false);
    try {
      await playTestSound(speakerChoice ? pick(speakers, media.prefs.speakerId) : "");
    } catch {
      setSoundFailed(true);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
      <div>
        <div className="relative">
          <VideoTile
            name={currentUser.name}
            initials={currentUser.initials}
            self
            stream={granted ? media.stream : null}
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
              onClick={() => media.setMicOn(!micOn)}
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
              onClick={() => media.setCameraOn(!cameraOn)}
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
          <MicMeter stream={media.stream} active={granted && micOn} muted={granted && !micOn} label="Microphone level" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="perm-heading" className="sheet px-5 pt-4 pb-2">
          <h2 id="perm-heading" className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
            Permissions
          </h2>
          <ul className="divide-y divide-edge" aria-live="polite">
            <PermissionRow label="Camera" state={cameraRow} />
            <PermissionRow label="Microphone" state={micRow} />
          </ul>
        </section>

        {permission === "denied" ? (
          <Problem title="Your browser blocked the camera and microphone" onRetry={retry}>
            Select the camera icon in the address bar, choose Allow for both, then check again.
          </Problem>
        ) : null}
        {permission === "none" ? (
          <Problem
            title={
              cameraRow === "missing" && micRow !== "missing"
                ? "No camera found"
                : micRow === "missing" && cameraRow !== "missing"
                  ? "No microphone found"
                  : "No camera or microphone found"
            }
            onRetry={retry}
          >
            Plug one in, then check again.
          </Problem>
        ) : null}
        {permission === "busy" ? (
          <Problem title="Another app is using your camera or microphone" onRetry={retry}>
            Close other video call apps or browser tabs that use it, then check again.
          </Problem>
        ) : null}
        {permission === "unsupported" ? (
          <Problem title="This page can't reach your camera" onRetry={retry}>
            Browsers only allow the camera on secure pages. Open the site over https (or localhost) in an up-to-date browser.
          </Problem>
        ) : null}

        <section aria-label="Devices" className="sheet space-y-4 p-5">
          <SelectField
            label="Camera"
            options={cameras}
            value={pick(cameras, media.prefs.cameraId)}
            onChange={(e) => media.selectCamera(e.target.value)}
            disabled={!granted || cameras.length === 0}
          />
          <SelectField
            label="Microphone"
            options={microphones}
            value={pick(microphones, media.prefs.micId)}
            onChange={(e) => media.selectMic(e.target.value)}
            disabled={!granted || microphones.length === 0}
          />
          <div className="flex items-end gap-2">
            <SelectField
              className="flex-1"
              label="Speakers"
              options={speakers}
              value={pick(speakers, media.prefs.speakerId)}
              onChange={(e) => media.selectSpeaker(e.target.value)}
              disabled={!granted || !speakerChoice}
            />
            <Button
              variant="secondary"
              className="!min-h-11"
              onClick={testSpeakers}
              disabled={!granted || testing}
              icon={<Volume2 size={17} aria-hidden="true" />}
            >
              {testing ? "Playing…" : "Test"}
            </Button>
          </div>
          {soundFailed ? (
            <p role="alert" className="text-[0.875rem] font-semibold text-stamp">
              Couldn&apos;t play the test sound. Check that this speaker is connected, then try again.
            </p>
          ) : (
            <p className="text-[0.8125rem] text-ink-2">
              {testing ? "You should hear a short chime. No sound? Turn up your volume or pick another speaker." : "Plays a short chime so you can check your volume."}
            </p>
          )}
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
