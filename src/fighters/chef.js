// CHEF ROUX: a hot-tempered master chef, in the lab (Trinkets > TEST FIGHTERS). Data only - stats, sheets and moves.
// Boxes are [x, y, w, h] from his feet while facing right (negative y = up). Art: tools/sprites/chef_draw.py
// (the drawing) and tools/sprites/show_moves.py (the animations - his normals are NU's poses on the same rig, so
// they keep NU's timings); his code is in fighterShow.js, his cleaver and oil in showEntities.js.
import { NU } from './nu.js';
import { CH_MOVES } from './chMoves.js';

// his ability colours: copper flame
export const PAL_CHEF = { outline: 0x1a0a04, deep: 0xa83a0a, mid: 0xe86a1a, light: 0xffa040, core: 0xfff0c8, shade: 0x2a1408, void: 0x0a0402 };
const SETS = ['grill', 'pastry'];

export const CHEF = {
  id: 'chef',
  name: 'CHEF ROUX',
  sheets: { idle: 'ch_idle', run: 'ch_run', jump: 'ch_jump', fall: 'ch_fall', moves: 'ch_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'ch_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: CH_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 16, y: -40 },    // the cleaver
  portrait: [16, 0, 36, 32],
  fxColor: 0xffa040,
  swingSfx: 'swing',
  pal: PAL_CHEF,
  body: { w: 26, h: 54 },
  headTop: 62,
  tagY: 72,
  weight: 1.08,                     // a heavy man
  walkSpeed: 2.9, runAccel: 0.52, groundFriction: 0.6,
  airSpeed: 2.6, airAccel: 0.22, airFriction: 0.045,
  jumpV: -9.2, shortHopV: -6.2, doubleJumpV: -8.6,

  // ORDER UP (passive): a ticket of three moves floats over his toque. Land them in order (any time, any target)
  // and the order's up: WELL DONE - for `time` frames everything he does hits x`dmg` harder and x`kb` further, he
  // smoulders, and his Limit gets `limit`. Then a new ticket.
  show: { kind: 'chef', orders: { len: 3, pool: ['jab', 'ftilt', 'utilt', 'dtilt', 'dashAttack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair', 'neutralB', 'sideB', 'downB'],
    bonus: { time: 480, dmg: 1.3, kb: 1.15, limit: 20 } } },

  // TAUNT (1): CHEF'S KISS - fingers to his lips, flung wide, then a big belly laugh
  taunt: { name: "CHEF'S KISS", frames: 84, lines: ['MAGNIFIQUE!', 'TOO MUCH SALT? NEVER!', 'YOU ARE UNDERCOOKED!'],
    sounds: [[26, 'ding', 0.5, 1.7], [44, 'laugh', 0.4, 0.9]],
    fx: [{ kind: 'note', from: 26, to: 34, every: 4, x: 16, y: -50, n: 2 }] },

  moves: {
    // his normals: NU's (the same poses, a cleaver where NU has a mic) - hits a touch harder (he's heavy)
    ...Object.fromEntries(Object.entries(NU.moves).filter(([k]) => !['neutralB', 'sideB', 'upb', 'downB'].includes(k))),
    // FRYING PAN (neutral): hauls the pan overhead and brings it down - BONG. Batters projectiles back the way they came.
    neutralB: { frames: 30, reflect: { early: 2, late: 3, speed: 1.2, life: 60, dmg: 1.25, maxMult: 2 }, hits: [{ from: 10, to: 14, box: [-6, -70, 50, 72], dmg: 12, angle: 50, base: 3.8, growth: 6.2 }] },
    // CLEAVER TOSS (side): flings the cleaver spinning out in a flat arc; it boomerangs back to his hand, hitting going
    // out and coming back. One cleaver: no second toss till it's caught.
    sideB: { frames: 44, spawnAt: 10, landLag: 8, cleaver: { speed: 9, decel: 0.5, outTime: 18, returnSpeed: 5,
      out: { dmg: 8, angle: 35, base: 3.0, growth: 4.6 }, back: { dmg: 5, angle: 140, base: 2.6, growth: 2.0 } } },
    // FLAMBE (up): a whoosh of fire under his clogs blasts him up; the flames burn anyone below
    upb: { frames: 40, riseAt: 8, riseV: -14.0, pushX: 2.2, drift: 3.4, hits: [
      { from: 8, to: 14, box: [-20, -10, 40, 36], dmg: 9, angle: 60, base: 3.0, growth: 2.4 },
      { from: 15, to: 20, box: [-22, -70, 44, 60], dmg: 6, angle: 80, base: 3.4, growth: 4.0 },
    ] },
    // HOT OIL (down): tips the pan and pours sizzling oil on the floor in front of him (6 s): slows whoever stands
    // in it and burns them every half second. One puddle at a time.
    downB: { frames: 34, spawnAt: 12, oil: { ahead: 40, width: 80, life: 360, every: 30, slow: 10, burn: { dmg: 3, angle: 80, base: 1.6, growth: 0.6 } } },
  },

  // Limit: FULL COURSE. A giant iron pot crashes down in front of him: whoever's in reach is scooped in and boils
  // on four beats while he stirs - then BON APPETIT, the soup erupts and launches them. 4 x 7 + 17 = 45%.
  limit: {
    name: 'FULL COURSE', type: 'feast', frames: 150, ahead: 64, reach: 80, catchAt: 18,
    hits: [44, 60, 76, 92], thump: { dmg: 7, angle: 90, base: 1.0, growth: 0, stun: 40 },
    finalAt: 116, final: { dmg: 17, angle: 85, base: 7.8, growth: 6.0 },
    colors: PAL_CHEF,
  },
};
