import { redirect } from "next/navigation";
import { CurrentUserProvider } from "@/components/shell/CurrentUserProvider";
import { requireViewer } from "@/lib/profile";

// Onboarding is mandatory (see requireOnboardedViewer) and happens once.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  if (viewer.onboarded) redirect("/practice");
  return <CurrentUserProvider viewer={viewer}>{children}</CurrentUserProvider>;
}
