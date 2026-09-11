import { game, player, progress, weapon } from '../core/state.js';
import { attackPose, parryHint } from '../systems/combat.js';
import { enemyStats } from '../systems/entities.js';
import { rect, ellipse, poly, path, label } from './primitives.js';
import { GROUND_SCALE, WINDUP, KNIVES, WHIP } from '../systems/vaelira-patterns.js';

export function facingDirection(angle) {
  const a = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (a >= Math.PI / 4 && a < Math.PI * 3 / 4) return 'front';
  if (a <= -Math.PI / 4 && a > -Math.PI * 3 / 4) return 'back';
  return Math.cos(a) < 0 ? 'left' : 'right';
}

const STEEL = { edge: '#8bafc1', shine: '#f5f6de', fuller: '#415e76', grip: '#4c3225', guard: '#e4b873' };
const RUSTED = { edge: '#7a7468', shine: '#b8b3a3', fuller: '#4a4640', grip: '#3a2a20', guard: '#8c7a55' };

/** In road rags — before Rowan fits him out, or whenever the mail is set aside. */
export const ragged = () => progress.armor === 'rags';

export function drawSword(c, x, y, angle, length = 35, strong = false, pal = STEEL, broken = false) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  if (broken) {
    // Snapped a hand's width above the guard, the break jagged and dull.
    poly(c, [[4, -4], [13, -4], [17, -1], [14, 2], [16, 4], [4, 4]], '#101520');
    poly(c, [[7, -2], [12, -2], [15, -1], [12, 1], [14, 2], [7, 2]], pal.edge);
    path(c, [[8, -2], [12, -2]], 1, pal.shine);
    rect(c, 2, -7, 3, 14, pal.grip); rect(c, 2, -6, 2, 12, pal.guard);
    rect(c, -7, -2, 9, 4, '#1e1721'); rect(c, -6, -1, 7, 2, '#6b4a3a');
    c.restore();
    return;
  }
  // Dark outline, cold steel bevel, bright cutting edge and a brass crossguard.
  poly(c, [[4, -4], [length - 6, -4], [length + 3, 0], [length - 6, 4], [4, 4]], '#101520');
  poly(c, [[7, -2], [length - 6, -2], [length, 0], [length - 6, 2], [7, 2]], pal.edge);
  path(c, [[8, -2], [length - 7, -2], [length, 0]], 1, pal.shine);
  rect(c, 8, 0, length - 15, 1, pal.fuller);
  rect(c, 2, -7, 3, 14, pal.grip); rect(c, 2, -6, 2, 12, pal.guard);
  rect(c, -7, -2, 9, 4, '#1e1721'); rect(c, -6, -1, 7, 2, '#9b6750'); rect(c, -10, -3, 4, 6, '#c0a16d');
  if (strong) rect(c, length - 8, -2, 3, 2, '#fff2bd');
  c.restore();
}

export function drawWanderer(c, x, y) {
  if (ragged()) { drawBeggarKing(c, x, y); return; }
  const attacking = player.attack > 0;
  const face = attacking ? player.attackFace : player.face;
  const dir = facingDirection(face);
  const side = dir === 'left' || dir === 'right', back = dir === 'back', mirror = dir === 'left' ? -1 : 1;
  const stride = player.moving ? Math.sin(player.walkPhase) : 0, step = Math.round(stride * 3);
  const bob = player.moving ? Math.round(Math.abs(Math.cos(player.walkPhase)) * 1.5) : Math.round(Math.sin(game.time * 2) * .45);
  const sway = Math.round(Math.sin(player.walkPhase * .5) * 2 * (player.moving ? 1 : .25) + Math.sin(game.time * 2) * .7);
  ellipse(c, x, y + 3, 15, 5, '#080914a6');

  if (player.roll > 0) {
    // A tucked cloak, shielded head and steel greaves tumble along the dodge direction.
    c.save();
    c.translate(Math.round(x), Math.round(y - 14));
    c.rotate(player.face + (1 - player.roll / .33) * Math.PI * 2);
    poly(c, [[-14, -8], [-4, -14], [10, -9], [15, 3], [5, 12], [-9, 9]], '#140e1c');
    poly(c, [[-12, -6], [-3, -12], [9, -7], [12, 3], [3, 9], [-7, 7]], '#962b42');
    rect(c, -8, -7, 12, 4, '#ce5657'); rect(c, 4, -5, 8, 10, '#5d788b'); rect(c, 6, -5, 5, 2, '#e1e8d9');
    rect(c, -9, 4, 7, 5, '#96aeb7'); rect(c, -9, 4, 7, 1, '#f1ecd1');
    c.restore();
    return;
  }

  c.save();
  c.translate(Math.round(x), Math.round(y + bob));
  if (attacking) {
    const pose = attackPose(), lean = pose.phase === 'windup' ? -1 : pose.phase === 'swing' ? 2 : 1;
    c.translate(Math.round(Math.cos(face) * lean), 0);
  }
  c.scale(mirror, 1);

  // Ragged mantle, deep folds and a thin sunlit edge.
  const capeSide = side ? -7 : 0;
  poly(c, [[capeSide - 9, -36], [capeSide + 8, -34], [capeSide + 15 + sway, -4], [capeSide + 8 + sway, -7], [capeSide + 3 + sway, -2], [capeSide - 4 + sway, -6], [capeSide - 14 + sway, -3], [capeSide - 16, -12]], '#170e1b');
  poly(c, [[capeSide - 8, -34], [capeSide + 6, -33], [capeSide + 11 + sway, -7], [capeSide + 4 + sway, -5], [capeSide - 2 + sway, -8], [capeSide - 12 + sway, -5], [capeSide - 13, -13]], '#6f1c34');
  path(c, [[capeSide - 7, -33], [capeSide - 9, -19], [capeSide - 10 + sway, -7]], 2, '#ca4452');
  path(c, [[capeSide + 2, -29], [capeSide + 5 + sway, -9]], 3, '#3f152b');

  // Alternating boots and greaves form a true walk cycle, independent of key presses.
  for (const [legX, lift] of [[-7, step], [3, -step]]) {
    rect(c, legX - 1, -16 + lift, 8, 18, '#121521'); rect(c, legX, -14 + lift, 6, 11, '#455365');
    rect(c, legX, -12 + lift, 2, 8, '#b7c4c6'); rect(c, legX, -8 + lift, 6, 2, '#768899');
    rect(c, legX - 1, -3 + lift, 9, 5, '#291c22'); rect(c, legX, -2 + lift, 7, 2, '#87604b');
  }

  if (side) {
    poly(c, [[-8, -34], [4, -36], [10, -29], [8, -16], [3, -10], [-7, -14]], '#151722');
    rect(c, -5, -32, 10, 16, '#354454'); rect(c, 3, -30, 3, 13, '#91a8b5');
    rect(c, -3, -24, 6, 8, '#1a2934');
  } else {
    poly(c, [[-10, -35], [9, -35], [12, -24], [8, -14], [-9, -14], [-12, -25]], '#111521');
    rect(c, -8, -32, 16, 15, '#556373');
    for (let yy = -31; yy < -17; yy += 3) for (let xx = -7; xx < 8; xx += 3) rect(c, xx + (yy % 2), yy, 1, 1, '#a1b3ba');
    rect(c, -5, -31, 10, 16, '#1b3540'); rect(c, -4, -30, 2, 14, '#3d6670');
    if (!back) { poly(c, [[0, -29], [3, -25], [0, -20], [-2, -25]], '#e0b56f'); rect(c, 0, -27, 1, 4, '#fff0b3'); }
  }

  // Split armor skirts, leather belt and a bright clasp.
  for (let i = 0; i < 3; i++) {
    rect(c, -8 + i * 6, -17, 5, 8, '#22303f');
    rect(c, -8 + i * 6, -17, 1, 7, '#b4b4a4');
    rect(c, -7 + i * 6, -11, 3, 1, '#607986');
  }
  rect(c, -9, -20, 18, 4, '#6d3f29'); rect(c, -8, -20, 16, 1, '#af7844');
  rect(c, side ? 4 : -1, -20, 4, 4, '#efbd6d'); rect(c, side ? 5 : 0, -19, 2, 2, '#402821');

  // The back view puts the embroidered cloak over the armor, without a front-facing visor.
  if (back) {
    poly(c, [[-10, -34], [10, -34], [13 + sway, -7], [5 + sway, -4], [-1 + sway, -7], [-11 + sway, -4]], '#7c243c');
    path(c, [[-8, -33], [-8, -18], [-9 + sway, -7]], 2, '#d64c58');
    path(c, [[6, -31], [8 + sway, -8]], 3, '#41132b');
    path(c, [[0, -29], [4, -24], [0, -19], [-4, -24], [0, -29]], 1, '#d9ab6f');
    rect(c, -1, -30, 2, 14, '#c59061');
  }

  // Pauldrons and the free gauntlet swing opposite the leading foot.
  const freeArm = side ? -7 : -12, armBob = player.moving ? -step * .5 : 0;
  rect(c, freeArm - 2, -31 + armBob, 6, 15, '#15202d');
  rect(c, freeArm - 1, -30 + armBob, 4, 10, '#687b8a');
  rect(c, freeArm - 1, -29 + armBob, 1, 7, '#e6e7d1');
  rect(c, freeArm - 1, -20 + armBob, 5, 5, '#ab957c');
  for (const sx of side ? [-6] : [-11, 8]) {
    poly(c, [[sx - 4, -34], [sx, -39], [sx + 7, -35], [sx + 8, -29], [sx - 4, -28]], '#141924');
    poly(c, [[sx - 3, -34], [sx, -37], [sx + 5, -34], [sx + 6, -30], [sx - 3, -30]], '#647d8c');
    path(c, [[sx - 3, -34], [sx, -37], [sx + 5, -34]], 1, '#e7e8d4');
    rect(c, sx - 2, -30, 7, 1, '#9cb1b6');
  }

  // A narrow crested helm: steel ridges, dark eye slit, cheek plates and a red neck wrap.
  poly(c, [[-9, -43], [-7, -49], [3, -51], [9, -46], [9, -36], [3, -32], [-7, -35]], '#10141f');
  poly(c, [[-7, -43], [-5, -48], [3, -49], [7, -45], [7, -37], [2, -34], [-5, -36]], '#536b7d');
  path(c, [[-5, -47], [1, -49], [5, -47]], 2, '#d4ded8');
  rect(c, -6, -43, 2, 7, '#9dafb4');
  if (back) { rect(c, 0, -48, 2, 13, '#b4c5c7'); rect(c, -4, -36, 10, 4, '#521a30'); }
  else if (side) { poly(c, [[2, -44], [11, -42], [9, -38], [3, -37]], '#161d29'); rect(c, 5, -42, 5, 1, '#f7ce83'); rect(c, 5, -37, 3, 3, '#b9c6c3'); }
  else { rect(c, -5, -43, 12, 4, '#0b1320'); rect(c, -3, -42, 3, 1, '#e8b86d'); rect(c, 3, -42, 3, 1, '#e8b86d'); rect(c, 0, -44, 2, 10, '#c7d4d1'); rect(c, -5, -37, 4, 2, '#849dac'); }

  // Asymmetric worn crown prongs give the silhouette its own identity.
  path(c, [[-6, -46], [-10, -52], [-10, -56]], 2, '#a2b6bf'); rect(c, -10, -56, 1, 3, '#ecedda');
  path(c, [[5, -47], [8, -52], [7, -57]], 2, '#738d9f'); rect(c, 7, -57, 1, 3, '#d3e0de');
  rect(c, -5, -34, 12, 3, '#942d42'); rect(c, -4, -34, 10, 1, '#d76160');
  c.restore();

  const pose = attacking ? attackPose() : null;
  const handAngle = attacking ? pose.angle : face + .42;
  const handX = x + Math.cos(handAngle) * (attacking ? 14 : 12);
  const handY = y - 23 + bob + Math.sin(handAngle) * 7;
  path(c, [[x + (side ? mirror * 5 : 8), y - 31 + bob], [handX, handY]], 6, '#18212d');
  path(c, [[x + (side ? mirror * 5 : 8), y - 32 + bob], [handX, handY - 1]], 3, '#97aebb');
  const w = weapon();
  drawSword(c, handX, handY,
    attacking ? pose.angle : (side ? (dir === 'left' ? 2.2 : .95) : back ? -1.1 : 1.05),
    attacking ? (player.special ? w.heavyLength : w.length + 3) : w.length,
    player.special && attacking, w.palette);
  rect(c, handX - 2, handY - 2, 4, 5, '#c2b49a');
  if (player.inv > 0 && player.roll <= 0) {
    c.save();
    c.globalAlpha = .25 + .2 * Math.sin(game.time * 35);
    path(c, [[x - 12, y - 37], [x - 8, y - 49], [x + 6, y - 51]], 1, '#fff3d8');
    c.restore();
  }
}

/**
 * Aldren as the road left him: bare-headed, a torn brown cloak over a grey
 * shirt, cloth-wrapped shins, and the snapped sword. Shares the wanderer's
 * walk, facing and swing so control feels identical.
 */
function drawBeggarKing(c, x, y) {
  const attacking = player.attack > 0;
  const face = attacking ? player.attackFace : player.face;
  const dir = facingDirection(face);
  const side = dir === 'left' || dir === 'right', back = dir === 'back', mirror = dir === 'left' ? -1 : 1;
  const stride = player.moving ? Math.sin(player.walkPhase) : 0, step = Math.round(stride * 3);
  const bob = player.moving ? Math.round(Math.abs(Math.cos(player.walkPhase)) * 1.5) : Math.round(Math.sin(game.time * 2) * .45);
  const sway = Math.round(Math.sin(player.walkPhase * .5) * 2 * (player.moving ? 1 : .25) + Math.sin(game.time * 2) * .7);
  ellipse(c, x, y + 3, 15, 5, '#080914a6');

  if (player.roll > 0) {
    c.save();
    c.translate(Math.round(x), Math.round(y - 14));
    c.rotate(player.face + (1 - player.roll / .33) * Math.PI * 2);
    poly(c, [[-14, -8], [-4, -14], [10, -9], [15, 3], [5, 12], [-9, 9]], '#140e1c');
    poly(c, [[-12, -6], [-3, -12], [9, -7], [12, 3], [3, 9], [-7, 7]], '#5a4634');
    rect(c, -8, -7, 12, 4, '#8a6f52'); rect(c, 4, -5, 8, 10, '#6e6459'); rect(c, -9, 4, 7, 5, '#b98f6d');
    c.restore();
    return;
  }

  c.save();
  c.translate(Math.round(x), Math.round(y + bob));
  if (attacking) {
    const pose = attackPose(), lean = pose.phase === 'windup' ? -1 : pose.phase === 'swing' ? 2 : 1;
    c.translate(Math.round(Math.cos(face) * lean), 0);
  }
  c.scale(mirror, 1);

  // A torn travelling cloak, hem hanging in strips.
  const capeSide = side ? -7 : 0;
  poly(c, [[capeSide - 9, -36], [capeSide + 8, -34], [capeSide + 14 + sway, -6], [capeSide + 9 + sway, -12], [capeSide + 5 + sway, -3], [capeSide, -9], [capeSide - 5 + sway, -2], [capeSide - 9 + sway, -10], [capeSide - 14 + sway, -4], [capeSide - 16, -12]], '#1a140f');
  poly(c, [[capeSide - 8, -34], [capeSide + 6, -33], [capeSide + 11 + sway, -8], [capeSide + 7 + sway, -12], [capeSide + 3 + sway, -5], [capeSide - 1, -10], [capeSide - 5 + sway, -4], [capeSide - 8 + sway, -11], [capeSide - 13, -13]], '#5a4634');
  path(c, [[capeSide - 7, -33], [capeSide - 9, -19], [capeSide - 10 + sway, -9]], 2, '#7d6247');
  rect(c, capeSide + 1, -27, 4, 3, '#3b2c22');

  // Bare shins wrapped in cloth, boots split at the toe.
  for (const [legX, lift] of [[-7, step], [3, -step]]) {
    rect(c, legX - 1, -16 + lift, 8, 18, '#161219'); rect(c, legX, -14 + lift, 6, 11, '#8c7a66');
    rect(c, legX, -12 + lift, 6, 2, '#b7a48c'); rect(c, legX, -8 + lift, 6, 2, '#b7a48c');
    rect(c, legX - 1, -3 + lift, 9, 5, '#2a1f1a'); rect(c, legX, -2 + lift, 7, 2, '#5e4634');
  }

  // A grey shirt, patched, with a rope for a belt.
  if (side) {
    poly(c, [[-8, -34], [4, -36], [10, -29], [8, -16], [3, -10], [-7, -14]], '#181419');
    rect(c, -5, -32, 10, 16, '#6b6157'); rect(c, 3, -30, 3, 13, '#8a7f73');
    rect(c, -3, -24, 5, 5, '#4f4740');
  } else {
    poly(c, [[-10, -35], [9, -35], [12, -24], [8, -14], [-9, -14], [-12, -25]], '#181419');
    rect(c, -8, -32, 16, 15, '#6b6157');
    rect(c, -5, -31, 10, 16, '#5c534b'); rect(c, -4, -30, 2, 14, '#7d7369');
    rect(c, 2, -26, 4, 4, '#4f4740'); rect(c, -7, -22, 3, 3, '#8b8072');
  }
  path(c, [[-9, -18], [8, -18]], 3, '#7c6242'); rect(c, -1, -19, 3, 3, '#a48657');
  rect(c, -8, -17, 16, 3, '#4a4038');

  if (back) {
    poly(c, [[-10, -34], [10, -34], [13 + sway, -7], [7 + sway, -11], [3 + sway, -4], [-2, -10], [-6 + sway, -3], [-11 + sway, -8]], '#5a4634');
    path(c, [[-8, -33], [-8, -18], [-9 + sway, -8]], 2, '#7d6247');
  }

  // A bare arm, the sleeve torn off at the shoulder.
  const freeArm = side ? -7 : -12, armBob = player.moving ? -step * .5 : 0;
  rect(c, freeArm - 2, -31 + armBob, 6, 15, '#1b1518');
  rect(c, freeArm - 1, -30 + armBob, 4, 14, '#b98f6d');
  rect(c, freeArm - 1, -30 + armBob, 4, 3, '#6b6157');

  // Bare head: dark hair grown out, a short beard, and no crown at all.
  poly(c, [[-8, -43], [-6, -50], [3, -52], [9, -47], [9, -36], [3, -32], [-6, -35]], '#161119');
  poly(c, [[-6, -42], [-4, -47], [3, -49], [7, -45], [7, -37], [2, -34], [-4, -36]], '#c99a74');
  poly(c, [[-7, -44], [-5, -50], [3, -52], [9, -47], [8, -42], [4, -45], [-2, -46], [-6, -42]], '#2b201d');
  if (back) rect(c, -6, -46, 13, 9, '#2b201d');
  else if (side) { rect(c, 2, -43, 5, 1, '#2b201d'); rect(c, 5, -42, 2, 2, '#1c1417'); rect(c, 2, -38, 5, 4, '#4a3428'); }
  else { rect(c, -3, -42, 2, 2, '#1c1417'); rect(c, 3, -42, 2, 2, '#1c1417'); rect(c, -3, -37, 8, 3, '#4a3428'); rect(c, -1, -35, 4, 1, '#2b201d'); }
  rect(c, -5, -34, 12, 3, '#3b2c22'); rect(c, -4, -34, 10, 1, '#5a4634');
  c.restore();

  const pose = attacking ? attackPose() : null;
  const handAngle = attacking ? pose.angle : face + .42;
  const handX = x + Math.cos(handAngle) * (attacking ? 14 : 12);
  const handY = y - 23 + bob + Math.sin(handAngle) * 7;
  path(c, [[x + (side ? mirror * 5 : 8), y - 31 + bob], [handX, handY]], 6, '#1b1518');
  path(c, [[x + (side ? mirror * 5 : 8), y - 32 + bob], [handX, handY - 1]], 3, '#b98f6d');
  drawSword(c, handX, handY,
    attacking ? pose.angle : (side ? (dir === 'left' ? 2.2 : .95) : back ? -1.1 : 1.05),
    18, false, RUSTED, true);
  rect(c, handX - 2, handY - 2, 4, 5, '#c9a074');
  if (player.inv > 0 && player.roll <= 0) {
    c.save();
    c.globalAlpha = .25 + .2 * Math.sin(game.time * 35);
    path(c, [[x - 12, y - 37], [x - 8, y - 49], [x + 6, y - 51]], 1, '#fff3d8');
    c.restore();
  }
}

