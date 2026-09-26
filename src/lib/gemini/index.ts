import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  type AnalysisResult,
  type GeneratedQuestion,
  ParsedResume,
  type TranscriptLine,
} from "@/lib/contracts";
import { fixtureAnalysis, fixtureQuestions } from "@/lib/gemini/fixtures";

// Owner: Stream C. parseResume and embedText call Gemini; the rest are still STUBS
// returning fixtures so Streams B and D can build against the final signatures. Stream C
// replaces each stub body with a real Gemini call without changing the signature. Model
// names come from GEMINI_MODEL and GEMINI_EMBED_MODEL.

let client: GoogleGenAI | undefined;
function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const model = () => process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const embedModel = () => process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";

/** Retries Gemini's transient "busy" errors (429, 500, 503) with backoff. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const transient = status === 429 || status === 500 || status === 503;
      if (!transient || i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i)); // 2s, 4s, 8s
    }
  }
}

/** JSON Schema for `responseJsonSchema`, minus the `$schema` key Gemini doesn't accept. */
function responseSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema);
  delete json.$schema;
  return json;
}

const PARSE_RESUME_PROMPT = `Extract this resume into the JSON schema.
- Copy facts as written; don't invent employers, dates, or skills.
- summary: 1-2 sentences in the third person about who this candidate is and what they're strongest at.
- skills: concrete technologies, tools, and languages, most prominent first, at most 20.
- experience: most recent first; bullets copied or lightly condensed.
- headline and targetRole are your best inference from the whole resume.
- Omit optional fields you can't find.`;

export async function parseResume(pdf: Buffer): Promise<ParsedResume> {
  const res = await withRetry(() =>
    gemini().models.generateContent({
      model: model(),
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } },
            { text: PARSE_RESUME_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: responseSchema(ParsedResume),
      },
    }),
  );
  if (!res.text) throw new Error("Gemini returned no resume JSON");
  return ParsedResume.parse(JSON.parse(res.text));
}

/** 768-dimensional embedding (gemini-embedding-001 with outputDimensionality 768). */
export async function embedText(text: string): Promise<number[]> {
  const res = await withRetry(() =>
    gemini().models.embedContent({
      model: embedModel(),
      contents: text,
      config: { outputDimensionality: 768 },
    }),
  );
  const values = res.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini returned no embedding");
  return values;
}

export type GenerateQuestionsInput = {
  resume: ParsedResume;
  jobTitle: string;
  jobDescription?: string;
  company?: string;
  grounded: boolean;
  count: number;
};

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
  return fixtureQuestions.slice(0, input.count);
}

export type TranscribedSegment = { startMs: number; endMs: number; text: string };

export async function transcribeAudio(_audio: Buffer, _mimeType: string): Promise<TranscribedSegment[]> {
  return [{ startMs: 0, endMs: 4000, text: "(stub transcript)" }];
}

export type AnalyzeInterviewInput = {
  transcript: TranscriptLine[];
  questions: GeneratedQuestion[];
  jobTitle: string;
  feedback?: string;
};

export async function analyzeInterview(_input: AnalyzeInterviewInput): Promise<AnalysisResult> {
  return fixtureAnalysis;
}
