// The two rooms off Echo Grove, painted at the boss arena's size.
import { W, H, game, player } from '../core/state.js';
import { entities } from '../systems/entities.js';
import { drawBlood } from '../systems/effects.js';
import { rect, ellipse, poly, path, label } from './primitives.js';
import { human, drawCreature } from './actors.js';
import { mushroom, drawHazards, drawLostEmbers } from './scenes.js';
import { TRAPDOOR, trapdoorReady } from '../world/grove.js';

/**
 * The hatch the nest was sitting on: grey swollen boards and an iron ring, with
 * a bar across it that was put there from this side.
 */
function trapdoor(c) {
  const { x, y } = TRAPDOOR;
  ellipse(c, x, y + 4, 34, 16, '#00000066');
  poly(c, [[x - 30, y], [x + 30, y], [x + 24, y + 15], [x - 24, y + 15]], '#3a2f26');
  poly(c, [[x - 27, y + 1], [x + 27, y + 1], [x + 22, y + 13], [x - 22, y + 13]], '#6b5a45');
  for (const dx of [-13, 0, 13]) path(c, [[x + dx, y + 1], [x + dx * .82, y + 13]], 1, '#4a3c2e');
  // The bar, and the ring you lift it by.
  rect(c, x - 26, y + 5, 52, 4, '#4a3826');
  rect(c, x - 26, y + 5, 52, 1, '#7a6446');
  c.strokeStyle = '#2a2320'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(x + 16, y + 8, 5, 3, 0, 0, Math.PI * 2); c.stroke();
  // A little light leaking up out of it, so it reads as a way down.
  c.globalAlpha = .25 + Math.sin(game.time * 2) * .06;
  ellipse(c, x, y + 7, 20, 7, '#f6d183');
  c.globalAlpha = 1;
  label(c, x, y - 14, 'A HATCH, BARRED', '#f0dfae', 8);
}

/** Inside the great mushroom: a spongy pale floor, ribbed walls, gills for a ceiling, the nest at the back. */
function sporehouse(c) {
  rect(c, 0, 0, W, H, '#120c16');
  ellipse(c, 750, 553, 300, 280, '#3a2a44');
  ellipse(c, 750, 553, 280, 262, '#5a4468');
  ellipse(c, 750, 560, 250, 232, '#c9b9a6');
  ellipse(c, 750, 560, 235, 218, '#ddd0bc');
  // Gill lines radiating from the centre, and the ribbed wall ring.
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; path(c, [[750 + Math.cos(a) * 40, 560 + Math.sin(a) * 36], [750 + Math.cos(a) * 232, 560 + Math.sin(a) * 214]], 1, '#b8a892'); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; poly(c, [[750 + Math.cos(a) * 240, 560 + Math.sin(a) * 222], [750 + Math.cos(a + .06) * 292, 553 + Math.sin(a + .06) * 272], [750 + Math.cos(a + .13) * 292, 553 + Math.sin(a + .13) * 272], [750 + Math.cos(a + .19) * 240, 560 + Math.sin(a + .19) * 222]], i % 2 ? '#6c5580' : '#4d3a5c'); }
  // Small cap-lamps set into the wall, and bone middens against it.
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mushroom(c, { x: 750 + Math.cos(a) * 262, y: 553 + Math.sin(a) * 246 + 10, color: ['#b48ad0', '#f2a54b', '#6fd6b0'][i % 3], s: .9, phase: i }); }
  for (const [x, y] of [[560, 640], [930, 420], [600, 400]]) { for (let i = 0; i < 8; i++) rect(c, x + (i * 7) % 30, y + (i * 5) % 14, 4 + (i % 3), 2, i % 3 ? '#e8e2d0' : '#b9b39c'); rect(c, x + 8, y - 6, 6, 5, '#e8e2d0'); }
  // The nest: a bowl of gill-fibre where she sits.
  ellipse(c, 750, 400, 90, 40, '#8a6f9a'); ellipse(c, 750, 400, 72, 30, '#b399c4'); ellipse(c, 750, 404, 50, 18, '#5a4468');
  // Spore dust drifting.
  for (let i = 0; i < 30; i++) { const x = 520 + (i * 53 + game.time * (4 + i % 3)) % 460, y = 300 + (i * 37 + Math.sin(game.time + i) * 12) % 520; c.globalAlpha = .4 + .3 * Math.sin(game.time * 2 + i); rect(c, x, y, 2, 2, i % 2 ? '#e2c4ff' : '#fff2c4'); }
  c.globalAlpha = 1;
  // The hatch and the ladder down.
  rect(c, 712, 812, 76, 40, '#2a1f30'); rect(c, 716, 816, 68, 32, '#0c0a12');
  for (let i = 0; i < 4; i++) rect(c, 736, 818 + i * 7, 28, 2, '#8a6f4d');
  label(c, 750, 873, '↧ THE BOG', '#e2c4ff', 10);
}

