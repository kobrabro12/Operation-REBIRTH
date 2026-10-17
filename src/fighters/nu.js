// NU: a nu-metal frontman, still in the lab (Trinkets > TEST FIGHTERS). Data only - stats, sprite sheets
// and every move's hitboxes. Boxes are [x, y, w, h] from his feet while facing right (negative y = up).
// Art and animation: tools/sprites/nu_draw.py (the drawing) and tools/sprites/nu_moves.py (the moves).
import { DEFAULT_GRAB } from './common.js';
import { NU_MOVES } from './nuMoves.js';

// his ability colours: acid green on black
export const PAL_ACID = { outline: 0x14101c, deep: 0x3a6a0a, mid: 0x6fbf1a, light: 0x9be32a, core: 0xe8ffb0, shade: 0x1c2a10, void: 0x0a0e06 };

export const NU = {
  id: 'nu',
  name: 'NU',
  sheets: { idle: 'nu_idle', run: 'nu_run', jump: 'nu_jump', fall: 'nu_fall', moves: 'nu_moves' },
  runCycle: [0, 8],
  moveAnims: NU_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,                 // feet on row 58 of the 64x64 frame
  handOffset: { x: 13, y: -42 },    // the mic: where his sound waves come out
  portrait: [16, 0, 36, 32],
  fxColor: 0x9be32a,
  swingSfx: 'swing',
  pal: PAL_ACID,
  body: { w: 22, h: 50 },
  headTop: 54,
  tagY: 64,
  weight: 0.98,
  walkSpeed: 3.2, runAccel: 0.6, groundFriction: 0.55,
  airSpeed: 2.8, airAccel: 0.25, airFriction: 0.04,
  jumpV: -9.4, shortHopV: -6.4, doubleJumpV: -8.8,

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks
    // RAP BARRAGE: four quick verses spat into the mic, then a shove of sound
    jab: { frames: 26, multi: true, fx: 'jab', hits: [
      { from: 3, to: 4, box: [8, -52, 34, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 8, to: 9, box: [8, -52, 34, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 13, to: 14, box: [8, -52, 34, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 18, to: 21, box: [8, -54, 40, 32], dmg: 4, angle: 40, base: 2.8, growth: 2.6 },
    ] },
    // MIC SWING: the mic whipped out on its cable - long reach
    ftilt: { frames: 30, fx: 'arc', hits: [{ from: 9, to: 13, box: [10, -52, 52, 34], dmg: 9, angle: 36, base: 3.0, growth: 6.0 }] },
    utilt: { frames: 26, fx: 'spin', hits: [{ from: 6, to: 13, box: [-26, -92, 52, 40], dmg: 7, angle: 88, base: 3.0, growth: 5.6 }] },
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.8 }] },
    // ---- smash attacks
    // KICK: a huge front kick
    fsmash: { frames: 46, lunge: 2.0, fx: 'thrust', hits: [{ from: 17, to: 20, box: [8, -44, 46, 28], dmg: 16, angle: 36, base: 4.2, growth: 7.4 }] },
    // BREAKDOWN: arms flung wide, a roar of sound straight up
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 20, box: [-34, -96, 68, 72], dmg: 14, angle: 86, base: 4.2, growth: 7.4 }] },
    // GROUND POUND: punches the floor; the shockwave runs both ways
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 15, to: 19, box: [-56, -14, 112, 16], dmg: 13, angle: 30, base: 3.8, growth: 6.8 }] },
    // ---- aerials
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-28, -58, 56, 54], dmg: 7, angle: 45, base: 2.8, growth: 4.0 }] },
    fair: { frames: 26, landLag: 9, fx: 'thrust', hits: [{ from: 8, to: 11, box: [6, -40, 42, 26], dmg: 11, angle: 40, base: 3.0, growth: 6.2 }] },
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-42, -42, 36, 26], dmg: 12, angle: 145, base: 3.2, growth: 6.4 }] },
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 6, to: 11, box: [-24, -94, 48, 42], dmg: 8, angle: 86, base: 3.0, growth: 5.8 }] },
    // STAGE DIVE (DOWN): curls up, then stomps straight down with both feet - a spike
    dair: { frames: 34, landLag: 14, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 12, angle: -80, base: 3.0, growth: 4.4 }] },
    // ---- specials
    // CROWD CALL (neutral): screams into the mic - a wall of sound rolls forward. In RAGE MODE it hits harder.
    neutralB: { frames: 30, spawnAt: 12, wave: {
      speed: 3.6, life: 60, h0: 26, h1: 46,
      hit: { dmg: 7, angle: 35, base: 2.6, growth: 3.4 },
      rageHit: { dmg: 9, angle: 35, base: 3.2, growth: 4.6 },
    } },
    // STAGE DIVE (side): a flat-out dive forward that carries him a long way - once per jump
    sideB: { frames: 34, landLag: 10, fx: 'thrust', dive: { from: 9, to: 22, vx: 7.4, vy: -2.6 },
      hits: [{ from: 9, to: 20, box: [-4, -44, 46, 34], dmg: 10, angle: 40, base: 3.4, growth: 5.6 }] },
    // CROWD SURF (up): a sea of hands carries him up; the hands slap anyone underneath
    upb: { frames: 40, riseAt: 8, riseV: -11.2, pushX: 1.6, drift: 2.4, crowd: true, hits: [
      { from: 8, to: 10, box: [-24, -10, 48, 26], dmg: 3, angle: 85, base: 2.0, growth: 0, stun: 10 },
      { from: 14, to: 16, box: [-24, -10, 48, 26], dmg: 3, angle: 85, base: 2.0, growth: 0, stun: 10 },
      { from: 20, to: 23, box: [-28, -50, 56, 56], dmg: 5, angle: 70, base: 3.4, growth: 4.6 },
    ] },
    // GRAFFITI TAG (down): sprays his tag on the floor in front of him. Standing on it puts him in
    // RAGE MODE: his hits deal 20% more. One tag at a time; it lasts 7 seconds.
    downB: { frames: 34, spawnAt: 14, tag: { ahead: 26, width: 80, life: 420 },
      hits: [{ from: 12, to: 18, box: [8, -22, 34, 22], dmg: 3, angle: 30, base: 1.6, growth: 1.2 }] },
  },

  // Limit: MOSH PIT. He raises the mic... and drops it. The shockwave races along the floor both ways;
  // anyone standing on it is thrown up and a pyro column erupts under them (jump the wave to dodge it),
  // while pyro keeps going off across the stage and the crowd goes wild. 8 + 16 = 24% to a victim,
  // plus any pyro they walk into - and the blast launches hard.
  limit: {
    name: 'MOSH PIT', type: 'mosh', reach: 320, frames: 120, dropAt: 44,
    waveSpeed: 9, waveReach: 340, pyroDelay: 16, pyroEvery: 7, pyroFor: 60,
    wave: { dmg: 8, angle: 88, base: 5.0, growth: 0, stun: 30 },
    blast: { dmg: 16, angle: 80, base: 5.4, growth: 6.0 },
    pyro: { dmg: 6, angle: 85, base: 4.0, growth: 3.0 },
    colors: PAL_ACID,
  },
};
