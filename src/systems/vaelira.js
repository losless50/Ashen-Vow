// Vaelira, Thorn of the Grove — what the den under the dead tree actually holds.
// An elf who was the grove's warden before it took her. She fights three rounds
// and heals to full between them, changing her weapon each time: the knives, then
// the whip, then the bow. She enjoys it, and says so.
import { game, player, progress, save, ARENA } from '../core/state.js';
import { entities } from './entities.js';
import { hurt, cancelAttack } from './combat.js';
import { updateShots } from './enemies.js';
import { burst, bleed } from './effects.js';
import { notify } from '../ui/hud.js';
import { tone, sample } from './audio.js';
import { GROUND_SCALE, WINDUP, KNIVES, WHIP, groundFrame, inWhipArc, touchesDash } from './vaelira-patterns.js';

/** Her three rounds. She comes back to full at the top of each. */
export const STAGES = [
  {
    weapon: 'knife', title: 'the Knives', hp: 1200, speed: [146, 146], hold: 64,
    taunt: 'Vaelira draws her knives. “Closer. I want to see your face.”',
  },
  {
    weapon: 'whip', title: 'the Whip', hp: 1450, speed: [116, 116], hold: 150,
    taunt: 'The knives fall. A thorned whip uncoils. “Now hold still, love.”',
  },
  {
    weapon: 'bow', title: 'the Bow', hp: 1700, speed: [110, 130], hold: 260,
    taunt: 'She steps back and strings a bow. “Run, then. I do like it when they run.”',
  },
];

const SHIFT_TIME = 2.4, EXPOSED = 2.2;
/** Every committed attack ends with enough time to close in and punish it. */
const OPENING = { dash: .85, flurry: .95, blink: 1, lash: 1, grab: 1.45, backstep: .6, volley: .8, snipe: .5, ultimate: 1.35 };
const say = text => notify(text);

export function makeVaelira() {
  return {
    kind: 'vaelira', x: 750, y: 540,
    stage: 0, hp: STAGES[0].hp, max: STAGES[0].hp,
    state: 'stalk', timer: 1.4, phase: 1, combo: 0, hit: false, dx: 0, dy: 1,
    spin: 0, shotCool: 0, grabbed: false, thrown: null,
  };
}

/** She is not quiet about being cut, but she does not say it every single time. */
let lastHurt = -9;
export function vaeliraHurt(b) {
  if (b.state === 'shift' || game.time - lastHurt < 1.6) return;
  lastHurt = game.time;
  sample(hurtLine++ % 2 ? 'vaeliraHurt2' : 'vaeliraHurt1', .85, 1.14);
}
let hurtLine = 0;

/** Her health is gone but she is not: she stands, heals, and changes her hands. */
export function nextStage(b) {
  if (b.stage >= STAGES.length - 1) return false;
  b.stage++;
  b.state = 'shift';
  b.timer = SHIFT_TIME;
  b.hp = 1;
  b.max = STAGES[b.stage].hp;
  b.combo = 0;
  b.grabbed = false;
  entities.shots = [];
  releasePlayer(b);
  burst(b.x, b.y - 30, '#e8d49a', 60);
  game.shake = 8;
  // She has a line for the whip; the bow gets the swell of the change instead.
  if (b.stage === 1) sample('vaeliraStage2', .95, 1.12);
  else sample('creatureSnarl', .6, 1.25);
  say(STAGES[b.stage].taunt);
  return true;
}

const stage = b => STAGES[b.stage];
/** 450 degrees, turned in two seconds. */
const ULTIMATE_ARC = Math.PI * 2.5, ULTIMATE_TIME = 2;

// --- what she does with her hands ------------------------------------------------
const MOVES = {
  // A repeating rhythm: a two-part rush, planted cuts, then the marked blink.
  knife: ['dash', 'flurry', 'blink', 'flurry'],
  // The hook is a commitment. She only spends a backstep when actually crowded.
  whip: ['lash', 'grab', 'lash', 'backstep', 'grab', 'lash'],
  // The turn is her showpiece, and she does not spend it often.
  bow: ['volley', 'snipe', 'volley', 'snipe', 'volley', 'snipe', 'ultimate'],
};

function choose(b) {
  const list = MOVES[stage(b).weapon];
  const move = list[b.combo++ % list.length];
  return move === 'backstep' && rangeTo(b) > 110 ? 'lash' : move;
}

/** How far off he is in the frame her reach is measured in: flat for the bow, unsquashed for her hands. */
const rangeTo = b => Math.hypot(player.x - b.x, (player.y - b.y) / (b.stage === 2 ? 1 : GROUND_SCALE));

function face(b) {
  const dx = player.x - b.x, dy = (player.y - b.y) / (b.stage === 2 ? 1 : GROUND_SCALE);
  const d = Math.hypot(dx, dy) || 1;
  b.dx = dx / d;
  b.dy = dy / d;
  return d;
}

