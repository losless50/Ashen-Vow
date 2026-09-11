// The world map, repainted in the game's own pixel style: the hearth's travel
// screen. The land is painted once into an offscreen layer; weather, fire and
// the selection are drawn live over it every frame while the map is open.
import { REGIONS } from '../world/regions.js';
import { rect, ellipse, poly, path, label } from './primitives.js';

export const MAP_W = 520, MAP_H = 460;
const INSET = 18;
const seeded = i => ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
const P = (x, y) => [INSET + x * (MAP_W - INSET * 2), INSET + y * (MAP_H - INSET * 2)];

/** Ground zones as blobs, painted in order so later ones sit on top. */
const ZONES = [
  { key: 'forest',  pts: [[.06, .30], [.30, .10], [.62, .06], [.90, .16], [.97, .50], [.92, .88], [.62, .98], [.30, .96], [.06, .78], [.03, .52]], color: '#26352a', edge: '#1a271f' },
  { key: 'autumn',  pts: [[.05, .34], [.19, .33], [.30, .44], [.27, .62], [.12, .64], [.04, .52]], color: '#5a3a22', edge: '#3d2617' },
  { key: 'marsh',   pts: [[.05, .60], [.24, .58], [.40, .68], [.36, .90], [.16, .92], [.04, .78]], color: '#22301f', edge: '#182416' },
  { key: 'grove',   pts: [[.34, .62], [.62, .60], [.68, .80], [.56, .96], [.36, .94], [.30, .78]], color: '#14261c', edge: '#0f1c15' },
  { key: 'cliffs',  pts: [[.66, .34], [.86, .30], [.94, .50], [.90, .64], [.70, .66], [.62, .50]], color: '#4f4b48', edge: '#3a3634' },
  { key: 'sand',    pts: [[.74, .60], [.98, .56], [.99, .88], [.80, .98], [.62, .92], [.66, .74]], color: '#7c6a45', edge: '#5b4c32' },
  { key: 'blight',  pts: [[.54, .12], [.72, .10], [.88, .10], [.96, .30], [.86, .40], [.64, .36], [.56, .24]], color: '#3a2440', edge: '#281a2c' },
  { key: 'eldoria', pts: [[.70, .06], [.92, .05], [.98, .26], [.90, .34], [.76, .30], [.68, .18]], color: '#4b1d22', edge: '#33151a' },
  { key: 'snow',    pts: [[.20, .04], [.44, .00], [.70, .02], [.68, .18], [.50, .24], [.28, .22], [.16, .14]], color: '#8d97a3', edge: '#5f6a78' },
];
const zone = key => ZONES.find(z => z.key === key);

/** Splits every edge and nudges the new points, so no zone reads as a polygon. */
function roughen(pts, seed, amount = .018, rounds = 2) {
  let out = pts;
  for (let r = 0; r < rounds; r++) {
    const next = [];
    for (let i = 0; i < out.length; i++) {
      const [x0, y0] = out[i], [x1, y1] = out[(i + 1) % out.length];
      next.push([x0, y0]);
      const k = seed + r * 97 + i * 13;
      next.push([(x0 + x1) / 2 + (seeded(k) - .5) * amount, (y0 + y1) / 2 + (seeded(k + 1) - .5) * amount]);
    }
    out = next;
    amount *= .55;
  }
  return out;
}
for (let i = 0; i < ZONES.length; i++) ZONES[i].pts = roughen(ZONES[i].pts, i * 31 + 7, i === 0 ? .03 : .022, 3);

function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function speckle(c, z, n, colors) {
  const xs = z.pts.map(p => p[0]), ys = z.pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < n; i++) {
    const x = x0 + seeded(i * 3 + n) * (x1 - x0), y = y0 + seeded(i * 7 + n) * (y1 - y0);
    if (!inside(z.pts, x, y)) continue;
    rect(c, ...P(x, y), 2 + (i % 3), 1 + (i % 2), colors[i % colors.length]);
  }
}

function tree(c, x, y, color, dark) {
  poly(c, [[x - 4, y + 2], [x, y - 7], [x + 4, y + 2]], dark);
  poly(c, [[x - 3, y + 1], [x, y - 5], [x + 3, y + 1]], color);
  rect(c, x, y + 2, 1, 2, '#2a1e14');
}

