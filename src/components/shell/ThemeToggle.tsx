"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/prefs";

const darkQuery = "(prefers-color-scheme: dark)";

function subscribeToSystem(listener: () => void) {
  const mq = window.matchMedia(darkQuery);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

/** Flips between light and dark. On "system" it starts from whatever the OS is showing. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const systemDark = useSyncExternalStore(
    subscribeToSystem,
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
