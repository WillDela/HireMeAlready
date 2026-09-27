import { cn } from "@/lib/cn";

type Variant = "horizontal" | "vertical" | "responsive";

/** The microphone that replaces the "I" in HIRE (README geometry). Height 0.72em, sitting on the baseline. */
function Mic() {
  return (
    <svg
      viewBox="0 0 70 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ height: "0.72em", width: "auto", margin: "0 0.05em 0 0.06em", display: "inline-block", verticalAlign: "baseline", overflow: "visible" }}
    >
      <rect x="25" y="5" width="20" height="46" rx="10" />
      <path d="M 6 40 V 46 A 29 29 0 0 0 64 46 V 40" />
      <line x1="35" y1="75" x2="35" y2="95" />
    </svg>
  );
}

const RED = "#E5322D";
const type = "font-brand font-extrabold uppercase tracking-[-0.035em] whitespace-nowrap";

function Ready() {
  return (
    <span className="italic" style={{ color: RED }}>
      READY
    </span>
  );
}

/**
 * The wordmark, built to the handoff spec (Montserrat 800, -0.035em, READY in 800 italic #E5322D, mic for
 * the I). Sized by font-size, so pass a `text-*` class. Ink follows the theme; the red never changes.
 * The supplied PNGs are cropped at the right edge of the Y, so the live lockup is used instead.
 */
export function Wordmark({
  variant = "responsive",
  className,
  horizontalClassName = "text-[2.5rem]",
  verticalClassName = "text-base",
}: {
  variant?: Variant;
  className?: string;
  horizontalClassName?: string;
  verticalClassName?: string;
}) {
  return (
    <span role="img" aria-label="Hire Me Already" className={cn("inline-block text-ink", className)}>
      {variant !== "horizontal" ? (
        <span
          aria-hidden="true"
          className={cn(type, "block pr-[0.08em] leading-[0.92]", verticalClassName, variant === "responsive" && "sm:hidden")}
        >
          <span className="block">
            H<Mic />
            RE
          </span>
          <span className="block">ME</span>
          <span className="block">
            AL
            <Ready />
          </span>
        </span>
      ) : null}
      {variant !== "vertical" ? (
        <span
          aria-hidden="true"
          className={cn(type, "block pr-[0.08em] leading-none", horizontalClassName, variant === "responsive" && "hidden sm:block")}
        >
          H<Mic />
          RE ME AL
          <Ready />
        </span>
      ) : null}
    </span>
  );
}
