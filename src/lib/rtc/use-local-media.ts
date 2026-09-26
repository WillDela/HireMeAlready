"use client";

import { useCallback, useEffect, useState } from "react";
import { openPreferredMedia, readDevicePrefs, useDevicePrefs, writeDevicePrefs } from "@/lib/rtc/device-prefs";

/**
 * - `none`: no camera or mic plugged in
 * - `busy`: another app holds the device
 * - `unsupported`: no media API, e.g. the site was opened over plain http
 */
export type Permission = "checking" | "granted" | "denied" | "none" | "busy" | "unsupported";
export type DeviceStatus = "checking" | "ok" | "found" | "blocked" | "missing" | "busy";
export type DeviceOption = { value: string; label: string };
export type DeviceLists = { cameras: DeviceOption[]; microphones: DeviceOption[]; speakers: DeviceOption[] };

type Check = { permission: Permission; camera: DeviceStatus; mic: DeviceStatus };

const CHECKING: Check = { permission: "checking", camera: "checking", mic: "checking" };
const NO_DEVICES: DeviceLists = { cameras: [], microphones: [], speakers: [] };

const stopAll = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

async function listDevices(): Promise<DeviceLists> {
  const all = await navigator.mediaDevices.enumerateDevices();
  // Before permission is granted, browsers hide device ids and labels.
  const of = (kind: MediaDeviceKind, fallback: string) =>
    all
      .filter((d) => d.kind === kind && d.deviceId)
      .map((d, i) => ({ value: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
  return {
    cameras: of("videoinput", "Camera"),
    microphones: of("audioinput", "Microphone"),
    speakers: of("audiooutput", "Speakers"),
  };
}

/** Turns a getUserMedia failure into what the lobby shows for each device. */
async function explainFailure(err: unknown): Promise<Check> {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return { permission: "denied", camera: "blocked", mic: "blocked" };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return { permission: "busy", camera: "busy", mic: "busy" };
  }
  // NotFoundError / OverconstrainedError: work out which one is missing.
  const kinds = await navigator.mediaDevices
    .enumerateDevices()
    .then((all) => new Set(all.map((d) => d.kind)))
    .catch(() => new Set<MediaDeviceKind>());
  return {
    permission: "none",
    camera: kinds.has("videoinput") ? "found" : "missing",
    mic: kinds.has("audioinput") ? "found" : "missing",
  };
}

/**
 * The lobby's real camera + mic: asks for permission, previews the saved devices,
 * lists what's plugged in, and follows device switches and unplugs. Choices are saved
 * (see device-prefs) so the call starts on the same devices. Stops the tracks on unmount.
 */
export function useLocalMedia() {
  const prefs = useDevicePrefs();
  const [check, setCheck] = useState<Check>(CHECKING);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<DeviceLists>(NO_DEVICES);
  // Bumped to (re)acquire media: on retry, on a device switch, or when a device is unplugged.
  const [request, setRequest] = useState(0);
  const reacquire = useCallback(() => setRequest((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCheck({ permission: "unsupported", camera: "blocked", mic: "blocked" });
        return;
      }
      try {
        acquired = await openPreferredMedia();
      } catch (err) {
        const failed = await explainFailure(err);
        if (cancelled) return;
        setStream(null);
        setCheck(failed);
        return;
      }
      if (cancelled) {
        stopAll(acquired);
        return;
      }
      const [video] = acquired.getVideoTracks();
      const [audio] = acquired.getAudioTracks();
      const { cameraOn, micOn } = readDevicePrefs();
      if (video) video.enabled = cameraOn;
      if (audio) audio.enabled = micOn;
      // A track ends on its own (not via stop()) when its device is unplugged.
      acquired.getTracks().forEach((t) => t.addEventListener("ended", reacquire));
      // Save what the browser actually picked, so the pickers show it.
      writeDevicePrefs({ cameraId: video?.getSettings().deviceId ?? "", micId: audio?.getSettings().deviceId ?? "" });
      setStream(acquired);
      setCheck({ permission: "granted", camera: "ok", mic: "ok" });
      const lists = await listDevices().catch(() => NO_DEVICES);
      if (!cancelled) setDevices(lists);
    })();

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.removeEventListener("ended", reacquire));
      stopAll(acquired);
    };
  }, [request, reacquire]);

  // Keep the pickers current as devices are plugged in or removed.
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md || check.permission !== "granted") return;
    const refresh = () => listDevices().then(setDevices, () => undefined);
    md.addEventListener("devicechange", refresh);
    return () => md.removeEventListener("devicechange", refresh);
  }, [check.permission]);

  // Mute/unmute and camera on/off without restarting the devices.
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = prefs.cameraOn));
    stream?.getAudioTracks().forEach((t) => (t.enabled = prefs.micOn));
  }, [stream, prefs.cameraOn, prefs.micOn]);

  return {
    ...check,
    stream,
    devices,
    prefs,
    retry: useCallback(() => {
      setCheck(CHECKING);
      reacquire();
    }, [reacquire]),
    selectCamera: useCallback(
      (cameraId: string) => {
        writeDevicePrefs({ cameraId });
        reacquire();
      },
      [reacquire],
    ),
    selectMic: useCallback(
      (micId: string) => {
        writeDevicePrefs({ micId });
        reacquire();
      },
      [reacquire],
    ),
    selectSpeaker: useCallback((speakerId: string) => writeDevicePrefs({ speakerId }), []),
    setCameraOn: useCallback((cameraOn: boolean) => writeDevicePrefs({ cameraOn }), []),
    setMicOn: useCallback((micOn: boolean) => writeDevicePrefs({ micOn }), []),
  };
}

/** Live input level of the stream's mic, 0-100, from an analyser on the audio track. */
export function useMicLevel(stream: MediaStream | null, active: boolean) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!active || !track || track.readyState === "ended") return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    let shown = 0;

    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += s * s;
      const db = 20 * Math.log10(Math.sqrt(sum / samples.length) || 1e-8);
      // -60 dB (a quiet room) reads 0, -10 dB (speaking close up) reads 100.
      const raw = Math.min(100, Math.max(0, (db + 60) * 2));
      // Jump up at once, fall back gently, so the meter doesn't flicker.
      const next = Math.round(Math.max(raw, shown - 3));
      if (next !== shown) setLevel((shown = next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Autoplay rules can start the context suspended until the page is interacted with.
    const resume = () => void ctx.resume();
    if (ctx.state === "suspended") {
      resume();
      window.addEventListener("pointerdown", resume, { once: true });
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", resume);
      source.disconnect();
      void ctx.close();
      setLevel(0);
    };
  }, [stream, active]);

  return active ? level : 0;
}

const TEST_SOUND = "/sounds/speaker-test.wav";

/** Whether this browser can send audio to a chosen output (Firefox and Safari mostly can't). */
export const canPickSpeaker = () => typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

/**
 * Plays the test sound on the given speaker (or the system default) and resolves when it
 * ends. Rejects if it can't be played, so the lobby can say so.
 */
export async function playTestSound(speakerId: string) {
  const audio = new Audio(TEST_SOUND);
  if (speakerId && canPickSpeaker()) {
    // If that speaker can't be used any more, play on the default rather than not at all.
    await audio.setSinkId(speakerId).catch(() => undefined);
  }
  const ended = new Promise<void>((resolve, reject) => {
    audio.addEventListener("ended", () => resolve(), { once: true });
    audio.addEventListener("error", () => reject(audio.error), { once: true });
  });
  await Promise.all([audio.play(), ended]);
}
