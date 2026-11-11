// THE DEVOTED's mechanics (def.devoted, devoted.js): his SYMBOL, the DEVOTION meter, PRAY (down special) and
// the four SLUDGE STAGES he climbs, the sludge stains he leaves on the stage (match.sludgeStains), and his Limit
// BLACK TIDE. Mixed into Fighter like the other fighter*.js files.
import { sfx } from '../audio/sfx.js';

const SLUDGE = [0x060508, 0x0e0c12, 0x1a1720];

/** THE DEVOTED's methods (symbol, devotion, PRAY, sludge stages, stains, BLACK TIDE), attached to Fighter. */
export class FighterDevoted {
  /**
   * Every frame for THE DEVOTED: sets him up the first time, puts his symbol down where he first lands after
   * (re)spawning, keeps DROWNED's wing jumps, and drips / stains sludge at the rate his stage gives.
   */
  devotedTick() {
    const D = this.def.devoted, m = this.match;
    if (this.sludge === undefined) {
      this.sludge = 0; this.devotion = 0; this.sigil = null; this.sigilWait = true;
      this.sigilG = this.scene.add.graphics(); m.addWorld(this.sigilG);
      if (!m.sludgeStains) { m.sludgeStains = []; m.sludgeG = this.scene.add.graphics(); m.addWorld(m.sludgeG); this.stainOwner = true; }
      this.setSludge(0);
    }
    if (this.state === 'respawn') this.sigilWait = true;
    else if (this.sigilWait && this.grounded && this.platform && this.alive) {       // his symbol appears where he lands
      this.sigilWait = false;
      this.sigil = { x: this.x, y: this.y, plat: this.platform, dx: this.x - this.platform.x1, born: this.age };
      sfx('curse', 0.4, 1.4); m.puff(this.x, this.y - 30, 0x2e2a38, 10);
    }
    if (this.sigil && this.sigil.plat) { this.sigil.x = this.sigil.plat.x1 + this.sigil.dx; this.sigil.y = this.sigil.plat.y; }   // (riding a moving platform)
    if (this.sludge >= 3 && this.grounded) this.jumpsLeft = Math.max(this.jumpsLeft, D.wingJumps);
    const every = D.stainEvery[this.sludge];
    if (every && this.grounded && this.platform && this.age % every === 0) this.stain(this.x + (Math.random() - 0.5) * 10, this.platform, 3 + this.sludge * 2);
    const drip = D.dripEvery[this.sludge];
    if (drip && this.age % drip === 0 && !m.demo) {
      const R = Math.random;
      m.particles.push({ x: this.x + (R() - 0.5) * 18, y: this.y - 10 - R() * 36, vx: (R() - 0.5) * 0.3, vy: 0.3, life: 30, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.16 });
    }
  }

  /** Switches his look, stats and powers to a sludge stage (0 DEFAULT - 3 DROWNED). */
  setSludge(n) {
    const D = this.def.devoted;
    this.sludge = n;
    this.sheets = this.def.sludgeSheets[n];
    this.devoteDmg = D.dmg[n]; this.devoteSpeed = D.speed[n]; this.devoteKb = D.kb[n];
  }

  /** A hit he landed: one more toward his next stage. Says PRAY when the meter is full. */
  addDevotion(n = 1) {
    const D = this.def.devoted;
    if (this.sludge === undefined || this.sludge >= 3) return;
    const need = D.need[this.sludge], was = this.devotion;
    this.devotion = Math.min(need, this.devotion + n);
    if (was < need && this.devotion >= need) { this.match.popText(this, 'PRAY', '#f8f4ec'); sfx('limitready', 0.45, 0.6); }
  }

  /** True when praying right now would take him up a stage: devotion full, near his symbol, standing. */
  canAscend() {
    const D = this.def.devoted;
    if (this.sludge >= 3 || this.devotion < D.need[this.sludge] || !this.sigil || !this.grounded) return false;
    return Math.abs(this.x - this.sigil.x) <= D.range && Math.abs(this.y - this.sigil.y) <= 40;
  }

