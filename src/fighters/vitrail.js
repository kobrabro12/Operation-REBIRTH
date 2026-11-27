// VITRAIL - THE ROSE OF SEVEN HOURS: the great stained-glass window of the Sky Sanctum's chapel, broken by the falling
// star and reborn as a person, in the shape of the hooded monks who sat under it - a white glass mask with the star's
// crack down it, and the rose itself burning behind his head as a halo. His glazier set four elements in it, and those
// are his four specials: FIRE (side), ICE (down), LIGHTNING (up) and THE VOID between the stars (neutral). A combo
// fighter: any of them that lands can be cancelled into a DIFFERENT one (and his normals into any of them), each new
// element in a chain hits harder, and all four in one chain is a PRISM BREAK.
// Data only - stats, sheets, every move's numbers. Boxes are [x, y, w, h] from his feet facing right.
// Art: tools/sprites/vitrail_draw.py + tools/sprites/trio_moves.py; code: fighterVitrail.js; effects: src/fx/sfMagic.js
// (Sprite Fusion's fire, ice, lightning, black hole, holy light, sparkle, heal and power-up).
import { DEFAULT_GRAB } from './common.js';
import { NU } from './nu.js';
import { tuned } from './moveTune.js';
import { VR_MOVES } from './vrMoves.js';

// his colours: lead, the star's violet, the gilt
export const PAL_GLASS = { outline: 0x0c0a12, deep: 0x5a2aa8, mid: 0xb87aff, light: 0xe8c8ff, core: 0xffffff, shade: 0x2c2838, void: 0x0c0a12, accent: 0xf2c84a };

const SETS = ['nocturne', 'ember'];

export const VITRAIL = {
  id: 'vitrail',
  name: 'VITRAIL',
  sheets: { idle: 'vr_idle', run: 'vr_run', jump: 'vr_jump', fall: 'vr_fall', moves: 'vr_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'vr_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: VR_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -40 },    // his front palm
  portrait: [16, 0, 36, 32],
  fxColor: 0xb87aff,
  swingSfx: 'swing',
  pal: PAL_GLASS,
  body: { w: 20, h: 54 },
  headTop: 60,
  tagY: 70,
  weight: 0.96,                     // glass and lead: not light, not quick
  walkSpeed: 2.9, runAccel: 0.55, groundFriction: 0.55,
  airSpeed: 2.7, airAccel: 0.24, airFriction: 0.035,
  jumpV: -9.0, shortHopV: -6.0, doubleJumpV: -8.4,

  // TAUNT (1): VESPERS - he bows his head, raises both hands, and the four panes of his halo flare one by one
  taunt: { name: 'VESPERS', frames: 72, lines: ['FOUR PANES. ONE WINDOW.', 'I REMEMBER IN COLOUR.', 'MIND THE GLASS.', 'THE LIGHT GOES THROUGH ME.'],
    sounds: [[12, 'ding', 0.4, 1.2], [26, 'ding', 0.35, 1.4], [40, 'ding', 0.35, 1.6], [54, 'ding', 0.35, 1.8], [64, 'glass', 0.4, 1.4]] },

  moves: {
    ...DEFAULT_GRAB,
    ...tuned(NU.moves, { dmg: 0.95, kb: 0.9 }),   // (plain normals, a little less knockback: they're there to start chains)
    // ---- the four elements: fighterVitrail.js does them all (`show: true`). `el` = the element it counts as in a chain.
    // UMBRA (neutral, THE VOID): a small black hole opens ahead of his palm, drags whoever is near into it, then pops
    neutralB: { frames: 32, show: true, at: 10, landLag: 8, el: 'V', ahead: 64, y: -34, life: 42, reach: 120, pull: 0.5, every: 10,
      tick: { dmg: 1, angle: 90, base: 0.5, growth: 0, stun: 12 }, r: 34, pop: { dmg: 5, angle: 62, base: 3.4, growth: 3.0 } },
    // CINDER STEP (side, FIRE): he bursts forward in a gout of flame, palm first - leaves them burning. Once in the air
    // (unless it's a cancel).
    sideB: { frames: 28, show: true, at: 6, lunge: 5.2, landLag: 8, el: 'F',
      hit: { dmg: 6, angle: 40, base: 2.6, growth: 2.6 }, box: [4, -50, 46, 48], burn: { left: 60, every: 20, dmg: 1 } },
    // RIME BLOOM (down, ICE): both palms on the floor, ice blooms up round him - pops them up, frozen for a beat
    downB: { frames: 30, show: true, at: 10, landLag: 8, el: 'I', r: 42,
      hit: { dmg: 5, angle: 86, base: 3.6, growth: 1.8, stun: 18 } },
    // FULGURITE (up, LIGHTNING): he becomes a bolt and strikes `dist` px the way the stick points (up by default),
    // hitting everything along the line (and whoever is within `spark` of him as he goes). Helpless after - unless it
    // was a chain cancel.
    upb: { frames: 36, show: true, at: 6, travel: 7, dist: 124, el: 'L', spark: 36,
      hit: { dmg: 6, angle: 70, base: 3.0, growth: 3.2 } },
  },

  // THE CHAIN (fighterVitrail.js): a hit with an element opens (or keeps open) the chain for `window` frames; while it's
  // open, any move of his that has landed can be cancelled into an element not yet in the chain. Each element already
  // in it makes the next one `step` harder. All four = PRISM BREAK (a burst of white light where the last one hit).
  show: { kind: 'vitrail', window: 90, step: 0.12,
    colors: { F: 0xff6a2a, I: 0x7ae8ff, L: 0xffe04a, V: 0xa04aff },
    names: { F: 'FIRE', I: 'ICE', L: 'LIGHTNING', V: 'VOID' },
    prism: { r: 44, hit: { dmg: 8, angle: 70, base: 5.0, growth: 5.6 } } },

  // Limit: THE ROSE OF SEVEN HOURS. The sky darkens and the whole window hangs over the stage; its panes light one by
  // one in the four colours, and each hour a shaft of light comes down on a foe (each holds them) - then the eighth, all at once, on everyone.
  // One foe: 7 x 3 + 18 = 39% and a huge launch.
  limit: {
    name: 'THE ROSE OF SEVEN HOURS', type: 'rose', frames: 150,
    darkTo: 16, firstAt: 30, every: 12, hours: 7, lastAt: 124,
    hour: { dmg: 3, angle: 90, base: 1.0, growth: 0, stun: 40 },
    final: { dmg: 18, angle: 86, base: 7.2, growth: 6.6 },
    colors: PAL_GLASS,
  },
};
