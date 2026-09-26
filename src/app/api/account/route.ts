import { headers } from "next/headers";
import { handleRoute, HttpError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

// DELETE /api/account: permanently deletes the signed-in user (Settings > Your data).
// Everything owned by them cascades at the database level (profile, resumes,
// participations, feedback they wrote, reports, friendships, invitations).
export function DELETE() {
  return handleRoute(async () => {
    await requireUser();
    const result = await auth.api.deleteUser({ headers: await headers(), body: {} }).catch((err) => {
      throw new HttpError(400, err instanceof Error ? err.message : "Couldn't delete your account");
    });
    return result;
  });
}
