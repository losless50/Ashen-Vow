import { roundedTrail } from './paths.js';

/** Shared by the river painter and its moving surface details. */
export const HEARTHWOOD_RIVER = roundedTrail([[1110, -80], [1083, 160], [1143, 330], [1093, 570], [1113, 800], [1160, 1150]]);

/** One route definition for both the terrain and the tree-free walking space. */
export const HEARTHWOOD_ROADS = [
  roundedTrail([[670, 1100], [650, 880], [668, 770], [690, 665], [630, 590], [720, 465], [795, 305], [800, 262]]),
  roundedTrail([[437, 585], [437, 645], [470, 675], [535, 665], [610, 650], [690, 665], [790, 700], [890, 681], [1000, 635], [1080, 630], [1212, 637], [1340, 637]]),
];

export function onHearthwoodRoad(x, y, pad = 58) {
  for (const road of HEARTHWOOD_ROADS) for (let i = 1; i < road.length; i++) {
    const [x0, y0] = road[i - 1], [x1, y1] = road[i];
    const dx = x1 - x0, dy = y1 - y0, length2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / length2));
    if (Math.hypot(x - x0 - dx * t, y - y0 - dy * t) < pad) return true;
  }
  return false;
}
