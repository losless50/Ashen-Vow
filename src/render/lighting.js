import { game, camera } from '../core/state.js';
import { entities, bossBodies } from '../systems/entities.js';
import { veins, props, npcs, fire as regionFire } from '../world/world.js';
import { player, progress, lostHere } from '../core/state.js';
import { bossSpec } from '../systems/boss.js';
import { QUARRY } from '../world/quarry.js';
import { groveDawned } from '../world/grove.js';
import { ECHO_VAULT_TORCHES } from '../world/echo.js';
import * as vault from '../world/sunken.js';
import { rect, ellipse, poly, path } from './primitives.js';

function radial(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const ctx = c.getContext('2d'), grad = ctx.createRadialGradient(96, 96, 0, 96, 96, 96);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 192, 192);
  return c;
}

const glowSprite = radial([[0, '#ffb65e86'], [.22, '#e67d252f'], [.55, '#b54d120c'], [1, '#b4581800']]);
const blueGlow = radial([[0, '#a3ebffa0'], [.25, '#328fcb38'], [.6, '#204b990d'], [1, '#23395700']]);
const holyGlow = radial([[0, '#fff6d6c0'], [.3, '#ffe4a060'], [.65, '#d9b56a18'], [1, '#c9a25a00']]);
const tealGlow = radial([[0, '#9fffdcb0'], [.25, '#3fbf9040'], [.6, '#1a6a5010'], [1, '#0f3a2c00']]);
const violetGlow = radial([[0, '#e2c4ffb0'], [.25, '#8a5ac040'], [.6, '#4a2a7010'], [1, '#2a1a4000']]);
const amberGlow = radial([[0, '#ffe2a8b0'], [.25, '#e08a3040'], [.6, '#7a4a1010'], [1, '#3a200800']]);
const roseGlow = radial([[0, '#ffd8e6c0'], [.28, '#e08ab050'], [.62, '#7a3a5a14'], [1, '#3a1a2800']]);
const GLOWS = { '#6fd6b0': tealGlow, '#b48ad0': violetGlow, '#f2a54b': amberGlow };

export const lamps = [
  { x: 565, y: 526 }, { x: 856, y: 466 }, { x: 975, y: 621 }, { x: 824, y: 352 },
  { x: QUARRY.cx - 96, y: 636 }, { x: QUARRY.cx + 78, y: 700 },
];
export const wildCrystals = [{ x: 1021, y: 563 }, { x: 1198, y: 720 }, { x: 940, y: 252 }];
export const sanctuaryCrystals = [{ x: 502, y: 337 }, { x: 995, y: 405 }, { x: 496, y: 696 }, { x: 1000, y: 800 }];

export function crystal(c, x, y) {
  ellipse(c, x, y + 2, 14, 5, '#1c192b88');
  poly(c, [[x - 9, y], [x - 14, y - 15], [x - 8, y - 22], [x - 3, y - 12], [x - 2, y + 1]], '#527797');
  poly(c, [[x - 3, y + 1], [x - 5, y - 23], [x + 2, y - 35], [x + 8, y - 20], [x + 5, y]], '#669bbe');
  poly(c, [[x + 2, y - 35], [x + 2, y - 4], [x + 8, y - 20]], '#a0d9e4');
  poly(c, [[x + 5, y], [x + 10, y - 16], [x + 15, y - 19], [x + 15, y - 6]], '#6ca5bb');
  rect(c, x - 1, y - 24, 2, 9, '#d0eff1');
}

export function lantern(c, x, y) {
  rect(c, x - 2, y - 29, 4, 32, '#34272b');
  path(c, [[x, y - 28], [x + 11, y - 28], [x + 11, y - 22]], 2, '#534047');
  rect(c, x + 6, y - 23, 10, 13, '#352932');
  rect(c, x + 8, y - 21, 6, 8, '#f8c27c');
  rect(c, x + 10, y - 20, 2, 6, '#fff0c7');
}

