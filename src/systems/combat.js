import { game, player, progress, save, playing, attackDamage, attackRange, rollInvuln, heavyDiscount, armorDefense, WEAPONS, maxHp, relicSpec } from '../core/state.js';
import { ARMOR, itemByKey } from '../core/gear.js';
import { own, equipWeapon } from './inventory.js';
import { emit } from '../core/events.js';
import { entities, livingTargets, markSlain, emberReward, bossBodies, isBossBody } from './entities.js';
import { bossSpec } from './boss.js';
import { bleed, burst, floatingNumber, sporeMote, sporeBloom } from './effects.js';
import { findHarvestTarget, damageHarvestable } from '../world/world.js';
import { notify } from '../ui/hud.js';
import { tone, sample, playMusic, worldTrack } from './audio.js';

// `range` is the bare-handed baseline; the equipped weapon's reach is added by
// attackRange() so a longer sword genuinely hits from further out.
export const ATTACKS = {
  normal: { duration: .36, impact: .14, recovery: .4,  range: 77,  cost: 16, cone: 1.05, strong: false },
  strong: { duration: .62, impact: .27, recovery: .72, range: 104, cost: 32, cone: 1.4,  strong: true },
};

export const attackSpec = () => player.special ? ATTACKS.strong : ATTACKS.normal;

/**
 * Begins a committed swing. Facing, damage window and recovery are locked in
 * now; resolveStrike() decides what it actually connects with later.
 */
export function attack(special = false) {
  if (!playing() || player.cool > 0 || player.roll > 0) return;
  const spec = special ? ATTACKS.strong : ATTACKS.normal;
  const cost = spec.cost - (special ? heavyDiscount() : 0);
  if (player.st < cost) { notify('Catch your breath · stamina is low'); return; }

  const reach = attackRange(special);
  const target = livingTargets()
    .filter(e => Math.hypot(e.x - player.x, e.y - player.y) < reach)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
  if (target) player.face = Math.atan2(target.y - player.y, target.x - player.x);

  player.attackFace = player.face;
  player.st -= cost;
  player.regen = .65;
  player.cool = spec.recovery;
  player.attack = spec.duration;
  player.attackDuration = spec.duration;
  player.special = special;
  player.strikePending = true;
  player.swingSounded = false;
}

/**
 * Touch has no second button: a tap swings immediately, and a quick second tap
 * during the windup commits the same swing as a heavy strike instead.
 */
export function upgradeToHeavy() {
  if (player.attack <= 0 || player.special || !player.strikePending) return false;
  player.st += ATTACKS.normal.cost;
  cancelAttack();
  attack(true);
  return player.special;
}

/**
 * A second tap that lands after the light blade has already connected is not
 * lost: the heavy strike is buffered and fires the moment the swing recovers.
 */
export function queueHeavy() {
  if (player.special && player.attack > 0) return true;     // already swinging heavy
  if (upgradeToHeavy()) return true;
  if (attack(true), player.special && player.attack > 0) return true;
  player.queuedHeavy = game.time + QUEUE_WINDOW;
  return false;
}

const QUEUE_WINDOW = .8;

export function cancelAttack() {
  player.queuedHeavy = 0;
  player.special = false;
  player.attack = 0;
  player.strikePending = false;
  player.cool = 0;
}

function inArc(e, spec) {
  const angle = Math.atan2(e.y - player.y, e.x - player.x) - player.attackFace;
  return Math.hypot(e.x - player.x, e.y - player.y) < attackRange(spec.strong)
    && Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < spec.cone;
}

/** The chance roll for boss drops; swapped out by the checks. */
let dropRoll = Math.random;
export const setDropRoll = fn => { dropRoll = fn; };