function mountain(c, x, y, s) {
  poly(c, [[x - 12 * s, y + 6 * s], [x, y - 14 * s], [x + 12 * s, y + 6 * s]], '#4d5563');
  poly(c, [[x - 3 * s, y - 6 * s], [x, y - 14 * s], [x + 6 * s, y - 2 * s]], '#e9eef2');
  poly(c, [[x - 12 * s, y + 6 * s], [x - 5 * s, y - 4 * s], [x, y + 2 * s]], '#353c48');
  rect(c, x - 2 * s, y - 9 * s, 4 * s, 1, '#ffffff');
}

const RIVERS = [
  [[.10, .22], [.20, .38], [.28, .48], [.30, .62], [.34, .74], [.40, .90], [.42, .99]],
  [[.40, .30], [.48, .40], [.60, .42], [.68, .38], [.72, .30], [.80, .22]],
  [[.68, .38], [.72, .52], [.70, .66], [.78, .78], [.72, .90], [.62, .98]],
];
const WATERFALLS = [[.10, .22], [.28, .48], [.72, .52]];
const LAKE = { x: .53, y: .37, rx: .11, ry: .07 };
const LAKE_PTS = Array.from({ length: 16 }, (_, i) => [LAKE.x + Math.cos(i / 16 * Math.PI * 2) * LAKE.rx * 1.15, LAKE.y + Math.sin(i / 16 * Math.PI * 2) * LAKE.ry * 1.25]);

const ROADS = [
  ['hearthwood', 'echo'], ['hearthwood', 'mirror'], ['hearthwood', 'emberfall'], ['hearthwood', 'stonebloom'],
  ['echo', 'dreadmarsh'], ['echo', 'sunken'], ['emberfall', 'wolfspire'], ['wolfspire', 'frostveil'],
  ['mirror', 'blighted'], ['blighted', 'eldoria'], ['stonebloom', 'hollowroot'], ['hollowroot', 'sunken'], ['mirror', 'frostveil'],
];
const BRIDGES = [[.29, .60], [.41, .84], [.70, .60], [.66, .38]];
const pt = key => REGIONS.find(r => r.key === key).map;

function skull(c, x, y) {
  rect(c, x - 4, y - 6, 8, 7, '#0c0a12'); rect(c, x - 3, y - 5, 6, 5, '#efe9d8');
  rect(c, x - 2, y - 4, 2, 2, '#0c0a12'); rect(c, x + 1, y - 4, 2, 2, '#0c0a12');
  rect(c, x - 2, y + 1, 4, 2, '#efe9d8'); rect(c, x - 1, y + 1, 1, 2, '#0c0a12');
}

function crown(c, x, y) {
  poly(c, [[x - 6, y + 2], [x - 6, y - 5], [x - 3, y - 1], [x, y - 7], [x + 3, y - 1], [x + 6, y - 5], [x + 6, y + 2]], '#0c0a12');
  poly(c, [[x - 5, y + 1], [x - 5, y - 3], [x - 3, y], [x, y - 5], [x + 3, y], [x + 5, y - 3], [x + 5, y + 1]], '#d8343e');
  rect(c, x - 5, y, 10, 1, '#ffd77a');
}

function keep(c, x, y, color) {
  rect(c, x - 7, y - 4, 14, 8, '#0c0a12'); rect(c, x - 6, y - 3, 12, 6, color);
  for (const dx of [-6, -2, 2]) rect(c, x + dx, y - 6, 2, 3, color);
  rect(c, x - 1, y - 1, 2, 4, '#0c0a12');
  rect(c, x - 6, y - 3, 12, 1, '#ffffff33');
}

function logs(c, x, y) {
  ellipse(c, x, y + 4, 6, 2, '#00000066');
  for (const dx of [-4, 0, 4]) rect(c, x + dx - 1, y + 2, 3, 2, '#5c4630');
}

function flame(c, x, y, t, s = 1) {
  const f = Math.sin(t * 13 + x) * 1.5 * s, g = Math.sin(t * 9 + x * 2) * s;
  poly(c, [[x - 4 * s, y + 2], [x - 2 * s, y - 4 * s + f], [x, y - 8 * s + g], [x + 2 * s, y - 3 * s - f], [x + 4 * s, y + 2]], '#e8823c');
  poly(c, [[x - 2 * s, y + 2], [x - 1 * s, y - 2 * s + g], [x, y - 5 * s + f], [x + 1 * s, y - 1 * s], [x + 2 * s, y + 2]], '#ffd77a');
}