/** Lock the whole melee warning, including a wall-clipped dash endpoint. */
function windup(b, move, duration = WINDUP[move]) {
  face(b);
  b.state = `${move}Wind`;
  b.timer = duration;
  b.windDuration = duration;
  b.hit = false;
  if (move === 'dash') {
    b.dashFromX = b.x;
    b.dashFromY = b.y;
    b.dashToX = Math.max(ARENA.minX + 10, Math.min(ARENA.maxX - 10, b.x + b.dx * KNIVES.dashSpeed * KNIVES.dashTime));
    b.dashToY = Math.max(ARENA.minY + 10, Math.min(ARENA.maxY - 10, b.y + b.dy * KNIVES.dashSpeed * KNIVES.dashTime * GROUND_SCALE));
  }
}

const inRing = (b, radius) => Math.hypot(player.x - b.x, (player.y - b.y) / GROUND_SCALE) < radius;

function arrow(b, angle, speed = 430, damage = 42) {
  entities.shots.push({
    kind: 'arrow', x: b.x + Math.cos(angle) * 24, y: b.y - 30 + Math.sin(angle) * 14,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * .62,
    angle, life: 2.2, damage, hit: false,
  });
  tone(720, .06, 'square', .012);
}

/** Her arrows and everything else in the air are updated by the creature system. */

// --- the whip: caught, dragged in, and thrown at the wall -------------------------
function holdPlayer() {
  cancelAttack();
  game.scripted = { hold: true };
}

function releasePlayer(b) {
  b.grabbed = false;
  b.thrown = null;
  b.throwTarget = null;
  if (game.scripted?.hold) game.scripted = null;
}

/** The hook's direction carries him away from her, to the wall shown during the hold. */
function planThrow(b) {
  const x = Math.max(ARENA.minX, Math.min(ARENA.maxX, b.x + b.dx * 34));
  const y = Math.max(ARENA.minY, Math.min(ARENA.maxY, b.y + b.dy * 34 * GROUND_SCALE));
  const dx = b.dx, dy = b.dy * GROUND_SCALE;
  const tx = Math.abs(dx) < .0001 ? Infinity : ((dx > 0 ? ARENA.maxX : ARENA.minX) - x) / dx;
  const ty = Math.abs(dy) < .0001 ? Infinity : ((dy > 0 ? ARENA.maxY : ARENA.minY) - y) / dy;
  const distance = Math.min(tx, ty);
  b.reelTo = { x, y };
  b.throwTarget = { x: x + dx * distance, y: y + dy * distance };
}

function throwPlayer(b) {
  const target = b.throwTarget;
  const duration = Math.max(.12, Math.hypot(target.x - player.x, target.y - player.y) / WHIP.throwSpeed);
  b.thrown = { x: player.x, y: player.y, duration };
  b.state = 'throw';
  b.timer = duration;
  sample('creatureSnarl', .6, 1.4);
  say('“Up you go.”');
}

function slamIntoWall(b) {
  releasePlayer(b);
  b.state = 'recover';
  b.timer = EXPOSED;
  game.shake = 12;
  bleed(player.x, player.y, b.x, b.y, true);
  hurt(WHIP.wallDamage, player.x + (player.x < 750 ? -30 : 30), player.y);
  sample('impact', 1, .7);
  say('The wall knocks the breath out of you.');
}

