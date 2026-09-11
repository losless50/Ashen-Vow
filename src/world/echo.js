// Echo Grove — the first region past Hearthwood, twice the size of the camp.
// The canopy shuts out the sun; glowing mushrooms, hung lanterns and fireflies
// are the only light. Wolves hunt the paths, the mushroom-folk keep a village in
// the east, Greymane holds a field of bones in the west, Mycel dens in a cave off
// the southern hollow, and Hushmaw waits under the dead tree at the far south-east.
import { createRng } from '../core/rng.js';
import { roundedTrail } from './paths.js';
import { rect, ellipse, poly, path } from '../render/primitives.js';

export const ECHO_W = 3000, ECHO_H = 2200;

/** The grove's places. Everything else — paths, spawns, lights — hangs off these. */
export const ECHO = {
  entrance: { x: 1400, y: 64 },
  fire: { x: 1400, y: 300 },
  clearing: { x: 1400, y: 300, r: 200 },
  junction: { x: 1400, y: 680, r: 160 },      // where the four ways part
  boneyard: { x: 330, y: 900, r: 280 },       // Greymane, in the open, among the dead
  village: { x: 2440, y: 820, r: 320 },       // the mushroom-folk's huts and their pot
  cookfire: { x: 2400, y: 790 },
  pool: { x: 2280, y: 1010, rx: 120, ry: 60 },
  /** Standing water. Frogs sit at the edge of every one of them. */
  ponds: [{ x: 2280, y: 1010, rx: 120, ry: 60 }, { x: 1660, y: 1440, rx: 74, ry: 38 }, { x: 700, y: 620, rx: 66, ry: 34 }, { x: 2020, y: 1180, rx: 58, ry: 30 }],
  sporehouse: { x: 2680, y: 700 },            // the giant mushroom; the ladder is at its foot
  huts: [{ x: 2230, y: 680 }, { x: 2560, y: 610 }, { x: 2620, y: 940 }, { x: 2180, y: 900 }, { x: 2450, y: 1010 }],
  hollow: { x: 1400, y: 1560, r: 260 },
  burrow: { x: 1190, y: 1700 },               // Mycel's cave: an earth-and-root mound in the hollow's rim
  den: { x: 2450, y: 1810, r: 220 },          // the dead tree the den is under
  /** What was here before the grove was. Three of them still have something in them. */
  ruins: [
    { key: 'watchpost', x: 620, y: 320, r: 130, chest: { id: 'echo-chest-watchpost', name: 'A banded chest', embers: 260, ore: 0 } },
    { key: 'shrine', x: 2140, y: 320, r: 120, chest: { id: 'echo-chest-shrine', name: 'A stone coffer', embers: 0, ore: 150 } },
    { key: 'hall', x: 520, y: 1560, r: 150, chest: { id: 'echo-chest-hall', name: 'An iron-bound chest', embers: 500, ore: 200 } },
    { key: 'gate', x: 2760, y: 1320, r: 120, chest: null },
    { key: 'mill', x: 980, y: 1980, r: 130, chest: null },
  ],
  cave: { x: 2450, y: 1790 },
};

/**
 * The vault gate faces west, square onto the road, so the last thing he does in
 * the grove is walk straight into it. The curtain wall crosses the road from the
 * northern trees down to the shore and the one arch left standing is the only way
 * through it.
 */
export const ECHO_VAULT_GATE = { x: 2850, y: 1756 };
/**
 * The wall either side of the opening, with returns east to the map edge so the
 * pocket behind it cannot be walked around. `h` is how far the stone is drawn up
 * the screen: the southern half is kept low so it never stands over the road.
 */
export const ECHO_VAULT_WALLS = [
  { x0: 2824, y0: 1580, x1: 2876, y1: 1692, h: 196 },
  { x0: 2824, y0: 1580, x1: ECHO_W, y1: 1598, h: 150 },
  { x0: 2824, y0: 1880, x1: 2876, y1: 1992, h: 80 },
  { x0: 2824, y0: 1974, x1: ECHO_W, y1: 1992, h: 80 },
];
/** The cheeks of the passage: where the arch springs, and where it came down. */
export const ECHO_VAULT_JAMBS = { north: 1692, south: 1880 };
export const echoVaultWallBlocked = (x, y, radius = 0) => ECHO_VAULT_WALLS.some(w =>
  x > w.x0 - radius && x < w.x1 + radius && y > w.y0 - radius && y < w.y1 + radius);

export const ECHO_VAULT_TORCHES = [
  [2664, 1934], [2800, 1698], [2800, 1874], [2934, 1700], [2934, 1872],
].map(([x, y]) => ({ x, y }));