export function human(c, x, y, type = 'player') {
  if (type === 'player') { drawWanderer(c, x, y); return; }
  const watching = Math.hypot(player.x - x, player.y - y) < 120;
  const facing = watching ? Math.sign(player.x - x) || 1 : 1;
  ellipse(c, x, y + 3, 14, 5, '#090913a6');
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(facing, 1);
  if (type === 'smith') drawRowan(c); else if (type === 'peddler') drawOrrin(c);
  else if (type === 'apothecary') drawBrewer(c);
  else if (type === 'wife') drawNeve(c);
  else if (type === 'boy' || type === 'girl') drawChild(c, type === 'girl');
  else drawMira(c);
  c.restore();
}

/**
 * Rowan at the anvil: fur collar over a chain shirt, a scarred leather apron,
 * heavy gloves, a hammer that keeps time and tongs holding a glowing billet.
 * Drawn at the wanderer's scale so the two read as the same kind of thing.
 */
function drawRowan(c) {
  const t = game.time, work = Math.max(0, Math.sin(t * 3.5)), breath = Math.round(Math.sin(t * 1.7) * .8);
  const strike = Math.sin(t * 3.5) < -.85;
  // Boots and thick wool trousers.
  for (const lx of [-9, 2]) {
    rect(c, lx - 1, -18, 9, 19, '#14111a'); rect(c, lx, -16, 7, 11, '#3d3540');
    rect(c, lx, -10, 7, 1, '#2a242e');
    rect(c, lx - 1, -5, 9, 6, '#2a1d1a'); rect(c, lx, -4, 7, 2, '#5f4531'); rect(c, lx, -1, 8, 1, '#120d10');
  }
  // Chain shirt under everything, with a few bright links.
  poly(c, [[-13, -38], [12, -38], [15, -24], [12, -14], [-12, -14], [-15, -24]], '#12141c');
  rect(c, -12, -36, 24, 21, '#4b5563');
  for (let yy = -35; yy < -16; yy += 3) for (let xx = -11; xx < 12; xx += 3) rect(c, xx + (yy % 2 ? 1 : 0), yy, 1, 1, '#9aa7ab');
  // Leather apron, straps crossing behind the neck, scorch marks and a tool loop.
  poly(c, [[-8, -33], [8, -33], [10, -20], [9, -4 + breath], [-9, -4 + breath], [-10, -20]], '#1d1410');
  poly(c, [[-7, -32], [7, -32], [9, -20], [8, -5 + breath], [-8, -5 + breath], [-9, -20]], '#7a4a2b');
  rect(c, -6, -31, 12, 1, '#9c6438'); rect(c, -6, -20, 12, 1, '#5a331d');
  rect(c, -3, -14, 3, 2, '#3f2416'); rect(c, 3, -9, 2, 3, '#3f2416'); rect(c, -6, -8, 2, 2, '#3f2416');
  path(c, [[-6, -32], [-2, -38]], 2, '#4a2d1c'); path(c, [[6, -32], [2, -38]], 2, '#4a2d1c');
  rect(c, -9, -22, 18, 3, '#3a2419'); rect(c, -1, -22, 4, 3, '#c9a05a'); rect(c, 5, -21, 3, 6, '#5e4a3a');
  // Fur collar and broad shoulders.
  for (let i = 0; i < 9; i++) { const fx = -15 + i * 4, fy = -40 + Math.abs(4 - i); rect(c, fx, fy, 4, 5, i % 2 ? '#a88960' : '#6e5641'); rect(c, fx + 1, fy, 2, 2, '#c9ad83'); }
  rect(c, -14, -37, 4, 5, '#5c4636'); rect(c, 10, -37, 4, 5, '#5c4636');
  // Head: cropped dark hair, thick brows, a full beard, a sweat band.
  rect(c, -6, -55, 13, 15, '#1a1822');
  rect(c, -4, -53, 9, 12, '#b87853'); rect(c, 2, -52, 3, 9, '#d3986c');
  rect(c, -5, -56, 11, 5, '#2d2322'); rect(c, -5, -52, 2, 5, '#2d2322'); rect(c, 5, -52, 2, 4, '#2d2322');
  rect(c, -5, -51, 12, 2, '#8a5a3c'); rect(c, -4, -51, 10, 1, '#c37d4f');
  rect(c, -3, -48, 3, 1, '#2a1f1d'); rect(c, 2, -48, 3, 1, '#2a1f1d');
  rect(c, -2, -47, 2, 2, '#f1e3d2'); rect(c, 3, -47, 2, 2, '#f1e3d2'); rect(c, -1, -47, 1, 2, '#1a1a22'); rect(c, 4, -47, 1, 2, '#1a1a22');
  poly(c, [[-5, -44], [8, -44], [7, -37], [1, -35], [-4, -38]], '#382927'); rect(c, -3, -43, 8, 2, '#5b3d33');
  // Off hand: tongs gripping a billet that glows brighter the moment the hammer lands.
  rect(c, -16, -30, 6, 11, '#151a24'); rect(c, -15, -29, 4, 9, '#5d6a77');
  rect(c, -16, -21, 6, 5, '#4a3324'); rect(c, -15, -20, 4, 3, '#7a5537');
  path(c, [[-14, -18], [-22, -12]], 2, '#6d6f78'); path(c, [[-14, -19], [-23, -14]], 2, '#8d9098');
  rect(c, -27, -15, 6, 3, strike ? '#fff0a8' : '#f2a34d'); rect(c, -26, -14, 4, 1, strike ? '#ffffff' : '#ffd88a');
  // Hammer arm: a glove on a chain sleeve, and the hammer arc.
  const lift = work * 12;
  path(c, [[11, -31], [17, -22 - lift]], 6, '#151a24'); path(c, [[11, -31], [17, -22 - lift]], 4, '#5d6a77');
  rect(c, 14, -24 - lift, 6, 6, '#4a3324'); rect(c, 15, -23 - lift, 4, 4, '#7a5537');
  path(c, [[17, -23 - lift], [24, -34 - lift * .8]], 3, '#8b6b45');
  rect(c, 19, -40 - lift * .8, 14, 7, '#141821'); rect(c, 20, -39 - lift * .8, 12, 5, '#a9b4b6'); rect(c, 20, -39 - lift * .8, 12, 1, '#e4ebe6');
  if (strike) for (let i = 0; i < 4; i++) rect(c, -26 + Math.sin(t * 40 + i * 2) * 8, -20 - i * 4, 2, 2, '#ffd66e');
}

/**
 * Mira, keeper of the fire: a hooded wine-red travelling robe with gold at the
 * hems, a leather satchel, long dark hair, and a staff with a lantern that
 * never goes out. Breathes, and the lantern sways.
 */
function drawMira(c) {
  const t = game.time, breath = Math.round(Math.sin(t * 1.6) * .8), sway = Math.sin(t * 1.3) * 2;
  // Robe: a long skirt to the ground, split hem, gold trim, a lighter inner layer.
  poly(c, [[-9, -30], [9, -30], [13, -8], [12, 1], [-12, 1], [-13, -8]], '#2a0f1c');
  poly(c, [[-8, -29], [8, -29], [12, -8], [11, 0], [-11, 0], [-12, -8]], '#7f2440');
  poly(c, [[-3, -18], [3, -18], [6, 0], [-6, 0]], '#4e1630');
  path(c, [[-11, -1], [11, -1]], 1, '#d9b46a'); path(c, [[-9, -28], [-11, -8], [-10, 0]], 1, '#b7495a');
  path(c, [[7, -28], [10, -8], [9, 0]], 1, '#5b1a33');
  for (const [fx, fy] of [[-4, -12], [3, -6], [-1, -3]]) rect(c, fx, fy, 1, 3, '#9a2f4a');
  // Bodice, sash and the satchel strap.
  rect(c, -8, -35, 16, 12, '#170d17'); rect(c, -7, -34, 14, 10, '#5d1a34');
  rect(c, -6, -33, 5, 8, '#832a46'); rect(c, -2, -33, 1, 8, '#b7495a');
  rect(c, -7, -25, 14, 3, '#3a2320'); rect(c, -7, -25, 14, 1, '#d9b46a'); rect(c, 0, -25, 2, 3, '#e6c97e');
  path(c, [[-6, -34], [6, -22]], 2, '#4a3225');
  rect(c, 6, -21, 7, 6, '#4a3225'); rect(c, 7, -20, 5, 3, '#6b4a33'); rect(c, 8, -18, 3, 1, '#c9a05a');
  // Cloak and hood laid back over the shoulders.
  poly(c, [[-11, -36], [11, -36], [13, -30], [10, -28], [-10, -28], [-13, -30]], '#1c1120');
  poly(c, [[-10, -36], [10, -36], [11, -31], [-11, -31]], '#3a1a33');
  rect(c, -12, -33, 24, 1, '#5a2a4a');
  // Arms: one holding the staff, one resting on the satchel.
  rect(c, -12, -32, 5, 12, '#170d17'); rect(c, -11, -31, 3, 10, '#7f2440'); rect(c, -11, -22, 3, 3, '#d49a78');
  rect(c, 7, -32, 5, 10, '#170d17'); rect(c, 8, -31, 3, 8, '#7f2440'); rect(c, 8, -24, 3, 3, '#d49a78');
  // Head: long dark hair past the shoulders, a gold earring, a calm face.
  rect(c, -7, -50, 15, 16, '#171520');
  rect(c, -8, -48, 4, 22, '#1f1b2a'); rect(c, 5, -48, 4, 20, '#1f1b2a'); rect(c, -7, -47, 1, 18, '#3c2d40');
  rect(c, -4, -48, 9, 12, '#d49a78'); rect(c, 2, -47, 3, 9, '#f2c4a0');
  rect(c, -5, -52, 11, 6, '#171520'); rect(c, -5, -49, 2, 3, '#171520'); rect(c, 4, -49, 2, 4, '#171520');
  rect(c, -6, -47, 3, 3, '#3c2d40');
  rect(c, -3, -43, 3, 1, '#33222c'); rect(c, 2, -43, 3, 1, '#33222c');
  rect(c, -2, -42, 2, 2, '#f3ddc4'); rect(c, 3, -42, 2, 2, '#f3ddc4'); rect(c, -1, -42, 1, 2, '#171820'); rect(c, 4, -42, 1, 2, '#171820');
  rect(c, 0, -40, 1, 2, '#a46c59'); rect(c, -1, -38, 4, 1, '#8d4451');
  rect(c, 6, -44, 1, 2, '#ffd88a'); rect(c, 6, -42, 2, 2, '#e6b76e');
  // The keeper's staff and lantern.
  rect(c, -14, -44, 2, 45, '#2a1b16'); rect(c, -14, -44, 1, 45, '#5c3f2c');
  path(c, [[-13, -44], [-13 + sway, -37]], 1, '#4a3225');
  rect(c, -16 + sway, -37, 6, 8, '#2b2432'); rect(c, -15 + sway, -36, 4, 6, '#ffcf7a'); rect(c, -14 + sway, -35, 2, 3, '#fff2c4');
  rect(c, -16 + sway, -37, 6, 1, '#5b4a3a'); rect(c, -16 + sway, -30, 6, 1, '#5b4a3a');
  c.globalAlpha = .18 + Math.sin(t * 6) * .04; ellipse(c, -13 + sway, -33, 10, 8, '#ffcf7a'); c.globalAlpha = 1;
  if (breath) rect(c, -6, -34, 12, 1, '#6b1f3b');
}

// Creature palettes, drawn from the reference sheet: a hunched forest goblin and
// a heavier tusked brute plated with the stone it lives in.
const CREATURE_PALETTE = {
  /**
   * The vault's people. Skin rather than hide, cloth rather than fur, and a
   * blade that was made in a forge — they read as men at a glance, which is the
   * whole point of putting them on a drowned coast instead of more beasts.
   */
  rogue: {
    // Hooded, wrapped to the eyes, a dull knife held low.
    hooded: {
      outline: '#12131a', dark: '#2a2f3c', mid: '#3d4456', light: '#555d72',
      belly: '#6b7389', rim: '#8b93a8', eye: '#e8e0c0', claw: '#cfd6dd', gum: '#5a3a42',
      weapon: 'knife', mantle: '#232733', mantleLight: '#3a4152',
    },
    // Bare-armed, tattooed, a knife in each hand.
    knifehand: {
      outline: '#1a1410', dark: '#4a3a2e', mid: '#6d5642', light: '#997a58',
      belly: '#c0a07a', rim: '#d8bd96', eye: '#ffd06a', claw: '#dfe6ea', gum: '#7d3d46',
      weapon: 'knife', paint: '#2d4f6b',
    },
  },
  bandit: {
    // Boiled leather over a salt-stained shirt, a hatchet off a ship's rail.
    leather: {
      outline: '#161210', dark: '#452f22', mid: '#6a4a32', light: '#8f6c45',
      belly: '#b39a72', rim: '#d0b98f', eye: '#ffc45e', claw: '#e4dccb', gum: '#7d3d46',
      weapon: 'hatchet', mantle: '#3f2c20', mantleLight: '#6b4d34',
    },
    // Heavier, a jaw-strap of iron and a nose that has been broken twice.
    ironjaw: {
      outline: '#14161a', dark: '#333a40', mid: '#4f585f', light: '#6f7a82',
      belly: '#94a0a6', rim: '#b4c0c6', eye: '#ffd06a', claw: '#dfe6ea', gum: '#5a3a42',
      weapon: 'hatchet', paint: '#8a2f38', mantle: '#2a3036', mantleLight: '#49525a',
    },
  },
  corsair: {
    // The captain: a long coat gone green with salt, a tricorn, a cutlass.
    captain: {
      outline: '#101418', dark: '#1f3a34', mid: '#2f5a4c', light: '#457a63',
      belly: '#8aa892', rim: '#b6cbb4', eye: '#ffd06a', claw: '#e8e2cf', gum: '#7d3d46',
      weapon: 'cutlass', mantle: '#1b3129', mantleLight: '#356052', hat: true, sash: '#a3313c',
    },
    // The bosun: red coat, gold braid, and a cutlass he uses more than the captain does.
    bosun: {
      outline: '#160f12', dark: '#4a1f26', mid: '#6e2f36', light: '#94454a',
      belly: '#c08a78', rim: '#dcae95', eye: '#ffc45e', claw: '#e8e2cf', gum: '#7d3d46',
      weapon: 'cutlass', mantle: '#3a181e', mantleLight: '#6a2c34', hat: true, sash: '#d8b45a',
    },
  },
  wildling: {
    // The forest goblin: mossy hide, a spined back, a bone shiv.
    moss: {
      outline: '#131b16', dark: '#2c4030', mid: '#496139', light: '#6f8c49',
      belly: '#94955c', rim: '#a9cb8a', eye: '#ffd06a', claw: '#ded3ae', gum: '#7d3d46',
      weapon: 'shiv',
    },
    // The ash raider: grey-brown hide under a fur mantle, red war paint, a hatchet.
    ashen: {
      outline: '#181214', dark: '#4a3833', mid: '#6e574c', light: '#93806d',
      belly: '#b8a48c', rim: '#d1c0aa', eye: '#ffc45e', claw: '#e4dccb', gum: '#7d3d46',
      weapon: 'hatchet', paint: '#b8323a', mantle: '#5a4632', mantleLight: '#8d7250',
    },
    // The bog ghoul: sunken and slick, eyes like marsh-light, nothing but claws.
    bog: {
      outline: '#0e1917', dark: '#1e3a33', mid: '#2f5a4b', light: '#4c7f63',
      belly: '#5f7d60', rim: '#8fbf9a', eye: '#8dffd0', claw: '#d3e6d2', gum: '#3c4a3b',
      weapon: 'claws', gaunt: true,
    },
  },
  brute: {
    // Plated with the quarry's grey stone.
    quarry: {
      outline: '#15121a', dark: '#3c332c', mid: '#6b5942', light: '#937954',
      belly: '#b09468', rim: '#d6c096', eye: '#ffb35e', claw: '#e3dcc2', gum: '#6d3238',
      plates: ['#2c333b', '#6e7883', '#a8b2ba', '#d3dade'],
    },
    // Ironback: darker hide, rusted iron plates, ironstone crystals grown into the shoulders.
    ironback: {
      outline: '#110e15', dark: '#2b2430', mid: '#4b414f', light: '#6f6377',
      belly: '#8c8090', rim: '#b3a7bb', eye: '#7fd3ff', claw: '#e3dcc2', gum: '#5a2f3a',
      plates: ['#1c2230', '#3b4a63', '#6383a6', '#a9d4f0'], crystals: true,
    },
  },
};

CREATURE_PALETTE.wolf = {
  grey:    { outline: '#0e1014', dark: '#3a3d45', mid: '#6b7078', light: '#9aa0a8', belly: '#c2c5c8', eye: '#ffd06a', tooth: '#efe9d8', nose: '#15151c' },
  black:   { outline: '#08090c', dark: '#1a1b22', mid: '#2e3038', light: '#4a4d58', belly: '#6a6d78', eye: '#ff6b3d', tooth: '#efe9d8', nose: '#050508' },
  pale:    { outline: '#14151a', dark: '#8a8c92', mid: '#c4c6cc', light: '#e9eaee', belly: '#ffffff', eye: '#7fd3ff', tooth: '#ffffff', nose: '#3a3a44' },
  // Greymane: the alpha, a great scarred wolf with a pale mane.
  alpha:   { outline: '#0e1014', dark: '#3a3d45', mid: '#5c6068', light: '#8d9299', belly: '#c2c5c8', eye: '#ffd06a', tooth: '#efe9d8', nose: '#15151c', mane: '#e6e2d4', scars: '#a8434a' },
  // Mycel: a wolf the grove grew into — caps along the spine, light in the ribs.
  grafted: { outline: '#0c1412', dark: '#243a30', mid: '#3d5a4a', light: '#5f8a6c', belly: '#8fbf9a', eye: '#8dffd0', tooth: '#d3e6d2', nose: '#0c1412', caps: '#6fd6b0', capDark: '#2a7a5a' },
};
CREATURE_PALETTE.frog = {
  green: { outline: '#0b1a10', dark: '#1e4a2a', mid: '#3a7a44', light: '#66aa55', belly: '#c9d88a', eye: '#ffd06a', throat: '#a8e04a' },
  ochre: { outline: '#1a1408', dark: '#4a3a14', mid: '#7a6420', light: '#a89040', belly: '#d8c88a', eye: '#a8e04a', throat: '#c9e06a' },
};
CREATURE_PALETTE.sporeling = {
  teal:   { outline: '#0e1917', stalk: '#c9c2a6', stalkDark: '#8a836d', cap: '#2a7a5a', capLight: '#6fd6b0', spots: '#d8fff0', eye: '#6fd6b0' },
  violet: { outline: '#140f19', stalk: '#c2b8c6', stalkDark: '#857b8a', cap: '#5a2a80', capLight: '#b48ad0', spots: '#f0e0ff', eye: '#b48ad0' },
  amber:  { outline: '#1a1208', stalk: '#d0c3a0', stalkDark: '#8f8266', cap: '#8a4a12', capLight: '#f2a54b', spots: '#ffe7b8', eye: '#f2a54b' },
  // The Sporemother: bloated, hung with gills, many small caps crowding the big one.
  mother: { outline: '#140f19', stalk: '#b9aebe', stalkDark: '#6f6473', cap: '#4a1f6a', capLight: '#b48ad0', spots: '#f0e0ff', eye: '#d9b0ff', gills: '#e2c8ff', crowd: '#6fd6b0' },
};

/** The palette for a creature: its skin if it has one, else the first of its kind. */
export function creaturePalette(e) {
  const skins = CREATURE_PALETTE[e.kind] || CREATURE_PALETTE.wildling;
  return skins[e.skin] || Object.values(skins)[0];
}

/** Speckled hide texture — breaks up large fills so they never read as flat. */
function speckle(c, x0, y0, x1, y1, seed, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.sin(seed + i * 12.9898) * 43758.5453;
    const b = Math.sin(seed + i * 78.233) * 12345.678;
    const x = x0 + (a - Math.floor(a)) * (x1 - x0);
    const y = y0 + (b - Math.floor(b)) * (y1 - y0);
    rect(c, x, y, 1 + (i % 2), 1, color);
  }
}

