import { W, H, game, player, camera } from '../core/state.js';
import { particles, numbers } from '../systems/effects.js';
import { entities, enemyStats } from '../systems/entities.js';
import { bossSpec } from '../systems/boss.js';
import { rect, label } from './primitives.js';
import { drawWild, drawBoss } from './scenes.js';
import { drawRoom } from './rooms.js';
import * as world from '../world/world.js';
import { drawAttackIndicator, drawParryCue } from './actors.js';
import { atmosphere } from './lighting.js';
import { drawIntroScene } from './intro.js';
import { zoomStep } from '../core/settings.js';
import { $ } from '../ui/dom.js';

export const canvas = $('game');
export const ctx = canvas.getContext('2d');

/**
 * The backing store is deliberately smaller than the element: that ratio is the
 * pixel scale. It is derived from HEIGHT, not width — a phone in landscape is
 * wide and short, and scaling by width there left barely 230 world units of
 * vertical view. Capped at 1.6 so desktop framing is unchanged.
 */
const TARGET_VIEW_HEIGHT = 430;
const MIN_SCALE = .55, MAX_SCALE = 1.6;

export function autoScale(height) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, height / TARGET_VIEW_HEIGHT));
}

/** Something too big to frame is on the floor; the view pulls back until it is gone. */
let wideView = false;
const wantsWideView = () =>
  entities.enemies.some(e => e.hp > 0 && enemyStats(e).scale >= 3)
  || (entities.boss?.hp > 0 && bossSpec().arena === 'cave');

export function resize() {
  const r = canvas.getBoundingClientRect();
  const scale = Math.min(2.4, Math.max(.45, autoScale(r.height) * zoomStep().factor * (wideView ? .68 : 1)));
  canvas.width = Math.round(r.width / scale);
  canvas.height = Math.round(r.height / scale);
  camera.w = canvas.width;
  camera.h = canvas.height;
  ctx.imageSmoothingEnabled = false;
}

const introCanvas = $('introCanvas');

export function draw() {
  const wide = wantsWideView();
  if (wide !== wideView) { wideView = wide; resize(); }
  if (game.screen === 'intro') {
    drawIntroScene(introCanvas.getContext('2d'), game.introSlide.index, game.time - game.introSlide.since);
    return;
  }
  // The title screen parks the camera on the camp and hides the wanderer.
  const focus = game.cinematic || player;
  const { w, h } = game.scene === 'wild' ? world.size : { w: W, h: H };
  camera.x = Math.max(0, Math.min(w - camera.w, focus.x - camera.w / 2));
  camera.y = Math.max(0, Math.min(h - camera.h, focus.y - camera.h * .59));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    -Math.floor(camera.x) + (game.shake ? Math.random() * game.shake - game.shake / 2 : 0),
    -Math.floor(camera.y),
  );

  if (game.scene === 'wild') drawWild(ctx); else if (game.scene === 'room') drawRoom(ctx); else drawBoss(ctx);
  drawAttackIndicator(ctx);
  drawParryCue(ctx);
  atmosphere(ctx);

  for (const p of particles) {
    if (p.scene && p.scene !== game.scene) continue;
    ctx.globalAlpha = Math.min(1, p.life * 2);
    rect(ctx, p.x, p.y, 3, 3, p.c);
  }
  ctx.globalAlpha = 1;
  for (const n of numbers) label(ctx, n.x, n.y, n.text, n.c, 11);
  ctx.restore();

  if (game.canopy) drawCanopy(ctx);

  if (game.damageFlash > 0) {
    ctx.save();
    ctx.globalAlpha = game.damageFlash * .9;
    ctx.strokeStyle = '#a02738';
    ctx.lineWidth = 18;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

/**
 * The grove's roof coming apart. Two halves of a black canopy slide off the
 * screen, a shaft of sun widens through the gap, and the whole picture warms up
 * as it goes. Drawn in screen space, over everything, so it reads as the sky
 * rather than as one more thing in the world.
 */
function drawCanopy(c) {
  const k = game.canopy.k ?? 0;
  const w = c.canvas.width, h = c.canvas.height;
  const ease = k * k * (3 - 2 * k);
  const gap = ease * w * .62;
  c.save();
  // The two halves of the canopy, drawn as ragged leaf-edges parting.
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side < 0 ? -gap : gap, 0);
    c.fillStyle = '#0a0e0b';
    c.beginPath();
    c.moveTo(side < 0 ? 0 : w, 0);
    c.lineTo(w / 2, 0);
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const edge = w / 2 + side * Math.sin(t * Math.PI * 3.5) * 26;
      c.lineTo(edge, t * h);
    }
    c.lineTo(side < 0 ? 0 : w, h);
    c.closePath();
    c.fill();
    c.restore();
  }
  // The shaft of sun through the gap.
  const light = c.createLinearGradient(0, 0, 0, h);
  light.addColorStop(0, `rgba(255, 240, 198, ${.75 * ease})`);
  light.addColorStop(.55, `rgba(246, 209, 131, ${.32 * ease})`);
  light.addColorStop(1, 'rgba(246, 209, 131, 0)');
  c.fillStyle = light;
  c.beginPath();
  c.moveTo(w / 2 - gap * .34, 0);
  c.lineTo(w / 2 + gap * .34, 0);
  c.lineTo(w / 2 + gap * .78, h);
  c.lineTo(w / 2 - gap * .78, h);
  c.closePath();
  c.fill();
  // Motes turning over in the new light.
  c.globalAlpha = ease * .7;
  for (let i = 0; i < 40; i++) {
    const t = (game.time * .22 + i * .137) % 1;
    const mx = w / 2 + Math.sin(i * 2.3 + game.time * .5) * gap * .6;
    rect(c, mx, t * h, 2, 2, '#fff2c4');
  }
  // Everything warms as it opens.
  c.globalAlpha = ease * .22;
  rect(c, 0, 0, w, h, '#f6d183');
  c.globalAlpha = 1;
  c.restore();
}
