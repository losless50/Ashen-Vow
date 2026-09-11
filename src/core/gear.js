// Craftable gear and camp buildings. Costs escalate steeply so that the quarry
// and the treeline stay worth farming well past the first blade.

/**
 * Order here is part of the save format: `progress.weapon` is an index into
 * this array, so a new blade is appended rather than slotted in by power.
 */
export const WEAPONS = [
  {
    key: 'traveler', name: 'Traveler’s Blade',
    damage: 0, reach: 0, length: 31, heavyLength: 47,
    flavor: 'Weathered, but willing.',
    palette: { edge: '#8bafc1', shine: '#f5f6de', fuller: '#415e76', grip: '#4c3225', guard: '#e4b873' },
    line: '“It has carried you this far. That counts for something.”',
  },
  {
    key: 'ironsong', name: 'Ironsong Longsword',
    damage: 10, reach: 9, length: 39, heavyLength: 56,
    flavor: 'Long, cold, and it hums when it lands.',
    cost: { wood: 18, ore: 12, embers: 120 },
    palette: { edge: '#a9c6d6', shine: '#ffffff', fuller: '#2d5c7d', grip: '#3a2a3c', guard: '#cfd8de' },
    line: '“Longer in the reach. You will feel the difference the first time you swing it.”',
  },
  {
    key: 'warden', name: 'Warden’s Edge',
    damage: 24, reach: 16, length: 47, heavyLength: 66,
    flavor: 'What the sanctuary gave up.',
    // Never forged: a rare drop when the Warden falls. Rowan can still reinforce it.
    drop: { from: 'warden', chance: .15 },
    palette: { edge: '#d8cdae', shine: '#fff5cf', fuller: '#8a6a3f', grip: '#2c2030', guard: '#f0c877' },
    line: '“That came off the Warden. I have never seen its like, and I will not pretend I could make one.”',
  },
  {
    key: 'fang', name: 'Mycelian Fang',
    damage: 16, reach: 12, length: 42, heavyLength: 60,
    flavor: 'Bone the grove grew through. The wound it leaves keeps growing.',
    // Never forged: taken off Mycel. Rowan can still reinforce it, and the rot
    // in the blade answers to the same hammer — every level deepens the tick.
    drop: { from: 'mycel' },
    venom: { time: 4, damage: 4, perLevel: 2 },
    palette: { edge: '#b8c8a4', shine: '#e9f4d6', fuller: '#4a6340', grip: '#3b2f22', guard: '#8fceb5' },
    line: '“That is not steel. Whatever the grove put in it is still alive, and it will not come out.”',
  },
];

/**
 * What Aldren wears. `defense` comes straight off every blow; `stamina` and
 * `staminaRegen` are added to his pools while it is on his back.
 */
export const ARMOR = [
  { key: 'rags', name: 'Road rags', defense: 0, flavor: 'What the banishment left him.' },
  { key: 'mail', name: 'Mended mail', defense: 2, flavor: 'Rowan’s chain and plate, fitted at the forge.' },
  {
    key: 'pelt', name: 'Greymane’s Pelt', defense: 3, stamina: 15, staminaRegen: 3, roll: 96,
    flavor: 'The alpha’s hide over Rowan’s mail. It still smells of the boneyard.',
    blurb: 'You cover the ground the way the pack did',
  },
];

/** Relics: one worn at a time. */
export const RELICS = [
  { key: 'charm', name: 'Hearth charm', blurb: '+20 maximum vitality', flavor: 'Pressed into your palm by Mira.' },
  {
    key: 'spore', name: 'The Sporemother’s Heart',
    blurb: 'Mends you slowly, but only back to three quarters',
    flavor: 'Still warm, and still opening and closing. The bog grew it to keep something alive; it is not particular about what.',
    // Mends REGEN_SHARE of the bar every REGEN_EVERY seconds, and stops at
    // REGEN_CAP — it will carry you between fights, never through one.
    regen: { share: .05, every: 5, cap: .75 },
  },
];

