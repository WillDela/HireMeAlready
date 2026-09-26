import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="wide text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink md:text-[2.625rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-[60ch] text-[1rem] text-manila-ink">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-none flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
