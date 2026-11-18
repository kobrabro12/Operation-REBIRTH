// GNASH: a street punk kid in a neon-X-eyed mask with neon horns, swinging a giant neon axe - Mason's design (and
// his sketch: the zig-zag grin, "heavy", "very hard hitting"). Data only - stats, sheets and moves. Boxes are [x, y, w, h] from his feet while facing right (negative
// y = up). Art: tools/sprites/gnash_draw.py (the drawing) and tools/sprites/gnash_moves.py (the animations - his
// normals are NU's poses on the same rig, so they keep NU's timings, the axe where NU has his mic); his code is in
// fighterGnash.js (PSYCHO meter + PSYCHO specials, the throw and pick-up, the double slam, EXECUTIONER), his thrown
// axe in showEntities.js (GnashAxe).
import { NU } from './nu.js';
import { GN_MOVES } from './gnMoves.js';

// his ability colours: hot-pink neon on black
export const PAL_GNASH = { outline: 0x0a0410, deep: 0xb01090, mid: 0xff3ad0, light: 0xff9ae8, core: 0xffffff, shade: 0x1a0a1e, void: 0x050208 };
const SETS = ['bloodmoon', 'gravestone'];
// how much harder his normals hit than NU's (damage, knockback)
const HEAVY = { dmg: 1.05, kb: 1.02 };

/** NU's move, made a heavy-hitter's: every hit's damage and knockback scaled by HEAVY. */
const heavy = (m) => (m.hits ? { ...m, hits: m.hits.map((h) => ({ ...h, box: reach(h.box), dmg: Math.round(h.dmg * HEAVY.dmg), base: +(h.base * HEAVY.kb).toFixed(2), growth: +(h.growth * HEAVY.kb).toFixed(2) })) } : m);
// how much further his normals reach than NU's (px): the axe is much longer than a mic
const REACH = { w: 10, h: 8 };
/** A hitbox grown by REACH - wider on the side it faces and taller (a box behind him grows backward). */
function reach([x, y, w, h]) { return [x < 0 && x + w <= 4 ? x - REACH.w : x, y - REACH.h / 2, w + REACH.w, h + REACH.h]; }

