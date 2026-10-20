// Every fighter slot shown on the fighter select screen, in grid order.
// Locked entries are placeholders for fighters still being made.
import { SOUL_SUMMONER } from './soulSummoner.js';
import { MR_WAKE } from './mrWake.js';
import { HERO_KNIGHT } from './heroKnight.js';
import { NU } from './nu.js';
import { AERO } from './aero.js';
import { skinTexture, skinInfo } from './skins.js';

export const ROSTER = [
  { id: 'soul-summoner', name: 'SOUL SUMMONER', def: SOUL_SUMMONER, available: true },
  { id: 'mr-wake', name: 'MR WAKE', def: MR_WAKE, available: true },
  { id: 'hero-knight', name: 'LACY', def: HERO_KNIGHT, available: true },
];

// TEST FIGHTERS (Trinkets > TEST FIGHTERS): experimental fighters people can try in training or against a
// CPU before they join the real roster. They never appear on the fighter select screen or as RANDOM.
export const TEST_ROSTER = [
  { id: 'nu', name: 'NU', def: NU, tag: 'PROTOTYPE 01',
    notes: 'A NU-METAL FRONTMAN WHO TURNS EVERY FIGHT INTO A SHOW.\n\n'
      + 'JAB  RAP BARRAGE      FTILT  MIC SWING\nFSMASH  KICK           USMASH  BREAKDOWN\nDSMASH  GROUND POUND   DAIR  STAGE DIVE\n\n'
      + 'K      CROWD CALL - A WALL OF SOUND\nSIDE K STAGE DIVE - A LONG FLYING DIVE\nUP K   CROWD SURF - THE CROWD LIFTS HIM\n'
      + 'DOWN K GRAFFITI TAG - STAND ON IT FOR\n       RAGE MODE (+20% DAMAGE)\n\nLIMIT  MOSH PIT - JUMP THE SHOCKWAVE!\n1      TAUNT: HEADBANG' },
  { id: 'aero', name: 'AERO', def: AERO, tag: 'PROTOTYPE 02',
    notes: 'GLOSSY GLASS, AQUA SKIES, BUBBLES AND\nA GOLDFISH IN A FISHBOWL. LIGHT AND FLOATY.\n\n'
      + 'JAB  BUBBLE POP      FTILT  AURORA SWOOSH\nFSMASH  LENS FLARE    USMASH  GEYSER\nDSMASH  RIPPLE        DAIR  RAINDROP\n\n'
      + 'K      BUBBLE TRAP - SEALS THEM IN A BUBBLE\nSIDE K GOLDFISH FLING - OUT AND BACK\nUP K   BUBBLE RIDE - FLOAT UP AND POP\n'
      + 'DOWN K RAIN CLOUD - AGAIN: DOWNPOUR!\n\nLIMIT  SCREENSAVER - DODGE THE BUBBLES!\n1      TAUNT: FISHBOWL BOOGIE' },
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
  return ROSTER.find((f) => f.id === id && f.available) || TEST_ROSTER.find((f) => f.id === id) || avail[0];
}
