// Runs generateQuestions against the live Gemini API and prints the result.
//   npx tsx scripts/try-questions.mts "Stripe" "Software Engineer"
import "dotenv/config";
import { generateQuestions } from "@/lib/gemini";

const [company, jobTitle] = process.argv.slice(2);
if (!company || !jobTitle) throw new Error('Usage: tsx scripts/try-questions.mts "<company>" "<job title>"');

const started = Date.now();
const questions = await generateQuestions({ company, jobTitle, grounded: true, count: 7 });
console.log(JSON.stringify(questions, null, 2));
console.log(`${questions.filter((q) => q.sourceUrl).length} reported online · ${(Date.now() - started) / 1000}s`);
