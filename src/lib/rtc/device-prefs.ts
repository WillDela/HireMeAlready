"use client";

import { useSyncExternalStore } from "react";

/** The camera, mic and speaker picked in the lobby, and whether the camera/mic start on. */
export type DevicePrefs = {
  cameraId: string;
  micId: string;
  speakerId: string;
  cameraOn: boolean;
  micOn: boolean;
};

const KEY = "hma-devices";
const DEFAULTS: DevicePrefs = { cameraId: "", micId: "", speakerId: "", cameraOn: true, micOn: true };
const listeners = new Set<() => void>();
let current: DevicePrefs | null = null;

export function readDevicePrefs(): DevicePrefs {
  if (!current) {
    try {
      const raw = window.localStorage.getItem(KEY);
      current = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      current = DEFAULTS;
    }
  }
  return current!;
}

export function writeDevicePrefs(patch: Partial<DevicePrefs>) {
  const prev = readDevicePrefs();
  if (Object.entries(patch).every(([k, v]) => prev[k as keyof DevicePrefs] === v)) return;
  current = { ...prev, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep the in-memory change */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDevicePrefs(): DevicePrefs {
  return useSyncExternalStore(subscribe, readDevicePrefs, () => DEFAULTS);
}

/**
 * Opens the saved camera + mic. They're asked for `exact`ly (Chrome ignores an `ideal`
 * mic and takes the default), so if one has been unplugged, fall back to any device.
 */
export async function openPreferredMedia(prefs: DevicePrefs = readDevicePrefs()): Promise<MediaStream> {
  const want = (id: string) => (id ? { deviceId: { exact: id } } : true);
  try {
    return await navigator.mediaDevices.getUserMedia({ video: want(prefs.cameraId), audio: want(prefs.micId) });
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    const gone = name === "OverconstrainedError" || name === "NotFoundError";
    if (!gone || (!prefs.cameraId && !prefs.micId)) throw err;
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  }
}
