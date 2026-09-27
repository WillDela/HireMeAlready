import { HttpError } from "@/lib/api";
import type { FeedbackInput, PeerEventInput, PeerSession, PeerWrapUp } from "@/lib/contracts";
import { db } from "@/lib/db";
import { partnerStillThere, touchMatch } from "@/lib/matching";
import { notify } from "@/lib/notifications";
import { initialsFor, toQuestionView, toResumeView } from "@/lib/views";

// The call page's side of a matched peer interview (/call/[id] for a PEER interview).

async function myParticipation(interviewId: string, userId: string) {
  const me = await db.participant.findUnique({ where: { interviewId_userId: { interviewId, userId } } });
  if (!me) throw new HttpError(404, "Interview not found");
  return me;
}

/** GET /api/interviews/:id/peer. Also the call page's heartbeat while the interview is PENDING. */
export async function getPeerSession(interviewId: string, userId: string): Promise<PeerSession> {
  const me = await myParticipation(interviewId, userId);
  await touchMatch(userId, interviewId);
  await partnerStillThere(interviewId, userId); // abandons the interview if they're gone

  const interview = await db.interview.findUniqueOrThrow({
    where: { id: interviewId },
    include: {
      participants: { include: { user: { include: { profile: true } } } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (interview.mode !== "PEER") throw new HttpError(404, "Interview not found");
  const partner = interview.participants.find((p) => p.userId !== userId);
  if (!partner) throw new HttpError(404, "Interview not found");

  const isInterviewer = me.role === "INTERVIEWER";
  const profile = partner.user.profile;
  const resume =
    isInterviewer && profile?.shareResume && profile.activeResumeId
      ? await db.resume.findUnique({ where: { id: profile.activeResumeId } })
      : null;
  const partnerView = {
    name: partner.user.name,
    initials: initialsFor(partner.user.name, partner.user.email),
    headline: profile?.headline ?? "",
  };

  return {
    interviewId,
    status: interview.status,
    role: me.role,
    isCaller: isInterviewer,
    selfPeerId: me.peerId,
    remotePeerId: partner.peerId,
    jobTitle: interview.jobTitle,
    company: interview.company,
    partner: partnerView,
    candidate: resume
      ? {
          ...toResumeView(resume, null),
          name: partnerView.name,
          initials: partnerView.initials,
          target:
            [interview.jobTitle || profile?.targetRole, interview.company].filter(Boolean).join(" at ") ||
            partnerView.headline,
        }
      : null,
    questions: isInterviewer ? interview.questions.map(toQuestionView) : [],
    recordingAllowed: interview.participants.every((p) => p.user.profile?.recordingConsent === true),
  };
}

/**
 * PATCH /api/interviews/:id/peer. `connected`: the first one starts the interview.
 * `left`: ends it (COMPLETED, or ABANDONED if it never started). Both are idempotent.
 * `completedNow` is true only for the call that ended it, which finalizes it.
 */
export async function recordPeerEvent(interviewId: string, userId: string, { event }: PeerEventInput) {
  const me = await myParticipation(interviewId, userId);
  const now = new Date();
  let completedNow = false;
  if (event === "connected") {
    await db.$transaction([
      db.participant.updateMany({ where: { id: me.id, joinedAt: null }, data: { joinedAt: now } }),
      db.interview.updateMany({
        where: { id: interviewId, status: "PENDING" },
        data: { status: "ACTIVE", startedAt: now },
      }),
    ]);
  } else {
    const [, completed] = await db.$transaction([
      db.participant.updateMany({ where: { id: me.id, leftAt: null }, data: { leftAt: now } }),
      db.interview.updateMany({ where: { id: interviewId, status: "ACTIVE" }, data: { status: "COMPLETED", endedAt: now } }),
      db.interview.updateMany({ where: { id: interviewId, status: "PENDING" }, data: { status: "ABANDONED", endedAt: now } }),
    ]);
    completedNow = completed.count > 0;
  }
  const { status } = await db.interview.findUniqueOrThrow({ where: { id: interviewId }, select: { status: true } });
  return { status, completedNow };
}

/** GET /api/interviews/:id/feedback: what the wrap-up page shows after a peer interview. */
export async function getPeerWrapUp(interviewId: string, userId: string): Promise<PeerWrapUp> {
  const me = await myParticipation(interviewId, userId);
  const interview = await db.interview.findUniqueOrThrow({
    where: { id: interviewId },
    include: { participants: { include: { user: true } }, feedback: { select: { id: true }, take: 1 } },
  });
  const partner = interview.participants.find((p) => p.userId !== userId);
  if (interview.mode !== "PEER" || !partner) throw new HttpError(404, "Interview not found");
  return {
    interviewId,
    status: interview.status,
    role: me.role,
    jobTitle: interview.jobTitle,
    company: interview.company,
    partner: { name: partner.user.name, initials: initialsFor(partner.user.name, partner.user.email) },
    feedbackSent: interview.feedback.length > 0,
  };
}

/**
 * POST /api/interviews/:id/feedback: the interviewer rates the candidate, once the call
 * has started. Sending again replaces the earlier ratings. The candidate reads it in
 * their interview file (see getInterviewDetail).
 */
export async function submitPeerFeedback(interviewId: string, userId: string, input: FeedbackInput) {
  const me = await myParticipation(interviewId, userId);
  if (me.role !== "INTERVIEWER") throw new HttpError(403, "Only the interviewer leaves feedback");
  const interview = await db.interview.findUniqueOrThrow({ where: { id: interviewId }, include: { participants: true } });
  const candidate = interview.participants.find((p) => p.role === "INTERVIEWEE");
  if (interview.mode !== "PEER" || !candidate) throw new HttpError(404, "Interview not found");
  if (interview.status === "PENDING" || interview.status === "ABANDONED") {
    throw new HttpError(409, "This interview never started, so there's nothing to rate");
  }
  const where = { interviewId_authorId: { interviewId, authorId: userId } };
  const isNew = !(await db.feedback.findUnique({ where, select: { id: true } }));
  await db.feedback.upsert({
    where,
    create: { interviewId, authorId: userId, subjectId: candidate.userId, ...input },
    update: input,
  });
  if (isNew) {
    const author = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await notify(candidate.userId, {
      kind: "FEEDBACK_RECEIVED",
      title: `${author.name} left you feedback`,
      body: `${interview.company || interview.jobTitle || "Your"} mock interview.`,
      href: `/history/${interviewId}`,
    });
  }
  return getPeerWrapUp(interviewId, userId);
}