/** Hunched, long-armed, all knuckles and teeth. */
function goblinBody(c, pal, stride, raise, lookX, back, breath) {
  const step = stride * 3;

  // Far arm sits behind the torso so the body reads in front of it.
  path(c, [[7, -22], [15, -13], [13, -2]], 5, pal.outline);
  path(c, [[7, -22], [14, -13], [12, -3]], 3, pal.dark);
  rect(c, 10, -3, 6, 4, pal.outline);
  rect(c, 11, -3, 4, 3, pal.claw);

  for (const [fx, lift] of [[-11, step], [3, -step]]) {
    rect(c, fx, -8 + lift, 8, 9, pal.outline);
    rect(c, fx + 1, -7 + lift, 6, 6, pal.dark);
    rect(c, fx + 1, -7 + lift, 6, 2, pal.mid);
    for (let i = 0; i < 3; i++) rect(c, fx + i * 3, 0 + lift, 2, 3, pal.claw);
  }
  for (const [hx, lift] of [[-7, step], [5, -step]]) {
    path(c, [[hx, -16], [hx - 1, -9 + lift * .4]], 5, pal.outline);
    path(c, [[hx, -16], [hx - 1, -10 + lift * .4]], 3, pal.mid);
  }

  // Compact hunched torso — the rear shoulder is the high point.
  poly(c, [[-13, -7], [-14, -20], [-9, -28 - breath], [1, -30 - breath], [10, -25], [12, -14], [9, -5], [-5, -3]], pal.outline);
  poly(c, [[-11, -8], [-12, -20], [-8, -26 - breath], [1, -28 - breath], [8, -24], [10, -14], [7, -6], [-4, -5]], pal.mid);
  poly(c, [[-11, -14], [-10, -21], [-7, -26 - breath], [1, -27 - breath], [5, -24], [1, -19], [-5, -15]], pal.light);
  poly(c, [[-10, -8], [-3, -11], [7, -11], [9, -6], [-3, -4]], pal.dark);
  speckle(c, -10, -25, 8, -9, 3.1, pal.dark, 12);
  if (pal.gaunt) {
    // Ribs through a sunken chest, and a slick sheen down the spine.
    for (let i = 0; i < 4; i++) path(c, [[-7, -20 + i * 3], [3, -21 + i * 3]], 1, pal.dark);
    path(c, [[-11, -14], [-9, -24 - breath], [0, -27 - breath]], 1, '#bfe7d3');
  } else {
    for (let i = 0; i < 3; i++) poly(c, [[-6 + i * 5, -18], [-2 + i * 5, -19], [-1 + i * 5, -12], [-5 + i * 5, -11]], pal.belly);
  }
  if (pal.paint) for (let i = 0; i < 3; i++) rect(c, -8 + i * 5, -23 + i, 2, 6, pal.paint);
  if (pal.mantle) {
    // A fur mantle lashed over the shoulders, with a bone toggle.
    for (let i = 0; i < 7; i++) { const mx = -12 + i * 4, my = -27 - breath - Math.abs(3 - i); rect(c, mx, my, 4, 6, i % 2 ? pal.mantleLight : pal.mantle); rect(c, mx + 1, my, 2, 2, pal.rim); }
    rect(c, -1, -22 - breath, 4, 2, pal.claw);
  } else {
    for (let i = 0; i < 4; i++) {
      const sx = -9 + i * 4, h = 5 + Math.abs(1.5 - i) * 2;
      poly(c, [[sx, -25 - breath], [sx + 2, -25 - h - breath], [sx + 4, -24 - breath]], pal.outline);
      poly(c, [[sx + 1, -25 - breath], [sx + 2, -24 - h - breath], [sx + 3, -24 - breath]], pal.dark);
    }
  }

  // Near arm, held clear of the torso, cocked around a bone shiv.
  const ax = -15, ay = -20 - raise * 12;
  path(c, [[-9, -23], [ax - 1, ay]], 5, pal.outline);
  path(c, [[-9, -23], [ax, ay]], 3, pal.light);
  path(c, [[-9, -24], [ax, ay - 1]], 1, pal.rim);
  rect(c, ax - 4, ay - 3, 6, 6, pal.outline);
  rect(c, ax - 3, ay - 2, 4, 4, pal.dark);
  if (pal.weapon === 'hatchet') {
    // A short haft with a chipped iron head, bound with cord.
    path(c, [[ax - 1, ay + 1], [ax - 4, ay - 14 - raise * 6]], 3, '#1a1410');
    path(c, [[ax - 1, ay + 1], [ax - 4, ay - 14 - raise * 6]], 1, '#8a6a42');
    rect(c, ax - 3, ay - 6, 3, 1, '#b8323a');
    poly(c, [[ax - 5, ay - 16 - raise * 6], [ax - 12, ay - 14 - raise * 6], [ax - 12, ay - 7 - raise * 6], [ax - 4, ay - 9 - raise * 6]], '#15161c');
    poly(c, [[ax - 5, ay - 15 - raise * 6], [ax - 11, ay - 13 - raise * 6], [ax - 11, ay - 8 - raise * 6], [ax - 5, ay - 10 - raise * 6]], '#7c848c');
    rect(c, ax - 11, ay - 13 - raise * 6, 1, 5, '#d8dde0');
  } else if (pal.weapon === 'cutlass') {
    // A broad curved blade with a shell guard, kept bright when nothing else is.
    const tipY = ay - 30 - raise * 8;
    rect(c, ax - 4, ay - 2, 4, 7, '#2a1d16');
    c.strokeStyle = pal.outline; c.lineWidth = 5;
    c.beginPath(); c.moveTo(ax - 2, ay - 3); c.quadraticCurveTo(ax - 16, ay - 18 - raise * 5, ax - 9, tipY); c.stroke();
    c.strokeStyle = '#cfd8de'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(ax - 2, ay - 3); c.quadraticCurveTo(ax - 15, ay - 18 - raise * 5, ax - 9, tipY); c.stroke();
    c.strokeStyle = '#fffaeb'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(ax - 3, ay - 5); c.quadraticCurveTo(ax - 14, ay - 19 - raise * 5, ax - 9, tipY + 2); c.stroke();
    // The shell guard over the knuckles.
    poly(c, [[ax - 1, ay - 1], [ax - 9, ay - 6], [ax - 8, ay + 3], [ax, ay + 4]], pal.outline);
    poly(c, [[ax - 2, ay - 1], [ax - 8, ay - 5], [ax - 7, ay + 2], [ax - 1, ay + 3]], '#c9a24a');
  } else if (pal.weapon === 'knife') {
    poly(c, [[ax - 3, ay - 2], [ax - 7, ay - 17 - raise * 6], [ax - 1, ay - 2]], pal.outline);
    poly(c, [[ax - 3, ay - 3], [ax - 6, ay - 15 - raise * 6], [ax - 2, ay - 3]], '#cfd8de');
    rect(c, ax - 4, ay - 2, 4, 5, '#2a1d16');
  } else if (pal.weapon === 'claws') {
    for (let i = 0; i < 3; i++) {
      path(c, [[ax - 3 + i * 2, ay - 2], [ax - 6 + i * 3, ay - 12 - raise * 6 - (i === 1 ? 2 : 0)]], 2, pal.outline);
      path(c, [[ax - 3 + i * 2, ay - 2], [ax - 6 + i * 3, ay - 11 - raise * 6 - (i === 1 ? 2 : 0)]], 1, pal.claw);
    }
  } else {
    poly(c, [[ax - 4, ay - 3], [ax - 6, ay - 15 - raise * 6], [ax, ay - 3]], pal.outline);
    poly(c, [[ax - 3, ay - 4], [ax - 5, ay - 13 - raise * 6], [ax - 1, ay - 4]], pal.claw);
    rect(c, ax - 4, ay - 11 - raise * 5, 1, 7, '#fffaeb');
  }

  // A real neck: the head sits clear above the shoulders, not on them.
  poly(c, [[-6, -28 - breath], [3, -30 - breath], [4, -33], [-5, -32]], pal.outline);
  poly(c, [[-5, -29 - breath], [2, -30 - breath], [3, -33], [-4, -32]], pal.dark);

  // Head: wide jaw, tusks, tall notched ears.
  poly(c, [[-12, -37], [-8, -47], [2, -50], [10, -45], [10, -35], [-1, -31]], pal.outline);
  poly(c, [[-10, -37], [-7, -45], [2, -48], [8, -44], [8, -36], [-1, -33]], pal.mid);
  poly(c, [[-8, -40], [-5, -45], [2, -47], [6, -44], [4, -40], [-3, -38]], pal.light);
  poly(c, [[-13, -44], [-19, -57], [-10, -50]], pal.outline);
  poly(c, [[-12, -45], [-16, -54], [-10, -49]], pal.mid);
  poly(c, [[8, -44], [15, -56], [12, -43]], pal.outline);
  poly(c, [[9, -44], [13, -53], [11, -43]], pal.dark);
  if (!back) {
    rect(c, -7 + lookX, -43, 6, 5, pal.outline);
    rect(c, 2 + lookX, -43, 6, 5, pal.outline);
    rect(c, -6 + lookX, -42, 4, 3, pal.eye);
    rect(c, 3 + lookX, -42, 4, 3, pal.eye);
    rect(c, -5 + lookX, -42, 1, 3, '#3b2410');
    rect(c, 4 + lookX, -42, 1, 3, '#3b2410');
    poly(c, [[-8, -37], [8, -36], [5, -31], [-4, -32]], pal.outline);
    poly(c, [[-7, -36], [7, -35], [4, -32], [-3, -33]], pal.gum);
    poly(c, [[-6, -36], [-4, -31], [-2, -36]], pal.claw);
    poly(c, [[3, -36], [5, -32], [7, -36]], pal.claw);
    rect(c, -1, -35, 2, 3, pal.claw);
    if (pal.paint) { rect(c, -7 + lookX, -46, 2, 8, pal.paint); rect(c, 4 + lookX, -46, 2, 8, pal.paint); }
    if (pal.gaunt) { rect(c, -1, -31, 1, 3 + Math.round(Math.abs(Math.sin(game.time * 3)) * 3), '#bfe7d3'); rect(c, -8 + lookX, -44, 2, 2, pal.eye); rect(c, 7 + lookX, -44, 2, 2, pal.eye); }
  } else {
    path(c, [[-7, -43], [0, -39], [7, -43]], 2, pal.dark);
    speckle(c, -8, -46, 6, -36, 8.4, pal.dark, 8);
  }
  path(c, [[-12, -14], [-12, -22], [-7, -28 - breath]], 1, pal.rim);
  path(c, [[-9, -46], [1, -49], [8, -45]], 1, pal.rim);
  // A sash across the chest, for the ones who dress for it.
  if (pal.sash) {
    path(c, [[-11, -34 - breath], [9, -18]], 5, pal.outline);
    path(c, [[-11, -34 - breath], [9, -18]], 3, pal.sash);
  }
  // The tricorn: three corners, a low brim, and nothing of the face under it.
  if (pal.hat) {
    const hy = -50;
    poly(c, [[-16, hy + 4], [-6, hy - 3], [6, hy - 4], [17, hy + 3], [10, hy + 8], [-9, hy + 8]], pal.outline);
    poly(c, [[-14, hy + 4], [-5, hy - 1], [5, hy - 2], [15, hy + 3], [9, hy + 6], [-8, hy + 6]], pal.mantle || pal.dark);
    poly(c, [[-9, hy + 1], [0, hy - 8], [9, hy + 1], [4, hy + 3], [-4, hy + 3]], pal.outline);
    poly(c, [[-7, hy + 1], [0, hy - 6], [7, hy + 1], [3, hy + 2], [-3, hy + 2]], pal.mantleLight || pal.mid);
    rect(c, -2, hy - 5, 4, 3, pal.sash || '#c9a24a');
  }
}

/** Slab-shouldered, stone-plated, swings something heavy. */
function bruteBody(c, pal, stride, raise, lookX, back, breath) {
  const step = stride * 2.5;

  path(c, [[10, -26], [19, -14], [17, -2]], 6, pal.outline);
  path(c, [[10, -26], [18, -14], [16, -3]], 4, pal.dark);
  rect(c, 13, -3, 8, 5, pal.outline);
  rect(c, 14, -2, 6, 3, pal.mid);

  for (const [fx, lift] of [[-13, step], [4, -step]]) {
    rect(c, fx, -10 + lift, 10, 11, pal.outline);
    rect(c, fx + 1, -9 + lift, 8, 8, pal.dark);
    rect(c, fx + 1, -9 + lift, 8, 3, pal.mid);
    rect(c, fx + 1, 0 + lift, 8, 3, pal.claw);
  }
  for (const [hx, lift] of [[-8, step], [5, -step]]) {
    path(c, [[hx, -19], [hx - 1, -11 + lift * .4]], 7, pal.outline);
    path(c, [[hx, -19], [hx - 1, -12 + lift * .4]], 4, pal.mid);
  }

  // Hunched barrel: high at the rear shoulder, sloping down to the chest.
  poly(c, [[-16, -8], [-17, -24], [-11, -34 - breath], [2, -37 - breath], [13, -31], [16, -18], [13, -6], [-6, -4]], pal.outline);
  poly(c, [[-14, -9], [-15, -24], [-10, -32 - breath], [2, -35 - breath], [11, -30], [14, -18], [11, -7], [-5, -6]], pal.mid);
  poly(c, [[-14, -17], [-13, -26], [-8, -32 - breath], [2, -34 - breath], [7, -30], [1, -24], [-6, -20]], pal.light);
  poly(c, [[-13, -9], [-3, -13], [11, -12], [13, -7], [-5, -5]], pal.dark);
  speckle(c, -12, -30, 11, -10, 11.7, pal.dark, 16);
  poly(c, [[-7, -23], [3, -25], [5, -13], [-5, -11]], pal.belly);
  for (let i = 0; i < 3; i++) path(c, [[-7, -21 + i * 4], [3, -22 + i * 4]], 1, pal.dark);

  // Stone or iron lashed over both shoulders, angled and edge-lit.
  const [p0, p1, p2, p3] = pal.plates;
  poly(c, [[-18, -25], [-12, -36], [-1, -39], [0, -27], [-8, -21]], p0);
  poly(c, [[-16, -26], [-11, -34], [-3, -36], [-3, -28], [-8, -24]], p1);
  poly(c, [[-15, -28], [-11, -33], [-6, -34], [-8, -29]], p2);
  rect(c, -12, -31, 3, 3, p3);
  poly(c, [[16, -23], [11, -35], [2, -38], [2, -27], [10, -20]], p0);
  poly(c, [[14, -24], [10, -33], [5, -35], [5, -28], [9, -23]], p1);
  rect(c, 7, -31, 3, 3, p2);
  if (pal.crystals) {
    // Ironstone grown through the plates, lit from inside.
    for (const [cx, cy, h] of [[-13, -34, 9], [-8, -37, 6], [9, -34, 7]]) {
      poly(c, [[cx - 3, cy], [cx, cy - h], [cx + 3, cy]], '#2d5f86');
      poly(c, [[cx - 1, cy], [cx, cy - h + 1], [cx + 2, cy]], '#a3ebff');
    }
    for (let i = 0; i < 4; i++) rect(c, -6 + i * 4, -8 - (i % 2) * 2, 2, 2, '#3b4a63');
  }
  path(c, [[-11, -28], [8, -23]], 3, '#2f2620');
  path(c, [[-11, -29], [8, -24]], 1, '#6d5233');

  // Near arm and the stone maul it keeps overhead.
  const ax = -18, ay = -23 - raise * 14;
  path(c, [[-12, -27], [ax - 1, ay]], 6, pal.outline);
  path(c, [[-12, -27], [ax, ay]], 4, pal.light);
  path(c, [[-12, -28], [ax, ay - 1]], 1, pal.rim);
  rect(c, ax - 5, ay - 3, 8, 6, pal.outline);
  rect(c, ax - 4, ay - 2, 6, 4, pal.mid);
  path(c, [[ax - 2, ay + 1], [ax - 7, ay - 15 - raise * 7]], 4, '#2b2119');
  path(c, [[ax - 2, ay], [ax - 7, ay - 15 - raise * 7]], 2, '#7c6240');
  poly(c, [[ax - 15, ay - 18 - raise * 7], [ax - 1, ay - 22 - raise * 7], [ax + 1, ay - 13 - raise * 7], [ax - 13, ay - 9 - raise * 7]], '#242a32');
  poly(c, [[ax - 13, ay - 18 - raise * 7], [ax - 2, ay - 21 - raise * 7], [ax, ay - 14 - raise * 7], [ax - 12, ay - 11 - raise * 7]], '#727c87');
  poly(c, [[ax - 12, ay - 17 - raise * 7], [ax - 5, ay - 19 - raise * 7], [ax - 7, ay - 15 - raise * 7]], '#adb6bd');

  // Thick neck, then the low brow and heavy jaw sitting above it.
  poly(c, [[-8, -34 - breath], [4, -37 - breath], [5, -41], [-7, -39]], pal.outline);
  poly(c, [[-7, -35 - breath], [3, -37 - breath], [4, -41], [-6, -39]], pal.dark);
  poly(c, [[-12, -44], [-8, -56], [4, -59], [13, -53], [12, -41], [-1, -38]], pal.outline);
  poly(c, [[-10, -45], [-7, -54], [4, -57], [11, -52], [10, -42], [0, -40]], pal.mid);
  poly(c, [[-8, -48], [-5, -54], [4, -55], [8, -51], [5, -47], [-4, -46]], pal.light);
  rect(c, -10, -51, 20, 5, pal.outline);
  if (!back) {
    rect(c, -6 + lookX, -50, 5, 4, pal.eye);
    rect(c, 4 + lookX, -50, 5, 4, pal.eye);
    poly(c, [[-10, -44], [11, -43], [8, -37], [-3, -38]], pal.outline);
    poly(c, [[-9, -43], [10, -42], [7, -38], [-2, -39]], pal.gum);
    poly(c, [[-7, -43], [-10, -53], [-3, -44]], pal.claw);
    poly(c, [[6, -43], [10, -53], [11, -43]], pal.claw);
    for (let i = 0; i < 4; i++) rect(c, -4 + i * 4, -43, 2, 3, pal.claw);
  } else {
    path(c, [[-8, -51], [1, -47], [9, -51]], 2, pal.dark);
    speckle(c, -10, -55, 9, -42, 4.2, pal.dark, 10);
  }
  path(c, [[-15, -18], [-14, -28], [-9, -36]], 1, pal.rim);
  path(c, [[-10, -54], [2, -57], [10, -52]], 1, pal.rim);
}

/**
 * A wolf, side-on to the player. Four legs stride, the tail streams, the eyes
 * glow — they are the only part the dark does not swallow. Winding up, it crouches.
 */
function wolfBody(c, pal, stride, crouch, breath, lookX) {
  const step = stride * 4, low = crouch * 6;
  // Far legs behind the body.
  for (const [lx, lift] of [[-14, -step], [10, step]]) {
    path(c, [[lx, -16 + low], [lx - 2, -6 + lift * .3], [lx - 1, 0]], 5, pal.outline);
    path(c, [[lx, -16 + low], [lx - 2, -6 + lift * .3], [lx - 1, 0]], 3, pal.dark);
  }
  // Body: a long barrel, shoulders high, haunches bunched.
  poly(c, [[-24, -18 + low], [-18, -28 + low - breath], [-2, -30 + low - breath], [14, -26 + low], [22, -18 + low], [20, -10 + low], [-20, -10 + low]], pal.outline);
  poly(c, [[-22, -18 + low], [-17, -26 + low - breath], [-2, -28 + low - breath], [13, -24 + low], [20, -18 + low], [18, -12 + low], [-18, -12 + low]], pal.mid);
  poly(c, [[-18, -24 + low - breath], [-4, -27 + low - breath], [10, -23 + low], [4, -18 + low], [-12, -19 + low]], pal.light);
  poly(c, [[-16, -12 + low], [16, -12 + low], [14, -8 + low], [-14, -9 + low]], pal.belly);
  if (pal.caps) for (let i = 0; i < 4; i++) { const cx = -14 + i * 8, cy = -29 + low - breath + (i % 2) * 2; ellipse(c, cx, cy, 4, 3, pal.capDark); ellipse(c, cx, cy - 1, 3, 2, pal.caps); rect(c, cx - 1, cy - 2, 1, 1, '#ffffff'); }
  if (pal.mane) for (let i = 0; i < 6; i++) rect(c, 6 + i * 2, -30 + low - breath - (i % 2) * 2, 2, 5 + (i % 3) * 2, pal.mane);
  if (pal.scars) { path(c, [[-8, -24 + low], [-2, -16 + low]], 1, pal.scars); path(c, [[2, -22 + low], [7, -15 + low]], 1, pal.scars); }
  // Near legs.
  for (const [lx, lift] of [[-10, step], [14, -step]]) {
    path(c, [[lx, -14 + low], [lx + 1, -6 + lift * .3], [lx + 2, 1]], 5, pal.outline);
    path(c, [[lx, -14 + low], [lx + 1, -6 + lift * .3], [lx + 2, 1]], 3, pal.mid);
    rect(c, lx, 0, 4, 2, pal.dark);
  }
  // Tail, streaming back.
  path(c, [[-22, -20 + low], [-32, -24 + low + stride * 2], [-38, -18 + low + stride * 3]], 5, pal.outline);
  path(c, [[-22, -20 + low], [-32, -24 + low + stride * 2], [-38, -18 + low + stride * 3]], 3, pal.dark);
  // Head: muzzle forward, ears up, glowing eyes.
  const hx = 22 + lookX, hy = -26 + low - crouch * 2;
  poly(c, [[hx - 8, hy - 8], [hx + 2, hy - 12], [hx + 14, hy - 4], [hx + 16, hy + 3], [hx + 6, hy + 6], [hx - 6, hy + 2]], pal.outline);
  poly(c, [[hx - 6, hy - 7], [hx + 2, hy - 10], [hx + 12, hy - 3], [hx + 14, hy + 2], [hx + 6, hy + 4], [hx - 4, hy + 1]], pal.mid);
  poly(c, [[hx + 2, hy - 9], [hx + 11, hy - 3], [hx + 6, hy - 1]], pal.light);
  poly(c, [[hx - 6, hy - 8], [hx - 4, hy - 16], [hx, hy - 9]], pal.outline); poly(c, [[hx - 5, hy - 8], [hx - 4, hy - 14], [hx - 1, hy - 9]], pal.dark);
  poly(c, [[hx + 1, hy - 10], [hx + 4, hy - 17], [hx + 6, hy - 10]], pal.outline); poly(c, [[hx + 2, hy - 10], [hx + 4, hy - 15], [hx + 5, hy - 10]], pal.dark);
  rect(c, hx + 14, hy - 1, 3, 3, pal.nose);
  rect(c, hx + 2, hy - 5, 4, 2, pal.eye); rect(c, hx + 3, hy - 5, 1, 2, '#1a1a22');
  if (crouch > .3) { poly(c, [[hx + 6, hy + 3], [hx + 15, hy + 3], [hx + 12, hy + 7]], '#3a1a22'); for (let i = 0; i < 3; i++) rect(c, hx + 7 + i * 3, hy + 3, 1, 2 + (i % 2), pal.tooth); }
}