/** A dark plate behind a map name, the way the original lettered its places. */
function plate(c, x, y, text, color, size = 7) {
  const w = text.length * size * .62 + 8;
  rect(c, x - w / 2, y - size, w, size + 4, '#0d0b14cc');
  rect(c, x - w / 2, y - size, w, 1, '#6b564655');
  label(c, x, y, text, color, size);
}

function frame(c) {
  // Parchment-dark border with worked corners, the title, motto, legend, compass and scale.
  c.strokeStyle = '#3b3128'; c.lineWidth = 6; c.strokeRect(3, 3, MAP_W - 6, MAP_H - 6);
  c.strokeStyle = '#8a6f4d'; c.lineWidth = 1; c.strokeRect(7, 7, MAP_W - 14, MAP_H - 14);
  for (const [x, y] of [[7, 7], [MAP_W - 7, 7], [7, MAP_H - 7], [MAP_W - 7, MAP_H - 7]]) {
    const sx = x < MAP_W / 2 ? 1 : -1, sy = y < MAP_H / 2 ? 1 : -1;
    path(c, [[x, y + sy * 14], [x, y], [x + sx * 14, y]], 2, '#d4b877');
    rect(c, x + sx * 4 - 1, y + sy * 4 - 1, 3, 3, '#d4b877');
  }
  c.font = '700 20px Georgia, serif'; c.textAlign = 'left';
  c.fillStyle = '#0d0b14'; c.fillText('ASHEN', 19, 35); c.fillText('VOW', 19, 56);
  c.fillStyle = '#e6d5ad'; c.fillText('ASHEN', 18, 34); c.fillText('VOW', 18, 55);
  c.font = '6px monospace';
  c.fillStyle = '#9c8f7f';
  ['IN ASH,', 'WE REMEMBER.', 'IN VOW,', 'WE RISE.'].forEach((l, i) => c.fillText(l, 18, 70 + i * 8));
  // Legend, bottom right, out of the sea.
  const lx = MAP_W - 112, ly = MAP_H - 70;
  rect(c, lx, ly, 98, 56, '#0d0b14dd'); c.strokeStyle = '#8a6f4d'; c.lineWidth = 1; c.strokeRect(lx + .5, ly + .5, 97, 55);
  c.font = '6px monospace'; c.textAlign = 'left'; c.fillStyle = '#d4b877'; c.fillText('LEGEND', lx + 8, ly + 11);
  const line = (text, y) => { c.font = '6px monospace'; c.textAlign = 'left'; c.fillStyle = '#c9bfae'; c.fillText(text, lx + 26, y); };
  logs(c, lx + 14, ly + 22); flame(c, lx + 14, ly + 22, 0, .8); line('Campfire · rest', ly + 25);
  skull(c, lx + 14, ly + 36); line('Fallen · mini boss', ly + 38);
  crown(c, lx + 14, ly + 50); line('Main boss', ly + 51);
  // Compass and scale, bottom left.
  const cx = 34, cy = MAP_H - 44;
  ellipse(c, cx, cy, 13, 13, '#0d0b14cc'); c.strokeStyle = '#8a6f4d'; c.strokeRect(cx - 13.5, cy - 13.5, 27, 27);
  poly(c, [[cx, cy - 12], [cx + 3, cy], [cx, cy + 12], [cx - 3, cy]], '#d4b877');
  poly(c, [[cx - 12, cy], [cx, cy - 3], [cx + 12, cy], [cx, cy + 3]], '#8a6f4d');
  label(c, cx, cy - 15, 'N', '#e6d5ad', 7);
  rect(c, 58, MAP_H - 30, 60, 2, '#e6d5ad'); for (let i = 0; i <= 4; i++) rect(c, 58 + i * 15, MAP_H - 33, 1, 5, '#e6d5ad');
  c.font = '6px monospace'; c.textAlign = 'left'; c.fillStyle = '#9c8f7f'; c.fillText('0        1        2 km', 56, MAP_H - 20);
  c.font = '6px monospace'; c.fillStyle = '#9c8f7f'; c.textAlign = 'right'; c.fillText('SAME ROOTS. DEEPER SCARS.', MAP_W - 16, MAP_H - 78);
}

