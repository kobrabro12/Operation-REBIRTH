// Fighter methods: NU's Limit, WALL OF SOUND - the amp stacks, the four bass drops, THE DROP - and his
// Crowd Surf. Mixed into the Fighter class (Fighter.js) - `this` is the fighter. Tuning: nu.js `limit`.
import { sfx } from '../audio/sfx.js';

export class LimitMosh {
  // ------------------------------------------------------------------ Wall of Sound Limit (NU)
  // Two amp stacks burst out of the floor behind him. On each of four beats a ring of sound races out:
  // whoever it catches is dragged in and held in front of him, taking every beat after that. Then THE DROP:
  // a cone of sound screamed forward launches everyone in it.
  wallLimit(L) {
    const m = this.match;
    if (this.t === 1) { this.ult = { caught: [], rings: [], dropped: false }; sfx('bighit', 0.8, 0.5); m.shake(8, 14); }
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    if (!this.grounded) this.vy = Math.max(this.vy, 3);                 // comes down to play
    const foe = (o) => o !== this && o.alive && o.team !== this.team && o.state !== 'respawn' && !o.isIntangible();
    // a beat: every caught fighter takes a thump, and a new ring starts out
    if (L.beats.includes(this.t)) {
      U.rings.push({ at: this.t, n: L.beats.indexOf(this.t) });
      sfx('taiko', 1, 0.7); sfx('bighit', 0.7, 0.6); m.shake(10, 8);
      for (const o of U.caught) if (o.alive) this.wallHit(o, L.thump, 'wb' + this.t);
    }
    // the rings race out and catch people
    for (const r of U.rings) {
      const rad = (this.t - r.at) * L.ringSpeed;
      if (rad > L.reach) continue;
      for (const o of m.fighters) {
        if (!foe(o) || U.caught.includes(o)) continue;
        const d = Math.hypot(o.x - this.x, (o.y - 24) - (this.y - 30));
        if (d <= rad) { U.caught.push(o); this.wallHit(o, L.thump, 'wr' + r.at); }
      }
    }
    // caught fighters are dragged in and held, stacked in front of him
    U.caught.forEach((o, i) => {
      if (!o.alive) return;
      const tx = this.x + this.facing * (52 + i * 16), ty = this.y - 26 - (i % 2) * 18 + Math.sin(this.t * 0.2 + i) * 2;
      o.x += (tx - o.x) * 0.18; o.y += (ty - o.y) * 0.18;
      o.vx = o.vy = o.lx = o.ly = 0; o.grounded = false; o.platform = null;
      if (o.state === 'hitstun') o.hitstun = Math.max(o.hitstun, 6);
    });
    // THE DROP
    if (this.t === L.dropAt) {
      U.dropped = true;
      sfx('ko', 0.8, 0.6); sfx('bighit', 1, 0.45); sfx('limit', 0.6, 1.4); m.shake(20, 18);
      const x1 = this.facing > 0 ? this.x : this.x - L.dropLen, x2 = x1 + L.dropLen, y1 = this.y - 20 - L.dropH / 2 - 20, y2 = y1 + L.dropH + 20;
      for (const o of m.fighters) {
        if (!foe(o) && !U.caught.includes(o)) continue;
        if (U.caught.includes(o) || (o.x > x1 && o.x < x2 && o.y > y1 && o.y < y2 + 20)) this.wallHit(o, L.drop, 'wd', true);
      }
    }
    if (this.t >= L.frames) { this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  wallHit(o, h, tag, launch = false) {
    this.match.applyHit(o, { h, owner: this, facing: this.facing, id: 'wall' + this.slot + ':' + o.slot + ':' + tag + ':' + this.age, pillar: launch }, this.x);
  }
  drawWallLimit(g, L, U) {
    const m = this.match, P = this.pal, t = this.t, f = this.facing;
    const v = m.worldCam.worldView, k = Math.min(1, t / 20) * Math.min(1, (L.frames - t) / 16);
    const beat = L.beats.reduce((b, at) => (t >= at ? at : b), -99), since = t - beat, thump = since < 8 ? 1 - since / 8 : 0;
    // stage lights sweeping from above
    for (let i = 0; i < 4; i++) {
      const sx = v.x + (i + 0.5) * v.width / 4, ang = Math.sin(t * 0.04 + i * 1.7) * 0.5, len = v.height * 1.2;
      const ex = sx + Math.sin(ang) * len, ey = v.y + Math.cos(ang) * len;
      g.fillStyle(i % 2 ? P.light : 0xffffff, 0.08 * k + 0.08 * thump);
      g.fillTriangle(sx, v.y, ex - 40, ey, ex + 40, ey);
    }
    // the amp stacks rising behind him: two towers of speaker cabinets, cones pumping on the beat
    const rise = Math.min(1, t / 26);
    for (const side of [-1, 1]) {
      const bx = this.x - f * 34 + side * 26, w = 34, ch = 26;
      for (let r = 0; r < 4; r++) {
        const y = this.y - ch * (r + 1) * rise;
        if (r * 0.25 > rise) continue;
        g.fillStyle(0x0b0a14, 1); g.fillRect(bx - w / 2 - 1, y - 1, w + 2, ch + 2);
        g.fillStyle(0x24212c, 1); g.fillRect(bx - w / 2, y, w, ch);
        g.fillStyle(0x3a3644, 1); g.fillRect(bx - w / 2, y, w, 2);
        for (const cx of [-8, 8]) {                                          // two cones per cabinet
          const pr = 6 + thump * 2;
          g.fillStyle(0x0b0a14, 1); g.fillCircle(bx + cx, y + ch / 2, pr + 1);
          g.fillStyle(0x4a4656, 1); g.fillCircle(bx + cx, y + ch / 2, pr);
          g.fillStyle(P.light, 0.6 + 0.4 * thump); g.fillCircle(bx + cx, y + ch / 2, 2);
        }
        g.fillStyle(P.mid, 1); g.fillRect(bx - 4, y + ch - 4, 8, 2);           // the brand plate
      }
    }
    // the crowd below, jumping on every beat
    const base = v.bottom + 6;
    for (let i = 0; i < 46; i++) {
      const x = v.x + (i / 45) * v.width, hop = thump * 8 * (0.6 + ((i * 7) % 5) / 10), y = base - 18 * k - hop;
      g.fillStyle(0x0b0a14, 0.92); g.fillCircle(x, y, 7); g.fillRect(x - 8, y + 4, 16, 20);
      if (i % 2) { g.fillRect(x - 9, y - 16 + hop * 0.5, 3, 14); g.fillRect(x + 6, y - 14, 3, 12); }
      if (i % 7 === 3) { g.fillStyle(P.light, 0.9); g.fillRect(x + 5, y - 22, 3, 4); }
    }
    // the rings of sound
    for (const r of U.rings) {
      const rad = (t - r.at) * L.ringSpeed;
      if (rad > L.reach + 30) continue;
      const fade = Math.max(0, 1 - rad / (L.reach + 30)), cy = this.y - 30;
      g.lineStyle(6, P.mid, 0.5 * fade); g.strokeCircle(this.x, cy, rad);
      g.lineStyle(3, P.light, 0.9 * fade); g.strokeCircle(this.x, cy, rad);
      g.lineStyle(1, 0xffffff, fade); g.strokeCircle(this.x, cy, Math.max(1, rad - 4));
      if (t % 2 === 0) for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        m.particles.push({ shape: 'note', x: this.x + Math.cos(a) * rad, y: cy + Math.sin(a) * rad, vx: Math.cos(a), vy: Math.sin(a) - 0.5, life: 20, color: P.light, grav: 0 });
      }
    }
    // an equaliser along the bottom of the screen, jumping with the bass
    for (let i = 0; i < 32; i++) {
      const h = (10 + Math.abs(Math.sin(i * 1.3 + t * 0.3)) * 26) * (0.4 + thump) * k, x = v.x + (i + 0.5) * v.width / 32;
      g.fillStyle(i % 4 === 0 ? 0xffffff : P.light, 0.55); g.fillRect(x - 4, v.bottom - 30 - h, 8, h);
    }
    // the drop: a cone of sound screamed forward, then fading rings rolling out of it
    if (U.dropped) {
      const d = t - L.dropAt, fade = Math.max(0, 1 - d / 30), hx = this.x + f * 14, hy = this.y - 44;
      if (fade > 0) {
        const len = Math.min(L.dropLen, d * 40 + 60), half = L.dropH / 2;
        g.fillStyle(P.mid, 0.5 * fade); g.fillTriangle(hx, hy - 6, hx + f * len, hy - half - 10, hx + f * len, hy + half + 10);
        g.fillStyle(P.light, 0.7 * fade); g.fillTriangle(hx, hy - 3, hx + f * len, hy - half * 0.7, hx + f * len, hy + half * 0.7);
        g.fillStyle(0xffffff, 0.9 * fade); g.fillTriangle(hx, hy - 1, hx + f * len, hy - half * 0.3, hx + f * len, hy + half * 0.3);
        for (let i = 1; i < 6; i++) {
          const x = hx + f * ((d * 18 + i * 60) % len), hh = (half * (x - hx) * f) / len;
          g.lineStyle(2, 0xffffff, 0.8 * fade); g.beginPath(); g.arc(x - f * hh * 0.4, hy, hh, f > 0 ? -0.9 : Math.PI - 0.9, f > 0 ? 0.9 : Math.PI + 0.9); g.strokePath();
        }
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
