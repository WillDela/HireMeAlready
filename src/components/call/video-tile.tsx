"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export function VideoTile({
  stream,
  label,
  muted = false,
  mirrored = false,
  className,
}: {
  stream: MediaStream | null;
  label: string;
  /** Always mute your own tile, or you'll hear yourself. */
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-lg bg-night", className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn("size-full object-cover", mirrored && "-scale-x-100")}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          No video yet
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{label}</span>
    </div>
  );
}
