import { createPartFromBase64, createPartFromText, createUserContent } from "@google/genai";
import { z } from "zod";
import {
  AnalysisResult,
  type GeneratedQuestion,
  ParsedResume,
  QuestionCategory,
  QuestionSource,
  type TranscriptLine,
} from "@/lib/contracts";
import { client, geminiEmbedModel, geminiModel, parseJsonResponse, toResponseSchema, withRetry } from "@/lib/gemini/client";
import { log } from "@/lib/log";
import { type ScrapedPage, scrapeSearch } from "@/lib/scrape";

// Owner: Stream C. Model names come from GEMINI_MODEL and GEMINI_EMBED_MODEL.
const RESUME_PROMPT = `Extract this resume into the JSON schema.
- Copy facts as written; don't invent employers, dates, or skills.
- summary: 1-2 sentences in the third person about who this candidate is and what they're strongest at.
- skills: concrete technologies, tools, and languages, most prominent first, at most 20.
- experience: most recent first; bullets copied or lightly condensed.
- headline: a one-line professional headline, e.g. "CS student at FIU building web apps".
- targetRole and linkedinUrl are your best inference from the whole resume.
- Omit optional fields you can't find.`;

export async function parseResume(pdf: Buffer): Promise<ParsedResume> {
  const response = await withRetry("parseResume", () =>
    client().models.generateContent({
      model: geminiModel(),
      contents: createUserContent([
        createPartFromText(RESUME_PROMPT),
        createPartFromBase64(pdf.toString("base64"), "application/pdf"),
      ]),
      config: { responseMimeType: "application/json", responseJsonSchema: toResponseSchema(ParsedResume) },
    }),
  );
  return parseJsonResponse(ParsedResume, response.text);
}

/** 768-dimensional embedding (gemini-embedding-001 with outputDimensionality 768). */
export async function embedText(text: string): Promise<number[]> {
  const response = await withRetry("embedText", () =>
    client().models.embedContent({
      model: geminiEmbedModel(),
      contents: text,
      config: { outputDimensionality: 768 },
    }),
  );
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini returned no embedding");
  return values;
}

export type GenerateQuestionsInput = {
  resume?: ParsedResume;
  jobTitle: string;
  jobDescription?: string;
  company?: string;
  grounded: boolean; // search the web for questions candidates report from this company
  count: number;
};

/** A question candidates report being asked, found on (and verified against) a scraped page. */
type ReportedQuestion = { text: string; role?: string; sourceUrl: string; firsthand: boolean };
type CompanyResearch = { reported: ReportedQuestion[]; facts: string[] };

// Fewer verified reports than this and the scrape isn't trusted; we write every question.
const MIN_REPORTED = 2;
const MAX_PAGES = 6;

const PageKind = z.enum(["firsthand", "company-guide", "generic"]);

const ScrapeExtract = z.object({
  pages: z.array(
    z.object({
      pageId: z.number().int(),
      kind: PageKind.describe(
        "firsthand: candidates describing their own interview (forum post, review). company-guide: a guide specific to this company's interviews. generic: generic question lists, SEO filler, job ads, or another company",
      ),
    }),
  ),
  questions: z.array(
    z.object({
      pageId: z.number().int(),
      quote: z.string().describe("The question copied exactly, character for character, from the page"),
      role: z.string().optional().describe("The role it was asked for, if the page says"),
    }),
  ),
  facts: z.array(
    z.object({
      pageId: z.number().int(),
      quote: z.string().describe("A sentence copied exactly from the page"),
    }),
  ),
});

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Whether `quote` really appears in `pageText`: at least 80% of its 4-word runs must,
 * which tolerates a stray "Q3:" or punctuation fix but not a made-up question.
 */
function appearsIn(quote: string, pageText: string) {
  const words = normalize(quote).split(" ");
  if (words.length < 4) return false;
  const runs = words.slice(0, -3).map((_, i) => words.slice(i, i + 4).join(" "));
  return runs.filter((r) => pageText.includes(r)).length / runs.length >= 0.8;
}

