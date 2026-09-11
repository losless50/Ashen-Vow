import { W, H, game, player, progress, built, lostHere, camera } from '../core/state.js';
import { entities } from '../systems/entities.js';
import { trees, veins, npcs, regrowRatio, props } from '../world/world.js';
import * as world from '../world/world.js';
import { bossSpec } from '../systems/boss.js';
import { QUARRY } from '../world/quarry.js';
import { HEARTHWOOD_RIVER } from '../world/hearthwood.js';
import { gateOpen, FAMILY_CAMP, groveDawned, REVELLERS } from '../world/grove.js';
import { ECHO_VAULT_GATE, ECHO_VAULT_JAMBS, ECHO_VAULT_TORCHES, ECHO_VAULT_WALLS } from '../world/echo.js';
import { SUNKEN, SUNKEN_FIRES, SUNKEN_TORCHES } from '../world/sunken.js';
import { drawBlood } from '../systems/effects.js';
import { rect, ellipse, poly, path, label } from './primitives.js';
import { human, drawCreature, drawWarden, drawVaelira, drawArrow, drawCritter, drawHerald,
  drawDrownedCaptain, drawMolt, drawHusk } from './actors.js';
import { GROUND_SCALE } from '../systems/vaelira-patterns.js';
import { crystal, lantern, lamps, wildCrystals, sanctuaryCrystals } from './lighting.js';

// --- flora --------------------------------------------------------------------
function stump(c, t) {
  const grown = regrowRatio(t);
  c.save();
  c.translate(Math.round(t.x), Math.round(t.y));
  c.scale(t.s, t.s);
  ellipse(c, 2, 4, 20, 7, '#0a0a14a0');
  rect(c, -7, -12, 13, 14, '#4a422e');
  rect(c, -6, -13, 11, 4, '#8a7550');
  rect(c, -3, -12, 4, 2, '#c2a86f');
  path(c, [[-8, -9], [7, -6]], 1, '#2b2620');
  if (grown > .12) {
    // A sapling pushes back up through the stump as the timer runs down.
    const s = Math.min(1, (grown - .12) / .88);
    path(c, [[0, -12], [1, -12 - 26 * s]], 2 + 2 * s, '#5c5136');
    const leaf = t.t > .72 ? '#a34b29' : '#47603a';
    poly(c, [[-9 * s, -16 - 20 * s], [0, -22 - 26 * s], [9 * s, -16 - 20 * s], [0, -12 - 16 * s]], leaf);
    rect(c, -1, -20 - 22 * s, 2, 4 + 4 * s, '#8a9652');
  }
  c.restore();
}

/** A grove bush: a low clump of dark leaves with a few pale glints, no trunk to speak of. */
function bush(c, t) {
  const { x, y, s } = t;
  const sway = Math.sin(game.time * 1.3 + x * .02) * 1.2;
  c.save();
  c.translate(Math.round(x + sway), Math.round(y));
  c.scale(s, s);
  ellipse(c, 2, 4, 22, 8, '#06100cb0');
  for (const [ox, oy, r, col] of [[-9, -8, 12, '#0a1a14'], [8, -9, 11, '#0c1e18'], [0, -14, 12, '#12291f'], [-3, -6, 9, '#183328']]) ellipse(c, ox, oy, r, r * .8, t.desert ? ({'#0a1a14': '#555638', '#0c1e18': '#696b42', '#12291f': '#7b8050', '#183328': '#8c915c'}[col] || col) : col);
  for (let i = 0; i < 9; i++) rect(c, -12 + (i * 7) % 24, -20 + (i * 5) % 16, 2, 1, t.desert ? '#b6b77c' : i % 3 ? '#245040' : '#3a6a56');
  rect(c, -1, -2, 2, 4, '#2a1e14');
  c.restore();
}

export function tree(c, t) {
  if (t.bush) { bush(c, t); return; }
  if (t.regrow > 0) { stump(c, t); return; }
  if (t.kind === 'palm') { deadPalm(c, t); return; }
  const { x, y, s } = t;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(s, s);
  ellipse(c, 12, 5, 38, 13, '#090914b8');
  rect(c, -6, -37, 11, 40, '#5a5239');
  rect(c, -3, -30, 4, 28, '#9b8754');
  // Wind: a slow lean plus a quicker flutter, phased by position so the forest ripples.
  const wind = Math.sin(game.time * 1.1 + x * .013 + y * .007) * 2.4 + Math.sin(game.time * 2.9 + x * .031) * .8;
  c.translate(Math.round(wind), 0);
  poly(c, [[0, -26], [-20, -41], [-19, -45], [3, -35]], '#665f3d');
  const colors = t.grove ? (t.t > .5 ? ['#06100c', '#0e1f18', '#183328', '#245040'] : ['#070d12', '#101d22', '#1a3038', '#22484a'])
    : t.t > .72 ? ['#29141e', '#652c22', '#a34b29', '#e39247'] : ['#111f22', '#293b2c', '#47603a', '#8a9652'];
  // A canopy that would hide the wanderer all but vanishes so he can see where he is going.
  const under = !game.cinematic && y > player.y && y - player.y < 96 * s && Math.abs(x - player.x) < 46 * s;
  if (under) c.globalAlpha = .14;
  for (let i = 0; i < 4; i++) {
    const ox = [-20, 15, -3, -4][i], oy = [-46, -49, -72, -55][i], r = [29, 31, 28, 34][i];
    poly(c, [[ox - r, oy - 7], [ox - r + 5, oy - 22], [ox - 17, oy - 29], [ox + 7, oy - 32], [ox + 27, oy - 20], [ox + r, oy], [ox + 20, oy + 15], [ox - 10, oy + 18], [ox - r, oy + 9]], colors[i]);
  }
  for (let i = 0; i < 65; i++) {
    const xx = Math.sin(i * 13 + t.x) * 32, yy = -50 + Math.cos(i * 7 + t.y) * 30;
    rect(c, xx, yy, 3 + (i % 4), 2 + (i % 2), i % 3 === 0 ? (t.grove ? '#2f6a58' : '#d4b670') : colors[1 + i % 3]);
  }
  c.globalAlpha = 1;
  // A fresh axe notch shows how close the trunk is to giving way.
  if (t.hp < t.max) {
    const bite = 1 - t.hp / t.max;
    poly(c, [[-7, -20], [-1 + 7 * bite, -16], [-7, -11]], '#2a2018');
    poly(c, [[-6, -19], [-2 + 6 * bite, -16], [-6, -12]], '#d0b177');
  }
  c.restore();
  if (t.hp < t.max) healthPip(c, t.x, t.y - 66 * t.s, t.hp / t.max, '#cbb277');
}

function healthPip(c, x, y, ratio, color) {
  rect(c, x - 15, y, 30, 3, '#1f1a22cc');
  rect(c, x - 15, y, 30 * ratio, 3, color);
}

// --- quarry -------------------------------------------------------------------
export function oreVein(c, v) {
  if (v.regrow > 0) {
    // Broken rubble, with the seam knitting itself back together.
    const grown = regrowRatio(v);
    ellipse(c, v.x, v.y + 2, 15, 6, '#17141f77');
    poly(c, [[v.x - 12, v.y], [v.x - 8, v.y - 6], [v.x + 6, v.y - 7], [v.x + 13, v.y]], '#4d4a52');
    rect(c, v.x - 6, v.y - 4, 4, 3, '#6d6a70');
    if (grown > .35) {
      const s = (grown - .35) / .65;
      c.globalAlpha = .35 + .5 * s;
      poly(c, [[v.x - 4, v.y - 4], [v.x - 1, v.y - 6 - 16 * s], [v.x + 4, v.y - 4]], '#5f92b3');
      c.globalAlpha = 1;
    }
    return;
  }
  ellipse(c, v.x + 1, v.y + 3, 20, 7, '#150f1d66');
  poly(c, [[v.x - 18, v.y], [v.x - 14, v.y - 16], [v.x - 3, v.y - 25], [v.x + 12, v.y - 20], [v.x + 19, v.y - 4], [v.x + 9, v.y + 5]], '#4b4750');
  poly(c, [[v.x - 13, v.y - 15], [v.x - 3, v.y - 23], [v.x + 11, v.y - 18], [v.x + 3, v.y - 8]], '#7e7a82');
  // Blue ironstone seams catching the lamplight.
  poly(c, [[v.x - 8, v.y - 6], [v.x - 6, v.y - 17], [v.x - 1, v.y - 12], [v.x - 3, v.y - 2]], '#2f6d92');
  poly(c, [[v.x + 1, v.y - 3], [v.x + 3, v.y - 19], [v.x + 9, v.y - 12], [v.x + 8, v.y - 1]], '#4a9dc4');
  rect(c, v.x + 4, v.y - 15, 2, 8, '#bfeaf5');
  rect(c, v.x - 6, v.y - 12, 2, 5, '#9fd8e8');
  if (v.hp < v.max) healthPip(c, v.x, v.y - 40, v.hp / v.max, '#8fc4dd');
}

function quarryProps(c) {
  const { cx, cy, ry } = QUARRY;
  // Signpost at the head of the rails.
  rect(c, 1210, 616, 4, 28, '#4a3a2b');
  rect(c, 1196, 608, 33, 14, '#6d573c');
  rect(c, 1198, 610, 29, 10, '#a98b58');
  label(c, 1212, 618, 'QUARRY', '#2f2419', 6);
  // Ore cart on the line.
  const cartX = 1246, cartY = 636;
  ellipse(c, cartX + 12, cartY + 12, 20, 6, '#120f1a88');
  rect(c, cartX, cartY - 14, 26, 18, '#5b4a37');
  rect(c, cartX + 2, cartY - 12, 22, 14, '#836b48');
  rect(c, cartX + 4, cartY - 16, 18, 5, '#3f628a');
  rect(c, cartX + 7, cartY - 18, 5, 4, '#7cc0dd');
  for (const wx of [cartX + 4, cartX + 18]) { ellipse(c, wx, cartY + 6, 5, 5, '#2b2530'); ellipse(c, wx, cartY + 6, 2, 2, '#8b8272'); }
  // Timber props holding the cut face.
  for (const [px, py] of [[cx - 58, cy - ry + 46], [cx + 62, cy - ry + 62], [cx + 74, cy + 58]]) {
    rect(c, px, py - 34, 6, 36, '#5d4a32');
    rect(c, px + 1, py - 34, 3, 34, '#96794c');
    rect(c, px - 8, py - 38, 22, 6, '#4b3c29');
  }
}

// --- camp ---------------------------------------------------------------------
function tent(c, x, y, color = '#bb8f63') {
  ellipse(c, x + 6, y + 6, 60, 15, '#1e172477');
  poly(c, [[x - 54, y], [x - 5, y - 72], [x + 56, y - 4]], color);
  poly(c, [[x - 5, y - 72], [x + 14, y - 8], [x + 56, y - 4]], '#48302b');
  poly(c, [[x - 5, y - 49], [x - 26, y], [x + 13, y - 1]], '#100e18');
  path(c, [[x - 59, y + 4], [x - 5, y - 75], [x + 61, y + 3]], 2, '#f2cd90');
  rect(c, x - 7, y - 83, 3, 13, '#514e36');
  rect(c, x - 62, y, 3, 10, '#4e5538');
  rect(c, x + 60, y, 3, 10, '#4e5538');
  rect(c, x - 28, y + 2, 57, 4, '#6d6c47');
}

/** A small speech bubble over a head: `mark` is '!' for something new, '…' for "press E". */
export function bubble(c, x, y, mark) {
  const lift = Math.round(Math.sin(game.time * 3) * 1.5);
  const top = y - 14 + lift;
  rect(c, x - 9, top, 18, 12, '#0c0a12');
  rect(c, x - 8, top + 1, 16, 10, '#f4ecd6');
  poly(c, [[x - 3, top + 11], [x + 1, top + 11], [x - 2, top + 15]], '#f4ecd6');
  rect(c, x - 8, top + 1, 16, 1, '#ffffff');
  if (mark === '!') { rect(c, x - 1, top + 3, 2, 4, '#a8303f'); rect(c, x - 1, top + 8, 2, 2, '#a8303f'); }
  else for (const dx of [-5, -1, 3]) rect(c, x + dx, top + 6, 2, 2, '#6b5646');
}

/** The river's centreline, matching the bank painted in world/terrain.js. */
const RIVER_BANK = HEARTHWOOD_RIVER;
function riverX(y) {
  for (let i = 1; i < RIVER_BANK.length; i++) {
    const [x0, y0] = RIVER_BANK[i - 1], [x1, y1] = RIVER_BANK[i];
    if (y <= y1) return x0 + (x1 - x0) * Math.max(0, (y - y0) / (y1 - y0)) + 10;
  }
  return RIVER_BANK[RIVER_BANK.length - 1][0] + 10;
}

/**
 * Where the water actually is, read once from the painted terrain. The bank is
 * a wide rounded stroke, so the true edges bulge at the bends; sampling the
 * pixels keeps every ripple on water and off the shore.
 */
const WATER_X0 = 1000, WATER_W = 250;
let waterMask = null;
function isWater(x, y) {
  if (!waterMask) {
    waterMask = new Uint8Array(WATER_W * H);
    const data = world.terrain.getContext('2d').getImageData(WATER_X0, 0, WATER_W, H).data;
    for (let i = 0; i < WATER_W * H && i * 4 + 2 < data.length; i++) {
      const r = data[i * 4], b = data[i * 4 + 2];
      waterMask[i] = b > r + 25 && b > 50 ? 1 : 0;
    }
  }
  const ix = Math.floor(x) - WATER_X0, iy = Math.floor(y);
  return ix >= 0 && ix < WATER_W && iy >= 0 && iy < H && waterMask[iy * WATER_W + ix] === 1;
}

