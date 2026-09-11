import { game, player, progress, save, maxHp, weapon, playing } from '../core/state.js';
import { npcs } from './world.js';
import { openMap } from '../ui/travel.js';
import { BOSS_EXIT, enterBoss, leaveBoss } from '../systems/boss.js';
import { HERALD_SPOT } from '../systems/herald.js';
import { ROOM_EXIT, enterRoom, leaveRoom } from '../systems/rooms.js';
import { entities, allSlain, ECHO_FALLEN } from '../systems/entities.js';
import { heraldShop } from '../ui/story.js';
import { own, equipWeapon, equipArmor, wearRelic } from '../systems/inventory.js';
import { rest } from '../systems/player.js';
import { showDialog, showConversation, closeDialog } from '../ui/dialogs.js';
import { burst } from '../systems/effects.js';
import { element } from '../ui/dom.js';
import { kindleMenu, statsSheet, shopRows } from '../ui/menus.js';
import { WEAPONS, FORGEABLE, BUILDINGS, TOOLS, BLADE_MAX, costLabel, canAfford, payCost } from '../core/gear.js';
import { notify } from '../ui/hud.js';
import { tone } from '../systems/audio.js';
import { TRAPDOOR, trapdoorReady, freeFamily, gateOpen } from './grove.js';
import { boons } from '../core/state.js';

const REACH = { gate: 87, quarrySign: 70, default: 62 };

/** The single closest thing the player could press E on right now. */
export function findNear() {
  const choices = game.scene === 'wild' ? npcs
    : game.scene === 'room' ? [ROOM_EXIT]
    : entities.herald?.landed && progress.blessed ? [BOSS_EXIT, HERALD_SPOT] : [BOSS_EXIT];
  return choices
    .concat(trapdoorReady() ? [TRAPDOOR] : [])
    .filter(n => !n.gate || gateOpen(n.gate))
    .filter(n => Math.hypot(n.x - player.x, n.y - player.y) < (REACH[n.type] ?? REACH.default))
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] || null;
}

const HANDLERS = {
  exit: () => { leaveBoss(); notify('The warmth of home is waiting.'); },
  gate: sanctuaryGate,
  cave: caveMouth,
  throne: thronesStair,
  chest: openChest,
  ladder: () => { enterRoom('sporehouse'); },
  burrow: () => { enterRoom('burrow'); },
  roomExit: () => { leaveRoom(); notify('Back under the trees.'); },
  peddler,
  trapdoor,
  apothecary,
  wife, boy, girl,
  herald: heraldShop,
  mira, smith, bench, fire, quarrySign,
};

export function interact() {
  if (!playing() || !game.near) return;
  HANDLERS[game.near.type]?.(game.near);
}

/** The stair down through the deck of the wreck, under the two empty seats. */
function thronesStair() {
  if (progress.bosses.tandem) {
    showDialog({
      tag: 'THE DROWNED THRONE',
      title: 'Two empty chairs.',
      body: 'The water has gone flat over the hold. Whatever was sitting here is not sitting here now.',
      actions: [{ label: 'Go down anyway', run: () => { enterBoss('tandem'); closeDialog(); } }, { label: 'Leave it', run: closeDialog }],
    });
    return;
  }
  showDialog({
    tag: 'THE DROWNED THRONE',
    title: 'Two chairs, and both of them taken.',
    body: 'A stair goes down through the deck into the hold, and the hold is full of standing water. Something big turns over down there, and something else — something with a voice — tells it to be still.\n\nRecommended: full flasks. You may leave up the stair at any time.',
    actions: [
      { label: 'Go down', run: () => { enterBoss('tandem'); closeDialog(); } },
      { label: 'Not yet', run: closeDialog },
    ],
  });
}

function sanctuaryGate() {
  showDialog({
    tag: 'BEYOND THE TREELINE',
    title: 'The old sanctuary',
    body: progress.won
      ? 'The bell is silent. A pale light spills from under the stone — the Herald keeps the chamber now, and trades embers for what the road will need.'
      : 'A hollow bell sounds beneath the stone. Whatever guards this place has waited a very long time.\n\nRecommended: a reinforced blade and full flasks. You may leave through the southern arch at any time.',
    actions: [
      { label: progress.won ? 'Go down to the Herald' : 'Enter the sanctuary', run: () => { enterBoss(); closeDialog(); } },
      { label: 'Stay in the wilds', run: closeDialog },
    ],
  });
}

