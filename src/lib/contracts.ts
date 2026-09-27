import { z } from "zod";
import type { Question } from "@/lib/mock";
import type { ResumeView } from "@/lib/views";

// Shared shapes between streams. Owner: Stream B. After the freeze, changes are
// additive only — announce them in team chat before merging.
//
// Every shape is a zod schema so API routes can validate input and Gemini calls can
// pass `z.toJSONSchema(Schema)` as a response schema.

// ---------- Enums (mirror prisma/schema.prisma) ----------

export const InterviewRole = z.enum(["INTERVIEWER", "INTERVIEWEE"]);
export type InterviewRole = z.infer<typeof InterviewRole>;

export const InterviewMode = z.enum(["AI", "PEER"]);
export type InterviewMode = z.infer<typeof InterviewMode>;

export const InterviewStatus = z.enum(["PENDING", "ACTIVE", "COMPLETED", "ABANDONED"]);
export type InterviewStatus = z.infer<typeof InterviewStatus>;

export const JobStatus = z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const Speaker = z.enum(["AI", "INTERVIEWER", "INTERVIEWEE"]);
export type Speaker = z.infer<typeof Speaker>;

// ---------- AI outputs (Stream C produces, everyone reads) ----------

export const ParsedResume = z.object({
  name: z.string().optional(),
  summary: z.string(),
  // Profile suggestions shown for confirmation during onboarding.
  headline: z
    .string()
    .optional()
    .describe("One-line professional headline, e.g. 'CS student at FIU building web apps'"),
  targetRole: z
    .string()
    .optional()
    .describe("The job title this person is most likely applying for next"),
  linkedinUrl: z.string().optional().describe("LinkedIn profile URL if the resume lists one"),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string().optional(),
      year: z.string().optional(),
    }),
  ),
});
export type ParsedResume = z.infer<typeof ParsedResume>;

export const QuestionCategory = z.enum(["behavioral", "technical", "role-specific"]);
export type QuestionCategory = z.infer<typeof QuestionCategory>;

// What a question is drawn from, as labeled in the UI (mirrors Question.source).
export const QuestionSource = z.enum(["company", "job", "general"]);
export type QuestionSource = z.infer<typeof QuestionSource>;

