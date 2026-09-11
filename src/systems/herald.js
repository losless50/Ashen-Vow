// The Herald — the winged light that descends into the sanctuary once the
// Hollow Warden falls, and sends Aldren after his queen. Nothing here knows what
// it says; ui/story.js listens for `heraldArrived` and opens the conversation.
import { game } from '../core/state.js';
import { entities } from './entities.js';
import { cancelAttack } from './combat.js';
import { burst } from './effects.js';
import { emit } from '../core/events.js';
import { tone } from './audio.js';

const DESCENT = 3.2, HOVER = { x: 750, y: 468 };

/** Where E reaches the Herald once it has settled, drawn hovering just above. */
export const HERALD_SPOT = { x: HOVER.x, y: HOVER.y + 40, type: 'herald', name: 'The Herald' };

/** Freezes the wanderer, parks the camera on the altar and starts the descent. */
export function summonHerald() {
  if (entities.herald) return;
  cancelAttack();
  entities.herald = { x: HOVER.x, y: -90, ty: HOVER.y, t: 0, landed: false };
  game.scripted = { hold: true };
  game.cinematic = { x: HOVER.x, y: HOVER.y + 90 };
  game.glow = 0;
  tone(520, 1.2, 'sine');
}

export function updateHerald(dt) {
  const h = entities.herald;
  if (!h) return;
  h.t += dt;
  const k = Math.min(1, h.t / DESCENT), ease = 1 - (1 - k) ** 3;
  h.y = -90 + (h.ty + 90) * ease;
  game.glow = Math.min(1, h.t / (DESCENT * .9));
  if (h.t > DESCENT + .4 && !h.landed) {
    h.landed = true;
    burst(h.x, h.y + 20, '#fff2c4', 40);
    emit('heraldArrived');
  }
}

/** Already settled over the altar, lighting the chamber: every visit after the first. */
export function restHerald() {
  entities.herald = { x: HOVER.x, y: HOVER.y, ty: HOVER.y, t: DESCENT + 1, landed: true };
  game.glow = 1;
}

/** The conversation is over; the Herald stays, but the wanderer is his own again. */
export function releaseHerald() {
  game.scripted = null;
  game.cinematic = null;
}

export function dismissHerald() {
  entities.herald = null;
  game.glow = 0;
  releaseHerald();
}
