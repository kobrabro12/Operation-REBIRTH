// GNASH's thrown axe (`GnashAxe`), a projectile in match.projectiles (hitbox / step / render / kill, like entities.js);
// his code is in fighterGnash.js. (This file also held THE GREAT PRESTO's cards and CHEF ROUX's cleaver and oil,
// removed with them.)
import { sfx } from '../audio/sfx.js';

let nextId = 1;

export class GnashAxe {
  constructor(match, owner, spec, psycho) {
    this.match = match; this.owner = owner; this.spec = spec; this.psycho = psycho || null; this.dir = owner.facing;
    this.k = psycho ? psycho.scale : 1;
    this.x = owner.x + owner.facing * 26; this.y = owner.y - 42;
    this.vx = this.dir * (psycho ? psycho.speed : spec.speed); this.vy = 0; this.t = 0; this.spin = 0;
    this.alive = true; this.stuck = false; this.persist = true; this.lost = 0;
    this.id = 'gnaxe' + nextId++; this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('whoosh', 0.7, psycho ? 0.45 : 0.6); sfx('swing', 0.5, 0.5);
  }
  /** Spinning through the air: a big box round the blade (each foe once). Stuck in the floor: harmless. */
  hitbox() {
    if (this.stuck || this.returning) return null;
    const r = 26 * this.k;
    return { x1: this.x - r, x2: this.x + r, y1: this.y - r, y2: this.y + r, h: this.psycho ? this.psycho.hit : this.spec.hit, owner: this.owner, id: this.id, facing: this.dir, projectile: this, persist: true };
  }
  /** Flat out for `range` frames, then falling; it sticks where it lands (PSYCHO: blows up and flies home). */
  step() {
    this.t++;
    const m = this.match, o = this.owner;
    if (this.returning) {                                                   // (PSYCHO) straight back into his hand
      const tx = o.x + o.facing * 16, ty = o.y - 44, d = Math.hypot(tx - this.x, ty - this.y) || 1, sp = 12;
      this.x += (tx - this.x) / d * Math.min(sp, d); this.y += (ty - this.y) / d * Math.min(sp, d); this.spin += 0.6;
      if (d < 18 || !o.alive) { this.kill(); o.rearm && o.rearm(false); }
      return;
    }
    if (this.stuck) { if (this.t % 50 === 0) m.particles.push({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 20, vx: 0, vy: -0.6, life: 26, color: this.neon(), size: 2, grav: -0.01 }); return; }
    if (this.t > this.spec.range) this.vy += this.spec.grav;
    const py = this.y;
    this.x += this.vx; this.y += this.vy; this.spin += 0.45 * this.dir;
    if (this.t % 4 === 0) sfx('swing', 0.22, 1.4);
    if (this.t % 2 === 0) m.particles.push({ x: this.x - this.dir * 10, y: this.y + (Math.random() - 0.5) * 16, vx: -this.vx * 0.15, vy: 0, life: 10, color: this.neon(), size: 2, grav: 0 });
    if (this.vy > 0) for (const p of m.stage.platforms) {                    // came down on a floor: it sticks
      if (this.x >= p.x1 && this.x <= p.x2 && py <= p.y && this.y >= p.y - 2) { this.land(p); return; }
    }
    if (Math.abs(this.x) > 640 || this.y > 360 || this.t > 400) {           // gone off the stage: it comes back to him later
      this.lost = 1; this.kill(); if (o.axeLost) o.axeLost(); return;
    }
  }
  /** Down in a floor, blade first: dust, a clang, sparks (PSYCHO: the blast, then home). */
  land(p) {
    const m = this.match;
    this.y = p.y; this.vx = 0; this.vy = 0; this.stuck = true; this.platform = p;
    sfx('clang', 0.8, 0.6); sfx('bighit', 0.5, 0.8); m.shake(4, 6);
    for (let i = 0; i < 12; i++) m.particles.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y - 2, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 3, life: 20, color: i % 2 ? this.neon() : 0xffe0a0, size: 2, grav: 0.2 });
    if (this.psycho) { this.owner.psychoBlast(this.psycho.blast, this.x, this.y - 20, 'gnPB' + this.id); this.stuck = false; this.returning = true; }
  }
  /** His colour of neon. */
  neon() { const s = this.owner.style; return s === 'gnashBlood' ? 0xff3a2a : s === 'gnashStone' ? 0x8aff2a : 0x6aff3a; }
  /** Picked up / lost / the round's over. */
  kill() { if (!this.alive) return; this.alive = false; this.g.destroy(); }
  /** The giant black axe: a black haft in neon tape and a huge black spiked blade with a glowing neon diamond in it -
   *  whirling through the air, or standing up in the floor, blade down. */
  render() {
    if (!this.alive) return;
    const g = this.g, K = this.k, a = this.stuck ? Math.PI / 2 + this.dir * 0.3 : this.spin, c = Math.cos(a), s = Math.sin(a);
    const ox = this.x, oy = this.stuck ? this.y - 28 * K : this.y;
    const q = (px, py) => ({ x: ox + (px * c - py * s) * K, y: oy + (px * s + py * c) * K });
    const look = this.owner.style, neon = [this.neon(), look === 'gnashBlood' ? 0xffb02a : look === 'gnashStone' ? 0xd8ff3a : 0x3af0ff];
    g.clear();
    if (this.psycho) { g.fillStyle(0xff3ad0, 0.18); g.fillCircle(ox, oy, 40 * K * 0.7); }
    g.lineStyle(6 * K, 0x060608, 1); g.lineBetween(q(-44, 0).x, q(-44, 0).y, q(16, 0).x, q(16, 0).y);
    g.lineStyle(4 * K, 0x22222a, 1); g.lineBetween(q(-43, 0).x, q(-43, 0).y, q(15, 0).x, q(15, 0).y); g.lineStyle(0);
    for (const i of [-36, -20, -4]) { g.fillStyle(neon[1], 1); const p = q(i, 0); g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = -1.4 + 2.8 * i / 12, r = i % 2 ? 16 : 24; pts.push(q(10 + Math.cos(t) * r, Math.sin(t) * r)); }
    g.fillStyle(0x060608, 1); g.fillPoints([q(10, -10), ...pts, q(10, 10)].map((p) => ({ x: p.x + (p.x - ox) * 0.06, y: p.y + (p.y - oy) * 0.06 })), true);
    g.fillStyle(0x1c1c24, 1); g.fillPoints([q(10, -9), ...pts, q(10, 9)], true);
    const d = [q(25, -8), q(30, 0), q(25, 8), q(20, 0)];                                   // the neon diamond
    g.fillStyle(neon[0], 0.25 + (this.stuck ? 0.15 * Math.sin(this.t * 0.15) : 0)); g.fillCircle(q(25, 0).x, q(25, 0).y, 11 * K);
    g.lineStyle(3, neon[0], 1); g.strokePoints(d, true); g.lineStyle(1, 0xffffff, 1); g.strokePoints(d, true); g.lineStyle(0);
    if (this.stuck) {                                                                       // a little neon arrow over it: PICK ME UP
      const by = this.y - 70 - Math.abs(Math.sin(this.t * 0.1)) * 6;
      g.fillStyle(neon[0], 0.9); g.fillTriangle(ox - 6, by, ox + 6, by, ox, by + 7);
    }
  }
}
