// The banishment, told in five small animated pixel scenes behind the intro
// cards. Everything is drawn with the world's primitives on a 360x150 canvas.
import { rect, ellipse, poly, path } from './primitives.js';
import { game } from '../core/state.js';

export const INTRO_W = 360, INTRO_H = 150;

const seeded = i => ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;

function sky(c, top, mid, bottom) {
  rect(c, 0, 0, INTRO_W, 50, top);
  rect(c, 0, 50, INTRO_W, 50, mid);
  rect(c, 0, 100, INTRO_W, 50, bottom);
}

function stars(c, t, n = 40, color = '#e9e4cc') {
  for (let i = 0; i < n; i++) {
    const x = seeded(i) * INTRO_W, y = seeded(i + 99) * 70;
    if (Math.sin(t * 2 + i) > -.3) rect(c, x, y, 1, 1, color);
  }
}

function ground(c, y, color, edge) {
  rect(c, 0, y, INTRO_W, INTRO_H - y, color);
  rect(c, 0, y, INTRO_W, 2, edge);
}

/** A crenellated keep with towers; `lit` colours the windows warm, red, or dark. */
function castle(c, x, y, lit, wall = '#1c1a2a', trim = '#2c283c') {
  for (const [tx, h, w] of [[-58, 52, 16], [50, 60, 16], [-6, 78, 22]]) {
    rect(c, x + tx, y - h, w, h, wall);
    for (let i = 0; i < w; i += 5) rect(c, x + tx + i, y - h - 4, 3, 4, wall);
    rect(c, x + tx + 2, y - h + 3, w - 4, 1, trim);
    poly(c, [[x + tx - 2, y - h - 4], [x + tx + w / 2, y - h - 16], [x + tx + w + 2, y - h - 4]], trim);
  }
  rect(c, x - 62, y - 34, 124, 34, wall);
  for (let i = -62; i < 62; i += 7) rect(c, x + i, y - 38, 4, 4, wall);
  rect(c, x - 8, y - 20, 16, 20, '#0d0b14');
  if (lit) for (const [wx, wy] of [[-52, -40], [-49, -30], [56, -46], [58, -34], [-1, -60], [4, -48], [-30, -24], [30, -24], [-44, -16], [44, -16]])
    rect(c, x + wx, y + wy, 3, 4, lit);
}

function banner(c, x, y, t, color) {
  rect(c, x, y - 22, 1, 24, '#3a3346');
  poly(c, [[x + 1, y - 22], [x + 12 + Math.sin(t * 3) * 3, y - 19], [x + 11 + Math.sin(t * 3 + 1) * 3, y - 10], [x + 1, y - 8]], color);
}

/** A 24-px person. `o`: crown, dress, cloak, ragged, kneel, walk, flip, sword, broken. */
function person(c, x, y, o = {}) {
  const w = o.walk ?? 0, step = Math.round(Math.sin(w) * 2), kneel = o.kneel ? 6 : 0;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (o.flip) c.scale(-1, 1);
  const skin = '#d1a37c', hair = o.dress ? '#2a1a20' : '#2b201d';
  const cloak = o.ragged ? '#5a4634' : o.cloak || '#7a2238';
  ellipse(c, 0, 1, 7, 2, '#00000066');
  if (o.dress) {
    poly(c, [[-4, -16], [4, -16], [8, 0], [-8, 0]], o.cloak || '#3a1030');
    rect(c, -3, -14, 6, 3, '#b58a3a');
  } else if (o.kneel) {
    rect(c, -5, -8, 10, 6, '#3a2f2a');
    rect(c, 2, -3, 6, 3, '#2a1f1a');
  } else {
    rect(c, -4, -8 + step, 3, 8, o.ragged ? '#8c7a66' : '#2b2f3a'); rect(c, 1, -8 - step, 3, 8, o.ragged ? '#8c7a66' : '#2b2f3a');
    rect(c, -5, -1 + step, 4, 2, '#1c1417'); rect(c, 1, -1 - step, 4, 2, '#1c1417');
  }
  // Torso and cloak.
  const top = -18 + kneel;
  poly(c, [[-6, top + 2], [6, top + 2], [8 + Math.sin(w * .5), top + 12], [-8 + Math.sin(w * .5), top + 12]], cloak);
  if (o.ragged) for (let i = -7; i < 7; i += 3) rect(c, i, top + 11, 2, 2, cloak);
  rect(c, -4, top + 2, 8, 9, o.ragged ? '#6b6157' : o.dress ? '#5a1a40' : '#556373');
  if (!o.ragged && !o.dress) rect(c, -1, top + 3, 2, 7, '#a1b3ba');
  rect(c, -3, top + 10, 6, 1, '#7c6242');
  // Head.
  rect(c, -3, top - 6, 6, 7, skin);
  rect(c, -4, top - 8, 8, 3, hair);
  rect(c, -4, top - 6, 1, 4, hair); rect(c, 3, top - 6, 1, 4, hair);
  if (o.dress) rect(c, -5, top - 6, 2, 12, hair), rect(c, 3, top - 6, 2, 12, hair);
  if (o.crown) { rect(c, -4, top - 10, 8, 2, o.crown); for (const px of [-4, -1, 2]) rect(c, px, top - 12, 2, 2, o.crown); }
  if (o.eyes) { rect(c, -2, top - 4, 1, 1, o.eyes); rect(c, 1, top - 4, 1, 1, o.eyes); }
  // Sword, whole or snapped.
  if (o.sword) {
    const len = o.broken ? 5 : 12, ang = o.kneel ? .9 : .5;
    path(c, [[5, top + 8], [5 + Math.cos(ang) * len, top + 8 + Math.sin(ang) * len]], 2, o.broken ? '#7a7468' : '#9fb4c2');
    rect(c, 3, top + 6, 4, 2, '#c9a45e');
  }
  c.restore();
}

