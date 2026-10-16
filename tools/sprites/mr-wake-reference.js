/* =====================================================================
   MR WAKE — Operation REBIRTH
   A black blob in a maroon wizard's hat and cloak, wielding a long dark
   staff topped with a purple gem that fires energy.
   Sprite: a-wizard-with-a-staff-with-a-purple-gem-64x64px.svg (the original)
   Projectile: mr-wake-energy-bolt-16x16px.svg

   Playstyle: zoner with a long staff. He fights from the gem's end of the
   staff: bolts come out of the gem, and his best melee hits are at the
   staff tip, so he wants foes at arm's-length-plus-staff, not up close.
   ===================================================================== */

/* ---------- SPRITE SETUP ----------
   Measured from the 64x64 sprite:
   - The sprite FACES LEFT (gem end of the staff points left). Flip it when
     facing === 1 (right).
   - Body (hurtbox) spans sprite x 24-48, y 4-62.
   - Gem center is at sprite (14, 16).
   Drawn at SCALE 1.25 (80x80 on screen), which gives a 30x72 hurtbox,
   close to the outline's default 40x70.
   All offsets below are in screen pixels, measured from the fighter's
   CENTER, with +x = the way he's facing and -y = up. */
const MR_WAKE_SPRITE = {
  src: 'a-wizard-with-a-staff-with-a-purple-gem-64x64px.svg',
  // idle animation (breathing, cloak sway, blink, staff flame): 32 frames side by side, 64x64 each
  sheet: 'mr-wake-idle-sheet.png',
  frames: 32,
  frameMs: 100,                       // 10 frames per second, on any monitor
  scale: 1.25,
  facesLeft: true,
  bodyCenter: { x: 36, y: 33 },       // body center in sprite pixels (hurtbox x 24-48, y 4-62)
  gemTip:     { x: 28,  y: -21 },     // projectile spawn point
};

/* ---------- ROSTER entry (add to ROSTER) ---------- */
const MR_WAKE_STATS = {
  weight: 95,        // tall, light caster: launches a bit earlier than brawler
  runSpeed: 4.2,     // glides in the cloak, not a sprinter
  jumpPower: 12,
  airJumps: 1,
  size: { w: 30, h: 72 },
};

/* ---------- MOVES (add to MOVES) ----------
   Same fields as the outline. Moves with `projectile` spawn a Projectile
   from MR_WAKE_SPRITE.gemTip; speed is px/frame, life is frames. */