/**
 * Mushroom-folk: a pale stalk of a body under a wide glowing cap, thin arms,
 * knock-kneed legs. The cap flares when spores are about to fly.
 */
function sporelingBody(c, pal, stride, raise, breath, back, monster = false) {
  const step = stride * 2, flare = raise * 6;
  for (const [lx, lift] of [[-6, step], [3, -step]]) {
    path(c, [[lx, -14], [lx - 2, -6 + lift * .3], [lx, 1]], 4, pal.outline);
    path(c, [[lx, -14], [lx - 2, -6 + lift * .3], [lx, 1]], 2, pal.stalk);
  }
  // Stalk with rings.
  poly(c, [[-8, -12], [-6, -34 - breath], [6, -34 - breath], [8, -12], [5, -8], [-5, -8]], pal.outline);
  poly(c, [[-6, -12], [-5, -32 - breath], [5, -32 - breath], [6, -12], [4, -9], [-4, -9]], pal.stalk);
  for (let i = 0; i < 3; i++) rect(c, -5, -28 + i * 6 - breath, 10, 1, pal.stalkDark);
  // Arms: long, with three fingers, raised in the windup. The monster has four.
  const arms = monster
    ? [[-1, -32, 19, -22], [1, -32, 19, -22], [-1, -22, 14, -10], [1, -22, 14, -10]]
    : [[-1, -26, 14, -14], [1, -26, 14, -14]];
  for (const [side, shoulder, reach, rest] of arms) {
    const ax = side * 6, ay = shoulder - breath;
    const hx = side * (reach + raise * 5), hy = rest - raise * 20;
    const thick = monster ? 4 : 3;
    path(c, [[ax, ay], [side * (reach * .6), (ay + hy) / 2], [hx, hy]], thick, pal.outline);
    path(c, [[ax, ay], [side * (reach * .6), (ay + hy) / 2], [hx, hy]], thick - 2, pal.stalk);
    for (let i = -1; i <= 1; i++) {
      path(c, [[hx, hy], [hx + side * (monster ? 5 : 3), hy - 3 + i * (monster ? 4 : 3)]], monster ? 2 : 1, pal.outline);
      path(c, [[hx, hy], [hx + side * (monster ? 4 : 3), hy - 3 + i * (monster ? 4 : 3)]], 1, pal.stalkDark);
    }
  }
  if (pal.gills) { for (let i = 0; i < 9; i++) path(c, [[-18 + i * 4.5, -36 - breath], [-20 + i * 5, -22 - breath + (i % 2) * 4]], 1, pal.gills); }
  // The cap: a wide dome, spotted, its underside lit.
  const cw = 22 + flare, ch = 12 + flare * .4, cy = -38 - breath;
  ellipse(c, 0, cy + 2, cw + 2, ch * .5 + 2, pal.outline);
  ellipse(c, 0, cy + 2, cw, ch * .5, pal.capLight);
  poly(c, [[-cw - 2, cy + 2], [-cw * .7, cy - ch + 1], [0, cy - ch - 3], [cw * .7, cy - ch + 1], [cw + 2, cy + 2]], pal.outline);
  poly(c, [[-cw, cy + 1], [-cw * .7, cy - ch + 2], [0, cy - ch - 1], [cw * .7, cy - ch + 2], [cw, cy + 1]], pal.cap);
  poly(c, [[-cw * .5, cy - ch * .2], [-cw * .3, cy - ch + 3], [cw * .2, cy - ch], [cw * .1, cy - ch * .5]], pal.capLight);
  for (let i = 0; i < 6; i++) rect(c, -cw + 6 + i * (cw * 2 - 12) / 5, cy - ch * .6 + (i % 2) * 4, 2, 2, pal.spots);
  if (pal.crowd) for (let i = 0; i < 4; i++) { const px = -12 + i * 8, py = cy - ch + 2 - (i % 2) * 3; ellipse(c, px, py, 4, 2, pal.crowd); rect(c, px - 1, py, 2, 3, pal.stalk); }
  // The monster wears a crown of spines along the ridge of its cap.
  if (monster) {
    for (let i = 0; i < 9; i++) {
      const t = (i / 8 - .5) * 2, sx = t * cw * .78;
      const base = cy - ch - 1 + Math.abs(t) * ch * .55;
      const h = (13 - Math.abs(t) * 6) + Math.sin(game.time * 3 + i) * .8;
      poly(c, [[sx - 4, base + 2], [sx, base - h], [sx + 4, base + 2]], pal.outline);
      poly(c, [[sx - 2.5, base + 1], [sx, base - h + 2], [sx + 2.5, base + 1]], pal.capLight);
      rect(c, sx - 1, base - h + 2, 1, 3, '#ffffff');
    }
    // And a second, smaller cap crowded under the first.
    ellipse(c, 0, cy + 6, cw * .82, ch * .38, pal.outline);
    ellipse(c, 0, cy + 5, cw * .78, ch * .32, pal.cap);
    for (let i = 0; i < 12; i++) path(c, [[-cw * .7 + i * (cw * 1.4 / 11), cy + 5], [-cw * .55 + i * (cw * 1.1 / 11), cy + 14]], 1, pal.gills || pal.capLight);
  }
  if (!back) { rect(c, -4, -30 - breath, 3, 3, pal.eye); rect(c, 2, -30 - breath, 3, 3, pal.eye); rect(c, -1, -25 - breath, 2, 2, pal.stalkDark); }
  if (raise > 0) { c.globalAlpha = raise * .5; ellipse(c, 0, cy - ch, cw * 1.3, ch, pal.capLight); c.globalAlpha = 1; }
}


/**
 * Neve, Orrin's wife: months under a hatch have left her thin and grey-faced,
 * but she stands straight and she is the one holding the family together. A
 * borrowed blanket over a ruined dress, hair cut short by somebody in the dark.
 */
function drawNeve(c) {
  const breathe = Math.sin(game.time * 1.5) * .6;
  // Skirt and blanket.
  poly(c, [[-11, 0], [-8, -26], [8, -26], [11, 0]], '#4a4050');
  poly(c, [[-9, 0], [-6, -24], [1, -24], [2, 0]], '#5c5162');
  poly(c, [[-11, -20 + breathe], [-9, -34 + breathe], [9, -34 + breathe], [11, -20 + breathe]], '#7a5a4a');
  poly(c, [[-9, -21 + breathe], [-7, -32 + breathe], [1, -32 + breathe], [1, -21 + breathe]], '#8d6a56');
  // Arms: one crossed, one holding the blanket shut.
  path(c, [[-7, -30 + breathe], [2, -22 + breathe]], 3, '#c99a74');
  path(c, [[7, -30 + breathe], [1, -21 + breathe]], 3, '#c99a74');
  // Neck and head.
  rect(c, -2, -40 + breathe, 4, 5, '#b98a68');
  poly(c, [[-6, -52 + breathe], [-2, -55 + breathe], [3, -55 + breathe], [7, -51 + breathe], [6, -42 + breathe], [0, -38 + breathe], [-6, -42 + breathe]], '#c99a74');
  // Hollow under the eyes, and the eyes themselves.
  c.globalAlpha = .3; rect(c, -5, -48 + breathe, 11, 3, '#6a4a42'); c.globalAlpha = 1;
  rect(c, -4, -48 + breathe, 2, 2, '#1a1620'); rect(c, 2, -48 + breathe, 2, 2, '#1a1620');
  // Hair, cropped short and uneven.
  poly(c, [[-7, -50 + breathe], [-5, -57 + breathe], [3, -57 + breathe], [8, -52 + breathe], [7, -47 + breathe], [5, -53 + breathe], [-5, -53 + breathe], [-6, -46 + breathe]], '#3a2e2c');
}

/**
 * One of the two children, small and underfed. The boy keeps a whittled stick;
 * the girl has both hands out to whatever light there is.
 */
function drawChild(c, girl) {
  const fidget = Math.sin(game.time * (girl ? 2.2 : 1.8) + (girl ? 1 : 0)) * 1.1;
  ellipse(c, 0, 2, 9, 3, '#090913a6');
  // Smock.
  poly(c, [[-7, 0], [-5, -18], [5, -18], [7, 0]], girl ? '#6a5a6a' : '#4a4438');
  poly(c, [[-5, 0], [-4, -17], [0, -17], [1, 0]], girl ? '#7d6d7d' : '#5b5446');
  // Legs, thin.
  rect(c, -4, 0, 3, 3, '#b98a68'); rect(c, 2, 0, 3, 3, '#b98a68');
  if (girl) {
    // Both arms up and out, palms to the light.
    path(c, [[-5, -16], [-11, -22 + fidget]], 2.5, '#c99a74');
    path(c, [[5, -16], [11, -22 - fidget]], 2.5, '#c99a74');
  } else {
    path(c, [[-5, -15], [-10, -9 + fidget]], 2.5, '#c99a74');
    path(c, [[5, -15], [10, -12 + fidget]], 2.5, '#c99a74');
    // The stick, sharpened at one end.
    path(c, [[9, -17 + fidget], [13, -3 + fidget]], 2, '#6b5a45');
    poly(c, [[8, -19 + fidget], [11, -18 + fidget], [9, -15 + fidget]], '#d8cdb4');
  }
  // Head.
  rect(c, -2, -22, 4, 4, '#b98a68');
  ellipse(c, 0, -27, 6, 6.5, '#c99a74');
  rect(c, -3, -28, 2, 2, '#1a1620'); rect(c, 1, -28, 2, 2, '#1a1620');
  // Hair: hers long and tangled, his shorn.
  if (girl) poly(c, [[-7, -28], [-5, -34], [5, -34], [7, -28], [7, -20], [4, -27], [-4, -27], [-7, -20]], '#4a3a2e');
  else poly(c, [[-6, -29], [-4, -34], [4, -34], [6, -29], [4, -30], [-4, -30]], '#3a2e26');
}

/**
 * The brewer: one of the mushroom-folk with nothing left to be angry about. A
 * broad speckled cap, a stoop, and a bandolier of little corked gourds.
 */
function drawBrewer(c) {
  const bob = Math.sin(game.time * 1.4) * 1.2;
  ellipse(c, 0, 2, 13, 5, '#090913a6');
  // Stalk of a body, wider at the foot.
  poly(c, [[-7, 0], [-4, -26 + bob], [4, -26 + bob], [7, 0]], '#d8cdb4');
  poly(c, [[-5, -2], [-3, -24 + bob], [0, -24 + bob], [1, -2]], '#efe6d0');
  // Four short arms, two of them holding gourds.
  path(c, [[-5, -20 + bob], [-13, -13 + bob]], 3, '#d8cdb4');
  path(c, [[5, -20 + bob], [13, -15 + bob]], 3, '#d8cdb4');
  path(c, [[-5, -15 + bob], [-11, -8 + bob]], 2, '#cabfa6');
  path(c, [[5, -15 + bob], [11, -9 + bob]], 2, '#cabfa6');
  // The bandolier of brews.
  path(c, [[-6, -22 + bob], [6, -10 + bob]], 2, '#5a4632');
  for (const [gx, gy, tint] of [[-3, -18, '#b6577a'], [0, -15, '#79b657'], [3, -12, '#5789b6']]) {
    rect(c, gx - 2, gy + bob, 4, 5, tint);
    rect(c, gx - 1, gy - 2 + bob, 2, 2, '#4a3826');
  }
  // The cap, speckled, sitting low over no face at all.
  ellipse(c, 0, -28 + bob, 17, 9, '#7a4a5e');
  ellipse(c, 0, -30 + bob, 15, 8, '#9a5f76');
  for (const [sx, sy] of [[-9, -31], [-2, -34], [6, -31], [10, -28], [-12, -28]])
    ellipse(c, sx, sy + bob, 2.5, 1.8, '#e8dcc8');
  ellipse(c, 0, -24 + bob, 13, 4, '#5a3646');
  for (const ex of [-4, 4]) ellipse(c, ex, -25 + bob, 1.6, 1.6, '#f6e7a8');
}

/**
 * Orrin the lamp-seller: bent nearly double over a staff, a wide hat, a white
 * beard to his belt, and lanterns hung about him — the only warm light for miles.
 */
function drawOrrin(c) {
  const t = game.time, breath = Math.round(Math.sin(t * 1.4) * .8), sway = Math.sin(t * 1.1) * 2;
  for (const lx of [-6, 2]) { rect(c, lx - 1, -14, 7, 15, '#14111a'); rect(c, lx, -12, 5, 9, '#3a3335'); rect(c, lx - 1, -4, 8, 5, '#2a1d1a'); }
  // A long patched coat, stooped forward.
  poly(c, [[-11, -28], [6, -36 - breath], [14, -30 - breath], [14, -8], [10, 0], [-10, 0], [-13, -10]], '#1d1a1e');
  poly(c, [[-10, -27], [6, -34 - breath], [12, -29 - breath], [12, -8], [9, -1], [-9, -1], [-12, -10]], '#4a3d33');
  rect(c, -6, -14, 5, 6, '#5a4a36'); rect(c, 4, -20, 4, 5, '#5a4a36');
  rect(c, -12, -12, 24, 2, '#2a2320'); rect(c, -1, -12, 3, 2, '#8a6f4d');
  // Lanterns hung from the coat, swinging.
  for (const [lx, ly] of [[-13, -16], [13, -14]]) { path(c, [[lx, ly - 6], [lx + sway * .4, ly]], 1, '#8a6f4d'); rect(c, lx - 3 + sway * .4, ly, 6, 7, '#2a2320'); rect(c, lx - 2 + sway * .4, ly + 1, 4, 5, '#ffcf7a'); }
  // Head low and forward, the hat over it, the beard down the chest.
  rect(c, 6, -46 - breath, 12, 12, '#1a1822'); rect(c, 8, -44 - breath, 9, 9, '#c99a74');
  rect(c, 12, -41 - breath, 2, 2, '#3a4a5a');
  poly(c, [[6, -36 - breath], [18, -36 - breath], [16, -22], [11, -14], [6, -22]], '#e6e2d4');
  poly(c, [[-2, -48 - breath], [4, -50 - breath], [22, -50 - breath], [28, -48 - breath], [24, -44 - breath], [2, -44 - breath]], '#2a2320');
  poly(c, [[6, -56 - breath], [18, -56 - breath], [21, -48 - breath], [3, -48 - breath]], '#4a3d33');
  // The staff, and the lamp on its hook.
  rect(c, 20, -40, 2, 42, '#2a1b16'); rect(c, 20, -40, 1, 42, '#5c3f2c');
  path(c, [[21, -40], [26 + sway, -34]], 1, '#8a6f4d');
  rect(c, 23 + sway, -34, 7, 9, '#2a2320'); rect(c, 24 + sway, -33, 5, 7, '#ffcf7a'); rect(c, 25 + sway, -32, 3, 4, '#fff2c4');
  c.globalAlpha = .2 + Math.sin(t * 5) * .05; ellipse(c, 26 + sway, -30, 12, 9, '#ffcf7a'); c.globalAlpha = 1;
}

/**
 * Mycel once he stands: a wolf up on its hind legs, hunched and swollen, the
 * hide split open on a green light, caps crowding the shoulders and spine, and
 * arms hanging past the knees that end in a fistful of claws.
 */
function risenWolfBody(c, pal, stride, raise, breath) {
  const step = stride * 3, cock = raise;
  // Digitigrade legs, planted wide.
  for (const [lx, lift] of [[-11, step], [8, -step]]) {
    path(c, [[lx, -46], [lx - 4, -26 + lift * .3], [lx + 3, -10]], 9, pal.outline);
    path(c, [[lx, -46], [lx - 4, -26 + lift * .3], [lx + 3, -10]], 6, pal.dark);
    rect(c, lx - 2, -11, 11, 6, pal.outline);
    rect(c, lx - 1, -10, 9, 4, pal.mid);
    for (let i = 0; i < 3; i++) path(c, [[lx + 1 + i * 3, -8], [lx + 3 + i * 3, -1]], 2, pal.tooth);
  }
  // A long torso, chest thrown forward, the ribs open on the light inside.
  poly(c, [[-16, -44], [-14, -70 - breath], [-4, -82 - breath], [10, -80 - breath], [17, -66], [16, -44], [2, -38]], pal.outline);
  poly(c, [[-14, -45], [-12, -68 - breath], [-3, -78 - breath], [8, -77 - breath], [15, -65], [14, -45], [1, -40]], pal.mid);
  poly(c, [[-11, -70 - breath], [-2, -76 - breath], [6, -74 - breath], [3, -60], [-8, -58]], pal.light);
  poly(c, [[-12, -50], [12, -50], [10, -40], [-9, -41]], pal.belly);
  // The split: ribs, and what glows behind them.
  c.globalAlpha = .55 + Math.sin(game.time * 4) * .2;
  poly(c, [[-8, -68], [7, -66], [6, -48], [-7, -50]], pal.caps || '#6fd6b0');
  c.globalAlpha = 1;
  for (let i = 0; i < 5; i++) path(c, [[-9 + i * 4, -69 + (i % 2)], [-8 + i * 4, -47]], 2, pal.outline);
  for (let i = 0; i < 5; i++) rect(c, -9 + i * 4, -69 + (i % 2), 1, 22, pal.tooth);
  // Caps crowding the shoulders and running down the spine.
  for (let i = 0; i < 6; i++) {
    const cx = -14 + i * 6, cy = -78 - breath + Math.abs(2.5 - i) * 3;
    ellipse(c, cx, cy, 6, 3, pal.capDark || '#2a7a5a');
    ellipse(c, cx, cy - 1, 5, 2, pal.caps || '#6fd6b0');
    rect(c, cx - 1, cy - 3, 1, 2, '#ffffff');
  }
  for (let i = 0; i < 4; i++) { const sy = -60 + i * 7; ellipse(c, -15, sy, 4, 2, pal.capDark || '#2a7a5a'); ellipse(c, -15, sy - 1, 3, 1.5, pal.caps || '#6fd6b0'); }
  // Arms past the knees; the near one cocks back as it winds up.
  for (const [side, back] of [[-1, 0], [1, cock]]) {
    const sx = side * 13, sy = -70 - breath;
    const ex = sx + side * (10 + back * 16), ey = -28 + back * 14;
    path(c, [[sx, sy], [sx + side * 12, -50], [ex, ey]], 7, pal.outline);
    path(c, [[sx, sy], [sx + side * 12, -50], [ex, ey]], 4, side < 0 ? pal.dark : pal.mid);
    rect(c, ex - 4, ey - 3, 9, 7, pal.outline);
    rect(c, ex - 3, ey - 2, 7, 5, pal.light);
    for (let i = -1; i <= 1; i++) {
      path(c, [[ex + side * 2, ey + 2], [ex + side * (9 + Math.abs(i) * 2), ey + 12 + i * 5]], 3, pal.outline);
      path(c, [[ex + side * 2, ey + 2], [ex + side * (8 + Math.abs(i) * 2), ey + 11 + i * 5]], 1, pal.tooth);
    }
  }
  // The head, thrown back on a thick neck, jaws open.
  path(c, [[2, -78 - breath], [10, -88 - breath]], 8, pal.outline);
  path(c, [[2, -78 - breath], [10, -88 - breath]], 5, pal.dark);
  const hx = 12, hy = -94 - breath;
  poly(c, [[hx - 10, hy - 6], [hx - 2, hy - 12], [hx + 12, hy - 6], [hx + 15, hy + 2], [hx + 4, hy + 8], [hx - 8, hy + 4]], pal.outline);
  poly(c, [[hx - 8, hy - 5], [hx - 2, hy - 10], [hx + 10, hy - 5], [hx + 13, hy + 1], [hx + 4, hy + 6], [hx - 6, hy + 3]], pal.mid);
  poly(c, [[hx - 8, hy - 7], [hx - 7, hy - 15], [hx - 2, hy - 8]], pal.outline);
  poly(c, [[hx + 1, hy - 9], [hx + 4, hy - 17], [hx + 7, hy - 9]], pal.outline);
  poly(c, [[hx - 7, hy - 8], [hx - 6, hy - 13], [hx - 3, hy - 8]], pal.dark);
  poly(c, [[hx + 2, hy - 10], [hx + 4, hy - 15], [hx + 6, hy - 10]], pal.dark);
  rect(c, hx + 13, hy - 2, 3, 3, pal.nose);
  rect(c, hx - 1, hy - 4, 4, 3, pal.eye); rect(c, hx, hy - 4, 1, 3, '#1a1a22');
  // Jaws, always open now.
  poly(c, [[hx + 3, hy + 4], [hx + 15, hy + 3], [hx + 11, hy + 11], [hx + 4, hy + 9]], '#2a1219');
  for (let i = 0; i < 4; i++) rect(c, hx + 4 + i * 3, hy + 4, 1, 3 + (i % 2), pal.tooth);
  for (let i = 0; i < 3; i++) rect(c, hx + 5 + i * 3, hy + 7, 1, 3, pal.tooth);
  // It drips.
  for (let i = 0; i < 3; i++) rect(c, hx + 5 + i * 4, hy + 11 + ((game.time * 26 + i * 11) % 16), 1, 3, pal.caps || '#6fd6b0');
}

