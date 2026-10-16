// Global constants for Operation REBIRTH. All physics values are in pixels per frame at 60 frames per second.
export const VIEW_W = 640;
export const VIEW_H = 360;
export const STEP_MS = 1000 / 60;

export const FONT = '"Press Start 2P", monospace';

// One colour per player slot (HUD, name tags, indicators).
export const PLAYER_COLORS = [0xff5a5a, 0x4fa8ff, 0xffd34f, 0x5ee07a];
export const PLAYER_CSS = ['#ff5a5a', '#4fa8ff', '#ffd34f', '#5ee07a'];
// Sprite tints per slot. Plain white: copies of a fighter are told apart by their colour variation (skins.js).
export const PLAYER_TINTS = [0xffffff, 0xffffff, 0xffffff, 0xffffff];

export const PHYS = {
  gravity: 0.42,
  maxFall: 6.5,
  fastFall: 9.5,
  hitstunGravity: 0.35,   // fraction of gravity while flying from a hit
  launchDecay: 0.075,     // launch speed lost per frame
  hitstunPerKb: 4,        // hitstun frames per unit of knockback
  tumbleKb: 6,            // knockback above this sends the target tumbling
};

// Blast zones: crossing these lines is a KO.
export const BLAST = { left: -600, right: 600, top: -380, bottom: 320 };

export const LIMIT_MAX = 100;   // a fighter's Limit unlocks after taking 100% damage

export const DIFFICULTY = [
  { name: 'EASY', react: 26, aggression: 0.35, shieldChance: 0.08, accuracy: 0.6, mash: 0.08 },
  { name: 'MEDIUM', react: 14, aggression: 0.6, shieldChance: 0.22, accuracy: 0.8, mash: 0.18 },
  { name: 'HARD', react: 6, aggression: 0.85, shieldChance: 0.4, accuracy: 0.95, mash: 0.32 },
];
