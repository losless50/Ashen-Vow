import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom();

const state = await import('../src/core/state.js');
const { game, player, progress, keys, camera } = state;
const { update } = await import('../src/core/loop.js');
const combat = await import('../src/systems/combat.js');
const { attack, updateAttack, cancelAttack, roll, hurt, attackPose, upgradeToHeavy } = combat;
const { heal, rest, respawn, updatePlayer, footsteps, crossTo } = await import('../src/systems/player.js');
const { entities, spawnEnemies, ENEMY_KINDS, SKIN_KEYS, emberReward, livingTargets } = await import('../src/systems/entities.js');
const { enterBoss, updateBoss } = await import('../src/systems/boss.js');
const effects = await import('../src/systems/effects.js');
const { bloodStains, goreFragments, particles, bleed } = effects;
const world = await import('../src/world/world.js');
const { trees, veins, blocked, updateWorld } = world;
const { interact, findNear } = await import('../src/world/interact.js');
const { emberCost, STAT_CAP } = await import('../src/core/stats.js');
const { WEAPONS, FORGEABLE, BUILDINGS, costLabel, canAfford, payCost } = await import('../src/core/gear.js');
const { buyStat, characterSheet, statsSheet, kindleMenu } = await import('../src/ui/menus.js');
const { closeDialog } = await import('../src/ui/dialogs.js');
const { syncHud, syncInteractPrompt } = await import('../src/ui/hud.js');
const { drawWanderer, drawWandererFigure, drawAttackIndicator, facingDirection, drawWarden, drawWildling, drawHerald } = await import('../src/render/actors.js');
const heraldMod = await import('../src/systems/herald.js');
const audioMod = await import('../src/systems/audio.js');
const inventory = await import('../src/systems/inventory.js');
const { REGIONS } = await import('../src/world/regions.js');
const echoMod = await import('../src/world/echo.js');
const { HEARTHWOOD_ROADS } = await import('../src/world/hearthwood.js');
const rooms = await import('../src/systems/rooms.js');
const grove = await import('../src/world/grove.js');
const saves = await import('../src/core/saves.js');
const scenes = await import('../src/render/scenes.js');
const sunken = await import('../src/world/sunken.js');
const { boons } = await import('../src/core/state.js');
const vaelira = await import('../src/systems/vaelira.js');
const { WHIP: whip } = await import('../src/systems/vaelira-patterns.js');
const { drawWorldMap, regionAt, MAP_W, MAP_H } = await import('../src/render/worldmap.js');
const travelUi = await import('../src/ui/travel.js');
const { summonHerald, updateHerald, dismissHerald } = heraldMod;
const { leaveBoss } = await import('../src/systems/boss.js');
const { HERALD_WARES, wareCost } = await import('../src/core/gear.js');
const { showConversation, advanceDialog } = await import('../src/ui/dialogs.js');
const story = await import('../src/ui/story.js');
const introArt = await import('../src/render/intro.js');
const actors = await import('../src/render/actors.js');
const { on } = await import('../src/core/events.js');
const { npcs } = world;
const icons = await import('../src/ui/icons.js');
const platform = await import('../src/core/platform.js');
const settingsMod = await import('../src/core/settings.js');
const renderer = await import('../src/render/renderer.js');
const { draw, ctx, resize } = await import('../src/render/renderer.js');

resize();
// The suite exercises gameplay, which only runs on the play screen.
game.screen = 'play';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('PASS', name); }
  catch (err) { failures++; console.error('FAIL', name, '\n     ', process.env.STACK ? err.stack : err.message); }
}

/** Everything a conversation says, across every page. */
function choicesText() {
  let all = document.getElementById('dialogBody').textContent;
  while (advanceDialog()) all += ' ' + document.getElementById('dialogBody').textContent;
  return all;
}

/** Turns a conversation to its last page, then returns its choice buttons. */
function choices() {
  while (advanceDialog());
  return document.getElementById('dialogActions').children;
}

/** Puts the wanderer beside a target with a clean, fully charged swing available. */
function standBeside(target, offset = 30) {
  cancelAttack();
  closeDialog();
  game.scene = 'wild';
  game.dead = false;
  player.x = target.x - offset;
  player.y = target.y;
  player.face = 0;
  player.roll = 0;
  player.st = state.maxStamina();
  player.inv = 100;
}

// --- movement, stamina, dodging ----------------------------------------------
check('roll spends stamina and grants invulnerability', () => {
  roll(1, 0);
  assert.equal(player.st, 77);
  assert.equal(player.inv, state.rollInvuln());
  const hp = player.hp;
  hurt(27, 0, 0);
  assert.equal(player.hp, hp);
  const x = player.x;
  update(.034);
  assert.ok(player.x > x);
});

check('normal and special attacks deal distinct damage', () => {
  player.roll = 0; player.cool = 0; player.st = 100;
  entities.enemies[0].x = player.x + 40;
  entities.enemies[0].y = player.y;
  entities.enemies[0].hp = 200;
  attack(false);
  assert.equal(entities.enemies[0].hp, 200);
  updateAttack(.14);
  assert.equal(entities.enemies[0].hp, 177);
  player.cool = 0;
  attack(true);
  assert.equal(entities.enemies[0].hp, 177);
  updateAttack(.27);
  assert.equal(entities.enemies[0].hp, 134);
});

check('stamina blocks repeated attacks', () => {
  player.cool = 0; player.st = 1;
  const hp = entities.enemies[0].hp;
  attack(true);
  assert.equal(entities.enemies[0].hp, hp);
});

check('nothing lies on the ground to pick up — timber is trees, ironstone is the quarry', () => {
  assert.equal(world.nodes, undefined);
  game.scene = 'wild';
  player.x = 690; player.y = 780;
  update(.02);
  assert.equal(game.near, null);
});

check('camp creatures are one kind, killed once, and never come back', () => {
  const saved = structuredClone(progress);
  progress.slain = [];
  spawnEnemies();
  const camp = entities.enemies.filter(e => e.once);
  assert.equal(camp.length, 3);
  assert.ok(camp.every(e => e.kind === 'wildling' && e.skin === 'moss'), 'one look around the fire');
  assert.ok(entities.enemies.some(e => !e.once), 'the quarry still has its guards');
  const target = camp[0];
  standBeside(target);
  target.hp = 1;
  player.cool = 0;
  attack();
  updateAttack(.14);
  assert.equal(target.hp, 0);
  assert.ok(progress.slain.includes(target.id), 'the kill is remembered');
  rest();
  assert.ok(!entities.enemies.includes(target), 'the hearth does not wake it');
  assert.ok(entities.enemies.filter(e => !e.once).every(e => e.hp === e.max), 'the quarry guards do wake');
  spawnEnemies();
  assert.equal(entities.enemies.filter(e => e.once).length, 2, 'it stays dead across respawns');
  const quarryKill = entities.enemies.find(e => !e.once);
  quarryKill.hp = 0;
  rest();
  assert.equal(quarryKill.hp, quarryKill.max, 'quarry creatures always return');
  Object.assign(progress, saved);
  spawnEnemies();
});

check('creatures that come back after a rest pay fewer embers each time, down to a floor', () => {
  const saved = structuredClone(progress);
  progress.kills = {}; progress.slain = [];
  spawnEnemies();
  const guard = entities.enemies.find(e => !e.once);
  const base = ENEMY_KINDS[guard.kind].embers;
  assert.equal(emberReward(guard), base, 'first kill pays in full');
  const kill = () => { standBeside(guard); guard.hp = 1; player.cool = 0; attack(); updateAttack(.14); assert.equal(guard.hp, 0); rest(); };
  let embers = progress.embers;
  kill();
  assert.equal(progress.embers - embers, base);
  assert.equal(progress.kills[guard.id], 1);
  embers = progress.embers;
  kill();
  const second = progress.embers - embers;
  assert.ok(second < base && second > 0, 'the second kill pays less');
  for (let i = 0; i < 12; i++) kill();
  assert.equal(emberReward(guard), Math.round(base * .25), 'never below a quarter');
  const practice = entities.enemies.find(e => e.once);
  assert.equal(emberReward(practice), ENEMY_KINDS[practice.kind].embers, 'camp practice is unaffected');
  Object.assign(progress, saved);
  spawnEnemies();
});

check('footsteps land once per half stride and read the ground under them', () => {
  cancelAttack(); closeDialog();
  game.scene = 'wild'; game.dead = false; game.scripted = null;
  player.x = 700; player.y = 780; player.roll = 0;
  const before = footsteps.count, phase = player.walkPhase;
  keys.add('d');
  for (let i = 0; i < 60; i++) update(.035);
  keys.clear();
  const first = Math.floor(phase / Math.PI), last = Math.floor(player.walkPhase / Math.PI);
  assert.ok(last - first >= 6, 'walked far enough for several steps');
  let expected = 0;
  for (let s = first + 1; s <= last; s++) if (s % 3 === 0) expected++;
  assert.equal(footsteps.count - before, expected, 'one sound every third footfall');
  assert.ok(['grass', 'dirt'].includes(footsteps.ground));
  assert.equal(world.groundAt(700, 780), footsteps.ground);
  update(.035);
  assert.equal(footsteps.count - before, expected, 'standing still is silent');
});

check('the blade sounds once per swing, at the end of the windup, and never throws without Audio', () => {
  const audio = audioMod;
  assert.equal(audio.soundEnabled(), false);
  audio.toggleSound();                       // Node has no Audio; enabling must still be safe
  assert.equal(audio.soundEnabled(), true);
  audio.sample('slice1');
  audio.sample('impact');
  audio.playMusic('wilds');
  audio.unlockAudio();
  assert.equal(audio.wantedMusic(), 'wilds', 'the request is remembered even where no Audio exists');
  audio.playMusic('nowhere');
  assert.equal(audio.wantedMusic(), 'wilds', 'unknown tracks are ignored');
  standBeside(entities.enemies[0]);
  player.cool = 0;
  attack(false);
  assert.equal(player.swingSounded, false, 'silent through the windup');
  updateAttack(.03);
  assert.equal(player.swingSounded, false);
  updateAttack(.06);
  assert.equal(attackPose().phase, 'swing');
  assert.equal(player.swingSounded, true, 'the slice fires as the blade moves');
  updateAttack(.3);
  cancelAttack();
  audio.toggleSound();
  assert.equal(audio.soundEnabled(), false);
});

check('a second tap during the windup turns a light swing heavy', () => {
  standBeside(entities.enemies[0]);
  player.cool = 0;
  const st = player.st;
  attack(false);
  assert.equal(player.special, false);
  updateAttack(.05);
  assert.equal(upgradeToHeavy(), true);
  assert.equal(player.special, true);
  assert.equal(player.st, st - combat.ATTACKS.strong.cost, 'only the heavy cost is paid');
  updateAttack(.3);
  assert.equal(upgradeToHeavy(), false, 'too late once the blade has landed');
  cancelAttack();
});

check('a late second tap buffers a heavy strike that fires when the light swing recovers', () => {
  standBeside(entities.enemies[0]);
  player.cool = 0;
  attack(false);
  updateAttack(.2);                         // the light blade has already connected
  assert.equal(player.strikePending, false);
  assert.equal(combat.queueHeavy(), false, 'not now — but remembered');
  assert.ok(player.queuedHeavy > 0);
  for (let i = 0; i < 12 && !player.special; i++) update(.05);
  assert.equal(player.special, true, 'the heavy swing started on its own');
  assert.ok(player.attack > 0);
  assert.equal(player.queuedHeavy, 0);
  cancelAttack();
  // A buffered heavy that waits too long is dropped rather than surprising the player.
  attack(false);
  updateAttack(.2);
  combat.queueHeavy();
  game.time += 2;
  update(.05);
  assert.equal(player.queuedHeavy, 0);
  assert.equal(player.special, false);
  cancelAttack();
});

// --- the Hollow Warden --------------------------------------------------------
check('boss transitions through telegraph, strike, recovery and phase two', () => {
  enterBoss();
  assert.equal(audioMod.wantedMusic(), 'boss', 'the Warden has the sanctuary song');
  const b = entities.boss;
  b.timer = 0; updateBoss(.01); assert.equal(b.state, 'slashWind');
  b.timer = 0; updateBoss(.01); assert.equal(b.state, 'slash');
  b.timer = 0; updateBoss(.01); assert.equal(b.state, 'recover');
  b.hp = 200; updateBoss(.01); assert.equal(b.phase, 2);
});

check('boss death awards embers and unlocks return quest', () => {
  combat.setDropRoll(() => .99);            // the real 15% roll must not leak a blade into later checks
  const b = entities.boss;
  b.hp = 1;
  player.x = b.x; player.y = b.y + 35;
  player.cool = 0; player.st = 100; player.roll = 0;
  attack();
  updateAttack(.14);
  assert.equal(b.hp, 0);
  assert.equal(progress.won, true);
  assert.ok(progress.embers >= 150);
  assert.equal(audioMod.wantedMusic(), 'wilds', 'the song ends with the Warden');
});

// --- the Herald ---------------------------------------------------------------
check('the Herald descends, floods the chamber with light and holds the wanderer', () => {
  let arrived = 0;
  on('heraldArrived', () => arrived++);
  summonHerald();
  assert.ok(entities.herald, 'the Herald exists');
  assert.equal(state.playing(), false, 'the wanderer is held during the descent');
  assert.ok(entities.herald.y < 0, 'it starts above the roof');
  const startY = player.y;
  keys.add('d');
  for (let i = 0; i < 80; i++) update(.05);
  keys.clear();
  assert.equal(player.x, entities.boss.x, 'held input moves nothing');
  assert.equal(player.y, startY);
  assert.equal(game.glow, 1, 'the light is fully up');
  assert.ok(Math.abs(entities.herald.y - entities.herald.ty) < 1, 'it settles over the altar');
  assert.equal(arrived, 1, 'arrival announced once');
  for (let i = 0; i < 5; i++) update(.05);
  assert.equal(arrived, 1);
  drawHerald(ctx, entities.herald);
  draw();
});

check('accepting the Herald\'s charge renews the vow and frees the wanderer', () => {
  story.heraldDialogue();
  assert.equal(game.modal, true);
  const buttons = choices();
  assert.equal(buttons.length, 2);
  buttons[1].onclick();                                   // "…She is my wife."
  assert.equal(progress.blessed, false, 'pushing back does not swear the vow');
  choices()[0].onclick();
  assert.equal(progress.blessed, true);
  assert.equal(progress.quest, 5);
  assert.equal(game.modal, false);
  assert.equal(game.scripted, null);
  assert.equal(game.cinematic, null);
  assert.equal(state.playing(), true);
  dismissHerald();
  assert.equal(entities.herald, null);
  assert.equal(game.glow, 0);
});