/** Steps outward from the channel's centre until the shore; returns the last wet x. */
function bankEdge(y, side) {
  let x = riverX(y) - 10;
  if (!isWater(x, y)) return null;
  for (let i = 0; i < 40; i++) { if (!isWater(x + side * 2, y)) return x; x += side * 2; }
  return x;
}

/** Ripples and foam sliding downstream, only ever on water; the bridge deck is left alone. */
function flowingRiver(c) {
  const t = game.time;
  for (let i = 0; i < 90; i++) {
    const y = ((i * 41.7 + t * (34 + (i % 4) * 9)) % 1230) - 80;
    if (y > 578 && y < 680) continue;
    const wobble = Math.sin(t * 1.6 + i) * 6;
    const x = riverX(y) - 10 + ((i * 37) % 110) - 55 + wobble;
    const long = i % 3 === 0, w = long ? 12 + (i % 5) * 3 : 4 + (i % 3) * 2;
    if (!isWater(x, y) || !isWater(x + w, y)) continue;
    c.globalAlpha = .35 + .3 * Math.abs(Math.sin(t * 2.2 + i * .7));
    rect(c, x, y, w, 2, i % 5 === 0 ? '#c8ecf5' : '#83bed4');
  }
  // Foam hugging the true shoreline on both sides, slower and paler.
  for (let i = 0; i < 30; i++) {
    const y = ((i * 79 + t * 16) % 1230) - 80;
    if (y > 578 && y < 680) continue;
    const side = i % 2 ? 1 : -1, edge = bankEdge(y, side);
    if (edge === null) continue;
    c.globalAlpha = .25 + .2 * Math.abs(Math.sin(t * 1.3 + i));
    rect(c, edge - (side > 0 ? 4 + (i % 3) : 1 + (i % 3)), y, 3, 2, '#e6f6fa');
  }
  c.globalAlpha = 1;
}

/** A glowing mushroom cluster: one tall cap and two small, the light in the gills. */
export function mushroom(c, m) {
  const { x, y, color, s } = m, pulse = .7 + Math.sin(game.time * 2 + m.phase) * .3;
  // With the sun on them they stop hunching and start swaying about it.
  const glad = groveDawned() && game.region === 'echo';
  const lean = glad ? Math.sin(game.time * 1.7 + m.phase) * .16 : 0;
  const hop = glad ? Math.abs(Math.sin(game.time * 2.3 + m.phase * 1.7)) * 2.4 : 0;
  c.save();
  c.translate(Math.round(x), Math.round(y) - hop);
  c.rotate(lean);
  c.scale(s, s);
  ellipse(c, 0, 2, 12, 4, '#00000066');
  for (const [dx, h, r] of [[-7, 7, 4], [6, 5, 3]]) { rect(c, dx - 1, -h, 3, h + 2, '#c9c2a6'); ellipse(c, dx, -h, r + 1, r * .6 + 1, '#0c0a12'); ellipse(c, dx, -h, r, r * .6, color); }
  rect(c, -2, -14, 4, 16, '#0c0a12'); rect(c, -1, -13, 2, 14, '#d8d2ba');
  ellipse(c, 0, -14, 9, 5, '#0c0a12'); ellipse(c, 0, -14, 8, 4, color);
  c.globalAlpha = .5 * pulse; ellipse(c, 0, -13, 5, 2, '#ffffff'); c.globalAlpha = 1;
  rect(c, -5, -15, 2, 1, '#ffffff'); rect(c, 3, -16, 1, 1, '#ffffff');
  c.restore();
}

/** Fireflies: slow drifting motes with their own small light. */
export function fireflies(c, n) {
  for (let i = 0; i < n; i++) {
    const t = game.time * (.3 + (i % 5) * .08) + i;
    const x = (i * 211 + Math.sin(t) * 60 + game.time * (3 + i % 3)) % world.size.w;
    const y = (i * 137 + Math.cos(t * .8) * 40) % world.size.h;
    const on = Math.sin(game.time * 3 + i * 1.7) > .2;
    if (!on) continue;
    rect(c, x, y, 2, 2, i % 3 ? '#e2ff9a' : '#fff6b0');
  }
}

function grovePool(c, p) {
  for (let i = 0; i < 18; i++) {
    const x = p.x - p.rx * .8 + ((i * 37 + game.time * 6) % (p.rx * 1.6)), y = p.y - p.ry * .7 + ((i * 53) % (p.ry * 1.4));
    c.globalAlpha = .3 + .3 * Math.abs(Math.sin(game.time * 1.4 + i));
    rect(c, x, y, 5 + (i % 3) * 2, 1, '#3a8aa0');
  }
  c.globalAlpha = 1;
}

/** The grove fire: a ring of stones and a smaller, greener flame than the hearth's. */
function groveFire(c, x, y) {
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; ellipse(c, x + Math.cos(a) * 18, y + 4 + Math.sin(a) * 9, 5, 3, '#4a4a56'); }
  path(c, [[x - 12, y + 4], [x + 12, y - 4]], 4, '#4a3320'); path(c, [[x - 11, y - 5], [x + 11, y + 5]], 4, '#4a3320');
  const flick = Math.sin(game.time * 14) * 3;
  poly(c, [[x - 10, y + 2], [x - 6, y - 10], [x - 1, y - 6], [x + 2, y - 26 + flick], [x + 7, y - 9], [x + 11, y - 3], [x + 8, y + 4]], '#dc884b');
  poly(c, [[x - 4, y], [x - 1, y - 12], [x + 2, y - 6], [x + 5, y - 16 + flick], [x + 5, y + 2]], '#f6d183');
  for (let i = 0; i < 5; i++) rect(c, x + Math.sin(i + game.time) * 8, y - 20 - ((game.time * 16 + i * 9) % 40), 2, 2, '#eec586');
}


/**
 * A dead palm on the vault's sand: a leaning bleached trunk with a few fronds
 * left on it, all of them hanging. Nothing here has been watered in a long time.
 */
function deadPalm(c, t) {
  const { x, y } = t;
  const lean = ((x + y) % 9) - 4, h = 74 + ((x * 7 + y) % 5) * 14;
  const sway = Math.sin(game.time * .7 + x * .01) * 2;
  ellipse(c, x, y + 4, 20, 8, '#00000055');
  // Trunk, ringed the way a palm is.
  const top = [x + lean + sway, y - h];
  path(c, [[x, y], [x + lean * .5, y - h * .5], top], 9, '#6b5a45');
  path(c, [[x, y], [x + lean * .5, y - h * .5], top], 5, '#8d7a5e');
  for (let i = 1; i < 7; i++) {
    const k = i / 7;
    const rx = x + lean * k + sway * k, ry = y - h * k;
    path(c, [[rx - 5, ry], [rx + 5, ry]], 1, '#5a4b39');
  }
  // Fronds, every one of them drooping.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * .62;
    const ex = top[0] + Math.cos(a) * 34, ey = top[1] + Math.sin(a) * 20 + 20;
    path(c, [top, [top[0] + Math.cos(a) * 20, top[1] + Math.sin(a) * 13], [ex, ey]], 3, '#5f6b45');
    path(c, [top, [top[0] + Math.cos(a) * 20, top[1] + Math.sin(a) * 13], [ex, ey]], 1.4, '#87945e');
  }
  if (t.lush) {
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const dx = side * (30 + i * 7), dy = -18 + i * 12;
      poly(c, [top, [top[0] + dx * .6, top[1] + dy - 12],
        [top[0] + dx, top[1] + dy + 14], [top[0] + dx * .55, top[1] + dy]], i % 2 ? '#637c40' : '#405e35');
      path(c, [top, [top[0] + dx * .6, top[1] + dy - 5], [top[0] + dx, top[1] + dy + 14]], 1, '#a1ad61');
    }
  }
  rect(c, top[0] - 4, top[1] - 4, 8, 8, '#6b5a45');
}

// --- the Sunken Vault -------------------------------------------------------------
/** A standing column: a fluted shaft with its capital broken off at an angle. */
function column(c, x, y, h, tilt) {
  const top = y - h;
  ellipse(c, x, y + 6, 26, 12, '#00000055');
  poly(c, [[x - 15, y], [x - 13 + tilt, top], [x + 13 + tilt, top], [x + 15, y]], '#4a463c');
  poly(c, [[x - 12, y], [x - 10 + tilt, top], [x + 4 + tilt, top], [x + 5, y]], '#6e6a60');
  poly(c, [[x - 6, y], [x - 4 + tilt, top], [x + 1 + tilt, top], [x, y]], '#8b867a');
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    path(c, [[x - 13 + tilt * t, y - h * t], [x + 13 + tilt * t, y - h * t]], 1, '#3e3a32');
  }
  // The break at the top, never level.
  poly(c, [[x - 14 + tilt, top], [x + 14 + tilt, top], [x + 9 + tilt, top - 7], [x - 6 + tilt, top - 3]], '#7d786c');
  // The waterline stain, where it has stood in the shallows a long time.
  path(c, [[x - 14, y - 26], [x + 14, y - 26]], 3, '#2b5f6855');
}

function vaultTorch(c, x, y) {
  ellipse(c, x, y + 3, 10, 4, '#090d1688');
  rect(c, x - 4, y - 40, 8, 44, '#3b3633');
  rect(c, x - 2, y - 39, 3, 41, '#837051');
  rect(c, x - 8, y - 44, 16, 6, '#4a4641');
  const flick = Math.sin(game.time * 13 + x) * 3;
  poly(c, [[x - 6,y - 44],[x - 8,y - 54],[x - 2,y - 50],[x + 2,y - 68 + flick],[x + 7,y - 53],[x + 5,y - 43]], '#dc7c3f');
  poly(c, [[x - 3,y - 44],[x,y - 59 + flick],[x + 4,y - 47]], '#ffe1a0');
  rect(c, x - 1, y - 50, 3, 6, '#fff2c4');
}

/** The great arch in the south wall: the way the world map arrives. */
function southArch(c, x, y) {
  ellipse(c, x, y + 10, 130, 30, '#00000055');
  poly(c, [[x - 118, y], [x - 118, y - 150], [x + 118, y - 150], [x + 118, y]], '#3c3830');
  poly(c, [[x - 104, y], [x - 104, y - 150], [x + 104, y - 150], [x + 104, y]], '#5c584e');
  // The opening, and the dark that is always in it.
  c.beginPath();
  c.moveTo(x - 62, y);
  c.lineTo(x - 62, y - 96);
  c.quadraticCurveTo(x, y - 190, x + 62, y - 96);
  c.lineTo(x + 62, y);
  c.closePath();
  c.fillStyle = '#0d1416';
  c.fill();
  for (let i = -2; i <= 2; i++) rect(c, x + i * 42 - 6, y - 168, 12, 22, '#4a463c');
  path(c, [[x - 118, y - 150], [x + 118, y - 150]], 6, '#6e6a60');
  label(c, x, y - 206, 'THE DROWNED GATE', '#9fb6c8', 8);
}

/** One run of the vault wall: a slab of coursed stone standing up off its footprint. */
function vaultWallSlab(c, w) {
  const top = w.y0 - w.h, wide = w.x1 - w.x0;
  rect(c, w.x0, top, wide, w.y1 - top, '#343e3c');
  rect(c, w.x0 + 3, top + 8, wide - 6, w.y1 - top - 14, '#586353');
  for (let wy = top + 22; wy < w.y1; wy += 22) {
    path(c, [[w.x0 + 2, wy], [w.x1 - 2, wy]], 2, '#35483f');
    for (let wx = w.x0 + (wy % 44 ? 16 : 34); wx < w.x1; wx += 40)
      path(c, [[wx, wy - 20], [wx, wy]], 2, '#3e4c42');
  }
  rect(c, w.x0 - 3, top, wide + 6, 8, '#959979');
  rect(c, w.x0, w.y1 - 5, wide, 5, '#334f42');
}

/** Where a leaf lies when it is thrown back: flat along the wall's west face. */
const LEAF_X = 2806;

/** A gate leaf thrown back flat against the wall's west face and left there. */
function vaultGateLeaf(c, x, y0, y1) {
  rect(c, x, y0, 17, y1 - y0, '#241d18');
  rect(c, x + 2, y0 + 3, 13, y1 - y0 - 6, '#4a3b2a');
  for (let ty = y0 + 7; ty < y1 - 6; ty += 15) path(c, [[x + 3, ty], [x + 13, ty]], 2, '#332719');
  for (const by of [y0 + 14, y1 - 24]) { rect(c, x - 2, by, 21, 5, '#2b3330'); rect(c, x - 2, by + 1, 21, 2, '#6d7a6b'); }
  rect(c, x + 15, (y0 + y1) / 2 - 5, 5, 10, '#7d8a78');
  path(c, [[x + 6, y1 - 6], [x + 1, y1 - 32], [x + 9, y1 - 58]], 2, '#3f604b');
}

/**
 * The standing half of the gate, north of the road. Everything tall lives here,
 * because stone north of him draws behind him — the walk through is never hidden.
 */
