// Rooms: small closed arenas off the wild map where a named Fallen waits —
// the Sporemother's treehouse inside a giant mushroom, Mycel's burrow under
// the hollow. They use the boss arena's bounds and the ordinary creature AI.
import { game, player, progress } from '../core/state.js';
import { entities, ENEMY_KINDS } from './entities.js';
import { cancelAttack } from './combat.js';
import { clearAllEffects } from './effects.js';
import { spawnEnemies } from './entities.js';
import { playMusic, playAmbience, tone, worldTrack, bossTrack, worldAmbience } from './audio.js';
import { notify } from '../ui/hud.js';

/** The way back out, drawn by render/rooms.js at the same spot. */
export const ROOM_EXIT = { x: 750, y: 840, type: 'roomExit', name: 'Climb back down' };

export const ROOMS = {
  sporehouse: {
    name: 'THE SPOREHOUSE', sub: 'Inside the great mushroom', exitName: 'Climb back down', region: 'echo',
    door: { x: 2680, y: 766 },
    spawn: { id: 'sporemother', x: 750, y: 620, kind: 'sporeling', skin: 'mother', once: true,
      elite: { name: 'The Sporemother', title: 'What the bog grew from its dead', hp: 1152, damage: 87, scale: 1.75, embers: 240, radius: 24, hitRange: 110, chase: 400 } },
  },
  burrow: {
    name: 'MYCEL’S CAVE', sub: 'Mushroom-light under the hollow', exitName: 'Back to the hollow', region: 'echo',
    door: { x: 1190, y: 1716 },
    spawn: { id: 'mycel', x: 750, y: 575, kind: 'wolf', skin: 'grafted', once: true,
      elite: { name: 'Mycel, the Grafted', title: 'A wolf the grove grew through', hp: 936, damage: 102, scale: 1.45, embers: 225, radius: 16, spore: true, chase: 400 } },
  },
};

export const roomSpec = () => ROOMS[game.room];

/** Steps into a room. The Fallen inside is spawned unless it is already dead. */
export function enterRoom(key) {
  const room = ROOMS[key];
  cancelAttack();
  clearAllEffects();
  game.scene = 'room';
  game.room = key;
  ROOM_EXIT.name = room.exitName;
  player.x = 750;
  player.y = 760;
  player.inv = 1;
  entities.wave = [];
  entities.hazards = [];
  const s = room.spawn;
  const k = { ...ENEMY_KINDS[s.kind], ...s.elite };
  entities.enemies = progress.slain.includes(s.id) ? [] : [{ ...s, homeX: s.x, homeY: s.y, hp: k.hp, max: k.hp, cool: 1, state: 'idle', timer: 0, hit: false }];
  playAmbience(null, 2);
  if (entities.enemies.length) { playMusic(bossTrack(room.region), 1.5); notify(`${s.elite.name} is here.`); tone(90, .6, 'triangle'); }
  if (entities.enemies.length) { entities.enemies[0].monster = false; entities.enemies[0].risen = false; }
  else notify('Nothing stirs. It is over.');
}

/** Back to the grove, at the room's door, with the grove's creatures woken again. */
export function leaveRoom() {
  const room = roomSpec();
  cancelAttack();
  clearAllEffects();
  game.scene = 'wild';
  player.x = room.door.x;
  player.y = room.door.y + 30;
  player.inv = 1;
  game.room = null;
  entities.hazards = [];
  spawnEnemies(game.region);
  playMusic(worldTrack(room.region), 3);
  playAmbience(worldAmbience(room.region), 3);
}
