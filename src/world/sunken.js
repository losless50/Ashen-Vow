/**
 * The Sunken Vault: a drowned kingdom in the eastern shallows, reached by
 * walking east out of Echo Grove past the den — and only once the thorn in that
 * den is dead, because the water east of it does not go down until she does.
 *
 * A terraced coastal settlement: broad courts, irrigated gardens and a lower
 * quay surround the Drowned Throne. Two circuits reconnect at its stair landings.
 * An abandoned village on the western sand, a burned stair down into the
 * Scorched Depths in the north, the Flooded Halls under the falls in the
 * south-east, and a great arch in the south wall that the world map arrives at.
 *
 * Buried kingdoms. Same roots.
 */
import { rect, ellipse, poly, path } from '../render/primitives.js';
import { createRng } from '../core/rng.js';

export const SUNKEN_W = 3000, SUNKEN_H = 2600;

/** Everything else — paths, spawns, lights, props — hangs off these. */
export const SUNKEN = {
  /** Where the grove road comes through the eastern cliffs. */
  entrance: { x: 96, y: 1500 },
  /** The southern arch: the way the world map delivers him. */
  gate: { x: 1500, y: 2450 },
  /** The only fire in the region, on the shelf below the burned stair. */
  fire: { x: 1640, y: 560 },
  village: { x: 520, y: 820, r: 330 },        // roofless houses on the western sand
  shop: { x: 470, y: 800 },
  /** The roofless houses, fixed so the ground and the standing walls agree. */
  houses: [
    { x: 300, y: 680, w: 108, h: 76 }, { x: 480, y: 640, w: 96, h: 70 },
    { x: 730, y: 650, w: 110, h: 80 }, { x: 290, y: 885, w: 98, h: 72 },
    { x: 460, y: 935, w: 86, h: 64 }, { x: 750, y: 955, w: 104, h: 74 },
    { x: 350, y: 1200, w: 92, h: 64 }, { x: 780, y: 1640, w: 106, h: 74 },
  ],
  depths: { x: 1560, y: 300, r: 210 },        // the burned stair, and what is down it
  halls: { x: 2360, y: 1780, r: 240 },        // the flooded halls under the falls
  throne: { x: 1500, y: 1290, r: 330 },       // the middle, and the two on it
  /** The standing water. Shallow at the rims, deep in the channels. */
  lake: { x: 1500, y: 1300, rx: 1090, ry: 900 },
  /** Waterfalls off the eastern cliffs, feeding the halls. */
  falls: [{ x: 2540, y: 1380 }, { x: 2670, y: 1352 }],
  /** Ruined columns still standing out of the water, in rough rows. */
  colonnade: [
    [1280, 1110], [1720, 1110], [1250, 1420], [1750, 1420],
    [1180, 500], [1840, 500], [1360, 220], [1720, 220],
    [2120, 890], [2550, 900], [2190, 1060], [2550, 1170],
    [2200, 1600], [2520, 1700], [1320, 2130], [1680, 2130],
    [780, 1390], [780, 1890], [1110, 1580], [1880, 930],

  ],
};

/** Broad streets form two circuits; short bridges cross the remaining canals. */
export const SUNKEN_PATHS = [
  [[24, 1500], [400, 1500], [580, 1280], [580, 820]],
  [[580, 820], [900, 820], [1100, 820], [1500, 820], [1500, 560], [1640, 560]],
  [[1500, 1120], [1500, 560], [1560, 470], [1560, 300]],
  [[580, 1280], [900, 1280], [1240, 1290]],
  [[400, 1500], [620, 1840], [940, 1840], [1180, 1840], [1500, 1840]],
  [[940, 1280], [940, 1660], [940, 1840]],
  [[1500, 1460], [1500, 2020], [1500, 2380], [1500, 2520]],
  [[1760, 1290], [1930, 1290], [1930, 1450], [2120, 1450], [2120, 1200], [2300, 1200], [2300, 1780], [2360, 1780]],
  [[1640, 560], [1900, 560], [2170, 560], [2300, 850], [2300, 1290]],
  [[2300, 1780], [2180, 2080], [1850, 2220], [1500, 2220]],
  [[620, 1840], [760, 2170], [1120, 2380], [1500, 2380]],
];

