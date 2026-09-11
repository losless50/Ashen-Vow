/**
 * Journeys: several separate saves on one device, only one of them live at a
 * time. Everything that reads or writes a save goes through the key this hands
 * out, so the rest of the game never has to know which journey it is in.
 *
 * The first journey deliberately keeps the original key. A device that has been
 * played before therefore already has a journey one, with nothing to migrate.
 */
import { WEAPONS } from './gear.js';
import { STAT_KEYS } from './stats.js';

export const SAVE = 'ashen-vow-journey-v1';
export const SLOT_COUNT = 3;
const PICK = 'ashen-vow-journey-slot';

const clamp = i => Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor(i) || 0));

export const slotKey = i => (clamp(i) === 0 ? SAVE : `${SAVE}-${clamp(i) + 1}`);

/** Which journey is being played. Falls back to the first whenever it cannot tell. */
export function activeSlot() {
  try { return clamp(Number(localStorage.getItem(PICK))); } catch { return 0; }
}

export function setActiveSlot(i) {
  try { localStorage.setItem(PICK, String(clamp(i))); } catch { /* session only */ }
}

/** The raw stored text of a journey, or null where there is no journey yet. */
export function slotRaw(i) {
  try { return localStorage.getItem(slotKey(i)); } catch { return null; }
}

/** Wipes one journey. The others, and which one is live, are left alone. */
export function clearSlot(i) {
  try { localStorage.removeItem(slotKey(i)); } catch { /* nothing to remove */ }
}

const PLACES = { hearthwood: 'Hearthwood', echo: 'Echo Grove' };

/**
 * Enough of a journey to choose between them, read without disturbing the one
 * being played. A journey that cannot be parsed is reported empty rather than
 * offered up and crashed into.
 */
export function slotSummary(i) {
  const raw = slotRaw(i);
  if (!raw) return { empty: true };
  let j;
  try { j = JSON.parse(raw); } catch { return { empty: true, broken: true }; }
  if (!j || typeof j !== 'object') return { empty: true, broken: true };
  const stats = j.stats && typeof j.stats === 'object' ? j.stats : {};
  const level = 1 + STAT_KEYS.reduce((n, k) => n + (Number(stats[k]) || 0), 0);
  const weapon = WEAPONS[j.weapon]?.name || WEAPONS[0].name;
  return {
    empty: false,
    level,
    weapon,
    blade: Number(j.blade) || 0,
    place: PLACES[j.region] || 'Hearthwood',
    embers: Number(j.embers) || 0,
    won: !!j.won,
    grove: !!(j.bosses && j.bosses.vaelira),
  };
}

/** A one-line description of a journey for the chooser. */
export function slotLine(i) {
  const s = slotSummary(i);
  if (s.empty) return s.broken ? 'Unreadable · start again here' : 'No journey yet';
  return `Level ${s.level} · ${s.weapon}${s.blade ? ` +${s.blade}` : ''} · ${s.place}`
    + (s.won ? ' · the Warden is down' : '') + (s.grove ? ' · the grove is open' : '');
}
