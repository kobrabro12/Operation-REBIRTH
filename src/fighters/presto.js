// THE GREAT PRESTO: a stage magician, in the lab (Trinkets > TEST FIGHTERS). Data only - stats, sheets and moves.
// Boxes are [x, y, w, h] from his feet while facing right (negative y = up). Art: tools/sprites/presto_draw.py
// (the drawing) and tools/sprites/show_moves.py (the animations - his normals are NU's poses on the same rig, so
// they keep NU's timings); his code is in fighterShow.js, his cards in showEntities.js.
import { NU } from './nu.js';
import { PR_MOVES } from './prMoves.js';

// his ability colours: stage violet and white
export const PAL_PRESTO = { outline: 0x0a0812, deep: 0x5a2090, mid: 0x8a40d0, light: 0xb070f0, core: 0xf4e8ff, shade: 0x1a1628, void: 0x06040a };
const SETS = ['royal', 'phantom'];

export const PRESTO = {
  id: 'presto',
  name: 'THE GREAT PRESTO',
  sheets: { idle: 'pr_idle', run: 'pr_run', jump: 'pr_jump', fall: 'pr_fall', moves: 'pr_moves' },
  // costumes with their own drawing (skins.js sheetSet; tools/sprites/presto_draw.py VARIANTS)
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'pr_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: PR_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 16, y: -44 },    // the wand's tip: where his cards fly from
  portrait: [16, 0, 36, 32],
  fxColor: 0xb070f0,
  swingSfx: 'swing',
  pal: PAL_PRESTO,
  body: { w: 22, h: 52 },
  headTop: 60,
  tagY: 70,
  weight: 0.92,
  walkSpeed: 3.3, runAccel: 0.62, groundFriction: 0.55,
  airSpeed: 2.9, airAccel: 0.27, airFriction: 0.04,
  jumpV: -9.6, shortHopV: -6.5, doubleJumpV: -9.0,

  // PICK A CARD (passive): every card that hits sticks to them (up to `max`, shown over their head, gone after
  // `keep` frames); his VANISHING ACT appears behind a marked foe, and its TA-DA cashes the cards in for
  // x(1 + perCard) damage and x(1 + perKb) knockback each - IS THIS YOUR CARD?
  show: { kind: 'presto', cards: { max: 3, keep: 600, perCard: 0.55, perKb: 0.12 } },

  // TAUNT (1): HAT TRICK - tips his hat with a bow, then a flourish of the wand
  taunt: { name: 'HAT TRICK', frames: 84, lines: ['AND FOR MY NEXT TRICK...', 'NOTHING UP MY SLEEVE!', 'APPLAUSE, PLEASE.'],
    sounds: [[24, 'whoosh', 0.4, 1.4], [62, 'ding', 0.5, 1.6], [64, 'petal', 0.4, 1.4]],
    fx: [{ kind: 'note', from: 62, to: 76, every: 6, x: 14, y: -60, n: 2 }] },

  moves: {
    // his normals: NU's (the same poses, a wand where NU has a mic) - flurries of wand jabs, a cape-twirling
    // spin, a kick, the Ground Pound, NU's aerials
    ...Object.fromEntries(Object.entries(NU.moves).filter(([k]) => !['neutralB', 'sideB', 'upb', 'downB'].includes(k))),
    // CARD TRICK (neutral): flicks a fan of three playing cards off his wand. Light hits that STICK a card on whoever they hit.
    neutralB: { frames: 28, spawnAt: 10, cards: { n: 3, spread: 0.14, speed: 7.2, life: 44, hit: { dmg: 3, angle: 32, base: 1.8, growth: 1.8 } } },
    // VANISHING ACT (side): sweeps his cape across himself and vanishes (can't be hit), reappearing behind the nearest
    // foe with his cards on them (or a good way ahead) - TA-DA! - with a wand stab that cashes the cards in. Once per jump.
    sideB: { frames: 40, landLag: 8, vanish: { from: 8, to: 22, dist: 120, range: 230 },
      hits: [{ from: 28, to: 31, box: [4, -54, 44, 38], dmg: 7, angle: 40, base: 3.2, growth: 5.2 }] },
    // DOVE LIFT (up): a flock of doves carries him up by his hands; their wings batter anyone above
    upb: { frames: 40, riseAt: 8, riseV: -14.4, pushX: 2.4, drift: 3.8, hits: [
      { from: 9, to: 12, box: [-22, -96, 44, 40], dmg: 4, angle: 85, base: 2.4, growth: 0, stun: 12 },
      { from: 18, to: 22, box: [-24, -100, 48, 44], dmg: 5, angle: 80, base: 3.6, growth: 4.4 },
    ] },
    // THE CABINET (down): a counter. He ducks into a magic cabinet (ticks 5-28); anything that hits it hits nothing -
    // the door bursts open and he stabs back for 1.3x what it would have done (at least 8%).
    counter: { start: 5, end: 28, frames: 52, mult: 1.3, minDmg: 8,
      strike: { frames: 30, from: 4, to: 9, box: [-6, -60, 70, 62], angle: 40, base: 4.2, growth: 6.2 } },
  },

  // Limit: THE GRAND ILLUSION. A magic cabinet drops round whoever's in reach in front of him; a giant saw cuts
  // through it on four beats - then TA-DA, it bursts open in a cloud of doves and cards and they're launched.
  // 4 x 7 + 16 = 44%. Nobody in reach: NOTHING UP MY SLEEVE.
  limit: {
    name: 'THE GRAND ILLUSION', type: 'saw', frames: 150, ahead: 60, reach: 90, catchAt: 30,
    hits: [52, 66, 80, 94], thump: { dmg: 7, angle: 90, base: 1.0, growth: 0, stun: 40 },
    finalAt: 118, final: { dmg: 16, angle: 70, base: 7.6, growth: 6.0 },
    colors: PAL_PRESTO,
  },
};
