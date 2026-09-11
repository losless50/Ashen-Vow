// Souls-style attributes bought with embers. Every derived value in state.js
// reads from here, so a stat is defined in exactly one place.
export const STATS = [
  { key: 'vitality',  name: 'Vitality',  blurb: '+12 maximum vitality',                     detail: 'How much the wilds can take from you before the flame gutters.' },
  { key: 'endurance', name: 'Endurance', blurb: '+7 stamina, +1.5 stamina recovery',        detail: 'More swings, more rolls, less waiting between them.' },
  { key: 'strength',  name: 'Strength',  blurb: '+4 damage on every strike',                detail: 'Weight behind the blade. Fells trees and wardens alike.' },
  { key: 'agility',   name: 'Agility',   blurb: '+2% movement, +0.012s dodge window',       detail: 'Ground covered quickly, and a longer breath inside a roll.' },
  { key: 'resolve',   name: 'Resolve',   blurb: '+5 flask healing, +1 flask every 3 levels', detail: 'The hearth answers those who keep returning to it.' },
];

export const STAT_KEYS = STATS.map(s => s.key);
export const STAT_CAP = 20;

// Escalating cost: 45 embers for the first point, ~x1.16 each level after.
export const emberCost = level => Math.round(45 * Math.pow(1.16, level));

export const blankStats = () => Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
