import { STATS, STAT_KEYS, STAT_CAP, blankStats, emberCost } from './stats.js';
import { WEAPONS, BUILDINGS, BUILDING_KEYS, HERALD_WARES, ARMOR, RELICS, TOOLS, BLADE_MAX } from './gear.js';

export const W = 1500, H = 1100;
export { SAVE } from './saves.js';
import { slotKey, activeSlot } from './saves.js';

const blankBuildings = () => Object.fromEntries(BUILDING_KEYS.map(k => [k, false]));

/** Bumped whenever the quest table changes shape; `sanitize` migrates older saves. */
export const SAVE_VERSION = 2;
export const QUEST_STEPS = 7;

export const defaults = {
  version: SAVE_VERSION,
  wood: 0, ore: 0, embers: 0,
  blade: 0, weapon: 0, quest: 0,
  won: false, blessed: false,
  /** The relic worn (a key from RELICS) or null. */
  relic: null,
  /** The armor worn: a key from ARMOR. */
  armor: 'rags',
  /** Every item key ever acquired: weapons, armor, relics. */
  owned: ['traveler', 'rags'],
  /** Reinforcement levels of blades not currently in hand. */
  reinforce: {},
  stats: blankStats(),
  buildings: blankBuildings(),
  /** Counts of each Herald ware held, by key. */
  wares: {},
  /** Campfires found, by region key. The hearth can carry Aldren to any of them. */
  fires: ['hearthwood'],
  /** The region whose fire he last rested at — where he wakes. */
  region: 'hearthwood',
  /** Last named campfire used within each region. */
  restSites: {},
  /** Main bosses put down, by kind (the Warden is `won`). */
  bosses: {},
  /** Where the embers fell when he last died, and how many. Walk back to them. */
  lost: null,
  /** Chests already emptied. Each one gives up what it holds exactly once. */
  opened: [],
  /** Ids of the one-time practice creatures around camp that are already dead. */
  slain: [],
  /**
   * How far Orrin's thread has come: 0 unmet, 1 he has asked for help,
   * 2 his family is out of the dark, 3 they have their fire and he is with them.
   */
  orrin: 0,
  /** How many times each respawning creature has been killed; repeat kills pay fewer embers. */
  kills: {},
};

/** Persistent journey. Mutated in place so every module shares one reference. */
export const progress = structuredClone(defaults);

/**
 * What the grove's apothecary brewed, good until the next fire. Kept out of the
 * journey on purpose — a boon is meant to be spent, not banked.
 */
export const boons = { might: 0, wind: 0, heart: 0 };
export const clearBoons = () => { boons.might = 0; boons.wind = 0; boons.heart = 0; };

/** Volatile per-session runtime flags. Never saved. */
export const game = {
  screen: 'title',
  cinematic: null,
  scene: 'wild',
  paused: false,
  modal: false,
  dead: false,
  time: 0,
  shake: 0,
  damageFlash: 0,
  toastTimer: 0,
  near: null,
  storageOk: true,
  /** A running cutscene owns the wanderer: `{ x, y, done }` walks him somewhere, `{ hold: true }` freezes him. */
  scripted: null,
  /** 0..1 — how far the Herald's light has flooded the sanctuary. */
  glow: 0,
  /** Which banishment card is up, and when it appeared (in game.time). */
  introSlide: { index: 0, since: 0 },
  /** The region the live world currently holds. */
  region: 'hearthwood',
  /** The room the wanderer is in, when scene is 'room'. */
  room: null,
};

export const player = {
  x: 685, y: 650,
  hp: 100, st: 100, flasks: 3,
  face: Math.PI / 2,
  roll: 0, rx: 0, ry: 0,
  inv: 0, cool: 0, regen: 0,
  attack: 0, special: false, attackFace: 0, attackDuration: .36, strikePending: false, swingSounded: false, queuedHeavy: 0, parryLock: 0,
  poison: 0, poisonTick: 0, venomDamage: 0,
  walkPhase: 0, moving: false, lastStride: 0,
};

export const camera = { x: 0, y: 0, w: 960, h: 580 };

/** The floor of every boss arena and Fallen room. */
export const ARENA = { minX: 480, maxX: 1020, minY: 270, maxY: 850 };

