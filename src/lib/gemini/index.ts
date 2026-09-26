import type { AnalysisResult, GeneratedQuestion, ParsedResume, TranscriptLine } from "@/lib/contracts";
import { fixtureAnalysis, fixtureQuestions, fixtureResume } from "@/lib/gemini/fixtures";

// Owner: Stream C. These are STUBS returning fixtures so Streams B and D can build
// against the final signatures today. Stream C replaces each body with a real Gemini
// call without changing the signature. Model names come from GEMINI_MODEL and
// GEMINI_EMBED_MODEL.

export async function parseResume(_pdf: Buffer): Promise<ParsedResume> {
  return fixtureResume;
}

/** 768-dimensional embedding (gemini-embedding-001 with outputDimensionality 768). */
export async function embedText(_text: string): Promise<number[]> {
  return Array.from({ length: 768 }, (_, i) => Math.sin(i) / 20);
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
