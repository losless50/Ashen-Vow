import { W, H } from '../core/state.js';
import { rect, ellipse, poly, path } from '../render/primitives.js';
import { QUARRY } from './quarry.js';
import { createRng } from '../core/rng.js';
import { HEARTHWOOD_ROADS, HEARTHWOOD_RIVER } from './hearthwood.js';

/**
 * Paints the static world into an offscreen canvas exactly once.
 * Consumes the shared world RNG — see core/rng.js before touching the order.
 */
export function paintTerrain(g, rand) {
  groundAndPaths(g, rand);
  river(g, rand);
  scatter(g, rand);
  sanctuaryExterior(g, rand);
  quarryGround(g, rand);
  bridge(g);
}

/** Broken grass and soil boundaries instead of concentric circles. */
function earthPatch(g, x, y, rx, ry, color, phase = 0) {
  poly(g, Array.from({ length: 72 }, (_, i) => {
    const a = i / 72 * Math.PI * 2;
    const r = .96 + .025 * Math.sin(a * 5 + phase) + .015 * Math.sin(a * 11 + phase);
    return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r];
  }), color);
}

function wornRoads(g) {
  const rng = createRng(8193);
  for (const [width, color] of [[62, '#49432e'], [48, '#655035'], [34, '#80633e']])
    for (const road of HEARTHWOOD_ROADS) path(g, road, width, color);
  for (const road of HEARTHWOOD_ROADS) for (let i = 1; i < road.length; i++) {
    const [x0, y0] = road[i - 1], [x1, y1] = road[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (!length) continue;
    const nx = -(y1 - y0) / length, ny = (x1 - x0) / length;
    for (let d = 0; d < length; d += 5) {
      const x = x0 + (x1 - x0) * d / length, y = y0 + (y1 - y0) * d / length;
      for (const side of [-1, 1]) {
        const off = side * (20 + rng() * 13);
        ellipse(g, x + nx * off, y + ny * off, 2 + rng() * 4, 1 + rng() * 3, rng() < .5 ? '#514630' : '#655035');
      }
      const off = (rng() - .5) * 31;
      rect(g, x + nx * off, y + ny * off, 2 + rng() * 4, 1 + rng() * 2, rng() < .65 ? '#9b7b50' : '#5c4932');
    }
  }
}

function groundAndPaths(g, rand) {
  rect(g, 0, 0, W, H, '#292e29');
  for (let i = 0; i < 5500; i++) {
    const x = rand() * W, y = rand() * H;
    rect(g, x, y, 3 + rand() * 11, 2 + rand() * 5, ['#3c422f', '#575b36', '#1c2423', '#323928', '#655b37'][i % 5]);
  }
  earthPatch(g, 693, 604, 249, 177, '#3e3b2b');
  earthPatch(g, 694, 602, 235, 167, '#50422f');
  earthPatch(g, 694, 602, 215, 151, '#624831');
  // Smaller worn aprons tie the working areas and sanctuary steps into the trail.
  earthPatch(g, 447, 570, 68, 55, '#50422f', 2);
  earthPatch(g, 800, 281, 85, 38, '#50422f', 1);
  wornRoads(g);
  for (let i = 0; i < 2300; i++) {
    const x = rand() * W, y = rand() * H;
    const p = g.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (p[0] > 105 && x < 1035) rect(g, x, y, 2 + rand() * 4, 2, i % 2 ? '#c9a566' : '#493027');
  }
}

function river(g, rand) {
  const bank = HEARTHWOOD_RIVER;
  path(g, bank, 151, '#333b3d');
  path(g, bank, 127, '#766c58');
  path(g, bank, 107, '#162d43');
  path(g, bank.map(([x, y]) => [x + 10, y]), 67, '#285069');
  for (let i = 0; i < 250; i++) {
    const y = rand() * H, x = 1090 + Math.sin(y / 140) * 22 + rand() * 47;
    rect(g, x, y, 6 + rand() * 17, 2, '#83bed4');
  }
}

function bridge(g) {
  for (let x = 1030; x < 1200; x += 12) {
    rect(g, x, 588, 11, 82, '#705e3f');
    rect(g, x + 1, 591, 8, 76, '#b7a16b');
    rect(g, x + 1, 594, 7, 2, '#cebb83');
  }
  rect(g, 1021, 594, 185, 5, '#554d35');
  rect(g, 1021, 658, 185, 5, '#554d35');
  for (const x of [1025, 1075, 1145, 1197]) {
    rect(g, x, 580, 5, 24, '#c3ae78');
    rect(g, x, 649, 5, 24, '#c3ae78');
  }
}

function scatter(g, rand) {
  for (let i = 0; i < 1600; i++) {
    const x = rand() * W, y = rand() * H;
    if (x > 1035 && x < 1200) continue;
    const p = g.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (p[0] > 95) continue;
    rect(g, x, y, 2, 5, '#383b30');
    rect(g, x - 2, y + 1, 2, 2, '#7e7752');
    if (i % 5 === 0) rect(g, x - 1, y - 2, 3, 3, ['#dfc680', '#c9bdae', '#978094'][i % 3]);
  }
  for (let i = 0; i < 750; i++) {
    const x = 460 + rand() * 470, y = 460 + rand() * 280;
    if (((x - 693) / 225) ** 2 + ((y - 604) / 150) ** 2 > 1) continue;
    rect(g, x, y, 2 + rand() * 3, 1, i % 3 ? '#c6a47c55' : '#37292355');
  }
  for (let i = 0; i < 4200; i++) {
    const x = rand() * W, y = rand() * H;
    if (x > 1040 && x < 1190) continue;
    rect(g, x, y, 1 + rand() * 3, 1, i % 4 ? '#18151c24' : '#d6b9a128');
  }
  for (let i = 0; i < 45; i++) {
    const x = 570 + rand() * 340, y = 340 + rand() * 470;
    path(g, [[x, y], [x + 6, y + 3], [x + 11, y + 1]], 1, '#32273040');
  }
}

// Raised masonry and an ancient glowing entrance north of the camp.
/** The sanctuary front, painted 20 px up from where the road now stops. */
const SANCTUARY_LIFT = 20;

function sanctuaryExterior(g, rand) {
  g.save();
  g.translate(0, -SANCTUARY_LIFT);
  rect(g, 672, 198, 266, 62, '#484346');
  for (let j = 0; j < 4; j++) rect(g, 694 - j * 7, 250 + j * 9, 224 + j * 14, 7, ['#a09485', '#6f6662'][j % 2]);
  for (let y = 145; y < 245; y += 18)
    for (let x = 671; x < 935; x += 34) {
      if (x > 750 && x < 838) continue;
      rect(g, x + (y % 36 ? 8 : 0), y, 32, 16, ['#7d7470', '#918880', '#655f60'][(x + y) % 3]);
    }
  rect(g, 759, 137, 78, 108, '#3b3439');
  rect(g, 768, 155, 60, 90, '#201e29');
  poly(g, [[759, 156], [759, 134], [798, 112], [837, 134], [837, 156]], '#a79a87');
  poly(g, [[774, 158], [774, 141], [798, 128], [822, 141], [822, 158]], '#39303c');
  rect(g, 773, 175, 48, 66, '#785748');
  for (let x = 777; x < 820; x += 8) rect(g, x, 180, 3, 59, '#bd976d');
  for (const x of [689, 890]) {
    rect(g, x, 108, 21, 137, '#655f60');
    rect(g, x - 4, 108, 29, 10, '#ab9b88');
    rect(g, x + 3, 121, 4, 113, '#ac9c8a');
    rect(g, x - 5, 239, 31, 9, '#aa9984');
  }
  for (let i = 0; i < 35; i++) rect(g, 674 + rand() * 264, 137 + rand() * 90, 5, 5, '#50503f');
  g.restore();
}

// Greyhollow Quarry, east of the bridge: a cut pit walled in by exposed bedrock.
function quarryGround(g, rand) {
  const { cx, cy, rx, ry } = QUARRY;
  // The western lip sits on the bank, leaving the footbridge approach open.
  const rim = (inset, color) => poly(g, Array.from({ length: 64 }, (_, i) => {
    const a = i / 64 * Math.PI * 2, west = Math.cos(a) < 0;
    const r = 1 + .025 * Math.sin(a * 7);
    return [cx + Math.cos(a) * ((west ? 99 : rx + 16) - inset) * r, cy + Math.sin(a) * (ry + 14 - inset) * r];
  }), color);
  rim(0, '#49443e');
  rim(10, '#6b6459');
  rim(25, '#837a68');
  for (let i = 0; i < 900; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    const width = 2 + rand() * 5;
    if (x > 1210) rect(g, x, y, width, 2, ['#514c46', '#9a8f7c', '#3d3a3f', '#b0a48c'][i % 4]);
  }
  // Packed gravel ramps gently off the bridge into the working floor.
  path(g, [[1196, 630], [1230, 637], [1270, 637]], 48, '#6b6459');
  path(g, [[1196, 630], [1230, 637], [1270, 637]], 30, '#837a68');
  // Terraced benches cut into the north and east walls.
  for (let step = 0; step < 3; step++) {
    const r = rx - step * 26;
    path(g, [[cx - r, cy - ry + 34 + step * 20], [cx - r * .3, cy - ry + 8 + step * 20], [cx + r * .55, cy - ry + 24 + step * 20], [cx + r, cy - 10 + step * 26]], 13, step % 2 ? '#4a4550' : '#5d5750');
    path(g, [[cx - r, cy - ry + 31 + step * 20], [cx - r * .3, cy - ry + 5 + step * 20], [cx + r * .55, cy - ry + 21 + step * 20], [cx + r, cy - 13 + step * 26]], 6, '#a3987f');
  }
  // Spoil heaps, cart rails and crates around the working face.
  for (let i = 0; i < 5; i++) {
    const x = cx - 74 + i * 38, y = cy + ry - 34 + (i % 2) * 14;
    ellipse(g, x, y, 21, 9, '#4b4640');
    ellipse(g, x, y - 3, 16, 6, '#7d7365');
  }
  // Rails run from the east bank of the river to the working face — never onto
  // the bridge deck itself, which is a footbridge.
  const railStart = 1212, railEnd = cx + 40;
  for (let x = railStart; x < railEnd; x += 15) {
    rect(g, x, 626, 12, 4, '#4b3b2c');
    rect(g, x, 646, 12, 4, '#4b3b2c');
  }
  rect(g, railStart, 630, railEnd - railStart, 3, '#8e8572');
  rect(g, railStart, 643, railEnd - railStart, 3, '#8e8572');
  for (let i = 0; i < 24; i++) {
    const x = cx - rx + rand() * rx * 2, y = cy - ry + rand() * ry * 2;
    if (x > 1210) rect(g, x, y, 5, 4, '#3a3742');
  }
}
