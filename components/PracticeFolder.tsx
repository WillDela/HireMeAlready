import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A tall manila folder with a sheet tucked inside. The sheet explains; the
 * folder's front pocket carries the one action.
 */
export function PracticeFolder({
  title,
  titleId,
  children,
  action,
  footnote,
  className,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
  action: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <article aria-labelledby={titleId} className={cn("relative flex flex-col pt-7", className)}>
      <div className="folder-tab w-36" aria-hidden="true" />
      <div className="folder flex flex-1 flex-col">
        <div className="flex flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="sheet flex-1 px-5 pt-6 pb-16 sm:px-6">
            <h2 id={titleId} className="text-[1.5rem] leading-tight font-extrabold tracking-[-0.015em] md:text-[1.75rem]">
              {title}
            </h2>
            <div className="mt-3 text-[0.9375rem] text-ink-2">{children}</div>
          </div>
        </div>
        {/* The pocket: folder front laid over the bottom of the sheet. */}
        <div className="relative -mt-10 flex flex-col gap-3 rounded-b-[6px] bg-manila-deep px-5 pt-5 pb-5 shadow-[0_-1px_0_var(--manila-edge),0_-10px_18px_-14px_var(--shade)] sm:px-6 sm:pb-6">
          {action}
          {footnote ? <p className="text-[0.8125rem] text-manila-ink">{footnote}</p> : null}
        </div>
      </div>
    </article>
  );
}
