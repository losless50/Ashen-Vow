/**
 * The two on the Drowned Throne — what is actually down the stair under it.
 *
 * Vosk kept a crew and a pet, and the vault kept both of them. He fights beside
 * the Molt and neither of them waits its turn: the whole fight is two threats
 * arriving at once, one fast and one heavy. The scorpion cannot be killed while
 * he is standing, because it only sheds its shell and walks out of it whole.
 * Cut the captain down and the beast comes for what is left of him, takes him
 * into itself, and what stands up is not either of them.
 *
 * Buried kingdoms. Same roots.
 */
import { game, player, ARENA } from '../core/state.js';
import { entities, ENEMY_KINDS } from './entities.js';
import { hurt, cancelAttack, venom } from './combat.js';
import { burst, bleed } from './effects.js';
import { updateShots } from './enemies.js';
import { notify } from '../ui/hud.js';
import { tone, sample } from './audio.js';
import { GROUND_SCALE } from './vaelira-patterns.js';

/**
 * One knob for the whole fight. Everything below is written as a multiple of
 * it, so the pair can be made harder or softer without re-tuning each move.
 * 1 was the first pass; this fight is meant to be the wall at the end of the
 * vault, and two bodies attacking at once is most of the reason it is one.
 */
export const DIFFICULTY = 2.3;
/**
 * Health is deliberately NOT on that knob. Pressure is what makes a fight hard;
 * health only makes it long, and this one already costs him a whole extra bar
 * every time he swings at the wrong body. Raise DIFFICULTY to make it hurt,
 * raise this only if the fight is ending too early.
 */
const HP_SCALE = 1.45;

const dmg = n => Math.round(n * (.8 + DIFFICULTY * .2));
/** Windups and openings shrink as the difficulty rises, but never to nothing. */
const pace = n => Math.max(.14, n / (.55 + DIFFICULTY * .45));

export const CAPTAIN_HP = Math.round(900 * HP_SCALE);
export const MOLT_HP = Math.round(700 * HP_SCALE);
export const CROWNED_HP = Math.round(1800 * HP_SCALE * 1.15);

const MOLT_TIME = 1.9, ABSORB_TIME = 3.4;

/**
 * He is quick and she is heavy. His windups are short enough that reading them
 * is most of the fight; hers are long, and the ground is marked while they run.
 */
const WIND = {
  slash: pace(.3), cleave: pace(.62), bones: pace(.5), blunderbuss: pace(.58),
  pincer: pace(.6), sting: pace(.74), spray: pace(.54), burrow: pace(.64), skitter: pace(.3),
  pounce: pace(.56), charge: pace(.76), cannon: pace(.9), sweep: pace(.7), brood: pace(1.5),
};
/** Every committed blow still ends with room to close in and punish it. */
const OPENING = {
  slash: pace(.34), cleave: pace(.95), bones: pace(.62), blunderbuss: pace(.8),
  pincer: pace(.72), sting: pace(.8), spray: pace(.62), burrow: pace(.78), skitter: pace(.38),
  pounce: pace(.84), charge: pace(1.15), cannon: pace(1.2), sweep: pace(1), brood: pace(1.6),
};

/**
 * Both of them pick from their own list on their own clock. Nothing stops the
 * cutlass and the tail landing in the same second — that is the fight.
 */
const MOVES = {
  captain: ['slash', 'bones', 'slash', 'cleave', 'slash', 'blunderbuss'],
  // The beast is the busier of the two: it never stops arriving.
  molt: ['pounce', 'sting', 'pincer', 'spray', 'pounce', 'sting', 'burrow', 'pincer'],
  // Everything he had, with what it put in him running through all of it.
  crowned: ['slash', 'cannon', 'pounce', 'bones', 'charge', 'blunderbuss', 'slash',
    'sting', 'sweep', 'cannon', 'spray', 'slash', 'pincer', 'bones'],
};

/**
 * The thing it does that nothing else does. Held back to fixed marks on the
 * bar rather than left in the rotation, so it lands as an event.
 */
const BROOD_AT = [.72, .46, .2];
const BROOD_COUNT = 5;

/** How many cuts the fast attack strings together before it lets go. */
const SLASH_CHAIN = 3;

