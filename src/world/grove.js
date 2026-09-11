/**
 * Orrin's thread and what the grove becomes when Vaelira is cut out of it.
 *
 * He is at the fire selling lamps because he has nowhere else to be: the thorn
 * took his wife and his two children down into the dark under the sporehouse.
 * Freeing them is a side road off the Fallen hunt, and the grove opening up is
 * the region's reward for finishing it.
 */
import { game, progress, save } from '../core/state.js';
import { notify } from '../ui/hud.js';
import { caption } from '../ui/story.js';
import { burst } from '../systems/effects.js';
import { sample, tone } from '../systems/audio.js';

/** Where his family end up once they are out: their own fire, a few steps off his. */
export const FAMILY_CAMP = { x: 1556, y: 352 };

/** The hatch under the Sporemother's nest. Only there once she is off it. */
export const TRAPDOOR = { x: 750, y: 566, type: 'trapdoor', name: 'Open the hatch beneath the nest' };

/** She has to be dead, and they have to still be down there. */
export const trapdoorReady = () =>
  game.room === 'sporehouse' && progress.slain.includes('sporemother') && progress.orrin < 2;

/** True once the thorn is cut out — the creatures stop caring the moment she falls. */
export const groveHealed = () => !!progress.bosses.vaelira;

/**
 * True once the light has actually come in. The weather, the brewer and the
 * mushrooms all wait for the beat to have played, not merely for her to be dead.
 */
export const groveDawned = () => progress.opened.includes('grove-dawn');

/** Orrin's family, once they are out. Drawn at their fire, and near it after the reunion. */
export const familyHere = () => progress.orrin >= 2;

/**
 * The hatch comes up and three people who have not seen a sky in months come out.
 * They make their own way to the fire; he is already running by the time they do.
 */
export function freeFamily() {
  progress.orrin = 2;
  save();
  burst(TRAPDOOR.x, TRAPDOOR.y - 10, '#e8d49a', 40);
  sample('impact', .6, 1.3);
  notify('Three of them, blinking. They know the way to the fire better than you do.');
}

/**
 * Played the first time he sees them: he drops the staff and goes, and by the
 * time the caption fades there is a second fire burning beside his.
 */
export function playReunion() {
  if (progress.orrin !== 2) return false;
  progress.orrin = 3;
  save();
  game.reunion = { since: game.time };
  burst(FAMILY_CAMP.x, FAMILY_CAMP.y - 12, '#f0dfae', 50);
  tone(660, .5, 'sine', .04);
  caption('Orrin drops the staff before he reaches them. None of the four says anything that needs writing down.', 6);
  notify('Orrin’s family are free · they are building at the grove fire');
  return true;
}

/** Whether a thing that only exists later in the thread is here yet. */
export function gateOpen(gate) {
  if (gate === 'family') return familyHere();
  if (gate === 'dawned') return groveDawned();
  return true;
}

/**
 * Who turns up once the grove has its sky back. Purely something to look at:
 * they have no health, nothing to hit and nothing to say — they are the wolves
 * and the mushroom-folk doing the first ordinary thing they have done in years.
 *
 * Two knots of them, one round each fire, and a loose scatter between.
 */
const SKINS = { wolf: ['grey', 'black', 'pale'], sporeling: ['teal', 'violet', 'amber'] };
function ring(cx, cy, count, radius, from) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = from + i * Math.PI * 2 / count;
    const kind = i % 3 === 0 ? 'wolf' : 'sporeling';
    out.push({
      x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius * .62,
      kind,
      skin: SKINS[kind][i % 3],
      phase: (i * 1.7) % 6.28,
      speed: .85 + (i % 4) * .12,
      // Every third one is the enthusiastic sort.
      big: i % 3 === 1,
    });
  }
  return out;
}

export const REVELLERS = [
  ...ring(1400, 300, 9, 150, .4),          // round the grove fire
  ...ring(2440, 820, 11, 190, 1.1),        // and the village cookpot
  ...ring(1980, 560, 6, 120, 2.2),         // a knot who wandered off between the two
];

// --- the finale ------------------------------------------------------------------
/**
 * The canopy beat: a few seconds where the roof of the grove comes apart and the
 * first sun in a long time gets in. Driven by the renderer off `game.canopy`.
 */
export const CANOPY_TIME = 3.4;

export function playCanopy(onDone) {
  game.canopy = { since: game.time, done: onDone };
  sample('vaeliraStage2', .5, .7);
}

/** Steps the canopy beat; the renderer reads `k` for how far open it is. */
export function updateCanopy(dt) {
  const c = game.canopy;
  if (!c) return;
  c.k = Math.min(1, (game.time - c.since) / CANOPY_TIME);
  if (c.k >= 1) {
    const done = c.done;
    game.canopy = null;
    done?.();
  }
}

/** What the cards say after the light is in. */
export const GROVE_CARDS = [
  'The thorn was cut out of the grove, and the grove knew it before the body had cooled.\n\nHigh above, the canopy that had not moved in a lifetime came apart, and the first sun in living memory fell all the way to the floor.',
  'The wolves stopped where they stood. The mushroom-folk came out of their huts and turned their faces up, and none of them reached for a blade.\n\nWhatever had been holding them let go.',
  'Orrin’s fire is not the only one at the grove now. There is a second beside it, smaller, with four people around it who have not stopped talking since.\n\nSouth of the water the trees thin, and the road goes on.',
];
