import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "ink" | "stamp" | "muted";

const toneClass: Record<Tone, string> = {
  ink: "text-ink",
  stamp: "text-stamp",
  muted: "text-ink-3",
};

/**
 * A rubber stamp: double rule, condensed caps, worn ink. `land` plays the
 * thud once when the stamp first appears.
 */
export function Stamp({
  children,
  tone = "ink",
  rotate = -4,
  land = false,
  className,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  rotate?: number;
  land?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("stamp", toneClass[tone], land && "stamp-land", className)}
      style={{ ["--r" as string]: `${rotate}deg`, ...style }}
    >
      {children}
    </span>
  );
}

/** A round score stamp, e.g. 4.2 / 5. */
export function ScoreStamp({
  score,
  size = 132,
  label = "of 5",
  land = false,
  tone = "ink",
  rotate = -8,
}: {
  score: number;
  size?: number;
  label?: string;
  land?: boolean;
  tone?: Tone;
  rotate?: number;
}) {
  return (
    <span
      className={cn("stamp stamp-round tnum", toneClass[tone], land && "stamp-land")}
      style={{ ["--r" as string]: `${rotate}deg`, width: size, height: size, borderWidth: size > 90 ? 3.5 : 2.5 }}
      aria-label={`Score ${score.toFixed(1)} ${label}`}
      role="img"
    >
      <span style={{ fontSize: size * 0.36, letterSpacing: "0.01em", fontWeight: 800 }}>{score.toFixed(1)}</span>
      <span style={{ fontSize: Math.max(10, size * 0.1) }}>{label}</span>
    </span>
  );
}
