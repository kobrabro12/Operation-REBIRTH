// DEAD AIR: a TEST FIGHTER out of analog horror and found-footage ARGs - the thing that lives in the gap between
// broadcasts. Too tall, too thin, a grey presenter's suit, a smile far too wide. Everything it does looks like a
// damaged tape: colour bleed, tracking lines, static. Data only.
// Art: tools/sprites/dead_air_draw.py; animation: tools/sprites/dead_air_moves.py. Its code: fighterDeadAir.js.
import { DEFAULT_GRAB } from './common.js';
import { DA_MOVES } from './daMoves.js';

export const PAL_TAPE = { outline: 0x0a0a0e, deep: 0x3e3e46, mid: 0x8a8a90, light: 0xdcd8d0, core: 0xffffff, shade: 0x1e1c22, void: 0x050507 };

export const DEAD_AIR = {
  id: 'dead-air',
  name: 'DEAD AIR',
  sheets: { idle: 'da_idle', run: 'da_run', jump: 'da_jump', fall: 'da_fall', moves: 'da_moves' },
  runCycle: [0, 8],
  moveAnims: DA_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 16, y: -36 },    // its long white hand: where the alert goes out from
  portrait: [16, 0, 36, 32],
  fxColor: 0xdcd8d0,
  swingSfx: 'swing',
  pal: PAL_TAPE,
  body: { w: 20, h: 52 },
  headTop: 56,
  tagY: 66,
  vhs: true,                        // drawn like a damaged tape: colour bleed and tracking lines (fighterDeadAir.js)
  weight: 0.96,
  walkSpeed: 2.9, runAccel: 0.55, groundFriction: 0.5,
  airSpeed: 2.8, airAccel: 0.25, airFriction: 0.04,
  jumpV: -9.4, shortHopV: -6.2, doubleJumpV: -9.0,

  // TAUNT (1): its head turns all the way round, slowly, and snaps back
  taunt: { name: 'TURN AROUND', frames: 84, lines: ['TURN AROUND.', 'WE ARE STILL ON AIR.', 'PLEASE STAND BY.'],
    sounds: [[2, 'buzz', 0.3, 0.6], [50, 'glitch', 0.6, 0.6], [54, 'glitch', 0.4, 1.4]] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks (its long limbs: a bit more reach than most)
    jab: { frames: 30, multi: true, fx: 'jab', rapid: { at: 18, to: 4, max: 3 }, hits: [
      { from: 4, to: 5, box: [8, -52, 38, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 8, to: 9, box: [8, -52, 38, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 12, to: 13, box: [8, -52, 38, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 16, to: 17, box: [8, -52, 38, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 22, to: 24, box: [8, -56, 44, 34], dmg: 4, angle: 40, base: 3.0, growth: 2.8 },
    ] },
    // REACH: an arm that keeps going further than an arm should
    ftilt: { frames: 30, fx: 'arc', hits: [{ from: 10, to: 14, box: [10, -52, 60, 34], dmg: 9, angle: 36, base: 3.0, growth: 6.0 }] },
    utilt: { frames: 26, multi: true, fx: 'spin', hits: [
      { from: 6, to: 7, box: [-26, -96, 52, 40], dmg: 2, angle: 90, base: 1.2, growth: 0, stun: 10 },
      { from: 10, to: 11, box: [-26, -96, 52, 40], dmg: 2, angle: 90, base: 1.2, growth: 0, stun: 10 },
      { from: 14, to: 17, box: [-28, -100, 56, 44], dmg: 4, angle: 88, base: 3.0, growth: 5.4 },
    ] },
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 46, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.8 }] },
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 20, vx: 7.2, dust: 0xdcd8d0 }, hits: [
      { from: 5, to: 9, box: [4, -34, 40, 34], dmg: 9, angle: 72, base: 3.2, growth: 4.6 },
      { from: 10, to: 18, box: [4, -30, 36, 30], dmg: 5, angle: 60, base: 2.4, growth: 3.0 },
    ] },
    // ---- smash attacks
    fsmash: { frames: 46, lunge: 2.0, fx: 'thrust', hits: [{ from: 18, to: 21, box: [8, -44, 50, 28], dmg: 16, angle: 36, base: 4.2, growth: 7.4 }] },
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 20, box: [-34, -100, 68, 76], dmg: 14, angle: 86, base: 4.2, growth: 7.4 }] },
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 15, to: 19, box: [-58, -14, 116, 16], dmg: 13, angle: 30, base: 3.8, growth: 6.8 }] },
    // ---- aerials
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-28, -58, 56, 54], dmg: 7, angle: 45, base: 2.8, growth: 4.0 }] },
    fair: { frames: 26, landLag: 9, fx: 'thrust', hits: [{ from: 8, to: 11, box: [6, -40, 46, 26], dmg: 11, angle: 40, base: 3.0, growth: 6.2 }] },
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-46, -42, 40, 26], dmg: 12, angle: 145, base: 3.2, growth: 6.4 }] },
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 6, to: 11, box: [-24, -96, 48, 42], dmg: 8, angle: 86, base: 3.0, growth: 5.8 }] },
    dair: { frames: 34, landLag: 14, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 12, angle: -80, base: 3.0, growth: 4.4 }] },
    // ---- specials
    // EMERGENCY ALERT (neutral): holds up a hand and a red warning banner goes out across the stage -
    // THIS IS NOT A TEST - shoving whoever it passes through
    neutralB: { frames: 32, spawnAt: 12, alert: { speed: 4.4, life: 80, w: 64, h: 14, hit: { dmg: 8, angle: 30, base: 3.2, growth: 4.0, stun: 22 } } },
    // REWIND (side): it rewinds itself like a tape - flying back to where it was a moment ago, hitting anyone
    // in the way. Untouchable while it rewinds. Once per jump.
    sideB: { frames: 30, landLag: 8, rewind: { back: 50, from: 4, to: 18 },
      hits: [{ from: 4, to: 18, box: [-16, -52, 32, 54], dmg: 8, angle: 50, base: 3.4, growth: 4.2 }] },
    // SIGNAL LOST (up): it switches off - gone in a burst of static - and comes back somewhere else (the way you
    // hold, 130 pixels away), with a crackle that hurts anyone it reappears next to
    upb: { frames: 40, riseAt: 10, tele: { at: 10, appear: 22, dist: 130 },
      hits: [{ from: 22, to: 26, box: [-30, -60, 60, 66], dmg: 7, angle: 70, base: 3.6, growth: 4.4 }] },
    // DO NOT ANSWER (down): sets a ringing telephone down in front of it. The first opponent to walk into it picks
    // up - frozen, listening - until the line bursts into static. One phone at a time; it rings for 10 seconds.
    downB: { frames: 30, spawnAt: 14, phone: { ahead: 30, life: 600, listen: 50,
      pickup: { dmg: 3, angle: 90, base: 0.5, growth: 0, stun: 60 },
      burst: { dmg: 12, angle: 60, base: 5.0, growth: 4.6 } } },
  },

  // Limit: LOOK AWAY. The broadcast is cut: colour bars, the alert tone, DO NOT LOOK AT IT, and a countdown.
  // When it ends, anyone FACING DEAD AIR sees it - and takes 45% and a huge launch. Turn your back and you're safe.
  limit: {
    name: 'LOOK AWAY', type: 'lookaway', frames: 160, revealAt: 124, count: [40, 70, 100],
    seen: { dmg: 45, angle: 55, base: 7.4, growth: 6.2 },
    colors: PAL_TAPE,
  },
};