export function light(c, x, y, r, strength = 1, sprite = glowSprite) {
  if (x + r < camera.x || x - r > camera.x + camera.w || y + r < camera.y || y - r > camera.y + camera.h) return;
  c.globalAlpha = strength;
  c.drawImage(sprite, Math.round(x - r), Math.round(y - r), r * 2, r * 2);
}

/** How far the pocket lantern actually holds the dark back. */
const LANTERN_R = 250;
const lanternGlow = radial([[0, '#ffd99870'], [.5, '#ffcf7a60'], [.78, '#c9822e30'], [.94, '#6a3c1410'], [1, '#3a200800']]);

let darkLayer = null;
/**
 * The sheet of dark that sits over a lightless place — with a hole burned
 * through it wherever Aldren's lantern is, so the ground around him is simply
 * visible rather than merely tinted warm.
 */
function darkness(c, alpha, tint) {
  const lit = progress.owned.includes('lantern');
  if (!lit) {
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = alpha;
    rect(c, camera.x, camera.y, camera.w, camera.h, tint);
    c.globalAlpha = 1;
    return;
  }
  const w = Math.max(1, Math.ceil(camera.w)), h = Math.max(1, Math.ceil(camera.h));
  darkLayer ??= document.createElement('canvas');
  if (darkLayer.width !== w || darkLayer.height !== h) { darkLayer.width = w; darkLayer.height = h; }
  const d = darkLayer.getContext('2d');
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, w, h);
  d.fillStyle = tint;
  d.fillRect(0, 0, w, h);
  // Burn the lantern's circle out of the dark: opaque at the rim, gone at the wick.
  const px = player.x - camera.x, py = player.y - 16 - camera.y;
  try {
    const g = d.createRadialGradient(px, py, 0, px, py, LANTERN_R);
    g.addColorStop(0, '#000000ff');
    g.addColorStop(.5, '#000000f2');
    g.addColorStop(.78, '#00000090');
    g.addColorStop(.93, '#00000028');
    g.addColorStop(1, '#00000000');
    d.globalCompositeOperation = 'destination-out';
    d.fillStyle = g;
    d.fillRect(px - LANTERN_R, py - LANTERN_R, LANTERN_R * 2, LANTERN_R * 2);
  } catch { /* no gradients here */ }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = alpha;
  c.drawImage(darkLayer, Math.floor(camera.x), Math.floor(camera.y));
  c.globalAlpha = 1;
}

/** Echo Grove: the dark comes down over everything, then only the lights push it back. */
/**
 * Daylight over the grove. There is no filter here and no overlay: the map being
 * drawn is the lit copy of itself, so this is exactly what Hearthwood does — no
 * darkness at all, and lights that only ever add. The fire and the caps still
 * glow, they are simply no longer what is holding the dark off.
 */
function daylight(c, flicker) {
  c.globalCompositeOperation = 'screen';
  light(c, regionFire.x, regionFire.y - 8, 52 * flicker, .4);
  for (const n of npcs) if (n.type === 'peddler') light(c, n.x + 26, n.y - 30, 30 * flicker, .35, amberGlow);
  for (const m of props.mushrooms) light(c, m.x, m.y - 12, 16 * m.s, .26, GLOWS[m.color] || tealGlow);
  if (props.sporehouse) light(c, props.sporehouse.x, props.sporehouse.y + 16, 24, .3, violetGlow);
  for (const [i, h] of props.huts.entries()) light(c, h.x, h.y + 6, 26 * flicker, .3, [violetGlow, tealGlow, amberGlow][i % 3]);
}