/** Something hunched and long-armed, all shadow but for the eyes. */
function monster(c, x, y, t, s = 1) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(s, s);
  const breathe = Math.sin(t * 4) * 1.5;
  ellipse(c, 0, 1, 12, 3, '#00000088');
  poly(c, [[-10, 0], [-12, -12 - breathe], [-4, -20 - breathe], [6, -19 - breathe], [12, -8], [10, 0]], '#0a0810');
  path(c, [[-11, -10], [-18, 0]], 3, '#0a0810'); path(c, [[10, -9], [17, 1]], 3, '#0a0810');
  rect(c, -5, -16 - breathe, 2, 2, '#ff6b3d'); rect(c, 1, -16 - breathe, 2, 2, '#ff6b3d');
  c.restore();
}

function flames(c, x, y, t, s = 1) {
  const f = Math.sin(t * 13 + x) * 3 * s, g = Math.sin(t * 9 + x * 2) * 2 * s;
  poly(c, [[x - 6 * s, y], [x - 4 * s, y - 9 * s + f], [x, y - 16 * s + g], [x + 4 * s, y - 8 * s - f], [x + 6 * s, y]], '#d9752e');
  poly(c, [[x - 3 * s, y], [x - 1 * s, y - 6 * s + g], [x + 1 * s, y - 10 * s + f], [x + 3 * s, y]], '#f7cf74');
}

function house(c, x, y, burning, t) {
  rect(c, x - 10, y - 12, 20, 12, burning ? '#2a1a14' : '#3a3040');
  poly(c, [[x - 12, y - 12], [x, y - 22], [x + 12, y - 12]], burning ? '#3a221a' : '#5a4a4c');
  rect(c, x - 2, y - 7, 4, 7, '#0d0b14');
  if (burning) { flames(c, x - 4, y - 12, t, .8); flames(c, x + 5, y - 14, t + 1, 1); }
}

function tree(c, x, y, h, color) {
  rect(c, x - 1, y - h * .4, 3, h * .4, '#0c0a10');
  poly(c, [[x - h * .35, y - h * .35], [x, y - h], [x + h * .35, y - h * .35]], color);
  poly(c, [[x - h * .42, y - h * .15], [x, y - h * .75], [x + h * .42, y - h * .15]], color);
}

function ash(c, t, n = 30, color = '#c9c2b0') {
  for (let i = 0; i < n; i++) {
    const x = (seeded(i) * INTRO_W + Math.sin(t + i) * 12 + t * 6) % INTRO_W;
    const y = (seeded(i + 7) * INTRO_H + t * (14 + seeded(i + 3) * 18)) % INTRO_H;
    rect(c, x, y, 1, 1, color);
  }
}

function rain(c, t) {
  for (let i = 0; i < 60; i++) {
    const x = (seeded(i) * INTRO_W - t * 40) % INTRO_W, y = (seeded(i + 5) * INTRO_H + t * 260) % INTRO_H;
    path(c, [[x, y], [x - 1.5, y + 6]], 1, '#8f9bb066');
  }
}

