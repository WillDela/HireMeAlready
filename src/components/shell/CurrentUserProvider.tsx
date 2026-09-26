"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Viewer } from "@/lib/views";

const CurrentUserContext = createContext<Viewer | null>(null);

/** The signed-in user and their profile, loaded by the layout (requireViewer in src/lib/profile.ts). */
export function CurrentUserProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <CurrentUserContext.Provider value={viewer}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): Viewer {
  const viewer = useContext(CurrentUserContext);
  if (!viewer) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return viewer;
}
