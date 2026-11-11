// THE DEVOTED (WIP name): a TEST FIGHTER who snowballs. He starts as a quiet man with a kitchen knife; when he
// first spawns his SYMBOL - a small dying tree - grows where he lands. Landing hits fills his DEVOTION; once it's full, praying (down
// special) at the symbol takes him up a SLUDGE STAGE - DEFAULT -> SEMI -> TAKEN -> DROWNED - and empties it again.
// Every stage covers him in more black sludge, widens his smile and makes him stronger; DROWNED grows one giant
// demon wing. The sludge drips onto the stage and stains it (match.sludgeStains - for a mechanic later).
// He keeps his stage when he's KO'd: the longer the match goes on, the worse he gets.
// Data only. Art: tools/sprites/devoted_draw.py (on AERO's skeleton; frame table dvMoves.js).
// Code: fighterDevoted.js. Every number here is a placeholder to tune.
import { DEFAULT_GRAB } from './common.js';
import { DV_MOVES } from './dvMoves.js';

export const PAL_SLUDGE = { outline: 0x1a1418, deep: 0x0e0c12, mid: 0x2e2a38, light: 0xd2d2ca, core: 0xf8f4ec, shade: 0x060508, void: 0x000000 };

const SET = (dir) => Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'dv_' + (dir ? dir + '_' : '') + k]));