export const ECHO_PATHS = [
  // Pass beside the hearth, then meet the other roads in the junction.
  [[1400, 0], [1390, 130], [1340, 280], [1350, 420], [1390, 550], [1400, 680]],
  [[1400, 680], [1230, 725], [1040, 815], [780, 885], [540, 900]],
  [[1400, 680], [1580, 715], [1810, 775], [2100, 800], [2280, 810]],
  [[1400, 680], [1380, 880], [1420, 1110], [1370, 1350], [1400, 1540]],
  [[1400, 1540], [1560, 1660], [1850, 1740], [2140, 1790], [2330, 1800]],
  // The vault road bends south around the den, then runs dead east into the gate.
  [[2330, 1800], [2330, 2060], [2560, 2090], [2700, 1990], [2764, 1856], [2790, 1756], [3000, 1756]],
  // A short approach to Mycel's mouth, around the front of the mound.
  [[1400, 1540], [1360, 1650], [1280, 1735], [1190, 1750]],
].map(roundedTrail);

const near = (pts, x, y, r) => {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
    if (Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) < r) return true;
  }
  return false;
};
const inPool = (x, y, pad = 0) => ECHO.ponds.some(p => ((x - p.x) / (p.rx + pad)) ** 2 + ((y - p.y) / (p.ry + pad)) ** 2 < 1);
const CLEARINGS = [ECHO.clearing, ECHO.junction, ECHO.boneyard, ECHO.village, ECHO.hollow, ECHO.den];
const openGround = (x, y, pad = 0) =>
  ECHO_PATHS.some(p => near(p, x, y, 44 + pad))
  || CLEARINGS.some(c => Math.hypot(x - c.x, y - c.y) < c.r + pad)
  || inPool(x, y, 24 + pad);
const inRuin = (x, y, pad = 0) => ECHO.ruins.some(r => Math.hypot(x - r.x, y - r.y) < r.r + pad);
const nearPlace = (x, y) =>
  echoVaultWallBlocked(x, y, 40) || inRuin(x, y, 40)
  // The gate lights itself; a grove lantern here would only stand in the way.
  || Math.hypot(x - ECHO_VAULT_GATE.x, y - ECHO_VAULT_GATE.y) < 220 ||
  Math.hypot(x - ECHO.fire.x, y - ECHO.fire.y) < 90 || Math.hypot(x - ECHO.cave.x, y - ECHO.cave.y) < 130
  || Math.hypot(x - ECHO.cookfire.x, y - ECHO.cookfire.y) < 80 || Math.hypot(x - ECHO.sporehouse.x, y - ECHO.sporehouse.y - 30) < 150
  || Math.hypot(x - ECHO.burrow.x, y - ECHO.burrow.y) < 130 || ECHO.huts.some(h => Math.hypot(x - h.x, y - h.y) < 80);

/** Lantern posts a step off the path, so a walker can steer by them in the dark. */
function buildWayposts(rng) {
  const posts = [];
  for (const [pi, p] of ECHO_PATHS.entries()) {
    let carry = 140;
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      let d = carry;
      for (; d < len; d += 300) {
        const side = posts.length % 2 ? 1 : -1, t = d / len;
        const x = x0 + (x1 - x0) * t + nx * side * 58, y = y0 + (y1 - y0) * t + ny * side * 58;
        if (nearPlace(x, y) || inPool(x, y, 16) || ECHO_PATHS.some(p => near(p, x, y, 38))) continue;
        if (posts.some(p => Math.hypot(p.x - x, p.y - y) < 140)) continue;
        posts.push({ x, y, lit: rng() > .18, phase: pi + d });
      }
      carry = d - len;
    }
  }
  return posts;
}

/** Uneven moss edges, kept inside the clear space reserved for each landmark. */
function clearingEdge(c, inset = 0) {
  return Array.from({ length: 64 }, (_, i) => {
    const a = i / 64 * Math.PI * 2;
    const edge = .95 + .025 * Math.sin(a * 5 + c.x) + .02 * Math.sin(a * 9 + c.y);
    return [c.x + Math.cos(a) * (c.r - inset) * edge, c.y + 10 + Math.sin(a) * (c.r * .72 - inset) * edge];
  });
}

