import { AsyncLocalStorage } from "node:async_hooks";

// Server-side logging: one line per event, `LEVEL [scope] message key=value ...`, so it
// reads in the dev terminal and greps in `docker compose logs web`. Inside an API route
// (see handleRoute in src/lib/api.ts) every line also carries the request id and user.
// LOG_LEVEL=debug also shows successful GETs (polling) and each external call's timing.

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = ORDER[process.env.LOG_LEVEL as Level] ?? ORDER.info;

type RequestContext = { id: string; userId?: string };
const requestContext = new AsyncLocalStorage<RequestContext>();

/** Runs `fn` with a request id (and later the user) attached to every log line inside it. */
export function withRequestContext<T>(id: string, fn: () => T): T {
  return requestContext.run({ id }, fn);
}

/** Called once the session is known, so the rest of the request's lines name the user. */
export function setRequestUser(userId: string) {
  const ctx = requestContext.getStore();
  if (ctx) ctx.userId = userId;
}

function format(value: unknown): string {
  if (value instanceof Error) return JSON.stringify(value.message);
  if (typeof value === "string") return /^[\w./:@-]+$/.test(value) ? value : JSON.stringify(value);
  return JSON.stringify(value) ?? String(value);
}

function write(level: Level, scope: string, message: string, fields: Fields = {}) {
  if (ORDER[level] < threshold) return;
  const ctx = requestContext.getStore();
  const all: Fields = { ...fields, req: ctx?.id, user: ctx?.userId };
  const pairs = Object.entries(all)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${format(v)}`);
  const line = [`${level.toUpperCase().padEnd(5)} [${scope}] ${message}`, ...pairs].join(" ");
  const err = fields.err;
  // Unexpected errors keep their stack; expected ones (HttpError etc.) are logged as warn.
  const stack = level === "error" && err instanceof Error && err.stack ? `\n${err.stack}` : "";
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(line + stack);
}

export const log = {
  debug: (scope: string, message: string, fields?: Fields) => write("debug", scope, message, fields),
  info: (scope: string, message: string, fields?: Fields) => write("info", scope, message, fields),
  warn: (scope: string, message: string, fields?: Fields) => write("warn", scope, message, fields),
  error: (scope: string, message: string, fields?: Fields) => write("error", scope, message, fields),
};

/**
 * Times a call to an outside service (Gemini, ElevenLabs, Spaces): debug on success,
 * error with the duration on failure (then rethrows).
 */
export async function timed<T>(scope: string, what: string, fn: () => Promise<T>, fields?: Fields): Promise<T> {
  const started = performance.now();
  try {
    const result = await fn();
    log.debug(scope, `${what} ok`, { ...fields, ms: Math.round(performance.now() - started) });
    return result;
  } catch (err) {
    log.error(scope, `${what} failed`, { ...fields, ms: Math.round(performance.now() - started), err });
    throw err;
  }
}
