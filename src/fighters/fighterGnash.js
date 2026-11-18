// Fighter methods for GNASH (def `gnash.js`, `def.show.kind === 'gnash'`): his RAGE meter and ENRAGED, SEETHE
// (neutral, hold to fill RAGE), the GROUND SPLITTER double slam (down: the slam bounces him up, then he drops and
// slams again with a shockwave), AXE THROW (side, the GnashAxe in showEntities.js) and his Limit EXECUTIONER.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter. The hooks come in through fighterShow.js
// (showTick / showBonus / showLanded / drawShow), Fighter.st_attack (`m.gnash`, `m.axe`) and fighterLimit's st_limit.
import { sfx } from '../audio/sfx.js';
import { GnashAxe } from './showEntities.js';

/** GNASH's mixin (methods attached to Fighter). */
export class FighterGnash {
  // ------------------------------------------------------------------ RAGE
  /** Every frame (from showTick): ENRAGED burns down, smoking and sparking while it lasts. */
  gnashTick() {
    if (this.rageMeter === undefined) { this.rageMeter = 0; this.enraged = 0; }
    if (this.enraged > 0) {
      this.enraged--;
      const m = this.match;
      if (this.anim % 3 === 0) m.particles.push({ x: this.x + (Math.random() - 0.5) * 26, y: this.y - Math.random() * 56, vx: (Math.random() - 0.5) * 0.6, vy: -1.4 - Math.random(), life: 18, color: Math.random() < 0.5 ? 0xff3a1a : 0xffa030, size: 2, grav: 0 });
      if (this.anim % 7 === 0) m.particles.push({ shape: 'smoke', x: this.x + (Math.random() - 0.5) * 20, y: this.y - 60, vx: 0, vy: -0.8, life: 30, maxLife: 30, color: 0x2a1a14, grav: -0.01, drag: 0.96, r: 4 + Math.random() * 3 });
      if (this.enraged === 0) { this.rageMeter = 0; m.popText(this, 'CALMED DOWN', '#ffb080'); }
    }
  }
  /** Adds RAGE (not while ENRAGED); full -> ENRAGED: x dmg / kb, light hits don't flinch him, a bit of Limit. */
  addRage(n) {
    const R = this.def.show.rage;
    if (this.rageMeter === undefined) { this.rageMeter = 0; this.enraged = 0; }
    if (this.enraged > 0 || !(n > 0)) return;
    this.rageMeter = Math.min(R.max, this.rageMeter + n);
    if (this.rageMeter >= R.max) {
      this.enraged = R.time; this.limit = Math.min(100, this.limit + R.limit);
      const m = this.match; m.popText(this, 'ENRAGED!', '#ff5a2a'); m.shake(8, 12);
      sfx('roar', 0.8, 0.8); sfx('flame', 0.6, 0.8);
      for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2; m.particles.push({ x: this.x, y: this.y - 32, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 - 1, life: 26, color: i % 2 ? 0xff3a1a : 0xffd060, size: 3, grav: 0.05 }); }
    }
  }
  /** While ENRAGED: how much harder everything hits (null: as normal). */
  gnashBonus() { const R = this.def.show.rage; return this.enraged > 0 ? { dmg: R.dmg, kb: R.kb } : null; }
  /** A hit he landed: RAGE from damage dealt. */
  gnashLanded(t, hb) { this.addRage((hb.h.dmg || 0) * this.def.show.rage.perHit); }
  /** ENRAGED armour: a hit whose knockback on him would be `armor` or less doesn't make him flinch. */
  gnashArmour(hb) {
    if (!(this.enraged > 0) || !hb || !hb.h) return false;
    const h = hb.h; return (h.base || 0) + (h.growth || 0) * this.percent / 100 <= this.def.show.rage.armor;
  }

  // ------------------------------------------------------------------ specials (from st_attack)
  /**
   * His specials' frame-by-frame work (m.gnash): 'seethe' loops while special is held (fills RAGE); 'slam' bounces
   * him up at bounceAt into the second slam; 'drop' plunges at fallAt and slams with a shockwave on landing.
   * Returns true when it changed state (st_attack should stop).
   */
  gnashStep(m, c) {
    const R = this.def.show.rage, M = this.match;
    if (m.gnash === 'seethe') {
      const held = this.isCpu ? this.t + (this.seetheLoops || 0) * m.frames < (this.cpuSeethe || 60) : c.held('special');
      if (this.t === 1) { this.seetheLoops = 0; if (this.isCpu) this.cpuSeethe = 40 + Math.floor(Math.random() * 60); sfx('roar', 0.5, 0.9); }
      if (this.enraged <= 0) this.addRage(R.seethe);
      if (this.t % 6 === 0) { M.shake(1.5, 4); M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 4, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), life: 16, color: 0x8a7a6a, size: 2, grav: 0.1 }); }
      if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
      this.vx *= 0.8;
      if (this.t >= m.frames - 1 && held && this.enraged <= 0 && (this.seetheLoops || 0) * m.frames < m.maxHold) { this.seetheLoops = (this.seetheLoops || 0) + 1; this.t = m.loopFrom + 6; }
      else if (this.t > 6 && (!held || this.enraged > 0)) { this.setState(this.grounded ? 'idle' : 'air'); return true; }
      return false;
    }
    if (m.gnash === 'slam') {
      if (this.t === 12) { sfx('bighit', 0.7, 0.7); M.shake(6, 8); if (this.grounded) this.splinters(this.x + this.facing * 30, this.y, 10); }
      if (this.t === m.bounceAt) {
        this.vy = m.bounceV; this.grounded = false; this.platform = null; sfx('djump', 0.6, 0.7);
        this.startAttack('downB2'); return true;
      }
      return false;
    }
    if (m.gnash === 'drop') {
      if (this.t < m.fallAt) this.vy = Math.min(this.vy, 0.6);
      else if (!this.grounded) { this.vy = m.fallV; this.vx *= 0.9; }
      if (this.t >= m.fallAt && this.grounded && !this.dropLanded) {
        this.dropLanded = true; this.gnashWave(m.wave, this.x, this.y, 'gw' + this.attackId);
        this.setState('land'); this.landLag = m.slamLag; return true;
      }
      if (this.t === 1) this.dropLanded = false;
      if (this.t >= m.frames && !this.grounded) { this.t = m.frames - 1; }   // keep plunging until he lands (or falls off)
      return false;
    }
    return false;
  }
  /** The shockwave of a slam: everyone on the floor within `W.reach` of x either way is hit up; dust and cracks. */
  gnashWave(W, x, y, id) {
    const M = this.match; sfx('bighit', 1, 0.55); sfx('clang', 0.5, 0.6); M.shake(12, 14);
    for (const o of M.fighters) {
      if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
      if (Math.abs(o.x - x) < W.reach && Math.abs(o.y - y) < (W.height || 30)) M.applyHit(o, { h: W, owner: this, facing: Math.sign(o.x - x) || this.facing, id: id + ':' + o.slot }, x);
    }
    this.splinters(x, y, 18);
    this.waveFx = { x, y, t: 0, reach: W.reach };
  }
  /** Rock chips and dust kicked up off the floor at x, y. */
  splinters(x, y, n) {
    for (let i = 0; i < n; i++) this.match.particles.push({ x: x + (Math.random() - 0.5) * 30, y: y - 2, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 4, life: 26 + Math.random() * 10, color: [0x8a7a6a, 0x5a4a3a, 0xc8b8a0][i % 3], size: 2 + (i % 2), grav: 0.25 });
  }
  /** AXE THROW: the axe hurled end over end (one at a time - it's out until it comes back to his hand). */
  throwAxe(spec) { if (this.cleaverOut) return; this.cleaverOut = new GnashAxe(this.match, this, spec); this.match.projectiles.push(this.cleaverOut); }

  // ------------------------------------------------------------------ Limit
  /**
   * EXECUTIONER (type 'executioner'): he crouches, leaps (leapAt) and hangs at the top (hangFrom-hangTo) drifting over
   * the nearest foe; then he drops like a meteor and the axe comes down - whoever is within `reach` of where he lands
   * takes the blow, everyone on that floor the shockwave. Ends when he's landed and the dust settles.
   */
  executionerLimit(L) {
    const M = this.match;
    if (this.t === 1) { this.ult = { landed: 0, tgt: null }; sfx('limit', 0.6, 0.8); sfx('roar', 0.8, 0.7); M.shake(6, 10); }
    const U = this.ult; this.lx = 0;
    if (this.t < L.leapAt) { this.vx = 0; this.vy = this.grounded ? 0 : 0.5; }
    else if (this.t === L.leapAt) { this.vy = L.leapV; this.grounded = false; this.platform = null; sfx('djump', 0.8, 0.6); this.splinters(this.x, this.y, 10); }
    else if (this.t < L.hangFrom) { this.vy = Math.min(0, this.vy + 0.5); this.vx *= 0.9; }
    else if (this.t <= L.hangTo) {
      if (!U.tgt || !U.tgt.alive) {
        let bd = 1e9; U.tgt = null;
        for (const o of M.fighters) { if (o === this || !o.alive || o.team === this.team || o.state === 'respawn') continue; const d = Math.abs(o.x - this.x); if (d < bd) { bd = d; U.tgt = o; } }
      }
      this.vy = Math.sin(this.t * 0.2) * 0.3;
      if (U.tgt) { this.vx = (U.tgt.x - this.x) * L.track; this.facing = Math.sign(U.tgt.x - this.x) || this.facing; }
      if (this.t % 4 === 0) M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 70, vx: 0, vy: 0.6, life: 20, color: 0xff5a2a, size: 2, grav: 0 });
    } else if (!U.landed) {
      this.vx *= 0.8; this.vy = L.dropV;
      if (this.t % 2 === 0) M.particles.push({ x: this.x + (Math.random() - 0.5) * 16, y: this.y - 30, vx: 0, vy: -3, life: 14, color: Math.random() < 0.5 ? 0xffd060 : 0xff3a1a, size: 3, grav: 0 });
      if (this.grounded || this.t > L.frames + 60) {
        U.landed = this.t; this.vx = 0;
        if (this.t < 102) this.t = 102;                 // the chop frame of his animation
        for (const o of M.fighters) {
          if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
          if (Math.hypot(o.x - (this.x + this.facing * 20), o.y - this.y) < L.reach) M.applyHit(o, { h: L.blow, owner: this, facing: this.facing, pillar: true, id: 'gnX' + this.slot + ':' + o.slot + ':' + this.age }, this.x);
        }
        if (this.grounded) this.gnashWave(L.wave, this.x, this.y, 'gnXw' + this.age);
        M.popText(this, 'OFF WITH IT!', '#ff5a2a'); sfx('ko', 0.7, 0.7);
        for (let i = 0; i < 30; i++) M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 10, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 6, life: 34, color: [0xffd060, 0xff8a3a, 0xff3a1a][i % 3], size: 3, grav: 0.12 });
      } else if (this.t >= 100) this.t = 100;          // hold the overhead pose until he hits the floor
    }
    if (U.landed) { this.vx = 0; if (!this.grounded) this.vy = Math.max(this.vy, 3); }
    if (U.landed && this.t >= U.landed + 36) { this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  // ------------------------------------------------------------------ drawing (from drawShow)
  /** Everything GNASH draws round himself: his RAGE meter, the ENRAGED glow, a slam's shockwave, EXECUTIONER's mark. */
  drawGnash(g, spr) {
    const R = this.def.show.rage, s = this.state;
    if (this.alive && s !== 'respawn') {                       // the RAGE meter: a little horned bar over his name
      const w = 34, x = this.x - w / 2, y = this.y - (this.def.tagY || 70) - 14, k = this.enraged > 0 ? this.enraged / R.time : (this.rageMeter || 0) / R.max;
      g.fillStyle(0x140806, 0.8); g.fillRect(x - 1, y - 1, w + 2, 5);
      g.fillStyle(this.enraged > 0 ? (this.anim % 8 < 4 ? 0xffd060 : 0xff3a1a) : 0xc8301a, 1); g.fillRect(x, y, w * k, 3);
      g.fillStyle(0x140806, 0.8); g.fillTriangle(x - 1, y - 1, x + 3, y - 1, x - 3, y - 6); g.fillTriangle(x + w + 1, y - 1, x + w - 3, y - 1, x + w + 3, y - 6);
    }
    if (this.enraged > 0 && this.alive) {                      // a red heat glow round him
      g.fillStyle(0xff3a1a, 0.08 + 0.05 * Math.sin(this.anim * 0.3)); g.fillEllipse(this.x, this.y - 30, 70, 84);
      if (spr && spr.setTint) spr.setTint(this.anim % 10 < 5 ? 0xffb0a0 : 0xffffff);
    } else if (spr && spr.clearTint && this.wasEnraged) spr.clearTint();
    this.wasEnraged = this.enraged > 0;
    if (s === 'attack' && this.move && this.move.gnash === 'seethe') {   // SEETHE: heat shimmer rings
      for (let i = 0; i < 2; i++) { const r = 20 + ((this.anim * 2 + i * 20) % 40); g.lineStyle(2, 0xff5a2a, 0.5 * (1 - r / 60)); g.strokeEllipse(this.x, this.y - 30, r * 1.4, r); } g.lineStyle(0);
    }
    const W = this.waveFx;                                     // a slam's shockwave racing out both ways
    if (W) {
      W.t++; const k = W.t / 18, r = W.reach * Math.min(1, k * 1.4);
      for (const d of [-1, 1]) { g.fillStyle(0xffd0a0, 0.8 * (1 - k)); g.fillTriangle(W.x + d * r, W.y, W.x + d * (r - 26), W.y, W.x + d * (r - 8), W.y - 16 * (1 - k)); }
      g.fillStyle(0x2a1a14, 0.6 * (1 - k)); for (let i = -3; i <= 3; i++) g.fillRect(W.x + i * 10 - 1, W.y - 1, 3, 2 + Math.abs(i));
      if (W.t >= 18) this.waveFx = null;
    }
    if (s === 'limit' && this.ult && this.def.limit.type === 'executioner') {
      const L = this.def.limit, U = this.ult;
      if (U.tgt && U.tgt.alive && this.t >= L.hangFrom && !U.landed) {   // the mark on the condemned
        const x = U.tgt.x, y = U.tgt.y - 30, r = 16 + Math.sin(this.t * 0.4) * 3;
        g.lineStyle(2, 0xff3a1a, 0.9); g.strokeCircle(x, y, r); g.lineBetween(x - r - 4, y, x + r + 4, y); g.lineBetween(x, y - r - 4, x, y + r + 4); g.lineStyle(0);
      }
      if (U.landed && this.t < U.landed + 24) {                  // the pillar of fire
        const k = 1 - (this.t - U.landed) / 24;
        g.fillStyle(0xff3a1a, 0.8 * k); g.fillRect(this.x + this.facing * 20 - 24 * k, this.y - 240, 48 * k, 240);
        g.fillStyle(0xffe0a0, k); g.fillRect(this.x + this.facing * 20 - 9 * k, this.y - 240, 18 * k, 240);
      }
    }
  }
}