function vignette(c) {
  for (let i = 0; i < 4; i++) {
    c.globalAlpha = .18;
    rect(c, 0, 0, INTRO_W, 4 - i, '#000'); rect(c, 0, INTRO_H - 4 + i, INTRO_W, 4 - i, '#000');
  }
  c.globalAlpha = 1;
}

// --- the five scenes ------------------------------------------------------------
const SCENES = [
  // Eldoria at peace: warm windows, banners, the king and queen on the wall.
  (c, t) => {
    sky(c, '#141a33', '#26305a', '#4a4a6a');
    stars(c, t, 30);
    ellipse(c, 300, 30, 12, 12, '#e9e2c2');
    ellipse(c, 305, 27, 10, 10, '#141a33');
    ground(c, 118, '#1d2a1f', '#2f4a30');
    for (const [x, h] of [[20, 26], [50, 34], [330, 30], [300, 24]]) tree(c, x, 120, h, '#1a2c1e');
    castle(c, 180, 118, '#f2c56b');
    banner(c, 132, 66, t, '#9c2a3c'); banner(c, 232, 60, t + 1, '#9c2a3c');
    for (let i = 0; i < 8; i++) rect(c, 90 + i * 26, 124 + (i % 2) * 4, 3, 2, '#f2c56b');
    person(c, 170, 84, { crown: '#f3d27a', cloak: '#8b1f36', sword: true });
    person(c, 190, 84, { crown: '#f3d27a', dress: true, cloak: '#4a1a40' });
    c.globalAlpha = .35 + Math.sin(t) * .05; ellipse(c, 180, 100, 90, 40, '#f2c56b22'); c.globalAlpha = 1;
  },
  // The Queen changed: a red sky, burning village, monsters coming in from the dark.
  (c, t) => {
    sky(c, '#2a0a12', '#4a1018', '#2a0c10');
    stars(c, t, 18, '#e0a0a0');
    ground(c, 118, '#1a0e10', '#3a1a1a');
    castle(c, 250, 118, '#ff5a3a', '#160c14', '#241018');
    for (const [x, burning] of [[30, true], [64, true], [100, false]]) house(c, x, 118, burning, t);
    c.globalAlpha = .3; for (let i = 0; i < 3; i++) ellipse(c, 50 + i * 20, 90 - i * 18 - (t * 12) % 30, 10 + i * 6, 6, '#3a2a2a'); c.globalAlpha = 1;
    const queenEyes = Math.sin(t * 6) > 0 ? '#ff2a2a' : '#ff8a5a';
    c.save(); c.translate(0, 0); c.scale(2, 2);
    person(c, 90, 62, { crown: '#f3d27a', dress: true, cloak: '#1a0a18', eyes: queenEyes });
    c.restore();
    for (let i = 0; i < 4; i++) {
      const x = 380 - Math.min(t * 22, 110) - i * 34, s = .8 + i * .1;
      monster(c, x, 118 - i * 6, t + i, s);
    }
    for (let i = 0; i < 3; i++) monster(c, -40 + Math.min(t * 18, 70) - i * 30, 120 + i * 4, t + i * 2, .9);
    ash(c, t, 20, '#6a3a30');
  },
  // The throne room: the king on his knees, the sword in pieces, the Queen unmoved.
  (c, t) => {
    rect(c, 0, 0, INTRO_W, INTRO_H, '#120e1a');
    for (let y = 96; y < INTRO_H; y += 12) for (let x = 0; x < INTRO_W; x += 24) rect(c, x + (y % 24 ? 12 : 0), y, 22, 10, (x + y) % 5 ? '#221c2c' : '#2a2434');
    for (const x of [40, 110, 250, 320]) { rect(c, x - 8, 10, 16, 90, '#1c1826'); rect(c, x - 5, 14, 3, 84, '#2e2838'); }
    rect(c, 150, 30, 60, 70, '#1a1424'); rect(c, 160, 40, 40, 60, '#2a0a18'); poly(c, [[150, 30], [180, 12], [210, 30]], '#1a1424');
    for (let i = 0; i < 5; i++) {
      const y = 60 + i * 8 + Math.sin(t * 2 + i) * 4;
      path(c, [[180, 70], [140 - i * 12, y], [110 - i * 20, y - 10 + Math.sin(t + i) * 6]], 2, '#3a1030');
      path(c, [[180, 70], [220 + i * 12, y], [250 + i * 20, y - 10 + Math.cos(t + i) * 6]], 2, '#3a1030');
    }
    const queenEyes = Math.sin(t * 5) > 0 ? '#ff2a2a' : '#ff8a5a';
    person(c, 180, 92, { crown: '#f3d27a', dress: true, cloak: '#1a0a18', eyes: queenEyes });
    for (const x of [130, 230]) { person(c, x, 100, { cloak: '#1a1a22', sword: true, flip: x > 180, eyes: '#ff6b3d' }); }
    person(c, 90, 122, { kneel: true, sword: true, broken: true, cloak: '#8b1f36' });
    for (const [dx, dy, a] of [[12, 2, .4], [22, 4, 1.2], [30, 1, 2]]) path(c, [[90 + dx, 122 + dy], [90 + dx + Math.cos(a) * 6, 122 + dy + Math.sin(a) * 2]], 2, '#9fb4c2');
    rect(c, 60, 108, 8, 2, '#f3d27a'); rect(c, 60, 106, 2, 2, '#f3d27a'); rect(c, 65, 106, 2, 2, '#f3d27a');
    if (t < .5) { c.globalAlpha = (.5 - t) * 1.6; rect(c, 0, 0, INTRO_W, INTRO_H, '#fff4d6'); c.globalAlpha = 1; }
  },
  // Banished: thrown from the gate into the rain, and the doors close behind him.
  (c, t) => {
    sky(c, '#0d1020', '#151a2e', '#1a1d2a');
    ground(c, 120, '#1a1c1e', '#2c2e30');
    for (const [x, h] of [[18, 40], [48, 52], [80, 44], [110, 36]]) tree(c, x, 122, h, '#0f1a14');
    rect(c, 230, 20, 130, 100, '#23202e'); for (let i = 0; i < 16; i++) rect(c, 230 + i * 8, 14 + (i % 2) * 4, 5, 6, '#23202e');
    for (let y = 30; y < 120; y += 10) for (let x = 232; x < 360; x += 16) rect(c, x + (y % 20 ? 8 : 0), y, 14, 8, (x + y) % 3 ? '#2a2636' : '#1f1c2a');
    const gap = Math.max(0, 34 - t * 22);
    rect(c, 258, 44, 40, 76, '#0d0b14');
    rect(c, 258, 44, 20 - gap / 2, 76, '#3a2a1c'); rect(c, 278 + gap / 2, 44, 20 - gap / 2, 76, '#3a2a1c');
    for (const gx of [263, 289]) if (gx < 278 - gap / 2 || gx > 278 + gap / 2) rect(c, gx, 60, 3, 3, '#7c6242');
    for (let i = 0; i < 3; i++) rect(c, 300 - 40 * Math.min(1, t) - i * 26, 62 - i * 2, 3, 3, '#ff6b3d');
    rain(c, t);
    // Tumbling out for the first second, then face down, then up on one knee.
    const k = Math.min(1, t / 1.1), x = 250 - k * 100, y = 118 - Math.sin(k * Math.PI) * 30;
    if (k < 1) { c.save(); c.translate(x, y); c.rotate(-k * 6.2); person(c, 0, 0, { ragged: true, cloak: '#5a4634' }); c.restore(); }
    else if (t < 2.2) { c.save(); c.translate(x, 118); c.rotate(-Math.PI / 2); person(c, 0, 0, { ragged: true }); c.restore(); }
    else person(c, x, 118, { kneel: true, ragged: true, sword: true, broken: true, flip: true });
    if (t > .2 && t < .6) { c.globalAlpha = .6 - t; rect(c, 0, 0, INTRO_W, INTRO_H, '#f0f0ff'); c.globalAlpha = 1; }
  },
  // Alone in the woods with a broken sword, walking toward a far-off fire.
  (c, t) => {
    sky(c, '#0a0c16', '#0f1220', '#101a16');
    stars(c, t, 24);
    ground(c, 116, '#121a14', '#1c2a1e');
    for (let i = 0; i < 14; i++) { const x = (i * 29 - t * 6) % (INTRO_W + 40) - 20; tree(c, x, 118, 34 + seeded(i) * 30, i % 2 ? '#0e1a12' : '#14241a'); }
    for (let i = 0; i < 3; i++) if (Math.sin(t * 1.5 + i * 2) > .6) { rect(c, 40 + i * 120, 80 + i * 6, 2, 2, '#ff6b3d'); rect(c, 45 + i * 120, 80 + i * 6, 2, 2, '#ff6b3d'); }
    const glow = Math.max(0, Math.min(1, (t - 1.5) / 2));
    if (glow) { c.globalAlpha = glow * .5; ellipse(c, 330, 112, 40, 20, '#f2a54b'); c.globalAlpha = glow; flames(c, 330, 114, t, .7); c.globalAlpha = 1; }
    person(c, 120 + Math.min(t * 8, 60), 116, { ragged: true, sword: true, broken: true, walk: t * 7 });
    ash(c, t, 36);
  },
];

