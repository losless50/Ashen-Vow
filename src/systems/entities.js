import { game, progress } from '../core/state.js';

/**
 * Enemy archetypes. `kind` drives stats, rewards and sprite palette so a new
 * creature is one entry here plus a palette in render/actors.js.
 */
export const ENEMY_KINDS = {
  wildling:  { hp: 50,  damage: 17, speed: 57, chase: 190, hold: 40, strike: 48, hitRange: 60, windup: .6,  cool: 1.3, embers: 12, scale: 1,    radius: 13 },
  brute:     { hp: 105, damage: 26, speed: 64, chase: 240, hold: 46, strike: 58, hitRange: 74, windup: .78, cool: 1.5, embers: 26, scale: 1.22, radius: 17 },
  // Echo Grove. Wolves crouch, then lunge; sporelings are slow and burst with spores.
  // Wolves wait in the dark and only come once he is close; then they close fast.
  wolf:      { hp: 88,  damage: 32, speed: 98, chase: 150, hold: 36, strike: 74, hitRange: 58, windup: .42, cool: 1.1, embers: 24, scale: 1,    radius: 12, lunge: 300 },
  sporeling: { hp: 200, damage: 44, speed: 40, chase: 200, hold: 46, strike: 64, hitRange: 88, windup: .9,  cool: 1.9, embers: 35, scale: 1.1,  radius: 15, spore: true },
  // Pond frogs: weak, easily killed, and back within half a minute.
  frog:      { hp: 26,  damage: 11, speed: 34, chase: 230, hold: 150, strike: 210, hitRange: 0, windup: .7, cool: 2.2, embers: 6,  scale: .85, radius: 9, spit: true, respawn: 30 },
  // The Sunken Vault. Men, not beasts: whoever is still picking over a drowned
  // kingdom. They fight like people — the rogue darts, the bandit trades, the
  // corsair swings a cutlass and takes his time about it.
  rogue:     { hp: 96,  damage: 28, speed: 104, chase: 260, hold: 34, strike: 64, hitRange: 56, windup: .38, cool: .95, embers: 28, scale: .98, radius: 12, lunge: 260 },
  bandit:    { hp: 150, damage: 38, speed: 72,  chase: 250, hold: 44, strike: 62, hitRange: 70, windup: .62, cool: 1.35, embers: 40, scale: 1.1,  radius: 15 },
  corsair:   { hp: 210, damage: 50, speed: 66,  chase: 270, hold: 48, strike: 70, hitRange: 86, windup: .8,  cool: 1.6, embers: 58, scale: 1.24, radius: 17 },
};

/** The grove's three Fallen: named, big, and each dies once. The cave opens when all are down. */
export const ECHO_FALLEN = ['greymane', 'sporemother', 'mycel'];

/** Skins are purely a look: same stats, same rewards, a different creature on screen. */
export const SKIN_KEYS = {
  frog: ['green', 'ochre'],
  wildling: ['moss', 'ashen', 'bog'],
  brute: ['quarry', 'ironback'],
  wolf: ['grey', 'black', 'pale', 'alpha', 'grafted'],
  sporeling: ['teal', 'violet', 'amber', 'mother'],
  rogue: ['hooded', 'knifehand'],
  bandit: ['leather', 'ironjaw'],
  corsair: ['captain', 'bosun'],
};

