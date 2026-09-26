// Demo data for rehearsals and the venue floor: three accounts (one admin) and two
// completed interviews with a full transcript, analysis, and (for the peer one)
// feedback, so history and the dashboard look real even if a live call fails.
// Re-running this replaces the demo accounts from scratch. Usage: npm run db:seed
import "dotenv/config";
import type { AnalysisResult, GeneratedQuestion, ParsedResume, TranscriptLine } from "@/lib/contracts";
import { peerIdFor } from "@/lib/contracts";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEMO_PASSWORD = "Password123!";
const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_EMAILS = [
  "alex.rivera@demo.hiremealready.study",
  "priya.natarajan@demo.hiremealready.study",
  "admin@demo.hiremealready.study",
];

async function resetDemoAccounts() {
  await db.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });
}

async function createUser(email: string, name: string) {
  const { user } = await auth.api.signUpEmail({ body: { email, password: DEMO_PASSWORD, name } });
  return user;
}

const resume: ParsedResume = {
  name: "Alex Rivera",
  summary:
    "Computer science student with internship experience building React and Node.js web apps and a focus on developer tooling.",
  headline: "CS student at FIU building developer tools",
  targetRole: "Software Engineer Intern",
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Python", "Docker"],
  experience: [
    {
      company: "Acme Corp",
      title: "Software Engineering Intern",
      start: "May 2026",
      end: "Aug 2026",
      bullets: [
        "Built an internal dashboard in React used by 40 support agents",
        "Cut API p95 latency 30% by adding Postgres indexes",
      ],
    },
  ],
  education: [{ school: "Florida International University", degree: "B.S. Computer Science", year: "2027" }],
};

const aiQuestions: GeneratedQuestion[] = [
  {
    text: "Tell me about a time you had to make a technical decision with incomplete information.",
    category: "behavioral",
    rationale: "Tests judgment and communication under ambiguity.",
  },
  {
    text: "You cut API latency by adding Postgres indexes. How did you decide which columns to index?",
    category: "technical",
    rationale: "Drills into a resume claim.",
  },
  {
    text: "How would you design a feature that lets support agents see a customer's recent activity in real time?",
    category: "role-specific",
  },
];

const aiTranscript: TranscriptLine[] = [
  { speaker: "AI", startMs: 0, endMs: 6000, text: aiQuestions[0].text },
  {
    speaker: "INTERVIEWEE",
    startMs: 6500,
    endMs: 42000,
    text: "At my internship, we had to pick a caching strategy before we had real traffic data. I went with a conservative TTL, shipped it, and watched the cache hit rate for a week before tuning it up.",
  },
  { speaker: "AI", startMs: 42500, endMs: 48000, text: aiQuestions[1].text },
  {
    speaker: "INTERVIEWEE",
    startMs: 48500,
    endMs: 95000,
    text: "I pulled the slowest queries from pg_stat_statements, found three that scanned the whole support-ticket table, and added composite indexes matching their WHERE and ORDER BY clauses. Latency on those endpoints dropped from about 400ms to under 100ms.",
  },
  { speaker: "AI", startMs: 95500, endMs: 104000, text: aiQuestions[2].text },
  {
    speaker: "INTERVIEWEE",
    startMs: 104500,
    endMs: 160000,
    text: "I'd start with a websocket or SSE feed keyed on customer id, backed by the same events we already write for the audit log, so we're not standing up a second source of truth. Cache the last few events per customer so a newly opened panel isn't empty while it waits for the next event.",
  },
];

const aiAnalysis: AnalysisResult = {
  summary:
    "Clear, well-structured answers with concrete examples. Technical depth was strong on databases but thinner on system design trade-offs.",
  overallScore: 78,
  scores: { communication: 82, structure: 80, technicalDepth: 75, relevance: 78 },
  strengths: ["Used the STAR format consistently", "Quantified impact (30% latency reduction, 400ms to 100ms)"],
  improvements: [
    "State trade-offs explicitly when proposing a design (e.g. websocket vs. polling)",
    "Keep behavioral answers under two minutes",
  ],
  perQuestion: [
    {
      question: aiQuestions[0].text,
      answerSummary: "Shipped a conservative TTL, then tuned it after watching real cache hit rates.",
      feedback: "Solid answer with a clear result.",
      score: 80,
    },
    {
      question: aiQuestions[1].text,
      answerSummary: "Used pg_stat_statements to find slow queries and indexed to match their access patterns.",
      feedback: "Specific and confident; this is your strongest answer.",
      score: 88,
    },
    {
      question: aiQuestions[2].text,
      answerSummary: "Proposed reusing the audit-log event stream over websockets, with a small per-customer cache.",
      feedback: "Good instinct to reuse existing infrastructure. Mention how you'd handle a dropped connection or backlog.",
      score: 68,
    },
  ],
};

