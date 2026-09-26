"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { currentUser as mockUser } from "@/lib/mock";

export type Viewer = typeof mockUser;

const CurrentUserContext = createContext<Viewer | null>(null);

/**
 * The signed-in user for client components. Identity comes from the Better Auth
 * session; profile fields without a backend yet (headline, isAdmin, consent flags)
 * keep the mock defaults until the profile API lands.
 */
export function CurrentUserProvider({
  user,
  children,
}: {
  user: { id: string; name: string; email: string };
  children: ReactNode;
}) {
  const viewer = useMemo<Viewer>(() => {
    const words = user.name.trim().split(/\s+/).filter(Boolean);
    const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? user.email).slice(0, 2))
      .toUpperCase();
    return { ...mockUser, id: user.id, name: user.name, firstName: words[0] ?? user.name, initials, email: user.email };
  }, [user.id, user.name, user.email]);

  return <CurrentUserContext.Provider value={viewer}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): Viewer {
  const viewer = useContext(CurrentUserContext);
  if (!viewer) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return viewer;
}
