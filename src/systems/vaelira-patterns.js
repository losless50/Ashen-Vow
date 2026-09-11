// Shared by combat and floor telegraphs: distances are in unsquashed ground space.
export const GROUND_SCALE = .62;
export const WINDUP = { dash: .65, blink: .75, flurry: .7, lash: .85, grab: 1, backstep: .32, volley: .6, snipe: .48, ultimate: 1.3 };
export const KNIVES = { dashTime: .36, dashSpeed: 360, dashRadius: 26, dashDamage: 60, followup: .5, ring: 72, flurryTime: .5, cuts: [.12, .36], cutDamage: 41, arrival: .5 };
export const WHIP = { reach: 240, arc: 1.2, lashTime: .3, lashImpact: .12, lashDamage: 64, hookReach: 310, hookWidth: 21, hookTime: .36, holdTime: .55, throwSpeed: 620, wallDamage: 86, backstepSpeed: 300, backstepTime: .28 };

export function groundFrame(b, x, y) {
  const dx = x - b.x, dy = (y - b.y) / GROUND_SCALE;
  return { along: dx * b.dx + dy * b.dy, across: -dx * b.dy + dy * b.dx };
}

export function inWhipArc(b, x, y) {
  const f = groundFrame(b, x, y);
  return Math.hypot(f.along, f.across) < WHIP.reach && Math.abs(Math.atan2(f.across, f.along)) < WHIP.arc;
}

/** Distance from feet to the part of the dash actually travelled this frame. */
export function touchesDash(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = (y1 - y0) / GROUND_SCALE;
  const px = x - x0, py = (y - y0) / GROUND_SCALE;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - dx * t, py - dy * t) < KNIVES.dashRadius;
}
