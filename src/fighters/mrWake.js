// Mr Wake: fighter #2. A black blob in a maroon wizard's hat and cloak, wielding a long dark
// staff topped with a purple gem that fires energy. Zoner: he fights from the gem's end of the staff.
//
// The move numbers below are copied exactly from tools/sprites/mr-wake-reference.js (the designer's
// file) and converted into this game's units by `convert()`:
//   - that file draws him at 1.25x and measures boxes from his body CENTER; this game draws
//     fighters at 1x and measures from the FEET, so boxes are divided by 1.25 and moved down 29 px
//   - baseKB x 0.55 and kbScale x 7 give knockback on the same scale as Soul Summoner's moves
//   - startup / active / endlag become the hit window (from..to) and the move's total length
import { DEFAULT_GRAB, BEAM_PURPLE, PAL_PURPLE } from './common.js';
import { MW_MOVES } from './mwMoves.js';

const SCALE = 1.25, CENTER_ABOVE_FEET = 29;
const base = (b) => +(b * 0.55).toFixed(2);
const growth = (k) => +(k * 7).toFixed(2);

function convert(m, extra = {}) {
  const out = { frames: m.startup + m.active + m.endlag, ...extra };
  if (m.hitbox) {
    const h = m.hitbox;
    out.hits = [{
      from: m.startup, to: m.startup + m.active - 1,
      box: [Math.round(h.x / SCALE), Math.round(h.y / SCALE - CENTER_ABOVE_FEET), Math.round(h.w / SCALE), Math.round(h.h / SCALE)],
      dmg: m.damage, angle: m.angle === 270 ? -85 : m.angle, base: base(m.baseKB), growth: growth(m.kbScale),
      ...(m.slowVictim ? { slow: 120 } : {}),
    }];
  }
  if (m.projectile) {
    const p = m.projectile;
    out.spawnAt = m.startup;
    out.projectile = {
      speed: +(p.speed / SCALE).toFixed(2), life: p.life, w: Math.round(p.w / SCALE), h: Math.round(p.h / SCALE),
      homing: p.homing ? +(p.homing / SCALE).toFixed(3) : 0,
      hit: { dmg: p.damage, angle: p.angle, base: base(p.baseKB), growth: growth(p.kbScale) },
    };
  }
  return out;
}

// ---- the designer's numbers (from mr-wake-reference.js); endlag on jab, tilts and forward smash trimmed
// a few frames in a balance pass (he was losing every trade to faster fighters)
const RAW = {
  jab:         { startup: 7,  active: 5, endlag: 11, damage: 5,  baseKB: 5, kbScale: 0.7,  angle: 40, hitbox: { x: 0, y: -60, w: 42, h: 70 } },
  forwardTilt: { startup: 9,  active: 4, endlag: 11, damage: 9,  baseKB: 5, kbScale: 0.85, angle: 38, hitbox: { x: 18, y: -30, w: 22, h: 18 } },
  downTilt:    { startup: 6,  active: 4, endlag: 10, damage: 6,  baseKB: 4, kbScale: 0.5,  angle: 20, hitbox: { x: 10, y: 22, w: 40, h: 14 } },
  upTilt:      { startup: 7,  active: 6, endlag: 10, damage: 7,  baseKB: 5, kbScale: 0.7,  angle: 85, hitbox: { x: -20, y: -60, w: 50, h: 24 } },
  forwardSmash:{ startup: 18, active: 5, endlag: 24, damage: 19, baseKB: 8, kbScale: 1.2,  angle: 36, hitbox: { x: 20, y: -36, w: 34, h: 34 } },
  upSmash:     { startup: 15, active: 6, endlag: 24, damage: 17, baseKB: 8, kbScale: 1.15, angle: 88, hitbox: { x: -18, y: -82, w: 36, h: 50 } },
  downSmash:   { startup: 13, active: 6, endlag: 24, damage: 14, baseKB: 7, kbScale: 1.0,  angle: 25, hitbox: { x: -45, y: 20, w: 90, h: 16 } },
  nair:        { startup: 5,  active: 8, endlag: 10, damage: 7,  baseKB: 4, kbScale: 0.6,  angle: 45, hitbox: { x: -30, y: -30, w: 60, h: 60 } },
  fair:        { startup: 10, active: 4, endlag: 16, damage: 11, baseKB: 6, kbScale: 0.9,  angle: 40, hitbox: { x: 16, y: -28, w: 28, h: 26 } },
  bair:        { startup: 8,  active: 3, endlag: 14, damage: 10, baseKB: 6, kbScale: 0.95, angle: 145, hitbox: { x: -40, y: -4, w: 26, h: 14 } },
  dair:        { startup: 14, active: 5, endlag: 20, damage: 12, baseKB: 6, kbScale: 1.0,  angle: 270, hitbox: { x: -12, y: 26, w: 30, h: 22 } },
  neutralB:    { startup: 12, active: 1, endlag: 18, projectile: { speed: 9, life: 70, damage: 7, baseKB: 3, kbScale: 0.5, angle: 25, w: 16, h: 12 } },
  sideB:       { startup: 16, active: 1, endlag: 22, projectile: { speed: 5, life: 120, damage: 11, baseKB: 5, kbScale: 0.8, angle: 40, w: 24, h: 20, homing: 0.15 } },
  upB:         { startup: 8,  active: 10, endlag: 20, damage: 5, baseKB: 4, kbScale: 0.5, angle: 80, hitbox: { x: -20, y: 20, w: 40, h: 30 } },
  downB:       { startup: 10, active: 24, endlag: 16, damage: 4, baseKB: 2, kbScale: 0.3, angle: 90, hitbox: { x: -75, y: 28, w: 150, h: 10 }, slowVictim: 0.5 },   // widened from 80 to 150 on request
};