export function makeTandem() {
  const captain = {
    kind: 'tandem', role: 'captain', name: 'VOSK, THE DROWNED CAPTAIN',
    x: 640, y: 450, hp: CAPTAIN_HP, max: CAPTAIN_HP,
    state: 'stalk', timer: 1.4, phase: 1, combo: 0, chain: 0, hit: false, dx: 0, dy: 1,
  };
  const molt = {
    kind: 'tandem', role: 'molt', name: 'THE MOLT',
    x: 880, y: 500, hp: MOLT_HP, max: MOLT_HP,
    state: 'stalk', timer: 2.2, phase: 1, combo: 0, chain: 0, hit: false, dx: 0, dy: 1,
    molts: 0, husks: [],
  };
  const pair = { stage: 1, captain, molt, told: false, pools: [] };
  captain.pair = molt.pair = pair;
  captain.bodies = molt.bodies = [captain, molt];
  return captain;
}

/** The bar over the arena names whichever body the swing is aimed at. */
export const tandemName = b => b.role === 'crowned' ? 'THE THRONE ITSELF' : b.name;

// --- shared helpers ---------------------------------------------------------------

/** How far off he is in the frame the reach is measured in: the ground is squashed. */
const rangeTo = b => Math.hypot(player.x - b.x, (player.y - b.y) / GROUND_SCALE);

function face(b) {
  const dx = player.x - b.x, dy = (player.y - b.y) / GROUND_SCALE;
  const d = Math.hypot(dx, dy) || 1;
  b.dx = dx / d;
  b.dy = dy / d;
  return d;
}

/**
 * The longer it goes the less room there is between blows: every shell the
 * beast leaves winds both of them up, and so does either of them getting low.
 */
function fury(b) {
  const pair = b.pair;
  const shed = Math.min(4, pair.molt.molts) * .07;
  const hurtNow = (1 - b.hp / b.max) * .22;
  return 1 + shed + hurtNow + (pair.stage === 2 ? .12 : 0);
}

function windup(b, move) {
  face(b);
  b.move = move;
  b.state = `${move}Wind`;
  b.timer = WIND[move] / fury(b);
  b.windDuration = b.timer;
  b.hit = false;
  if (move === 'sting' || move === 'burrow' || move === 'cannon') {
    // Committed to where he is standing now, not where he ends up.
    b.markX = player.x;
    b.markY = player.y;
  }
}

function recover(b, move) {
  b.state = 'recover';
  b.timer = OPENING[move] / fury(b);
}

/** Neither of them backs off. They close, and circle while they do it. */
function press(b, dt, speed, want) {
  const d = face(b);
  const push = d > want ? 1 : d < want - 34 ? -.8 : 0;
  b.x += b.dx * push * speed * dt;
  b.y += b.dy * push * speed * dt * GROUND_SCALE;
  const side = b.role === 'captain' ? 1 : -1;
  b.x += -b.dy * side * speed * .5 * dt;
  b.y += b.dx * side * speed * .5 * dt * GROUND_SCALE;
}

function clamp(b) {
  b.x = Math.max(ARENA.minX + 16, Math.min(ARENA.maxX - 16, b.x));
  b.y = Math.max(ARENA.minY + 16, Math.min(ARENA.maxY - 16, b.y));
}

function shot(b, angle, speed, damage, kind = 'arrow') {
  entities.shots.push({
    kind, x: b.x + Math.cos(angle) * 22, y: b.y - 34 + Math.sin(angle) * 13,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * GROUND_SCALE,
    angle, life: 2.4, damage, hit: false,
  });
}

const ring = (b, damage, x = b.x, y = b.y) =>
  entities.wave.push({ x, y, r: 15, life: 1.2, hit: false, damage });

/** Venom on the floor. Hazards do not tick in an arena, so the pair keeps its own. */
function pool(pair, x, y, r = 44) {
  pair.pools.push({ x, y, r, life: 7, max: 7 });
  if (pair.pools.length > 8) pair.pools.shift();
}

const inCone = (b, reach, half) =>
  rangeTo(b) < reach && Math.abs(Math.atan2(
    -(player.x - b.x) * b.dy + (player.y - b.y) / GROUND_SCALE * b.dx,
    (player.x - b.x) * b.dx + (player.y - b.y) / GROUND_SCALE * b.dy)) < half;

// --- what they do with their hands, claws and what is left of both ----------------

/**
 * Stage two is his moveset with her in it. Everything the merged thing swings
 * carries venom; the same move off the captain alone does not.
 */