check('the Warden never rises twice — the sanctuary is the Herald\'s shop now', () => {
  enterBoss();
  assert.equal(entities.boss.hp, 0, 'only the crown remains');
  assert.ok(entities.herald?.landed, 'the Herald is already at the altar');
  assert.equal(game.glow, 1);
  assert.equal(state.playing(), true, 'no cutscene on a return visit');
  const { HERALD_SPOT } = heraldMod;
  player.x = HERALD_SPOT.x; player.y = HERALD_SPOT.y + 30;
  update(.02);
  assert.equal(game.near?.type, 'herald');
  interact();
  assert.equal(game.modal, true);
  const rows = document.getElementById('dialogExtra').children[1].children;
  assert.equal(rows.length, HERALD_WARES.length);
  closeDialog();
  leaveBoss();
  assert.equal(entities.herald, null);
});

check('the Herald sells vials, deeper flasks and the blessing for embers', () => {
  const embers = 1000;
  progress.embers = embers;
  progress.wares = {};
  const vial = HERALD_WARES.find(w => w.key === 'vial'), flask = HERALD_WARES.find(w => w.key === 'flask'), light = HERALD_WARES.find(w => w.key === 'light');
  story.heraldShop();
  const buy = key => document.getElementById('dialogExtra').children[1].children[HERALD_WARES.findIndex(w => w.key === key)].children[1].onclick();
  buy('vial');
  assert.equal(progress.wares.vial, 1);
  assert.equal(progress.embers, embers - vial.cost.embers);
  const flasks = state.maxFlasks();
  buy('flask'); buy('flask');
  assert.equal(state.maxFlasks(), flasks + 2);
  assert.equal(progress.embers, embers - vial.cost.embers - wareCost(flask, 0) - wareCost(flask, 1));
  assert.ok(wareCost(flask, 1) > wareCost(flask, 0), 'the second flask costs more');
  const left = progress.embers;
  buy('flask');
  assert.equal(progress.embers, left, 'capped at two');
  buy('light');
  assert.equal(state.heavyDiscount(), 8);
  closeDialog();
  player.st = state.maxStamina(); player.cool = 0; player.roll = 0; game.scene = 'wild'; game.dead = false;
  attack(true);
  assert.equal(player.st, state.maxStamina() - combat.ATTACKS.strong.cost + 8);
  cancelAttack();
  // Out of flasks, F drinks a vial instead.
  player.flasks = 0; player.hp = 10;
  heal();
  assert.equal(player.hp, 10 + vial.heal);
  assert.equal(progress.wares.vial, 0);
  heal();
  assert.equal(player.hp, 10 + vial.heal, 'nothing left to drink');
  progress.wares = {};
});

check('the inventory equips blades with their own reinforcement, armor and one relic', () => {
  const saved = structuredClone(progress);
  Object.assign(progress, { weapon: 0, blade: 2, armor: 'mail', relic: null, owned: ['traveler', 'rags', 'mail', 'ironsong', 'charm'], reinforce: {} });
  assert.equal(inventory.equipWeapon('warden'), false, 'cannot hold what is not owned');
  assert.equal(inventory.equipWeapon('ironsong'), true);
  assert.equal(progress.weapon, 1);
  assert.equal(progress.blade, 0, 'a blade never reinforced starts at +0');
  assert.equal(progress.reinforce.traveler, 2, 'the old blade keeps its reinforcement');
  inventory.equipWeapon('traveler');
  assert.equal(progress.blade, 2, 'and gets it back in hand');
  const hp = state.maxHp();
  inventory.wearRelic('charm');
  assert.equal(state.maxHp(), hp + 20);
  inventory.removeRelic();
  assert.equal(state.maxHp(), hp);
  assert.equal(state.armorDefense(), 2);
  inventory.equipArmor('rags');
  assert.equal(state.armorDefense(), 0);
  assert.equal(actors.ragged(), true, 'setting the mail aside puts him back in rags');
  inventory.equipArmor('mail');
  player.hp = state.maxHp(); player.inv = 0; game.dead = false;
  hurt(27, 0, 0);
  assert.equal(player.hp, state.maxHp() - 25, 'mail shaves two off a blow');
  player.inv = 0;
  characterSheet();
  assert.equal(game.modal, true);
  statsSheet();
  closeDialog();
  Object.assign(progress, saved);
});

check('old saves with the boolean charm and no armor migrate onto the inventory', () => {
  const saved = structuredClone(progress);
  const stash = localStorage.getItem(state.SAVE);
  localStorage.setItem(state.SAVE, JSON.stringify({ version: 2, quest: 6, won: true, relic: true, weapon: 1, blade: 3 }));
  state.loadProgress();
  assert.equal(progress.relic, 'charm');
  assert.equal(progress.armor, 'mail', 'past the forge means the mail is on');
  for (const key of ['traveler', 'rags', 'mail', 'ironsong', 'charm']) assert.ok(progress.owned.includes(key), `${key} is owned`);
  assert.equal(progress.blade, 3);
  localStorage.setItem(state.SAVE, JSON.stringify({ version: 2, quest: 0 }));
  state.loadProgress();
  assert.equal(progress.armor, 'rags');
  assert.equal(progress.relic, null);
  if (stash === null) localStorage.removeItem(state.SAVE); else localStorage.setItem(state.SAVE, stash);
  Object.assign(progress, saved);
});

check('each region brings its own song, in the open and in its fights', () => {
  const saved = structuredClone(progress);
  const won = progress.won;
  world.enterRegion('hearthwood'); spawnEnemies('hearthwood');
  game.scene = 'wild'; game.dead = false; game.scripted = null; closeDialog();
  respawn();
  assert.equal(audioMod.wantedMusic(), 'wilds', 'Hearthwood keeps Stone and Silence');
  progress.slain = ['greymane', 'sporemother', 'mycel'];
  crossTo('echo', { x: 1400, y: 120 });
  assert.equal(audioMod.wantedMusic(), 'grove', 'crossing the border changes the song');
  rooms.enterRoom('burrow');
  assert.equal(audioMod.wantedMusic(), 'grove', 'an emptied room has nothing to play');
  rooms.leaveRoom();
  progress.slain = [];
  rooms.enterRoom('burrow');
  assert.equal(audioMod.wantedMusic(), 'groveBoss', 'a Fallen brings the grove\'s fight song');
  rooms.leaveRoom();
  assert.equal(audioMod.wantedMusic(), 'grove');
  progress.bosses = {};
  enterBoss('vaelira');
  assert.equal(audioMod.wantedMusic(), 'groveBoss', 'and so does Vaelira');
  leaveBoss();
  assert.equal(audioMod.wantedMusic(), 'grove');
  crossTo('hearthwood', { x: 668, y: 1020 });
  assert.equal(audioMod.wantedMusic(), 'wilds', 'and home again');
  progress.won = false;
  enterBoss('warden');
  assert.equal(audioMod.wantedMusic(), 'boss', 'the Warden keeps The Final Chant');
  leaveBoss();
  progress.won = won;
  Object.assign(progress, saved);
  world.enterRegion('hearthwood'); spawnEnemies('hearthwood');
  game.scene = 'wild'; game.dead = false;
});

check('the forest wind sits under the wilds and falls silent in the sanctuary', () => {
  const won = progress.won;
  progress.won = false;
  respawn();
  assert.equal(audioMod.wantedAmbience(), 'forest');
  enterBoss();
  assert.equal(audioMod.wantedAmbience(), null);
  leaveBoss();
  assert.equal(audioMod.wantedAmbience(), 'forest');
  progress.won = won;
});

check('the hearth opens the full-screen map once the charm is held; it pans, zooms and picks fires', () => {
  const saved = structuredClone(progress);
  game.scene = 'wild';
  progress.owned = progress.owned.filter(k => k !== 'charm'); progress.relic = null;
  game.near = npcs.find(n => n.type === 'fire');
  interact();
  let buttons = [...document.getElementById('dialogActions').children];
  assert.ok(!buttons.some(b => b.textContent.startsWith('Travel')), 'no travel before the charm');
  closeDialog();
  progress.owned.push('charm'); progress.relic = 'charm';
  interact();
  buttons = [...document.getElementById('dialogActions').children];
  const travel = buttons.find(b => b.textContent.startsWith('Travel'));
  assert.ok(travel, 'travel appears with the charm');
  travel.onclick();
  assert.equal(travelUi.mapOpen(), true);
  assert.equal(document.getElementById('mapScreen').hidden, false, 'the map is its own screen');
  assert.equal(game.modal, true, 'the world waits beneath it');
  const v0 = travelUi.mapView();
  assert.ok(v0.zoom > 0 && v0.zoom === v0.min, 'opens fitted to the screen');
  travelUi.zoomAt(2, 100, 100);
  const v1 = travelUi.mapView();
  assert.ok(v1.zoom > v0.zoom, 'zooms in');
  travelUi.zoomAt(100, 100, 100);
  assert.equal(travelUi.mapView().zoom, v0.max, 'capped');
  travelUi.zoomAt(.001, 100, 100);
  assert.equal(travelUi.mapView().zoom, v0.min, 'never smaller than the fit');
  travelUi.select('hearthwood');
  assert.ok(document.getElementById('mapStatus').textContent.includes('you are here'));
  assert.ok(document.getElementById('mapGo').disabled);
  travelUi.select('echo');
  assert.ok(document.getElementById('mapStatus').textContent.includes('not yet sat beside'));
  progress.fires.push('echo');
  travelUi.select('echo');
  assert.ok(document.getElementById('mapStatus').textContent.includes('Echo Grove'));
  assert.ok(!document.getElementById('mapGo').disabled, 'a found, built fire can be travelled to');
  travelUi.select('dreadmarsh');
  assert.ok(document.getElementById('mapStatus').textContent.includes('not yet sat beside'));
  progress.fires.push('dreadmarsh');
  travelUi.select('dreadmarsh');
  assert.ok(document.getElementById('mapStatus').textContent.includes('not yet open'), 'found but unbuilt is closed');
  assert.ok(document.getElementById('mapGo').disabled);
  drawWorldMap(ctx, { found: REGIONS.map(r => r.key), here: 'hearthwood', selected: 'echo', time: 1 });
  assert.equal(regionAt(18 + (MAP_W - 36) * .5, 18 + (MAP_H - 36) * .54)?.key, 'hearthwood');
  assert.equal(regionAt(2, 2), null);
  travelUi.closeMap();
  assert.equal(travelUi.mapOpen(), false);
  assert.equal(game.modal, false);
  assert.equal(document.getElementById('mapScreen').hidden, true);
  Object.assign(progress, saved);
});

check('conversations page through paragraphs and a tap turns the page', () => {
  showConversation('mira', 'Paged', 'One.\n\nTwo.\n\nThree.', [{ label: 'Done', run: closeDialog }]);
  const body = () => document.getElementById('dialogBody').textContent;
  const buttons = () => document.getElementById('dialogActions').children;
  assert.equal(body(), 'One.');
  assert.equal(buttons().length, 1);
  assert.notEqual(buttons()[0].textContent, 'Done');
  assert.equal(advanceDialog(), true);
  assert.equal(body(), 'Two.');
  buttons()[0].onclick();
  assert.equal(body(), 'Three.');
  assert.equal(buttons()[0].textContent, 'Done');
  assert.equal(advanceDialog(), false, 'the last page has choices, not more pages');
  buttons()[0].onclick();
  assert.equal(game.modal, false);
});

check('Mira gives the charm once the vow is sworn, and points east', () => {
  game.scene = 'wild';
  const hp = state.maxHp();
  game.near = npcs.find(n => n.type === 'mira');
  interact();
  assert.equal(progress.quest, 6);
  assert.equal(progress.relic, 'charm');
  assert.ok(progress.owned.includes('charm'));
  assert.equal(state.maxHp(), hp + 20);
  closeDialog();
});

// --- the beginning --------------------------------------------------------------
check('a fresh journey opens with Rowan, who hands over the starting gear', () => {
  const saved = structuredClone(progress);
  state.resetProgress();
  assert.equal(progress.quest, 0);
  game.scene = 'wild';
  game.near = npcs.find(n => n.type === 'mira');
  interact();
  assert.equal(progress.quest, 0, 'Mira sends him to the forge first');
  closeDialog();
  game.near = npcs.find(n => n.type === 'smith');
  interact();
  choices()[0].onclick();
  assert.equal(progress.quest, 1);
  assert.equal(progress.armor, 'mail', 'Rowan\'s mail goes on at once');
  assert.ok(progress.owned.includes('mail'));
  assert.equal(game.modal, false);
  game.near = npcs.find(n => n.type === 'mira');
  interact();
  choices()[0].onclick();
  assert.equal(progress.quest, 2, 'Mira opens the gathering quest');
  Object.assign(progress, saved);
});

