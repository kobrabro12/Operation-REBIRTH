// Lacy: fighter #3 (code id 'hero-knight'). A grey-armoured swordsman with a white scarf (sprites: the Hero Knight asset
// pack, CC0). Animated from the pack's own strips instead of the shared pose frames:
//   idle = Idle, run = Run, neutral special = Attack1, jab = Attack2, jump = Jump, fall = Fall,
//   any hit taken = Take Hit, and Death plays only when her stamina runs out in a Stamina battle.
// Only the jab and neutral special are designed so far. Every other move is a PLACEHOLDER that reuses
// those two sword animations until her real moves are designed.
import { DEFAULT_GRAB, PAL_CYAN } from './common.js';
import { HK_MOVES } from './hkMoves.js';

// Limit beam colours: steel and white
const BEAM_STEEL = { outline: 0x14181c, deep: 0x4c5a5f, mid: 0x929ca0, light: 0xc9c9c9, core: 0xffffff };

export const HERO_KNIGHT = {
  id: 'hero-knight',
  name: 'LACY',
  // every strip is 150x90 per frame, feet at (66, 86) inside the frame
  sheets: { idle: 'hk_idle', run: 'hk_run', attack1: 'hk_attack1', attack2: 'hk_attack2', jump: 'hk_jump', fall: 'hk_fall', hit: 'hk_hit', death: 'hk_death', guard: 'hk_guard', grab: 'hk_grab',
    // the same movement strips without her sword, while it's out spinning (tools/sprites/hero_knight_unarmed.py)
    idle_u: 'hk_idle_u', run_u: 'hk_run_u', jump_u: 'hk_jump_u', fall_u: 'hk_fall_u', hit_u: 'hk_hit_u',
    // her own tilts and aerials (tools/sprites/hero_knight_moves.py): bigger 180x140 frames, feet at (81, 111)
    moves: 'hk_moves' },
  moveAnims: HK_MOVES, movesOrigin: [81 / 180, 111 / 140],
  // BATTLE-WORN costume: the armour cracks a little more each time she loses a stock
  // (tools/sprites/hero_knight_worn.py). Stage 0 is her normal look.
  wornSheets: [0, 1, 2, 3].map((w) => Object.fromEntries(['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard', 'grab', 'idle_u', 'run_u', 'jump_u', 'fall_u', 'hit_u', 'moves']
    .map((k) => [k, w ? 'hk_w' + w + '_' + k : 'hk_' + k]))),
  // SAMURAI costume: her own strips with red samurai armour and a katana (tools/sprites/hero_knight_samurai.py)
  // OBSIDIAN / CYBERBLADE (shop costumes): tools/sprites/shop_costumes.py
  // AKATSUKI costume: crimson tunic, leather belt, cloth boots and a crystal sword (tools/sprites/hero_knight_akatsuki.py)
  costumeSheets: Object.fromEntries([['samurai', 'hk_sam_'], ['akatsuki', 'hk_aka_'], ['obsidian', 'hk_obs_'], ['cyber', 'hk_cyb_']].map(([set, pre]) => [set,
    Object.fromEntries(['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard', 'grab', 'idle_u', 'run_u', 'jump_u', 'fall_u', 'hit_u', 'moves'].map((k) => [k, pre + k]))])),
  frameCounts: { idle: 11, run: 8, attack1: 7, attack2: 7, jump: 3, fall: 3, hit: 4, death: 11, guard: 1, grab: 10, idle_u: 11, run_u: 8, jump_u: 3, fall_u: 3, hit_u: 4 },
  ownAnims: true,                 // drawn with the strips above (see Fighter.animFrame)
  originX: 66 / 150, originY: 86 / 90,
  handOffset: { x: 20, y: -30 },
  portrait: [46, 34, 40, 36],
  fxColor: 0xc9c9c9,
  swingSfx: 'slash', hitSfx: 'clang',   // steel swishes, and steel ringing when they land
  pal: PAL_CYAN,                  // her spin ring and the glow of her Limit blade
  body: { w: 22, h: 48 },
  headTop: 46,
  tagY: 60,
  weight: 1.0,
  walkSpeed: 3.3, runAccel: 0.6, groundFriction: 0.55,
  airSpeed: 2.8, airAccel: 0.25, airFriction: 0.04,
  jumpV: -9.2, shortHopV: -6.3, doubleJumpV: -8.8,

  // TAUNT (1): BLADE SALUTE - two quick spins, then the sword raised straight up and a glint off the tip
  taunt: { name: 'BLADE SALUTE', frames: 66, lines: ['EN GARDE!', 'FOR HONOR.', 'READY WHEN YOU ARE.'],
    sounds: [[2, 'whoosh', 0.4, 1.3], [9, 'whoosh', 0.4, 1.5], [26, 'shing', 0.5, 1.2]],
    fx: [{ kind: 'star', from: 26, to: 50, every: 6, x: -30, y: -72, n: 1, colors: [0xffffff] }] },

  moves: {
    // ---- designed
    // Jab (Attack2): the sword is drawn back, then a big rising cut in front. 7 frames x 4 ticks.
    jab: { frames: 28, anim: 'attack2', hits: [{ from: 12, to: 18, box: [10, -76, 66, 74], dmg: 5, angle: 40, base: 2.6, growth: 2.4 }] },
    // Neutral special: Grand Slam - a chargeable home-run swing. Hold the button to wind the sword back
    // while sparks spray from the blade's tip (a full charge takes 3 s; the sparks turn gold and it
    // flashes), release whenever you like to swing (Attack2's big rising cut) - so it can be used again
    // and again with quick partial charges. Always 20%; the knockback grows with the charge, and a full
    // charge launches like a home-run bat.
    neutralB: {
      frames: 34, anim: 'attack2',
      charge: { max: 180, hold: 240, tip: [-49, -50] },   // full at 3 s; swings by itself after 4 s; blade tip in the wind-up pose
      hits: [{ from: 12, to: 16, box: [4, -66, 68, 66], dmg: 20, angle: 36, base: 4.0, growth: 5.5, maxBase: 9.5, maxGrowth: 12.0, homerun: true }],      // the swing bats enemy projectiles back (fighterSpecials.slamReflect): it catches them from `early` frames before
      // the hit to `late` after; they fly back `speed` x faster, hit `dmg` x harder (up to `maxMult` if batted back and forth),
      // and last at least `life` frames
      reflect: { early: 4, late: 4, speed: 1.35, dmg: 1.3, maxMult: 2, life: 90 },
    },

    // ---- tilts and aerials: drawn in her moves sheet (HK_MOVES); `anim` is the old strip, kept as a fallback
    ftilt: { frames: 28, anim: 'attack2', hits: [{ from: 12, to: 16, box: [10, -50, 64, 40], dmg: 9, angle: 35, base: 3.0, growth: 6.2 }] },
    utilt: { frames: 30, anim: 'attack1', hits: [{ from: 12, to: 18, box: [-24, -76, 50, 40], dmg: 7, angle: 85, base: 3.0, growth: 5.4 }] },
    dtilt: { frames: 24, anim: 'attack2', hits: [{ from: 10, to: 14, box: [8, -22, 56, 22], dmg: 6, angle: 22, base: 2.6, growth: 3.6 }] },
    // smash attacks (tap a direction and attack together): her own animations in the moves sheet
    // Heaven Splitter: the sword raised high, then a lunging overhead cleave through a huge crescent
    fsmash: { frames: 48, lunge: 2.2, anim: 'attack2', hits: [{ from: 18, to: 22, box: [8, -84, 80, 86], dmg: 17, angle: 38, base: 4.4, growth: 8.2 }] },
    // Rising Moon: crouches, then springs up with a full crescent over her head
    usmash: { frames: 44, anim: 'attack1', hits: [{ from: 14, to: 20, box: [-36, -112, 72, 70], dmg: 15, angle: 88, base: 4.2, growth: 7.8 }] },
    // Twin Sweep: a low cut in front, then she spins and cuts low behind
    dsmash: { frames: 42, anim: 'attack2', hits: [
      { from: 12, to: 15, box: [6, -22, 64, 24], dmg: 13, angle: 26, base: 3.8, growth: 7.0 },
      { from: 19, to: 22, box: [-70, -22, 64, 24], dmg: 13, angle: 154, base: 3.8, growth: 7.0 },
    ] },
    nair: { frames: 28, landLag: 7, anim: 'attack1', hits: [{ from: 10, to: 18, box: [-30, -60, 60, 60], dmg: 8, angle: 45, base: 2.8, growth: 4.0 }] },
    fair: { frames: 28, landLag: 9, anim: 'attack2', hits: [{ from: 12, to: 16, box: [8, -60, 56, 56], dmg: 11, angle: 40, base: 3.0, growth: 6.4 }] },
    bair: { frames: 26, landLag: 9, anim: 'attack1', flip: true, hits: [{ from: 10, to: 14, box: [-50, -50, 42, 40], dmg: 11, angle: 145, base: 3.2, growth: 6.2 }] },
    uair: { frames: 26, landLag: 6, anim: 'attack1', hits: [{ from: 10, to: 16, box: [-24, -84, 50, 40], dmg: 8, angle: 86, base: 3.0, growth: 5.8 }] },
    dair: { frames: 32, landLag: 13, anim: 'attack1', hits: [{ from: 14, to: 18, box: [-16, -14, 40, 30], dmg: 11, angle: -78, base: 3.0, growth: 4.2 }] },
    ...DEFAULT_GRAB,
    // Grab: she reaches out with her free hand (the grab strip, tools/sprites/hero_knight_grab.py) and
    // throws with her arm too: a shove forward or back, a heave upward, a slam into the floor.
    grab: { ...DEFAULT_GRAB.grab, anim: 'grab' },
    // Side special: Blade Toss. She hurls her sword forward; it slows to a stop and spins in place for
    // about 1.5 s (hold the button to keep it spinning up to 2.5 s), hitting every 12 frames and holding
    // opponents in the whirl, then it flies back to her hand, striking anything in the way. While it's
    // out she can run, jump, shield and dodge but can't attack, grab or use her Limit; pressing special
    // again calls the sword back early. A shield or a counter knocks the sword straight back to her.
    sideB: {
      sword: {
        throwAt: 8, speed: 8.5, decel: 0.42, spinTime: 90, holdExtra: 60, spinEvery: 12, spinR: 22, returnSpeed: 5,
        out: { dmg: 4, angle: 40, base: 2.6, growth: 2.4 },
        spin: { dmg: 2, angle: 80, base: 1.2, growth: 0, stun: 12 },
        ret: { dmg: 4, angle: 45, base: 3.2, growth: 4.6 },
      },
    },
    // Down special: Riposte - a counter. She raises her guard; if an attack (or projectile) hits her
    // while the guard is up (ticks 5-28), she takes no damage, the attacker freezes as a shadow in a
    // flash of light, and she slashes back for 1.2x the blocked damage (at least 8%). Whiffing leaves
    // her open until tick 52. Grabs, stage hazards and Limits can't be countered.
    counter: {
      start: 5, end: 28, frames: 52, mult: 1.2, minDmg: 8,
      strike: { frames: 30, from: 4, to: 8, box: [-6, -66, 74, 68], angle: 38, base: 4.4, growth: 6.6 },
    },
    // Up special: Cyclone Slash - she spins with her sword held out, wrapped in a ring of light.
    //  In the air: rises while spinning; four quick hits drag opponents along, the last one launches.
    //    Good sideways drift, then helpless until landing.
    //  On the ground: hold the button to charge (up to 1 s), release to spin in place. One big hit
    //    all around her, stronger the longer it charged (9% -> 16%). She stays on the ground.
    upb: {
      spin: true, frames: 40, riseAt: 6, riseV: -14.4, drift: 3.8,
      hits: [
        { from: 6, to: 7, box: [-34, -56, 68, 58], dmg: 2, angle: 88, base: 1.6, growth: 0, stun: 10, pull: true },
        { from: 10, to: 11, box: [-34, -56, 68, 58], dmg: 2, angle: 88, base: 1.6, growth: 0, stun: 10, pull: true },
        { from: 14, to: 15, box: [-34, -56, 68, 58], dmg: 2, angle: 88, base: 1.6, growth: 0, stun: 10, pull: true },
        { from: 18, to: 19, box: [-34, -56, 68, 58], dmg: 2, angle: 88, base: 1.6, growth: 0, stun: 10, pull: true },
        { from: 23, to: 26, box: [-38, -60, 76, 64], dmg: 4, angle: 55, base: 3.4, growth: 5.4 },
      ],
      ground: { chargeMax: 60, spin: 30, hit: { from: 4, to: 16, box: [-40, -46, 80, 46], dmg: 9, maxDmg: 16, angle: 38, base: 3.4, growth: 6.2 } },
    },
  },

  // Limit: THOUSAND CUTS. Her sword grows into a giant blade of light and she makes one huge forward
  // slash. A miss does nothing more. A hit freezes everyone else in a cutscene: she teleports around
  // the opponent, cutting through them 25 times (2% each), then a final cut (10%) launches them:
  // 60% in total. If several opponents are caught, every cut hits all of them.
  limit: {
    name: 'THOUSAND CUTS', type: 'blade', reach: 170,
    growUntil: 34, slashFrom: 52, slashTo: 60, whiffEnd: 84,   // the blade hangs raised for a beat after the freeze: time to dodge or jump
    box: [0, -130, 200, 150],                      // the giant slash, in front of her
    cuts: 25, cutEvery: 5, cut: { dmg: 2, angle: 90, base: 0, growth: 0, stun: 12 },
    final: { dmg: 10, angle: 40, base: 7.5, growth: 7.0 },
    // if anyone she's cutting is past 100% when she reappears, she charges one killing slice instead
    executeCharge: 75, execute: { dmg: 15, angle: 38, base: 40, growth: 12 },
    colors: BEAM_STEEL,
  },
};
