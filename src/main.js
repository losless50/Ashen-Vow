import { game, player, camera, progress, loadProgress, save, maxHp, characterLevel } from './core/state.js';
import { loadSettings, settings } from './core/settings.js';
import { setSound, unlockAudio } from './systems/audio.js';
import { on } from './core/events.js';
import { frame, update } from './core/loop.js';
import { bindInput } from './core/input.js';
import { markDocument, lockLandscape, keepAwake, onBackButton, isApp, enterFullscreen } from './core/platform.js';
import { entities, spawnEnemies } from './systems/entities.js';
import { attackPose } from './systems/combat.js';
import { bloodStains, goreFragments } from './systems/effects.js';
import { trees, veins, showDaylight } from './world/world.js';
import { summonHerald } from './systems/herald.js';
import { heraldDialogue, caveStone, groveDawn } from './ui/story.js';
import { mapOpen, closeMap, openMap } from './ui/travel.js';
import { crossTo, respawn } from './systems/player.js';
import { enterRoom } from './systems/rooms.js';
import { enterBoss } from './systems/boss.js';
import { nextStage } from './systems/vaelira.js';
import { resize } from './render/renderer.js';
import { facingDirection } from './render/actors.js';
import { showDialog, closeDialog } from './ui/dialogs.js';
import { deathScreen, controls, pause, displaySettings } from './ui/menus.js';
import { renderTitle, startNewJourney, applyChromeIcons, applySoundIcon, goToScreen } from './ui/screens.js';
import { syncHud, notify, paintPortrait } from './ui/hud.js';
import { $ } from './ui/dom.js';

loadProgress();
respawn({ silent: true });
loadSettings();
markDocument();
applyChromeIcons();
setSound(settings.sound);
applySoundIcon(settings.sound);

const titleHandlers = {
  controls,
  display: () => displaySettings(refreshTitleFromPanel),
  confirmNew: () => showDialog({
    tag: 'START ANEW',
    title: 'Leave this journey behind?',
    body: 'This clears your materials, attributes, blades, buildings and quest progress on this device. There is no undo.',
    actions: [
      { label: 'Keep my journey', run: closeDialog },
      { label: 'Begin again', run: () => { startNewJourney(); refreshTitle(); } },
    ],
  }),
};

const refreshTitle = () => renderTitle(titleHandlers);
const refreshTitleFromPanel = () => { closeDialog(); refreshTitle(); };

on('death', deathScreen);

// The first time the Warden falls, something comes down through the roof.
on('bossDefeated', kind => setTimeout(() => {
  if (game.dead || game.scene !== 'boss') return;
  if (kind === 'warden' && !progress.blessed) summonHerald();
  if (kind === 'vaelira') caveStone();
}, 800));
// Climbing back out of the den is when the grove gets its light back.
on('leftBoss', kind => {
  if (kind !== 'vaelira' || !progress.bosses.vaelira) return;
  if (progress.opened.includes('grove-dawn')) return;
  progress.opened.push('grove-dawn');
  save();
  // The creatures already loose in the grove were spawned while she still held
  // it; nothing respawns them on the way out, so they have to be let go here.
  spawnEnemies(game.region);
  showDaylight(true);
  setTimeout(groveDawn, 500);
});
on('heraldArrived', heraldDialogue);

bindInput();
refreshTitle();

// Android's back button: leave a panel, else pause, else fall back to the title.
onBackButton(() => {
  if (mapOpen()) { closeMap(); return; }
  if (game.modal) { closeDialog(); return; }
  if (game.screen === 'play') pause();
});

// A first touch or click is the gesture native shells need before locking
// orientation, going fullscreen and keeping the screen awake.
async function claimDisplay() {
  unlockAudio();
  await lockLandscape();
  keepAwake(true);
  if (!isApp()) return;
  enterFullscreen();
}
addEventListener('pointerdown', claimDisplay, { once: true });
addEventListener('keydown', claimDisplay, { once: true });

paintPortrait();

resize();
syncHud();
save();
requestAnimationFrame(frame);

