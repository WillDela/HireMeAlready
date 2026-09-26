import { handleRoute } from "@/lib/api";
import { UpdateProfileInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { toViewer } from "@/lib/views";

// GET /api/profile: the signed-in user as the app shell sees them (a Viewer).
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return toViewer(user, await getOrCreateProfile(user.id));
  });
}

// PATCH /api/profile: any subset of UpdateProfileInput. `name` lives on the auth user.
export function PATCH(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { name, ...profileFields } = UpdateProfileInput.parse(await request.json());

    const [updatedUser, profile] = await db.$transaction([
      name !== undefined
        ? db.user.update({ where: { id: user.id }, data: { name } })
        : db.user.findUniqueOrThrow({ where: { id: user.id } }),
      db.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileFields },
        update: profileFields,
      }),
    ]);
    return toViewer(updatedUser, profile);
  });
}
