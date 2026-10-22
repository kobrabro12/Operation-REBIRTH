// AERO: a TEST FIGHTER made entirely out of the Frutiger Aero look - glossy glass and plastic, aqua sky,
// fresh grass green, bubbles, lens flares, and a goldfish in a fishbowl helmet (the goldfish is in charge).
// Data only. Art: tools/sprites/aero_draw.py; animation: tools/sprites/aero_moves.py.
import { DEFAULT_GRAB } from './common.js';
import { AERO_MOVES } from './aeroMoves.js';

export const PAL_AQUA = { outline: 0x0d3550, deep: 0x1a7fb0, mid: 0x3fc8ea, light: 0x9ff0ff, core: 0xffffff, shade: 0x0e4a6a, void: 0x04121c };

export const AERO = {
  id: 'aero',
  name: 'AERO',
  sheets: { idle: 'aero_idle', run: 'aero_run', jump: 'aero_jump', fall: 'aero_fall', moves: 'aero_moves' },
  runCycle: [0, 8],
  moveAnims: AERO_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -36 },   // in front of his gloves: where bubbles are blown from
  portrait: [16, 2, 36, 32],
  fxColor: 0x9ff0ff,
  swingSfx: 'swing',
  pal: PAL_AQUA,
  body: { w: 20, h: 50 },
  headTop: 54,
  tagY: 64,
  weight: 0.94,                     // light and floaty
  walkSpeed: 3.0, runAccel: 0.55, groundFriction: 0.45,
  airSpeed: 3.0, airAccel: 0.28, airFriction: 0.03,
  jumpV: -9.6, shortHopV: -6.4, doubleJumpV: -9.2,

  // TAUNT (1): FISHBOWL BOOGIE - a bubbly side-to-side dance, a twirl (the goldfish does a flip) and a big V
  taunt: { name: 'FISHBOWL BOOGIE', frames: 90, lines: ['STAY HYDRATED!', 'SO FRESH.', 'BLUB BLUB!'],
    sounds: [[6, 'item', 0.3, 1.6], [26, 'item', 0.3, 1.8], [49, 'djump', 0.5, 1.4], [62, 'item', 0.5, 2.2]],
    fx: [{ kind: 'bubble', from: 6, to: 84, every: 6, x: 0, y: -46, n: 2 }] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks
    jab: { frames: 20, fx: 'bubble', hits: [{ from: 4, to: 6, box: [8, -44, 32, 22], dmg: 4, angle: 40, base: 2.4, growth: 1.8 }] },                 // BUBBLE POP
    ftilt: { frames: 28, fx: 'aurora', hits: [{ from: 10, to: 14, box: [6, -58, 50, 46], dmg: 9, angle: 38, base: 3.0, growth: 6.0 }] },             // AURORA SWOOSH
    utilt: { frames: 24, fx: 'up', hits: [{ from: 7, to: 13, box: [-22, -94, 44, 44], dmg: 7, angle: 88, base: 3.2, growth: 5.4 }] },               // FOUNTAIN
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.6 }] },                 // GRASS SWEEP
    // SLIP N' SLIDE (attack at a full run): belly-flops onto a sheet of water and slides along it, popping them up
    dashAttack: { frames: 36, fx: 'low', slide: { from: 4, to: 24, vx: 7.6, dust: 0x9ff0ff }, hits: [
      { from: 4, to: 8, box: [0, -26, 46, 26], dmg: 8, angle: 70, base: 3.0, growth: 4.6 },
      { from: 9, to: 22, box: [4, -22, 40, 22], dmg: 4, angle: 75, base: 2.6, growth: 2.4 },
    ] },
    // ---- smash attacks
    fsmash: { frames: 46, lunge: 1.4, fx: 'flare', hits: [{ from: 18, to: 21, box: [8, -52, 52, 36], dmg: 15, angle: 36, base: 4.2, growth: 7.4 }] },   // LENS FLARE
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 20, box: [-30, -104, 60, 80], dmg: 14, angle: 88, base: 4.2, growth: 7.4 }] },          // GEYSER
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 15, to: 19, box: [-56, -14, 112, 16], dmg: 12, angle: 30, base: 3.8, growth: 6.8 }] },        // RIPPLE
    // ---- aerials
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-28, -58, 56, 54], dmg: 8, angle: 45, base: 2.8, growth: 4.2 }] },   // BUBBLE SPIN
    fair: { frames: 26, landLag: 8, fx: 'arc', hits: [{ from: 8, to: 12, box: [6, -50, 44, 40], dmg: 10, angle: 40, base: 3.0, growth: 6.0 }] },     // a raindrop chop
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-42, -42, 36, 26], dmg: 11, angle: 145, base: 3.2, growth: 6.2 }] },
    // BUBBLE STREAM: blows a column of bubbles straight up - four little pops that carry them, then a big one
    uair: { frames: 30, landLag: 7, multi: true, stream: { from: 6, to: 22, every: 3 }, hits: [
      { from: 7, to: 8, box: [-22, -100, 44, 48], dmg: 1, angle: 90, base: 1.4, growth: 0, stun: 8 },
      { from: 10, to: 11, box: [-22, -104, 44, 50], dmg: 1, angle: 90, base: 1.4, growth: 0, stun: 8 },
      { from: 13, to: 14, box: [-22, -108, 44, 52], dmg: 1, angle: 90, base: 1.4, growth: 0, stun: 8 },
      { from: 16, to: 17, box: [-22, -112, 44, 54], dmg: 1, angle: 90, base: 1.4, growth: 0, stun: 8 },
      { from: 20, to: 22, box: [-26, -118, 52, 58], dmg: 6, angle: 86, base: 3.2, growth: 5.4 },
    ] },
    dair: { frames: 34, landLag: 13, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 11, angle: -80, base: 3.0, growth: 4.2 }] },  // RAINDROP: a spike
    // ---- specials
    // BUBBLE TRAP (neutral): blows a big bubble that drifts forward; whoever it touches is sealed inside
    // and floats up helplessly for a moment before it pops
    neutralB: { frames: 30, spawnAt: 12, bubble: { speed: 2.6, life: 110, r: 11, hit: { dmg: 4, angle: 90, base: 0.6, growth: 0, stun: 48, bubble: 48 } } },
    // GOLDFISH FLING (side): flicks his head and the goldfish leaps out of the bowl, arcing forward on a
    // ribbon of water, then swims back home - it hits going out, and again on the way back (tugging them
    // toward AERO). One fish at a time: no side special until it's home.
    sideB: { frames: 30, spawnAt: 9, fish: {
      speed: 8.0, decel: 0.22, lift: 0.7, grav: 0.06, outTime: 32, returnSpeed: 4,
      out: { dmg: 7, angle: 40, base: 3.0, growth: 3.8 },
      back: { dmg: 4, angle: 25, base: 2.6, growth: 0.6, stun: 18 },
    } },
    // BUBBLE RIDE (up): floats upward inside a bubble, steering freely, until it pops around him
    upb: { frames: 40, riseAt: 6, riseV: -9.6, drift: 3.2, bubble: true, popAt: 30, hits: [
      { from: 8, to: 9, box: [-24, -48, 48, 52], dmg: 2, angle: 85, base: 1.6, growth: 0, stun: 8 },
      { from: 16, to: 17, box: [-24, -48, 48, 52], dmg: 2, angle: 85, base: 1.6, growth: 0, stun: 8 },
      { from: 30, to: 32, box: [-30, -54, 60, 62], dmg: 6, angle: 75, base: 3.6, growth: 4.8 },
    ] },
    // DESKTOP (down): sets a glossy computer down on the floor ahead. While AERO stays near one he's POWERED
    // UP: +10% damage, +10% speed, higher jumps, and he takes less damage and knockback. Opponents can smash
    // it (24 HP). Two at most - a third replaces the oldest. With two out, his Limit becomes FULL AERO.
    downB: { frames: 30, spawnAt: 12, pc: { ahead: 30, hp: 24, radius: 120, max: 2 } },
  },

  // Limit: SCREENSAVER. He spreads his arms and the whole screen goes glossy - aqua light, ribbons,
  // goldfish swimming through the sky - as a fan of giant bubbles drifts out both ways. Anyone caught is
  // sealed in and carried up into the sky, then every caught bubble pops at once in a lens flare.
  // The bubbles are slow: dodge them, jump over them, or airdodge through.
  limit: {
    name: 'SCREENSAVER', type: 'screensaver', reach: 300, frames: 120, releaseAt: 40, popAt: 100,
    count: 4, spread: 54, speed: 3.6, life: 70, topY: -150,
    trap: { dmg: 5, angle: 90, base: 0, growth: 0, stun: 999 },
    pop: { dmg: 18, angle: 80, base: 5.2, growth: 5.8 },
    colors: PAL_AQUA,
  },
  // FULL AERO: his Limit with two computers out. They pour their power into him, a blast hits everyone
  // near him for 30%, GOING FULL AERO appears, the stage turns Frutiger Aero and he transforms - for good,
  // until he's KO'd.
  altLimit: {
    name: 'FULL AERO', frames: 100, blastAt: 50, radius: 170,
    duration: Infinity,             // frames he stays FULL AERO (Infinity = until he's KO'd)
    blast: { dmg: 30, angle: 70, base: 6.0, growth: 5.4, radial: true },
  },
};

