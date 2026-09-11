import {
  game, player, progress, save, loadProgress, resetProgress,
  maxHp, maxStamina, staminaRegen, moveSpeed, rollInvuln, flaskHeal, maxFlasks,
  attackDamage, attackRange, kindleCost, characterLevel, weapon, built, ware, armorDefense,
  STATS, STAT_CAP, BUILDINGS,
} from '../core/state.js';
import { respawn } from '../systems/player.js';
import { showDialog, closeDialog } from './dialogs.js';
import { drawWandererFigure } from '../render/actors.js';
import { WEAPONS, ARMOR, RELICS, TOOLS, BLADE_MAX } from '../core/gear.js';
import { REGIONS } from '../world/regions.js';
import { ownedOf, equipWeapon, equipArmor, wearRelic, removeRelic } from '../systems/inventory.js';
import { notify } from './hud.js';
import { tone } from '../systems/audio.js';
import { $, element } from './dom.js';
import { SLOT_COUNT, activeSlot, setActiveSlot, slotSummary, slotLine, clearSlot } from '../core/saves.js';
import { goToScreen, startNewJourney } from './screens.js';
import { ZOOM_STEPS, settings, setZoom, zoomStep } from '../core/settings.js';
import { resize } from '../render/renderer.js';
import { isApp, isFullscreen, enterFullscreen, exitFullscreen } from '../core/platform.js';

/** Levelling, like a bonfire, only happens beside the fire itself. */
const atHearth = () => game.near?.type === 'fire';

function statRow(host, name, value, note) {
  const row = element('div', 'sheet-row');
  row.append(element('span', 'sheet-label', name), element('b', 'sheet-value', value));
  if (note) row.append(element('small', 'sheet-note', note));
  host.append(row);
}

/**
 * Shared shop layout for the forge and the workbench.
 * items: { name, blurb, state, action, disabled, run }
 */
export function shopRows(host, items) {
  const list = element('div', 'kindle-list');
  for (const item of items) {
    const row = element('div', 'kindle-row');
    const copy = element('div', 'kindle-copy');
    copy.append(element('strong', null, item.name));
    copy.append(element('small', null, item.blurb));
    row.append(copy);
    const buy = element('button', 'slab kindle-buy wide', item.action);
    buy.disabled = !!item.disabled;
    if (item.run) buy.onclick = item.run;
    row.append(buy);
    list.append(row);
  }
  host.append(list);
}

function block(host, heading) {
  const b = element('div', 'sheet-block');
  b.append(element('h4', null, heading));
  host.append(b);
  return b;
}

// --- character sheet ----------------------------------------------------------
function figureBlock(host) {
  const figure = element('div', 'sheet-figure');
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 140;
  canvas.setAttribute('aria-hidden', 'true');
  figure.append(canvas);
  const caption = element('div', 'sheet-figure-caption');
  caption.append(element('strong', null, `Aldren · Level ${characterLevel()}`));
  caption.append(element('small', null, `${weapon().name}${progress.blade ? ` +${progress.blade}` : ''}  ·  ${ARMOR.find(a => a.key === progress.armor)?.name}  ·  ${Math.ceil(player.hp)} / ${maxHp()} vitality`));
  figure.append(caption);
  host.append(figure);
  drawWandererFigure(canvas.getContext('2d'), 108, 132);
}