/** The Warden's Edge is a rare drop — taken up on the spot, unreinforced, like any new blade. */
function bossDrop() {
  const index = WEAPONS.findIndex(w => w.drop?.from === 'warden');
  // Compared by damage, not by position: the array is ordered by save index now,
  // not by power, so holding a later blade does not mean holding a better one.
  if (index < 0 || (WEAPONS[progress.weapon]?.damage || 0) >= WEAPONS[index].damage) return null;
  if (dropRoll() >= WEAPONS[index].drop.chance) return null;
  own(WEAPONS[index].key);
  equipWeapon(WEAPONS[index].key);
  return WEAPONS[index];
}

/** What a boss or a Fallen leaves besides embers. */
const oreDrop = () => 3 + Math.floor(dropRoll() * 4);

function killReward(target) {
  const boss = isBossBody(target);
  const embers = boss ? bossSpec().embers : emberReward(target);
  progress.embers += embers;
  const ore = boss || target.elite ? oreDrop() : 0;
  progress.ore += ore;
  if (boss) {
    entities.wave = [];
    playMusic(worldTrack(game.region), 6);
    if (bossSpec().roar !== false) sample('wardenDeath', .9, target.kind === 'warden' ? 1 : .7);
    const kind = target.kind || 'warden';
    if (kind === 'warden') {
      progress.won = true;
      const drop = bossDrop();
      save();
      notify(drop ? `Warden felled · +${embers} embers, +${ore} ironstone · the ${drop.name} is yours` : `Warden felled · +${embers} embers, +${ore} ironstone. Return to Mira.`);
    } else {
      progress.bosses[kind] = true;
      bossSpec().onDeath?.();
      save();
      notify(`${bossSpec().name.split(',')[0]} falls · +${embers} embers, +${ore} ironstone`);
    }
    emit('bossDefeated', kind);
  } else {
    markSlain(target);
    if (target.elite && game.scene === 'room' && !entities.enemies.some(e => e !== target && e.elite && e.hp > 0)) playMusic(worldTrack(game.region), 5);
    // Some of the Fallen leave something worth taking off the body. It can be
    // anything ownable now, not only something to wear.
    const drop = target.elite?.drops && !progress.owned.includes(target.elite.drops)
      ? itemByKey(target.elite.drops) : null;
    if (drop) own(drop.key);
    save();
    notify(drop ? `${target.elite.name} falls · +${embers} embers, +${ore} ironstone · ${drop.name} taken`
      : target.elite ? `${target.elite.name} falls · +${embers} embers, +${ore} ironstone`
      : `+${embers} embers · ${target.kind === 'brute' ? 'quarry brute' : 'wildling'} defeated`);
  }
}

// --- parry ----------------------------------------------------------------------
/**
 * The blade catches a blow only in the last breath before it lands. The cue
 * goes up for the whole windup — you can see the blow coming — but the window
 * itself is a sliver, and a mistimed parry locks the blade out for a moment.
 */
const PARRY_WINDOW = .13, PARRY_REACH = 100, EXPOSED_FOR = 1.7, WHIFF_LOCK = .8;

/** Whatever is winding up a blow at him right now, in reach — window or not. */
function incoming() {
  if (game.scene === 'boss') {
    // Any boss body winding up a blow can be caught, whatever it is called.
    for (const b of bossBodies())
      if (b.hp > 0 && !b.untargetable && b.state.endsWith('Wind')
          && Math.hypot(b.x - player.x, b.y - player.y) < PARRY_REACH + 40) return b;
    return null;
  }
  for (const e of entities.enemies) {
    if (e.hp <= 0 || e.hidden || e.state !== 'windup') continue;
    if (Math.hypot(e.x - player.x, e.y - player.y) < PARRY_REACH) return e;
  }
  return null;
}

/** True while a blow is on its way: the E cue and the parry button show on this. */
export const parryHint = () => player.parryLock <= 0 && !!incoming();

/** The attacker whose blow can be parried this instant, if any. */
export function parryTarget() {
  if (player.parryLock > 0) return null;
  const t = incoming();
  return t && t.timer < PARRY_WINDOW ? t : null;
}

/**
 * Catches a blow on the blade: the attacker's swing is cancelled and it is left
 * exposed, the way the Warden is after a missed charge. Mistiming it against an
 * incoming blow locks the blade out. Returns false only when there was nothing
 * coming at all, so E can fall through to interacting.
 */