const peerQuestions: { text: string; category: GeneratedQuestion["category"] }[] = [
  { text: "Why Halcyon Health, and why move in-house now?", category: "behavioral" },
  {
    text: "Halcyon's patient app serves older adults. Tell me about a time you designed for low digital confidence.",
    category: "role-specific",
  },
  { text: "How do you decide what to research when time is short?", category: "behavioral" },
];

const peerTranscript = (intervieweeId: string, interviewerId: string): TranscriptLine[] => [
  { speaker: "INTERVIEWER", userId: interviewerId, startMs: 0, endMs: 7000, text: peerQuestions[0].text },
  {
    speaker: "INTERVIEWEE",
    userId: intervieweeId,
    startMs: 7500,
    endMs: 52000,
    text: "I've been doing consumer fintech for four years, but I keep gravitating toward the accessibility work. Halcyon's patient app is the rare product where that's the whole job, not a checklist item.",
  },
  { speaker: "INTERVIEWER", userId: interviewerId, startMs: 52500, endMs: 62000, text: peerQuestions[1].text },
  {
    speaker: "INTERVIEWEE",
    userId: intervieweeId,
    startMs: 62500,
    endMs: 130000,
    text: "We redesigned a clinic booking flow for a pilot group of patients in their 70s. The big unlock was replacing a calendar grid with a linear list of plain-language slots, and testing copy out loud with actual users instead of just eyeballing contrast ratios.",
  },
  { speaker: "INTERVIEWER", userId: interviewerId, startMs: 130500, endMs: 138000, text: peerQuestions[2].text },
  {
    speaker: "INTERVIEWEE",
    userId: intervieweeId,
    startMs: 138500,
    endMs: 190000,
    text: "I timebox research to whatever's riskiest to get wrong, usually the thing with the most assumptions baked into it, and lean on support tickets and existing usability studies for everything else.",
  },
];

const peerAnalysis: AnalysisResult = {
  summary: "Confident, specific answers grounded in real projects. Would benefit from naming measurable outcomes more often.",
  overallScore: 74,
  scores: { communication: 85, structure: 76, technicalDepth: 62, relevance: 80 },
  strengths: ["Answers were concrete, not hypothetical", "Clear point of view on accessibility"],
  improvements: ["Quantify outcomes (completion rate, support tickets) where possible", "Slow down on the first answer"],
  perQuestion: [
    {
      question: peerQuestions[0].text,
      answerSummary: "Connected personal interest in accessibility to Halcyon's core product.",
      feedback: "Genuine and specific to the company.",
      score: 78,
    },
    {
      question: peerQuestions[1].text,
      answerSummary: "Replaced a calendar grid with a plain-language list after testing with older patients.",
      feedback: "Great example; add a number (completion rate, support calls avoided).",
      score: 76,
    },
    {
      question: peerQuestions[2].text,
      answerSummary: "Prioritizes research on the riskiest assumption, reuses existing signal otherwise.",
      feedback: "Reasonable framework, could use a concrete example.",
      score: 68,
    },
  ],
};

