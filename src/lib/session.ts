import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { setRequestUser } from "@/lib/log";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** Current signed-in user, or null. Use in Server Components and Route Handlers. */
export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) setRequestUser(session.user.id);
  return session?.user ?? null;
}

/** Current signed-in user; throws UnauthorizedError otherwise (see handleRoute in src/lib/api.ts). */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Current signed-in user for pages and layouts; redirects to /login otherwise. */
export async function requirePageUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
