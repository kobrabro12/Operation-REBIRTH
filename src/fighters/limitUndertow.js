// Mr Wake's Limit: the Undertow cutscene and its drawing.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';

export class LimitUndertow {

  // ------------------------------------------------------------------ Undertow Limit (Mr Wake)
  // melt into a puddle -> it floods the floor -> anyone standing in it is dragged under -> the abyss
  // cutscene (eyes open, jaws chomp, spit them out) / nobody caught: the pool drains and he re-forms
  undertowLimit(L) {
    const m = this.match, P = m.stage.platforms[0];
    if (this.t === 1) { this.ult = { phase: 'melt', victims: [], origin: { x: this.x, y: this.y }, w: 0 }; sfx('curse', 0.9, 0.5); }
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    if (U.phase === 'melt') {
      if (!this.grounded) this.vy = Math.max(this.vy, 6);              // drips straight down to the floor
      if (this.t >= L.melt && this.grounded) { U.phase = 'flood'; U.ft = 0; U.cx = this.x; U.y = this.y; sfx('summon', 0.9, 0.5); }
      if (this.t >= L.melt && this.y > P.y + 60) return this.endUndertow();   // melted over the void: nothing to flood
      return;
    }
    if (U.phase === 'flood') {
      U.ft++;
      U.w = Math.min(L.spread, (U.ft / L.flood) * L.spread);
      const x1 = U.cx - U.w, x2 = U.cx + U.w;
      for (const o of m.fighters) {                                       // standing in the flood: dragged under
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.state === 'dying' || U.victims.includes(o) || o.isIntangible()) continue;
        if (o.grounded && Math.abs(o.y - U.y) < 3 && o.x > x1 && o.x < x2) {
          U.victims.push(o); o.vx = o.vy = o.lx = o.ly = 0; o.stopChargeSound(); o.setState('hitstun'); o.hitstun = 999;
          m.puff(o.x, o.y - 4, this.pal.shade, 8); sfx('curse', 0.6, 0.7);
        }
      }
      if (U.ft % 6 === 0) m.puff(x1 + Math.random() * (x2 - x1), U.y - 3, Math.random() < 0.5 ? this.pal.mid : this.fxColor, 1);
      if (U.ft >= L.flood) {
        if (U.victims.length) {                                           // caught someone: into the abyss
          U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this; U.chomp = 0;
          this.fx.setDepth(4); for (const v of U.victims) v.sprite.setDepth(4.5);
          sfx('limit', 0.8, 0.6); m.shake(8, 10);
        } else { U.phase = 'recede'; U.rt = 0; }
      }
      return;
    }
    if (U.phase === 'recede') { U.rt++; U.w = L.spread * (1 - U.rt / L.recede); if (U.rt >= L.recede) this.endUndertow(); return; }
    if (U.phase === 'cutscene') return this.undertowCutscene(L, U);
  }
  undertowCutscene(L, U) {
    const m = this.match;
    U.ct++;
    U.victims = U.victims.filter((v) => v.alive && v.state !== 'dying');
    if (!U.victims.length) return this.endUndertow();
    for (const v of U.victims) { v.hitstun = 999; v.lx = v.ly = 0; }
    if (U.ct === 8) sfx('summon', 1, 0.4);                                   // the eyes open
    const start = L.eyesFor;
    if (U.ct >= start && U.chomp < L.chomps && (U.ct - start) % L.chompEvery === L.chompEvery - 6) {   // the jaws snap shut
      U.chomp++;
      for (const t of U.victims) m.applyHit(t, { h: L.chomp, owner: this, facing: this.facing, id: 'chomp' + this.slot + ':' + U.chomp, pillar: true }, t.x);
      for (const t of U.victims) { t.lx = t.ly = 0; t.hitstun = 999; }
      sfx('bighit', 0.7, 0.6 + U.chomp * 0.05); m.shake(6, 4);
    }
    const spitAt = start + L.chomps * L.chompEvery + L.spitAfter;
    if (U.ct === spitAt) {                                                    // spat out of the deep
      for (const t of U.victims) { t.hitstun = 0; m.applyHit(t, { h: L.final, owner: this, facing: this.facing, id: 'spit' + this.slot, pillar: true }, t.x); m.puff(t.x, t.y - 20, this.pal.mid, 18); m.puff(t.x, t.y - 20, 0xffffff, 8); }
      sfx('ko', 0.7, 0.8); m.shake(14, 12);
      return this.endUndertow();
    }
  }
  endUndertow() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { m.frozen = 0; m.cutscene = null; for (const v of U.victims) v.sprite.setDepth(0); }
    this.fx.setDepth(0);
    if (U) { this.x = U.origin.x; if (U.y !== undefined) this.y = U.y; }
    this.ult = null; this.invincible = 30;
    this.reform = 16;                                                         // rises back out of the puddle
    this.setState(this.grounded ? 'idle' : 'air');
    m.puff(this.x, this.y - 10, this.pal.mid, 12);
  }
  // the deep's two giant glowing eyes, opening and blinking, slit pupils on the victim
  drawAbyssEyes(g, c, jawEdge, ct) {
    const open = Math.min(1, Math.max(0, (ct - 6) / 20)), blink = ct > 40 && ct % 70 > 66 ? 0.1 : 1;
    for (const ex of [-62, 62]) {
      const x = c.x + ex, y = jawEdge - 44, rx = 34, ry = 16 * open * blink;
      if (ry < 1) continue;
      g.fillStyle(this.fxColor, 0.25); g.fillEllipse(x, y, rx * 2 + 16, ry * 2 + 12);
      g.fillStyle(0xd8ff6a, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
      g.fillStyle(0xf8ffd0, 1); g.fillEllipse(x - 6, y - ry * 0.3, rx, ry * 0.8);
      g.fillStyle(0x05020c, 1); g.fillEllipse(x + Phaser.Math.Clamp((c.x - x) * 0.1, -8, 8), y, 7, ry * 1.8);
    }
  }
  drawUndertow(g, L, U) {
    const t = this.anim, col = this.fxColor;
    if (U.phase === 'flood' || U.phase === 'recede' || U.phase === 'cutscene') {   // the puddle across the floor
      const w = U.phase === 'cutscene' ? L.spread : U.w, y = U.y;
      for (let x = -w; x < w; x += 4) {
        const edge = 1 - Math.abs(x) / Math.max(1, w), h = 2 + Math.round(4 * Math.min(1, edge * 4)) + Math.round(Math.sin(x * 0.2 + t * 0.15) * 1.2);
        g.fillStyle(this.pal.void, 0.95); g.fillRect(U.cx + x, y - h, 4, h + 2);
        if ((x / 4 + (t >> 3)) % 7 === 0) { g.fillStyle(col, 0.8); g.fillRect(U.cx + x, y - h, 3, 1); }
      }
      for (let k = 0; k < 6; k++) {                                        // bubbles
        const bx = U.cx + Math.sin(k * 71.3) * w * 0.9, by = y - 3 - ((t + k * 13) % 24) * 0.5;
        g.fillStyle(this.pal.light, 1 - ((t + k * 13) % 24) / 24); g.fillRect(Math.round(bx), Math.round(by), 2, 2);
      }
    }
    if (U.phase !== 'cutscene') return;
    // ---- the abyss, centred on the first victim
    const v = U.victims[0]; if (!v) return;
    const c = v.center(), ct = U.ct, W = 440, H = 280;
    g.fillStyle(0x020108, 1); g.fillRect(c.x - W / 2, c.y - H / 2, W, H);
    for (let i = 0; i < 6; i++) { g.fillStyle(this.pal.outline, 0.25 - i * 0.03); g.fillEllipse(c.x, c.y + 20, 420 - i * 60, 220 - i * 30); }
    for (let k = 0; k < 18; k++) {                                         // drifting motes in the dark
      const mx = c.x + Math.sin(k * 12.9) * 200, my = c.y + 120 - ((ct * (0.4 + (k % 3) * 0.2) + k * 30) % 260);
      g.fillStyle(k % 3 ? this.pal.mid : col, 0.6); g.fillRect(Math.round(mx), Math.round(my), 2, 2);
    }
    // jaws: open wide, then snap shut on every chomp
    if (ct < L.eyesFor - 10) return this.drawAbyssEyes(g, c, c.y - 80, ct);   // eyes first, in the dark
    const local = ct - L.eyesFor, ph = ((local % L.chompEvery) + L.chompEvery) % L.chompEvery;
    let gap = U.chomp >= L.chomps ? 90 : ph < L.chompEvery - 6 ? 90 - Math.max(0, ph - 6) * 6 : 6;
    gap = Math.max(6, gap);
    if (local < 0) gap = 90 + (-local) * 6;
    for (const side of [-1, 1]) {
      const edge = c.y + side * gap / 2;                                     // where the teeth meet
      g.fillStyle(0x12061f, 1); g.fillRect(c.x - 190, side < 0 ? edge - 120 : edge, 380, 120);   // the jaw itself
      g.fillStyle(this.pal.shade, 1); g.fillRect(c.x - 190, side < 0 ? edge - 8 : edge, 380, 8);         // gums
      for (let tx = c.x - 184; tx < c.x + 184; tx += 20) {                   // teeth
        const big = Math.abs(tx - c.x) < 60 ? 1.4 : 1;
        g.fillStyle(0xe8e0f0, 1); g.fillTriangle(tx, edge, tx + 16, edge, tx + 8, edge - side * 18 * big);      // fangs point at the victim
        g.fillStyle(0xa898c0, 1); g.fillTriangle(tx + 8, edge, tx + 16, edge, tx + 8, edge - side * 18 * big);
      }
    }
    this.drawAbyssEyes(g, c, c.y - gap / 2, ct);                            // set into the upper jaw: they ride up and down with each chomp
  }
}
