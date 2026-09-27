import { after } from "next/server";
import type { InterviewRole as Role } from "@/generated/prisma/client";
import { type JoinQueueInput, type MatchPartner, ParsedResume, type QueueState, peerIdFor } from "@/lib/contracts";
import { db } from "@/lib/db";
import { generateQuestions } from "@/lib/gemini";
import { closeInvite, inviteExpired } from "@/lib/invitations";
import { log } from "@/lib/log";
import { initialsFor, questionSource } from "@/lib/views";

// Live matching. Everyone in line polls GET /api/queue every ~2s; each poll is a
// heartbeat and a match attempt. Two polls can race to match the same person, so a
// match happens in one transaction that row-locks both queue entries and re-checks
// they're still WAITING. Locks are taken in id order: if each side locked its own
// row first, two people polling at the same moment would each skip (or wait on) the
// other forever.

/** Waiting entries that haven't polled for this long are never matched. */
const WAITING_STALE_SECONDS = 15;
/**
 * A matched partner that hasn't polled for this long has left; the match is abandoned.
 * Generous on purpose: Chrome throttles timers in a hidden tab to about once a minute
 * after 5 minutes, so someone who switched tabs in the lobby still polls, just slowly.
 * Real departures are caught sooner by the live page's pagehide DELETE and the call
 * page's Leave.
 */
const MATCHED_STALE_MS = 90_000;
const SUGGESTED_QUESTIONS = 8;

const opposite = (role: Role): Role => (role === "INTERVIEWER" ? "INTERVIEWEE" : "INTERVIEWER");

/** POST /api/queue: (re)joins the line at the back. Drops any match still pending. */
export async function joinQueue(userId: string, input: JoinQueueInput) {
  await leaveQueue(userId);
  const now = new Date();
  const fields = {
    role: input.role,
    status: "WAITING" as const,
    // Interviewers don't pick a role to practice for; the interviewee's entry names it.
    jobTitle: input.role === "INTERVIEWEE" ? input.jobTitle || null : null,
    company: input.role === "INTERVIEWEE" ? input.company || null : null,
    interviewId: null,
    createdAt: now,
    lastSeenAt: now,
  };
  await db.queueEntry.upsert({ where: { userId }, create: { userId, ...fields }, update: fields });
  return queueState(userId);
}

/**
 * DELETE /api/queue: stops waiting. Leaving a match that hasn't started abandons the
 * interview; the partner finds out on their next poll and goes back in line.
 */
export async function leaveQueue(userId: string) {
  const entry = await db.queueEntry.findUnique({ where: { userId } });
  if (!entry || (entry.status !== "WAITING" && entry.status !== "MATCHED")) return;
  await db.$transaction([
    ...(entry.status === "MATCHED" && entry.interviewId
      ? [
          db.interview.updateMany({
            where: { id: entry.interviewId, status: "PENDING" },
            data: { status: "ABANDONED", endedAt: new Date() },
          }),
        ]
      : []),
    db.queueEntry.update({ where: { userId }, data: { status: "CANCELLED" } }),
  ]);
}