/** Paints scene `index` at `t` seconds since it began. */
// --- the grove's dawn ------------------------------------------------------------
/** A trunk with a ragged crown, drawn flat and dark against whatever is behind it. */
function groveTree(c, x, base, h, w, color) {
  rect(c, x - 3, base - h, 6, h, color);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * .5;
    path(c, [[x, base - h + 6], [x + Math.cos(a) * w, base - h - 6 + Math.sin(a) * w * .5]], 2, color);
  }
}

/** 1: the canopy splitting, and the first light down the gap. */
function groveOpening(c, t) {
  const k = Math.min(1, t / 2.2);
  sky(c, '#0d1410', '#16211a', '#1d2a20');
  // The gap widens, with sky behind it.
  const gap = 6 + k * 58;
  rect(c, INTRO_W / 2 - gap / 2, 0, gap, 96, '#6fa8c8');
  rect(c, INTRO_W / 2 - gap / 2, 0, gap, 44, '#a8d4e4');
  // The shaft coming down to the floor.
  c.globalAlpha = .5 * k;
  poly(c, [[INTRO_W / 2 - gap / 2, 0], [INTRO_W / 2 + gap / 2, 0], [INTRO_W / 2 + gap, INTRO_H], [INTRO_W / 2 - gap, INTRO_H]], '#ffeeb8');
  c.globalAlpha = 1;
  // The two halves of the roof, sliding apart.
  for (const side of [-1, 1]) {
    const off = side * k * 64;
    for (let i = 0; i < 9; i++) {
      const bx = INTRO_W / 2 + off + side * (10 + i * 20);
      ellipse(c, bx, 22 + (i % 3) * 9, 26, 15, '#101a12');
    }
  }
  ground(c, 118, '#1b2a1e', '#243a28');
  for (const [tx, h] of [[40, 74], [92, 62], [268, 70], [318, 58]]) groveTree(c, tx, 122, h, 16, '#0e1710');
  // Motes turning in the new light.
  for (let i = 0; i < 26; i++) {
    const p = (t * .3 + seeded(i)) % 1;
    c.globalAlpha = .6 * k;
    rect(c, INTRO_W / 2 + (seeded(i + 7) - .5) * gap * 2.2, p * INTRO_H, 2, 2, '#fff2c4');
  }
  c.globalAlpha = 1;
}