export function parry() {
  if (!playing()) return false;
  if (player.parryLock > 0) return true;                 // still recovering from a bad one
  const t = parryTarget();
  if (!t) {
    if (!incoming()) return false;
    // Too early or too late: the blade is out of position and the blow is still coming.
    player.parryLock = WHIFF_LOCK;
    player.st = Math.max(0, player.st - 14);
    player.regen = .65;
    burst(player.x, player.y - 20, '#6b7a86', 8);
    tone(180, .12, 'square', .015);
    notify('Too soon — the blade is out of position');
    return true;
  }
  cancelAttack();
  player.parryLock = 0;
  player.inv = Math.max(player.inv, .3);
  player.st = Math.max(0, player.st - 8);
  player.face = Math.atan2(t.y - player.y, t.x - player.x);
  if (isBossBody(t)) { t.state = 'recover'; t.timer = EXPOSED_FOR; t.hit = true; t.hits = 0; }
  else { t.state = 'exposed'; t.timer = EXPOSED_FOR; t.chain = 0; }
  burst(player.x + Math.cos(player.face) * 20, player.y - 22, '#fff2c4', 16);
  game.shake = 3;
  sample('impact', .9, 1.15);
  tone(880, .12, 'square', .02);
  notify('Parried · it is exposed');
  return true;
}

/** An exposed creature or a recovering boss takes half again as much. */
const exposed = t => t.state === 'exposed' || (isBossBody(t) && t.state === 'recover');

/** Runs on the exact contact frame of a committed swing. */
export function resolveStrike() {
  if (!player.strikePending || game.dead) return;
  player.strikePending = false;
  const special = player.special, spec = attackSpec(), damage = attackDamage(special);

  const target = livingTargets().filter(e => inArc(e, spec))
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];

  if (target) {
    target.hp = Math.max(0, target.hp - Math.round(exposed(target) ? damage * 1.5 : damage));
    burst(target.x, target.y, '#eac78c', special ? 9 : 5);
    bleed(target.x, target.y, player.x, player.y, special || target.hp === 0, target.kind === 'sporeling' ? 'spore' : 'blood');
    floatingNumber(target.x, target.y - 35, '' + damage, '#fff1c2');
    game.shake = special ? 4 : 2;
    sample('impact', special ? .8 : .65, special ? .9 : 1);
    const venomOnBlade = bladeRot();
    if (venomOnBlade && target.hp > 0) rot(target, venomOnBlade.time, venomOnBlade.damage);
    if (isBossBody(target) && target.hp > 0) bossSpec().onHurt?.(target);
    // A boss that fights in rounds gets back up instead of falling.
    if (!target.hp && !(isBossBody(target) && bossSpec().onLethal?.(target))) killReward(target);
  } else if (game.scene === 'wild') {
    // A whiff still bites into whatever timber or ironstone stands in the arc.
    const harvest = findHarvestTarget(player.x, player.y, player.attackFace, attackRange(special), spec.cone);
    if (harvest) {
      const result = damageHarvestable(harvest, damage, special, player.x, player.y);
      game.shake = special ? 3 : 1.5;
      if (result.felled) {
        const noun = result.resource === 'wood' ? 'timber' : 'ironstone';
        floatingNumber(harvest.ref.x, harvest.ref.y - 40, `+${result.amount} ${noun}`, result.resource === 'wood' ? '#e5cd92' : '#a7cddd');
        notify(result.kind === 'tree' ? `Tree felled · +${result.amount} timber` : `Vein broken · +${result.amount} ironstone`);
        save();
        tone(result.kind === 'tree' ? 210 : 320, .18, 'square');
      } else {
        tone(result.kind === 'tree' ? 170 : 260, .07, 'square', .018);
      }
      return;
    }
  }
}

let swings = 0;

/**
 * Venom works through the guard: rolling does not shake it, and it keeps
 * ticking until it runs out or the hearth burns it away.
 */