/** A pond frog: squat, wide-mouthed, and it swells before it spits. */
function frogBody(c, pal, breath, raise) {
  const puff = 1 + raise * .35;
  ellipse(c, 0, 2, 15, 5, '#00000066');
  for (const side of [-1, 1]) {
    poly(c, [[side * 8, -6], [side * 15, -10], [side * 17, -2], [side * 9, 1]], pal.outline);
    poly(c, [[side * 8, -6], [side * 14, -9], [side * 15, -3], [side * 9, 0]], pal.dark);
    for (let i = 0; i < 3; i++) rect(c, side * (14 + i), -2 + i, 3, 2, pal.light);
  }
  ellipse(c, 0, -8 - breath, 14 * puff, 9 * puff, pal.outline);
  ellipse(c, 0, -9 - breath, 12 * puff, 7.5 * puff, pal.mid);
  ellipse(c, 0, -6 - breath, 9 * puff, 5 * puff, pal.belly);
  for (let i = 0; i < 7; i++) rect(c, -9 + i * 3, -14 - breath + (i % 2) * 3, 2, 2, pal.dark);
  // The throat, which fills up as it winds up to spit.
  ellipse(c, 0, -4 - breath, 7 * puff, 4 * puff, pal.throat);
  ellipse(c, 0, -18 - breath, 11, 7, pal.outline);
  ellipse(c, 0, -19 - breath, 9, 6, pal.mid);
  for (const side of [-1, 1]) {
    ellipse(c, side * 5, -24 - breath, 4, 4, pal.outline);
    ellipse(c, side * 5, -24 - breath, 3, 3, pal.eye);
    rect(c, side * 5 - 1, -25 - breath, 2, 3, '#1a1a22');
  }
  path(c, [[-8, -17 - breath], [0, -15 - breath], [8, -17 - breath]], 1, pal.outline);
  if (raise > .3) for (let i = 0; i < 3; i++) rect(c, -3 + i * 3, -13 - breath - raise * 4, 2, 2, pal.throat);
}

/** Every creature on the ground: wildlings and brutes, wolves, mushroom-folk and frogs. */
export function drawCreature(c, e) {
  if (e.kind === 'frog') { drawFrog(c, e); return; }
  if (e.kind === 'wolf' || e.kind === 'sporeling') { drawGroveCreature(c, e); return; }
  drawWildling(c, e);
}