check('the intro scenes and the ragged king render', () => {
  const { drawIntroScene, INTRO_SCENES } = introArt;
  assert.equal(INTRO_SCENES, story.INTRO.length, 'one scene per card');
  for (let i = 0; i < INTRO_SCENES; i++) for (const t of [0, .3, 1.5, 4]) drawIntroScene(ctx, i, t);
  const saved = progress.armor;
  progress.armor = 'rags';
  assert.equal(actors.ragged(), true);
  for (const face of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { player.face = face; drawWanderer(ctx, 100, 100); }
  player.roll = .2; drawWanderer(ctx, 100, 100); player.roll = 0;
  drawWandererFigure(ctx, 60, 104);
  progress.armor = saved;
  assert.equal(actors.ragged(), saved === 'rags');
});

check('the intro cards run in order and skip cleanly', () => {
  let finished = 0;
  story.playIntro(() => finished++);
  assert.equal(story.introRunning(), true);
  assert.equal(document.getElementById('introText').textContent, story.INTRO[0]);
  for (let i = 1; i < story.INTRO.length; i++) {
    performance.now = () => i * 1000;
    story.advanceIntro();
    assert.equal(document.getElementById('introText').textContent, story.INTRO[Math.min(i, story.INTRO.length - 1)]);
  }
  performance.now = () => 99999;
  story.advanceIntro();
  assert.equal(finished, 1);
  assert.equal(story.introRunning(), false);
  story.advanceIntro();
  assert.equal(finished, 1, 'no double finish');
});

check('Aldren walks up the southern road into camp, then control returns', () => {
  game.scene = 'wild';
  game.dead = false;
  closeDialog();
  story.arriveAtCamp();
  assert.equal(player.x, story.ARRIVAL.from.x);
  assert.equal(state.playing(), false, 'no attacks while the camera walks him in');
  keys.add('a');
  let steps = 0;
  while (game.scripted && steps++ < 400) update(.035);
  keys.clear();
  assert.ok(steps < 400, 'the walk ends');
  assert.ok(Math.hypot(player.x - story.ARRIVAL.to.x, player.y - story.ARRIVAL.to.y) < 6, 'he reaches the fire');
  assert.equal(state.playing(), true);
});

check('saves from before the Herald land on the new quest table', () => {
  const saved = structuredClone(progress);
  const stash = localStorage.getItem(state.SAVE);
  localStorage.setItem(state.SAVE, JSON.stringify({ quest: 4, won: true, relic: true, wood: 3 }));
  state.loadProgress();
  assert.equal(progress.quest, 6);
  assert.equal(progress.blessed, true);
  assert.equal(progress.version, state.SAVE_VERSION);
  localStorage.setItem(state.SAVE, JSON.stringify({ quest: 1, won: false }));
  state.loadProgress();
  assert.equal(progress.quest, 2);
  assert.equal(progress.blessed, false);
  localStorage.setItem(state.SAVE, JSON.stringify({ version: 2, quest: 5, won: true }));
  state.loadProgress();
  assert.equal(progress.quest, 5);
  if (stash === null) localStorage.removeItem(state.SAVE); else localStorage.setItem(state.SAVE, stash);
  Object.assign(progress, saved);
});

// --- survival -----------------------------------------------------------------
check('healing consumes a flask and respects max health', () => {
  player.hp = 35; player.flasks = 3;
  heal();
  assert.equal(player.hp, 90);
  assert.equal(player.flasks, 2);
});

check('death and respawn retain upgrades and materials', () => {
  progress.blade = 2; progress.wood = 17;
  player.inv = 0;
  hurt(500, 0, 0);
  assert.equal(game.dead, true);
  respawn();
  assert.equal(game.scene, 'wild');
  assert.equal(player.hp, state.maxHp());
  assert.equal(progress.blade, 2);
  assert.equal(progress.wood, 17);
});

check('camp shelter grants fourth flask on rest', () => {
  progress.buildings.shelter = true;
  rest();
  assert.equal(player.flasks, 4);
});

check('river blocks movement outside bridge', () => {
  player.x = 1038; player.y = 700;
  keys.add('d'); update(.035); keys.clear();
  assert.equal(player.x, 1038);
  player.y = 625;
  keys.add('d'); update(.035); keys.clear();
  assert.ok(player.x > 1038);
});

// --- effects ------------------------------------------------------------------
check('damage creates blood only outside invulnerability', () => {
  bloodStains.length = 0;
  player.inv = 0;
  player.hp = state.maxHp();
  hurt(28, player.x - 30, player.y);
  assert.ok(bloodStains.length > 0);
  assert.ok(goreFragments.length > 0);
  assert.ok(game.damageFlash > 0);
  const count = bloodStains.length;
  hurt(28, 0, 0);
  assert.equal(bloodStains.length, count);
});

check('missed attacks in empty air do not create blood', () => {
  player.cool = 0; player.roll = 0; player.st = 100;
  entities.enemies.forEach(e => (e.hp = 0));
  player.x = 700; player.y = 1000; player.face = Math.PI / 2;
  const count = bloodStains.length;
  attack(true);
  updateAttack(.27);
  assert.equal(bloodStains.length, count);
});

check('blood effects are bounded and resting clears them', () => {
  for (let i = 0; i < 50; i++) bleed(600, 600, 580, 600, true);
  assert.ok(bloodStains.length <= 320);
  assert.ok(goreFragments.length <= 60);
  assert.ok(particles.length <= 450);
  rest();
  assert.equal(bloodStains.length, 0);
  assert.equal(goreFragments.length, 0);
});

check('both scenes render with lighting and blood', () => {
  draw();
  enterBoss();
  bleed(700, 700, 680, 700, true);
  draw();
});

// --- animation ----------------------------------------------------------------
check('facing follows movement in four directions', () => {
  progress.blade = 0;
  respawn();
  player.inv = 100;
  for (const [key, dir] of [['w', 'back'], ['s', 'front'], ['a', 'left'], ['d', 'right']]) {
    keys.add(key); update(.03); keys.clear();
    assert.equal(facingDirection(player.face), dir);
    assert.ok(player.moving);
  }
});

check('walk cycle advances only while actually moving', () => {
  keys.clear();
  update(.03);
  const phase = player.walkPhase;
  update(.1);
  assert.equal(player.walkPhase, phase);
  assert.equal(player.moving, false);
  keys.add('d'); update(.1); keys.clear();
  assert.ok(player.walkPhase > phase);
});

check('sword hits on contact frame exactly once', () => {
  cancelAttack();
  player.st = 100;
  assert.equal(state.attackDamage(false), 23, `light damage is 23 (weapon ${progress.weapon}, blade ${progress.blade}, str ${progress.stats.strength}, whetstone ${progress.buildings.whetstone})`);
  assert.equal(player.queuedHeavy, 0, 'no heavy is buffered');
  assert.equal(player.special, false, 'not mid-heavy');
  assert.equal(game.scene, 'wild', 'in the wild');
  entities.enemies.forEach(e => (e.hp = 0));
  const target = entities.enemies[0];
  target.hp = 200;
  target.x = player.x + 40;
  target.y = player.y;
  attack();
  updateAttack(.10); assert.equal(target.hp, 200);
  updateAttack(.04); assert.equal(target.hp, 177);
  updateAttack(.06); assert.equal(target.hp, 177);
  updateAttack(.3);  assert.equal(target.hp, 177);
});

check('heavy sword has a longer windup and a locked facing', () => {
  cancelAttack();
  player.st = 100;
  const target = entities.enemies[0];
  target.hp = 200;
  target.x = player.x + 40;
  target.y = player.y;
  attack(true);
  assert.equal(attackPose().phase, 'windup');
  const face = player.attackFace;
  player.face = Math.PI;
  updateAttack(.2);
  assert.equal(target.hp, 200);
  assert.equal(player.attackFace, face);
  updateAttack(.07);
  assert.equal(target.hp, 157);
  assert.ok(Math.abs(attackPose().angle - face) < .001);
});

check('a target can leave reach during a windup', () => {
  cancelAttack();
  player.st = 100;
  const target = entities.enemies[0];
  target.hp = 200;
  target.x = player.x + 40;
  target.y = player.y;
  attack(true);
  target.x = player.x + 200;
  updateAttack(.3);
  assert.equal(target.hp, 200);
});

check('turning away does not redirect a committed swing', () => {
  cancelAttack();
  player.st = 100;
  const target = entities.enemies[0];
  target.hp = 200;
  target.x = player.x + 40;
  target.y = player.y;
  attack();
  target.x = player.x - 40;
  updateAttack(.15);
  assert.equal(target.hp, 200);
});

check('rest and scene transitions cancel pending damage', () => {
  cancelAttack();
  player.st = 100;
  attack(true);
  rest();
  assert.equal(player.strikePending, false);
  assert.equal(player.attack, 0);
  attack(true);
  enterBoss();
  assert.equal(player.strikePending, false);
  assert.equal(player.attack, 0);
});

check('directional sprites, rolls and swing phases render', () => {
  respawn();
  for (const face of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    player.face = face;
    drawWanderer(ctx, 600, 600);
  }
  player.roll = .2;
  drawWanderer(ctx, 600, 600);
  player.roll = 0;
  for (const heavy of [false, true]) {
    cancelAttack();
    player.st = 100;
    attack(heavy);
    for (const step of [.04, .1, .14, .15]) {
      updateAttack(step);
      drawWanderer(ctx, 600, 600);
      drawAttackIndicator(ctx);
    }
  }
});

// --- renewable timber ---------------------------------------------------------
check('trees take two light strikes to fell and drop timber', () => {
  respawn();
  entities.enemies.forEach(e => (e.hp = 0));
  const tree = trees.find(t => t.x > 200);
  standBeside(tree);
  const wood = progress.wood;
  attack(); updateAttack(.14);
  assert.equal(tree.hp, 17, 'first strike bites but does not fell');
  assert.equal(progress.wood, wood, 'no timber until the tree comes down');
  player.cool = 0; player.st = 100;
  attack(); updateAttack(.14);
  assert.equal(tree.hp, 0);
  assert.ok(progress.wood >= wood + 2 && progress.wood <= wood + 3, 'a light finisher yields 2-3 timber');
  assert.ok(tree.regrow > 0, 'the felled tree begins regrowing');
});

check('a heavy finisher yields more timber and stumps stop blocking', () => {
  const tree = trees.find(t => t.regrow === 0 && t.x > 200 && t.x < 900);
  assert.ok(blocked(tree.x, tree.y, 15), 'a standing tree is solid');
  standBeside(tree);
  tree.hp = 20;
  const wood = progress.wood;
  attack(true); updateAttack(.27);
  assert.equal(tree.hp, 0);
  assert.ok(progress.wood >= wood + 3, 'a heavy finisher yields at least 3 timber');
  assert.equal(blocked(tree.x, tree.y, 15), false, 'the stump can be walked over');
});

check('felled trees regrow on their own timer', () => {
  const tree = trees.find(t => t.regrow > 0);
  updateWorld(tree.regrow + .1);
  assert.equal(tree.regrow, 0);
  assert.equal(tree.hp, tree.max);
});

// --- Greyhollow Quarry --------------------------------------------------------
check('ore veins break into ironstone and reform', () => {
  const vein = veins[0];
  standBeside(vein);
  entities.enemies.forEach(e => (e.hp = 0));
  const ore = progress.ore;
  attack(true); updateAttack(.27);
  assert.equal(vein.hp, 12, 'a heavy strike takes most of the vein');
  assert.equal(progress.ore, ore);
  player.cool = 0; player.st = 100;
  attack(); updateAttack(.14);
  assert.equal(vein.hp, 0);
  assert.ok(progress.ore >= ore + 2);
  assert.ok(vein.regrow > 0);
  updateWorld(vein.regrow + .1);
  assert.equal(vein.hp, vein.max);
});

check('resting restores every felled tree and broken vein', () => {
  const tree = trees[0], vein = veins[1];
  tree.regrow = 20; tree.hp = 0;
  vein.regrow = 20; vein.hp = 0;
  rest();
  assert.equal(tree.regrow, 0);
  assert.equal(tree.hp, tree.max);
  assert.equal(vein.regrow, 0);
  assert.equal(vein.hp, vein.max);
});

check('the quarry is guarded by tougher brutes', () => {
  spawnEnemies();
  const brutes = entities.enemies.filter(e => e.kind === 'brute');
  assert.equal(brutes.length, 2);
  assert.ok(brutes.every(b => b.hp === ENEMY_KINDS.brute.hp));
  assert.ok(ENEMY_KINDS.brute.damage > ENEMY_KINDS.wildling.damage);
  assert.ok(brutes.every(b => b.x > 1180), 'brutes live across the bridge');
});

check('enemies are stopped by trees and the river', () => {
  spawnEnemies();
  const e = entities.enemies[0];
  const tree = trees.find(t => t.regrow === 0);
  e.x = tree.x - 14; e.y = tree.y;
  player.x = tree.x + 60; player.y = tree.y;
  const before = e.x;
  for (let i = 0; i < 20; i++) update(.03);
  assert.ok(e.x <= before + 1, 'the creature cannot walk through the trunk');
});

// --- embers and attributes ----------------------------------------------------
check('ember costs escalate and the first point costs 45', () => {
  assert.equal(emberCost(0), 45);
  assert.ok(emberCost(5) > emberCost(4));
  assert.ok(emberCost(10) > emberCost(5) * 1.5);
});

check('kindling spends embers and raises the matching attribute', () => {
  progress.stats.vitality = 0;
  progress.embers = 45;
  const hp = state.maxHp();
  buyStat('vitality');
  closeDialog();
  assert.equal(progress.stats.vitality, 1);
  assert.equal(progress.embers, 0);
  assert.equal(state.maxHp(), hp + 12);
});

check('kindling is refused without enough embers', () => {
  progress.embers = 3;
  buyStat('strength');
  closeDialog();
  assert.equal(progress.stats.strength, 0);
  assert.equal(progress.embers, 3);
});

check('attributes feed damage, stamina, speed and flasks', () => {
  progress.embers = 999999;
  progress.blade = 0;
  const damage = state.attackDamage(false);
  buyStat('strength');
  assert.equal(state.attackDamage(false), damage + 4);
  const stamina = state.maxStamina(), regen = state.staminaRegen();
  buyStat('endurance');
  assert.equal(state.maxStamina(), stamina + 7);
  assert.ok(state.staminaRegen() > regen);
  const speed = state.moveSpeed(), invuln = state.rollInvuln();
  buyStat('agility');
  assert.ok(state.moveSpeed() > speed);
  assert.ok(state.rollInvuln() > invuln);
  const flasks = state.maxFlasks();
  for (let i = 0; i < 3; i++) buyStat('resolve');
  closeDialog();
  assert.equal(state.maxFlasks(), flasks + 1);
  assert.ok(state.characterLevel() > 1);
});

check('attributes stop at the cap', () => {
  progress.embers = 99999999;
  for (let i = 0; i < STAT_CAP + 5; i++) buyStat('vitality');
  closeDialog();
  assert.equal(progress.stats.vitality, STAT_CAP);
});

check('a stronger wanderer fells trees faster', () => {
  respawn();
  entities.enemies.forEach(e => (e.hp = 0));
  const tree = trees.find(t => t.regrow === 0 && t.x > 200);
  standBeside(tree);
  attack(true); updateAttack(.27);
  assert.equal(tree.hp, 0, 'a heavy strike from a levelled wanderer fells a tree outright');
});

// --- panels -------------------------------------------------------------------
check('character sheet and kindle menu build without errors', () => {
  characterSheet();
  kindleMenu();
  closeDialog();
  assert.equal(game.modal, false);
});

check('saved attributes survive a reload', async () => {
  progress.stats.vitality = 4;
  state.save();
  const raw = JSON.parse(localStorage.getItem(state.SAVE));
  assert.equal(raw.stats.vitality, 4);
  progress.stats.vitality = 0;
  state.loadProgress();
  assert.equal(progress.stats.vitality, 4);
});

// --- gear, buildings and camp collision ---------------------------------------
check('camp structures block movement and the player slides along them', () => {
  respawn();
  const tent = world.SOLIDS.find(s => s.name === 'wanderer tent');
  assert.equal(blocked(tent.x, tent.y, 15), true, 'the tent is solid');
  assert.equal(blocked(tent.x, tent.y + tent.ry + 40, 15), false, 'open ground south of it is not');
  // Walking into the tent from below never lets you inside it, but you do slide
  // around its edge rather than sticking fast.
  player.x = tent.x - 10;
  player.y = tent.y + tent.ry + 17;
  player.inv = 100;
  const x0 = player.x;
  keys.add('w'); keys.add('a');
  for (let i = 0; i < 12; i++) {
    update(.03);
    assert.equal(blocked(player.x, player.y, 15), false, 'never ends up inside the footprint');
  }
  keys.clear();
  assert.ok(player.x < x0 - 12, 'slides sideways along the tent instead of stopping dead');
  assert.ok(player.y > tent.y, 'never crosses to the far side of it');
});

check('conditional footprints only appear once the building stands', () => {
  const well = world.SOLIDS.find(s => s.needs === 'well');
  progress.buildings.well = false;
  assert.equal(blocked(well.x, well.y, 15), false);
  progress.buildings.well = true;
  assert.equal(blocked(well.x, well.y, 15), true);
  progress.buildings.well = false;
});

check('minecart rails stay off the bridge deck', () => {
  // The rails are painted from x=1212 east; the bridge deck ends at x=1206.
  assert.ok(1212 > 1206);
  assert.equal(world.inRiver(1100, 700), true, 'the river still blocks off-bridge');
  assert.equal(world.inRiver(1100, 630), false, 'the deck still crosses it');
});

check('forging a weapon spends materials and resets reinforcement', () => {
  progress.weapon = 0;
  progress.blade = 3;
  const w = WEAPONS[1];
  Object.assign(progress, { wood: w.cost.wood, ore: w.cost.ore, embers: w.cost.embers });
  assert.equal(canAfford(progress, w.cost), true);
  payCost(progress, w.cost);
  progress.weapon = 1;
  progress.blade = 0;
  assert.equal(progress.wood, 0);
  assert.equal(progress.ore, 0);
  assert.equal(progress.embers, 0);
  assert.equal(state.weapon().key, 'ironsong');
});

check('each weapon adds damage and reach', () => {
  progress.blade = 0;
  progress.stats.strength = 0;
  progress.buildings.whetstone = false;
  const seen = WEAPONS.map((w, i) => {
    progress.weapon = i;
    return { damage: state.attackDamage(false), reach: state.attackRange(false) };
  });
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i].damage > seen[i - 1].damage, 'later blades hit harder');
    assert.ok(seen[i].reach > seen[i - 1].reach, 'later blades reach further');
  }
  assert.equal(seen[0].damage, 23);
});

