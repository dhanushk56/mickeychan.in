const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

const THIGH = 10;
const SHIN = 10;
const ANKLE = 3;

const wrap = (value) => ((value % 1) + 1) % 1;
const mix = (from, to, t) => from + (to - from) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

function swingLeg(phase) {
  const fold = 0.5 - 0.5 * Math.cos(TAU * (phase - 0.25));
  return {
    thigh: 21 * Math.cos(TAU * phase) - 3,
    knee: 6 + 62 * fold * fold,
    foot: -6 * Math.cos(TAU * phase) + 2,
  };
}

function swingArm(phase) {
  return {
    upper: 20 * Math.cos(TAU * phase) + 3,
    elbow: 68 + 18 * Math.cos(TAU * phase),
    wrist: 7 * Math.sin(TAU * phase),
  };
}

export function pose(phase, blend, clock, speed) {
  const p = wrap(phase);
  const t = smooth(clamp(blend, 0, 1));
  const near = swingLeg(p);
  const far = swingLeg(p + 0.5);
  const nearArm = swingArm(p + 0.5);
  const farArm = swingArm(p);
  const breath = Math.sin(clock * 0.0009);

  const thighNear = -mix(3.2, near.thigh, t);
  const kneeNear = mix(5, near.knee, t);
  const thighFar = -mix(-3.2, far.thigh, t);
  const kneeFar = mix(5, far.knee, t);

  const reach = (thigh, knee) =>
    THIGH * Math.cos(thigh * RAD) + SHIN * Math.cos((thigh + knee) * RAD) + ANKLE;
  const span = Math.max(reach(thighNear, kneeNear), reach(thighFar, kneeFar));
  const bob = mix(breath * 0.4, clamp(THIGH + SHIN + ANKLE - span, 0, 3.6), t);

  const lean = mix(0.8 + breath * 0.6, 8 + clamp(speed, 0, 1) * 7, t);
  const twist = 2.6 * Math.cos(TAU * p) * t;

  return {
    bob,
    torso: lean + twist,
    head: -lean * 0.7 - twist * 0.4 + Math.sin(TAU * p) * 1.2 * t,
    thighNear,
    kneeNear,
    footNear: mix(0, near.foot, t),
    thighFar,
    kneeFar,
    footFar: mix(0, far.foot, t),
    armNear: -mix(1.5, nearArm.upper, t),
    elbowNear: -mix(13, nearArm.elbow, t),
    wristNear: -mix(0, nearArm.wrist, t),
    armFar: -mix(-1.5, farArm.upper, t),
    elbowFar: -mix(13, farArm.elbow, t),
    wristFar: -mix(0, farArm.wrist, t),
  };
}
