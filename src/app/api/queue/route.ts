import { handleRoute } from "@/lib/api";
import { JoinQueueInput } from "@/lib/contracts";
import { joinQueue, leaveQueue, queueState } from "@/lib/matching";
import { requireUser } from "@/lib/session";

// POST /api/queue { role, jobTitle?, company? }: join the line (at the back). Returns a QueueState.
export function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    return joinQueue(user.id, JoinQueueInput.parse(await request.json()));
  });
}

// GET /api/queue: the QueueState. Poll every ~2s through search, match and lobby; each
// poll is a heartbeat and a match attempt.
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return queueState(user.id);
  });
}

// DELETE /api/queue: stop waiting, or back out of a match before the call starts.
export function DELETE() {
  return handleRoute(async () => {
    const user = await requireUser();
    await leaveQueue(user.id);
    return { state: "idle" };
  });
}