const extractPrompt = (company: string, jobTitle: string, pages: ScrapedPage[]) => `These are web pages found by searching for ${company} ${jobTitle} interview questions. Extract what candidates report being asked at ${company}.

For every page, classify its kind. Then list:
- questions: interview questions the page says were asked at ${company} for ${jobTitle} or a closely related role. Copy each exactly as written on the page. Skip questions from generic pages, practice lists not tied to ${company}, and anything you would have to reword or combine.
- facts: up to 6 sentences copied from the pages that tell an interviewer something specific about ${company}: its products, customers, values, or how it runs interviews.
Return empty lists if the pages don't have any.

${pages.map((p, i) => `<page id="${i}" url="${p.url}">\n${p.text}\n</page>`).join("\n\n")}`;

/**
 * Scrapes the web for questions candidates report from this company for this role.
 * Gemini only extracts; each question must then be found in its page's text, come from a
 * page Gemini judged company-specific, and name the company somewhere on that page.
 */
async function researchCompany(company: string, jobTitle: string): Promise<CompanyResearch> {
  const companyName = normalize(company);
  const pages = (
    await scrapeSearch(
      [`${company} ${jobTitle} interview questions`, `${company} interview experience ${jobTitle} reddit`],
      MAX_PAGES,
    )
  ).filter((p) => normalize(p.text).includes(companyName));
  if (pages.length === 0) return { reported: [], facts: [] };

  const res = await withRetry("researchCompany", () =>
    client().models.generateContent({
      model: geminiModel(),
      contents: extractPrompt(company, jobTitle, pages),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: toResponseSchema(ScrapeExtract),
      },
    }),
  );
  if (!res.text) return { reported: [], facts: [] };
  const extract = parseJsonResponse(ScrapeExtract, res.text);

  const kinds = new Map(extract.pages.map((p) => [p.pageId, p.kind]));
  const normalized = pages.map((p) => normalize(p.text));
  const trusted = (pageId: number, quote: string) =>
    pages[pageId] !== undefined && (kinds.get(pageId) ?? "generic") !== "generic" && appearsIn(quote, normalized[pageId]);

  const seen = new Set<string>();
  const reported: ReportedQuestion[] = [];
  for (const q of extract.questions) {
    const text = q.quote.replace(/^\s*(q(uestion)?\s*\d+\s*[:.)-]|\d+\s*[.)])\s*/i, "").trim();
    const key = normalize(text);
    if (text.length < 15 || text.length > 400 || seen.has(key) || !trusted(q.pageId, q.quote)) continue;
    seen.add(key);
    reported.push({ text, role: q.role, sourceUrl: pages[q.pageId].url, firsthand: kinds.get(q.pageId) === "firsthand" });
  }
  const facts = extract.facts.filter((f) => trusted(f.pageId, f.quote)).map((f) => f.quote.trim());

  // Trust the reports only if there are enough of them and they're corroborated: from
  // a candidate's own account, or from at least two different sites.
  const sites = new Set(reported.map((q) => new URL(q.sourceUrl).hostname.replace(/^www\./, "")));
  const corroborated = reported.some((q) => q.firsthand) || sites.size >= 2;
  return { reported: reported.length >= MIN_REPORTED && corroborated ? reported : [], facts };
}

const QuestionPlan = z.object({
  questions: z.array(
    z.object({
      text: z.string(),
      category: QuestionCategory,
      source: QuestionSource,
      rationale: z.string().describe("One short sentence to the candidate on what this question tests"),
      reportedId: z
        .number()
        .int()
        .optional()
        .describe("The id of the reported question this is, only when using one of them"),
    }),
  ),
});

function questionsPrompt(input: GenerateQuestionsInput, research: CompanyResearch) {
  const { company, jobTitle, count } = input;
  const at = company ? ` at ${company}` : "";
  const jd = input.jobDescription?.trim();
  const sections = [
    `Write exactly ${count} interview questions for a mock interview. The candidate is applying to be ${jobTitle}${at}.`,
    jd ? `Job description:\n${jd}` : "No job description was given; work from the job title.",
    input.resume
      ? `Candidate's resume (JSON):\n${JSON.stringify({ summary: input.resume.summary, skills: input.resume.skills, experience: input.resume.experience })}`
      : "",
    research.reported.length
      ? `Questions candidates report being asked${at}, found online:\n${research.reported
          .map((q, i) => {
            const origin = q.firsthand ? "a candidate's own account" : "an interview guide";
            return `${i}. ${q.text} (from ${origin}${q.role ? `, asked for ${q.role}` : ""})`;
          })
          .join("\n")}`
      : "",
    research.facts.length ? `Verified facts about ${company}:\n${research.facts.map((f) => `- ${f}`).join("\n")}` : "",
    `Rules:
${
  research.reported.length
    ? `- Use the reported questions that fit this role and read like a real interview question, and set reportedId to their number. Phrase each the way an interviewer would ask it aloud, without changing what it asks. Skip any that are for an unrelated role, vague, spammy, or not really a question. Use at most ${Math.ceil(count * 0.6)} of them.
- Write the rest yourself and leave reportedId unset on those.`
    : "- Write every question yourself and leave reportedId unset."
}
- Make your own questions specific: tie them to the job description, ${research.facts.length ? "the company facts, " : ""}and the candidate's real experience. Never state anything about ${company || "the company"} that isn't given above.
- Mix behavioral, technical, and role-specific questions in a natural interview order: a warm-up first, "why us" style questions near the end.
- source: "company" if the question depends on the company (every reported question is "company"), "job" if it comes from the job description or the candidate's resume, otherwise "general".
- Each question is spoken aloud by an interviewer: one question, under 40 words.`,
  ];
  return sections.filter(Boolean).join("\n\n");
}

