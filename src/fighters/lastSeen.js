// ROSEMARY (id 'last-seen', first called LAST SEEN): a TEST FIGHTER out of analog horror - a woman who went missing, and what came back. She starts out
// frail: light, weak, easy to launch. Her SIGHTINGS meter fills as she deals and takes damage; when it's full she
// turns into SEEN - an old canary mascot animatronic, scrapped and rotting, with her inside it - and stays that way
// until she's KO'd: heavy, fast, and brutal. Data only. Art: tools/sprites/last_seen_draw.py + last_seen_moves.py.
// Code: fighterLastSeen.js.
import { DEFAULT_GRAB } from './common.js';
import { LS_MOVES } from './lsMoves.js';
import { LS_WRONG_MOVES } from './lsWrongMoves.js';
import { LS_TANK_MOVES } from './lsTankMoves.js';

export const PAL_RAIN = { outline: 0x0e0a08, deep: 0x8a6a22, mid: 0xc8a240, light: 0xe8c86a, core: 0xfff6dc, shade: 0x2a2a30, void: 0x08080a };
export const PAL_WRONG = { outline: 0x24262c, deep: 0x86703a, mid: 0xb89e4e, light: 0xf0e09a, core: 0xffffff, shade: 0x2a2620, void: 0x0a0806 };

const COMMON = {
  id: 'last-seen',
  runCycle: [0, 8],
  movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,
  handOffset: { x: 14, y: -36 },
  portrait: [16, 0, 36, 32],
  swingSfx: 'swing',
  body: { w: 20, h: 50 },
  headTop: 54,
  tagY: 64,
};