check('weapon reach actually extends the hitbox', () => {
  respawn();
  entities.enemies.forEach(e => (e.hp = 0));
  const target = entities.enemies[0];
  progress.weapon = 0;
  target.hp = 500;
  target.x = player.x + 82;      // beyond the 77 baseline, inside Ironsong's 86
  target.y = player.y;
  player.face = 0;
  cancelAttack(); player.st = 100;
  attack(); updateAttack(.14);
  assert.equal(target.hp, 500, 'the starting blade falls short');
  progress.weapon = 1;
  cancelAttack(); player.st = 100;
  player.face = 0;
  attack(); updateAttack(.14);
  assert.ok(target.hp < 500, 'the longsword connects');
  progress.weapon = 0;
});

check('Greymane leaves his pelt, which carries stamina, and a blade takes five reinforcements', () => {
  const saved = structuredClone(progress);
  progress.slain = progress.slain.filter(id => id !== 'greymane');
  progress.owned = progress.owned.filter(k => k !== 'pelt');
  progress.armor = 'mail';
  world.enterRegion('echo');
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null; closeDialog();
  const grey = entities.enemies.find(e => e.id === 'greymane');
  const oreBefore = progress.ore;
  standBeside(grey); grey.hp = 1; player.cool = 0; attack(); updateAttack(.14);
  assert.equal(grey.hp, 0);
  assert.ok(progress.owned.includes('pelt'), 'the pelt comes off the body');
  assert.ok(progress.ore >= oreBefore + 3 && progress.ore <= oreBefore + 6, 'and 3-6 ironstone');
  const stamina = state.maxStamina(), regen = state.staminaRegen(), armor = state.armorDefense();
  inventory.equipArmor('pelt');
  assert.equal(state.maxStamina(), stamina + 15);
  assert.ok(state.staminaRegen() > regen);
  assert.ok(state.armorDefense() > armor);
  // Five reinforcements now, not three.
  progress.blade = 4;
  assert.ok(state.BLADE_MAX === 5);
  const dmg = state.attackDamage(false);
  progress.blade = 5;
  assert.equal(state.attackDamage(false), dmg + 8, 'the fifth level still counts');
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('the Warden’s Edge is never forged — it drops from the Warden 15% of the time', () => {
  const w = WEAPONS[2];
  assert.equal(w.cost, undefined);
  assert.equal(w.drop.chance, .15);
  assert.ok(!FORGEABLE.includes(w), 'Rowan cannot make it');
  assert.ok(FORGEABLE.includes(WEAPONS[1]));
  const saved = structuredClone(progress);
  const fell = roll => {
    combat.setDropRoll(() => roll);
    progress.weapon = 1; progress.blade = 2; progress.won = false;
    entities.boss = { x: 750, y: 585, hp: 1, max: 480, state: 'stalk', timer: 1, phase: 1, hit: false, dx: 0, dy: 0, combo: 0 };
    game.scene = 'boss'; game.dead = false;
    player.x = 750; player.y = 620; player.face = -Math.PI / 2; player.cool = 0; player.st = 100; player.roll = 0; player.inv = 100;
    attack(); updateAttack(.14);
    assert.equal(entities.boss.hp, 0);
  };
  fell(.5);
  assert.equal(progress.weapon, 1, 'no drop on a high roll');
  assert.equal(progress.blade, 2);
  fell(.1);
  assert.equal(progress.weapon, 2, 'the blade drops on a low roll');
  assert.equal(progress.blade, 0, 'a new blade arrives unreinforced');
  combat.setDropRoll(Math.random);
  Object.assign(progress, saved);
  game.scene = 'wild';
});

check('camp buildings apply their effects', () => {
  progress.weapon = 0; progress.blade = 0; progress.stats.strength = 0; progress.stats.resolve = 0;
  for (const b of BUILDINGS) progress.buildings[b.key] = false;
  const flasks = state.maxFlasks(), healing = state.flaskHeal();
  const damage = state.attackDamage(false), kindle = state.kindleCost(0);
  progress.buildings.shelter = true;
  assert.equal(state.maxFlasks(), flasks + 1);
  progress.buildings.well = true;
  assert.equal(state.flaskHeal(), healing + 12);
  progress.buildings.whetstone = true;
  assert.equal(state.attackDamage(false), damage + 4);
  progress.buildings.brazier = true;
  assert.ok(state.kindleCost(0) < kindle, 'the brazier discounts kindling');
});

check('building costs escalate down the list', () => {
  for (let i = 1; i < BUILDINGS.length; i++) {
    const prev = BUILDINGS[i - 1].cost, cur = BUILDINGS[i].cost;
    assert.ok(cur.wood > prev.wood, `${BUILDINGS[i].key} costs more timber`);
  }
});

check('old saves migrate their supply shelter', () => {
  localStorage.setItem(state.SAVE, JSON.stringify({ camp: 1, blade: 1, wood: 5 }));
  state.resetProgress();
  state.loadProgress();
  assert.equal(progress.buildings.shelter, true);
  assert.equal(progress.blade, 1);
  assert.equal(progress.weapon, 0);
});

check('creature and Warden sprites render in every state and every skin, in every region', () => {
  const seen = new Set();
  const populations = [];
  for (const region of ['hearthwood', 'echo']) { spawnEnemies(region); populations.push([...entities.enemies]); }
  // The vault needs her down to be populated at all — and the grove needs her up.
  const wasVaelira = progress.bosses.vaelira;
  progress.bosses.vaelira = true;
  spawnEnemies('sunken');
  populations.push([...entities.enemies]);
  progress.bosses.vaelira = wasVaelira;
  for (const key of ['sporehouse', 'burrow']) { const slain = progress.slain; progress.slain = []; rooms.enterRoom(key); populations.push([...entities.enemies]); rooms.leaveRoom(); progress.slain = slain; }
  game.scene = 'wild';
  for (const population of populations) {
    entities.enemies = population;
    for (const e of entities.enemies) {
      seen.add(`${e.kind}:${e.skin}`);
      assert.ok(SKIN_KEYS[e.kind].includes(e.skin), 'every spawn wears a known skin');
      for (const st of ['idle', 'windup', 'lunge']) {
        e.state = st;
        e.timer = .3;
        e.hp = e.max * .6;
        for (const px of [e.x - 60, e.x + 60, e.x]) for (const py of [e.y + 40, e.y - 90]) { player.x = px; player.y = py; actors.drawCreature(ctx, e); }
      }
    }
  }
  for (const kind of Object.keys(SKIN_KEYS)) for (const skin of SKIN_KEYS[kind]) assert.ok(seen.has(`${kind}:${skin}`), `${kind} ${skin} is spawned somewhere`);
  spawnEnemies('hearthwood');
  const won = progress.won;
  progress.won = false;
  enterBoss();
  progress.won = won;
  const b = entities.boss;
  for (const st of ['stalk', 'slashWind', 'slash', 'slamWind', 'recover']) {
    b.state = st;
    b.timer = .2;
    for (const phase of [1, 2]) { b.phase = phase; drawWarden(ctx, b); }
  }
  b.hp = 0;
  draw();
  // Hushmaw and the den render in every state too.
  entities.boss = { kind: 'vaelira', ...vaelira.makeVaelira() };
  for (const stage of [0, 1, 2]) {
    entities.boss.stage = stage;
    for (const st of ['stalk', 'shift', 'dashWind', 'dash', 'flurryWind', 'flurry', 'lashWind', 'lash', 'grabWind', 'grab', 'hold', 'throw', 'volleyWind', 'snipeWind', 'ultimateWind', 'ultimate', 'recover']) {
      entities.boss.state = st;
      entities.boss.timer = .3;
      actors.drawVaelira(ctx, entities.boss);
    }
  }
  entities.shots = [{ x: 700, y: 500, vx: 200, vy: 40, angle: .2, life: 1, damage: 10, hit: false }];
  draw();
  entities.shots = [];
  draw();
  entities.boss.hp = 0;
  draw();
  entities.boss = null;
  game.scene = 'wild';
});

// --- Echo Grove ------------------------------------------------------------------
check('the south road leads into Echo Grove, whose creatures are wolves and mushroom-folk', () => {
  const saved = structuredClone(progress);
  cancelAttack(); closeDialog();
  game.scene = 'wild'; game.dead = false; game.scripted = null;
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
  player.x = 670; player.y = 1035; player.roll = 0;
  keys.add('s');
  for (let i = 0; i < 12 && game.region === 'hearthwood'; i++) update(.035);
  keys.clear();
  assert.equal(game.region, 'echo', 'walking off the road crosses over');
  assert.ok(player.y < 120, 'he arrives at the grove\'s north edge');
  assert.ok(world.props.wayposts.length > 8, 'lanterns light the way');
  assert.ok(world.props.gibbets.length >= 4 && world.props.rack, 'the village keeps its dead on show');
  assert.ok(world.props.camps.length >= 4, 'and there are camps nobody broke');
  const grown = world.trees.filter(t => !t.bush), bushes = world.trees.filter(t => t.bush);
  assert.ok(grown.length > 50 && grown.length <= 90, 'trees, but few and far between');
  assert.ok(bushes.length > 30, 'and bushes between them');
  assert.equal(world.size.w, 3000, 'twice Hearthwood across');
  assert.ok(world.props.huts.length >= 4, 'a village of huts in the east');
  assert.ok(world.trees.every(t => t.grove), 'all in the grove palette');
  const b = bushes[0];
  assert.equal(world.findHarvestTarget(b.x - 30, b.y, 0, 80, 1.5)?.ref === b, false, 'bushes are not timber');
  assert.ok(world.props.mushrooms.length > 60, 'mushrooms light it');
  assert.ok(world.veins.length === 0, 'no ironstone here');
  const kinds = new Set(entities.enemies.map(e => e.kind));
  assert.deepEqual([...kinds].sort(), ['frog', 'sporeling', 'wolf']);
  assert.ok(world.props.critters.length > 20, 'small things live here too');
  assert.ok(world.props.rain > 0, 'and it is always raining a little');
  const fallen = entities.enemies.filter(e => e.elite).map(e => e.id).sort();
  assert.deepEqual(fallen, ['greymane'], 'only Greymane waits in the open');
  // Near him the boss bar comes up with his name; away from him it stays hidden.
  const grey = entities.enemies.find(e => e.id === 'greymane');
  player.x = grey.x + 80; player.y = grey.y;
  syncHud();
  assert.equal(document.getElementById('bossHud').hidden, false);
  assert.equal(document.getElementById('bossName').textContent, 'GREYMANE');
  player.x = 700; player.y = 120;
  syncHud();
  assert.equal(document.getElementById('bossHud').hidden, true);
  assert.ok(entities.enemies.filter(e => e.elite).every(e => e.max > 200 && e.once), 'the Fallen are big and die once');
  for (const type of ['cave', 'fire', 'ladder', 'burrow']) assert.ok(world.npcs.some(n => n.type === type), `the grove has its ${type}`);
  draw();
  // Back the way he came.
  player.x = 1400; player.y = 24;
  keys.add('w');
  for (let i = 0; i < 6 && game.region === 'echo'; i++) update(.035);
  keys.clear();
  assert.equal(game.region, 'hearthwood');
  assert.ok(player.y > 900, 'and lands on the south road');
  Object.assign(progress, saved);
  spawnEnemies('hearthwood');
});

check('each Fallen has a move of its own: the howl-chain, the spore-fall, the dig', () => {
  const saved = structuredClone(progress);
  progress.slain = progress.slain.filter(id => !['greymane', 'sporemother', 'mycel'].includes(id));
  world.enterRegion('echo');
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null; closeDialog();
  // Greymane: the howl, then three leaps.
  const grey = entities.enemies.find(e => e.id === 'greymane');
  player.x = grey.x + 120; player.y = grey.y; player.inv = 100; player.hp = state.maxHp();
  grey.specialCool = 0; grey.cool = 0; grey.state = 'idle';
  update(.035);
  assert.equal(grey.state, 'howl');
  grey.timer = 0; update(.035);
  assert.equal(grey.state, 'lunge'); assert.equal(grey.chain, 3);
  let leaps = 0;
  for (let i = 0; i < 60 && grey.chain; i++) { const was = grey.state; update(.035); if (was !== 'lunge' && grey.state === 'lunge') leaps++; }
  assert.ok(leaps >= 2, 'it leaps again and again');
  // The Sporemother: rings around the wanderer that burst.
  rooms.enterRoom('sporehouse');
  const mother = entities.enemies[0];
  player.x = 750; player.y = 700; player.inv = 0; player.hp = state.maxHp();
  mother.specialCool = 0; mother.cool = 0; mother.state = 'idle';
  update(.035);
  assert.equal(mother.state, 'rain');
  assert.equal(entities.hazards.length, 5, 'five rings fall');
  assert.ok(entities.hazards.every(h => h.kind === 'burst'));
  const hp = player.hp;
  for (let i = 0; i < 70; i++) update(.035);
  assert.ok(player.hp < hp, 'standing in a ring hurts');
  assert.equal(entities.hazards.length, 0, 'and the rings are gone');
  draw();
  rooms.leaveRoom();
  // Mycel: under, then up where the wanderer stood, and pools where he leaps.
  rooms.enterRoom('burrow');
  const my = entities.enemies[0];
  player.x = 750; player.y = 700; player.inv = 100; player.hp = state.maxHp();
  my.specialCool = 0; my.cool = 0; my.state = 'idle';
  update(.035);
  assert.equal(my.state, 'dig'); assert.equal(my.hidden, true);
  assert.equal(livingTargets().length, 0, 'nothing to hit while he is under');
  draw();
  my.timer = 0; update(.035);
  assert.equal(my.hidden, false);
  assert.ok(Math.hypot(my.x - 750, my.y - 700) < 2, 'he comes up where the wanderer was');
  my.state = 'lunge'; my.timer = .2; my.dx = 0; my.dy = -1; my.hit = true; my.chain = 0;
  for (let i = 0; i < 6; i++) update(.035);
  assert.ok(entities.hazards.some(h => h.kind === 'pool'), 'his leap leaves pools');
  draw();
  rooms.leaveRoom();
  assert.equal(entities.hazards.length, 0, 'rooms are left clean');
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('dying leaves the embers where he fell, and walking back takes them up again', () => {
  const saved = structuredClone(progress);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
  cancelAttack(); closeDialog();
  game.scene = 'wild'; game.dead = false; game.scripted = null;
  progress.embers = 640;
  progress.lost = null;
  player.x = 700; player.y = 760; player.inv = 0; player.hp = 50;
  hurt(500, 0, 0);
  assert.equal(game.dead, true);
  assert.equal(progress.embers, 0, 'he carries nothing away');
  assert.equal(progress.lost.embers, 640);
  assert.equal(progress.lost.region, 'hearthwood');
  assert.equal(progress.lost.scene, 'wild');
  assert.ok(Math.abs(progress.lost.x - 700) < 2 && Math.abs(progress.lost.y - 760) < 2, 'on the spot he fell');
  assert.ok(state.lostHere(), 'and it lies in this very place');
  draw();
  respawn();
  assert.equal(progress.embers, 0, 'waking does not give them back');
  assert.ok(progress.lost, 'the pile is still out there');
  // Standing somewhere else changes nothing.
  player.x = 400; player.y = 400;
  update(.02);
  assert.equal(progress.embers, 0);
  // Walking onto it takes it back.
  player.x = progress.lost.x; player.y = progress.lost.y + 10;
  update(.02);
  assert.equal(progress.embers, 640);
  assert.equal(progress.lost, null, 'and the pile is gone');
  // A second death before recovering loses the first pile.
  progress.embers = 100;
  player.x = 800; player.y = 800; player.inv = 0; player.hp = 50;
  hurt(500, 0, 0);
  respawn();
  assert.equal(progress.lost.embers, 100);
  progress.embers = 0;
  player.x = 900; player.y = 900; player.inv = 0; player.hp = 50;
  hurt(500, 0, 0);
  assert.equal(progress.lost, null, 'dying with nothing wipes what was owed');
  respawn();
  // The pile knows which region and which room it lies in.
  progress.embers = 50;
  world.enterRegion('echo');
  game.scene = 'wild'; game.dead = false;
  player.x = 1400; player.y = 400; player.inv = 0; player.hp = 50;
  hurt(500, 0, 0);
  assert.equal(progress.lost.region, 'echo');
  world.enterRegion('hearthwood');
  assert.equal(state.lostHere(), null, 'it does not follow him home');
  world.enterRegion('echo');
  assert.ok(state.lostHere(), 'and it is still there when he returns');
  respawn();
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
  game.scene = 'wild'; game.dead = false;
});

check('a parry is a sliver of timing: too soon locks the blade out, dead on leaves them exposed', () => {
  const saved = structuredClone(progress);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
  game.scene = 'wild'; game.dead = false; game.scripted = null; closeDialog(); cancelAttack();
  const stand = e => { player.x = e.x + 40; player.y = e.y; player.inv = 0; player.hp = state.maxHp(); player.st = state.maxStamina(); player.parryLock = 0; player.cool = 0; };
  const e = entities.enemies.find(x => x.kind === 'wildling');
  stand(e);
  e.state = 'idle'; e.timer = 0;
  assert.equal(combat.parryHint(), false, 'nothing coming, no cue');
  assert.equal(combat.parry(), false, 'and E falls through to interacting');
  // The cue is up for the whole windup, but the window is only its last breath.
  e.state = 'windup'; e.timer = .5;
  assert.equal(combat.parryHint(), true, 'the cue is up early');
  assert.equal(combat.parryTarget(), null, 'but the blade cannot reach it yet');
  syncInteractPrompt();
  assert.equal(document.getElementById('parry').hidden, false, 'the parry button pops in');
  draw();
  assert.equal(combat.parry(), true, 'E is spent on the attempt, not on talking');
  assert.ok(player.parryLock > 0, 'a mistimed parry locks the blade out');
  assert.equal(combat.parryHint(), false, 'and the cue goes out while it is locked');
  assert.equal(combat.parryTarget(), null, 'mashing does nothing');
  updateAttack(1);
  assert.equal(player.parryLock, 0, 'the lock runs out');
  stand(e);
  e.state = 'windup'; e.timer = .1;
  assert.equal(combat.parryTarget(), e, 'dead on the blow');
  const hp = player.hp;
  assert.equal(combat.parry(), true);
  assert.equal(e.state, 'exposed');
  update(.035);
  assert.equal(player.hp, hp, 'the blow never lands');
  const base = state.attackDamage(false);
  e.hp = 200; player.cool = 0; player.inv = 100;
  attack(); updateAttack(.14);
  assert.equal(e.hp, 200 - Math.round(base * 1.5), 'exposed creatures take half again as much');
  for (let i = 0; i < 60; i++) update(.035);
  assert.notEqual(e.state, 'exposed', 'it recovers');
  syncInteractPrompt();
  assert.equal(document.getElementById('parry').hidden, true, 'and the button goes away');
  // A main boss too: the Warden's lunge, caught on the beat, turns into its recovery.
  progress.won = false;
  enterBoss();
  const b = entities.boss;
  player.parryLock = 0;
  b.state = 'slashWind'; b.timer = .1; b.x = player.x + 60; b.y = player.y;
  assert.equal(combat.parryTarget(), b);
  assert.equal(combat.parry(), true);
  assert.equal(b.state, 'recover');
  leaveBoss();
  Object.assign(progress, saved);
  spawnEnemies('hearthwood');
});

check('three ruins hold a chest, and each gives up what it holds once', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null; closeDialog();
  assert.ok(world.props.ruins.length >= 5, 'ruins stand in the empty quarters');
  assert.ok(world.props.stones.length > 20, 'with columns and walls still up');
  const chests = world.npcs.filter(n => n.type === 'chest');
  assert.equal(chests.length, 3);
  assert.ok(chests.every(ch => ch.embers <= 500 && ch.ore <= 200), 'and none of them is a fortune');
  assert.ok(chests.some(ch => ch.embers > 0) && chests.some(ch => ch.ore > 0), 'some embers, some iron');
  progress.opened = [];
  progress.embers = 0; progress.ore = 0;
  let embers = 0, ore = 0;
  for (const ch of chests) {
    game.near = ch;
    interact();
    choices()[0].onclick();
    embers += ch.embers; ore += ch.ore;
  }
  assert.equal(progress.embers, embers);
  assert.equal(progress.ore, ore);
  assert.equal(progress.opened.length, 3);
  draw();
  // A second visit finds it exactly as it was left.
  game.near = chests[0];
  interact();
  assert.ok(document.getElementById('dialogTitle').textContent.includes('Empty'));
  choices()[0].onclick();
  assert.equal(progress.embers, embers, 'and gives nothing more');
  // None of them sits on a path.
  for (const ch of chests) assert.ok(!echoMod.ECHO_PATHS.some(p => { for (let i = 1; i < p.length; i++) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((ch.x - x0) * dx + (ch.y - y0) * dy) / l)); if (Math.hypot(ch.x - (x0 + dx * k), ch.y - (y0 + dy * k)) < 60) return true; } return false; }), 'the ruins are off the road');
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('critters bolt when he comes near, and pond frogs spit acid and come back', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null; closeDialog(); cancelAttack();
  // A critter runs the moment he is close, then is gone.
  const k = world.props.critters[0];
  k.flee = 0; k.back = 0; k.alpha = 1; k.x = k.homeX; k.y = k.homeY;
  player.x = k.x + 400; player.y = k.y;
  update(.035);
  assert.equal(k.flee, 0, 'it does not care from over there');
  player.x = k.x + 60; player.y = k.y;
  update(.035);
  assert.ok(k.flee > 0, 'but it bolts when he is close');
  const away = Math.hypot(k.x - player.x, k.y - player.y);
  for (let i = 0; i < 20; i++) update(.035);
  assert.ok(Math.hypot(k.x - player.x, k.y - player.y) > away, 'and it runs away from him');
  for (let i = 0; i < 60; i++) update(.035);
  assert.equal(k.alpha, 0, 'until it is gone into the trees');
  assert.ok(k.back > 0, 'and another is due back later');
  draw();
  // The frog spits acid across the water, and the acid burns where it lands.
  const frog = entities.enemies.find(e => e.kind === 'frog');
  assert.ok(frog, 'every pond has one');
  entities.shots = []; entities.hazards = [];
  player.x = frog.x + 140; player.y = frog.y; player.inv = 100; player.hp = state.maxHp();
  frog.cool = 0; frog.state = 'idle';
  update(.035);
  assert.equal(frog.state, 'windup', 'it swells up first');
  draw();
  frog.timer = 0;
  update(.035);
  assert.equal(entities.shots.length, 1);
  assert.equal(entities.shots[0].kind, 'acid');
  draw();
  for (let i = 0; i < 60; i++) update(.035);
  assert.ok(entities.hazards.some(h => h.kind === 'pool'), 'and it leaves a burn on the ground');
  // Killed, it is back within half a minute without anyone resting.
  standBeside(frog); game.scene = 'wild'; frog.hp = 1; player.cool = 0; attack(); updateAttack(.14);
  assert.equal(frog.hp, 0);
  for (let i = 0; i < 400; i++) update(.05);
  assert.ok(frog.hp <= 0, 'still gone at twenty seconds');
  for (let i = 0; i < 300; i++) update(.05);
  assert.ok(frog.hp > 0, 'and back by thirty');
  assert.equal(frog.x, frog.homeX, 'and it is back at its own water');
  entities.shots = []; entities.hazards = [];
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('nothing stands on a path or road, in either region', () => {
  const clear = (list, roads, pad) => list.every(t => !roads.some(r => { for (let i = 1; i < r.length; i++) { const [x0, y0] = r[i - 1], [x1, y1] = r[i]; const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((t.x - x0) * dx + (t.y - y0) * dy) / l)); if (Math.hypot(t.x - (x0 + dx * k), t.y - (y0 + dy * k)) < pad) return true; } return false; }));
  world.enterRegion('echo');
  assert.ok(clear(world.trees, echoMod.ECHO_PATHS, 24), 'no tree or bush on a grove path');
  assert.ok(clear(world.props.mushrooms, echoMod.ECHO_PATHS, 28), 'no mushroom on a grove path');
  world.enterRegion('hearthwood');
  assert.ok(clear(world.trees, HEARTHWOOD_ROADS, 40), 'no tree on a Hearthwood road');
  spawnEnemies('hearthwood');
});

check('Hearthwood roads remain walkable with every camp building constructed', () => {
  world.enterRegion('hearthwood');
  const buildings = { ...progress.buildings };
  try {
    for (const key of Object.keys(progress.buildings)) progress.buildings[key] = true;
    for (const road of HEARTHWOOD_ROADS) for (let i = 1; i < road.length; i++) {
      const [x0, y0] = road[i - 1], [x1, y1] = road[i];
      const length = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(length / 6);
      for (let j = 0; j <= steps; j++) {
        const x = x0 + (x1 - x0) * j / steps, y = y0 + (y1 - y0) * j / steps;
        for (const offset of [-8, 0, 8]) {
          const px = x - (y1 - y0) / length * offset, py = y + (x1 - x0) / length * offset;
          assert.equal(world.blocked(px, py, 15), false, `walkable road at ${Math.round(px)}, ${Math.round(py)}`);
        }
      }
    }
  } finally { Object.assign(progress.buildings, buildings); }
});

check('grove trails provide a clear walking corridor through their bends and junctions', () => {
  world.enterRegion('echo');
  for (const trail of echoMod.ECHO_PATHS) {
    for (let i = 1; i < trail.length; i++) {
      const [x0, y0] = trail[i - 1], [x1, y1] = trail[i];
      const length = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(length / 8));
      for (let j = 0; j <= steps; j++) {
        const x = x0 + (x1 - x0) * j / steps, y = y0 + (y1 - y0) * j / steps;
        for (const offset of [-10, 0, 10]) {
          const px = x - (y1 - y0) / length * offset, py = y + (x1 - x0) / length * offset;
          assert.equal(world.blocked(px, py, 15), false, `clear corridor at ${Math.round(px)}, ${Math.round(py)}`);
        }
      }
    }
  }
  for (const p of world.props.wayposts) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.equal(world.inRiver(p.x, p.y), false, 'lanterns stay out of ponds');
  }
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('the vault gate faces the road, and is the only way past its wall', () => {
  world.enterRegion('echo');
  const gate = echoMod.ECHO_VAULT_GATE;
  // He walks straight east into it: the whole run from the approach to the map
  // edge is clear at the road's own height, with no turn behind the stone.
  for (let x = 2700; x <= world.bounds.maxX; x += 5)
    assert.equal(world.blocked(x, gate.y, 15), false, 'the way through stays clear');
  // The wall itself crosses the road, above and below the opening.
  for (const y of [1620, 1660, 1920, 1960])
    assert.equal(world.blocked(gate.x, y, 15), true, 'the wall stands either side of the gate');
  // Seal only the opening: there must then be no way into the exit pocket.
  function reachesExit(seal) {
    const queue = [[2600,2060]], seen = new Set(['2600,2060']);
    for (let i = 0; i < queue.length; i++) {
      const [x,y] = queue[i];
      if (x >= 2920 && y >= 1700 && y <= 1860) return true;
      for (const [nx,ny] of [[x-20,y],[x+20,y],[x,y-20],[x,y+20]]) {
        const key = `${nx},${ny}`;
        if (nx < 2580 || nx > world.bounds.maxX || ny < 1400 || ny > world.bounds.maxY || seen.has(key)) continue;
        if (world.blocked(nx,ny,15) || seal && Math.abs(nx-gate.x)<40 && Math.abs(ny-gate.y)<130) continue;
        seen.add(key); queue.push([nx,ny]);
      }
    }
    return false;
  }
  assert.equal(reachesExit(false), true, 'the gate leads onto the exit path');
  assert.equal(reachesExit(true), false, 'neither end of the wall can be walked around');
  // The reason the gate was turned to face him: anything standing south of the
  // road draws over him, so nothing south of it may reach up as far as the road.
  const feet = gate.y + 8;
  for (const w of echoMod.ECHO_VAULT_WALLS)
    if (w.y0 > gate.y) assert.ok(w.y0 - w.h > feet, `wall at ${w.y0} is drawn clear of the road`);
  for (const t of echoMod.ECHO_VAULT_TORCHES)
    if (t.y > gate.y) assert.ok(t.y - 68 > feet, `the torch at ${t.x},${t.y} is drawn clear of the road`);
  world.enterRegion('hearthwood');
});

check('wolves lunge and sporelings burst; resting in the grove remembers its fire', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null;
  const wolf = entities.enemies.find(e => e.kind === 'wolf' && !e.elite);
  player.x = wolf.x + 50; player.y = wolf.y; player.inv = 0; player.hp = state.maxHp();
  wolf.cool = 0;
  update(.035);
  assert.equal(wolf.state, 'windup', 'in reach, it crouches');
  wolf.timer = 0;
  update(.035);
  assert.equal(wolf.state, 'lunge', 'then leaps');
  const before = wolf.x;
  update(.035);
  assert.ok(wolf.x !== before, 'the leap moves it');
  const spore = entities.enemies.find(e => e.kind === 'sporeling' && !e.elite);
  spore.state = 'windup'; spore.timer = 0;
  player.x = spore.x + 40; player.y = spore.y; player.inv = 0; player.hp = state.maxHp();
  const hp = player.hp;
  update(.035);
  assert.ok(player.hp < hp, 'the spore burst hurts');
  assert.equal(spore.state, 'idle');
  progress.fires = ['hearthwood'];
  rest();
  assert.ok(progress.fires.includes('echo'), 'the fire is remembered');
  assert.equal(progress.region, 'echo');
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('Orrin sells the pocket lantern for 300 embers, once', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null;
  progress.owned = progress.owned.filter(k => k !== 'lantern');
  progress.embers = 250;
  progress.orrin = 0;
  const orrin = world.npcs.find(n => n.type === 'peddler');
  assert.ok(orrin && Math.hypot(orrin.x - world.fire.x, orrin.y - world.fire.y) < 90, 'he sits by the fire');
  game.near = orrin;
  // The first time, he does not mention lamps at all: the thorn took his family.
  interact();
  assert.ok(document.getElementById('dialogBody').textContent.includes('I do not keep this fire'), 'he opens with why he is really here');
  const ask = choices();                     // his request runs to the last page
  assert.ok(document.getElementById('dialogBody').textContent.includes('look for a way down'), 'he asks for help');
  ask[0].onclick();
  assert.equal(progress.orrin, 1, 'the promise is remembered');
  choices();                                 // his pitch runs two pages; the wares sit on the last
  let row = document.getElementById('dialogExtra').children[1].children[0];
  assert.ok(row.children[1].disabled, 'too poor');
  closeDialog();
  progress.embers = 320;
  interact();
  choices();
  row = document.getElementById('dialogExtra').children[1].children[0];
  row.children[1].onclick();
  assert.equal(progress.embers, 20);
  assert.ok(progress.owned.includes('lantern'));
  choices();
  row = document.getElementById('dialogExtra').children[1].children[0];
  assert.equal(row.children[1].textContent, 'Carried');
  closeDialog();
  draw();
  player.x = world.trees[0].x; player.y = world.trees[0].y - 30;
  draw();                                   // under a canopy, with the lantern lit
  characterSheet();
  closeDialog();
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('the cave stays sealed until the three Fallen are down, then Vaelira waits inside', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  progress.slain = progress.slain.filter(id => !['greymane', 'sporemother', 'mycel'].includes(id));
  progress.bosses = {};
  spawnEnemies('echo');
  game.scene = 'wild'; game.dead = false; game.scripted = null;
  game.near = world.npcs.find(n => n.type === 'cave');
  interact();
  assert.ok(document.getElementById('dialogTitle').textContent.includes('Roots'), 'sealed');
  assert.equal(game.caveOpen, false);
  closeDialog();
  const fell = (f, id, scene) => { standBeside(f); game.scene = scene; f.hp = 1; player.cool = 0; attack(); updateAttack(.14); assert.equal(f.hp, 0, `${id} falls`); assert.ok(progress.slain.includes(id)); };
  fell(entities.enemies.find(e => e.id === 'greymane'), 'greymane', 'wild');
  // The Sporemother is up the ladder, in her own room.
  game.near = world.npcs.find(n => n.type === 'ladder');
  interact();
  assert.equal(game.scene, 'room');
  assert.equal(game.room, 'sporehouse');
  assert.equal(entities.enemies.length, 1);
  assert.equal(entities.enemies[0].id, 'sporemother');
  assert.equal(audioMod.wantedMusic(), 'groveBoss', 'the grove has its own boss song');
  syncHud();
  assert.equal(document.getElementById('bossName').textContent, 'THE SPOREMOTHER', 'her bar is up the moment you climb in');
  draw();
  // At half health she swells into the Spore Monster: twice the size, three times the speed.
  const sm = entities.enemies[0];
  const wasScale = sm.elite.scale, wasWindup = ENEMY_KINDS.sporeling.windup;
  standBeside(sm); game.scene = 'room'; sm.hp = Math.floor(sm.max * .5); player.inv = 100;
  update(.035);
  assert.equal(sm.monster, true, 'sporemother transforms');
  assert.equal(sm.elite.name, 'Spore Monster');
  assert.equal(sm.elite.scale, wasScale * 2, 'twice her size');
  assert.ok(Math.abs(sm.elite.windup - wasWindup / 3) < 1e-9, 'and three times as fast');
  assert.ok(entities.hazards.some(h => h.kind === 'cloud'), 'a bank of spores comes off her');
  assert.equal(audioMod.wantedMusic(), 'groveBoss', 'the fight goes on');
  draw();
  // The cloud keeps hurting whoever stands in it.
  player.inv = 0; player.hp = state.maxHp(); player.x = sm.x; player.y = sm.y;
  const cloudHp = player.hp;
  for (let i = 0; i < 40; i++) update(.035);
  assert.ok(player.hp < cloudHp, 'standing in the spores costs');
  player.inv = 100;
  const oreBefore = progress.ore;
  standBeside(sm); game.scene = 'room'; sm.hp = 1; player.cool = 0; attack(); updateAttack(.14);
  assert.equal(sm.hp, 0);
  assert.ok(progress.slain.includes('sporemother'));
  assert.ok(progress.ore >= oreBefore + 3 && progress.ore <= oreBefore + 6, 'and she leaves 3-6 ironstone');
  assert.equal(audioMod.wantedMusic(), 'grove', 'the song ends with her');
  game.near = rooms.ROOM_EXIT; player.x = 750; player.y = 800;
  interact();
  assert.equal(game.scene, 'wild');
  assert.equal(game.region, 'echo');
  assert.ok(Math.hypot(player.x - world.props.sporehouse.x, player.y - world.props.sporehouse.y) < 140, 'back at the foot of the ladder');
  // Mycel is down the burrow.
  game.near = world.npcs.find(n => n.type === 'burrow');
  interact();
  assert.equal(game.room, 'burrow');
  assert.equal(entities.enemies[0]?.id, 'mycel');
  draw();
  // At half health he comes up onto his hind legs and his claws carry venom.
  const my = entities.enemies[0];
  standBeside(my); game.scene = 'room'; my.hp = Math.floor(my.max * .5); player.inv = 100;
  update(.035);
  assert.equal(my.risen, true, 'mycel rises');
  assert.equal(my.elite.name, 'Mycel, Risen');
  assert.equal(my.elite.lunge, 0, 'he no longer leaps');
  assert.ok(my.elite.venom, 'his claws carry it');
  draw();
  // A deep pool of health, since a risen swipe alone would end a fresh wanderer.
  player.inv = 0; player.hp = 600; combat.clearVenom();
  my.state = 'windup'; my.timer = 0; my.x = player.x + 20; my.y = player.y;
  update(.035);
  assert.ok(player.poison > 0, 'the swipe leaves venom in the blood');
  const venomHp = player.hp;
  player.inv = 100;                       // venom works through the guard
  for (let i = 0; i < 40; i++) update(.035);
  assert.ok(player.hp < venomHp, 'and it keeps ticking');
  rest();
  assert.equal(player.poison, 0, 'the fire burns it out');
  // His rend: both claws, and a ring of venomous ground left behind.
  my.risen = true; my.specialCool = 0; my.cool = 0; my.state = 'idle';
  standBeside(my); game.scene = 'room'; player.inv = 100;
  update(.035);
  assert.equal(my.state, 'rend');
  draw();
  my.timer = 0; update(.035);
  assert.ok(entities.hazards.filter(h => h.kind === 'pool' && h.venom).length >= 6, 'a ring of venom');
  player.inv = 100;
  fell(my, 'mycel', 'room');
  rooms.enterRoom('burrow');
  assert.equal(entities.enemies.length, 0, 'an emptied room stays empty');
  rooms.leaveRoom();
  spawnEnemies('echo');
  assert.ok(!entities.enemies.some(e => e.elite), 'the Fallen stay down');
  game.near = world.npcs.find(n => n.type === 'cave');
  interact();
  assert.ok(document.getElementById('dialogTitle').textContent.includes('withered'), 'open');
  choices()[0].onclick();
  assert.equal(game.scene, 'boss');
  const b = entities.boss;
  assert.equal(b.kind, 'vaelira');
  assert.equal(b.stage, 0);
  assert.equal(b.hp, vaelira.STAGES[0].hp, 'she opens with the knives');
  assert.equal(audioMod.wantedMusic(), 'groveBoss');
  // Three rounds: each lethal blow stands her back up with her health full and a new weapon.
  const cut = () => { player.x = b.x; player.y = b.y + 35; player.cool = 0; player.st = 100; player.roll = 0; player.inv = 100; b.hp = 1; attack(); updateAttack(.14); };
  cut();
  assert.equal(b.stage, 1, 'the knives fall');
  assert.equal(b.state, 'shift');
  assert.ok(b.hp > 0 && b.hp < b.max, 'she is healing');
  for (let i = 0; i < 90; i++) updateBoss(.035);
  assert.equal(b.hp, b.max, 'and comes back whole');
  assert.equal(b.max, vaelira.STAGES[1].hp);
  draw();
  cut();
  assert.equal(b.stage, 2, 'then the whip');
  for (let i = 0; i < 90; i++) updateBoss(.035);
  assert.equal(b.max, vaelira.STAGES[2].hp);
  // The bow's ultimate turns a full circle and a quarter, and fills every bit of it.
  b.state = 'ultimate'; b.spin = 0; b.spin0 = 0; b.shotCool = 0; entities.shots = [];
  let swept = 0;
  for (let i = 0; i < 70 && b.state === 'ultimate'; i++) { updateBoss(.035); swept = b.spin; }
  assert.ok(swept >= Math.PI * 2.5, 'a turn and a quarter, not a turn');
  assert.ok(entities.shots.length > 40, 'and an arrow every fraction of it');
  // Her knives chain: one dash turns into the next without letting go.
  b.stage = 0; b.state = 'dash'; b.chain = 3; b.timer = 0; b.hit = true; player.inv = 100;
  updateBoss(.02);
  assert.equal(b.state, 'dashWind', 'she turns on the spot');
  assert.equal(b.chain, 2, 'with one fewer to come');
  b.stage = 2;
  draw();
  entities.shots = [];
  // Her marks on the floor are the truth: the hook runs out down the lane and takes
  // only what is standing in it when the head arrives.
  const castHook = () => { b.state = 'grab'; b.hit = false; b.timer = whip.hookTime; b.hookReach = 0; b.dx = 1; b.dy = 0; };
  const runHook = () => { for (let i = 0; i < 40 && b.state === 'grab'; i++) updateBoss(.02); };
  castHook();
  player.inv = 0; player.roll = 0; player.hp = state.maxHp();
  player.x = b.x + 120; player.y = b.y + 90;
  runHook();
  assert.equal(b.state, 'recover', 'well outside the lane, the hook runs out and finds nothing');
  const standing = { x: b.x + 120, y: b.y };
  castHook();
  player.inv = 0; player.roll = 0;
  player.x = standing.x; player.y = standing.y;
  updateBoss(.02);
  assert.equal(b.state, 'grab', 'the head has not reached him yet');
  runHook();
  assert.equal(b.state, 'hold', 'standing in it, she has him');
  assert.equal(game.scripted?.hold, true, 'and he cannot move');
  for (let i = 0; i < 90; i++) updateBoss(.035);
  assert.equal(game.scripted, null, 'the throw ends and he is his own again');
  // A windup of hers can be caught on the blade like any other.
  b.state = 'lashWind'; b.timer = .1; b.x = player.x + 60; b.y = player.y;
  player.parryLock = 0;
  assert.equal(combat.parryTarget(), b, 'her windups can be parried');
  assert.equal(combat.parry(), true);
  assert.equal(b.state, 'recover');
  player.inv = 100;
  entities.shots = [];
  b.state = 'stalk';
  cut();
  assert.equal(b.hp, 0, 'the third round is the last');
  assert.equal(progress.bosses.vaelira, true);
  story.caveStone();
  assert.ok(document.getElementById('dialogBody').textContent.includes('HADES'), 'the first fragment');
  closeDialog();
  leaveBoss();
  assert.equal(game.region, 'echo');
  assert.ok(player.y > 900, 'back at the cave mouth');
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('Orrin’s family: the hatch under the nest, the reunion, and what the grove becomes', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  progress.orrin = 1;                          // he has already asked
  progress.bosses = {};
  progress.slain = progress.slain.filter(id => id !== 'sporemother');
  const fell = (f, id, scene) => { standBeside(f); game.scene = scene; f.hp = 1; player.cool = 0; player.st = 100; attack(); updateAttack(.14); assert.ok(progress.slain.includes(id), `${id} falls`); };
  // Nothing to open while she is still on it.
  rooms.enterRoom('sporehouse');
  assert.equal(grove.trapdoorReady(), false, 'the nest is still occupied');
  draw();
  fell(entities.enemies[0], 'sporemother', 'room');
  rooms.enterRoom('sporehouse');
  assert.equal(grove.trapdoorReady(), true, 'with her off it, the hatch is there');
  draw();
  // It is reachable from the middle of the room, and opening it frees them.
  player.x = grove.TRAPDOOR.x; player.y = grove.TRAPDOOR.y + 20;
  game.scene = 'room';
  const hatch = findNear();
  assert.equal(hatch?.type, 'trapdoor', 'standing on it, that is what E does');
  game.near = hatch;
  interact();
  choices()[0].onclick();
  assert.equal(progress.orrin, 2, 'they are out');
  assert.equal(grove.trapdoorReady(), false, 'and the hatch has nothing left to give');
  // Back in the grove, walking to the fire plays the reunion exactly once.
  rooms.leaveRoom();
  game.scene = 'wild';
  player.x = grove.FAMILY_CAMP.x; player.y = grove.FAMILY_CAMP.y + 40;
  update(.035);
  assert.equal(progress.orrin, 3, 'he goes to them');
  update(.035);
  assert.equal(progress.orrin, 3, 'and it does not play twice');
  // They are three people now, standing beside Orrin rather than across the road.
  const orrin = world.npcs.find(n => n.type === 'peddler');
  const kin = ['wife', 'boy', 'girl'].map(t => world.npcs.find(n => n.type === t));
  assert.ok(kin.every(k => k && grove.gateOpen(k.gate)), 'all three are out');
  assert.ok(kin.every(k => Math.hypot(k.x - orrin.x, k.y - orrin.y) < 150), 'and they are at his elbow');
  // Neve points him at the den while Vaelira is still in it.
  game.near = kin[0];
  interact();
  assert.ok(choicesText().includes('den under the dead tree'), 'she sends him after her');
  choices()[0].onclick();
  game.near = kin[1];
  interact();
  assert.ok(document.getElementById('dialogBody').textContent.includes('Do not talk to her'), 'Tam has his own advice');
  closeDialog();
  draw();
  // The brewer keeps out of sight until the light has actually come in.
  const brewer = world.npcs.find(n => n.type === 'apothecary');
  progress.bosses.vaelira = true;
  assert.equal(grove.gateOpen(brewer.gate), false, 'killing her is not the same as the dawn');
  progress.opened.push('grove-dawn');
  assert.equal(grove.gateOpen(brewer.gate), true, 'the dawn is what brings it out');
  assert.equal(grove.groveDawned(), true);
  // And once she is dead Neve has something else to say.
  game.near = kin[0];
  interact();
  assert.ok(choicesText().includes('sky had broken'), 'she says so afterwards');
  choices()[0].onclick();
  spawnEnemies('echo');
  assert.equal(entities.enemies.length, 0, 'nothing in the grove wants a fight any more');
  draw();
  // His brews last until the next fire and no longer.
  progress.embers = 400;
  const beforeDamage = state.attackDamage(false), beforeHp = state.maxHp();
  game.near = brewer;
  interact();
  choices();                                   // his patter pages; the brews sit on the last
  const rows = document.getElementById('dialogExtra').children[1].children;
  rows[0].children[1].onclick();               // Thornmilk
  assert.equal(state.attackDamage(false), beforeDamage + 10, 'the blade bites harder');
  choices();
  document.getElementById('dialogExtra').children[1].children[2].children[1].onclick();
  assert.equal(state.maxHp(), beforeHp + 35, 'and there is more of him to lose');
  closeDialog();
  rest();
  assert.equal(boons.might, 0);
  assert.equal(state.attackDamage(false), beforeDamage, 'the fire burns the brews out');
  assert.equal(state.maxHp(), beforeHp);
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('the canopy opens once, over the world, and hands off when the light is all the way in', () => {
  world.enterRegion('echo');
  game.scene = 'wild'; game.screen = 'play'; game.dead = false; game.modal = false; game.paused = false;
  let handed = 0;
  grove.playCanopy(() => handed++);
  assert.ok(game.canopy, 'the roof is coming apart');
  draw();                                      // it paints at the very start
  for (let i = 0; i < 8; i++) { update(.2); draw(); }
  assert.ok(game.canopy.k > .3 && game.canopy.k < 1, 'part way open');
  const midway = game.canopy.k;
  for (let i = 0; i < 30 && game.canopy; i++) update(.2);
  assert.equal(game.canopy, null, 'and then it is simply open');
  assert.equal(handed, 1, 'the cards are handed exactly one cue');
  assert.ok(midway > 0, 'it opened gradually rather than snapping');
  update(.2);
  assert.equal(handed, 1, 'nothing fires again afterwards');
  // The grove's cards are their own deck, read the same way the banishment is.
  assert.ok(grove.GROVE_CARDS.length >= 3 && grove.GROVE_CARDS.every(t => typeof t === 'string' && t.length > 40));
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('the light comes in on the way out of the den, once, and the grove keeps it', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  progress.opened = progress.opened.filter(id => id !== 'grove-dawn');
  progress.bosses = {};
  let dawns = 0;
  const off = on('leftBoss', kind => { if (kind === 'vaelira' && progress.bosses.vaelira) dawns++; });
  // Walking out with her still alive changes nothing.
  enterBoss('vaelira');
  leaveBoss();
  assert.equal(dawns, 0, 'no light while she is standing');
  // Walking out having killed her is the cue.
  progress.bosses.vaelira = true;
  enterBoss('vaelira');
  leaveBoss();
  assert.equal(dawns, 1, 'climbing out is what triggers it');
  off();
  leaveBoss();
  assert.equal(dawns, 1, 'and the listener really did come off');
  // The grove itself changes, and only after the beat has actually played.
  progress.opened = progress.opened.filter(id => id !== 'grove-dawn');
  assert.equal(grove.groveDawned(), false);
  game.scene = 'wild'; game.screen = 'play';
  draw();                                      // still raining, still dark
  const dark = world.terrain;
  progress.opened.push('grove-dawn');
  assert.equal(grove.groveDawned(), true);
  // The map itself is swapped for one repainted in daylight, not filtered per frame.
  world.showDaylight(true);
  assert.notEqual(world.terrain, dark, 'a different, lighter map is being shown');
  const again = world.terrain;
  world.showDaylight(false);
  assert.equal(world.terrain, dark, 'and the painted one is still there to go back to');
  world.showDaylight(true);
  assert.equal(world.terrain, again, 'the lit map is painted once and kept');
  assert.equal(world.terrain.width, dark.width, 'same map, same size');
  assert.equal(world.terrain.height, dark.height);
  // The celebrants are only there after the light, and are pure scenery.
  assert.ok(grove.REVELLERS.length > 20, 'a crowd of them');
  assert.ok(grove.REVELLERS.every(r => r.kind === 'wolf' || r.kind === 'sporeling'), 'wolves and mushroom-folk');
  assert.ok(grove.REVELLERS.some(r => r.kind === 'wolf') && grove.REVELLERS.some(r => r.kind === 'sporeling'), 'both kinds turn up');
  assert.ok(grove.REVELLERS.every(r => r.hp === undefined), 'none of them can be fought');
  draw();                                      // the grove, celebrating
  // None of it leaks into Hearthwood, which shares the same wild renderer.
  world.enterRegion('hearthwood');
  game.scene = 'wild';
  draw();
  assert.equal(world.terrain, world.terrain, 'Hearthwood draws its own map');
  world.enterRegion('echo');
  spawnEnemies('echo');
  assert.equal(entities.enemies.length, 0, 'and the grove spawns nothing hostile any more');
  draw();                                      // bright, dry, and the caps are moving
  // The cards have art of their own rather than the banishment's.
  assert.notEqual(introArt.INTRO_SCENES, undefined);
  const introCanvas = document.createElement('canvas');
  game.introSlide = { index: 0, since: 0, deck: 'grove' };
  for (let i = 0; i < grove.GROVE_CARDS.length; i++) {
    game.introSlide.index = i;
    introArt.drawIntroScene(introCanvas.getContext('2d'), i, i * 1.3);
  }
  game.introSlide = { index: 0, since: 0, deck: 'intro' };
  introArt.drawIntroScene(introCanvas.getContext('2d'), 0, 0);
  Object.assign(progress, saved);
  world.enterRegion('hearthwood');
  spawnEnemies('hearthwood');
});

check('journeys: three saves side by side, and the old one is journey one', () => {
  const saved = structuredClone(progress);
  const wasSlot = saves.activeSlot();
  // An device that has been played before already has a journey one: the first
  // slot deliberately keeps the original key, so there is nothing to migrate.
  assert.equal(saves.slotKey(0), state.SAVE, 'journey one is the original save');
  assert.notEqual(saves.slotKey(1), state.SAVE);
  assert.notEqual(saves.slotKey(1), saves.slotKey(2));
  // Something recognisable in journey one.
  saves.setActiveSlot(0);
  state.resetProgress();
  progress.embers = 1234;
  progress.region = 'hearthwood';
  state.save();
  // Journey two starts empty and stays its own thing.
  saves.setActiveSlot(1);
  assert.equal(saves.slotSummary(1).empty, true, 'nothing there yet');
  state.resetProgress();
  progress.embers = 7;
  progress.region = 'echo';
  progress.stats.vitality = 3;
  state.save();
  assert.equal(saves.slotSummary(1).empty, false);
  assert.equal(saves.slotSummary(1).level, 4, 'summarised without loading it');
  assert.ok(saves.slotLine(1).includes('Echo Grove'));
  // Going back finds journey one exactly as it was left.
  saves.setActiveSlot(0);
  state.loadProgress();
  assert.equal(progress.embers, 1234, 'journey one is untouched');
  assert.equal(saves.slotSummary(1).embers, 7, 'and journey two still holds its own');
  assert.ok(saves.slotLine(2).includes('No journey'), 'the third is still unwritten');
  // Clearing one leaves the others, and the live one, alone.
  saves.clearSlot(1);
  assert.equal(saves.slotSummary(1).empty, true, 'journey two is gone');
  assert.equal(progress.embers, 1234, 'the live journey is not disturbed');
  assert.equal(saves.slotSummary(0).empty, false, 'nor is journey one');
  // A corrupt journey is reported empty rather than handed over and crashed into.
  localStorage.setItem(saves.slotKey(2), 'not json at all');
  assert.equal(saves.slotSummary(2).empty, true);
  assert.equal(saves.slotSummary(2).broken, true);
  localStorage.removeItem(saves.slotKey(2));
  saves.setActiveSlot(wasSlot);
  Object.assign(progress, saved);
  state.save();
});

check('a region takes none of the last one’s weather or scenery with it', () => {
  world.enterRegion('echo');
  assert.equal(world.props.rain, 1, 'the grove rains');
  assert.ok(world.props.mushrooms.length > 0, 'and has its caps');
  assert.ok(world.props.sporehouse, 'and its stalk');
  world.enterRegion('hearthwood');
  // The wilds are dry; only the grove rains, and only until its roof opens.
  assert.equal(world.props.rain, 0, 'the wilds keep their own weather, not the grove’s');
  assert.equal(world.props.mushrooms.length, 0, 'and take none of its caps');
  assert.equal(world.props.sporehouse, null, 'nor its stalk');
  assert.equal(world.props.huts.length, 0);
  assert.equal(world.props.gibbets.length, 0);
  world.enterRegion('echo');
  assert.equal(world.props.rain, 1, 'and going back the grove is heavy again');
  // A region that simply does not mention a prop gets none of it, rather than
  // inheriting whatever the last one left in the shared object.
  world.enterRegion('hearthwood');
  world.props.rack = { x: 1, y: 1 };
  world.enterRegion('hearthwood');
  assert.equal(world.props.rack, null, 'anything unmentioned is cleared, not carried over');
  spawnEnemies('hearthwood');
});

check('rain falls on the ground, not on the camera', () => {
  // The same instant, seen from two different camera positions. Every drop over
  // the ground both views share must be in the same world place in both — if the
  // rain were drawn in screen space it would slide along with the viewer.
  const t = 4.25;
  const a = scenes.rainDrops({ x: 0, y: 0, w: 640, h: 420 }, t, 1);
  const b = scenes.rainDrops({ x: 260, y: 180, w: 640, h: 420 }, t, 1);
  const key = d => `${d.x.toFixed(3)},${d.y.toFixed(3)}`;
  const inOverlap = d => d.x >= 260 && d.x <= 640 && d.y >= 180 && d.y <= 420;
  const fromA = new Set(a.filter(inOverlap).map(key));
  const fromB = new Set(b.filter(inOverlap).map(key));
  assert.ok(fromA.size >= 8, `there is rain over the shared ground (${fromA.size} drops)`);
  for (const k of fromA) assert.ok(fromB.has(k), `the drop at ${k} did not move with the camera`);
  assert.equal(fromA.size, fromB.size, 'and neither view invents drops the other lacks');
  // It still falls: the same ground a moment later is wet in different places.
  const later = scenes.rainDrops({ x: 0, y: 0, w: 640, h: 420 }, t + .05, 1);
  assert.notEqual(later.filter(inOverlap).map(key).join('|'), [...fromA].join('|'), 'and it is still moving');
  // Heavier weather means more of it.
  assert.ok(scenes.rainDrops({ x: 0, y: 0, w: 640, h: 420 }, t, 1).length
    > scenes.rainDrops({ x: 0, y: 0, w: 640, h: 420 }, t, .3).length, 'a downpour has more drops than a drizzle');
});

check('the Sunken Vault: east of the grove, shut until the thorn is out of the den', () => {
  const saved = structuredClone(progress);
  world.enterRegion('echo');
  // The east road past the den is barred while she holds it.
  progress.bosses = {};
  const east = world.exitAt(2940, 1756);
  assert.ok(east && east.to === 'sunken', 'the road east is where the den is');
  assert.equal(east.needs, 'vaelira', 'and it names what holds it shut');
  game.scene = 'wild'; game.dead = false; game.scripted = null; game.modal = false; game.paused = false;
  player.x = 2860; player.y = 1756;
  keys.add('d');
  for (let i = 0; i < 20; i++) update(.035);
  keys.clear();
  assert.equal(game.region, 'echo', 'walking into it does not cross over');
  assert.ok(player.x <= world.bounds.maxX, 'and he is pushed back onto the grove side');
  // With her down it opens, and lands him on the vault's western road.
  progress.bosses.vaelira = true;
  player.x = 2860; player.y = 1756;
  keys.add('d');
  for (let i = 0; i < 20; i++) update(.035);
  keys.clear();
  assert.equal(game.region, 'sunken', 'now the water has gone down');
  assert.ok(player.x < 400, 'arriving on the western road');
  // The vault is a real region: its own map, bounds, fire and way back.
  assert.equal(world.size.w, sunken.SUNKEN_W);
  assert.equal(world.size.h, sunken.SUNKEN_H);
  assert.equal(world.fire.x, sunken.SUNKEN.fire.x, 'one fire, on the shelf');
  assert.ok(world.npcs.some(n => n.type === 'fire'), 'and it can be rested at');
  assert.ok(world.trees.length > 20, 'dead palms on the sand');
  assert.equal(world.props.rain, 0, 'the vault is not the grove');
  spawnEnemies('sunken');
  assert.ok(entities.enemies.length >= 12, 'and things are walking the causeways');
  draw();
  // The water is water: you cannot walk the lake, but the causeway over it holds.
  assert.equal(world.inRiver(1150, 1000), true, 'the open lake is deep');
  assert.equal(world.inRiver(1900, 1700), true, 'on both sides of the causeway');
  assert.equal(world.inRiver(sunken.SUNKEN.throne.x, sunken.SUNKEN.throne.y - 200), false, 'the throne platform is not');
  assert.equal(sunken.onCauseway(1500, 1800), true, 'the southern arm is a deck');
  assert.equal(world.inRiver(1500, 1800), false, 'and a deck does not drown him');
  // Every named place stands on ground he can actually reach.
  for (const [name, p] of [['the fire', sunken.SUNKEN.fire], ['the depths', sunken.SUNKEN.depths],
    ['the halls', sunken.SUNKEN.halls], ['the village', sunken.SUNKEN.village], ['the gate', sunken.SUNKEN.gate]]) {
    assert.equal(world.inRiver(p.x, p.y), false, `${name} is on dry footing`);
  }
  // Follow every deck continuously, including its joins to the court.
  for (const route of sunken.SUNKEN_PATHS) for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 5);
    for (let j = 0; j <= steps; j++) {
      const x = ax + (bx - ax) * j / steps, y = ay + (by - ay) * j / steps;
      if (Math.hypot(x - sunken.SUNKEN.fire.x, y - sunken.SUNKEN.fire.y) < 45) continue;
      assert.equal(world.blocked(x, y, 12), false, `clear vault deck at ${x},${y}`);
    }
  }
  for (let y = 1000; y <= 1680; y += 5)
    assert.equal(world.inRiver(1500, y), false, 'north and south decks meet the throne');
  assert.ok(world.trees.filter(t => t.bush).length >= 100, 'saltbush grows off the routes');
  assert.ok(world.props.critters.some(k => k.kind === 'lizard'), 'desert lizards inhabit the sand');
  // The vault's people, not the grove's beasts.
  const kinds = new Set(entities.enemies.map(e => e.kind));
  assert.ok(['rogue', 'bandit', 'corsair'].every(k => kinds.has(k)), 'rogues, bandits and corsairs');
  assert.ok(!['wolf', 'sporeling', 'frog'].some(k => kinds.has(k)), 'and nothing that belongs in the grove');
  // Spawn placement is independent of this environment/flow pass.
  // Things move under the water, and only under the water.
  assert.ok(world.props.swimmers.length > 20, 'the bowl is not empty');
  assert.ok(world.props.swimmers.some(w => w.kind === 'shark'), 'and not all of it is small');
  for (const w of world.props.swimmers) {
    // Every one of them circles a patch that stays in open water all the way round.
    for (let i = 0; i < 8; i++) {
      const t = i / 8 * Math.PI * 2;
      assert.equal(world.inRiver(w.x + Math.cos(t) * w.r, w.y + Math.sin(t) * w.r * .62), true,
        'a swimmer never circles out onto the stone');
    }
  }
  // The village is built of things he has to walk around.
  assert.ok(sunken.SUNKEN.houses.length >= 6, 'a village worth the name');
  for (const b of sunken.SUNKEN.houses) assert.equal(world.inRiver(b.x, b.y), false, 'and all of it on sand');
  assert.ok(world.blocked(sunken.SUNKEN.houses[0].x, sunken.SUNKEN.houses[0].y), 'houses are solid');
  // Nothing has taken root on the throne's court.
  for (const t of world.trees)
    assert.ok(Math.hypot(t.x - sunken.SUNKEN.throne.x, (t.y - sunken.SUNKEN.throne.y) / .78) > sunken.SUNKEN.throne.r,
      'no palm is standing on the throne platform');
  // And the way back west to the grove.
  const back = world.exitAt(10, 1500);
  assert.ok(back && back.to === 'echo', 'the road home is on the west edge');
  world.enterRegion('hearthwood');
  Object.assign(progress, saved);
  spawnEnemies('hearthwood');
});

check('vault terraces connect through stairs and leave room across their streets', () => {
  const saved = structuredClone(progress);
  world.enterRegion('sunken');
  for (const s of sunken.SUNKEN_STAIRS) {
    for (let y = s.y - 24; y <= s.y + s.h + 24; y += 4) {
      assert.equal(world.blocked(s.x, y, 15), false, 'a stair is usable across its full rise');
    }
    assert.equal(world.blocked(s.x + s.w / 2 + 24, s.y + s.h / 2, 10), true,
      'the retaining face beside a stair cannot be walked through');
  }
  for (const route of sunken.SUNKEN_PATHS) for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i];
    const len = Math.hypot(bx - ax, by - ay), steps = Math.ceil(len / 16);
    for (let j = 0; j <= steps; j++) for (const side of [-24, 0, 24]) {
      const x = ax + (bx - ax) * j / steps - (by - ay) / len * side;
      const y = ay + (by - ay) * j / steps + (bx - ax) / len * side;
      if (Math.hypot(x - sunken.SUNKEN.fire.x, y - sunken.SUNKEN.fire.y) < 60) continue;
      assert.equal(world.blocked(x, y, 15), false, `room along both sides of the street at ${x},${y}`);
    }
  }
  // Flood from the arrival gate through actual collision, not just drawn routes.
  const step = 20, cols = sunken.SUNKEN_W / step, rows = sunken.SUNKEN_H / step;
  const seen = new Uint8Array(cols * rows), pass = new Uint8Array(cols * rows);
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++)
    pass[y * cols + x] = !world.blocked(x * step, y * step, 15);
  const start = 120 * cols + 75, queue = [start]; seen[start] = 1;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i], x = id % cols, y = Math.floor(id / cols);
    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      const next = ny * cols + nx;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || seen[next] || !pass[next]) continue;
      seen[next] = 1; queue.push(next);
    }
  }
  for (const [name, x, y] of [['grove entrance',100,1500], ['village',580,820],
    ['upper stair',1560,300], ['fire approach',1640,600], ['court',1500,1290],
    ['gardens',2300,950], ['quay',2360,1780], ['western bank',700,1500]]) {
    assert.equal(seen[Math.round(y/step)*cols+Math.round(x/step)], 1, `${name} connects to the gate`);
  }
  world.enterRegion('hearthwood'); Object.assign(progress, saved);
});

