import type { InterviewRole as Role } from "@/generated/prisma/client";
import { HttpError } from "@/lib/api";
import { type InvitationsResponse, type InviteView, type SendInviteInput, peerIdFor } from "@/lib/contracts";
import { db } from "@/lib/db";
import { toPerson } from "@/lib/friends";
import { notify } from "@/lib/notifications";

// Friends inviting each other straight into a peer interview, skipping the queue.
// Sending creates the PENDING interview with the inviter as its only participant;
// accepting adds the invitee, and from there both go through the lobby into
// /call/[id] like a matched pair. Invited interviews have no queue heartbeat, so the
// call page waits for the other person for as long as the invite is open (see
// partnerStillThere): until it's declined, cancelled, someone leaves the call, or it
// turns a day old.

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const opposite = (role: Role): Role => (role === "INTERVIEWER" ? "INTERVIEWEE" : "INTERVIEWER");
const roleLabel = (role: Role) => (role === "INTERVIEWER" ? "interviewer" : "interviewee");

/** True once an unanswered or accepted invite is too old to still be waiting on. */
export function inviteExpired(invite: { createdAt: Date }, now = Date.now()) {
  return now - invite.createdAt.getTime() > INVITE_TTL_MS;
}

/** Closes an invite and abandons its interview, unless the call already started. */
export async function closeInvite(invite: { id: string; interviewId: string }, status: "DECLINED" | "EXPIRED") {
  await db.$transaction([
    db.invitation.update({ where: { id: invite.id }, data: { status } }),
    db.interview.updateMany({
      where: { id: invite.interviewId, status: "PENDING" },
      data: { status: "ABANDONED", endedAt: new Date() },
    }),
  ]);
}

async function expireStaleInvites(userId: string) {
  const stale = await db.invitation.findMany({
    where: {
      OR: [{ fromId: userId }, { toId: userId }],
      status: { in: ["PENDING", "ACCEPTED"] },
      interview: { status: "PENDING" },
      createdAt: { lt: new Date(Date.now() - INVITE_TTL_MS) },
    },
    select: { id: true, interviewId: true },
  });
  for (const invite of stale) await closeInvite(invite, "EXPIRED");
}

/** GET /api/invitations: your open invites, sent and received, newest first. */
export async function listInvitations(userId: string): Promise<InvitationsResponse> {
  await expireStaleInvites(userId);
  const invites = await db.invitation.findMany({
    where: {
      OR: [{ fromId: userId }, { toId: userId }],
      status: { in: ["PENDING", "ACCEPTED"] },
      interview: { status: "PENDING" },
    },
    include: {
      from: { include: { profile: true } },
      to: { include: { profile: true } },
      interview: { include: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const view = (inv: (typeof invites)[number]): InviteView => {
    const sent = inv.fromId === userId;
    const other = sent ? inv.to : inv.from;
    const inviterRole = inv.interview.participants.find((p) => p.userId === inv.fromId)?.role ?? "INTERVIEWEE";
    return {
      id: inv.id,
      interviewId: inv.interviewId,
      person: toPerson(other, other.profile?.headline ?? null),
      yourRole: sent ? inviterRole : opposite(inviterRole),
      jobTitle: inv.interview.jobTitle,
      company: inv.interview.company,
      status: inv.status as InviteView["status"],
      sentAt: inv.createdAt.toISOString(),
    };
  };

  return {
    incoming: invites.filter((i) => i.toId === userId).map(view),
    outgoing: invites.filter((i) => i.fromId === userId).map(view),
  };
}

/** POST /api/invitations: invite a friend into a practice interview. */
export async function sendInvite(user: { id: string; name: string }, input: SendInviteInput) {
  const { userId: toId, role } = input;
  if (toId === user.id) throw new HttpError(400, "You can't invite yourself");

  const friendship = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: user.id, addresseeId: toId },
        { requesterId: toId, addresseeId: user.id },
      ],
    },
    include: { requester: true, addressee: true },
  });
  if (!friendship) throw new HttpError(403, "You can only invite friends");
  const friend = friendship.requesterId === toId ? friendship.requester : friendship.addressee;

  await expireStaleInvites(user.id);
  const open = await db.invitation.findFirst({
    where: {
      OR: [
        { fromId: user.id, toId },
        { fromId: toId, toId: user.id },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
      interview: { status: "PENDING" },
    },
  });
  if (open) {
    throw new HttpError(
      409,
      open.fromId === user.id
        ? `You already invited ${friend.name}`
        : `${friend.name} already invited you. Answer theirs on the Practice page.`,
    );
  }

  const jobTitle = input.jobTitle || null;
  const company = input.company || null;
  await db.$transaction(async (tx) => {
    const interview = await tx.interview.create({ data: { mode: "PEER", jobTitle, company } });
    await tx.participant.create({
      data: { interviewId: interview.id, userId: user.id, role, peerId: peerIdFor(interview.id, role) },
    });
    await tx.invitation.create({ data: { interviewId: interview.id, fromId: user.id, toId } });
  });

  const target = [jobTitle, company].filter(Boolean).join(" at ");
  await notify(toId, {
    kind: "INTERVIEW_INVITE",
    title: `${user.name} invited you to a practice interview`,
    body: `You'd be the ${roleLabel(opposite(role))}${target ? `, for ${target}` : ""}.`,
    href: "/practice#invitations",
  });
  return listInvitations(user.id);
}

