import { game } from '../core/state.js';
import { rect } from '../render/primitives.js';

export const particles = [], numbers = [], bloodStains = [], goreFragments = [], spores = [];

const LIMITS = { stains: 320, fragments: 60, particles: 450, spores: 90 };

function cap(list, max) {
  if (list.length > max) list.splice(0, list.length - max);
}

export function burst(x, y, c, n = 10) {
  for (let i = 0; i < n; i++)
    particles.push({ x, y, vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 90, life: .3 + Math.random() * .5, c });
  cap(particles, LIMITS.particles);
}

/**
 * The Sporemother's Heart drawing the bog in to close a wound: motes come out
 * of the air a little way off and drift in, and go out where they touch him.
 */
export function sporeMote(x, y, hurry = 1) {
  const a = Math.random() * Math.PI * 2, r = 52 + Math.random() * 46;
  spores.push({
    x: x + Math.cos(a) * r, y: y - 18 + Math.sin(a) * r * .7,
    tx: x, ty: y - 20,
    life: .85 / hurry, max: .85 / hurry,
    size: 1 + Math.random() * 1.6,
    wobble: Math.random() * 6.28,
    c: ['#a8e04a', '#6fd6b0', '#d8f0a0'][spores.length % 3],
  });
  cap(spores, LIMITS.spores);
}

/** A handful at once, for the moment the mending actually takes. */
export function sporeBloom(x, y, n = 18) {
  for (let i = 0; i < n; i++) sporeMote(x, y, 1.6);
}

/** Chips of wood or stone thrown away from the point of impact. */
export function debris(x, y, fromX, fromY, colors, n = 12) {
  const angle = Math.atan2(y - fromY, x - fromX);
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - .5) * 2;
    particles.push({
      x, y: y - 12,
      vx: Math.cos(a) * (40 + Math.random() * 110),
      vy: Math.sin(a) * 50 - 40,
      life: .3 + Math.random() * .4,
      c: colors[i % colors.length],
      blood: true, scene: game.scene,
    });
  }
  cap(particles, LIMITS.particles);
}

export function floatingNumber(x, y, text, c) {
  numbers.push({ x, y, text, c, life: .8 });
}

/** What a thing bleeds. Mushroom-folk run violet, not red. */
export const ICHOR = {
  blood: { stain: ['#641f2b', '#92303a'], spray: ['#b43742', '#e26360'], gore: ['#82343b', '#b57970'] },
  spore: { stain: ['#3a1a55', '#5a2a80'], spray: ['#8a5ac0', '#c9a0e8'], gore: ['#4a2070', '#a878c8'] },
};

// Bounded, scene-local blood: droplets settle into stains, heavy hits shed fragments.
export function bleed(x, y, fromX, fromY, heavy = false, kind = 'blood') {
  const pal = ICHOR[kind] || ICHOR.blood;
  const angle = Math.atan2(y - fromY, x - fromX), count = heavy ? 26 : 15;
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - .5) * 2.4, reach = 5 + Math.random() * (heavy ? 40 : 26);
    bloodStains.push({
      x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach * .65,
      scene: game.scene, life: 75, size: 1 + Math.random() * (heavy ? 5 : 3),
      c: pal.stain[i % 3 ? 0 : 1],
    });
    particles.push({
      x, y: y - 13,
      vx: Math.cos(a) * (35 + Math.random() * 100), vy: Math.sin(a) * 55 - 25,
      life: .35 + Math.random() * .35, c: pal.spray[i % 3 ? 0 : 1],
      blood: true, scene: game.scene,
    });
  }
  if (heavy) for (let i = 0; i < 6; i++)
    goreFragments.push({
      x: x + (Math.random() - .5) * 38, y: y + (Math.random() - .5) * 22,
      size: 2 + Math.random() * 3, scene: game.scene, life: 65,
      c: pal.gore[i % 2],
    });
  cap(bloodStains, LIMITS.stains);
  cap(goreFragments, LIMITS.fragments);
  cap(particles, LIMITS.particles);
}

export function drawBlood(c) {
  for (const b of bloodStains) {
    if (b.scene !== game.scene) continue;
    c.globalAlpha = Math.min(.85, b.life / 12);
    rect(c, b.x - b.size, b.y, b.size * 2, b.size, b.c);
  }
  for (const b of goreFragments) {
    if (b.scene !== game.scene) continue;
    c.globalAlpha = Math.min(1, b.life / 10);
    rect(c, b.x, b.y, b.size + 2, b.size, b.c === '#4a2070' || b.c === '#a878c8' ? '#241038' : '#381a25');
    rect(c, b.x, b.y - 1, b.size, b.size, b.c);
  }
  c.globalAlpha = 1;
}

export function updateEffects(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.blood) p.vy += 150 * dt;
  }
  for (const list of [bloodStains, goreFragments])
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].life -= dt;
      if (list[i].life <= 0) list.splice(i, 1);
    }
  for (const n of numbers) { n.life -= dt; n.y -= 20 * dt; }
  // Spores home in on him, easing as they arrive, and vanish on contact.
  for (const sp of spores) {
    sp.life -= dt;
    const t = 1 - Math.max(0, sp.life) / sp.max;
    const ease = t * t;
    sp.x += (sp.tx - sp.x) * Math.min(1, ease * 4 * dt * 6);
    sp.y += (sp.ty - sp.y) * Math.min(1, ease * 4 * dt * 6);
    sp.x += Math.sin(game.time * 6 + sp.wobble) * 14 * dt;
  }
  for (let i = spores.length - 1; i >= 0; i--) if (spores[i].life <= 0) spores.splice(i, 1);
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  for (let i = numbers.length - 1; i >= 0; i--) if (numbers[i].life <= 0) numbers.splice(i, 1);
}

export function clearGore() {
  bloodStains.length = 0;
  goreFragments.length = 0;
}

export function clearAllEffects() {
  clearGore();
  particles.length = 0;
  numbers.length = 0;
  spores.length = 0;
}
