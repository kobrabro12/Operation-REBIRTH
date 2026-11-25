// HANZ & $@L's light and his dimensions (its methods are copied onto HanzBossStage at the bottom of hanzBossStage.js;
// a name clash throws on load):
// - THE SPEAR OF LIGHT (`spear`): a spear of light forms in $@L's red hand, he aims (a line tracks you, then locks),
//   throws it - SPEAR.dmg (30) if it hits - and wherever it lands it MELTS into a puddle of light (`puddles`) that
//   stays PUDDLE.life (10 s) and raises PUDDLE.summons (2) LIGHT MINIONS out of itself (`minions`): glowing outlines of
//   people with weapons, three kinds (`MINION`): the BLADE (walks in, slashes, lunges), the BOW (keeps its distance,
//   draws and looses arrows of light), the HAMMER (slow, raises its hammer overhead and slams - shockwaves both ways).
//   Fighters can break them (`strikeMinions`).
// - THE SHIFT (`shift`): he claps and the whole room becomes another DIMENSION for DIM.time (`dim`, `setDim`):
//   THE IMPOSSIBLE STAIRS (a lithograph of stairs going every way at once, faceless walkers - and LOW GRAVITY),
//   THE MELTING HOUR (a desert where clocks melt, elephants on stilt legs, an eye for a sun - and pools of melted
//   time that slow you down), CHANNEL 13 (a test card for a sky, walls of TVs all showing his face, static - and the
//   TVs fire bands of static across the room). Then the room snaps back to the act's own world.
import { sfx } from '../audio/sfx.js';
import { VIEW_W, VIEW_H, PHYS } from '../config.js';

