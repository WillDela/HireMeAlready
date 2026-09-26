import { handleRoute, HttpError } from "@/lib/api";
import { UpdateReportStatusInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

async function requireAdmin() {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile?.isAdmin) throw new HttpError(403, "Admins only");
  return user;
}

// PATCH /api/admin/reports/:id { status }: move a report through the review workflow.
export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const { status } = UpdateReportStatusInput.parse(await request.json());

    const report = await db.report.findUnique({ where: { id } });
    if (!report) throw new HttpError(404, "Report not found");

    await db.report.update({ where: { id }, data: { status } });
    return { id, status };
  });
}
