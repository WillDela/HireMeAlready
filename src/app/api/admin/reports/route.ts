import { handleRoute, HttpError } from "@/lib/api";
import type { AdminReportItem } from "@/lib/contracts";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

async function requireAdmin() {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile?.isAdmin) throw new HttpError(403, "Admins only");
  return user;
}

// GET /api/admin/reports: every report, newest first.
export function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const reports = await db.report.findMany({
      include: { reporter: true, reported: true },
      orderBy: { createdAt: "desc" },
    });
    const body: AdminReportItem[] = reports.map((r) => ({
      id: r.id,
      reporterName: r.reporter.name,
      reportedName: r.reported?.name ?? "AI interview",
      reason: r.reason,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
      interviewId: r.interviewId,
      status: r.status,
    }));
    return body;
  });
}
