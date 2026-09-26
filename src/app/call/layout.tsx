import { CurrentUserProvider } from "@/components/shell/CurrentUserProvider";
import { requireOnboardedViewer } from "@/lib/profile";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <CurrentUserProvider viewer={await requireOnboardedViewer()}>{children}</CurrentUserProvider>;
}
