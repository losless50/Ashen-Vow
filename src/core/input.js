import { game, keys, stick, camera, player } from './state.js';
import { attack, roll, queueHeavy, parry } from '../systems/combat.js';
import { heal, movementInput } from '../systems/player.js';
import { interact } from '../world/interact.js';
import { toggleSound } from '../systems/audio.js';
import { setSoundSetting } from './settings.js';
import { canvas, ctx, resize } from '../render/renderer.js';
import { registerDialogReset, closeDialog, advanceDialog } from '../ui/dialogs.js';
import { controls, pause, characterSheet } from '../ui/menus.js';
import { applySoundIcon } from '../ui/screens.js';
import { $ } from '../ui/dom.js';
import { mapOpen } from '../ui/travel.js';

/** A finger held this long, still, is a heavy strike on its own. */
const HOLD_HEAVY = 170;
let pointer = null;

registerDialogReset(() => { clearTimeout(pointer?.hold); pointer = null; });

function bindCanvas() {
  canvas.addEventListener('pointerdown', e => {
    if (game.modal || game.paused || game.screen !== 'play') return;
    canvas.focus();
    if (e.pointerType === 'mouse') {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      player.face = Math.atan2(
        camera.y + (e.clientY - r.top) * canvas.height / r.height - player.y,
        camera.x + (e.clientX - r.left) * canvas.width / r.width - player.x,
      );
      attack(e.button === 2);
      return;
    }
    const p = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now(), moved: 0, held: false, hold: null };
    // Hold still and the heavy strike fires by itself — no light swing first.
    p.hold = setTimeout(() => {
      if (pointer !== p || p.moved > 24) return;
      p.held = true;
      queueHeavy();
    }, HOLD_HEAVY);
    pointer = p;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    pointer.moved = Math.max(pointer.moved, Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y));
  });

  canvas.addEventListener('pointerup', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    clearTimeout(pointer.hold);
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y, d = Math.hypot(dx, dy);
    if (pointer.held) {
      // The heavy already went; releasing is nothing.
    } else if (d > 24) {
      roll(dx, dy);
    } else if (performance.now() - pointer.time < 400) {
      attack(false);
    }
    pointer = null;
  });

  canvas.addEventListener('pointercancel', () => { clearTimeout(pointer?.hold); pointer = null; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

const SHORTCUTS = {
  q: () => attack(), j: () => attack(),
  r: () => attack(true), k: () => attack(true),
  e: () => { if (!parry()) interact(); }, f: heal, c: characterSheet, i: characterSheet,
  '?': controls,
};

function bindKeyboard() {
  const cycleFocus = e => {
    const buttons = [...$('dialogPanel').querySelectorAll('button:not(:disabled):not([hidden])')];
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    e.preventDefault();
    buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  };

  window.addEventListener('keydown', e => {
    if (mapOpen()) return;                     // the map screen owns the keyboard while it is up
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();

    // Off the play screen, the keyboard only drives whatever panel is open.
    if (game.screen !== 'play') {
      if (game.modal && k === 'escape') closeDialog();
      else if (game.modal && k === 'tab') cycleFocus(e);
      return;
    }

    if (k === 'escape') { pause(); return; }
    if (game.modal && k === 'tab') { cycleFocus(e); return; }
    if (game.modal && ['e', 'enter', ' '].includes(k) && !e.repeat && advanceDialog()) { e.preventDefault(); return; }
    if (game.modal || game.paused) return;

    keys.add(k);
    if (e.repeat) return;
    if (k === ' ' || k === 'shift') { const m = movementInput(); roll(m.dx, m.dy); return; }
    SHORTCUTS[k]?.();
  });

  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  const drop = () => {
    keys.clear();
    stick.x = stick.y = 0;
    if (!game.modal && game.screen === 'play') pause();
  };
  window.addEventListener('blur', drop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) drop(); });
}

function bindTouch() {
  const joy = $('joystick');
  let joyId = null;
  const moveJoy = e => {
    const r = joy.getBoundingClientRect();
    const dx = e.clientX - r.x - r.width / 2, dy = e.clientY - r.y - r.height / 2;
    const d = Math.max(30, Math.hypot(dx, dy));
    stick.x = dx / d;
    stick.y = dy / d;
    joy.firstElementChild.style.transform = `translate(${stick.x * 25}px,${stick.y * 25}px)`;
  };
  joy.onpointerdown = e => { if (game.modal || game.paused || game.screen !== 'play') return; joyId = e.pointerId; joy.setPointerCapture(joyId); moveJoy(e); };
  joy.onpointermove = e => { if (e.pointerId === joyId) moveJoy(e); };
  joy.onpointerup = joy.onpointercancel = () => {
    joyId = null;
    stick.x = stick.y = 0;
    joy.firstElementChild.style.transform = 'none';
  };
}

/**
 * Combat buttons fire on pointer-down. Browsers only synthesize a click for the
 * first finger on the screen, so while a thumb holds the stick a tap on the
 * flask or the blade would otherwise never arrive.
 */
function press(el, fn) {
  let handled = false;
  el.addEventListener('pointerdown', e => { e.preventDefault(); handled = true; fn(); });
  el.onclick = () => { if (handled) { handled = false; return; } fn(); };
}

function bindButtons() {
  $('conversationClose').onclick = closeDialog;
  press($('heal'), heal);
  press($('parry'), parry);
  press($('interact'), () => { if (!parry()) interact(); });
  $('character').onclick = characterSheet;
  $('help').onclick = controls;
  $('pause').onclick = pause;
  $('sound').onclick = () => { const on = toggleSound(); setSoundSetting(on); applySoundIcon(on); };
}

export function bindInput() {
  bindCanvas();
  bindKeyboard();
  bindTouch();
  bindButtons();
  new ResizeObserver(resize).observe(canvas);
  return ctx;
}