/** The one condition under which the wanderer accepts a command. */
export const playing = () => game.screen === 'play' && !game.modal && !game.paused && !game.dead && !game.scripted;

/** The dropped embers, if they lie in the very place the wanderer is standing. */
export const lostHere = () => {
  const l = progress.lost;
  return l && l.region === game.region && l.scene === game.scene && (l.scene !== 'room' || l.room === game.room) ? l : null;
};

export const keys = new Set();
export const stick = { x: 0, y: 0 };

// --- derived character values -------------------------------------------------
const stat = key => progress.stats[key] || 0;
export const built = key => !!progress.buildings[key];
/** How many of a Herald ware the wanderer holds. */
export const ware = key => progress.wares[key] || 0;
export const weapon = () => WEAPONS[progress.weapon] || WEAPONS[0];

export const maxHp        = () => 100 + (progress.relic === 'charm' ? 20 : 0) + stat('vitality') * 12 + boons.heart;
const worn = key => ARMOR.find(a => a.key === progress.armor)?.[key] || 0;
/** Damage shaved off every blow by what he wears. */
export const armorDefense = () => worn('defense');
export const maxStamina   = () => 100 + stat('endurance') * 7 + worn('stamina') + boons.wind;
export const staminaRegen = () => 29 + stat('endurance') * 1.5 + worn('staminaRegen');
export const moveSpeed    = () => 133 * (1 + stat('agility') * .02);
export const rollInvuln   = () => .3 + stat('agility') * .012;
/** How fast a dodge carries him. The roll runs a fixed .33s, so this is its length. */
export const rollSpeed    = () => 340 + worn('roll');
/** The relic on him, when it is one that does something by itself. */
export const relicSpec    = () => RELICS.find(r => r.key === progress.relic) || null;
export const flaskHeal    = () => 55 + stat('resolve') * 5 + (built('well') ? 12 : 0);
export const maxFlasks    = () => 3 + (built('shelter') ? 1 : 0) + Math.floor(stat('resolve') / 3) + ware('flask');
/** Stamina a heavy strike costs after the Herald's blessing. */
export const heavyDiscount = () => (ware('light') ? 8 : 0);
export const attackDamage = strong =>
  (strong ? 43 : 23) + weapon().damage + progress.blade * 8 + stat('strength') * 4 + (built('whetstone') ? 4 : 0) + boons.might;
/** Reach grows with the weapon, for both the attack arc and its hitbox. */
export const attackRange = strong => (strong ? 104 : 77) + weapon().reach;
/** Ember brazier discounts every attribute purchase. */
export const kindleCost = level => Math.round(emberCost(level) * (built('brazier') ? .88 : 1));
export const statTotal    = () => STAT_KEYS.reduce((n, k) => n + stat(k), 0);
export const characterLevel = () => 1 + statTotal();

