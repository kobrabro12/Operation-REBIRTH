// Mr Wake: fighter #2. A black blob in a maroon wizard's hat and cloak, wielding a long dark
// staff topped with a purple gem that fires energy. Zoner: he fights from the gem's end of the staff.
//
// The move numbers below are copied exactly from tools/sprites/mr-wake-reference.js (the designer's
// file) and converted into this game's units by `convert()`:
//   - that file draws him at 1.25x and measures boxes from his body CENTER; this game draws
//     fighters at 1x and measures from the FEET, so boxes are divided by 1.25 and moved down 29 px
//   - baseKB x 0.55 and kbScale x 7 give knockback on the same scale as Soul Summoner's moves
//   - startup / active / endlag become the hit window (from..to) and the move's total length
import { DEFAULT_GRAB, BEAM_PURPLE } from './common.js';

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

// ---- the designer's numbers (from mr-wake-reference.js)
const RAW = {
  jab:         { startup: 7,  active: 5, endlag: 15, damage: 5,  baseKB: 5, kbScale: 0.7,  angle: 40, hitbox: { x: 0, y: -60, w: 42, h: 70 } },
  forwardTilt: { startup: 9,  active: 4, endlag: 15, damage: 9,  baseKB: 5, kbScale: 0.85, angle: 38, hitbox: { x: 18, y: -30, w: 22, h: 18 } },
  downTilt:    { startup: 6,  active: 4, endlag: 12, damage: 6,  baseKB: 4, kbScale: 0.5,  angle: 20, hitbox: { x: 10, y: 22, w: 40, h: 14 } },
  upTilt:      { startup: 7,  active: 6, endlag: 13, damage: 7,  baseKB: 5, kbScale: 0.7,  angle: 85, hitbox: { x: -20, y: -60, w: 50, h: 24 } },
  forwardSmash:{ startup: 18, active: 5, endlag: 28, damage: 19, baseKB: 8, kbScale: 1.2,  angle: 36, hitbox: { x: 20, y: -36, w: 34, h: 34 } },
  upSmash:     { startup: 15, active: 6, endlag: 24, damage: 17, baseKB: 8, kbScale: 1.15, angle: 88, hitbox: { x: -18, y: -82, w: 36, h: 50 } },
  downSmash:   { startup: 13, active: 6, endlag: 24, damage: 14, baseKB: 7, kbScale: 1.0,  angle: 25, hitbox: { x: -45, y: 20, w: 90, h: 16 } },
  nair:        { startup: 5,  active: 8, endlag: 10, damage: 7,  baseKB: 4, kbScale: 0.6,  angle: 45, hitbox: { x: -30, y: -30, w: 60, h: 60 } },
  fair:        { startup: 10, active: 4, endlag: 16, damage: 11, baseKB: 6, kbScale: 0.9,  angle: 40, hitbox: { x: 16, y: -28, w: 28, h: 26 } },
  bair:        { startup: 8,  active: 3, endlag: 14, damage: 10, baseKB: 6, kbScale: 0.95, angle: 145, hitbox: { x: -40, y: -4, w: 26, h: 14 } },
  dair:        { startup: 14, active: 5, endlag: 20, damage: 12, baseKB: 6, kbScale: 1.0,  angle: 270, hitbox: { x: -12, y: 26, w: 30, h: 22 } },
  neutralB:    { startup: 12, active: 1, endlag: 18, projectile: { speed: 9, life: 70, damage: 7, baseKB: 3, kbScale: 0.5, angle: 25, w: 16, h: 12 } },
  sideB:       { startup: 16, active: 1, endlag: 22, projectile: { speed: 5, life: 120, damage: 11, baseKB: 5, kbScale: 0.8, angle: 40, w: 24, h: 20, homing: 0.15 } },
  upB:         { startup: 8,  active: 10, endlag: 20, damage: 5, baseKB: 4, kbScale: 0.5, angle: 80, hitbox: { x: -20, y: 20, w: 40, h: 30 } },
  downB:       { startup: 10, active: 24, endlag: 16, damage: 4, baseKB: 2, kbScale: 0.3, angle: 90, hitbox: { x: -40, y: 28, w: 80, h: 10 }, slowVictim: 0.5 },
};

const upB = convert(RAW.upB);

export const MR_WAKE = {
  id: 'mr-wake',
  name: 'MR WAKE',
  sheets: { idle: 'wake_idle' },
  facesLeft: true,                 // the sprite looks left (gem end of the staff points left)
  originX: 36 / 64,                // body centre column
  originY: 62 / 64,                // feet sit on row 61
  handOffset: { x: 22, y: -46 },   // the gem: where bolts come out
  portrait: [22, 0, 40, 36],       // crop of the idle frame for the select grid
  tagY: 68,
  fxColor: 0x9b5de5,
  body: { w: 24, h: 56 },
  weight: 0.95,                    // tall, light caster: launches a bit earlier
  walkSpeed: 2.8, runAccel: 0.5, groundFriction: 0.5,
  airSpeed: 2.6, airAccel: 0.22, airFriction: 0.04,
  jumpV: -9.0, shortHopV: -6.0, doubleJumpV: -8.4,

  moves: {
    ...DEFAULT_GRAB,
    jab: convert(RAW.jab, { fx: 'arc' }),            // baseball-bat swing of the staff
    ftilt: convert(RAW.forwardTilt, { lunge: 1.5 }),  // gem thrust: hits at the staff tip
    dtilt: convert(RAW.downTilt, { fx: 'low' }),      // low staff sweep
    utilt: convert(RAW.upTilt, { fx: 'spin' }),       // staff twirl overhead
    fsmash: convert(RAW.forwardSmash, { lunge: 2 }),  // gem slam with an energy burst
    usmash: convert(RAW.upSmash),                     // raises the gem, energy pillar above
    dsmash: convert(RAW.downSmash, { fx: 'low' }),    // cloak spin, hits both sides
    nair: convert(RAW.nair, { landLag: 6, fx: 'spin' }),
    fair: convert(RAW.fair, { landLag: 9 }),
    bair: convert(RAW.bair, { landLag: 8 }),
    dair: convert(RAW.dair, { landLag: 14 }),
    neutralB: convert(RAW.neutralB),                  // Wake Bolt
    sideB: convert(RAW.sideB),                        // Drifting Soul: slow, curves toward a foe
    downB: convert(RAW.downB, { fx: 'low', fxTint: 0x2a1040 }),         // Shadow Pool: sticky puddle that slows
    // Gem Rocket: blasts the staff downward and launches up, then helpless
    upb: { frames: upB.frames, riseAt: RAW.upB.startup, riseV: -12, pushX: 2.4, drift: 2.0, hits: upB.hits },
  },

  // Limit (placeholder until his real one is designed): Void Beam, a purple energy beam from the gem.
  // Same timing and 50% total as Soul Summoner's Soulfire Beam.
  limit: {
    name: 'VOID BEAM', frames: 112, beamStart: 36, beamEnd: 98, beamLength: 720, beamHalf: 20, colors: BEAM_PURPLE,
    hits: [
      { at: 40, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 50, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 60, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 70, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 80, dmg: 8, angle: 6, base: 1.4, growth: 0, stun: 14 },
      { at: 92, dmg: 10, angle: 32, base: 5.5, growth: 6.5 },
    ],
  },
};