function quarrySign() {
  showDialog({
    tag: 'GREYHOLLOW QUARRY',
    title: 'The stone still gives.',
    body: 'Blue ironstone runs through the cut walls. Strike a vein until it breaks and the ore is yours.\n\nVeins reform on their own in about half a minute, and resting at the hearth restores every one of them at once. The brutes that took up residence here will object.',
    actions: [{ label: 'Get to work', run: closeDialog }],
  });
}

function mira() {
  if (progress.won && progress.quest < 6) {
    progress.quest = 6;
    progress.embers += 80;
    own('charm');
    wearRelic('charm');
    player.hp = Math.min(maxHp(), player.hp + 20);
    save();
    showConversation('mira', 'A light carried home.',
      '“The sanctuary is quiet again. And something came down over it — I saw the light from here, through the trees.”\n\n“Whatever it told you, Aldren, be careful what you swear to.”\n\nMira presses a small charm into your palm. Hearthwood is your home now.\n\n“That charm is cut from this hearth. Rest at the fire and it will carry you to any other fire you have found — and bring you home again. The first lies south, in Echo Grove, where the trees grow too thick for daylight. Go carefully. Nothing there is a goblin.”',
      [{ label: 'Keep the hearth charm', run: () => { closeDialog(); notify('Hearth charm · +20 maximum vitality · +80 embers'); } }]);
    return;
  }
  if (progress.quest === 0) {
    showConversation('mira', 'Rowan first.',
      '“I know who you are. So does he. Go and see the smith before we talk — you will want a blade that holds before anything else.”',
      [{ label: 'To the forge', run: closeDialog }]);
    return;
  }
  if (progress.quest === 1) {
    showConversation('mira', 'Every fire needs a keeper.',
      '“I know who you are, Aldren. It changes nothing by this fire. Here you cut wood and carry water like the rest of us — and in return the fire keeps what lives in these woods away.”\n\n“Cut 6 timber from the trees, and bring 3 ironstone from the quarry across the bridge. Rowan can make that blade something worth carrying beyond the treeline.”',
      [
        { label: 'I’ll lend a hand', run: () => { progress.quest = 2; save(); closeDialog(); notify('Journey begun · A spark of belonging'); } },
        { label: 'Maybe in a moment', run: closeDialog },
      ]);
    return;
  }
  showConversation('mira',
    progress.quest >= 6 ? 'Welcome home, Aldren.' : 'A spark of belonging',
    progress.quest === 2
      ? '“Take your blade to the trees for timber — two good strikes will bring one down. For ironstone, cross the bridge east to Greyhollow Quarry and break the blue veins in the walls. The brutes there will not like it.”\n\n“Rowan needs 6 timber and 3 ironstone to reinforce your blade. Come back to the fire whenever it goes badly.”'
      : progress.quest >= 6
        ? '“Eldoria is a long way east, past places that have not been safe in years. Rest at the hearth and let it carry you — Echo Grove first, to the south.”\n\n“And whatever waits at the end of it, you have a fire to come back to.”'
        : progress.won
          ? '“You did it. The wilds can breathe again.”'
          : '“Follow the pale path north. Cross the old threshold, and face the Hollow Warden. We will keep the fire burning.”',
    [{ label: 'Until we meet again', run: closeDialog }]);
}

/** Rowan mends the broken sword and fits the fallen king with mail before anything else. */
function startingGear() {
  showConversation('smith', 'So. The king himself.',
    '“I know that face. Half the kingdom had it on a coin.” Rowan turns the broken sword over in his hands and does not bow.\n\n“Out here a crown is worth less than a dry pair of boots. But steel I understand. This blade is snapped clean through — I can make it hold, and I have mail that will fit you. Take them. Nobody survives these woods in a torn cloak.”',
    [{
      label: 'Take the blade and armor',
      run: () => {
        progress.quest = 1;
        own('mail');
        equipArmor('mail');
        save();
        closeDialog();
        notify('Traveler’s Blade mended · armor fitted · speak to Mira by the fire');
        tone(700, .25, 'triangle');
      },
    }]);
}

