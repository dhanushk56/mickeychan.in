const RECTS = {
  head: {
    px: [8, 8, 8, 8],
    nx: [24, 8, 8, 8],
    pz: [0, 8, 8, 8],
    nz: [16, 8, 8, 8],
    py: [8, 0, 8, 8],
    ny: [16, 0, 8, 8],
  },
  body: {
    px: [20, 20, 8, 12],
    nx: [32, 20, 8, 12],
    pz: [16, 20, 4, 12],
    nz: [28, 20, 4, 12],
    py: [20, 16, 8, 4],
    ny: [28, 16, 8, 4],
  },
  arm: {
    px: [44, 20, 4, 12],
    nx: [52, 20, 4, 12],
    pz: [40, 20, 4, 12],
    nz: [48, 20, 4, 12],
    py: [44, 16, 4, 4],
    ny: [48, 16, 4, 4],
  },
  leg: {
    px: [4, 20, 4, 12],
    nx: [12, 20, 4, 12],
    pz: [0, 20, 4, 12],
    nz: [8, 20, 4, 12],
    py: [4, 16, 4, 4],
    ny: [8, 16, 4, 4],
  },
};

// Slim-arm skins ("Alex" model) have 3-wide arms: the front/back faces are 3 pixels wide.
const SLIM_ARM = {
  px: [44, 20, 3, 12],
  nx: [51, 20, 3, 12],
  pz: [40, 20, 4, 12],
  nz: [47, 20, 4, 12],
  py: [44, 16, 3, 4],
  ny: [47, 16, 3, 4],
};

// Seen from the side, a head shows its ear-side texture. Many skins put an ornament or
// nothing recognisable there, so show the character's face on both sides instead.
const FACE_ON_SIDE = true;

const CLEAR = {
  head: [36, 23, 55],
  body: [20, 16, 28],
  arm: [20, 16, 28],
  leg: [26, 22, 34],
};

const SIZE = 64;

export function readSkin(image) {
  if (!image || !image.naturalWidth) return null;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, SIZE, SIZE);

  let data;
  try {
    data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  } catch {
    return null;
  }

  // A classic skin has an opaque 4-wide back face on the right arm (x 52-55);
  // a slim skin leaves its 4th column (x 55) transparent.
  let slim = true;
  for (let row = 20; row < 32; row += 1) {
    if (data[(row * SIZE + 55) * 4 + 3] >= 24) slim = false;
  }

  const rects = slim ? { ...RECTS, arm: SLIM_ARM } : RECTS;
  const skin = { slim };

  for (const part of Object.keys(RECTS)) {
    const base = CLEAR[part];
    const faces = {};

    for (const [name, rect] of Object.entries(rects[part])) {
      const [x, y, w, h] = rect;
      const grid = [];

      for (let row = 0; row < h; row += 1) {
        const line = [];
        for (let col = 0; col < w; col += 1) {
          const index = ((y + row) * SIZE + x + col) * 4;
          const alpha = data[index + 3];
          line.push(
            alpha < 24
              ? base
              : [data[index], data[index + 1], data[index + 2]]
          );
        }
        grid.push(line);
      }

      faces[name] = grid;
    }

    if (part === "head" && FACE_ON_SIDE) {
      faces.pz = faces.px;
      faces.nz = faces.px;
    }

    skin[part] = faces;
  }

  return skin;
}
