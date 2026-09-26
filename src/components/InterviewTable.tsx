import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InterviewSummary } from "@/lib/mock";

export function TypeTag({ type }: { type: InterviewSummary["type"] }) {
  return (
    <span className={cn("tag", type === "ai" ? "text-ink" : "border-ink bg-ink text-paper")}>
      {type === "ai" ? "AI" : "Human"}
    </span>
  );
}

function Score({ interview }: { interview: InterviewSummary }) {
  if (interview.score === null) {
    return (
      <span className="text-[0.875rem] text-ink-3">
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">Not scored</span>
        <span className="block text-[0.75rem]">You interviewed</span>
      </span>
    );
  }
  return (
    <span className="tnum cond text-[1.375rem] font-extrabold">
      {interview.score.toFixed(1)}
      <span className="text-[0.8125rem] font-semibold text-ink-3">/5</span>
    </span>
  );
}

/** Past interviews: a ruled ledger on desktop, stacked slips on mobile. */
export function InterviewTable({ interviews, caption }: { interviews: InterviewSummary[]; caption: string }) {
  return (
    <>
      <div className="sheet hidden overflow-hidden md:block">
        <table className="w-full border-collapse text-left">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr className="border-b-2 border-ink/80">
              {["Date", "Type", "Company", "Partner", "Score"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    "cond px-5 py-3 text-[0.75rem] font-bold tracking-[0.09em] text-ink-2 uppercase",
                    h === "Score" && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
              <th scope="col" className="w-10">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {interviews.map((iv) => (
              <tr key={iv.id} className="group relative border-b border-edge last:border-b-0 hover:bg-paper-2">
                <td className="px-5 py-4 text-[0.9375rem] whitespace-nowrap text-ink-2">
                  <time dateTime={iv.date}>{iv.dateLabel}</time>
                </td>
                <td className="px-5 py-4">
                  <TypeTag type={iv.type} />
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/history/${iv.id}`}
                    className="font-semibold text-ink no-underline after:absolute after:inset-0 after:content-[''] hover:underline"
                  >
                    {iv.company}
                  </Link>
                  <span className="block text-[0.875rem] text-ink-2">{iv.jobTitle}</span>
                </td>
                <td className="px-5 py-4 text-[0.9375rem]">{iv.partner}</td>
                <td className="px-5 py-4 text-right">
                  <Score interview={iv} />
                </td>
                <td className="pr-4 text-ink-3 group-hover:text-ink">
                  <ChevronRight size={18} aria-hidden="true" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {interviews.map((iv) => (
          <li key={iv.id} className="sheet relative flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[0.8125rem] text-ink-2">
                <TypeTag type={iv.type} />
                <time dateTime={iv.date}>{iv.dateLabel}</time>
              </div>
              <Link
                href={`/history/${iv.id}`}
                className="mt-1.5 block font-bold text-ink no-underline after:absolute after:inset-0 after:content-['']"
              >
                {iv.company}
              </Link>
              <p className="truncate text-[0.875rem] text-ink-2">
                {iv.jobTitle} · {iv.partner}
              </p>
            </div>
            <Score interview={iv} />
          </li>
        ))}
      </ul>
    </>
  );
}
