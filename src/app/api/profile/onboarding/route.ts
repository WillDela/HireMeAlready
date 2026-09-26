import { handleRoute } from "@/lib/api";
import { UpdateProfileInput } from "@/lib/contracts";
import { updateProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

// POST /api/profile/onboarding: same body as PATCH /api/profile. Saves the profile the
// user confirmed and marks onboarding done, which lets them into the app.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const input = UpdateProfileInput.parse(await request.json());
    return updateProfile(user.id, input, { completeOnboarding: true });
  });
}