function groveLights(c, flicker) {
  // Before: a roof that lets nothing through, and every colour in the region
  // painted for it. After: the ground itself has to be lifted, not merely
  // un-darkened — poking holes in a black sheet cannot make a dark floor bright.
  if (groveDawned()) { daylight(c, flicker); return; }
  darkness(c, .62, '#04080a');
  c.globalCompositeOperation = 'screen';
  for (const m of props.mushrooms) light(c, m.x, m.y - 12, (34 + Math.sin(game.time * 2 + m.phase) * 5) * m.s, .8, GLOWS[m.color] || tealGlow);
  light(c, regionFire.x, regionFire.y - 8, 96 * flicker, .7);
  light(c, regionFire.x, regionFire.y - 8, 36 * flicker, 1);
  // A faint light on the wanderer himself, so he is never lost.
  light(c, player.x, player.y - 20, 58, .28, holyGlow);
  // The pocket lantern's warmth, on top of the hole it has already burned in the dark.
  // Warmth over the whole circle, gentle enough that the ground keeps its colour.
  if (progress.owned.includes('lantern')) light(c, player.x, player.y - 16, LANTERN_R * flicker, .38, lanternGlow);
  for (const e of entities.enemies) if (e.hp > 0) light(c, e.x, e.y - 24, e.kind === 'sporeling' ? 30 : 16, .5, e.kind === 'sporeling' ? GLOWS[{ teal: '#6fd6b0', violet: '#b48ad0', amber: '#f2a54b', mother: '#b48ad0' }[e.skin]] || violetGlow : amberGlow);
  if (props.sporehouse) { light(c, props.sporehouse.x, props.sporehouse.y + 16, 40, .7, violetGlow); light(c, props.sporehouse.x, props.sporehouse.y - 40, 130, .35, violetGlow); }
  if (props.burrow) light(c, props.burrow.x, props.burrow.y, 56, .7, tealGlow);
  for (const [i, h] of props.huts.entries()) light(c, h.x, h.y + 6, 44 * flicker, .7, [violetGlow, tealGlow, amberGlow][i % 3]);
  for (const p of props.wayposts) if (p.lit) light(c, p.x + 13, p.y - 35, 78 * flicker, .85);
  for (const s of entities.shots) light(c, s.x, s.y, 20, .6, tealGlow);
  for (const n of npcs) if (n.type === 'chest' && !progress.opened.includes(n.id)) light(c, n.x, n.y - 14, 54 * flicker, .55, amberGlow);
  for (const k of props.camps) light(c, k.x, k.y, 26, .3);
  if (props.cave) light(c, props.cave.x, props.cave.y + 12, 70, .55, tealGlow);
  const dropped = lostHere();
  if (dropped) light(c, dropped.x, dropped.y - 8, 96 * flicker, 1);
  if (props.cookfire) { light(c, props.cookfire.x, props.cookfire.y - 6, 70 * flicker, .7); light(c, props.cookfire.x, props.cookfire.y - 6, 28 * flicker, 1); }
  // Orrin's lamps: the staff lantern and the two at his coat.
  for (const n of npcs) if (n.type === 'peddler') {
    light(c, n.x + 26, n.y - 30, 52 * flicker, .9, amberGlow);
    light(c, n.x, n.y - 16, 34 * flicker, .6, amberGlow);
  }
}

