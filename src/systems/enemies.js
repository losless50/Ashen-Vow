import { game, player } from '../core/state.js';
import { notify } from '../ui/hud.js';
import { entities, enemyStats, ENEMY_KINDS } from './entities.js';
import { hurt, venom } from './combat.js';
import { burst, bleed } from './effects.js';
import { sample } from './audio.js';
import { slide } from '../world/world.js';

const GOBLIN_VOICES = ['goblin2', 'goblin3', 'goblin4', 'goblin5'];
/** Creatures do not speak on every swing: a little over half the time, and never twice in quick succession. */
const VOICE_CHANCE = .55, VOICE_GAP = 2.5;

function creatureVoice(e) {
  if (game.time - (e.lastVoice ?? -VOICE_GAP) < VOICE_GAP || Math.random() > VOICE_CHANCE) return;
  e.lastVoice = game.time;
  if (e.kind === 'brute') sample('creatureSnarl', .55, .8);
  else if (e.kind === 'wolf') sample('creatureSnarl', .45, e.elite ? 1.05 : 1.3);
  else if (e.kind === 'frog') sample('frogCroak', .5, .92 + Math.random() * .22);
  else if (e.kind === 'sporeling') sample('creatureSnarl', .35, e.elite ? .6 : .72);
  else sample(GOBLIN_VOICES[Math.floor(Math.random() * GOBLIN_VOICES.length)], .4, .95 + Math.random() * .1);
}

/** The colour a creature's spores burst in — its cap's glow. */
const SPORE_COLOR = { teal: '#6fd6b0', violet: '#b48ad0', amber: '#f2a54b', mother: '#b48ad0', grafted: '#6fd6b0' };

/** What a windup ends in: a bite, a spore cloud, a wolf's leap, or a mouthful of acid. */
function release(e, k, d) {
  if (k.spit) {
    // A frog spits: a slow green arc that burns where it lands.
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    entities.shots.push({
      kind: 'acid', x: e.x + Math.cos(a) * 12, y: e.y - 12 + Math.sin(a) * 7,
      vx: Math.cos(a) * 210, vy: Math.sin(a) * 210 * .62,
      angle: a, life: Math.min(1.6, d / 210 + .06), damage: k.damage, hit: false,
    });
    burst(e.x, e.y - 12, '#a8e04a', 6);
    e.state = 'idle';
    e.cool = k.cool;
    return;
  }
  if (k.lunge) {
    // Wolves leave the ground: the bite lands wherever the leap ends.
    e.state = 'lunge';
    e.timer = .2;
    e.dx = (player.x - e.x) / (d || 1);
    e.dy = (player.y - e.y) / (d || 1);
    e.hit = false;
    return;
  }
  if (k.spore) burst(e.x, e.y - 20, SPORE_COLOR[e.skin] || '#b48ad0', 26);
  // The Spore Monster does not strike so much as billow: the cloud is the attack.
  if (e.monster) cloud(e.x, e.y, k.hitRange, Math.round(k.damage * .35), 2.6);
  const landed = player.hp;
  if (d < k.hitRange) hurt(k.damage, e.x, e.y);
  // Claws that carry it: venom only takes when the blow actually lands.
  if (k.venom && player.hp < landed) venom(k.venom.time, k.venom.damage);
  burst(e.x, e.y, k.spore ? SPORE_COLOR[e.skin] || '#b48ad0' : '#d3af79', 8);
  e.state = 'idle';
  e.cool = k.cool;
}

// --- hazards ------------------------------------------------------------------
// Things on the floor that hurt: spore-fall rings that burst after a moment,
// and pools that sting whoever steps in. Drawn by render/scenes.js.
export function addHazard(h) {
  // A burst remembers how long its fall was, so the missile can be drawn coming down.
  entities.hazards.push({ hit: false, age: 0, ...h, total: h.timer || 0 });
}

