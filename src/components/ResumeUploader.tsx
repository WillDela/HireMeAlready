"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";

const ACCEPT = [".pdf", ".doc", ".docx"];
const MAX_BYTES = 5 * 1024 * 1024;

type Phase = { kind: "idle" } | { kind: "uploading"; name: string; progress: number } | { kind: "error"; message: string };

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Drag-and-drop or pick a resume. Validation and upload are simulated;
 * `onUploaded` fires with the file's name and size once "parsed".
 */
export function ResumeUploader({
  onUploaded,
  onCancel,
  forceError,
  className,
}: {
  onUploaded: (file: { name: string; size: string }) => void;
  onCancel?: () => void;
  forceError?: string | null;
  className?: string;
}) {
  const inputId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const timer = useRef<number | null>(null);

  const [done, setDone] = useState<{ name: string; size: string } | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const onUploadedRef = useRef(onUploaded);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);

  const finished = phase.kind === "uploading" && phase.progress >= 100;
  useEffect(() => {
    if (!finished || !done) return;
    if (timer.current) window.clearInterval(timer.current);
    const t = window.setTimeout(() => onUploadedRef.current(done), 450);
    return () => window.clearTimeout(t);
  }, [finished, done]);

  const shown: Phase = forceError ? { kind: "error", message: forceError } : phase;

  function accept(file: File | undefined) {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.includes(ext)) {
      setPhase({ kind: "error", message: `${file.name} isn't a PDF or Word file. Export your resume as PDF and try again.` });
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhase({ kind: "error", message: `${file.name} is ${formatSize(file.size)}. Resumes need to be under 5 MB.` });
      return;
    }
    setDone({ name: file.name, size: formatSize(file.size) });
    setPhase({ kind: "uploading", name: file.name, progress: 0 });
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setPhase((p) => (p.kind === "uploading" ? { ...p, progress: Math.min(100, p.progress + 12) } : p));
    }, 140);
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
          PDF or Word, up to 5 MB
        </p>
        <label htmlFor={inputId} className="btn btn-secondary btn-sm mt-5 cursor-pointer">
          Choose a file
        </label>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT.join(",")}
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