function smith() {
  if (progress.quest === 0) { startingGear(); return; }
  const cost = 6 + progress.blade * 3, ore = 3 + progress.blade * 2;
  showConversation('smith', 'Good steel. Steady hands.',
    `“A blade is only as good as the hand that holds it. Still, a little iron never hurt.”\n\n${weapon().line}`,
    [
      {
        label: progress.blade >= BLADE_MAX ? 'Blade fully reinforced' : `Reinforce +${progress.blade + 1} · ${cost} timber + ${ore} iron`,
        disabled: progress.blade >= BLADE_MAX || progress.wood < cost || progress.ore < ore,
        run: () => {
          progress.wood -= cost;
          progress.ore -= ore;
          progress.blade++;
          if (progress.quest < 3) progress.quest = 3;
          save();
          closeDialog();
          notify('Blade reinforced · +8 attack damage');
          tone(700, .2, 'triangle');
        },
      },
      { label: 'Show me what you can forge', run: forgeMenu },
      { label: 'Leave the forge', run: closeDialog },
    ],
    `${weapon().name} +${progress.blade}   /   Timber: ${progress.wood}   /   Ironstone: ${progress.ore}`);
}

function forgeWeapon(index) {
  const w = WEAPONS[index];
  if (!canAfford(progress, w.cost)) { notify('Rowan needs more material than that.'); return; }
  payCost(progress, w.cost);
  own(w.key);
  progress.reinforce[w.key] = 0;
  equipWeapon(w.key);
  save();
  notify(`${w.name} forged · reinforcement starts over`);
  tone(300, .35, 'triangle');
  forgeMenu();
}

function forgeMenu() {
  showDialog({
    tag: 'ROWAN’S FORGE',
    title: 'What the fire can make',
    body: 'A new blade comes out of the fire unreinforced — Rowan starts again from bare steel, and the reach and weight are yours from the first swing.',
    build: host => {
      host.append(element('div', 'ember-banner',
        `♧ ${progress.wood} timber   ·   ◆ ${progress.ore} ironstone   ·   ✦ ${progress.embers} embers`));
      shopRows(host, FORGEABLE.map(w => {
        const i = WEAPONS.indexOf(w);
        const owned = progress.owned.includes(w.key);
        const blurb = i === 0
          ? w.flavor
          : `${w.flavor}  ·  +${w.damage} damage, +${w.reach} reach`;
        return {
          name: w.name,
          blurb,
          action: owned ? 'Owned' : costLabel(w.cost),
          disabled: owned || !canAfford(progress, w.cost),
          run: () => forgeWeapon(i),
        };
      }));
    },
    actions: [{ label: 'Back to the anvil', run: smith }],
  });
}

function buildCamp(key) {
  const b = BUILDINGS.find(x => x.key === key);
  if (progress.buildings[key] || !canAfford(progress, b.cost)) return;
  payCost(progress, b.cost);
  progress.buildings[key] = true;
  save();
  notify(`${b.name} built · ${b.blurb}`);
  tone(420, .3, 'triangle');
  bench();
}

function bench() {
  showDialog({
    tag: 'HEARTHWOOD · BUILD & GROW',
    title: 'A place to put down roots.',
    body: 'Everything you drag back from the wilds can become part of this camp. Each addition is permanent, and each one costs more than the last.',
    build: host => {
      host.append(element('div', 'ember-banner',
        `♧ ${progress.wood} timber   ·   ◆ ${progress.ore} ironstone   ·   ✦ ${progress.embers} embers`));
      shopRows(host, BUILDINGS.map(b => ({
        name: b.name,
        blurb: `${b.body}  ·  ${b.blurb}`,
        action: progress.buildings[b.key] ? 'Standing' : costLabel(b.cost),
        disabled: progress.buildings[b.key] || !canAfford(progress, b.cost),
        run: () => buildCamp(b.key),
      })));
    },
    actions: [{ label: 'Back to the clearing', run: closeDialog }],
  });
}

