import type { ParsedResume } from "@/lib/contracts";
import type { Profile, Resume } from "@/generated/prisma/client";
import type { Experience, ParsedResume as ResumeScreenData, Role } from "@/lib/mock";

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
  isAdmin: boolean;
  defaultRole: Role;
  recordingConsent: boolean;
  shareResumeWithMatches: boolean;
  discoverable: boolean;
};

export function toViewer(user: { id: string; name: string; email: string }, profile: Profile): Viewer {
  const words = user.name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? user.email).slice(0, 2);
  return {
    id: user.id,
    name: user.name,
    firstName: words[0] ?? user.name,
    initials: initials.toUpperCase(),
    email: user.email,
    headline: profile.headline ?? "",
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
};

export function toResumeView(resume: Resume, downloadUrl: string | null): ResumeView {
  const parsed = resume.parsed as ParsedResume | null;
  return {
    id: resume.id,
    parseStatus: resume.parseStatus,
    downloadUrl,
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

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