export const GeneratedQuestion = z.object({
  text: z.string(),
  category: QuestionCategory,
  source: QuestionSource.optional(),
  rationale: z.string().optional(),
  // Set only on questions candidates reported online: the page it was found on.
  sourceUrl: z.string().optional(),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestion>;

export const TranscriptLine = z.object({
  speaker: Speaker,
  userId: z.string().optional(),
  startMs: z.number().int(),
  endMs: z.number().int().optional(),
  text: z.string(),
});
export type TranscriptLine = z.infer<typeof TranscriptLine>;

const Score = z.number().min(0).max(100);

export const AnalysisResult = z.object({
  summary: z.string(),
  overallScore: Score,
  scores: z.object({
    communication: Score,
    structure: Score,
    technicalDepth: Score,
    relevance: Score,
  }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  perQuestion: z.array(
    z.object({
      question: z.string(),
      answerSummary: z.string(),
      feedback: z.string(),
      score: Score,
    }),
  ),
});
export type AnalysisResult = z.infer<typeof AnalysisResult>;

// ---------- API request bodies ----------

export const CreateInterviewInput = z.object({
  mode: InterviewMode,
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  jobDescription: z.string().optional(),
  grounded: z.boolean().default(false), // scrape the web for questions reported at this company
  // The questions the user already previewed and edited on /practice/ai. When omitted,
  // the server generates them.
  questions: z.array(GeneratedQuestion).min(1).max(20).optional(),
});
export type CreateInterviewInput = z.infer<typeof CreateInterviewInput>;

// PATCH /api/interviews/:id (AI mode): the ElevenLabs conversation, once connected.
export const UpdateInterviewInput = z.object({ elevenConversation: z.string().min(1) });
export type UpdateInterviewInput = z.infer<typeof UpdateInterviewInput>;

// POST /api/ai/questions: the AI practice setup form.
export const QuestionSetInput = z.object({
  company: z.string().trim().min(1, "Enter the company you're applying to.").max(120),
  jobTitle: z.string().trim().min(1, "Enter the job title from the posting.").max(120),
  jobDescription: z.string().trim().max(15000, "Trim the job description a little.").optional(),
});
export type QuestionSetInput = z.infer<typeof QuestionSetInput>;

export const JoinQueueInput = z.object({
  role: InterviewRole,
  jobTitle: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(), // interviewees only
});
export type JoinQueueInput = z.infer<typeof JoinQueueInput>;

// Matches the interviewer's feedback form: three 1-5 ratings plus free text.
const Rating = z.number().int().min(1).max(5);
export const FeedbackInput = z.object({
  communication: Rating,
  technical: Rating,
  confidence: Rating,
  comments: z.string().trim().min(1),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;

export const ReportInput = z.object({
  reason: z.string().min(1),
  details: z.string().max(500).optional(), // the Report dialog's limit
});
export type ReportInput = z.infer<typeof ReportInput>;

export const UpdateProfileInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    headline: z.string().trim().max(120),
    targetRole: z.string().trim().max(120),
    // "" clears it.
    linkedinUrl: z
      .union([z.literal(""), z.url({ protocol: /^https?$/, error: "Enter a full LinkedIn URL" })])
      .transform((url) => url || null),
    preferredRole: InterviewRole,
    recordingConsent: z.boolean(),
    shareResume: z.boolean(),
    discoverable: z.boolean(),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export const UploadUrlInput = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((name) => name.toLowerCase().endsWith(".pdf"), "Resumes need to be a PDF."),
  size: z.number().int().positive().max(RESUME_MAX_BYTES, "Resumes need to be under 5 MB."),
});
export type UploadUrlInput = z.infer<typeof UploadUrlInput>;

export const ConfirmResumeInput = z.object({ resumeId: z.string().min(1) });
export type ConfirmResumeInput = z.infer<typeof ConfirmResumeInput>;

// The parts of a parsed resume the user can correct on /resume and in onboarding.
export const ResumeEditInput = ParsedResume.pick({ summary: true, skills: true, experience: true });
export type ResumeEditInput = z.infer<typeof ResumeEditInput>;

// ---------- API responses ----------

// The person you were matched with, as the live page's matched card shows them.
export type MatchPartner = {
  name: string;
  initials: string;
  headline: string;
  role: InterviewRole;
  interviewsDone: number; // completed interviews, either role
  matchedOn: string[]; // shared resume skills (up to 3), or the job title
};

// GET /api/queue, polled every ~2s through search, match and lobby.
export type QueueState =
  | { state: "idle" }
  // `partnerLeft`: your match cancelled or went quiet, so you're back in line.
  | { state: "waiting"; since: string; partnerLeft?: { name: string } }
  | {
      state: "matched";
      interviewId: string;
      role: InterviewRole;
      selfPeerId: string;
      remotePeerId: string;
      partner: MatchPartner;
    }
  | { state: "expired" };

// GET /api/interviews/:id/peer, everything the call page needs for a peer interview.
// Polled while the interview is PENDING or ACTIVE, which also keeps your queue
// heartbeat alive and shows when the other person leaves.
export type PeerSession = {
  interviewId: string;
  status: InterviewStatus;
  role: InterviewRole;
  isCaller: boolean; // the interviewer dials
  selfPeerId: string;
  remotePeerId: string;
  jobTitle: string | null;
  company: string | null;
  partner: { name: string; initials: string; headline: string };
  // Interviewer only, and only when the candidate shares their resume.
  candidate: (ResumeView & { name: string; initials: string; target: string }) | null;
  questions: Question[]; // suggested questions; interviewer only
};

export const PeerEventInput = z.object({ event: z.enum(["connected", "left"]) });
export type PeerEventInput = z.infer<typeof PeerEventInput>;

// POST /api/interviews/:id/transcript: one line you said in a peer call, as ElevenLabs
// Scribe transcribed it live. `startedAgoMs` is how long ago you started saying it,
// measured on your device, so the server places it on its own clock: both sides' lines
// then share one timeline without trusting either device's clock.
const MAX_LINE_MS = 10 * 60 * 1000;
export const TranscriptLineInput = z.object({
  text: z.string().trim().min(1).max(5000),
  startedAgoMs: z.number().int().nonnegative().max(MAX_LINE_MS),
  durationMs: z.number().int().nonnegative().max(MAX_LINE_MS),
});
export type TranscriptLineInput = z.infer<typeof TranscriptLineInput>;

// GET /api/interviews/:id/feedback, the wrap-up page after a peer interview. POST takes
// a FeedbackInput (interviewer only) and returns this again.
export type PeerWrapUp = {
  interviewId: string;
  status: InterviewStatus;
  role: InterviewRole;
  jobTitle: string | null;
  company: string | null;
  partner: { name: string; initials: string };
  feedbackSent: boolean; // the interviewer has rated the candidate
};

// GET /api/turn-credentials
export type IceServersResponse = { iceServers: RTCIceServer[]; ttl: number };

// POST /api/resume/upload-url
export type UploadUrlResponse = { uploadUrl: string; storageKey: string; resumeId: string };

// POST /api/interviews/:id/transcript/token: a single-use token for one ElevenLabs Scribe
// realtime session (your side of a peer call).
export type TranscriptTokenResponse = { token: string };

// POST /api/ai/questions
export type QuestionSetResponse = { questions: GeneratedQuestion[] };

// POST /api/interviews
export type CreateInterviewResponse = { id: string };

// POST /api/ai/signed-url
export type AiSessionResponse = {
  signedUrl: string;
  dynamicVariables: Record<string, string>;
};

// ---------- Friends ----------

export const SendFriendRequestInput = z.object({ userId: z.string().min(1) });
export type SendFriendRequestInput = z.infer<typeof SendFriendRequestInput>;

export const RespondFriendRequestInput = z.object({ status: z.enum(["ACCEPTED", "DECLINED"]) });
export type RespondFriendRequestInput = z.infer<typeof RespondFriendRequestInput>;

export type PersonSummary = { id: string; name: string; initials: string; headline: string };

// GET /api/friends
export type FriendsResponse = {
  friends: (PersonSummary & { friendshipId: string; sharedInterviews: number })[];
  incoming: (PersonSummary & { requestId: string; sentAt: string })[];
  outgoing: (PersonSummary & { requestId: string; sentAt: string })[];
};

// GET /api/friends/search?q=
export type PersonSearchResult = PersonSummary & {
  status: "none" | "incoming" | "outgoing" | "friends";
};

// ---------- Interview invites ----------

// POST /api/invitations: invite a friend into a peer interview. `role` is the side
// you'll play; jobTitle and company describe what the interviewee is practicing for.
export const SendInviteInput = z.object({
  userId: z.string().min(1),
  role: InterviewRole,
  jobTitle: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
});
export type SendInviteInput = z.infer<typeof SendInviteInput>;

// PATCH /api/invitations/:id: the invitee answers.
export const RespondInviteInput = z.object({ status: z.enum(["ACCEPTED", "DECLINED"]) });
export type RespondInviteInput = z.infer<typeof RespondInviteInput>;

// An open invite: not yet answered, or accepted with the call not started yet.
export type InviteView = {
  id: string;
  interviewId: string; // the lobby is /call/:interviewId/lobby once ACCEPTED
  person: PersonSummary; // the other side of the invite
  yourRole: InterviewRole;
  jobTitle: string | null;
  company: string | null;
  status: "PENDING" | "ACCEPTED";
  sentAt: string;
};

// GET /api/invitations; every invitations route returns this.
export type InvitationsResponse = { incoming: InviteView[]; outgoing: InviteView[] };

// ---------- Notifications ----------

// PATCH /api/notifications: one notification, or all of yours when `id` is omitted.
// GET and PATCH both return Notification[] (src/lib/mock.ts).
export const MarkNotificationsReadInput = z.object({ id: z.string().optional() });
export type MarkNotificationsReadInput = z.infer<typeof MarkNotificationsReadInput>;

// ---------- Admin ----------

export const ReportStatus = z.enum(["OPEN", "IN_REVIEW", "ACTIONED", "DISMISSED"]);
export type ReportStatus = z.infer<typeof ReportStatus>;

export const UpdateReportStatusInput = z.object({ status: ReportStatus });
export type UpdateReportStatusInput = z.infer<typeof UpdateReportStatusInput>;

// GET /api/admin/reports
export type AdminReportItem = {
  id: string;
  reporterName: string;
  reportedName: string;
  reason: string;
  details: string | null;
  createdAt: string;
  interviewId: string;
  status: ReportStatus;
};

// ---------- Helpers ----------

/** Deterministic PeerJS id, so both sides know each other's id from the match alone. */
export function peerIdFor(interviewId: string, role: InterviewRole): string {
  return `${interviewId}-${role.toLowerCase()}`;
}
