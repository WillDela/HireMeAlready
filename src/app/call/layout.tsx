import { CurrentUserProvider } from "@/components/shell/CurrentUserProvider";
import { requirePageUser } from "@/lib/session";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <CurrentUserProvider user={{ id: user.id, name: user.name, email: user.email }}>{children}</CurrentUserProvider>;
}
