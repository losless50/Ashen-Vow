// Pixel icons drawn with the same primitives as the world art, so the interface
// and the game share one visual language. Each icon is authored on a 16x16 grid
// and cached as a data URI for use as a CSS background or an <img> source.
import { rect, poly, path } from '../render/primitives.js';

const G = 16;

const INK = '#120f18';

const DRAW = {
  vitality(c) {
    poly(c, [[2, 5], [4, 3], [7, 4], [8, 5], [9, 4], [12, 3], [14, 5], [14, 8], [8, 14], [2, 8]], INK);
    poly(c, [[3, 5], [5, 4], [7, 5], [8, 6], [9, 5], [11, 4], [13, 5], [13, 8], [8, 13], [3, 8]], '#a8303f');
    poly(c, [[4, 6], [6, 5], [7, 6], [7, 8], [5, 9], [4, 7]], '#d9565c');
    rect(c, 5, 6, 1, 1, '#f6a9a0');
  },
  stamina(c) {
    poly(c, [[9, 1], [11, 1], [8, 7], [12, 7], [6, 15], [7, 9], [4, 9]], INK);
    poly(c, [[9, 2], [10, 2], [7, 8], [11, 8], [7, 13], [8, 9], [5, 9]], '#8fbf6a');
    rect(c, 8, 3, 1, 3, '#e2f0b6');
  },
  flask(c) {
    rect(c, 6, 1, 4, 2, INK);
    rect(c, 7, 1, 2, 1, '#8a7350');
    poly(c, [[6, 3], [10, 3], [13, 9], [13, 14], [3, 14], [3, 9]], INK);
    poly(c, [[7, 4], [9, 4], [12, 9], [12, 13], [4, 13], [4, 9]], '#3b2f26');
    poly(c, [[5, 9], [11, 9], [11, 12], [5, 12]], '#e0a748');
    rect(c, 5, 9, 6, 1, '#ffd98d');
    rect(c, 6, 6, 1, 3, '#c9bda4');
  },
  sword(c) {
    poly(c, [[12, 1], [15, 1], [15, 4], [7, 12], [4, 9]], INK);
    poly(c, [[12, 2], [14, 2], [14, 4], [7, 11], [5, 9]], '#9ab6c4');
    path(c, [[13, 3], [7, 9]], 1, '#f2f4de');
    poly(c, [[2, 9], [6, 13], [4, 15], [1, 12]], INK);
    rect(c, 3, 10, 3, 3, '#e0b06a');
    rect(c, 1, 12, 2, 2, '#8a5c3c');
  },
  heavy(c) {
    poly(c, [[11, 2], [15, 2], [15, 5], [7, 13], [3, 9]], INK);
    poly(c, [[11, 3], [14, 3], [14, 5], [7, 12], [4, 9]], '#d8cdae');
    path(c, [[12, 4], [7, 9]], 1, '#fff5cf');
    poly(c, [[1, 9], [5, 14], [3, 15], [0, 12]], INK);
    rect(c, 2, 10, 3, 3, '#f0c877');
    rect(c, 1, 1, 2, 2, '#ffe6a8');
    rect(c, 4, 3, 1, 1, '#ffe6a8');
    rect(c, 2, 5, 1, 1, '#ffe6a8');
  },
  timber(c) {
    poly(c, [[1, 6], [11, 3], [14, 6], [14, 10], [4, 13], [1, 10]], INK);
    poly(c, [[2, 7], [11, 4], [13, 6], [13, 9], [4, 12], [2, 9]], '#7c5f3a');
    poly(c, [[10, 4], [13, 6], [13, 9], [10, 8]], '#c39a5e');
    rect(c, 11, 6, 1, 2, '#5e442b');
    path(c, [[3, 8], [9, 6]], 1, '#a5834f');
  },
  ore(c) {
    poly(c, [[2, 11], [4, 5], [8, 2], [12, 5], [14, 11], [8, 14]], INK);
    poly(c, [[3, 10], [5, 6], [8, 3], [11, 6], [13, 10], [8, 13]], '#4b4750');
    poly(c, [[6, 9], [7, 5], [9, 6], [9, 10]], '#3f86ad');
    poly(c, [[9, 10], [10, 7], [12, 9], [11, 11]], '#5fa8c9');
    rect(c, 7, 6, 1, 3, '#bfeaf5');
  },
  ember(c) {
    poly(c, [[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], '#8a5a18');
    poly(c, [[8, 2], [9, 7], [14, 8], [9, 9], [8, 14], [7, 9], [2, 8], [7, 7]], '#f0c877');
    rect(c, 7, 7, 2, 2, '#fff3cd');
  },
  satchel(c) {
    poly(c, [[2, 6], [14, 6], [13, 14], [3, 14]], INK);
    poly(c, [[3, 7], [13, 7], [12, 13], [4, 13]], '#6d4c2e');
    poly(c, [[2, 4], [14, 4], [14, 8], [2, 8]], INK);
    poly(c, [[3, 5], [13, 5], [13, 7], [3, 7]], '#8f6a41');
    rect(c, 7, 6, 2, 4, '#3a2718');
    rect(c, 7, 6, 2, 1, '#d8b070');
    path(c, [[5, 4], [6, 1], [10, 1], [11, 4]], 1, '#8f6a41');
  },
  character(c) {
    poly(c, [[3, 5], [5, 1], [11, 1], [13, 5], [13, 11], [8, 15], [3, 11]], INK);
    poly(c, [[4, 5], [6, 2], [10, 2], [12, 5], [12, 10], [8, 14], [4, 10]], '#5b7280');
    poly(c, [[5, 5], [7, 3], [9, 3], [10, 5], [10, 7], [6, 7]], '#8fa8b5');
    rect(c, 4, 7, 8, 3, INK);
    rect(c, 5, 8, 2, 1, '#e8b86d');
    rect(c, 9, 8, 2, 1, '#e8b86d');
    rect(c, 7, 1, 2, 5, '#c7d4d1');
  },
  pause(c) {
    rect(c, 3, 2, 4, 12, INK);
    rect(c, 4, 3, 2, 10, '#dcd2b8');
    rect(c, 9, 2, 4, 12, INK);
    rect(c, 10, 3, 2, 10, '#dcd2b8');
  },
  sound(c) {
    poly(c, [[2, 6], [5, 6], [9, 2], [9, 14], [5, 10], [2, 10]], INK);
    poly(c, [[3, 7], [5, 7], [8, 4], [8, 12], [5, 9], [3, 9]], '#dcd2b8');
    path(c, [[11, 5], [12, 8], [11, 11]], 1, '#d4b877');
    path(c, [[13, 3], [15, 8], [13, 13]], 1, '#d4b877');
  },
  mute(c) {
    poly(c, [[2, 6], [5, 6], [9, 2], [9, 14], [5, 10], [2, 10]], INK);
    poly(c, [[3, 7], [5, 7], [8, 4], [8, 12], [5, 9], [3, 9]], '#8d8378');
    path(c, [[11, 5], [15, 11]], 2, INK);
    path(c, [[15, 5], [11, 11]], 2, INK);
    path(c, [[11, 5], [15, 11]], 1, '#a8303f');
    path(c, [[15, 5], [11, 11]], 1, '#a8303f');
  },
  help(c) {
    poly(c, [[2, 1], [14, 1], [14, 15], [2, 15]], INK);
    poly(c, [[3, 2], [13, 2], [13, 14], [3, 14]], '#3a3040');
    rect(c, 5, 4, 6, 1, '#d4b877');
    rect(c, 5, 6, 6, 1, '#a3948c');
    rect(c, 5, 8, 4, 1, '#a3948c');
    rect(c, 5, 10, 6, 1, '#a3948c');
    rect(c, 5, 12, 3, 1, '#a3948c');
  },
  close(c) {
    path(c, [[3, 3], [13, 13]], 4, INK);
    path(c, [[13, 3], [3, 13]], 4, INK);
    path(c, [[3, 3], [13, 13]], 2, '#dcd2b8');
    path(c, [[13, 3], [3, 13]], 2, '#dcd2b8');
  },
  roll(c) {
    c.strokeStyle = INK;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(8, 8, 5, .6, 5.2);
    c.stroke();
    c.strokeStyle = '#a8c6d4';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(8, 8, 5, .6, 5.2);
    c.stroke();
    poly(c, [[10, 0], [15, 3], [9, 6]], INK);
    poly(c, [[11, 1], [13, 3], [10, 5]], '#e2eef2');
  },
  hand(c) {
    poly(c, [[4, 5], [6, 3], [8, 4], [10, 3], [12, 5], [12, 12], [5, 12]], INK);
    poly(c, [[5, 6], [6, 4], [7, 5], [9, 4], [11, 6], [11, 11], [6, 11]], '#c99a72');
    rect(c, 6, 6, 1, 3, '#e8bb92');
    rect(c, 3, 1, 2, 3, '#d4b877');
    rect(c, 12, 1, 2, 3, '#d4b877');
  },
  parry(c) {
    // A blade held up to catch a blow, and the spark where steel meets steel.
    // Drawn dark, since it sits on the gold parry button.
    poly(c, [[6, 15], [2, 11], [10, 3], [13, 1], [15, 4], [8, 13]], INK);
    poly(c, [[6, 13], [4, 11], [11, 4], [12, 3], [13, 5], [7, 12]], '#9ab6c4');
    path(c, [[11, 4], [6, 10]], 1, '#f2f4de');
    rect(c, 1, 10, 6, 2, INK);
    rect(c, 2, 11, 4, 1, '#e0b06a');
    rect(c, 0, 13, 4, 3, INK);
    rect(c, 1, 14, 2, 1, '#8a5c3c');
    // The blow glancing off, struck in ink so it reads on gold.
    for (const [x, y, w, h] of [[12, 0, 2, 1], [15, 2, 1, 2], [9, 0, 1, 1], [15, 6, 1, 1], [11, 7, 1, 1]]) rect(c, x, y, w, h, INK);
    rect(c, 13, 2, 1, 1, '#fff2c4');
    rect(c, 12, 5, 1, 1, '#fff2c4');
  },
  chevron(c) {
    poly(c, [[5, 1], [12, 8], [5, 15], [3, 13], [8, 8], [3, 3]], INK);
    poly(c, [[6, 3], [10, 8], [6, 13], [5, 12], [8, 8], [5, 4]], '#d4b877');
  },
  hearth(c) {
    poly(c, [[2, 13], [14, 13], [13, 15], [3, 15]], INK);
    rect(c, 3, 13, 10, 1, '#6d5a3c');
    poly(c, [[8, 1], [11, 6], [10, 8], [12, 7], [12, 11], [8, 14], [4, 11], [4, 7], [6, 8], [5, 6]], INK);
    poly(c, [[8, 3], [10, 7], [11, 10], [8, 13], [5, 10], [6, 7]], '#dc884b');
    poly(c, [[8, 6], [10, 10], [8, 12], [6, 10]], '#f6d183');
    rect(c, 7, 9, 2, 2, '#fff0be');
  },
  anvil(c) {
    poly(c, [[1, 4], [15, 4], [13, 8], [10, 9], [10, 12], [12, 13], [12, 15], [4, 15], [4, 13], [6, 12], [6, 9], [3, 8]], INK);
    poly(c, [[2, 5], [14, 5], [12, 7], [9, 8], [9, 12], [11, 14], [5, 14], [7, 12], [7, 8], [4, 7]], '#6d737d');
    rect(c, 3, 5, 9, 1, '#b0b7bd');
  },
  build(c) {
    path(c, [[3, 13], [11, 4]], 3, INK);
    path(c, [[3, 13], [11, 4]], 1, '#8f6a41');
    poly(c, [[9, 1], [15, 4], [12, 8], [8, 5]], INK);
    poly(c, [[10, 2], [14, 4], [12, 7], [9, 5]], '#8a949e');
    rect(c, 2, 12, 3, 3, '#4a3a2c');
  },
};

export const ICON_NAMES = Object.keys(DRAW);

const cache = new Map();

/** Renders one icon and returns a cached data URI, crisp at any multiple of 16px. */
export function iconUrl(name, scale = 3) {
  const key = `${name}@${scale}`;
  if (cache.has(key)) return cache.get(key);
  const draw = DRAW[name];
  if (!draw) throw new Error(`Unknown icon: ${name}`);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = G * scale;
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.save();
  c.scale(scale, scale);
  draw(c);
  c.restore();
  const url = canvas.toDataURL ? canvas.toDataURL('image/png') : '';
  cache.set(key, url);
  return url;
}

/** An <i> element carrying the icon as a background — the usual way to place one. */
export function icon(name, size = 16) {
  const el = document.createElement('i');
  el.className = 'icon';
  el.style.width = el.style.height = size + 'px';
  el.style.backgroundImage = `url(${iconUrl(name)})`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/** Paints an icon straight onto a game canvas context (HUD, world labels). */
export function drawIcon(c, name, x, y, scale = 1) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  DRAW[name](c);
  c.restore();
}

/** Points a button's --btn-icon (or any custom property) at a rendered icon. */
export function applyIcon(el, name, prop = '--btn-icon') {
  el?.style?.setProperty(prop, `url(${iconUrl(name)})`);
}