const MR_WAKE_MOVES = {
  // Ground
  wake_jab:         { startup: 7,  active: 5, endlag: 15, damage: 5,  baseKB: 5,  kbScale: 0.7, angle: 40,
                      hitbox: { x: 0, y: -60, w: 42, h: 70 } },           // baseball-bat swing: arcs over and down in front
  wake_forwardTilt: { startup: 9,  active: 4, endlag: 15, damage: 9,  baseKB: 5,  kbScale: 0.85, angle: 38,
                      hitbox: { x: 18, y: -30, w: 22, h: 18 } },          // gem thrust: hits at the staff tip
  wake_downTilt:    { startup: 6,  active: 4, endlag: 12, damage: 6,  baseKB: 4,  kbScale: 0.5, angle: 20,
                      hitbox: { x: 10, y: 22, w: 40, h: 14 } },           // low staff sweep at the feet
  wake_upTilt:      { startup: 7,  active: 6, endlag: 13, damage: 7,  baseKB: 5,  kbScale: 0.7, angle: 85,
                      hitbox: { x: -20, y: -60, w: 50, h: 24 } },         // staff twirl overhead
  wake_forwardSmash:{ startup: 18, active: 5, endlag: 28, damage: 19, baseKB: 8,  kbScale: 1.2, angle: 36,
                      hitbox: { x: 20, y: -36, w: 34, h: 34 } },          // gem slam with an energy burst
  wake_upSmash:     { startup: 15, active: 6, endlag: 24, damage: 17, baseKB: 8,  kbScale: 1.15, angle: 88,
                      hitbox: { x: -18, y: -82, w: 36, h: 50 } },         // raises gem, pillar of energy above
  wake_downSmash:   { startup: 13, active: 6, endlag: 24, damage: 14, baseKB: 7,  kbScale: 1.0, angle: 25,
                      hitbox: { x: -45, y: 20, w: 90, h: 16 } },          // cloak spin, hits both sides

  // Aerials
  wake_nair:        { startup: 5,  active: 8, endlag: 10, damage: 7,  baseKB: 4,  kbScale: 0.6, angle: 45,
                      hitbox: { x: -30, y: -30, w: 60, h: 60 } },         // cloak swirl
  wake_fair:        { startup: 10, active: 4, endlag: 16, damage: 11, baseKB: 6,  kbScale: 0.9, angle: 40,
                      hitbox: { x: 16, y: -28, w: 28, h: 26 } },          // gem swing
  wake_bair:        { startup: 8,  active: 3, endlag: 14, damage: 10, baseKB: 6,  kbScale: 0.95, angle: 145,
                      hitbox: { x: -40, y: -4, w: 26, h: 14 } },          // jab back with the staff's butt end
  wake_dair:        { startup: 14, active: 5, endlag: 20, damage: 12, baseKB: 6,  kbScale: 1.0, angle: 270,
                      hitbox: { x: -12, y: 26, w: 30, h: 22 } },          // gem plunge (spike)

  // Specials (all fire from the gem)
  wake_neutralB:    { startup: 12, active: 1, endlag: 18, damage: 0, baseKB: 0, kbScale: 0, angle: 0,
                      projectile: { sprite: 'mr-wake-energy-bolt-16x16px.svg', speed: 9, life: 70,
                                    damage: 7, baseKB: 3, kbScale: 0.5, angle: 25, w: 16, h: 12 } },  // Wake Bolt
  wake_sideB:       { startup: 16, active: 1, endlag: 22, damage: 0, baseKB: 0, kbScale: 0, angle: 0,
                      projectile: { sprite: 'mr-wake-energy-bolt-16x16px.svg', speed: 5, life: 120,
                                    damage: 11, baseKB: 5, kbScale: 0.8, angle: 40, w: 24, h: 20,
                                    homing: 0.15 } },                      // Drifting Soul: slow, curves toward a foe
  wake_upB:         { startup: 8,  active: 10, endlag: 20, damage: 5, baseKB: 4, kbScale: 0.5, angle: 80,
                      hitbox: { x: -20, y: 20, w: 40, h: 30 },
                      recovery: { velY: -16, velX: 3, helpless: true } },  // Gem Rocket: blasts the staff downward, launches up
  wake_downB:       { startup: 10, active: 24, endlag: 16, damage: 4, baseKB: 2, kbScale: 0.3, angle: 90,
                      hitbox: { x: -40, y: 28, w: 80, h: 10 },
                      slowVictim: 0.5 },                                   // Shadow Pool: his blob body seeps out of the cloak into a sticky puddle
};

/* ---------- Drawing (use in Fighter.draw for Mr Wake) ---------- */
const mrWakeSheet = new Image();
mrWakeSheet.src = MR_WAKE_SPRITE.sheet;

// Attack animations: one 64x64 frame per entry in `ticks` (game frames at 60fps).
// The jab's ticks add up to its startup + active + endlag (4 + 3 + 9 = 16).
const MR_WAKE_ANIMS = {
  // the bat swing needs room: 96x96 frames, with his 64x64 body placed 16px in from the top-left
  wake_jab: { sheet: 'mr-wake-jab-sheet.png', size: 96, offset: 16,
              ticks: [3, 2, 2, 1, 2, 2, 4, 4, 4, 3] },   // 7 startup + 5 active + 15 endlag
};
// Walk cycle: 8 frames, advanced by distance traveled (2 sprite px per frame) so his
// planted foot stays put on the ground at any speed.
const MR_WAKE_WALK = { sheet: 'mr-wake-walk-sheet.png', frames: 8, pxPerFrame: 2 };
MR_WAKE_WALK.img = new Image(); MR_WAKE_WALK.img.src = MR_WAKE_WALK.sheet;