const upB = convert(RAW.upB);
// replace a converted move's hit box (x, y from the feet, facing right; w, h)
function reach(m, box) { m.hits = m.hits.map((h) => ({ ...h, box })); return m; }
// balance changes on top of the designer's numbers
function tune(m, change) { m.hits = m.hits.map((h) => ({ ...h, ...change })); return m; }

export const MR_WAKE = {
  id: 'mr-wake',
  name: 'MR WAKE',
  sheets: { idle: 'wake_idle', run: 'wake_run', jump: 'wake_jump', fall: 'wake_fall', moves: 'wake_moves' },   // run: tools/sprites/mr_wake_run.py
  // moves: every attack, special, grab, throw and reaction, animated (tools/sprites/mr_wake_moves.py).
  // 176x120 frames so the long staff fits at full swing; his feet stand at (92, 110) in them.
  moveAnims: MW_MOVES, movesOrigin: [92 / 176, 110 / 120],
  runCycle: [0, 8],                // run frames used: all 8, from the first
  // ROSEBUD costume: covered in roses, with a giant tulip for a staff (tools/sprites/mr_wake_roses.py)
  costumeSheets: { roses: { idle: 'wake_roses_idle', run: 'wake_roses_run', jump: 'wake_roses_jump', fall: 'wake_roses_fall', moves: 'wake_roses_moves' } },
  facesLeft: false,                // he looks right in the sprite (his face and hat brim point right;
                                   // the gem end of the staff trails behind him on the left)
  originX: 36 / 64,                // body centre column
  originY: 62 / 64,                // feet sit on row 61
  handOffset: { x: 18, y: -40 },   // in front of him at chest height: where bolts and his beam come out
  portrait: [22, 0, 40, 36],       // crop of the idle frame for the select grid
  tagY: 68,
  fxColor: 0x9b5de5,
  swingSfx: 'staff',              // heavy staff whooshes
  pal: PAL_PURPLE,
  body: { w: 24, h: 56 },
  headTop: 56,
  weight: 1.05,                   // tall, but his heavy robes keep him grounded a little longer
  walkSpeed: 3.0, runAccel: 0.5, groundFriction: 0.5,
  airSpeed: 2.75, airAccel: 0.23, airFriction: 0.04,
  jumpV: -9.0, shortHopV: -6.0, doubleJumpV: -8.4,

  // TAUNT (1): GEM TWIRL - twirls the staff overhead like a baton, plants it, and takes a little bow
  taunt: { name: 'GEM TWIRL', frames: 82, lines: ['A SPLENDID EVENING.', 'SHALL WE DANCE?', 'TA-DA.'],
    sounds: [[8, 'staff', 0.4, 1.4], [20, 'staff', 0.4, 1.5], [32, 'staff', 0.4, 1.6], [44, 'clang', 0.3, 1.4], [52, 'petal', 0.4, 1.2]],
    fx: [{ kind: 'star', from: 8, to: 36, every: 4, x: 4, y: -82, n: 2 }] },

  moves: {
    ...DEFAULT_GRAB,
    // grab: he hooks them with the crook of his staff - a longer reach than a hand, a touch slower
    grab: { frames: 30, fx: 'grab', grab: true, hits: [{ from: 6, to: 8, box: [4, -46, 42, 32] }] },
    // Hit boxes are refit to where the staff actually is in his animations (tools/sprites/mr_wake_moves.py):
    // the designer's boxes were drawn for a much shorter staff, so his swings visibly passed through
    // people without hitting. The gem end is the business end.
    jab: reach(convert(RAW.jab, { fx: 'arc' }), [8, -66, 54, 46]),                  // baseball-bat swing of the staff
    ftilt: tune(reach(convert(RAW.forwardTilt, { lunge: 1.5, fx: 'thrust' }), [24, -44, 52, 22]), { growth: 6.6 }),   // gem thrust: hits at the staff tip
    dtilt: reach(convert(RAW.downTilt, { fx: 'low' }), [6, -16, 46, 16]),            // low staff sweep
    utilt: reach(convert(RAW.upTilt, { fx: 'spin' }), [-28, -98, 56, 46]),           // staff twirl overhead
    fsmash: reach(convert(RAW.forwardSmash, { lunge: 2, fx: 'arc' }), [18, -58, 56, 44]),   // gem slam with an energy burst
    usmash: reach(convert(RAW.upSmash, { fx: 'up' }), [-18, -112, 36, 62]),          // raises the gem, energy pillar above
    dsmash: reach(convert(RAW.downSmash, { fx: 'low2' }), [-56, -22, 112, 24]),     // cloak spin, hits both sides
    nair: reach(convert(RAW.nair, { landLag: 6, fx: 'spin' }), [-36, -62, 72, 64]),
    fair: tune(reach(convert(RAW.fair, { landLag: 9, fx: 'arc' }), [12, -48, 54, 44]), { growth: 6.8 }),
    bair: reach(convert(RAW.bair, { landLag: 8, fx: 'back' }), [-40, -42, 32, 26]),
    dair: reach(convert(RAW.dair, { landLag: 14, fx: 'down' }), [-12, -20, 32, 32]),
    // up air: the gem driven straight up overhead (he had none, so up + attack in the air was his neutral air)
    uair: { frames: 26, landLag: 7, fx: 'up', hits: [{ from: 6, to: 11, box: [-22, -108, 44, 54], dmg: 9, angle: 88, base: 3.0, growth: 6.0 }] },
    // Neutral special: Void Orb - a slow, swelling orb of void energy. Press special again to detonate
    // it anywhere: it implodes (pulling nearby opponents in, 2 x 2%) then explodes (9%). Touching an
    // opponent sets it off too, and it bursts by itself at the end of its flight (~1.7 s).
    neutralB: {
      frames: 28, spawnAt: 11,
      orb: {
        speed: 3.4, life: 100, r0: 6, r1: 13,
        touch: { dmg: 3, angle: 40, base: 0.6, growth: 0, stun: 14 },
        implode: 18, pullR: 64, pullEvery: 8, pull: { dmg: 2, angle: 90, base: 0.3, growth: 0, stun: 16 },
        blastR: 46, blast: { dmg: 9, angle: 70, base: 4.2, growth: 6.2, radial: true },
      },
    },
    sideB: convert(RAW.sideB),                        // Drifting Soul: slow, curves toward a foe
    // Shadow Pool: his blob body seeps out into a wide puddle. The splash hits for 4%; the puddle then
    // stays on the ground for 4 s, and any opponent who steps in is slowed for 2 s after leaving it.
    downB: convert(RAW.downB, { fx: 'low', fxTint: 0x2a1040, pool: { width: 120, life: 240, slow: 120 } }),
    // Gem Rocket: blasts the staff downward and launches up, then helpless
    upb: { frames: upB.frames, riseAt: RAW.upB.startup, riseV: -15, pushX: 3.2, drift: 3.4, hits: upB.hits },
  },

  // Limit: THE UNDERTOW. He melts into a puddle that floods across the floor. Anyone standing on the main
  // platform inside the flood is dragged under into a black abyss: two giant glowing eyes open in the
  // dark, huge jaws of the deep chomp them five times (6% each), then spit them out flying (15%) - 45%
  // in all. Jumping clear of the flood avoids it; if nobody is caught the pool drains and he re-forms.
  limit: {
    name: 'THE UNDERTOW', type: 'undertow', reach: 300,
    melt: 40, flood: 40,   // melt lasts past the Limit freeze, so the flood can be seen coming and jumped
    spread: 330, recede: 24,
    eyesFor: 34, chomps: 5, chompEvery: 20, spitAfter: 26,
    chomp: { dmg: 6, angle: 90, base: 0, growth: 0, stun: 14 },
    final: { dmg: 15, angle: 84, base: 7.6, growth: 7.6 },
    colors: BEAM_PURPLE,
  },
};
