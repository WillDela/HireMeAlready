import type { InterviewRole } from "@/lib/contracts";
import { peerIdFor } from "@/lib/contracts";
import { db } from "@/lib/db";

// Entries whose heartbeat is older than this are never matched against, even though
// their row is still WAITING (the client stopped polling, e.g. a closed tab).
const STALE_MS = 15_000;

export type MatchResult = {
  interviewId: string;
  role: InterviewRole;
  selfPeerId: string;
  remotePeerId: string;
};

/**
 * Tries to match `userId`'s current WAITING queue entry with a waiting entry of the
 * opposite role. Runs in one transaction with `FOR UPDATE SKIP LOCKED` so two
 * concurrent polls can never match the same partner twice. Returns null if no
 * eligible partner is waiting right now.
 */
export async function tryMatch(userId: string, role: InterviewRole): Promise<MatchResult | null> {
  const opposite: InterviewRole = role === "INTERVIEWER" ? "INTERVIEWEE" : "INTERVIEWER";
  const staleBefore = new Date(Date.now() - STALE_MS);

  return db.$transaction(async (tx) => {
    // Lock our own entry first. If it's locked, someone else is matching us right now
    // (our next poll will see MATCHED); if it's no longer WAITING, we're already matched.
    // Locking self before partner also keeps two users matching each other from
    // deadlocking.
    const [self] = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "queue_entry"
      WHERE "userId" = ${userId} AND "status" = 'WAITING'
      FOR UPDATE SKIP LOCKED
    `;
    if (!self) return null;

    const [partner] = await tx.$queryRaw<{ id: string; userId: string }[]>`
      SELECT "id", "userId" FROM "queue_entry"
      WHERE "status" = 'WAITING'
        AND "role" = ${opposite}::"InterviewRole"
        AND "userId" != ${userId}
        AND "lastSeenAt" > ${staleBefore}::timestamp
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (!partner) return null;

    const interviewerId = role === "INTERVIEWER" ? userId : partner.userId;
    const intervieweeId = role === "INTERVIEWEE" ? userId : partner.userId;

    // One of the two jobTitle values, if either set one when joining.
    const [mine, theirs] = await Promise.all([
      tx.queueEntry.findUnique({ where: { userId } }),
      tx.queueEntry.findUnique({ where: { userId: partner.userId } }),
    ]);

    const interview = await tx.interview.create({
      data: { mode: "PEER", status: "PENDING", jobTitle: mine?.jobTitle ?? theirs?.jobTitle ?? undefined },
    });
    const interviewerPeerId = peerIdFor(interview.id, "INTERVIEWER");
    const intervieweePeerId = peerIdFor(interview.id, "INTERVIEWEE");
    await tx.participant.createMany({
      data: [
        { interviewId: interview.id, userId: interviewerId, role: "INTERVIEWER", peerId: interviewerPeerId },
        { interviewId: interview.id, userId: intervieweeId, role: "INTERVIEWEE", peerId: intervieweePeerId },
      ],
    });
    await tx.queueEntry.updateMany({
      where: { userId: { in: [userId, partner.userId] } },
      data: { status: "MATCHED", interviewId: interview.id },
    });

    return {
      interviewId: interview.id,
      role,
      selfPeerId: role === "INTERVIEWER" ? interviewerPeerId : intervieweePeerId,
      remotePeerId: role === "INTERVIEWER" ? intervieweePeerId : interviewerPeerId,
    };
  });
}
