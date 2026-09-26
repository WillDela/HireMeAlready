"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { callSessions } from "@/lib/mock";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { DeviceCheck, type Permission } from "@/components/call/DeviceCheck";
import { TypeTag } from "@/components/InterviewTable";
import { StatePreview } from "@/components/ui/StatePreview";

export default function LobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = callSessions[id];
  const router = useRouter();
  const forced = useForcedState();
  const [joining, setJoining] = useState(false);

  if (!session) notFound();

  const forcedPermission: Permission | null =
    forced === "loading" ? "checking" : forced === "error" ? "denied" : forced === "empty" ? "none" : null;

  const back = session.type === "ai" ? "/practice/ai" : "/practice/live";

  return (
    <div className="desk min-h-dvh">
      <main id="main" className="mx-auto max-w-[72rem] px-4 pt-6 pb-16 sm:px-6 lg:px-10">
        <Link href={back} className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-manila-ink hover:text-ink">
          <ArrowLeft size={17} aria-hidden="true" /> Back to setup
        </Link>
        <header className="mt-4 mb-8">
          <p className="flex items-center gap-2 text-[0.875rem] text-manila-ink">
            <TypeTag type={session.type} /> {session.jobTitle} · {session.company}
          </p>
          <h1 className="wide mt-3 text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em] md:text-[2.625rem]">
            Check your camera and mic
          </h1>
          <p className="mt-2.5 max-w-[60ch] text-manila-ink">
            {session.type === "ai"
              ? "The AI interviewer starts as soon as you join. Take a breath first; there's no clock until then."
              : `${session.partner.name} will see you as soon as you join.`}
          </p>
        </header>
        <DeviceCheck
          forcedPermission={forcedPermission}
          joining={joining}
          onRetry={() => setForcedState(null)}
          onJoin={() => {
            setJoining(true);
            router.push(`/call/${id}`);
          }}
          joinLabel={session.type === "ai" ? "Join and start the interview" : "Join call"}
        />
      </main>
      <StatePreview className="fixed right-3 bottom-3 z-40" />
    </div>
  );
}
