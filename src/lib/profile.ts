import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { toViewer } from "@/lib/views";

/** Profiles are created lazily, the first time anything needs one. */
export function getOrCreateProfile(userId: string) {
  return db.profile.upsert({ where: { userId }, create: { userId }, update: {} });
}

/** Signed-in user plus profile, shaped for the app shell. Redirects to /login otherwise. */
export async function requireViewer() {
  const user = await requirePageUser();
  return toViewer(user, await getOrCreateProfile(user.id));
}