/** Cold dusk over the vault; warm wayfinding lights and a restrained tidal glow. */
function vaultLights(c, flicker) {
  const { SUNKEN, SUNKEN_FIRES, SUNKEN_TORCHES } = vault;
  darkness(c, .56, '#07121e');
  c.globalCompositeOperation = 'screen';
  if (props.waterGlow) {
    c.globalAlpha = .8 + Math.sin(game.time * .45) * .08;
    c.drawImage(props.waterGlow, 0, 0, vault.SUNKEN_W, vault.SUNKEN_H);
  }
  // Slow phosphorescent eddies and pinpricks, each safely inside its water patch.
  for (const m of props.waterMotes) {
    const x = m.x + Math.sin(game.time * .32 + m.phase) * 6;
    const y = m.y + Math.cos(game.time * .27 + m.phase) * 4;
    const pulse = .5 + Math.sin(game.time * 1.1 + m.phase) * .35;
    light(c, x, y, 28, pulse * .55, tealGlow);
    c.globalAlpha = pulse;
    rect(c, x, y, 2, 2, '#c6ffec');
    const ring = (game.time * .14 + m.phase / (Math.PI * 2)) % 1;
    c.globalAlpha = (1 - ring) * .25;
    c.strokeStyle = '#81e6d1'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(x, y, 5 + ring * 15, 2 + ring * 6, 0, 0, Math.PI * 2); c.stroke();
  }
  for (const f of SUNKEN_FIRES) {
    light(c, f.x, f.y - 8, 175 * flicker, 1, amberGlow);
    light(c, f.x, f.y - 8, 60 * flicker, .9);
  }
  for (const t of SUNKEN_TORCHES) {
    const pulse = 1 + Math.sin(game.time * 11 + t.x) * .035;
    light(c, t.x, t.y - 48, 124 * pulse, .85, amberGlow);
    light(c, t.x, t.y - 48, 36 * pulse, .9);
  }
  light(c, SUNKEN.depths.x, SUNKEN.depths.y, 100 * flicker, .35, amberGlow);
  light(c, SUNKEN.halls.x, SUNKEN.halls.y, 120, .24, tealGlow);
  for (const f of SUNKEN.falls) light(c, f.x, f.y, 96, .3, tealGlow);
  light(c, player.x, player.y - 20, 70, .23, holyGlow);
  if (progress.owned.includes('lantern')) light(c, player.x, player.y - 16, LANTERN_R * flicker, .3, lanternGlow);
  const dropped = lostHere();
  if (dropped) light(c, dropped.x, dropped.y - 8, 96 * flicker, 1);
}