export function venom(seconds, damage) {
  const fresh = player.poison <= 0;
  player.poison = Math.max(player.poison, seconds);
  player.venomDamage = Math.max(player.venomDamage, damage);
  if (fresh) { player.poisonTick = 1; notify('Venom in the blood'); tone(140, .3, 'sawtooth', .02); }
}

export function clearVenom() {
  player.poison = 0;
  player.poisonTick = 0;
  player.venomDamage = 0;
}

function updateVenom(dt) {
  if (player.poison <= 0 || game.dead) return;
  player.poison -= dt;
  player.poisonTick -= dt;
  if (player.poisonTick <= 0) {
    player.poisonTick = 1;
    player.hp = Math.max(0, player.hp - player.venomDamage);
    floatingNumber(player.x, player.y - 25, '−' + player.venomDamage, '#8dffd0');
    burst(player.x, player.y - 14, '#6fd6b0', 5);
    game.damageFlash = Math.max(game.damageFlash, .16);
    if (!player.hp) { die(); return; }
  }
  if (player.poison <= 0) { clearVenom(); notify('The venom passes.'); }
}

/**
 * The Mycelian Fang leaves the grove's rot in whatever it cuts. It is the same
 * shape as the venom he can catch — a tick a second, for a few seconds — and it
 * deepens every time Rowan takes the hammer to the blade.
 */
export function rot(target, seconds, damage) {
  target.rotLeft = Math.max(target.rotLeft || 0, seconds);
  target.rotDamage = Math.max(target.rotDamage || 0, damage);
  target.rotTick ??= 1;
}

/** What the blade puts in a wound at its current reinforcement, or nothing. */
export function bladeRot() {
  const v = WEAPONS[progress.weapon]?.venom;
  return v ? { time: v.time, damage: v.damage + (v.perLevel || 0) * progress.blade } : null;
}

function updateRot(dt) {
  for (const t of [...entities.enemies, ...bossBodies()]) {
    if (!t.rotLeft || t.hp <= 0) continue;
    t.rotLeft -= dt;
    t.rotTick -= dt;
    if (t.rotTick <= 0) {
      t.rotTick = 1;
      t.hp = Math.max(0, t.hp - t.rotDamage);
      floatingNumber(t.x, t.y - 40, '−' + t.rotDamage, '#a8e04a');
      burst(t.x, t.y - 18, '#6fd6b0', 4);
      // Rot can finish something the blade did not, and that still counts.
      if (!t.hp && !(isBossBody(t) && bossSpec().onLethal?.(t))) killReward(t);
    }
    if (t.rotLeft <= 0) { t.rotLeft = 0; t.rotDamage = 0; }
  }
}

/**
 * The Sporemother's Heart: it closes wounds on its own, a little at a time, and
 * it stops well short of whole. Above its ceiling it does nothing at all, so it
 * carries him between fights rather than through one.
 */
function updateRelicRegen(dt) {
  const spec = relicSpec();
  if (!spec?.regen || game.dead || !playing()) { player.mendTimer = 0; return; }
  const ceiling = maxHp() * spec.regen.cap;
  if (player.hp >= ceiling) { player.mendTimer = 0; player.mending = 0; return; }
  player.mendTimer = (player.mendTimer || 0) + dt;
  // Spores gather for the last second before it takes, then go into him.
  player.mending = Math.max(0, Math.min(1, (player.mendTimer - (spec.regen.every - 1)) / 1));
  if (player.mending > 0 && Math.random() < player.mending * dt * 40) sporeMote(player.x, player.y);
  if (player.mendTimer < spec.regen.every) return;
  player.mendTimer = 0;
  player.mending = 0;
  const healed = Math.min(Math.round(maxHp() * spec.regen.share), Math.ceil(ceiling - player.hp));
  if (healed <= 0) return;
  player.hp = Math.min(ceiling, player.hp + healed);
  floatingNumber(player.x, player.y - 44, '+' + healed, '#a8e04a');
  sporeBloom(player.x, player.y);
}

