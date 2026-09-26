import type { AnalysisResult, GeneratedQuestion, ParsedResume } from "@/lib/contracts";

// Realistic fake data so other streams can build UI before the real Gemini calls land.
// Also handy for the demo seed script.

export const fixtureResume: ParsedResume = {
  name: "Alex Rivera",
  summary:
    "Computer science student with internship experience building React and Node.js web apps and a focus on developer tooling.",
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

export const fixtureQuestions: GeneratedQuestion[] = [
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

export const fixtureAnalysis: AnalysisResult = {
  summary:
    "Clear, well-structured answers with concrete examples. Technical depth was strong on databases but thinner on system design trade-offs.",
  overallScore: 78,
  scores: { communication: 82, structure: 80, technicalDepth: 72, relevance: 78 },
  strengths: ["Used the STAR format consistently", "Quantified impact (30% latency reduction)"],
  improvements: [
    "State trade-offs explicitly when proposing a design",
    "Keep behavioral answers under two minutes",
  ],
  perQuestion: fixtureQuestions.map((q, i) => ({
    question: q.text,
    answerSummary: "Candidate described the situation, their approach, and the outcome.",
    feedback: i === 2 ? "Mention how you'd handle scale and failure cases." : "Solid answer.",
    score: [85, 80, 68][i] ?? 75,
  })),
};
