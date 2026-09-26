import type { ReactNode } from "react";
import { MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A participant's video. This prototype has no media stream, so a live
 * camera renders as the person's monogram on the feed ground.
 */
export function VideoTile({
  name,
  initials,
  self = false,
  muted = false,
  cameraOff = false,
  speaking = false,
  compact = false,
  className,
  children,
}: {
  name: string;
  initials: string;
  self?: boolean;
  muted?: boolean;
  cameraOff?: boolean;
  speaking?: boolean;
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const label = self ? "You" : name;
  return (
    <figure
      className={cn(
        "relative isolate m-0 overflow-hidden rounded-[6px] bg-night-2",
        speaking && "outline-[3px] outline-offset-0 outline-hi",
        className,
      )}
      aria-label={`${label}${cameraOff ? ", camera off" : ""}${muted ? ", muted" : ""}`}
    >
      {cameraOff ? (
        <div className="absolute inset-0 grid place-items-center text-ink-2">
          <div className="flex flex-col items-center gap-2">
            <VideoOff size={compact ? 20 : 28} aria-hidden="true" />
            {!compact ? <span className="text-[0.875rem] font-semibold">Camera off</span> : null}
          </div>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_50%_30%,oklch(0.34_0.04_250),oklch(0.2_0.03_266)_70%)]"
        >
          <span
            className={cn(
              "cond font-extrabold tracking-[0.02em] text-[oklch(0.9_0.02_95/0.85)]",
              compact ? "text-[1.75rem]" : "text-[clamp(3rem,10vw,7rem)]",
            )}
          >
            {initials}
          </span>
        </div>
      )}

      {children}

      <figcaption
        className={cn(
          "absolute bottom-2 left-2 flex items-center gap-1.5 rounded-[3px] bg-[oklch(0.12_0.02_266/0.72)] font-semibold text-[oklch(0.96_0.01_95)]",
          compact ? "px-1.5 py-0.5 text-[0.75rem]" : "px-2.5 py-1 text-[0.875rem]",
        )}
      >
        {muted ? <MicOff size={compact ? 12 : 14} aria-hidden="true" className="text-[oklch(0.75_0.15_29)]" /> : null}
        {label}
      </figcaption>
    </figure>
  );
}