/** The hearth charm lets the fire carry Aldren between the campfires he has found. */
const canTravel = () => progress.relic === 'charm' || progress.owned.includes('charm');

/** What the ruins still hold. Each chest gives up what is in it exactly once. */
function openChest(n) {
  if (progress.opened.includes(n.id)) {
    showDialog({
      tag: 'AMONG THE STONES',
      title: 'Empty.',
      body: 'The lid stands open where you left it. Nothing but grit and a beetle.',
      actions: [{ label: 'Leave it', run: closeDialog }],
    });
    return;
  }
  progress.opened.push(n.id);
  progress.embers += n.embers;
  progress.ore += n.ore;
  save();
  burst(n.x, n.y - 14, '#ffd77a', 34);
  tone(880, .4, 'sine');
  const took = [n.embers ? `${n.embers} embers` : null, n.ore ? `${n.ore} ironstone` : null].filter(Boolean).join(' and ');
  notify(`${n.name} · ${took}`);
  showDialog({
    tag: 'AMONG THE STONES',
    title: 'Someone left this behind.',
    body: `The lock gives at a touch — it has been waiting a long time for anyone at all.\n\nInside: ${took}.\n\nWhoever set it here under the stones never came back for it.`,
    actions: [{ label: 'Take it', run: closeDialog }],
  });
}

/** What he says the first time, before any lamp is mentioned. */
function orrinAsks() {
  showConversation('peddler', 'You are the first one through here in months.',
    '“I do not keep this fire because I like the company. I keep it because I cannot make myself walk away from it.”\n\n“The thorn in the den took my wife and both my children. Not killed — took. The mushroom-folk carried them up the stalk to the east and I have not heard them since, and I am too old and too slow to go up there and look.”\n\n“You have a blade. I have three hundred embers of lamp oil and nothing left to spend it on. If you are going up there anyway — look for a way down. Please.”',
    [{ label: 'I will look for them', run: () => {
      progress.orrin = 1;
      save();
      closeDialog();
      notify('Orrin’s family · taken up the sporehouse stalk to the east');
      peddler();
    } }]);
}

/** Orrin, by the grove fire, will sell a pocket lantern to anyone with the embers. */
function peddler() {
  if (progress.orrin === 0) { orrinAsks(); return; }
  const lantern = TOOLS.find(t => t.key === 'lantern');
  const owned = progress.owned.includes('lantern');
  showDialog({
    speaker: 'peddler',
    tag: 'The lamp-seller',
    title: progress.orrin >= 3 ? 'They are all here. All three.'
      : progress.orrin === 2 ? 'You found them?'
      : owned ? 'Still burning, is it?' : 'Lost your way yet?',
    body: progress.orrin >= 3
      ? '“I have nothing left to sell you that is worth what you did. Take the lamp oil. Take all of it.” He is not looking at you; he is watching the smaller fire, and the three people around it.'
      : progress.orrin === 2
      ? '“Say it again. Say it slowly.” His hands are shaking so badly he cannot get the lamp back onto its hook.\n\n“Go on ahead. I will only slow you down — but I am coming.”'
      : owned
      ? '“Told you. Never shortens. Keep it out of the bog, mind — the little folk there will follow a light home.”'
      : '“Everyone does, first time. The mushrooms only show you where you have been.” He unhooks a brass box no bigger than a fist and holds it up; the wick inside is already lit.\n\n“Three hundred embers. Throws light a few steps ahead of you and no further, which is all a man should want to see in here.”',
    build: host => {
      host.append(element('div', 'ember-banner', `✦ ${progress.embers} embers held`));
      shopRows(host, [{
        name: lantern.name,
        blurb: `${lantern.flavor}  ·  ${lantern.blurb}`,
        action: owned ? 'Carried' : costLabel(lantern.cost),
        disabled: owned || !canAfford(progress, lantern.cost),
        run: () => {
          payCost(progress, lantern.cost);
          own('lantern');
          save();
          notify('Pocket lantern · a few steps of light ahead');
          tone(760, .3, 'sine');
          peddler();
        },
      }]);
    },
    actions: [{ label: owned ? 'Mind how you go' : 'Not today', run: closeDialog }],
  });
}


