import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Shared GoogleGenAI client + env accessors. Model names come from GEMINI_MODEL and
// GEMINI_EMBED_MODEL so they can be swapped without code changes.

let instance: GoogleGenAI | null = null;

export function client(): GoogleGenAI {
  if (instance) return instance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  instance = new GoogleGenAI({ apiKey });
  return instance;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
}

export function geminiEmbedModel(): string {
  return process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
}

/**
 * A zod schema as the JSON Schema subset Gemini's `responseJsonSchema` accepts
 * (see `generateContentConfig.responseJsonSchema`). Strips the `$schema` key, which
 * Gemini doesn't recognize.
 */
export function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Parses model JSON output against a zod schema, with the raw text in the error on failure. */
export function parseJsonResponse<T>(schema: z.ZodType<T>, text: string | undefined): T {
  if (!text) throw new Error("Gemini returned an empty response");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 200)}`);
  }
  return schema.parse(json);
}

/** Retries Gemini's transient "busy" errors (429, 500, 503) with backoff. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const transient = status === 429 || status === 500 || status === 503;
      if (!transient || attempt >= attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt)); // 2s, 4s, 8s
    }
  }
}
