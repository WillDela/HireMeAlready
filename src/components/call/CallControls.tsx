"use client";

import type { ReactNode } from "react";
import { Flag, FolderOpen, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/cn";

function Control({
  label,
  icon,
  on = true,
  tone = "default",
  onClick,
  expanded,
  controls,
}: {
  label: string;
  icon: ReactNode;
  on?: boolean;
  tone?: "default" | "end" | "quiet";
  onClick: () => void;
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      className="group flex w-16 flex-col items-center gap-1.5 text-[0.75rem] font-semibold text-ink-2 hover:text-ink sm:w-[4.5rem]"
    >
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-full border-[1.5px] transition-colors duration-150",
          tone === "end" && "border-stamp bg-stamp text-[oklch(0.99_0_0)] group-hover:bg-[color-mix(in_oklch,var(--stamp)_85%,black)]",
          tone === "quiet" && "border-edge text-ink group-hover:border-ink",
          tone === "default" &&
            (on
              ? "border-[oklch(0.955_0.012_95)] bg-[oklch(0.955_0.012_95)] text-night"
              : "border-[oklch(0.955_0.012_95/0.7)] bg-transparent text-stamp"),
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

/** Mic and camera invert fully between on (filled) and off (hollow, slashed). */
export function CallControls({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onReport,
  onEnd,
  panel,
  endLabel = "End",
}: {
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onReport: () => void;
  onEnd: () => void;
  panel?: { open: boolean; onToggle: () => void; id: string };
  endLabel?: string;
}) {
  return (
    <div role="group" aria-label="Call controls" className="flex items-start justify-center gap-1 sm:gap-3">
      <Control
        label={micOn ? "Mute" : "Unmute"}
        on={micOn}
        onClick={onToggleMic}
        icon={micOn ? <Mic size={21} aria-hidden="true" /> : <MicOff size={21} aria-hidden="true" />}
      />
      <Control
        label={cameraOn ? "Stop video" : "Start video"}
        on={cameraOn}
        onClick={onToggleCamera}
        icon={cameraOn ? <Video size={21} aria-hidden="true" /> : <VideoOff size={21} aria-hidden="true" />}
      />
      {panel ? (
        <Control
          label={panel.open ? "Hide file" : "Show file"}
          tone="quiet"
          onClick={panel.onToggle}
          expanded={panel.open}
          controls={panel.id}
          icon={<FolderOpen size={20} aria-hidden="true" />}
        />
      ) : null}
      <Control label="Report" tone="quiet" onClick={onReport} icon={<Flag size={19} aria-hidden="true" />} />
      <Control label={endLabel} tone="end" onClick={onEnd} icon={<PhoneOff size={21} aria-hidden="true" />} />
    </div>
  );
}
