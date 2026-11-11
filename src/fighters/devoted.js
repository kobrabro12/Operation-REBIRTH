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
  // DEMONS (neutral special): the five, in wheel order from the top, clockwise. life: frames it stays; cd: frames
  // between its attacks; power: what it does for him while it's out
  demons: {
    life: 1200, pickFor: 240,        // how long it stays (20 s); the wheel picks for him if he waits this long
    list: [
      // THE GLUTTON: a bloated maw. Neutral special: it lunges and bites. Power: every hit he lands heals him 1%.
      { kind: 'glutton', name: 'THE GLUTTON', power: 'HITS HEAL YOU', color: 0x9a3a5a, cd: 70,
        bite: { dmg: 9, angle: 40, base: 4.0, growth: 4.6 }, heal: 1 },
      // THE WRAITH: a tattered shadow. Neutral special: it rips forward through everyone in a line (3 hits).
      // Power: he moves 15% faster.
      { kind: 'wraith', name: 'THE WRAITH', power: 'FASTER', color: 0xd8dce4, cd: 80, speed: 1.15,
        rip: { dmg: 3, angle: 35, base: 1.6, growth: 0.6, stun: 16 }, ripLast: { dmg: 4, angle: 40, base: 3.8, growth: 3.6 } },
      // THE BRUTE: a pair of huge fists. Neutral special: it slams the floor in front of him (a shockwave both ways).
      // Power: he takes 20% less knockback.
      { kind: 'brute', name: 'THE BRUTE', power: 'HARDER TO LAUNCH', color: 0x6a2ad8, cd: 100, kb: 0.8,
        slam: { dmg: 11, angle: 70, base: 5.0, growth: 5.2 } },
      // THE WEEPER: a floating head of eyes. Neutral special: three black tears fall on the nearest opponent (they can
      // spike). Power: every second hit he lands counts double toward his devotion.
      { kind: 'weeper', name: 'THE WEEPER', power: 'MORE DEVOTION', color: 0x4a8ad8, cd: 110,
        tear: { dmg: 4, angle: -70, base: 2.6, growth: 2.2 } },
      // THE HOLLOW: an empty hood dragging chains. Neutral special: it throws a hooked chain and drags whoever it
      // catches back to him. Power: he hits 10% harder.
      { kind: 'hollow', name: 'THE HOLLOW', power: 'HIT HARDER', color: 0xc89a4a, cd: 90, dmg: 1.1, reach: 190,
        hook: { dmg: 5, angle: 30, base: 1.0, growth: 0.2, stun: 30 } },
    ],
  },

  // (bursting out of a puddle reuses the geyser's rise; the cross cuts reuse his slashes)
  moveAnims: { ...DV_MOVES, swimPop: DV_MOVES.upb, demonpick: [...DV_MOVES.taunt.slice(0, 3), 1], sideB: DV_MOVES.ftilt, sideB2: DV_MOVES.fair, sideB3: DV_MOVES.ftilt, sideB4: DV_MOVES.nair, sideBF: DV_MOVES.fsmash },
  movesOrigin: [56 / 112, 95 / 104],
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
    // DROWNED hovers like a demon: slow, gentle falls (float, like FULL AERO), floating a little off the ground, and
    // holding jump on the way down hangs him in the air (frames per trip into the air)
    hover: { float: { gravity: 0.45, maxFall: 3.0, hover: 6 }, hold: 110 },
    // CROSS CUTS (side special): how many cuts he can chain at each stage (the last one launches)
    cuts: [3, 3, 4, 5],
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
    // DEMONS (neutral), like Shulk's Monado Arts: neutral special stops him to pick one of five demons on a wheel
    // (tap the stick to turn the wheel, special / attack to call it, shield to cancel). It floats at his shoulder for `life`
    // frames (20 s) with its own power, and while it's out neutral special makes it attack. When it leaves (or he's
    // KO'd) he can call another. cmdAt: the frame of his neutral special that sets it off.
    neutralB: { frames: 22, demons: true, cmdAt: 6 },
    // CROSS CUTS (side): like Cloud's Cross Slash - a lunging cut, and every tap of special during a cut's window
    // carries on into the next one. The last cut (sideBF) launches; the ones before it keep them stuck in place.
    // Every cut leaves its slash hanging where it hit until the combo ends, then they all vanish. Its damage doesn't
    // grow with his stage: the most the whole thing deals is 20% (4 cuts x 3 + the finisher's 8, at DROWNED).
    // How many cuts he can chain grows with his stage (devoted.cuts). In the air each cut holds him up.
    // next: [from, to] = the frames of a cut when a special tap carries on into the next cut
    sideB: { frames: 26, cut: 1, lunge: 2.4, next: [6, 20], fx: 'arc', hits: [{ from: 6, to: 9, box: [4, -52, 46, 44], dmg: 3, angle: 20, base: 1.2, growth: 0.2, stun: 22 }] },
    sideB2: { frames: 24, cut: 2, lunge: 2.2, next: [5, 19], fx: 'arc', hits: [{ from: 5, to: 8, box: [4, -58, 46, 50], dmg: 3, angle: 30, base: 1.2, growth: 0.2, stun: 22 }] },
    sideB3: { frames: 24, cut: 3, lunge: 2.2, next: [5, 19], fx: 'arc', hits: [{ from: 5, to: 8, box: [4, -52, 48, 44], dmg: 3, angle: 20, base: 1.2, growth: 0.2, stun: 22 }] },
    sideB4: { frames: 24, cut: 4, lunge: 2.2, next: [5, 19], fx: 'spin', hits: [{ from: 5, to: 9, box: [-18, -56, 66, 52], dmg: 3, angle: 30, base: 1.2, growth: 0.2, stun: 22 }] },
    // the finishing cut: an X through them that sends them flying
    sideBF: { frames: 40, cut: 9, lunge: 3.0, fx: 'flare', hits: [{ from: 9, to: 13, box: [-4, -64, 70, 62], dmg: 8, angle: 40, base: 4.6, growth: 5.4 }] },
    // SLUDGE GEYSER (up): stabs down at his own feet and a geyser of sludge erupts under him, throwing him up -
    // the burst hits anyone around him, then the karambit cuts upward as he rises. Leaves a stain where it started.
    upb: { frames: 40, riseAt: 10, riseV: -14.2, pushX: 1.2, drift: 3.6, geyser: { length: 14 }, hits: [
      { from: 9, to: 12, box: [-30, -36, 60, 40], dmg: 8, angle: 80, base: 4.2, growth: 3.6 },
      { from: 14, to: 18, box: [-18, -78, 36, 46], dmg: 5, angle: 86, base: 3.6, growth: 4.0 },
    ] },
    // PRAY (down): kneels and prays. With his devotion full and his symbol close by, he goes up a sludge stage.
    // Otherwise it's a short, useless prayer (and he's wide open).
    downB: { frames: 54, pray: true,
      // SLUDGE SWIM: down special standing in sludge on the floor - when he can't go up a stage - sinks
      // him into it, Splatoon-style. Under the sludge he slides fast along the stains on that platform (never past their
      // edge), can't be hit, and bursts out with jump (a big leap) or attack / special (a hop), hitting anyone above.
      // (only where there's sludge: standing on clean floor it's a normal prayer) sink: frames to sink in; speed: px per frame under the sludge;
      // max: the longest he can stay under (frames); leap / hop: his jump out; cooldown: frames before he can sink again
      swim: { sink: 8, speed: 7.2, max: 180, leap: -11.5, hop: -7.5, cooldown: 30,
        // INK FALLS: sludge that reaches a platform's edge pours down its side. Down special in the air beside one (or
        // swimming over the edge into it) puts him in it; up / down climbs it (px per frame). fallLength: how far it
        // pours below the platform (px)
        climb: 5.2, fallLength: 70 } },
    // bursting out of the sludge (SLUDGE SWIM's exit)
    swimPop: { frames: 24, hits: [{ from: 1, to: 6, box: [-24, -44, 48, 46], dmg: 7, angle: 85, base: 3.6, growth: 3.4 }] },
  },

  // Limit: FEED THE DARK - he throws his karambit straight ahead (it doesn't home in). If it sticks in someone, a
  // CUTSCENE: the screen goes black, they look round in the dark, a hulking demon steps out of the shadows behind them,
  // grabs them by the head and slams them into the floor twice, uppercuts them into the air, flies up after them and
  // tears them in half - an instant KO.
  // If nobody's in reach, the knife just flies and the Limit is wasted.
  limit: {
    name: 'FEED THE DARK', type: 'rite',
    throwAt: 16, knifeSpeed: 11, flyFor: 44,      // when the knife leaves his hand, how fast it flies, how long before it's a miss
    whiff: 40,                                    // frames he's left standing there after a miss
    // the cutscene's beats (frames from its start): black, they look round, the demon steps out, grabs their head,
    // slams them down twice, the uppercut, it flies up after them, catches them, the tear, back to the arena
    scene: { dark: 4, look: 24, emerge: 92, grab: 136, slam1: 156, slam2: 178, hit: 204, fly: 214, catch: 240, tear: 262, end: 322 },
    colors: PAL_SLUDGE,
  },
};
