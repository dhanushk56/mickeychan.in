const FPS = 30;
const LOOP_FRAMES = 19;
const HALF = LOOP_FRAMES / 2;
const LOOP_SECONDS = LOOP_FRAMES / FPS;

const LEG_KEYS = [
  [0, 18, 28],
  [2, -8, 18],
  [4.5, -45, 15],
  [6.5, -30, 70],
  [8, -5, 98],
  [9.5, 20, 95],
  [12, 45, 88],
  [14, 62, 80],
  [16, 52, 45],
  [17.5, 32, 32],
];

const ARM_KEYS = [
  [0, 25, 65],
  [2, 22, 70],
  [4, 8, 72],
  [6, 0, 60],
  [8, -8, 50],
  [9.5, -20, 40],
  [10.5, -36, 22],
  [12, -34, 18],
  [13, -30, 20],
  [14, -10, 25],
  [15, -4, 28],
  [16, -8, 35],
  [17, 12, 52],
  [18, 24, 62],
];

function makeLoop(keys, channels) {
  const count = keys.length;
  const at = (index) => keys[((index % count) + count) % count];
  const frameAt = (index) => at(index)[0] + Math.floor(index / count) * LOOP_FRAMES;

  return (frame) => {
    const f = ((frame % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
    let i = 0;
    while (i + 1 < count && keys[i + 1][0] <= f) i += 1;

    const x0 = frameAt(i);
    const x1 = frameAt(i + 1);
    const h = x1 - x0;
    const s = (f - x0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const out = [];

    for (let channel = 1; channel <= channels; channel += 1) {
      const y0 = at(i)[channel];
      const y1 = at(i + 1)[channel];
      const m0 = (y1 - at(i - 1)[channel]) / (frameAt(i + 1) - frameAt(i - 1));
      const m1 = (at(i + 2)[channel] - y0) / (frameAt(i + 2) - frameAt(i));

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

const legCurve = makeLoop(LEG_KEYS, 2);
const armCurve = makeLoop(ARM_KEYS, 2);

export function pose(time) {
  const f = (((time * FPS) % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
  const [nearThigh, nearKnee] = legCurve(f);
  const [farThigh, farKnee] = legCurve(f + HALF);
  const [nearShoulder, nearElbow] = armCurve(f);
  const [farShoulder, farElbow] = armCurve(f + HALF);

  const m = f % HALF;
  const lift = Math.pow(Math.sin((Math.PI * m) / HALF), 1.3);

  return {
    frame: f,
    pelvisY: 9 + 2.6 * lift,
    lean: 24 + 3 * Math.cos((2 * Math.PI * (f - 4.5)) / HALF),
    twist: 7 * Math.cos((2 * Math.PI * (f - 3)) / LOOP_FRAMES),
    headPitch: -2,
    nearLeg: { thigh: nearThigh, knee: nearKnee },
    farLeg: { thigh: farThigh, knee: farKnee },
    nearArm: { shoulder: nearShoulder, elbow: nearElbow },
    farArm: { shoulder: farShoulder, elbow: farElbow },
  };
}

export { FPS, LOOP_FRAMES, LOOP_SECONDS };