for (const a of Object.values(MR_WAKE_ANIMS)) { a.img = new Image(); a.img.src = a.sheet; }

// NOTE: needs the move's name on currentMove. In Fighter.startAttack, use:
//   this.currentMove = { name: moveName, data: MOVES[moveName], frame: 0 };

// which sheet frame to show for a move, given how many game frames into it he is
function animFrame(anim, moveFrame) {
  let t = moveFrame;
  for (let i = 0; i < anim.ticks.length; i++) {
    if (t < anim.ticks[i]) return i;
    t -= anim.ticks[i];
  }
  return anim.ticks.length - 1;
}
function drawMrWake(ctx, f) {
  const s = MR_WAKE_SPRITE;
  const flip = s.facesLeft ? f.facing === 1 : f.facing === -1;
  const cx = f.pos.x + f.size.w / 2, cy = f.pos.y + f.size.h / 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;          // keep pixels crisp
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-1, 1);
  // attack animation if he's mid-move, walk if he's moving on the ground, otherwise idle
  const anim = f.currentMove && MR_WAKE_ANIMS[f.currentMove.name];
  const walking = !anim && f.grounded && Math.abs(f.vel.x) > 0.3;
  let sheet, frame;
  if (anim) {
    sheet = anim.img; frame = animFrame(anim, f.currentMove.frame);
  } else if (walking) {
    // distance along his facing direction, in sprite pixels -> walk frame
    const d = Math.floor((f.facing * f.pos.x) / (MR_WAKE_WALK.pxPerFrame * s.scale));
    sheet = MR_WAKE_WALK.img; frame = ((d % 8) + 8) % 8;
  } else {
    sheet = mrWakeSheet; frame = Math.floor(performance.now() / s.frameMs) % s.frames;
  }
  // line the sprite's body center up with the fighter's center
  const fs = anim && anim.size ? anim.size : 64;      // frame size in the sheet
  const off = anim && anim.offset ? anim.offset : 0;  // where the 64x64 body sits inside it
  ctx.drawImage(sheet, frame * fs, 0, fs, fs,
                -(s.bodyCenter.x + off) * s.scale, -(s.bodyCenter.y + off) * s.scale,
                fs * s.scale, fs * s.scale);
  ctx.restore();
}

/* ---------- Projectile class (add next to Hitbox in section 6) ---------- */
class Projectile {
  constructor(owner, spec) {
    const tip = MR_WAKE_SPRITE.gemTip;
    const cx = owner.pos.x + owner.size.w / 2, cy = owner.pos.y + owner.size.h / 2;
    this.owner = owner; this.spec = spec;
    this.pos = new Vec2(cx + tip.x * owner.facing - spec.w / 2, cy + tip.y - spec.h / 2);
    this.vel = new Vec2(spec.speed * owner.facing, 0);
    this.life = spec.life;
    this.hit = new Set();
  }
  update(fighters) {
    if (this.spec.homing) {
      const foes = fighters.filter(f => f !== this.owner && f.stocks > 0);
      if (foes.length) {
        const t = foes.reduce((a, b) =>
          Math.abs(a.pos.x - this.pos.x) < Math.abs(b.pos.x - this.pos.x) ? a : b);
        this.vel.y += Math.sign(t.pos.y - this.pos.y) * this.spec.homing;
      }
    }
    this.pos.x += this.vel.x; this.pos.y += this.vel.y;
    this.life--;
  }
  getRect() { return { x: this.pos.x, y: this.pos.y, w: this.spec.w, h: this.spec.h }; }
  get dead() { return this.life <= 0 || this.hit.size > 0; }
}
// In Game.resolveHits(): for each live projectile vs each fighter except its owner,
// if rectsOverlap(p.getRect(), fighterRect) -> applyHit(p.owner, fighter, p.spec); p.hit.add(fighter).