function vaultGateNorth(c) {
  const { x } = ECHO_VAULT_GATE, jamb = ECHO_VAULT_JAMBS.north;
  for (const w of ECHO_VAULT_WALLS) if (w.y1 <= jamb) vaultWallSlab(c, w);
  // The pier: heavier stone at the wall's end, where the arch sprang from.
  rect(c, x - 36, jamb - 226, 72, 226, '#2f3a38');
  rect(c, x - 31, jamb - 219, 61, 217, '#626d5c');
  for (let course = 0; course < 8; course++) {
    const dy = jamb - 200 + course * 26, joint = course % 2 ? -10 : 12;
    path(c, [[x - 30, dy], [x + 29, dy]], 2, '#3a4a41');
    path(c, [[x + joint, dy - 24], [x + joint, dy]], 2, '#485648');
  }
  rect(c, x - 43, jamb - 240, 86, 14, '#a9a885');
  rect(c, x - 43, jamb - 240, 86, 4, '#c6c39a');
  // The springing of the arch, reaching out over the road and broken short.
  poly(c, [[x - 30, jamb - 6], [x + 30, jamb - 6], [x + 40, jamb + 30], [x + 16, jamb + 52], [x - 22, jamb + 46]], '#4d574d');
  poly(c, [[x - 26, jamb - 2], [x + 26, jamb - 2], [x + 33, jamb + 26], [x + 13, jamb + 43], [x - 19, jamb + 38]], '#6d7764');
  for (const [vx, vy] of [[-16, 10], [4, 16], [22, 26]]) path(c, [[x + vx, jamb], [x + vx + 4, jamb + vy + 16]], 2, '#41513f');
  // The mark cut over the way through, and the lamp the wardens left burning.
  poly(c, [[x, jamb - 206], [x + 11, jamb - 190], [x, jamb - 174], [x - 11, jamb - 190]], '#8fceb5');
  rect(c, x - 3, jamb - 172, 6, 26, '#496f62');
  vaultGateLeaf(c, LEAF_X, jamb - 124, jamb - 6);
  if (!game.cinematic) label(c, x, jamb - 254, 'THE DROWNED GATE', '#9fb6c8', 8);
}

/**
 * The fallen half, south of the road. Kept low on purpose: stone south of him
 * draws over him, so none of it is allowed to reach up across the passage.
 */
function vaultGateSouth(c) {
  const { x } = ECHO_VAULT_GATE, jamb = ECHO_VAULT_JAMBS.south;
  for (const w of ECHO_VAULT_WALLS) if (w.y1 > ECHO_VAULT_JAMBS.north) vaultWallSlab(c, w);

  // The southern pier, snapped off where the arch came down. Nothing here is
  // drawn above the passage floor: see ECHO_VAULT_WALLS.
  rect(c, x - 36, jamb - 80, 72, 80, '#2f3a38');
  rect(c, x - 31, jamb - 72, 61, 70, '#5b6656');
  for (let dy = jamb - 54; dy < jamb; dy += 26) path(c, [[x - 30, dy], [x + 29, dy]], 2, '#3a4a41');
  poly(c, [[x - 39, jamb - 80], [x - 6, jamb - 79], [x + 18, jamb - 72], [x + 40, jamb - 78], [x + 40, jamb - 64], [x - 39, jamb - 66]], '#8e907a');
  path(c, [[x + 20, jamb - 62], [x + 14, jamb - 38], [x + 22, jamb - 10]], 3, '#3f604b');
  vaultGateLeaf(c, LEAF_X, jamb + 6, jamb + 124);
  // The crown of the arch, lying where it dropped. The water round it is ground,
  // and is painted with the rest of the threshold.
  const cx = x + 6, cy = ECHO_VAULT_GATE.y + 88;
  poly(c, [[cx - 32, cy + 8], [cx - 26, cy - 14], [cx + 20, cy - 18], [cx + 32, cy + 2], [cx + 22, cy + 12], [cx - 18, cy + 14]], '#2f3a38');
  poly(c, [[cx - 27, cy + 4], [cx - 22, cy - 11], [cx + 17, cy - 14], [cx + 26, cy], [cx + 17, cy + 8], [cx - 15, cy + 9]], '#737c66');
  for (const dx of [-14, 2, 16]) path(c, [[cx + dx, cy - 13], [cx + dx - 2, cy + 8]], 2, '#4a5548');
}

/** Water coming off the eastern cliffs into the halls, in moving bands. */
function waterfall(c, x, y) {
  const t = game.time;
  poly(c, [[x - 26, y - 80], [x + 26, y - 80], [x + 34, y + 20], [x - 34, y + 20]], '#9fc4cc55');
  for (let i = 0; i < 9; i++) {
    const k = ((t * .5 + i / 9) % 1);
    c.globalAlpha = .35 + Math.sin(k * Math.PI) * .35;
    rect(c, x - 24 + (i % 4) * 13, y - 80 + k * 100, 5, 18 + (i % 3) * 8, '#dff0f4');
    c.globalAlpha = 1;
  }
  // The churn where it lands.
  for (let i = 0; i < 7; i++) {
    const k = (t * 1.6 + i / 7) % 1;
    c.globalAlpha = .5 * (1 - k);
    ellipse(c, x + Math.sin(i * 2.1) * 26, y + 20, 8 + k * 26, 4 + k * 11, '#cfe6ec');
    c.globalAlpha = 1;
  }
}

/** The two seats at the middle, and the water standing in the court before them. */
function drownedThrone(c) {
  const { x, y } = SUNKEN.throne;
  for (const [sx, tilt] of [[-74, -1], [74, 1]]) {
    const tx = x + sx, ty = y - 66;
    ellipse(c, tx, ty + 30, 40, 16, '#00000055');
    poly(c, [[tx - 30, ty + 30], [tx - 26, ty - 40], [tx + 26, ty - 40], [tx + 30, ty + 30]], '#3c3830');
    poly(c, [[tx - 24, ty + 26], [tx - 21, ty - 34], [tx + 21, ty - 34], [tx + 24, ty + 26]], '#6e6a60');
    rect(c, tx - 26, ty + 4, 52, 9, '#57534a');
    // A crown-back, broken on one side.
    for (let i = -2; i <= 2; i++) rect(c, tx + i * 10 - 3 + tilt * 2, ty - 50 + Math.abs(i) * 5, 6, 14, '#7d786c');
    path(c, [[tx - 24, ty - 12], [tx + 24, ty - 12]], 2, '#2b5f6855');
  }

}

/**
 * Something moving under the surface. Never a fish — only the shadow of one,
 * drawn straight onto the water with no outline and no detail, because that is
 * all you would see of it from a causeway. They circle a fixed patch of open
 * water and cannot be reached, fought, or followed out of it.
 */
function swimmer(c, w) {
  const t = game.time * w.speed + w.phase;
  const x = w.x + Math.cos(t) * w.r;
  const y = w.y + Math.sin(t) * w.r * .62;
  // Facing is simply the way it is going round.
  const a = Math.atan2(Math.cos(t) * .62, -Math.sin(t));
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.scale(w.size, w.size);
  // Deeper things are fainter. Nothing here is ever fully solid.
  c.globalAlpha = .1 + (1 - w.depth) * .3;
  const ink = '#04161c';
  if (w.kind === 'shark') {
    // A long body, a dorsal, and a tail that sweeps.
    const sweep = Math.sin(game.time * 2.4 + w.phase) * 5;
    poly(c, [[-26, 0], [-6, -7], [16, -4], [26, 0], [16, 4], [-6, 7]], ink);
    poly(c, [[-2, -6], [4, -15], [8, -5]], ink);
    poly(c, [[-24, 0], [-34, -9 + sweep], [-30, 0], [-34, 9 + sweep]], ink);
    poly(c, [[0, 5], [-6, 13], [6, 7]], ink);
  } else if (w.kind === 'ray') {
    // A flat diamond with wings that beat slowly.
    const beat = Math.sin(game.time * 1.6 + w.phase) * 4;
    poly(c, [[18, 0], [-2, -16 - beat], [-16, 0], [-2, 16 + beat]], ink);
    poly(c, [[-14, 0], [-30, 2], [-14, 3]], ink);
  } else {
    const sweep = Math.sin(game.time * 5 + w.phase) * 3;
    poly(c, [[-11, 0], [-2, -4], [9, -2], [13, 0], [9, 2], [-2, 4]], ink);
    poly(c, [[-10, 0], [-17, -5 + sweep], [-15, 0], [-17, 5 + sweep]], ink);
  }
  c.restore();
  c.globalAlpha = 1;
  // The dimple it pushes along the surface above it.
  c.globalAlpha = .07;
  ellipse(c, x, y - 3, 14 * w.size, 5 * w.size, '#cfe6ec');
  c.globalAlpha = 1;
}

/** A roofless house on the vault's sand: three walls left, and none of them whole. */
function ruinHouse(c, b) {
  const { x, y, w, h } = b;
  const back = y - h / 2, front = y + h / 2, left = x - w / 2, right = x + w / 2;
  // Back wall, tallest, with the gable half gone.
  poly(c, [[left, back], [left, back - 52], [x - 4, back - 70], [right - 10, back - 40], [right, back]], '#8a7a5e');
  poly(c, [[left + 5, back - 4], [left + 5, back - 46], [x - 6, back - 62], [right - 16, back - 36], [right - 6, back - 4]], '#a8956f');
  // Side walls, lower, broken along the top.
  for (const [sx, dir] of [[left, 1], [right, -1]]) {
    poly(c, [[sx, back], [sx, back - 44], [sx + dir * 6, front - 12], [sx, front]], '#7a6d57');
    poly(c, [[sx + dir * 4, back - 4], [sx + dir * 4, back - 38], [sx + dir * 9, front - 16], [sx + dir * 4, front - 4]], '#97865f');
  }
  // A doorway in the front, and the dark inside it.
  rect(c, x - 13, front - 34, 26, 34, '#2a241c');
  rect(c, x - 10, front - 30, 20, 30, '#17130f');
  // Sand drifted up against the windward side.
  ellipse(c, left - 6, front - 6, 22, 9, '#c9b48a');
}

/** Everything standing above the vault's ground. */
function vaultProps(c) {
  // Under the water first, so everything standing on the stone is over them.
  for (const w of props.swimmers) swimmer(c, w);
  for (const f of SUNKEN.falls) waterfall(c, f.x, f.y);

  // The mini-boss mouths, named on the ground so they read from a distance.
  label(c, SUNKEN.depths.x, SUNKEN.depths.y + 54, 'THE SCORCHED DEPTHS', '#e0a06a', 8);
  label(c, SUNKEN.halls.x, SUNKEN.halls.y + 58, 'THE FLOODED HALLS', '#9fc4cc', 8);
  label(c, SUNKEN.village.x, SUNKEN.village.y - 54, 'ABANDONED VILLAGE', '#cbb894', 8);
}

/**
 * One of the celebrants. The sprite is the grove's own wolf or mushroom-folk —
 * these are the same creatures that were trying to kill him an hour ago — so
 * the whole dance is in the transform: a hop, a lean into it, and a wobble of
 * the cap or the tail. Nothing here has hit points or can be interacted with.
 */
function reveller(c, r) {
  const t = game.time * r.speed + r.phase;
  const hop = Math.abs(Math.sin(t * 2.6)) * (r.kind === 'wolf' ? 6 : 11) * (r.big ? 1.35 : 1);
  const lean = Math.sin(t * 1.3) * (r.kind === 'wolf' ? .1 : .2);
  const spin = r.big ? Math.sin(t * .7) * .5 : 0;
  c.save();
  c.translate(r.x, r.y - hop);
  c.rotate(lean + spin * .2);
  c.translate(-r.x, -r.y);
  drawCreature(c, { kind: r.kind, skin: r.skin, x: r.x, y: r.y, hp: 1, max: 1, state: 'idle', timer: 0, homeX: r.x, homeY: r.y, cool: 0 });
  c.restore();
  // A note or two coming off the ones really going for it.
  if (!r.big) return;
  for (let i = 0; i < 2; i++) {
    const n = (t * .5 + i * .5) % 1;
    c.globalAlpha = .7 * (1 - n);
    const nx = r.x + 14 + Math.sin(t * 2 + i * 3) * 7, ny = r.y - 34 - n * 30;
    rect(c, nx, ny, 3, 3, '#f6e7a8');
    rect(c, nx + 2, ny - 5, 2, 6, '#f6e7a8');
    c.globalAlpha = 1;
  }
}

/**
 * The second fire at the grove, a few steps along from Orrin's: a half-laid ring
 * of stones at first, and once they believe they are staying, a pot over it and
 * a woodpile somebody argued about.
 */
