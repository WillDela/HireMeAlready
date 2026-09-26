import { handleRoute, HttpError } from "@/lib/api";
import { UpdateInterviewInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getInterviewDetail } from "@/lib/history";
import { requireParticipant } from "@/lib/interviews";
import { requireUser } from "@/lib/session";

// GET /api/interviews/:id: one interview's file (HistoryDetail) for its participants; 404 otherwise.
// The wrap-up page polls this until the analysis is ready or failed.
export function GET(_request: Request, ctx: RouteContext<"/api/interviews/[id]">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return getInterviewDetail(id, user.id);
  });
}

// PATCH /api/interviews/:id { elevenConversation }: AI mode. Called once the ElevenLabs
// session connects; also marks the interview ACTIVE and stamps startedAt.
export function PATCH(request: Request, ctx: RouteContext<"/api/interviews/[id]">) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { elevenConversation } = UpdateInterviewInput.parse(await request.json());
    const { interview } = await requireParticipant(id, user.id);
    if (interview.mode !== "AI") throw new HttpError(400, "Only AI interviews have a voice conversation");
    if (interview.status === "COMPLETED" || interview.status === "ABANDONED") {
      throw new HttpError(409, "This interview has already ended");
    }

    await db.interview.update({
      where: { id },
      data: {
        elevenConversation,
        status: "ACTIVE",
        startedAt: interview.startedAt ?? new Date(),
      },
    });
    return { ok: true };
  });
}
