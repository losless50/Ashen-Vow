import { game, keys, stick } from '../core/state.js';
import { cancelAttack } from '../systems/combat.js';
import { drawNpcPortrait, SPEAKERS } from '../render/portraits.js';
import { $ } from './dom.js';

/** Input owners register here so opening a panel drops any held keys or taps. */
const resets = [];
export const registerDialogReset = fn => resets.push(fn);

/**
 * @param {object} opts
 * @param {string}   opts.tag     small caps eyebrow above the title
 * @param {string}   opts.title
 * @param {string}   opts.body
 * @param {Array}    opts.actions [{ label, run, disabled }]
 * @param {string}   opts.extra   monospace footnote line
 * @param {string}   opts.speaker 'mira' | 'smith' — switches to conversation layout
 * @param {Function} opts.build   receives the extra container for custom panels
 */
/** A conversation shows one paragraph at a time; the choices wait for the last page. */
let paging = null;

function renderPage() {
  const last = paging.page === paging.pages.length - 1;
  $('dialogBody').textContent = paging.pages[paging.page];
  $('dialogPanel').classList.toggle('paged', !last);
  const host = $('dialogExtra');
  host.replaceChildren();
  host.className = paging.build ? 'dialog-panel' : 'dialog-extra';
  if (last && paging.build) paging.build(host);
  else if (last && paging.extra) host.textContent = paging.extra;
  const bar = $('dialogActions');
  bar.replaceChildren();
  for (const a of last ? paging.actions : [{ label: 'Continue  ▾', run: advanceDialog }]) {
    const b = document.createElement('button');
    b.className = 'slab';
    b.textContent = a.label;
    b.disabled = !!a.disabled;
    b.onclick = a.run;
    bar.append(b);
  }
  bar.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}

/** Turns to the next page of a conversation. Returns false when there is nothing to turn. */
export function advanceDialog() {
  if (!paging || paging.page >= paging.pages.length - 1) return false;
  paging.page++;
  renderPage();
  return true;
}

export function showDialog({ tag = '', title = '', body = '', actions = [], extra = '', speaker = null, build = null }) {
  for (const reset of resets) reset();
  keys.clear();
  stick.x = stick.y = 0;
  cancelAttack();
  game.modal = true;

  const talking = !!speaker;
  paging = talking ? { pages: body.split('\n\n'), page: 0, actions, extra, build } : null;
  $('overlay').classList.toggle('conversation-mode', talking);
  $('dialogPanel').classList.toggle('conversation', talking);
  $('conversationPortrait').hidden = !talking;
  $('speakerLine').hidden = !talking;
  $('conversationClose').hidden = !talking;
  if (talking) {
    $('speakerName').textContent = SPEAKERS[speaker].name;
    $('portraitCaption').textContent = SPEAKERS[speaker].caption;
    drawNpcPortrait($('npcPortrait').getContext('2d'), speaker);
  }

  $('dialogTag').textContent = tag;
  $('dialogTitle').textContent = title;
  $('dialogPanel').classList.remove('paged');
  if (paging) { renderPage(); $('overlay').hidden = false; $('dialogPanel').scrollTop = 0; return; }
  $('dialogBody').textContent = body;

  const host = $('dialogExtra');
  host.replaceChildren();
  host.className = build ? 'dialog-panel' : 'dialog-extra';
  if (build) build(host);
  else if (extra) host.textContent = extra;

  const bar = $('dialogActions');
  bar.replaceChildren();
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = 'slab';
    b.textContent = a.label;
    b.disabled = !!a.disabled;
    b.onclick = a.run;
    bar.append(b);
  }

  $('overlay').hidden = false;
  $('dialogPanel').scrollTop = 0;
  $('dialogActions').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}

export function showConversation(speaker, title, body, actions = [], extra = '') {
  showDialog({ tag: SPEAKERS[speaker].role, title, body, actions, extra, speaker });
}

export function closeDialog() {
  paging = null;
  game.modal = false;
  game.paused = false;
  $('overlay').hidden = true;
  $('overlay').classList.remove('conversation-mode');
  $('game').focus();
}

// Tapping the box itself turns the page, the way a text box should.
$('dialogPanel').addEventListener('click', e => { if (!e.target.closest?.('button')) advanceDialog(); });