function inventoryTab(host) {
  const reopen = characterSheet;
  const blades = ownedOf(WEAPONS);
  host.append(element('h4', 'sheet-heading', 'Blade'));
  shopRows(host, blades.map(w => {
    const held = WEAPONS[progress.weapon] === w;
    const level = held ? progress.blade : progress.reinforce[w.key] || 0;
    return {
      name: `${w.name}${level ? ` +${level}` : ''}`,
      blurb: `${w.flavor}  ·  +${w.damage + level * 8} damage, +${w.reach} reach`,
      action: held ? 'In hand' : 'Equip',
      disabled: held,
      run: () => { equipWeapon(w.key); reopen(); },
    };
  }));
  host.append(element('h4', 'sheet-heading', 'Armor'));
  shopRows(host, ownedOf(ARMOR).map(a => ({
    name: a.name,
    blurb: `${a.flavor}  ·  ${a.defense ? `−${a.defense} damage from every blow` : 'no protection'}`,
    action: progress.armor === a.key ? 'Worn' : 'Wear',
    disabled: progress.armor === a.key,
    run: () => { equipArmor(a.key); reopen(); },
  })));
  host.append(element('h4', 'sheet-heading', 'Relic'));
  const relics = ownedOf(RELICS);
  if (!relics.length) host.append(element('p', 'sheet-empty', 'No relics yet. Mira keeps the hearth charm for now.'));
  else shopRows(host, relics.map(r => ({
    name: r.name,
    blurb: `${r.flavor}  ·  ${r.blurb}`,
    action: progress.relic === r.key ? 'Remove' : 'Wear',
    run: () => { progress.relic === r.key ? removeRelic() : wearRelic(r.key); player.hp = Math.min(player.hp, maxHp()); reopen(); },
  })));
  const tools = ownedOf(TOOLS);
  if (tools.length) {
    host.append(element('h4', 'sheet-heading', 'Tools'));
    shopRows(host, tools.map(t => ({ name: t.name, blurb: `${t.flavor}  ·  ${t.blurb}`, action: 'Carried', disabled: true })));
  }
  host.append(element('h4', 'sheet-heading', 'Satchel'));
  const pack = element('div', 'sheet-block');
  statRow(pack, 'Fallen timber', String(progress.wood), 'fell trees in the wilds');
  statRow(pack, 'Ironstone', String(progress.ore), 'break veins at Greyhollow Quarry');
  statRow(pack, 'Embers', String(progress.embers), 'spent kindling at the hearth');
  statRow(pack, 'Sunlit flasks', `${player.flasks} / ${maxFlasks()}`, `restores ${flaskHeal()} vitality`);
  if (ware('vial')) statRow(pack, 'Vials of dawn', String(ware('vial')), 'drunk when the flasks run dry');
  if (progress.lost) statRow(pack, 'Embers lost', String(progress.lost.embers), `left where you fell in ${REGIONS.find(r => r.key === progress.lost.region)?.name || 'the wilds'}`);
  host.append(pack);
}

function statsTab(host) {
  const cols = element('div', 'sheet-cols');
  host.append(cols);

  const attrs = block(cols, 'Attributes');
  for (const s of STATS)
    statRow(attrs, s.name, String(progress.stats[s.key]), s.blurb);

  const body = block(cols, 'Condition');
  statRow(body, 'Vitality', `${Math.ceil(player.hp)} / ${maxHp()}`);
  statRow(body, 'Stamina', `${Math.round(player.st)} / ${maxStamina()}`, `${staminaRegen().toFixed(1)}/s recovery`);
  statRow(body, 'Movement', `${Math.round(moveSpeed())}`, 'units per second');
  statRow(body, 'Dodge window', `${rollInvuln().toFixed(2)}s`, 'invulnerable while rolling');
  statRow(body, 'Armor', `−${armorDefense()}`, 'damage shaved off every blow');

  const gear = block(cols, 'Blade & relic');
  statRow(gear, weapon().name, `+${progress.blade} / +${BLADE_MAX}`, progress.blade >= BLADE_MAX ? 'fully reinforced' : 'Rowan can reinforce it further');
  statRow(gear, 'Normal strike', `${attackDamage(false)}`, `${attackRange(false)} reach`);
  statRow(gear, 'Heavy strike', `${attackDamage(true)}`, `${attackRange(true)} reach`);
  statRow(gear, 'Relic', progress.relic ? RELICS.find(r => r.key === progress.relic)?.name : 'None worn', progress.relic ? RELICS.find(r => r.key === progress.relic)?.blurb : 'wear one from the inventory');

  const camp = block(cols, 'Hearthwood');
  for (const b of BUILDINGS)
    statRow(camp, b.name, built(b.key) ? 'Standing' : 'Not built', b.blurb);
}

/** The inventory — the portrait and C open this. Equip blades, armor and a relic. */
export function characterSheet() {
  showDialog({
    tag: 'THE WANDERER',
    title: 'Inventory',
    body: 'Everything you carry. Choose what goes in hand and what goes on your back.',
    build: host => { figureBlock(host); inventoryTab(host); },
    actions: [
      { label: 'Close', run: closeDialog },
      atHearth()
        ? { label: 'Stats', run: statsSheet }
        : { label: 'Stats · at the hearth', disabled: true, run: () => {} },
    ],
  });
}

