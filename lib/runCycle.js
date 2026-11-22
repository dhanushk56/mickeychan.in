// Run cycle for the scroll runner, recreated frame-by-frame from the reference clip.
//
//  - The reference loops every 19 frames (30 fps), with a real flight phase:
//    the body rises at the two push-off moments and sinks as the legs pass.
//  - Angles below are in degrees, "forward" positive, and are converted to the
//    rig's CSS convention (negative rotate = forward swing) at the bottom.
//  - Arm angles are measured in world space (relative to the ground), so the
//    torso lean is added back in because the arms are children of the torso.

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

const THIGH = 6;
const SHIN = 6;
const LOOP = 19;          // frames in one full stride pair
const HALF = LOOP / 2;    // the far limb runs half a loop behind the near one

const wrap = (value) => ((value % 1) + 1) % 1;
const mix = (from, to, t) => from + (to - from) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

// Leg keys: [frame, thigh (+ forward), knee (+ shin folds back)]
const LEG_KEYS = [
  [0, 18, 28],      // foot strike, springy crouch
  [2, -8, 18],      // mid stance, pushing off
  [4.5, -45, 15],   // back leg fully extended (flight)
  [6.5, -30, 70],   // heel flicks up
  [8, -5, 98],
  [9.5, 20, 95],    // tucked, passing under the body
  [12, 45, 88],
  [14, 62, 80],     // high knee drive (flight)
  [16, 52, 45],     // leg reaches out to land
  [17.5, 32, 32],
];

// Arm keys: [frame, shoulder (+ forward), elbow (+ forearm forward)]
const ARM_KEYS = [
  [0, 25, 65],
  [2, 22, 70],
  [4, 8, 72],       // forearm horizontal, front peak
  [6, 0, 60],
  [8, -8, 50],
  [9.5, -20, 40],
  [10.5, -36, 22],  // back swing, nearly straight
  [12, -34, 18],
  [13, -30, 20],
  [14, -10, 25],    // arm drops to vertical
  [15, -4, 28],
  [16, -8, 35],
  [17, 12, 52],     // whips forward again
  [18, 24, 62],
];

// How high the lowest foot is off the ground, per frame, in rig units.
// Measured from the clip: planted at the passes, ~4.5 units up in flight.
const FOOT_RISE = [
  0.2, 0.1, 0.4, 3.6, 4.5, 3.9, 2.3, 0.8, 0.2, 0, 0, 0.7, 2.4, 4, 4.3, 3.4, 1.9, 0.8, 0.3,
];

// Periodic cubic Hermite through unevenly spaced keys.
function makeLoop(keys, channels) {
  const n = keys.length;
  const at = (i) => keys[((i % n) + n) % n];
  const xAt = (i) => at(i)[0] + Math.floor(i / n) * LOOP;
  return (frame) => {
    const f = ((frame % LOOP) + LOOP) % LOOP;
    let i = 0;
    while (i + 1 < n && keys[i + 1][0] <= f) i += 1;
    const x0 = xAt(i);
    const x1 = xAt(i + 1);
    const h = x1 - x0;
    const s = (f - x0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const out = [];
    for (let c = 1; c <= channels; c += 1) {
      const y0 = at(i)[c];
      const y1 = at(i + 1)[c];
      const m0 = (y1 - at(i - 1)[c]) / (xAt(i + 1) - xAt(i - 1));
      const m1 = (at(i + 2)[c] - y0) / (xAt(i + 2) - xAt(i));
      out.push(
        (2 * s3 - 3 * s2 + 1) * y0 +
          (s3 - 2 * s2 + s) * h * m0 +
          (-2 * s3 + 3 * s2) * y1 +
          (s3 - s2) * h * m1
      );
    }
    return out;
  };
}

// Periodic Catmull-Rom through evenly spaced samples (one per frame).
function sampleLoop(samples, frame) {
  const n = samples.length;
  const f = ((frame % n) + n) % n;
  const i = Math.floor(f);
  const s = f - i;
  const p0 = samples[(i - 1 + n) % n];
  const p1 = samples[i];
  const p2 = samples[(i + 1) % n];
  const p3 = samples[(i + 2) % n];
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * s +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s +
      (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s)
  );
}

const legCurve = makeLoop(LEG_KEYS, 2);
const armCurve = makeLoop(ARM_KEYS, 2);

export function pose(phase, blend, clock, speed) {
  const f = wrap(phase) * LOOP;
  const t = smooth(clamp(blend, 0, 1));
  const breath = Math.sin(clock * 0.0009);

  const [nearThigh, nearKnee] = legCurve(f);
  const [farThigh, farKnee] = legCurve(f + HALF);
  const [nearShoulder, nearElbow] = armCurve(f);
  const [farShoulder, farElbow] = armCurve(f + HALF);

  // Forward lean, with a small pulse that peaks in the flight phases.
  const runLean = 24 + 3 * Math.cos((TAU * (f - 4.5)) / HALF);
  const lean = mix(1 + breath * 0.5, runLean, t);

  const thighNear = -mix(2.6, nearThigh, t);
  const kneeNear = mix(4, nearKnee, t);
  const thighFar = -mix(-2.6, farThigh, t);
  const kneeFar = mix(4, farKnee, t);

  // Keep the lowest foot where the clip has it: planted at the passes, lifted in flight.
  const reach = (thigh, knee) =>
    THIGH * Math.cos(thigh * RAD) + SHIN * Math.cos((thigh + knee) * RAD);
  const span = Math.max(reach(thighNear, kneeNear), reach(thighFar, kneeFar));
  const rise = sampleLoop(FOOT_RISE, f) * t;
  const bob = mix(breath * 0.22, THIGH + SHIN - span - rise, t);

  return {
    bob,
    torso: lean,
    head: -lean + 3 * t + (1 - t) * lean * 0.34,
    thighNear,
    kneeNear,
    thighFar,
    kneeFar,
    armNear: -mix(1.2, nearShoulder + runLean, t),
    elbowNear: -mix(10, nearElbow, t),
    armFar: -mix(-1.2, farShoulder + runLean, t),
    elbowFar: -mix(10, farElbow, t),
  };
}
