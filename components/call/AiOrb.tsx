"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type AiState = "speaking" | "listening" | "thinking";

const stateLabel: Record<AiState, string> = {
  speaking: "Speaking",
  listening: "Listening to you",
  thinking: "Thinking",
};

/**
 * The AI interviewer's presence: a round rubber-stamp ring whose inner rules
 * ripple with its voice. Canvas-drawn; static when motion is reduced.
 */
export function AiOrb({ state, className }: { state: AiState; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(0);
    });
    ro.observe(canvas);

    function draw(t: number) {
      if (!ctx) return;
      const s = stateRef.current;
      // Target loudness: syllable-like envelope while speaking, a slow breath otherwise.
      const target =
        s === "speaking"
          ? 0.35 + 0.65 * Math.abs(Math.sin(t * 6.3) * Math.sin(t * 2.1 + 0.6))
          : s === "listening"
            ? 0.14 + 0.06 * Math.sin(t * 1.6)
            : 0.08;
      levelRef.current += (target - levelRef.current) * 0.12;
      const level = reduce ? (s === "speaking" ? 0.5 : 0.15) : levelRef.current;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.36;

      // Outer double rule: the stamp's frame, steady.
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(244, 242, 234, 0.92)";
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
      ctx.stroke();

      // Inner voice rules.
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const base = R * (0.86 - i * 0.14);
        const amp = R * 0.07 * level * (1 - i * 0.12);
        const k = 5 + i * 2;
        const phase = t * (s === "thinking" ? 0.7 : 2.2) + i * 1.3;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 90) {
          const r =
            base +
            amp * Math.sin(k * a + phase) +
            amp * 0.45 * Math.sin((k - 3) * a - phase * 1.4) +
            (s === "thinking" ? R * 0.015 * Math.sin(3 * a + t * 2) : 0);
          const x = cx + r * Math.cos(a);
          const y = cy + r * Math.sin(a);
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const lead = i === 1 && s === "speaking";
        ctx.lineWidth = lead ? 2.5 : 1.5;
        ctx.strokeStyle = lead ? "rgba(222, 240, 90, 0.95)" : `rgba(244, 242, 234, ${0.7 - i * 0.11})`;
        ctx.stroke();
      }
    }

    if (reduce) {
      draw(0);
    } else {
      const loop = (ms: number) => {
        draw(ms / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <canvas ref={canvasRef} className="aspect-square w-full max-w-[26rem]" aria-hidden="true" />
      <p className="cond -mt-2 text-[0.8125rem] font-bold tracking-[0.12em] text-ink-2 uppercase" aria-live="polite">
        <span className="visually-hidden">AI interviewer: </span>
        {stateLabel[state]}
      </p>
    </div>
  );
}
