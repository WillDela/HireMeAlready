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
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
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
