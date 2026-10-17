// AERO: a TEST FIGHTER made entirely out of the Frutiger Aero look - glossy glass and plastic, aqua sky,
// fresh grass green, bubbles, lens flares, and a goldfish in a fishbowl helmet (the goldfish is in charge).
// Data only. Art: tools/sprites/aero_draw.py; animation: tools/sprites/aero_moves.py.
import { DEFAULT_GRAB } from './common.js';
import { AERO_MOVES } from './aeroMoves.js';

export const PAL_AQUA = { outline: 0x0d3550, deep: 0x1a7fb0, mid: 0x3fc8ea, light: 0x9ff0ff, core: 0xffffff, shade: 0x0e4a6a, void: 0x04121c };

export const AERO = {
  id: 'aero',
  name: 'AERO',
  sheets: { idle: 'aero_idle', run: 'aero_run', jump: 'aero_jump', fall: 'aero_fall', moves: 'aero_moves' },
  runCycle: [0, 8],
  moveAnims: AERO_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -36 },   // in front of his gloves: where bubbles are blown from
  portrait: [16, 2, 36, 32],
  fxColor: 0x9ff0ff,
  swingSfx: 'swing',
  pal: PAL_AQUA,
  body: { w: 20, h: 50 },
  headTop: 54,
  tagY: 64,
  weight: 0.94,                     // light and floaty
  walkSpeed: 3.0, runAccel: 0.55, groundFriction: 0.45,
  airSpeed: 3.0, airAccel: 0.28, airFriction: 0.03,
  jumpV: -9.6, shortHopV: -6.4, doubleJumpV: -9.2,

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks
    jab: { frames: 20, fx: 'bubble', hits: [{ from: 4, to: 6, box: [8, -44, 32, 22], dmg: 4, angle: 40, base: 2.4, growth: 1.8 }] },                 // BUBBLE POP
    ftilt: { frames: 28, fx: 'aurora', hits: [{ from: 9, to: 13, box: [6, -58, 50, 46], dmg: 9, angle: 38, base: 3.0, growth: 6.0 }] },             // AURORA SWOOSH
    utilt: { frames: 24, fx: 'up', hits: [{ from: 7, to: 13, box: [-22, -94, 44, 44], dmg: 7, angle: 88, base: 3.2, growth: 5.4 }] },               // FOUNTAIN
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.6 }] },                 // GRASS SWEEP
    // ---- smash attacks
    fsmash: { frames: 46, lunge: 1.4, fx: 'flare', hits: [{ from: 18, to: 21, box: [8, -52, 52, 36], dmg: 15, angle: 36, base: 4.2, growth: 7.4 }] },   // LENS FLARE
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 20, box: [-30, -104, 60, 80], dmg: 14, angle: 88, base: 4.2, growth: 7.4 }] },          // GEYSER
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 15, to: 19, box: [-56, -14, 112, 16], dmg: 12, angle: 30, base: 3.8, growth: 6.8 }] },        // RIPPLE
    // ---- aerials
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-28, -58, 56, 54], dmg: 8, angle: 45, base: 2.8, growth: 4.2 }] },   // BUBBLE SPIN
    fair: { frames: 26, landLag: 8, fx: 'arc', hits: [{ from: 8, to: 12, box: [6, -50, 44, 40], dmg: 10, angle: 40, base: 3.0, growth: 6.0 }] },     // a raindrop chop
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-42, -42, 36, 26], dmg: 11, angle: 145, base: 3.2, growth: 6.2 }] },
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 6, to: 11, box: [-24, -94, 48, 42], dmg: 8, angle: 86, base: 3.0, growth: 5.6 }] },
    dair: { frames: 34, landLag: 13, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 11, angle: -80, base: 3.0, growth: 4.2 }] },  // RAINDROP: a spike
    // ---- specials
    // BUBBLE TRAP (neutral): blows a big bubble that drifts forward; whoever it touches is sealed inside
    // and floats up helplessly for a moment before it pops
    neutralB: { frames: 30, spawnAt: 12, bubble: { speed: 2.6, life: 110, r: 11, hit: { dmg: 4, angle: 90, base: 0.6, growth: 0, stun: 48, bubble: 48 } } },
    // GLASS WINDOW (side): a pane of glossy glass in front of him for 3 s - projectiles bounce back off it
    sideB: { frames: 32, spawnAt: 10, pane: { ahead: 26, h: 56, life: 180 },
      hits: [{ from: 10, to: 13, box: [12, -54, 20, 54], dmg: 5, angle: 40, base: 3.0, growth: 2.4 }] },
    // BUBBLE RIDE (up): floats upward inside a bubble, steering freely, until it pops around him
    upb: { frames: 40, riseAt: 6, riseV: -9.6, drift: 3.2, bubble: true, popAt: 30, hits: [
      { from: 8, to: 9, box: [-24, -48, 48, 52], dmg: 2, angle: 85, base: 1.6, growth: 0, stun: 8 },
      { from: 16, to: 17, box: [-24, -48, 48, 52], dmg: 2, angle: 85, base: 1.6, growth: 0, stun: 8 },
      { from: 30, to: 32, box: [-30, -54, 60, 62], dmg: 6, angle: 75, base: 3.6, growth: 4.8 },
    ] },
    // LEAF SPRING (down): plants a glossy sprout. AERO bounces sky-high off it (and gets his up special
    // back); anyone else who steps on it is launched up. One at a time; it lasts 10 s.
    downB: { frames: 32, spawnAt: 12, spring: { ahead: 22, life: 600, bounce: -13, hit: { dmg: 5, angle: 88, base: 6.4, growth: 1.0 } } },
  },

  // Limit: SCREENSAVER. He spreads his arms and the whole screen goes glossy - aqua light, ribbons,
  // goldfish swimming through the sky - as a fan of giant bubbles drifts out both ways. Anyone caught is
  // sealed in and carried up into the sky, then every caught bubble pops at once in a lens flare.
  // The bubbles are slow: dodge them, jump over them, or airdodge through.
  limit: {
    name: 'SCREENSAVER', type: 'screensaver', reach: 300, frames: 120, releaseAt: 40, popAt: 100,
    count: 4, spread: 54, speed: 3.6, life: 70, topY: -150,
    trap: { dmg: 5, angle: 90, base: 0, growth: 0, stun: 999 },
    pop: { dmg: 18, angle: 80, base: 5.2, growth: 5.8 },
    colors: PAL_AQUA,
  },
};
