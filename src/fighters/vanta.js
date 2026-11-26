// VANTA: a neon street samurai - GNASH's kind of fighter (black clothes outlined in neon, a meter that unlocks a
// cinematic power) with a katana and a bag of experimental tricks. Data only - stats, sheets, every move's numbers.
// Boxes are [x, y, w, h] from his feet facing right (negative y = up).
// Art: tools/sprites/vanta_draw.py + tools/sprites/trio_moves.py; code: fighterVanta.js; effects: src/fx/sfSlash.js
// (the neon blade effects) and src/fx/sfMovement.js (the Sprite Fusion dash and blink).
import { DEFAULT_GRAB } from './common.js';
import { NU } from './nu.js';
import { tuned } from './moveTune.js';
import { VT_MOVES } from './vtMoves.js';

// his colours: cyan neon outline, magenta visor
export const PAL_NEON = { outline: 0x07060e, deep: 0x0a6a8a, mid: 0x3af0ff, light: 0xa8faff, core: 0xffffff, shade: 0x1c1c26, void: 0x07060e, accent: 0xff2ad8 };

const SETS = ['redline', 'glitch'];

export const VANTA = {
  id: 'vanta',
  name: 'VANTA',
  sheets: { idle: 'vt_idle', run: 'vt_run', jump: 'vt_jump', fall: 'vt_fall', moves: 'vt_moves' },
  costumeSheets: Object.fromEntries(SETS.map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'vt_' + s + '_' + k]))])),
  runCycle: [0, 8],
  moveAnims: VT_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -34 },
  portrait: [16, 0, 36, 32],
  fxColor: 0x3af0ff,
  swingSfx: 'swing',
  pal: PAL_NEON,
  body: { w: 20, h: 50 },
  headTop: 56,
  tagY: 66,
  weight: 0.92,                     // light and quick
  walkSpeed: 3.5, runAccel: 0.7, groundFriction: 0.6,
  airSpeed: 3.1, airAccel: 0.3, airFriction: 0.04,
  jumpV: -9.6, shortHopV: -6.4, doubleJumpV: -9.0,

  // TAUNT (1): BLADE SPIN - three spins of the katana round his hand and a slow, smug sheathe (click)
  taunt: { name: 'BLADE SPIN', frames: 72, lines: ['TOO SLOW.', 'SYSTEM: ONLINE.', 'LAG HARDER.', 'CTRL + Z.'],
    sounds: [[18, 'whoosh', 0.3, 1.8], [28, 'whoosh', 0.3, 2.0], [38, 'whoosh', 0.3, 2.2], [64, 'clang', 0.4, 2.2]] },

  moves: {
    ...DEFAULT_GRAB,
    ...tuned(NU.moves, { dmg: 1, kb: 0.98, reach: 6 }),   // (his normals reach a little further: the katana)
    // ---- specials: fighterVanta.js does them all (`show: true`)
    // IAI (neutral): HOLD to sink into a draw stance - a ring closes in on him; LET GO to cut. Release while the ring
    // flashes (the PERFECT window) for a PERFECT DRAW: a cut across `perfectReach` px, everything hit freezes, and his
    // SYNC jumps. Early: a quick cut that grows with the hold. Held to `max`: it cuts by itself.
    neutralB: { frames: 24, show: true, max: 90, perfect: [30, 38], landLag: 6,
      cut: { dmg: 8, angle: 40, base: 3.0, growth: 4.6 }, cutGrow: { dmg: 5, growth: 2.0 }, reach: 72,
      perfectCut: { dmg: 18, angle: 38, base: 4.6, growth: 7.0 }, perfectReach: 190, freeze: 16, sync: 30 },
    iaicut: { frames: 26, show: true, at: 3, landLag: 8 },
    // GHOST DASH (side): a Sprite Fusion dash `dist` px the way the stick points (8 ways). Press special again
    // during `chain` to dash again - up to `max` in a row (per airtime). Each dash leaves an ECHO of him behind; when
    // the chain ends every echo cuts along the path it left - all at once.
    sideB: { frames: 30, show: true, dashAt: 3, dashFor: 7, dist: 92, chain: [10, 24], max: 3, landLag: 10,
      echo: { delay: 22, dmg: 5, angle: 50, base: 2.4, growth: 2.8, last: { dmg: 7, angle: 45, base: 3.4, growth: 4.6 } } },
    // NEON WIRE (up): fires a wire the way the stick points (up-and-ahead by default). It latches onto a platform's
    // edge or top and zips him there (no helpless fall), or onto an opponent - who's yanked in for a cut. Misses: helpless.
    upb: { frames: 36, show: true, fireAt: 5, speed: 18, range: 160, zip: 13,
      yank: { dmg: 9, angle: 80, base: 4.0, growth: 4.0 }, zipHit: { dmg: 5, angle: 70, base: 2.6, growth: 2.0 } },
    // SAVE STATE (down): the first press leaves a glitching save point where he stands (for `life` frames). The next
    // press REWINDS him back to it - a blink along a cutting glitch trail - and undoes `heal` of the damage he took since.
    downB: { frames: 30, show: true, at: 14, landLag: 6, save: { life: 600, heal: 0.5, cooldown: 120,
      trail: { dmg: 9, angle: 60, base: 3.2, growth: 4.0 } } },
  },

  // SYNC (his meter, on his player plate) and OVERCLOCK (fighterVanta.js): hits he lands and takes fill SYNC; full, his
  // next special plays the OVERCLOCK cut-in and he OVERCLOCKS for `time` frames - everyone else at half speed, his own
  // attacks leaving ECHO cuts a beat later, his speed and damage up.
  show: { kind: 'vanta', sync: { max: 100, perDealt: 1.0, perHurt: 0.6, time: 300, echoDelay: 18, echoDmg: 0.4, speed: 1.15, dmg: 1.1, cut: 44 } },

  // Limit: BLACKOUT. The lights die. In the dark only neon shows - he's gone, and then he's beside each foe in turn,
  // cut after cut (each holds them), back where he started... and he sheathes his blade. Click: every cut lands at once.
  // One foe: 3 x 4 + 22 = 34% and a huge launch.
  limit: {
    name: 'BLACKOUT', type: 'blackout', frames: 150,
    darkTo: 14, goAt: 40, every: 8, cutsEach: 3, backAt: 110, clickAt: 140,
    cut: { dmg: 4, angle: 80, base: 1.0, growth: 0, stun: 60 },
    final: { dmg: 22, angle: 42, base: 7.4, growth: 7.0 },
    colors: PAL_NEON,
  },
};