// THE SPEAR OF LIGHT: frames he aims for (tracking, then locked), its speed, length, the hit (30 damage exactly)
export const SPEAR = { track: 40, lock: 22, v: 15, len: 74, dmg: 30, kb: [40, 7.5, 0.9] };
// the puddle it melts into: how long it stays (frames), when it raises its minions, how many, how many minions may be up at once
const PUDDLE = { life: 600, at: [90, 330], summons: 2, max: 4, w: 70 };
// THE LIGHT MINIONS: colour, health, walk speed, how near they like to be, their attacks' timings and hits; how long one lasts
const MINION = {
  blade: { color: 0x9ae8ff, hp: 18, speed: 1.7, near: 44, wind: 18, live: 8, rest: 30, hit: [8, [40, 5.5, 0.7]], lunge: 3, lungeV: 6 },
  bow: { color: 0xffe08a, hp: 12, speed: 1.2, near: 190, draw: 44, rest: 70, v: 9, hit: [6, [30, 4.5, 0.55]] },
  hammer: { color: 0xff9ae6, hp: 30, speed: 0.9, near: 64, wind: 38, live: 8, rest: 52, hit: [12, [70, 7.5, 0.9]], wave: [7, [80, 5, 0.6]] },
  life: 900, rise: 40,
};
// THE SHIFT: how long a dimension lasts (frames), the least time between shifts, each dimension's tint on his counter;
// low gravity in the stairs (how much of gravity is lifted off anyone in the air), the melting hour's time pools
// (count, width, slow), Channel 13's static bands (every, warning, live, height, hit)
const DIM = {
  time: 1500, cool: 1700, list: ['stairs', 'melt', 'tv'],
  tint: { stairs: 0xe8dcc4, melt: 0xffc890, tv: 0xc8d8ff },
  name: { stairs: 'THE IMPOSSIBLE STAIRS', melt: 'THE MELTING HOUR', tv: 'CHANNEL 13' },
  lift: 0.45, pools: 2, poolW: 70, every: 230, warn: 50, live: 16, h: 28, hit: [10, [40, 6, 0.7]],
};
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** THE SPEAR OF LIGHT, its puddles and light minions, and THE SHIFT into his three dimensions. */
export class HanzLight {
  // ------------------------------------------------------------------ THE SPEAR OF LIGHT
  /** He raises $@L's red hand and a spear of light forms in it. */
  start_spear(match, a) { this.play('spear'); a.ph = 'form'; a.t0 = 0; sfx('warn', 0.6, 1.4); this.say('s', 'HOLD STILL.', 40); }
  /** Where the spear's grip is (his red hand in this frame of `spear`), in the world. */
  spearHand() { const fr = this.frame(); return fr.hand ? this.L(fr.hand[0], fr.hand[1]) : this.headAt(); }
  /** One frame of THE SPEAR OF LIGHT: forming, aiming (tracking you, then locked), the throw. */
  atk_spear(match, a, out) {
    const t = a.t - a.t0, spec = this.look('spear').spec, aimF = spec.aim || 19, goF = spec.go || 26;
    if (a.ph === 'form') {
      this.spearK = Math.min(1, t / 30);
      if (this.an.name === 'spear' && this.an.f >= aimF) { this.hold(aimF); a.ph = 'aim'; a.t0 = a.t; sfx('rumble', 0.4, 1.4); }
      if (this.an.name !== 'spear' && t > 40) { a.ph = 'aim'; a.t0 = a.t; }
    } else if (a.ph === 'aim') {
      const h = this.spearHand(), f = this.nearest(match, this.hx);
      if (t < this.sp(SPEAR.track) && f) a.tg = { x: f.x, y: f.y - 24 };
      if (!a.tg) a.tg = { x: this.hx + (this.face === 'r' ? 200 : -200), y: -24 };
      if (t === this.sp(SPEAR.track)) { sfx('ding', 0.6, 1.8); this.flash(0xfff4c0, 0.12); }
      this.spearAim = { x: h.x, y: h.y, tx: a.tg.x, ty: a.tg.y, lock: t >= this.sp(SPEAR.track) };
      if (t >= this.sp(SPEAR.track) + SPEAR.lock) { a.ph = 'throw'; a.t0 = a.t; this.an.held = false; this.spearAim = null; }
    } else if (a.ph === 'throw') {
      if (!a.thrown && !this.spearFly && (this.an.name !== 'spear' || this.an.f >= goF)) {
        const h = this.spearHand(), dx = a.tg.x - h.x, dy = a.tg.y - h.y, d = Math.hypot(dx, dy) || 1;
        this.spearFly = { x: h.x, y: h.y, vx: dx / d * SPEAR.v, vy: dy / d * SPEAR.v, id: this.nid('sp'), t: 0 };
        this.spearK = 0; sfx('whoosh', 1, 0.5); sfx('laser', 0.6, 1.8); match.shake(4, 6);
      }
      if (this.spearFly && !a.thrown) a.thrown = a.t;
      if ((a.thrown && a.t - a.thrown > 34) || t > 120) return true;
    }
    return false;
  }
  /** The spear in flight: it hits (SPEAR.dmg) whoever it passes through, and stops in them, in the desk, or at a wall -
   *  and melts into a puddle of light on the desk under where it stopped. */
  stepSpear(match, push) {
    const S = this.spearFly; if (!S) return; if (S.done) { this.spearFly = null; return; }
    S.t++; S.x += S.vx; S.y += S.vy;
    const n = Math.hypot(S.vx, S.vy), tx = S.x + S.vx / n * SPEAR.len / 2, ty = S.y + S.vy / n * SPEAR.len / 2;
    const h = this.bhit(S.id, tx - 12, ty - 12, tx + 12, ty + 12, SPEAR.dmg, SPEAR.kb, { dirX: Math.sign(S.vx) || 1 }); h.dmg = SPEAR.dmg;   // (exactly 30, whatever the difficulty)
    push(h);
    if (S.t % 2 === 0) match.particles.push({ x: S.x, y: S.y, vx: -S.vx * 0.15, vy: -S.vy * 0.15, life: 16, color: 0xfff4c0, size: 2 });
    const hit = match.fighters.find((f) => f.alive && f.state !== 'respawn' && Math.abs(f.x - tx) < 16 && ty > f.y - 48 && ty < f.y + 4);
    const floor = ty >= -4 && Math.abs(tx) < 272, wall = Math.abs(tx) > 300 || ty > 40 || ty < -420;
    if (hit || floor || wall) {
      S.done = true;
      const x = clamp(hit ? hit.x : tx, -250, 250);
      this.impact(match, x, 0, 0.7); sfx('glass', 0.7, 1.4); this.flash(0xfff4c0, 0.2);
      if (hit) { this.popAt(match, hit.x, hit.y - 40, 'PIERCED!', '#fff4c0'); match.shake(8, 10); }
      this.melt = { x, y: hit ? hit.y - 24 : Math.min(-4, ty), t: 0 };
      this.puddles.push({ x, t: 0, n: 0, id: this.nid('pd') });
      sfx('geyser', 0.4, 1.6);
    }
  }