let land = null;
/** Everything that never moves, painted once and reused. */
function paintLand() {
  const off = document.createElement('canvas');
  off.width = MAP_W; off.height = MAP_H;
  const c = off.getContext('2d');
  c.imageSmoothingEnabled = false;
  rect(c, 0, 0, MAP_W, MAP_H, '#0d0b14');
  for (let i = 0; i < 90; i++) rect(c, seeded(i) * MAP_W, seeded(i + 40) * MAP_H, 3 + (i % 4), 1, '#16131f');

  // Cliff rim: a pale lip on the sunward side, shadow beneath, then each zone.
  const rim = ZONES[0].pts;
  poly(c, rim.map(([x, y]) => { const [px, py] = P(x, y); return [px + (x < .5 ? -5 : 5), py + (y < .5 ? -5 : 5)]; }), '#2a2420');
  poly(c, rim.map(([x, y]) => { const [px, py] = P(x, y); return [px + (x < .5 ? -3 : 3), py + (y < .5 ? -3 : 3)]; }), '#6a5f52');
  poly(c, rim.map(([x, y]) => { const [px, py] = P(x, y); return [px + (x < .5 ? -1 : 1), py + (y < .5 ? -1 : 1)]; }), '#3b3530');
  for (const z of ZONES) {
    poly(c, z.pts.map(p => P(...p)), z.edge);
    poly(c, z.pts.map(([x, y]) => P(x, y)).map(([x, y]) => [x + (x < MAP_W / 2 ? 2 : -2), y + 2]), z.color);
  }
  speckle(c, zone('forest'), 1100, ['#3c5233', '#1d2a21', '#4a6a3c', '#324a2d']);
  speckle(c, zone('autumn'), 260, ['#8a4a22', '#c9752d', '#3d2617']);
  speckle(c, zone('marsh'), 260, ['#3a5232', '#141c14', '#4c5a3a', '#2c3e6a']);
  speckle(c, zone('grove'), 300, ['#0c1a12', '#2a5a48', '#6fd6b0']);
  speckle(c, zone('cliffs'), 240, ['#6a6560', '#8a847e', '#b85a7a', '#e9a3bd']);
  speckle(c, zone('sand'), 240, ['#a08c5c', '#5b4c32', '#3b6a7a']);
  speckle(c, zone('blight'), 260, ['#5a3a66', '#2a1a30', '#8a5aa0']);
  speckle(c, zone('eldoria'), 200, ['#6a2a30', '#2a1216', '#c0453e']);
  speckle(c, zone('snow'), 200, ['#ffffff', '#6f7a88', '#c7d0da']);
  // Cliff hatching along the stony zones so they read as height, not paint.
  for (const key of ['cliffs', 'snow', 'eldoria']) {
    const z = zone(key);
    for (let i = 0; i < z.pts.length; i += 2) {
      const [x, y] = P(...z.pts[i]);
      path(c, [[x, y], [x + 2, y + 5]], 1, '#1a1720');
      path(c, [[x + 3, y], [x + 5, y + 4]], 1, '#9a948c55');
    }
  }

  for (let i = 0; i < 460; i++) {
    const x = seeded(i + 500), y = seeded(i + 900);
    if (!inside(zone('forest').pts, x, y) || inside(zone('snow').pts, x, y) || inside(zone('eldoria').pts, x, y) || inside(zone('cliffs').pts, x, y) || inside(zone('sand').pts, x, y)) continue;
    if (inside(LAKE_PTS, x, y)) continue;
    const s = .7 + seeded(i + 1300) * .7;
    c.save(); const [px, py] = P(x, y); c.translate(px, py); c.scale(s, s);
    tree(c, 0, 0, inside(zone('autumn').pts, x, y) ? (i % 2 ? '#c9752d' : '#8a4a22') : inside(zone('grove').pts, x, y) ? (i % 3 ? '#1d4a3a' : '#2f7a5c') : inside(zone('blight').pts, x, y) ? '#6a3a80' : inside(zone('marsh').pts, x, y) ? '#3f5a34' : (i % 3 ? '#4a7a3c' : '#5f9448'), '#101c14');
    c.restore();
  }
  for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
    const [mx, my] = P(.24 + i * .058 + row * .02, .09 + row * .05 + Math.sin(i * 1.7) * .02);
    mountain(c, mx, my, (.8 + seeded(i + 70 + row * 9) * .6) * (row ? .8 : 1));
  }

  for (const r of RIVERS) {
    const pts = r.map(p => P(...p));
    path(c, pts, 9, '#0f1c2c');
    path(c, pts, 6, '#183048');
    path(c, pts, 3, '#2c5d80');
    path(c, pts, 1, '#83bed4');
  }
  for (const [x, y] of WATERFALLS) { const [px, py] = P(x, y); for (let i = 0; i < 4; i++) rect(c, px - 3 + i * 2, py - 4 + (i % 2) * 2, 1, 8, '#e6f6fa'); ellipse(c, px, py + 6, 6, 2, '#e6f6fa88'); }
  const [lx, ly] = P(LAKE.x, LAKE.y), lrx = LAKE.rx * (MAP_W - INSET * 2), lry = LAKE.ry * (MAP_H - INSET * 2);
  ellipse(c, lx, ly, lrx + 4, lry + 4, '#0f1c2c');
  ellipse(c, lx, ly, lrx + 2, lry + 2, '#183048');
  ellipse(c, lx, ly, lrx, lry, '#2c5d80');
  keep(c, lx, ly - 4, '#5a5560'); rect(c, lx - 2, ly - 12, 4, 6, '#5a5560');

  for (const [a, b] of ROADS) {
    const [ax, ay] = P(pt(a).x, pt(a).y), [bx, by] = P(pt(b).x, pt(b).y);
    const n = Math.round(Math.hypot(bx - ax, by - ay) / 6);
    for (let i = 0; i < n; i += 2) {
      const t = i / n, t2 = Math.min(1, (i + 1) / n);
      path(c, [[ax + (bx - ax) * t, ay + (by - ay) * t], [ax + (bx - ax) * t2, ay + (by - ay) * t2]], 2, '#b8944f');
    }
  }
  for (const [x, y] of BRIDGES) { const [px, py] = P(x, y); rect(c, px - 5, py - 2, 10, 5, '#5a4630'); rect(c, px - 5, py - 1, 10, 1, '#b7a16b'); rect(c, px - 5, py + 2, 10, 1, '#b7a16b'); }

  // Vignette so the corners fall into shadow like the painted original.
  for (let i = 0; i < 5; i++) {
    c.globalAlpha = .12;
    c.strokeStyle = '#000'; c.lineWidth = 16 + i * 10; c.strokeRect(-8 - i * 5, -8 - i * 5, MAP_W + 16 + i * 10, MAP_H + 16 + i * 10);
  }
  c.globalAlpha = 1;
  return off;
}