check('the causeway holds: he cannot walk off the stone into the water', () => {
  const saved = structuredClone(progress);
  progress.bosses.vaelira = true;
  world.enterRegion('sunken');
  game.scene = 'wild'; game.dead = false; game.scripted = null; game.modal = false; game.paused = false;
  const PAINTED_HALF = sunken.CAUSEWAY_HALF + 4;
  // The invariant that matters: everywhere he is allowed to stand was painted as
  // land. Collision shrinks the land by its padding, so standing room can only
  // ever be a subset of the stone — swept over the whole region, not sampled.
  let walkableInLake = 0;
  for (let x = 60; x < sunken.SUNKEN_W; x += 37) {
    for (let y = 60; y < sunken.SUNKEN_H; y += 37) {
      const standable = !sunken.inSunkenWater(x, y, 6);
      if (!standable) continue;
      assert.equal(sunken.inSunkenWater(x, y, 0), false, `painted water at ${x},${y} can be stood on`);
      if (Math.hypot((x - 1500) / 1090, (y - 1300) / 900) < 1) walkableInLake++;
    }
  }
  assert.ok(walkableInLake > 200, 'and there is a real network of deck out over the lake');
  // The arms themselves have deck to stand on, and it runs out.
  for (const [x, y] of [[1500, 1750], [1500, 900], [1500, 1950]]) {
    let reach = 0;
    while (reach < 80 && !world.inRiver(x + reach, y)) reach++;
    assert.ok(reach > 6, `there is deck to stand on at ${x},${y} (${reach})`);
    assert.ok(reach < PAINTED_HALF, `and it ends inside the kerb at ${x},${y} (${reach} of ${PAINTED_HALF})`);
  }
  // And walking hard at the edge does not put him in the lake.
  player.x = 1500; player.y = 1750;
  player.hp = state.maxHp(); player.st = 100;
  keys.add('d');
  for (let i = 0; i < 60; i++) update(.035);
  keys.clear();
  assert.equal(world.inRiver(player.x, player.y), false, 'he is still on the causeway');
  assert.ok(player.x - 1500 < PAINTED_HALF, 'and did not slide past the kerb');
  // The same going the other way, and north-south across an arm.
  player.x = 1500; player.y = 1750;
  keys.add('a');
  for (let i = 0; i < 60; i++) update(.035);
  keys.clear();
  assert.equal(world.inRiver(player.x, player.y), false, 'nor off the other side');
  world.enterRegion('hearthwood');
  Object.assign(progress, saved);
  spawnEnemies('hearthwood');
});

