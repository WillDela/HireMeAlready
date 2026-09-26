import { handleRoute, HttpError } from "@/lib/api";
import { UpdateInterviewInput } from "@/lib/contracts";
import { db } from "@/lib/db";
import { getInterviewDetail, requireParticipant } from "@/lib/interviews";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

// GET /api/interviews/:id: full detail for a participant (404 for anyone else). The
// wrap-up page polls this until the analysis is READY or FAILED.
export function GET(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    return getInterviewDetail(id, user.id);
  });
}

// PATCH /api/interviews/:id { elevenConversation }: AI mode. Called once the ElevenLabs
// session connects; also marks the interview ACTIVE and stamps startedAt.
export function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
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
