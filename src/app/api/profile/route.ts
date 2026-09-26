import { handleRoute } from "@/lib/api";
import { UpdateProfileInput } from "@/lib/contracts";
import { getOrCreateProfile, updateProfile } from "@/lib/profile";
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
    return updateProfile(user.id, UpdateProfileInput.parse(await request.json()));
  });
}