function drawFrog(c, e) {
  const k = enemyStats(e), pal = creaturePalette(e);
  const dx = player.x - e.x;
  const raise = e.state === 'windup' ? 1 - Math.max(0, e.timer) / k.windup : Math.max(0, (e.croak || 0) / .35) * .6;
  const breath = Math.round(Math.sin(game.time * 3 + e.homeX) * .8 + .8);
  if (raise > 0) {
    c.strokeStyle = pal.throat;
    c.lineWidth = 1;
    c.globalAlpha = .3 + raise * .4;
    c.beginPath(); c.ellipse(e.x, e.y, 26, 13, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
  c.save();
  c.translate(Math.round(e.x), Math.round(e.y));
  c.scale(k.scale * (dx < 0 ? -1 : 1), k.scale);
  frogBody(c, pal, breath, raise);
  c.restore();
  if (e.hp < e.max) {
    const w = 22 * k.scale;
    rect(c, e.x - w / 2, e.y - 40 * k.scale, w, 3, '#231725');
    rect(c, e.x - w / 2, e.y - 40 * k.scale, w * e.hp / e.max, 3, '#a8e04a');
  }
}

/** A hare, a beetle or a moth, out on the floor until he gets too near. */
export function drawCritter(c, k) {
  if (k.alpha <= 0) return;
  const t = game.time, run = k.flee > 0;
  c.save();
  c.globalAlpha = k.alpha;
  c.translate(Math.round(k.x), Math.round(k.y));
  if (k.kind === 'hare') {
    const hop = run ? Math.abs(Math.sin(t * 18)) * 6 : Math.abs(Math.sin(t * 2 + k.phase)) * 1.5;
    if (k.fx < 0) c.scale(-1, 1);
    ellipse(c, 0, 1, 8, 3, '#00000055');
    ellipse(c, 0, -6 - hop, 8, 5, '#241a12');
    ellipse(c, -1, -7 - hop, 6, 4, '#6b5340');
    ellipse(c, 5, -10 - hop, 4, 3, '#6b5340');
    poly(c, [[4, -12 - hop], [5, -20 - hop], [7, -12 - hop]], '#6b5340');
    poly(c, [[6, -12 - hop], [8, -19 - hop], [9, -12 - hop]], '#4a3826');
    rect(c, 7, -11 - hop, 2, 1, '#1a1a22');
    ellipse(c, -7, -6 - hop, 3, 2, '#d8d2ba');
    rect(c, -3, -2 - hop * .4, 2, 3, '#4a3826');
    rect(c, 2, -2 - hop * .4, 2, 3, '#4a3826');
  } else if (k.kind === 'lizard') {
    if (k.fx < 0) c.scale(-1, 1);
    const step = Math.sin(t * (run ? 28 : 3) + k.phase) * 2;
    ellipse(c, 0, 1, 13, 3, '#00000044');
    path(c, [[-5, -3], [-13, -2], [-20, -5 + step]], 3, '#8d7947');
    for (const side of [-1, 1]) for (const x of [-5, 4])
      path(c, [[x, -3], [x - 2 + step * side, -3 + side * 5], [x + 2 + step * side, -3 + side * 6]], 2, '#76633c');
    ellipse(c, 0, -4, 9, 4, '#a99758');
    ellipse(c, 9, -5, 5, 3, '#baaa6c');
    path(c, [[-6, -5], [5, -5]], 1, '#d9cb89');
    rect(c, 11, -7, 2, 2, '#251f16');
  } else if (k.kind === 'beetle') {
    const scuttle = Math.sin(t * (run ? 26 : 6) + k.phase) * 1.4;
    ellipse(c, 0, 1, 7, 2, '#00000055');
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) path(c, [[side * 3, -4 + i], [side * (7 + i), -6 + i * 2 + scuttle * side]], 1, '#14100e');
    ellipse(c, 0, -5, 6, 4, '#0d0a10');
    ellipse(c, 0, -6, 5, 3, '#2f4a3a');
    rect(c, 0, -9, 1, 7, '#14100e');
    rect(c, -2, -6, 2, 1, '#8fe8c0');
    rect(c, 0, -10, 2, 2, '#0d0a10');
    path(c, [[1, -10], [4, -13]], 1, '#14100e');
    path(c, [[1, -10], [-2, -13]], 1, '#14100e');
  } else {
    const flap = Math.sin(t * (run ? 24 : 9) + k.phase);
    const lift = run ? -k.flee * 14 : Math.sin(t * 1.6 + k.phase) * 3;
    c.translate(0, lift);
    ellipse(c, 0, 2, 5, 2, '#00000044');
    for (const side of [-1, 1]) {
      poly(c, [[0, -8], [side * (9 + flap * 3), -14], [side * (10 + flap * 2), -6], [0, -4]], '#cfc6de');
      poly(c, [[0, -8], [side * (7 + flap * 2), -12], [side * 7, -7], [0, -5]], '#e8e2f0');
      rect(c, side * 5, -10, 2, 2, '#8a7f9a');
    }
    rect(c, -1, -10, 2, 7, '#3a3040');
    path(c, [[0, -11], [-3, -15]], 1, '#3a3040');
    path(c, [[0, -11], [3, -15]], 1, '#3a3040');
  }
  c.restore();
  c.globalAlpha = 1;
}

function drawGroveCreature(c, e) {
  const k = enemyStats(e), pal = creaturePalette(e);
  if (e.state === 'dig') {
    // Under the ground: the ring closing on where he will come up, and the earth heaving.
    const k2 = 1 - Math.max(0, e.timer) / 1.15, r = 78;
    c.globalAlpha = .2 + k2 * .4;
    ellipse(c, e.tx, e.ty, r, r * .5, '#6fd6b0');
    c.globalAlpha = 1;
    c.strokeStyle = '#8dffd0';
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(e.tx, e.ty, r * (1 - k2 * .45) + 4, (r * (1 - k2 * .45) + 4) * .5, 0, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1;
    c.beginPath(); c.ellipse(e.tx, e.ty, r, r * .5, 0, 0, Math.PI * 2); c.stroke();
    ellipse(c, e.tx, e.ty, 34 * k2 + 12, 17 * k2 + 6, '#3d2c1cbb');
    for (let i = 0; i < 8; i++) rect(c, e.tx - 26 + i * 7, e.ty - 4 - ((game.time * 46 + i * 9) % 22) * k2, 3, 3, i % 2 ? '#3d2c1c' : '#6fd6b0');
    return;
  }
  if (e.hidden) return;
  const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
  const hunting = dist < k.chase && dist > k.hold;
  const winding = e.state === 'windup', lunging = e.state === 'lunge';
  const raise = winding ? 1 - Math.max(0, e.timer) / k.windup : e.state === 'rain' ? 1 : e.state === 'howl' ? .6 : 0;
  const stride = lunging ? 1 : hunting ? Math.sin(game.time * (e.kind === 'wolf' ? 14 : 6) + e.homeX) : Math.sin(game.time * 2) * .2;

  if (winding) {
    // The ground the blow will cover, filling as the windup runs out. Drawn solid
    // enough to read through the grove's dark and a room's gloom.
    const s = k.scale, col = e.kind === 'wolf' ? '#d7463c' : pal.capLight || '#b48ad0';
    const rim = e.kind === 'wolf' ? '#ffcf89' : '#f0e0ff';
    c.globalAlpha = (e.elite ? .34 : .24) + raise * .2;
    ellipse(c, e.x, e.y, 48 * s * (.6 + raise * .4), 27 * s * (.6 + raise * .4), col);
    c.globalAlpha = 1;
    c.strokeStyle = rim;
    c.lineWidth = e.elite ? 2 : 1;
    c.beginPath(); c.ellipse(e.x, e.y, 48 * s, 27 * s, 0, 0, Math.PI * 2); c.stroke();
    // A wolf leaves the ground: mark the lane it crosses and where it lands.
    if (k.lunge) {
      const a = Math.atan2(player.y - e.y, player.x - e.x), len = k.lunge * .2;
      const tx = e.x + Math.cos(a) * len, ty = e.y + Math.sin(a) * len * .62;
      c.globalAlpha = .18 + raise * .3;
      path(c, [[e.x, e.y], [tx, ty]], 14 * s, col);
      ellipse(c, tx, ty, 32 * s, 18 * s, col);
      c.globalAlpha = 1;
      c.strokeStyle = rim;
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(tx, ty, 32 * s, 18 * s, 0, 0, Math.PI * 2); c.stroke();
    }
    // A cap about to burst: the cloud's reach.
    if (k.spore) {
      c.strokeStyle = rim;
      c.lineWidth = 1;
      c.globalAlpha = .5 + Math.sin(game.time * 18) * .3;
      c.beginPath(); c.ellipse(e.x, e.y, k.hitRange, k.hitRange * .55, 0, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    }
  }
  if (e.state === 'howl' || e.state === 'rechain') {
    // Greymane's howl: rings roll out, and the ground he will cross is lit.
    const k2 = e.state === 'howl' ? 1 - Math.max(0, e.timer) : 1;
    c.strokeStyle = '#ffcf89'; c.lineWidth = 1;
    for (let r = 1; r <= 3; r++) { c.globalAlpha = .6 - r * .15; c.beginPath(); c.ellipse(e.x, e.y - 30 * k.scale, (20 + r * 22) * k2, (10 + r * 11) * k2, 0, 0, Math.PI * 2); c.stroke(); }
    c.globalAlpha = .35; path(c, [[e.x, e.y], [player.x, player.y]], 3, '#d7463c'); c.globalAlpha = 1;
  }
  if (e.state === 'rain') {
    c.globalAlpha = .4 + Math.sin(game.time * 12) * .2;
    ellipse(c, e.x, e.y - 60 * k.scale, 40 * k.scale, 16 * k.scale, '#b48ad0');
    c.globalAlpha = 1;
  }
  if (e.state === 'rend') {
    // Both claws come round: the ring they will tear open, closing as it winds up.
    const k2 = 1 - Math.max(0, e.timer) / .85;
    c.globalAlpha = .2 + k2 * .3;
    ellipse(c, e.x, e.y, 150, 80, '#6fd6b0');
    c.globalAlpha = 1;
    c.strokeStyle = '#8dffd0';
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(e.x, e.y, 150 * (1 - k2 * .35), 80 * (1 - k2 * .35), 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ellipse(c, e.x + Math.cos(a) * 96, e.y + Math.sin(a) * 52, 8 + k2 * 8, 4 + k2 * 4, '#6fd6b066'); }
  }
  ellipse(c, e.x, e.y + 2, 19 * k.scale, 6 * k.scale, '#090914a6');
  c.save();
  c.translate(Math.round(e.x), Math.round(e.y - (lunging ? 10 : Math.abs(stride) * (e.kind === 'wolf' ? 2 : 1))));
  c.scale(k.scale, k.scale);
  const breath = Math.round(Math.sin(game.time * 2.4 + e.homeX) * .8 + .8);
  if (e.kind === 'wolf') {
    if (dx < 0) c.scale(-1, 1);
    (e.risen ? risenWolfBody : wolfBody)(c, pal, stride, raise, breath, dist < k.chase ? 0 : -4);
  } else {
    const back = dist < k.chase && dy < -Math.abs(dx);
    if (dx < 0) c.scale(-1, 1);
    sporelingBody(c, pal, stride, raise, breath, back, !!e.monster);
  }
  c.restore();

  if (e.state === 'exposed') label(c, e.x, e.y - 70 * k.scale, 'EXPOSED', '#efca84', 8);
  else if (e.elite && dist < k.chase + 80) label(c, e.x, e.y - 62 * k.scale, e.elite.name.toUpperCase(), '#f0d8a0', 7);
  if (e.hp < e.max) {
    const w = 32 * k.scale;
    rect(c, e.x - w / 2, e.y - 56 * k.scale, w, 3, '#231725');
    rect(c, e.x - w / 2, e.y - 56 * k.scale, w * e.hp / e.max, 3, e.elite ? '#f0a860' : '#e6b77c');
  }
}

export function drawWildling(c, e) {
  const k = enemyStats(e), pal = creaturePalette(e);
  const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
  const hunting = dist < k.chase && dist > k.hold;
  const stride = hunting ? Math.sin(game.time * 11 + e.homeX) : Math.sin(game.time * 2) * .25;
  const winding = e.state === 'windup';
  // The raised arm doubles as the attack telegraph — it peaks as the timer runs out.
  const raise = winding ? 1 - Math.max(0, e.timer) / k.windup : 0;

  if (winding) {
    ellipse(c, e.x, e.y, 44 * k.scale, 25 * k.scale, '#d7463c44');
    c.strokeStyle = '#ffcf89';
    c.lineWidth = 1;
    c.strokeRect(e.x - 23 * k.scale, e.y - 23 * k.scale, 46 * k.scale, 42 * k.scale);
  }
  ellipse(c, e.x, e.y + 2, 17 * k.scale, 6 * k.scale, '#090914a6');
  c.save();
  c.translate(Math.round(e.x), Math.round(e.y - Math.abs(stride) * 2));
  c.scale(k.scale, k.scale);
  if (winding) c.scale(1 + raise * .1, 1 - raise * .12);
  const lookX = dist < k.chase ? Math.round(dx / Math.max(1, dist) * 3) : 0;
  const back = dist < k.chase && dy < -Math.abs(dx);
  if (dx < 0) c.scale(-1, 1);
  const breath = Math.round(Math.sin(game.time * 2.4 + e.homeX) * .8 + .8);
  if (['rogue', 'bandit', 'corsair'].includes(e.kind)) vaultHumanBody(c, e, stride, raise, back, breath);
  else (e.kind === 'brute' ? bruteBody : goblinBody)(c, pal, stride, raise, dx < 0 ? -lookX : lookX, back, breath);
  c.restore();

  if (e.hp < e.max) {
    const w = 32 * k.scale;
    rect(c, e.x - w / 2, e.y - 56 * k.scale, w, 3, '#231725');
    rect(c, e.x - w / 2, e.y - 56 * k.scale, w * e.hp / e.max, 3, '#e6b77c');
  }
}

/** Salt-starved survivors: upright human anatomy, patched cloth and salvaged steel. */
function vaultHumanBody(c, e, stride, raise, back, breath) {
  const rogue = e.kind === 'rogue', heavy = e.kind === 'bandit';
  const skin = e.skin === 'knifehand' || e.skin === 'bosun' ? '#987052' : '#bc9473';
  const shade = '#71513f', edge = '#211d1c';
  const cloth = rogue ? '#646258' : heavy ? '#705747' : '#485f5b';
  const light = rogue ? '#999581' : heavy ? '#9b8160' : '#74877a';
  const width = heavy ? 11 : rogue ? 7 : 9;
  // Long trouser legs and mismatched wrapped boots.
  for (const side of [-1, 1]) {
    const step = Math.round(stride * side * 4), x = side * 5;
    path(c, [[x, -21], [x + step, -10], [x + step, -2]], 7, edge);
    path(c, [[x, -21], [x + step, -10], [x + step, -3]], 4, '#5a554a');
    rect(c, x + step - 3, -7, 6, 2, '#a1997e');
    rect(c, x + step - 3, -3, 8, 4, '#302a25');
  }
  c.save(); c.translate(rogue ? 2 : 0, -breath * .5);
  // A sloped shoulder line, waist and ragged coat tails.
  poly(c, [[-width, -40], [width - 2, -39], [width + 2, -23], [width, -13],
    [4, -16], [1, -12], [-2, -19], [-width - 2, -15], [-width, -27]], edge);
  poly(c, [[-width + 1, -39], [width - 3, -38], [width, -24], [width - 1, -16],
    [3, -19], [0, -15], [-3, -22], [-width, -18]], cloth);
  path(c, [[-4, -37], [-2, -26], [-5, -19]], 2, light);
  rect(c, 3, -28, 5, 6, '#a1987d');
  path(c, [[4, -28], [6, -26], [4, -24]], 1, '#524a3b');
  rect(c, -width, -24, width * 2, 3, '#3a3027');
  rect(c, 1, -24, 3, 3, '#a18b62');
  if (heavy) {
    poly(c, [[-10, -38], [5, -36], [7, -28], [-8, -27]], '#4b4943');
    path(c, [[-8, -36], [3, -34], [4, -30]], 2, '#848178');
  }
  // One slack arm; the weapon arm rises through the existing windup.
  path(c, [[-width, -36], [-width - 4, -27], [-width - 2, -19]], 5, edge);
  path(c, [[-width, -35], [-width - 3, -27], [-width - 2, -20]], 3, skin);
  rect(c, -width - 5, -26, 5, 4, '#b0a68b');
  const hx = width + 8 - raise * 4, hy = -22 - raise * 24;
  path(c, [[width - 2, -36], [width + 5, -30 - raise * 8], [hx, hy]], 6, edge);
  path(c, [[width - 2, -36], [width + 5, -30 - raise * 8], [hx, hy]], 3, skin);
  // A narrow human head with ears, nose, stubble and tangled hair.
  rect(c, -3, -43, 6, 6, shade);
  rect(c, -6, -54, 12, 13, edge);
  rect(c, -5, -52, 10, 10, skin);
  rect(c, -7, -49, 2, 4, shade);
  if (!back) {
    rect(c, 4, -48, 3, 4, skin);
    rect(c, -4, -49, 3, 1, '#483b32');
    rect(c, 2, -49, 2, 1, '#332c27');
    rect(c, 0, -46, 2, 3, shade);
    rect(c, -3, -43, 7, 2, '#655445');
    rect(c, 3, -47, 1, 4, '#d5b397');
  }
  poly(c, [[-7, -51], [-6, -56], [-2, -55], [1, -57], [6, -54], [6, -50], [2, -52], [-3, -52], [-4, -45], [-7, -43]], '#41372e');
  if (back) rect(c, -5, -52, 10, 10, '#41372e');
  if (rogue) {
    path(c, [[-7, -42], [1, -39], [8, -42]], 5, '#a49b80');
    poly(c, [[-6, -40], [-10, -29], [-6, -31], [-3, -39]], '#89816b');
  } else if (!heavy) {
    rect(c, -6, -53, 12, 3, '#8e6957');
    path(c, [[-6, -52], [-10, -46], [-9, -39]], 2, '#8e6957');
    path(c, [[-8, -36], [6, -25]], 2, '#b0a48a');
  }
  c.save(); c.translate(hx, hy); c.rotate(-raise * 1.8);
  path(c, [[0, 3], [0, -8]], 3, '#4c3828');
  if (heavy) {
    rect(c, -1, -23, 3, 20, '#766044');
    poly(c, [[0, -23], [10, -25], [12, -15], [2, -13]], '#787c77');
    path(c, [[10, -24], [12, -15], [5, -14]], 2, '#b5b8a6');
  } else {
    const length = rogue ? 17 : 29;
    poly(c, [[-2, -7], [-2, -length], [2, -length - 5], [3, -10]], '#a5aaa1');
    path(c, [[2, -length - 3], [3, -10]], 1, '#e0ddc4');
    rect(c, -5, -8, 10, 2, '#897653');
  }
  rect(c, -2, -1, 5, 4, skin);
  c.restore(); c.restore();
}

const BONE = { edge: '#cfc8ac', shine: '#fff6d8', fuller: '#6d6350', grip: '#2a2230', guard: '#c9a94e' };

export function drawWardenSword(c, b) {
  const face = b.state === 'stalk' ? Math.atan2(player.y - b.y, player.x - b.x) : Math.atan2(b.dy, b.dx);
  let angle = face + .8, reach = 26;
  if (b.state === 'slashWind') angle = face - 1.5;
  if (b.state === 'slash') { angle = face - 1.5 + (1 - Math.max(0, b.timer) / .28) * 3.1; reach = 33; }
  if (b.state === 'slamWind') { angle = -Math.PI / 2; reach = 32; }
  if (b.state === 'recover') angle = face + 1.25;
  const shoulderX = b.x + Math.cos(face) * 11, shoulderY = b.y - 80;
  const handX = b.x + Math.cos(angle) * reach, handY = b.y - 58 + Math.sin(angle) * reach * .6;
  // A long, wasted arm — bone over nothing.
  path(c, [[shoulderX, shoulderY], [handX, handY]], 7, '#191420');
  path(c, [[shoulderX, shoulderY - 1], [handX, handY - 1]], 3, '#6b5f66');
  path(c, [[shoulderX, shoulderY - 2], [handX, handY - 2]], 1, '#a99a9e');
  drawSword(c, handX, handY, angle, 62, b.phase === 2, BONE);
  rect(c, handX - 2, handY - 3, 5, 6, '#2a2430');
  rect(c, handX - 2, handY - 3, 5, 2, '#a89c86');
  for (let i = 0; i < 3; i++) rect(c, handX - 2 + i * 2, handY + 2, 1, 4, '#ded4b8');
}

/**
 * The Hollow Warden: a gaunt, stooped thing under a bone crown hung with gold.
 * Built tall and thin so its silhouette reads instantly against the sanctuary floor.
 */
export function drawWarden(c, b) {
  const lit = b.phase === 2;
  const sway = b.state === 'stalk' ? Math.sin(game.time * 3.2) * 2 : 0;
  const step = b.state === 'stalk' ? Math.sin(game.time * 6) * 4 : 0;
  const hide = lit ? '#6a4a44' : '#584a56';
  const hideDark = lit ? '#3a2724' : '#2f2733';
  const hideLight = lit ? '#977063' : '#7e7280';
  const bone = '#b9c2ab';
  const boneLight = '#e6e9d3';
  const gold = lit ? '#ffd170' : '#c9a94e';

  ellipse(c, b.x + 2, b.y + 6, 34, 11, '#0d0a1499');
  c.save();
  c.translate(Math.round(b.x), Math.round(b.y));

  // Long digitigrade legs, one carrying the weight.
  for (const [side, lift] of [[-1, step], [1, -step]]) {
    const hx = side * 8, kx = side * 15, ax = side * 9;
    path(c, [[hx, -54], [kx, -30 + lift * .3], [ax, -6 + lift * .2]], 7, '#141019');
    path(c, [[hx, -54], [kx, -30 + lift * .3], [ax, -7 + lift * .2]], 4, hide);
    path(c, [[hx, -52], [kx - side, -31 + lift * .3]], 1, hideLight);
    // Splayed, clawed feet.
    for (let i = -1; i <= 1; i++) {
      path(c, [[ax, -6 + lift * .2], [ax + i * 7 + side * 3, 2 + lift * .2]], 3, '#141019');
      path(c, [[ax, -7 + lift * .2], [ax + i * 6 + side * 3, 1 + lift * .2]], 1, boneLight);
    }
  }

  // Narrow torso, stooped forward, ribs showing through.
  poly(c, [[-10, -50], [-14, -70], [-13, -84], [-3, -90], [9, -88], [13, -74], [11, -52], [0, -46]], '#141019');
  poly(c, [[-8, -51], [-11, -70], [-10, -83], [-2, -87], [7, -85], [10, -73], [8, -53], [0, -48]], hide);
  poly(c, [[-6, -56], [-7, -74], [-1, -83], [5, -81], [6, -60], [0, -52]], hideDark);
  for (let i = 0; i < 5; i++) path(c, [[-7, -58 - i * 5], [4, -61 - i * 5]], 1, hideLight);
  // Tattered hide hanging off the ribcage.
  for (let i = 0; i < 6; i++) {
    const tx = -11 + i * 5;
    path(c, [[tx, -52], [tx + sway * .4, -43 - (i % 3) * 4]], 1, hideDark);
  }

  // A ridge of vertebrae up the spine, and bandage wraps rotting off the shins.
  for (let i = 0; i < 6; i++) rect(c, -9 + Math.round(i * .4), -56 - i * 5, 3, 2, boneLight);
  for (const side of [-1, 1]) {
    const kx = side * 15, ax = side * 9;
    for (let i = 0; i < 3; i++) path(c, [[kx - 2, -26 + i * 5], [ax + 3, -22 + i * 5]], 1, '#b5a58f');
    path(c, [[ax + side * 3, -14], [ax + side * 5 + sway * .3, -4]], 1, '#8f8474');
  }
  // A thin, ragged tail trailing behind, bone showing at the tip.
  path(c, [[-6, -50], [-16 + sway, -38], [-26 + sway * 2, -30], [-30 + sway * 2, -20]], 4, '#141019');
  path(c, [[-6, -50], [-16 + sway, -38], [-26 + sway * 2, -30], [-30 + sway * 2, -20]], 2, hideDark);
  for (let i = 0; i < 3; i++) rect(c, -27 + sway * 2 + i * 2, -26 + i * 2, 2, 2, boneLight);
  // Gold bands on the wasted arm and old cloth knotted at the hip.
  rect(c, -22, -60, 5, 2, gold); rect(c, -21, -46, 5, 2, gold);
  path(c, [[-8, -50], [-12 + sway * .5, -36]], 3, '#2a1f2a'); path(c, [[6, -49], [10 + sway * .5, -34]], 2, '#2a1f2a');
  rect(c, -10 + sway * .5, -40, 2, 2, '#8f2733'); rect(c, 9 + sway * .5, -38, 2, 2, '#8f2733');

  // The free arm, absurdly long, knuckles near the floor.
  path(c, [[-12, -82], [-22, -58], [-19, -30]], 6, '#141019');
  path(c, [[-12, -82], [-21, -58], [-18, -31]], 3, hide);
  path(c, [[-13, -81], [-21, -60]], 1, hideLight);
  for (let i = -1; i <= 1; i++) path(c, [[-19, -30], [-21 + i * 4, -18]], 2, boneLight);

  // Head hangs low and forward from a bent neck.
  path(c, [[0, -86], [7, -88], [10, -84]], 5, '#141019');
  c.save();
  c.translate(9 + sway * .3, -84);
  c.rotate(.42);
  poly(c, [[-13, -15], [9, -16], [15, -4], [8, 15], [-5, 16], [-13, 4]], '#141019');
  poly(c, [[-11, -14], [8, -14], [13, -4], [7, 13], [-4, 14], [-11, 3]], bone);
  poly(c, [[-9, -12], [3, -12], [7, -3], [2, 8], [-8, 5]], boneLight);
  // Empty sockets and a red gash where a mouth should be.
  rect(c, -8, -7, 7, 6, '#15151f');
  rect(c, 1, -8, 7, 6, '#15151f');
  rect(c, -7, -6, 4, 3, lit ? '#ffb45e' : '#3b3a4a');
  rect(c, 2, -7, 4, 3, lit ? '#ffb45e' : '#3b3a4a');
  poly(c, [[-8, 3], [8, 1], [7, 8], [-6, 10]], '#8f2733');
  poly(c, [[-6, 4], [6, 3], [5, 7], [-4, 9]], '#c53c44');
  for (let i = 0; i < 5; i++) rect(c, -6 + i * 3, 3 + (i % 2), 1, 5, '#e8dfc6');
  c.restore();

  // The crown: a wide bone crescent hung with gold, and drips of old cloth.
  c.save();
  c.translate(sway * .5, 0);
  path(c, [[-27, -92], [-19, -104], [0, -109], [19, -104], [27, -92]], 6, '#141019');
  path(c, [[-26, -93], [-18, -103], [0, -107], [18, -103], [26, -93]], 3, bone);
  path(c, [[-24, -95], [-16, -102], [0, -105]], 1, boneLight);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, cx = -26 + t * 52;
    const cy = -93 - Math.sin(Math.PI * t) * 13;
    const drop = 4 + (i % 3) * 4;
    path(c, [[cx, cy + 2], [cx + sway * .3, cy + 2 + drop]], 1, gold);
    rect(c, cx - 1, cy + 2 + drop, 3, 3, gold);
    if (i % 2 === 0) rect(c, cx - 1, cy + 4 + drop, 2, 2, '#8a6a2c');
  }
  for (let i = 0; i < 7; i++) {
    const tx = -25 + i * 8;
    // Cloth hangs from the outer arc only — the mask stays readable.
    if (Math.abs(tx) < 12) continue;
    path(c, [[tx, -92], [tx + sway * .3, -76 - (i % 2) * 7]], 2, '#1b1620');
  }
  c.restore();

  if (lit) {
    // Phase two: embers crawl up out of the ribcage rather than washing the face out.
    for (let i = 0; i < 5; i++) {
      const ey = -52 - ((game.time * 20 + i * 13) % 46);
      rect(c, -6 + Math.sin(game.time * 2 + i * 2) * 7, ey, 2, 2, i % 2 ? '#ffb45e' : '#e8763a');
    }
  }
  c.restore();

  drawWardenSword(c, b);
  if (b.state === 'recover') label(c, b.x, b.y - 122, 'EXPOSED', '#efca84', 8);
}

/** An arrow in the air, and the thin bright line it leaves behind it. */
export function drawArrow(c, a) {
  if (a.kind === 'bone' || a.kind === 'scrap') {
    // What is left of his crew, and what is left of his ship, thrown by hand.
    const spin = game.time * (a.kind === 'bone' ? 15 : 26) + a.x;
    c.save();
    c.translate(Math.round(a.x), Math.round(a.y));
    c.rotate(spin);
    if (a.kind === 'bone') {
      rect(c, -8, -1, 16, 3, '#8d907e');
      rect(c, -8, -1, 16, 1, '#cdd0bb');
      for (const e of [-9, 6]) { ellipse(c, e + 1, -2, 3, 2, '#cdd0bb'); ellipse(c, e + 1, 2, 3, 2, '#cdd0bb'); }
    } else {
      poly(c, [[-5, -3], [4, -4], [5, 3], [-4, 4]], '#2b3330');
      poly(c, [[-3, -2], [3, -3], [3, 1], [-2, 2]], '#8d9488');
    }
    c.restore();
    return;
  }
  if (a.kind === 'shell') {
    // A cannon ball, trailing its own smoke, with the fuse still going.
    for (let i = 1; i < 5; i++) {
      c.globalAlpha = .26 - i * .045;
      ellipse(c, a.x - a.vx * i * .016, a.y - a.vy * i * .016, 8 - i, 6 - i * .8, '#6a6258');
    }
    c.globalAlpha = 1;
    ellipse(c, a.x, a.y + 1, 9, 8, '#100e12');
    ellipse(c, a.x, a.y, 8, 7, '#2e2b29');
    ellipse(c, a.x - 2, a.y - 2, 3, 2, '#5d5751');
    ellipse(c, a.x + Math.sin(game.time * 30) * 2, a.y - 8, 3, 3, '#ffcf7a');
    return;
  }
  if (a.kind === 'acid') {
    // A gobbet of acid, wobbling as it goes, with a green trail.
    const wob = Math.sin(game.time * 30 + a.x) * 1.5;
    for (let i = 1; i < 4; i++) {
      c.globalAlpha = .3 - i * .07;
      ellipse(c, a.x - a.vx * i * .012, a.y - a.vy * i * .012, 5 - i, 3 - i * .6, '#a8e04a');
    }
    c.globalAlpha = 1;
    ellipse(c, a.x, a.y + wob, 6, 4, '#2f5a14');
    ellipse(c, a.x, a.y - 1 + wob, 5, 3, '#a8e04a');
    rect(c, a.x - 2, a.y - 2 + wob, 2, 1, '#e2ff9a');
    return;
  }
  c.save();
  c.translate(Math.round(a.x), Math.round(a.y));
  c.rotate(Math.atan2(a.vy, a.vx));
  c.globalAlpha = .35;
  path(c, [[-26, 0], [-4, 0]], 1, '#e8d49a');
  c.globalAlpha = 1;
  rect(c, -12, -1, 18, 2, '#4a3826');
  rect(c, -12, -1, 18, 1, '#8a6f4d');
  poly(c, [[6, -3], [14, 0], [6, 3]], '#0c0a12');
  poly(c, [[6, -2], [12, 0], [6, 2]], '#cfd8de');
  poly(c, [[-12, -3], [-7, 0], [-12, 3]], '#3a5a3a');
  c.restore();
}

/** Everything she is about to do, drawn on the floor before she does it. */
function vaeliraTells(c, b) {
  const wind = b.state.endsWith('Wind');
  const total = b.windDuration || WINDUP[b.state.replace(/Wind$/, '')] || .5;
  const k = wind ? 1 - Math.max(0, b.timer) / total : 1;
  const a = Math.atan2(b.dy, b.dx);
  const rose = '#f0a0c8', gold = '#f0dfae';
  const lane = (from, len, halfWidth, color) => {
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.rotate(a);
    c.globalAlpha = .12 + k * .22;
    poly(c, [[from, -halfWidth], [len, -halfWidth], [len, halfWidth], [from, halfWidth]], color);
    c.globalAlpha = .5 + k * .4;
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.strokeRect(from, -halfWidth, (len - from) * k, halfWidth * 2);
    c.globalAlpha = 1;
    c.restore();
  };
  const ring = (r, color, fill = .2) => {
    c.globalAlpha = fill * (.4 + k * .6);
    ellipse(c, b.x, b.y, r * (.55 + k * .45), r * (.55 + k * .45) * GROUND_SCALE, color);
    c.globalAlpha = .6 + k * .3;
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(b.x, b.y, r, r * GROUND_SCALE, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  };

  if (b.state === 'dashWind' || b.state === 'dash') {
    const x = b.dashFromX ?? b.x, y = b.dashFromY ?? b.y;
    const tx = b.dashToX ?? b.x, ty = b.dashToY ?? b.y;
    c.save();
    c.translate(x, y);
    c.scale(1, GROUND_SCALE);
    const line = [[0, 0], [tx - x, (ty - y) / GROUND_SCALE]];
    c.globalAlpha = .2 + k * .15;
    path(c, line, KNIVES.dashRadius * 2, gold);
    c.globalAlpha = .7;
    path(c, line, 2, '#fff2c4');
    c.strokeStyle = gold; c.lineWidth = 2;
    c.beginPath(); c.arc(tx - x, (ty - y) / GROUND_SCALE, KNIVES.dashRadius, 0, Math.PI * 2); c.stroke();
    c.restore();
    if (b.chain > 1 && wind) label(c, b.x, b.y + 34, '1 / 2', gold, 8);
    else if (wind) label(c, b.x, b.y + 34, '2 / 2', gold, 8);
  } else if (b.state === 'flurryWind' || b.state === 'flurry') {
    ring(KNIVES.ring, gold, .24);
  } else if (b.state === 'lashWind' || b.state === 'lash') {
    c.save();
    c.translate(b.x, b.y);
    c.scale(1, GROUND_SCALE);
    c.rotate(a);
    c.globalAlpha = .16 + k * .22;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, WHIP.reach, -WHIP.arc, WHIP.arc); c.closePath();
    c.fillStyle = rose; c.fill();
    c.globalAlpha = .7; c.strokeStyle = rose; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 0, WHIP.reach * (.5 + k * .5), -WHIP.arc, WHIP.arc); c.stroke();
    c.restore();
  } else if (b.state === 'grabWind' || b.state === 'grab') {
    lane(0, WHIP.hookReach, WHIP.hookWidth, rose);
    const reach = b.state === 'grab' ? b.hookReach ?? 0 : WHIP.hookReach * k;
    const x = b.x + Math.cos(a) * reach, y = b.y + Math.sin(a) * reach * GROUND_SCALE;
    poly(c, [[x - 5, y], [x, y - 6], [x + 5, y], [x, y + 6]], '#fff0de');
  } else if (b.state === 'blinkWind') {
    // The destination marker covers the full reach of the knives after arrival.
    c.globalAlpha = .18 + k * .22;
    ellipse(c, b.tx, b.ty, KNIVES.ring, KNIVES.ring * GROUND_SCALE, '#cfc6de');
    c.globalAlpha = .75;
    c.strokeStyle = '#e8e2f0'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(b.tx, b.ty, KNIVES.ring, KNIVES.ring * GROUND_SCALE, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = .3;
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      rect(c, b.x + (b.tx - b.x) * t, b.y + (b.ty - b.y) * t, 3, 3, '#cfc6de');
    }
    c.globalAlpha = 1;
  } else if (b.state === 'volleyWind') {
    for (let i = -4; i <= 4; i++) {
      const ang = Math.atan2(player.y - b.y, player.x - b.x) + i * .13;
      c.globalAlpha = .25 + k * .45;
      path(c, [[b.x, b.y - 26], [b.x + Math.cos(ang) * 520 * k, b.y - 26 + Math.sin(ang) * 520 * .62 * k]], 1.5, gold);
      c.globalAlpha = 1;
    }
  } else if (b.state === 'snipeWind') {
    const ang = Math.atan2(player.y - b.y, player.x - b.x);
    c.globalAlpha = .2 + k * .5;
    path(c, [[b.x, b.y - 26], [b.x + Math.cos(ang) * 620, b.y - 26 + Math.sin(ang) * 620 * .62]], 5, gold);
    c.globalAlpha = .7 + k * .3;
    path(c, [[b.x, b.y - 26], [b.x + Math.cos(ang) * 620 * k, b.y - 26 + Math.sin(ang) * 620 * .62 * k]], 1, '#ffffff');
    c.globalAlpha = 1;
  } else if (b.state === 'ultimateWind') {
    ring(300, gold, .12);
    // A hand sweeping round, showing which way the turn will go.
    const sweep = Math.atan2(player.y - b.y, player.x - b.x) + k * Math.PI * 2;
    c.globalAlpha = .5;
    path(c, [[b.x, b.y], [b.x + Math.cos(sweep) * 300, b.y + Math.sin(sweep) * 150]], 2, gold);
    c.globalAlpha = 1;
  } else if (b.state === 'ultimate') {
    c.globalAlpha = .14;
    ellipse(c, b.x, b.y, 320, 160, gold);
    c.globalAlpha = .8;
    path(c, [[b.x, b.y], [b.x + Math.cos(b.spin) * 320, b.y + Math.sin(b.spin) * 160]], 4, gold);
    c.globalAlpha = .28;
    // Everything already swept, which after a full turn is the whole floor.
    c.beginPath();
    c.moveTo(b.x, b.y);
    c.ellipse(b.x, b.y, 320, 160, 0, b.spin0 ?? b.spin, b.spin);
    c.closePath();
    c.fillStyle = gold;
    c.fill();
    c.globalAlpha = 1;
  } else if (b.state === 'backstepWind' || b.state === 'backstep') {
    c.globalAlpha = .3;
    path(c, [[b.x, b.y], [b.x - Math.cos(a) * 130, b.y - Math.sin(a) * 80]], 8, '#cfc6de');
    c.globalAlpha = 1;
  } else if (b.state === 'hold' || b.state === 'throw') {
    c.globalAlpha = .5;
    if (b.throwTarget) {
      path(c, [[player.x, player.y], [b.throwTarget.x, b.throwTarget.y]], 3, rose);
      ellipse(c, b.throwTarget.x, b.throwTarget.y, 22, 12, rose);
    }
    c.globalAlpha = 1;
  }
}

/**
 * Vaelira, Thorn of the Grove: the elf who kept this place before it kept her.
 * Tall and unhurried, in leaf-scale over a long slit gown, silver hair to the
 * waist and a circlet of thorns. She carries knives, then a whip, then a bow,
 * and she never quite stands straight — the weight is always on one hip.
 */
function vaeliraFigure(c, b, x, y, mirror, alpha) {
  const t = game.time;
  const stage = b.stage || 0;
  const st = b.state;
  const shifting = st === 'shift';
  const breath = Math.sin(t * 2.1) * .8;
  const sway = Math.sin(t * 1.6) * 1.4;
  const hair = Math.sin(t * 1.3) * 2.4;
  // Weight on one hip, always. Attacks lean into the blow.
  const lean = st === 'dash' ? 5 : st === 'lash' ? 3 : st === 'flurry' ? 2 : st.endsWith('Wind') ? -2 : 0;
  const hip = shifting ? 0 : Math.sin(t * 1.1) * 1.2 + 2;
  const crouch = st === 'dash' ? 3 : st === 'dashWind' || st === 'flurryWind' ? 2 : 0;

  c.save();
  c.globalAlpha = alpha;
  ellipse(c, x + 2, y + 5, 24, 8, '#0d0a1499');
  c.translate(Math.round(x), Math.round(y));
  c.scale(1.55 * mirror, 1.55);
  c.translate(lean * .5, crouch);

  // --- the gown: long, heavy, split high on the near side -----------------------
  const flare = Math.sin(t * 1.4) * 2 + (st === 'dash' ? -5 : 0);
  poly(c, [[-12, -32], [12, -32], [19 + flare * .5, -4], [14 + flare, 9], [4, 3], [-4 + flare, 10], [-17 + flare * .5, -2]], '#0c1a14');
  poly(c, [[-10, -31], [10, -31], [16 + flare * .5, -5], [12 + flare, 7], [4, 1], [-3 + flare, 8], [-15 + flare * .5, -3]], '#1e4a38');
  poly(c, [[-2, -30], [8, -30], [13 + flare * .4, -6], [8 + flare * .8, 5], [1, -4]], '#2f7a5c');
  // The slit, and the leg it shows.
  poly(c, [[2, -30], [7, -30], [9, -6], [4, 4], [1, -8]], '#0c1a14');
  rect(c, 3, -22, 5, 24, '#e8d0bc');
  rect(c, 3, -22, 2, 24, '#f5e4d4');
  // A gold chain along the hem and the split.
  path(c, [[-14, -4], [-4, 2], [6, -3], [15, -6]], 1, '#d9b86a');
  path(c, [[3, -28], [9, -8]], 1, '#d9b86a');
  for (let i = 0; i < 4; i++) rect(c, -9 + i * 5, -26 + (i % 2) * 3, 2, 2, '#d9b86a');
  // Boots under the hem.
  for (const [lx, w] of [[-7, 5], [3, 5]]) { rect(c, lx, -4, w, 7, '#0e1216'); rect(c, lx, -3, w - 1, 5, '#3a2c30'); rect(c, lx - 1, 2, w + 2, 3, '#14100e'); }

  // --- waist and bodice: cinched, cut low, laced in gold ------------------------
  const wy = -38 + breath;
  poly(c, [[-6 + hip, wy - 3], [6 + hip, wy - 3], [8 + hip, wy + 7], [-8 + hip, wy + 7]], '#e8d0bc');   // the bare midriff
  path(c, [[-5 + hip, wy + 2], [5 + hip, wy + 2]], 1, '#d0b39c');
  poly(c, [[-9 + hip, -52 + breath], [9 + hip, -52 + breath], [11 + hip, -40], [-11 + hip, -40]], '#0c1812');
  poly(c, [[-8 + hip, -51 + breath], [8 + hip, -51 + breath], [9 + hip, -41], [-9 + hip, -41]], '#276048');
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) rect(c, -7 + hip + i * 3, -50 + breath + r * 3, 2, 2, (i + r) % 2 ? '#2f7a5c' : '#1e4a38');
  // A deep V at the throat, laced across.
  poly(c, [[-5 + hip, -52 + breath], [5 + hip, -52 + breath], [0 + hip, -42]], '#e8d0bc');
  for (let i = 0; i < 4; i++) path(c, [[-4 + hip + i * .6, -51 + breath + i * 2.4], [4 + hip - i * .6, -50 + breath + i * 2.4]], 1, '#d9b86a');
  rect(c, -11 + hip, -41, 22, 3, '#0c1812');
  rect(c, -10 + hip, -40, 20, 1, '#d9b86a');

  // --- shoulders, arms, long gloves --------------------------------------------
  poly(c, [[-12 + hip, -54 + breath], [12 + hip, -54 + breath], [13 + hip, -49], [-13 + hip, -49]], '#10201a');
  for (let i = 0; i < 6; i++) poly(c, [[-12 + hip + i * 4.4, -52 + breath], [-10 + hip + i * 4.4, -58 + breath], [-8 + hip + i * 4.4, -51 + breath]], i % 2 ? '#2f7a5c' : '#1e4a38');

  // --- head, hair, circlet ------------------------------------------------------
  const hy = -66 + breath, tilt = shifting ? -3 : st === 'stalk' ? Math.sin(t * .9) * 1.2 : 0;
  // Hair behind, moving.
  poly(c, [[-9 + hip, hy + 4], [-15 + sway, -44], [-13 + hair, -20], [-6 + hip, -34], [-6 + hip, hy + 2]], '#cfc6de');
  poly(c, [[-8 + hip, hy + 3], [-13 + sway, -44], [-11 + hair, -24], [-6 + hip, -36]], '#b9b0c8');
  c.save();
  c.translate(hip + tilt, 0);
  rect(c, -5, hy - 8, 11, 14, '#0e1216');
  rect(c, -4, hy - 7, 9, 12, '#e8d0bc');
  rect(c, 1, hy - 6, 4, 10, '#f5e4d4');
  // A long ear, and hair falling over the near shoulder.
  poly(c, [[4, hy - 4], [12, hy - 10], [5, hy + 2]], '#e8d0bc');
  poly(c, [[5, hy - 4], [10, hy - 8], [5, hy]], '#f5e4d4');
  poly(c, [[-5, hy - 8], [-1, hy - 13], [6, hy - 12], [7, hy - 4], [-4, hy - 2]], '#cfc6de');
  poly(c, [[5, hy - 3], [9, -46], [6, -34], [3, -44]], '#cfc6de');
  // Eyes with a heavy lash line, and a small red mouth.
  rect(c, -3, hy - 2, 3, 2, '#2f7a5c'); rect(c, 2, hy - 2, 3, 2, '#2f7a5c');
  rect(c, -3, hy - 3, 3, 1, '#2a1820'); rect(c, 2, hy - 3, 3, 1, '#2a1820');
  rect(c, -4, hy - 3, 1, 1, '#2a1820'); rect(c, 5, hy - 3, 1, 1, '#2a1820');
  rect(c, 0, hy + 2, 3, 1, '#b04a5e');
  rect(c, -2, hy + 5, 5, 1, '#d0b39c');
  // The circlet: thorns, low on the brow.
  for (let i = 0; i < 5; i++) poly(c, [[-5 + i * 3, hy - 11], [-4 + i * 3, hy - 17 - (i % 2) * 2], [-3 + i * 3, hy - 11]], '#3d2c1c');
  path(c, [[-6, hy - 11], [6, hy - 11]], 1, '#d9b86a');
  rect(c, 0, hy - 12, 2, 2, '#8fe8c0');
  // A choker with a stone.
  rect(c, -4, hy + 6, 9, 2, '#2a1820');
  rect(c, 0, hy + 6, 2, 2, '#8fe8c0');
  c.restore();

  // --- what is in her hands, and the swing of it -------------------------------
  const armY = -48 + breath, hx0 = hip;
  const glove = (fx, fy, tx, ty) => {
    path(c, [[fx, fy], [tx, ty]], 3.4, '#0e1216');
    path(c, [[fx, fy], [(fx + tx) / 2, (fy + ty) / 2], [tx, ty]], 2, '#e8d0bc');
    path(c, [[(fx + tx) * .55, (fy + ty) * .55], [tx, ty]], 2, '#3a2c30');       // the long glove
  };

  if (shifting) {
    for (const side of [-1, 1]) glove(hx0 + side * 9, armY, hx0 + side * 27, armY - 24);
    for (let r = 1; r <= 3; r++) {
      c.globalAlpha = alpha * Math.max(0, .6 - r * .15) * (Math.sin(t * 4 + r) * .3 + .7);
      c.strokeStyle = '#8fe8c0';
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, -30, 18 + r * 15, 9 + r * 8, 0, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = alpha;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + t * 2, r = 26 + Math.sin(t * 3 + i) * 9;
      rect(c, Math.cos(a) * r, -34 + Math.sin(a) * r * .5, 2, 2, i % 2 ? '#8fe8c0' : '#d9b86a');
    }
  } else if (stage === 0) {
    // Knives. Idle: one low and reversed, the other on her hip. Flurry: they cross, fast.
    const swing = st === 'flurry' ? Math.sin(t * 34) : st === 'dash' ? 1 : 0;
    const cocked = st === 'flurryWind' || st === 'dashWind' ? 1 : 0;
    for (const side of [1, -1]) {
      const s = side * (swing || 1);
      const hxx = hx0 + side * (12 + cocked * 5) + s * 4;
      const hyy = armY + (side > 0 ? -4 : 6) - cocked * 7 - s * 5;
      glove(hx0 + side * 8, armY, hxx, hyy);
      c.save();
      c.translate(hxx, hyy);
      c.rotate(side > 0 ? -.9 - s * .8 : 2.3 + s * .8);
      poly(c, [[0, -2], [15, -3], [19, 0], [14, 3], [0, 2]], '#0c0a12');
      poly(c, [[2, -1], [14, -2], [17, 0], [13, 2], [2, 1]], '#cfd8de');
      path(c, [[3, -1], [15, -1]], 1, '#ffffff');
      rect(c, -4, -3, 5, 6, '#3d2c1c');
      rect(c, -1, -3, 2, 6, '#d9b86a');
      c.restore();
      // The cut it leaves in the air.
      if (st === 'flurry' && Math.abs(swing) > .5) {
        c.globalAlpha = alpha * .55;
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;
        c.beginPath(); c.arc(hx0, armY, 22 + side * 4, -1 - s, .6 - s); c.stroke();
        c.globalAlpha = alpha;
      }
    }
  } else if (stage === 1) {
    // The whip. It coils at rest, winds back over her shoulder, and comes round in an arc.
    const drawn = st === 'lashWind' || st === 'grabWind' ? 1 : 0;
    const hxx = hx0 + 14, hyy = armY - drawn * 16 - (st === 'hold' ? -6 : 0);
    glove(hx0 - 9, armY, hx0 - 17, armY + 9);
    glove(hx0 + 9, armY, hxx, hyy);
    rect(c, hxx - 2, hyy - 5, 5, 10, '#3d2c1c');
    rect(c, hxx - 1, hyy - 4, 3, 8, '#7a2a4a');
    if (st === 'lash' || st === 'grab' || st === 'hold' || st === 'throw') {
      // The extended whip is drawn in world space, aligned with its floor marker.
    } else if (drawn) {
      // Wound back over the shoulder, ready.
      const pts = [[hxx, hyy]];
      for (let i = 1; i <= 6; i++) pts.push([hxx - i * 7, hyy - Math.sin(i * .5) * 12 - i * 2]);
      path(c, pts, 3, '#2a0f1c');
      path(c, pts, 1.5, '#c9518a');
    } else {
      for (let i = 0; i < 4; i++) { c.strokeStyle = '#7a2a4a'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(hxx + 4, hyy + 9 + i * 2, 8 - i, 3, 0, 0, Math.PI * 2); c.stroke(); }
    }
  } else {
    // The bow. Drawn further the closer the shot is, and she turns with it on the ultimate.
    const drawing = st === 'volleyWind' || st === 'snipeWind' || st === 'ultimateWind' ? 1 - Math.max(0, b.timer) / (st === 'ultimateWind' ? 1.5 : .75) : 0;
    const draw = st === 'ultimate' ? 1 : Math.max(.25, drawing);
    const aim = st === 'ultimate' ? b.spin - Math.atan2(b.dy, b.dx) : 0;
    c.save();
    c.rotate(aim * mirror);
    glove(hx0 + 9, armY, hx0 + 21, armY - 5);
    c.save();
    c.translate(hx0 + 23, armY - 7);
    c.strokeStyle = '#0c0a12'; c.lineWidth = 4.5;
    c.beginPath(); c.arc(-6, 0, 23, -1.15, 1.15); c.stroke();
    c.strokeStyle = '#5c4530'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(-6, 0, 23, -1.15, 1.15); c.stroke();
    c.strokeStyle = '#8a6f4d'; c.lineWidth = 1;
    c.beginPath(); c.arc(-6, 0, 23, -1.15, 1.15); c.stroke();
    for (const e of [-1.15, 1.15]) { rect(c, -6 + Math.cos(e) * 23 - 1, Math.sin(e) * 23 - 1, 3, 3, '#d9b86a'); }
    path(c, [[-6 + Math.cos(-1.15) * 23, Math.sin(-1.15) * 23], [-6 - 14 * draw, 0], [-6 + Math.cos(1.15) * 23, Math.sin(1.15) * 23]], 1, '#e8e2d0');
    if (draw > .55) {
      const n = st === 'volleyWind' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 4;
        rect(c, -20, -1 + off, 24, 2, '#4a3826');
        poly(c, [[4, -3 + off], [12, off], [4, 3 + off]], '#cfd8de');
        poly(c, [[-20, -3 + off], [-15, off], [-20, 3 + off]], '#3a5a3a');
      }
    }
    c.restore();
    glove(hx0 - 9, armY, hx0 - 15 - 12 * draw, armY - 3);
    c.restore();
  }
  c.restore();
  c.globalAlpha = 1;
}

