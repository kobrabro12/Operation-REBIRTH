// LUMEN: the purple star's heart-shard, woken in the Sky Sanctum's bell tower at 12:11 on the night of the Starfall.
// Data only - stats, sheets, every move's numbers. Boxes are [x, y, w, h] from her feet facing right (negative y = up).
// Art: tools/sprites/lumen_draw.py (the drawing) + tools/sprites/trio_moves.py (the moves); code: fighterLumen.js.
// Her normals are NU's (same rig), a little softer; her specials are CONSTELLATIONS - plant up to three stars, then
// relay comets through them, link them into beams, and BLINK from star to star.
import { DEFAULT_GRAB } from './common.js';
import { NU } from './nu.js';
import { tuned } from './moveTune.js';
import { LM_MOVES } from './lmMoves.js';

// her light: violet starlight with a white core
export const PAL_STAR = { outline: 0x0c0822, deep: 0x4c25ab, mid: 0xa862ff, light: 0xd6a0ff, core: 0xffffff, shade: 0x2e2470, void: 0x0c0822 };

const SETS = ['dawn', 'void'];

export const LUMEN = {
  id: 'lumen',
  name: 'LUMEN',
  sheets: { idle: 'lm_idle', run: 'lm_run', jump: 'lm_jump', fall: 'lm_fall', moves: 'lm_moves' },
  // costumes with their own drawing (skins.js sheetSet) - lumen_draw.py VARIANTS, built by trio_moves.py
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'lm_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: LM_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -50 },    // the staff's crescent: where her stars and comets come from
  portrait: [16, 0, 36, 32],
  fxColor: 0xd6a0ff,
  swingSfx: 'swing',
  pal: PAL_STAR,
  body: { w: 20, h: 50 },
  headTop: 56,
  tagY: 66,
  weight: 0.88,                     // light
  walkSpeed: 3.0, runAccel: 0.55, groundFriction: 0.5,
  airSpeed: 2.9, airAccel: 0.28, airFriction: 0.035,
  jumpV: -9.2, shortHopV: -6.2, doubleJumpV: -8.6,
  // she floats: slow, gentle falls, and her feet never quite touch the floor
  float: { gravity: 0.82, maxFall: 5.2, hover: 3 },

  // TAUNT (1): WISH - holds the staff up and a wish of tiny stars rises off it
  taunt: { name: 'WISH', frames: 72, lines: ['MAKE A WISH.', 'I REMEMBER THE SKY.', 'STILL SHINING.', '12:11.'],
    sounds: [[8, 'ding', 0.4, 1.6], [30, 'ding', 0.4, 1.9], [52, 'ding', 0.4, 2.2]],
    fx: [{ kind: 'star', from: 8, to: 60, every: 5, x: 14, y: -62, n: 2, colors: [0xd6a0ff, 0xffffff, 0xf8d460] }] },

  moves: {
    ...DEFAULT_GRAB,
    ...tuned(NU.moves, { dmg: 0.9, kb: 0.95 }),
    // ---- specials (CONSTELLATIONS): fighterLumen.js does them all (`show: true`)
    // PLANT STAR (neutral): plants a star where her staff points. Up to `max` at once (a fourth: the oldest fades);
    // stars hang in the air for `life` frames and sting anyone who touches them (again every `rehit` frames)
    neutralB: { frames: 30, show: true, plantAt: 12, landLag: 6 },
    // COMET (side): a comet off the staff. Passing through one of her stars RELAYS it: it turns toward her next star
    // (or the nearest foe once it's been through them all), faster and harder each time
    sideB: { frames: 32, show: true, spawnAt: 11, landLag: 8, comet: {
      speed: 6.2, life: 70,
      hit: { dmg: 6, angle: 40, base: 2.8, growth: 3.6 },
      relay: { dmg: 3, speed: 0.9, life: 40, growth: 0.8 },   // added per star it passes
    } },
    // STARBLINK (up): the Sprite Fusion blink. She crackles, bursts into pixels and streaks to where the stick
    // points, `range` px away - or to one of her stars if one is near that way (it snaps to it, and the star is
    // spent). The pixels fly back together there and burst. Blinking to a star refreshes her (no helpless fall).
    upb: { frames: 42, show: true, blink: { range: 128, snap: 80, cone: 0.7, out: 6, in: 14, arrive: 35,
      burst: { dmg: 8, angle: 80, base: 3.0, growth: 5.0 }, r: 34 } },
    // CONSTELLATE (down): lines of light join her stars in the order she planted them (and her staff to the first);
    // anyone a line crosses is hit, then every star bursts. With no stars: a small flare round her
    downB: { frames: 40, show: true, linkAt: 12, burstAt: 30, landLag: 10, link: {
      beam: { dmg: 5, angle: 70, base: 2.4, growth: 1.6 },
      burst: { dmg: 9, angle: 75, base: 3.6, growth: 5.2 }, r: 30,
      flare: { dmg: 6, angle: 60, base: 2.6, growth: 3.0 }, flareR: 28,
    } },
  },

  // her stars (fighterLumen.js)
  show: { kind: 'lumen', stars: { max: 3, life: 1200, ahead: 26, up: -56,
    touch: { dmg: 4, angle: 72, base: 2.2, growth: 1.8 }, rehit: 40 } },

  // Limit: THE STARFALL. The sky goes dark; her heart-shard rises, splits into a falling star that breaks over the
  // stage - shards rain down on every foe (each shard holds them), then the heart answers: a pillar of light under
  // each of them. One foe catching most shards: about 5 x 5 + 16 = 41%.
  limit: {
    name: 'THE STARFALL', type: 'starfall', frames: 150,
    darkAt: 0, splitAt: 40, rainFrom: 52, rainTo: 116, rainEvery: 6, spread: 26,
    shard: { dmg: 5, angle: 60, base: 1.2, growth: 0, stun: 18 },
    pillarAt: 124, pillar: { dmg: 16, angle: 86, base: 6.8, growth: 6.4 },
    colors: PAL_STAR,
  },
};