/** The hatch under the Sporemother's nest: what she was sitting on all along. */
function trapdoor() {
  showDialog({
    tag: 'BENEATH THE NEST',
    title: 'The nest was covering something.',
    body: 'Where the Sporemother lay, the floor is not floor. It is a hatch of grey boards, swollen with damp, and it has been barred from this side.\n\n'
      + 'You lift the bar. Three faces look up out of the dark — a woman and two children, thin as reeds, none of them able to look straight at the light.\n\n'
      + '“Is he alive?” the woman asks, before anything else. “The old man with the lamps. Is he alive?”',
    actions: [{ label: 'He is waiting at the fire', run: () => { closeDialog(); freeFamily(); } }],
  });
}

/** Once the grove is its own again, one of the mushroom-folk sets up to trade. */
function apothecary() {
  const BREWS = [
    { key: 'might', name: 'Thornmilk', blurb: '+10 damage on every strike, until you next rest', cost: 90, amount: 10 },
    { key: 'wind', name: 'Bellowscap', blurb: '+40 stamina, until you next rest', cost: 80, amount: 40 },
    { key: 'heart', name: 'Bloodgill', blurb: '+35 maximum vitality, until you next rest', cost: 110, amount: 35 },
  ];
  showDialog({
    speaker: 'apothecary',
    tag: 'The brewer, in the village',
    title: 'It remembers how to be useful.',
    body: '“We were not ourselves. You will forgive us, or you will not.” It turns a cap over in four fingers and does not look up.\n\n'
      + '“These are honest. They last until you sleep, and no longer. Nothing that lasts longer than that is honest.”',
    build: host => {
      host.append(element('div', 'ember-banner', `✦ ${progress.embers} embers held`));
      shopRows(host, BREWS.map(b => ({
        name: b.name,
        blurb: b.blurb,
        action: boons[b.key] ? 'Working' : `${b.cost} embers`,
        disabled: !!boons[b.key] || progress.embers < b.cost,
        run: () => {
          progress.embers -= b.cost;
          boons[b.key] = b.amount;
          if (b.key === 'heart') player.hp += b.amount;
          if (b.key === 'wind') player.st += b.amount;
          save();
          notify(`${b.name} · ${b.blurb}`);
          tone(520, .35, 'sine');
          apothecary();
        },
      })));
    },
    actions: [{ label: 'Enough for now', run: closeDialog }],
  });
}


/** Neve: out of the dark a day, and already pointing you back at the thing that put her there. */
function wife() {
  const done = !!progress.bosses.vaelira;
  showConversation('wife', done ? 'It is over, then.' : 'She is still down there.',
    done
      ? '“The light came through the roof and I thought the sky had broken. Wren has not come inside since.”\n\n“You gave us back a great deal more than you took off her. Whatever is south of here, go and see it — we will keep a fire for you.”'
      : '“I heard her through the boards. Every day. She would come down and talk to us the way you talk to a dog you are fond of.”\n\n“She is in the den under the dead tree, north and west of here, behind the roots. I am not going to pretend I want her alive.”\n\n“Go and finish it. Then come back and eat something.”',
    [{ label: done ? 'I will' : 'I am going there now', run: closeDialog }]);
}

/** Tam: thirteen, furious, and nowhere near as recovered as he is pretending. */
function boy() {
  showDialog({
    tag: 'TAM, ORRIN’S SON',
    title: progress.bosses.vaelira ? 'He has not put the stick down.' : 'He is sharpening a stick.',
    body: progress.bosses.vaelira
      ? 'He has whittled the end of it to a point anyway, and he keeps it beside him at the fire.\n\n“I was going to go after her myself. I had worked out the whole thing.” He is quiet a moment. “I am glad it was you. I would not have managed it.”'
      : 'He does not look up from it.\n\n“She is not a person. Whatever she looks like. She used to sit on the hatch and count us through the gap.”\n\n“Do not talk to her. People talk to her and then they do what she says.”',
    actions: [{ label: 'Leave him to it', run: closeDialog }],
  });
}

