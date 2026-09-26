import type { PeerOptions } from "peerjs";

// Where the browser finds the PeerJS signaling server. Everyone, including local dev,
// uses the production server behind Caddy at https://hiremealready.study/peerjs.
// NEXT_PUBLIC_* values are inlined at build time, so these must stay literal accesses.
export function peerServerOptions(): Partial<PeerOptions> {
  const port = Number(process.env.NEXT_PUBLIC_PEER_PORT || 443);
  return {
    host: process.env.NEXT_PUBLIC_PEER_HOST || "hiremealready.study",
    port,
    path: process.env.NEXT_PUBLIC_PEER_PATH || "/peerjs",
    secure: port === 443,
  };
}