/** Cut coastlines, broad plazas and two raised districts, shared by paint/collision. */
export const SUNKEN_LAND = [
  { id: 'village', floor: '#b4a17c', height: 48, points: [[180,520],[780,520],[880,650],[880,960],[800,1050],[240,1050],[180,970]] },
  { id: 'west-bank', floor: '#bda982', points: [[240,1070],[630,1080],[850,1170],[1050,1170],[1070,1390],[840,1490],[760,1760],[1080,1780],[1150,1910],[840,2020],[510,1970],[380,1740],[270,1590],[100,1570],[100,1410],[320,1360]] },
  { id: 'temple', floor: '#a99a79', height: 64, points: [[1040,260],[1850,260],[1980,360],[1980,620],[1880,700],[1120,700],[1040,620]] },
  { id: 'sanctuary', floor: '#756a57', height: 44, points: [[1320,140],[1740,140],[1820,220],[1820,340],[1760,400],[1320,400],[1260,340],[1260,220]] },
  { id: 'court', floor: '#a29b80', height: 52, points: [[1240,1040],[1760,1040],[1840,1120],[1840,1430],[1760,1510],[1240,1510],[1160,1430],[1160,1120]] },
  { id: 'gardens', floor: '#9b9e75', height: 80, points: [[2130,660],[2650,660],[2780,790],[2780,1160],[2640,1300],[2080,1300],[2000,1220],[2000,850]] },
  { id: 'quay', floor: '#9b9478', points: [[2190,1450],[2600,1450],[2700,1580],[2650,1840],[2500,1990],[2180,1980],[1960,1720],[1940,1520],[2090,1490]] },
  { id: 'gate', floor: '#b6a481', points: [[1250,1970],[1690,1950],[1840,2040],[1820,2310],[1690,2420],[1310,2440],[1140,2350],[1140,2110]] },
];

/** Front retaining walls have explicit stair openings; their faces are solid. */
export const SUNKEN_STAIRS = [
  { x: 580, y: 1050, w: 144, h: 48 },
  { x: 1500, y: 700, w: 160, h: 64 },
  { x: 1560, y: 400, w: 128, h: 44 },
  { x: 1500, y: 1510, w: 176, h: 52 },
  { x: 2300, y: 1300, w: 152, h: 80 },
  { x: 2120, y: 1300, w: 144, h: 80 },
];

const segmentDistance = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
};
export function insideSunkenLand(x, y, parcel, pad = 0) {
  let inside = false, edge = Infinity;
  const pts = parcel.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    edge = Math.min(edge, segmentDistance(x, y, pts[i], pts[j]));
  }
  return inside ? edge >= pad : pad < 0 && edge < -pad;
}

export const SUNKEN_WALLS = SUNKEN_LAND.filter(p => p.height).flatMap(p => {
  const walls = [];
  // Clockwise polygons: leftward edges face the viewer.
  for (let i = 0; i < p.points.length; i++) {
    const a = p.points[i], b = p.points[(i + 1) % p.points.length];
    if (b[0] >= a[0]) continue;
    walls.push({ points: [a, b, [b[0], b[1] + p.height], [a[0], a[1] + p.height]], a, b, height: p.height });
  }
  return walls;
});

export function onSunkenStairs(x, y, pad = 0) {
  return SUNKEN_STAIRS.some(s => Math.abs(x - s.x) < s.w / 2 - pad && y > s.y - 30 + pad && y < s.y + s.h + 36 - pad);
}
export function sunkenCliffBlocked(x, y, radius = 0) {
  if (onSunkenStairs(x, y, radius)) return false;
  return SUNKEN_WALLS.some(w => insideSunkenLand(x, y, w, -radius));
}

export const SUNKEN_FIRES = [
  { ...SUNKEN.fire, id: 'vault-temple', name: 'Temple fire' },
  { x: 630, y: 1570, id: 'vault-bank', name: 'Sheltered bank fire' },
  { x: 2420, y: 1890, id: 'vault-quay', name: 'Quayside fire' },
];
export const SUNKEN_TORCHES = [
  [240, 1420], [370, 1420], [480, 1350],
  [490, 1050], [670, 1050], [870, 740], [1100, 740],
  [1390, 700], [1610, 700], [1450, 400], [1660, 400],
  [1140, 1220], [1860, 1220], [1370, 1510], [1630, 1510],
  [2010, 1300], [2400, 1300], [2400, 820],
  [850, 1840], [1600, 2000], [2220, 1810],
  [1370, 2380], [1630, 2380],
].map(([x, y]) => ({ x, y }));

