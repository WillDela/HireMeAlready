import { HttpError } from "@/lib/api";
import type { PeerEventInput, PeerSession } from "@/lib/contracts";
import { db } from "@/lib/db";
import { partnerStillThere, touchMatch } from "@/lib/matching";
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
  };
}

/**
 * PATCH /api/interviews/:id/peer. `connected`: the first one starts the interview.
 * `left`: ends it (COMPLETED, or ABANDONED if it never started). Both are idempotent.
 */
export async function recordPeerEvent(interviewId: string, userId: string, { event }: PeerEventInput) {
  const me = await myParticipation(interviewId, userId);
  const now = new Date();
  if (event === "connected") {
    await db.$transaction([
      db.participant.updateMany({ where: { id: me.id, joinedAt: null }, data: { joinedAt: now } }),
      db.interview.updateMany({
        where: { id: interviewId, status: "PENDING" },
        data: { status: "ACTIVE", startedAt: now },
      }),
    ]);
  } else {
    await db.$transaction([
      db.participant.updateMany({ where: { id: me.id, leftAt: null }, data: { leftAt: now } }),
      db.interview.updateMany({ where: { id: interviewId, status: "ACTIVE" }, data: { status: "COMPLETED", endedAt: now } }),
      db.interview.updateMany({ where: { id: interviewId, status: "PENDING" }, data: { status: "ABANDONED", endedAt: now } }),
    ]);
  }
  const { status } = await db.interview.findUniqueOrThrow({ where: { id: interviewId }, select: { status: true } });
  return { status };
}
