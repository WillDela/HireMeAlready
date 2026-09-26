"use client";

import { useId, useState, type DragEvent } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { RESUME_MAX_BYTES, type UploadUrlResponse } from "@/lib/contracts";
import { apiFetch } from "@/lib/use-api";
import { formatBytes, type ResumeView } from "@/lib/views";
import { Button } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";

type Phase = { kind: "idle" } | { kind: "uploading"; name: string; progress: number } | { kind: "error"; message: string };

/** PUT straight to Spaces with the presigned URL. XHR rather than fetch, for upload progress. */
function putFile(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/pdf"); // must match what the URL was signed with
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

/**
 * Drag-and-drop or pick a PDF resume. Uploads it to storage, then tells the API it's
 * there; `onUploaded` fires with the new resume, which is parsed in the background.
 */
export function ResumeUploader({
  onUploaded,
  onCancel,
  forceError,
  className,
}: {
  onUploaded: (resume: ResumeView) => void;
  onCancel?: () => void;
  forceError?: string | null;
  className?: string;
}) {
  const inputId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const shown: Phase = forceError ? { kind: "error", message: forceError } : phase;

  async function accept(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPhase({ kind: "error", message: `${file.name} isn't a PDF. Export your resume as PDF and try again.` });
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setPhase({ kind: "error", message: `${file.name} is ${formatBytes(file.size)}. Resumes need to be under 5 MB.` });
      return;
    }
    setPhase({ kind: "uploading", name: file.name, progress: 0 });
    try {
      const { uploadUrl, resumeId } = await apiFetch<UploadUrlResponse>("/api/resume/upload-url", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, size: file.size }),
      });
      await putFile(uploadUrl, file, (progress) => setPhase({ kind: "uploading", name: file.name, progress }));
      setPhase({ kind: "uploading", name: file.name, progress: 100 });
      onUploaded(await apiFetch<ResumeView>("/api/resume", { method: "POST", body: JSON.stringify({ resumeId }) }));
      setPhase({ kind: "idle" });
    } catch (err) {
      setPhase({
        kind: "error",
        message: `${file.name} didn't upload${err instanceof Error ? ` (${err.message})` : ""}. Check your connection and try again.`,
      });
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files?.[0]);
  }

  if (shown.kind === "uploading") {
    return (
      <div className={cn("sheet-flat p-6", className)} role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <FileText size={22} aria-hidden="true" className="text-ink-2" />
          <p className="min-w-0 flex-1 truncate font-semibold">{shown.name}</p>
          <span className="tnum text-[0.875rem] text-ink-2">{shown.progress}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-[2px] bg-[color-mix(in_oklch,var(--ink)_12%,transparent)]">
          <div className="h-full bg-ink transition-[width] duration-150" style={{ width: `${shown.progress}%` }} />
        </div>
        <p className="mt-3 text-[0.875rem] text-ink-2">
          {shown.progress < 100 ? "Uploading…" : "Reading your skills and experience…"}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center rounded-[4px] border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
          dragging ? "border-ink bg-hi/40" : "border-manila-edge bg-paper hover:bg-paper-2",
          shown.kind === "error" && "border-stamp",
        )}
      >
        <UploadCloud size={34} strokeWidth={1.75} aria-hidden="true" className="text-ink-2" />
        <p className="mt-3 text-[1.0625rem] font-bold">{dragging ? "Drop it here" : "Drag your resume here"}</p>
        <p id={hintId} className="mt-1 text-[0.875rem] text-ink-2">
          PDF, up to 5 MB
        </p>
        <label htmlFor={inputId} className="btn btn-secondary btn-sm mt-5 cursor-pointer">
          Choose a file
        </label>
        <input
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          aria-describedby={hintId}
          className="visually-hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {shown.kind === "error" ? (
        <div role="alert" className="mt-4 flex items-start gap-3 text-[0.9375rem]">
          <Stamp tone="stamp" rotate={-6} land className="flex-none text-[0.75rem]">
            Returned
          </Stamp>
          <p className="text-ink">{shown.message}</p>
        </div>
      ) : null}

      {onCancel ? (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}