/** Worn earth, with broken shoulders instead of a dark outline and bright stripe. */
function paintTrails(g, pal = GROUND.shut) {
  const rng = createRng(9047);
  // Paint the whole network in layers so forks have no overlapping end caps.
  for (const [width, color] of pal.trail)
    for (const p of ECHO_PATHS) path(g, p, width, color);
  for (const p of ECHO_PATHS) {
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      const length = Math.hypot(x1 - x0, y1 - y0);
      if (!length) continue;
      const nx = -(y1 - y0) / length, ny = (x1 - x0) / length;
      for (let d = 0; d < length; d += 6) {
        const t = d / length, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        for (const side of [-1, 1]) {
          const off = side * (19 + rng() * 15);
          ellipse(g, x + nx * off, y + ny * off, 3 + rng() * 7, 2 + rng() * 4, rng() < .5 ? '#1c2c20' : '#293327');
        }
        const off = (rng() - .5) * 31;
        rect(g, x + nx * off, y + ny * off, 2 + rng() * 5, 1 + rng() * 2, rng() < .7 ? '#414735' : '#252e23');
      }
    }
  }
}

/** A ruin floor: cracked flagstones, a broken footprint of wall, rubble and moss. */
function paintRuin(g, r, rng) {
  ellipse(g, r.x, r.y + 8, r.r, r.r * .74, '#0b1210');
  ellipse(g, r.x, r.y + 8, r.r - 10, r.r * .74 - 8, '#2a2a30');
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2, d = rng();
    const x = r.x + Math.cos(a) * d * (r.r - 16), y = r.y + 8 + Math.sin(a) * d * (r.r * .74 - 14);
    rect(g, x, y, 12 + rng() * 22, 8 + rng() * 12, ['#3a3a44', '#23232c', '#45454f', '#1c1c24'][i % 4]);
  }
  // The footprint of what stood here, drawn as a broken outline.
  const w = r.r * .74, h = r.r * .5;
  for (const [x0, y0, x1, y1] of [[-w, -h, w, -h], [-w, h, w, h], [-w, -h, -w, h], [w, -h, w, h]]) {
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      if (rng() < .3) continue;
      const t0 = i / steps, t1 = (i + 1) / steps;
      path(g, [[r.x + x0 + (x1 - x0) * t0, r.y + 8 + y0 + (y1 - y0) * t0], [r.x + x0 + (x1 - x0) * t1, r.y + 8 + y0 + (y1 - y0) * t1]], 9, '#14141a');
      path(g, [[r.x + x0 + (x1 - x0) * t0, r.y + 6 + y0 + (y1 - y0) * t0], [r.x + x0 + (x1 - x0) * t1, r.y + 6 + y0 + (y1 - y0) * t1]], 5, '#4a4a56');
    }
  }
  // Moss and root creeping back over it.
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, d = rng();
    const x = r.x + Math.cos(a) * d * r.r, y = r.y + 8 + Math.sin(a) * d * r.r * .74;
    rect(g, x, y, 4 + rng() * 9, 2 + rng() * 3, i % 3 ? '#1e2b22' : '#2c5a48');
  }
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, l = r.r * (.6 + rng() * .7);
    path(g, [[r.x, r.y + 8], [r.x + Math.cos(a) * l * .6, r.y + 8 + Math.sin(a) * l * .4], [r.x + Math.cos(a) * l, r.y + 8 + Math.sin(a) * l * .74]], 3, '#1a1410');
  }
}

/** Paints the grove floor: black earth, moss, roots, the paths, the clearings, the bones. */
/**
 * The grove's ground, in two weathers. `shut` is the floor under a closed roof —
 * blue-green and nearly black. `open` is the same floor once the sun is on it,
 * painted from Hearthwood's palette on purpose: the camp is what ordinary
 * daylight looks like in this game, so the healed grove should match it.
 */
const GROUND = {
  shut: {
    base: '#0e1a16',
    speck: ['#132419', '#1a2e22', '#0a120f', '#2c5a48', '#101d18'],
    clearing: '#122218', village: '#1f2c22', den: '#141d18', other: '#182a20',
    blade: '#1e2b22', bladeLit: '#4b5843',
    trail: [[66, '#18271d'], [48, '#293327'], [32, '#343b2c']],
  },
  open: {
    base: '#292e29',
    speck: ['#3c422f', '#575b36', '#1c2423', '#323928', '#655b37'],
    clearing: '#333828', village: '#474b30', den: '#2b3128', other: '#3c422f',
    blade: '#434a32', bladeLit: '#7d8455',
    trail: [[66, '#49432e'], [48, '#655035'], [32, '#80633e']],
  },
};

/** One seed for the ground, so the shut and open maps agree down to the blade. */
const ECHO_PAINT_SEED = 8213;