check('the character sheet figure renders without disturbing the player', () => {
  respawn();
  player.face = 1.9;
  player.walkPhase = 4.2;
  player.moving = true;
  drawWandererFigure(ctx, 108, 132);
  assert.equal(player.face, 1.9, 'pose is restored after drawing');
  assert.equal(player.walkPhase, 4.2);
  assert.equal(player.moving, true);
});

// --- app shell ----------------------------------------------------------------
check('the title screen animates the world but runs no gameplay', () => {
  game.screen = 'title';
  game.cinematic = { x: 700, y: 600 };
  respawn();
  game.screen = 'title';
  const before = { x: player.x, y: player.y, time: game.time };
  keys.add('d');
  for (let i = 0; i < 10; i++) update(.03);
  keys.clear();
  assert.equal(player.x, before.x, 'the wanderer does not move behind the menu');
  assert.ok(game.time > before.time, 'but the world keeps breathing');
  draw();
  game.screen = 'play';
  game.cinematic = null;
});

check('gameplay input is ignored off the play screen', () => {
  game.screen = 'title';
  cancelAttack();
  player.st = 100;
  entities.enemies.forEach(e => (e.hp = 0));
  const target = entities.enemies[0];
  target.hp = 200;
  target.x = player.x + 40;
  target.y = player.y;
  attack();
  updateAttack(.2);
  assert.equal(target.hp, 200, 'no swings land from the title screen');
  game.screen = 'play';
});

