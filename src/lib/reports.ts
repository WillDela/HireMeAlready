import { HttpError } from "@/lib/api";
import type { ReportInput } from "@/lib/contracts";
import { db } from "@/lib/db";

/**
 * POST /api/interviews/:id/report, from the call's Report dialog. Only participants
 * can report. A peer report names the other participant; an AI interview has no one
 * to name, so `reportedId` stays null and admins see "AI interview".
 */
export async function createReport(interviewId: string, userId: string, input: ReportInput) {
  const interview = await db.interview.findUnique({ where: { id: interviewId }, include: { participants: true } });
  if (!interview?.participants.some((p) => p.userId === userId)) throw new HttpError(404, "Interview not found");

  const reportedId = interview.mode === "PEER" ? (interview.participants.find((p) => p.userId !== userId)?.userId ?? null) : null;
  const report = await db.report.create({
    data: { interviewId, reporterId: userId, reportedId, reason: input.reason, details: input.details || null },
  });
  return { id: report.id };
}
