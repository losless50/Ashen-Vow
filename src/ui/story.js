// Story beats that need the screen: the banishment cards, the walk into
// Hearthwood, cinematic captions, and what the Herald says when it lands.
import { game, player, progress, save, ware, HERALD_WARES } from '../core/state.js';
import { wareCost } from '../core/gear.js';
import { element } from './dom.js';
import { shopRows } from './menus.js';
import { releaseHerald } from '../systems/herald.js';
import { showDialog, showConversation, closeDialog } from './dialogs.js';
import { notify } from './hud.js';
import { tone } from '../systems/audio.js';
import { $ } from './dom.js';

export const INTRO = [
  'The kingdom of Eldoria was prosperous under King Aldren and Queen Seraphine. Their reign was peaceful, and the people saw in them a symbol of hope.',
  'Then, without warning, the Queen changed.\n\nExecutions. Villages burned for resisting her. Strange soldiers and stranger creatures at her side — things never before seen within the kingdom.',
  'King Aldren tried to stop her.\n\nHe failed.',
  'Accused of treason and blamed for the unrest, Aldren was stripped of his crown and cast out of his own kingdom — into the wilderness, with the clothes on his back and a broken sword.',
  'With the kingdom sealed behind him, the former king has only one choice.\n\nSurvive.',
];

/** Where the southern road enters the clearing, and where it delivers him. */
export const ARRIVAL = { from: { x: 660, y: 905 }, to: { x: 698, y: 690 } };

let slide = 0, onIntroDone = null, lastAdvance = 0, cards = INTRO;

function showSlide() {
  game.introSlide = { index: slide, since: game.time, deck: cards === INTRO ? 'intro' : 'grove' };
  const text = $('introText');
  text.classList.remove('in');
  void text.offsetWidth;
  text.textContent = cards[slide];
  text.classList.add('in');
  $('introHint').textContent = slide === cards.length - 1 ? 'Continue' : 'Tap or press any key';
  $('introTag').textContent = cards === INTRO ? 'ELDORIA · BEFORE THE ASH' : 'ECHO GROVE · THE THORN CUT OUT';
}

function finishIntro() {
  const done = onIntroDone;
  onIntroDone = null;
  done?.();
}

/** Steps to the next card; the last card hands off to `onDone`. */
export function advanceIntro() {
  if (!onIntroDone) return;
  const now = performance.now?.() ?? 0;
  if (now - lastAdvance < 350) return;
  lastAdvance = now;
  slide++;
  if (slide >= cards.length) finishIntro();
  else showSlide();
}

export function playIntro(onDone) {
  playCards(INTRO, onDone);
}

/** Any deck of full-screen cards, read the same way the banishment is. */
export function playCards(deck, onDone) {
  cards = deck;
  slide = 0;
  onIntroDone = onDone;
  lastAdvance = performance.now?.() ?? 0;
  showSlide();
}

export const introRunning = () => !!onIntroDone;

let captionTimer = 0;
/** A line of narration over the world, HUD tucked away. */
export function caption(text, seconds = 4) {
  const el = $('caption');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => { el.hidden = true; }, seconds * 1000);
}

/** Aldren walks up the southern road into the firelight, then the camp is his. */
export function arriveAtCamp() {
  player.x = ARRIVAL.from.x;
  player.y = ARRIVAL.from.y;
  player.face = -Math.PI / 2;
  player.inv = 3;
  game.cinematic = null;
  $('playScreen').classList.add('cinematic');
  caption('Deep within the woods, the fallen king came upon a small fire, and the strangers who kept it.', 5);
  game.scripted = {
    ...ARRIVAL.to,
    done: () => {
      $('playScreen').classList.remove('cinematic');
      clearTimeout(captionTimer);
      $('caption').hidden = true;
      notify('Hearthwood Camp · speak to Rowan at the forge.');
    },
  };
}

// --- the Herald ----------------------------------------------------------------
function acceptVow() {
  progress.blessed = true;
  if (progress.quest < 5) progress.quest = 5;
  save();
  closeDialog();
  releaseHerald();
  notify('A vow renewed · return to Mira at Hearthwood');
  tone(880, .5, 'sine');
}

