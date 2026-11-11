// THE DEVOTED (WIP name): a TEST FIGHTER who snowballs. She starts as a quiet woman with a kitchen knife; when she
// first spawns her SYMBOL - a small dying tree - grows where she lands. Landing hits fills her DEVOTION; once it's full, praying (down
// special) at the symbol takes her up a SLUDGE STAGE - DEFAULT -> SEMI -> TAKEN -> DROWNED - and empties it again.
// Every stage covers her in more black sludge, widens her smile and makes her stronger; DROWNED grows one giant
// demon wing. The sludge drips onto the stage and stains it (match.sludgeStains - for a mechanic later).
// She keeps her stage when she's KO'd: the longer the match goes on, the worse she gets.
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
  // her look at each sludge stage (fighterDevoted.js swaps to it when she prays her way up)
  sludgeSheets: [SET(''), SET('semi'), SET('taken'), SET('drowned')],
  // MAD MURDER (costume): its own drawing at every stage - one group, loaded per match (lazySheets); setSludge
  // picks the stage's strips out of it (`<stage>_<strip>`)
  costumeSheets: { murder: Object.assign({}, ...['', 'semi', 'taken', 'drowned'].map((st) => Object.fromEntries(
    ['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [(st ? st + '_' : '') + k, 'dv_murder_' + (st ? st + '_' : '') + k])))) },
  runCycle: [0, 8],
  // DEMONS (neutral special): the five, in wheel order from the top, clockwise. life: frames it stays; cd: frames
  // between its attacks; power: what it does for her while it's out
  demons: {
    life: 1200, pickFor: 240,        // how long it stays (20 s); the wheel picks for her if she waits this long
    offer: 5,                        // how many of the demons the wheel offers each time (picked at random)
    list: [
      // THE GLUTTON - WALKS: a bloated maw that waddles along the floor after her (falls off edges, catches up if
      // it's left behind). Neutral special: it charges along the floor and SWALLOWS the first one it reaches - they're
      // stuck in its belly, taking `chew` damage every 10 frames, then spat out. Power: every hit she lands heals her 1%.
      { kind: 'glutton', name: 'THE GLUTTON', power: 'HITS HEAL YOU', color: 0x9a3a5a, cd: 150, heal: 1,
        walk: 2.8, charge: 7.5, chargeFor: 34, holdFor: 70, chew: 1,
        spit: { dmg: 6, angle: 35, base: 5.2, growth: 4.8 } },
      // THE WRAITH - STAYS PUT: a tall shadow that stands where she called it and waits. Neutral special: SHADOW STEP -
      // she and the wraith swap places in an instant, cutting everyone on the line between them (it works as a
      // recovery: leave it on the stage). Power: she moves 15% faster.
      // TECHNICAL: TAP special to swap; HOLD it (`holdFor` frames) to move the wraith to where she stands instead (set up
      // a recovery point); an attack started within `perfect` frames of a swap is a PERFECT STEP (hits 30% harder); and special
      // while she's being comboed is a SHADOW BREAK - she swaps out of the combo, but it costs the wraith `breakCost`
      // frames of its time.
      { kind: 'wraith', name: 'THE WRAITH', power: 'FASTER  /  SWAP PLACES', color: 0xd8dce4, cd: 80, speed: 1.15,
        cut: { dmg: 6, angle: 50, base: 3.4, growth: 3.6 }, holdFor: 16, perfect: 12, perfectDmg: 1.3, breakCost: 360 },
      // THE BRUTE - UNDERGROUND: lurks in the floor under her (a shadow with red eyes, knuckles breaking the surface).
      // Neutral special: it tunnels to the nearest opponent and a giant fist bursts up out of the floor under them.
      // Power: she takes 20% less knockback.
      // TECHNICAL: HOLD special to charge the punch while it tunnels (up to `chargeMax` frames: + chargeDmg damage,
      // + chargeBase knockback, a wider, taller fist), steer it with the stick, and LET GO to make it burst up right
      // there (on its own after `tunnelMax`). Without steering it heads for the nearest opponent.
      { kind: 'brute', name: 'THE BRUTE', power: 'HARDER TO LAUNCH', color: 0xd83a3a, cd: 130, kb: 0.8,
        tunnel: 12, steer: 7, tunnelMax: 80, chargeMax: 60, chargeDmg: 8, chargeBase: 2.4, warn: 14, punch: { dmg: 12, angle: 86, base: 5.6, growth: 5.6 } },
      // THE WEEPER - FLOATS HIGH: drifts in the sky over the nearest opponent and weeps a tear on them now and then
      // by itself (`drip` every `dripEvery` frames). Neutral special: DOWNPOUR - a torrent of black tears pours straight
      // down under it for a moment (several hits, the last one pushes down). Power: every 2nd hit she lands counts
      // double toward her devotion.
      // TECHNICAL: while the downpour falls, the stick steers it (`steer` px per frame).
      { kind: 'weeper', name: 'THE WEEPER', power: 'MORE DEVOTION  /  RAINS ON THEM', color: 0x4a8ad8, cd: 140, steer: 3.2,
        height: 150, dripEvery: 110, drip: { dmg: 2, angle: -80, base: 1.4, growth: 0.4 },
        pour: { dmg: 2, angle: 270, base: 1.2, growth: 0.2, stun: 12 }, pourLast: { dmg: 4, angle: -75, base: 3.0, growth: 3.0 }, pourFor: 48 },
      // THE HOLLOW - CHAINED TO HER: an empty hood swinging round her on a chain; it hits anyone it swings into.
      // Neutral special: it throws its hooked chain and drags whoever it catches back to her. Power: she hits 10% harder.
      // TECHNICAL: the chain is AIMED with the stick just after she presses special (8 ways - the direction held when
      // the chain flies), and if the hook catches a platform's top
      // or edge instead of someone it's a GRAPPLE - she's reeled in along the chain onto it (`zip` px per frame) and
      // gets her up special back: a recovery.
      { kind: 'hollow', name: 'THE HOLLOW', power: 'HIT HARDER  /  ORBITS YOU', color: 0xc89a4a, cd: 100, dmg: 1.1, reach: 190, zip: 11, grappleHop: -6,
        orbit: 48, spin: 0.07, bump: { dmg: 3, angle: 45, base: 2.6, growth: 1.6 },
        hook: { dmg: 5, angle: 30, base: 1.0, growth: 0.2, stun: 30 } },
      // THE CRAWLER - HUNTS ON ITS OWN: a skittering, many-legged thing that runs along the floor after the nearest
      // opponent by itself and latches onto their back - while it clings they're 40% slower and it bites them (`chew`
      // every 20 frames). Neutral special: POUNCE - it leaps onto the nearest opponent from anywhere; if it's
      // already on someone, it bursts off them instead (a hit). Power: every hit she lands charges her Limit.
      { kind: 'crawler', name: 'THE CRAWLER', power: 'HITS CHARGE YOUR LIMIT  /  HUNTS', color: 0xd8302a, cd: 90, limit: 3,
        run: 4.2, clingFor: 200, chew: 1, pounce: { dmg: 6, angle: 60, base: 2.0, growth: 1.0, stun: 14 },
        burst: { dmg: 8, angle: 70, base: 4.6, growth: 4.6 } },
      // THE SWARM - A CLOUD AROUND HER: a buzzing cloud of black flies. Power: it throws itself in front of the first
      // hit that would land on her - the hit's blocked - then it needs `guardEvery` frames to gather again. Neutral
      // special: STING - the whole cloud flies onto the nearest opponent and stings them over and over, then comes back.
      { kind: 'swarm', name: 'THE SWARM', power: 'BLOCKS A HIT  /  STINGS', color: 0x8ad83a, cd: 120, guardEvery: 360, flies: 16,
        range: 280, stingFor: 54, sting: { dmg: 1, angle: 80, base: 0.6, growth: 0, stun: 8 }, stingLast: { dmg: 3, angle: 50, base: 3.6, growth: 3.0 } },
      // THE TOLLER - PLANTED: a pillar of sludge with a cracked bronze bell for a head, driven into the floor beside
      // her. Inside its ring she heals (`regen` every 60 frames) and opponents are slowed. Neutral special: it TOLLS -
      // a shockwave rings out from it, throwing everyone near it away; if she's far from it, it uproots and plants
      // itself next to her again instead.
      { kind: 'toller', name: 'THE TOLLER', power: 'ITS RING: YOU HEAL, THEY SLOW', color: 0xc8963a, cd: 120, ring: 96, regen: 1,
        far: 220, toll: { dmg: 9, angle: 40, base: 5.4, growth: 4.6 }, tollRadius: 140 },
    ],
  },

  // (bursting out of a puddle reuses the geyser's rise; the cross cuts reuse her slashes)
  moveAnims: { ...DV_MOVES, swimPop: DV_MOVES.upb, swimCut: DV_MOVES.upb, swimSmack: DV_MOVES.dair, demonpick: [...DV_MOVES.taunt.slice(0, 3), 1], sideB: DV_MOVES.ftilt, sideB2: DV_MOVES.fair, sideB3: DV_MOVES.ftilt, sideB4: DV_MOVES.nair, sideBF: DV_MOVES.fsmash },
  movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 18, y: -34 },   // the tip of her knife
  portrait: [18, 4, 34, 30],
  fxColor: 0x2e2a38,
  swingSfx: 'swing',
  pal: PAL_SLUDGE,
  body: { w: 20, h: 50 },
  headTop: 54,
  tagY: 64,
  weight: 0.96,
  // quick on her feet: faster than AERO on the ground and in the air
  walkSpeed: 3.9, runAccel: 0.75, groundFriction: 0.55,
  airSpeed: 3.6, airAccel: 0.36, airFriction: 0.03,
  jumpV: -9.6, shortHopV: -6.4, doubleJumpV: -9.2,

  // THE SNOWBALL: her devotion meter, her symbol and what each sludge stage does
  devoted: {
    names: ['DEFAULT', 'SEMI', 'TAKEN', 'DROWNED'],
    // hits she has to land to fill her devotion, for the next stage up (from DEFAULT, SEMI, TAKEN)
    need: [6, 8, 10],
    // how close to her symbol she has to be to pray her way up (pixels)
    range: 70,
    // how big her symbol (the dying tree) is drawn: 1 = 50 px tall
    treeScale: 2,
    // the prayer (her WORSHIP animation): when the karambit hits the ground, when an answered prayer takes her up,
    // and how long a prayer that isn't answered lasts (frames)
    stabAt: 22, ascendAt: 32, failLength: 30,
    // per stage: damage she deals, her speed, knockback she takes (lower = harder to launch)
    dmg: [1.0, 1.12, 1.26, 1.42],
    speed: [1.0, 1.04, 1.08, 1.12],
    kb: [1.0, 0.96, 0.9, 0.84],
    // DROWNED's wing: jumps in the air
    wingJumps: 2,
    // DROWNED hovers like a demon: slow, gentle falls (float, like FULL AERO), floating a little off the ground, and
    // holding jump on the way down hangs her in the air (frames per trip into the air)
    hover: { float: { gravity: 0.45, maxFall: 3.0, hover: 6 }, hold: 110 },
    // CROSS CUTS (side special): how many cuts she can chain at each stage (the last one launches)
    cuts: [3, 3, 4, 5],
    // the sludge she leaves on the floor: frames between drops while standing, per stage (0 = none), and
    // the most stains a match keeps (the oldest goes)
    stainEvery: [0, 40, 20, 9], maxStains: 220,
    // drips falling off her: frames between drips, per stage
    dripEvery: [0, 26, 12, 5],
  },

  // TAUNT (1): SHE LISTENS - tilts her head as if someone spoke, and smiles
  taunt: { name: 'SHE LISTENS', frames: 70, lines: ['...YES.', 'I HEAR IT.', 'SOON.'],
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
    // DEMONS (neutral), like Shulk's Monado Arts: neutral special stops her to pick one of five demons on a wheel
    // (tap the stick to turn the wheel, special / attack to call it, shield to cancel). It floats at her shoulder for `life`
    // frames (20 s) with its own power, and while it's out neutral special makes it attack. When it leaves (or she's
    // KO'd) she can call another. cmdAt: the frame of her neutral special that sets it off.
    neutralB: { frames: 22, demons: true, cmdAt: 6 },
    // CROSS CUTS (side): like Cloud's Cross Slash - a lunging cut, and every tap of special during a cut's window
    // carries on into the next one. The last cut (sideBF) launches; the ones before it keep them stuck in place.
    // Every cut leaves its slash hanging where it hit until the combo ends, then they all vanish. Its damage doesn't
    // grow with her stage: the most the whole thing deals is 20% (4 cuts x 3 + the finisher's 8, at DROWNED).
    // How many cuts she can chain grows with her stage (devoted.cuts). In the air each cut holds her up.
    // next: [from, to] = the frames of a cut when a special tap carries on into the next cut
    sideB: { frames: 26, cut: 1, lunge: 2.4, next: [6, 20], fx: 'arc', hits: [{ from: 6, to: 9, box: [4, -52, 46, 44], dmg: 3, angle: 20, base: 1.2, growth: 0.2, stun: 22 }] },
    sideB2: { frames: 24, cut: 2, lunge: 2.2, next: [5, 19], fx: 'arc', hits: [{ from: 5, to: 8, box: [4, -58, 46, 50], dmg: 3, angle: 30, base: 1.2, growth: 0.2, stun: 22 }] },
    sideB3: { frames: 24, cut: 3, lunge: 2.2, next: [5, 19], fx: 'arc', hits: [{ from: 5, to: 8, box: [4, -52, 48, 44], dmg: 3, angle: 20, base: 1.2, growth: 0.2, stun: 22 }] },
    sideB4: { frames: 24, cut: 4, lunge: 2.2, next: [5, 19], fx: 'spin', hits: [{ from: 5, to: 9, box: [-18, -56, 66, 52], dmg: 3, angle: 30, base: 1.2, growth: 0.2, stun: 22 }] },
    // the finishing cut: an X through them that sends them flying
    sideBF: { frames: 40, cut: 9, lunge: 3.0, fx: 'flare', hits: [{ from: 9, to: 13, box: [-4, -64, 70, 62], dmg: 8, angle: 40, base: 4.6, growth: 5.4 }] },
    // SLUDGE GEYSER (up): stabs down at her own feet and a geyser of sludge erupts under her, throwing her up -
    // the burst hits anyone around her, then the karambit cuts upward as she rises. Leaves a stain where it started.
    upb: { frames: 40, riseAt: 10, riseV: -14.2, pushX: 1.2, drift: 3.6, geyser: { length: 14 }, hits: [
      { from: 9, to: 12, box: [-30, -36, 60, 40], dmg: 8, angle: 80, base: 4.2, growth: 3.6 },
      { from: 14, to: 18, box: [-18, -78, 36, 46], dmg: 5, angle: 86, base: 3.6, growth: 4.0 },
    ] },
    // PRAY (down): kneels and prays. With her devotion full and her symbol close by, she goes up a sludge stage.
    // Otherwise it's a short, useless prayer (and she's wide open).
    downB: { frames: 54, pray: true,
      // SLUDGE SWIM: down special standing in sludge on the floor - when she can't go up a stage - sinks
      // her into it, Splatoon-style. Under the sludge she slides fast along the stains on that platform (never past their
      // edge), can't be hit, and bursts out with jump (a big leap) or attack / special (a hop), hitting anyone above.
      // (only where there's sludge: standing on clean floor it's a normal prayer) sink: frames to sink in; speed: px per frame under the sludge;
      // max: the longest she can stay under (frames); leap / hop: her jump out; cooldown: frames before she can sink again
      swim: { sink: 8, speed: 7.2, max: 180, leap: -11.5, hop: -7.5, cooldown: 30, cutRise: -10.5,
        // INK FALLS: sludge that reaches a platform's edge pours down its side. Down special in the air beside one (or
        // swimming over the edge into it) puts her in it; up / down climbs it (px per frame). fallLength: how far it
        // pours below the platform (px)
        climb: 5.2, fallLength: 70 } },
    // SLUDGE SWIM's attack out of the sludge: an uppercut, knife first. The first one it catches (frames from-to) is
    // skewered on the knife and carried up (stab damage), then at the top of her rise (or after `hold` frames) she
    // smacks them back down (smack: a spike)
    swimCut: { frames: 34, skewer: { from: 1, to: 10, hold: 24, stab: { dmg: 6, angle: 90, base: 0, growth: 0 },
      smack: { dmg: 8, angle: -80, base: 4.4, growth: 4.2 } } },
    swimSmack: { frames: 22 },
    // bursting out of the sludge (SLUDGE SWIM's exit)
    swimPop: { frames: 24, hits: [{ from: 1, to: 6, box: [-24, -44, 48, 46], dmg: 7, angle: 85, base: 3.6, growth: 3.4 }] },
  },

  // Limit: FEED THE DARK - she throws her karambit straight ahead (it doesn't home in). If it sticks in someone, a
  // CUTSCENE: the screen goes black, they look round in the dark, a hulking demon steps out of the shadows behind them,
  // grabs them by the head and slams them into the floor twice, uppercuts them into the air, flies up after them and
  // tears them in half - an instant KO.
  // If nobody's in reach, the knife just flies and the Limit is wasted.
  limit: {
    name: 'FEED THE DARK', type: 'rite',
    throwAt: 16, knifeSpeed: 11, flyFor: 44,      // when the knife leaves her hand, how fast it flies, how long before it's a miss
    whiff: 40,                                    // frames she's left standing there after a miss
    // the cutscene's beats (frames from its start): black, they look round, the demon steps out, grabs their head,
    // slams them down twice, the uppercut, it flies up after them, catches them, the tear, back to the arena
    scene: { dark: 4, look: 24, emerge: 92, grab: 136, slam1: 156, slam2: 178, hit: 204, fly: 214, catch: 240, tear: 262, end: 322 },
    colors: PAL_SLUDGE,
  },
};
