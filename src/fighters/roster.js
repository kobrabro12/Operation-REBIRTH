// Every fighter slot shown on the fighter select screen, in grid order.
// Locked entries are placeholders for fighters still being made.
import { SOUL_SUMMONER } from './soulSummoner.js';
import { MR_WAKE } from './mrWake.js';

export const ROSTER = [
  { id: 'soul-summoner', name: 'SOUL SUMMONER', def: SOUL_SUMMONER, available: true },
  { id: 'mr-wake', name: 'MR WAKE', def: MR_WAKE, available: true },
];

export const GRID_SLOTS = 12;          // tiles on the select grid; empty ones show as "???"

// Show a fighter's idle sprite on a menu: right texture, origin and facing (all face right on menus).
export function showFighter(sprite, def, frame = 0) {
  if (sprite.texture.key !== def.sheets.idle) sprite.setTexture(def.sheets.idle, frame); else sprite.setFrame(frame);
  sprite.setOrigin(def.originX ?? 0.5, def.originY).setFlipX(!!def.facesLeft);
  return sprite;
}

export function fighterById(id) {
  const avail = ROSTER.filter((f) => f.available);
  if (id === 'random' || !id) return avail[Math.floor(Math.random() * avail.length)];
  return ROSTER.find((f) => f.id === id && f.available) || avail[0];
}