function heraldPressesOn() {
  showConversation('herald', 'What remains of her would ask it of you.',
    '“The Seraphine you loved would rather die by your blade than live as the thing she is becoming. Every day you wait, more of the kingdom burns in her name.”\n\n“Grow strong, fallen king. Then go east, and end this.”',
    [{ label: 'I will find her', run: acceptVow }]);
}

/** Opens once the Herald has settled over the altar. */
export function heraldDialogue() {
  showConversation('herald', 'Aldren of Eldoria.',
    '“You have not been forgotten, fallen king. I have watched you since the gates closed behind you.”\n\n“Eldoria burns. Seraphine has given herself to something old and cruel, and every village she puts to the sword feeds it. The woman you knew is gone. What sits your throne must be ended — by your hand, and no other.”\n\n“Reclaim your crown. Cut her down. Only then will the kingdom breathe again.”',
    [
      { label: 'I will find her', run: acceptVow },
      { label: '…She is my wife.', run: heraldPressesOn },
    ]);
}

function buyWare(w) {
  const cost = wareCost(w, ware(w.key));
  if (ware(w.key) >= w.max || progress.embers < cost) return;
  progress.embers -= cost;
  progress.wares[w.key] = ware(w.key) + 1;
  save();
  notify(`${w.name} · ${w.blurb}`);
  tone(760, .3, 'sine');
  heraldShop();
}

function wareStatus(w) {
  const n = ware(w.key);
  if (n >= w.max) return w.max === 1 ? 'Granted' : `${n} / ${w.max} · full`;
  return `${wareCost(w, n)} embers${n ? ` · ${n} held` : ''}`;
}

/** Every visit after the vow: the Herald trades embers for what the road needs. */
export function heraldShop() {
  if (!progress.blessed) { heraldDialogue(); return; }
  showDialog({
    speaker: 'herald',
    tag: 'A voice from above',
    title: 'What the light can spare.',
    body: '“Embers, fallen king. The road east will ask more of you than the Warden did.”',
    build: host => {
      host.append(element('div', 'ember-banner', `✦ ${progress.embers} embers held`));
      shopRows(host, HERALD_WARES.map(w => ({
        name: w.name,
        blurb: `${w.body}  ·  ${w.blurb}`,
        action: wareStatus(w),
        disabled: ware(w.key) >= w.max || progress.embers < wareCost(w, ware(w.key)),
        run: () => buyWare(w),
      })));
    },
    actions: [{ label: 'Back to the altar', run: closeDialog }],
  });
}

/**
 * The grove's dawn. The canopy beat runs over the world itself, and when the
 * light is all the way in the cards take over for the aftermath.
 */
export async function groveDawn() {
  const { playCanopy, GROVE_CARDS } = await import('../world/grove.js');
  const { goToScreen } = await import('./screens.js');
  $('playScreen').classList.add('cinematic');
  playCanopy(async () => {
    $('playScreen').classList.remove('cinematic');
    await goToScreen('intro');
    playCards(GROVE_CARDS, async () => {
      await goToScreen('play');
      notify('The grove is quiet · Orrin is at the fire, and the road runs south');
    });
  });
}

/** After Hushmaw: the first fragment of the truth, and no more than that. */
export function caveStone() {
  showDialog({
    tag: 'THE DEN UNDER THE CLIFF',
    title: 'A stone older than the grove.',
    body: 'Behind where the beast lay, a slab has been cut into the rock, and the moss will not grow on it. A circle split by a line. Beneath it, in a script you last saw in the palace vaults, one word you can read:\n\nHADES.\n\nLower down, scratched by a newer, shakier hand: “the sickness came up from below the night the queen changed.”',
    actions: [{ label: 'Remember it', run: () => { closeDialog(); notify('The name lodges like a splinter. Climb back out.'); } }],
  });
}

// The banishment cards advance on any tap or key, and never from a panel button.
$('introScreen').addEventListener('click', advanceIntro);
$('introSkip').addEventListener('click', e => { e.stopPropagation(); if (onIntroDone) finishIntro(); });
window.addEventListener('keydown', e => { if (game.screen === 'intro' && e.key !== 'Escape') advanceIntro(); });
