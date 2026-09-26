// Manual smoke test for the real Gemini calls in src/lib/gemini/index.ts, run against a
// fixture resume instead of the UI. Usage: npx tsx scripts/try-gemini.mts [--grounded]
import "dotenv/config";
import { analyzeInterview, embedText, generateQuestions } from "@/lib/gemini";
import { fixtureResume } from "@/lib/gemini/fixtures";

const grounded = process.argv.includes("--grounded");

console.log("embedText...");
const embedding = await embedText(fixtureResume.summary);
console.log(`  ${embedding.length}-d, e.g. [${embedding.slice(0, 3).join(", ")}, ...]`);

console.log(`\ngenerateQuestions (grounded=${grounded})...`);
const questions = await generateQuestions({
  resume: fixtureResume,
  jobTitle: "Software Engineer Intern",
  company: "Northwind Logistics",
  grounded,
  count: 3,
});
console.log(JSON.stringify(questions, null, 2));

console.log("\nanalyzeInterview...");
const analysis = await analyzeInterview({
  transcript: [
    { speaker: "AI", startMs: 0, text: questions[0].text },
    {
      speaker: "INTERVIEWEE",
      startMs: 4000,
      text: "At my internship, I had to choose a caching strategy without full traffic data, so I used a conservative TTL and measured before tuning it further.",
    },
  ],
  questions,
  jobTitle: "Software Engineer Intern",
});
console.log(JSON.stringify(analysis, null, 2));
