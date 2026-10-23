// Fighter methods: NU's ON BEAT passive - the beat under every fight, on-beat attacks, the STREAK - plus his
// Power Chord charge and Stage Dive bounce. Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
// Tuning lives in nu.js (`beat`, and the moves' `hold` / `dive.bounce`).
import { sfx } from '../audio/sfx.js';

export class FighterBeat {
  // where we are in the bar: 0 = right on the beat
  beatPhase() { const B = this.def.beat; return this.age % B.every; }
  onBeatNow() {
    const B = this.def.beat, p = this.beatPhase();
    return p <= B.window || p >= B.every - B.window;
  }
  // called whenever NU starts an attack or special: is it on the beat? (swinging off the beat drops the streak)
  markBeat() {
    if (!this.def.beat) return;
    this.onBeatMove = this.onBeatNow();
    if (!this.onBeatMove && this.streak) { this.streak = 0; }
    if (this.onBeatMove) {                                           // a little flash at his feet so you can feel it
      for (let i = 0; i < 4; i++) this.match.particles.push({ shape: 'note', x: this.x + (Math.random() - 0.5) * 20, y: this.y - 50 - Math.random() * 16, vx: (Math.random() - 0.5) * 1.2, vy: -1.2, life: 22, color: i % 2 ? this.pal.light : this.pal.core, grav: 0 });
    }
  }
  // MatchScene.applyHit asks how much harder this hit lands (1 when not on beat)
  beatBonus(hb) {
    const B = this.def.beat;
    if (!B) return null;
    const onBeat = hb.projectile ? hb.projectile.beat : (this.state === 'attack' && this.onBeatMove);
    if (!onBeat) return null;
    const hyped = (this.streak || 0) >= B.hype;
    return { dmg: B.mult * (hyped ? B.hypeMult : 1), kb: B.kb };
  }
  // an on-beat hit landed: grow the streak (once per attack), fill the Limit a bit, show it
  beatLanded(t, hb) {
    const B = this.def.beat, key = hb.projectile ? 'p' + hb.projectile.id : this.attackId;
    if (this.lastBeatKey === key) return;
    this.lastBeatKey = key;
    this.streak = Math.min(B.maxStreak, (this.streak || 0) + 1);
    this.limit = Math.min(100, this.limit + B.limitGain);
    const m = this.match, P = this.pal;
    m.popText(t, this.streak >= B.hype ? 'HYPE x' + this.streak + '!' : 'ON BEAT!', '#' + P.light.toString(16).padStart(6, '0'));
    sfx('taiko', 0.45, 1.3 + Math.min(0.5, this.streak * 0.06));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m.particles.push({ shape: 'note', x: t.x, y: t.y - 30, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4 - 1, life: 26, color: [P.light, P.core, 0xffffff][i % 3], grav: 0.03 });
    }
    if (this.style === 'nuInferno') m.particles.push({ shape: 'pillar', x: t.x, y: t.y, vx: 0, vy: 0, life: 18, maxLife: 18, color: 0xff7a1a, grav: 0 });   // INFERNO: on-beat hits go up in pyro
    if (this.streak >= B.hype) for (let i = 0; i < 10; i++)                 // HYPED: a burst of pyro off the hit
      m.particles.push({ x: t.x + (Math.random() - 0.5) * 16, y: t.y - 10, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 3, life: 18 + Math.random() * 10, color: Math.random() < 0.5 ? 0xffa030 : 0xff4a3a, size: 3, grav: 0.05 });
  }
  dropStreak() { if (this.streak) this.streak = 0; }

  // POWER CHORD: while special is held at the hold frame, the move waits there and the chord builds
  holdChord(c) {
    const H = this.move.hold;
    if (this.t === H.at && c.held('special') && this.chord < H.max) {
      this.chord++; this.t--;
      const k = this.chord / H.max, P = this.pal;
      if (this.chord % 3 === 0) {
        const hx = this.x + this.facing * this.def.handOffset.x, hy = this.y + this.def.handOffset.y;
        const a = Math.random() * Math.PI * 2, r = 22 - 14 * k;
        this.match.particles.push({ x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r, vx: -Math.cos(a) * 1.2, vy: -Math.sin(a) * 1.2, life: 12, color: k >= 1 ? 0xffffff : P.light, size: 2, grav: 0 });
      }
      if (this.chord === H.max) { sfx('limitready', 0.5, 1.6); this.match.puff(this.x + this.facing * 14, this.y - 44, this.pal.core, 10); }
      return true;
    }
    return false;
  }
  // the wave's numbers for how long the chord was held (0 = a tap, 1 = a full chord)
  chordWave(spec) {
    const k = Math.min(1, (this.chord || 0) / this.move.hold.max), F = spec.full;
    const hit = { ...spec.hit, dmg: Math.round(spec.hit.dmg + F.dmg * k), base: spec.hit.base + F.base * k, growth: spec.hit.growth + F.growth * k };
    return { ...spec, hit, speed: spec.speed + F.speed * k, h0: spec.h0 + F.h * 0.5 * k, h1: spec.h1 + F.h * k, chord: k };
  }

  // the beat ring at NU's feet: closes in on him and flashes on the beat, so you can play to it
  drawBeat(g) {
    if (!this.alive || this.state === 'respawn') return;
    const B = this.def.beat, p = this.beatPhase(), P = this.pal;
    const until = (B.every - p) % B.every, on = this.onBeatNow();
    const rx = 8 + until * 0.55, ry = rx * 0.32;
    g.lineStyle(1, on ? 0xffffff : P.light, on ? 0.9 : 0.35); g.strokeEllipse(this.x, this.y + 1, rx * 2, ry * 2);
    if (on) { g.fillStyle(P.light, 0.25); g.fillEllipse(this.x, this.y + 1, 22, 7); }
    const s = this.streak || 0;
    if (s > 0) {                                                       // the streak: a row of notes over his head
      const top = this.y - (this.def.tagY || 64) - 10;
      for (let i = 0; i < s; i++) {
        const x = this.x - (s - 1) * 3 + i * 6, hop = on ? -2 : 0;
        g.fillStyle(s >= B.hype ? (i % 2 ? 0xffa030 : 0xff4a3a) : P.light, 1);
        g.fillRect(x, top + hop, 2, 2); g.fillRect(x + 1, top - 4 + hop, 1, 4); g.fillRect(x + 2, top - 4 + hop, 1, 1);
      }
    }
  }
}