function familyCamp(c, x, y) {
  const settled = progress.orrin >= 3;
  const stones = settled ? 8 : 5;
  for (let i = 0; i < stones; i++) {
    const a = i * Math.PI * 2 / 8;
    ellipse(c, x + Math.cos(a) * 15, y + 3 + Math.sin(a) * 8, 4, 3, '#4a4a56');
  }
  const flick = Math.sin(game.time * 13 + 2) * 2;
  path(c, [[x - 9, y + 3], [x + 9, y - 3]], 3, '#4a3320');
  poly(c, [[x - 7, y + 1], [x - 4, y - 7], [x, y - 4], [x + 2, y - 18 + flick], [x + 6, y - 6], [x + 8, y + 3]], '#dc884b');
  poly(c, [[x - 3, y], [x - 1, y - 8], [x + 2, y - 4], [x + 4, y - 11 + flick], [x + 4, y + 1]], '#f6d183');
  for (let i = 0; i < 4; i++) rect(c, x + Math.sin(i + game.time) * 6, y - 14 - ((game.time * 15 + i * 8) % 30), 2, 2, '#eec586');
  if (settled) {
    for (const [tx0, tx1] of [[-13, -3], [13, 3]]) path(c, [[x + tx0, y + 4], [x + tx1, y - 22]], 2, '#2a2320');
    ellipse(c, x, y - 16, 11, 5, '#1a1a22');
    poly(c, [[x - 10, y - 20], [x + 10, y - 20], [x + 8, y - 9], [x - 8, y - 9]], '#26262e');
    for (let i = 0; i < 5; i++) rect(c, x + 34 + (i % 2) * 3, y + 4 - i * 3, 13, 3, '#4a3320');
  }
}

/**
 * The mushroom-folk's supper: an iron pot on a tripod over a fire, and what is
 * left of a traveller going into it — an arm over the rim, a boot on the ground.
 */
function cookpot(c, x, y) {
  const flick = Math.sin(game.time * 12) * 2;
  ellipse(c, x, y + 8, 30, 9, '#00000077');
  for (const dx of [-14, -4, 8]) rect(c, x + dx, y + 3, 9, 3, '#4a3320');
  poly(c, [[x - 12, y + 4], [x - 7, y - 6], [x - 2, y - 2], [x + 1, y - 14 + flick], [x + 5, y - 5], [x + 10, y + 1], [x + 8, y + 5]], '#dc884b');
  poly(c, [[x - 5, y + 3], [x - 2, y - 5], [x + 1, y - 2], [x + 3, y - 9 + flick], [x + 5, y + 3]], '#f6d183');
  for (const [tx0, tx1] of [[-22, -6], [22, 6], [0, 0]]) path(c, [[x + tx0, y + 6], [x + tx1, y - 34]], 2, '#2a2320');
  path(c, [[x - 4, y - 34], [x + 4, y - 34]], 2, '#2a2320');
  rect(c, x - 1, y - 33, 2, 6, '#3a3a44');
  // The pot.
  ellipse(c, x, y - 12, 19, 8, '#0c0a12');
  poly(c, [[x - 18, y - 24], [x + 18, y - 24], [x + 14, y - 8], [x - 14, y - 8]], '#0c0a12');
  poly(c, [[x - 16, y - 23], [x + 16, y - 23], [x + 12, y - 9], [x - 12, y - 9]], '#26262e');
  rect(c, x - 16, y - 23, 32, 2, '#3a3a44');
  ellipse(c, x, y - 24, 16, 5, '#1a1a22');
  ellipse(c, x, y - 24, 13, 4, '#3f3a2c');
  // What is in it.
  path(c, [[x + 6, y - 26], [x + 16, y - 36], [x + 20, y - 30]], 3, '#c99a74');
  for (let i = 0; i < 3; i++) rect(c, x + 18 + i * 2, y - 31 + (i % 2), 1, 3, '#c99a74');
  path(c, [[x - 8, y - 26], [x - 18, y - 32]], 3, '#c99a74'); rect(c, x - 21, y - 35, 5, 4, '#2a1d1a');
  for (let i = 0; i < 4; i++) { const by = y - 30 - ((game.time * 12 + i * 11) % 34); c.globalAlpha = .5; rect(c, x - 6 + i * 4 + Math.sin(game.time * 2 + i) * 3, by, 2, 2, '#c9c2b0'); }
  c.globalAlpha = 1;
  // A boot on its side, and the skull on a stake the folk keep by the fire.
  rect(c, x + 26, y + 2, 9, 5, '#2a1d1a'); rect(c, x + 27, y, 4, 3, '#2a1d1a');
  rect(c, x - 34, y - 20, 2, 26, '#5c3f2c');
  rect(c, x - 37, y - 26, 8, 7, '#d8d2ba'); rect(c, x - 36, y - 24, 2, 2, '#0c0a12'); rect(c, x - 32, y - 24, 2, 2, '#0c0a12'); rect(c, x - 36, y - 20, 6, 1, '#0c0a12');
}

/** The sporehouse: a mushroom the size of a house, a ladder up its stalk to a door in the cap. */
function sporehouse(c, x, y) {
  const pulse = .6 + Math.sin(game.time * 1.5) * .2;
  ellipse(c, x, y + 66, 70, 16, '#00000088');
  rect(c, x - 34, y - 20, 68, 86, '#0c0a12'); rect(c, x - 30, y - 18, 60, 82, '#cfc6ad'); rect(c, x - 26, y - 16, 12, 78, '#e6dfc8');
  for (let i = 0; i < 6; i++) rect(c, x - 30, y - 8 + i * 13, 60, 2, '#a89e86');
  // The door, lit from inside, and the ladder up to it.
  rect(c, x - 10, y + 4, 20, 26, '#0c0a12'); rect(c, x - 8, y + 6, 16, 22, '#3a2a44'); c.globalAlpha = pulse; rect(c, x - 8, y + 6, 16, 22, '#b48ad0'); c.globalAlpha = 1;
  for (const lx of [x - 8, x + 6]) rect(c, lx, y + 28, 3, 40, '#5c3f2c');
  for (let i = 0; i < 5; i++) rect(c, x - 8, y + 32 + i * 8, 17, 2, '#8a6f4d');
  // The cap: vast, violet, spotted, glowing at the gills.
  ellipse(c, x, y - 14, 118, 26, '#0c0a12'); ellipse(c, x, y - 14, 114, 22, '#b48ad0');
  poly(c, [[x - 118, y - 14], [x - 90, y - 60], [x - 40, y - 96], [x + 40, y - 96], [x + 90, y - 60], [x + 118, y - 14]], '#0c0a12');
  poly(c, [[x - 112, y - 16], [x - 86, y - 58], [x - 38, y - 92], [x + 38, y - 92], [x + 86, y - 58], [x + 112, y - 16]], '#4a1f6a');
  poly(c, [[x - 70, y - 40], [x - 40, y - 80], [x + 10, y - 88], [x - 10, y - 50]], '#6a3a80');
  for (let i = 0; i < 9; i++) rect(c, x - 90 + i * 22, y - 50 - (i % 3) * 14, 6, 5, '#f0e0ff');
  for (let i = 0; i < 4; i++) rect(c, x - 60 + i * 40, y - 60 + (i % 2) * 6, 3, 8, '#e2c4ff');
}

/** A mushroom-folk hut: a wattle drum with a cap for a roof and a lit doorway. */
function hut(c, x, y, i) {
  const col = ['#6a3a80', '#2a7a5a', '#8a4a12'][i % 3], lit = ['#b48ad0', '#6fd6b0', '#f2a54b'][i % 3];
  ellipse(c, x, y + 20, 40, 12, '#00000077');
  rect(c, x - 26, y - 14, 52, 34, '#0c0a12'); rect(c, x - 24, y - 12, 48, 30, '#8a7a5a');
  for (let k = 0; k < 6; k++) rect(c, x - 24, y - 10 + k * 5, 48, 1, '#5c4f3a');
  for (let k = 0; k < 8; k++) rect(c, x - 22 + k * 6, y - 12, 2, 30, '#6d5d44');
  rect(c, x - 7, y - 2, 14, 20, '#0c0a12'); rect(c, x - 5, y, 10, 16, '#3a2a44');
  c.globalAlpha = .6 + Math.sin(game.time * 2 + i) * .2; rect(c, x - 5, y, 10, 16, lit); c.globalAlpha = 1;
  ellipse(c, x, y - 14, 40, 10, '#0c0a12'); ellipse(c, x, y - 14, 37, 8, lit);
  poly(c, [[x - 40, y - 14], [x - 28, y - 34], [x - 8, y - 46], [x + 8, y - 46], [x + 28, y - 34], [x + 40, y - 14]], '#0c0a12');
  poly(c, [[x - 36, y - 15], [x - 26, y - 32], [x - 8, y - 43], [x + 8, y - 43], [x + 26, y - 32], [x + 36, y - 15]], col);
  for (let k = 0; k < 4; k++) rect(c, x - 26 + k * 16 + (i % 2) * 4, y - 30 + (k % 2) * 6, 4, 3, '#f0e0ff');
  // A skull over the door, and a hanging bone chime.
  rect(c, x - 3, y - 22, 6, 5, '#d8d2ba'); rect(c, x - 2, y - 21, 1, 1, '#0c0a12'); rect(c, x + 1, y - 21, 1, 1, '#0c0a12');
  for (let k = 0; k < 3; k++) rect(c, x + 16 + k * 3, y - 12 + Math.sin(game.time * 2 + k + i) * 2, 1, 6 + (k % 2) * 3, '#d8d2ba');
}

/** A cave mouth breathing light (the rock or root around it is painted into the ground). */
function caveMouthGlow(c, x, y, color = '#2a7a5a', w = 26) {
  const pulse = .4 + Math.sin(game.time * 2) * .2;
  c.globalAlpha = pulse; ellipse(c, x, y + 4, w, w * .3, color); c.globalAlpha = 1;
  for (let i = 0; i < 3; i++) rect(c, x - 30 + i * 22, y + 16 + (i % 2) * 4, 5, 2, '#d8d2ba');
}

/** A lantern on a post beside the path — the grove's only man-made light. */
function waypost(c, p) {
  const sway = Math.sin(game.time * 1.2 + p.phase) * 1.5;
  ellipse(c, p.x, p.y + 4, 10, 4, '#00000077');
  rect(c, p.x - 2, p.y - 46, 4, 50, '#1a1008');
  rect(c, p.x - 1, p.y - 46, 2, 50, '#3d2c1c');
  path(c, [[p.x, p.y - 46], [p.x + 12 + sway, p.y - 42]], 2, '#241a12');
  rect(c, p.x + 8 + sway, p.y - 42, 11, 13, '#0c0a12');
  if (p.lit) {
    rect(c, p.x + 10 + sway, p.y - 40, 7, 9, '#ffcf7a');
    rect(c, p.x + 12 + sway, p.y - 38, 3, 5, '#fff2c4');
    c.globalAlpha = .16 + Math.sin(game.time * 5 + p.phase) * .05;
    ellipse(c, p.x + 13 + sway, p.y - 35, 26, 20, '#ffcf7a');
    c.globalAlpha = 1;
  } else {
    rect(c, p.x + 10 + sway, p.y - 40, 7, 9, '#20202a');
    // Cobweb and rot on the ones that have gone out.
    path(c, [[p.x + 8 + sway, p.y - 42], [p.x + 19 + sway, p.y - 29]], 1, '#4a4a56');
  }
  rect(c, p.x + 8 + sway, p.y - 43, 11, 2, '#4a3826');
}

/** A camp someone made and never broke: a cold fire, a pack, a bedroll, a body. */
function deadCamp(c, k) {
  const s = k.seed;
  ellipse(c, k.x, k.y + 6, 46, 18, '#00000055');
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ellipse(c, k.x + Math.cos(a) * 20, k.y + Math.sin(a) * 9, 5, 3, '#4a4a56'); }
  for (let i = 0; i < 5; i++) rect(c, k.x - 8 + i * 4, k.y - 3 + (i % 2) * 2, 4, 3, i % 2 ? '#241a12' : '#3a3a44');
  rect(c, k.x - 6, k.y - 2, 12, 2, '#5c5560');
  // A thin curl of smoke on one of them, so a walker thinks someone is still there.
  if (s % 2 === 0) for (let i = 0; i < 4; i++) { c.globalAlpha = .3 - i * .06; rect(c, k.x + Math.sin(game.time * .8 + i) * 4, k.y - 12 - ((game.time * 8 + i * 9) % 34), 2, 2, '#8a8478'); }
  c.globalAlpha = 1;
  // The bedroll, and whoever is still in it.
  const bx = k.x + 40, by = k.y + 8;
  ellipse(c, bx, by + 4, 26, 9, '#0d0a10');
  rect(c, bx - 22, by - 6, 44, 12, '#3a2a2c'); rect(c, bx - 22, by - 6, 44, 3, '#5a4244');
  rect(c, bx + 18, by - 9, 8, 8, '#a8785a'); rect(c, bx + 20, by - 7, 2, 2, '#0d0a10'); rect(c, bx + 24, by - 7, 2, 2, '#0d0a10');
  ellipse(c, bx + 6, by + 2, 14, 5, '#33101a');
  // The pack, torn open.
  rect(c, k.x - 44, k.y + 2, 16, 13, '#241a10'); rect(c, k.x - 42, k.y + 4, 12, 4, '#4a3826');
  rect(c, k.x - 36, k.y + 14, 5, 4, '#c2bca6');
}

