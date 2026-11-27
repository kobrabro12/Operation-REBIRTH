// Sprite Fusion's element effects (src/fx/sf/*.js - MIT, ported from Mason's downloads: fire, ice, lightning, poison,
// holy light, black hole, shield, energy, heal, power-up, sparkle, bubbles, slash) in a match. Each one was made for a
// world where 2 units = 1 effect pixel (their `PX = 2`), so `magic()` doubles every game coordinate it hands them
// (x / y / to / from / area / ground / box, plus any keys named in `world`) and the effect's pixels land 1:1 on the game's pixel grid, at the size Sprite
// Fusion drew them. Runs through sfRunner (sfSpawn / sfStep / sfClear) like the dash and blink.
import { sfSpawn, sfActor } from './sfRunner.js';
import fire from './sf/fire.js';
import ice from './sf/ice.js';
import lightning from './sf/lightning.js';
import poison from './sf/poison.js';
import holyLight from './sf/holy-light.js';
import blackHole from './sf/black-hole.js';
import shield from './sf/shield.js';
import energy from './sf/energy.js';
import heal from './sf/heal.js';
import powerUp from './sf/power-up.js';
import sparkle from './sf/sparkle.js';
import bubbles from './sf/bubbles.js';
import slash from './sf/slash.js';

export const MAGIC = { fire, ice, lightning, poison, holy: holyLight, hole: blackHole, shield, energy, heal, power: powerUp, sparkle, bubbles, slash };
const U = 2;                                                   // their world units per game pixel

/** An effect `actor` for fighter f in their units: feet, the hand (`handOffset`, aimed where he faces) and the pixels
 *  of his current frame. */
export function magicActor(f, aim) {
  const a = sfActor(f), H = f.def.handOffset || { x: 14, y: -34 };
  return {
    feet: () => [f.x * U, f.y * U],
    hand: () => ({ x: (f.x + H.x * f.facing) * U, y: (f.y + H.y) * U, a: aim ?? (f.facing > 0 ? 0 : Math.PI) }),
    silhouette: a.silhouette,
  };
}

/** The floor height under x for the effects that land on the ground (their units in, their units out): the highest
 *  platform under that x at or below `fromY` (game px), else `fromY`. */
export function magicGround(match, fromY) {
  return (wx) => {
    const x = wx / U; let best = null;
    for (const P of match.stage.platforms || []) if (x >= P.x1 && x <= P.x2 && P.y >= fromY - 4 && (best === null || P.y < best)) best = P.y;
    return (best ?? fromY) * U;
  };
}

/** Starts Sprite Fusion effect `kind` (a MAGIC key) with options `o` in GAME pixels; `box` = the world box it may draw
 *  in ({ x, y, w, h }, game px); `depth` over / under the fighters. Shake callbacks shake the match camera. Returns the
 *  running effect (or null). */
export function magic(match, kind, o, box, depth = 6) {
  const q = { ...o };
  for (const k of ['x', 'y']) if (typeof q[k] === 'number') q[k] *= U;
  for (const k of ['to', 'from']) if (Array.isArray(q[k])) q[k] = Array.isArray(q[k][0]) ? q[k].map(([x, y]) => [x * U, y * U]) : [q[k][0] * U, q[k][1] * U];
  if (q.area) q.area = { x: q.area.x * U, y: q.area.y * U, w: q.area.w * U, h: q.area.h * U };
  if (typeof q.ground === 'number') q.ground *= U;
  if (q.box) q.box = q.box.map((v) => v * U);
  for (const k of q.world || []) if (typeof q[k] === 'number') q[k] *= U;     // other lengths the effect measures in its world units
  if (!q.shake && match.shake) q.shake = (k) => { if (!match.demo) match.shake(Math.min(6, k * 6), 8); };
  let fx;
  try { fx = MAGIC[kind](q); } catch (err) { return null; }        // (an effect must never break a match)
  if (!fx) return null;
  const maxT = o.maxLife ?? 10, own = fx.done ? fx.done.bind(fx) : () => false, upd = fx.update.bind(fx); let age = 0;
  fx.update = (dt) => { age += dt; upd(dt); };
  fx.done = () => age > maxT || own();                               // (never left running: `maxLife` seconds at most)
  return sfSpawn(match, fx, box, depth);
}