// --- persistence --------------------------------------------------------------
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return;
  for (const k of ['wood', 'ore', 'embers', 'blade', 'weapon', 'quest'])
    if (Number.isFinite(raw[k]) && raw[k] >= 0) progress[k] = Math.min(raw[k], 99999);
  progress.blade = Math.min(progress.blade, BLADE_MAX);
  progress.weapon = Math.min(progress.weapon, WEAPONS.length - 1);
  progress.won = !!raw.won;
  progress.blessed = !!raw.blessed;
  // Relic: older saves stored a boolean for the charm.
  progress.relic = raw.relic === true ? 'charm' : RELICS.some(r => r.key === raw.relic) ? raw.relic : null;
  const known = new Set([...WEAPONS.map(w => w.key), ...ARMOR.map(a => a.key), ...RELICS.map(r => r.key), ...TOOLS.map(t => t.key)]);
  progress.owned = Array.isArray(raw.owned) ? raw.owned.filter(k => known.has(k)) : [];
  progress.reinforce = {};
  if (raw.reinforce && typeof raw.reinforce === 'object')
    for (const w of WEAPONS) if (Number.isFinite(raw.reinforce[w.key])) progress.reinforce[w.key] = Math.max(0, Math.min(BLADE_MAX, Math.floor(raw.reinforce[w.key])));
  if (!(raw.version >= 2)) {
    // Before the Herald: 0 Mira, 1 gather, 2 sanctuary, 3 Warden, 4 charm claimed.
    progress.quest = [0, 2, 3, 4, 6][Math.min(progress.quest, 4)];
    progress.blessed = progress.won;
  }
  progress.quest = Math.min(progress.quest, QUEST_STEPS - 1);
  // Whatever is in hand or worn is owned, and older saves imply Rowan's mail once past the forge.
  progress.armor = ARMOR.some(a => a.key === raw.armor) ? raw.armor : progress.quest >= 1 ? 'mail' : 'rags';
  for (const key of ['traveler', 'rags', WEAPONS[progress.weapon]?.key, progress.armor, progress.relic, progress.quest >= 1 ? 'mail' : null])
    if (key && !progress.owned.includes(key)) progress.owned.push(key);
  progress.version = SAVE_VERSION;
  progress.buildings = blankBuildings();
  if (raw.buildings && typeof raw.buildings === 'object')
    for (const k of BUILDING_KEYS) progress.buildings[k] = !!raw.buildings[k];
  // Saves from before named buildings only knew one: the supply shelter.
  if (raw.camp) progress.buildings.shelter = true;
  progress.fires = Array.isArray(raw.fires) ? raw.fires.filter(k => typeof k === 'string') : [];
  progress.region = typeof raw.region === 'string' && raw.region ? raw.region : 'hearthwood';
  progress.restSites = {};
  if (raw.restSites && typeof raw.restSites === 'object')
    for (const key of ['hearthwood', 'echo', 'sunken'])
      if (typeof raw.restSites[key] === 'string' && /^[a-z0-9-]{1,64}$/.test(raw.restSites[key])) progress.restSites[key] = raw.restSites[key];
  progress.bosses = {};
  // Hushmaw was replaced by Vaelira; a save that felled it has felled her.
  if (raw.bosses && typeof raw.bosses === 'object') for (const [k, v] of Object.entries(raw.bosses)) if (v === true) progress.bosses[k === 'hushmaw' ? 'vaelira' : k] = true;
  const l = raw.lost;
  progress.lost = l && typeof l === 'object' && Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.embers) && l.embers > 0
    ? { region: String(l.region || 'hearthwood'), scene: l.scene === 'boss' || l.scene === 'room' ? l.scene : 'wild', room: l.room || null, x: l.x, y: l.y, embers: Math.min(Math.floor(l.embers), 99999) }
    : null;
  if (!progress.fires.includes('hearthwood')) progress.fires.unshift('hearthwood');
  progress.slain = Array.isArray(raw.slain) ? raw.slain.filter(id => typeof id === 'string').slice(0, 32) : [];
  progress.orrin = Number.isFinite(raw.orrin) ? Math.max(0, Math.min(3, Math.floor(raw.orrin))) : 0;
  progress.opened = Array.isArray(raw.opened) ? raw.opened.filter(id => typeof id === 'string').slice(0, 64) : [];
  progress.kills = {};
  if (raw.kills && typeof raw.kills === 'object')
    for (const [id, n] of Object.entries(raw.kills))
      if (typeof id === 'string' && Number.isFinite(n) && n > 0) progress.kills[id] = Math.min(Math.floor(n), 999);
  progress.wares = {};
  if (raw.wares && typeof raw.wares === 'object')
    for (const w of HERALD_WARES)
      if (Number.isFinite(raw.wares[w.key]) && raw.wares[w.key] > 0)
        progress.wares[w.key] = Math.min(Math.floor(raw.wares[w.key]), w.max);
  progress.stats = blankStats();
  if (raw.stats && typeof raw.stats === 'object')
    for (const k of STAT_KEYS)
      if (Number.isFinite(raw.stats[k]) && raw.stats[k] >= 0)
        progress.stats[k] = Math.min(Math.floor(raw.stats[k]), STAT_CAP);
}

export function loadProgress() {
  try { sanitize(JSON.parse(localStorage.getItem(slotKey(activeSlot())))); } catch { /* fresh journey */ }
}

export function save() {
  try {
    localStorage.setItem(slotKey(activeSlot()), JSON.stringify(progress));
    game.storageOk = true;
  } catch {
    game.storageOk = false;
  }
  return game.storageOk;
}

export function resetProgress() {
  Object.assign(progress, structuredClone(defaults));
}

export { STATS, STAT_KEYS, STAT_CAP, WEAPONS, BUILDINGS, HERALD_WARES, BLADE_MAX };
