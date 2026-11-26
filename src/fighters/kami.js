// KAMI: a little fighter folded out of one page of THE ARCHIVE. Data only - stats, sheets, every move's numbers.
// Boxes are [x, y, w, h] from his feet facing right (negative y = up).
// Art: tools/sprites/kami_draw.py + tools/sprites/trio_moves.py; code: fighterKami.js.
// FOLDS: down special refolds him - CRANE (floaty, an extra jump), FROG (heavy, big jumps) or BLADE (fast and sharp,
// but easier to launch); his neutral special is different in each. His side special is the Sprite Fusion DASH.
import { DEFAULT_GRAB } from './common.js';
import { NU } from './nu.js';
import { tuned } from './moveTune.js';
import { KM_MOVES } from './kmMoves.js';

// his colours: paper white, seal red, ink
export const PAL_PAPER = { outline: 0x1a1418, deep: 0xc82a1e, mid: 0xf0503c, light: 0xffffff, core: 0xffffff, shade: 0xc4bcaa, void: 0x1a1418 };

const SETS = ['newsprint', 'gold'];

export const KAMI = {
  id: 'kami',
  name: 'KAMI',
  sheets: { idle: 'km_idle', run: 'km_run', jump: 'km_jump', fall: 'km_fall', moves: 'km_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'km_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: KM_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -36 },    // his fan
  portrait: [16, 0, 36, 32],
  fxColor: 0xf0503c,
  swingSfx: 'swing',
  pal: PAL_PAPER,
  body: { w: 20, h: 48 },
  headTop: 58,
  tagY: 68,
  weight: 0.9,                      // paper: light
  walkSpeed: 3.3, runAccel: 0.62, groundFriction: 0.55,
  airSpeed: 3.0, airAccel: 0.27, airFriction: 0.04,
  jumpV: -9.2, shortHopV: -6.2, doubleJumpV: -8.6,

  // TAUNT (1): PAPER PLANE - folds a plane out of thin air and sends it gliding off
  taunt: { name: 'PAPER PLANE', frames: 72, lines: ['FOLD ME A STORY.', 'NOT A WRINKLE.', 'PAPER BEATS ROCK.', 'I WAS A PAGE ONCE.'],
    sounds: [[10, 'petal', 0.4, 1.8], [24, 'petal', 0.4, 2.0], [44, 'whoosh', 0.35, 1.6]] },

  moves: {
    ...DEFAULT_GRAB,
    ...tuned(NU.moves, { dmg: 1, kb: 1 }),
    // ---- specials: fighterKami.js does them all (`show: true`)
    // FOLD ACTION (neutral) - one per fold:
    //   CRANE: a paper crane that drifts toward the nearest foe;  FROG: a hop that stomps down where he lands;
    //   BLADE: three paper shuriken, quick and flat
    neutralB: { frames: 28, show: true, spawnAt: 11, landLag: 8,
      crane: { speed: 4.0, turn: 0.06, life: 96, hit: { dmg: 7, angle: 45, base: 3.0, growth: 3.6 } },
      frog: { vy: -7.2, vx: 2.4, stomp: { dmg: 10, angle: 70, base: 3.4, growth: 4.6 }, r: 32, fall: { dmg: 6, angle: -60, base: 2.4, growth: 2.4 } },
      blade: { at: [11, 15, 19], speed: 8.5, life: 40, hit: { dmg: 4, angle: 30, base: 1.8, growth: 1.8 } } },
    // PAPER CUT (side): the Sprite Fusion DASH - he's a blur across `dist` px; a beat later the cut lands on everyone
    // along the line. Once in the air until he lands.
    sideB: { frames: 34, show: true, dashAt: 6, dashFor: 8, cutAt: 18, dist: 120, landLag: 10,
      slash: { dmg: 11, angle: 40, base: 3.4, growth: 5.4 } },
    // KITE (up): catches the wind like a kite (a gust hits under him), then glides down
    upb: { frames: 30, show: true, riseFrom: 4, riseTo: 22, riseV: -7.0, glide: 1.4, hits: [
      { from: 5, to: 10, box: [-20, -60, 40, 62], dmg: 6, angle: 85, base: 3.0, growth: 4.4 },
    ] },
    // FOLD (down): unfolds and refolds himself into the next fold
    downB: { frames: 36, show: true, foldAt: 18, landLag: 6 },
  },

  // his folds (fighterKami.js): how each changes him; `tint` colours his white paper
  show: { kind: 'kami', folds: {
    crane: { name: 'CRANE', tint: 0xffffff, dmg: 0.9, speed: 1.0, kb: 1.0, jumps: 2, float: { gravity: 0.62, maxFall: 3.8 }, upb: 1.2 },
    frog: { name: 'FROG', tint: 0x9fe08a, dmg: 1.05, speed: 0.9, kb: 0.85, jumps: 1, jump: 1.16, upb: 0.9 },
    blade: { name: 'BLADE', tint: 0x9ab8e0, dmg: 1.2, speed: 1.1, kb: 1.15, jumps: 1, upb: 1.0 },
  } },

  // Limit: PAPER TIGER. Paper whirls round him and folds itself into a giant origami tiger, which roars and pounces
  // across the whole stage - its claws catch everyone in its way, then its ink seal stamps down and launches them.
  // Caught: 14 + 18 = 32% and a launch.
  limit: {
    name: 'PAPER TIGER', type: 'tiger', frames: 150,
    foldTo: 56, roarAt: 62, pounceFrom: 70, pounceTo: 108, reach: 560,
    claw: { dmg: 14, angle: 60, base: 1.0, growth: 0, stun: 40 },
    stampAt: 120, stamp: { dmg: 18, angle: 48, base: 7.2, growth: 6.4 },
    colors: PAL_PAPER,
  },
};