  // ------------------------------------------------------------------ the puddles and the light minions
  /** The puddles glow and raise their minions; the minions walk and fight; the dimension does its thing. */
  stepLight(match, out) {
    const push = (h) => { if (out) out.push(h); };
    this.stepSpear(match, push);
    if (this.melt && ++this.melt.t > 30) this.melt = null;
    for (const P of this.puddles) {
      P.t++;
      if (PUDDLE.at.includes(P.t) && P.n < PUDDLE.summons && this.minions.length < PUDDLE.max && out) { P.n++; this.summon(match, P.x); }
    }
    this.puddles = this.puddles.filter((P) => P.t < PUDDLE.life);
    for (const m of this.minions) this.stepMinion(match, m, push);
    this.minions = this.minions.filter((m) => !m.dead);
    this.stepMinionWaves(push);
    this.stepDim(match, push, !!out);
  }
  /** A light minion climbs out of the puddle at x - a kind it picks itself (one of each before any repeat). */
  summon(match, x) {
    const kinds = ['blade', 'bow', 'hammer'], have = new Set(this.minions.map((m) => m.kind));
    const fresh = kinds.filter((k) => !have.has(k)), kind = (fresh.length ? fresh : kinds)[Math.floor(Math.random() * (fresh.length || 3))];
    const M = MINION[kind];
    this.minions.push({ kind, x, y: 0, dir: this.nearestPos().x < x ? -1 : 1, hp: M.hp, t: 0, ph: 'rise', pt: 0, walk: 0, n: 0, flash: 0, id: this.nid('mn') });
    sfx('summon', 0.6, 1.3); this.burst(match, x, -10, 14, [M.color, 0xffffff]);
  }
  /** One frame of a light minion: rising out of the light, then its own way of fighting (blade / bow / hammer). */
  stepMinion(match, m, push) {
    const M = MINION[m.kind], f = this.nearest(match, m.x); m.t++; m.pt++; if (m.flash > 0) m.flash--;
    if (m.t > MINION.life) { this.popMinion(match, m); return; }
    if (m.ph === 'rise') { if (m.pt >= MINION.rise) { m.ph = 'walk'; m.pt = 0; } return; }
    if (!f || !push) return;
    const dx = f.x - m.x, ad = Math.abs(dx);
    if (m.ph === 'walk') {
      m.dir = Math.sign(dx) || m.dir;
      const want = m.kind === 'bow' ? (ad < M.near - 30 ? -1 : ad > M.near + 30 ? 1 : 0) : (ad > M.near ? 1 : 0);
      if (want) { m.x = clamp(m.x + m.dir * want * M.speed, -262, 262); m.walk += M.speed * 0.12; }
      const ready = m.pt > (M.rest || 30) * 0.5;
      if (ready && (m.kind === 'bow' ? Math.abs(f.y) < 160 : ad <= M.near + 6)) { m.ph = 'wind'; m.pt = 0; m.n++; m.lunge = m.kind === 'blade' && m.n % M.lunge === 0; m.aimY = f.y - 24; sfx(m.kind === 'bow' ? 'staff' : 'warn', 0.35, 1.6); }
    } else if (m.ph === 'wind') {
      const wind = m.kind === 'bow' ? M.draw : M.wind;
      if (m.kind === 'bow') { m.dir = Math.sign(dx) || m.dir; m.aimY = lerp(m.aimY, f.y - 24, 0.1); }
      if (m.pt >= wind) { m.ph = 'act'; m.pt = 0; m.hid = this.nid('mh');
        if (m.kind === 'bow') { const ax = m.x + m.dir * 10, ay = -34, d = Math.hypot(f.x - ax, m.aimY - ay) || 1; this.shots.push({ kind: 'arrow', x: ax, y: ay, vx: (f.x - ax) / d * M.v, vy: (m.aimY - ay) / d * M.v, grav: 0.05, r: 5, id: this.nid('ar'), hit: M.hit, life: 120, c: M.color }); sfx('shing', 0.4, 1.7); m.ph = 'rest'; }
        else sfx(m.kind === 'hammer' ? 'bighit' : 'slash', 0.6, m.kind === 'hammer' ? 0.8 : 1.4);
      }
    } else if (m.ph === 'act') {
      if (m.kind === 'blade') {
        if (m.lunge) m.x = clamp(m.x + m.dir * M.lungeV, -262, 262);
        push(this.bhit(m.hid, m.x + (m.dir > 0 ? 4 : -52), -54, m.x + (m.dir > 0 ? 52 : -4), -4, ...M.hit, { dirX: m.dir }));
        if (m.pt >= (m.lunge ? 16 : M.live)) { m.ph = 'rest'; m.pt = 0; }
      } else if (m.kind === 'hammer') {
        if (m.pt === 1) { const x = m.x + m.dir * 30; this.impact(match, x, 0, 0.8); match.shake(7, 8); this.mwaves.push({ x, dir: -1, t: 0, id: this.nid('mw'), c: M.color }, { x, dir: 1, t: 0, id: this.nid('mw'), c: M.color }); }
        push(this.bhit(m.hid, m.x + (m.dir > 0 ? 0 : -58), -60, m.x + (m.dir > 0 ? 58 : 0), 2, ...M.hit, { radial: true }));
        if (m.pt >= M.live) { m.ph = 'rest'; m.pt = 0; }
      }
    } else if (m.ph === 'rest' && m.pt >= (M.rest || 30)) { m.ph = 'walk'; m.pt = 0; }
  }
  /** A minion breaks into light. */
  popMinion(match, m) { m.dead = true; this.burst(match, m.x, -30, 16, [MINION[m.kind].color, 0xffffff]); sfx('glass', 0.4, 1.6); }
  /** Fighters' attacks against the light minions: a hit takes its damage off; at nothing it breaks. Returns nothing. */
  strikeMinions(match, hbs) {
    for (const hb of hbs) {
      if (!hb.owner) continue;
      for (const m of this.minions) {
        if (m.dead || m.ph === 'rise' || (m.seen && m.seen.has(hb.id))) continue;
        if (hb.x2 < m.x - 14 || hb.x1 > m.x + 14 || hb.y2 < -60 || hb.y1 > 0) continue;
        (m.seen ||= new Set()).add(hb.id);
        m.hp -= (hb.h && hb.h.dmg) || 4; m.flash = 6; match.puff(m.x, -30, MINION[m.kind].color, 5); sfx('hit', 0.4, 1.5);
        if (m.hp <= 0) this.popMinion(match, m);
      }
    }
  }
  /** The hammer's shockwaves: two low waves of light running out along the desk. */
  stepMinionWaves(push) {
    for (const w of this.mwaves) { w.t++; w.x += w.dir * 5; push(this.bhit(w.id, w.x - 10, -20, w.x + 10, 2, ...MINION.hammer.wave, { dirX: w.dir })); }
    this.mwaves = this.mwaves.filter((w) => w.t < 40 && Math.abs(w.x) < 280);
  }