/** Things carried, not worn: bought once, always working. */
export const TOOLS = [
  { key: 'lantern', name: 'Pocket lantern', blurb: 'Lights a few steps ahead in the dark', flavor: 'A brass box no bigger than a fist, with a wick that never seems to shorten.', cost: { embers: 300 } },
];

/** Anything ownable, by key: weapons, what he wears, relics and tools alike. */
export const itemByKey = key =>
  [...WEAPONS, ...ARMOR, ...RELICS, ...TOOLS].find(i => i.key === key) || null;

/** How far Rowan can take a blade. Each level is +8 damage. */
export const BLADE_MAX = 5;

/** Weapons Rowan can actually make: the starting blade and anything with a price. */
export const FORGEABLE = WEAPONS.filter((w, i) => i === 0 || w.cost);

export const BUILDINGS = [
  {
    key: 'shelter', name: 'Supply shelter',
    blurb: '+1 sunlit flask whenever you rest',
    body: 'Somewhere dry to keep what you carry back.',
    cost: { wood: 8, ore: 2 },
  },
  {
    key: 'well', name: 'Stone well',
    blurb: 'Flasks restore +12 vitality',
    body: 'Clean water, drawn deep. The flasks go further with it.',
    cost: { wood: 16, ore: 9 },
  },
  {
    key: 'whetstone', name: 'Whetstone rack',
    blurb: '+4 damage on every strike',
    body: 'A wheel and a bucket. Rowan will keep your edge true.',
    cost: { wood: 30, ore: 20, embers: 60 },
  },
  {
    key: 'brazier', name: 'Ember brazier',
    blurb: 'Attributes cost 12% fewer embers',
    body: 'A second fire that never goes out, and gives a little back.',
    cost: { wood: 34, ore: 22, embers: 150 },
  },
];

export const BUILDING_KEYS = BUILDINGS.map(b => b.key);

/**
 * The Herald's wares, bought with embers in the sanctuary once the Warden has
 * fallen. `max` caps how many can be held or bought; `scaling` raises the price
 * of each repeat purchase. Anything new the road needs goes on this list.
 */
export const HERALD_WARES = [
  {
    key: 'vial', name: 'Vial of dawn',
    blurb: 'Drunk when the flasks run dry · +45 vitality',
    body: 'Light, bottled. It keeps until you need it.',
    cost: { embers: 35 }, max: 5, heal: 45,
  },
  {
    key: 'flask', name: 'Deeper flask',
    blurb: '+1 sunlit flask, permanently',
    body: 'The hearth pours a little more each time you rest.',
    cost: { embers: 180 }, max: 2, scaling: 1.6,
  },
  {
    key: 'light', name: 'Blessing of light',
    blurb: 'Heavy strikes cost 8 less stamina',
    body: 'The weight of the blade, carried by something else.',
    cost: { embers: 220 }, max: 1,
  },
];

/** The ember price of the next copy of a ware, given how many are already held. */
export const wareCost = (ware, owned = 0) => Math.round(ware.cost.embers * (ware.scaling || 1) ** owned);

/** Formats a cost object as the label players read on the build and forge buttons. */
export const costLabel = cost => [
  cost.wood ? `${cost.wood} timber` : null,
  cost.ore ? `${cost.ore} iron` : null,
  cost.embers ? `${cost.embers} embers` : null,
].filter(Boolean).join(' + ');

export const canAfford = (progress, cost = {}) =>
  (progress.wood >= (cost.wood || 0)) &&
  (progress.ore >= (cost.ore || 0)) &&
  (progress.embers >= (cost.embers || 0));

export function payCost(progress, cost = {}) {
  progress.wood -= cost.wood || 0;
  progress.ore -= cost.ore || 0;
  progress.embers -= cost.embers || 0;
}