/** GET /api/queue: heartbeat, match attempt, and the state the live page shows. */
export async function queueState(userId: string): Promise<QueueState> {
  let entry = await db.queueEntry.findUnique({ where: { userId } });
  if (!entry) return { state: "idle" };
  if (entry.status === "EXPIRED") return { state: "expired" };
  if (entry.status === "CANCELLED") return { state: "idle" };

  entry = await db.queueEntry.update({ where: { userId }, data: { lastSeenAt: new Date() } });

  if (entry.status === "WAITING") {
    const interviewId = await tryMatch(userId);
    if (interviewId) after(() => prepareSuggestedQuestions(interviewId));
    // Re-read: either we matched, or someone else matched us while we tried.
    entry = await db.queueEntry.findUniqueOrThrow({ where: { userId } });
    if (entry.status === "WAITING") return { state: "waiting", since: entry.createdAt.toISOString() };
  }
  if (entry.status !== "MATCHED" || !entry.interviewId) return { state: "idle" };

  const interview = await db.interview.findUnique({
    where: { id: entry.interviewId },
    include: { participants: { include: { user: { include: { profile: true } } } } },
  });
  const partner = interview?.participants.find((p) => p.userId !== userId);
  // Once the call starts, the match is the call page's business, not the queue's.
  if (!interview || !partner || interview.status === "ACTIVE" || interview.status === "COMPLETED") {
    return { state: "idle" };
  }

  if (!(await partnerStillThere(interview.id, userId))) {
    await db.queueEntry.update({
      where: { userId },
      // createdAt stays, so we're first in line again.
      data: { status: "WAITING", interviewId: null, lastSeenAt: new Date() },
    });
    return { state: "waiting", since: entry.createdAt.toISOString(), partnerLeft: { name: partner.user.name } };
  }

  const role = opposite(partner.role);
  return {
    state: "matched",
    interviewId: interview.id,
    role,
    selfPeerId: peerIdFor(interview.id, role),
    remotePeerId: partner.peerId,
    partner: await matchPartner(userId, partner.user, partner.role, interview.jobTitle),
  };
}

/**
 * For a PENDING interview: false (and the interview ABANDONED) once the other
 * participant has cancelled or stopped polling both the queue and the call page.
 * ACTIVE and finished interviews are left alone.
 */
export async function partnerStillThere(interviewId: string, userId: string) {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: {
      participants: { include: { user: { include: { queueEntry: true } } } },
      invitations: true,
    },
  });
  if (!interview) return false;
  if (interview.status === "ABANDONED") return false;
  if (interview.status !== "PENDING") return true;

  // Invited interviews skip the queue, so there's no heartbeat to go by: the other
  // person may take a while to see the invite. Wait while it's open.
  const invite = interview.invitations[0];
  if (invite) {
    const open = (invite.status === "PENDING" || invite.status === "ACCEPTED") && !inviteExpired(invite);
    if (open) return true;
    await closeInvite(invite, invite.status === "DECLINED" ? "DECLINED" : "EXPIRED");
    return false;
  }

  const partnerEntry = interview.participants.find((p) => p.userId !== userId)?.user.queueEntry;
  const here =
    partnerEntry?.status === "MATCHED" &&
    partnerEntry.interviewId === interviewId &&
    Date.now() - partnerEntry.lastSeenAt.getTime() < MATCHED_STALE_MS;
  if (here) return true;

  await db.interview.updateMany({
    where: { id: interviewId, status: "PENDING" },
    data: { status: "ABANDONED", endedAt: new Date() },
  });
  return false;
}

/** Keeps a matched user's heartbeat fresh while they're on the call page instead of polling the queue. */
export async function touchMatch(userId: string, interviewId: string) {
  await db.queueEntry.updateMany({
    where: { userId, status: "MATCHED", interviewId },
    data: { lastSeenAt: new Date() },
  });
}

type EntryRow = { id: string; userId: string; role: Role; jobTitle: string | null; company: string | null };

