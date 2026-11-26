// MADAME MOTH: a fortune teller with moth wings, who reads the cards mid-fight. Data only - stats, sheets, every
// move's numbers. Boxes are [x, y, w, h] from her feet facing right (negative y = up).
// Art: tools/sprites/moth_draw.py + tools/sprites/trio_moves.py; code: fighterMoth.js.
// FORTUNE: down special DRAWS a tarot card (shown over her head and on her player plate), neutral special CASTS it.
import { DEFAULT_GRAB } from './common.js';
import { NU } from './nu.js';
import { tuned } from './moveTune.js';
import { MT_MOVES } from './mtMoves.js';

// her colours: plum velvet and candle gold
export const PAL_MOTH = { outline: 0x1a0a1e, deep: 0x5a2a6a, mid: 0xb070c8, light: 0xf0c060, core: 0xfff4d0, shade: 0x2a1030, void: 0x120612 };

const SETS = ['luna', 'deathshead'];

export const MOTH = {
  id: 'moth',
  name: 'MADAME MOTH',
  sheets: { idle: 'mt_idle', run: 'mt_run', jump: 'mt_jump', fall: 'mt_fall', moves: 'mt_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'mt_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: MT_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -38 },    // her cards
  portrait: [16, 0, 36, 32],
  fxColor: 0xf0c060,
  swingSfx: 'swing',
  pal: PAL_MOTH,
  body: { w: 22, h: 50 },
  headTop: 56,
  tagY: 66,
  weight: 0.96,
  walkSpeed: 3.1, runAccel: 0.58, groundFriction: 0.55,
  airSpeed: 2.8, airAccel: 0.26, airFriction: 0.04,
  jumpV: -9.0, shortHopV: -6.2, doubleJumpV: -8.6,

  // TAUNT (1): THE READING - fans her cards, peers into them, and smiles knowingly
  taunt: { name: 'THE READING', frames: 72, lines: ['I SEE... A LOSS. YOURS.', 'THE CARDS NEVER LIE.', 'CROSS MY PALM, DEAR.', 'YOUR FUTURE IS SHORT.'],
    sounds: [[6, 'petal', 0.4, 1.4], [40, 'ding', 0.3, 1.2]],
    fx: [{ kind: 'wisp', from: 10, to: 60, every: 6, x: 10, y: -40, n: 1, colors: [0xf0c060, 0xb070c8] }] },

  moves: {
    ...DEFAULT_GRAB,
    ...tuned(NU.moves, { dmg: 1, kb: 1 }),
    // ---- specials (FORTUNE): fighterMoth.js does them all (`show: true`)
    // CAST (neutral): plays the card she holds (see `cards` below). Without one: a flash of her palm
    neutralB: { frames: 32, show: true, castAt: 14, landLag: 8, palm: { dmg: 6, angle: 45, base: 2.8, growth: 3.0 }, palmR: 22 },
    // CARD FAN (side): three cards flung in a fan - they spin through the air and slice
    sideB: { frames: 30, show: true, spawnAt: 10, landLag: 8, fan: { n: 3, spread: 12, speed: 7, life: 34,
      hit: { dmg: 4, angle: 40, base: 2.2, growth: 2.8 } } },
    // MOTH FLIGHT (up): her wings open and beat her up into the sky (the beats hit), then she glides down slowly
    upb: { frames: 30, show: true, riseFrom: 4, riseTo: 24, riseV: -6.6, drift: 2.4, glide: 1.6, hits: [
      { from: 6, to: 10, box: [-24, -54, 48, 46], dmg: 4, angle: 85, base: 2.4, growth: 0, stun: 10 },
      { from: 16, to: 20, box: [-26, -62, 52, 52], dmg: 6, angle: 80, base: 3.4, growth: 4.6 },
    ] },
    // DRAW (down): turns over the top card of her deck - a new FORTUNE (never the same card twice running)
    downB: { frames: 34, show: true, drawAt: 16, landLag: 6 },
  },

  // the deck (fighterMoth.js): what each card does when she CASTS it
  show: { kind: 'moth', cards: {
    // THE TOWER: lightning strikes the nearest foe (a warning flicker first)
    tower: { name: 'THE TOWER', color: 0x9ad8ff, warn: 14, bolt: { dmg: 13, angle: 80, base: 3.8, growth: 5.8 } },
    // THE SUN: heals her and flares around her
    sun: { name: 'THE SUN', color: 0xffd060, heal: 10, r: 46, burst: { dmg: 6, angle: 60, base: 3.0, growth: 3.0 } },
    // THE MOON: she fades from sight for `time` frames; her next hit lands 20% harder
    moon: { name: 'THE MOON', color: 0xc8d0ff, time: 180, dmg: 1.2 },
    // THE STAR: a falling star drops onto the nearest foe
    star: { name: 'THE STAR', color: 0xfff0a0, from: 230, speed: 7, star: { dmg: 10, angle: 70, base: 3.2, growth: 5.0 }, r: 26 },
    // DEATH: her next hit (within `time`) knocks 60% further
    death: { name: 'DEATH', color: 0xe0e0e0, time: 600, kb: 1.6 },
    // THE FOOL: a coin toss - a huge burst round her, or it blows up in her face
    fool: { name: 'THE FOOL', color: 0x9fe08a, r: 60, burst: { dmg: 14, angle: 50, base: 5.0, growth: 6.0 }, backfire: 8 },
  } },

  // Limit: THE WHEEL. A giant wheel of fortune rises behind her and spins; where it stops is what everyone gets -
  // JACKPOT (25% + a launch), STORM (three bolts on each foe), FORTUNE (she heals 30% and stars fall on them) or
  // MISFORTUNE (every foe cursed, and hurt).
  limit: {
    name: 'THE WHEEL', type: 'wheel', frames: 160,
    riseTo: 20, spinTo: 96, resultAt: 104,
    jackpot: { dmg: 25, angle: 55, base: 7.0, growth: 6.4 },
    storm: { at: [110, 122, 134], hit: { dmg: 8, angle: 80, base: 1.4, growth: 0, stun: 14 }, last: { dmg: 8, angle: 80, base: 5.0, growth: 5.0 } },
    fortune: { heal: 30, star: { dmg: 12, angle: 75, base: 4.0, growth: 5.0 } },
    misfortune: { curse: 420, hit: { dmg: 10, angle: 60, base: 2.4, growth: 2.0 } },
    colors: PAL_MOTH,
  },
};