const SAND = '#c9b48a', SAND_DARK = '#a8916b', STONE = '#6e6a60', STONE_LIT = '#8b867a';
const SHALLOW = '#3f7b82', DEEP = '#1d4750', DEEPEST = '#14333b';

const dist = (x, y, p) => Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry);

/**
 * How far the deck reaches either side of its centreline. The stone is painted
 * 128 wide — 64 each way — so standing room stops just inside the visible kerb
 * and he can never have his feet over open water.
 */
export const CAUSEWAY_HALF = 60;

/**
 * Standing water: inside the lake's bowl and off every piece of land in it.
 *
 * `pad` shrinks the land rather than growing it, so a bigger pad means a
 * stricter edge. Getting that backwards is what let him walk off the causeway:
 * the collision corridor came out wider than the stone it was meant to follow.
 */
export function inSunkenWater(x, y, pad = 0) {
  if (dist(x, y, SUNKEN.lake) > 1) return false;
  if (SUNKEN_LAND.some(p => insideSunkenLand(x, y, p, pad))) return false;
  if (onSunkenStairs(x, y, pad)) return false;
  if (onCauseway(x, y, Math.max(6, CAUSEWAY_HALF - pad))) return false;
  return true;
}

/** Within `width` of a causeway's centreline — the deck, and what stands on it. */
export function onCauseway(x, y, width = CAUSEWAY_HALF) {
  for (const p of SUNKEN_PATHS) {
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      const dx = x1 - x0, dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
      if (Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) < width) return true;
    }
  }
  return false;
}

/** Open ground: sand, deck or island, and not in the water. */
const walkable = (x, y) => !inSunkenWater(x, y);

// --- painting ---------------------------------------------------------------------
function paintWater(g, rng) {
  // The bowl, in three depths, so the channels read deeper than the rims.
  ellipse(g, SUNKEN.lake.x, SUNKEN.lake.y, SUNKEN.lake.rx, SUNKEN.lake.ry, SHALLOW);
  ellipse(g, SUNKEN.lake.x, SUNKEN.lake.y, SUNKEN.lake.rx * .82, SUNKEN.lake.ry * .8, DEEP);
  ellipse(g, SUNKEN.lake.x, SUNKEN.lake.y, SUNKEN.lake.rx * .52, SUNKEN.lake.ry * .5, DEEPEST);
  // Light moving on it: long pale streaks, thickest at the shallow rim.
  for (let i = 0; i < 2600; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
    const x = SUNKEN.lake.x + Math.cos(a) * SUNKEN.lake.rx * r;
    const y = SUNKEN.lake.y + Math.sin(a) * SUNKEN.lake.ry * r;
    if (!inSunkenWater(x, y)) continue;
    rect(g, x, y, 4 + rng() * 16, 1 + rng() * 2, r > .75 ? '#5f9aa0' : r > .45 ? '#2b5f68' : '#1a4049');
  }
}

function paintSand(g, rng) {
  rect(g, 0, 0, SUNKEN_W, SUNKEN_H, SAND_DARK);
  for (let i = 0; i < 26000; i++) {
    const x = rng() * SUNKEN_W, y = rng() * SUNKEN_H;
    rect(g, x, y, 2 + rng() * 9, 1 + rng() * 4, [SAND, '#b9a179', '#d6c49c', '#97835f', SAND][i % 5]);
  }
  // Dry weed and shell along the tide line.
  for (let i = 0; i < 5000; i++) {
    const x = rng() * SUNKEN_W, y = rng() * SUNKEN_H;
    if (!walkable(x, y) || !inSunkenWater(x, y, 90)) continue;
    rect(g, x, y, 2 + rng() * 5, 1 + rng() * 2, i % 3 ? '#8a8a6a' : '#e2dcc4');
  }
}

/** The causeway decks: cut stone, with the joints and the broken edges showing. */
function paintCauseway(g, rng) {
  for (const [width, color] of [[128, '#655d49'], [118, '#b3aa8c'], [98, '#99957c']])
    for (const p of SUNKEN_PATHS) path(g, p, width, color);
  for (const p of SUNKEN_PATHS) for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    for (let d = 12; d < len; d += 32) {
      const x = a[0] + (b[0] - a[0]) * d / len, y = a[1] + (b[1] - a[1]) * d / len;
      path(g, [[x - nx * 48, y - ny * 48], [x + nx * 48, y + ny * 48]], 2, '#7d7a64');
      path(g, [[x, y], [x + (b[0] - a[0]) / len * 24, y + (b[1] - a[1]) / len * 24]], 1, '#b8b096');
      if (rng() < .35) rect(g, x + nx * 35, y + ny * 35, 6, 4, '#69785b');
    }
  }
}

