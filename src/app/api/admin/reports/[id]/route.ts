import { handleRoute, HttpError } from "@/lib/api";
import { UpdateReportStatusInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
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
    // Tell the reporter once, when the report first closes.
    const closed = (s: string) => s === "ACTIONED" || s === "DISMISSED";
    if (closed(status) && !closed(report.status)) {
      await notify(report.reporterId, {
        kind: "REPORT_REVIEWED",
        title: "Your report was reviewed",
        body: "An admin looked into what you reported. Thanks for flagging it.",
        href: `/history/${report.interviewId}`,
      });
    }
    return { id, status };
  });
}
