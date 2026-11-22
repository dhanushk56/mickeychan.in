const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

const THIGH = 6;
const SHIN = 6;

const wrap = (value) => ((value % 1) + 1) % 1;
const mix = (from, to, t) => from + (to - from) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

function swingLeg(phase) {
  const fold = 0.5 - 0.5 * Math.cos(TAU * (phase - 0.28));
  return {
    thigh: 27 * Math.cos(TAU * phase) - 4,
    knee: 5 + 58 * fold * fold,
  };
}

function swingArm(phase) {
  return {
    upper: 24 * Math.cos(TAU * phase) + 2,
    elbow: 17 + 13 * Math.cos(TAU * (phase + 0.12)),
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

  const thighNear = -mix(2.6, near.thigh, t);
  const kneeNear = mix(4, near.knee, t);
  const thighFar = -mix(-2.6, far.thigh, t);
  const kneeFar = mix(4, far.knee, t);

  const reach = (thigh, knee) =>
    THIGH * Math.cos(thigh * RAD) + SHIN * Math.cos((thigh + knee) * RAD);
  const span = Math.max(reach(thighNear, kneeNear), reach(thighFar, kneeFar));
  const bob = mix(breath * 0.22, clamp(THIGH + SHIN - span, 0, 2.6), t);

  const lean = mix(1 + breath * 0.5, 7 + clamp(speed, 0, 1) * 6, t);
  const twist = 2.2 * Math.cos(TAU * p) * t;

  return {
    bob,
    torso: lean + twist,
    head: -lean * 0.66 - twist * 0.4 + Math.sin(TAU * p) * 1.4 * t,
    thighNear,
    kneeNear,
    thighFar,
    kneeFar,
    armNear: -mix(1.2, nearArm.upper, t),
    elbowNear: -mix(10, nearArm.elbow, t),
    armFar: -mix(-1.2, farArm.upper, t),
    elbowFar: -mix(10, farArm.elbow, t),
  };
}
