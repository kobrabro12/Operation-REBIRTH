// Every fighter slot shown on the fighter select screen, in grid order.
// Locked entries are placeholders for fighters still being made.
import { SOUL_SUMMONER } from './soulSummoner.js';
import { MR_WAKE } from './mrWake.js';
import { HERO_KNIGHT } from './heroKnight.js';
import { NU } from './nu.js';
import { AERO } from './aero.js';
import { LAST_SEEN } from './lastSeen.js';
import { WHAT_ONCE_WAS } from './whatOnceWas.js';
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
      + 'ON BEAT: ATTACK AS THE RING HITS HIS FEET FOR\n+25% DAMAGE. CHAIN THEM FOR A STREAK - 3+ = HYPED\n\n'
      + 'K      POWER CHORD - HOLD TO CHARGE\nSIDE K MIC TOSS - OUT ON ITS CORD AND BACK\nUP K   CROWD SURF - THE CROWD LIFTS HIM\n'
      + 'DOWN K AMP DROP - FALLS: 25% IF IT LANDS ON\n       THEM! THEN THUMPS ON THE BEAT (15 S)\n\nLIMIT  WALL OF SOUND - 50% IF THE FIRST\n       RING CATCHES THEM\n1      TAUNT: HEADBANG' },
  { id: 'aero', name: 'AERO', def: AERO, tag: 'PROTOTYPE 02',
    notes: 'GLOSSY GLASS, AQUA SKIES, BUBBLES AND\nA GOLDFISH IN A FISHBOWL. LIGHT AND FLOATY.\n\n'
      + 'JAB  BUBBLE POP      FTILT  AURORA SWOOSH\nFSMASH  LENS FLARE    USMASH  GEYSER\nDSMASH  RIPPLE        DAIR  RAINDROP\n\n'
      + 'K      BUBBLE TRAP - SEALS THEM IN A BUBBLE\nSIDE K GOLDFISH FLING - OUT AND BACK\nUP K   BUBBLE RIDE - FLOAT UP AND POP\n'
      + 'DOWN K DESKTOP - STAY NEAR IT: POWERED UP\n\nLIMIT  SCREENSAVER - OR WITH 2 PCS OUT:\n       FULL AERO! (UNTIL KO\'D: GOLDEN SPEAR,\n       EVERYTHING UPGRADED)\n1      TAUNT: FISHBOWL BOOGIE' },
  { id: 'what-once-was', name: 'WHAT ONCE WAS', def: WHAT_ONCE_WAS, tag: 'PROTOTYPE 03',
    notes: 'LOST IN THE BACKROOMS SO LONG IT BECAME PART\nOF THEM. ITS HEAD IS AN OLD TV.\n\n'
      + 'JAB  SCREEN BASH     FTILT  LONG REACH\nFSMASH  CRT BLAST     USMASH  ANTENNA SURGE\nDSMASH  DEAD SIGNAL   DAIR  POWER CORD\n\n'
      + 'K      MISSING POSTER  SIDE K CHANNEL SURF\nUP K   OUT OF BODY     DOWN K WRONG DOOR\n\n'
      + 'FULL SIGNAL METER: IT TRANSFORMS AT RANDOM\nUNTIL KO - SEE (+20% DMG, NECK SNAP GRAB),\nINCOMING (+20% SPEED, TACKLE AND FURY),\nSMILE (HEALS, TELEPORT + CORD SHOCK)\n\n'
      + 'LIMIT  LEVEL 0 - THE BACTERIA HUNTS THEM' },
  { id: 'last-seen', name: 'LAST SEEN', def: LAST_SEEN, tag: 'PROTOTYPE 04',
    notes: 'SHE WENT MISSING. SOMETHING CAME BACK.\nSTARTS FRAIL: LIGHT, WEAK, EASY TO LAUNCH.\n\n'
      + 'SIGHTINGS (THE EYES OVER HER HEAD) FILL AS SHE\nDEALS AND TAKES DAMAGE. ALL OPEN: SHE TURNS\nINTO SEEN UNTIL KO - HEAVY, FAST, BRUTAL.\n\n'
      + 'K      FLYER / HEAVY SWING (HOLD, CHARGE)\nSIDE K PLEASE HELP ME (CLING ON) / LUNGE (FLURRY)\nUP K   JUMP / CLIMB\nDOWN K HIDE / SCREAM\n\n'
      + 'LIMIT  I SEE IT TOO - TURN NOW\n       THE BIRTHDAY SHOW (AS SEEN) - 52%' },
];

export const GRID_SLOTS = 12;          // tiles on the select grid; empty ones show as "???"

// Show a fighter's idle sprite on a menu: right texture, origin and facing (all face right on menus).
export function showFighter(sprite, def, frame = 0, skin = 0) {
  let key = skinTexture(sprite.scene, def.sheets.idle, def.id, skin);
  const set = skinInfo(def.id, skin).sheetSet;
  if (set && def.costumeSheets && def.costumeSheets[set]) key = def.costumeSheets[set].idle;
  if (def.menuSheets) key = set ? def.menuSheets[set] : skinTexture(sprite.scene, def.menuSheets.default, def.id, skin);   // headless sheets: show the one with the head
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