on('enteredPlay', () => setTimeout(() => {
  if (game.scripted) return;
  notify(progress.quest === 0 ? 'Welcome to Hearthwood · speak to Rowan at the forge.' : 'Welcome back to Hearthwood.');
}, 700));

// Dev shortcuts from the dev server: `?map` opens the world map; `?grove` drops into Echo Grove
// (`?grove=cave` at the cave mouth, with the three Fallen already down).
const devFlags = new URLSearchParams(location.search);
if (devFlags.has('map')) goToScreen('play', { instant: true }).then(openMap);
if (devFlags.has('grove')) goToScreen('play', { instant: true }).then(() => {
  if (devFlags.has('lamp') && !progress.owned.includes('lantern')) progress.owned.push('lantern');
  if (devFlags.get('grove') === 'cave') { for (const id of ['greymane', 'sporemother', 'mycel']) if (!progress.slain.includes(id)) progress.slain.push(id); }
  crossTo('echo', { cave: { x: 2450, y: 1900 }, bog: { x: 2300, y: 880 }, village: { x: 2300, y: 880 }, hollow: { x: 1400, y: 1600 }, boneyard: { x: 560, y: 910 }, junction: { x: 1400, y: 680 } }[devFlags.get('grove')] || { x: 1400, y: 120 });
  if (devFlags.get('grove') === 'sporehouse' || devFlags.get('grove') === 'burrow') enterRoom(devFlags.get('grove'));
  // `&rage` drops whatever Fallen is here to half health, to see its second stage at once.
  if (devFlags.has('rage')) { const e = entities.enemies.find(x => x.elite); if (e) e.hp = Math.floor(e.max * .5); }
  // `&orrin=N` sets how far his thread has come: 1 asked, 2 family out, 3 reunited.
  if (devFlags.has('orrin')) progress.orrin = Math.max(0, Math.min(3, Number(devFlags.get('orrin')) || 0));
  // `&dawn` plays the canopy beat and the grove's cards without fighting her first.
  if (devFlags.has('dawn')) {
    // Everything the aftermath assumes has already happened.
    for (const id of ['greymane', 'sporemother', 'mycel']) if (!progress.slain.includes(id)) progress.slain.push(id);
    progress.bosses.vaelira = true;
    progress.orrin = 3;
    if (!progress.owned.includes('lantern')) progress.owned.push('lantern');
    if (progress.quest < 6) progress.quest = 6;
    if (!progress.opened.includes('grove-dawn')) progress.opened.push('grove-dawn');
    spawnEnemies('echo');
    showDaylight(true);
    setTimeout(groveDawn, 400);
  }
  // `&den` opens the roots and drops straight into Vaelira's fight; `&den=2` or `=3` at that round.
  if (devFlags.has('den')) { enterBoss('vaelira'); const r = Number(devFlags.get('den')) || 1; for (let i = 1; i < r; i++) nextStage(entities.boss); if (r > 1) { entities.boss.state = 'stalk'; entities.boss.hp = entities.boss.max; entities.boss.timer = .5; } }
});

// Read-only diagnostics for automated smoke checks and balancing.
window.__ashen = {
  snapshot: () => ({
    screen: game.screen, scene: game.scene, paused: game.paused, modal: game.modal, dead: game.dead,
    player: { ...player },
    progress: structuredClone(progress),
    level: characterLevel(), maxHp: maxHp(),
    boss: entities.boss ? { ...entities.boss } : null,
    near: game.near?.type,
    enemies: entities.enemies.map(e => ({ ...e })),
    world: {
      standingTrees: trees.filter(t => !t.regrow).length,
      intactVeins: veins.filter(v => !v.regrow).length,
    },
    animation: {
      direction: facingDirection(player.attack > 0 ? player.attackFace : player.face),
      pose: player.attack > 0 ? attackPose() : null,
    },
    effects: { stains: bloodStains.length, fragments: goreFragments.length, damageFlash: game.damageFlash },
    camera: { ...camera },
  }),
  update,
  goToScreen,
  refreshTitle,
};
