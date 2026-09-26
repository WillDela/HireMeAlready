import { cn } from "@/lib/cn";

/** A drawn wire clip overhanging a sheet's top edge. Place inside a `relative` sheet. */
export function PaperClip({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 26 64"
      width="22"
      height="54"
      fill="none"
      className={cn("pointer-events-none absolute -top-5 drop-shadow-[0_2px_1.5px_oklch(0.2_0.03_266/0.28)]", className)}
    >
      {/* Wire: outer loop, then the inner tongue. */}
      <path
        d="M8 46V13a5 5 0 0 1 10 0v38a7.5 7.5 0 0 1-15 0V9.5a10 10 0 0 1 20 0V43"
        stroke="oklch(0.62 0.018 250)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Highlight along the front wire. */}
      <path
        d="M18.6 16v33"
        stroke="oklch(0.9 0.01 250)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
