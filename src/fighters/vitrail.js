// VITRAIL - THE ROSE OF SEVEN HOURS: the great stained-glass window of the Sky Sanctum's chapel, broken by the falling
// star and reborn as a person. A spell-weaver built like Dota's Invoker: his side, down and up specials each set a
// coloured PANE in the rose of his head (FIRE, ICE, LIGHTNING - three slots, the oldest falls out), and his neutral
// special INVOKES the spell those three panes make (ten of them). Hard to play: every spell has to be built first.
// Data only - stats, sheets, every move's and every spell's numbers. Boxes are [x, y, w, h] from his feet facing right.
// Art: tools/sprites/vitrail_draw.py + tools/sprites/trio_moves.py; code: fighterVitrail.js; effects: src/fx/sfMagic.js
// (Sprite Fusion's fire, ice, lightning, poison, holy light, black hole, shield, energy, heal, power-up, sparkle,
// bubbles and slash).
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
  handOffset: { x: 14, y: -40 },    // his prism
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

  // TAUNT (1): THE ROSE TURNS - his whole head wheels round once, slowly, the prism held up to the light
  taunt: { name: 'THE ROSE TURNS', frames: 72, lines: ['SEVEN HOURS. ONE WINDOW.', 'I REMEMBER IN COLOUR.', 'MIND THE GLASS.', 'THE LIGHT GOES THROUGH ME.'],
    sounds: [[12, 'ding', 0.4, 1.2], [30, 'ding', 0.35, 1.5], [48, 'ding', 0.35, 1.8], [64, 'glass', 0.4, 1.4]] },

  moves: {
    ...DEFAULT_GRAB,
    ...tuned(NU.moves, { dmg: 0.95, kb: 0.95 }),   // (his own normals are plain on purpose: his power is in the spells)
    // ---- specials: fighterVitrail.js does them all (`show: true`)
    // INVOKE (neutral): with three panes set, casts their spell (`show.spells`, order doesn't matter) and empties the
    // rose. With fewer: REFRACT - a quick glass shard.
    neutralB: { frames: 40, show: true, castAt: 12, landLag: 10 },
    refract: { frames: 24, show: true, at: 7, landLag: 6, shard: { speed: 7.5, life: 38, hit: { dmg: 4, angle: 35, base: 2.0, growth: 1.8 } } },
    // KINDLE (side): a step and a palm of fire ahead - sets a FIRE pane. Burns for a moment. Once in the air.
    sideB: { frames: 30, show: true, at: 6, lunge: 3.2, landLag: 8, pane: 'F',
      hit: { dmg: 7, angle: 40, base: 3.0, growth: 3.4 }, box: [6, -50, 46, 48], burn: { left: 90, every: 30, dmg: 1 } },
    // RIME (down): both palms on the floor, ice bursts up round him - sets an ICE pane. Freezes them for a beat.
    downB: { frames: 32, show: true, at: 11, landLag: 8, pane: 'I', r: 42,
      hit: { dmg: 6, angle: 82, base: 3.2, growth: 3.0, stun: 16 } },
    // FULGURITE (up): he becomes a bolt of lightning and strikes `dist` px the way the stick points (up by default),
    // hitting everything along the line - sets a LIGHTNING pane. Helpless after, like any recovery.
    upb: { frames: 36, show: true, at: 6, travel: 7, dist: 124, pane: 'L',
      hit: { dmg: 6, angle: 70, base: 3.0, growth: 3.2 } },
  },

  // THE ROSE (fighterVitrail.js): three PANES, the spells they make, and RESONANCE - cast within `window` frames of
  // landing a hit and the spell is RESONANT: `mult` harder, and the light heals him `heal`%.
  show: { kind: 'vitrail', panes: 3, resonance: { window: 45, mult: 1.3, heal: 4 },
    colors: { F: 0xff7a2a, I: 0x8ae0ff, L: 0xffe45a },
    spells: {   // keyed by the panes in F, I, L order
      // FFF  INFERNO: a column of fire in front of him that burns and burns, then bursts
      FFF: { name: 'INFERNO', at: 40, w: 48, h: 96, len: 66, every: 12, tick: { dmg: 2, angle: 80, base: 1.6, growth: 0, stun: 14 },
        last: { dmg: 8, angle: 82, base: 4.0, growth: 5.2 } },
      // III  GLACIER: a line of ice spikes marching across the floor ahead of him; each freezes what it catches
      III: { name: 'GLACIER', count: 6, spacing: 28, every: 4, spike: { dmg: 4, angle: 80, base: 3.0, growth: 2.2, stun: 22 },
        last: { dmg: 8, angle: 70, base: 4.0, growth: 5.0 } },
      // LLL  TEMPEST: marks the floor under every foe - a beat later lightning strikes the marks (move, and it misses)
      LLL: { name: 'TEMPEST', warn: 37, w: 30, hit: { dmg: 13, angle: 75, base: 4.0, growth: 5.6 } },
      // FFI  STEAM: a cloud of bubbles ahead; whoever is in it floats up, helpless, nicked again and again
      FFI: { name: 'STEAM', at: 70, w: 96, h: 80, len: 150, every: 15, lift: -0.8, tick: { dmg: 1, angle: 90, base: 0.6, growth: 0, stun: 10 } },
      // FFL  PLASMA LANCE: a beam of white fire straight out of the prism, a long way
      FFL: { name: 'PLASMA LANCE', charge: 16, len: 40, reach: 270, every: 8, tick: { dmg: 2, angle: 10, base: 1.4, growth: 0, stun: 10 },
        last: { dmg: 7, angle: 30, base: 4.0, growth: 5.0 } },
      // FII  MIASMA (two ice, one fire): the lead in him melts into a poison cloud on the floor ahead - poisons and slows whoever walks in
      FII: { name: 'MIASMA', at: 60, w: 120, h: 50, len: 240, poison: { left: 180, every: 20, dmg: 1 } },
      // IIL  SHATTERGLASS: three cuts of broken glass in front of him, the last a killer
      IIL: { name: 'SHATTERGLASS', at: [0, 7, 14], box: [8, -60, 70, 62], cut: { dmg: 4, angle: 50, base: 1.6, growth: 0, stun: 14 },
        last: { dmg: 11, angle: 38, base: 4.4, growth: 6.4 } },
      // FLL  STARFIRE (two lightning, one fire): a star flares where the nearest foe stood when he cast it - a beat later it bursts
      FLL: { name: 'STARFIRE', delay: 54, r: 36, hit: { dmg: 12, angle: 60, base: 3.6, growth: 5.0, stun: 30 } },
      // ILL  AEGIS (two lightning, one ice): a shell of hexagonal light round him - nothing touches him, and whoever tries is shocked away
      ILL: { name: 'AEGIS', len: 110, r: 42, every: 20, zap: { dmg: 3, angle: 30, base: 4.0, growth: 1.0 } },
      // FIL  ECLIPSE (one of each): a black hole ahead of him drags everyone in, then collapses
      FIL: { name: 'ECLIPSE', at: 90, y: -56, len: 100, pull: 0.55, reach: 170, every: 15, tick: { dmg: 1, angle: 90, base: 0.4, growth: 0, stun: 12 },
        last: { dmg: 16, angle: 80, base: 5.0, growth: 6.4 }, r: 52 },
    } },

  // Limit: THE ROSE OF SEVEN HOURS. The sky darkens and the whole window hangs over the stage; its panes light one by
  // one, and each hour a shaft of light comes down on a foe (each holds them) - then the eighth, all at once, on everyone.
  // One foe: 7 x 3 + 18 = 39% and a huge launch.
  limit: {
    name: 'THE ROSE OF SEVEN HOURS', type: 'rose', frames: 150,
    darkTo: 16, firstAt: 30, every: 12, hours: 7, lastAt: 124,
    hour: { dmg: 3, angle: 90, base: 1.0, growth: 0, stun: 40 },
    final: { dmg: 18, angle: 86, base: 7.2, growth: 6.6 },
    colors: PAL_GLASS,
  },
};