function updateHazards(dt) {
  for (const h of entities.hazards) {
    h.age += dt;
    const inside = Math.hypot(player.x - h.x, player.y - h.y) < h.r;
    if (h.kind === 'cloud') {
      h.life -= dt;
      h.tick -= dt;
      if (inside && h.tick <= 0 && player.inv <= 0) { hurt(h.damage, h.x, h.y); h.tick = h.every; }
      continue;
    }
    if (h.kind === 'burst') {
      h.timer -= dt;
      if (h.timer <= 0 && !h.done) {
        h.done = true;
        h.life = .35;
        burst(h.x, h.y - 10, h.color, 22);
        bleed(h.x, h.y, h.x, h.y - 40, true, 'spore');
        if (inside && player.inv <= 0) hurt(h.damage, h.x, h.y);
      }
      if (h.done) h.life -= dt;
    } else {
      h.life -= dt;
      if (inside && !h.hit && player.inv <= 0) {
        const before = player.hp;
        hurt(h.damage, h.x, h.y);
        if (h.venom && player.hp < before) venom(h.venom.time, h.venom.damage);
        h.hit = true;
      }
      if (!inside) h.hit = false;
    }
  }
  entities.hazards = entities.hazards.filter(h => h.kind === 'burst' ? !(h.done && h.life <= 0) : h.life > 0);
}

/** A drifting bank of spores that keeps hurting whoever stands in it. */
function cloud(x, y, r, damage, life = 3) {
  addHazard({ kind: 'cloud', x, y, r, life, damage, every: .65, tick: 0, color: '#b48ad0' });
}

/**
 * At half health the Sporemother stops pretending to be one of the folk: she
 * swells to twice her size, strikes three times as fast, and everything she does
 * leaves a bank of spores on the floor.
 */
function becomeSporeMonster(e) {
  const base = ENEMY_KINDS[e.kind];
  e.monster = true;
  e.elite = {
    ...e.elite,
    name: 'Spore Monster', title: 'She has stopped pretending to be one of them',
    scale: e.elite.scale * 2, radius: 44, hitRange: 190, speed: 54,
    windup: base.windup / 3, cool: base.cool / 3,
  };
  e.state = 'idle';
  e.cool = .8;
  e.specialCool = 3;
  burst(e.x, e.y - 40, '#b48ad0', 70);
  cloud(e.x, e.y, 210, 16, 4.5);
  game.shake = 9;
  sample('creatureSnarl', .8, .45);
  notify('She swells — the Spore Monster');
}

/**
 * At half health Mycel stops running on four legs. He comes up onto his hind
 * ones, the growths open, and he swipes with claws that leave venom in the wound.
 */
function becomeRisen(e) {
  e.risen = true;
  e.elite = {
    ...e.elite,
    name: 'Mycel, Risen', title: 'It stands like a man now, and its claws are wet',
    scale: e.elite.scale * 1.35, radius: 22, hitRange: 132, speed: 78,
    windup: .55, cool: 1, lunge: 0, venom: { time: 9, damage: 7 },
  };
  e.state = 'idle';
  e.hidden = false;
  e.cool = .9;
  e.specialCool = 3;
  burst(e.x, e.y - 40, '#6fd6b0', 60);
  game.shake = 8;
  sample('creatureSnarl', .8, .55);
  notify('Mycel rises onto his hind legs');
}

/** Each Fallen has a move of its own, on its own clock, on top of the ordinary bite or burst. */
const SPECIALS = {
  // Greymane throws his head back and howls, then comes three leaps in a row.
  greymane: { every: 7, start(e) { e.state = 'howl'; e.timer = 1; e.chain = 3; } },
  // The Sporemother raises her arms and spores fall in rings around the wanderer.
  sporemother: {
    every: 8,
    start(e) {
      const big = !!e.monster;
      e.state = 'rain'; e.timer = big ? .8 : 1.3;
      for (let i = 0; i < (big ? 9 : 5); i++) {
        const a = i / (big ? 9 : 5) * Math.PI * 2 + Math.random(), r = i ? 70 + Math.random() * (big ? 130 : 60) : 0;
        addHazard({ kind: 'burst', x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r, r: big ? 62 : 48, timer: (big ? .8 : 1.4) + i * (big ? .1 : .18), damage: big ? 30 : 22, color: '#b48ad0' });
      }
      if (big) cloud(e.x, e.y, 190, 16, 3);
    },
  },
  // Mycel goes under and comes up where the wanderer was standing. Once risen he
  // stays above ground and rends a ring of venom out of the floor instead.
  mycel: {
    every: 7,
    start(e) {
      if (e.risen) { e.state = 'rend'; e.timer = .85; return; }
      e.state = 'dig'; e.timer = 1.15; e.hidden = true; e.tx = player.x; e.ty = player.y;
    },
  },
};

