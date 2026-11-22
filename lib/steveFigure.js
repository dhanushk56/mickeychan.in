const DEG = Math.PI / 180;

const TORSO_H = 9.8;
const ARM_LEN = 11;
const LEG_LEN = 10.2;

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

const translate = (x, y, z) => {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
};

const rotateZ = (degrees) => {
  const c = Math.cos(degrees * DEG);
  const s = Math.sin(degrees * DEG);
  const m = identity();
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
};

const rotateY = (degrees) => {
  const c = Math.cos(degrees * DEG);
  const s = Math.sin(degrees * DEG);
  const m = identity();
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
};

const apply = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

const applyDirection = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
];

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
];

const COLOR = {
  hair: hex("#6e402c"),
  skin: hex("#fbcd94"),
  skinShade: hex("#e6a877"),
  shirt: hex("#3fdcc4"),
  pants: hex("#7b70bd"),
  shoe: hex("#e9e9b8"),
  eyeWhite: hex("#ffffff"),
  eye: hex("#5b4aa8"),
  mouth: hex("#a8683f"),
};

const H = COLOR.hair;
const S = COLOR.skin;
const S2 = COLOR.skinShade;
const E = COLOR.eyeWhite;
const I = COLOR.eye;
const M = COLOR.mouth;

const HEAD_FRONT = [
  [H, H, H, H, H, H, H, H],
  [H, H, H, H, H, H, H, H],
  [H, S, S, H, H, S, S, H],
  [H, S, S, S, S, S, S, H],
  [S, E, I, S, S, I, E, S],
  [S, S, S, S2, S2, S, S, S],
  [S, S, M, M, M, M, S, S],
  [S, S, S, S, S, S, S, S],
];

const HEAD_SIDE = [
  [H, H, H, H, H, H, H, H],
  [H, H, H, H, H, H, H, H],
  [H, H, H, H, H, H, H, H],
  [H, H, H, H, H, H, H, H],
  [H, H, H, H, H, H, S, S],
  [H, H, H, H, H, S, S, S],
  [H, H, H, H, S, S, S, S],
  [H, H, H, S, S, S, S, S],
];

const HEAD_BACK = Array.from({ length: 8 }, (_, row) => Array(8).fill(row < 7 ? H : S));
const HEAD_TOP = Array.from({ length: 8 }, () => Array(8).fill(H));
const HEAD_SIDE_R = HEAD_SIDE.map((row) => row.slice().reverse());

const stack = (color, rows) => Array.from({ length: rows }, () => [color]);
const flat = (color) => [[color]];

const FACES = {
  pz: { normal: [0, 0, 1], corners: [[-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, 1]] },
  nz: { normal: [0, 0, -1], corners: [[1, 1, -1], [-1, 1, -1], [-1, -1, -1], [1, -1, -1]] },
  px: { normal: [1, 0, 0], corners: [[1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1]] },
  nx: { normal: [-1, 0, 0], corners: [[-1, 1, -1], [-1, 1, 1], [-1, -1, 1], [-1, -1, -1]] },
  py: { normal: [0, 1, 0], corners: [[1, 1, -1], [1, 1, 1], [-1, 1, 1], [-1, 1, -1]] },
  ny: { normal: [0, -1, 0], corners: [[1, -1, 1], [1, -1, -1], [-1, -1, -1], [-1, -1, 1]] },
};

const LIGHT = (() => {
  const vector = [-0.2, 0.5, 0.85];
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return vector.map((value) => value / length);
})();

function buildModel(p, yaw) {
  const boxes = [];

  const add = (matrix, center, half, textures, sides, dim) => {
    boxes.push({ matrix, center, half, textures, sides, dim: dim ?? 1 });
  };

  const pelvis = multiply(translate(0, p.pelvisY, 0), rotateY(yaw));
  const torso = multiply(multiply(pelvis, rotateZ(-p.lean)), rotateY(p.twist));

  add(
    torso,
    [0, TORSO_H / 2, 0],
    [2, TORSO_H / 2, 4],
    { all: stack(COLOR.shirt, 12), top: flat(COLOR.shirt), ny: flat(COLOR.pants) }
  );

  const head = multiply(
    multiply(multiply(torso, translate(0, TORSO_H, 0)), rotateZ(p.lean + p.headPitch)),
    rotateY(-p.twist * 0.9 + 2)
  );

  add(head, [0, 4, 0], [4, 4, 4], {
    px: HEAD_FRONT,
    pz: HEAD_SIDE,
    nz: HEAD_SIDE_R,
    nx: HEAD_BACK,
    py: HEAD_TOP,
    ny: flat(COLOR.skinShade),
  });

  const armTexture = [
    stack(COLOR.shirt, 1),
    stack(COLOR.shirt, 1),
    stack(COLOR.skin, 1),
    stack(COLOR.skin, 1),
    stack(COLOR.skin, 1),
    stack(COLOR.skin, 1),
  ];

  const legTexture = [
    stack(COLOR.pants, 1),
    stack(COLOR.pants, 1),
    stack(COLOR.pants, 1),
    stack(COLOR.pants, 1),
    stack(COLOR.shoe, 1),
    stack(COLOR.shoe, 1),
  ];

  const limb = (parent, x, y, z, base, bend, textures, length) => {
    const slice = length / 6;
    let matrix = multiply(parent, multiply(translate(x, y, z), rotateZ(base)));

    for (let index = 0; index < 6; index += 1) {
      const extra = index >= 2 && index <= 4 ? bend / 3 : 0;

      if (index > 0) matrix = multiply(multiply(matrix, translate(0, -slice, 0)), rotateZ(extra));
      else if (extra) matrix = multiply(matrix, rotateZ(extra));

      add(
        matrix,
        [0, -slice / 2, 0],
        [2, slice / 2 + 0.35, 2],
        { all: textures[index], top: textures[index], ny: textures[index] },
        true,
        z < 0 ? 0.84 : 1
      );
    }
  };

  limb(torso, 0, TORSO_H - 1.2, 6, p.nearArm.shoulder + p.lean, p.nearArm.elbow, armTexture, ARM_LEN);
  limb(torso, 0, TORSO_H - 1.2, -6, p.farArm.shoulder + p.lean, p.farArm.elbow, armTexture, ARM_LEN);
  limb(pelvis, 0, 0, 2, p.nearLeg.thigh, -p.nearLeg.knee, legTexture, LEG_LEN);
  limb(pelvis, 0, 0, -2, p.farLeg.thigh, -p.farLeg.knee, legTexture, LEG_LEN);

  return boxes;
}

export function faces(p, yaw) {
  const out = [];

  for (const box of buildModel(p, yaw ?? 0)) {
    for (const name of Object.keys(FACES)) {
      const face = FACES[name];
      const normal = applyDirection(box.matrix, face.normal);

      if (normal[2] <= 0.001) continue;
      if (box.sides && (name === "py" || name === "ny" || name === "nx")) continue;

      const points = face.corners.map((corner) =>
        apply(box.matrix, [
          box.center[0] + corner[0] * box.half[0],
          box.center[1] + corner[1] * box.half[1],
          box.center[2] + corner[2] * box.half[2],
        ])
      );

      const shade =
        (0.72 + 0.34 * Math.max(0, normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2])) *
        box.dim;

      out.push({
        points,
        grid: box.textures[name] || box.textures.all || flat(COLOR.skin),
        shade,
        z: (points[0][2] + points[1][2] + points[2][2] + points[3][2]) / 4,
      });
    }
  }

  return out;
}
