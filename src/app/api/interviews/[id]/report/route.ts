import { handleRoute } from "@/lib/api";
import { ReportInput } from "@/lib/contracts";
import { createReport } from "@/lib/reports";
import { requireUser } from "@/lib/session";

// POST /api/interviews/:id/report ReportInput: a participant reports the interview; returns { id }.
export function POST(request: Request, ctx: RouteContext<"/api/interviews/[id]/report">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return createReport(id, user.id, ReportInput.parse(await request.json()));
  });
}
