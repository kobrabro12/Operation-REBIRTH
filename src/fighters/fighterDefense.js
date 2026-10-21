// Fighter methods: Shield, rolls, dodges, intangibility and hitstun.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';

export class FighterDefense {

  // ---- defence
  st_shield(c) {
    if (this.shieldStun > 0) { this.shieldStun--; return; }
    this.shieldHp -= 0.14;
    if (this.shieldHp <= 0) { this.breakShield(); return; }
    if (!c.held('shield')) { this.setState('land'); this.landLag = 6; return; }
    if (this.buffer.jump) { this.buffer.jump = 0; this.setState('jumpsquat'); return; }
    if (this.buffer.grab || (this.buffer.attack && c.held('shield'))) { this.buffer.grab = this.buffer.attack = 0; this.startAttack('grab'); return; }
    if (c.tappedSide()) { this.startRoll(Math.sign(c.x)); return; }
    if (c.tappedDown()) { this.setState('spotdodge'); sfx('dodge', 0.5); }
  }
  breakShield() {
    this.shieldHp = 30; this.setState('dizzy'); this.vy = -6; this.grounded = false;
    sfx('bighit', 0.8, 1.3); this.match.popText(this, 'SHIELD BREAK!', '#ffd34f');
  }
  st_dizzy() { if (this.t > 150 && this.grounded) this.setState('idle'); }
  startRoll(dir) { this.setState('roll'); this.rollDir = dir; sfx('dodge', 0.5); }
  st_roll() {
    this.vx = this.t < 18 ? this.rollDir * 3.6 : 0;
    if (this.t === 24) { this.facing = -this.rollDir; this.setState('idle'); }
  }
  st_spotdodge() { this.vx = 0; if (this.t >= 22) this.setState('idle'); }
  startAirdodge(c) {
    this.airdodged = true; this.setState('airdodge'); sfx('dodge', 0.5);
    const mag = Math.hypot(c.x, c.y);
    if (mag > 0.3) { this.vx = (c.x / mag) * 5.5; this.vy = (c.y / mag) * 5.5; this.adDirected = true; } else { this.adDirected = false; }
    this.fastFalling = false;
  }
  st_airdodge() {
    if (this.adDirected) { this.vx *= 0.88; this.vy *= 0.88; }
    if (this.t >= 28) this.setState('air');
  }
  isIntangible() {
    if (this.invincible > 0 || this.star > 0 || this.state === 'respawn') return true;
    if (this.state === 'roll') return this.t >= 4 && this.t <= 16;
    if (this.state === 'spotdodge') return this.t >= 3 && this.t <= 16;
    if (this.state === 'airdodge') return this.t >= 3 && this.t <= 20;
    if (this.state === 'limit' || this.state === 'dying') return true;
    if (this.state === 'counterstrike') return this.t <= 12;
    if (this.noclipping() || this.doorWalking()) return true;   // WHAT ONCE WAS: out of reality / in a doorway
    if (this.state === 'ledgeclimb') return this.t <= 12;
    if (this.state === 'ledgeroll') return this.t <= 22;
    if (this.state === 'ledgeattack') return this.t <= 10;
    return false;
  }

  // ---- being hit
  st_hitstun(c) {
    if (this.t >= this.hitstun) {
      this.setState(this.grounded ? 'idle' : 'air');
    } else if (this.grounded && this.t > 4 && Math.abs(this.lx) + Math.abs(this.ly) < 0.5) {
      // slid to a stop on the ground
      this.setState('idle');
    }
  }
}