/** A body strung between two poles: what the folk do with what they catch. */
function gibbet(c, g) {
  const sway = Math.sin(game.time * .9 + g.x) * 2;
  ellipse(c, g.x, g.y + 26, 20, 7, '#00000066');
  for (const dx of [-22, 22]) { rect(c, g.x + dx - 2, g.y - 56, 4, 82, '#1a1008'); rect(c, g.x + dx - 1, g.y - 56, 2, 82, '#3d2c1c'); }
  path(c, [[g.x - 22, g.y - 54], [g.x, g.y - 48], [g.x + 22, g.y - 54]], 2, '#4a3826');
  path(c, [[g.x + sway, g.y - 49], [g.x + sway, g.y - 38]], 1, '#6b5340');
  // The body, hung by the wrists, head down on its chest.
  rect(c, g.x - 7 + sway, g.y - 38, 14, 22, '#6b6157');
  rect(c, g.x - 7 + sway, g.y - 38, 14, 3, '#8a7f72');
  for (let i = 0; i < 3; i++) rect(c, g.x - 5 + sway + i * 5, g.y - 32, 2, 11, '#33101a');
  rect(c, g.x - 4 + sway, g.y - 45, 9, 9, '#a8785a');
  rect(c, g.x - 5 + sway, g.y - 47, 11, 4, '#2b201d');
  rect(c, g.x - 2 + sway, g.y - 42, 2, 2, '#0d0a10'); rect(c, g.x + 2 + sway, g.y - 42, 2, 2, '#0d0a10');
  for (const dx of [-8, 8]) path(c, [[g.x + dx * .5 + sway, g.y - 38], [g.x + dx + sway, g.y - 48]], 2, '#a8785a');
  path(c, [[g.x - 4 + sway, g.y - 16], [g.x - 6 + sway, g.y - 2]], 3, '#a8785a');
  path(c, [[g.x + 4 + sway, g.y - 16], [g.x + 6 + sway, g.y - 4]], 3, '#a8785a');
  // A cap already growing out of it.
  ellipse(c, g.x + 5 + sway, g.y - 34, 6, 3, '#5a2a80'); ellipse(c, g.x + 5 + sway, g.y - 35, 5, 2, '#b48ad0');
}

/** The drying rack by the pot: strips of meat, and a head on the end. */
function rack(c, r) {
  ellipse(c, r.x, r.y + 8, 40, 10, '#00000066');
  for (const dx of [-30, 30]) { rect(c, r.x + dx - 2, r.y - 40, 4, 48, '#1a1008'); rect(c, r.x + dx - 1, r.y - 40, 2, 48, '#3d2c1c'); }
  rect(c, r.x - 32, r.y - 40, 64, 3, '#4a3826');
  for (let i = 0; i < 6; i++) {
    const x = r.x - 24 + i * 10, len = 14 + (i % 3) * 6, sway = Math.sin(game.time * 1.4 + i) * 1;
    path(c, [[x, r.y - 38], [x + sway, r.y - 38 + len]], 4, '#5a1a22');
    path(c, [[x, r.y - 38], [x + sway, r.y - 38 + len * .6]], 2, '#8a3a3a');
  }
  rect(c, r.x + 24, r.y - 32, 9, 9, '#d8d2ba');
  rect(c, r.x + 26, r.y - 30, 2, 2, '#0d0a10'); rect(c, r.x + 30, r.y - 30, 2, 2, '#0d0a10');
  rect(c, r.x + 26, r.y - 25, 6, 2, '#0d0a10');
}

/**
 * A thin rain, always. Drawn in screen space so it does not thin out as the
 * camera moves, with a scatter of splashes where it lands.
 */
/**
 * Where the rain is, in world coordinates, for any rectangle of ground. The
 * drops live in a repeating tile of the world and depend only on where that
 * ground is and what time it is — never on the camera — so rain falls past the
 * wanderer as he walks instead of travelling along with him. Each tile is
 * offset by its own coordinates, or the repeat would be plain to see.
 */
export function rainDrops(rect, t, amount) {
  const TILE = 320, out = [];
  const per = Math.max(1, Math.round(22 * amount));
  const x0 = Math.floor(rect.x / TILE) * TILE, y0 = Math.floor(rect.y / TILE) * TILE;
  for (let ty = y0; ty < rect.y + rect.h + TILE; ty += TILE) {
    for (let tx = x0; tx < rect.x + rect.w + TILE; tx += TILE) {
      const seed = (((tx * 7919) ^ (ty * 104729)) >>> 0) % 997;
      for (let i = 0; i < per; i++) {
        out.push({
          x: tx + ((i * 137.5 + seed - t * 90) % TILE + TILE) % TILE,
          y: ty + ((i * 71.3 + seed * 1.7 + t * 520) % TILE + TILE) % TILE,
          seed, i,
        });
      }
    }
  }
  return out;
}

function rain(c) {
  const amount = groveDawned() && game.region === 'echo' ? 0 : props.rain;
  if (!amount) return;
  const t = game.time, TILE = 320;
  c.globalAlpha = .3 * amount;
  for (const d of rainDrops(camera, t, amount)) path(c, [[d.x, d.y], [d.x - 2, d.y + 9]], 1, '#9fb6c8');
  // Splashes land on the ground too, and stay where they landed.
  c.globalAlpha = .22 * amount;
  const splashes = Math.max(1, Math.round(4 * amount));
  const x0 = Math.floor(camera.x / TILE) * TILE, y0 = Math.floor(camera.y / TILE) * TILE;
  for (let ty = y0; ty < camera.y + camera.h + TILE; ty += TILE) {
    for (let tx = x0; tx < camera.x + camera.w + TILE; tx += TILE) {
      const seed = (((tx * 7919) ^ (ty * 104729)) >>> 0) % 997;
      for (let i = 0; i < splashes; i++) {
        const beat = Math.floor(t * 2.6 + i + seed);
        const x = tx + ((i * 311 + beat * 197 + seed) % TILE + TILE) % TILE;
        const y = ty + ((i * 173 + beat * 271 + seed) % TILE + TILE) % TILE;
        const k = (t * 2.6 + i + seed) % 1;
        c.strokeStyle = '#9fb6c8';
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(x, y, 2 + k * 7, 1 + k * 3, 0, 0, Math.PI * 2); c.stroke();
      }
    }
  }
  c.globalAlpha = 1;
}

/** The embers he dropped when he fell: a heap of coals, breathing, with sparks going up. */
export function drawLostEmbers(c) {
  const l = lostHere();
  if (!l) return;
  const t = game.time, pulse = .6 + Math.sin(t * 2.4) * .4;
  c.globalAlpha = .16 + pulse * .12;
  ellipse(c, l.x, l.y, 44, 22, '#ffb65e');
  c.globalAlpha = 1;
  ellipse(c, l.x, l.y + 3, 20, 8, '#2a1a12');
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399, r = (i % 5) * 3.4;
    const x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r * .5;
    const hot = Math.sin(t * 3 + i) > -.2;
    rect(c, x, y, 3, 2, hot ? (i % 3 ? '#ffb65e' : '#ffe9a6') : '#8a4a22');
  }
  for (let i = 0; i < 7; i++) {
    const y = l.y - 4 - ((t * 22 + i * 9) % 40);
    c.globalAlpha = Math.max(0, 1 - (l.y - 4 - y) / 40);
    rect(c, l.x + Math.sin(t * 1.6 + i * 2) * 9, y, 2, 2, i % 2 ? '#ffd77a' : '#fff2c4');
  }
  c.globalAlpha = 1;
  // A thin standing flame so it can be picked out across a dark clearing.
  const flick = Math.sin(t * 11) * 2;
  poly(c, [[l.x - 5, l.y], [l.x - 2, l.y - 12], [l.x + 1, l.y - 22 + flick], [l.x + 4, l.y - 9], [l.x + 6, l.y]], '#e8823c99');
  poly(c, [[l.x - 2, l.y], [l.x, l.y - 8], [l.x + 2, l.y - 14 + flick], [l.x + 3, l.y]], '#ffd77abb');
}

/** Spore-fall rings closing on the floor, and pools that linger where Mycel has leapt. */
export function drawHazards(c) {
  for (const h of entities.hazards) {
    if (h.kind === 'cloud') {
      // A bank of spores: many soft puffs turning over each other.
      const fade = Math.min(1, h.life);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2 + game.time * .3 + h.x, r = h.r * (.35 + (i % 4) * .18);
        c.globalAlpha = .16 * fade;
        ellipse(c, h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * .5, h.r * .34, h.r * .2, h.color);
      }
      c.globalAlpha = .1 * fade;
      ellipse(c, h.x, h.y, h.r, h.r * .5, h.color);
      c.globalAlpha = .5 * fade;
      c.strokeStyle = h.color; c.lineWidth = 1;
      c.beginPath(); c.ellipse(h.x, h.y, h.r, h.r * .5, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 12; i++) rect(c, h.x - h.r * .7 + ((i * 71 + game.time * 20) % (h.r * 1.4)), h.y - 10 - ((game.time * 14 + i * 7) % 26), 2, 2, '#f0e0ff');
      c.globalAlpha = 1;
      continue;
    }
    if (h.kind === 'burst') {
      const fall = h.total ? 1 - Math.max(0, h.timer) / h.total : 1;
      const k = h.done ? 0 : Math.max(0, h.timer) / 1.6;
      // The ring on the floor is where it will land, closing as it comes.
      c.globalAlpha = h.done ? Math.max(0, h.life * 2) : .5;
      ellipse(c, h.x, h.y, h.r, h.r * .5, h.color + '33');
      c.strokeStyle = h.color; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(h.x, h.y, h.r * (1 - k * .6) + 2, (h.r * (1 - k * .6) + 2) * .5, 0, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
      if (!h.done) {
        // The spore itself, dropping out of the canopy: a cap on a stalk, trailing dust.
        const drop = 300 * (1 - fall) ** 1.6, y = h.y - drop, spin = game.time * 9 + h.x;
        c.globalAlpha = Math.min(1, fall * 3);
        for (let i = 1; i < 6; i++) {
          const ty = y - i * 9 - drop * .02;
          if (ty > h.y - 4) continue;
          c.globalAlpha = Math.max(0, .5 - i * .08) * Math.min(1, fall * 3);
          rect(c, h.x + Math.sin(spin + i) * (3 + i), ty, 2 + (i % 2), 2, h.color);
        }
        c.globalAlpha = Math.min(1, fall * 3);
        rect(c, h.x - 1, y - 2, 3, 8, '#c9c2a6');
        ellipse(c, h.x, y - 2, 9, 6, '#0c0a12');
        ellipse(c, h.x, y - 3, 8, 5, h.color);
        ellipse(c, h.x - 2, y - 5, 3, 2, '#f0e0ff');
        rect(c, h.x + Math.round(Math.sin(spin) * 2), y - 6, 2, 2, '#f0e0ff');
        // Its shadow shrinking onto the ring.
        c.globalAlpha = .3 * Math.min(1, fall * 2);
        ellipse(c, h.x, h.y, 14 - 8 * (1 - fall), 7 - 4 * (1 - fall), '#000000');
        c.globalAlpha = 1;
      } else {
        // The splash: a ring going out, and dust standing where it hit.
        const age = Math.max(0, .35 - h.life) / .35;
        c.globalAlpha = Math.max(0, 1 - age);
        c.strokeStyle = h.color; c.lineWidth = 2;
        c.beginPath(); c.ellipse(h.x, h.y, h.r * (.4 + age * .9), h.r * (.4 + age * .9) * .5, 0, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          rect(c, h.x + Math.cos(a) * h.r * age * .8, h.y + Math.sin(a) * h.r * age * .4, 3, 2, h.color);
        }
        c.globalAlpha = 1;
      }
    } else {
      c.globalAlpha = Math.min(.7, h.life * .4);
      ellipse(c, h.x, h.y, h.r, h.r * .5, h.color + '55');
      for (let i = 0; i < 3; i++) rect(c, h.x - 8 + i * 8 + Math.sin(game.time * 3 + i + h.x) * 3, h.y - 6 - ((game.time * 10 + i * 7) % 14), 2, 2, h.color);
    }
  }
  c.globalAlpha = 1;
}

/** A piece of whatever stood here: a column, a stub of wall, or half an arch. */
function oldStone(c, s) {
  const h = s.h;
  ellipse(c, s.x + 2, s.y + 4, s.kind === 'wall' ? 26 : 13, 7, '#00000066');
  if (s.kind === 'column') {
    rect(c, s.x - 9, s.y - 46 * h, 18, 50 * h, '#14141a');
    rect(c, s.x - 7, s.y - 45 * h, 14, 48 * h, '#4a4a56');
    rect(c, s.x - 7, s.y - 45 * h, 4, 48 * h, '#63636f');
    for (let i = 0; i < 5; i++) rect(c, s.x - 7, s.y - 40 * h + i * 9 * h, 14, 1, '#2a2a33');
    rect(c, s.x - 11, s.y - 50 * h, 22, 6, '#14141a');
    rect(c, s.x - 10, s.y - 49 * h, 20, 4, '#5a5a66');
    // Broken at the top, and mossed on the shaded side.
    poly(c, [[s.x - 7, s.y - 45 * h], [s.x - 2, s.y - 52 * h], [s.x + 4, s.y - 46 * h], [s.x + 7, s.y - 50 * h]], '#14141a');
    for (let i = 0; i < 4; i++) rect(c, s.x + 1 + (i % 2) * 3, s.y - 34 * h + i * 8 * h, 4, 3, '#2c5a48');
  } else if (s.kind === 'wall') {
    rect(c, s.x - 28, s.y - 34 * h, 56, 38 * h, '#14141a');
    for (let r = 0; r < 5; r++) for (let i = 0; i < 5; i++) {
      const bx = s.x - 26 + i * 11 + (r % 2 ? 5 : 0), by = s.y - 32 * h + r * 7 * h;
      if (by < s.y - 34 * h) continue;
      rect(c, bx, by, 9, 6 * h, ['#4a4a56', '#3a3a44', '#55555f'][(i + r) % 3]);
    }
    // The top has fallen in.
    poly(c, [[s.x - 28, s.y - 34 * h], [s.x - 14, s.y - 40 * h], [s.x + 2, s.y - 33 * h], [s.x + 16, s.y - 39 * h], [s.x + 28, s.y - 32 * h], [s.x + 28, s.y - 34 * h]], '#0e1a16');
    for (let i = 0; i < 5; i++) rect(c, s.x - 24 + i * 12, s.y - 12 + (i % 2) * 5, 5, 4, '#2c5a48');
  } else {
    // Half an arch, still standing on one leg.
    rect(c, s.x - 20, s.y - 40 * h, 11, 44 * h, '#14141a');
    rect(c, s.x - 18, s.y - 39 * h, 8, 42 * h, '#4a4a56');
    c.strokeStyle = '#14141a'; c.lineWidth = 11;
    c.beginPath(); c.arc(s.x + 2, s.y - 38 * h, 22, Math.PI, Math.PI * 1.75); c.stroke();
    c.strokeStyle = '#4a4a56'; c.lineWidth = 7;
    c.beginPath(); c.arc(s.x + 2, s.y - 38 * h, 22, Math.PI, Math.PI * 1.7); c.stroke();
    for (let i = 0; i < 3; i++) rect(c, s.x - 17 + (i % 2) * 4, s.y - 26 * h + i * 9 * h, 4, 3, '#2c5a48');
  }
}