const venomous = b => b.role === 'crowned';
const withVenom = (b, seconds, damage) => { if (venomous(b)) venom(seconds, dmg(damage)); };

function resolve(b, move) {
  const pair = b.pair;
  const aim = Math.atan2(b.dy, b.dx);
  b.state = move;
  b.hit = false;

  if (move === 'pounce') { b.timer = .36; tone(170, .18, 'sawtooth'); return; }
  if (move === 'brood') { hatch(b); recover(b, move); return; }

  if (move === 'slash') {
    // Lightning: barely a windup, a short cut, and straight into the next one.
    b.timer = .16;
    tone(1100, .05, 'square', .012);
    return;
  }
  if (move === 'cleave') { b.timer = .3; tone(190, .16, 'sawtooth'); return; }
  if (move === 'charge') { b.timer = .48; tone(120, .22, 'sawtooth'); return; }
  if (move === 'pincer') { b.timer = .26; tone(210, .14, 'sawtooth'); return; }
  if (move === 'sting') { b.timer = .3; tone(140, .18, 'sawtooth'); return; }
  if (move === 'skitter') { b.timer = .3; return; }

  // Everything else lands the moment the windup ends.
  if (move === 'bones') {
    // A fan of what is left of his crew.
    const n = pair.stage === 2 ? 9 : 6;
    for (let i = 0; i < n; i++)
      shot(b, aim + (i - (n - 1) / 2) * .19, 360, dmg(19), venomous(b) ? 'foulbone' : 'bone');
    sample('impact', .5, 1.5);
  } else if (move === 'blunderbuss') {
    // Close work: a wide cone of scrap that does not travel far.
    for (let i = -3; i <= 3; i++) shot(b, aim + i * .13, 470, dmg(16), venomous(b) ? 'foulscrap' : 'scrap');
    if (inCone(b, 190, .5) && player.inv <= 0) { hurt(dmg(26), b.x, b.y); withVenom(b, 3, 12); }
    game.shake = 5;
    tone(90, .24, 'sawtooth');
  } else if (move === 'cannon') {
    // The gun that grew into it. Slow, marked, and it takes the floor with it.
    entities.shots.push({
      kind: 'shell', x: b.x + Math.cos(aim) * 26, y: b.y - 40 + Math.sin(aim) * 14,
      vx: Math.cos(aim) * 300, vy: Math.sin(aim) * 300 * GROUND_SCALE,
      angle: aim, life: 2.4, damage: dmg(38), hit: false, burst: dmg(30), pair, foul: venomous(b),
    });
    game.shake = 8;
    tone(58, .4, 'triangle');
  } else if (move === 'sweep') {
    ring(b, dmg(34));
    game.shake = 7;
    tone(70, .3, 'triangle');
  } else if (move === 'spray') {
    // Venom, thrown wide, and it stays where it lands.
    for (let i = -2; i <= 2; i++) {
      const a = aim + i * .22, reach = 120 + Math.abs(i) * 30;
      pool(pair, b.x + Math.cos(a) * reach, b.y + Math.sin(a) * reach * GROUND_SCALE);
    }
    burst(b.x, b.y - 30, '#9fd64a', 26);
    tone(260, .22, 'sawtooth');
  } else if (move === 'burrow') {
    // Straight up under him, wherever he was when it went down.
    ring(b, dmg(30), b.markX, b.markY);
    pool(pair, b.markX, b.markY, 56);
    burst(b.markX, b.markY, '#7e9a72', 34);
    b.x = b.markX - Math.cos(aim) * 70;
    b.y = b.markY - Math.sin(aim) * 70 * GROUND_SCALE;
    clamp(b);
    game.shake = 9;
    tone(64, .34, 'triangle');
  }
  recover(b, move);
}

