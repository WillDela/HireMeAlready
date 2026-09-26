import { redirect } from "next/navigation";
import type { UpdateProfileInput } from "@/lib/contracts";
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

/** Like requireViewer, but sends anyone who hasn't finished onboarding there first. */
export async function requireOnboardedViewer() {
  const viewer = await requireViewer();
  if (!viewer.onboarded) redirect("/onboarding");
  return viewer;
}

/**
 * Saves any subset of UpdateProfileInput (`name` lives on the auth user) and returns
 * the updated Viewer. `completeOnboarding` also marks onboarding done.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  { completeOnboarding = false } = {},
) {
  const { name, ...fields } = input;
  const profileFields = { ...fields, ...(completeOnboarding && { onboardedAt: new Date() }) };

  const [user, profile] = await db.$transaction([
    name !== undefined
      ? db.user.update({ where: { id: userId }, data: { name } })
      : db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.profile.upsert({
      where: { userId },
      create: { userId, ...profileFields },
      update: profileFields,
    }),
  ]);
  return toViewer(user, profile);
}
