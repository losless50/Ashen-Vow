import { game, progress, player, maxHp, maxStamina, characterLevel, weapon, QUEST_STEPS } from '../core/state.js';
import { entities, engagedElite } from '../systems/entities.js';
import { bossSpec } from '../systems/boss.js';
import { groveDawned } from '../world/grove.js';
import { parryHint } from '../systems/combat.js';
import { roomSpec } from '../systems/rooms.js';
import { $ } from './dom.js';
import { drawWanderer, ragged } from '../render/actors.js';

const QUEST_TITLES = ['The fallen king', 'A spark of belonging', 'Gather a little hope', 'Beyond the treeline', 'The hollow heart', 'A voice from above', 'The road to Eldoria'];

export function notify(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  game.toastTimer = 3.2;
}

export function updateToast(dt) {
  if (game.toastTimer <= 0) return;
  game.toastTimer -= dt;
  if (game.toastTimer <= 0) $('toast').classList.remove('show');
}

function questText() {
  return [
    'Speak to Rowan at the forge. He has your gear.',
    'Speak to Mira beside the campfire.',
    `Gather timber ${Math.min(progress.wood, 6)}/6 and ironstone ${Math.min(progress.ore, 3)}/3. Visit Rowan to upgrade.`,
    'Follow the path north. Enter the old sanctuary.',
    progress.won ? 'Return to Mira at Hearthwood Camp.' : 'Defeat the Hollow Warden in the sanctuary.',
    'Return to Mira at Hearthwood Camp.',
    'Rest, arm yourself, and grow strong. The road east to Eldoria opens soon.',
  ][progress.quest];
}

export function syncHud() {
  if (game.screen !== 'play') return;
  if (portraitRagged !== ragged()) paintPortrait();
  const wild = game.scene === 'wild';
  // The Warden's arena reads better with the location card stepped back.
  $('locationCard')?.classList?.toggle('dim', !wild);
  $('worldLabel').hidden = !wild;
  $('healthBar').style.width = player.hp / maxHp() * 100 + '%';
  $('healthBar').classList.toggle('poisoned', player.poison > 0);
  $('staminaBar').style.width = player.st / maxStamina() * 100 + '%';
  $('healthText').textContent = `${Math.ceil(player.hp)} / ${maxHp()}`;
  for (const k of ['wood', 'ore', 'embers']) $(k).textContent = progress[k];
  $('flasks').textContent = player.flasks;
  $('level').textContent = 'LV. ' + characterLevel();
  $('weaponName').textContent = weapon().name.toUpperCase();
  $('weaponLevel').textContent = progress.blade
    ? `Reinforced +${progress.blade} · made to endure.`
    : weapon().flavor;

  $('questTitle').textContent = QUEST_TITLES[progress.quest];
  $('questText').textContent = questText();
  $('questCount').textContent = `0${progress.quest + 1} / 0${QUEST_STEPS}`;
  const echo = game.region === 'echo';
  const place = wild
    ? (echo ? ['ECHO GROVE', groveDawned() ? 'The canopy is open · the sun gets all the way down' : 'Where no sun reaches'] : ['THE WAKING WILDS', 'Hearthwood Camp · A place to begin'])
    : game.scene === 'room' ? [roomSpec().name, roomSpec().sub]
    : bossSpec().arena === 'cave' ? ['THE DEN BENEATH THE ROOTS', progress.bosses.vaelira ? 'Quiet now · the stone still speaks' : 'Where the grove keeps its warden']
    : ['THE OLD SANCTUARY', progress.won ? 'Beneath the roots · The Herald waits' : 'Beneath the roots · A vow unbroken'];
  $('locationName').textContent = place[0];
  $('locationSub').textContent = place[1];
  const wl = $('worldLabel');
  if (wl.firstChild) wl.firstChild.textContent = echo ? 'ECHO GROVE' : 'HEARTHWOOD CAMP';
  wl.querySelector('span').textContent = echo ? 'Follow the mushrooms. Mind the dark.' : 'A small fire. A fresh beginning.';

  const boss = entities.boss;
  const room = game.scene === 'room';
  const elite = wild || room ? engagedElite(player.x, player.y, room ? 2000 : 330) : null;
  $('bossHud').hidden = wild || room ? !elite : !boss || boss.hp <= 0;
  if (!wild && !room && boss) {
    const spec = bossSpec();
    $('bossName').textContent = spec.name;
    $('bossBar').style.width = boss.hp / boss.max * 100 + '%';
    $('bossTell').textContent = spec.tells[boss.state] || (boss.phase === 2 ? spec.tells.phase2 : spec.tells.idle);
  } else if (elite) {
    // The Fallen get the same bar as a main boss while they are close.
    $('bossName').textContent = elite.elite.name.toUpperCase();
    $('bossBar').style.width = elite.hp / elite.max * 100 + '%';
    $('bossTell').textContent =
      elite.state === 'windup' ? (elite.kind === 'wolf' ? 'It crouches — roll aside from the leap' : 'The cap flares — back out of the cloud') :
      elite.state === 'lunge' ? (elite.chain > 1 ? `It leaps — ${elite.chain - 1} more to come` : 'It leaps') :
      elite.state === 'howl' ? 'It howls — three leaps follow, roll through them' :
      elite.state === 'rechain' ? 'It turns for the next leap' :
      elite.state === 'rain' ? 'Spores fall — step out of the rings' :
      elite.state === 'dig' ? 'It has gone under — move from where you stand' :
      elite.state === 'exposed' ? 'Parried — it is exposed, strike now' :
      elite.state === 'rend' ? 'Both claws — get out of the ring' :
      elite.monster ? 'The spores are the attack — do not stand in them' :
      elite.risen ? 'Its claws are venomous — do not trade blows' :
      elite.elite.title;
  }
}

let portraitRagged = null;
/** Repaints the vitals portrait; called whenever the wanderer's look changes. */
export function paintPortrait() {
  const c = $('portraitCanvas').getContext('2d');
  c.clearRect(0, 0, 64, 64);
  c.imageSmoothingEnabled = false;
  drawWanderer(c, 32, 78);
  portraitRagged = ragged();
}

export function syncInteractPrompt() {
  const playing = game.screen === 'play', hint = playing && parryHint();
  // While a blow is coming, E means parry: the button says so and the prompt steps aside.
  $('parry').hidden = !hint;
  $('interact').hidden = !game.near || !!hint || !playing;
  if (game.near) $('interact').querySelector('span').textContent = game.near.name;
}
