"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { AdminReportItem, ReportStatus as ApiReportStatus } from "@/lib/contracts";
import { reportStatusLabel, type Report, type ReportStatus } from "@/lib/mock";
import { apiFetch, useApiResource } from "@/lib/use-api";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

type Filter = "active" | "all" | "closed";

const statusTone: Record<ReportStatus, string> = {
  open: "text-stamp",
  in_review: "text-manila-ink",
  actioned: "text-ink font-extrabold",
  dismissed: "text-ink-3",
};

function fromApi(item: AdminReportItem): Report {
  return {
    id: item.id,
    reporter: item.reporterName,
    reported: item.reportedName,
    reason: item.reason,
    details: item.details ?? "No further details.",
    date: new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    callId: item.interviewId,
    status: item.status.toLowerCase() as ReportStatus,
  };
}

function toApiStatus(status: ReportStatus): ApiReportStatus {
  return status.toUpperCase() as ApiReportStatus;
}

function StatusTag({ status }: { status: ReportStatus }) {
  return <span className={cn("tag", statusTone[status])}>{reportStatusLabel[status]}</span>;
}

function Actions({ report, onReview, onDismiss }: { report: Report; onReview: () => void; onDismiss: () => void }) {
  const closed = report.status === "actioned" || report.status === "dismissed";
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant={closed ? "ghost" : "secondary"} onClick={onReview} aria-label={`${closed ? "View" : "Review"} report ${report.id} from ${report.reporter}`}>
        {closed ? "View" : "Review"}
      </Button>
      {!closed ? (
        <Button size="sm" variant="ghost" onClick={onDismiss} aria-label={`Dismiss report ${report.id} from ${report.reporter}`}>
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const { status, data, mutate, retry } = useApiResource<AdminReportItem[]>("/api/admin/reports", {
    isEmpty: (d) => d.length === 0,
  });

  useEffect(() => {
    if (!currentUser.isAdmin) router.replace("/dashboard");
  }, [currentUser.isAdmin, router]);

  const items = useMemo(() => (data ?? []).map(fromApi), [data]);
  const open = items.find((r) => r.id === openId) ?? null;

  async function set(id: string, s: ReportStatus) {
    try {
      await apiFetch(`/api/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status: toApiStatus(s) }) });
      mutate((data ?? []).map((r) => (r.id === id ? { ...r, status: toApiStatus(s) } : r)));
    } catch {
      // Left as-is; the row's buttons stay available to retry.
    }
  }

  if (!currentUser.isAdmin) return null;

  const shown = items.filter((r) =>
    filter === "all" ? true : filter === "active" ? r.status === "open" || r.status === "in_review" : r.status === "actioned" || r.status === "dismissed",
  );
  const openCount = items.filter((r) => r.status === "open").length;

  return (
    <>
      <title>Reports · Admin · hire-me-already</title>
      <PageHeader
        title="Reports"
        description={status === "ready" ? `${openCount} open ${openCount === 1 ? "report needs" : "reports need"} review.` : "Reports people filed from calls."}
        actions={
          <fieldset className="flex items-center gap-2">
            <legend className="visually-hidden">Filter reports</legend>
            <div className="inline-flex rounded-[5px] border-[1.5px] border-ink p-[2px]">
              {(
                [
                  ["active", "Needs action"],
                  ["closed", "Closed"],
                  ["all", "All"],
                ] as const
              ).map(([value, label]) => {
                const checked = filter === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "cond h-8 cursor-pointer content-center rounded-[3px] px-3 text-[0.8125rem] font-bold tracking-[0.04em] uppercase has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                      checked ? "bg-ink text-paper" : "text-ink hover:bg-[color-mix(in_oklch,var(--ink)_10%,transparent)]",
                    )}
                  >
                    <input type="radio" name="report-filter" className="visually-hidden" checked={checked} onChange={() => setFilter(value)} />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        }
      />

      <StateView
        status={status}
        loading={<LoadingSheets label="Loading reports…" rows={5} />}
        error={
          <ErrorReturned title="Reports didn't load" onRetry={retry}>
            No report was lost. Try again in a moment.
          </ErrorReturned>
        }
        empty={
          <div className="sheet">
            <EmptyFolder title="No reports filed">When someone reports a call, it shows up here for review.</EmptyFolder>
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="sheet">
            <EmptyFolder compact title={filter === "active" ? "Nothing needs action" : "No closed reports"}>
              {filter === "active" ? "Every report has been reviewed." : "Reviewed reports land here."}
            </EmptyFolder>
          </div>
        ) : (
          <>
            <div className="sheet hidden overflow-x-auto md:block">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <caption className="visually-hidden">Reports</caption>
                <thead>
                  <tr className="border-b-2 border-ink/80">
                    {["Reporter", "Reported user", "Reason", "Date", "Status"].map((h) => (
                      <th key={h} scope="col" className="cond px-4 py-3 text-[0.75rem] font-bold tracking-[0.09em] text-ink-2 uppercase first:pl-5">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3 text-right">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className="border-b border-edge last:border-b-0">
                      <td className="px-4 py-3.5 pl-5 font-semibold">{r.reporter}</td>
                      <td className="tnum px-4 py-3.5 text-[0.9375rem]">{r.reported}</td>
                      <td className="max-w-[16rem] px-4 py-3.5 text-[0.9375rem]">{r.reason}</td>
                      <td className="px-4 py-3.5 text-[0.9375rem] whitespace-nowrap text-ink-2">{r.date}</td>
                      <td className="px-4 py-3.5">
                        <StatusTag status={r.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Actions report={r} onReview={() => setOpenId(r.id)} onDismiss={() => set(r.id, "dismissed")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-3 md:hidden" aria-label="Reports">
              {shown.map((r) => (
                <li key={r.id} className="sheet p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold">{r.reason}</p>
                    <StatusTag status={r.status} />
                  </div>
                  <p className="mt-1 text-[0.875rem] text-ink-2">
                    {r.reporter} reported <span className="tnum">{r.reported}</span> · {r.date}
                  </p>
                  <div className="mt-3">
                    <Actions report={r} onReview={() => setOpenId(r.id)} onDismiss={() => set(r.id, "dismissed")} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </StateView>

      <Dialog open={open !== null} onClose={() => setOpenId(null)} title={open ? `Report ${open.id}` : "Report"}>
        {open ? (
          <div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[0.9375rem]">
              {[
                ["Reporter", open.reporter],
                ["Reported user", open.reported],
                ["Date", open.date],
                ["Call", open.callId],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">{k}</dt>
                  <dd className="tnum font-semibold">{v}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Reason</dt>
                <dd className="font-semibold">{open.reason}</dd>
              </div>
              <div className="col-span-2">
                <dt className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">What happened</dt>
                <dd className="ruled mt-1 rounded-[3px] border-[1.5px] border-edge px-3">{open.details}</dd>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <dt className="font-semibold">Status</dt>
                <dd>
                  <StatusTag status={open.status} />
                </dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-edge pt-5">
              {open.status === "open" ? (
                <Button variant="secondary" onClick={() => set(open.id, "in_review")}>
                  Mark in review
                </Button>
              ) : null}
              {open.status === "open" || open.status === "in_review" ? (
                <>
                  <Button variant="ghost" onClick={() => set(open.id, "dismissed")}>
                    Dismiss
                  </Button>
                  <Button variant="danger" onClick={() => set(open.id, "actioned")}>
                    Take action
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => set(open.id, "open")}>
                  Reopen
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
