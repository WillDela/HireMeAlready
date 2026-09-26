import { handleRoute, HttpError } from "@/lib/api";
import { JoinQueueInput, peerIdFor, type InterviewRole, type QueueState } from "@/lib/contracts";
import { db } from "@/lib/db";
import { tryMatch } from "@/lib/matching";
import { requireUser } from "@/lib/session";

/** Builds the `matched` QueueState for a queue entry already pointing at an interview. */
async function matchedState(userId: string, interviewId: string, role: InterviewRole): Promise<QueueState> {
  const participants = await db.participant.findMany({ where: { interviewId }, include: { user: true } });
  const partner = participants.find((p) => p.userId !== userId);
  return {
    state: "matched",
    interviewId,
    role,
    selfPeerId: peerIdFor(interviewId, role),
    remotePeerId: peerIdFor(interviewId, role === "INTERVIEWER" ? "INTERVIEWEE" : "INTERVIEWER"),
    partnerName: partner?.user.name ?? "Your partner",
  };
}

// POST /api/queue { role, jobTitle? }: joins the queue (or rejoins, resetting a
// previous MATCHED/CANCELLED row back to WAITING), then tries an immediate match.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { role, jobTitle } = JoinQueueInput.parse(await request.json());

    const entry = await db.queueEntry.upsert({
      where: { userId: user.id },
      create: { userId: user.id, role, jobTitle, status: "WAITING" },
      update: { role, jobTitle, status: "WAITING", interviewId: null, lastSeenAt: new Date() },
    });

    const match = await tryMatch(user.id, role);
    if (match) return matchedState(user.id, match.interviewId, match.role);

    const body: QueueState = { state: "waiting", since: entry.createdAt.toISOString() };
    return body;
  });
}

// GET /api/queue: polled every ~2s while waiting. Heartbeats the caller's entry and
// retries the match on every poll, since a partner may have joined in the meantime.
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const entry = await db.queueEntry.findUnique({ where: { userId: user.id } });
    if (!entry) return { state: "idle" } satisfies QueueState;

    if (entry.status === "MATCHED") {
      if (!entry.interviewId) throw new HttpError(500, "Queue entry is matched without an interview");
      return matchedState(user.id, entry.interviewId, entry.role);
    }
    if (entry.status !== "WAITING") {
      return { state: "idle" } satisfies QueueState;
    }

    await db.queueEntry.update({ where: { userId: user.id }, data: { lastSeenAt: new Date() } });
    const match = await tryMatch(user.id, entry.role);
    if (match) return matchedState(user.id, match.interviewId, match.role);

    const body: QueueState = { state: "waiting", since: entry.createdAt.toISOString() };
    return body;
  });
}

// DELETE /api/queue: leaves the queue (cancel search, or after a match is handled).
export function DELETE() {
  return handleRoute(async () => {
    const user = await requireUser();
    await db.queueEntry.deleteMany({ where: { userId: user.id } });
    return { state: "idle" } satisfies QueueState;
  });
}
