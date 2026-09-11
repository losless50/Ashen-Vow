import { game, progress, player, characterLevel, weapon, BUILDINGS, built, resetProgress, save } from '../core/state.js';
import { respawn } from '../systems/player.js';
import { clearAllEffects } from '../systems/effects.js';
import { restoreHarvestables } from '../world/world.js';
import { closeDialog } from './dialogs.js';
import { playIntro, arriveAtCamp } from './story.js';
import { emit } from '../core/events.js';
import { icon, applyIcon } from './icons.js';
import { $, element } from './dom.js';
import { canQuit, quit, isApp, enterFullscreen, exitFullscreen, isFullscreen } from '../core/platform.js';
import { playMusic, playAmbience, worldTrack, worldAmbience } from '../systems/audio.js';

/** Where the camera rests while the title screen is up. */
const TITLE_VIEW = { x: 700, y: 600 };

export const currentScreen = () => (game.screen ||= 'title');

function paint(name) {
  game.screen = name;
  $('titleScreen').hidden = name !== 'title';
  $('introScreen').hidden = name !== 'intro';
  $('playScreen').hidden = name !== 'play';
  $('playScreen').classList.remove('cinematic');
  game.cinematic = name === 'play' ? null : TITLE_VIEW;
  game.paused = name !== 'play';
  // Iron and Ash carries the title and the banishment; Stone and Silence takes over in the wilds.
  playMusic(name === 'play' ? worldTrack(game.region) : 'intro', name === 'play' ? 4 : 2.5);
  playAmbience(name === 'play' && game.scene === 'wild' ? worldAmbience(game.region) : null, 3);
  if (name === 'play') $('game').focus();
}

/** Cross-fades between screens through the full-screen fader. */
export async function goToScreen(name, { instant = false } = {}) {
  if (game.screen === name) return;
  const fader = $('fader');
  if (!instant) {
    fader.classList.add('on');
    await new Promise(r => setTimeout(r, 330));
  }
  closeDialog();
  if (name === 'play' && (game.dead || player.hp <= 0)) respawn();
  paint(name);
  fader.classList.remove('on');
  if (name === 'play') emit('enteredPlay');
}

function saveSummary() {
  const started = progress.quest > 0 || progress.wood || progress.ore || progress.embers
    || progress.blade || progress.weapon || progress.armor !== 'rags' || BUILDINGS.some(b => built(b.key));
  if (!started) return null;
  const standing = BUILDINGS.filter(b => built(b.key)).length;
  return `Level ${characterLevel()}  ·  ${weapon().name}${progress.blade ? ` +${progress.blade}` : ''}`
    + (standing ? `  ·  ${standing} built at Hearthwood` : '');
}

function menuButton(label, iconName, onClick, primary = false) {
  const b = element('button', 'slab' + (primary ? ' primary' : ''));
  b.append(icon(iconName, 18), element('span', null, label));
  b.onclick = onClick;
  return b;
}

/** Rebuilds the title menu; call again whenever the save state changes. */
export function renderTitle(handlers) {
  const menu = $('titleMenu');
  menu.replaceChildren();
  const summary = saveSummary();

  if (summary) {
    menu.append(menuButton('Continue', 'chevron', () => goToScreen('play'), true));
    menu.append(menuButton('New journey', 'ember', () => handlers.confirmNew()));
  } else {
    menu.append(menuButton('Begin', 'chevron', startNewJourney, true));
  }
  menu.append(menuButton('Controls', 'help', handlers.controls));
  menu.append(menuButton('Display', 'character', handlers.display));
  if (!isApp()) {
    menu.append(menuButton(isFullscreen() ? 'Leave fullscreen' : 'Fullscreen', 'character', async () => {
      isFullscreen() ? await exitFullscreen() : await enterFullscreen();
      renderTitle(handlers);
    }));
  }
  if (canQuit()) menu.append(menuButton('Quit', 'close', () => quit()));

  $('titleSave').textContent = summary || 'No journey yet';
  menu.querySelector('button')?.focus();
}

/** Wipes the save, tells the banishment, then walks Aldren into a fresh world. */
export async function startNewJourney() {
  resetProgress();
  clearAllEffects();
  progress.region = 'hearthwood';
  respawn();
  restoreHarvestables();
  save();
  player.inv = 1;
  await goToScreen('intro');
  playIntro(async () => {
    await goToScreen('play');
    arriveAtCamp();
  });
}

export function applyChromeIcons() {
  applyIcon($('pause'), 'pause');
  applyIcon($('help'), 'help');
  applyIcon($('character'), 'character');
  applyIcon($('conversationClose'), 'close');
  applyIcon($('heal'), 'flask');
  applyIcon($('parry'), 'parry');
  applyIcon($('interact'), 'hand');
  applyIcon($('woodStat'), 'timber', '--stat-icon');
  applyIcon($('oreStat'), 'ore', '--stat-icon');
  applyIcon($('emberStat'), 'ember', '--stat-icon');
}

export function applySoundIcon(on) {
  applyIcon($('sound'), on ? 'sound' : 'mute');
  $('sound').setAttribute('aria-pressed', String(on));
}
