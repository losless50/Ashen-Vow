// What the wanderer owns and wears. Weapons keep their own reinforcement level
// so swapping blades never throws Rowan's work away.
import { progress, save } from '../core/state.js';
import { WEAPONS, ARMOR, RELICS } from '../core/gear.js';

export const owns = key => progress.owned.includes(key);

export function own(key) {
  if (!owns(key)) progress.owned.push(key);
}

/** Puts a weapon in hand, parking the current blade's reinforcement for later. */
export function equipWeapon(key) {
  const index = WEAPONS.findIndex(w => w.key === key);
  if (index < 0 || !owns(key)) return false;
  const current = WEAPONS[progress.weapon]?.key;
  if (current === key) return true;
  if (current) progress.reinforce[current] = progress.blade;
  progress.weapon = index;
  progress.blade = progress.reinforce[key] || 0;
  save();
  return true;
}

export function equipArmor(key) {
  if (!ARMOR.some(a => a.key === key) || !owns(key)) return false;
  progress.armor = key;
  save();
  return true;
}

/** Relics are worn or set aside; there is only one slot. */
export function wearRelic(key) {
  if (!RELICS.some(r => r.key === key) || !owns(key)) return false;
  progress.relic = key;
  save();
  return true;
}

export function removeRelic() {
  progress.relic = null;
  save();
}

/** Everything owned of one kind, in catalogue order. */
export const ownedOf = list => list.filter(item => owns(item.key));
