import { W, H, game, player, progress } from '../core/state.js';
import { rand } from '../core/rng.js';
import { paintTerrain } from './terrain.js';
import { VEIN_SPOTS, inQuarry } from './quarry.js';
import { buildEcho } from './echo.js';
import { onHearthwoodRoad } from './hearthwood.js';
import { debris } from '../systems/effects.js';
import { groveDawned } from './grove.js';
import { paintEchoLit } from './echo.js';

export const TREE = { hp: 40, regrow: 45, radius: 15 };
export const VEIN = { hp: 55, regrow: 30, radius: 12 };

/**
 * The live world: whichever region the wanderer stands in. These arrays are
 * swapped in place by enterRegion so every module keeps its reference.
 */
export const trees = [];
export const veins = [];
export const npcs = [];
export const SOLIDS = [];
/** Region-specific scenery the painters read: mushrooms, fireflies, pools, lairs. */
/**
 * What a region has none of. `props` is one shared object, so every region has
 * to be reset to these before its own are laid over the top — otherwise a key
 * the new region simply does not mention keeps whatever the last one put there,
 * and the grove's rain follows you home to Hearthwood.
 */
const NO_PROPS = { mushrooms: [], fireflies: 0, pools: [], lairs: [], cave: null, cookfire: null, sporehouse: null, burrow: null, huts: [], wayposts: [], camps: [], gibbets: [], rack: null, critters: [], rain: 0, ruins: [], stones: [] };
export const props = { ...NO_PROPS };
export let terrain = null;
/** The region's map as painted. `terrain` may be showing a variant of it. */
let painted = null;
const lit = new Map();

/**
 * The region's map with the sun on it. Repainted from its own palette rather
 * than filtered, so the grove's floor becomes Hearthwood's grass instead of a
 * lightened version of its own. Expensive, so it is made once and kept.
 */
function litMap(key) {
  if (lit.has(key)) return lit.get(key);
  const made = key === 'echo' ? paintEchoLit() : null;
  lit.set(key, made);
  return made;
}

/** Shows the region's map lit or unlit. Only what is drawn changes. */
export function showDaylight(on) {
  terrain = (on && litMap(game.region)) || painted;
}
let groundContext = null;
let inWater = () => false;
export let bounds = { minX: 50, maxX: 1450, minY: 120, maxY: 1040 };
/** The region's pixel size; the camera and the painters stop at its edge. */
export let size = { w: W, h: H };
export let exits = [];
export let fire = { x: 714, y: 584 };

