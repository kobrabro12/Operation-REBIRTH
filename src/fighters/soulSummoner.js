// Soul Summoner: fighter #1. Data only - stats, animation frames and every move's hitboxes.
// Boxes are [x, y, w, h] relative to the fighter's feet while facing right (negative y = up).
// angle: launch direction in degrees, 0 = forward, 90 = straight up, >90 = backwards, <0 = down.
// Knockback = base + growth * (target % after the hit) / 100, in pixels per frame.
import { BEAM_BLUE, PAL_BLUE } from './common.js';
import { SS_MOVES } from './ssMoves.js';

export const SOUL_SUMMONER = {
  id: 'soul-summoner',
  name: 'SOUL SUMMONER',
  // run: the designer's 8-frame run (tools/sprites/soul_summoner_run.py). The stride (frames 3-7) loops from
  // the first step; frames 0-2 (easing in from standing) are kept in the strip but not played. It replaced the older walk cycle (walk_sheet.png, still in the repo).
  sheets: { idle: 'ss_idle', juggle: 'ss_juggle', run: 'ss_run', jump: 'ss_jump', fall: 'ss_fall', moves: 'ss_moves' },
  // shop costumes with their own drawing (skins.js sheetSet): ECLIPSE, AURORA - tools/sprites/shop_costumes.py
  costumeSheets: Object.fromEntries(['eclipse', 'aurora'].map((s) => [s, Object.fromEntries(['idle', 'juggle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'ss_' + s + '_' + k]))])),
  // moves: every attack, special, grab, throw and reaction, animated (tools/sprites/soul_summoner_moves.py).
  // Bigger 112x104 frames so swings and steps can reach outside the body; his feet stand at (56, 94) in them.
  moveAnims: SS_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,          // feet sit on row 58 of the 64x64 frame
  handOffset: { x: 16, y: -39 },
  portrait: [12, 4, 40, 36],      // crop of the idle frame for the select grid
  fxColor: 0x78a0c6,
  swingSfx: 'flame',               // his swings crackle with soul-fire
  pal: PAL_BLUE,                  // ability colours for the default costume (other costumes: skins.paletteFor)
  body: { w: 24, h: 50 },
  headTop: 44,                     // top of the head above the feet (milestone crowns and halos sit here)
  weight: 1.0,
  walkSpeed: 3.0, runAccel: 0.55, groundFriction: 0.5,
  airSpeed: 2.7, airAccel: 0.24, airFriction: 0.04,
  jumpV: -9.0, shortHopV: -6.2, doubleJumpV: -8.6,

  // TAUNT (1): SOUL FLARE - thrusts his flame overhead, it swells and roars, then he beckons them in
  taunt: { name: 'SOUL FLARE', frames: 80, lines: ['COME, THEN.', 'YOUR SOUL IS MINE.', 'BURN BRIGHTLY.'],
    sounds: [[12, 'flame', 0.6, 1], [16, 'summon', 0.35, 1.4], [42, 'flame', 0.5, 1.2]],
    fx: [{ kind: 'wisp', from: 14, to: 46, every: 3, x: 6, y: -78, n: 2 }] },

  moves: {
    // ---- ground attacks (J + direction)
    jab: { frames: 18, lunge: 1.2, fx: 'jab', hits: [{ from: 4, to: 6, box: [6, -38, 30, 18], dmg: 3, angle: 35, base: 2.2, growth: 1.2 }] },
    ftilt: { frames: 28, lunge: 3.2, fx: 'arc', hits: [{ from: 7, to: 10, box: [4, -44, 46, 30], dmg: 10, angle: 38, base: 3.0, growth: 6.4 }] },
    utilt: { frames: 26, fx: 'up', hits: [{ from: 5, to: 10, box: [-22, -78, 44, 36], dmg: 8, angle: 88, base: 3.2, growth: 6.0 }] },
    dtilt: { frames: 20, fx: 'low', hits: [{ from: 4, to: 7, box: [4, -14, 44, 14], dmg: 6, angle: 22, base: 2.6, growth: 3.6 }] },
    // ---- smash attacks (tap a direction and attack together): slower, and they KO
    // Soul Flare: the flame drawn back to the chest, then shoved forward as a roaring burst
    fsmash: { frames: 48, lunge: 1.6, fx: 'thrust', hits: [{ from: 17, to: 19, box: [8, -50, 48, 36], dmg: 15, angle: 38, base: 4.0, growth: 7.0 }] },
    // Pyre: the flame thrust overhead into a pillar of soul-fire
    usmash: { frames: 42, fx: 'up', hits: [{ from: 13, to: 19, box: [-22, -104, 44, 66], dmg: 15, angle: 88, base: 4.2, growth: 7.6 }] },
    // Grave Sweep: crouches and sweeps the flame in a ring along the floor - hits both sides
    dsmash: { frames: 42, fx: 'low2', hits: [{ from: 11, to: 16, box: [-50, -18, 100, 20], dmg: 12, angle: 28, base: 3.6, growth: 6.6 }] },
    // ---- aerials (J in the air)
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 13, box: [-26, -52, 52, 48], dmg: 7, angle: 45, base: 2.8, growth: 4.0 }] },
    fair: { frames: 28, landLag: 9, fx: 'arc', hits: [{ from: 7, to: 10, box: [4, -48, 40, 34], dmg: 11, angle: 40, base: 3.0, growth: 6.2 }] },
    bair: { frames: 26, landLag: 9, fx: 'back', hits: [{ from: 6, to: 9, box: [-46, -44, 38, 28], dmg: 12, angle: 145, base: 3.2, growth: 6.4 }] },
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 5, to: 9, box: [-24, -84, 48, 36], dmg: 8, angle: 86, base: 3.0, growth: 5.8 }] },
    dair: { frames: 32, landLag: 13, fx: 'down', hits: [{ from: 9, to: 12, box: [-16, -12, 32, 26], dmg: 11, angle: -78, base: 3.0, growth: 4.2 }] },
    // ---- grab (I) and throws
    grab: { frames: 26, fx: 'grab', grab: true, hits: [{ from: 5, to: 7, box: [4, -40, 28, 26] }] },
    throws: {
      forward: { dmg: 8, angle: 40, base: 4.0, growth: 4.6 },
      back: { dmg: 10, angle: 140, base: 4.2, growth: 5.0 },
      up: { dmg: 9, angle: 90, base: 4.0, growth: 4.8 },
      down: { dmg: 6, angle: 75, base: 3.2, growth: 2.6 },
    },
    // ---- specials (K)
    // Neutral special: fireball. Hold K to charge (full at 84 frames = when the charge sound's chime rings).
    fireball: { chargeMax: 84, minDmg: 4, maxDmg: 14, speed: 4.6, life: 90 },
    // Side special: Soul Hex - a short-range curse. A cursed opponent loses control and walks toward the
    // nearest edge of the stage for up to 2.5 s. They break free sooner by mashing buttons (wiggling).
    sideB: { frames: 34, fx: 'hex', fxTint: 0x6d26bd, hits: [{ from: 9, to: 13, box: [8, -46, 44, 38], dmg: 3, angle: 20, base: 0.8, growth: 0, stun: 10, possess: 120 }] },
    // Down special: raise a soul from the grave (max 2 at once).
    summon: { frames: 40, spawnAt: 20, maxSouls: 2, cooldown: 60 },
    // Up special: Soulfire Jet - he blasts blue flames out below his feet and rides them upward.
    // Hold left/right to steer. The jet burns anyone underneath (light hits that drag them down),
    // and a burst at the top pops away anyone next to him. Helpless until landing afterwards.
    upb: {
      frames: 44, riseAt: 6, drift: 3.6, kick: -5,
      // how long the jet burns (frames), how hard it pushes each frame, and its top speed upward
      jet: { from: 6, to: 32, thrust: 1.2, maxRise: -10 },
      hits: [
        { from: 6, to: 8, box: [-13, 0, 26, 50], dmg: 2, angle: -80, base: 1.2, growth: 0, stun: 8 },
        { from: 12, to: 14, box: [-13, 0, 26, 50], dmg: 2, angle: -80, base: 1.2, growth: 0, stun: 8 },
        { from: 18, to: 20, box: [-13, 0, 26, 46], dmg: 2, angle: -80, base: 1.2, growth: 0, stun: 8 },
        { from: 24, to: 26, box: [-13, 0, 26, 40], dmg: 2, angle: -80, base: 1.2, growth: 0, stun: 8 },
        { from: 30, to: 33, box: [-22, -58, 44, 62], dmg: 4, angle: 80, base: 3.2, growth: 4.0 },
      ],
    },
  },

  // Limit (O, unlocked after taking 100%): Soulfire Beam - a beam of blue fire from his hand, straight ahead.
  // Five quick hits hold opponents in the beam, then a final blast launches them: 8+8+8+8+8+10 = 50%.
  limit: {
    // the beam fires a beat after the Limit freeze ends, so a sharp opponent can still jump it
    name: 'SOULFIRE BEAM', frames: 118, beamStart: 42, beamEnd: 104, beamLength: 720, beamHalf: 20, colors: BEAM_BLUE,
    hits: [
      { at: 46, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 56, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 66, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 76, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 86, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 98, dmg: 10, angle: 32, base: 4.6, growth: 5.6 },
    ],
  },
};
