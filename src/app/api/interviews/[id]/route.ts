import { handleRoute } from "@/lib/api";
import { getInterviewDetail } from "@/lib/history";
import { requireUser } from "@/lib/session";

// GET /api/interviews/:id: one interview's file (HistoryDetail) for its participants; 404 otherwise.
export function GET(_request: Request, ctx: RouteContext<"/api/interviews/[id]">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return getInterviewDetail(id, user.id);
  });
}