/** A chest in the rubble: shut and glinting, or standing open and empty. */
function chest(c, n) {
  const open = progress.opened.includes(n.id);
  const t = game.time;
  ellipse(c, n.x + 2, n.y + 5, 20, 7, '#00000077');
  if (open) {
    rect(c, n.x - 15, n.y - 12, 30, 17, '#1a1008');
    rect(c, n.x - 13, n.y - 10, 26, 13, '#241a10');
    rect(c, n.x - 13, n.y - 10, 26, 3, '#0d0a08');
    // The lid, thrown back.
    poly(c, [[n.x - 15, n.y - 12], [n.x - 13, n.y - 26], [n.x + 13, n.y - 26], [n.x + 15, n.y - 12]], '#1a1008');
    poly(c, [[n.x - 13, n.y - 13], [n.x - 11, n.y - 24], [n.x + 11, n.y - 24], [n.x + 13, n.y - 13]], '#4a3826');
    for (const bx of [-8, 0, 8]) rect(c, n.x + bx, n.y - 24, 3, 12, '#6b5340');
    return;
  }
  rect(c, n.x - 16, n.y - 18, 32, 23, '#0d0a08');
  rect(c, n.x - 14, n.y - 16, 28, 19, '#4a3826');
  rect(c, n.x - 14, n.y - 16, 28, 4, '#6b5340');
  for (const bx of [-10, 2]) { rect(c, n.x + bx, n.y - 16, 4, 19, '#8a7050'); rect(c, n.x + bx, n.y - 16, 1, 19, '#b09070'); }
  // The lid, banded, with a lock that catches what light there is.
  poly(c, [[n.x - 16, n.y - 18], [n.x - 12, n.y - 27], [n.x + 12, n.y - 27], [n.x + 16, n.y - 18]], '#0d0a08');
  poly(c, [[n.x - 14, n.y - 19], [n.x - 11, n.y - 25], [n.x + 11, n.y - 25], [n.x + 14, n.y - 19]], '#5c4530');
  for (const bx of [-10, 2]) rect(c, n.x + bx, n.y - 25, 4, 7, '#8a7050');
  rect(c, n.x - 3, n.y - 15, 7, 7, '#8a7050');
  rect(c, n.x - 2, n.y - 13, 5, 4, '#d9b86a');
  rect(c, n.x - 1, n.y - 12, 2, 2, '#2a1d1a');
  const glint = Math.sin(t * 2 + n.x) * .5 + .5;
  c.globalAlpha = .3 + glint * .5;
  rect(c, n.x - 1, n.y - 26, 2, 2, '#ffe9a6');
  c.globalAlpha = .1 + glint * .12;
  ellipse(c, n.x, n.y - 12, 40, 22, '#ffd77a');
  c.globalAlpha = 1;
}

/** Everything that stands in Echo Grove besides the trees. */
function groveProps(c) {
  if (props.cookfire) cookpot(c, props.cookfire.x, props.cookfire.y);
  if (props.burrow) caveMouthGlow(c, props.burrow.x, props.burrow.y);
  if (props.cave) caveMouthGlow(c, props.cave.x, props.cave.y + 12, '#2a7a5a', 40);
  for (const p of props.pools) grovePool(c, p);
  if (props.cave) {
    const v = props.cave;
    // Roots seal the mouth until the three Fallen are down; the interact handler decides which.
    if (!game.caveOpen) for (let i = 0; i < 6; i++) path(c, [[v.x - 30 + i * 12, v.y - 44 + (i % 2) * 6], [v.x - 26 + i * 12 + Math.sin(game.time + i) * 2, v.y + 8]], 3, '#3a2a18');
  }
  groveFire(c, world.fire.x, world.fire.y);
}

export function camp(c) {
  tent(c, 591, 521);
  tent(c, 838, 464, '#9f5c46');
  rect(c, 396, 508, 79, 13, '#5e573b');
  for (const x of [400, 466]) rect(c, x, 517, 6, 45, '#615e40');
  poly(c, [[382, 507], [401, 458], [482, 458], [493, 507]], '#514749');
  for (let y = 469; y < 508; y += 10) rect(c, 394 - (y - 470) / 5, y, 91 + (y - 470) / 5, 3, '#827368');
  rect(c, 402, 515, 34, 24, '#696369'); rect(c, 407, 511, 25, 6, '#b0a28f'); rect(c, 412, 538, 15, 8, '#403b42');
  rect(c, 453, 534, 21, 16, '#534744'); rect(c, 457, 530, 13, 8, '#eba958');
  rect(c, 802, 507, 38, 17, '#70664a'); rect(c, 805, 524, 4, 13, '#4e553b'); rect(c, 832, 524, 4, 13, '#4e553b');
  rect(c, 810, 502, 11, 7, '#a4a184'); rect(c, 826, 499, 3, 10, '#c0af79');
  if (built('shelter')) { tent(c, 914, 576, '#b7b087'); rect(c, 868, 576, 22, 19, '#89744c'); rect(c, 873, 576, 3, 19, '#b5a273'); }
  if (built('well')) well(c, 612, 706);
  if (built('whetstone')) whetstone(c, 500, 616);
  if (built('brazier')) brazier(c, 792, 646);

  for (let i = 0; i < 11; i++) {
    const a = i * Math.PI * 2 / 11;
    ellipse(c, 714 + Math.cos(a) * 20, 587 + Math.sin(a) * 11, 5, 4, '#73796a');
    rect(c, 712 + Math.cos(a) * 20, 583 + Math.sin(a) * 11, 5, 2, '#b0ae87');
  }
  path(c, [[700, 590], [726, 579]], 4, '#675038');
  path(c, [[702, 579], [725, 591]], 4, '#675038');
  const flick = Math.sin(game.time * 14) * 3;
  poly(c, [[702, 586], [706, 574], [712, 578], [716, 557 + flick], [722, 575], [727, 580], [722, 589]], '#dc884b');
  poly(c, [[709, 584], [714, 571], [716, 577], [721, 569 + flick], [721, 587]], '#f6d183');
  rect(c, 713, 580, 5, 8, '#ffedac');
  for (let i = 0; i < 6; i++) { const y = 565 - ((game.time * 16 + i * 9) % 44); rect(c, 713 + Math.sin(i + game.time) * 9, y, 2, 2, '#eec586'); }
  for (let i = 0; i < 4; i++) ellipse(c, 714 + Math.sin(game.time + i) * 8, 552 - ((game.time * 9 + i * 13) % 52), 8 + i * 2, 4, '#e1ddbd12');
}

/** Stone well — a drum of mortared rock under a shingled cap. */
function well(c, x, y) {
  ellipse(c, x + 3, y + 8, 30, 11, '#100d1877');
  ellipse(c, x, y, 26, 12, '#4d4640');
  rect(c, x - 26, y - 20, 52, 21, '#5c554c');
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 5; i++)
      rect(c, x - 24 + i * 10 + (row % 2 ? 4 : 0), y - 19 + row * 7, 8, 6, ['#7d7466', '#665e56', '#8d8474'][(i + row) % 3]);
  ellipse(c, x, y - 20, 25, 10, '#2b2732');
  ellipse(c, x, y - 21, 20, 7, '#16232e');
  rect(c, x - 22, y - 24, 44, 4, '#8a8071');
  for (const px of [x - 20, x + 17]) { rect(c, px, y - 54, 4, 32, '#5a4630'); rect(c, px + 1, y - 54, 2, 30, '#8f7449'); }
  poly(c, [[x - 30, y - 52], [x, y - 66], [x + 30, y - 52], [x + 26, y - 47], [x, y - 60], [x - 26, y - 47]], '#4a3a2c');
  poly(c, [[x - 26, y - 51], [x, y - 63], [x + 26, y - 51], [x, y - 56]], '#7f6743');
  path(c, [[x - 18, y - 50], [x + 15, y - 50]], 2, '#3a2f26');
  rect(c, x - 5, y - 49, 3, 14, '#2f281f');
  rect(c, x - 7, y - 36, 9, 7, '#6d5a3c');
  rect(c, x - 6, y - 35, 7, 2, '#a68b57');
}

/** Whetstone rack — a treadle grindstone beside the forge. */
function whetstone(c, x, y) {
  ellipse(c, x + 2, y + 6, 24, 8, '#120f1a77');
  for (const px of [x - 17, x + 12]) { rect(c, px, y - 16, 5, 22, '#4d3c2a'); rect(c, px + 1, y - 16, 2, 20, '#836a44'); }
  rect(c, x - 20, y - 20, 41, 5, '#5c4830');
  rect(c, x - 20, y - 20, 41, 2, '#96794f');
  ellipse(c, x, y - 22, 15, 15, '#3b3740');
  ellipse(c, x, y - 22, 12, 12, '#6f6a67');
  ellipse(c, x, y - 22, 9, 9, '#918a80');
  ellipse(c, x, y - 22, 3, 3, '#2a2630');
  path(c, [[x - 9, y - 29], [x + 8, y - 30]], 2, '#c9c2ae');
  rect(c, x + 12, y - 24, 9, 4, '#6d5940');
  rect(c, x - 24, y - 2, 13, 9, '#4e4034');
  rect(c, x - 23, y - 1, 11, 3, '#3d6070');
  // A few sparks whenever the wheel is imagined turning.
  for (let i = 0; i < 3; i++)
    rect(c, x + 10 + Math.sin(game.time * 9 + i * 2) * 4, y - 30 - ((game.time * 22 + i * 7) % 14), 2, 2, '#ffd08a');
}

/** Ember brazier — a second fire that never goes out. */
function brazier(c, x, y) {
  ellipse(c, x + 2, y + 5, 18, 7, '#100d1877');
  for (const [dx, dy] of [[-11, 0], [11, 0], [0, 4]]) path(c, [[x + dx, y + 4], [x + dx * .35, y - 14]], 3, '#3b3138');
  poly(c, [[x - 15, y - 16], [x + 15, y - 16], [x + 11, y - 3], [x - 11, y - 3]], '#4a4048');
  poly(c, [[x - 13, y - 15], [x + 13, y - 15], [x + 10, y - 5], [x - 10, y - 5]], '#6a5b52');
  rect(c, x - 15, y - 18, 31, 4, '#8d8071');
  const lick = Math.sin(game.time * 12) * 3, lick2 = Math.cos(game.time * 9) * 2;
  poly(c, [[x - 9, y - 16], [x - 5, y - 27], [x - 1, y - 21], [x + 2, y - 34 + lick], [x + 7, y - 22], [x + 10, y - 16]], '#d9803f');
  poly(c, [[x - 5, y - 16], [x - 1, y - 25], [x + 2, y - 20], [x + 4, y - 29 + lick2], [x + 7, y - 16]], '#f5cd7c');
  rect(c, x - 1, y - 21, 4, 6, '#fff0b6');
  for (let i = 0; i < 4; i++)
    rect(c, x + Math.sin(i * 2 + game.time * 1.6) * 8, y - 30 - ((game.time * 15 + i * 11) % 34), 2, 2, '#efbd7c');
}

