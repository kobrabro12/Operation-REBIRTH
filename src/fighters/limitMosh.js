// Fighter methods: NU's Limit, MOSH PIT - the mic drop, the shockwave and the pyro - and his Crowd Surf.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';

export class LimitMosh {
  // ------------------------------------------------------------------ Mosh Pit Limit (NU)
  // Raises the mic... and drops it. A shockwave races along the floor both ways: anyone standing on it
  // is thrown up and a pyro column erupts under them (jump the wave to dodge it). Pyro keeps going off
  // across the stage while the crowd goes wild below.
  moshLimit(L) {
    const m = this.match;
    if (this.t === 1) this.ult = { waves: 0, hit: [], pyro: [], plat: this.platform };
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    if (!this.grounded) this.vy = Math.max(this.vy, 4);                 // drops to the floor for the mic drop
    if (this.t === L.dropAt) {
      U.waves = 1; U.wy = this.y; U.wx = this.x; U.plat = this.platform;
      sfx('bighit', 1, 0.5); sfx('ko', 0.5, 0.7); m.shake(14, 10);
      for (let i = 0; i < 20; i++) m.particles.push({ x: this.x, y: this.y - 2, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 4, life: 30, color: i % 2 ? this.pal.light : 0xffffff, size: 3 });
    }
    if (U.waves) {
      const dist = (this.t - L.dropAt) * L.waveSpeed;
      if (dist < L.waveReach) for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || U.hit.includes(o) || o.isIntangible() || o.state === 'respawn') continue;
        if (o.grounded && Math.abs(o.y - U.wy) < 4 && Math.abs(o.x - U.wx) <= dist) {
          U.hit.push(o);
          m.applyHit(o, { h: L.wave, owner: this, facing: Math.sign(o.x - U.wx) || this.facing, id: 'moshw' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, U.wx);
          U.pyro.push({ x: o.x, y: U.wy, at: this.t + L.pyroDelay, victim: o, big: true });
        }
      }
      // pyro going off across the stage
      if (this.t < L.dropAt + L.pyroFor && (this.t - L.dropAt) % L.pyroEvery === 0 && U.plat) {
        const P = U.plat, x = P.x1 + 20 + Math.random() * (P.x2 - P.x1 - 40);
        U.pyro.push({ x, y: P.y, at: this.t + 14 });
      }
    }
    for (const p of U.pyro) {                                           // each column: a warning glow on the floor, then fire
      if (this.t === p.at) {
        sfx(p.big ? 'bighit' : 'hit', p.big ? 0.9 : 0.5, p.big ? 0.6 : 0.8); m.shake(p.big ? 10 : 4, 6);
        const box = { x1: p.x - 14, x2: p.x + 14, y1: p.y - 110, y2: p.y + 2 };
        for (const o of m.fighters) {
          if (o === this || !o.alive || o.team === this.team || o.isIntangible()) continue;
          if (p.big ? o === p.victim : (o.x > box.x1 && o.x < box.x2 && o.y > box.y1 && o.y < box.y2 + 4)) {
            m.applyHit(o, { h: p.big ? L.blast : L.pyro, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'moshp' + this.slot + ':' + o.slot + ':' + p.at + ':' + Math.round(p.x), pillar: true }, p.x);
          }
        }
      }
    }
    if (this.t >= L.frames) { this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  drawMosh(g, L, U) {
    const m = this.match, P = this.pal, t = this.t;
    // the crowd below the stage, arms in the air, jumping to the beat
    const v = m.worldCam.worldView, base = v.bottom + 6, k = Math.min(1, t / 30) * Math.min(1, (L.frames - t) / 20);
    for (let i = 0; i < 46; i++) {
      const x = v.x + (i / 45) * v.width, hop = Math.abs(Math.sin(t * 0.25 + i * 1.7)) * 6, y = base - 18 * k - hop;
      g.fillStyle(0x0b0a14, 0.92); g.fillCircle(x, y, 7); g.fillRect(x - 8, y + 4, 16, 20);
      if (i % 2) { g.fillRect(x - 9, y - 16 + hop * 0.5, 3, 14); g.fillRect(x + 6, y - 14 - hop * 0.3, 3, 12); }
      if (i % 7 === 3 && t % 10 < 5) { g.fillStyle(P.light, 0.9); g.fillRect(x + 5, y - 22, 3, 4); }   // a lighter held up
    }
    if (U.waves) {                                                      // the shockwave: two bright fronts racing along the floor
      const dist = Math.min(L.waveReach, (t - L.dropAt) * L.waveSpeed), fade = Math.max(0, 1 - (t - L.dropAt) / 40);
      for (const s of [-1, 1]) {
        const x = U.wx + s * dist;
        g.fillStyle(P.core, fade); g.fillRect(x - 3, U.wy - 14, 6, 14);
        g.fillStyle(P.light, fade * 0.8); g.fillRect(Math.min(x, U.wx), U.wy - 3, Math.abs(x - U.wx), 3);
        g.fillStyle(P.mid, fade * 0.6); g.fillRect(x - s * 14, U.wy - 8, 10, 8);
      }
    }
    for (const p of U.pyro) {
      const d = t - p.at;
      if (d < 0) {                                                       // warning: a glowing spot on the floor
        g.fillStyle(0xff4a3a, 0.4 + 0.3 * ((t >> 1) % 2)); g.fillRect(p.x - 12, p.y - 2, 24, 3);
      } else if (d < 24) {                                               // the column of fire
        const hgt = (p.big ? 140 : 100) * Math.min(1, d / 4), w = (p.big ? 26 : 18) * (1 - d / 30), fade = 1 - d / 24;
        g.fillStyle(0xff4a3a, 0.9 * fade); g.fillRect(p.x - w / 2, p.y - hgt, w, hgt);
        g.fillStyle(0xffa030, fade); g.fillRect(p.x - w / 3, p.y - hgt * 0.9, w * 2 / 3, hgt * 0.9);
        g.fillStyle(P.core, fade); g.fillRect(p.x - w / 6, p.y - hgt * 0.75, w / 3, hgt * 0.75);
        if (d % 2 === 0) m.particles.push({ x: p.x + (Math.random() - 0.5) * w, y: p.y - Math.random() * hgt, vx: (Math.random() - 0.5) * 1.5, vy: -2, life: 16, color: Math.random() < 0.5 ? 0xffa030 : 0xff4a3a, size: 2, grav: 0 });
      }
    }
  }
  // CROWD SURF: a sea of hands under him, holding him up as he rides upward
  drawCrowdSurf(g) {
    const u = this.def.moves.upb, k = Math.min(1, (this.t - u.riseAt + 2) / 4) * Math.min(1, (u.frames - this.t) / 8);
    if (k <= 0) return;
    for (let i = -3; i <= 3; i++) {
      const x = this.x + i * 7, sway = Math.sin(this.anim * 0.4 + i) * 2, top = this.y - 4 + Math.abs(i) * 2 + sway;
      g.fillStyle(0x0b0a14, 0.9 * k); g.fillRect(x - 2, top, 4, 22);
      g.fillStyle(i % 2 ? 0xf0c09a : 0xd8986e, k); g.fillRect(x - 2, top - 3, 4, 4);   // open hands
      g.fillRect(x - 3 + (i % 2), top - 5, 1, 2); g.fillRect(x + 2 - (i % 2), top - 5, 1, 2);
    }
  }
}