// --- the machine -----------------------------------------------------------------
export function updateVaelira(dt, b) {
  const s = stage(b);
  b.timer -= dt;
  updateShots(dt);
  if (game.dead) { releasePlayer(b); return; }

  if (b.state === 'shift') {
    // She heals as she changes hands, and nothing can touch her while she does.
    b.hp = Math.min(b.max, Math.max(1, Math.round(b.max * (1 - Math.max(0, b.timer) / SHIFT_TIME))));
    if (b.timer <= 0) { b.hp = b.max; b.state = 'stalk'; b.timer = .9; }
    return;
  }

  if (b.state === 'hold') {
    const k = Math.min(1, 1 - Math.max(0, b.timer) / WHIP.holdTime);
    const ease = k * k * (3 - 2 * k);
    player.x = b.catchX + (b.reelTo.x - b.catchX) * ease;
    player.y = b.catchY + (b.reelTo.y - b.catchY) * ease;
    if (b.timer <= 0) throwPlayer(b);
    return;
  }

  if (b.state === 'throw') {
    const k = Math.min(1, 1 - Math.max(0, b.timer) / b.thrown.duration);
    player.x = b.thrown.x + (b.throwTarget.x - b.thrown.x) * k;
    player.y = b.thrown.y + (b.throwTarget.y - b.thrown.y) * k;
    if (b.timer <= 0) slamIntoWall(b);
    return;
  }

  if (b.state === 'ultimate') {
    // A turn and a quarter, clockwise, loosing the whole way round — so the gap
    // she opens behind her closes again before it can be walked into.
    b.spin += ULTIMATE_ARC / ULTIMATE_TIME * dt;
    b.shotCool -= dt;
    if (b.shotCool <= 0) { b.shotCool = .0275; arrow(b, b.spin, 410, 42); }
    if (b.spin - b.spin0 >= ULTIMATE_ARC) { b.state = 'recover'; b.timer = OPENING.ultimate; }
    return;
  }

  const d = rangeTo(b);

  if (b.state === 'stalk') {
    // She keeps the distance her weapon likes — and backs off hard if he closes on
    // the whip or the bow, rather than trading blows she cannot win.
    const want = s.hold, base = s.speed[b.phase === 2 ? 1 : 0];
    const crowded = s.weapon !== 'knife' && d < want * .7;
    const speed = crowded ? base * (s.weapon === 'whip' ? 1.1 : 1.7) : base;
    if (Math.abs(d - want) > 16) {
      const sign = d > want ? 1 : -1;
      const flat = b.stage === 2 ? 1 : GROUND_SCALE;
      b.x += (player.x - b.x) / (d || 1) * speed * sign * dt;
      b.y += (player.y - b.y) / flat / (d || 1) * speed * sign * dt * flat;
      // Pinned against a wall she slides along it instead of standing there.
      if (sign < 0 && (s.weapon === 'bow' || b.x < ARENA.minX + 45 || b.x > ARENA.maxX - 45 || b.y < ARENA.minY + 45 || b.y > ARENA.maxY - 45)) {
        const perp = Math.atan2(player.y - b.y, player.x - b.x) + Math.PI / 2;
        b.x += Math.cos(perp) * speed * .5 * dt;
        b.y += Math.sin(perp) * speed * .5 * dt;
      }
      b.x = Math.max(ARENA.minX + 20, Math.min(ARENA.maxX - 20, b.x));
      b.y = Math.max(ARENA.minY + 20, Math.min(ARENA.maxY - 20, b.y));
    }
    if (b.timer <= 0) {
      const move = choose(b);
      b.move = move;
      if (move === 'blink') {
        // A step through the dark to his shoulder, marked before she takes it.
        const a = Math.atan2(player.y - b.y, player.x - b.x) + (Math.random() < .5 ? 2.1 : -2.1);
        b.tx = Math.max(ARENA.minX + 30, Math.min(ARENA.maxX - 30, player.x + Math.cos(a) * 95));
        b.ty = Math.max(ARENA.minY + 30, Math.min(ARENA.maxY - 30, player.y + Math.sin(a) * 59));
      }
      if (move === 'dash') b.chain = 2;
      windup(b, move);
      if (move === 'ultimate') say('“Stay near me for this one.”');
      if (Math.random() < .5) sample('creatureSnarl', .45, 1.35);
    }
    return;
  }

  // --- the windups resolve -------------------------------------------------------
  if (b.timer > 0) return;

  switch (b.state) {
    // A move already under way is driven frame by frame below, not here.
    case 'dash': case 'flurry': case 'lash': case 'grab': case 'backstep':
      break;
    case 'dashWind':
      b.state = 'dash';
      b.timer = KNIVES.dashTime;
      tone(140, .18, 'sawtooth');
      break;
    case 'blinkWind':
      // Arrive first, then raise the knives: the landing itself never deals damage.
      b.x = b.tx;
      b.y = b.ty;
      face(b);
      burst(b.x, b.y - 20, '#cfc6de', 26);
      sample('creatureSnarl', .4, 1.5);
      windup(b, 'flurry', KNIVES.arrival);
      break;
    case 'backstepWind':
      b.state = 'backstep';
      b.timer = WHIP.backstepTime;
      break;
    case 'flurryWind':
      b.state = 'flurry';
      b.timer = KNIVES.flurryTime;
      b.hits = 0;
      break;
    case 'lashWind':
      b.state = 'lash';
      b.timer = WHIP.lashTime;
      tone(180, .2, 'sawtooth');
      break;
    case 'grabWind':
      b.state = 'grab';
      b.timer = WHIP.hookTime;
      b.hookReach = 0;
      break;
    case 'volleyWind': {
      b.state = 'recover';
      b.timer = OPENING.volley;
      const at = Math.atan2(player.y - b.y, player.x - b.x);
      for (let i = -4; i <= 4; i++) arrow(b, at + i * .13);
      break;
    }
    case 'snipeWind': {
      b.state = 'recover';
      b.timer = OPENING.snipe;
      const at = Math.atan2(player.y - b.y, player.x - b.x);
      for (let i = -1; i <= 1; i++) arrow(b, at + i * .045, 690, 86);
      break;
    }
    case 'ultimateWind':
      b.state = 'ultimate';
      b.spin0 = Math.atan2(player.y - b.y, player.x - b.x);
      b.spin = b.spin0;
      b.shotCool = 0;
      break;
    case 'recover':
      b.state = 'stalk';
      // Barely a breath between the knives; a little more room behind the bow.
      b.timer = (s.weapon === 'knife' ? .38 : s.weapon === 'whip' ? .46 : .38) * (b.phase === 2 ? .7 : 1);
      break;
    default:
      b.state = 'stalk';
      b.timer = .8;
  }
}

