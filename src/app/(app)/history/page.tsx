"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { InterviewListItem } from "@/lib/contracts";
import { toSummaryView } from "@/lib/interview-view";
import type { InterviewType } from "@/lib/mock";
import { useApiResource } from "@/lib/use-api";
import { InterviewTable } from "@/components/InterviewTable";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

type Filter = "all" | InterviewType;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "human", label: "Human" },
];

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { status, data: items, retry } = useApiResource<InterviewListItem[]>("/api/interviews", {
    isEmpty: (d) => d.length === 0,
  });
  const data = useMemo(() => (items ?? []).map(toSummaryView), [items]);
  const shown = filter === "all" ? data : data.filter((i) => i.type === filter);
  const scored = data.filter((i) => i.score !== null);
  const avg = scored.reduce((s, i) => s + (i.score ?? 0), 0) / Math.max(1, scored.length);

  return (
    <>
      <title>History · hire-me-already</title>
      <PageHeader
        title="History"
        description={
          status === "ready"
            ? `${data.length} ${data.length === 1 ? "interview" : "interviews"} filed.${
                scored.length ? ` Average score ${avg.toFixed(1)} across ${scored.length} scored.` : ""
              }`
            : "Every practice interview, with its transcript, analysis and feedback."
        }
        actions={
          <fieldset className="flex items-center gap-2">
            <legend className="visually-hidden">Filter by interview type</legend>
            <span aria-hidden="true" className="text-[0.8125rem] font-semibold text-manila-ink">
              Show
            </span>
            <div className="inline-flex rounded-[5px] border-[1.5px] border-ink p-[2px]">
              {filters.map((f) => {
                const checked = filter === f.value;
                return (
                  <label
                    key={f.value}
                    className={cn(
                      "cond h-8 cursor-pointer content-center rounded-[3px] px-3.5 text-[0.8125rem] font-bold tracking-[0.04em] uppercase transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                      checked ? "bg-ink text-paper" : "text-ink hover:bg-[color-mix(in_oklch,var(--ink)_10%,transparent)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="type-filter"
                      className="visually-hidden"
                      checked={checked}
                      onChange={() => setFilter(f.value)}
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        }
      />

      <StateView
        status={status}
        loading={<LoadingSheets label="Pulling your interviews…" rows={5} />}
        error={
          <ErrorReturned title="Your history didn't load" onRetry={retry}>
            Your interviews are safe; we couldn&apos;t fetch the list. Try again in a moment.
          </ErrorReturned>
        }
        empty={
          <div className="sheet">
            <EmptyFolder
              title="Nothing filed yet"
              action={
                <>
                  <ButtonLink href="/practice/ai">Practice with AI</ButtonLink>
                  <ButtonLink href="/practice/live" variant="secondary">
                    Practice with a person
                  </ButtonLink>
                </>
              }
            >
              After each practice interview, its score, transcript and feedback are filed here.
            </EmptyFolder>
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="sheet">
            <EmptyFolder compact title={`No ${filter === "ai" ? "AI" : "human"} interviews yet`}>
              Switch the filter to All to see everything.
            </EmptyFolder>
          </div>
        ) : (
          <InterviewTable interviews={shown} caption={`Past interviews, ${filters.find((f) => f.value === filter)?.label}`} />
        )}
      </StateView>
    </>
  );
}