/**
 * The same map, repainted with the sun on it. Expensive, so the world builds it
 * once and keeps it; `createRng` is re-seeded identically, so every blade of
 * grass, bone and root lands exactly where it does on the dark one.
 */
export function paintEchoLit() {
  const canvas = document.createElement('canvas');
  canvas.width = ECHO_W;
  canvas.height = ECHO_H;
  paintEcho(canvas.getContext('2d', { willReadFrequently: true }), createRng(ECHO_PAINT_SEED), GROUND.open);
  return canvas;
}

function paintEcho(g, rng, pal = GROUND.shut) {
  const W = ECHO_W, H = ECHO_H;
  rect(g, 0, 0, W, H, pal.base);
  for (let i = 0; i < 22000; i++) {
    const x = rng() * W, y = rng() * H;
    rect(g, x, y, 2 + rng() * 9, 1 + rng() * 4, pal.speck[i % 5]);
  }
  for (let i = 0; i < 300; i++) {
    const x = rng() * W, y = rng() * H, a = rng() * Math.PI * 2, l = 30 + rng() * 70;
    path(g, [[x, y], [x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .5 + 6], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 3, '#1a1410');
    path(g, [[x, y], [x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .5 + 6], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 1, '#33281c');
  }
  for (const c of CLEARINGS) {
    poly(g, clearingEdge(c), pal.clearing);
    poly(g, clearingEdge(c, 10), c === ECHO.village ? pal.village : c === ECHO.den ? pal.den : pal.other);
  }
  paintTrails(g, pal);
  for (let i = 0; i < 9000; i++) {
    const x = rng() * W, y = rng() * H;
    if (!openGround(x, y, -10)) continue;
    rect(g, x, y, 2 + rng() * 5, 1 + rng() * 2, i % 3 ? pal.blade : pal.bladeLit);
  }
  // The boneyard: Greymane's field, littered with what the pack has eaten.
  const b = ECHO.boneyard;
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, r = rng() * b.r * .85, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r * .72;
    ellipse(g, x, y, 10 + rng() * 22, 4 + rng() * 9, i % 3 ? '#3a1218' : '#521a22');
  }
  for (let i = 0; i < 170; i++) {
    const a = rng() * Math.PI * 2, r = rng() * b.r * .9, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r * .72;
    rect(g, x, y, 3 + rng() * 7, 2, i % 4 ? '#b9b39c' : '#7a7566');
    if (i % 5 === 0) { rect(g, x, y - 4, 6, 5, '#d8d2ba'); rect(g, x + 1, y - 3, 1, 1, '#0e1a16'); rect(g, x + 4, y - 3, 1, 1, '#0e1a16'); }
    if (i % 7 === 0) for (let k = 0; k < 5; k++) rect(g, x + k * 3, y - 6 + (k % 2), 1, 7, '#d8d2ba');
    if (i % 9 === 0) { ellipse(g, x, y, 9, 5, '#6a2a2a'); rect(g, x - 3, y - 2, 6, 3, '#8f3a3a'); }
  }
  // Kills strewn along the paths, where the wolves have dragged them.
  for (let i = 0; i < 120; i++) {
    const x = rng() * W, y = rng() * H;
    if (!openGround(x, y, 40) || openGround(x, y, -46)) continue;
    ellipse(g, x, y, 7 + rng() * 14, 3 + rng() * 6, i % 3 ? '#2e1016' : '#43151c');
    for (let k = 0; k < 3; k++) rect(g, x - 6 + k * 5, y - 2 + (k % 2) * 3, 3 + rng() * 4, 2, k % 2 ? '#b9b39c' : '#8a8478');
  }
  // The village: trodden ground and a ring of stones around the pot.
  ellipse(g, ECHO.cookfire.x, ECHO.cookfire.y + 14, 60, 26, '#2a2a22');
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ellipse(g, ECHO.cookfire.x + Math.cos(a) * 56, ECHO.cookfire.y + 14 + Math.sin(a) * 24, 5, 3, '#4a4a56'); }
  for (const h of ECHO.huts) for (let i = 0; i < 12; i++) rect(g, h.x - 30 + rng() * 60, h.y + 20 + rng() * 24, 3, 2, '#4b5843');
  // What is left of the people the folk have already eaten, all over the village floor.
  const v = ECHO.village;
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 70 + rng() * (v.r * .8);
    const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r * .72;
    ellipse(g, x, y + 2, 14 + rng() * 12, 6 + rng() * 5, i % 3 ? '#33101a' : '#4a1620');
    if (i % 3 === 0) {
      // A body, face down, half stripped.
      ellipse(g, x, y, 13, 6, '#0d0a10');
      rect(g, x - 9, y - 5, 18, 9, '#6b6157'); rect(g, x - 9, y - 5, 18, 2, '#8a7f72');
      rect(g, x + 8, y - 6, 7, 7, '#a8785a'); rect(g, x + 10, y - 4, 2, 2, '#0d0a10');
      rect(g, x - 14, y - 2, 7, 3, '#a8785a'); rect(g, x - 3, y + 4, 5, 5, '#2a1d1a');
    } else if (i % 3 === 1) {
      // A ribcage picked clean.
      for (let k = 0; k < 6; k++) rect(g, x - 9 + k * 4, y - 7 + (k % 2), 2, 13, '#d8d2ba');
      rect(g, x - 10, y - 8, 21, 2, '#b9b39c');
    } else {
      // A skull and a scatter of long bones.
      rect(g, x, y - 6, 8, 7, '#d8d2ba'); rect(g, x + 1, y - 4, 2, 2, '#0d0a10'); rect(g, x + 5, y - 4, 2, 2, '#0d0a10');
      rect(g, x + 1, y + 1, 6, 2, '#b9b39c');
      for (let k = 0; k < 4; k++) rect(g, x - 16 + k * 6, y + 4 + (k % 2) * 3, 8 + rng() * 5, 2, '#c2bca6');
    }
  }
  // Boots, packs and a broken cart the folk have stripped and thrown aside.
  for (const [bx, by] of [[2300, 700], [2520, 900], [2380, 960], [2600, 760]]) {
    rect(g, bx, by, 10, 6, '#2a1d1a'); rect(g, bx + 1, by - 3, 5, 4, '#2a1d1a');
    rect(g, bx + 16, by + 4, 14, 10, '#4a3826'); rect(g, bx + 18, by + 6, 10, 3, '#6b5340');
  }
  for (const [cx, cy] of [[2180, 1000]]) {
    rect(g, cx - 30, cy - 10, 60, 18, '#3a2a18'); rect(g, cx - 30, cy - 10, 60, 3, '#5c4530');
    for (let k = 0; k < 5; k++) rect(g, cx - 26 + k * 12, cy - 8, 3, 14, '#241a10');
    ellipse(g, cx - 34, cy + 12, 16, 16, '#241a10'); ellipse(g, cx - 34, cy + 12, 11, 11, '#3a2a18');
    ellipse(g, cx + 36, cy + 10, 15, 15, '#241a10'); ellipse(g, cx + 36, cy + 10, 10, 10, '#3a2a18');
    path(g, [[cx + 28, cy - 6], [cx + 74, cy - 22]], 4, '#3a2a18');
  }
  // Standing water, black and reed-ringed.
  for (const p of ECHO.ponds) {
    ellipse(g, p.x, p.y + 4, p.rx + 12, p.ry + 9, '#0a1410');
    ellipse(g, p.x, p.y, p.rx + 4, p.ry + 3, '#163a4a');
    ellipse(g, p.x, p.y, p.rx, p.ry, '#0b1c2a');
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2, x = p.x + Math.cos(a) * (p.rx + 10), y = p.y + Math.sin(a) * (p.ry + 7);
      rect(g, x, y - 8 - rng() * 8, 1, 10 + rng() * 8, i % 2 ? '#3a5a3a' : '#5a7a48');
    }
    for (let i = 0; i < 14; i++) { const a = rng() * Math.PI * 2, r = rng(); ellipse(g, p.x + Math.cos(a) * r * p.rx, p.y + Math.sin(a) * r * p.ry, 5 + rng() * 7, 2 + rng() * 3, '#1e4a38'); }
  }
  for (const r of ECHO.ruins) paintRuin(g, r, rng);
  paintVaultGate(g, rng);
  // Mycel's cave: a mound of earth and root at the hollow's rim, with a mouth in it.
  const m = ECHO.burrow;
  ellipse(g, m.x, m.y - 20, 150, 96, '#0d1310');
  ellipse(g, m.x, m.y - 26, 138, 86, '#241a12');
  ellipse(g, m.x - 30, m.y - 48, 70, 40, '#33261a');
  for (let i = 0; i < 200; i++) {
    const a = rng() * Math.PI * 2, r = rng(), x = m.x + Math.cos(a) * r * 132, y = m.y - 26 + Math.sin(a) * r * 82;
    rect(g, x, y, 3 + rng() * 8, 2 + rng() * 3, ['#3d2c1c', '#1a1008', '#4a3826', '#2a1c12'][i % 4]);
  }
  for (let i = 0; i < 12; i++) {
    const a = -.3 + i * .3, x0 = m.x + Math.cos(a) * 40, y0 = m.y - 40 + Math.sin(a) * 24;
    path(g, [[x0, y0], [m.x + Math.cos(a) * 110, m.y - 20 + Math.sin(a) * 70], [m.x + Math.cos(a) * 150, m.y + 20 + Math.sin(a) * 80]], 6, '#1a1008');
    path(g, [[x0, y0], [m.x + Math.cos(a) * 110, m.y - 20 + Math.sin(a) * 70], [m.x + Math.cos(a) * 150, m.y + 20 + Math.sin(a) * 80]], 2, '#4a3826');
  }
  poly(g, [[m.x - 44, m.y + 22], [m.x - 38, m.y - 26], [m.x - 16, m.y - 50], [m.x + 16, m.y - 50], [m.x + 38, m.y - 26], [m.x + 44, m.y + 22]], '#0c0a08');
  poly(g, [[m.x - 32, m.y + 20], [m.x - 28, m.y - 18], [m.x - 12, m.y - 38], [m.x + 12, m.y - 38], [m.x + 28, m.y - 18], [m.x + 32, m.y + 20]], '#050403');
  for (let i = 0; i < 6; i++) rect(g, m.x - 26 + i * 10, m.y - 40 + (i % 2) * 5, 3, 7, '#3d2c1c');
  // The dead tree at the far south-east: Hushmaw's den is the hollow under its roots.
  const d = ECHO.cave;
  ellipse(g, d.x, d.y + 30, 210, 96, '#0a100d');
  ellipse(g, d.x, d.y + 24, 190, 82, '#171009');
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    path(g, [[d.x + Math.cos(a) * 40, d.y + 20 + Math.sin(a) * 18], [d.x + Math.cos(a) * 130, d.y + 24 + Math.sin(a) * 62], [d.x + Math.cos(a) * 215, d.y + 30 + Math.sin(a) * 104]], 13, '#0a0806');
    path(g, [[d.x + Math.cos(a) * 40, d.y + 20 + Math.sin(a) * 18], [d.x + Math.cos(a) * 130, d.y + 24 + Math.sin(a) * 62], [d.x + Math.cos(a) * 215, d.y + 30 + Math.sin(a) * 104]], 6, '#241a12');
  }
  for (let i = 0; i < 300; i++) {
    const a = rng() * Math.PI * 2, r = rng(), x = d.x + Math.cos(a) * r * 180, y = d.y + 24 + Math.sin(a) * r * 78;
    rect(g, x, y, 3 + rng() * 9, 2 + rng() * 3, ['#2a1e12', '#120c08', '#3d2c1c', '#1c1409'][i % 4]);
  }
  poly(g, [[d.x - 64, d.y + 26], [d.x - 56, d.y - 40], [d.x - 24, d.y - 76], [d.x + 24, d.y - 76], [d.x + 56, d.y - 40], [d.x + 64, d.y + 26]], '#0a0806');
  poly(g, [[d.x - 48, d.y + 22], [d.x - 42, d.y - 30], [d.x - 18, d.y - 62], [d.x + 18, d.y - 62], [d.x + 42, d.y - 30], [d.x + 48, d.y + 22]], '#030202');
  for (let i = 0; i < 8; i++) rect(g, d.x - 40 + i * 11, d.y - 64 + (i % 2) * 6, 4, 9 + (i % 3) * 4, '#241a12');
}

