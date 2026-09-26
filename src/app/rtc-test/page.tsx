import { redirect } from "next/navigation";
import { RtcTest } from "@/components/call/rtc-test";
import { getUser } from "@/lib/session";

// WebRTC diagnostics: two devices join the same room and connect through our own
// PeerJS + coturn. Kept after the spike as a network check for demo day.
export default async function RtcTestPage({ searchParams }: PageProps<"/rtc-test">) {
  const { room } = await searchParams;
  if (typeof room !== "string" || !room) {
    // Put a fresh room in the URL so it survives reloads and the address bar is shareable.
    redirect(`/rtc-test?room=${newRoomCode()}`);
  }
  if (!(await getUser())) {
    redirect(`/login?next=${encodeURIComponent(`/rtc-test?room=${room}`)}`);
  }
  return <RtcTest initialRoom={room} />;
}

function newRoomCode() {
  return crypto.randomUUID().slice(0, 5);
}