function act(b, dt) {
  const move = b.move;

  if (b.state === `${move}Wind`) {
    if (b.timer <= 0) resolve(b, move);
    return;
  }
  if (b.state !== move) return;

  if (move === 'slash') {
    // A step into the cut, so the chain walks him across the room.
    b.x += b.dx * 300 * dt;
    b.y += b.dy * 300 * dt * GROUND_SCALE;
    clamp(b);
    if (!b.hit && inCone(b, 92, 1) && player.inv <= 0) {
      hurt(dmg(22), b.x, b.y);
      withVenom(b, 2, 11);
      b.hit = true;
    }
    if (b.timer <= 0) {
      if (++b.chain < SLASH_CHAIN) { windup(b, 'slash'); b.timer *= .45; b.windDuration = b.timer; }
      else { b.chain = 0; recover(b, move); }
    }
    return;
  }
  if (move === 'cleave' || move === 'charge') {
    const speed = move === 'charge' ? 470 : 350;
    b.x += b.dx * speed * dt;
    b.y += b.dy * speed * dt * GROUND_SCALE;
    clamp(b);
    if (!b.hit && rangeTo(b) < (move === 'charge' ? 92 : 70) && player.inv <= 0) {
      hurt(dmg(move === 'charge' ? 44 : 36), b.x, b.y);
      withVenom(b, 3, 13);
      b.hit = true;
    }
  } else if (move === 'pincer') {
    if (!b.hit && inCone(b, 122, 1.1) && player.inv <= 0) { hurt(dmg(32), b.x, b.y); b.hit = true; }
  } else if (move === 'pounce') {
    // Off the ground entirely, and it poisons the floor where it comes down.
    const t = 1 - Math.max(0, b.timer) / .36;
    b.x += b.dx * 520 * dt;
    b.y += b.dy * 520 * dt * GROUND_SCALE;
    b.hop = Math.sin(t * Math.PI) * 46;
    clamp(b);
    if (b.timer <= 0) {
      b.hop = 0;
      pool(b.pair, b.x, b.y, 52);
      burst(b.x, b.y, '#9fd64a', 28);
      game.shake = 7;
      if (rangeTo(b) < 78 && player.inv <= 0) { hurt(dmg(34), b.x, b.y); venom(3, dmg(15)); }
      tone(96, .26, 'triangle');
    }
  } else if (move === 'sting') {
    // The heavy one. It lands hard and it leaves venom in the wound, but the
    // venom is a few seconds of it, not a slow drain for the rest of the fight.
    if (!b.hit && Math.hypot(player.x - b.markX, (player.y - b.markY) / GROUND_SCALE) < 58 && player.inv <= 0) {
      hurt(dmg(40), b.markX, b.markY);
      venom(3, dmg(20));
      b.hit = true;
    }
    if (b.timer <= 0) { burst(b.markX, b.markY, '#9fd64a', 16); game.shake = 5; }
  } else if (move === 'skitter') {
    b.x += b.dx * 430 * dt;
    b.y += b.dy * 430 * dt * GROUND_SCALE;
    clamp(b);
  }

  if (b.timer <= 0) recover(b, move);
}

// --- the brood --------------------------------------------------------------------

/**
 * It splits its own back open and the inside of it comes out running. They are
 * small and they die easily, but nothing in the game is faster and nothing else
 * puts this much venom in him this quickly — the answer is to kill them, now,
 * and the cost of killing them is every second not spent on the thing that
 * made them.
 */
function hatch(b) {
  const pair = b.pair;
  for (let i = 0; i < BROOD_COUNT; i++) {
    const a = (i / BROOD_COUNT) * Math.PI * 2 + Math.random();
    entities.enemies.push({
      id: 'throne-brood', kind: 'spawnling', arena: true, skin: 'brood',
      x: clampX(b.x + Math.cos(a) * 46), y: clampY(b.y + Math.sin(a) * 46 * GROUND_SCALE),
      hp: ENEMY_KINDS.spawnling.hp, max: ENEMY_KINDS.spawnling.hp,
      state: 'chase', timer: 0, cool: .35 + i * .08, hit: false, dx: 0, dy: 1,
      born: game.time, phase: Math.random() * 6.28,
    });
  }
  pair.broods = (pair.broods || 0) + 1;
  burst(b.x, b.y - 20, '#9fd64a', 70);
  game.shake = 11;
  sample('creatureSnarl', .9, 1.35);
  notify(pair.broods > 1
    ? 'Its back opens again. More of them.'
    : 'Its back splits and the inside of it comes out running. Kill them first — they are quick, and they are full of it.');
}

const clampX = x => Math.max(ARENA.minX + 16, Math.min(ARENA.maxX - 16, x));
const clampY = y => Math.max(ARENA.minY + 16, Math.min(ARENA.maxY - 16, y));

