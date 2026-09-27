import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Pages: an optimistic check only, sending visitors without a session cookie to /login
// with a ?next= back to where they were. The layouts still verify the session itself
// (requirePageUser in src/lib/session.ts).
// API: tags each request with an id, method and path for its log lines (handleRoute in
// src/lib/api.ts), and returns the id as x-request-id so a failed call in the browser's
// Network tab can be found in the server logs. API routes check the session themselves.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) return tagApiRequest(request);
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

function tagApiRequest(request: NextRequest) {
  const id = crypto.randomUUID().slice(0, 8);
  const headers = new Headers(request.headers);
  headers.set("x-request-id", id);
  headers.set("x-request-method", request.method);
  headers.set("x-request-path", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", id);
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/practice/:path*",
    "/history/:path*",
    "/friends/:path*",
    "/resume/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/call/:path*",
    "/onboarding/:path*",
    "/api/:path*",
  ],
};