  /** A pop-up line of text at (x, y) (when the match can show one). */
  popAt(match, x, y, text, css) { if (match.popText) match.popText({ x, y }, text, css); }

  // ------------------------------------------------------------------ THE SHIFT: his dimensions
  /** Whether THE SHIFT is ready (not too soon after the last). */
  shiftReady() { return !this.cut && this.t - (this.shiftAt ?? -1e9) > DIM.cool; }
  /** He claps, and on the clap the room becomes another dimension. */
  start_shift(match, a) { this.play('clap'); a.done = false; this.say('h', 'LET\'S GO SOMEWHERE ELSE.', 50); sfx('rumble', 0.6, 0.8); }
  /** One frame of THE SHIFT: the clap, then the flash and the new dimension. */
  atk_shift(match, a) {
    const at = (this.look('clap').spec.spark || { f: 18 }).f * 4;
    if (a.t === at) {
      const next = DIM.list.filter((d) => d !== this.dim), d = next[Math.floor(Math.random() * next.length)];
      const c = this.sparkAt('clap'); this.burst(match, c.x, c.y, 36, [0xffffff, DIM.tint[d], 0xff7ab8, 0x2fd6c6]);
      this.setDim(match, d);
    }
    return a.t > at + 40;
  }
  /** Turns the room into dimension d for DIM.time (or back to the act's own world with null). */
  setDim(match, d) {
    this.dim = d; this.dimT = d ? DIM.time : 0; this.shiftAt = this.t; this.dimFx = [];
    if (!d) { this.setWorld(this.world); this.dimG.clear(); return; }
    for (const L of Object.values(this.bgSets)) for (const o of L) o.setVisible(false);
    for (const L of Object.values(this.deskSets)) for (const o of L) o.setVisible(false);
    for (const o of this.deskSets.void) o.setVisible(true).setTint(DIM.tint[d]);
    this.dimG.setVisible(true);
    this.flash(0xffffff, 0.9); sfx('bighit', 1, 0.5); sfx('glitch', 0.8, 0.6); if (match) match.shake(12, 14);
    if (match) this.popAt(match, 0, -260, DIM.name[d] + '!', '#ffffff');
    if (d === 'melt') this.dimFx = Array.from({ length: DIM.pools }, (_, i) => ({ x: -150 + i * 300, v: (i ? -1 : 1) * 0.35 }));
  }
  /** One frame of a dimension: its clock running out, and what it does to you (low gravity / time pools / static). */
  stepDim(match, push, live) {
    if (!this.dim) return;
    if (--this.dimT <= 0 || (this.boss && this.boss.dying)) { this.flash(0xffffff, 0.6); sfx('glitch', 0.6, 0.9); this.setDim(match, null); return; }
    const alive = match.fighters.filter((f) => f.alive && f.state !== 'respawn');
    if (this.dim === 'stairs') for (const f of alive) if (!f.grounded && f.state !== 'hitstun' && f.vy > -9) f.vy -= PHYS.gravity * DIM.lift;
    if (this.dim === 'melt') for (const p of this.dimFx) {
      p.x += p.v; if (Math.abs(p.x) > 230) p.v = -p.v;
      for (const f of alive) if (f.grounded && Math.abs(f.x - p.x) < DIM.poolW / 2) f.slow = Math.max(f.slow || 0, 3);
    }
    if (this.dim === 'tv' && live && this.dimT % DIM.every === 0 && this.boss) {
      const y = [-20, -70, -140][Math.floor(Math.random() * 3)], dir = Math.random() < 0.5 ? -1 : 1;
      this.bands.push({ y, h: DIM.h, warn: DIM.warn, live: DIM.live, fade: 12, t: 0, dir, id: this.nid('tv'), hit: DIM.hit });
      sfx('popup', 0.5, 0.8);
    }
  }

