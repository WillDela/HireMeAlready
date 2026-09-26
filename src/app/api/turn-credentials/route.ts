import { createHmac } from "node:crypto";
import { handleRoute, HttpError } from "@/lib/api";
import type { IceServersResponse } from "@/lib/contracts";
import { requireUser } from "@/lib/session";

// Long enough to outlast any interview; a credential only needs to be valid when the
// TURN allocation is created and refreshed.
const TTL_SECONDS = 2 * 60 * 60;

// Time-limited TURN credentials (coturn's `use-auth-secret` / TURN REST API scheme):
// username = "<expiry unix time>:<user id>", password = base64(HMAC-SHA1(secret, username)).
export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const secret = process.env.TURN_SECRET;
    const host = process.env.TURN_HOST;
    if (!secret || !host) throw new HttpError(503, "TURN is not configured");

    const username = `${Math.floor(Date.now() / 1000) + TTL_SECONDS}:${user.id}`;
    const credential = createHmac("sha1", secret).update(username).digest("base64");

    const body: IceServersResponse = {
      ttl: TTL_SECONDS,
      iceServers: [
        { urls: `stun:${host}:3478` },
        {
          urls: [`turn:${host}:3478?transport=udp`, `turn:${host}:3478?transport=tcp`],
          username,
          credential,
        },
      ],
    };
    return body;
  });
}
