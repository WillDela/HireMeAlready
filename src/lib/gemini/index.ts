import { createPartFromBase64, createPartFromText, createUserContent } from "@google/genai";
import { z } from "zod";
import { AnalysisResult, GeneratedQuestion, ParsedResume, type TranscriptLine } from "@/lib/contracts";
import { client, geminiEmbedModel, geminiModel, parseJsonResponse, toResponseSchema, withRetry } from "@/lib/gemini/client";

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
  const response = await withRetry(() =>
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
  const response = await withRetry(() =>
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
  resume: ParsedResume;
  jobTitle: string;
  jobDescription?: string;
  company?: string;
  grounded: boolean;
  count: number;
};

function resumeContext(resume: ParsedResume): string {
  const experience = resume.experience
    .map((e) => `- ${e.title} at ${e.company}${e.start ? ` (${e.start}${e.end ? `–${e.end}` : "–present"})` : ""}: ${e.bullets.join("; ")}`)
    .join("\n");
  return [`Summary: ${resume.summary}`, `Skills: ${resume.skills.join(", ")}`, experience ? `Experience:\n${experience}` : null]
    .filter(Boolean)
    .join("\n");
}

const QuestionSet = z.object({ questions: z.array(GeneratedQuestion) });

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
  const { resume, jobTitle, jobDescription, company, grounded, count } = input;
  const context = [
    `Job title: ${jobTitle}`,
    company ? `Company: ${company}` : null,
    jobDescription ? `Job description:\n${jobDescription}` : null,
    `Candidate resume:\n${resumeContext(resume)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let research = "";
  let sources: { title: string; uri: string }[] = [];
  // Grounding + a strict JSON schema aren't reliably combinable on every model, so
  // grounded research runs as its own free-text call, then a second call structures it.
  if (grounded && company) {
    const groundedResponse = await withRetry(() =>
      client().models.generateContent({
        model: geminiModel(),
        contents: `Research ${company}, focused on what's useful for writing mock interview questions for a "${jobTitle}" candidate: interview style, engineering/company culture, products, values, and any recent news. Be concise.`,
        config: { tools: [{ googleSearch: {} }] },
      }),
    );
    research = groundedResponse.text ?? "";
    sources = (groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
      .map((web) => ({ title: web.title || web.uri, uri: web.uri }));
  }

  const prompt = [
    context,
    research
      ? `Company research:\n${research}\n\nSources:\n${sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.uri}`).join("\n")}`
      : null,
    `Write exactly ${count} interview questions for this candidate for the ${jobTitle} role${company ? ` at ${company}` : ""}. Mix behavioral, technical, and role-specific questions, and reference the candidate's actual resume experience where it fits naturally.${
      research ? " When a question draws on the company research above, set sourceUrl to the matching source's URL from the list; otherwise omit sourceUrl." : ""
    } Keep each question to one or two sentences, and set rationale to a short note on what it's testing.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const structured = await withRetry(() =>
    client().models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: toResponseSchema(QuestionSet) },
    }),
  );
  const { questions } = parseJsonResponse(QuestionSet, structured.text);
  return questions.slice(0, count);
}

export type TranscribedSegment = { startMs: number; endMs: number; text: string };

const TranscribedSegments = z.array(z.object({ startMs: z.int(), endMs: z.int(), text: z.string() }));

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<TranscribedSegment[]> {
  const response = await withRetry(() =>
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

  const response = await withRetry(() =>
    client().models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: toResponseSchema(AnalysisResult) },
    }),
  );
  return parseJsonResponse(AnalysisResult, response.text);
}
