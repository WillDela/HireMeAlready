import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** Current signed-in user, or null. Use in Server Components and Route Handlers. */
export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Current signed-in user; throws UnauthorizedError otherwise (see handleRoute in src/lib/api.ts). */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
