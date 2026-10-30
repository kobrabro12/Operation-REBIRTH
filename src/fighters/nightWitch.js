// NIGHT WITCH: a WW2 night-bomber pilot - the fighter at the bottom of the shop's nesting dolls (code PAPERSPLEASE;
// shop item 'chr-witch': on the select screen once you own her). Named after the women's night-bomber regiment the
// enemy called the "night witches": they flew old wooden biplanes at night and cut their engines to glide in silently.
// Light and fast in the air; a big steel wrench for her normals; bombs, strafing runs and silent glides for specials.
// Data only. Art: tools/sprites/night_witch_draw.py + night_witch_moves.py (she plays ROSEMARY's animation set, so her
// frame index is LS_MOVES). Code: entities.js TankShell (her bombs), limitRaid.js (NIGHT RAID).
import { DEFAULT_GRAB } from './common.js';
import { LS_MOVES } from './lsMoves.js';

export const PAL_WITCH = { outline: 0x0a0e1c, deep: 0x1a2a5a, mid: 0x3a5aa0, light: 0xf2e6cc, core: 0xffffff, shade: 0x101626, void: 0x04060c };

export const NIGHT_WITCH = {
  id: 'night-witch',
  name: 'NIGHT WITCH',
  runCycle: [0, 8],
  movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 16, y: -38 },
  portrait: [16, 0, 36, 32],
  body: { w: 20, h: 50 },
  headTop: 54, tagY: 64,
  sheets: { idle: 'nw_idle', run: 'nw_run', jump: 'nw_jump', fall: 'nw_fall', moves: 'nw_moves' },
  moveAnims: LS_MOVES,
  fxColor: 0xf2e6cc,
  pal: PAL_WITCH,
  swingSfx: 'swing',
  hitSfx: 'clang',                  // the wrench rings
  weight: 0.92,
  walkSpeed: 3.5, runAccel: 0.72, groundFriction: 0.5,
  airSpeed: 3.5, airAccel: 0.34, airFriction: 0.035,     // a pilot: the best air control on the roster
  jumpV: -10.4, shortHopV: -7.0, doubleJumpV: -10.2,

  // TAUNT (1): pulls her goggles down and salutes
  taunt: { name: 'GOGGLES DOWN', frames: 84, lines: ['NIGHT RAID TONIGHT!', 'ENGINES OFF. WE GLIDE IN.', 'THE WITCHES ARE OUT.'], sounds: [[10, 'whoosh', 0.4, 1.2]] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- the wrench: quick, solid swings
    jab: { frames: 24, fx: 'jab', hits: [{ from: 4, to: 6, box: [8, -48, 34, 24], dmg: 4, angle: 40, base: 2.4, growth: 2.0 }] },
    ftilt: { frames: 28, fx: 'arc', hits: [{ from: 9, to: 12, box: [8, -52, 48, 32], dmg: 9, angle: 36, base: 3.2, growth: 5.4 }] },
    utilt: { frames: 26, fx: 'spin', hits: [{ from: 8, to: 14, box: [-26, -94, 52, 44], dmg: 8, angle: 88, base: 3.0, growth: 5.0 }] },
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.6 }] },
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 18, vx: 7.0 }, hits: [{ from: 5, to: 14, box: [4, -34, 42, 34], dmg: 9, angle: 60, base: 3.4, growth: 4.4 }] },
    fsmash: { frames: 46, lunge: 1.8, fx: 'thrust', hits: [{ from: 18, to: 21, box: [8, -46, 50, 30], dmg: 15, angle: 36, base: 4.4, growth: 7.0 }] },
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 20, box: [-32, -96, 64, 72], dmg: 14, angle: 86, base: 4.2, growth: 6.8 }] },
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 15, to: 19, box: [-54, -14, 108, 16], dmg: 13, angle: 30, base: 3.8, growth: 6.4 }] },
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-28, -58, 56, 52], dmg: 8, angle: 45, base: 2.8, growth: 4.0 }] },
    fair: { frames: 26, landLag: 9, fx: 'thrust', hits: [{ from: 8, to: 11, box: [6, -42, 44, 26], dmg: 10, angle: 40, base: 3.0, growth: 5.6 }] },
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-42, -44, 36, 28], dmg: 11, angle: 145, base: 3.2, growth: 5.8 }] },
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 6, to: 11, box: [-24, -94, 48, 42], dmg: 9, angle: 86, base: 3.0, growth: 5.2 }] },
    dair: { frames: 34, landLag: 14, fx: 'down', hits: [{ from: 10, to: 14, box: [-16, -12, 32, 26], dmg: 11, angle: -80, base: 3.0, growth: 4.2 }] },
    // ---- specials
    // BOMB TOSS (neutral): lobs a little bomb in a high arc - it blows up on whoever it hits, or where it lands
    neutralB: { frames: 30, spawnAt: 12, shell: { bomb: true, speed: 4.4, lift: -4.6, grav: 0.22, life: 120, radius: 30,
      hit: { dmg: 10, angle: 55, base: 3.6, growth: 4.2, radial: true } } },
    // STRAFE RUN (side): a long, low dive straight at them - once per jump
    sideB: { frames: 34, landLag: 10, dive: { from: 8, to: 22, vx: 7.6, vy: -1.6 },
      hits: [{ from: 8, to: 22, box: [-2, -48, 46, 38], dmg: 9, angle: 35, base: 3.6, growth: 4.6 }] },
    // CLIMB (up): pulls up hard, wrench first
    upb: { frames: 40, riseAt: 8, riseV: -15.2, pushX: 2.2, drift: 3.8, hits: [{ from: 8, to: 14, box: [-20, -62, 40, 62], dmg: 7, angle: 80, base: 3.2, growth: 3.6 }] },
    // ENGINES OFF (down): she goes silent - nothing touches her for a moment - then swoops out of nowhere with the wrench
    downB: { frames: 34, hide: { from: 3, to: 22 }, hits: [{ from: 23, to: 28, box: [-30, -52, 60, 54], dmg: 9, angle: 70, base: 3.8, growth: 4.4 }] },
  },

  // Limit: NIGHT RAID. She fires a flare, and a flight of old biplanes glides in low over the stage with their engines
  // off, each dropping its bombs on the way over (limitRaid.js). 3 planes x 4 bombs.
  limit: {
    name: 'NIGHT RAID', type: 'raid', frames: 200,
    planes: 3, every: 30, bombs: 4, speed: 4.6, height: -165,
    radius: 38, hit: { dmg: 7, angle: 70, base: 3.6, growth: 3.4, radial: true },
    colors: PAL_WITCH,
  },
};