/** Wren: eight, and mostly interested in the sky. */
function girl() {
  showDialog({
    tag: 'WREN, ORRIN’S DAUGHTER',
    title: progress.bosses.vaelira ? 'She is lying on her back in the grass.' : 'She is sitting very close to the fire.',
    body: progress.bosses.vaelira
      ? 'She has been there long enough that the grass is flat around her.\n\n“There is so much of it,” she says, to no one in particular. “Papa says it was always up there. I do not believe him.”'
      : 'She has both hands out to it and has not moved them since you arrived.\n\n“Mama says there is a lady under the tree who has to go away before we can stay.”\n\n“Are you the one making her go away?”',
    actions: [{ label: 'Something like that', run: closeDialog }],
  });
}

/** The cave under the cliff opens only once the grove's three Fallen are down. */
function caveMouth() {
  const open = allSlain(ECHO_FALLEN);
  game.caveOpen = open;
  if (!open) {
    const left = ECHO_FALLEN.filter(id => !progress.slain.includes(id)).length;
    showDialog({
      tag: 'THE DEN UNDER THE CLIFF',
      title: 'Roots bar the way.',
      body: `Living roots knot across the mouth of the cave, thick as a man's arm, and something inside breathes slow.\n\nThe grove keeps its worst behind its three hearts. ${left === 1 ? 'One still beats' : `${left} still beat`} — Greymane in the boneyard far to the west, the Sporemother up the ladder in the village to the east, Mycel in the cave at the back of the hollow to the south.`,
      actions: [{ label: 'Leave it', run: closeDialog }],
    });
    return;
  }
  if (progress.bosses.vaelira) {
    showDialog({
      tag: 'THE DEN UNDER THE CLIFF',
      title: 'Quiet, now.',
      body: 'The den is still. Only the carved stone at the back speaks: a circle split by a line, and beneath it, in a script you last saw in the palace vaults, one word — HADES.',
      actions: [{ label: 'Go down', run: () => { enterBoss('vaelira'); closeDialog(); } }, { label: 'Stay in the grove', run: closeDialog }],
    });
    return;
  }
  showDialog({
    tag: 'THE DEN UNDER THE CLIFF',
    title: 'The roots have withered.',
    body: 'With the three hearts stopped, the roots have gone to dry rope and fallen away. The breathing inside is louder.\n\nRecommended: full flasks, and a vial or two from the Herald. You may leave through the mouth at any time.',
    actions: [
      { label: 'Go down', run: () => { enterBoss('vaelira'); closeDialog(); } },
      { label: 'Not yet', run: closeDialog },
    ],
  });
}

function fire(site) {
  const grove = game.region === 'echo';
  showDialog({
    tag: grove ? 'A FIRE IN THE DARK' : 'A MOMENT OF RESPITE',
    title: game.region === 'sunken' ? `Rest at the ${site.name.toLowerCase()}.` : grove ? 'Rest at the grove fire.' : 'Rest beside the hearth.',
    body: game.region === 'sunken'
      ? 'A little warmth among the drowned stones. Refill vitality, stamina and flasks. Resting restores the wilds and makes this your return point, even after leaving the vault.'
      : grove
      ? 'A small fire the last travellers left, ringed with stones. Refill your vitality, stamina and flasks. Resting wakes the grove again — the wolves and the mushroom-folk, though not the Fallen.\n\nSit here once and the hearth charm will remember this fire.'
      : 'Refill your vitality, stamina, and healing flasks. Resting also regrows the wilds — trees, ironstone veins, and the creatures that guard them.\n\nGathered materials, camp buildings, attributes and weapon upgrades are kept.',
    extra: `✦ ${progress.embers} embers held`,
    actions: [
      { label: 'Rest & replenish', run: () => { rest(site); closeDialog(); } },
      ...(canTravel() ? [{ label: 'Travel · the map', run: openMap }] : []),
      { label: 'Kindle · spend embers', run: kindleMenu },
      { label: 'Character sheet', run: statsSheet },
      { label: 'Keep wandering', run: closeDialog },
    ],
  });
}