/** The numbers — reached from the hearth, next to kindling. */
export function statsSheet() {
  showDialog({
    tag: 'THE WANDERER',
    title: `Level ${characterLevel()}`,
    body: 'Everything you have become. Embers are spent at the hearth.',
    build: host => { figureBlock(host); statsTab(host); },
    actions: [
      { label: 'Close', run: closeDialog },
      { label: 'Kindle · spend embers', run: kindleMenu },
      { label: 'Inventory', run: characterSheet },
    ],
  });
}

export function buyStat(key) {
  const level = progress.stats[key];
  if (level >= STAT_CAP) return;
  const cost = kindleCost(level);
  if (progress.embers < cost) { notify('Not enough embers.'); return; }
  progress.embers -= cost;
  progress.stats[key] = level + 1;
  // Growth is felt immediately rather than at the next rest.
  player.hp = Math.min(maxHp(), player.hp + (key === 'vitality' ? 12 : 0));
  player.st = Math.min(maxStamina(), player.st + (key === 'endurance' ? 7 : 0));
  if (key === 'resolve') player.flasks = Math.min(maxFlasks(), player.flasks + (maxFlasks() > player.flasks ? 1 : 0));
  save();
  tone(520 + level * 12, .22, 'triangle');
  notify(`${STATS.find(s => s.key === key).name} raised to ${level + 1} · ${cost} embers spent`);
  kindleMenu();
}

export function kindleMenu() {
  showDialog({
    tag: 'THE HEARTH REMEMBERS',
    title: 'Kindle your resolve',
    body: 'Embers hold the strength of everything you have felled. Give them to the fire, and the fire gives them back to you.',
    build: host => {
      host.append(element('div', 'ember-banner', `✦  ${progress.embers} embers  ·  Level ${characterLevel()}`));
      const list = element('div', 'kindle-list');
      for (const s of STATS) {
        const level = progress.stats[s.key];
        const capped = level >= STAT_CAP;
        const cost = kindleCost(level);
        const row = element('div', 'kindle-row');
        const copy = element('div', 'kindle-copy');
        copy.append(element('strong', null, `${s.name}  ${level}${capped ? '' : ' → ' + (level + 1)}`));
        copy.append(element('small', null, s.blurb));
        row.append(copy);
        const buy = element('button', 'slab kindle-buy', capped ? 'Mastered' : `${cost} embers`);
        buy.disabled = capped || progress.embers < cost;
        buy.onclick = () => buyStat(s.key);
        row.append(buy);
        list.append(row);
      }
      host.append(list);
    },
    actions: [
      { label: 'Step back from the fire', run: closeDialog },
      { label: 'Character sheet', run: characterSheet },
    ],
  });
}

// --- other panels -------------------------------------------------------------
/** Display preferences — currently how far the camera pulls back. */
export function displaySettings(back = closeDialog) {
  showDialog({
    tag: 'DISPLAY',
    title: 'How much world to show.',
    body: 'The camera pulls back further on short, wide screens. Nudge it either way if the framing feels wrong on this device.',
    build: host => {
      shopRows(host, ZOOM_STEPS.map(step => ({
        name: step.label,
        blurb: step.blurb,
        action: settings.zoom === step.key ? 'Current' : 'Use',
        disabled: settings.zoom === step.key,
        run: () => { setZoom(step.key); resize(); displaySettings(back); },
      })));
    },
    actions: [{ label: 'Back', run: back }],
  });
}

export function controls() {
  showDialog({
    tag: 'THE WANDERER’S HANDBOOK',
    title: 'A little courage goes a long way.',
    body: 'Keyboard — WASD or the arrow keys to move. Space or Shift rolls in the direction you are moving. Q strikes, R is a heavy strike (J and K also work). E parries when a blow is coming and otherwise interacts, F drinks a flask, C, I or the portrait opens your inventory, Escape pauses.\n\nMouse — left button strikes, right button is a heavy strike, and both aim toward the cursor.\n\nTouch — the left stick moves. Swipe the world to dodge in that direction. Tap to strike. Hold your finger still for a moment and a heavy strike fires on its own. The flask button sits on the right, and a gold parry button pops in beside it whenever a blow is coming.\n\nStrike a tree to fell it for timber, and break the ironstone veins at Greyhollow Quarry across the bridge. Resting at the hearth regrows the wilds and wakes what lives there.\n\nEvery attack is marked on the ground before it lands: a ring fills at the attacker\u2019s feet, a wolf\u2019s leap draws the lane it crosses, a cap draws the reach of its spore burst.\n\nRoll through attacks while your silhouette glows, or parry: in the last breath before a blow lands, E catches it on the blade and leaves the attacker exposed. Mistime it and the blade is out of position for a moment. Every attack, dodge and parry costs stamina.',
    actions: [{ label: 'Back', run: closeDialog }],
  });
}