/** 2: wolves and mushroom-folk stopped where they stand, faces up. */
function groveCalm(c, t) {
  sky(c, '#7fb4cc', '#9ecadc', '#bcdcea');
  c.globalAlpha = .35;
  poly(c, [[120, 0], [240, 0], [290, INTRO_H], [70, INTRO_H]], '#ffeeb8');
  c.globalAlpha = 1;
  ground(c, 108, '#2c4430', '#3c5c40');
  for (const [tx, h] of [[26, 66], [74, 54], [300, 62], [340, 50]]) groveTree(c, tx, 112, h, 15, '#1a2c1e');
  // Two wolves, sitting, heads tipped back.
  for (const [wx, s] of [[104, 1], [146, .85]]) {
    const y = 122;
    ellipse(c, wx, y + 3, 15 * s, 5, '#00000055');
    poly(c, [[wx - 13 * s, y], [wx - 9 * s, y - 16 * s], [wx + 8 * s, y - 14 * s], [wx + 12 * s, y]], '#5a5a64');
    poly(c, [[wx + 4 * s, y - 14 * s], [wx + 10 * s, y - 26 * s], [wx + 18 * s, y - 24 * s], [wx + 13 * s, y - 12 * s]], '#6a6a74');
    poly(c, [[wx + 9 * s, y - 26 * s], [wx + 12 * s, y - 32 * s], [wx + 14 * s, y - 25 * s]], '#6a6a74');
    path(c, [[wx - 12 * s, y - 2], [wx - 20 * s, y - 10 * s]], 2, '#5a5a64');
  }
  // Mushroom-folk, out of the huts, arms up.
  for (const [mx, s, tint] of [[212, 1, '#9a5f76'], [244, .8, '#6fa88a'], [272, .9, '#b08a5a']]) {
    const y = 124, bob = Math.sin(t * 2 + mx) * 2;
    ellipse(c, mx, y + 3, 11 * s, 4, '#00000055');
    poly(c, [[mx - 6 * s, y], [mx - 4 * s, y - 20 * s + bob], [mx + 4 * s, y - 20 * s + bob], [mx + 6 * s, y]], '#dcd2ba');
    path(c, [[mx - 5 * s, y - 16 * s + bob], [mx - 12 * s, y - 24 * s + bob]], 2, '#dcd2ba');
    path(c, [[mx + 5 * s, y - 16 * s + bob], [mx + 12 * s, y - 24 * s + bob]], 2, '#dcd2ba');
    ellipse(c, mx, y - 22 * s + bob, 12 * s, 6 * s, tint);
    for (const dx of [-5, 2, 6]) ellipse(c, mx + dx * s, y - 23 * s + bob, 2, 1.4, '#e8dcc8');
  }
}