/** The burrow: brown earth and root, mushrooms everywhere, the warren where Mycel dens. */
function burrow(c) {
  rect(c, 0, 0, W, H, '#0a0806');
  for (let y = 240; y < 900; y += 26) for (let x = 445; x < 1065; x += 34) rect(c, x + (y % 52 ? 17 : 0), y, 32, 24, (x + y) % 3 ? '#1c130c' : '#241a12');
  ellipse(c, 750, 553, 205, 185, '#2a1c12');
  ellipse(c, 750, 553, 190, 171, '#33241a');
  for (let i = 0; i < 60; i++) rect(c, 570 + (i * 71) % 360, 400 + (i * 43) % 300, 3 + (i % 4), 2, i % 2 ? '#3d2c1c' : '#221810');
  // Roots through the ceiling and walls.
  for (const side of [440, 1060]) for (let i = 0; i < 8; i++) { const y = 280 + i * 74, x = side + Math.sin(i * 7) * 8; path(c, [[x, y - 30], [x + (side < 750 ? 30 : -30), y], [x + (side < 750 ? 20 : -20), y + 40]], 5, '#1a1008'); path(c, [[x, y - 30], [x + (side < 750 ? 30 : -30), y], [x + (side < 750 ? 20 : -20), y + 40]], 2, '#3d2c1c'); }
  for (let i = 0; i < 12; i++) { const x = 480 + i * 50; path(c, [[x, 236], [x + 8, 290 + (i % 3) * 20], [x + 2, 330 + (i % 2) * 30]], 4, '#1a1008'); }
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; mushroom(c, { x: 750 + Math.cos(a) * 200, y: 553 + Math.sin(a) * 182 + 8, color: ['#6fd6b0', '#6fd6b0', '#b48ad0'][i % 3], s: .8 + (i % 3) * .25, phase: i }); }
  for (const [x, y] of [[640, 640], [870, 470], [700, 430]]) for (let i = 0; i < 6; i++) rect(c, x + (i * 9) % 26, y + (i * 5) % 12, 5, 2, i % 2 ? '#d8d2ba' : '#8a8478');
  // The way out, up the root-stair.
  rect(c, 712, 827, 76, 26, '#3d2c1c');
  label(c, 750, 873, '↥ THE HOLLOW', '#bfe8c4', 10);
}

const PAINTERS = { sporehouse, burrow };

export function drawRoom(c) {
  PAINTERS[game.room]?.(c);
  drawBlood(c);
  drawHazards(c);
  drawLostEmbers(c);
  if (trapdoorReady()) trapdoor(c);
  const sprites = [
    ...entities.enemies.filter(e => e.hp > 0).map(e => ({ y: e.y, draw: () => drawCreature(c, e) })),
    { y: player.y, draw: () => human(c, player.x, player.y) },
  ].sort((a, b) => a.y - b.y);
  for (const s of sprites) s.draw();
}
