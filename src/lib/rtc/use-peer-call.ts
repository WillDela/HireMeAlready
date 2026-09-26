"use client";

import type { MediaConnection, Peer } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { openPreferredMedia } from "@/lib/rtc/device-prefs";
import { peerServerOptions } from "@/lib/rtc/peer-config";

export type CallState = "idle" | "starting" | "waiting" | "connecting" | "connected" | "ended" | "failed";

/** How media is flowing: "relay" = through our TURN server, "host"/"srflx" = direct. */
export type ConnectionType = RTCIceCandidateType | null;

type Options = {
  selfPeerId: string;
  remotePeerId: string;
  /** The caller dials; the other side answers. In interviews the interviewer calls. */
  isCaller: boolean;
  /** From /api/turn-credentials. The call starts once this is non-null. */
  iceServers: RTCIceServer[] | null;
  /** Only use TURN relay candidates. For proving TURN works; leave off in real calls. */
  forceRelay?: boolean;
};

const REDIAL_MS = 2000;

/**
 * One 1:1 video call over PeerJS. Grabs the camera + mic picked in the lobby, registers `selfPeerId` with the
 * signaling server, and either dials `remotePeerId` (retrying until it comes online)
 * or waits for its call.
 */
export function usePeerCall({ selfPeerId, remotePeerId, isCaller, iceServers, forceRelay = false }: Options) {
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);
  const teardownRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!iceServers) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let peer: Peer | null = null;
    let call: MediaConnection | null = null;
    let redialTimer: ReturnType<typeof setTimeout> | undefined;

    const teardown = () => {
      cancelled = true;
      clearTimeout(redialTimer);
      call?.close();
      peer?.destroy();
      stream?.getTracks().forEach((t) => t.stop());
    };
    teardownRef.current = teardown;

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setState("failed");
      teardown();
    };

    const attach = (c: MediaConnection) => {
      call = c;
      // Events from a call we've already replaced (e.g. a redial) must not change state.
      const isCurrent = () => !cancelled && call === c;
      setState("connecting");
      c.on("stream", (remote) => {
        if (!isCurrent()) return;
        setRemoteStream(remote);
        setState("connected");
      });
      c.on("close", () => {
        if (isCurrent()) setState("ended");
      });
      c.on("error", (err) => {
        if (isCurrent()) fail(err.message);
      });
      // ICE outcomes aren't surfaced as PeerJS events, so watch the connection directly.
      c.peerConnection?.addEventListener("iceconnectionstatechange", () => {
        if (!isCurrent()) return;
        const pc = c.peerConnection;
        if (pc.iceConnectionState === "failed") {
          fail(forceRelay ? "Couldn't connect through the TURN relay" : "Couldn't connect to the other person");
        } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          selectedCandidateType(pc).then((type) => isCurrent() && setConnectionType(type));
        }
      });
    };

    (async () => {
      setState("starting");
      setError(null);
      try {
        stream = await openPreferredMedia();
      } catch {
        fail("Camera or microphone permission was denied");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      setLocalStream(stream);

      const { Peer } = await import("peerjs"); // touches `window`, so load client-side only
      if (cancelled) return;
      peer = new Peer(selfPeerId, {
        ...peerServerOptions(),
        config: { iceServers, iceTransportPolicy: forceRelay ? "relay" : "all" },
      });

      const dial = () => {
        if (cancelled || !peer || !stream) return;
        attach(peer.call(remotePeerId, stream));
      };

      peer.on("open", () => {
        setState("waiting");
        if (isCaller) dial();
      });
      peer.on("call", (incoming) => {
        if (isCaller || call) return incoming.close();
        incoming.answer(stream!);
        attach(incoming);
      });
      peer.on("error", (err) => {
        if (err.type === "peer-unavailable" && isCaller) {
          // The other side hasn't joined within the server's 5s window; keep dialing.
          const stale = call;
          call = null;
          stale?.close();
          setState("waiting");
          redialTimer = setTimeout(dial, REDIAL_MS);
        } else if (err.type === "unavailable-id") {
          fail("This call is already open in another tab or device");
        } else {
          fail(err.message);
        }
      });
    })();

    return teardown;
  }, [selfPeerId, remotePeerId, isCaller, iceServers, forceRelay]);

  const hangUp = useCallback(() => {
    teardownRef.current();
    setState("ended");
  }, []);

  return { state, error, localStream, remoteStream, connectionType, hangUp };
}

async function selectedCandidateType(pc: RTCPeerConnection): Promise<ConnectionType> {
  const stats = await pc.getStats();
  let pairId: string | undefined;
  stats.forEach((r) => {
    if (r.type === "transport" && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
  });
  let localCandidateId: string | undefined;
  stats.forEach((r) => {
    // Firefox has no transport stats; fall back to the nominated, succeeded pair.
    if (r.type === "candidate-pair" && (pairId ? r.id === pairId : r.nominated && r.state === "succeeded")) {
      localCandidateId = r.localCandidateId;
    }
  });
  return localCandidateId ? (stats.get(localCandidateId)?.candidateType ?? null) : null;
}
