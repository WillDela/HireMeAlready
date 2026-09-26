import { handleRoute } from "@/lib/api";
import { listInterviews } from "@/lib/history";
import { requireUser } from "@/lib/session";

// GET /api/interviews: your completed interviews, newest first (HistoryItem[]).
export function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return listInterviews(user.id);
  });
}