const STAGES_LABEL = ['', 'THE WHIP', 'THE BOW'];

export function drawVaelira(c, b) {
  vaeliraTells(c, b);
  const moving = ['dash', 'lash', 'grab', 'hold', 'throw'].includes(b.state) || b.state.endsWith('Wind');
  const facing = moving ? Math.atan2(b.dy, b.dx) : Math.atan2(player.y - b.y, player.x - b.x);
  const mirror = Math.cos(facing) < 0 ? -1 : 1;
  const float = b.state === 'shift' ? Math.min(20, (2.4 - Math.max(0, b.timer)) * 13) : 0;

  // She leaves herself behind when she moves that fast.
  if (b.state === 'dash') for (let i = 3; i >= 1; i--)
    vaeliraFigure(c, b, b.x - b.dx * i * 17, b.y - b.dy * i * 11, mirror, .1 + (3 - i) * .06);

  vaeliraFigure(c, b, b.x, b.y - float, mirror, 1);
  if (b.stage === 1 && ['lash', 'grab', 'hold'].includes(b.state)) {
    const a = Math.atan2(b.dy, b.dx);
    let end;
    if (b.state === 'hold') end = [player.x, player.y - 20];
    else {
      const sweep = b.state === 'lash' ? -WHIP.arc + Math.min(1, (WHIP.lashTime - b.timer) / WHIP.lashTime) * WHIP.arc * 2 : 0;
      const reach = b.state === 'lash' ? WHIP.reach : b.hookReach ?? 0;
      end = [b.x + Math.cos(a + sweep) * reach, b.y - 30 + Math.sin(a + sweep) * reach * GROUND_SCALE];
    }
    const pts = [[b.x, b.y - 30], [(b.x + end[0]) / 2, (b.y - 30 + end[1]) / 2 + 5], end];
    path(c, pts, 4, '#2a0f1c');
    path(c, pts, 2, '#c9518a');
    ellipse(c, end[0], end[1], 4, 3, '#e8e2d0');
  }


  if (b.state === 'recover') label(c, b.x, b.y - 116, 'EXPOSED', '#f0a0c8', 8);
  if (b.state === 'shift') label(c, b.x, b.y - 128, STAGES_LABEL[b.stage] || '', '#8fe8c0', 8);
}


/** The Herald: a robed, winged light hovering over the sanctuary altar. */
export function drawHerald(c, h) {
  const t = game.time, hover = Math.sin(t * 2.2) * 3, flap = Math.sin(t * 5) * .3;
  const x = Math.round(h.x), y = Math.round(h.y + hover);
  ellipse(c, x, h.ty + 30, 36 * game.glow, 10 * game.glow, '#fff2c02a');
  c.save();
  c.translate(x, y);
  for (const m of [-1, 1]) {
    c.save();
    c.scale(m, 1);
    c.rotate(-flap);
    poly(c, [[6, -30], [30, -58], [58, -66], [64, -50], [50, -30], [38, -10], [14, -2]], '#e6dfcd');
    poly(c, [[8, -28], [28, -52], [52, -58], [56, -46], [44, -30], [34, -12], [14, -4]], '#fffaf0');
    for (let i = 0; i < 4; i++) path(c, [[14 + i * 9, -6 - i * 8], [40 + i * 6, -30 - i * 8]], 1, '#d5c8a8');
    c.restore();
  }
  poly(c, [[-11, -34], [11, -34], [16, 8], [8, 26], [0, 36], [-8, 26], [-16, 8]], '#f1eadb');
  poly(c, [[-8, -30], [8, -30], [11, 6], [4, 22], [0, 30], [-4, 22], [-11, 6]], '#fffdf6');
  rect(c, -10, -18, 20, 3, '#d9b86a');
  c.strokeStyle = '#ffe9a6';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, -50, 12, 0, Math.PI * 2);
  c.stroke();
  ellipse(c, 0, -42, 8, 9, '#efe6d3');
  rect(c, -4, -44, 8, 4, '#c7b8a0'); rect(c, -3, -43, 2, 2, '#fff6cf'); rect(c, 1, -43, 2, 2, '#fff6cf');
  c.restore();
}

/** A flashing E over Aldren's head while a blow can be caught on the blade. */
export function drawParryCue(c) {
  if (!parryHint()) return;
  const y = player.y - 74 + Math.sin(game.time * 14) * 2;
  c.globalAlpha = .75 + Math.sin(game.time * 22) * .25;
  rect(c, player.x - 8, y - 8, 16, 16, '#0c0a12');
  rect(c, player.x - 7, y - 7, 14, 14, '#f0dfae');
  rect(c, player.x - 4, y - 5, 8, 2, '#1a1522'); rect(c, player.x - 4, y - 1, 6, 2, '#1a1522'); rect(c, player.x - 4, y + 3, 8, 2, '#1a1522'); rect(c, player.x - 4, y - 5, 2, 10, '#1a1522');
  c.globalAlpha = 1;
}

