// Fighter methods: KAMI (def kami.js) - FOLDS. FOLD (down special) refolds him CRANE / FROG / BLADE (his stats through
// the shared demonDmg / demonSpeed / demonKb / demonFloat multipliers, his white paper tinted for each); his neutral
// special per fold; PAPER CUT, the Sprite Fusion DASH (src/fx/sfMovement.js); KITE; and his Limit PAPER TIGER.
// Reached through the `def.show` hooks (fighterShow.js): kamiSpecial / kamiStep / kamiTick / kamiLanded / drawKami /
// drawKamiHud / tigerLimit. Mixed into the Fighter class (Fighter.js) - `this` is he.
import { sfx } from '../audio/sfx.js';
import { spawnShot, nearestFoe, burstHit, skyLayer, foesOf } from './showShot.js';
import movement, { hex } from '../fx/sfMovement.js';
import { sfSpawn, sfActor } from '../fx/sfRunner.js';

const ORDER = ['crane', 'frog', 'blade'];
const INK = 0x1a1418;
// THE PAPER TIGER, side on, facing right, feet at 0: [colour, points...] (x, y pairs; y up is negative)
const TIGER = [
  [0xc85a1a, [-52, -22, -66, -44, -60, -46, -44, -30]],                      // tail
  [0xd8701e, [-46, -14, -50, 0, -38, 0, -30, -16]],                          // back leg
  [0xf08a3a, [-48, -20, -30, -44, 18, -46, 30, -24, 8, -10, -36, -10]],      // body
  [0xfff4e0, [-30, -12, 8, -10, 0, -4, -24, -6]],                            // belly
  [0xd8701e, [12, -14, 18, 0, 30, 0, 26, -18]],                              // front leg
  [0xf08a3a, [18, -40, 34, -56, 50, -48, 54, -32, 40, -22, 24, -26]],        // head
  [0xfff4e0, [40, -30, 54, -32, 52, -24, 42, -22]],                          // muzzle
  [0xf08a3a, [30, -52, 30, -64, 38, -54]],                                    // ear
];
const STRIPES = [[-26, -42, -20, -30, -16, -43], [-10, -45, -4, -30, 0, -45], [6, -46, 12, -32, 16, -46], [26, -48, 30, -38, 34, -50]];

