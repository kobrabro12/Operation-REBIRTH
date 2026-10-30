// Fighter methods: NIGHT WITCH's Limit, NIGHT RAID. She fires a flare; then a flight of old wooden biplanes glides in
// low over the stage from behind her, engines off, and each drops its bombs on the way over - aimed at whoever is
// underneath. Tuning: nightWitch.js limit. Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';

export class LimitRaid {
  raidLimit(L) {
    const m = this.match;
    this.vx = 0; this.lx = 0;
    if (this.t === 1) {
      this.ult = { planes: [], bombs: [], g: m.add.graphics().setDepth(5) }; m.addWorld(this.ult.g);
      sfx('djump', 0.6, 0.6); m.particles.push({ x: this.x, y: this.y - 60, vx: 0, vy: -6, life: 40, color: 0xffe08a, size: 4, grav: 0.05 });
    }
    const U = this.ult, g = U.g, dir = this.facing;
    if (this.t >= 20 && this.t < 20 + L.planes * L.every && (this.t - 20) % L.every === 0) {   // the next plane comes in from behind her
      const n = U.planes.length;
      U.planes.push({ x: this.x - dir * 420, y: L.height + n * 20, dropped: 0, n });
      sfx('whoosh', 0.4, 0.5);
    }
    g.clear();
    for (const p of U.planes) {
      p.x += dir * L.speed;
      // a bomb as it passes over one of them (or, failing that, every so often)
      const below = m.fighters.find((o) => o !== this && o.alive && o.team !== this.team && Math.abs(o.x - p.x) < 10);
      if (p.dropped < L.bombs && (below || Math.abs((p.x - this.x) % 90) < L.speed) && !(p.cool > 0)) { U.bombs.push({ x: p.x, y: p.y + 6, vx: dir * L.speed * 0.6, vy: 0, n: p.n * 10 + p.dropped }); p.dropped++; p.cool = 14; sfx('swing', 0.3, 0.6); }
      if (p.cool > 0) p.cool--;
      this.drawBiplane(g, p.x, p.y, dir);
    }
    for (const b of U.bombs) {
      if (b.done) continue;
      b.vy += 0.25; b.x += b.vx; b.y += b.vy; b.vx *= 0.98;
      g.fillStyle(0x1a1a20, 1); g.fillEllipse(b.x, b.y, 5, 8); g.fillStyle(0x3a3a44, 1); g.fillRect(b.x - 3, b.y - 6, 6, 2);
      const floor = m.stage.platforms.find((p) => b.x >= p.x1 && b.x <= p.x2 && b.y >= p.y && b.y - b.vy < p.y + 2 && (p.solid || b.vy > 0));
      const hitF = m.fighters.find((o) => o !== this && o.alive && o.team !== this.team && !o.isIntangible() && Math.abs(o.x - b.x) < 14 && b.y > o.y - o.body.h && b.y < o.y + 4);
      if (floor || hitF || b.y > 320) {
        b.done = true;
        const y = floor ? floor.y : b.y;
        sfx('bighit', 0.6, 0.8); m.shake(5, 5);
        for (let i = 0; i < 12; i++) { const a = -Math.PI * Math.random(), sp = 1 + Math.random() * 3; m.particles.push({ x: b.x, y: y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 1.3, life: 22 + Math.random() * 12, color: [0xff8a2a, 0xffe08a, 0x5a5852, 0xffffff][i % 4], size: 2 + (i % 3), grav: 0.12, drag: 0.95 }); }
        for (const o of m.fighters) {
          if (o === this || !o.alive || o.team === this.team || o.isIntangible()) continue;
          const c = o.center();
          if (Math.hypot(c.x - b.x, c.y - y) <= L.radius + 12) m.applyHit(o, { h: L.hit, owner: this, facing: Math.sign(c.x - b.x) || dir, id: 'raid' + this.slot + ':' + b.n + ':' + this.age, pillar: true, x1: b.x, x2: b.x }, b.x);
        }
      }
    }
    if (this.t >= L.frames) { g.destroy(); this.ult = null; this.invincible = 30; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  // an old wooden biplane in silhouette against the night: two wings, struts, a stopped propeller, a pale belly
  drawBiplane(g, x, y, dir) {
    const s = dir;
    g.fillStyle(0x1a2238, 1); g.fillRect(x - 22, y - 2, 44, 6);                                     // the fuselage
    g.fillTriangle(x - s * 22, y - 2, x - s * 30, y - 8, x - s * 22, y + 4);                       // the tail fin
    g.fillStyle(0x2a3a5a, 1); g.fillRect(x - 16, y - 10, 34, 3); g.fillRect(x - 16, y + 6, 34, 3);   // the two wings
    g.fillStyle(0x0e1424, 1); g.fillRect(x - 8, y - 8, 1, 15); g.fillRect(x + 8, y - 8, 1, 15);       // struts
    g.fillStyle(0x6a6a7a, 1); g.fillRect(x + s * 22, y - 6, 1, 13);                                 // the propeller, stopped (engines off)
    g.fillStyle(0xd8d0b8, 0.35); g.fillRect(x - 20, y + 3, 40, 1);
    g.fillStyle(0xd8201e, 1); g.fillCircle(x - s * 2, y + 1, 2);                                    // a red star on the side
  }
}