const SPAWNS = {
  hearthwood: [
    // The wilds around Hearthwood: one kind only, and each is practice — killed once, gone for good.
    { id: 'camp-north', x: 505, y: 335, kind: 'wildling', skin: 'moss', once: true },
    { id: 'camp-east',  x: 941, y: 365, kind: 'wildling', skin: 'moss', once: true },
    { id: 'camp-south', x: 910, y: 845, kind: 'wildling', skin: 'moss', once: true },
    // Greyhollow Quarry — the ironstone is guarded, and the guards come back, poorer each time.
    { id: 'quarry-brute-n', x: 1268, y: 496, kind: 'brute', skin: 'quarry' },
    { id: 'quarry-brute-s', x: 1376, y: 664, kind: 'brute', skin: 'ironback' },
    { id: 'quarry-raider',  x: 1330, y: 566, kind: 'wildling', skin: 'ashen' },
    { id: 'quarry-ghoul',   x: 1232, y: 718, kind: 'wildling', skin: 'bog' },
  ],
  echo: [
    // The paths: wolves in twos.
    { id: 'echo-path-w1', x: 1080, y: 800, kind: 'wolf', skin: 'grey' },
    { id: 'echo-path-w2', x: 900, y: 860, kind: 'wolf', skin: 'black' },
    { id: 'echo-path-s1', x: 1320, y: 1120, kind: 'wolf', skin: 'pale' },
    { id: 'echo-path-s2', x: 1480, y: 1330, kind: 'wolf', skin: 'grey' },
    { id: 'echo-path-e1', x: 1820, y: 760, kind: 'wolf', skin: 'black' },
    // The boneyard, far west: the pack and its alpha among the bones.
    { id: 'echo-bone-1', x: 420, y: 800, kind: 'wolf', skin: 'black' },
    { id: 'echo-bone-2', x: 480, y: 1000, kind: 'wolf', skin: 'grey' },
    { id: 'echo-bone-3', x: 260, y: 1060, kind: 'wolf', skin: 'pale' },
    { id: 'greymane', x: 300, y: 900, kind: 'wolf', skin: 'alpha', once: true,
      elite: { name: 'Greymane', title: 'Alpha of the boneyard pack', hp: 864, damage: 93, scale: 1.6, embers: 210, radius: 18, speed: 110, chase: 220, drops: 'pelt' } },
    // The village, east: mushroom-folk round their pot, and more between the huts.
    { id: 'echo-bog-1', x: 2350, y: 800, kind: 'sporeling', skin: 'teal' },
    { id: 'echo-bog-2', x: 2450, y: 796, kind: 'sporeling', skin: 'violet' },
    { id: 'echo-bog-3', x: 2440, y: 852, kind: 'sporeling', skin: 'amber' },
    { id: 'echo-bog-4', x: 2240, y: 750, kind: 'sporeling', skin: 'violet' },
    { id: 'echo-bog-5', x: 2600, y: 870, kind: 'sporeling', skin: 'teal' },
    // Every pond has frogs at the edge of it, and they come back on their own.
    { id: 'echo-frog-1', x: 2190, y: 1000, kind: 'frog', skin: 'green' },
    { id: 'echo-frog-2', x: 2370, y: 1040, kind: 'frog', skin: 'ochre' },
    { id: 'echo-frog-3', x: 2300, y: 940, kind: 'frog', skin: 'green' },
    { id: 'echo-frog-4', x: 1600, y: 1430, kind: 'frog', skin: 'ochre' },
    { id: 'echo-frog-5', x: 1720, y: 1470, kind: 'frog', skin: 'green' },
    { id: 'echo-frog-6', x: 648, y: 612, kind: 'frog', skin: 'green' },
    { id: 'echo-frog-7', x: 754, y: 640, kind: 'frog', skin: 'ochre' },
    { id: 'echo-frog-8', x: 1972, y: 1172, kind: 'frog', skin: 'ochre' },
    { id: 'echo-frog-9', x: 2070, y: 1200, kind: 'frog', skin: 'green' },
    // The hollow, south: a wolf and a sporeling keep the door to Mycel's cave.
    { id: 'echo-hollow-1', x: 1330, y: 1620, kind: 'wolf', skin: 'pale' },
    { id: 'echo-hollow-2', x: 1520, y: 1560, kind: 'sporeling', skin: 'violet' },
  ],
  // The vault. Nothing native is left alive here — what walks the causeways now
  // is whoever came to pick a drowned kingdom over, and stayed too long.
  sunken: [
    // The western sand and the dead village: bandits camped in the ruins.
    { id: 'sunken-village-1', x: 560, y: 700, kind: 'bandit', skin: 'leather' },
    { id: 'sunken-village-2', x: 420, y: 960, kind: 'rogue', skin: 'hooded' },
    { id: 'sunken-village-3', x: 690, y: 820, kind: 'bandit', skin: 'ironjaw' },
    { id: 'sunken-sand-1', x: 380, y: 1180, kind: 'rogue', skin: 'knifehand' },
    { id: 'sunken-sand-2', x: 700, y: 1020, kind: 'bandit', skin: 'leather' },
    // The southern arm, between the gate and the throne.
    { id: 'sunken-south-1', x: 1500, y: 2180, kind: 'rogue', skin: 'hooded' },
    { id: 'sunken-south-2', x: 1440, y: 1960, kind: 'bandit', skin: 'leather' },
    { id: 'sunken-south-3', x: 1500, y: 1760, kind: 'corsair', skin: 'bosun' },
    // The northern arm, below the burned stair.
    { id: 'sunken-north-1', x: 1500, y: 860, kind: 'rogue', skin: 'knifehand' },
    { id: 'sunken-north-2', x: 1520, y: 620, kind: 'bandit', skin: 'ironjaw' },
    // The eastern arm, out under the falls — the captain's stretch.
    { id: 'sunken-east-1', x: 2140, y: 1080, kind: 'rogue', skin: 'hooded' },
    { id: 'sunken-east-2', x: 2350, y: 1330, kind: 'corsair', skin: 'captain' },
    { id: 'sunken-east-3', x: 2366, y: 1660, kind: 'bandit', skin: 'ironjaw' },
    // The shoals, standing out in the shallows.
    { id: 'sunken-shoal-1', x: 940, y: 1660, kind: 'rogue', skin: 'knifehand' },
    { id: 'sunken-shoal-2', x: 2020, y: 1560, kind: 'bandit', skin: 'leather' },
    { id: 'sunken-shoal-3', x: 1500, y: 640, kind: 'corsair', skin: 'bosun' },
  ],
};