/** Matches a WAITING user with someone in the opposite role. Returns the new interview's id. */
export async function tryMatch(userId: string): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const [me] = await tx.$queryRaw<EntryRow[]>`
      SELECT id, "userId", role, "jobTitle", company FROM queue_entry
      WHERE "userId" = ${userId} AND status = 'WAITING'
    `;
    if (!me) return null;

    // Closest resume first (pgvector cosine distance), then first come, first served.
    // Anyone without an embedding sorts last.
    const [partner] = await tx.$queryRaw<EntryRow[]>`
      SELECT q.id, q."userId", q.role, q."jobTitle", q.company
      FROM queue_entry q
      LEFT JOIN profile p ON p."userId" = q."userId"
      LEFT JOIN resume r ON r.id = p."activeResumeId"
      WHERE q.status = 'WAITING'
        AND q.role = ${opposite(me.role)}::"InterviewRole"
        AND q."lastSeenAt" > now() - make_interval(secs => ${WAITING_STALE_SECONDS})
        AND q."userId" <> ${userId}
      ORDER BY r.embedding <=> (
          SELECT mr.embedding FROM profile mp JOIN resume mr ON mr.id = mp."activeResumeId"
          WHERE mp."userId" = ${userId}
        ) NULLS LAST,
        q."createdAt"
      LIMIT 1
    `;
    if (!partner) return null;

    // After waiting on a lock, Postgres re-checks the WHERE against the committed row, so
    // anyone matched meanwhile drops out; then we try again on the next poll.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM queue_entry
      WHERE id IN (${me.id}, ${partner.id}) AND status = 'WAITING'
      ORDER BY id
      FOR UPDATE
    `;
    if (locked.length !== 2) return null;

    const interviewee = me.role === "INTERVIEWEE" ? me : partner;
    const interview = await tx.interview.create({
      data: { mode: "PEER", jobTitle: interviewee.jobTitle, company: interviewee.company },
    });
    await tx.participant.createMany({
      data: [me, partner].map((e) => ({
        interviewId: interview.id,
        userId: e.userId,
        role: e.role,
        peerId: peerIdFor(interview.id, e.role),
      })),
    });
    await tx.queueEntry.updateMany({
      where: { id: { in: [me.id, partner.id] } },
      data: { status: "MATCHED", interviewId: interview.id },
    });
    return interview.id;
  });
}

async function matchPartner(
  userId: string,
  partner: { id: string; name: string; email: string; profile: { headline: string | null; activeResumeId: string | null } | null },
  role: Role,
  jobTitle: string | null,
): Promise<MatchPartner> {
  const [mySkills, theirSkills, interviewsDone] = await Promise.all([
    activeResumeSkills(userId),
    activeResumeSkills(partner.id),
    db.participant.count({ where: { userId: partner.id, interview: { status: "COMPLETED" } } }),
  ]);
  const mine = new Set(mySkills.map((s) => s.toLowerCase()));
  const shared = theirSkills.filter((s) => mine.has(s.toLowerCase())).slice(0, 3);
  return {
    name: partner.name,
    initials: initialsFor(partner.name, partner.email),
    headline: partner.profile?.headline ?? "",
    role,
    interviewsDone,
    matchedOn: shared.length ? shared : jobTitle ? [jobTitle] : [],
  };
}

async function activeResume(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.activeResumeId) return { profile, parsed: null };
  const resume = await db.resume.findUnique({ where: { id: profile.activeResumeId } });
  const parsed = ParsedResume.safeParse(resume?.parsed);
  return { profile, parsed: parsed.success ? parsed.data : null };
}

async function activeResumeSkills(userId: string) {
  return (await activeResume(userId)).parsed?.skills ?? [];
}

/**
 * Background job (run through `after()` right after a match): suggested questions for
 * the interviewer's side panel, from the interviewee's resume and target role.
 */
export async function prepareSuggestedQuestions(interviewId: string) {
  try {
    const interview = await db.interview.findUniqueOrThrow({
      where: { id: interviewId },
      include: { participants: true },
    });
    const interviewee = interview.participants.find((p) => p.role === "INTERVIEWEE");
    if (!interviewee) return;
    const { profile, parsed } = await activeResume(interviewee.userId);
    const resume = parsed ?? { summary: "", skills: [], experience: [], education: [] };

    const questions = await generateQuestions({
      resume,
      jobTitle: interview.jobTitle || profile?.targetRole || resume.targetRole || "a role in their field",
      company: interview.company ?? undefined,
      grounded: false,
      count: SUGGESTED_QUESTIONS,
    });
    await db.question.createMany({
      data: questions.map((q, order) => ({
        interviewId,
        order,
        text: q.text,
        category: q.category,
        source: questionSource(q),
        rationale: q.rationale,
        sourceUrl: q.sourceUrl,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    log.error("matching", "suggested questions failed", { interview: interviewId, err });
  }
}
