// Every fighter slot shown on the fighter select screen, in grid order.
// Locked entries are placeholders for fighters still being made.
import { SOUL_SUMMONER } from './soulSummoner.js';
import { MR_WAKE } from './mrWake.js';
import { HERO_KNIGHT } from './heroKnight.js';
import { skinTexture, skinInfo } from './skins.js';

export const ROSTER = [
  { id: 'soul-summoner', name: 'SOUL SUMMONER', def: SOUL_SUMMONER, available: true },
  { id: 'mr-wake', name: 'MR WAKE', def: MR_WAKE, available: true },
  { id: 'hero-knight', name: 'LACY', def: HERO_KNIGHT, available: true },
];

export const GRID_SLOTS = 12;          // tiles on the select grid; empty ones show as "???"

// Show a fighter's idle sprite on a menu: right texture, origin and facing (all face right on menus).
export function showFighter(sprite, def, frame = 0, skin = 0) {
  let key = skinTexture(sprite.scene, def.sheets.idle, def.id, skin);
  const set = skinInfo(def.id, skin).sheetSet;
  if (set && def.costumeSheets && def.costumeSheets[set]) key = def.costumeSheets[set].idle;
  if (skinInfo(def.id, skin).worn && def.wornSheets) key = def.wornSheets[Math.floor(sprite.scene.time.now / 1200) % 4].idle;   // preview every damage stage
  frame %= (def.frameCounts && def.frameCounts.idle) || 32;     // idle strips differ in length
  if (sprite.texture.key !== key) sprite.setTexture(key, frame); else sprite.setFrame(frame);
  sprite.setOrigin(def.originX ?? 0.5, def.originY).setFlipX(!!def.facesLeft);
  return sprite;
}

export function fighterById(id) {
  const avail = ROSTER.filter((f) => f.available);
  if (id === 'random' || !id) return avail[Math.floor(Math.random() * avail.length)];
  return ROSTER.find((f) => f.id === id && f.available) || avail[0];
}
