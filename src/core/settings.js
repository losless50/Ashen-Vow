/**
 * Player preferences. Kept apart from the journey save so that starting a new
 * journey never resets how the game looks.
 */
const KEY = 'ashen-vow-settings-v1';

export const ZOOM_STEPS = [
  { key: 'close',  label: 'Close',  factor: 1.25, blurb: 'Bigger sprites, less of the world' },
  { key: 'normal', label: 'Normal', factor: 1,    blurb: 'The intended framing' },
  { key: 'far',    label: 'Far',    factor: .8,   blurb: 'More of the world, smaller sprites' },
];

const defaults = { zoom: 'normal', sound: true };

export const settings = { ...defaults };

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && ZOOM_STEPS.some(z => z.key === raw.zoom)) settings.zoom = raw.zoom;
    if (raw && typeof raw.sound === 'boolean') settings.sound = raw.sound;
  } catch { /* defaults are fine */ }
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* session only */ }
}

export const zoomStep = () => ZOOM_STEPS.find(z => z.key === settings.zoom) ?? ZOOM_STEPS[1];

export function setZoom(key) {
  if (!ZOOM_STEPS.some(z => z.key === key)) return false;
  settings.zoom = key;
  saveSettings();
  return true;
}

export function setSoundSetting(on) {
  settings.sound = !!on;
  saveSettings();
}
