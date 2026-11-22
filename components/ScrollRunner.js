"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pose } from "@/lib/runCycle";

const EDGE = 26;
const STRIDE = 42;
const CADENCE = 4.6;

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
const fixed = (value) => value.toFixed(2);

export default function ScrollRunner() {
  const rootRef = useRef(null);
  const laneRef = useRef(null);
  const fillRef = useRef(null);
  const stageRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = rootRef.current;
    const lane = laneRef.current;
    const fill = fillRef.current;
    const stage = stageRef.current;
    if (!root || !lane || !fill || !stage) return undefined;

    const rig = stage.querySelector(".rig");
    if (!rig) return undefined;

    const nodes = {};
    stage.querySelectorAll("[data-joint]").forEach((node) => {
      nodes[node.dataset.joint] = node;
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let max = 0;
    let unit = 2;
    let progress = 0;
    let target = 0;
    let x = 0;
    let phase = 0;
    let blend = 0;
    let pace = 0;
    let facing = 1;
    let clock = 0;
    let last = 0;
    let frame = 0;
    let ready = false;

    const measure = () => {
      width = window.innerWidth;
      max = document.documentElement.scrollHeight - window.innerHeight;
      unit = parseFloat(getComputedStyle(stage).getPropertyValue("--u")) || 2;
    };

    const paint = () => {
      lane.style.transform = `translate3d(${fixed(x)}px, 0, 0)`;
      const span = Math.max(1, width - EDGE * 2);
      fill.style.transform = `scaleX(${clamp((x - EDGE) / span, 0, 1).toFixed(4)})`;
    };

    const draw = () => {
      const p = pose(phase, blend, clock, blend);
      const lift = p.bob * unit;
      rig.style.transform = `translate3d(0, ${fixed(lift)}px, 0) scaleX(${facing})`;
      nodes.torso.style.transform = `rotate(${fixed(p.torso)}deg)`;
      nodes.head.style.transform = `rotate(${fixed(p.head)}deg)`;
      nodes.legNear.style.transform = `rotate(${fixed(p.thighNear)}deg)`;
      nodes.shinNear.style.transform = `rotate(${fixed(p.kneeNear)}deg)`;
      nodes.legFar.style.transform = `rotate(${fixed(p.thighFar)}deg)`;
      nodes.shinFar.style.transform = `rotate(${fixed(p.kneeFar)}deg)`;
      nodes.armNear.style.transform = `rotate(${fixed(p.armNear)}deg)`;
      nodes.foreNear.style.transform = `rotate(${fixed(p.elbowNear)}deg)`;
      nodes.armFar.style.transform = `rotate(${fixed(p.armFar)}deg)`;
      nodes.foreFar.style.transform = `rotate(${fixed(p.elbowFar)}deg)`;
      nodes.shadow.style.transform = `translateX(-50%) scaleX(${(1 - lift * 0.08).toFixed(3)})`;
      nodes.shadow.style.opacity = (0.32 - lift * 0.06).toFixed(3);
    };

    const place = () => {
      progress = max > 8 ? clamp(window.scrollY / max, 0, 1) : 0;
      target = EDGE + progress * Math.max(0, width - EDGE * 2);
      if (reduced) {
        x = target;
        paint();
        draw();
      }
      if (ready) return;
      x = target;
      ready = true;
      paint();
      root.dataset.ready = "true";
    };

    const tick = (time) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
      last = time;
      clock += dt * 1000;

      const before = x;
      x += (target - x) * (1 - Math.exp(-dt * 12));
      const travel = x - before;

      if (Math.abs(travel) > 0.03) facing = travel < 0 ? -1 : 1;

      phase += Math.min(Math.abs(travel) / STRIDE, CADENCE * dt);

      const speed = dt > 0 ? Math.abs(travel) / dt : 0;
      pace += (speed - pace) * (1 - Math.exp(-dt * 13));
      const want = clamp(pace / 280, 0, 1);
      blend += (want - blend) * (1 - Math.exp(-dt * (want > blend ? 16 : 6)));

      paint();
      draw();
      frame = window.requestAnimationFrame(tick);
    };

    measure();
    place();

    if (reduced) {
      return () => {
        delete root.dataset.ready;
      };
    }

    frame = window.requestAnimationFrame(tick);

    const sync = () => {
      measure();
      place();
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
        <div className="runner-stage" ref={stageRef}>
          <span className="rig-shadow" data-joint="shadow" />
          <div className="rig">
            <div className="rig-leg rig-leg--far" data-joint="legFar">
              <span className="rig-thigh" />
              <span className="rig-shin" data-joint="shinFar" />
            </div>
            <div className="rig-torso" data-joint="torso">
              <span className="rig-head" data-joint="head" />
              <div className="rig-arm rig-arm--far" data-joint="armFar">
                <span className="rig-upper" />
                <span className="rig-fore" data-joint="foreFar" />
              </div>
              <div className="rig-arm rig-arm--near" data-joint="armNear">
                <span className="rig-upper" />
                <span className="rig-fore" data-joint="foreNear" />
              </div>
            </div>
            <div className="rig-leg rig-leg--near" data-joint="legNear">
              <span className="rig-thigh" />
              <span className="rig-shin" data-joint="shinNear" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