  // ------------------------------------------------------------------ drawing
  /** The spear in his hand and in flight, the aim line, the melting, the puddles, the light minions and their arrows. */
  drawLight() {
    const g = this.topG, gl = this.glowG, m = this.midG, t = this.t; if (!g) return;
    this.drawDim();
    if (this.spearK > 0 && !this.gone) { const h = this.spearHand(), a = this.face === 'r' ? -0.5 : Math.PI + 0.5, k = this.spearK; this.drawSpear(g, gl, h.x, h.y, this.spearAim ? Math.atan2(this.spearAim.ty - this.spearAim.y, this.spearAim.tx - this.spearAim.x) + Math.PI : a, k); }
    if (this.spearAim) { const A = this.spearAim; g.lineStyle(A.lock ? 2 : 1, A.lock ? 0xffffff : 0xfff4c0, A.lock ? 0.8 : 0.35 + 0.35 * (Math.floor(t / 3) % 2)); g.lineBetween(A.x, A.y, A.x + (A.tx - A.x) * 4, A.y + (A.ty - A.y) * 4); if (A.lock) { g.lineStyle(1, 0xffffff, 0.9); g.strokeCircle(A.tx, A.ty, 10 + Math.sin(t * 0.5) * 2); } }
    const S = this.spearFly; if (S && !S.done) this.drawSpear(g, gl, S.x, S.y, Math.atan2(S.vy, S.vx), 1);
    if (this.melt) { const M = this.melt, k = M.t / 30; gl.fillStyle(0xfff4c0, 0.5 * (1 - k)); gl.fillEllipse(M.x, lerp(M.y, -2, k), 30 * (1 - k) + 10, 60 * (1 - k) + 6); }
    for (const P of this.puddles) {
      const k = Math.min(1, P.t / 20) * Math.min(1, (PUDDLE.life - P.t) / 40), w = PUDDLE.w * (0.9 + 0.1 * Math.sin(t * 0.1));
      gl.fillStyle(0xfff4c0, 0.25 * k); gl.fillEllipse(P.x, -2, w * 1.6, 18); gl.fillStyle(0xffffff, 0.35 * k); gl.fillEllipse(P.x, -2, w, 8);
      m.fillStyle(0xfff4c0, 0.7 * k); m.fillEllipse(P.x, -1, w * 0.8, 5);
      for (let i = 0; i < 4; i++) { const q = (t * 0.7 + i * 17) % 40; gl.fillStyle(0xffffff, 0.5 * k * (1 - q / 40)); gl.fillCircle(P.x + Math.sin(i * 2.3 + t * 0.03) * w * 0.35, -4 - q, 1.5); }
    }
    for (const mn of this.minions) this.drawMinion(m, gl, mn);
    for (const w of this.mwaves) { gl.fillStyle(w.c, 0.35); gl.fillEllipse(w.x, -10, 30, 22); g.fillStyle(w.c, 0.8); g.fillTriangle(w.x - 6, 0, w.x + 6, 0, w.x + w.dir * 3, -18); }
    for (const s of this.shots) if (s.kind === 'arrow') { const a = Math.atan2(s.vy, s.vx), c = Math.cos(a), sn = Math.sin(a); gl.lineStyle(6, s.c, 0.3); gl.lineBetween(s.x, s.y, s.x - c * 20, s.y - sn * 20); g.lineStyle(2, 0xffffff, 1); g.lineBetween(s.x, s.y, s.x - c * 18, s.y - sn * 18); g.fillStyle(s.c, 1); g.fillTriangle(s.x + c * 5, s.y + sn * 5, s.x - sn * 3, s.y + c * 3, s.x + sn * 3, s.y - c * 3); }
  }
  /** A spear of light at (x, y) pointing at angle a, `k` formed (0..1): a glowing shaft with a long diamond head. */
  drawSpear(g, gl, x, y, a, k) {
    const c = Math.cos(a), s = Math.sin(a), L = SPEAR.len * k, bx = x - c * L * 0.35, by = y - s * L * 0.35, tx = x + c * L * 0.65, ty = y + s * L * 0.65;
    gl.lineStyle(12 * k, 0xfff4c0, 0.25); gl.lineBetween(bx, by, tx, ty); gl.fillStyle(0xffffff, 0.3 * k); gl.fillCircle(tx, ty, 10 * k);
    g.lineStyle(3, 0xfff4c0, k); g.lineBetween(bx, by, tx, ty); g.lineStyle(1, 0xffffff, k); g.lineBetween(bx, by, tx, ty);
    const hx = tx + c * 12 * k, hy = ty + s * 12 * k;
    g.fillStyle(0xffffff, k); g.fillPoints([{ x: hx, y: hy }, { x: tx - s * 5 * k, y: ty + c * 5 * k }, { x: tx - c * 6 * k, y: ty - s * 6 * k }, { x: tx + s * 5 * k, y: ty - c * 5 * k }], true);
  }
  /** A light minion: a silhouette - dark inside, a glowing outline - with its weapon, walking, winding up or striking;
   *  rising out of its puddle (drawn from the feet up) when it's new, flickering out at the end of its life. */
  drawMinion(g, gl, m) {
    const M = MINION[m.kind], col = m.flash ? 0xffffff : M.color, d = m.dir, t = this.t, ws = Math.sin(m.walk * 6);
    const rise = m.ph === 'rise' ? m.pt / MINION.rise : 1, fade = Math.min(1, (MINION.life - m.t) / 40) * (m.t > MINION.life - 120 && t % 8 < 2 ? 0.4 : 1);
    const sc = m.kind === 'hammer' ? 1.2 : 1, H = 56 * sc, sink = (1 - rise) * H;
    const P = (x, y) => ({ x: m.x + x * d * sc, y: y * sc + sink });
    const hip = P(0, -24), chest = P(1, -40), head = P(2, -50), kn1 = P(4 + ws * 4, -12), ft1 = P(6 + ws * 8, 0), kn2 = P(-3 - ws * 4, -12), ft2 = P(-6 - ws * 8, 0);
    const w = m.ph === 'wind' ? Math.min(1, m.pt / ((m.kind === 'bow' ? M.draw : M.wind) || 20)) : 0, act = m.ph === 'act';
    let hand1, hand2, weapon = [];
    if (m.kind === 'blade') {
      const a = act ? 0.6 : lerp(-0.3, -2.2, w); hand1 = P(10 + Math.cos(a) * 6, -36 + Math.sin(a) * 10); hand2 = P(-6, -28);
      weapon = [[hand1, P(10 + Math.cos(a) * 6 + Math.cos(a) * 30, -36 + Math.sin(a) * 10 + Math.sin(a) * 30)]];
    } else if (m.kind === 'bow') {
      hand1 = P(18, -38); hand2 = P(18 - 12 * w - 2, -38);
      const top = P(16, -58), bot = P(16, -18); weapon = [[top, P(22, -38)], [P(22, -38), bot], [top, hand2], [hand2, bot]];
    } else {
      const a = act ? 0.9 : lerp(0.3, -2.6, w); hand1 = P(6 + Math.cos(a) * 8, -36 + Math.sin(a) * 8); hand2 = P(2 + Math.cos(a) * 4, -32 + Math.sin(a) * 4);
      const tip = P(6 + Math.cos(a) * 40, -36 + Math.sin(a) * 40); weapon = [[hand2, tip]]; this.hamHead = tip;
    }
    const bones = [[hip, chest], [hip, kn1], [kn1, ft1], [hip, kn2], [kn2, ft2], [chest, hand1], [chest, hand2]];
    const clip = (p) => p.y <= 0.5;
    const sh = P(1, -40), torso = [P(-6, -42), P(8, -42), P(6, -26), P(-4, -26)].map((q) => ({ x: q.x, y: Math.min(q.y, 0) }));   // (a body, not a stick)
    if (sh.y <= 0.5) {
      gl.fillStyle(col, 0.22 * fade); gl.fillPoints(torso.map((q) => ({ x: q.x + (q.x > m.x ? 3 : -3), y: q.y })), true);
      g.lineStyle(3, col, fade); g.fillStyle(0x0a0814, fade); g.fillPoints(torso, true); g.strokePoints(torso, true);
    }
    gl.lineStyle(10, col, 0.22 * fade); for (const [a, b] of bones) if (clip(a) || clip(b)) gl.lineBetween(a.x, Math.min(a.y, 0), b.x, Math.min(b.y, 0));
    gl.fillStyle(col, 0.22 * fade); if (clip(head)) gl.fillCircle(head.x, head.y, 10 * sc);
    g.lineStyle(9 * sc, col, fade); for (const [a, b] of bones) if (clip(a) || clip(b)) g.lineBetween(a.x, Math.min(a.y, 0), b.x, Math.min(b.y, 0));
    if (clip(head)) { g.fillStyle(col, fade); g.fillCircle(head.x, head.y, 8 * sc); }
    g.lineStyle(5.5 * sc, 0x0a0814, fade); for (const [a, b] of bones) if (clip(a) || clip(b)) g.lineBetween(a.x, Math.min(a.y, 0), b.x, Math.min(b.y, 0));
    if (clip(head)) { g.fillStyle(0x0a0814, fade); g.fillCircle(head.x, head.y, 6 * sc); g.fillStyle(col, fade); g.fillRect(head.x + d * 2 - 1, head.y - 1, 2, 2); }
    if (rise > 0.6) {
      g.lineStyle(2, 0xffffff, fade); for (const [a, b] of weapon) g.lineBetween(a.x, a.y, b.x, b.y);
      gl.lineStyle(6, col, 0.3 * fade); for (const [a, b] of weapon) gl.lineBetween(a.x, a.y, b.x, b.y);
      if (m.kind === 'hammer' && this.hamHead) { const q = this.hamHead; g.fillStyle(0x0a0814, fade); g.fillRect(q.x - 9, q.y - 7, 18, 14); g.lineStyle(2, col, fade); g.strokeRect(q.x - 9, q.y - 7, 18, 14); }
      if (m.kind === 'blade' && act) { gl.lineStyle(14, col, 0.25); gl.beginPath(); gl.arc(m.x + d * 14, -34, 30, d > 0 ? -1.2 : Math.PI - 0.6, d > 0 ? 0.6 : Math.PI + 1.2); gl.strokePath(); }
      if (m.kind === 'bow' && m.ph === 'wind') { const a = Math.atan2(m.aimY + 34, (this.nearestPos().x - m.x)); g.lineStyle(1, col, 0.3 + 0.4 * (t % 6 < 3)); g.lineBetween(m.x + d * 18, -38, m.x + d * 18 + Math.cos(a) * 400 * Math.sign(d * Math.cos(a) || 1), -38 + Math.sin(a) * 400); }
    }
    if (m.ph === 'rise') { gl.fillStyle(col, 0.4); gl.fillEllipse(m.x, -2, 50, 10); }
  }

