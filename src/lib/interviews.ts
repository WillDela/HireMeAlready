import { HttpError } from "@/lib/api";
import { db } from "@/lib/db";

/** The interview, if `userId` took part in it; 404 otherwise (so ids can't be probed). */
export async function requireParticipant(interviewId: string, userId: string) {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { participants: true },
  });
  const me = interview?.participants.find((p) => p.userId === userId);
  if (!interview || !me) throw new HttpError(404, "Interview not found");
  return { interview, me };
}
