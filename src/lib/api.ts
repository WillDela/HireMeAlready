import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { log, withRequestContext } from "@/lib/log";
import { UnauthorizedError } from "@/lib/session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Above this, even a successful request is logged as a warning.
const SLOW_MS = 3000;

/**
 * Wraps a Route Handler body so every API route returns the same error shape:
 * `{ error: string }` with 400 (bad input), 401, the HttpError's status, or 500.
 * Logs one line per request: method, path, status and time (successful GETs, mostly
 * polling, only at LOG_LEVEL=debug). The id and path come from src/proxy.ts.
 */
export async function handleRoute(fn: () => Promise<unknown>): Promise<NextResponse> {
  const h = await headers();
  const id = h.get("x-request-id") ?? crypto.randomUUID().slice(0, 8);
  const route = `${h.get("x-request-method") ?? "?"} ${h.get("x-request-path") ?? "?"}`;

  return withRequestContext(id, async () => {
    const started = performance.now();
    const { response, err } = await respond(fn);
    const ms = Math.round(performance.now() - started);
    const status = response.status;

    if (status >= 500) log.error("api", route, { status, ms, err });
    else if (status >= 400) log.warn("api", route, { status, ms, err });
    else if (ms > SLOW_MS) log.warn("api", `${route} (slow)`, { status, ms });
    else if (route.startsWith("GET ")) log.debug("api", route, { status, ms });
    else log.info("api", route, { status, ms });
    return response;
  });
}

async function respond(fn: () => Promise<unknown>): Promise<{ response: NextResponse; err?: unknown }> {
  try {
    const result = await fn();
    return { response: result instanceof NextResponse ? result : NextResponse.json(result ?? null) };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    if (err instanceof ZodError) {
      const message = err.issues[0]?.message ?? "Invalid input";
      return { response: NextResponse.json({ error: message }, { status: 400 }), err: message };
    }
    if (err instanceof HttpError) {
      return { response: NextResponse.json({ error: err.message }, { status: err.status }), err: err.message };
    }
    return { response: NextResponse.json({ error: "Internal server error" }, { status: 500 }), err };
  }
}