  /**
   * PRAY (his down special, run from st_attack while the downB move plays): decides on the first frame whether
   * the prayer is answered; an answered one takes him up a stage on `ascendAt`, an unanswered one ends early.
   */
  prayTick() {
    const D = this.def.devoted, m = this.match;
    this.vx *= 0.7;
    if (this.t === 1) {
      this.prayAnswered = this.canAscend();
      if (!this.prayAnswered) {
        const why = this.sludge >= 3 ? 'NOTHING LEFT' : this.devotion < D.need[this.sludge] ? 'NOT YET' : !this.sigil ? '...' : 'TOO FAR';
        m.popText(this, why, '#8a8494'); sfx('curse', 0.25, 0.8);
      } else { sfx('curse', 0.6, 0.6); this.match.shake(3, 20); }
    }
    if (this.prayAnswered) {
      if (this.t < D.ascendAt && this.t % 3 === 0) {      // the sludge rises out of the floor round him
        const R = Math.random;
        m.particles.push({ x: this.x + (R() - 0.5) * 40, y: this.y, vx: 0, vy: -1 - R() * 1.5, life: 24, color: SLUDGE[Math.floor(R() * 3)], size: 3, grav: -0.02 });
      }
      if (this.t === D.ascendAt) this.ascend();
    } else if (this.t >= D.failLength) this.setState(this.grounded ? 'idle' : 'air');
  }

  /** Goes up a sludge stage: the new look and stats, an empty meter, a burst of sludge staining the floor. */
  ascend() {
    const D = this.def.devoted, m = this.match;
    this.setSludge(Math.min(3, this.sludge + 1)); this.devotion = 0;
    m.popText(this, D.names[this.sludge], '#f8f4ec');
    sfx('bighit', 0.8, 0.5); sfx('curse', 0.8, 0.45); m.shake(8, 14);
    const R = Math.random;
    for (let i = 0; i < 26; i++) m.particles.push({ x: this.x, y: this.y - 28, vx: (R() - 0.5) * 7, vy: -2 - R() * 4, life: 34, color: SLUDGE[i % 3], size: 3, grav: 0.22 });
    m.particles.push({ shape: 'ring', x: this.x, y: this.y - 28, vx: 0, vy: 0, life: 16, maxLife: 16, r: 10, dr: 5, color: 0x2e2a38, grav: 0 });
    if (this.platform) for (let i = 0; i < 4 + this.sludge * 2; i++) this.stain(this.x + (R() - 0.5) * (40 + this.sludge * 20), this.platform, 4 + this.sludge * 2);
  }

  /**
   * Leaves a sludge stain on a platform at x (grows a stain that's already there). Stains are kept in
   * match.sludgeStains = [{ plat, dx, w, owner, age }] so a later mechanic can read them.
   */
  stain(x, plat, w) {
    const m = this.match, S = m.sludgeStains;
    if (!S || !plat || x < plat.x1 || x > plat.x2) return;
    const dx = x - plat.x1, near = S.find((s) => s.plat === plat && Math.abs(s.dx - dx) < 6);
    if (near) { near.w = Math.min(40, near.w + 1); return; }
    S.push({ plat, dx, w, owner: this, age: this.age });
    if (S.length > this.def.devoted.maxStains) S.shift();
  }