// --- scenes -------------------------------------------------------------------
export function drawWild(c) {
  c.drawImage(world.terrain, 0, 0);
  const grove = game.region === 'echo';
  const vault = game.region === 'sunken';
  if (grove) groveProps(c);
  else if (vault) vaultProps(c);
  else { flowingRiver(c); }
  drawBlood(c);
  drawHazards(c);
  drawLostEmbers(c);
  if (!grove && !vault) {
    camp(c);
    quarryProps(c);
    for (const l of lamps) lantern(c, l.x, l.y);
    for (const p of wildCrystals) crystal(c, p.x, p.y);
  }

  const sprites = [
    ...(grove ? [
      // Two pieces, sorted apart, so the wall north of the road stays behind him
      // and the wall south of it stays in front — the way through is always clear.
      { y: ECHO_VAULT_JAMBS.north, draw: () => vaultGateNorth(c) },
      { y: Math.max(...ECHO_VAULT_WALLS.map(w => w.y1)), draw: () => vaultGateSouth(c) },
      ...ECHO_VAULT_TORCHES.map(t => ({ y: t.y, draw: () => vaultTorch(c, t.x, t.y) })),
    ] : []),
    ...(vault ? [
      ...SUNKEN_FIRES.map(f => ({ y: f.y + 4, draw: () => groveFire(c, f.x, f.y) })),
      ...SUNKEN_TORCHES.map(t => ({ y: t.y, draw: () => vaultTorch(c, t.x, t.y) })),
      ...SUNKEN.houses.map(b => ({ y: b.y + b.h / 2, draw: () => ruinHouse(c, b) })),
      ...SUNKEN.colonnade.map(([x, y]) => ({ y, draw: () => column(c, x, y, 80 + ((x + y) % 5) * 14, (x % 7) - 3) })),
      { y: SUNKEN.throne.y - 36, draw: () => drownedThrone(c) },
      { y: SUNKEN.gate.y - 40, draw: () => southArch(c, SUNKEN.gate.x, SUNKEN.gate.y - 40) },
    ] : []),
    ...trees.map(t => ({ y: t.y, draw: () => tree(c, t) })),
    ...veins.map(v => ({ y: v.y, draw: () => oreVein(c, v) })),
    ...npcs.filter(n => n.type === 'mira' || n.type === 'smith' || n.type === 'peddler').map(n => ({
      y: n.y,
      draw: () => {
        human(c, n.x, n.y, n.type);
        // Names and quest markers are gameplay furniture — the title backdrop
        // shows the camp itself, not its labels.
        if (game.cinematic) return;
        label(c, n.x, n.y - 56, n.name.toUpperCase(), '#e4dfb9', 7);
        const marked = n.type === 'smith' ? progress.quest === 0
          : n.type === 'peddler' ? !progress.owned.includes('lantern') && progress.embers >= 300
          : progress.quest === 1 || (progress.won && progress.quest < 6);
        if (marked) bubble(c, n.x, n.y - 66, '!');
        else if (game.near === n) bubble(c, n.x, n.y - 66, '…');
      },
    })),
    ...entities.enemies.filter(e => e.hp > 0).map(e => ({ y: e.y, draw: () => drawCreature(c, e) })),
    ...props.mushrooms.map(m => ({ y: m.y, draw: () => mushroom(c, m) })),
    ...props.critters.map(k => ({ y: k.y, draw: () => drawCritter(c, k) })),
    ...(props.sporehouse ? [{ y: props.sporehouse.y + 60, draw: () => sporehouse(c, props.sporehouse.x, props.sporehouse.y) }] : []),
    ...props.huts.map((h, i) => ({ y: h.y + 18, draw: () => hut(c, h.x, h.y, i) })),
    ...props.stones.map(s => ({ y: s.y, draw: () => oldStone(c, s) })),
    ...npcs.filter(n => n.type === 'chest').map(n => ({ y: n.y + 4, draw: () => chest(c, n) })),
    // The grove celebrating itself. Drawn in the sprite list so they sort into
    // the scene by depth like anything else standing on the ground.
    ...(grove && groveDawned() ? REVELLERS.map(r => ({ y: r.y, draw: () => reveller(c, r) })) : []),
    // Orrin's people, and the brewer, only once the story has put them there.
    ...(grove && gateOpen('family') ? [{ y: FAMILY_CAMP.y + 6, draw: () => familyCamp(c, FAMILY_CAMP.x, FAMILY_CAMP.y) }] : []),
    ...npcs.filter(n => n.gate && gateOpen(n.gate)).map(n => ({
      y: n.y,
      draw: () => {
        human(c, n.x, n.y, n.type);
        if (game.cinematic) return;
        label(c, n.x, n.y - 58, n.name.toUpperCase(), '#e4dfb9', 7);
        if (game.near === n) bubble(c, n.x, n.y - 68, '…');
      },
    })),
    ...props.wayposts.map(p => ({ y: p.y, draw: () => waypost(c, p) })),
    ...props.camps.map(k => ({ y: k.y + 10, draw: () => deadCamp(c, k) })),
    ...props.gibbets.map(g => ({ y: g.y + 24, draw: () => gibbet(c, g) })),
    ...(props.rack ? [{ y: props.rack.y + 6, draw: () => rack(c, props.rack) }] : []),
    ...(game.cinematic ? [] : [{ y: player.y, draw: () => human(c, player.x, player.y) }]),
  ].sort((a, b) => a.y - b.y);
  for (const s of sprites) s.draw();

  for (const a of entities.shots) drawArrow(c, a);
  if (grove) { fireflies(c, props.fireflies); rain(c); return; }
  if (vault) return;
  rain(c);
  // Leaves carried on the wind — gusts come and go — and a few sunlit motes.
  const gust = 26 + Math.sin(game.time * .35) * 16 + Math.sin(game.time * 1.9) * 4;
  for (let i = 0; i < 40; i++) {
    const leaf = i % 3 !== 0;
    const speed = leaf ? gust + (i % 5) * 7 : 5 + i % 3;
    const x = ((i * 173 + game.time * speed) % (W + 40)) - 20;
    const y = (i * 93 + game.time * (leaf ? 6 + i % 4 : 1) + Math.sin(game.time * 1.7 + i) * (leaf ? 20 : 8)) % H;
    if (!leaf) { rect(c, x, y, 2, 2, '#fff1b46b'); continue; }
    const tumble = Math.sin(game.time * 6 + i);
    rect(c, x, y, tumble > 0 ? 4 : 2, tumble > 0 ? 2 : 3, ['#e4cf89', '#c9843c', '#8a9652'][i % 3] + 'a8');
  }
}

/** The den under the cliff: black stone, a green pool, mushrooms along every wall. */
function drawCave(c) {
  rect(c, 0, 0, W, H, '#07090c');
  for (let y = 240; y < 900; y += 26)
    for (let x = 445; x < 1065; x += 34)
      rect(c, x + (y % 52 ? 17 : 0), y, 32, 24, (x + y) % 3 ? '#121418' : '#1a1d24');
  ellipse(c, 750, 553, 205, 185, '#0d1a16');
  ellipse(c, 750, 553, 190, 171, '#111a18');
  ellipse(c, 750, 640, 70, 26, '#0b1c2a'); ellipse(c, 750, 640, 60, 20, '#163a4a');
  for (const side of [420, 1085])
    for (let i = 0; i < 9; i++) {
      const y = 270 + i * 69, x = side + Math.sin(i * 9) * 9;
      poly(c, [[x - 24, y], [x - 20, y - 40], [x - 4, y - 56], [x + 16, y - 40], [x + 24, y - 8], [x + 10, y + 8]], '#0c0e12');
      path(c, [[x - 4, y - 50], [x + 3, y - 30], [x - 3, y - 12]], 2, '#2a2e36');
    }
  for (let i = 0; i < 14; i++) { const x = 470 + i * 44; poly(c, [[x - 6, 236], [x, 280 + (i % 3) * 14], [x + 6, 236]], '#15181e'); }
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = 750 + Math.cos(a) * 205, y = 553 + Math.sin(a) * 185;
    mushroom(c, { x, y, color: ['#6fd6b0', '#b48ad0', '#f2a54b'][i % 3], s: .9 + (i % 3) * .2, phase: i });
  }
  // The carved stone at the back of the den.
  rect(c, 720, 300, 60, 48, '#0c0a12'); rect(c, 723, 303, 54, 42, '#2a2e36');
  c.strokeStyle = '#6fd6b0'; c.lineWidth = 1; c.beginPath(); c.arc(750, 322, 10, 0, Math.PI * 2); c.stroke(); path(c, [[740, 322], [760, 322]], 1, '#6fd6b0');
  label(c, 750, 342, 'H A D E S', '#8fbf9a', 6);
  rect(c, 712, 827, 76, 26, '#2a2e36');
  label(c, 750, 873, '↧ THE GROVE', '#bfe8c4', 10);
}

/**
 * The hold under the Drowned Throne: a flooded stone chamber with a ship in it,
 * wedged where the water left it. Ankle-deep the whole way across, which is why
 * everything down here has been standing in salt for a very long time.
 */
function drawVault(c) {
  const t = game.time;
  rect(c, 0, 0, W, H, '#070d10');
  // Block walls, then the standing water over the floor of the chamber.
  for (let y = 230; y < 910; y += 28)
    for (let x = 435; x < 1075; x += 42)
      rect(c, x + (y % 56 ? 21 : 0), y, 40, 26, (x + y) % 3 ? '#101a1e' : '#16232a');
  ellipse(c, 750, 553, 212, 191, '#0c1a20');
  ellipse(c, 750, 553, 200, 180, '#122c33');
  ellipse(c, 750, 553, 188, 168, '#15343d');
  // Light off the water, moving, so the floor is never quite still.
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + Math.sin(t * .4 + i) * .3;
    const r = 40 + ((i * 53) % 140);
    const x = 750 + Math.cos(a) * r, y = 553 + Math.sin(a) * r * .84;
    c.globalAlpha = .1 + Math.abs(Math.sin(t * .9 + i)) * .16;
    ellipse(c, x, y, 22 + (i % 4) * 9, 4 + (i % 3) * 2, '#7fd4dd');
    c.globalAlpha = 1;
  }
  // Columns down both sides, broken off at different heights.
  for (const side of [470, 1030])
    for (let i = 0; i < 5; i++) {
      const y = 300 + i * 132, h = 90 + (i % 3) * 44;
      rect(c, side - 19, y - h, 38, h, '#0d1518');
      rect(c, side - 14, y - h + 5, 27, h - 8, '#2c3c3a');
      for (let k = y - h + 18; k < y; k += 22) path(c, [[side - 13, k], [side + 12, k]], 2, '#1b2826');
      rect(c, side - 24, y - h - 8, 48, 10, '#55604b');
      path(c, [[side + 9, y - h + 12], [side + 4, y - 30], [side + 11, y - 6]], 3, '#3f604b');
    }
  // The wreck, bow-on, driven into the back wall of the hold.
  const bx = 750, by = 318;
  poly(c, [[bx - 132, by + 62], [bx - 96, by - 26], [bx, by - 58], [bx + 96, by - 26], [bx + 132, by + 62]], '#100e12');
  poly(c, [[bx - 120, by + 58], [bx - 86, by - 18], [bx, by - 48], [bx + 86, by - 18], [bx + 120, by + 58]], '#3a2e26');
  for (let i = 0; i < 7; i++) path(c, [[bx - 116 + i * 4, by + 54 - i * 2], [bx + 116 - i * 4, by + 54 - i * 2]], 3, i % 2 ? '#2a2118' : '#4c3d2c');
  // Ribs where the planking has gone, and the mast snapped off over the chamber.
  for (let i = -3; i <= 3; i++) path(c, [[bx + i * 26, by - 40], [bx + i * 30, by + 56]], 4, '#231c16');
  path(c, [[bx - 6, by - 44], [bx + 16, by - 150], [bx + 30, by - 196]], 11, '#2a2118');
  path(c, [[bx - 6, by - 46], [bx + 15, by - 150], [bx + 28, by - 194]], 6, '#4c3d2c');
  for (let i = 0; i < 5; i++) path(c, [[bx + 4 + i * 6, by - 90 - i * 22], [bx + 40 + i * 9, by - 70 - i * 20]], 2, '#5e6a58');
  // The throne itself, two seats, on the deck of the thing that brought it here.
  for (const side of [-1, 1]) {
    const sx = bx + side * 44;
    poly(c, [[sx - 22, by + 24], [sx - 18, by - 30], [sx + 18, by - 30], [sx + 22, by + 24]], '#1a2420');
    poly(c, [[sx - 17, by + 20], [sx - 14, by - 25], [sx + 14, by - 25], [sx + 17, by + 20]], '#45564a');
    rect(c, sx - 20, by - 34, 40, 8, '#7e8a6a');
    for (let i = 0; i < 4; i++) rect(c, sx - 14 + i * 8, by - 42 + (i % 2) * 4, 4, 9, '#c9a94e');
  }
  // Chain, anchor and the cages the crew came down in.
  for (const [cx2, cy2] of [[560, 700], [940, 690], [620, 840]]) {
    ellipse(c, cx2, cy2 + 6, 26, 9, '#08121466');
    for (let i = 0; i < 5; i++) rect(c, cx2 - 18 + i * 9, cy2 - 34, 3, 38, '#2b3730');
    rect(c, cx2 - 20, cy2 - 38, 40, 6, '#38463c');
    rect(c, cx2 - 20, cy2 - 2, 40, 5, '#38463c');
    rect(c, cx2 - 6, cy2 - 20, 9, 16, '#cdd0bb');
  }
  for (let i = 0; i < 9; i++) ellipse(c, 432 + i * 13, 604 + Math.sin(i) * 8, 9, 5, '#2b3730');
  // The way back up, at the foot of the chamber.
  rect(c, 712, 827, 76, 26, '#1b2a2c');
  label(c, 750, 873, '\u21a7 THE VAULT', '#9fd6dd', 10);
}

function drawVaultScene(c) {
  drawVault(c);
  drawBlood(c);
  drawLostEmbers(c);
  drawArenaActors(c);
}

