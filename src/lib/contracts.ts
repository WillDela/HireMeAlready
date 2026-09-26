import { z } from "zod";

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
});
export type CreateInterviewInput = z.infer<typeof CreateInterviewInput>;

// POST /api/ai/questions: the AI practice setup form.
export const QuestionSetInput = z.object({
  company: z.string().trim().min(1, "Enter the company you're applying to.").max(120),
  jobTitle: z.string().trim().min(1, "Enter the job title from the posting.").max(120),
  jobDescription: z.string().trim().max(15000, "Trim the job description a little.").optional(),
});
export type QuestionSetInput = z.infer<typeof QuestionSetInput>;

export const JoinQueueInput = z.object({
  role: InterviewRole,
  jobTitle: z.string().optional(),
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
  details: z.string().optional(),
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

// GET /api/queue, polled every ~2s while waiting.
export type QueueState =
  | { state: "idle" }
  | { state: "waiting"; since: string }
  | {
      state: "matched";
      interviewId: string;
      role: InterviewRole;
      selfPeerId: string;
      remotePeerId: string;
    }
  | { state: "expired" };

// GET /api/turn-credentials
export type IceServersResponse = { iceServers: RTCIceServer[]; ttl: number };

// POST /api/resume/upload-url
export type UploadUrlResponse = { uploadUrl: string; storageKey: string; resumeId: string };

// POST /api/ai/questions
export type QuestionSetResponse = { questions: GeneratedQuestion[] };

// POST /api/ai/signed-url
export type AiSessionResponse = {
  signedUrl: string;
  dynamicVariables: Record<string, string>;
};

export type ParticipantSummary = {
  userId: string;
  name: string;
  role: InterviewRole;
  // Only present when that user's Profile.shareContact is true.
  contact?: { email: string; linkedinUrl?: string };
};

// GET /api/interviews (history list)
export type InterviewListItem = {
  id: string;
  mode: InterviewMode;
  status: InterviewStatus;
  jobTitle: string | null;
  company: string | null;
  startedAt: string | null;
  endedAt: string | null;
  myRole: InterviewRole;
  partnerName: string | null; // null for AI interviews
  overallScore: number | null;
};

// GET /api/interviews/:id
export type InterviewDetail = {
  id: string;
  mode: InterviewMode;
  status: InterviewStatus;
  jobTitle: string | null;
  company: string | null;
  startedAt: string | null;
  endedAt: string | null;
  participants: ParticipantSummary[];
  questions: GeneratedQuestion[];
  transcript: TranscriptLine[];
  transcriptStatus: JobStatus;
  analysis: { status: JobStatus; result: AnalysisResult | null } | null;
  feedback: (FeedbackInput & { authorName: string; createdAt: string })[];
};

// ---------- Helpers ----------

/** Deterministic PeerJS id, so both sides know each other's id from the match alone. */
export function peerIdFor(interviewId: string, role: InterviewRole): string {
  return `${interviewId}-${role.toLowerCase()}`;
}