// FULL AERO's GOLDEN SPEAR: his normal attacks are spear thrusts and sweeps now. Each one's hitbox grows the
// way the attack points (forward, up, down, back or both ways) and hits harder.
const SPEAR = {
  reach: 22,                        // extra reach in pixels
  dmg: 1.25,                        // damage multiplier (tiny 1% multi-hits stay as they are)
  fx: { f: 'spear', up: 'spearUp', down: 'spearDown', back: 'spearBack', both: 'spearSpin' },   // the golden swoosh each one draws
  dir: { jab: 'f', ftilt: 'f', dtilt: 'f', dashAttack: 'f', fsmash: 'f', fair: 'f', nair: 'both', dsmash: 'both', utilt: 'up', usmash: 'up', uair: 'up', bair: 'back', dair: 'down' },
};
function spearMove(m, dir) {
  const r = SPEAR.reach;
  return { ...m, hits: m.hits.map((h) => {
    let [x, y, w, hh] = h.box;
    if (dir === 'f') w += r; else if (dir === 'back') { x -= r; w += r; } else if (dir === 'both') { x -= r; w += 2 * r; }
    else if (dir === 'up') { y -= r; hh += r; } else if (dir === 'down') hh += r;
    return { ...h, box: [x, y, w, hh], dmg: h.dmg > 1 ? Math.round(h.dmg * SPEAR.dmg) : h.dmg };
  }), fx: SPEAR.fx[dir], bubble: undefined, stream: undefined, slide: m.slide && { ...m.slide, dust: 0xf3c358 } };
}

