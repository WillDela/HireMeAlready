import type { ReactNode } from "react";
import { StatePreview } from "@/components/ui/StatePreview";
import { MobileTabBar, Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Fixed regions: drawer (desktop) or tab bar (mobile), top bar, and the
 * manila working ground. Navigation swaps what's in the folder, never the frame.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div className="desk flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[76rem] flex-1 px-4 pt-8 pb-32 outline-none sm:px-6 md:pb-20 lg:px-10 lg:pt-12">
          {children}
        </main>
      </div>
      <MobileTabBar />
      <StatePreview className="fixed right-3 bottom-[5.25rem] z-40 md:right-6 md:bottom-6" />
    </div>
  );
}
