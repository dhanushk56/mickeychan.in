"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LOOP_SECONDS, pose } from "@/lib/runCycle";
import { faces } from "@/lib/steveFigure";

const EDGE = 26;
const STRIDE = 66;
const IDLE = 0.32;
const NOMINAL = 34;
const YAW_RIGHT = -3;
const YAW_LEFT = 183;

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
const fixed = (value) => value.toFixed(2);
const mixPoint = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export default function ScrollRunner() {
  const rootRef = useRef(null);
  const laneRef = useRef(null);
  const fillRef = useRef(null);
  const canvasRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = rootRef.current;
    const lane = laneRef.current;
    const fill = fillRef.current;
    const canvas = canvasRef.current;
    if (!root || !lane || !fill || !canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let max = 0;
    let target = 0;
    let x = 0;
    let clock = 0;
    let facing = 1;
    let frame = 0;
    let last = 0;
    let ready = false;
    let dpr = 1;
    let viewWidth = 0;
    let viewHeight = 0;

    const fit = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      if (w === viewWidth && h === viewHeight) return;
      viewWidth = w;
      viewHeight = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = () => {
      fit();

      const w = viewWidth;
      const h = viewHeight;
      const scale = (h - 6) / NOMINAL;
      const centerX = w / 2;
      const ground = h - 4;
      const list = faces(pose(clock), facing > 0 ? YAW_RIGHT : YAW_LEFT);

      list.sort((a, b) => a.z - b.z);

      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(0.5, scale * 0.28);

      for (let index = 0; index < list.length; index += 1) {
        const face = list[index];
        const corners = face.points.map((point) => [
          centerX + point[0] * scale,
          ground - point[1] * scale,
        ]);
        const rows = face.grid.length;
        const cols = face.grid[0].length;
        const [tl, tr, br, bl] = corners;

        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const color = face.grid[row][col];
            const tone = `rgb(${(color[0] * face.shade) | 0},${(color[1] * face.shade) | 0},${(color[2] * face.shade * 1.02) | 0})`;
            const u0 = col / cols;
            const u1 = (col + 1) / cols;
            const v0 = row / rows;
            const v1 = (row + 1) / rows;
            const p0 = mixPoint(mixPoint(tl, tr, u0), mixPoint(bl, br, u0), v0);
            const p1 = mixPoint(mixPoint(tl, tr, u1), mixPoint(bl, br, u1), v0);
            const p2 = mixPoint(mixPoint(tl, tr, u1), mixPoint(bl, br, u1), v1);
            const p3 = mixPoint(mixPoint(tl, tr, u0), mixPoint(bl, br, u0), v1);

            ctx.fillStyle = tone;
            ctx.strokeStyle = tone;
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.lineTo(p3[0], p3[1]);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    };

    const slide = () => {
      lane.style.transform = `translate3d(${fixed(x)}px, 0, 0)`;
      const span = Math.max(1, width - EDGE * 2);
      fill.style.transform = `scaleX(${clamp((x - EDGE) / span, 0, 1).toFixed(4)})`;
    };

    const place = () => {
      width = window.innerWidth;
      max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 8 ? clamp(window.scrollY / max, 0, 1) : 0;
      target = EDGE + progress * Math.max(0, width - EDGE * 2);

      if (!ready || reduced) {
        x = target;
        slide();
      }

      if (!ready) {
        ready = true;
        root.dataset.ready = "true";
      }

      if (reduced) paint();
    };

    const tick = (time) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
      last = time;

      const before = x;
      x += (target - x) * (1 - Math.exp(-dt * 12));
      const step = x - before;
      if (Math.abs(step) > 0.02) facing = step < 0 ? -1 : 1;

      clock += (Math.abs(step) / STRIDE + IDLE * dt) * LOOP_SECONDS;

      slide();
      paint();
      frame = window.requestAnimationFrame(tick);
    };

    place();

    if (reduced) {
      return () => {
        delete root.dataset.ready;
      };
    }

    frame = window.requestAnimationFrame(tick);

    const sync = () => {
      place();
      paint();
    };

    const settle = window.setTimeout(sync, 300);
    const observer = new ResizeObserver(sync);
    observer.observe(document.body);

    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", sync);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      delete root.dataset.ready;
    };
  }, [pathname]);

  return (
    <div className="scroll-runner" ref={rootRef} aria-hidden="true">
      <span className="scroll-runner-rail" />
      <span className="scroll-runner-fill" ref={fillRef} />
      <div className="runner-lane" ref={laneRef}>
        <span className="runner-shadow" />
        <canvas className="runner-canvas" ref={canvasRef} />
      </div>
    </div>
  );
}