export function drawBoss(c) {
  if (bossSpec().arena === 'cave') { drawCaveScene(c); return; }
  if (bossSpec().arena === 'vault') { drawVaultScene(c); return; }
  rect(c, 0, 0, W, H, '#18161f');
  for (let y = 240; y < 900; y += 32)
    for (let x = 445; x < 1065; x += 40) {
      rect(c, x + (y % 64 ? 20 : 0), y, 38, 30, (x + y) % 3 ? '#272632' : '#3a3545');
      rect(c, x + 3, y + 2, 30, 1, '#d3b89e55');
    }
  ellipse(c, 750, 553, 199, 179, '#a1825b');
  ellipse(c, 750, 553, 190, 171, '#3a3545');
  c.strokeStyle = '#bba08266';
  c.lineWidth = 3;
  for (const r of [100, 155, 182]) { c.beginPath(); c.arc(750, 553, r, 0, Math.PI * 2); c.stroke(); }
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; label(c, 750 + Math.cos(a) * 170, 557 + Math.sin(a) * 170, '◇', '#a5ad85', 14); }
  for (const x of [453, 1035])
    for (let y = 300; y < 870; y += 108) {
      ellipse(c, x + 12, y + 12, 22, 10, '#130f1b99');
      rect(c, x - 12, y - 40, 30, 51, '#787079');
      rect(c, x - 17, y - 44, 40, 9, '#aa9e90');
      rect(c, x - 8, y - 32, 5, 38, '#b5a896');
      rect(c, x - 17, y + 7, 40, 9, '#a59888');
      rect(c, x - 4, y - 19, 14, 13, '#3f3237');
      poly(c, [[x - 1, y - 14], [x + 3, y - 33 - Math.sin(game.time * 11) * 3], [x + 10, y - 15]], '#d6b075');
    }
  rect(c, 712, 827, 76, 26, '#af9b82');
  label(c, 750, 873, '↧ THE WILDS', '#d5d8b1', 10);

  // Cracked masonry and root-bound edges inspired by the cave references.
  for (let i = 0; i < 78; i++) {
    const x = 475 + (i * 173) % 540, y = 287 + (i * 97) % 531;
    path(c, [[x, y], [x + 7, y + 3], [x + 10, y + 10], [x + 16, y + 12]], 1, '#231c2e70');
    rect(c, x + 14, y + 13, 3, 2, '#9a877655');
  }
  for (const side of [420, 1085])
    for (let i = 0; i < 9; i++) {
      const y = 270 + i * 69, x = side + Math.sin(i * 9) * 9;
      poly(c, [[x - 21, y], [x - 18, y - 38], [x - 4, y - 53], [x + 15, y - 39], [x + 23, y - 7], [x + 9, y + 8]], '#16131f');
      path(c, [[x - 4, y - 48], [x + 3, y - 29], [x - 3, y - 13]], 2, '#61505c');
      path(c, [[x - 10, y - 43], [x - 6, y - 20], [x + 15, y + 10], [x + 9, y + 26]], 3, '#503c3d');
    }
  for (const p of sanctuaryCrystals) crystal(c, p.x, p.y);
  drawBlood(c);
  drawLostEmbers(c);
  drawArenaActors(c);
}

const rangeToPlayer = b => Math.hypot(player.x - b.x, (player.y - b.y) / GROUND_SCALE);

/** What the tandem pair is about to do, marked on the floor before it happens. */
function tandemTells(c, b) {
  const wind = b.windDuration || 1, done = Math.min(1, 1 - Math.max(0, b.timer) / wind);
  const a = Math.atan2(b.dy, b.dx);
  if (b.state === 'slashWind') {
    // Barely a warning, on purpose: a short bright arc where the cut will fall.
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.beginPath();
    c.arc(0, 0, 92, a - 1, a + 1);
    c.strokeStyle = '#ffe9a8';
    c.lineWidth = 3 + done * 3;
    c.globalAlpha = .35 + done * .5;
    c.stroke();
    c.globalAlpha = 1;
    c.restore();
  } else if (b.state === 'pounceWind') {
    // The arc it is about to take, and the poisoned ground it will leave.
    const reach = Math.min(300, rangeToPlayer(b) + 40);
    const lx = b.x + Math.cos(a) * reach, ly = b.y + Math.sin(a) * reach * GROUND_SCALE;
    c.globalAlpha = .3 + done * .35;
    path(c, [[b.x, b.y], [(b.x + lx) / 2, (b.y + ly) / 2 - 44], [lx, ly]], 3, '#9fd64a');
    c.globalAlpha = 1;
    ellipse(c, lx, ly, 54, 54 * GROUND_SCALE, '#9fd64a2e');
    c.strokeStyle = '#9fd64a';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(lx, ly, 54 * done, 54 * GROUND_SCALE * done, 0, 0, 7);
    c.stroke();
  } else if (b.state === 'broodWind') {
    // Its whole back, about to open. The warning is the size of the thing.
    const r = 90 + done * 70;
    c.globalAlpha = .2 + done * .4;
    ellipse(c, b.x, b.y, r, r * GROUND_SCALE, '#9fd64a');
    c.globalAlpha = 1;
    c.strokeStyle = '#c2f05a';
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const ang = i / 5 * Math.PI * 2 + game.time * 2;
      path(c, [[b.x + Math.cos(ang) * r * .5, b.y + Math.sin(ang) * r * .5 * GROUND_SCALE],
        [b.x + Math.cos(ang) * r, b.y + Math.sin(ang) * r * GROUND_SCALE]], 3, '#c2f05a');
    }
  } else if (b.state === 'burrowWind' || b.state === 'cannonWind') {
    // Where it will come up, or where the shell is aimed to land.
    const r = b.state === 'burrowWind' ? 62 : 56;
    const hot = b.state === 'burrowWind' ? '#9fd64a' : '#ffb765';
    ellipse(c, b.markX, b.markY, r, r * GROUND_SCALE, hot + '2e');
    c.strokeStyle = hot;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(b.markX, b.markY, r * done, r * GROUND_SCALE * done, 0, 0, 7);
    c.stroke();
  } else if (b.state === 'sprayWind') {
    // The spread it is about to cover, five gobbets wide.
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 190, a - .55, a + .55);
    c.closePath();
    c.fillStyle = '#9fd64a2e';
    c.fill();
    c.restore();
  } else if (b.state === 'blunderbussWind') {
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 200, a - .5, a + .5);
    c.closePath();
    c.fillStyle = '#ffcf7a33';
    c.fill();
    c.strokeStyle = '#ffcf7a';
    c.lineWidth = 2 + done * 2;
    c.stroke();
    c.restore();
  } else if (b.state === 'cleaveWind' || b.state === 'chargeWind' || b.state === 'skitterWind') {
    // The lane, drawn on the ground, filling as the windup runs out.
    const reach = b.state === 'charge' || b.state === 'chargeWind' ? 250 : 190;
    const wide = b.state === 'chargeWind' ? 54 : 40;
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.rotate(a);
    poly(c, [[0, -wide], [reach, -wide], [reach, wide], [0, wide]], '#d0916333');
    c.strokeStyle = '#e5b777';
    c.lineWidth = 3;
    c.strokeRect(0, -wide, reach * done, wide * 2);
    c.restore();
  } else if (b.state === 'stingWind') {
    // Where the tail is going, not where it is standing.
    ellipse(c, b.markX, b.markY, 56, 56 * GROUND_SCALE, '#8fceb533');
    c.strokeStyle = '#b6e8c8';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(b.markX, b.markY, 56 * done, 56 * GROUND_SCALE * done, 0, 0, 7);
    c.stroke();
  } else if (b.state === 'pincerWind' || b.state === 'sweepWind') {
    const reach = b.state === 'sweepWind' ? 128 : 118;
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, reach, a - 1.1, a + 1.1);
    c.closePath();
    c.fillStyle = '#d0916333';
    c.fill();
    c.strokeStyle = '#e5b777';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, reach * done, a - 1.1, a + 1.1);
    c.stroke();
    c.restore();
  } else if (b.state === 'bonesWind') {
    for (let i = 0; i < 6; i++) {
      const ang = a + (i - 2.5) * .19;
      c.globalAlpha = .2 + done * .4;
      path(c, [[b.x, b.y - 34], [b.x + Math.cos(ang) * 460, b.y - 34 + Math.sin(ang) * 460 * GROUND_SCALE]], 2, '#e4e0c4');
      c.globalAlpha = 1;
    }
  }
}

/** The boss, its remains, the Herald and the rings — shared by every arena. */
function drawArenaActors(c) {
  const b = entities.boss;
  if (b?.kind === 'tandem') { drawTandem(c, b); drawHeraldAndRings(c); return; }
  if (b && b.hp > 0) {
    if (b.state === 'slashWind') {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(Math.atan2(b.dy, b.dx));
      poly(c, [[0, -35], [165, -60], [165, 60], [0, 35]], '#d07f5a55');
      c.strokeStyle = '#e9aa75';
      c.lineWidth = 2;
      c.strokeRect(0, -38, 145, 76);
      c.restore();
    }
    if (b.state === 'slamWind') {
      ellipse(c, b.x, b.y, 110, 110, '#d0916333');
      c.strokeStyle = '#e5b777';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(b.x, b.y, 110 * (1 - Math.max(0, b.timer) / 1.05), 0, 7);
      c.stroke();
    }
    (b.kind === 'vaelira' ? drawVaelira : drawWarden)(c, b);
  } else if (b && b.kind !== 'vaelira') {
    // Felled: the crown is all that is left standing.
    ellipse(c, b.x, b.y, 30, 11, '#231d2a');
    poly(c, [[b.x - 22, b.y - 4], [b.x - 15, b.y - 14], [b.x, b.y - 18], [b.x + 15, b.y - 14], [b.x + 22, b.y - 4]], '#141019');
    path(c, [[b.x - 20, b.y - 6], [b.x - 13, b.y - 13], [b.x, b.y - 16], [b.x + 13, b.y - 13], [b.x + 20, b.y - 6]], 3, '#b9c2ab');
    for (let i = 0; i <= 5; i++) rect(c, b.x - 18 + i * 7, b.y - 8 - Math.sin(Math.PI * i / 5) * 6, 3, 3, '#c9a94e');
  }
  drawHeraldAndRings(c);
}

/**
 * Both of them, the shells the beast has left, and whatever is on the floor in
 * front of each. Sorted by depth, so whichever is nearer is drawn over.
 */
function drawTandem(c, b) {
  const pair = b.pair;
  if (!pair) return;
  // Venom it has put on the floor, thinning as it soaks away.
  for (const p of pair.pools) {
    const fade = Math.min(1, p.life / p.max);
    c.globalAlpha = .28 + fade * .38;
    ellipse(c, p.x, p.y, p.r, p.r * GROUND_SCALE, '#2f5a14');
    ellipse(c, p.x, p.y, p.r * .82, p.r * GROUND_SCALE * .82, '#6d9c2a');
    c.globalAlpha = .2 + fade * .3;
    for (let i = 0; i < 5; i++) {
      const t = game.time * .7 + i * 1.7;
      ellipse(c, p.x + Math.sin(t) * p.r * .4, p.y + Math.cos(t * .8) * p.r * .3 * GROUND_SCALE,
        5 + (i % 3) * 3, 3 + (i % 2) * 2, '#c2f05a');
    }
    c.globalAlpha = 1;
  }
  for (const h of pair.molt.husks) drawHusk(c, h);
  if (pair.stage === 'absorbing' || pair.captain.state === 'fallen') {
    // What is left of him, until the beast comes and picks it up.
    const f = pair.fallen;
    if (f && !pair.lifted) {
      ellipse(c, f.x, f.y + 4, 30, 11, '#0a0e1499');
      poly(c, [[f.x - 26, f.y - 2], [f.x - 18, f.y - 14], [f.x + 14, f.y - 16], [f.x + 26, f.y - 1], [f.x + 8, f.y + 6], [f.x - 16, f.y + 5]], '#332c33');
      ellipse(c, f.x + 16, f.y - 12, 8, 9, '#cdd0bb');
      rect(c, f.x + 18, f.y - 14, 3, 3, '#6fd6b0');
      path(c, [[f.x - 22, f.y - 6], [f.x - 40, f.y - 12]], 3, '#9aa7a0');
    }
  }
  const bodies = [pair.captain, pair.molt]
    .filter(t => t.hp > 0 && t.state !== 'fallen')
    .map(t => ({ y: t.y, draw: () => {
      tandemTells(c, t);
      if (t.role === 'captain') drawDrownedCaptain(c, t);
      else drawMolt(c, t, t.role === 'crowned' && pair.stage === 2);
    } }))
    .concat(entities.enemies.filter(e => e.arena && e.hp > 0)
      .map(e => ({ y: e.y, draw: () => drawCreature(c, e) })));
  for (const s of bodies.sort((p, q) => p.y - q.y)) s.draw();
}

/** The Herald, the shots in the air and the expanding rings, for every arena. */
function drawHeraldAndRings(c) {
  if (entities.herald) {
    drawHerald(c, entities.herald);
    if (game.near?.type === 'herald') bubble(c, entities.herald.x, entities.herald.y - 74, '…');
  }

  for (const a of entities.shots) drawArrow(c, a);

  for (const w of entities.wave) {
    c.save();
    c.translate(w.x, w.y);
    c.scale(1, w.damage ? GROUND_SCALE : 1);
    c.strokeStyle = '#e7b17a';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(0, 0, w.r, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#f9d89e';
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }
  human(c, player.x, player.y);
}
function drawCaveScene(c) {
  drawCave(c);
  drawBlood(c);
  drawLostEmbers(c);
  drawArenaActors(c);
}