// AERO in FULL AERO: winged, haloed, crowned, with a golden spear (tools/sprites/aero_king_draw.py), every
// stat boosted (Fighter.aeroLevel), every normal attack a spear attack and every special upgraded.
export const AERO_FULL = {
  ...AERO,
  swingSfx: 'whoosh',
  sheets: { idle: 'aero_king_idle', run: 'aero_king_run', jump: 'aero_king_jump', fall: 'aero_king_fall', moves: 'aero_king_moves' },
  // his spear attacks (k_* in aero_moves.py) in place of the normal ones
  moveAnims: { ...AERO_MOVES, upb: AERO_MOVES.upb_king, ...Object.fromEntries(Object.keys(SPEAR.dir).map((k) => [k, AERO_MOVES['k_' + k]])) },
  // he floats: falls slowly and hovers a little off the ground
  float: { gravity: 0.5, maxFall: 3.2, hover: 7 },
  moves: {
    ...AERO.moves,
    ...Object.fromEntries(Object.entries(SPEAR.dir).map(([k, d]) => [k, spearMove(AERO.moves[k], d)])),
    // BUBBLE TRAP: blown out much faster, and the bubble holds them twice as long
    neutralB: { frames: 18, spawnAt: 7, bubble: { speed: 3.8, life: 110, r: 12, hit: { dmg: 5, angle: 90, base: 0.6, growth: 0, stun: 96, bubble: 96 } } },
    // GOLDFISH FLING: two fish at once
    sideB: { ...AERO.moves.sideB, fish: { ...AERO.moves.sideB.fish, twin: true } },
    // BUBBLE RIDE: floats up much faster, and for much longer
    upb: { ...AERO.moves.upb, frames: 56, floatV: -5.4, drift: 4.2, popAt: 46, hits: [
      ...AERO.moves.upb.hits.slice(0, 2),
      { from: 46, to: 48, box: [-34, -58, 68, 68], dmg: 8, angle: 75, base: 4.0, growth: 5.0 },
    ] },
    // CD STORM: a golden-lined cloud above him sprays CDs at the nearest opponent - 5% each, fast
    // (each opponent can take one CD every 12 frames, so it tops out around 25% a second)
    downB: { frames: 24, spawnAt: 8, cdcloud: { ahead: 10, height: 112, life: 150, every: 4, window: 12, spread: 0.35,
      cd: { speed: 7, dmg: 5, angle: 40, base: 2.8, growth: 1.4, stun: 12 } } },
  },
};
AERO.fullAero = AERO_FULL;