// --- Hearthwood: built at load, consuming the shared RNG in the order below ------
function buildHearthwood() {
  const hwTrees = [];
  for (let i = 0; i < 145; i++) {
    const x = 25 + rand() * 1450, y = 50 + rand() * 1000;
    if ((x > 380 && x < 970 && y > 320 && y < 830) || (x > 590 && x < 1030 && y < 350) || (x > 1000 && x < 1250)) continue;
    if (inQuarry(x, y) || onHearthwoodRoad(x, y)) continue;
    hwTrees.push({ id: hwTrees.length, x, y, s: .8 + rand() * .65, t: rand(), hp: TREE.hp, max: TREE.hp, regrow: 0, regrowTime: TREE.regrow });
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // willReadFrequently: the painter samples the canvas thousands of times.
  paintTerrain(canvas.getContext('2d', { willReadFrequently: true }), rand);
  return {
    key: 'hearthwood',
    terrain: canvas,
    trees: hwTrees,
    veins: VEIN_SPOTS.map((p, i) => ({ id: i, ...p, hp: VEIN.hp, max: VEIN.hp, regrow: 0, regrowTime: VEIN.regrow })),
    npcs: [
      { x: 639, y: 580, name: 'Mira', role: 'The wayfarer', type: 'mira' },
      { x: 437, y: 570, name: 'Rowan', role: 'The smith', type: 'smith' },
      { x: 820, y: 520, name: 'Camp workbench', type: 'bench' },
      { x: 714, y: 584, name: 'Rest at the hearth', type: 'fire' },
      { x: 800, y: 206, name: 'Enter the sanctuary', type: 'gate' },
      { x: 1212, y: 642, name: 'Greyhollow Quarry', type: 'quarrySign' },
    ],
    /** Camp structures, as top-down elliptical footprints at their base; `needs` gates one on a building standing. */
    solids: [
      { x: 594, y: 512, rx: 50, ry: 20, name: 'wanderer tent' },
      { x: 841, y: 455, rx: 50, ry: 20, name: 'second tent' },
      { x: 437, y: 498, rx: 56, ry: 25, name: 'smithy' },
      { x: 419, y: 529, rx: 20, ry: 12, name: 'forge hearth' },
      { x: 463, y: 541, rx: 14, ry: 9,  name: 'anvil' },
      { x: 821, y: 523, rx: 24, ry: 15, name: 'workbench' },
      { x: 714, y: 588, rx: 21, ry: 12, name: 'campfire' },
      { x: 917, y: 567, rx: 50, ry: 20, name: 'supply shelter', needs: 'shelter' },
      { x: 879, y: 586, rx: 14, ry: 11, name: 'supply crate',   needs: 'shelter' },
      { x: 612, y: 706, rx: 26, ry: 16, name: 'stone well',     needs: 'well' },
      { x: 500, y: 616, rx: 22, ry: 13, name: 'whetstone rack', needs: 'whetstone' },
      { x: 792, y: 646, rx: 16, ry: 11, name: 'ember brazier',  needs: 'brazier' },
    ],
    props: { mushrooms: [], fireflies: 0, pools: [], lairs: [], cave: null, cookfire: null, sporehouse: null, burrow: null, huts: [], wayposts: [], camps: [], gibbets: [], rack: null, critters: [], rain: 0, ruins: [], stones: [] },
    /** The river cuts the map in two; only the bridge deck crosses it. */
    inWater: (x, y) => x > 1040 && x < 1180 && !(y > 585 && y < 675),
    bounds: { minX: 50, maxX: 1450, minY: 120, maxY: 1040 },
    fire: { x: 714, y: 584 },
    /** Walking off the south road leads into Echo Grove. */
    exits: [{ x0: 590, x1: 760, y0: 1030, y1: 1100, to: 'echo', at: { x: 1400, y: 64 } }],
  };
}

const REGION_DATA = { hearthwood: buildHearthwood() };
const regionData = key => (REGION_DATA[key] ??= key === 'echo' ? buildEcho(TREE) : REGION_DATA.hearthwood);

/** Swaps the live world to a region. Trees keep their regrowth state per region. */
export function enterRegion(key) {
  const d = regionData(key);
  game.region = d.key;
  for (const [live, next] of [[trees, d.trees], [veins, d.veins], [npcs, d.npcs], [SOLIDS, d.solids]]) { live.length = 0; live.push(...next); }
  Object.assign(props, NO_PROPS, d.props);
  painted = d.terrain;
  terrain = d.terrain;
  // Ground type is read off the map as it was painted, never off whatever copy
  // is currently being shown, so grass stays grass under any weather.
  groundContext = painted.getContext('2d', { willReadFrequently: true });
  inWater = d.inWater;
  bounds = d.bounds;
  size = d.size || { w: W, h: H };
  exits = d.exits;
  fire = d.fire;
  showDaylight(key === 'echo' && groveDawned());
}

/** The exit the wanderer is standing in, if any. */
export const exitAt = (x, y) => exits.find(e => x >= e.x0 && x <= e.x1 && y >= e.y0 && y <= e.y1) || null;

/** Water the wanderer cannot walk on in the current region. */
export const inRiver = (x, y) => inWater(x, y);

enterRegion('hearthwood');

// --- ground -------------------------------------------------------------------
/**
 * 'grass' where the painted ground is green, 'dirt' on the paths, the clearing,
 * the quarry and anything else. Sampled per footstep, so a lookup is cheap enough.
 */
export function groundAt(x, y) {
  const p = groundContext.getImageData(Math.max(0, Math.min(size.w - 1, Math.floor(x))), Math.max(0, Math.min(size.h - 1, Math.floor(y))), 1, 1).data;
  return p[1] > p[0] + 4 ? 'grass' : 'dirt';
}

// --- collision ----------------------------------------------------------------
export function blocked(x, y, radius = TREE.radius) {
  if (inWater(x, y)) return true;
  for (const s of SOLIDS) {
    if (s.needs && !progress.buildings[s.needs]) continue;
    if (((x - s.x) / (s.rx + radius)) ** 2 + ((y - s.y) / (s.ry + radius)) ** 2 < 1) return true;
  }
  for (const t of trees) {
    if (t.regrow > 0) continue;
    if (Math.hypot(x - t.x, y - t.y) < (t.bush ? Math.min(radius, 11) : radius)) return true;
  }
  for (const v of veins) {
    if (v.regrow > 0) continue;
    if (Math.hypot(x - v.x, y - v.y) < Math.min(radius, VEIN.radius)) return true;
  }
  return false;
}

/**
 * Keeps an entity out of geometry, sliding along whatever it walked into rather
 * than stopping dead. Returns true if the move was obstructed at all.
 */
export function slide(entity, ox, oy, radius) {
  if (!blocked(entity.x, entity.y, radius)) return false;
  const nx = entity.x, ny = entity.y;
  entity.y = oy;                                   // try horizontal only
  if (!blocked(entity.x, entity.y, radius)) return true;
  entity.x = ox;
  entity.y = ny;                                   // try vertical only
  if (!blocked(entity.x, entity.y, radius)) return true;
  entity.x = ox;
  entity.y = oy;
  return true;
}

// --- harvesting ---------------------------------------------------------------
const harvestables = () => [
  ...trees.map(t => ({ ref: t, kind: 'tree' })),
  ...veins.map(v => ({ ref: v, kind: 'vein' })),
];

/**
 * Finds the standing tree or intact vein inside an attack's committed arc.
 * Enemies always win the target contest — this is only consulted on a whiff.
 */
export function findHarvestTarget(x, y, facing, range, cone) {
  let best = null, bestDist = Infinity;
  for (const { ref, kind } of harvestables()) {
    if (ref.regrow > 0 || ref.bush) continue;
    const reach = range + (kind === 'tree' ? 14 : 8);
    const dist = Math.hypot(ref.x - x, ref.y - y);
    if (dist > reach || dist >= bestDist) continue;
    const angle = Math.atan2(ref.y - y, ref.x - x) - facing;
    if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) > cone) continue;
    best = { ref, kind };
    bestDist = dist;
  }
  return best;
}