function updateSpecial(e, k, d, dt) {
  const sp = SPECIALS[e.id];
  if (!sp) return false;
  e.specialCool = (e.specialCool ?? sp.every * .5) - dt;
  if (e.state === 'howl') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'lunge'; e.timer = .2; e.hit = false; e.dx = (player.x - e.x) / (d || 1); e.dy = (player.y - e.y) / (d || 1); }
    return true;
  }
  if (e.state === 'rechain') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'lunge'; e.timer = .2; e.hit = false; const dd = Math.hypot(player.x - e.x, player.y - e.y) || 1; e.dx = (player.x - e.x) / dd; e.dy = (player.y - e.y) / dd; }
    return true;
  }
  if (e.state === 'rain') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'idle'; e.cool = k.cool; }
    return true;
  }
  if (e.state === 'rend') {
    e.timer -= dt;
    if (e.timer <= 0) {
      // A sweep of both claws: everything close is torn, and the floor is left venomous.
      const before = player.hp;
      if (d < 150) hurt(Math.round(k.damage * .8), e.x, e.y);
      if (player.hp < before) venom(9, 7);
      burst(e.x, e.y - 20, '#6fd6b0', 34);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        addHazard({ kind: 'pool', x: e.x + Math.cos(a) * 96, y: e.y + Math.sin(a) * 52, r: 40, life: 6, damage: 10, venom: { time: 8, damage: 6 }, color: '#6fd6b0' });
      }
      game.shake = 6;
      e.state = 'idle';
      e.cool = k.cool;
    }
    return true;
  }
  if (e.state === 'dig') {
    e.timer -= dt;
    if (e.timer <= 0) {
      e.hidden = false;
      e.x = e.tx; e.y = e.ty;
      if (game.scene === 'room') arena(e);
      burst(e.x, e.y, '#6fd6b0', 30);
      if (Math.hypot(player.x - e.x, player.y - e.y) < 74 && player.inv <= 0) hurt(k.damage + 6, e.x, e.y);
      e.state = 'idle'; e.cool = k.cool * .6;
    }
    return true;
  }
  if (e.specialCool <= 0 && d < k.chase && e.state === 'idle' && e.cool <= 0) {
    e.specialCool = e.monster ? sp.every / 3 : sp.every;
    sp.start(e);
    creatureVoice(e);
    return true;
  }
  return false;
}

/** Rooms are the boss arena's floor: nothing to slide along, just walls. */
function arena(e) {
  e.x = Math.max(505, Math.min(995, e.x));
  e.y = Math.max(305, Math.min(775, e.y));
}

/** Arrows and acid in the air, and what they do to whoever they find. */
export function updateShots(dt) {
  for (const s of entities.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.hit) continue;
    if (Math.hypot(player.x - s.x, player.y - (s.y + 18)) < 18 && player.inv <= 0) {
      s.hit = true;
      s.life = 0;
      hurt(s.damage, s.x, s.y);
    }
    if (s.life <= 0 && s.kind === 'acid') {
      // Acid keeps burning where it lands.
      burst(s.x, s.y, '#a8e04a', 10);
      addHazard({ kind: 'pool', x: s.x, y: s.y + 14, r: 26, life: 3, damage: 6, color: '#a8e04a' });
    }
  }
  entities.shots = entities.shots.filter(s => s.life > 0);
}