export const LAST_SEEN = {
  ...COMMON,
  name: 'ROSEMARY',                 // (was LAST SEEN; her id and files keep the old name)
  sheets: { idle: 'ls_idle', run: 'ls_run', jump: 'ls_jump', fall: 'ls_fall', moves: 'ls_moves' },
  // RED ARMY (skins.js sheetSet 'soviet', from the shop's code PAPERSPLEASE): her calm form redrawn as a Soviet soldier
  costumeSheets: { soviet: { idle: 'ls_soviet_idle', run: 'ls_soviet_run', jump: 'ls_soviet_jump', fall: 'ls_soviet_fall', moves: 'ls_soviet_moves' } },
  moveAnims: LS_MOVES,
  fxColor: 0xe8c86a,
  pal: PAL_RAIN,
  weight: 0.84,                     // light: easy to send flying
  walkSpeed: 3.0, runAccel: 0.55, groundFriction: 0.5,
  airSpeed: 2.8, airAccel: 0.25, airFriction: 0.04,
  jumpV: -9.6, shortHopV: -6.4, doubleJumpV: -9.2,
  // SIGHTINGS: fills from damage she deals and takes; full = she turns into SEEN (until KO'd)
  sightings: { max: 100, perDealt: 1.6, perTaken: 1.2 },

  // TAUNT (1): holds up the poster of herself
  taunt: { name: 'HAVE YOU SEEN ME?', frames: 84, lines: ['HAVE YOU SEEN ME?', 'PLEASE... HELP ME.', "I DON'T KNOW HOW I GOT HERE."],
    sounds: [[12, 'petal', 0.4, 0.8]] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- her attacks are weak: shoves and flailing
    jab: { frames: 24, fx: 'jab', hits: [{ from: 4, to: 6, box: [8, -48, 30, 24], dmg: 3, angle: 40, base: 2.0, growth: 1.6 }] },
    ftilt: { frames: 28, fx: 'arc', hits: [{ from: 9, to: 12, box: [8, -50, 42, 30], dmg: 6, angle: 36, base: 2.6, growth: 4.4 }] },
    utilt: { frames: 26, fx: 'spin', hits: [{ from: 8, to: 14, box: [-24, -90, 48, 40], dmg: 5, angle: 88, base: 2.6, growth: 4.2 }] },
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 6, to: 9, box: [6, -16, 38, 16], dmg: 4, angle: 24, base: 2.0, growth: 3.0 }] },
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 18, vx: 6.4 }, hits: [{ from: 5, to: 14, box: [4, -32, 38, 32], dmg: 6, angle: 60, base: 2.8, growth: 3.6 }] },
    fsmash: { frames: 46, lunge: 1.6, fx: 'thrust', hits: [{ from: 18, to: 21, box: [8, -44, 42, 28], dmg: 11, angle: 36, base: 3.6, growth: 6.0 }] },
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 20, box: [-30, -92, 60, 68], dmg: 10, angle: 86, base: 3.6, growth: 6.0 }] },
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 15, to: 19, box: [-50, -14, 100, 16], dmg: 9, angle: 30, base: 3.2, growth: 5.6 }] },
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-26, -56, 52, 50], dmg: 5, angle: 45, base: 2.4, growth: 3.4 }] },
    fair: { frames: 26, landLag: 9, fx: 'thrust', hits: [{ from: 8, to: 11, box: [6, -40, 38, 24], dmg: 7, angle: 40, base: 2.6, growth: 5.0 }] },
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-38, -42, 32, 26], dmg: 8, angle: 145, base: 2.8, growth: 5.2 }] },
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 6, to: 11, box: [-22, -90, 44, 40], dmg: 6, angle: 86, base: 2.6, growth: 4.6 }] },
    dair: { frames: 34, landLag: 14, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 8, angle: -80, base: 2.6, growth: 3.6 }] },
    // ---- specials
    // FLYER (neutral): throws a missing poster of herself. Whoever it hits is posted MISSING: they take 20% more
    // damage for a few seconds
    neutralB: { frames: 30, spawnAt: 12, flyer: { speed: 4.6, life: 70, flutter: 5, mark: 240, hit: { dmg: 4, angle: 40, base: 2.4, growth: 1.6 } } },
    // PLEASE HELP ME (side): she lunges, one hand out, a long way forward - once per jump. If she catches someone
    // she CLINGS to them, begging, and they can't get away: little hits while her SIGHTINGS fill fast, then she
    // shoves them off. 2 + 4 x 2 + 5 = 15%, and a big chunk of her meter.
    sideB: { frames: 34, landLag: 10, dive: { from: 8, to: 22, vx: 7.0, vy: -2.2 },
      hits: [{ from: 8, to: 22, box: [-2, -48, 42, 36], dmg: 2, angle: 0, base: 0.4, growth: 0, stun: 30 }],
      cling: {
        frames: 54, every: 12,                        // how long she hangs on, and how often she squeezes
        tick: { dmg: 2, angle: 90, base: 0.3, growth: 0, stun: 24 },
        fill: 8,                                      // SIGHTINGS for each squeeze (on top of the damage)
        shove: { dmg: 5, angle: 40, base: 4.4, growth: 3.6 },
      } },
    // A FRIGHTENED JUMP (up)
    upb: { frames: 40, riseAt: 8, riseV: -14, pushX: 2.0, drift: 3.4, hits: [{ from: 8, to: 14, box: [-20, -56, 40, 58], dmg: 4, angle: 80, base: 2.6, growth: 2.4 }] },
    // HIDE (down): curls up with her arms over her head - nothing touches her for a moment
    downB: { frames: 34, hide: { from: 3, to: 26 } },
  },

  // Limit: I SEE IT TOO. She stops fighting it: a scream that knocks everyone near her away, and she turns into
  // SEEN right now, meter or not.
  limit: {
    name: 'I SEE IT TOO', type: 'turn', frames: 40, radius: 120,
    blast: { dmg: 18, angle: 60, base: 6.0, growth: 5.0, radial: true },
    colors: PAL_RAIN,
  },
};

// SEEN: every normal attack is a swing of the bloody axe - much further and much harder
const AXE = {
  reach: 26,                        // extra reach in pixels (the axe's length)
  dmg: 1.7,                         // damage multiplier
  base: 0.9,                        // extra base knockback
};
function wrongMove(m) {
  if (!m.hits) return m;
  return { ...m, fx: 'arc', hits: m.hits.map((h) => {
    const [x, y, w, hh] = h.box;
    return { ...h, box: [x - 6, y - 8, w + AXE.reach, hh + 12], dmg: Math.round(h.dmg * AXE.dmg), base: h.base + AXE.base, growth: h.growth * 1.15 };
  }) };
}
const NORMALS = ['jab', 'ftilt', 'utilt', 'dtilt', 'dashAttack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair'];