/**
 * With `grounded` and a company, first scrapes the web for questions candidates report
 * from that company (see researchCompany). If those don't hold up, they're discarded and
 * every question is written from the role, job description, company facts and resume.
 */
export async function generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
  let research: CompanyResearch = { reported: [], facts: [] };
  if (input.grounded && input.company) {
    try {
      research = await researchCompany(input.company, input.jobTitle);
    } catch (err) {
      log.warn("gemini", "company research failed; writing questions without it", { company: input.company, err });
    }
  }

  const res = await withRetry("generateQuestions", () =>
    client().models.generateContent({
      model: geminiModel(),
      contents: questionsPrompt(input, research),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: toResponseSchema(QuestionPlan),
      },
    }),
  );

  const used = new Set<number>();
  return parseJsonResponse(QuestionPlan, res.text)
    .questions.map(({ reportedId, ...q }): GeneratedQuestion => {
      const reported = reportedId === undefined || used.has(reportedId) ? undefined : research.reported[reportedId];
      if (!reported) return q;
      used.add(reportedId!);
      return { ...q, source: "company", sourceUrl: reported.sourceUrl };
    })
    .filter((q) => q.text.trim())
    .slice(0, input.count);
}

export type TranscribedSegment = { startMs: number; endMs: number; text: string };

const TranscribedSegments = z.array(z.object({ startMs: z.int(), endMs: z.int(), text: z.string() }));

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<TranscribedSegment[]> {
  const response = await withRetry("transcribeAudio", () =>
    client().models.generateContent({
      model: geminiModel(),
      contents: createUserContent([
        createPartFromText(
          "Transcribe this interview recording. Split it into segments at natural pauses or sentence breaks, giving each segment's start and end time in milliseconds from the start of the recording.",
        ),
        createPartFromBase64(audio.toString("base64"), mimeType),
      ]),
      config: { responseMimeType: "application/json", responseJsonSchema: toResponseSchema(TranscribedSegments) },
    }),
  );
  return parseJsonResponse(TranscribedSegments, response.text);
}

export type AnalyzeInterviewInput = {
  transcript: TranscriptLine[];
  questions: GeneratedQuestion[];
  jobTitle: string;
  feedback?: string;
};

export async function analyzeInterview(input: AnalyzeInterviewInput): Promise<AnalysisResult> {
  const { transcript, questions, jobTitle, feedback } = input;
  const transcriptText = transcript.map((line) => `${line.speaker}: ${line.text}`).join("\n") || "(no transcript captured)";
  const questionsText = questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n") || "(no questions recorded)";

  const prompt = [
    `You are an interview coach reviewing a mock interview transcript for a "${jobTitle}" role.`,
    `Questions asked:\n${questionsText}`,
    `Transcript:\n${transcriptText}`,
    feedback ? `The human interviewer also wrote this feedback about the candidate:\n${feedback}` : null,
    `Write a structured assessment: a short overall summary, an overall score (0-100), scores (0-100 each) for communication, structure, technical depth, and relevance, 2-4 strengths, 2-4 improvements, and one entry per question above (in the same order) with a one-sentence summary of the answer, brief feedback, and a 0-100 score. Base every score and comment only on what's in the transcript.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await withRetry("analyzeInterview", () =>
    client().models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: toResponseSchema(AnalysisResult) },
    }),
  );
  return parseJsonResponse(AnalysisResult, response.text);
}
