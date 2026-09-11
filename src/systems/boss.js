import { game, player, progress, save } from '../core/state.js';
import { entities } from './entities.js';
import { hurt, cancelAttack } from './combat.js';
import { burst } from './effects.js';
import { dismissHerald, restHerald } from './herald.js';
import { makeVaelira, updateVaelira, tickVaelira, nextStage, vaeliraHurt, clearVaelira, vaeliraDefeated, STAGES } from './vaelira.js';
import { makeTandem, updateTandem, tandemLethal, tandemHurt, clearTandem, tandemDefeated, tandemName } from './tandem.js';
import { notify } from '../ui/hud.js';
import { emit } from '../core/events.js';
import { tone, playMusic, playAmbience, sample, worldTrack, bossTrack, worldAmbience } from './audio.js';

/** The southern arch back to the wilds, drawn in render/scenes.js at the same spot. */
export const BOSS_EXIT = { x: 750, y: 840, type: 'exit', name: 'Return to the wilds' };

/**
 * Every main boss shares the Warden's state machine — stalk, a telegraphed
 * lunge, a telegraphed ring, a recovery — and differs in these numbers, its
 * arena and its sprite. `slash` is the lunge, `slam` the ring.
 */
export const BOSSES = {
  warden: {
    name: 'THE HOLLOW WARDEN', hp: 480, speed: [58, 79], slash: 27, slam: 32, lungeSpeed: 250, embers: 150,
    arena: 'sanctuary', region: 'hearthwood', exit: { x: 800, y: 290 },
    rise: 'The Hollow Warden rises. Watch its windup.',
    tells: { slashWind: 'A blade rises — prepare to roll', slamWind: 'The earth trembles — roll through the ring', recover: 'The Warden falters — strike now', phase2: 'An old flame burns brighter', idle: 'Guardian of the old sanctuary' },
  },
  vaelira: {
    name: 'VAELIRA, THORN OF THE GROVE', embers: 660,
    arena: 'cave', region: 'echo', exit: { x: 2450, y: 1900 },
    rise: 'A woman rises out of the dark, and smiles. “You came all this way. For me?”',
    // Three rounds, each with her health full again and a different weapon in hand.
    stages: true,
    make: makeVaelira,
    update: (dt, b) => { updateVaelira(dt, b); tickVaelira(dt, b); },
    onLethal: nextStage,
    onHurt: vaeliraHurt,
    // She has her own last words; no beast's roar over them.
    roar: false,
    onLeave: clearVaelira,
    onDeath: vaeliraDefeated,
    tells: {
      shift: 'She heals as she changes hands — nothing will touch her now',
      dashWind: 'Two rushes — sidestep the marked lane',
      dash: 'One more rush — watch the next lane',
      blinkWind: 'She will land in the ring, then raise her knives',
      backstepWind: 'She wants the room back',
      backstep: 'She gives ground',
      flurryWind: 'Both knives up — back out of her reach',
      flurry: 'Two planted cuts — stay outside the ring',
      lashWind: 'The whip goes back — the arc is wide, get behind her',
      lash: 'The whip comes round',
      grabWind: 'The hook is committed — sidestep or roll across the line',
      grab: 'The hook is coming down the line',
      hold: 'The wall is marked — she will be open after the throw',
      throw: 'Recover your footing, then close in',
      volleyWind: 'She draws — five arrows, spread',
      snipeWind: 'One arrow, aimed — do not be standing there',
      ultimateWind: 'She plants her feet and turns — the whole room is the target',
      ultimate: 'A turn and a quarter of arrows — there is no gap to wait in',
      recover: 'She is open — strike now',
      idle: 'What the grove made of its warden',
    },
  },
  tandem: {
    name: 'THE TWO ON THE THRONE', embers: 900,
    arena: 'vault', region: 'sunken', exit: { x: 1500, y: 1500 },
    rise: 'Two things are down here. One of them stands up. “Off my chair.”',
    // Two bodies at once, then one made out of both of them.
    stages: true,
    make: makeTandem,
    update: updateTandem,
    onLethal: tandemLethal,
    onHurt: tandemHurt,
    onLeave: clearTandem,
    onDeath: tandemDefeated,
    // The captain has his own mouth on him; no beast's roar over it.
    roar: false,
    /** The bar names the body the fight is currently about. */
    barName: tandemName,
    tells: {
      slashWind: 'The cutlass is already moving — three cuts, not one',
      slash: 'Cuts coming — get out of his reach, not behind him',
      cleaveWind: 'He winds the cutlass right back — roll through the lane',
      cleave: 'He comes down the line',
      bonesWind: 'He is throwing his crew at you — a fan, wide',
      blunderbussWind: 'The blunderbuss comes level — anywhere but in front',
      cannonWind: 'The gun in its chest is loaded — the marked ground goes up',
      pincerWind: 'Both claws open — get beside it, not in front',
      pincer: 'The claws come round',
      stingWind: 'The tail is up — the marked ground takes venom with it',
      sting: 'The tail comes down',
      sprayWind: 'It rears to spit — the floor it lands on stays poisoned',
      pounceWind: 'It is coming off the floor — the ground it lands on is poisoned',
      pounce: 'It is in the air',
      broodWind: 'Its back is opening — get away from it',
      brood: 'The brood is out. Kill them first',
      burrowWind: 'It has gone under the marked ground — move off it',
      skitterWind: 'It sets itself to run past',
      chargeWind: 'It plants six legs — the lane is marked',
      charge: 'It comes down the lane',
      sweepWind: 'The claws go wide — roll through the ring',
      molt: 'The shell is splitting — it comes out faster every time',
      absorb: 'It is taking him into itself. Nothing you do now matters',
      fallen: 'The captain is down',
      recover: 'It is open — strike now',
      idle: 'Two on one chair, and both of them swinging',
    },
  },
};