/** The throne platform: a wide ring of floor with a sunken court at its middle. */
function paintThrone(g, rng) {
  const { x, y } = SUNKEN.throne;
  rect(g, x - 238, y - 156, 476, 306, '#787761');
  rect(g, x - 229, y - 147, 458, 288, '#b6b091');
  rect(g, x - 215, y - 133, 430, 260, '#939980');
  for (let i = -6; i <= 6; i++) path(g, [[x + i * 32, y - 132], [x + i * 32, y + 126]], 1, '#747d68');
  for (let i = -4; i <= 3; i++) path(g, [[x - 215, y + i * 32], [x + 215, y + i * 32]], 1, '#747d68');
  const diamond = [[x, y - 90], [x + 132, y], [x, y + 90], [x - 132, y]];
  poly(g, diamond, '#586f64');
  poly(g, [[x, y - 70], [x + 105, y], [x, y + 70], [x - 105, y]], '#b6ad83');
  poly(g, [[x, y - 54], [x + 80, y], [x, y + 54], [x - 80, y]], '#687d6d');
  for (let i = 0; i < 65; i++) {
    const tx = x - 210 + rng() * 420, ty = y - 130 + rng() * 260;
    rect(g, tx, ty, 2 + rng() * 7, 2, '#b6b091');
  }
}

/** Roofless houses on the western sand, drawn into the ground as footings. */
function paintVillage(g, rng) {
  const v = SUNKEN.village;
  // Footings occupy the same terraces as their standing walls.
  for (const b of SUNKEN.houses) {
    rect(g, b.x - b.w / 2 - 4, b.y - b.h / 2 - 4, b.w + 8, b.h + 8, '#7a6d57');
    rect(g, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, '#9c8c6e');
    rect(g, b.x - b.w / 2 + 5, b.y - b.h / 2 + 5, b.w - 10, b.h - 10, '#b5a07a');
  }
}

/** The burned stair in the north: scorched ground and a black mouth. */
function paintDepths(g, rng) {
  const d = SUNKEN.depths;
  ellipse(g, d.x, d.y - 38, 146, 78, '#6a5a4a');
  ellipse(g, d.x, d.y - 38, 114, 64, '#4c3f34');
  ellipse(g, d.x, d.y - 38, 76, 48, '#2e2620');
  for (let i = 0; i < 700; i++) {
    const a = rng() * Math.PI * 2, k = Math.sqrt(rng());
    rect(g, d.x + Math.cos(a) * 140 * k, d.y - 38 + Math.sin(a) * 72 * k, 2 + rng() * 6, 1 + rng() * 3,
      i % 4 ? '#3a302a' : '#8a5a32');
  }
  rect(g, d.x - 46, d.y - 26, 92, 62, '#1a1614');
  rect(g, d.x - 38, d.y - 18, 76, 50, '#0c0a0a');
}

/** The flooded halls: a floor you can see under the water, and the falls' spray. */
function paintHalls(g, rng) {
  const h = SUNKEN.halls;
  rect(g, h.x - 160, h.y - 110, 320, 230, '#6a776d');
  rect(g, h.x - 150, h.y - 100, 300, 210, '#889486');
  for (let i = 0; i < 10; i++) {
    for (let k = 0; k < 10; k++) {
      const x = h.x - h.r * .7 + i * h.r * .155, y = h.y - h.r * .55 + k * h.r * .12;
      if (Math.hypot((x - h.x) / h.r, (y - h.y) / (h.r * .8)) > .92) continue;
      rect(g, x, y, h.r * .12, h.r * .09, (i + k) % 2 ? '#8a9a89' : '#7b8d80');
    }
  }
  rect(g, h.x - 54, h.y - 30, 108, 70, '#14333b');
  rect(g, h.x - 44, h.y - 22, 88, 58, '#0e252c');
}

