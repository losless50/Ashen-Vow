import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom();
globalThis.location = { search: '' };
const state = await import('../src/core/state.js');
const { game, player, progress, defaults, SAVE } = state;
const saved = { ...structuredClone(defaults), quest: 6, region: 'echo', fires: ['hearthwood', 'echo'], embers: 123 };
localStorage.setItem(SAVE, JSON.stringify(saved));
await import('../src/main.js');
const world = await import('../src/world/world.js');
const { crossTo, rest, respawn } = await import('../src/systems/player.js');
const { enterBoss } = await import('../src/systems/boss.js');
const { entities } = await import('../src/systems/entities.js');
const { hurt } = await import('../src/systems/combat.js');
const { goToScreen } = await import('../src/ui/screens.js');

function atFire(region) {
  assert.equal(game.region, region);
  assert.equal(game.scene, 'wild');
  assert.ok(Math.hypot(player.x - world.fire.x, player.y - world.fire.y) < 80);
  assert.equal(world.inRiver(player.x, player.y), false);
  assert.equal(player.hp, state.maxHp());
  assert.equal(player.flasks, state.maxFlasks());
  assert.equal(game.dead, false);
  assert.equal(game.scripted, null);
}

atFire('echo');
assert.equal(progress.embers, 123);
console.log('PASS cold startup restores the saved campfire and full health');

await goToScreen('play', { instant: true });
crossTo('hearthwood', { x: 700, y: 900 });
assert.equal(progress.region, 'echo');
state.save();
assert.equal(JSON.parse(localStorage.getItem(SAVE)).region, 'echo');
respawn();
atFire('echo');
crossTo('hearthwood', { x: 700, y: 900 });
rest();
crossTo('echo', { x: 1400, y: 120 });
respawn();
atFire('hearthwood');
console.log('PASS crossing regions preserves the checkpoint until another fire is rested at');

crossTo('echo', { x: 1400, y: 300 });
rest();
enterBoss('vaelira');
game.scripted = { hold: true };
entities.boss.state = 'hold';
entities.boss.grabbed = true;
entities.shots.push({ kind: 'arrow' });
player.inv = 0;
hurt(99999, player.x, player.y);
assert.equal(game.dead, true);
assert.equal(player.hp, 0);
const lost = structuredClone(progress.lost);
const back = document.getElementById('dialogActions').children[1];
back.onclick();
await new Promise(r => setTimeout(r, 400));
assert.equal(game.screen, 'title');
await goToScreen('play', { instant: true });
atFire('echo');
assert.equal(state.playing(), true);
assert.equal(entities.boss, null);
assert.equal(entities.shots.length, 0);
assert.deepEqual(progress.lost, lost);
assert.equal(progress.embers, 0);
console.log('PASS death during Vaelira grab → Back to title → Continue restores control at the fire and preserves dropped embers');

player.x += 25;
player.hp -= 10;
const before = { x: player.x, hp: player.hp };
await goToScreen('title', { instant: true });
await goToScreen('play', { instant: true });
assert.equal(player.x, before.x);
assert.equal(player.hp, before.hp);
console.log('PASS returning from the title while alive preserves the active session');

const { SUNKEN_FIRES } = await import('../src/world/sunken.js');
progress.bosses.vaelira = true;
for (const f of SUNKEN_FIRES) {
  crossTo('sunken', { x: f.x, y: f.y + 46 });
  const site = world.npcs.find(n => n.id === f.id);
  rest(site);
  assert.equal(progress.restSites.sunken, f.id);
  crossTo('echo', { x: 1400, y: 600 });
  respawn({ silent: true });
  assert.equal(game.region, 'sunken');
  assert.equal(player.x, f.x);
  assert.equal(player.y, f.y + 46);
  assert.equal(world.blocked(player.x, player.y), false);
  state.save();
  state.resetProgress();
  state.loadProgress();
  world.enterRegion('hearthwood');
  respawn({ silent: true });
  assert.equal(world.fire.id, f.id, 'a saved named fire survives a reload');
  assert.equal(player.x, f.x);
}
progress.restSites.sunken = 'removed-fire';
world.enterRegion('sunken');
assert.equal(world.fire.x, SUNKEN_FIRES[0].x, 'unknown fire ids fall back to the temple');
console.log('PASS all vault campfires restore supplies and persist their individual return points');