async function main() {
  console.log("Resetting demo accounts…");
  await resetDemoAccounts();

  console.log("Creating demo accounts…");
  const interviewee = await createUser("alex.rivera@demo.hiremealready.study", "Alex Rivera");
  const interviewer = await createUser("priya.natarajan@demo.hiremealready.study", "Priya Natarajan");
  const admin = await createUser("admin@demo.hiremealready.study", "Demo Admin");

  const now = new Date();
  const resumeRow = await db.resume.create({
    data: {
      userId: interviewee.id,
      storageKey: `demo/${interviewee.id}/resume.pdf`,
      fileName: "Alex_Rivera_Resume.pdf",
      sizeBytes: 84_231,
      parseStatus: "READY",
      parsed: resume,
    },
  });

  await db.profile.upsert({
    where: { userId: interviewee.id },
    create: {
      userId: interviewee.id,
      preferredRole: "INTERVIEWEE",
      headline: resume.headline,
      targetRole: resume.targetRole,
      activeResumeId: resumeRow.id,
      onboardedAt: now,
    },
    update: { activeResumeId: resumeRow.id, onboardedAt: now },
  });
  await db.profile.upsert({
    where: { userId: interviewer.id },
    create: {
      userId: interviewer.id,
      preferredRole: "INTERVIEWER",
      headline: "Design lead, 9 years in health tech",
      onboardedAt: now,
    },
    update: { onboardedAt: now },
  });
  await db.profile.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id, isAdmin: true, onboardedAt: now, discoverable: false },
    update: { isAdmin: true, onboardedAt: now },
  });

  console.log("Creating a completed AI interview…");
  const aiStart = new Date(now.getTime() - 2 * DAY_MS);
  const aiEnd = new Date(aiStart.getTime() + 18 * 60 * 1000);
  const aiInterview = await db.interview.create({
    data: {
      mode: "AI",
      status: "COMPLETED",
      jobTitle: "Software Engineer Intern",
      company: "Northwind Logistics",
      jobDescription: "Full-stack intern role on the Driver Experience team, React + Node.js + Postgres.",
      transcriptStatus: "READY",
      startedAt: aiStart,
      endedAt: aiEnd,
      createdAt: aiStart,
    },
  });
  await db.participant.create({
    data: {
      interviewId: aiInterview.id,
      userId: interviewee.id,
      role: "INTERVIEWEE",
      peerId: peerIdFor(aiInterview.id, "INTERVIEWEE"),
      joinedAt: aiStart,
      leftAt: aiEnd,
    },
  });
  await db.question.createMany({
    data: aiQuestions.map((q, i) => ({
      interviewId: aiInterview.id,
      order: i,
      text: q.text,
      category: q.category,
      rationale: q.rationale,
    })),
  });
  await db.transcriptSegment.createMany({
    data: aiTranscript.map((line) => ({
      interviewId: aiInterview.id,
      speaker: line.speaker,
      userId: line.speaker === "INTERVIEWEE" ? interviewee.id : null,
      startMs: line.startMs,
      endMs: line.endMs,
      text: line.text,
    })),
  });
  await db.analysis.create({
    data: {
      interviewId: aiInterview.id,
      subjectUserId: interviewee.id,
      status: "READY",
      result: aiAnalysis,
      model: "seed-data",
    },
  });

  console.log("Creating a completed peer interview…");
  const peerStart = new Date(now.getTime() - 5 * DAY_MS);
  const peerEnd = new Date(peerStart.getTime() + 22 * 60 * 1000);
  const peerInterview = await db.interview.create({
    data: {
      mode: "PEER",
      status: "COMPLETED",
      jobTitle: "Product Designer",
      company: "Halcyon Health",
      transcriptStatus: "READY",
      startedAt: peerStart,
      endedAt: peerEnd,
      createdAt: peerStart,
    },
  });
  await db.participant.createMany({
    data: [
      {
        interviewId: peerInterview.id,
        userId: interviewee.id,
        role: "INTERVIEWEE",
        peerId: peerIdFor(peerInterview.id, "INTERVIEWEE"),
        joinedAt: peerStart,
        leftAt: peerEnd,
      },
      {
        interviewId: peerInterview.id,
        userId: interviewer.id,
        role: "INTERVIEWER",
        peerId: peerIdFor(peerInterview.id, "INTERVIEWER"),
        joinedAt: peerStart,
        leftAt: peerEnd,
      },
    ],
  });
  await db.question.createMany({
    data: peerQuestions.map((q, i) => ({
      interviewId: peerInterview.id,
      order: i,
      text: q.text,
      category: q.category,
      source: "company",
    })),
  });
  await db.transcriptSegment.createMany({
    data: peerTranscript(interviewee.id, interviewer.id).map((line) => ({
      interviewId: peerInterview.id,
      speaker: line.speaker,
      userId: line.userId ?? null,
      startMs: line.startMs,
      endMs: line.endMs,
      text: line.text,
    })),
  });
  await db.analysis.create({
    data: {
      interviewId: peerInterview.id,
      subjectUserId: interviewee.id,
      status: "READY",
      result: peerAnalysis,
      model: "seed-data",
    },
  });
  await db.feedback.create({
    data: {
      interviewId: peerInterview.id,
      authorId: interviewer.id,
      subjectId: interviewee.id,
      communication: 4,
      technical: 3,
      confidence: 4,
      comments: "Warm, specific answers. Push for a number (completion rate, tickets avoided) on the redesign story next time.",
    },
  });

  console.log("\nDone. Demo accounts (password for all: %s):", DEMO_PASSWORD);
  console.log("  Interviewee: alex.rivera@demo.hiremealready.study");
  console.log("  Interviewer: priya.natarajan@demo.hiremealready.study");
  console.log("  Admin:       admin@demo.hiremealready.study");
}

await main();
await db.$disconnect();
