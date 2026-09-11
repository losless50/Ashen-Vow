import { game, player, progress } from './state.js';
import { updateCanopy, playReunion, FAMILY_CAMP } from '../world/grove.js';
import { entities } from '../systems/entities.js';
import { updatePlayer } from '../systems/player.js';
import { updateEnemies } from '../systems/enemies.js';
import { updateBoss } from '../systems/boss.js';
import { updateHerald } from '../systems/herald.js';
import { updateAttack } from '../systems/combat.js';
import { updateEffects } from '../systems/effects.js';
import { updateWorld } from '../world/world.js';
import { findNear } from '../world/interact.js';
import { syncHud, syncInteractPrompt, updateToast } from '../ui/hud.js';
import { draw } from '../render/renderer.js';

export function update(dt) {
  // On the title screen the world keeps animating behind the menu, but nothing
  // moves, fights or takes input.
  if (game.screen === 'title' || game.screen === 'intro') {
    game.time += dt;
    updateWorld(dt);
    updateEffects(dt);
    return;
  }
  updateCanopy(dt);
  if (!game.modal && !game.paused) game.time += dt;
  else game.mapTime = (game.mapTime || 0) + dt;
  updateToast(dt);
  if (game.modal || game.paused) { syncHud(); return; }

  updatePlayer(dt);
  if (game.scene === 'wild' || game.scene === 'room') {
    updateEnemies(dt);
    if (game.scene === 'wild') updateWorld(dt);
  } else if (entities.boss?.hp > 0) {
    updateBoss(dt);
  } else {
    updateHerald(dt);
  }
  updateAttack(dt);

  // Walking back into the firelight with them out is what starts the reunion.
  if (game.scene === 'wild' && game.region === 'echo' && progress.orrin === 2
      && Math.hypot(player.x - FAMILY_CAMP.x, player.y - FAMILY_CAMP.y) < 260) playReunion();

  game.near = findNear();
  syncInteractPrompt();
  updateEffects(dt);
  syncHud();
}

let last = 0;

export function frame(t) {
  const dt = Math.min(.035, (t - last) / 1000 || .016);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