check('every icon renders and caches', () => {
  assert.ok(icons.ICON_NAMES.length >= 18);
  for (const name of icons.ICON_NAMES) {
    const url = icons.iconUrl(name);
    assert.equal(typeof url, 'string', `${name} produced a data URI`);
  }
  assert.equal(icons.iconUrl('flask'), icons.iconUrl('flask'), 'second call is cached');
  assert.throws(() => icons.iconUrl('not-a-real-icon'), /Unknown icon/);
});

check('platform detection falls back cleanly with no native shell', () => {
  assert.equal(platform.shell(), 'browser');
  assert.equal(platform.canQuit(), false);
  assert.equal(typeof platform.isApp(), 'boolean');
  assert.equal(typeof platform.isTouch(), 'boolean');
  platform.markDocument();
  assert.ok(document.documentElement.classList.contains('shell-browser'));
});

check('no stylesheet or markup reaches for the network', async () => {
  const fs = await import('node:fs');
  for (const file of ['style.css', 'index.html']) {
    const text = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.equal(/@import\s+url\(['"]?https?:/.test(text), false, `${file} has no remote @import`);
    assert.equal(/(src|href)=['"]https?:\/\//.test(text), false, `${file} has no remote asset`);
  }
});

check('the pixel scale follows height, not width', () => {
  // A phone in landscape is wide and short; scaling by width used to leave only
  // ~230 world units of vertical view.
  const phone = renderer.autoScale(369);
  const desktop = renderer.autoScale(760);
  assert.ok(phone < desktop, 'a short screen pulls the camera back');
  assert.equal(desktop, 1.6, 'desktop framing is unchanged');
  assert.ok(369 / phone > 400, 'the phone sees over 400 world units vertically');
  assert.ok(369 / phone < 700, 'but not absurdly far out');
});

check('zoom steps scale the view and persist', () => {
  const { ZOOM_STEPS, setZoom, zoomStep, settings } = settingsMod;
  assert.equal(zoomStep().key, 'normal');
  const seen = ZOOM_STEPS.map(z => z.factor);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] < seen[i - 1], 'steps pull back in order');
  assert.equal(setZoom('far'), true);
  assert.equal(zoomStep().key, 'far');
  assert.equal(setZoom('not-a-step'), false, 'unknown steps are rejected');
  assert.equal(settings.zoom, 'far');
  settingsMod.loadSettings();
  assert.equal(settings.zoom, 'far', 'the choice survives a reload');
  setZoom('normal');
});

console.log(failures ? `\n${failures} FAILING CHECK(S)` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
