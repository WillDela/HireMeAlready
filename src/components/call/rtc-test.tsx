"use client";

import { useState, useSyncExternalStore } from "react";
import { VideoTile } from "@/components/call/video-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IceServersResponse } from "@/lib/contracts";
import { usePeerCall } from "@/lib/rtc/use-peer-call";

type Side = "a" | "b";

const cleanRoom = (room: string) => room.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);

const CONNECTION_LABELS: Record<string, string> = {
  relay: "TURN relay (through our droplet)",
  srflx: "Direct (through NAT, found via STUN)",
  prflx: "Direct (peer-reflexive)",
  host: "Direct (same network)",
};

const noSubscribe = () => () => {};

export function RtcTest({ initialRoom }: { initialRoom: string }) {
  const [room, setRoom] = useState(() => cleanRoom(initialRoom));
  const [side, setSide] = useState<Side | null>(null);
  const [forceRelay, setForceRelay] = useState(true);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const call = usePeerCall({
    selfPeerId: `rtctest-${room}-${side ?? "a"}`,
    remotePeerId: `rtctest-${room}-${side === "a" ? "b" : "a"}`,
    isCaller: side === "a",
    iceServers: side ? iceServers : null,
    forceRelay,
  });

  async function join(as: Side) {
    setJoinError(null);
    const res = await fetch("/api/turn-credentials");
    if (!res.ok) {
      setJoinError(`Couldn't get TURN credentials (${res.status})`);
      return;
    }
    const body: IceServersResponse = await res.json();
    setIceServers(body.iceServers);
    setSide(as);
  }

  function leave() {
    call.hangUp();
    setSide(null);
    setIceServers(null);
  }

  // Empty during server render and hydration, then the real origin (no hydration mismatch).
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const shareUrl = `${origin}/rtc-test?room=${room}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">WebRTC test</h1>
        <p className="text-sm text-muted-foreground">
          Open this page on two devices on different networks (e.g. laptop on Wi-Fi, phone on cellular), join
          the same room, and pick opposite sides.
        </p>
      </div>

      {!side ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="room">Room</Label>
            <Input id="room" value={room} onChange={(e) => setRoom(cleanRoom(e.target.value))} />
            <p className="break-all text-xs text-muted-foreground">Other device: {shareUrl}</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forceRelay} onChange={(e) => setForceRelay(e.target.checked)} />
            Force TURN relay (proves our TURN server works)
          </label>
          <div className="flex gap-2">
            <Button onClick={() => join("a")}>Join as A (calls)</Button>
            <Button variant="outline" onClick={() => join("b")}>
              Join as B (answers)
            </Button>
          </div>
          {joinError && <p className="text-sm text-destructive">{joinError}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Room</dt>
            <dd>
              {room} (you are {side.toUpperCase()}
              {forceRelay ? ", relay only" : ""})
            </dd>
            <dt className="text-muted-foreground">State</dt>
            <dd className="font-medium">{call.state}</dd>
            <dt className="text-muted-foreground">Path</dt>
            <dd>{call.connectionType ? (CONNECTION_LABELS[call.connectionType] ?? call.connectionType) : "—"}</dd>
          </dl>
          {call.state === "waiting" && (
            <p className="text-sm text-muted-foreground">
              Waiting for side {side === "a" ? "B" : "A"} to join room {room}...
            </p>
          )}
          {call.error && <p className="text-sm text-destructive">{call.error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <VideoTile stream={call.localStream} label="You" muted mirrored />
            <VideoTile stream={call.remoteStream} label="Them" />
          </div>
          <Button variant="destructive" onClick={leave} className="self-start">
            Leave
          </Button>
        </div>
      )}
    </main>
  );
}