export function drawAttackIndicator(c) {
  if (player.attack <= 0) return;
  const pose = attackPose(), r = player.special ? 62 : 40;
  c.save();
  c.translate(player.x, player.y - 23);
  c.rotate(player.attackFace);
  c.globalAlpha = pose.phase === 'windup' ? .22 : pose.phase === 'swing' ? .9 : Math.max(0, (1 - pose.progress) * 1.2);
  c.strokeStyle = player.special ? '#ffd786' : '#e2f2f3';
  c.lineWidth = pose.phase === 'swing' ? (player.special ? 5 : 3) : 1;
  c.beginPath();
  c.arc(0, 0, r, -1.1, 1.1);
  c.stroke();
  if (pose.phase === 'swing') {
    c.globalAlpha = .75;
    c.lineWidth = 2;
    c.strokeStyle = '#fff9db';
    c.beginPath();
    c.arc(0, 0, r, Math.max(-1.4, pose.offset - .65), pose.offset);
    c.stroke();
  }
  c.restore();
}

/**
 * A still, front-facing portrait of the wanderer for the character sheet.
 * Borrows the world sprite so gear changes show up here for free.
 */
export function drawWandererFigure(c, w, h) {
  c.clearRect(0, 0, w, h);
  c.imageSmoothingEnabled = false;
  const saved = {
    face: player.face, attack: player.attack, roll: player.roll,
    moving: player.moving, inv: player.inv, walkPhase: player.walkPhase, special: player.special,
  };
  Object.assign(player, { face: Math.PI / 2, attack: 0, roll: 0, moving: false, inv: 0, walkPhase: 0, special: false });
  // Budget height for the blade too: it hangs down-right past the boots.
  const scale = Math.min(w / 60, h / 104);
  c.save();
  c.translate(Math.round(w / 2 - 3 * scale), Math.round(h - 30 * scale));
  c.scale(scale, scale);
  drawWanderer(c, 0, 0);
  c.restore();
  Object.assign(player, saved);
}

// --- the two on the Drowned Throne ------------------------------------------------

/** Chitin, and the blue-green rot that has been standing in salt water. */
const CHITIN = { dark: '#22302b', shell: '#4c6350', lit: '#7e9a72', edge: '#98b585', joint: '#1a241f' };

/**
 * Vosk. A captain who drowned in his own hold and came up again, mostly bone
 * under a coat that has not dried since. Drawn on his feet in stage one, and
 * again slumped over the scorpion's back once it has taken him up.
 */
export function drawDrownedCaptain(c, b, mounted = false) {
  const wind = b.state === 'cleaveWind' || b.state === 'shotWind' || b.state === 'broadsideWind';
  const raise = wind ? Math.min(1, 1 - Math.max(0, b.timer) / (b.windDuration || 1)) : 0;
  const sway = b.state === 'stalk' ? Math.sin(game.time * 2.6) * 2 : 0;
  const step = b.state === 'stalk' ? Math.sin(game.time * 5.4) * 4 : 0;
  const bone = '#cdd0bb', boneDark = '#8d907e';
  const coat = '#3b2f3a', coatLit = '#5d4a54', gold = '#c9a94e';

  if (!mounted) ellipse(c, b.x + 2, b.y + 5, 26, 9, '#0a0e1499');
  c.save();
  c.translate(Math.round(b.x), Math.round(b.y));
  const mirror = b.dx < 0 ? -1 : 1;
  c.scale(mirror, 1);

  if (!mounted) {
    // One leg is bone to the knee; the boot on the other never came off.
    for (const [side, lift] of [[-1, step], [1, -step]]) {
      const x = side * 6;
      path(c, [[x, -34], [x + lift * .4, -18], [x + lift * .3, -3]], 6, '#171319');
      path(c, [[x, -34], [x + lift * .4, -18], [x + lift * .3, -4]], 3, side < 0 ? bone : '#2e2620');
      if (side > 0) { rect(c, x + lift * .3 - 5, -8, 10, 8, '#241d18'); rect(c, x + lift * .3 - 5, -8, 10, 2, '#6b5340'); }
      else for (let i = 0; i < 3; i++) path(c, [[x - 3, -26 + i * 7], [x + 3, -25 + i * 7]], 1, boneDark);
    }
  }

  // A long coat, split and hanging, with the ribs showing where it does not meet.
  const hip = mounted ? -12 : -34;
  poly(c, [[-13, -62], [13, -61], [16, -40], [14, hip + 2], [6, hip - 4], [0, hip + 4], [-7, hip - 3], [-15, hip + 1], [-16, -42]], '#171319');
  poly(c, [[-11, -60], [11, -59], [13, -41], [12, hip], [5, hip - 6], [0, hip + 1], [-6, hip - 5], [-13, hip - 1], [-14, -42]], coat);
  path(c, [[-7, -58], [-5, -46], [-8, hip - 2]], 2, coatLit);
  for (let i = 0; i < 4; i++) path(c, [[-5, -56 + i * 5], [5, -55 + i * 5]], 1, i % 2 ? bone : boneDark);
  // Sash, buckle and the brine still running out of the hem.
  rect(c, -13, -44, 26, 4, '#6b2330');
  rect(c, -2, -45, 6, 6, gold);
  for (let i = 0; i < 4; i++) path(c, [[-10 + i * 7, hip + 1], [-11 + i * 7 + sway * .3, hip + 9]], 1, '#2b4a4a');

  // The skull under the hat: jaw hanging, one lamp of a light where an eye was.
  ellipse(c, 1, -70, 9, 10, '#171319');
  ellipse(c, 1, -70, 7, 8, bone);
  rect(c, -3, -71, 3, 3, '#0b1014');
  rect(c, 3, -71, 3, 3, '#6fd6b0');
  for (let i = 0; i < 4; i++) rect(c, -4 + i * 3, -64, 2, 3, boneDark);
  // Tricorn, sodden, with weed caught in the brim.
  poly(c, [[-15, -76], [-4, -86], [8, -86], [17, -76], [10, -73], [-8, -73]], '#1d1a20');
  poly(c, [[-12, -77], [-3, -84], [7, -84], [13, -77], [7, -75], [-7, -75]], '#332c33');
  path(c, [[-13, -76], [16, -76]], 2, gold);
  path(c, [[-10, -78], [-6, -70], [-12, -64]], 2, '#3f604b');

  // The cutlass arm comes up through the windup; the pistol comes level instead.
  const shooting = b.state === 'shotWind' || b.state === 'broadsideWind';
  path(c, [[-11, -58], [-16 + sway * .4, -48], [-14, -38]], 5, '#171319');
  path(c, [[-11, -57], [-15 + sway * .4, -48], [-13, -39]], 3, bone);
  if (shooting) {
    const hx = 24 + raise * 8, hy = -50;
    path(c, [[11, -57], [18, -53], [hx, hy]], 5, '#171319');
    path(c, [[11, -56], [17, -53], [hx - 1, hy]], 3, bone);
    // A heavy flintlock, and the match already glowing at the pan.
    rect(c, hx - 2, hy - 4, 16, 6, '#2a2320');
    rect(c, hx - 2, hy - 3, 14, 2, '#6b5340');
    rect(c, hx + 12, hy - 3, 6, 3, '#8f9488');
    if (raise > .6) ellipse(c, hx + 19, hy - 2, 3 + raise * 2, 3, '#ffcf7a');
  } else {
    const hx = 18 + raise * 10, hy = -46 - raise * 30;
    path(c, [[11, -57], [17, -51 - raise * 10], [hx, hy]], 5, '#171319');
    path(c, [[11, -56], [16, -51 - raise * 10], [hx - 1, hy]], 3, bone);
    // The cutlass: a wide, pitted curve with the sea still on it.
    c.save();
    c.translate(hx, hy);
    c.rotate(-.9 - raise * 1.5);
    poly(c, [[0, -3], [46, -13], [58, -4], [46, 4], [0, 4]], '#171319');
    poly(c, [[2, -2], [44, -11], [54, -4], [44, 2], [2, 2]], '#9aa7a0');
    path(c, [[4, -1], [44, -8]], 1, '#dfe7e0');
    rect(c, -6, -6, 8, 12, '#3a2f26');
    rect(c, -4, -5, 4, 10, gold);
    c.restore();
  }
  c.restore();
}

/** The husk it left behind: the same shell, empty, split up the back. */
export function drawHusk(c, h) {
  ellipse(c, h.x, h.y + 4, 42, 15, '#0a0e1466');
  c.save();
  c.translate(Math.round(h.x), Math.round(h.y));
  c.scale(1, GROUND_SCALE);
  c.rotate(h.angle);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++)
    path(c, [[-8 + i * 12, side * 10], [-14 + i * 14, side * 30], [-20 + i * 16, side * 40]], 3, '#3c4a3d');
  poly(c, [[-34, -26], [26, -30], [44, 0], [26, 30], [-34, 26], [-44, 0]], '#3a473c');
  poly(c, [[-30, -21], [22, -24], [36, 0], [22, 24], [-30, 21], [-38, 0]], '#59685180');
  // The split it came out of, straight up the back.
  poly(c, [[-26, -7], [30, -4], [30, 4], [-26, 7]], '#10171400');
  path(c, [[-28, 0], [32, 0]], 7, '#11181499');
  c.restore();
}

/**
 * The Molt. A scorpion the size of a longboat, drawn flat on the ground plane
 * the way a scorpion actually stands, with the tail arcing up out of that plane
 * in screen space so it still reads as being over its own back.
 */
export function drawMolt(c, b, rider = false) {
  const a = Math.atan2(b.dy, b.dx);
  const scale = rider ? 1.18 : 1;
  const gait = b.state === 'stalk' || b.state === 'absorb' ? Math.sin(game.time * 7) : 0;
  const open = b.state === 'pincerWind' || b.state === 'sweepWind'
    ? Math.min(1, 1 - Math.max(0, b.timer) / (b.windDuration || 1)) : 0;
  const molting = b.state === 'molt';
  const pale = molting ? Math.max(0, b.timer) / 2.3 : 0;
  const shell = molting ? '#7d9478' : CHITIN.shell;

  ellipse(c, b.x + 3, b.y + 6, 52 * scale, 19 * scale, '#0a0e1499');
  c.save();
  c.translate(Math.round(b.x), Math.round(b.y));
  c.scale(scale, GROUND_SCALE * scale);
  c.rotate(a);

  // Six legs, three a side, stepping in opposition.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const lift = Math.sin(game.time * 7 + i * 2 + (side > 0 ? Math.PI : 0)) * 5 * (gait ? 1 : 0);
    const bx = -10 + i * 13, out = side * (30 + i * 4);
    path(c, [[bx, side * 11], [bx - 6 + lift, side * 28], [bx - 14 + lift, out]], 5, CHITIN.joint);
    path(c, [[bx, side * 11], [bx - 6 + lift, side * 28], [bx - 13 + lift, out]], 3, shell);
    path(c, [[bx - 13 + lift, out], [bx - 19 + lift, out + side * 7]], 2, CHITIN.dark);
  }

  // The carapace: plated, wider at the shoulders, tapering to the tail root.
  poly(c, [[-36, -28], [24, -32], [46, 0], [24, 32], [-36, 28], [-48, 0]], CHITIN.dark);
  poly(c, [[-32, -23], [21, -26], [37, 0], [21, 26], [-32, 23], [-41, 0]], shell);
  for (let i = 0; i < 4; i++) {
    const px = 20 - i * 15;
    path(c, [[px, -24 + i * 2], [px, 24 - i * 2]], 2, CHITIN.joint);
    path(c, [[px + 3, -20 + i * 2], [px + 3, 20 - i * 2]], 1, CHITIN.lit);
  }
  // Eyes in a row along the front plate.
  for (let i = -1; i <= 1; i++) ellipse(c, 32, i * 7, 3, 3, molting ? '#e8f0d8' : '#d8e04a');

  // Claws, held out in front and opening through the windup.
  for (const side of [-1, 1]) {
    const yaw = side * (16 + open * 8);
    c.save();
    c.translate(38, yaw);
    c.rotate(side * (.35 - open * .5));
    path(c, [[0, 0], [22, side * 4]], 7, CHITIN.joint);
    path(c, [[0, 0], [21, side * 4]], 4, shell);
    // The pincer itself: a fixed jaw and a moving one.
    poly(c, [[20, side * 2], [46, side * -8], [56, side * 2], [44, side * 10], [24, side * 10]], CHITIN.dark);
    poly(c, [[23, side * 3], [43, side * -5], [51, side * 2], [41, side * 8], [26, side * 8]], shell);
    c.save();
    c.rotate(side * -open * .6);
    poly(c, [[36, side * 2], [58, side * -6], [62, side * 1], [44, side * 7]], CHITIN.edge);
    c.restore();
    path(c, [[28, side * 5], [46, side * 1]], 1, CHITIN.lit);
    c.restore();
  }
  c.restore();

  // The tail comes up out of the ground plane, so it is drawn in screen space.
  const rootX = b.x - Math.cos(a) * 38 * scale, rootY = b.y - Math.sin(a) * 38 * scale * GROUND_SCALE;
  const strike = b.state === 'sting' ? 1 : b.state === 'stingWind'
    ? -Math.min(1, 1 - Math.max(0, b.timer) / (b.windDuration || 1)) * .6 : 0;
  const arcX = Math.cos(a) * 26 * scale, lift = (78 - strike * 96) * scale;
  const seg = (t) => [
    rootX + arcX * t + Math.cos(a) * 34 * scale * t * t,
    rootY - lift * Math.sin(t * 2.1) - t * 10 * scale,
  ];
  const tail = [0, .2, .4, .6, .8, 1].map(seg);
  path(c, tail, 13 * scale, CHITIN.joint);
  path(c, tail, 9 * scale, shell);
  for (const t of [.2, .4, .6, .8]) {
    const [sx, sy] = seg(t);
    ellipse(c, sx, sy, 6 * scale, 5 * scale, CHITIN.dark);
    ellipse(c, sx, sy - 1, 4 * scale, 3 * scale, CHITIN.lit);
  }
  // The sting, and whatever it has been keeping in it.
  const [tx, ty] = seg(1);
  poly(c, [[tx - 7 * scale, ty], [tx + 2 * scale, ty - 9 * scale], [tx + 9 * scale, ty + 3 * scale], [tx, ty + 9 * scale]], CHITIN.dark);
  poly(c, [[tx - 3 * scale, ty], [tx + 2 * scale, ty - 6 * scale], [tx + 6 * scale, ty + 2 * scale]], '#c2d8a8');
  if (!molting) ellipse(c, tx + 5 * scale, ty + 5 * scale, 3, 3, '#d8e04a');

  // Coming out of the old shell: the new one is still wet and bright.
  if (pale > 0) {
    c.globalAlpha = pale * .5;
    ellipse(c, b.x, b.y, 60 * scale, 34 * scale, '#dff0d8');
    c.globalAlpha = 1;
  }
  if (rider) drawFusion(c, b, a, scale);
}

/**
 * What comes up out of the shell after it closes over him. Not a man on a
 * scorpion: the scorpion is most of it, and he is the part that grew out of
 * the front — ribs plated over in chitin, the spine running back under the
 * carapace, one arm ending in the gun the hold was full of.
 */
function drawFusion(c, b, a, scale) {
  // Anchored to the front plate of the carapace, not hovering over the middle.
  const fx = b.x + Math.cos(a) * 30 * scale;
  const fy = b.y + Math.sin(a) * 30 * scale * GROUND_SCALE - 30 * scale;
  const mirror = Math.cos(a) < 0 ? -1 : 1;
  const wind = b.state?.endsWith('Wind');
  const raise = wind ? Math.min(1, 1 - Math.max(0, b.timer) / (b.windDuration || 1)) : 0;
  const heave = Math.sin(game.time * 3.4) * 2;
  const bone = '#cdd0bb', boneDark = '#8d907e';

  c.save();
  c.translate(Math.round(fx), Math.round(fy));
  c.scale(mirror * scale, scale);

  // Chitin creeping up out of the shell and over what is left of his hips.
  poly(c, [[-24, 10], [-16, -10], [0, -16], [16, -10], [24, 10], [10, 18], [-10, 18]], CHITIN.dark);
  poly(c, [[-19, 8], [-13, -7], [0, -12], [13, -7], [19, 8], [8, 14], [-8, 14]], CHITIN.shell);
  for (let i = -2; i <= 2; i++) path(c, [[i * 7, -10], [i * 8, 12]], 1, CHITIN.joint);

  // The ribcage, half of it plated over, the coat rotted onto the bone.
  const t = -18 + heave * .4;
  poly(c, [[-15, t + 4], [-12, t - 26], [0, t - 34], [12, t - 26], [15, t + 4], [0, t + 10]], '#171319');
  poly(c, [[-12, t + 2], [-10, t - 24], [0, t - 30], [10, t - 24], [12, t + 2], [0, t + 7]], bone);
  for (let i = 0; i < 5; i++) path(c, [[-10 + i * .6, t - 22 + i * 6], [10 - i * .6, t - 22 + i * 6]], 2, boneDark);
  // Chitin has taken the right half of him; the plates run up into the collar.
  poly(c, [[1, t - 30], [12, t - 25], [14, t + 2], [1, t + 7]], '#4c6350dd');
  for (let i = 0; i < 4; i++) path(c, [[2, t - 24 + i * 7], [13, t - 22 + i * 7]], 1, CHITIN.joint);
  // The rag of the coat, hanging off the join rather than worn.
  poly(c, [[-16, t - 18], [-26, t + 6], [-20, 16], [-11, 2]], '#332c33');
  poly(c, [[-16, t - 16], [-23, t + 4], [-18, 12], [-12, 0]], '#453a44');

  // The skull, pushed forward on a neck of shell, jaw gone, both lights lit.
  path(c, [[0, t - 28], [1, t - 40]], 7, CHITIN.joint);
  ellipse(c, 1, t - 48, 10, 11, '#171319');
  ellipse(c, 1, t - 48, 8, 9, bone);
  rect(c, -3, t - 49, 3, 3, '#6fd6b0');
  rect(c, 4, t - 49, 3, 3, '#6fd6b0');
  for (let i = 0; i < 4; i++) rect(c, -4 + i * 3, t - 41, 2, 4, boneDark);
  // A crest of chitin where the hat was, grown straight through the crown.
  poly(c, [[-11, t - 54], [-3, t - 68], [3, t - 58], [9, t - 70], [13, t - 52], [1, t - 56]], CHITIN.dark);
  poly(c, [[-8, t - 55], [-2, t - 64], [2, t - 57], [7, t - 65], [10, t - 53]], CHITIN.lit);

  // The sword arm, still his, still swinging.
  const hx = 20 + raise * 10, hy = t - 6 - raise * 26;
  path(c, [[12, t - 20], [18, t - 14 - raise * 8], [hx, hy]], 5, '#171319');
  path(c, [[12, t - 19], [17, t - 14 - raise * 8], [hx - 1, hy]], 3, bone);
  c.save();
  c.translate(hx, hy);
  c.rotate(-.8 - raise * 1.4);
  poly(c, [[0, -3], [44, -12], [56, -4], [44, 4], [0, 4]], '#171319');
  poly(c, [[2, -2], [42, -10], [52, -4], [42, 2], [2, 2]], '#9aa7a0');
  c.restore();

  // The other arm ends in the gun. It did not pick it up; it came in with him.
  const gy = t - 8, gx = -20 - raise * 6;
  path(c, [[-12, t - 20], [-18, t - 12], [gx + 4, gy]], 6, '#171319');
  path(c, [[-12, t - 19], [-17, t - 12], [gx + 4, gy]], 4, CHITIN.shell);
  rect(c, gx - 22, gy - 7, 30, 13, '#1d1a20');
  rect(c, gx - 20, gy - 5, 26, 8, '#3f3a33');
  rect(c, gx - 26, gy - 9, 9, 17, '#2b3330');
  rect(c, gx - 25, gy - 7, 6, 13, '#6b5340');
  for (let i = 0; i < 3; i++) path(c, [[gx - 16 + i * 8, gy - 7], [gx - 16 + i * 8, gy + 6]], 1, CHITIN.joint);
  // Lit at the mouth while it is about to go off.
  if (raise > .5 && (b.state === 'cannonWind' || b.state === 'blunderbussWind' || b.state === 'bonesWind'))
    ellipse(c, gx - 28, gy, 4 + raise * 4, 4 + raise * 3, '#ffcf7a');
  c.restore();
}
