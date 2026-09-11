// The world map as a screen of its own: full-bleed, pan by dragging, zoom by
// pinch, wheel or the buttons, tap a campfire to choose it, Travel to go.
import { game, player, progress } from '../core/state.js';
import { REGIONS, region } from '../world/regions.js';
import { drawWorldMap, regionAt, MAP_W, MAP_H } from '../render/worldmap.js';
import { rest, crossTo } from '../systems/player.js';
import { fire as liveFire } from '../world/world.js';

/** Where a region's fire stands — the live one once entered, so it is read after crossing. */
const fireOf = () => liveFire;
import { closeDialog } from './dialogs.js';
import { notify } from './hud.js';
import { tone } from '../systems/audio.js';
import { $ } from './dom.js';

export const currentRegion = () => game.region || 'hearthwood';

const view = { zoom: 1, min: 1, max: 4, x: 0, y: 0, selected: null, open: false };
let layer = null, screenCanvas = null, ctx = null;
const pointers = new Map();
let drag = null, pinch = null;

const reachable = r => r && r.built && progress.fires.includes(r.key) && r.key !== currentRegion();

function describe(r) {
  if (!r) return 'Tap a campfire.';
  const known = progress.fires.includes(r.key) || r.key === currentRegion();
  if (r.key === currentRegion()) return `${r.name} — you are here.`;
  if (!known) return 'A fire you have not yet sat beside.';
  if (!r.built) return `${r.name} — ${r.blurb}  The road is not yet open.`;
  return `${r.name} — ${r.blurb}`;
}

/** Fits the whole map on screen and centres it. */
function fit() {
  const w = screenCanvas.clientWidth || 1200, h = screenCanvas.clientHeight || 650;
  screenCanvas.width = w;
  screenCanvas.height = h;
  view.min = Math.min(w / MAP_W, h / MAP_H) * .96;
  view.max = view.min * 4.5;
  view.zoom = view.min;
  view.x = (w - MAP_W * view.zoom) / 2;
  view.y = (h - MAP_H * view.zoom) / 2;
}

/** Keeps the map from being dragged out of sight. */
function clamp() {
  const w = screenCanvas.width, h = screenCanvas.height, mw = MAP_W * view.zoom, mh = MAP_H * view.zoom;
  view.x = mw <= w ? (w - mw) / 2 : Math.min(0, Math.max(w - mw, view.x));
  view.y = mh <= h ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, view.y));
}

/** Zooms about a screen point so what is under the finger stays under it. */
export function zoomAt(factor, sx, sy) {
  const next = Math.max(view.min, Math.min(view.max, view.zoom * factor));
  const k = next / view.zoom;
  view.x = sx - (sx - view.x) * k;
  view.y = sy - (sy - view.y) * k;
  view.zoom = next;
  clamp();
}

const toMap = (sx, sy) => [(sx - view.x) / view.zoom, (sy - view.y) / view.zoom];

export function select(key) {
  view.selected = key;
  const r = region(key);
  $('mapStatus').textContent = describe(r);
  $('mapGo').textContent = reachable(r) ? `Travel to ${r.name}` : 'Travel';
  $('mapGo').disabled = !reachable(r);
}

function paint() {
  if (!view.open) return;
  const w = screenCanvas.clientWidth, h = screenCanvas.clientHeight;
  if (w && (screenCanvas.width !== w || screenCanvas.height !== h)) { screenCanvas.width = w; screenCanvas.height = h; clamp(); }
  drawWorldMap(layer.getContext('2d'), { found: progress.fires, here: currentRegion(), selected: view.selected, time: game.time + (game.mapTime || 0) });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
  ctx.drawImage(layer, Math.round(view.x), Math.round(view.y), Math.round(MAP_W * view.zoom), Math.round(MAP_H * view.zoom));
  requestAnimationFrame(paint);
}

function travelTo(r) {
  if (!reachable(r)) return;
  closeMap();
  crossTo(r.key, { x: 0, y: 0 });
  player.x = fireOf().x;
  player.y = fireOf().y + 46;
  rest();
  notify(`The fire carries you to ${r.name}.`);
}

/** Opens the map over the world. The world pauses beneath it, as under any panel. */
export function openMap() {
  closeDialog();
  layer ??= Object.assign(document.createElement('canvas'), { width: MAP_W, height: MAP_H });
  screenCanvas ??= $('mapCanvas');
  ctx ??= screenCanvas.getContext('2d');
  game.modal = true;
  view.open = true;
  $('mapScreen').hidden = false;
  fit();
  select(view.selected);
  tone(520, .25, 'sine', .02);
  requestAnimationFrame(paint);
}

export function closeMap() {
  if (!view.open) return;
  view.open = false;
  pointers.clear(); drag = null; pinch = null;
  $('mapScreen').hidden = true;
  game.modal = false;
  $('game').focus();
}

export const mapOpen = () => view.open;
export const mapView = () => ({ ...view });

// --- input ------------------------------------------------------------------
function bind() {
  const canvas = $('mapCanvas');
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: view.x, oy: view.y, moved: 0 };
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      drag = null;
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = canvas.getBoundingClientRect();
      zoomAt(dist / pinch.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.dist = dist;
    } else if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      view.x = drag.ox + dx;
      view.y = drag.oy + dy;
      clamp();
    }
  });
  const up = e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (drag && drag.id === e.pointerId) {
      if (drag.moved < 8) {
        const r = canvas.getBoundingClientRect();
        const hit = regionAt(...toMap(e.clientX - r.left, e.clientY - r.top), 26 / Math.max(1, view.zoom / view.min));
        if (hit) { select(hit.key); tone(660, .08, 'sine', .015); }
      }
      drag = null;
    }
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) { const [[id, p]] = [...pointers.entries()]; drag = { id, x: p.x, y: p.y, ox: view.x, oy: view.y, moved: 0 }; }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  $('mapZoomIn').onclick = () => zoomAt(1.3, screenCanvas.width / 2, screenCanvas.height / 2);
  $('mapZoomOut').onclick = () => zoomAt(1 / 1.3, screenCanvas.width / 2, screenCanvas.height / 2);
  $('mapClose').onclick = closeMap;
  $('mapGo').onclick = () => travelTo(region(view.selected));
  window.addEventListener('keydown', e => {
    if (!view.open) return;
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'm') { e.stopImmediatePropagation(); e.preventDefault(); closeMap(); }
    else if (k === '+' || k === '=') zoomAt(1.3, screenCanvas.width / 2, screenCanvas.height / 2);
    else if (k === '-') zoomAt(1 / 1.3, screenCanvas.width / 2, screenCanvas.height / 2);
  }, { capture: true });
  window.addEventListener('resize', () => { if (view.open) clamp(); });
}
bind();