/** A dead frog is only away for a while. */
function updateRespawns(dt) {
  for (const e of entities.enemies) {
    const k = enemyStats(e);
    if (!k.respawn || e.hp > 0) continue;
    e.down = (e.down ?? 0) + dt;
    if (e.down < k.respawn) continue;
    e.down = 0;
    e.hp = k.hp;
    e.x = e.homeX;
    e.y = e.homeY;
    e.state = 'idle';
    e.cool = 1;
    burst(e.x, e.y, '#a8e04a', 12);
    // It announces itself the moment it is back at the water.
    e.lastVoice = 0;
    if (Math.hypot(player.x - e.x, player.y - e.y) < 520) sample('frogCroak', .4, .9 + Math.random() * .25);
  }
}

/** Idle frogs croak to each other across the water, now and then. */
function croakAbout(dt) {
  croakCool -= dt;
  if (croakCool > 0) return;
  croakCool = 3 + Math.random() * 5;
  const near = entities.enemies.filter(e => e.kind === 'frog' && e.hp > 0 && Math.hypot(player.x - e.x, player.y - e.y) < 620);
  if (!near.length) return;
  const e = near[Math.floor(Math.random() * near.length)];
  e.croak = .35;
  sample('frogCroak', .3, .88 + Math.random() * .3);
}
let croakCool = 2;

export function updateEnemies(dt) {
  updateHazards(dt);
  croakAbout(dt);
  updateShots(dt);
  updateRespawns(dt);
  for (const e of entities.enemies) {
    if (e.hp <= 0) continue;
    const k = enemyStats(e);
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    e.cool -= dt;
    if (e.id === 'sporemother' && !e.monster && e.hp <= e.max * .5) { becomeSporeMonster(e); continue; }
    if (e.id === 'mycel' && !e.risen && e.hp <= e.max * .5) { becomeRisen(e); continue; }
    if (updateSpecial(e, k, d, dt)) continue;

    if (e.croak > 0) e.croak -= dt;
    if (e.state === 'exposed') {
      e.timer -= dt;
      if (e.timer <= 0) { e.state = 'idle'; e.cool = k.cool; }
      continue;
    }
    if (e.state === 'windup') {
      e.timer -= dt;
      if (e.timer <= 0) release(e, k, d);
      continue;
    }
    if (e.state === 'lunge') {
      e.timer -= dt;
      const ox = e.x, oy = e.y;
      e.x += e.dx * k.lunge * dt;
      e.y += e.dy * k.lunge * dt;
      if (game.scene === 'room') arena(e); else slide(e, ox, oy, k.radius);
      if (!e.hit && Math.hypot(player.x - e.x, player.y - e.y) < k.hitRange) {
        e.hit = true;
        hurt(k.damage, e.x, e.y);
        if (k.spore) burst(e.x, e.y - 16, SPORE_COLOR[e.skin] || '#6fd6b0', 18);
      }
      if (e.id === 'mycel' && (e.trail = (e.trail || 0) + dt) > .06) { e.trail = 0; addHazard({ kind: 'pool', x: e.x, y: e.y, r: 26, life: 3.5, damage: 9, color: '#6fd6b0' }); }
      if (e.timer <= 0) {
        if (e.chain > 1) { e.chain--; e.state = 'rechain'; e.timer = .18; }
        else { e.chain = 0; e.state = 'idle'; e.cool = k.cool; }
      }
      continue;
    }

    if (d < k.strike && e.cool <= 0) {
      e.state = 'windup';
      e.timer = k.windup;
      creatureVoice(e);
    } else if (d < k.chase && d > k.hold) {
      const ox = e.x, oy = e.y;
      const nx = (player.x - e.x) / d * k.speed * dt, ny = (player.y - e.y) / d * k.speed * dt;
      // Creatures respect the treeline, the river and the camp, sliding along them.
      e.x = ox + nx; e.y = oy + ny;
      if (game.scene === 'room') arena(e); else slide(e, ox, oy, k.radius);
    }
  }
}
