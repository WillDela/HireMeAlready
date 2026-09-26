import { AppShell } from "@/components/shell/AppShell";
import { CurrentUserProvider } from "@/components/shell/CurrentUserProvider";
import { requireOnboardedViewer } from "@/lib/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider viewer={await requireOnboardedViewer()}>
      <AppShell>{children}</AppShell>
    </CurrentUserProvider>
  );
}
