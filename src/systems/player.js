import {
  game, player, progress, keys, stick, save, playing, lostHere, ARENA,
  maxHp, maxStamina, staminaRegen, moveSpeed, flaskHeal, maxFlasks, ware, HERALD_WARES, clearBoons } from '../core/state.js';
import { cancelAttack, clearVenom } from './combat.js';
import { entities, spawnEnemies, enemyStats } from './entities.js';
import { burst, clearGore, clearAllEffects } from './effects.js';
import { slide, restoreHarvestables, groundAt, exitAt, enterRegion } from '../world/world.js';
import * as world from '../world/world.js';
import { emit } from '../core/events.js';
import { notify } from '../ui/hud.js';
import { tone, playMusic, playAmbience, sample, worldTrack } from './audio.js';

/** A cutscene's input: frozen, or a steady walk toward its target. */
function scriptedInput(script) {
  if (script.hold) return { dx: 0, dy: 0 };
  const dx = script.x - player.x, dy = script.y - player.y, d = Math.hypot(dx, dy);
  if (d < 4) {
    game.scripted = null;
    script.done?.();
    return { dx: 0, dy: 0 };
  }
  return { dx: dx / d, dy: dy / d };
}

export function movementInput() {
  if (game.scripted) return scriptedInput(game.scripted);
  return {
    dx: (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + stick.x,
    dy: (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0) + stick.y,
  };
}

export function updatePlayer(dt) {
  game.damageFlash = Math.max(0, game.damageFlash - dt);
  player.inv = Math.max(0, player.inv - dt);
  player.cool = Math.max(0, player.cool - dt);
  player.regen = Math.max(0, player.regen - dt);
  game.shake = Math.max(0, game.shake - dt * 20);
  if (!player.regen) player.st = Math.min(maxStamina(), player.st + staminaRegen() * dt);

  const { dx, dy } = movementInput();
  const ox = player.x, oy = player.y;
  if (player.roll > 0) {
    player.roll -= dt;
    player.x += player.rx * 340 * dt;
    player.y += player.ry * 340 * dt;
    burst(player.x, player.y, '#cee7c3', 1);
  } else if (dx || dy) {
    const d = Math.max(1, Math.hypot(dx, dy));
    player.x += dx / d * moveSpeed() * dt;
    player.y += dy / d * moveSpeed() * dt;
    player.face = Math.atan2(dy, dx);
  }

  const b = game.scene === 'wild' ? world.bounds : ARENA;
  player.x = Math.max(b.minX, Math.min(b.maxX, player.x));
  player.y = Math.max(b.minY, Math.min(b.maxY, player.y));
  if (game.scene === 'wild') {
    slide(player, ox, oy, 15);
    // Walking off a road at the map's edge crosses into the next region.
    const exit = !game.scripted && exitAt(player.x, player.y);
    if (exit) crossTo(exit.to, exit.at);
  }

  recoverEmbers();

  const moved = Math.hypot(player.x - ox, player.y - oy);
  player.moving = moved > .02 && player.roll <= 0;
  if (player.moving) {
    player.walkPhase += moved * .14;
    // Each half of the walk cycle is one foot coming down; every third one is heard.
    const stride = Math.floor(player.walkPhase / Math.PI);
    if (stride !== player.lastStride) {
      player.lastStride = stride;
      if (stride % STEPS_PER_SOUND === 0) footstep();
    }
  }
}

const STEPS_PER_SOUND = 3;

/** Walking onto the pile takes it back. */
function recoverEmbers() {
  const l = lostHere();
  if (!l || Math.hypot(player.x - l.x, player.y - l.y) > 34) return;
  progress.embers += l.embers;
  progress.lost = null;
  save();
  burst(player.x, player.y - 16, '#ffd77a', 30);
  tone(880, .4, 'sine');
  notify(`+${l.embers} embers recovered`);
}

/** Steps into another region at a given spot, with its creatures woken. */
export function crossTo(key, at) {
  cancelAttack();
  clearAllEffects();
  enterRegion(key);
  player.x = at.x;
  player.y = at.y;
  player.inv = 1;
  spawnEnemies(key);
  // Each region has its own song; crossing over changes it.
  playMusic(worldTrack(key), 3);
  playAmbience('forest', 3);
  emit('regionChanged', key);
  notify(key === 'echo' ? 'Echo Grove · the light goes out under the trees.' : 'Hearthwood · the road home.');
}

/** The last footfall, for checks: which ground it landed on and how many so far. */
export const footsteps = { count: 0, ground: null };

function footstep() {
  const ground = game.scene === 'wild' ? groundAt(player.x, player.y) : game.room === 'sporehouse' ? 'grass' : 'dirt';
  footsteps.count++;
  footsteps.ground = ground;
  sample(ground === 'grass' ? 'stepGrass' : 'stepDirt', .14, .92 + Math.random() * .16);
}

export function heal() {
  if (!playing()) return;
  if (player.hp >= maxHp()) { notify('Your vitality is already full.'); return; }
  if (!player.flasks) {
    const vial = HERALD_WARES.find(w => w.key === 'vial');
    if (!ware('vial')) { notify('No flasks left. Rest at the campfire.'); return; }
    progress.wares.vial--;
    player.hp = Math.min(maxHp(), player.hp + vial.heal);
    save();
    burst(player.x, player.y, '#fff2c4', 22);
    tone(720, .3);
    notify(`Vial of dawn · +${vial.heal} vitality · ${ware('vial')} left`);
    return;
  }
  player.flasks--;
  player.hp = Math.min(maxHp(), player.hp + flaskHeal());
  burst(player.x, player.y, '#edd989', 22);
  tone(660, .3);
  notify('Sunlit flask · vitality restored');
}

/** The hearth restores the wanderer and resets the wilds — enemies and resources alike. */
export function rest() {
  cancelAttack();
  clearGore();
  player.hp = maxHp();
  player.st = maxStamina();
  player.flasks = maxFlasks();
  clearVenom();
  // A brew is good until the fire, and no longer.
  clearBoons();
  // The hearth wakes the quarry again, never the practice creatures already put down.
  entities.hazards = [];
  entities.enemies = entities.enemies.filter(e => !(e.once && e.hp <= 0));
  for (const e of entities.enemies) {
    e.hp = enemyStats(e).hp;
    e.x = e.homeX;
    e.y = e.homeY;
    e.state = 'idle';
  }
  restoreHarvestables();
  // Sitting at a fire is what makes the charm remember it.
  if (!progress.fires.includes(game.region)) progress.fires.push(game.region);
  progress.region = game.region;
  save();
  notify(game.region === 'echo' ? 'Rested in the grove · the fire is remembered' : 'Rested at Hearthwood · the wilds have grown back');
}

export function respawn({ silent = false } = {}) {
  cancelAttack();
  clearAllEffects();
  player.moving = false;
  game.damageFlash = 0;
  game.scene = 'wild';
  game.room = null;
  game.scripted = null;
  game.near = null;
  game.dead = false;
  if (game.region !== progress.region) enterRegion(progress.region);
  player.x = world.fire.x - (game.region === 'echo' ? 0 : 29);
  player.y = world.fire.y + (game.region === 'echo' ? 46 : 66);
  player.hp = maxHp();
  player.st = maxStamina();
  player.flasks = maxFlasks();
  clearVenom();
  player.roll = 0;
  player.inv = 1;
  entities.wave = [];
  entities.hazards = [];
  entities.shots = [];
  entities.boss = null;
  entities.herald = null;
  if (!silent) {
    playMusic(worldTrack(game.region), 3);
    playAmbience('forest', 3);
  }
  spawnEnemies(game.region);
  restoreHarvestables();
  if (!silent) notify('The fire remembers you. Your upgrades and materials are safe.');
}