/** The brood runs him down and touches him. That is the whole of their plan. */
function updateBrood(dt) {
  const k = ENEMY_KINDS.spawnling;
  for (const e of entities.enemies) {
    if (!e.arena || e.hp <= 0) continue;
    e.cool -= dt;
    const dx = player.x - e.x, dy = (player.y - e.y) / GROUND_SCALE;
    const d = Math.hypot(dx, dy) || 1;
    e.dx = dx / d;
    e.dy = dy / d;
    // Enough of a weave that they arrive spread out rather than as one point,
    // but not so much that the fastest thing in the game reads as slow.
    const weave = Math.sin(game.time * 9 + e.phase) * .2;
    e.x += (e.dx * Math.cos(weave) - e.dy * Math.sin(weave)) * k.speed * dt;
    e.y += (e.dx * Math.sin(weave) + e.dy * Math.cos(weave)) * k.speed * dt * GROUND_SCALE;
    e.x = clampX(e.x);
    e.y = clampY(e.y);
    if (d < k.hitRange && e.cool <= 0 && player.inv <= 0) {
      e.cool = k.cool;
      hurt(k.damage, e.x, e.y);
      venom(k.venom.time, k.venom.damage);
      burst(e.x, e.y - 8, '#9fd64a', 6);
    }
  }
  entities.enemies = entities.enemies.filter(e => !e.arena || e.hp > 0);
}

/** Nothing the throne made outlives it. */
function clearBrood() {
  entities.enemies = entities.enemies.filter(e => !e.arena);
}

// --- the bodies -------------------------------------------------------------------

const speedOf = b =>
  b.role === 'crowned' ? 118
  : b.role === 'captain' ? 138
  : 104 + Math.min(4, b.molts) * 15;

function updateBody(dt, b) {
  b.timer -= dt;

  if (b.state === 'molt') {
    if (b.timer > 0) return;
    b.state = 'stalk';
    b.timer = .35;
    b.untargetable = false;
    return;
  }
  if (b.state === 'stalk') {
    press(b, dt, speedOf(b) * (b.pair.stage === 2 ? 1 : fury(b) * .9), b.role === 'captain' ? 74 : 116);
    clamp(b);
    if (b.timer <= 0) {
      const list = MOVES[b.role];
      b.chain = 0;
      windup(b, list[b.combo++ % list.length]);
    }
    return;
  }
  if (b.state === 'recover') {
    if (b.timer <= 0) { b.state = 'stalk'; b.timer = pace(.5) / fury(b); }
    return;
  }
  act(b, dt);
}

export function updateTandem(dt, b) {
  const pair = b.pair;

  if (pair.stage === 'absorbing') { absorb(dt, pair); tickFloor(dt, pair); return; }

  if (pair.stage === 1) for (const body of [pair.captain, pair.molt]) { if (body.hp > 0) updateBody(dt, body); }
  else {
    // The ultimate interrupts whatever it was going to do next, at fixed marks.
    const left = b.hp / b.max;
    const due = BROOD_AT.filter(m => left <= m).length;
    if (due > (pair.broods || 0) && b.state !== 'brood' && b.state !== 'broodWind') windup(b, 'brood');
    updateBody(dt, b);
  }

  updateBrood(dt);
  tickFloor(dt, pair);
}

/** The rings, the venom on the floor, and the shell the cannon drops. */
function tickFloor(dt, pair) {
  for (const w of entities.wave) {
    w.r += 205 * dt;
    w.life -= dt;
    const wd = Math.hypot(player.x - w.x, (player.y - w.y) / GROUND_SCALE);
    if (Math.abs(wd - w.r) < 18 && !w.hit && player.inv <= 0) { hurt(w.damage || dmg(32), w.x, w.y); w.hit = true; }
  }
  entities.wave = entities.wave.filter(w => w.life > 0);

  // Nothing else moves what is in the air during an arena fight, so the pair
  // drives it, and catches its own shells on the frame they leave the list.
  const shells = entities.shots.filter(s => s.kind === 'shell' && s.burst != null);
  updateShots(dt);
  for (const s of shells) {
    // Still flying. A shell that hit or ran out has already been filtered away.
    if (entities.shots.includes(s)) continue;
    ring(s, s.burst, s.x, s.y);
    burst(s.x, s.y, '#ffb765', 30);
    game.shake = 7;
    s.burst = null;
  }

  for (const p of pair.pools) {
    p.life -= dt;
    if (p.life <= 0) continue;
    if (Math.hypot(player.x - p.x, (player.y - p.y) / GROUND_SCALE) < p.r && player.inv <= 0) venom(2, dmg(11));
  }
  pair.pools = pair.pools.filter(p => p.life > 0);
}

