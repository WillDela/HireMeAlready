import { handleRoute } from "@/lib/api";
import { searchPeople } from "@/lib/friends";
import { requireUser } from "@/lib/session";

// GET /api/friends/search?q=: discoverable people matching the query, with each
// result's relationship status to the caller.
export function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return searchPeople(user.id, q);
  });
}