/** 3: two fires at the grove, and the road going on south. */
function groveFires(c, t) {
  sky(c, '#5a86a8', '#86b0c4', '#b0cedc');
  ground(c, 96, '#2c4430', '#3c5c40');
  // The road out of frame, south.
  poly(c, [[150, 96], [210, 96], [290, INTRO_H], [70, INTRO_H]], '#4a4436');
  poly(c, [[158, 98], [202, 98], [270, INTRO_H], [90, INTRO_H]], '#5b5446');
  for (const [tx, h] of [[24, 60], [62, 48], [306, 56], [344, 44]]) groveTree(c, tx, 100, h, 14, '#1a2c1e');
  // The two fires, and the people between them.
  for (const [fx, fy, sc] of [[112, 116, 1], [242, 110, .85]]) {
    const flick = Math.sin(t * 12 + fx) * 3;
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ellipse(c, fx + Math.cos(a) * 13 * sc, fy + 3 + Math.sin(a) * 6 * sc, 3.5, 2.5, '#4a4a56'); }
    poly(c, [[fx - 8 * sc, fy + 1], [fx - 4 * sc, fy - 9 * sc], [fx, fy - 5 * sc], [fx + 2, fy - 20 * sc + flick], [fx + 7 * sc, fy - 7 * sc], [fx + 9 * sc, fy + 2]], '#dc884b');
    poly(c, [[fx - 3 * sc, fy], [fx - 1, fy - 9 * sc], [fx + 2, fy - 4 * sc], [fx + 4, fy - 13 * sc + flick], [fx + 5 * sc, fy + 1]], '#f6d183');
  }
  // Four small figures round the second fire, one of them bent over a staff.
  for (const [px, sc, coat] of [[222, .9, '#6d5a44'], [262, .7, '#7a6450'], [246, .66, '#6a5a6a'], [276, .85, '#3c3a4a']]) {
    const y = 122, sway = Math.sin(t * 1.4 + px) * .7;
    ellipse(c, px, y + 2, 6 * sc, 2.5, '#00000055');
    poly(c, [[px - 5 * sc, y], [px - 3 * sc, y - 18 * sc], [px + 3 * sc, y - 18 * sc], [px + 5 * sc, y]], coat);
    ellipse(c, px, y - 22 * sc + sway, 3.6 * sc, 4 * sc, '#c99a74');
  }
  path(c, [[281, 110], [284, 124]], 2, '#6b5a45');
  // Sun high, and birds, which the grove has not had in a long time.
  ellipse(c, 306, 26, 15, 15, '#fff2c4');
  c.globalAlpha = .35; ellipse(c, 306, 26, 24, 24, '#ffeeb8'); c.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const bx = (40 + i * 46 + t * 14) % INTRO_W, by = 30 + Math.sin(t * 1.6 + i) * 6;
    path(c, [[bx - 4, by], [bx, by - 3], [bx + 4, by]], 1, '#22303a');
  }
}

const GROVE_SCENES = [groveOpening, groveCalm, groveFires];

export function drawIntroScene(c, index, t) {
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, INTRO_W, INTRO_H);
  const deck = game.introSlide?.deck === 'grove' ? GROVE_SCENES : SCENES;
  deck[Math.max(0, Math.min(deck.length - 1, index))](c, t);
  vignette(c);
}

export const INTRO_SCENES = SCENES.length;
