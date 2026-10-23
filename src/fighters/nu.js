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
  // costumes with their own drawing (skins.js sheetSet) - tools/sprites/nu_costume_moves.py
  costumeSheets: Object.fromEntries(['inferno', 'street', 'bones'].map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'nu_' + s + '_' + k]))])),
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

  // TAUNT (1): HEADBANG - mic thrust to the sky, four big headbangs to the beat, then the mic pointed at you
  taunt: { name: 'HEADBANG', frames: 84, lines: ['MAKE SOME NOISE!', 'CAN YOU HEAR ME?!', 'ONE MORE TIME!'],
    sounds: [[13, 'taiko', 0.5, 1.2], [23, 'taiko', 0.5, 1.2], [33, 'taiko', 0.5, 1.2], [43, 'taiko', 0.6, 1.0], [58, 'whoosh', 0.4, 1]],
    fx: [{ kind: 'note', from: 13, to: 43, every: 10, x: 4, y: -66, n: 2 }] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks
    // RAP BARRAGE: verse after verse spat into the mic - HOLD ATTACK to keep rapping (up to 3 more bars) -
    // then a shove of sound to finish
    jab: { frames: 30, multi: true, fx: 'jab', rapid: { at: 18, to: 4, max: 3 }, hits: [
      { from: 4, to: 5, box: [8, -52, 36, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 8, to: 9, box: [8, -52, 36, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 12, to: 13, box: [8, -52, 36, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 16, to: 17, box: [8, -52, 36, 28], dmg: 1, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 22, to: 24, box: [8, -56, 42, 34], dmg: 4, angle: 40, base: 3.0, growth: 2.8 },
    ] },
    // MIC SWING: the mic whipped out on its cable - long reach
    ftilt: { frames: 30, fx: 'arc', hits: [{ from: 10, to: 14, box: [10, -52, 54, 34], dmg: 9, angle: 36, base: 3.0, growth: 6.0 }] },
    // MIC TWIRL: twirls the mic overhead twice - two light hits and a launcher
    utilt: { frames: 26, multi: true, fx: 'spin', hits: [
      { from: 6, to: 7, box: [-26, -92, 52, 40], dmg: 2, angle: 90, base: 1.2, growth: 0, stun: 10 },
      { from: 10, to: 11, box: [-26, -92, 52, 40], dmg: 2, angle: 90, base: 1.2, growth: 0, stun: 10 },
      { from: 14, to: 17, box: [-28, -96, 56, 44], dmg: 4, angle: 88, base: 3.0, growth: 5.4 },
    ] },
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.8 }] },
    // STAGE SLIDE (attack at a full run): drops to his knees and slides into them, mic held high
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 20, vx: 7.2 }, hits: [
      { from: 5, to: 9, box: [4, -34, 40, 34], dmg: 9, angle: 72, base: 3.2, growth: 4.6 },
      { from: 10, to: 18, box: [4, -30, 36, 30], dmg: 5, angle: 60, base: 2.4, growth: 3.0 },
    ] },
    // ---- smash attacks
    // KICK: a huge front kick
    fsmash: { frames: 46, lunge: 2.0, fx: 'thrust', hits: [{ from: 18, to: 21, box: [8, -44, 46, 28], dmg: 16, angle: 36, base: 4.2, growth: 7.4 }] },
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
    // POWER CHORD (neutral): HOLD SPECIAL to build up the chord (up to almost a second), let go to blast a
    // wall of sound forward. A full chord is a huge, fast wave that hits hard. Waves that pass through his
    // AMP come out AMPED: bigger, faster and 50% stronger.
    neutralB: { frames: 30, spawnAt: 12, hold: { at: 10, max: 50 }, wave: {
      speed: 3.6, life: 60, h0: 26, h1: 46,
      hit: { dmg: 6, angle: 35, base: 2.6, growth: 3.2 },
      // what a full chord adds on top (scaled by how long it was held)
      full: { dmg: 8, base: 2.4, growth: 3.0, speed: 2.4, h: 30 },
    } },
    // MIC TOSS (side): whips his mic out on its cord. It flies out, and at the end of the cord it swings back
    // to his hand - hitting on the way out and again on the way back (that one pulls them toward him). In the
    // air he hangs for a moment while he throws. One mic: no second toss until it's back in his hand.
    sideB: { frames: 52, spawnAt: 10, landLag: 8, mic: {
      speed: 9.5, decel: 0.42, outTime: 24,          // how fast it flies, how quickly it slows, the longest it flies out
      returnSpeed: 4, cord: 120,                      // how fast it starts back, and the cord's length (it can't go further)
      out: { dmg: 8, angle: 38, base: 3.2, growth: 5.2 },
      back: { dmg: 5, angle: 25, base: 2.8, growth: 1.6 },
      airStall: 1.2,                                  // in the air: the fastest he falls while throwing
    } },
    // CROWD SURF (up): a sea of hands carries him up; the hands slap anyone underneath
    upb: { frames: 40, riseAt: 8, riseV: -14.6, pushX: 2.6, drift: 3.6, crowd: true, hits: [
      { from: 8, to: 10, box: [-24, -10, 48, 26], dmg: 3, angle: 85, base: 2.0, growth: 0, stun: 10 },
      { from: 14, to: 16, box: [-24, -10, 48, 26], dmg: 3, angle: 85, base: 2.0, growth: 0, stun: 10 },
      { from: 20, to: 23, box: [-28, -50, 56, 56], dmg: 5, angle: 70, base: 3.4, growth: 4.6 },
    ] },
    // AMP DROP (down): drops a speaker cabinet from above, in front of him (on the ground or in the air). If it
    // falls on someone it crushes them for 25% and spikes them down - drop it off the ledge onto someone
    // recovering. Once it lands it thumps a big shockwave on every beat (pushing people away) and AMPS any
    // Power Chord fired through it. Anyone can stand on top of it. One amp at a time: two cabinets tall, it lasts 15 seconds after landing.
    downB: { frames: 30, spawnAt: 10, amp: { ahead: 34, dropFrom: 90, gravity: 0.55, maxFall: 11, life: 900,
      // landing on someone: a heavy spike
      drop: { dmg: 25, angle: -75, base: 4.0, growth: 4.2 },
      // the shockwave on each beat: how far it reaches (pixels), and the push
      radius: 220, pulse: { dmg: 4, angle: 45, base: 4.4, growth: 2.4, radial: true },
      boost: 1.5 } },
  },

  // ON BEAT (passive): a beat runs under every fight (the ring closing in on his feet). Start an attack on
  // the beat and it hits 25% harder and a bit further, and fills his Limit a little. Hit on the beat again and
  // again to build a STREAK (shown over his head); at 3+ he's HYPED and every on-beat hit gets another 10%.
  // Getting hit or swinging off the beat drops the streak.
  beat: { every: 40, window: 5, mult: 1.25, kb: 1.1, hype: 3, hypeMult: 1.1, limitGain: 3, maxStreak: 8 },

  // Limit: WALL OF SOUND. Two giant amp stacks burst out of the floor behind him. Four bass drops thump
  // out of them, each a ring of sound racing across the stage: whoever a ring catches is dragged in and held
  // in front of him, taking every drop after it - then THE DROP: he screams a cone of sound that launches
  // everything in front of him. Caught by the first ring: 4 x 8 + 18 = 50%.
  limit: {
    name: 'WALL OF SOUND', type: 'wall', reach: 270, frames: 150,
    beats: [40, 58, 76, 94], ringSpeed: 13,
    thump: { dmg: 8, angle: 90, base: 1.0, growth: 0, stun: 40 },
    dropAt: 116, dropLen: 330, dropH: 110,
    drop: { dmg: 18, angle: 38, base: 7.6, growth: 6.2 },
    colors: PAL_ACID,
  },
};