/** The parts of a move that need to run every frame while it is happening. */
export function tickVaelira(dt, b) {
  if (game.dead) return;
  if (b.state === 'dash') {
    const x0 = b.x, y0 = b.y;
    const k = Math.min(1, 1 - Math.max(0, b.timer) / KNIVES.dashTime);
    b.x = (b.dashFromX ?? b.x) + ((b.dashToX ?? b.x) - (b.dashFromX ?? b.x)) * k;
    b.y = (b.dashFromY ?? b.y) + ((b.dashToY ?? b.y) - (b.dashFromY ?? b.y)) * k;
    if (!b.hit && touchesDash(player.x, player.y, x0, y0, b.x, b.y)) {
      b.hit = true;
      hurt(KNIVES.dashDamage, b.x, b.y);
    }
    if (b.timer <= 0) {
      if (b.chain > 1) { b.chain--; windup(b, 'dash', KNIVES.followup); }
      else { b.chain = 0; b.state = 'recover'; b.timer = OPENING.dash; }
    }
  } else if (b.state === 'flurry') {
    const elapsed = KNIVES.flurryTime - Math.max(0, b.timer);
    while ((b.hits ?? 0) < KNIVES.cuts.length && elapsed >= KNIVES.cuts[b.hits ?? 0]) {
      b.hits = (b.hits ?? 0) + 1;
      if (inRing(b, KNIVES.ring)) hurt(KNIVES.cutDamage, b.x, b.y);
      burst(b.x + b.dx * 30, b.y - 20 + b.dy * 16, '#e8e2d0', 8);
      tone(560, .05, 'square', .014);
    }
    if (b.timer <= 0) { b.state = 'recover'; b.timer = OPENING[b.move === 'blink' ? 'blink' : 'flurry']; }
  } else if (b.state === 'backstep') {
    b.x -= b.dx * WHIP.backstepSpeed * dt;
    b.y -= b.dy * WHIP.backstepSpeed * dt * GROUND_SCALE;
    b.x = Math.max(ARENA.minX + 20, Math.min(ARENA.maxX - 20, b.x));
    b.y = Math.max(ARENA.minY + 20, Math.min(ARENA.maxY - 20, b.y));
    if (b.timer <= 0) { b.state = 'recover'; b.timer = OPENING.backstep; }
  } else if (b.state === 'lash') {
    // One contact beat. A successful roll cannot be clipped later in the same lash.
    if (!b.hit && WHIP.lashTime - b.timer >= WHIP.lashImpact) {
      b.hit = true;
      if (inWhipArc(b, player.x, player.y)) hurt(WHIP.lashDamage, b.x, b.y);
    }
    if (b.timer <= 0) { b.state = 'recover'; b.timer = OPENING.lash; }
  } else if (b.state === 'grab') {
    const previous = b.hookReach ?? 0;
    b.hookReach = WHIP.hookReach * Math.min(1, 1 - Math.max(0, b.timer) / WHIP.hookTime);
    const f = groundFrame(b, player.x, player.y);
    if (!b.hit && f.along > 0 && f.along <= WHIP.hookReach && f.along >= previous - WHIP.hookWidth && f.along <= b.hookReach + WHIP.hookWidth && Math.abs(f.across) < WHIP.hookWidth) {
      b.hit = true;
      if (player.inv <= 0 && player.roll <= 0) {
        b.grabbed = true;
        b.state = 'hold';
        b.timer = WHIP.holdTime;
        b.catchX = player.x;
        b.catchY = player.y;
        planThrow(b);
        holdPlayer();
        sample('impact', .7, 1.2);
        say('The hook catches — she is throwing you toward the marked wall.');
      }
    }
    if (b.timer <= 0 && b.state === 'grab') { b.state = 'recover'; b.timer = OPENING.grab; }
  }
}

/** Nothing of hers outlives the fight. */
export function clearVaelira(b) {
  entities.shots = [];
  if (b) releasePlayer(b);
  else if (game.scripted?.hold) game.scripted = null;
}

/** Her death is the region's, and the stone behind her is the reward. */
export function vaeliraDefeated() {
  progress.bosses.vaelira = true;
  sample('vaeliraDeath', 1, 1.12);
  save();
}