export function atmosphere(c) {
  c.save();
  c.globalCompositeOperation = 'screen';
  const flicker = 1 + Math.sin(game.time * 8) * .025 + Math.sin(game.time * 17) * .015;
  const lost = lostHere();
  if (game.scene === 'wild' && game.region === 'echo') {
    groveLights(c, flicker);
    c.globalCompositeOperation = 'screen';
    for (const t of ECHO_VAULT_TORCHES) light(c, t.x, t.y - 48, 135 * flicker, .9, amberGlow);
  } else if (game.scene === 'room') {
    const house = game.room === 'sporehouse';
    darkness(c, house ? .3 : .45, house ? '#120c16' : '#04080a');
    c.globalCompositeOperation = 'screen';
    const n = house ? 12 : 18, rx = house ? 262 : 200, ry = house ? 246 : 182;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; light(c, 750 + Math.cos(a) * rx, 553 + Math.sin(a) * ry - 8, 44, .8, house ? [violetGlow, amberGlow, tealGlow][i % 3] : [tealGlow, tealGlow, violetGlow][i % 3]); }
    if (house) light(c, 750, 400, 80, .5, violetGlow);
    light(c, player.x, player.y - 20, 58, .28, holyGlow);
    if (progress.owned.includes('lantern')) light(c, player.x, player.y - 16, LANTERN_R * flicker, .38, lanternGlow);
    if (lost) light(c, lost.x, lost.y - 8, 96 * flicker, 1);
    for (const e of entities.enemies) if (e.hp > 0) light(c, e.x, e.y - 30, 50, .6, e.kind === 'sporeling' ? violetGlow : tealGlow);
  } else if (game.scene === 'boss' && bossSpec().arena === 'vault') {
    // The hold is lit by what is floating in the water and by the lamp in his skull.
    darkness(c, .5, '#03090c');
    c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      light(c, 750 + Math.cos(a) * 198, 553 + Math.sin(a) * 176 - 10, 42, .7, i % 3 ? tealGlow : blueGlow);
    }
    light(c, 750, 300, 74, .5, amberGlow);
    light(c, player.x, player.y - 20, 58, .28, holyGlow);
    if (progress.owned.includes('lantern')) light(c, player.x, player.y - 16, LANTERN_R * flicker, .38, lanternGlow);
    if (lost) light(c, lost.x, lost.y - 8, 96 * flicker, 1);
    for (const body of bossBodies()) {
      if (body.hp <= 0 || body.state === 'fallen') continue;
      // The captain's one lit eye, and whatever the sting is full of.
      if (body.role === 'captain') light(c, body.x, body.y - 70, 46 * flicker, .7, tealGlow);
      else light(c, body.x, body.y - 26, body.state === 'molt' ? 120 : 74, .6, body.state === 'molt' ? holyGlow : tealGlow);
      if (body.role === 'crowned') light(c, body.x, body.y - 82, 58 * flicker, .7, amberGlow);
    }
    for (const s of entities.shots) light(c, s.x, s.y, 20, .6, amberGlow);
  } else if (game.scene === 'boss' && bossSpec().arena === 'cave') {
    darkness(c, .45, '#04080a');
    c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; light(c, 750 + Math.cos(a) * 205, 553 + Math.sin(a) * 185 - 12, 40, .8, [tealGlow, violetGlow, amberGlow][i % 3]); }
    light(c, 750, 640, 70, .5, tealGlow);
    light(c, 750, 322, 40, .6, tealGlow);
    light(c, player.x, player.y - 20, 58, .28, holyGlow);
    if (progress.owned.includes('lantern')) light(c, player.x, player.y - 16, LANTERN_R * flicker, .38, lanternGlow);
    if (lost) light(c, lost.x, lost.y - 8, 96 * flicker, 1);
    const b = entities.boss;
    // Vaelira carries her own light, and it flares while she is changing hands.
    if (b?.hp > 0 && b.kind === 'vaelira') {
      const shift = b.state === 'shift' ? 1 : 0;
      light(c, b.x, b.y - 46, (110 + shift * 90) * flicker, .85, roseGlow);
      light(c, b.x, b.y - 46, 44 * flicker, .8, roseGlow);
      if (shift) light(c, b.x, b.y - 40, 200, .7, tealGlow);
      for (const s of entities.shots) light(c, s.x, s.y, 22, .6, s.kind === 'acid' ? tealGlow : amberGlow);
    } else if (b?.hp > 0) light(c, b.x, b.y - 40, b.phase === 2 ? 90 : 60, .7, tealGlow);
  } else if (game.scene === 'wild' && game.region === 'sunken') {
    vaultLights(c, flicker);
  } else if (game.scene === 'wild') {
    light(c, 714, 576, 108 * flicker, .6);
    light(c, 714, 575, 39 * flicker, 1);
    light(c, 463, 532, 58 * flicker, .9);
    for (const l of lamps) light(c, l.x + 11, l.y - 17, 54 * flicker, .9);
    light(c, 799, 198, 64, .6);
    for (const p of wildCrystals) light(c, p.x, p.y - 14, 43, .85, blueGlow);
    for (const v of veins) if (!v.regrow) light(c, v.x, v.y - 12, 38, .7, blueGlow);
  } else {
    for (const p of sanctuaryCrystals) light(c, p.x, p.y - 15, 49, .85, blueGlow);
    for (const x of [453, 1035]) for (let y = 300; y < 870; y += 108) light(c, x + 3, y - 20, 61 * flicker, .8);
    // Haloes the crown rather than pooling around the legs.
    if (entities.boss?.phase === 2 && entities.boss.hp > 0) light(c, entities.boss.x, entities.boss.y - 82, 46, .55);
    // The Herald: a column of light around it, and a warm wash over the whole chamber.
    const h = entities.herald;
    if (h && game.glow > 0) {
      light(c, h.x, h.y - 20, 120 + 80 * game.glow, game.glow, holyGlow);
      light(c, h.x, h.ty + 30, 220 * game.glow, .55 * game.glow, holyGlow);
      c.globalAlpha = game.glow * .26;
      rect(c, camera.x, camera.y, camera.w, camera.h, '#ffe8b8');
    }
  }
  c.restore();
}