// --- weather --------------------------------------------------------------------
const CLOUDS = Array.from({ length: 9 }, (_, i) => ({
  x: seeded(i + 2000) * MAP_W, y: (i % 3 === 0 ? .08 : i % 3 === 1 ? .22 : .9) * MAP_H + seeded(i + 2100) * 40 - 20,
  w: 36 + seeded(i + 2200) * 50, speed: 3 + seeded(i + 2300) * 4, drift: i % 2 ? 1 : -1, alpha: .3 + seeded(i + 2400) * .25,
}));

function cloud(c, x, y, w, alpha) {
  c.globalAlpha = alpha;
  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * w * .28, r = w * (.18 + (i % 2) * .08);
    ellipse(c, x + ox, y + (i % 2) * 3, r, r * .55, '#1a1a26');
  }
  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * w * .28, r = w * (.14 + (i % 2) * .07);
    ellipse(c, x + ox, y - 2 + (i % 2) * 3, r, r * .5, '#3a3a4a');
  }
  c.globalAlpha = 1;
}

function rain(c, z, t, n, color) {
  const xs = z.pts.map(p => p[0]), ys = z.pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < n; i++) {
    const x = x0 + seeded(i * 5 + 77) * (x1 - x0);
    const y = y0 + ((seeded(i * 9 + 91) + t * (.10 + (i % 3) * .03)) % 1) * (y1 - y0);
    if (!inside(z.pts, x, y)) continue;
    const [px, py] = P(x, y);
    path(c, [[px, py], [px - 1, py + 4]], 1, color);
  }
}

function fog(c, t) {
  c.globalAlpha = .1;
  for (let i = 0; i < 10; i++) {
    const [x, y] = P(...ZONES[0].pts[(i * 7) % ZONES[0].pts.length]);
    ellipse(c, x + Math.sin(t * .5 + i) * 8, y + Math.cos(t * .4 + i * 2) * 5, 22 + (i % 3) * 8, 9, '#c9d3dd');
  }
  c.globalAlpha = 1;
}