export const SEEN = {
  ...COMMON,
  name: 'SEEN',
  swingSfx: 'whoosh',                // the axe
  sheets: { idle: 'ls_wrong_idle', run: 'ls_wrong_run', jump: 'ls_wrong_jump', fall: 'ls_wrong_fall', moves: 'ls_wrong_moves', axe: 'ls_wrong_axe' },
  // costumes that redraw the animatronic (skins.js sheetSet) - her first form just gets recoloured
  costumeSheets: Object.fromEntries(['rave', 'showtime', 'drowned', 'angler'].map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves', 'axe'].map((k) => [k, 'ls_wrong_' + s + '_' + k]))])),
  moveAnims: LS_WRONG_MOVES,
  fxColor: 0xd8c070,
  pal: PAL_WRONG,
  wrong: true,                      // fighterLastSeen.js: its drips, smears and glitches
  hitVfx: { shape: 'scrap', colors: [0xffd060, 0xffa030, 0xffffff], n: 8 },   // its hits, whatever the costume: sparks, fur, oil
  weight: 1.14,                     // heavy now
  takenMult: 0.85,                  // and tougher: 15% less damage taken
  walkSpeed: 3.6, runAccel: 0.8, groundFriction: 0.5,
  airSpeed: 3.2, airAccel: 0.3, airFriction: 0.04,
  jumpV: -10.4, shortHopV: -7.0, doubleJumpV: -10.0,
  taunt: { name: 'HAPPY BIRTHDAY', frames: 84, lines: ['HAPPY BIRTHDAY!', "L-L-LET'S PLAY!", '...HELP ME.'], sounds: [[2, 'buzz', 0.4, 0.7], [40, 'glitch', 0.6, 0.5], [46, 'buzz', 0.5, 1.3]] },
  moves: {
    ...DEFAULT_GRAB,
    ...Object.fromEntries(NORMALS.map((n) => [n, wrongMove(LAST_SEEN.moves[n])])),
    // HEAVY SWING (neutral): hold special to haul the axe up behind its head and charge it - it can still shuffle
    // along while it charges, very slowly - then let go for one enormous chop. Damage and launch grow with the charge.
    neutralB: { frames: 46, axeCharge: {
      max: 120,                                       // frames to a full charge (2 s); it swings by itself at 'hold'
      hold: 210,
      walk: 0.9,                                      // walking speed while charging (it normally walks at 3.6)
      tip: [-10, -76],                                // where the axe head is in the wind-up (for the glow)
    }, hits: [
      // dmg/base/growth at no charge -> maxDmg/maxBase/maxGrowth at full
      { from: 15, to: 20, box: [-6, -74, 66, 76], dmg: 9, maxDmg: 26, angle: 48, base: 3.0, maxBase: 7.6, growth: 4.0, maxGrowth: 7.0 },
    ] },
    // LUNGE (side): a lunging chop. MISS and the axe buries itself in the floor - it has to wrench it back out (a lot
    // of end lag). HIT and it's a FLURRY: five quick chops and one big swing that sends them flying (3 x 5 + 10 = 25%).
    // (on the ground it lunges along the floor; in the air it just swings - and landing mid-move costs 40 frames)
    sideB: { frames: 72, landLag: 40, slide: { from: 6, to: 15, vx: 8.2, dust: 0x5a5248 }, hits: [
      { from: 9, to: 15, box: [0, -44, 56, 44], dmg: 4, angle: 30, base: 2.0, growth: 0, stun: 30 },
    ], flurry: {
      frames: 66,                                     // the whole flurry (its animation)
      chops: [10, 17, 24, 31, 38], chop: { dmg: 3, angle: 60, base: 1.0, growth: 0, stun: 22 },
      finishAt: 51, finish: { dmg: 10, angle: 38, base: 5.6, growth: 6.4 },
      gap: 26,                                        // how far in front of it they're held
    } },
    // CLIMB (up): claws its way up the air itself
    upb: { frames: 40, riseAt: 6, riseV: -15.5, pushX: 2.0, drift: 3.8, hits: [
      { from: 6, to: 8, box: [-22, -70, 44, 40], dmg: 3, angle: 85, base: 1.8, growth: 0, stun: 10 },
      { from: 12, to: 14, box: [-22, -70, 44, 40], dmg: 3, angle: 85, base: 1.8, growth: 0, stun: 10 },
      { from: 18, to: 20, box: [-22, -70, 44, 40], dmg: 3, angle: 85, base: 1.8, growth: 0, stun: 10 },
      { from: 24, to: 27, box: [-26, -76, 52, 46], dmg: 7, angle: 80, base: 4.0, growth: 4.6 },
    ] },
    // SCREAM (down): HIGH RISK, HIGH REWARD. It throws its axe into the floor, wrenches its jaw open with both hands
    // and screams, spewing blood. It does almost no damage and leaves it wide open (it takes more damage the whole
    // time) - but everyone near the scream is SHAKEN (slowed, and their hits do less), and if it gets the whole
    // scream out it goes into a FRENZY for 10 s and fills its Limit meter. Get hit out of it and it gets nothing.
    // In the AIR it's worse: the axe falls away and it has to fight without it for 5 s (only CLIMB works; its hits are weak).
    downB: { frames: 134, hits: [], scream: {
      throwAt: 16, land: 22, axeX: 30, pickAt: 124,   // the axe: thrown at frame 16, lands in the floor 30 px ahead, pulled back out at 124
      from: 60, to: 118,                              // the scream (frames) - a long, slow wind-up before it
      airLoss: 300,                                   // used in the air: no axe for 5 s
      radius: 170,                                    // how near you have to be to be SHAKEN by it
      shaken: 300,                                    // SHAKEN lasts 5 s after you're out of range: 40% slower, your hits do 30% less
      frenzy: 600,                                    // a full scream: FRENZY for 10 s (see Fighter: hits 30% harder, 15% faster)
      limit: 30,                                      // ...and +30 Limit meter
      taken: 1.3,                                     // the risk: it takes 30% more damage for the whole move
      cone: 64, every: 12,                            // the blood: anyone right in front of its mouth takes a little, every 12 frames
      blood: { dmg: 2, angle: 30, base: 1.4, growth: 0, stun: 8 },
    } },
  },
  // Limit: THE BIRTHDAY SHOW. The lights go down, a music box plays, a spotlight finds the nearest opponent... CUT TO
  // backstage: they wander down a dark corridor and bump into something standing in the dark. It's SEEN. Impact frames,
  // cut after cut - and back in the arena the last one sends them flying. 8 x 4 + 20 = 52%. (fighterLastSeen.js)
  limit: {
    name: 'THE BIRTHDAY SHOW', type: 'birthday', frames: 400,  // (ends itself when the show's over)
    reach: 460,                                       // how far away it can find someone (nobody: the lights just come back up)
    sceneAt: 40,                                      // the cut to backstage
    notes: [[2, 1], [10, 1], [18, 1.122], [26, 1], [34, 1.335], [42, 1.26]],   // the music box: "happy birthday to you" (frame, pitch)
    scene: {                                          // the cutscene, in its own frames
      notesAt: 6,                                     // the music box again, slower
      bump: 84,                                       // they walk into it
      reveal: 104,                                    // the bulb flickers on: it's SEEN
      cuts: [140, 147, 154, 161, 168, 175, 182, 189], // each cut: an impact frame
      final: 204, end: 222,                           // the last cut - then back to the arena, where it lands
    },
    chop: { dmg: 4, angle: 80, base: 0.8, growth: 0, stun: 30 },
    final: { dmg: 20, angle: 48, base: 7.4, growth: 6.2 },
    colors: PAL_WRONG,
  },
};
LAST_SEEN.wrongDef = SEEN;

// ---------------------------------------------------------------------------------------------------- THE TANK
// ROSEMARY in her RED ARMY costume (skins.js `form: 'tank'`) doesn't turn into SEEN: when her SIGHTINGS fill she turns into
// a TANK, herself up in the turret hatch, until she's KO'd. Heavy, slow to jump, armoured - and its own moves: the hull
// machine gun, the main gun, the treads, rockets under the hull and a rocket barrage for a Limit.
// Art: tools/sprites/rosemary_tank.py (frames 112x104, its tracks resting on 56,95). Code: fighterLastSeen.js (shell,
// armour, KATYUSHA, its smoke).
export const PAL_TANK = { outline: 0x161c0a, deep: 0x3c4a20, mid: 0x56682f, light: 0xd8201e, core: 0xffe08a, shade: 0x1a1e10, void: 0x060804 };
const TANK_SHEETS = { idle: 'ls_tank_idle', run: 'ls_tank_run', jump: 'ls_tank_jump', fall: 'ls_tank_fall', moves: 'ls_tank_moves' };
export const TANK = {
  ...COMMON,
  name: 'TANK',
  tank: true,                       // fighterLastSeen.js: exhaust, track dust, smoke when it's badly hurt
  originX: 0.5, originY: 95 / 104,  // (every strip is 112x104, the tracks resting on 56,95)
  movesOrigin: [56 / 112, 95 / 104],
  handOffset: { x: 46, y: -32 },    // the gun's muzzle
  portrait: [32, 40, 48, 40],
  body: { w: 56, h: 40 },
  headTop: 52, tagY: 66,
  sheets: TANK_SHEETS,
  costumeSheets: { soviet: TANK_SHEETS },
  moveAnims: LS_TANK_MOVES,
  fxColor: 0xd8201e,
  pal: PAL_TANK,
  swingSfx: 'clang',
  hitSfx: 'clang',
  hitVfx: { shape: 'scrap', colors: [0xffd060, 0xd8201e, 0xffffff], n: 8 },
  weight: 1.4,                      // very heavy: hard to launch
  takenMult: 0.82,                  // and armoured: 18% less damage taken
  walkSpeed: 3.4, runAccel: 0.6, groundFriction: 0.6,
  airSpeed: 2.5, airAccel: 0.22, airFriction: 0.04,
  jumpV: -9.0, shortHopV: -6.2, doubleJumpV: -8.6,   // (a tank doesn't jump well)
  taunt: { name: 'URA!', frames: 84, lines: ['URA!', 'FOR THE MOTHERLAND!', 'NOT ONE STEP BACK!', 'FORWARD, COMRADES!'], sounds: [[2, 'go', 0.5, 1.1], [30, 'clang', 0.3, 1.4]] },
  moves: {
    ...DEFAULT_GRAB,
    // MG BURST (jab): three bursts from the hull machine gun - long and low
    jab: { frames: 24, multi: true, fx: 'jab', hits: [4, 8, 12].map((f) => ({ from: f, to: f + 1, box: [30, -26, 64, 12], dmg: 2, angle: 20, base: 1.4, growth: 0.6, stun: 12 })) },
    // BARREL RAM (forward tilt): jabs the gun forward
    ftilt: { frames: 28, fx: 'thrust', hits: [{ from: 9, to: 13, box: [34, -44, 40, 16], dmg: 9, angle: 30, base: 3.0, growth: 5.0 }] },
    // TURRET SWEEP (up tilt): the gun sweeps up overhead
    utilt: { frames: 26, fx: 'up', hits: [{ from: 7, to: 14, box: [-6, -96, 60, 62], dmg: 8, angle: 84, base: 3.0, growth: 4.8 }] },
    // TREAD GRIND (down tilt): the front tracks bite in
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 5, to: 10, box: [24, -14, 40, 14], dmg: 7, angle: 22, base: 2.6, growth: 3.4 }] },
    // RAM (dash attack): charges behind its sloped front
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 18, vx: 7.0, dust: 0xe8e4d8 }, hits: [{ from: 4, to: 16, box: [10, -44, 46, 44], dmg: 11, angle: 40, base: 4.0, growth: 5.0 }] },
    // MAIN GUN (forward smash): fires point-blank - a huge blast in front
    fsmash: { frames: 46, fx: 'thrust', hits: [{ from: 16, to: 20, box: [36, -60, 74, 44], dmg: 18, angle: 34, base: 5.2, growth: 7.0 }] },
    // FLAK (up smash): the gun straight up, one big shot
    usmash: { frames: 44, fx: 'up', hits: [{ from: 14, to: 18, box: [-6, -150, 46, 100], dmg: 16, angle: 88, base: 4.6, growth: 6.6 }] },
    // SLAM (down smash): hops and slams down - shock rings both ways
    dsmash: { frames: 44, fx: 'low2', hits: [{ from: 20, to: 24, box: [-78, -16, 156, 18], dmg: 14, angle: 26, base: 4.2, growth: 6.0 }] },
    // SPIN (neutral air): a full turn in the air, gun out
    nair: { frames: 26, landLag: 10, fx: 'spin', hits: [{ from: 5, to: 16, box: [-46, -56, 92, 58], dmg: 10, angle: 45, base: 3.0, growth: 4.0 }] },
    // GUN SWING (forward air)
    fair: { frames: 26, landLag: 11, fx: 'thrust', hits: [{ from: 8, to: 13, box: [24, -66, 48, 52], dmg: 11, angle: 40, base: 3.0, growth: 5.4 }] },
    // EXHAUST BLAST (back air): fire out of the back
    bair: { frames: 24, landLag: 11, fx: 'back', hits: [{ from: 7, to: 12, box: [-68, -36, 36, 22], dmg: 12, angle: 148, base: 3.4, growth: 5.6 }] },
    // AA BURST (up air)
    uair: { frames: 24, landLag: 9, fx: 'up', hits: [{ from: 8, to: 12, box: [-16, -120, 48, 64], dmg: 10, angle: 86, base: 3.0, growth: 5.0 }] },
    // CRUSH (down air): tips nose-down and drops like an anvil - a spike
    dair: { frames: 34, landLag: 20, fx: 'down', hits: [{ from: 12, to: 20, box: [-34, -12, 68, 24], dmg: 13, angle: -78, base: 3.0, growth: 4.2 }] },
    // CANNON (neutral special): aims and fires a shell in a long arc - it blows up on whatever it hits, or on the ground
    neutralB: { frames: 40, spawnAt: 14, shell: { speed: 8.2, lift: -1.6, grav: 0.13, life: 110, radius: 36,
      hit: { dmg: 12, angle: 45, base: 4.2, growth: 4.6, radial: true } } },
    // TREAD RUSH (side special): guns the engine and rams forward a long way
    sideB: { frames: 48, landLag: 18, slide: { from: 6, to: 30, vx: 9.0, dust: 0xe8e4d8 }, hits: [{ from: 6, to: 30, box: [12, -42, 48, 42], dmg: 12, angle: 38, base: 4.6, growth: 5.0 }] },
    // ROCKET HOP (up special): rockets under the hull blast it straight up - and spike anyone underneath
    upb: { frames: 40, riseAt: 8, riseV: -14.8, pushX: 1.8, drift: 2.8, hits: [{ from: 6, to: 14, box: [-36, -6, 72, 30], dmg: 8, angle: -70, base: 2.6, growth: 3.2 }] },
    // ENTRENCH (down special): digs in behind sandbags and sprays the machine gun. While it's dug in it's ARMOURED:
    // hits still hurt but don't move it (armor: from, to, how much damage still gets through)
    downB: { frames: 96, multi: true, armor: { from: 8, to: 84, taken: 0.7 },
      hits: Array.from({ length: 11 }, (_, i) => ({ from: 20 + i * 6, to: 21 + i * 6, box: [30, -24, 96, 12], dmg: 2, angle: 15, base: 1.0, growth: 0.4, stun: 10 })) },
  },
  // Limit: KATYUSHA. She fires a red flare into the sky - and a rocket barrage comes down on everyone else, the rockets
  // walking toward each of them. (fighterLastSeen.js barrageLimit)
  limit: {
    name: 'KATYUSHA', type: 'barrage', frames: 160,
    flareAt: 28,                                      // the flare goes up
    from: 54, every: 5, rockets: 20,                  // then a rocket every 5 frames
    spread: 64, radius: 40,                           // how far off its target a rocket can land, and its blast
    hit: { dmg: 6, angle: 70, base: 3.4, growth: 3.0, radial: true },
    colors: PAL_TANK,
  },
};
// her costumes can turn her into something else instead of SEEN (skins.js `form`)
LAST_SEEN.forms = { tank: TANK };
