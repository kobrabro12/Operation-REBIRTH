// Fighter methods: AERO's Limits - SCREENSAVER, and FULL AERO (with two computers out): the blast, the
// transformation into his winged form and back. Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { drawBubble, popBubble } from './entities.js';

export class LimitAero {
  screensaverLimit(L) {
    const m = this.match;
    if (this.t === 1) this.ult = { bubbles: [], caught: [] };
    const U = this.ult;
    this.vx = 0; this.lx = 0; if (!this.grounded) this.vy = Math.min(this.vy + 0.1, 1);
    if (this.t === L.releaseAt) {
      for (let i = 0; i < L.count; i++) {
        const a = (-L.spread / 2 + (L.spread * i) / (L.count - 1)) * Math.PI / 180;
        for (const dir of [1, -1]) U.bubbles.push({ x: this.x + dir * 20, y: this.y - 30, vx: Math.cos(a) * L.speed * dir, vy: Math.sin(a) * L.speed, r: 22, life: L.life, alive: true, victim: null });
      }
      sfx('item', 0.9, 1.2); sfx('summon', 0.6, 1.8);
    }
    for (const b of U.bubbles) {
      if (!b.alive) continue;
      if (b.victim) {                                                   // carrying someone up toward the top of the sky
        const v = b.victim; b.y = Math.max(L.topY, b.y - 1.6); b.x += (v.x - b.x) * 0.2;
        v.x = b.x; v.y = b.y + v.body.h / 2; v.vx = v.vy = v.lx = v.ly = 0; v.hitstun = 999; v.bubbled = 0;
        continue;
      }
      b.x += b.vx; b.y += b.vy - 0.2; b.vx *= 0.995;
      if (--b.life <= 0) { b.alive = false; popBubble(m, b.x, b.y, b.r, this.pal); continue; }
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || U.caught.includes(o) || o.isIntangible() || o.state === 'respawn') continue;
        const c = o.center();
        if (Math.hypot(c.x - b.x, c.y - b.y) < b.r + 12) {
          b.victim = o; U.caught.push(o);
          m.applyHit(o, { h: L.trap, owner: this, facing: this.facing, id: 'ssv' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, b.x);
          o.hitstun = 999; o.stopChargeSound(); sfx('item', 0.7, 1.4);
          break;
        }
      }
    }
    if (this.t === L.popAt) {                                           // every caught bubble pops in a lens flare
      for (const b of U.bubbles) if (b.victim && b.victim.alive) {
        const v = b.victim; v.hitstun = 0;
        m.applyHit(v, { h: L.pop, owner: this, facing: Math.sign(v.x - this.x) || this.facing, id: 'ssvp' + this.slot + ':' + v.slot + ':' + this.age, pillar: true }, b.x);
        popBubble(m, b.x, b.y, 30, this.pal); b.flare = 18;
      }
      if (U.caught.length) { sfx('limitready', 1, 1.6); sfx('bighit', 0.8, 1.2); m.shake(10, 8); }
      for (const b of U.bubbles) if (!b.victim) b.alive = false;
    }
    for (const b of U.bubbles) if (b.flare) b.flare--;
    if (this.t >= L.frames) {
      for (const v of U.caught) if (v.alive && v.hitstun >= 999) v.hitstun = 1;
      this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air');
    }
  }
  drawScreensaver(g, L, U) {
    const m = this.match, v = m.worldCam.worldView, t = this.t, P = this.pal;
    const k = Math.min(1, t / 20) * Math.min(1, (L.frames - t) / 16);
    // the whole sky washes aqua, with two glossy light ribbons sweeping across it
    g.fillStyle(P.light, 0.18 * k); g.fillRect(v.x, v.y, v.width, v.height);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i <= 60; i++) {
        const x = v.x + (i / 60) * v.width, y = v.y + v.height * (0.35 + r * 0.22) + Math.sin(i * 0.12 + t * 0.05 + r * 2) * 26;
        g.fillStyle(r ? 0x8be04a : P.core, 0.35 * k); g.fillRect(x, y, v.width / 60 + 1, 6 - r * 2);
        g.fillStyle(0xffffff, 0.5 * k); g.fillRect(x, y, v.width / 60 + 1, 1);
      }
    }
    for (let i = 0; i < 18; i++) {                                     // bubbles rising everywhere
      const x = v.x + ((i * 97) % 100) / 100 * v.width + Math.sin(t * 0.05 + i) * 8, y = v.bottom - ((t * (1 + (i % 3) * 0.5) + i * 40) % (v.height + 40));
      drawBubble(g, x, y, 3 + (i % 4) * 2, P, 0.7 * k);
    }
    for (let i = 0; i < 3; i++) {                                      // goldfish swimming across the sky
      const x = v.x - 30 + ((t * (1.4 + i * 0.4) + i * 160) % (v.width + 60)), y = v.y + v.height * (0.25 + i * 0.2) + Math.sin(t * 0.1 + i) * 6;
      g.fillStyle(0xff8a2a, k); g.fillEllipse(x, y, 10, 6); g.fillTriangle(x - 5, y, x - 10, y - 4, x - 10, y + 4);
      g.fillStyle(0xffffff, k); g.fillRect(x + 2, y - 1, 1, 1);
    }
    for (const b of U.bubbles) {
      if (b.alive) drawBubble(g, b.x, b.y, b.victim ? 30 : b.r + Math.sin(t * 0.3) * 0.8, P, 0.95);
      if (b.flare) {                                                   // lens flare: a bright core, rays and a line of ghost rings
        const f = b.flare / 18;
        g.fillStyle(0xffffff, f); g.fillCircle(b.x, b.y, 10 + 20 * (1 - f));
        g.fillRect(b.x - 70 * f, b.y - 1, 140 * f, 3); g.fillRect(b.x - 1, b.y - 50 * f, 3, 100 * f);
        for (let j = 1; j <= 3; j++) { g.lineStyle(2, j % 2 ? P.light : 0x8be04a, 0.7 * f); g.strokeCircle(b.x + j * 22, b.y + j * 14, 6 + j * 3); }
      }
    }
  }
  // ------------------------------------------------------------------ Screensaver Limit (AERO)
  // Spreads his arms and the whole screen goes glossy: a fan of giant bubbles drifts out. Anyone caught
  // is sealed in and floats up to the top of the sky - then every caught bubble pops at once in a lens
  // flare. The bubbles can be dodged.
  // ---- FULL AERO (AERO's alternate Limit, with two computers out): the computers pour their power into
  // him, then a blast of light (30%) hits everyone near him, the words GOING FULL AERO appear, the stage
  // turns into a Frutiger Aero version of itself, and he transforms - winged, haloed, crowned - with every
  // stat boosted and every special upgraded for the rest of the time (FULL_AERO in aero.js).
  fullAeroLimit(A) {
    const m = this.match;
    if (this.t === 1) {
      const pcs = m.pcsOf(this);
      this.ult = { pcs: pcs.map((p) => ({ x: p.x, y: p.y - 18 })), flash: 0, ring: 0 };
      for (const p of pcs) p.absorb();
      sfx('summon', 0.8, 1.6); sfx('item', 0.6, 0.7);
    }
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    if (!this.grounded) this.vy = Math.min(this.vy + 0.08, 0.6);
    if (this.t < A.blastAt && this.t % 6 === 0) sfx('item', 0.3, 1 + this.t / A.blastAt);
    if (this.t === A.blastAt) {
      U.flash = 22; U.ring = 1;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
        const c = o.center();
        if (Math.hypot(c.x - this.x, c.y - (this.y - 30)) < A.radius)
          m.applyHit(o, { h: A.blast, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'fullaero' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, this.x);
      }
      this.enterFullAero(A.duration);
      m.bannerAero('GOING FULL AERO');
      sfx('limitready', 1, 1.4); sfx('bighit', 0.9, 1); sfx('geyser', 0.6, 1.6); m.shake(14, 14);
    }
    if (U.flash > 0) U.flash--;
    if (U.ring > 0) U.ring += 8;
    if (this.t >= A.frames) { this.invincible = 30; this.ult = null; this.altLimit = false; this.limitName = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  drawFullAeroLimit(g, A, U) {
    const t = this.t, cx = this.x, cy = this.y - 30, P = this.pal;
    if (t < A.blastAt) {
      const k = t / A.blastAt;
      for (const p of U.pcs) {                                           // the computers' power streaming into him
        g.lineStyle(6, P.light, 0.25 + 0.3 * k); g.lineBetween(p.x, p.y, cx, cy);
        g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(p.x, p.y, cx, cy);
        for (let i = 0; i < 3; i++) { const f = ((t * 0.05 + i / 3) % 1); g.fillStyle(0xffffff, 1); g.fillCircle(p.x + (cx - p.x) * f, p.y + (cy - p.y) * f, 2); }
      }
      g.fillStyle(P.light, 0.25 * k); g.fillCircle(cx, cy, 20 + 30 * k);
      g.fillStyle(0xffffff, 0.35 * k); g.fillCircle(cx, cy, 10 + 18 * k);
    }
    if (U.ring > 0 && U.ring < A.radius + 40) {                          // the blast
      const a = 1 - U.ring / (A.radius + 40);
      g.lineStyle(8, P.light, 0.6 * a); g.strokeCircle(cx, cy, U.ring);
      g.lineStyle(3, 0xffffff, a); g.strokeCircle(cx, cy, U.ring);
      g.lineStyle(2, 0xf3c358, a); g.strokeCircle(cx, cy, U.ring * 0.7);
    }
    if (U.flash > 0) { const v = this.match.worldCam.worldView; g.fillStyle(0xffffff, U.flash / 22 * 0.85); g.fillRect(v.x, v.y, v.width, v.height); }
  }
  enterFullAero(frames) {
    if (!(this.fullAero > 0)) { this.baseDef = this.def; this.baseSheets = this.sheets; }
    this.def = this.baseDef.fullAero; this.sheets = { ...this.baseSheets, ...this.def.sheets };
    this.fullAero = frames; this.match.setAeroStage(true);
    this.match.puff(this.x, this.y - 30, 0xffffff, 20); this.match.puff(this.x, this.y - 30, 0xf3c358, 12);
  }
  exitFullAero() {
    if (!this.baseDef) return;
    this.fullAero = 0; this.def = this.baseDef; this.sheets = this.baseSheets; this.baseDef = null;
    if (!this.match.fighters.some((f) => f !== this && f.fullAero > 0)) this.match.setAeroStage(false);
    if (this.alive) { this.match.popText(this, 'AERO MODE OFF', '#9ff0ff'); this.match.puff(this.x, this.y - 30, 0x9ff0ff, 10); }
  }
}
