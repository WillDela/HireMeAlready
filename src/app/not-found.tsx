import { ButtonLink } from "@/components/ui/Button";
import { EmptyFolder } from "@/components/ui/States";

export default function NotFound() {
  return (
    <main className="desk grid min-h-dvh place-items-center px-4">
      <div className="sheet w-full max-w-lg">
        <EmptyFolder
          title="There's no file with that name"
          action={<ButtonLink href="/dashboard">Back to Home</ButtonLink>}
        >
          The link may be old, or the interview was deleted along with its recording.
        </EmptyFolder>
      </div>
    </main>
  );
}