/**
 * The road does not stop at the gate: it is paved through it, so the way east
 * reads as a way east from a long way off.
 */
function paintVaultGate(g, rng) {
  const { x, y } = ECHO_VAULT_GATE, { north, south } = ECHO_VAULT_JAMBS;
  // The sill: worn flags from the approach, through the wall, out to the shore.
  poly(g, [[2704, north + 24], [ECHO_W, north + 8], [ECHO_W, south - 8], [2704, south - 30]], '#2c2f26');
  poly(g, [[2740, north + 34], [ECHO_W, north + 20], [ECHO_W, south - 20], [2740, south - 40]], '#43453a');
  for (let fx = 2712; fx < ECHO_W; fx += 34) {
    const top = north + 30 - (fx - 2712) * .05, bottom = south - 34 + (fx - 2712) * .05;
    for (let fy = top; fy < bottom; fy += 30)
      rect(g, fx + rng() * 3, fy + rng() * 3, 28 + rng() * 4, 24 + rng() * 4, rng() < .35 ? '#565847' : '#4c4e40');
  }
  // The dark the passage stands in, thrown across the way through. It is ground,
  // not a sprite, so he walks over it instead of into it.
  ellipse(g, x, (north + south) / 2, 52, 108, '#141d1e99');
  ellipse(g, x, (north + south) / 2, 38, 94, '#0f1618bb');
  ellipse(g, x + 6, y + 98, 44, 19, '#12201f88');
  // Standing water in the ruts, because the flood east of here never went down.
  for (let i = 0; i < 26; i++) {
    const px = 2712 + rng() * (ECHO_W - 2712), py = y - 60 + rng() * 150;
    ellipse(g, px, py, 9 + rng() * 22, 4 + rng() * 8, i % 3 ? '#1b3038' : '#24424a');
  }
  // What the wall shed: rubble banked against both cheeks of the opening.
  for (let i = 0; i < 70; i++) {
    const px = 2740 + rng() * 240, side = i % 2 ? north + 6 + rng() * 22 : south - 28 + rng() * 22;
    rect(g, px, side, 4 + rng() * 11, 3 + rng() * 6, ['#4a5248', '#39423a', '#5d6253'][i % 3]);
  }
}

