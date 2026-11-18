// GNASH: a horned brute with a zig-zag grin and a giant spiky axe - from Mason's sketch ("heavy", "very hard
// hitting"). Data only - stats, sheets and moves. Boxes are [x, y, w, h] from his feet while facing right (negative
// y = up). Art: tools/sprites/gnash_draw.py (the drawing) and tools/sprites/gnash_moves.py (the animations - his
// normals are NU's poses on the same rig, so they keep NU's timings, the axe where NU has his mic); his code is in
// fighterGnash.js (RAGE, the double slam, EXECUTIONER), his thrown axe in showEntities.js (GnashAxe).
import { NU } from './nu.js';
import { GN_MOVES } from './gnMoves.js';

// his ability colours: furnace orange on soot
export const PAL_GNASH = { outline: 0x140806, deep: 0x8a1a0a, mid: 0xe0461a, light: 0xff8a3a, core: 0xffe0b0, shade: 0x2a0e08, void: 0x0a0302 };
const SETS = ['bloodmoon', 'gravestone'];
// how much harder his normals hit than NU's (damage, knockback)
const HEAVY = { dmg: 1.12, kb: 1.06 };

/** NU's move, made a heavy-hitter's: every hit's damage and knockback scaled by HEAVY. */
const heavy = (m) => (m.hits ? { ...m, hits: m.hits.map((h) => ({ ...h, dmg: Math.round(h.dmg * HEAVY.dmg), base: +(h.base * HEAVY.kb).toFixed(2), growth: +(h.growth * HEAVY.kb).toFixed(2) })) } : m);

export const GNASH = {
  id: 'gnash',
  name: 'GNASH',
  sheets: { idle: 'gn_idle', run: 'gn_run', jump: 'gn_jump', fall: 'gn_fall', moves: 'gn_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'gn_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: GN_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 18, y: -44 },    // the axe head
  portrait: [16, 0, 36, 32],
  fxColor: 0xff8a3a,
  menuScale: 2.1,                   // (he's big: a touch smaller on the menus so his horns fit)
  swingSfx: 'swing',
  pal: PAL_GNASH,
  body: { w: 28, h: 56 },
  headTop: 64,
  tagY: 74,
  weight: 1.2,                      // the heaviest fighter there is
  walkSpeed: 2.6, runAccel: 0.46, groundFriction: 0.62,
  airSpeed: 2.4, airAccel: 0.2, airFriction: 0.05,
  jumpV: -9.0, shortHopV: -6.0, doubleJumpV: -8.2,

  // RAGE (passive): a meter under his name fills from damage he takes and deals, and fast while he SEETHES (neutral
  // special). Full: ENRAGED for `time` frames - everything hits x`dmg` harder and x`kb` further, he can't be made to
  // flinch by small hits (`armor` knockback or less), and he smokes and glows. Then it starts again from empty.
  show: { kind: 'gnash', rage: { max: 100, perHurt: 0.5, perHit: 0.3, seethe: 0.9, time: 360, dmg: 1.2, kb: 1.12, armor: 4, limit: 10 } },

  // TAUNT (1): axe up on his shoulder and a big shaking laugh
  taunt: { name: 'BIG LAUGH', frames: 84, lines: ['HAH! HAH! HAH!', 'THAT ALL YOU GOT?', 'COME HERE.'],
    sounds: [[12, 'clang', 0.4, 0.7], [30, 'laugh', 0.5, 0.6]] },

  moves: {
    // his normals: NU's (the same poses, the axe where NU has his mic) - but they hit much harder
    ...Object.fromEntries(Object.entries(NU.moves).filter(([k]) => !['neutralB', 'sideB', 'upb', 'downB'].includes(k)).map(([k, m]) => [k, k === 'grab' || k === 'throws' ? m : heavy(m)])),
    // SEETHE (neutral): hold it - crouched, roaring at the sky, shaking - and his RAGE meter fills fast. Let go to stop.
    // A short shove of hot air hits anyone right next to him as he starts.
    neutralB: { frames: 24, gnash: 'seethe', loopFrom: 0, maxHold: 180, hits: [{ from: 2, to: 5, box: [-26, -56, 52, 58], dmg: 4, angle: 45, base: 3.2, growth: 1.0 }] },
    // AXE THROW (side): winds back and hurls the axe end over end; it slows, then wheels back to his hand, hitting
    // both ways. One axe: no second throw till it's back.
    sideB: { frames: 46, spawnAt: 12, landLag: 10, axe: { speed: 8.5, decel: 0.42, outTime: 22, returnSpeed: 5,
      out: { dmg: 13, angle: 38, base: 4.0, growth: 5.6 }, back: { dmg: 7, angle: 140, base: 3.0, growth: 2.6 } } },
    // SKYSPLITTER (up): from low down, a rising uppercut with the axe that carries him up - the blade at the top is the strong part
    upb: { frames: 40, riseAt: 10, riseV: -12.6, pushX: 1.4, drift: 2.8, hits: [
      { from: 8, to: 12, box: [-4, -40, 46, 42], dmg: 8, angle: 82, base: 2.4, growth: 1.6, stun: 14 },
      { from: 13, to: 20, box: [-14, -96, 54, 70], dmg: 14, angle: 80, base: 4.6, growth: 6.0 },
    ] },
    // GROUND SPLITTER (down): the axe overhead and down into the floor - the blow bounces him high into the air ...
    downB: { frames: 30, gnash: 'slam', bounceAt: 16, bounceV: -9.2, hits: [{ from: 12, to: 14, box: [4, -40, 46, 44], dmg: 14, angle: 290, base: 3.6, growth: 4.4 }] },
    // ... then (downB2) he comes back down, axe first, and slams again: a shockwave runs out along the floor both ways
    downB2: { frames: 30, gnash: 'drop', fallAt: 12, fallV: 10.5, slamLag: 18,
      hits: [{ from: 12, to: 60, box: [-10, -30, 50, 40], dmg: 12, angle: 290, base: 3.8, growth: 4.0 }],
      wave: { reach: 90, height: 26, dmg: 9, angle: 70, base: 4.2, growth: 4.6 } },
  },

  // Limit: EXECUTIONER. He hauls the axe up, leaps high and hangs there, locking on to the nearest foe; then he drops
  // like a meteor and the axe comes down on them - a crater, a pillar of fire and a huge launch. 32% + the shockwave.
  limit: {
    name: 'EXECUTIONER', type: 'executioner', frames: 150, leapAt: 26, leapV: -10.5, hangFrom: 40, hangTo: 96, dropV: 14, track: 0.12,
    blow: { dmg: 32, angle: 70, base: 9.5, growth: 7.0 }, reach: 70,
    wave: { reach: 150, dmg: 10, angle: 60, base: 5, growth: 4 },
    colors: PAL_GNASH,
  },
};