const CHIPS = {
  tree: ['#8a6b3c', '#c7a466', '#5d472a', '#e0c383'],
  vein: ['#8ea9b8', '#c9dbe2', '#4d5f6d', '#a7cddd'],
};

/**
 * Applies a strike to a tree or vein.
 * Returns { kind, felled, amount, resource } so combat can play the feedback.
 */
export function damageHarvestable(target, damage, strong, fromX, fromY) {
  const { ref, kind } = target;
  ref.hp = Math.max(0, ref.hp - damage);
  debris(ref.x, ref.y - (kind === 'tree' ? 26 : 8), fromX, fromY, CHIPS[kind], strong ? 16 : 10);
  if (ref.hp > 0) return { kind, felled: false, amount: 0, resource: kind === 'tree' ? 'wood' : 'ore' };

  // Wiggle room on the yield: a heavy finisher splits more usable material.
  const amount = 2 + (strong ? 1 : 0) + (Math.random() < (kind === 'tree' ? .3 : .25) ? 1 : 0);
  const resource = kind === 'tree' ? 'wood' : 'ore';
  progress[resource] += amount;
  ref.regrow = ref.regrowTime;
  debris(ref.x, ref.y - (kind === 'tree' ? 34 : 10), fromX, fromY, CHIPS[kind], 18);
  return { kind, felled: true, amount, resource };
}

/**
 * The small living things: they bolt the moment he is close, run for the trees,
 * and are gone. A while later another one is out on the same patch of ground.
 */
function updateCritters(dt) {
  for (const k of props.critters) {
    if (k.back > 0) {
      k.back -= dt;
      if (k.back <= 0) {
        // Back on its patch, a little way off from where it was.
        k.x = k.homeX + (Math.random() - .5) * 120;
        k.y = k.homeY + (Math.random() - .5) * 90;
        k.alpha = 0;
        k.flee = 0;
      }
      continue;
    }
    if (k.alpha < 1) k.alpha = Math.min(1, k.alpha + dt * 1.2);
    const d = Math.hypot(player.x - k.x, player.y - k.y);
    if (k.flee > 0) {
      k.flee -= dt;
      const speed = k.kind === 'hare' ? 210 : k.kind === 'beetle' ? 120 : 90;
      k.x += k.fx * speed * dt;
      k.y += k.fy * speed * dt;
      k.alpha = Math.max(0, k.flee / .5);
      if (k.flee <= 0) { k.alpha = 0; k.back = 8 + Math.random() * 14; }
    } else if (d < 130) {
      k.flee = 1.4;
      k.fx = (k.x - player.x) / (d || 1);
      k.fy = (k.y - player.y) / (d || 1);
    }
  }
}

export function updateWorld(dt) {
  updateCritters(dt);
  for (const list of [trees, veins])
    for (const item of list)
      if (item.regrow > 0) {
        item.regrow -= dt;
        if (item.regrow <= 0) { item.regrow = 0; item.hp = item.max; }
      }
}

/** Resting at the hearth restores the wilds, quarry included. */
export function restoreHarvestables() {
  for (const list of [trees, veins])
    for (const item of list) { item.regrow = 0; item.hp = item.max; }
}

/** 0 immediately after felling, 1 once fully regrown — drives the sapling art. */
export const regrowRatio = item => item.regrow > 0 ? 1 - item.regrow / item.regrowTime : 1;
