import { cn } from "@/lib/cn";

/* Desk materials only, picked deterministically from the name. */
const tints = [
  "bg-manila-deep text-manila-ink",
  "bg-ink text-paper",
  "bg-manila-edge text-ink",
  "bg-paper-2 text-ink ring-[1.5px] ring-inset ring-edge",
];

function tintFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tints[h % tints.length];
}

export function Avatar({
  name,
  initials,
  size = 40,
  status,
  className,
}: {
  name: string;
  initials: string;
  size?: number;
  status?: "online" | "away" | "offline";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex flex-none", className)} style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-grid h-full w-full place-items-center rounded-full font-bold cond tracking-wide",
          tintFor(name),
        )}
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </span>
      {status ? (
        <span
          className={cn(
            "absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-paper",
            // Distinct by fill, not hue alone: solid ink = online, ink ring = away, empty = offline.
            status === "online" && "bg-ink",
            status === "away" && "bg-paper ring-[3px] ring-inset ring-ink",
            status === "offline" && "bg-paper ring-[1.5px] ring-inset ring-ink-3",
          )}
        >
          <span className="visually-hidden">{status}</span>
        </span>
      ) : null}
    </span>
  );
}