/** Each repeat kill of the same creature pays this much of the last one, down to a floor. */
const REPEAT_RATE = .7, REPEAT_FLOOR = .25;

/** Embers a creature is worth right now, given how often it has already died. */
export function emberReward(e) {
  const base = enemyStats(e).embers, kills = progress.kills[e.id] || 0;
  return Math.max(Math.round(base * REPEAT_FLOOR), Math.round(base * REPEAT_RATE ** kills));
}

/** Live actors. Held on one object so modules can share mutable references. */
export const entities = { enemies: [], boss: null, wave: [], herald: null, hazards: [], shots: [] };

/** Practice creatures the wanderer has already put down never come back. */
const slain = s => s.once && progress.slain.includes(s.id);

/** Populates the live world with the creatures of a region (the current one by default). */
export function spawnEnemies(region = game.region || 'hearthwood') {
  game.caveOpen = ECHO_FALLEN.every(id => progress.slain.includes(id));
  // With the thorn cut out, nothing in the grove has a reason to come at him any
  // more. The wolves and the mushroom-folk stay where they are; they just stop.
  if (region === 'echo' && progress.bosses.vaelira) { entities.enemies = []; return; }
  entities.enemies = (SPAWNS[region] || []).filter(s => !slain(s)).map((s, i) => {
    const k = { ...ENEMY_KINDS[s.kind], ...(s.elite || {}) };
    return {
      ...s, homeX: s.x, homeY: s.y,
      hp: k.hp, max: k.hp,
      cool: i, state: 'idle', timer: 0, hit: false,
    };
  });
}

/** The Fallen the wanderer is closest to and near enough to be fighting, if any. */
export function engagedElite(x, y, reach = 330) {
  let best = null, bestD = reach;
  for (const e of entities.enemies) {
    if (!e.elite || e.hp <= 0) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bestD || (e.hp < e.max && d < reach * 1.6 && !best)) { best = e; bestD = d; }
  }
  return best;
}

/** Are all of a list of once-only creatures dead? */
export const allSlain = ids => ids.every(id => progress.slain.includes(id));

/** Records a kill: practice creatures stay dead, everything else pays less next time. */
export function markSlain(e) {
  if (e.once) { if (!progress.slain.includes(e.id)) progress.slain.push(e.id); return; }
  progress.kills[e.id] = (progress.kills[e.id] || 0) + 1;
}

/** A creature's numbers: its kind, with any elite overrides on top. */
export const enemyStats = e => (e.elite ? { ...ENEMY_KINDS[e.kind], ...e.elite } : ENEMY_KINDS[e.kind]);

/**
 * The bodies a boss fight is made of. Most bosses are one thing; a tandem boss
 * carries the list of everything currently standing on the boss itself.
 */
export const bossBodies = () => {
  const b = entities.boss;
  return b ? (b.bodies || [b]) : [];
};

/** Whether a swing landing on this is a swing landing on the boss. */
export const isBossBody = t => bossBodies().includes(t);

/** Everything a player swing is allowed to damage in the current scene. */
export function livingTargets() {
  return game.scene === 'boss'
    ? bossBodies().filter(t => t.hp > 0 && !t.untargetable)
    : entities.enemies.filter(e => e.hp > 0 && !e.hidden);
}

spawnEnemies();
