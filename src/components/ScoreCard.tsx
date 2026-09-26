import { cn } from "@/lib/cn";

/** One scored dimension: the number, a five-step bar, and why. */
export function ScoreCard({
  name,
  score,
  rationale,
  className,
}: {
  name: string;
  score: number;
  rationale: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, score));
  return (
    <article className={cn("sheet flex flex-col p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.9375rem] font-bold">{name}</h3>
        <p className="tnum cond text-[2rem] leading-none font-extrabold tracking-[-0.01em]">
          {clamped.toFixed(1)}
          <span className="ml-0.5 text-[0.875rem] font-semibold text-ink-3">/5</span>
        </p>
      </div>
      <div
        role="img"
        aria-label={`${name}: ${clamped.toFixed(1)} out of 5`}
        className="mt-3 grid grid-cols-5 gap-1"
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, clamped - i));
          return (
            <span key={i} className="relative h-2 overflow-hidden rounded-[1px] bg-[color-mix(in_oklch,var(--ink)_12%,transparent)]">
              <span
                className={cn("absolute inset-y-0 left-0", "bg-ink")}
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-2">{rationale}</p>
    </article>
  );
}
