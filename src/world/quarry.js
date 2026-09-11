// Greyhollow Quarry — the renewable ironstone site east of the bridge.
// Geometry lives here so terrain painting, tree exclusion, vein placement and
// enemy spawns all agree on where the pit is.
export const QUARRY = { cx: 1300, cy: 600, rx: 140, ry: 155 };

export const VEIN_SPOTS = [
  { x: 1236, y: 520 },
  { x: 1300, y: 478 },
  { x: 1372, y: 524 },
  { x: 1392, y: 614 },
  { x: 1338, y: 700 },
  { x: 1252, y: 672 },
];

/** True for points inside the cut pit (used to keep trees out of the workings). */
export function inQuarry(x, y, pad = 34) {
  const { cx, cy, rx, ry } = QUARRY;
  return ((x - cx) / (rx + pad)) ** 2 + ((y - cy) / (ry + pad)) ** 2 <= 1;
}