export function updateAttack(dt) {
  updateVenom(dt);
  updateRot(dt);
  updateRelicRegen(dt);
  player.parryLock = Math.max(0, player.parryLock - dt);
  player.attack = Math.max(0, player.attack - dt);
  if (player.queuedHeavy) {
    if (game.time > player.queuedHeavy) player.queuedHeavy = 0;
    else if (player.attack <= 0 && player.cool <= 0 && player.roll <= 0) { player.queuedHeavy = 0; attack(true); }
  }
  // The blade sings once, the moment it leaves the windup; the two slices alternate.
  if (player.attack > 0 && !player.swingSounded && attackPose().phase !== 'windup') {
    player.swingSounded = true;
    sample(swings++ % 2 ? 'slice2' : 'slice1', .55, player.special ? .85 : 1);
  }
  if (player.strikePending && player.attackDuration - player.attack + 1e-9 >= attackSpec().impact) resolveStrike();
}

/** Where the blade sits in its arc; the swing crosses the facing vector on impact. */
export function attackPose() {
  const spec = attackSpec(), elapsed = player.attackDuration - player.attack;
  const swingStart = spec.impact - .065, swingEnd = spec.impact + .085;
  let offset, phase;
  if (elapsed < swingStart) {
    offset = -1.05 - .35 * Math.min(1, elapsed / Math.max(.01, swingStart));
    phase = 'windup';
  } else if (elapsed < swingEnd) {
    offset = elapsed < spec.impact ? -1.4 * (spec.impact - elapsed) / .065 : 1.65 * (elapsed - spec.impact) / .085;
    phase = 'swing';
  } else {
    offset = 1.65 - .55 * Math.min(1, (elapsed - swingEnd) / (spec.duration - swingEnd));
    phase = 'recovery';
  }
  return { angle: player.attackFace + offset, offset, phase, progress: elapsed / spec.duration };
}

export function roll(dx, dy) {
  if (!playing() || player.roll > 0 || player.cool > .25) return;
  if (player.st < 23) { notify('Not enough stamina to roll.'); return; }
  if (!dx && !dy) { dx = Math.cos(player.face); dy = Math.sin(player.face); }
  const d = Math.hypot(dx, dy);
  cancelAttack();
  player.rx = dx / d;
  player.ry = dy / d;
  player.face = Math.atan2(dy, dx);
  player.roll = .33;
  player.inv = rollInvuln();
  player.st -= 23;
  player.regen = .65;
  tone(230, .1, 'triangle');
}

/** Blows against Aldren cycle through five shield-impact recordings so a beating never sounds like a loop. */
const HITS_TAKEN = ['hit1', 'hit2', 'hit3', 'hit4', 'hit5'];
let hitsTaken = 0;

export function hurt(amount, x, y) {
  if (player.inv > 0 || game.dead) return;
  amount = Math.max(1, amount - armorDefense());
  player.hp = Math.max(0, player.hp - amount);
  player.inv = .7;
  game.shake = 5;
  game.damageFlash = .32;
  bleed(player.x, player.y, x, y, amount >= 27 || player.hp === 0);
  sample(HITS_TAKEN[hitsTaken++ % HITS_TAKEN.length], .6, amount >= 27 ? .9 : 1);
  tone(95, .15, 'sawtooth', .015);
  floatingNumber(player.x, player.y - 25, '−' + amount, '#f4ac93');
  if (!player.hp) die();
}

/**
 * Everything he was carrying stays where he fell. Walk back to it and it is his
 * again; die on the way and the old pile is gone, and this one takes its place.
 */
function die() {
  cancelAttack();
  game.dead = true;
  progress.lost = progress.embers > 0
    ? { region: game.region, scene: game.scene, room: game.room, x: Math.round(player.x), y: Math.round(player.y), embers: progress.embers }
    : null;
  if (progress.lost) notify(`${progress.embers} embers left where you fell`);
  progress.embers = 0;
  save();
  sample('aldrenDeath', .8);
  emit('death');
}
