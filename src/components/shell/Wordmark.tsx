import { cn } from "@/lib/cn";

/** Typographic mark: the product name as a rubber stamp. */
export function Wordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <span
        className={cn("stamp text-[0.9375rem]", className)}
        style={{ ["--r" as string]: "-4deg", padding: "0.3em 0.4em" }}
        aria-label="hire-me-already"
        role="img"
      >
        HMA
      </span>
    );
  }
  return (
    <span
      className={cn("stamp flex-col items-start gap-0.5", className)}
      style={{ ["--r" as string]: "-3deg", padding: "0.45em 0.6em 0.4em" }}
      aria-label="hire-me-already"
      role="img"
    >
      <span className="text-[1.375rem] leading-[0.9] tracking-[0.04em]">Hire me</span>
      <span className="text-[0.8125rem] leading-none tracking-[0.34em]">already</span>
    </span>
  );
}