/** Everything the world needs to stand in the grove. Built once, on first entry. */
export function buildEcho(TREE) {
  const rng = createRng(2741);
  const W = ECHO_W, H = ECHO_H;
  // Trees, few and far apart, with bushes in the gaps. Nothing stands on a path or in a clearing.
  const trees = [];
  let tries = 0;
  while (trees.length < 90 && tries++ < 12000) {
    const x = 20 + rng() * (W - 40), y = 20 + rng() * (H - 40);
    if (openGround(x, y, 48) || nearPlace(x, y)) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.y - y) < 90)) continue;
    trees.push({ id: trees.length, x, y, s: 1.05 + rng() * .6, t: rng(), hp: TREE.hp, max: TREE.hp, regrow: 0, regrowTime: TREE.regrow, grove: true });
  }
  tries = 0;
  let bushes = 0;
  while (bushes < 60 && tries++ < 8000) {
    const x = 20 + rng() * (W - 40), y = 20 + rng() * (H - 40);
    if (openGround(x, y, 26) || nearPlace(x, y)) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.y - y) < 40)) continue;
    trees.push({ id: trees.length, x, y, s: .8 + rng() * .6, t: rng(), hp: TREE.hp, max: TREE.hp, regrow: 0, regrowTime: TREE.regrow, grove: true, bush: true });
    bushes++;
  }
  const mushrooms = [];
  const GLOW = ['#6fd6b0', '#b48ad0', '#f2a54b'];
  tries = 0;
  while (mushrooms.length < 240 && tries++ < 12000) {
    const x = 30 + rng() * (W - 60), y = 30 + rng() * (H - 60);
    // Along the edges of paths and clearings, where a walker can steer by them — never on them.
    if (!openGround(x, y, 24) || openGround(x, y, -34) && rng() < .5) continue;
    if (ECHO_PATHS.some(p => near(p, x, y, 32))) continue;
    if (inPool(x, y, 4) || nearPlace(x, y)) continue;
    if (mushrooms.some(m => Math.hypot(m.x - x, m.y - y) < 40)) continue;
    mushrooms.push({ x, y, color: GLOW[mushrooms.length % 3], s: .7 + rng() * .8, phase: rng() * 6.28 });
  }
  // Bodies the folk have strung up between the huts, and the drying rack by the pot.
  const gibbets = [
    { x: 2300, y: 640 }, { x: 2510, y: 700 }, { x: 2360, y: 900 }, { x: 2610, y: 820 },
  ];
  // Standing stones and fallen columns, which have height and so are sorted with everything else.
  const stones = [];
  for (const r of ECHO.ruins) {
    const n = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rng() * .5, d = .62 + rng() * .38;
      const x = r.x + Math.cos(a) * d * r.r * .8, y = r.y + 8 + Math.sin(a) * d * r.r * .6;
      const kind = rng() < .45 ? 'column' : rng() < .5 ? 'wall' : 'arch';
      stones.push({ x, y, kind, h: .8 + rng() * .7, seed: stones.length });
    }
  }
  // Small things that live here and want nothing to do with him.
  const critters = [];
  const CRITTER_KINDS = ['hare', 'beetle', 'moth'];
  let ctries = 0;
  while (critters.length < 44 && ctries++ < 6000) {
    const x = 60 + rng() * (W - 120), y = 60 + rng() * (H - 120);
    if (inPool(x, y, 10) || nearPlace(x, y)) continue;
    if (critters.some(k => Math.hypot(k.x - x, k.y - y) < 130)) continue;
    critters.push({ x, y, homeX: x, homeY: y, kind: CRITTER_KINDS[critters.length % 3], phase: rng() * 6.28, flee: 0, alpha: 1, back: 0 });
  }
  // Camps where travellers stopped and did not leave.
  const camps = [];
  for (const [x, y] of [[1660, 1180], [900, 700], [2020, 1330], [1180, 360]]) camps.push({ x, y, seed: camps.length });
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  paintEcho(canvas.getContext('2d', { willReadFrequently: true }), createRng(ECHO_PAINT_SEED));
  return {
    key: 'echo',
    size: { w: W, h: H },
    terrain: canvas,
    trees,
    veins: [],
    npcs: [
      { x: ECHO.fire.x, y: ECHO.fire.y, name: 'Rest at the grove fire', type: 'fire' },
      { x: ECHO.fire.x + 72, y: ECHO.fire.y + 26, name: 'Orrin', role: 'The lamp-seller', type: 'peddler' },
      { x: ECHO.cave.x, y: ECHO.cave.y + 20, name: 'The den beneath the roots', type: 'cave' },
      { x: ECHO.sporehouse.x, y: ECHO.sporehouse.y + 66, name: 'Climb into the sporehouse', type: 'ladder' },
      { x: ECHO.burrow.x, y: ECHO.burrow.y + 14, name: 'Enter Mycel’s cave', type: 'burrow' },
      // Only there once the thread that puts them there has been pulled: the three
      // of them at their own fire, a few steps along from Orrin's.
      { x: 1544, y: 338, name: 'Neve', role: 'Orrin’s wife', type: 'wife', gate: 'family' },
      { x: 1600, y: 366, name: 'Tam', role: 'Orrin’s son', type: 'boy', gate: 'family' },
      { x: 1512, y: 372, name: 'Wren', role: 'Orrin’s daughter', type: 'girl', gate: 'family' },
      { x: ECHO.cookfire.x - 54, y: ECHO.cookfire.y + 18, name: 'The brewer', role: 'Of the mushroom-folk', type: 'apothecary', gate: 'dawned' },
      ...ECHO.ruins.filter(r => r.chest).map(r => ({ ...r.chest, x: r.x, y: r.y + 8, type: 'chest' })),
    ],
    solids: [
      // The crown of the arch and the bank it brought down with it. It holds the
      // walk through to the northern half of the opening, which is the half that
      // is never behind stone.
      { x: ECHO_VAULT_GATE.x - 2, y: ECHO_VAULT_GATE.y + 92, rx: 50, ry: 46, name: 'the fallen crown' },
      { x: ECHO.fire.x, y: ECHO.fire.y + 4, rx: 20, ry: 11, name: 'grove fire' },
      { x: ECHO.sporehouse.x, y: ECHO.sporehouse.y + 40, rx: 48, ry: 18, name: 'the sporehouse stalk' },
      { x: ECHO.cookfire.x, y: ECHO.cookfire.y + 4, rx: 22, ry: 12, name: 'the cookpot' },
      ...ECHO.huts.map(h => ({ x: h.x, y: h.y + 10, rx: 34, ry: 16, name: 'a hut' })),
      ...stones.filter(s => s.kind !== 'arch').map(s => ({ x: s.x, y: s.y, rx: s.kind === 'wall' ? 22 : 10, ry: 9, name: 'old stone' })),
    ],
    props: {
      mushrooms, fireflies: 140, pools: ECHO.ponds, lairs: [ECHO.boneyard, ECHO.village, ECHO.hollow],
      cave: ECHO.cave, cookfire: ECHO.cookfire, sporehouse: ECHO.sporehouse, burrow: ECHO.burrow,
      huts: ECHO.huts, wayposts: buildWayposts(rng), camps, gibbets, rack: { x: 2300, y: 830 }, critters, rain: 1,
      ruins: ECHO.ruins, stones,
    },
    inWater: inPool,
    terrainBlocked: echoVaultWallBlocked,
    bounds: { minX: 30, maxX: W - 30, minY: 20, maxY: H - 30 },
    fire: ECHO.fire,
    /** Walking back off the north path returns to Hearthwood's south road. */
    exits: [
      { x0: 1320, x1: 1480, y0: 0, y1: 26, to: 'hearthwood', at: { x: 668, y: 1020 } },
      // East, past the den, to the drowned kingdom — barred while she holds it.
      { x0: 2884, x1: W, y0: 1600, y1: 1972, to: 'sunken', at: { x: 150, y: 1500 }, needs: 'vaelira',
        barred: 'The water east of the den has not gone down. Something under it is still being held shut.' },
    ],
  };
}