/**
 * Paints the whole map: the cached land, then live weather, fires, marks and
 * names. `found` are region keys whose fire has been sat beside, `here` the
 * current region, `selected` the one tapped.
 */
export function drawWorldMap(c, { found = [], here = 'hearthwood', selected = null, time = 0 } = {}) {
  land ??= paintLand();
  c.imageSmoothingEnabled = false;
  c.drawImage(land, 0, 0);
  const t = time;

  // Lake shimmer and river glints.
  const [lx, ly] = P(LAKE.x, LAKE.y), lrx = LAKE.rx * (MAP_W - INSET * 2), lry = LAKE.ry * (MAP_H - INSET * 2);
  for (let i = 0; i < 16; i++) {
    const x = lx - lrx * .8 + ((seeded(i + 33) + t * .03 * (1 + i % 3)) % 1) * lrx * 1.6, y = ly - lry * .7 + seeded(i + 55) * lry * 1.4;
    c.globalAlpha = .4 + .4 * Math.abs(Math.sin(t * 2 + i));
    rect(c, x, y, 4 + (i % 3) * 2, 1, '#83bed4');
  }
  c.globalAlpha = 1;
  rain(c, zone('marsh'), t, 60, '#8fa5c0aa');
  rain(c, zone('blight'), t, 50, '#b48ad0aa');
  fog(c, t);

  for (const r of REGIONS) {
    const [x, y] = P(r.map.x, r.map.y);
    const known = found.includes(r.key) || r.key === here;
    if (r.key === 'hearthwood') {
      for (const [dx, dy] of [[-9, 2], [9, 2]]) { poly(c, [[x + dx - 6, y + dy + 4], [x + dx, y + dy - 4], [x + dx + 6, y + dy + 4]], '#0c0a12'); poly(c, [[x + dx - 4, y + dy + 3], [x + dx, y + dy - 2], [x + dx + 4, y + dy + 3]], '#a58a5c'); }
    } else if (r.boss === 'crown') keep(c, x, y - 12, r.key === 'eldoria' ? '#7a2a30' : '#7c8794');
    else if (r.key === 'emberfall' || r.key === 'sunken' || r.key === 'wolfspire') keep(c, x, y - 12, '#4f4a46');
    c.globalAlpha = known ? 1 : .4;
    if (r.boss === 'skull') skull(c, x + 12, y - 8);
    if (r.boss === 'crown') crown(c, x + 14, y - 10);
    logs(c, x, y + 6);
    if (known) {
      c.globalAlpha = .18 + Math.sin(t * 5 + x) * .04;
      ellipse(c, x, y + 4, 14, 8, '#ffb65e');
      c.globalAlpha = 1;
      flame(c, x, y + 6, t);
    } else rect(c, x - 2, y + 5, 4, 3, '#3a3238');
    c.globalAlpha = 1;
    if (r.key === selected) {
      c.strokeStyle = '#ffd77a';
      c.lineWidth = 1;
      const pulse = 1 + Math.sin(t * 6) * 1.5;
      c.strokeRect(x - 13 - pulse, y - 18 - pulse, 26 + pulse * 2, 30 + pulse * 2);
    }
    if (r.key === here) { const bob = Math.sin(t * 4) * 1.5; rect(c, x - 1, y - 22 + bob, 2, 5, '#fff2c4'); poly(c, [[x - 4, y - 24 + bob], [x, y - 28 + bob], [x + 4, y - 24 + bob]], '#fff2c4'); }
    plate(c, x, y + 20, known ? r.name.toUpperCase() : '· · ·', known ? '#f0e8d3' : '#8a8078', 7);
  }

  for (const k of CLOUDS) {
    const x = ((k.x + t * k.speed * k.drift) % (MAP_W + 120) + MAP_W + 120) % (MAP_W + 120) - 60;
    cloud(c, x, k.y + Math.sin(t * .3 + k.x) * 3, k.w, k.alpha);
  }
  // The chrome sits above the weather.
  frame(c);
}

/** The region under a point on the map, if any is close enough to tap. */
export function regionAt(x, y, radius = 24) {
  let best = null, bestD = radius;
  for (const r of REGIONS) {
    const [rx, ry] = P(r.map.x, r.map.y);
    const d = Math.hypot(rx - x, ry - y + 4);
    if (d < bestD) { best = r; bestD = d; }
  }
  return best;
}