export const bossSpec = () => BOSSES[entities.boss?.kind || 'warden'];
export { STAGES as BOSS_STAGES };

export function enterBoss(kind = 'warden') {
  const spec = BOSSES[kind];
  cancelAttack();
  game.scene = 'boss';
  player.x = 750;
  player.y = 740;
  player.inv = 1;
  entities.wave = [];
  entities.shots = [];
  playAmbience(null, 2);
  if (kind === 'warden' && progress.won) {
    // The crown stays where it fell; the Herald keeps the chamber lit.
    entities.boss = { kind, x: 750, y: 585, hp: 0, max: spec.hp, state: 'stalk', timer: 0, phase: 2, hit: false, dx: 0, dy: 0, combo: 0 };
    restHerald();
    notify('The sanctuary is quiet. The Herald waits over the altar.');
    tone(520, .5, 'sine');
    return;
  }
  // Assigned onto the made object rather than spread into a copy: a boss with
  // more than one body points at itself, and a shallow copy severs that.
  entities.boss = spec.make
    ? Object.assign(spec.make(), { kind })
    : { kind, x: 750, y: 585, hp: spec.hp, max: spec.hp, state: 'stalk', timer: 1.5, phase: 1, hit: false, dx: 0, dy: 0, combo: 0 };
  playMusic(bossTrack(spec.region), 1.5);
  if (kind === 'warden' && progress.quest === 3) progress.quest = 4;
  save();
  notify(spec.rise);
  tone(90, .6, 'triangle');
}

export function leaveBoss() {
  const spec = bossSpec();
  const kind = entities.boss?.kind || 'warden';
  spec.onLeave?.(entities.boss);
  cancelAttack();
  dismissHerald();
  playMusic(worldTrack(spec.region), 3);
  playAmbience(worldAmbience(spec.region), 3);
  game.scene = 'wild';
  player.x = spec.exit.x;
  player.y = spec.exit.y;
  entities.wave = [];
  emit('leftBoss', kind);
}

export function updateBoss(dt) {
  const b = entities.boss, spec = bossSpec();
  // A boss with its own machine drives itself; the rest share the Warden's.
  if (spec.update) { spec.update(dt, b); return; }
  const d = Math.hypot(player.x - b.x, player.y - b.y);
  b.timer -= dt;

  if (b.hp < b.max * .5 && b.phase === 1) {
    b.phase = 2;
    notify(b.kind === 'warden' ? 'The Warden’s flame awakens. Its attacks are faster.' : 'The light in its ribs flares. It moves faster.');
    burst(b.x, b.y, b.kind === 'warden' ? '#efa565' : '#6fd6b0', 30);
  }

  if (b.state === 'stalk') {
    if (d > 68) {
      b.x += (player.x - b.x) / d * spec.speed[b.phase === 2 ? 1 : 0] * dt;
      b.y += (player.y - b.y) / d * spec.speed[b.phase === 2 ? 1 : 0] * dt;
    }
    if (b.timer <= 0) {
      b.combo++;
      b.state = b.combo % 3 === 0 ? 'slamWind' : 'slashWind';
      // Most attacks are announced: one voice for the lunge, another for the ring. Hushmaw's are lower.
      if (Math.random() < .65) sample(b.state === 'slamWind' ? 'wardenRoar2' : 'wardenRoar1', .7, (b.phase === 2 ? .94 : 1) * (b.kind === 'warden' ? 1 : .72));
      b.timer = b.phase === 2 ? .7 : 1.05;
      b.hit = false;
      b.dx = (player.x - b.x) / (d || 1);
      b.dy = (player.y - b.y) / (d || 1);
    }
  } else if (b.state === 'slashWind' && b.timer <= 0) {
    b.state = 'slash';
    b.timer = .28;
    tone(120, .2, 'sawtooth');
  } else if (b.state === 'slash') {
    b.x += b.dx * spec.lungeSpeed * dt;
    b.y += b.dy * spec.lungeSpeed * dt;
    if (d < 88 && !b.hit && player.inv <= 0) { hurt(spec.slash, b.x, b.y); b.hit = true; }
    if (b.timer <= 0) { b.state = 'recover'; b.timer = b.phase === 2 ? .65 : 1.05; }
  } else if (b.state === 'slamWind' && b.timer <= 0) {
    b.state = 'recover';
    b.timer = 1.1;
    entities.wave.push({ x: b.x, y: b.y, r: 15, life: 1.25, hit: false });
    game.shake = 7;
    tone(65, .3, 'triangle');
  } else if (b.state === 'recover' && b.timer <= 0) {
    b.state = 'stalk';
    b.timer = b.phase === 2 ? .65 : 1.1;
  }

  b.x = Math.max(505, Math.min(995, b.x));
  b.y = Math.max(305, Math.min(775, b.y));

  for (const w of entities.wave) {
    w.r += 190 * dt;
    w.life -= dt;
    const wd = Math.hypot(player.x - w.x, player.y - w.y);
    if (Math.abs(wd - w.r) < 17 && !w.hit && player.inv <= 0) { hurt(spec.slam, w.x, w.y); w.hit = true; }
  }
  entities.wave = entities.wave.filter(w => w.life > 0);
}