  /** The dimension behind everything (on `dimG`, the background camera): stairs / melting clocks / TVs and static. */
  drawDim() {
    const g = this.dimG; if (!g) return; g.clear(); if (!this.dim) return;
    const t = this.t, d = this.dim;
    if (d === 'stairs') {
      g.fillStyle(0xe8dcc4, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
      for (let i = 0; i < 90; i++) { g.fillStyle(0x2a2420, 0.05); g.fillRect((i * 71) % VIEW_W, (i * 37) % VIEW_H, 40, 1); }   // (the lithograph's grain)
      const stair = (x, y, n, dx, dy, w, a) => { for (let i = 0; i < n; i++) { const sx = x + dx * i, sy = y + dy * i; g.fillStyle(0xd0c4a8, a); g.fillRect(sx, sy, w, Math.abs(dy) + 1); g.lineStyle(1, 0x2a2420, a); g.lineBetween(sx, sy, sx + w, sy); g.lineBetween(sx, sy, sx, sy + Math.abs(dy)); } };
      const drift = (t * 0.2) % 24;
      stair(40, 300, 12, 18, -20, 30, 1); stair(600, 40, 12, -16, 22, 26, 1); stair(160, 20, 10, 22, 14, 20, 0.8);
      stair(380, 330, 9, 20, -12, 24, 0.7); stair(250, 140, 8, -18, -12, 18, 0.6);
      for (let i = 0; i < 4; i++) { const x = 120 + i * 130, y = 70 + (i % 2) * 120; g.fillStyle(0x2a2420, 0.9); g.fillRect(x, y, 22, 40); g.fillStyle(0xfff4dc, 0.9); g.fillRect(x + 3, y + 3, 16, 34); g.fillStyle(0x2a2420, 1); g.fillCircle(x + 15, y + 22, 1.5); }
      for (let i = 0; i < 6; i++) {                                                          // faceless walkers going up and down forever
        const k = ((t * 0.004 + i / 6) % 1), x = 40 + k * 216 + (i % 2) * 300, y = 300 - k * 240 + (i % 3) * 20;
        g.fillStyle(0x2a2420, 0.85); g.fillCircle(x, y - 14, 4); g.fillRect(x - 3, y - 10, 6, 12); g.lineStyle(2, 0x2a2420, 0.85); g.lineBetween(x - 2, y + 2, x - 4 + Math.sin(t * 0.2 + i) * 3, y + 9); g.lineBetween(x + 2, y + 2, x + 4 - Math.sin(t * 0.2 + i) * 3, y + 9);
      }
      g.lineStyle(2, 0x2a2420, 0.7); g.strokeTriangle(320, 40 - drift * 0, 380, 140, 260, 140);                  // the Penrose triangle in the middle
      g.strokeTriangle(320, 62, 362, 130, 278, 130);
    } else if (d === 'melt') {
      const bands = [0x3a1a4a, 0x7a2a5a, 0xc24a5a, 0xf0805a, 0xffc070, 0xffe0a0];
      bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * 42, VIEW_W, 43); });
      g.fillStyle(0xd09060, 1); g.fillRect(0, 250, VIEW_W, VIEW_H - 250); g.fillStyle(0xb07048, 1); g.fillRect(0, 250, VIEW_W, 4);
      const ex = 470, ey = 90, bl = Math.abs(Math.sin(t * 0.01)) < 0.04 ? 0.1 : 1;                                    // the eye-sun
      g.fillStyle(0xfff4dc, 1); g.fillEllipse(ex, ey, 90, 44 * bl); g.fillStyle(0x3a6ab0, 1); g.fillCircle(ex + Math.sin(t * 0.02) * 14, ey, 16 * bl); g.fillStyle(0x07050a, 1); g.fillCircle(ex + Math.sin(t * 0.02) * 14, ey, 7 * bl);
      for (let i = 0; i < 3; i++) {                                                                 // elephants on stilt legs
        const x = ((t * 0.15 + i * 230) % (VIEW_W + 160)) - 80, y = 140 + i * 18;
        for (let l = 0; l < 4; l++) { g.lineStyle(1.5, 0x2a1a20, 1); g.lineBetween(x - 14 + l * 9, y + 6, x - 16 + l * 9 + Math.sin(t * 0.03 + l + i) * 4, 250); }
        g.fillStyle(0x2a1a20, 1); g.fillEllipse(x, y, 40, 18); g.fillCircle(x + 20, y - 4, 7); g.lineStyle(2, 0x2a1a20, 1); g.lineBetween(x + 25, y - 2, x + 30, y + 10);
      }
      for (let i = 0; i < 4; i++) {                                                                 // melting clocks
        const x = 60 + i * 150, y = 200 + (i % 2) * 20, drip = 10 + Math.sin(t * 0.02 + i) * 4;
        g.fillStyle(0xf0e4c8, 1); g.fillEllipse(x, y, 46, 24); g.fillRect(x - 6, y, 14, drip + 8); g.fillEllipse(x + 1, y + drip + 8, 14, 8);
        g.lineStyle(1.5, 0x3a2a20, 1); g.strokeEllipse(x, y, 46, 24); g.lineBetween(x, y, x + Math.cos(t * 0.01 + i) * 12, y + Math.sin(t * 0.01 + i) * 6); g.lineBetween(x, y, x + 6, y - 4);
      }
      for (let i = 0; i < 30; i++) { g.fillStyle(0x1a0a0a, 0.8); g.fillRect((i * 53 + t * 0.4) % VIEW_W, 262 + (i * 17) % 80, 2, 1); }   // ants
    } else {
      const bars = [0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0];
      bars.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(i * VIEW_W / 7, 0, VIEW_W / 7 + 1, 120); });
      g.fillStyle(0x101018, 1); g.fillRect(0, 120, VIEW_W, VIEW_H - 120);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {                                     // walls of TVs, every one showing his face
        const x = 8 + c * 70 + (r % 2) * 20, y = 130 + r * 56, on = (c * 7 + r * 3 + Math.floor(t / 40)) % 5 !== 0;
        g.fillStyle(0x3a3640, 1); g.fillRect(x, y, 60, 48); g.fillStyle(0x1a1820, 1); g.fillRect(x + 4, y + 4, 44, 38);
        if (on) { g.fillStyle(0xb8121c, 1); g.fillRect(x + 12, y + 10, 14, 26); g.fillStyle(0xd2d0cc, 1); g.fillRect(x + 26, y + 10, 14, 26); g.fillStyle(0x07050a, 1); g.fillRect(x + 17, y + 18, 3, 3); g.fillRect(x + 31, y + 18, 3, 3); g.fillRect(x + 17, y + 28, 18, 2); }
        else for (let k = 0; k < 18; k++) { g.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x606060, 1); g.fillRect(x + 4 + Math.random() * 42, y + 4 + Math.random() * 36, 2, 2); }
        g.fillStyle(0x8a8690, 1); g.fillCircle(x + 54, y + 12, 2); g.fillCircle(x + 54, y + 22, 2);
      }
      for (let y = 0; y < VIEW_H; y += 3) { g.fillStyle(0x000000, 0.12); g.fillRect(0, y, VIEW_W, 1); }   // scanlines
      if (t % 240 < 8) for (let k = 0; k < 160; k++) { g.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x404040, 0.6); g.fillRect(Math.random() * VIEW_W, Math.random() * VIEW_H, 3, 2); }   // the channel changing
      g.fillStyle(0xffffff, 0.9); g.fillRect(560, 16, 50, 16); g.fillStyle(0x07050a, 1); g.fillRect(566, 20, 6, 8); g.fillRect(576, 20, 6, 8);   // CH 13 in the corner
    }
  }
  /** The dimension's things on the desk: the melting hour's pools of melted time. */
  drawDimWorld() {
    if (this.dim !== 'melt' || !this.midG) return;
    const m = this.midG, gl = this.glowG, t = this.t;
    for (const p of this.dimFx || []) {
      m.fillStyle(0xf0e4c8, 0.85); m.fillEllipse(p.x, -1, DIM.poolW, 7); m.lineStyle(1, 0x3a2a20, 0.8); m.strokeEllipse(p.x, -1, DIM.poolW, 7);
      for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2; m.fillStyle(0x3a2a20, 0.8); m.fillRect(p.x + Math.cos(q) * DIM.poolW * 0.36, -1 + Math.sin(q) * 2.4, 1, 1); }
      m.lineStyle(1, 0x3a2a20, 1); m.lineBetween(p.x, -1, p.x + Math.cos(t * 0.05) * 12, -1 + Math.sin(t * 0.05) * 2);
      if (gl) { gl.fillStyle(0xffc890, 0.15); gl.fillEllipse(p.x, -6, DIM.poolW * 1.2, 20); }
    }
  }
}