  /** Draws his symbol, his devotion pips over his head and (for the first DEVOTED) every sludge stain. */
  drawDevoted() {
    if (this.sludge === undefined) return;
    const g = this.sigilG, D = this.def.devoted, m = this.match;
    g.clear();
    if (this.stainOwner) {
      const sg = m.sludgeG; sg.clear();
      for (const s of m.sludgeStains) {
        const x = s.plat.x1 + s.dx, y = s.plat.y;
        sg.fillStyle(0x060508, 0.92); sg.fillEllipse(x, y + 1, s.w * 2, 3 + s.w * 0.12);
        sg.fillStyle(0x2e2a38, 0.6); sg.fillRect(x - s.w * 0.4, y, Math.max(1, s.w * 0.3), 1);   // an oily sheen
      }
    }
    const ready = this.sludge < 3 && this.devotion >= D.need[this.sludge];
    if (this.sigil) {
      // THE SYMBOL: a small stone on the floor and, floating over it, a black ring with a smile inside it -
      // it glows when his prayer would be answered
      const x = this.sigil.x, y = this.sigil.y, a = Math.min(1, (this.age - this.sigil.born) / 30);
      const pulse = ready ? 0.5 + 0.5 * Math.sin(this.age * 0.2) : 0, cy = y - 34 + Math.sin(this.age * 0.05) * 2;
      g.fillStyle(0x3a3640, a); g.fillRect(x - 6, y - 4, 12, 4); g.fillStyle(0x1a1720, a); g.fillRect(x - 7, y - 1, 14, 2);
      if (ready) { g.fillStyle(0xf8f4ec, 0.12 + 0.12 * pulse); g.fillCircle(x, cy, 16); }
      g.lineStyle(3, 0x060508, a); g.strokeCircle(x, cy, 9);
      g.lineStyle(1, ready ? 0xf8f4ec : 0x4a4458, a); g.strokeCircle(x, cy, 9);
      g.lineStyle(2, ready ? 0xf8f4ec : 0x8a8494, a);
      g.beginPath(); g.arc(x, cy - 1, 5, 0.35, Math.PI - 0.35); g.strokePath();               // the smile
      g.fillStyle(ready ? 0xf8f4ec : 0x8a8494, a); g.fillRect(x - 3, cy - 4, 2, 2); g.fillRect(x + 1, cy - 4, 2, 2);
      for (let i = 0; i < 3; i++) { g.fillStyle(0x060508, a); g.fillRect(x - 4 + i * 4, cy + 9, 1, 2 + ((this.age >> 3) + i) % 4); }   // sludge dripping off it
    }
    if (this.alive && this.sludge < 3) {                 // his devotion: pips over his head
      const need = D.need[this.sludge], w = need * 4, x0 = this.x - w / 2, y = this.y - this.def.headTop - 8;
      for (let i = 0; i < need; i++) {
        g.fillStyle(0x000000, 0.5); g.fillRect(x0 + i * 4, y, 3, 3);
        if (i < this.devotion) { g.fillStyle(ready ? 0xf8f4ec : 0x4a4458, 1); g.fillRect(x0 + i * 4, y, 3, 3); }
      }
    }
  }

  /**
   * BLACK TIDE (his Limit): sludge bursts out of him on `hitAt`, hitting everyone in `radius` (harder for each
   * stage he's reached), staining the floor all round him and filling his devotion.
   */
  tideLimit(L) {
    const m = this.match;
    this.vx = 0; this.vy = this.grounded ? 0 : Math.max(-1, this.vy - 0.3);
    if (this.t === L.hitAt) {
      sfx('bighit', 1, 0.45); sfx('curse', 0.9, 0.5); m.shake(10, 16);
      const blast = { ...L.blast, dmg: L.blast.dmg + L.perStage * (this.sludge || 0) };
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.isIntangible()) continue;
        if (Math.hypot(o.x - this.x, o.y - this.y) <= L.radius) m.applyHit(o, { h: blast, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'tide' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, this.x);
      }
      const R = Math.random;
      for (let i = 0; i < 40; i++) m.particles.push({ x: this.x, y: this.y - 24, vx: (R() - 0.5) * 12, vy: -1 - R() * 6, life: 40, color: SLUDGE[i % 3], size: 3, grav: 0.25 });
      for (const p of m.stage.platforms) for (let i = 0; i < 6; i++) { const x = this.x + (R() - 0.5) * L.radius * 2; if (Math.abs(p.y - this.y) < L.radius) this.stain(x, p, 6 + R() * 6); }
      if (this.sludge < 3) this.devotion = this.def.devoted.need[this.sludge];
    }
    if (this.t < L.hitAt) m.particles.push({ shape: 'ring', x: this.x, y: this.y - 28, vx: 0, vy: 0, life: 10, maxLife: 10, r: 40 - this.t * 2, dr: -2, color: 0x2e2a38, grav: 0 });
    if (this.t >= L.frames) { this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }
}
