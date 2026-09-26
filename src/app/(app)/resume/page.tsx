"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Pencil, Upload } from "lucide-react";
import { apiFetch, useApiResource } from "@/lib/use-api";
import type { ResumeView } from "@/lib/views";
import { ParsedResumeEditor, type EditableResume } from "@/components/ParsedResumeEditor";
import { ResumeUploader } from "@/components/ResumeUploader";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stamp } from "@/components/ui/Stamp";
import { ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

const isParsing = (r: ResumeView | null) => r?.parseStatus === "PENDING" || r?.parseStatus === "PROCESSING";

export default function ResumePage() {
  const { status, data, retry, reload, mutate } = useApiResource<ResumeView | null>("/api/resume", {
    isEmpty: (r) => r === null,
    pollWhile: isParsing,
  });
  const [draft, setDraft] = useState<EditableResume | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resume = data ?? null;
  const details: EditableResume = {
    summary: resume?.summary ?? "",
    skills: resume?.skills ?? [],
    experience: resume?.experience ?? [],
  };

  async function save(edits: EditableResume) {
    setSaving(true);
    setSaveError(null);
    try {
      mutate(
        await apiFetch<ResumeView>("/api/resume", {
          method: "PATCH",
          body: JSON.stringify({
            summary: edits.summary,
            skills: edits.skills,
            experience: edits.experience.map(({ title, company, start, end, bullets }) => ({
              title,
              company,
              start,
              end,
              bullets: bullets.filter(Boolean),
            })),
          }),
        }),
      );
      setDraft(null);
      setSavedAt("Saved just now");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Your changes didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <title>Resume · hire-me-already</title>
      <PageHeader
        title="Resume"
        description="This is what matched interviewers see, and what the AI uses to ask about your work."
      />

      <StateView
        status={status}
        loading={<LoadingSheets label="Opening your resume…" layout="detail" />}
        error={
          <ErrorReturned title="Your resume didn't load" onRetry={retry}>
            Your file is still stored. We just couldn&apos;t fetch it; try again in a moment.
          </ErrorReturned>
        }
        empty={
          <section aria-labelledby="none-heading" className="sheet max-w-2xl p-6 sm:p-8">
            <h2 id="none-heading" className="text-[1.375rem] font-bold">
              No resume yet
            </h2>
            <p className="mt-1 text-ink-2">
              Without one, we can&apos;t match you with interviewers who know your field. Upload it once; you can edit
              what we read.
            </p>
            <ResumeUploader className="mt-6" onUploaded={() => reload()} />
          </section>
        }
      >
        <div className="grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
          {/* The file itself */}
          <section aria-labelledby="file-heading" className="lg:sticky lg:top-24">
            <h2 id="file-heading" className="visually-hidden">
              Current file
            </h2>
            <div className="relative pt-7">
              <div className="folder-tab">Current file</div>
              <div className="folder p-3">
                <div className="sheet p-5">
                  <FileText size={30} strokeWidth={1.6} aria-hidden="true" className="text-ink-2" />
                  <p className="mt-3 font-bold break-all">
                    {resume?.downloadUrl ? (
                      <a href={resume.downloadUrl} target="_blank" rel="noreferrer" className="underline hover:text-ink-2">
                        {resume.fileName}
                      </a>
                    ) : (
                      resume?.fileName
                    )}
                  </p>
                  <p className="text-[0.875rem] text-ink-2">
                    {resume?.fileSize}
                    {resume?.pages ? ` · ${resume.pages} pages` : null}
                  </p>
                  <p className="text-[0.875rem] text-ink-2">Uploaded {resume?.uploadedAt}</p>
                </div>
                <div className="flex gap-2 px-1 pt-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    icon={<Upload size={16} aria-hidden="true" />}
                    onClick={() => setReplacing(true)}
                    aria-expanded={replacing}
                    aria-controls="replace-panel"
                  >
                    Replace
                  </Button>
                  <Button
                    className="flex-1"
                    icon={<Pencil size={16} aria-hidden="true" />}
                    onClick={() => setDraft(details)}
                    disabled={draft !== null || resume?.parseStatus !== "READY"}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[0.8125rem] text-manila-ink">
              Shared with matched interviewers.{" "}
              <Link href="/settings#privacy" className="font-semibold underline">
                Change in Settings
              </Link>
            </p>
          </section>

          <div className="min-w-0 space-y-6">
            {replacing ? (
              <section id="replace-panel" aria-labelledby="replace-heading" className="sheet p-6">
                <h2 id="replace-heading" className="text-[1.125rem] font-bold">
                  Replace your resume
                </h2>
                <p className="mt-1 text-[0.9375rem] text-ink-2">We&apos;ll read the new file and you can check the details before saving.</p>
                <ResumeUploader
                  className="mt-5"
                  onCancel={() => setReplacing(false)}
                  onUploaded={(r) => {
                    mutate(r);
                    reload(); // polls until the new file is parsed
                    setReplacing(false);
                    setDraft(null);
                    setSavedAt(null);
                  }}
                />
              </section>
            ) : null}

            {draft ? (
              <section aria-labelledby="edit-heading" className="sheet p-6 sm:p-8">
                <h2 id="edit-heading" className="text-[1.375rem] font-bold">
                  Edit parsed details
                </h2>
                <p className="mt-1 mb-7 text-[0.9375rem] text-ink-2">Changes here don&apos;t alter your PDF, only what interviewers and the AI see.</p>
                <ParsedResumeEditor value={draft} onChange={setDraft} />
                {saveError ? (
                  <p role="alert" className="mt-6 text-[0.9375rem] text-stamp">
                    {saveError}
                  </p>
                ) : null}
                <div className="mt-8 flex justify-end gap-3 border-t border-edge pt-6">
                  <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={() => save(draft)} loading={saving} loadingLabel="Saving…">
                    Save changes
                  </Button>
                </div>
              </section>
            ) : isParsing(resume) ? (
              <section aria-labelledby="reading-heading" className="sheet p-6 sm:p-8">
                <h2 id="reading-heading" className="text-[1.375rem] font-bold">
                  Reading your resume
                </h2>
                <p className="mt-1 mb-6 text-[0.9375rem] text-ink-2">
                  Pulling out your skills and experience. This usually takes a few seconds.
                </p>
                <LoadingSheets label="Reading your resume…" layout="detail" />
              </section>
            ) : resume?.parseStatus === "FAILED" ? (
              <section aria-labelledby="failed-heading">
                <h2 id="failed-heading" className="visually-hidden">
                  Couldn&apos;t read this file
                </h2>
                <ErrorReturned title="We couldn't read this file" onRetry={() => setReplacing(true)}>
                  It may be a scan or a photo of a page. Replace it with the PDF exported from your editor.
                </ErrorReturned>
              </section>
            ) : (
              <section aria-labelledby="parsed-heading" className="sheet relative p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <h2 id="parsed-heading" className="text-[1.375rem] font-bold">
                    What we read
                  </h2>
                  {savedAt ? (
                    <Stamp tone="ink" land rotate={-6} className="text-[0.75rem]">
                      <span role="status">{savedAt}</span>
                    </Stamp>
                  ) : null}
                </div>
                <p className="mt-4 max-w-[68ch] text-[1.0625rem] leading-relaxed">{details.summary || <span className="text-ink-2">No summary.</span>}</p>

                <h3 className="cond mt-8 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Skills</h3>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {details.skills.map((s) => (
                    <li key={s} className="rounded-[3px] border-[1.5px] border-edge px-2.5 py-1 text-[0.875rem] font-medium">
                      {s}
                    </li>
                  ))}
                </ul>

                <h3 className="cond mt-8 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Experience</h3>
                <ol className="mt-3 divide-y divide-edge">
                  {details.experience.map((e) => (
                    <li key={e.id} className="grid gap-1 py-4 first:pt-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6">
                      <p className="tnum text-[0.875rem] text-ink-2">
                        {e.start}–{e.end}
                      </p>
                      <div>
                        <p className="font-bold">
                          {e.title} <span className="font-normal text-ink-2">at {e.company}</span>
                        </p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.9375rem] leading-relaxed marker:text-ink-3">
                          {e.bullets.filter(Boolean).map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ol>

                <h3 className="cond mt-6 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Education</h3>
                {resume?.education.map((ed) => (
                  <p key={ed.school} className="mt-2 text-[0.9375rem]">
                    {ed.degree}, {ed.school} ({ed.year})
                  </p>
                ))}
              </section>
            )}
          </div>
        </div>
      </StateView>
    </>
  );
}
