// Fighter methods: Ledge grabbing, hanging, and the climb / roll / attack get-ups.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { newAttackId } from './attackIds.js';

export class FighterLedge {

  // ------------------------------------------------------------------ ledges
  // Falling (or recovering) next to a corner of the solid stage catches the edge. From the ledge:
  // toward the stage or up = climb, jump = jump up, attack = climb with a sweeping attack,
  // shield = roll onto the stage, away or down = let go. Hanging too long (5 s) lets go by itself.
  hangPos(L) { return { x: L.x + L.side * (this.body.w / 2 + 1), y: L.y + this.body.h - 14 }; }
  tryLedgeGrab(c) {
    const s = this.state;
    if (this.grounded || this.ledgeCooldown > 0 || this.possessed > 0 || this.headless) return;
    if (!['air', 'helpless', 'upb', 'airdodge'].includes(s)) return;
    if (s === 'upb' && this.t < (this.def.moves.upb.riseAt || 0) + 2) return;
    if (c.y > 0.5) return;                                      // holding down: don't grab
    for (const p of this.match.stage.platforms) {
      if (!p.solid) continue;
      for (const side of [-1, 1]) {
        const L = { p, side, x: side < 0 ? p.x1 : p.x2, y: p.y };
        const h = this.hangPos(L);
        if (side < 0 ? this.x > p.x1 : this.x < p.x2) continue;  // must be outside the stage
        if (Math.abs(this.x - h.x) > 20) continue;
        const top = this.y - this.body.h - L.y;                  // head height relative to the ledge
        if (top < -34 || top > 22) continue;
        if (s !== 'upb' && this.vy < -1.5) continue;             // rising past it on a jump: no grab
        if (this.match.fighters.some((f) => f !== this && f.alive && f.ledge && f.ledge.p === p && f.ledge.side === side && f.state.startsWith('ledge'))) continue;
        this.grabLedge(L); return;
      }
    }
  }
  grabLedge(L) {
    const h = this.hangPos(L);
    this.ledge = L; this.setState('ledge');
    this.x = h.x; this.y = h.y; this.vx = this.vy = this.lx = this.ly = 0;
    this.facing = -L.side; this.fastFalling = false;
    this.jumpsLeft = 1; this.usedUpB = false; this.usedDive = false; this.airdodged = false;          // a fresh recovery
    if (this.ledgeGrabs === 0) this.invincible = Math.max(this.invincible, 36); // safe on the first grab only
    this.ledgeGrabs++;
    this.stopChargeSound();
    sfx('land', 0.5, 1.4); this.match.puff(L.x, L.y, 0xf0f2f3, 3);
  }
  letGoLedge(cooldown = 30) {
    this.ledgeCooldown = cooldown; this.setState('air'); this.vy = 1; this.ledge = null;
  }
  st_ledge(c) {
    const L = this.ledge, toward = -L.side;
    if (this.t < 8) return;                                     // short hang before acting
    if (this.t > 300) { this.letGoLedge(60); return; }
    if (this.buffer.jump) { this.buffer.jump = 0; this.ledge = null; this.setState('air'); this.y = L.y - 6; this.vy = this.def.jumpV; this.vx = toward * 1.2; this.ledgeCooldown = 20; sfx('jump', 0.5); return; }
    if (this.buffer.attack) { this.buffer.attack = 0; this.setState('ledgeattack'); return; }
    if (this.buffer.shield) { this.buffer.shield = 0; this.setState('ledgeroll'); sfx('dodge', 0.5); return; }
    if (c.x * toward > 0.5 || c.y < -0.5) { this.setState('ledgeclimb'); return; }
    if (c.x * toward < -0.5 || c.y > 0.5) { this.letGoLedge(); return; }
  }
  // move from the hang position onto the stage over `frames`, ending `dist` px in from the edge
  climbTo(frames, dist) {
    const L = this.ledge, h = this.hangPos(L), k = Math.min(1, this.t / frames);
    const up = Math.min(1, k * 2), over = Math.max(0, k * 2 - 1);
    this.x = h.x + (-L.side) * (this.body.w / 2 + 1 + dist) * over;
    this.y = h.y + (L.y - h.y) * up;
    if (this.t >= frames) { this.x = L.x - L.side * dist; this.y = L.y; this.grounded = true; this.platform = L.p; this.ledge = null; return true; }
    return false;
  }
  st_ledgeclimb() { if (this.climbTo(18, 18)) this.setState('idle'); }
  st_ledgeroll() { if (this.climbTo(28, 72)) { this.setState('idle'); } }
  st_ledgeattack() {
    if (this.t < 14) { this.climbTo(14, 14); return; }
    if (this.ledge) this.climbTo(14, 14);
    if (this.t === 14) { this.attackId = newAttackId(); this.hitList = new Set(); sfx('swing', 0.6); }
    if (this.t >= 30) this.setState('idle');
  }
}
