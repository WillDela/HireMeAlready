import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: sends visitors without a session cookie to /login with a
// ?next= back to where they were. The layouts still verify the session itself
// (requirePageUser in src/lib/session.ts).
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
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
  ],
};
