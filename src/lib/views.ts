import type { GeneratedQuestion, ParsedResume } from "@/lib/contracts";
import type { Profile, Question as QuestionRow, Resume } from "@/generated/prisma/client";
import type {
  Experience,
  InterviewDetail,
  InterviewSummary,
  Question,
  QuestionSource,
  ParsedResume as ResumeScreenData,
  Role,
} from "@/lib/mock";

// Row → screen shapes. The UI was built against the types in src/lib/mock.ts, so API
// routes return those shapes and screens only swap where the data comes from.
// Pure functions: no db access here, so client components can import the types.

/** The signed-in user as the app shell and settings see them. */
export type Viewer = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  headline: string;
  targetRole: string;
  linkedinUrl: string;
  onboarded: boolean; // false until they confirm their profile at /onboarding
  isAdmin: boolean;
  defaultRole: Role;
  recordingConsent: boolean;
  shareResumeWithMatches: boolean;
  discoverable: boolean;
};

/** "Ada Lovelace" → "AL"; a one-word name (or none) uses its first two letters. */
export function initialsFor(name: string, email = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? email).slice(0, 2);
  return initials.toUpperCase();
}

export function toViewer(user: { id: string; name: string; email: string }, profile: Profile): Viewer {
  const words = user.name.trim().split(/\s+/).filter(Boolean);
  return {
    id: user.id,
    name: user.name,
    firstName: words[0] ?? user.name,
    initials: initialsFor(user.name, user.email),
    email: user.email,
    headline: profile.headline ?? "",
    targetRole: profile.targetRole ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    onboarded: profile.onboardedAt !== null,
    isAdmin: profile.isAdmin,
    defaultRole: profile.preferredRole === "INTERVIEWER" ? "interviewer" : "interviewee",
    recordingConsent: profile.recordingConsent,
    shareResumeWithMatches: profile.shareResume,
    discoverable: profile.discoverable,
  };
}

export type ResumeView = ResumeScreenData & {
  id: string;
  parseStatus: Resume["parseStatus"];
  downloadUrl: string | null;
  /** Profile fields drafted from the resume, for onboarding to pre-fill. "" when not found. */
  suggested: { name: string; headline: string; targetRole: string; linkedinUrl: string };
};

export function toResumeView(resume: Resume, downloadUrl: string | null): ResumeView {
  const parsed = resume.parsed as ParsedResume | null;
  return {
    id: resume.id,
    parseStatus: resume.parseStatus,
    downloadUrl,
    suggested: {
      name: parsed?.name ?? "",
      headline: parsed?.headline ?? "",
      targetRole: parsed?.targetRole || parsed?.experience[0]?.title || "",
      linkedinUrl: normalizeUrl(parsed?.linkedinUrl),
    },
    fileName: resume.fileName,
    fileSize: resume.sizeBytes ? formatBytes(resume.sizeBytes) : "",
    pages: 0, // not tracked; the resume page hides the count when it's 0
    uploadedAt: formatDate(resume.createdAt),
    summary: parsed?.summary ?? "",
    skills: parsed?.skills ?? [],
    experience: (parsed?.experience ?? []).map(
      (e, i): Experience => ({
        id: `e${i}`,
        title: e.title,
        company: e.company,
        start: e.start ?? "",
        end: e.end ?? "",
        bullets: e.bullets,
      }),
    ),
    education: (parsed?.education ?? []).map((ed) => ({
      school: ed.school,
      degree: ed.degree ?? "",
      year: ed.year ?? "",
    })),
  };
}

/**
 * Question.source for a generated question: Gemini's own label when it gives one;
 * otherwise reported ones cite the company, role-specific ones come from the job, and
 * the rest are common for the role.
 */
export function questionSource(q: GeneratedQuestion): QuestionSource {
  if (q.source) return q.source;
  if (q.sourceUrl) return "company";
  return q.category === "role-specific" ? "job" : "general";
}

export function toQuestionView(q: QuestionRow): Question {
  return {
    id: q.id,
    text: q.text,
    source: (["company", "job", "general"] as const).find((s) => s === q.source) ?? "general",
    note: q.rationale ?? undefined,
    sourceUrl: q.sourceUrl ?? undefined,
  };
}

/** GET /api/interviews: a row on /history. */
export type HistoryItem = InterviewSummary & { workOnNext: string | null };

/**
 * GET /api/interviews/:id. `analysisStatus` says why `analysis` is null: scoring hasn't
 * finished, or it failed. Same for the transcript.
 */
export type HistoryDetail = InterviewDetail & {
  analysisStatus: "ready" | "pending" | "failed";
  transcriptStatus: "ready" | "pending" | "failed";
};

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Resumes often write "linkedin.com/in/x" without a scheme, which the profile API rejects. */
function normalizeUrl(url: string | undefined) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** "Just now", "5m ago", "2h ago", "Yesterday", "3 days ago", then the date after a week. */
export function timeAgo(date: Date, now = new Date()) {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}