export function pause() {
  if (game.dead || game.screen !== 'play') return;
  if (game.modal) { closeDialog(); game.paused = false; return; }
  game.paused = true;
  const actions = [
    { label: 'Resume', run: () => { game.paused = false; closeDialog(); } },
    { label: 'Character', run: () => { game.paused = false; characterSheet(); } },
    { label: 'Controls', run: () => { game.paused = false; controls(); } },
    { label: `Display · ${zoomStep().label}`, run: () => displaySettings(pauseRefresh) },
  ];
  if (!isApp()) actions.push({
    label: isFullscreen() ? 'Leave fullscreen' : 'Fullscreen',
    run: async () => { isFullscreen() ? await exitFullscreen() : await enterFullscreen(); game.paused = true; pauseRefresh(); },
  });
  actions.push({ label: 'Journeys', run: () => { save(); journeys(); } });
  actions.push({ label: 'Return to title', run: () => { save(); goToScreen('title'); } });
  showDialog({
    tag: 'TAKE YOUR TIME',
    title: 'The world can wait.',
    body: 'Your journey saves itself. Rest a moment.',
    actions,
  });
}

/**
 * The journeys on this device. Each is a complete save of its own; switching
 * puts the one being played safely away first, so nothing is ever lost by
 * moving between them. Deleting asks, because there is no undo.
 */
export function journeys() {
  const here = activeSlot();
  showDialog({
    tag: 'JOURNEYS',
    title: 'Whose road is this?',
    body: 'Up to three journeys live on this device at once. The one you are playing is saved the moment you step away from it.',
    build: host => {
      shopRows(host, Array.from({ length: SLOT_COUNT }, (_, i) => {
        const s = slotSummary(i);
        const current = i === here;
        return {
          name: `Journey ${i + 1}${current ? '  ·  playing' : ''}`,
          blurb: slotLine(i),
          action: current ? 'Here now' : s.empty ? 'Begin here' : 'Take it up',
          disabled: current,
          run: () => (s.empty ? beginIn(i) : switchTo(i)),
        };
      }));
      // Throwing one away is kept apart from picking one up.
      const spare = Array.from({ length: SLOT_COUNT }, (_, i) => i)
        .filter(i => i !== here && !slotSummary(i).empty);
      if (spare.length) {
        host.append(element('div', 'ember-banner', 'Clearing a journey cannot be undone.'));
        shopRows(host, spare.map(i => ({
          name: `Clear journey ${i + 1}`,
          blurb: slotLine(i),
          action: 'Clear',
          run: () => confirmClear(i),
        })));
      }
    },
    actions: [{ label: 'Back', run: () => { game.paused = true; pause(); } }],
  });
}

/** Puts the live journey away, takes up another, and stands him at its fire. */
function switchTo(i) {
  save();
  setActiveSlot(i);
  loadProgress();
  respawn({ silent: true });
  game.paused = false;
  closeDialog();
  notify(`Journey ${i + 1} · ${slotLine(i)}`);
}

/** The same, into an empty one, which starts at the beginning. */
function beginIn(i) {
  save();
  setActiveSlot(i);
  resetProgress();
  save();
  closeDialog();
  startNewJourney();
}

function confirmClear(i) {
  showDialog({
    tag: 'CLEAR A JOURNEY',
    title: `Throw journey ${i + 1} away?`,
    body: `${slotLine(i)}\n\nThis cannot be undone, and it does not touch the journey you are playing.`,
    actions: [
      { label: 'Keep it', run: journeys },
      { label: 'Throw it away', run: () => { clearSlot(i); journeys(); } },
    ],
  });
}

/** Reopens the pause panel in place after a toggle that changes its labels. */
function pauseRefresh() {
  game.modal = false;
  pause();
}

export function deathScreen() {
  showDialog({
    tag: 'THE FLAME FALTERS',
    title: 'But it does not go out.',
    body: 'The wilds will wait. Take a breath, return to the hearth, and try again. Your materials, attributes and upgrades remain with you.',
    actions: [
      { label: 'Return to the campfire', run: () => { respawn(); closeDialog(); } },
      { label: 'Back to title', run: () => { save(); goToScreen('title'); } },
    ],
  });
}

