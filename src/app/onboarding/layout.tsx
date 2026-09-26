import { CurrentUserProvider } from "@/components/shell/CurrentUserProvider";
import { requireViewer } from "@/lib/profile";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <CurrentUserProvider viewer={await requireViewer()}>{children}</CurrentUserProvider>;
}