/**
 * PATCH /api/invitations/:id: the invitee accepts (joining the interview) or declines.
 * Returns the interview id so an accept can head straight to the lobby.
 */
export async function respondToInvite(
  user: { id: string; name: string },
  inviteId: string,
  status: "ACCEPTED" | "DECLINED",
) {
  const invite = await db.invitation.findUnique({
    where: { id: inviteId },
    include: { interview: { include: { participants: true } } },
  });
  if (!invite || invite.toId !== user.id) throw new HttpError(404, "Invite not found");
  if (invite.status === "EXPIRED") throw new HttpError(410, "That invite has expired");
  if (invite.status !== "PENDING") throw new HttpError(409, "You already answered that invite");
  if (invite.interview.status !== "PENDING" || inviteExpired(invite)) {
    await closeInvite(invite, "EXPIRED");
    throw new HttpError(410, "That invite has expired");
  }

  if (status === "DECLINED") {
    await closeInvite(invite, "DECLINED");
    await notify(invite.fromId, {
      kind: "INVITE_DECLINED",
      title: `${user.name} can't practice right now`,
      body: "They declined your interview invite. Try another time, or find a partner.",
      href: "/friends",
    });
  } else {
    const inviterRole = invite.interview.participants.find((p) => p.userId === invite.fromId)?.role;
    if (!inviterRole) throw new HttpError(410, "That invite has expired");
    const role = opposite(inviterRole);
    await db.$transaction(async (tx) => {
      // Guards against a double click accepting twice.
      const { count } = await tx.invitation.updateMany({
        where: { id: inviteId, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      if (count !== 1) throw new HttpError(409, "You already answered that invite");
      await tx.participant.create({
        data: { interviewId: invite.interviewId, userId: user.id, role, peerId: peerIdFor(invite.interviewId, role) },
      });
    });
    await notify(invite.fromId, {
      kind: "INVITE_ACCEPTED",
      title: `${user.name} accepted your interview invite`,
      body: "They're heading to the lobby. Join them when you're ready.",
      href: `/call/${invite.interviewId}/lobby`,
    });
  }
  return { interviewId: invite.interviewId, ...(await listInvitations(user.id)) };
}

/** DELETE /api/invitations/:id: either side calls off an open invite before the call starts. */
export async function cancelInvite(userId: string, inviteId: string) {
  const invite = await db.invitation.findUnique({ where: { id: inviteId }, include: { interview: true } });
  if (!invite || (invite.fromId !== userId && invite.toId !== userId)) throw new HttpError(404, "Invite not found");
  if (invite.interview.status === "ACTIVE") throw new HttpError(409, "That interview has already started");
  const open = invite.status === "PENDING" || invite.status === "ACCEPTED";
  if (open && invite.interview.status === "PENDING") await closeInvite(invite, "EXPIRED");
  return listInvitations(userId);
}