export const DEVOTED = {
  id: 'devoted',
  name: 'THE DEVOTED',
  sheets: SET(''),
  // his look at each sludge stage (fighterDevoted.js swaps to it when he prays his way up)
  sludgeSheets: [SET(''), SET('semi'), SET('taken'), SET('drowned')],
  runCycle: [0, 8],
  moveAnims: DV_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 18, y: -34 },   // the tip of his knife
  portrait: [18, 4, 34, 30],
  fxColor: 0x2e2a38,
  swingSfx: 'swing',
  pal: PAL_SLUDGE,
  body: { w: 20, h: 50 },
  headTop: 54,
  tagY: 64,
  weight: 0.96,
  // quick on his feet: faster than AERO on the ground and in the air
  walkSpeed: 3.9, runAccel: 0.75, groundFriction: 0.55,
  airSpeed: 3.6, airAccel: 0.36, airFriction: 0.03,
  jumpV: -9.6, shortHopV: -6.4, doubleJumpV: -9.2,

  // THE SNOWBALL: his devotion meter, his symbol and what each sludge stage does
  devoted: {
    names: ['DEFAULT', 'SEMI', 'TAKEN', 'DROWNED'],
    // hits he has to land to fill his devotion, for the next stage up (from DEFAULT, SEMI, TAKEN)
    need: [6, 8, 10],
    // how close to his symbol he has to be to pray his way up (pixels)
    range: 70,
    // how big his symbol (the dying tree) is drawn: 1 = 50 px tall
    treeScale: 2,
    // the prayer (his WORSHIP animation): when the karambit hits the ground, when an answered prayer takes him up,
    // and how long a prayer that isn't answered lasts (frames)
    stabAt: 22, ascendAt: 32, failLength: 30,
    // per stage: damage he deals, his speed, knockback he takes (lower = harder to launch)
    dmg: [1.0, 1.12, 1.26, 1.42],
    speed: [1.0, 1.04, 1.08, 1.12],
    kb: [1.0, 0.96, 0.9, 0.84],
    // DROWNED's wing: jumps in the air
    wingJumps: 2,
    // the sludge he leaves on the floor: frames between drops while standing, per stage (0 = none), and
    // the most stains a match keeps (the oldest goes)
    stainEvery: [0, 40, 20, 9], maxStains: 220,
    // drips falling off him: frames between drips, per stage
    dripEvery: [0, 26, 12, 5],
  },

  // TAUNT (1): HE LISTENS - tilts his head as if someone spoke, and smiles
  taunt: { name: 'HE LISTENS', frames: 70, lines: ['...YES.', 'I HEAR IT.', 'SOON.'],
    sounds: [[8, 'curse', 0.25, 1.6], [40, 'curse', 0.2, 1.3]] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks (knife work)
    jab: { frames: 18, fx: 'arc', hits: [{ from: 4, to: 6, box: [8, -46, 34, 20], dmg: 3, angle: 40, base: 2.2, growth: 1.6 }] },              // a quick jab with the knife
    ftilt: { frames: 26, fx: 'arc', hits: [{ from: 9, to: 12, box: [6, -54, 48, 40], dmg: 8, angle: 38, base: 3.0, growth: 5.6 }] },          // a wide slash
    utilt: { frames: 24, fx: 'up', hits: [{ from: 7, to: 12, box: [-20, -92, 40, 44], dmg: 7, angle: 88, base: 3.2, growth: 5.2 }] },          // an upward cut
    dtilt: { frames: 20, fx: 'low', hits: [{ from: 5, to: 8, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.6 }] },            // a low slash at the ankles
    dashAttack: { frames: 32, fx: 'low', slide: { from: 4, to: 20, vx: 7.0, dust: 0x2e2a38 }, hits: [
      { from: 4, to: 8, box: [0, -26, 46, 26], dmg: 8, angle: 70, base: 3.0, growth: 4.6 },
      { from: 9, to: 18, box: [4, -22, 40, 22], dmg: 4, angle: 75, base: 2.6, growth: 2.4 },
    ] },
    // ---- smash attacks
    fsmash: { frames: 44, lunge: 1.8, fx: 'flare', hits: [{ from: 17, to: 20, box: [8, -52, 54, 34], dmg: 15, angle: 36, base: 4.2, growth: 7.4 }] },   // a lunging stab
    usmash: { frames: 42, fx: 'up', hits: [{ from: 13, to: 19, box: [-28, -102, 56, 78], dmg: 14, angle: 88, base: 4.2, growth: 7.2 }] },
    dsmash: { frames: 42, fx: 'low2', hits: [{ from: 14, to: 18, box: [-54, -14, 108, 16], dmg: 12, angle: 30, base: 3.8, growth: 6.6 }] },
    // ---- aerials
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-26, -58, 52, 54], dmg: 8, angle: 45, base: 2.8, growth: 4.2 }] },
    fair: { frames: 26, landLag: 8, fx: 'arc', hits: [{ from: 8, to: 12, box: [6, -50, 46, 40], dmg: 10, angle: 40, base: 3.0, growth: 6.0 }] },
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-42, -42, 36, 26], dmg: 11, angle: 145, base: 3.2, growth: 6.2 }] },
    uair: { frames: 26, landLag: 7, fx: 'up', hits: [{ from: 7, to: 12, box: [-22, -100, 44, 50], dmg: 9, angle: 86, base: 3.2, growth: 5.4 }] },
    dair: { frames: 34, landLag: 13, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 11, angle: -80, base: 3.0, growth: 4.2 }] },   // a downward stab: a spike
    // ---- specials
    // STAB (neutral): steps in with a fast, straight knife thrust
    neutralB: { frames: 28, lunge: 3.6, fx: 'arc', hits: [{ from: 8, to: 11, box: [8, -46, 42, 18], dmg: 8, angle: 35, base: 3.2, growth: 4.4 }] },
    // LUNGE (side): rushes forward, knife out, cutting through whoever's in the way
    sideB: { frames: 34, rush: { from: 4, to: 14, speed: 7.4 }, fx: 'arc', hits: [{ from: 5, to: 14, box: [0, -48, 36, 40], dmg: 8, angle: 40, base: 3.4, growth: 4.2 }] },
    // RISE (up): springs straight up with an upward cut
    upb: { frames: 40, riseAt: 6, riseV: -13.6, pushX: 2.2, drift: 3.4, hits: [
      { from: 6, to: 10, box: [-22, -60, 44, 62], dmg: 6, angle: 82, base: 3.4, growth: 4.4 },
    ] },
    // PRAY (down): kneels and prays. With his devotion full and his symbol close by, he goes up a sludge stage.
    // Otherwise it's a short, useless prayer (and he's wide open).
    downB: { frames: 54, pray: true },
  },

  // Limit: BLACK TIDE - sludge bursts out of him, hitting everyone near (harder at each stage), staining the
  // floor all round him, and filling his devotion
  limit: {
    name: 'BLACK TIDE', type: 'tide', frames: 46, hitAt: 14, radius: 130,
    blast: { dmg: 14, angle: 60, base: 5.4, growth: 5.0, radial: true },
    perStage: 4,                    // extra damage for each sludge stage he's reached
    colors: PAL_SLUDGE,
  },
};