// --- the shell, and the thing it will not die for ----------------------------------

/**
 * Cutting the scorpion down does nothing while he is standing: it splits its
 * back, leaves the husk where it fell and walks out at full strength, quicker
 * than it was. Said out loud the first time, because nothing else does this.
 */
function shed(b) {
  b.husks.push({ x: b.x, y: b.y, angle: Math.atan2(b.dy, b.dx) });
  if (b.husks.length > 4) b.husks.shift();
  b.molts++;
  b.hp = b.max;
  b.state = 'molt';
  b.timer = MOLT_TIME;
  b.untargetable = true;
  b.combo = 0;
  b.chain = 0;
  burst(b.x, b.y - 20, '#cfe3c0', 46);
  game.shake = 6;
  sample('creatureSnarl', .75, .68);
  notify(b.pair.told
    ? 'The shell splits again. It comes out faster.'
    : 'The shell splits and it walks out of it whole. The captain is still standing — the beast will not stay down while he is.');
  b.pair.told = true;
}

/**
 * The captain falls and the fight does not end. `entities.boss` becomes the
 * scorpion here, so the bar, the tells and the loop all follow the body that
 * is still standing.
 */
function beginAbsorb(pair, captain) {
  const molt = pair.molt;
  pair.stage = 'absorbing';
  pair.fallen = { x: captain.x, y: captain.y };
  captain.state = 'fallen';
  captain.untargetable = true;
  molt.state = 'absorb';
  molt.timer = ABSORB_TIME;
  molt.untargetable = true;
  molt.role = 'crowned';
  molt.hp = molt.max = CROWNED_HP;
  molt.combo = 0;
  molt.chain = 0;
  molt.bodies = [molt];
  entities.boss = molt;
  entities.shots = [];
  entities.wave = [];
  burst(captain.x, captain.y - 30, '#8f2733', 40);
  game.shake = 8;
  sample('creatureSnarl', .9, .62);
  notify('Vosk goes down. The beast turns, and does not come for you.');
}

/** It drags him in, opens its own back, and closes over him. */
function absorb(dt, pair) {
  const molt = pair.molt, to = pair.fallen;
  molt.timer -= dt;
  const d = Math.hypot(to.x - molt.x, (to.y - molt.y) / GROUND_SCALE);
  if (d > 8) {
    molt.x += (to.x - molt.x) / d * 104 * dt;
    molt.y += (to.y - molt.y) / d * 104 * dt * GROUND_SCALE;
    face(molt);
  } else if (!pair.lifted && molt.timer < ABSORB_TIME * .5) {
    pair.lifted = true;
    burst(to.x, to.y - 20, '#8f2733', 40);
    sample('impact', .8, .7);
  }
  if (molt.timer > 0) return;
  pair.stage = 2;
  molt.state = 'stalk';
  molt.timer = .8;
  molt.phase = 2;
  molt.untargetable = false;
  pair.captain.hp = 0;
  burst(molt.x, molt.y - 40, '#c9a94e', 70);
  game.shake = 12;
  tone(70, .8, 'triangle');
  notify('It does not put him on its back. It puts him inside. What stands up is one thing.');
}

/**
 * Lethal damage on either body. Stage one never lets anything die: the beast
 * sheds, and the captain's death starts the merge instead of ending the fight.
 */
export function tandemLethal(b) {
  const pair = b.pair;
  if (!pair || pair.stage === 2) return false;
  if (pair.stage === 'absorbing') { b.hp = 1; return true; }
  if (b.role === 'molt') { shed(b); return true; }
  beginAbsorb(pair, b);
  return true;
}

/** Neither of them takes being cut quietly. */
export function tandemHurt(b) {
  if (b.untargetable) return;
  bleed(b.x, b.y - 20, player.x, player.y, false, b.role === 'captain' ? 'blood' : 'spore');
}

export function clearTandem(b) {
  entities.shots = [];
  entities.wave = [];
  clearBrood();
  if (b?.pair) b.pair.pools = [];
}

export function tandemDefeated() {
  cancelAttack();
  clearBrood();
}