export const GNASH = {
  id: 'gnash',
  name: 'GNASH',
  sheets: { idle: 'gn_idle', run: 'gn_run', jump: 'gn_jump', fall: 'gn_fall', moves: 'gn_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'gn_' + s + '_' + k]))])),
  // his sheets WITHOUT the axe (after he's thrown it): loaded the first time a match needs them - fighterGnash.js noAxeKeys
  noAxeDir: 'assets/fighters/gnash/noaxe/',
  runCycle: [0, 8],
  moveAnims: GN_MOVES, movesOrigin: [80 / 160, 138 / 168],   // (his frames are bigger than everyone's: the giant axe)
  originY: 90 / 96,                 // idle / run / jump / fall frames are 160x96, feet at 80,90
  frameSizes: { strip: [160, 96], moves: [160, 168] },
  handOffset: { x: 18, y: -44 },    // the axe's neon blade
  portrait: [62, 30, 36, 32],
  fxColor: 0xff3ad0,
  menuScale: 2.1,                   // (he's big: a touch smaller on the menus so his horns fit)
  swingSfx: 'swing',
  pal: PAL_GNASH,
  body: { w: 28, h: 56 },
  headTop: 64,
  tagY: 74,
  weight: 1.2,                      // a kid, but the axe weighs more than anyone
  walkSpeed: 2.6, runAccel: 0.46, groundFriction: 0.62,
  airSpeed: 2.4, airAccel: 0.2, airFriction: 0.05,
  jumpV: -9.0, shortHopV: -6.0, doubleJumpV: -8.2,

  // PSYCHO (passive): a meter on his player plate, next to his damage %, fills slowly from damage he takes (x`perHurt`)
  // and deals (x`perHit`), and faster while he SEETHES (neutral special, `seethe` a frame). Full = PSYCHO READY: the next
  // special he uses becomes its PSYCHO version - a cinematic cut-in (`cut` frames, everyone else frozen), then the special
  // buffed (`moves` below; x`dmg` / x`kb`, and nothing makes him flinch while it lasts). Then the meter starts over.
  // UNARMED (`unarmed`): after AXE THROW, until he walks over the axe and picks it back up - fists only, softer; no side
  // or down special.
  show: { kind: 'gnash',
    psycho: { max: 100, perHurt: 0.25, perHit: 0.15, seethe: 0.4, cut: 74, dmg: 1.45, kb: 1.25,
      moves: {
        // PSYCHO SCREAM: one huge roar - a neon shockwave hits everyone round him
        neutralB: { name: 'PSYCHO SCREAM', blast: { r: 150, dmg: 18, angle: 60, base: 7.5, growth: 6.5, radial: true } },
        // PSYCHO THROW: the axe twice the size and twice the speed, cutting through everyone in its way; where it
        // lands it blows up in neon, and flies straight back into his hand
        sideB: { name: 'PSYCHO THROW', speed: 15, scale: 1.8, hit: { dmg: 18, angle: 35, base: 6.0, growth: 6.0 }, blast: { r: 95, dmg: 14, angle: 60, base: 6.0, growth: 5.0, radial: true } },
        // PSYCHO RISE: a much higher uppercut inside a pillar of neon that keeps hitting all the way up
        upb: { name: 'PSYCHO RISE', riseV: -16, pillar: { every: 6, ticks: 5, w: 40, h: 130, dmg: 3, angle: 88, base: 2.4, growth: 0.4, stun: 10, pull: true, last: { dmg: 8, angle: 82, base: 6.5, growth: 5.5 } } },
        // PSYCHO METEOR: thrown sky-high, a long charge at the top, then a meteor of a slam - the whole floor erupts
        downB: { name: 'PSYCHO METEOR', bounceV: -17, stall: 80, wave: { reach: 260, height: 40, dmg: 18, angle: 75, base: 7.0, growth: 6.0 } },
      } },
    unarmed: { dmg: 0.6, kb: 0.7, pickUp: { x: 24, y: 26 }, lostAfter: 180 } },

  // TAUNT (1): axe up on his shoulder and a big shaking laugh
  taunt: { name: 'BIG LAUGH', frames: 84, lines: ['BORING!', 'THAT ALL YOU GOT?', 'GET WRECKED!'],
    sounds: [[12, 'clang', 0.4, 0.7], [30, 'laugh', 0.5, 0.6]] },

  moves: {
    // his normals: NU's (the same poses, the axe where NU has his mic) - but they hit much harder
    ...Object.fromEntries(Object.entries(NU.moves).filter(([k]) => !['neutralB', 'sideB', 'upb', 'downB'].includes(k)).map(([k, m]) => [k, k === 'grab' || k === 'throws' ? m : heavy(m)])),
    // SEETHE (neutral): hold it - crouched, roaring at the sky, shaking - and his PSYCHO meter fills faster. Let go to stop.
    // A short shove of hot air hits anyone right next to him as he starts.
    neutralB: { frames: 24, gnash: 'seethe', loopFrom: 0, maxHold: 180, hits: [{ from: 2, to: 5, box: [-26, -56, 52, 58], dmg: 4, angle: 45, base: 3.2, growth: 1.0 }] },
    // AXE THROW (side): winds back and hurls the axe straight ahead, spinning. It flies flat for `range` frames, then
    // drops and sticks in whatever floor it comes down on - and stays there until he walks over it to pick it up.
    sideB: { frames: 46, spawnAt: 12, landLag: 10, axe: { speed: 9, range: 16, grav: 0.4, hit: { dmg: 14, angle: 32, base: 4.4, growth: 5.8 } } },
    // SKYSPLITTER (up): from low down, a rising uppercut with the axe that carries him up - the blade at the top is the strong part
    upb: { frames: 40, riseAt: 10, riseV: -12.6, pushX: 1.4, drift: 2.8, hits: [
      { from: 8, to: 12, box: [-4, -40, 46, 42], dmg: 8, angle: 82, base: 2.4, growth: 1.6, stun: 14 },
      { from: 13, to: 20, box: [-14, -96, 54, 70], dmg: 14, angle: 80, base: 4.6, growth: 6.0 },
    ] },
    // GROUND SPLITTER (down): the axe overhead and down into the floor - the blow bounces him high into the air ...
    downB: { frames: 30, gnash: 'slam', bounceAt: 16, bounceV: -12.5, hits: [{ from: 12, to: 14, box: [4, -40, 56, 44], dmg: 14, angle: 290, base: 3.6, growth: 4.4 }] },
    // ... then (downB2) he hangs at the top of the bounce for `stall` frames, axe raised, and comes back down axe first:
    // a shockwave runs out along the floor both ways
    downB2: { frames: 30, gnash: 'drop', stall: 60, fallAt: 12, fallV: 11.5, slamLag: 18,
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
