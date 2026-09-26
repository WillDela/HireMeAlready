"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "./mock";

/** Tiny localStorage-backed stores for the role toggle and theme. */
function createStore<T extends string>(key: string, fallback: T, valid: readonly T[]) {
  const listeners = new Set<() => void>();

  function read(): T {
    try {
      const value = window.localStorage.getItem(key) as T | null;
      return value && valid.includes(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function write(value: T) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: keep the in-memory change */
    }
    memory = value;
    listeners.forEach((l) => l());
  }

  let memory: T | null = null;

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): [T, (value: T) => void] {
    const value = useSyncExternalStore(
      subscribe,
      () => memory ?? read(),
      () => fallback,
    );
    return [value, write];
  }

  return { useValue, write };
}

const roleStore = createStore<Role>("hma-role", "interviewee", ["interviewee", "interviewer"]);
export const useRole = roleStore.useValue;

export type ThemeChoice = "system" | "light" | "dark";
const themeStore = createStore<ThemeChoice>("hma-theme", "system", ["system", "light", "dark"]);

export function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [theme, setTheme] = themeStore.useValue();
  return [
    theme,
    (next) => {
      setTheme(next);
      const root = document.documentElement;
      if (next === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", next);
    },
  ];
}