/** KAMI's own methods (attached to Fighter.prototype). */
export class FighterKami {
  /** His fold's numbers. */
  kamiFold() { if (!this.fold) this.setFold('crane', true); return this.def.show.folds[this.fold]; }
  /** Refolds him into fold `name` (sets the shared stat multipliers). */
  setFold(name, quiet) {
    const F = this.def.show.folds[name]; this.fold = name;
    this.demonDmg = F.dmg; this.demonSpeed = F.speed; this.demonKb = F.kb; this.demonFloat = F.float || null;
    if (!quiet) {
      const M = this.match; M.popText(this, F.name + '!', '#' + (F.tint === 0xffffff ? 0xf0503c : F.tint).toString(16).padStart(6, '0'));
      sfx('petal', 0.55, 1.4); sfx('whoosh', 0.3, 2);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; M.particles.push({ x: this.x, y: this.y - 26, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6 - 1, life: 22, color: i % 3 ? F.tint : 0xf0503c, grav: 0.08, drag: 0.93, size: 3 }); }
    }
  }

  /** His specials: all his own moves (`show: true`); PAPER CUT once in the air. */
  kamiSpecial(c) {
    this.kamiFold();
    if (c.up) { if (this.usedUpB) return false; this.usedUpB = true; this.startAttack('upb'); return true; }
    if (c.down) { this.startAttack('downB'); return true; }
    if (Math.abs(c.x) > 0.5) { if (this.usedCut && !this.grounded) return false; this.facing = Math.sign(c.x); this.usedCut = !this.grounded; this.startAttack('sideB'); this.startPaperCut(); return true; }
    this.startAttack('neutralB'); return true;
  }

  /** PAPER CUT's start: where he set off from, and the Sprite Fusion dash effect that follows him. */
  startPaperCut() {
    const m = this.def.moves.sideB, to = this.x + this.facing * m.dist;
    this.cut = { x0: this.x, y0: this.y, x1: to };
    const x0 = Math.min(this.x, to) - 70, x1 = Math.max(this.x, to) + 70;
    sfSpawn(this.match, movement({ kind: 'dash', actor: sfActor(this), facing: this.facing, distance: m.dist, delay: m.dashAt / 60, time: m.dashFor / 60,
      grounded: () => this.grounded, colors: ['#ffffff', '#fff4f0', '#ffd0c8', '#f0503c', '#c82a1e', '#8a1410', '#3a0806'].map(hex), seed: (this.age * 13 + this.slot) | 0 }),
    { x: x0, y: this.y - 90, w: x1 - x0, h: 110 });
  }

  /** Every frame of his own moves (from st_attack). True = it changed his state. */
  kamiStep(m) {
    const n = this.moveName, t = this.t, M = this.match, F = this.kamiFold();
    if (n === 'downB') {                                               // FOLD
      if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
      if (t === m.foldAt) this.setFold(ORDER[(ORDER.indexOf(this.fold) + 1) % ORDER.length]);
    } else if (n === 'neutralB') {
      if (this.fold === 'crane' && t === m.spawnAt) this.throwCrane(m.crane);
      else if (this.fold === 'frog' && t === m.spawnAt) { this.vy = m.frog.vy; this.vx = this.facing * m.frog.vx; this.grounded = false; this.platform = null; this.frogHop = this.attackId; sfx('djump', 0.6, 0.8); }
      else if (this.fold === 'blade' && m.blade.at.includes(t)) this.throwShuriken(m.blade, m.blade.at.indexOf(t));
      if (this.fold !== 'frog' && !this.grounded) this.vy = Math.min(this.vy, 1.2);
      if (this.frogHop && t > m.spawnAt + 2 && this.vy > 0) burstHit(this, this.x, this.y - 6, 18, m.frog.fall, 'kmfall' + this.attackId);
    } else if (n === 'sideB') {                                        // PAPER CUT
      const C = this.cut; if (!C) return false;
      if (t >= m.dashAt && t < m.dashAt + m.dashFor) { this.vx = this.facing * (m.dist / m.dashFor); this.vy = 0; this.invincible = Math.max(this.invincible, 2); if (t === m.dashAt) sfx('slash', 0.5, 1.6); }
      if (t === m.dashAt + m.dashFor) { this.vx = this.facing * 2; C.x1 = this.x; C.y1 = this.y; }
      if (!this.grounded && t < m.cutAt) this.vy = Math.min(this.vy, 0.6);
      if (t === m.cutAt) {                                              // a beat later: the cut lands along the whole line
        const y = ((C.y0 + (C.y1 ?? this.y)) / 2);
        M.limitHits.push({ t: 0, hb: { x1: Math.min(C.x0, C.x1), x2: Math.max(C.x0, C.x1), y1: y - 52, y2: y + 4, h: m.slash, owner: this, facing: this.facing, id: 'kmcut' + this.attackId, pillar: true } });
        sfx('shing', 0.6, 1.1); sfx('slash', 0.5, 0.9); M.shake(4, 6); C.at = 0; C.y = y - 24;
      }
      if (C.at !== undefined) C.at++;
    } else if (n === 'upb') {                                          // KITE
      if (t >= m.riseFrom && t <= m.riseTo) {
        const k = (t - m.riseFrom) / (m.riseTo - m.riseFrom);
        this.vy = m.riseV * F.upb * (1 - 0.5 * k); this.grounded = false; this.platform = null;
        if (t === m.riseFrom) { sfx('whoosh', 0.5, 1.1); M.puff(this.x, this.y, 0xffffff, 6); }
      }
      if (t >= m.frames - 1) { this.kiteGlide = m.glide; this.setState(this.grounded ? 'idle' : 'helpless'); return true; }
    }
    return false;
  }

  /** CRANE's neutral: a paper crane that drifts toward the nearest foe. */
  throwCrane(C) {
    const hx = this.x + this.facing * 12, hy = this.y - 38, me = this, tint = this.def.show.folds.crane.tint;
    spawnShot(this.match, this, { name: 'PAPER CRANE', x: hx, y: hy, vx: this.facing * C.speed, vy: -0.4, life: C.life, w: 14, h: 12, hit: C.hit, solid: true,
      step: (s) => { const o = nearestFoe(me, s); if (o) { const c = o.center(), want = Math.atan2(c.y - s.y, c.x - s.x), cur = Math.atan2(s.vy, s.vx); let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const a = cur + Math.max(-C.turn, Math.min(C.turn, d)); s.vx = Math.cos(a) * C.speed; s.vy = Math.sin(a) * C.speed; } },
      draw: (g, s) => me.drawCrane(g, s.x, s.y, Math.sign(s.vx) || 1, Math.sin(s.t * 0.4), tint) });
    sfx('petal', 0.45, 1.5); sfx('whoosh', 0.3, 1.8);
  }
  /** A paper crane at (x, y) facing dir, wings at `flap` (-1..1). */
  drawCrane(g, x, y, dir, flap, tint = 0xffffff) {
    const f = dir, wy = -6 - 4 * flap;
    g.fillStyle(INK, 1); g.fillTriangle(x - 8 * f, y + 1, x + 9 * f, y - 1, x, y + 4);
    g.fillStyle(0xc4bcaa, 1); g.fillTriangle(x - 7 * f, y, x + 8 * f, y - 1, x, y + 3);
    g.fillStyle(tint === 0xffffff ? 0xece8dc : tint, 1); g.fillTriangle(x - 2 * f, y - 1, x + 3 * f, y - 1, x - 3 * f, y + wy);   // the far wing
    g.fillStyle(0xffffff, 1); g.fillTriangle(x - 1 * f, y, x + 4 * f, y, x + 1 * f, y + wy - 2);
    g.fillStyle(0xffffff, 1); g.fillTriangle(x + 6 * f, y - 1, x + 11 * f, y - 6, x + 8 * f, y);                     // neck
    g.fillStyle(0xf0503c, 1); g.fillRect(x + 10 * f - (f < 0 ? 1 : 0), y - 7, 2, 1);                                   // beak
    g.fillStyle(0xffffff, 1); g.fillTriangle(x - 6 * f, y, x - 12 * f, y - 4, x - 7 * f, y + 1);                       // tail
  }
  /** BLADE's neutral: a paper shuriken, straight and flat (the second and third a little high and low). */
  throwShuriken(B, i) {
    const hx = this.x + this.facing * 14, hy = this.y - 34 + (i - 1) * 4;
    spawnShot(this.match, this, { name: 'SHURIKEN', x: hx, y: hy, vx: this.facing * B.speed, vy: (i - 1) * 0.35, life: B.life, w: 10, h: 10, hit: B.hit, solid: true,
      draw: (g, s) => { const a = s.t * 0.6; for (let k = 0; k < 4; k++) { const b = a + (k * Math.PI) / 2; g.fillStyle(k % 2 ? 0x9ab8e0 : 0xffffff, 1); g.fillTriangle(s.x, s.y, s.x + Math.cos(b) * 6, s.y + Math.sin(b) * 6, s.x + Math.cos(b + 0.9) * 3, s.y + Math.sin(b + 0.9) * 3); } g.fillStyle(INK, 1); g.fillRect(s.x - 1, s.y - 1, 2, 2); } });
    sfx('shuriken', 0.4, 1.2 + i * 0.1);
  }

  /** Every frame: his fold's extra jumps and FROG's big jumps, the hop's stomp, KITE's glide, the taunt's plane. */
  kamiTick() {
    const F = this.kamiFold(), M = this.match;
    if (this.grounded) { this.jumpsLeft = Math.max(this.jumpsLeft, F.jumps); this.usedCut = false; this.kiteGlide = 0; }
    if (F.jump && this.state === 'air' && this.t === 0 && this.vy < -5) this.vy *= F.jump;                   // FROG: big jumps
    if (this.state === 'helpless' && this.kiteGlide && !this.fastFalling && this.vy > this.kiteGlide) this.vy = this.kiteGlide - 0.42;
    if (!['helpless', 'attack', 'air'].includes(this.state)) this.kiteGlide = 0;
    if (this.state !== 'attack' || this.moveName !== 'sideB') this.cut = null;
    if (this.frogHop) {                                                 // FROG's hop: the stomp where he lands
      if (['hitstun', 'grabbed', 'seized', 'limit', 'dying', 'ledge'].includes(this.state)) this.frogHop = 0;
      else if (this.grounded) {
        const S = this.def.moves.neutralB.frog; this.frogHop = 0;
        burstHit(this, this.x, this.y - 10, S.r, S.stomp, 'kmstomp' + this.age); sfx('bighit', 0.5, 0.9); M.shake(4, 8);
        for (let i = 0; i < 10; i++) M.particles.push({ x: this.x + (i - 4.5) * 6, y: this.y - 2, vx: (i - 4.5) * 0.5, vy: -1.5 - Math.random() * 2, life: 18, color: i % 2 ? 0x9fe08a : 0xffffff, grav: 0.15, size: 3 });
        this.kamiRing = { x: this.x, y: this.y, t: 0 };
      }
    }
    if (this.kamiRing && ++this.kamiRing.t > 14) this.kamiRing = null;
    if (this.state === 'taunt' && this.t === 44 && this.def.taunt) {   // PAPER PLANE: it glides off and away
      const me = this; spawnShot(M, this, { x: this.x + this.facing * 12, y: this.y - 44, vx: this.facing * 2.4, vy: -0.6, life: 150, harmless: true, solid: false,
        step: (s) => { s.vy += Math.sin(s.t * 0.08) * 0.03; },
        draw: (g, s) => { const f = Math.sign(s.vx); g.fillStyle(INK, 1); g.fillTriangle(s.x + 7 * f, s.y, s.x - 6 * f, s.y - 4, s.x - 4 * f, s.y + 2); g.fillStyle(0xffffff, 1); g.fillTriangle(s.x + 6 * f, s.y, s.x - 5 * f, s.y - 3, s.x - 3 * f, s.y + 1); g.fillStyle(me.pal.mid, 1); g.fillRect(s.x - 4 * f, s.y - 1, 1, 1); } });
    }
  }
  /** A hit landed: paper scraps and a red ink fleck. */
  kamiLanded(t) {
    const c = t.center();
    for (let i = 0; i < 4; i++) this.match.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 3.5, vy: -Math.random() * 2.5, life: 18, color: i ? 0xffffff : 0xf0503c, grav: 0.1, drag: 0.94, size: 2 });
  }

  /** What's drawn round him: his fold's tint, the kite over him, PAPER CUT's line, FROG's stomp ring, PAPER TIGER. */
  drawKami(g, spr) {
    const F = this.kamiFold(), s = this.state;
    if (F.tint !== 0xffffff && !this.flash && !this.silhouette && !(this.star > 0) && !(this.curse > 0) && !(this.possessed > 0)) spr.setTint(F.tint).setTintMode(Phaser.TintModes.MULTIPLY);
    const kiting = (s === 'attack' && this.moveName === 'upb' && this.t >= this.def.moves.upb.riseFrom) || (s === 'helpless' && this.kiteGlide);
    if (kiting) {                                                       // KITE: a red-and-white paper kite on a string from his hand
      const b = this.fxBack, kx = this.x - this.facing * 4 + Math.sin(this.anim * 0.12) * 3, ky = this.y - 78, hx = this.x + this.facing * 10, hy = this.y - 34;
      b.lineStyle(1, 0xece8dc, 1); b.lineBetween(hx, hy, kx, ky + 12); b.lineStyle(0);
      b.fillStyle(INK, 1); b.fillTriangle(kx, ky - 15, kx - 13, ky, kx, ky + 13); b.fillTriangle(kx, ky - 15, kx + 13, ky, kx, ky + 13);
      b.fillStyle(0xf0503c, 1); b.fillTriangle(kx, ky - 13, kx - 11, ky, kx, ky); b.fillTriangle(kx, ky, kx + 11, ky, kx, ky + 11);
      b.fillStyle(0xffffff, 1); b.fillTriangle(kx, ky - 13, kx + 11, ky, kx, ky); b.fillTriangle(kx, ky, kx - 11, ky, kx, ky + 11);
      for (let i = 0; i < 4; i++) { const tx = kx + Math.sin(this.anim * 0.2 + i) * 3, ty = ky + 15 + i * 5; b.fillStyle(i % 2 ? 0xf0503c : 0xffffff, 1); b.fillTriangle(tx - 2, ty, tx + 2, ty, tx, ty + 4); }
    }
    const C = this.cut;
    if (C && C.at !== undefined && C.at < 20) {                         // the cut: an ink line along his path that splits open in red
      const k = C.at / 20, x0 = Math.min(C.x0, C.x1), x1 = Math.max(C.x0, C.x1), y = C.y;
      g.lineStyle(5 * (1 - k) + 1, 0xf0503c, 0.7 * (1 - k)); g.lineBetween(x0, y + 3, x1, y - 3);
      g.lineStyle(2, INK, 1 - k); g.lineBetween(x0, y + 3, x1, y - 3);
      g.lineStyle(1, 0xffffff, 1 - k); g.lineBetween(x0, y + 2 - k * 5, x1, y - 4 - k * 5); g.lineStyle(0);
      for (let i = 0; i < 4; i++) { const px = x0 + ((i + 0.5) / 4) * (x1 - x0); g.fillStyle(i % 2 ? 0xffffff : 0xf0503c, 1 - k); g.fillRect(px, y - 2 + (i % 2 ? -1 : 1) * k * 12, 3, 2); }
    }
    if (this.kamiRing) { const k = this.kamiRing.t / 14; g.lineStyle(3 * (1 - k) + 1, 0x9fe08a, 1 - k); g.strokeEllipse(this.kamiRing.x, this.kamiRing.y, 20 + 60 * k, 6 + 10 * k); g.lineStyle(0); }
    if (s === 'limit' && this.tiger) this.drawTiger(g, this.def.limit, this.tiger);
    else if (this.showSky) this.showSky.clear();
  }

  /** On his player plate: his fold - a little origami of it and its name's first letter tick. */
  drawKamiHud(g, x, y) {
    const F = this.kamiFold(), cx = x + 70, cy = y + 6;
    g.fillStyle(0x07060e, 0.7); g.fillRect(cx - 9, cy - 7, 18, 14);
    if (this.fold === 'crane') this.drawCrane(g, cx, cy + 1, 1, 0.5, F.tint);
    else if (this.fold === 'frog') { g.fillStyle(INK, 1); g.fillTriangle(cx - 7, cy + 5, cx, cy - 5, cx + 7, cy + 5); g.fillStyle(F.tint, 1); g.fillTriangle(cx - 6, cy + 4, cx, cy - 4, cx + 6, cy + 4); g.fillStyle(INK, 1); g.fillRect(cx - 3, cy - 1, 1, 1); g.fillRect(cx + 2, cy - 1, 1, 1); }
    else for (let k = 0; k < 4; k++) { const b = (k * Math.PI) / 2 + 0.4; g.fillStyle(k % 2 ? F.tint : 0xffffff, 1); g.fillTriangle(cx, cy, cx + Math.cos(b) * 6, cy + Math.sin(b) * 6, cx + Math.cos(b + 0.9) * 3, cy + Math.sin(b + 0.9) * 3); }
  }

  /** PAPER TIGER (Limit, `type: 'tiger'`): paper folds itself into a tiger behind him, it roars, pounces across the
   *  stage clawing everyone in its way, and its ink seal stamps down on them. */
  tigerLimit(L) {
    const t = this.t, M = this.match;
    if (t === 1 || !this.tiger) {
      const dir = this.facing, x0 = this.x - dir * 20, edge = dir > 0 ? 440 : -440;
      this.tiger = { dir, x0, x: x0, y: this.y, x1: dir > 0 ? Math.min(edge, x0 + L.reach) : Math.max(edge, x0 - L.reach), caught: [], scraps: [] };
    }
    const T = this.tiger; this.invincible = Math.max(this.invincible, 2); this.vx = this.vy = 0;
    if (t < L.foldTo && t % 2 === 0) { T.scraps.push({ a: Math.random() * Math.PI * 2, r: 60 + Math.random() * 40, t: 0 }); if (t % 6 === 0) sfx('petal', 0.35, 1.2 + t / 60); }
    for (const s of T.scraps) s.t++;
    T.scraps = T.scraps.filter((s) => s.t < 18);
    if (t === L.roarAt) { sfx('roar', 0.9, 1.1); M.shake(8, 16); }
    if (t >= L.pounceFrom && t <= L.pounceTo) {
      const k = (t - L.pounceFrom) / (L.pounceTo - L.pounceFrom);
      T.x = T.x0 + (T.x1 - T.x0) * k; T.y = this.y - Math.sin(k * Math.PI) * 40;
      if (t === L.pounceFrom) sfx('whoosh', 0.7, 0.7);
      for (const o of foesOf(this)) {
        if (T.caught.includes(o) || o.isIntangible()) continue;
        const near = Math.abs(o.x - (T.x + T.dir * 10)) < 50 && o.y > T.y - 60 && o.y - o.body.h < T.y + 6;   // (its body against theirs)
        if (!near) continue;
        T.caught.push(o); M.applyHit(o, { h: L.claw, owner: this, facing: T.dir, id: 'kmclaw' + this.slot + ':' + t, pillar: true }, T.x);
        sfx('slash', 0.6, 0.8); M.shake(5, 6);
      }
    }
    if (t === L.stampAt) {
      for (const o of T.caught) if (o.alive) M.limitHits.push({ t: 0, hb: { x1: o.x - 24, x2: o.x + 24, y1: o.y - 70, y2: o.y + 8, h: L.stamp, owner: this, facing: T.dir, id: 'kmstamp' + this.slot + ':' + o.slot + ':' + M.frame, pillar: true } });
      T.stamped = T.caught.filter((o) => o.alive).map((o) => ({ x: o.x, y: o.y - 30 })); T.stampT = 0;
      sfx('taiko', 0.9, 0.9); sfx('bighit', 0.7, 0.8); M.shake(10, 14);
    }
    if (T.stampT !== undefined) T.stampT++;
    if (t >= L.frames) { this.tiger = null; if (this.showSky) this.showSky.clear(); this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  /** PAPER TIGER's look: a dusk of drifting paper behind the stage, scraps folding into the tiger piece by piece,
   *  its roar, the pounce with speed lines, and the red ink seals stamped on the caught. */
  drawTiger(g, L, T) {
    const t = this.t, sky = skyLayer(this), fade = Math.min(1, t / 14) * (t > L.frames - 14 ? (L.frames - t) / 14 : 1);
    sky.clear(); sky.fillStyle(0x2a1408, 0.55 * fade); sky.fillRect(0, 0, 640, 360);
    sky.fillStyle(0xf0503c, 0.5 * fade); sky.fillCircle(520, 110, 46); sky.fillStyle(0xffffff, 0.12 * fade);
    for (let i = 0; i < 24; i++) { const x = (i * 131 + t * (1 + (i % 3))) % 660 - 10, y = (i * 47 + t * 0.6) % 360; sky.fillRect(x, y, 3, 3); }
    for (const s of T.scraps) {                                         // paper flying in to fold
      const k = s.t / 18, r = s.r * (1 - k), x = T.x0 + Math.cos(s.a + k * 3) * r, y = T.y - 30 + Math.sin(s.a + k * 3) * r * 0.6;
      g.fillStyle(0xffffff, 1 - k * 0.5); g.fillTriangle(x, y, x + 4, y - 2, x + 2, y + 4);
    }
    const built = Math.min(1, t / L.foldTo), shown = Math.ceil(built * TIGER.length), d = T.dir;
    if (t >= L.pounceFrom && t <= L.pounceTo + 4) for (let i = 0; i < 6; i++) { const ly = T.y - 10 - i * 9; g.fillStyle(0xffffff, 0.5); g.fillRect(T.x - d * (70 + (i * 23 + t * 7) % 60), ly, 40, 1); }   // speed lines
    const sc = t < L.roarAt ? 1 : t < L.roarAt + 6 ? 1.08 : 1, X = (x) => T.x + d * x * sc, Y = (y) => T.y + y * sc;
    for (let i = 0; i < shown; i++) {
      const [col, p] = TIGER[i], pts = []; for (let q = 0; q < p.length; q += 2) pts.push({ x: X(p[q]), y: Y(p[q + 1]) });
      g.fillStyle(INK, 1); g.fillPoints(pts.map((v) => ({ x: v.x + d, y: v.y + 1 })), true);
      g.fillStyle(col, 1); g.fillPoints(pts, true);
      g.lineStyle(1, 0x7a3a10, 0.8); for (let q = 1; q < pts.length; q++) if (q % 2) g.lineBetween(pts[0].x, pts[0].y, pts[q].x, pts[q].y); g.lineStyle(0);   // the creases
    }
    if (shown >= TIGER.length) {
      g.fillStyle(INK, 1); for (const s of STRIPES) g.fillTriangle(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), X(s[4]), Y(s[5]));
      g.fillStyle(t >= L.roarAt ? 0xfff060 : INK, 1); g.fillRect(X(44) - 1, Y(-42), 3, 2);   // the eye
      if (t >= L.roarAt && t < L.pounceTo) { g.fillStyle(0x7a1010, 1); g.fillTriangle(X(44), Y(-28), X(58), Y(-34), X(56), Y(-22)); g.fillStyle(0xffffff, 1); g.fillTriangle(X(46), Y(-29), X(48), Y(-26), X(50), Y(-30)); }   // the roar
    }
    if (t >= L.roarAt && t < L.roarAt + 20) { const k = (t - L.roarAt) / 20; g.lineStyle(3, 0xffffff, 1 - k); g.strokeCircle(X(54), Y(-30), 10 + 70 * k); g.lineStyle(0); }
    for (const s of T.stamped || []) {                                  // the seal: a red square of ink with a white mark
      const k = Math.min(1, T.stampT / 6), sz = 34 - 14 * k, a = T.stampT > 26 ? Math.max(0, 1 - (T.stampT - 26) / 12) : 1;
      g.fillStyle(0xc82a1e, a); g.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
      g.fillStyle(0xffffff, a); g.fillRect(s.x - sz / 2 + 3, s.y - 1, sz - 6, 2); g.fillRect(s.x - 1, s.y - sz / 2 + 3, 2, sz - 6);
    }
  }
}