function paintParcel(g, p, rng) {
  if (p.height) {
    poly(g, p.points.map(([x, y]) => [x + 12, y + p.height + 12]), '#102e3044');
    poly(g, p.points.map(([x, y]) => [x, y + p.height]), '#504c3d');
  }
  poly(g, p.points, '#6c6851');
  poly(g, p.points, p.floor);
  const xs = p.points.map(v => v[0]), ys = p.points.map(v => v[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  for (let i = 0; i < 1600; i++) {
    const x = minX + rng() * (maxX - minX), y = minY + rng() * (maxY - minY);
    if (!insideSunkenLand(x, y, p, 12)) continue;
    rect(g, x, y, 2 + rng() * 8, 1 + rng() * 3, i % 3 ? '#d0c29b44' : '#625e4844');
  }
  if (p.id !== 'west-bank') {
    for (let y = minY + 24; y < maxY; y += 38) for (let x = minX + (y % 76 ? 0 : 20); x < maxX; x += 46) {
      if (!insideSunkenLand(x + 18, y + 12, p, 26) || rng() < .35) continue;
      rect(g, x, y, 35, 23, '#cec4a226');
      path(g, [[x, y + 23], [x + 35, y + 23], [x + 35, y]], 1, '#5a63542a');
    }
  }
  g.save();
  g.beginPath();
  p.points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath(); g.clip();
  for (const route of SUNKEN_PATHS) path(g, route, 80, p.id === 'gardens' ? '#b0ac85' : '#c2b48f');
  for (let i = 0; i < 420; i++) {
    const x = minX + rng() * (maxX - minX), y = minY + rng() * (maxY - minY);
    if (!onCauseway(x, y, 37)) continue;
    rect(g, x, y, 12 + rng() * 12, 8 + rng() * 6, i % 3 ? '#aca485' : '#d0c19b');
  }
  g.restore();
  path(g, [...p.points, p.points[0]], p.height ? 5 : 3, '#d0c39c');
}

function paintWalls(g) {
  for (const w of SUNKEN_WALLS) {
    poly(g, w.points, '#625b47');
    const [ax, ay] = w.a, [bx, by] = w.b;
    for (let row = 12; row < w.height; row += 14) {
      path(g, [[ax, ay + row], [bx, by + row]], 2, row % 28 ? '#817354' : '#494c3d');
      for (let x = bx + (row % 28 ? 20 : 0); x < ax; x += 40) {
        const y = by + (ay - by) * (x - bx) / (ax - bx);
        path(g, [[x, y + row - 12], [x, y + row]], 2, '#484b3d');
      }
    }
    path(g, [w.a, w.b], 7, '#d2c39a');
    path(g, [[ax, ay + w.height - 3], [bx, by + w.height - 3]], 5, '#35574e');
    // Ivy descends from the lip, leaving the stairs entirely clear.
    for (let x = bx + 20; x < ax - 12; x += 57) {
      const y = by + (ay - by) * (x - bx) / (ax - bx);
      if (onSunkenStairs(x, y + 10, -24)) continue;
      for (let i = 0; i < 4; i++) rect(g, x + i % 2 * 4, y + i * 7, 6, 10, i % 2 ? '#6b8051' : '#45634c');
    }
  }
  for (const s of SUNKEN_STAIRS) {
    rect(g, s.x - s.w / 2 - 9, s.y - 20, s.w + 18, s.h + 56, '#5f5b49');
    rect(g, s.x - s.w / 2, s.y - 20, s.w, s.h + 56, '#b2a789');
    for (let y = s.y - 16; y < s.y + s.h + 30; y += 8) {
      rect(g, s.x - s.w / 2 + 5, y, s.w - 10, 3, '#d0c6a5');
      rect(g, s.x - s.w / 2 + 5, y + 4, s.w - 10, 3, '#77725d');
    }
    for (const side of [-1, 1]) rect(g, s.x + side * (s.w / 2 + 5) - 3, s.y - 24, 6, s.h + 58, '#d0c39c');
  }
}

function paintGardens(g, rng) {
  // Old irrigation beds on the high terrace; greenery is contained by masonry.
  for (const [x, y, w, h] of [[2080,780,124,300],[2410,760,180,130],[2450,1020,180,170],[2040,1080,110,70]]) {
    rect(g, x - 5, y - 5, w + 10, h + 10, '#c7bd93');
    rect(g, x, y, w, h, '#576d4d');
    for (let i = 0; i < 180; i++) {
      const tx = x + rng() * w, ty = y + rng() * h;
      rect(g, tx, ty, 3 + rng() * 6, 3, i % 4 ? '#89995a' : '#d0b576');
    }
  }
  // Shallow irrigation gutters empty over the retaining lip into the canal.
  for (const f of SUNKEN.falls) {
    rect(g, f.x - 9, f.y - 126, 18, 46, '#bcb895');
    rect(g, f.x - 5, f.y - 126, 10, 46, '#59877d');
    path(g, [[f.x, f.y - 124], [f.x, f.y - 80]], 2, '#a2c4aa');
  }
  // Sand-buried market carpets, broken pots, and old mooring bollards.
  for (const [x, y] of [[420,775],[720,865],[700,1220],[840,1800],[1310,2270],[1680,2270],[2460,1830]]) {
    rect(g, x - 23, y - 15, 46, 30, '#795746');
    rect(g, x - 19, y - 11, 38, 22, '#a9835b');
    for (let i = -2; i <= 2; i++) path(g, [[x - 19, y + i * 4], [x + 19, y + i * 4]], 1, '#c4a577');
    ellipse(g, x + 32, y + 12, 10, 6, '#554936');
    ellipse(g, x + 31, y + 8, 8, 6, '#b18a5c');
    ellipse(g, x + 31, y + 6, 4, 3, '#4d4535');
  }
  for (let x = 2080; x < 2600; x += 105) {
    rect(g, x, 1900, 9, 15, '#766347');
    rect(g, x - 3, 1897, 15, 5, '#b9a67c');
  }
}

export function paintSunken(g, rng) {
  paintSand(g, rng);
  paintWater(g, rng);
  paintCauseway(g, rng);
  for (const p of SUNKEN_LAND) paintParcel(g, p, rng);
  paintWalls(g);
  paintVillage(g, rng);
  paintDepths(g, rng);
  paintHalls(g, rng);
  paintThrone(g, rng);
  paintGardens(g, rng);
  for (const f of SUNKEN_FIRES) {
    ellipse(g, f.x, f.y + 5, 60, 36, '#756e59');
    ellipse(g, f.x, f.y + 3, 34, 21, '#4e4b40');
    rect(g, f.x + 37, f.y - 12, 20, 40, '#464d43');
    rect(g, f.x + 39, f.y - 10, 16, 9, '#a49672');
    path(g, [[f.x + 39, f.y + 14], [f.x + 55, f.y + 14]], 2, '#79836b');
  }
  for (let i = 0; i < 5500; i++) {
    const x = rng() * SUNKEN_W, y = rng() * SUNKEN_H;
    if (inSunkenWater(x, y, 10) || sunkenCliffBlocked(x, y, 16) || onCauseway(x, y, 90)) continue;
    if (SUNKEN_LAND.some(p => p.id !== 'west-bank' && insideSunkenLand(x, y, p))) continue;
    const patch = Math.sin(x * .016) + Math.cos(y * .022) + Math.sin((x + y) * .009);
    if (patch < 1.05) continue;
    for (let k = 0; k < 4; k++) {
      const tx = x + k * 3;
      path(g, [[tx, y], [tx - 2, y - 4 - rng() * 5]], 1, k % 2 ? '#8d9360' : '#6c7c52');
    }
  }
  for (const [x, y] of SUNKEN.colonnade) {
    ellipse(g, x, y + 6, 30, 15, '#00000044');
    ellipse(g, x, y + 4, 24, 12, '#77765e');
  }
}

/** A cached, water-only phosphorescent veil; the banks and decks stay unlit. */
function buildWaterGlow() {
  const glow = document.createElement('canvas');
  glow.width = SUNKEN_W / 4; glow.height = SUNKEN_H / 4;
  const g = glow.getContext('2d');
  for (let y = 0; y < SUNKEN_H; y += 12) for (let x = 0; x < SUNKEN_W; x += 12) {
    if (!inSunkenWater(x + 6, y + 6, -14) || sunkenCliffBlocked(x + 6, y + 6, 16)) continue;
    let clearance = 220;
    for (const p of SUNKEN_LAND) for (let i = 0; i < p.points.length; i++)
      clearance = Math.min(clearance, segmentDistance(x + 6, y + 6, p.points[i], p.points[(i + 1) % p.points.length]));
    for (const p of SUNKEN_PATHS) for (let i = 1; i < p.length; i++)
      clearance = Math.min(clearance, segmentDistance(x + 6, y + 6, p[i - 1], p[i]) - CAUSEWAY_HALF);
    const shimmer = (Math.sin(x * .015 + y * .01) + Math.cos(y * .018)) * .008;
    g.fillStyle = `rgba(73,184,166,${.1 + .27 * Math.exp(-Math.max(0, clearance) / 65) + shimmer})`;
    g.fillRect(x / 4, y / 4, 3, 3);
  }
  return glow;
}

function buildWaterMotes() {
  const rng = createRng(9027), motes = [];
  for (let i = 0; i < 6000 && motes.length < 100; i++) {
    const x = 300 + rng() * 2400, y = 400 + rng() * 1800;
    if (!inSunkenWater(x, y, -42) || sunkenCliffBlocked(x, y, 42)) continue;
    if (motes.some(m => Math.hypot(m.x - x, m.y - y) < 65)) continue;
    motes.push({ x, y, phase: rng() * Math.PI * 2 });
  }
  return motes;
}

/** One seed for the ground, as in the grove, so a repaint lands identically. */
const SUNKEN_PAINT_SEED = 4477;

export function buildSunken() {
  const rng = createRng(3319);
  const canvas = document.createElement('canvas');
  canvas.width = SUNKEN_W;
  canvas.height = SUNKEN_H;
  paintSunken(canvas.getContext('2d', { willReadFrequently: true }), createRng(SUNKEN_PAINT_SEED));

  // Palms gather around the surviving garden beds and sheltered banks.
  const trees = [];
  let tries = 0;
  while (trees.length < 110 && tries++ < 9000) {
    const anchor = [[360,1280],[720,1530],[2470,950],[2500,1630],[1340,2180],[1870,550]][Math.floor(rng() * 6)];
    const clustered = rng() < .55;
    const x = clustered ? anchor[0] + (rng() - .5) * 320 : 70 + rng() * (SUNKEN_W - 140);
    const y = clustered ? anchor[1] + (rng() - .5) * 280 : 70 + rng() * (SUNKEN_H - 140);
    if (!walkable(x, y) || sunkenCliffBlocked(x, y, 36) || onCauseway(x, y, 104)) continue;
    if (Math.hypot(x - SUNKEN.village.x, y - SUNKEN.village.y) < SUNKEN.village.r) continue;
    if (Math.hypot(x - SUNKEN.depths.x, y - SUNKEN.depths.y) < SUNKEN.depths.r) continue;
    if (Math.hypot(x - SUNKEN.halls.x, y - SUNKEN.halls.y) < SUNKEN.halls.r) continue;
    // The court is swept stone; nothing has taken root on it.
    if (Math.hypot(x - SUNKEN.throne.x, (y - SUNKEN.throne.y) / .78) < SUNKEN.throne.r + 40) continue;
    if (Math.hypot(x - SUNKEN.gate.x, y - SUNKEN.gate.y) < 220) continue;
    if (SUNKEN.houses.some(b => Math.abs(x - b.x) < b.w / 2 + 48 && Math.abs(y - b.y) < b.h / 2 + 48)) continue;
    if (SUNKEN.colonnade.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 50)) continue;
    if (SUNKEN_FIRES.some(f => Math.hypot(x - f.x, y - f.y) < 110) || SUNKEN_TORCHES.some(f => Math.hypot(x - f.x, y - f.y) < 40)) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.y - y) < 78)) continue;
    trees.push({ x, y, hp: 40, max: 40, s: 1, regrow: 0, kind: 'palm', lush: trees.length % 4 !== 0 });
  }

  // Saltbush clusters leave the decks, buildings and landmark approaches clear.
  for (let i = 0; i < 6000 && trees.filter(t => t.bush).length < 110; i++) {
    const x = 70 + rng() * (SUNKEN_W - 140), y = 70 + rng() * (SUNKEN_H - 140);
    if (inSunkenWater(x, y, 24) || sunkenCliffBlocked(x, y, 24) || onCauseway(x, y, 90)) continue;
    if (Math.hypot(x - SUNKEN.throne.x, (y - SUNKEN.throne.y) / .78) < 380) continue;
    if ([...SUNKEN_FIRES, SUNKEN.depths, SUNKEN.halls, SUNKEN.gate, SUNKEN.shop].some(p => Math.hypot(x - p.x, y - p.y) < 100)) continue;
    if (SUNKEN.houses.some(b => Math.abs(x - b.x) < b.w / 2 + 40 && Math.abs(y - b.y) < b.h / 2 + 40)) continue;
    if (trees.some(t => Math.hypot(x - t.x, y - t.y) < 42)) continue;
    trees.push({ x, y, s: .7 + rng() * .5, bush: true, desert: true, hp: 20, max: 20, regrow: 0 });
  }

  // What is still living in the bowl. Each keeps to a patch of open water and
  // circles it; nothing can be fought, and nothing comes out.
  const swimmers = [];
  let stries = 0;
  while (swimmers.length < 34 && stries++ < 20000) {
    const x = 200 + rng() * (SUNKEN_W - 400), y = 200 + rng() * (SUNKEN_H - 400);
    if (!inSunkenWater(x, y, 90)) continue;
    if (swimmers.some(w => Math.hypot(w.x - x, w.y - y) < 140)) continue;
    const big = swimmers.length % 7 === 0;
    const r = big ? 60 + rng() * 40 : 20 + rng() * 28;
    // The whole orbit has to stay in open water, not merely its centre, or a
    // shark comes round and swims up the causeway. Checked against a grown
    // version of the land — a negative pad — so there is clearance, not a
    // near miss: a bigger pad would make more of the map count as water and
    // quietly weaken the very check it is meant to tighten.
    let clear = true;
    for (let i = 0; i < 16 && clear; i++) {
      const t = i / 16 * Math.PI * 2;
      if (!inSunkenWater(x + Math.cos(t) * r, y + Math.sin(t) * r * .62, -26)) clear = false;
    }
    if (!clear) continue;
    swimmers.push({
      x, y, r,
      kind: big ? 'shark' : rng() < .35 ? 'ray' : 'fish',
      size: big ? 1.5 + rng() * .5 : .55 + rng() * .5,
      speed: big ? .18 + rng() * .1 : .32 + rng() * .34,
      phase: rng() * 6.28,
      depth: .35 + rng() * .4,
    });
  }

  const critters = [];
  while (critters.length < 48 && tries++ < 14000) {
    const x = 90 + rng() * (SUNKEN_W - 180), y = 90 + rng() * (SUNKEN_H - 180);
    if (inSunkenWater(x, y, 35) || sunkenCliffBlocked(x, y, 16) || onCauseway(x, y, 72)) continue;
    if (SUNKEN.houses.some(b => Math.abs(x - b.x) < b.w / 2 + 30 && Math.abs(y - b.y) < b.h / 2 + 30)) continue;
    if (critters.some(k => Math.hypot(k.x - x, k.y - y) < 110)) continue;
    critters.push({ x, y, homeX: x, homeY: y, kind: ['hare', 'beetle', 'lizard'][critters.length % 3], phase: rng() * 6.28, flee: 0, alpha: 1, back: 0 });
  }

  return {
    key: 'sunken',
    size: { w: SUNKEN_W, h: SUNKEN_H },
    terrain: canvas,
    trees,
    veins: [],
    npcs: [
      ...SUNKEN_FIRES.map(f => ({ ...f, type: 'fire' })),
    ],
    solids: [
      ...SUNKEN_FIRES.map(f => ({ x: f.x, y: f.y + 4, rx: 20, ry: 11, name: f.name })),
      ...SUNKEN.colonnade.map(([x, y]) => ({ x, y, rx: 18, ry: 9, name: 'a fallen column' })),
      ...SUNKEN.houses.map(b => ({ x: b.x, y: b.y, rx: b.w / 2, ry: b.h / 2, name: 'a roofless house' })),
    ],
    props: {
      critters, swimmers, waterGlow: buildWaterGlow(), waterMotes: buildWaterMotes(), rain: 0, fireflies: 0,
      pools: [],
    },
    terrainBlocked: sunkenCliffBlocked,
    inWater: (x, y) => inSunkenWater(x, y, 6),
    bounds: { minX: 20, maxX: SUNKEN_W - 40, minY: 40, maxY: SUNKEN_H - 40 },
    fire: SUNKEN.fire,
    /** Back west along the road to the grove, stepping out through the gate. */
    exits: [{ x0: 0, x1: 34, y0: 1400, y1: 1620, to: 'echo', at: { x: 2788, y: 1756 } }],
  };
}
