// Fighter methods: LAST SEEN (test fighter) - the SIGHTINGS meter, turning into SEEN and back (on KO), HIDE, her
// two Limits (I SEE IT TOO, DO NOT APPROACH) and SEEN's look. Mixed into the Fighter class (Fighter.js) - `this` is
// the fighter. Tuning: lastSeen.js.
import { sfx } from '../audio/sfx.js';
import { newAttackId } from './attackIds.js';
import { skinSheets } from './skins.js';
import { drawPoster } from './entities.js';

const TURN = { frames: 70, swapAt: 50 };          // the transformation: how long, and the frame she becomes SEEN

export class FighterLastSeen {
  // ---- SIGHTINGS: every hit she deals or takes; full = she turns
  addSightings(n) {
    const S = this.def.sightings;
    if (!S || this.state === 'turning') return;
    const before = this.sightings || 0;
    this.sightings = Math.min(S.max, before + n);
    if (this.sightings >= S.max && before < S.max) { this.wantTurn = true; this.match.popText(this, 'SIGHTINGS: FULL', '#e8c86a'); }
  }
  lastSeenTick() {
    if (this.wantTurn && ['idle', 'run', 'air', 'land', 'jumpsquat', 'taunt'].includes(this.state)) this.startTurn();
    if (this.def.wrong && !this.match.frozen) this.seenTick();
  }
  startTurn() {
    this.wantTurn = false;
    this.setState('turning'); this.vx *= 0.3; this.lx = this.ly = 0;
    sfx('glitch', 0.9, 0.5); sfx('curse', 0.6, 0.6); this.match.shake(4, 20);
  }
  st_turning() {
    this.invincible = Math.max(this.invincible, 2);
    this.vx *= 0.85; if (!this.grounded) this.vy = Math.min(this.vy, 1.5);
    const m = this.match, R = Math.random;
    if (this.t % 3 === 0) for (let i = 0; i < 3; i++) m.particles.push({ shape: 'pixel2', x: this.x + (R() - 0.5) * 40, y: this.y - R() * 60, vx: (R() - 0.5) * 2, vy: (R() - 0.5) * 2, life: 12, color: [0xffffff, 0x141216, 0xe8c86a][i], grav: 0, drag: 0.9 });
    if (this.t % 10 === 0) sfx('glitch', 0.4, 0.4 + R() * 0.6);
    if (this.t === TURN.swapAt) this.becomeSeen();
    if (this.t >= TURN.frames) this.setState(this.grounded ? 'idle' : 'air');
  }
  becomeSeen() {
    const m = this.match;
    if (!this.def.wrongDef) return;
    this.baseDef = this.def; this.baseSheets = this.sheets; this.basePal = this.pal;
    this.def = this.def.wrongDef;
    this.sheets = skinSheets(this.scene, this.def, this.skin);
    this.pal = this.def.pal;
    sfx('ko', 0.7, 0.4); sfx('bighit', 0.9, 0.5); m.shake(14, 14);
    m.popText(this, 'SEEN', '#ff3a2a'); sfx('buzz', 0.7, 0.6);
    for (let i = 0; i < 24; i++) {                                    // posters torn off her and scattered
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
      m.particles.push({ shape: 'paper', x: this.x, y: this.y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 40 + Math.random() * 20, color: i % 3 ? 0xece6d4 : 0xc8281e, ang: Math.random() * 6, spin: 0.3, drag: 0.95, grav: 0.06 });
    }
  }
  // KO'd: she's herself again, the meter empty
  revertLastSeen() {
    if (this.baseDef) { this.def = this.baseDef; this.sheets = this.baseSheets; this.pal = this.basePal; this.baseDef = null; }
    this.sightings = 0; this.wantTurn = false;
  }

  // ---- PLEASE HELP ME (side special): she caught someone - she clings on, begging, then shoves them off
  startCling(t) {
    this.clingTo = t; this.setState('cling'); this.vx = this.vy = this.lx = this.ly = 0;
    this.match.popText(this, ['PLEASE HELP ME', 'DID YOU SEE IT?', "DON'T LEAVE ME"][Math.floor(Math.random() * 3)], '#e8c86a');
    sfx('dodge', 0.5, 1.4);
  }
  st_cling() {
    const C = this.def.moves.sideB.cling, t = this.clingTo, m = this.match;
    if (!C || !t || !t.alive || t.state === 'respawn') { this.clingTo = null; this.setState(this.grounded ? 'idle' : 'air'); return; }
    this.x = t.x - this.facing * 12; this.y = t.y; this.vx = this.vy = 0; this.grounded = t.grounded; this.platform = t.platform;
    t.vx = t.vy = t.lx = t.ly = 0;
    if (t.state === 'hitstun') t.hitstun = Math.max(t.hitstun, 6);
    if (this.t > 1 && this.t % C.every === 0 && this.t < C.frames) {
      m.applyHit(t, { h: C.tick, owner: this, facing: this.facing, id: 'cling' + this.slot + ':' + this.t + ':' + this.age, pillar: true }, this.x);
      this.addSightings(C.fill); sfx('hit', 0.3, 1.3);
    }
    if (this.t >= C.frames) {
      m.applyHit(t, { h: C.shove, owner: this, facing: this.facing, id: 'clings' + this.slot + ':' + this.age }, this.x);
      this.clingTo = null; this.vx = -this.facing * 2; this.vy = -3; this.grounded = false; this.platform = null; this.setState('air');
    }
  }

  // ---- I SEE IT TOO (her Limit): a scream that knocks everyone near her away, then she turns
  turnLimit(L) {
    const m = this.match;
    this.vx = 0;
    if (this.t === 1) {
      sfx('curse', 1, 0.5); sfx('bighit', 1, 0.6); m.shake(12, 16);
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.isIntangible()) continue;
        if (Math.hypot(o.x - this.x, o.y - this.y) <= L.radius) m.applyHit(o, { h: L.blast, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'lsee' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, this.x);
      }
    }
    if (this.t < 16) m.particles.push({ shape: 'ring', x: this.x, y: this.y - 30, vx: 0, vy: 0, life: 12, maxLife: 12, r: 6 + this.t * 6, dr: 2, color: this.t % 2 ? 0xffffff : 0xe8c86a, grav: 0 });
    if (this.t >= L.frames) { this.sightings = this.def.sightings ? this.def.sightings.max : 0; this.startTurn(); }
  }

  // ---- DO NOT APPROACH (SEEN's Limit): the lights go out and she's right behind them
  approachLimit(L) {
    const m = this.match;
    if (this.t === 1) {
      let best = null, bd = L.reach;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn') continue;
        const d = Math.hypot(o.x - this.x, o.y - this.y); if (d < bd) { bd = d; best = o; }
      }
      this.ult = { target: best, posters: Array.from({ length: 9 }, (_, i) => ({ x: (i % 3) / 3 + 0.08 + Math.random() * 0.12, y: Math.floor(i / 3) / 3 + 0.1 + Math.random() * 0.1, tilt: (Math.random() - 0.5) * 2 })) };
      sfx('buzz', 0.8, 0.5); sfx('curse', 0.7, 0.5);
    }
    const U = this.ult, T = U.target;
    this.vx = 0; this.lx = 0;
    if (T && (!T.alive || T.state === 'respawn')) U.target = null;
    if (U.target && this.t >= L.appearAt) {
      const side = -(T.facing || 1);                                   // behind them
      if (this.t === L.appearAt) { sfx('glitch', 1, 0.4); m.shake(8, 6); }
      this.x = T.x + side * 24; this.y = T.y; this.facing = -side; this.vy = 0; this.grounded = T.grounded;
      T.vx = T.vy = T.lx = T.ly = 0;
      if (T.state === 'hitstun') T.hitstun = Math.max(T.hitstun, 4);
      if (L.slashes.includes(this.t)) {
        m.applyHit(T, { h: L.slash, owner: this, facing: this.facing, id: 'appr' + this.slot + ':' + this.t + ':' + this.age, pillar: true }, this.x);
        sfx('swing', 0.7, 0.6 + Math.random() * 0.3); U.flash = 4; U.claw = this.t;
      }
      if (this.t === L.finalAt) {
        m.applyHit(T, { h: L.final, owner: this, facing: this.facing, id: 'apprf' + this.slot + ':' + this.age }, this.x);
        sfx('ko', 0.9, 0.5); sfx('bighit', 1, 0.5); m.shake(18, 12); U.flash = 8; U.target = null;
      }
    }
    if (U.flash > 0) U.flash--;
    if (this.t >= L.frames) { this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  drawApproach(g, L, U) {
    const m = this.match, v = m.worldCam.worldView, t = this.t, R = Math.random;
    const x0 = v.x - 4, y0 = v.y - 4, W = v.width + 8, H = v.height + 8;
    const dark = t < 8 ? t / 8 : t > L.frames - 14 ? (L.frames - t) / 14 : 1;
    const flick = (t * 13) % 37 < 3 ? 0.55 : 0.9;
    g.fillStyle(0x000000, dark * flick); g.fillRect(x0, y0, W, H);                       // the lights go out
    if ((t * 7) % 29 < 5) for (const p of U.posters) drawPoster(g, v.x + p.x * v.width, v.y + p.y * v.height, p.tilt, 0.35 * dark, 2.4, null);   // posters on the walls, flickering into view
    if (U.flash > 0) { g.fillStyle(0xffffff, 0.12 * U.flash); g.fillRect(x0, y0, W, H); }
    const T = U.target;
    if (T && t >= L.appearAt) {                                          // claw streaks across them
      const d = t - (U.claw || 0);
      if (d < 6) { const k = 1 - d / 6; g.lineStyle(2, 0xffffff, k); for (let i = -1; i <= 1; i++) g.lineBetween(T.x - 18, T.y - 44 + i * 6 + (U.claw % 24 ? 0 : 8), T.x + 18, T.y - 24 + i * 6); }
    }
    if (t > 8 && t < L.frames - 10 && R() < 0.15) { g.fillStyle(0xffffff, 0.08); g.fillRect(x0, v.y + R() * v.height, W, 2); }
  }

  // ---- SEEN: dark drips falling off her, a smear behind her when she moves, now and then she skips like bad footage
  seenTick() {
    const m = this.match, R = Math.random, S = (this.vfx && this.vfx.seen) || {};          // (a costume recolours all of it)
    const pick = (a, d) => (a ? a[Math.floor(R() * a.length)] : d);
    if (this.anim % 6 === 0) m.particles.push({ x: this.x + (R() - 0.5) * 18, y: this.y - R() * 40, vx: 0, vy: 0.6, life: 20, color: pick(S.drips, R() < 0.5 ? 0x141216 : 0x3a2a14), size: 2, grav: 0.12 });   // oil dripping out of it
    if (S.confetti && this.anim % 9 === 0) m.particles.push({ shape: 'paper', x: this.x + (R() - 0.5) * 50, y: this.y - 70 - R() * 20, vx: (R() - 0.5) * 0.6, vy: 0.5, life: 60, color: pick(S.drips), ang: R() * 6, spin: 0.2, drag: 0.98, grav: 0.01, sway: R() * 6 });   // GRAND OPENING: confetti falling round it
    if ((this.anim * 7) % 61 < 2) { for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2; m.particles.push({ shape: 'shard', x: this.x + (R() - 0.5) * 16, y: this.y - 20 - R() * 24, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: 10, color: S.sparks ? S.sparks[i % 2] : (i % 2 ? 0xffd060 : 0xffffff), drag: 0.92, grav: 0.2, ang: a }); } if (this.anim % 3 === 0) sfx('buzz', 0.12, 2); }   // a short in its wiring
    if (this.anim % 47 === 0) m.particles.push({ shape: 'pixel2', x: this.x + (R() - 0.5) * 20, y: this.y - 30 - R() * 20, vx: (R() - 0.5), vy: 0.4, life: 40, color: S.tuft || 0xd8c070, grav: 0.03, drag: 0.98 });   // a tuft of fur falling off
    if (Math.abs(this.vx) > 2.5 && this.anim % 2 === 0) m.particles.push({ shape: 'smoke', x: this.x - Math.sign(this.vx) * 6, y: this.y - 14 - R() * 20, vx: 0, vy: 0, life: 16, maxLife: 16, r: 4, color: S.smoke || 0x141216, grav: 0 });
  }
  // ---- HEAVY SWING (SEEN's neutral special): charge the axe up behind its head - it can shuffle along, very slowly -
  // then let go for one huge chop; the longer the charge, the harder and further it hits (tuning: lastSeen.js)
  startAxeCharge() { this.setState('axecharge'); this.axeCharged = 0; sfx('whoosh', 0.5, 0.5); }
  st_axecharge(c) {
    const nb = this.def.moves.neutralB, C = nb.axeCharge, m = this.match, R = Math.random;
    this.axeCharged = Math.min(C.max, this.axeCharged + 1);
    const k = this.axeCharged / C.max, full = k >= 1;
    // (on the ground it shuffles along slowly: Fighter.physics); in the air it drifts a little and hangs
    if (!this.grounded) { this.vx += c.x * 0.08; this.vx = Math.max(-C.walk * 1.5, Math.min(C.walk * 1.5, this.vx)); this.vy = Math.min(this.vy, 2); }
    if (this.axeCharged === C.max && this.t === C.max) { sfx('limitready', 0.6, 0.8); sfx('clang', 0.5, 0.5); m.shake(3, 6); }
    const tx = this.x + this.facing * C.tip[0], ty = this.y + C.tip[1];
    if (R() < 0.2 + k * 0.6) m.particles.push({ shape: 'drop', x: tx + (R() - 0.5) * 8, y: ty + 4, vx: (R() - 0.5) * 0.6, vy: 0.5, life: 24, color: R() < 0.5 ? 0xb01010 : 0x7a0808, grav: 0.2 });   // blood running off the blade
    if (full && this.t % 4 === 0) m.particles.push({ shape: 'pixel2', x: tx + (R() - 0.5) * 16, y: ty + (R() - 0.5) * 16, vx: 0, vy: -0.4, life: 12, color: R() < 0.5 ? 0xff3a2a : 0xffffff, grav: 0 });
    if (this.t % (full ? 8 : 18) === 0) sfx('buzz', 0.12 + 0.2 * k, 0.6 + k * 0.6);
    const release = (!c.held('special') && this.t > 2) || this.t >= C.hold || (this.isCpu && this.t >= (this.cpuChargeTarget || 40));
    if (!release) return;
    const lerp = (a, b) => (b === undefined ? a : a + (b - a) * k);
    this.move = { ...nb, hits: nb.hits.map((h) => ({ ...h, dmg: Math.round(lerp(h.dmg, h.maxDmg)), base: lerp(h.base, h.maxBase), growth: lerp(h.growth, h.maxGrowth), full })) };
    this.moveName = 'neutralB'; this.attackId = newAttackId(); this.hitList = new Set();
    this.setState('attack'); this.vx *= 0.3;
    sfx('whoosh', 0.9, 0.6 - 0.15 * k); if (full) sfx('bighit', 0.4, 0.5);
    if (full) m.popText(this, 'FULL SWING', '#ff3a2a');
  }
  // the glow on the axe head while it charges
  drawAxeCharge(g) {
    const C = this.def.moves.neutralB.axeCharge, k = this.axeCharged / C.max, full = k >= 1;
    const tx = this.x + this.facing * C.tip[0], ty = this.y + C.tip[1], pulse = full && this.anim % 6 < 3 ? 3 : 0;
    g.fillStyle(0xff1a1a, 0.15 + 0.25 * k); g.fillCircle(tx, ty, 4 + 9 * k + pulse);
    g.fillStyle(0xffffff, 0.5 + 0.4 * k); g.fillCircle(tx, ty, 1 + 2 * k);
  }

  // ---- LUNGE (SEEN's side special) hit someone: the FLURRY - it holds them in front of it and chops, and chops,
  // and one last big swing sends them flying
  startFlurry(t) {
    if (this.state === 'flurry') return;
    this.flurryOn = t; this.setState('flurry'); this.vx = this.vy = this.lx = this.ly = 0;
    sfx('bighit', 0.5, 0.7); this.match.shake(4, 6);
  }
  st_flurry() {
    const F = this.def.moves.sideB.flurry, t = this.flurryOn, m = this.match;
    if (!F || !t || !t.alive || t.state === 'respawn') { this.flurryOn = null; this.setState(this.grounded ? 'idle' : 'air'); return; }
    this.vx = 0; this.vy = this.grounded ? 0 : Math.min(this.vy + 0.1, 1);
    if (this.t < F.finishAt) {                                        // hold them right in front of it
      t.x = this.x + this.facing * F.gap; t.y = this.y; t.vx = t.vy = t.lx = t.ly = 0;
      if (t.state !== 'hitstun' && t.state !== 'shield') t.setState('hitstun');   // no wriggling out between the chops
      t.hitstun = Math.max(t.hitstun || 0, 8);
    }
    const hit = (h, id) => m.applyHit(t, { h, owner: this, facing: this.facing, id: 'flurry' + this.slot + ':' + id + ':' + this.age, pillar: true }, this.x);
    if (F.chops.includes(this.t)) { hit(F.chop, this.t); sfx('slash', 0.5, 0.8 + 0.05 * F.chops.indexOf(this.t)); m.shake(2, 3); }
    if (this.t === F.finishAt) { hit(F.finish, 'fin'); sfx('bighit', 0.8, 0.6); m.shake(8, 8); this.flurryOn = null; }
    if (this.t >= F.frames) { this.flurryOn = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  // ---- SCREAM (SEEN's down special, tuning in lastSeen.js): the axe goes into the floor, the jaw is wrenched
  // open, and it screams - blood spraying out, everyone near it SHAKEN; finish the scream and it's in a FRENZY
  screamStep(S) {
    const m = this.match, R = Math.random, f = this.facing;
    if (this.t === 1) this.thrownAxe = null;
    if (this.t === S.throwAt) {                                         // the throw
      this.thrownAxe = { x: this.x + f * S.axeX, y: this.y, y0: this.y - 46, stuck: this.grounded, f };
      sfx('whoosh', 0.7, 0.6);
    }
    if (this.t === S.land && this.thrownAxe && this.thrownAxe.stuck) {    // it bites into the floor
      sfx('clang', 0.6, 0.55); sfx('land', 0.6, 0.6); m.shake(3, 6);
      for (let i = 0; i < 6; i++) m.particles.push({ shape: 'pixel2', x: this.thrownAxe.x + (R() - 0.5) * 8, y: this.y - 1, vx: (R() - 0.5) * 3, vy: -1 - R() * 2, life: 18, color: R() < 0.5 ? 0x8a8478 : 0x5a5248, grav: 0.15 });
    }
    if (this.t === S.from) {                                            // the scream
      sfx('scream', 1, 1); sfx('bighit', 0.5, 0.45); sfx('glitch', 0.6, 0.5); m.shake(10, 12);
      m.popText(this, 'SCREAM', '#ff3a2a');
    }
    if (this.t >= S.from && this.t <= S.to) {
      const mx = this.x + f * 14, my = this.y - this.def.body.h * 0.8;
      if (this.t % 2 === 0) for (let i = 0; i < 3; i++) {             // blood, sprayed out of the mouth
        m.particles.push({ shape: 'drop', x: mx, y: my, vx: f * (2 + R() * 4.5), vy: -2 + R() * 3, life: 26 + R() * 14, color: [0xb01010, 0x7a0808, 0xd82020][i], grav: 0.22 });
      }
      if (this.t % 5 === 0) m.particles.push({ shape: 'ink', x: mx + f * (10 + R() * 30), y: my + R() * 20, vx: f * (1 + R() * 2), vy: R(), life: 20, color: 0x6a0606, r: 2 + R() * 2, drag: 0.9, grav: 0.2 });
      if (this.t % 9 === 0) m.particles.push({ shape: 'ring', x: mx, y: my, vx: 0, vy: 0, life: 24, maxLife: 24, r: 8, dr: (S.radius - 8) / 24, color: (this.t / 9) % 2 ? 0xffffff : 0xff3a2a, grav: 0 });
      if (this.t % 4 === 0) m.shake(2, 4);
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.state === 'respawn' || o.team === this.team) continue;
        if (Math.hypot(o.x - this.x, (o.y - o.body.h / 2) - my) > S.radius) continue;
        if (!(o.shaken > 0)) { m.popText(o, 'SHAKEN', '#ff8a7a'); sfx('curse', 0.4, 1.4); }
        o.shaken = Math.max(o.shaken || 0, S.shaken);
        const dx = (o.x - this.x) * f;                                  // right in front of its mouth: the blood
        if (dx > 0 && dx < S.cone && Math.abs(o.y - this.y) < 50 && (this.t - S.from) % S.every === 0 && !o.isIntangible()) {
          m.applyHit(o, { h: S.blood, owner: this, facing: f, id: 'blood' + this.slot + ':' + o.slot + ':' + this.t + ':' + this.age, pillar: true }, this.x);
        }
      }
    }
    if (this.t === S.to) {                                              // it got it all out: FRENZY
      this.frenzy = S.frenzy; this.limit = Math.min(100, this.limit + S.limit);
      m.popText(this, 'FRENZY', '#ff2a2a'); sfx('limitready', 0.6, 0.7); sfx('buzz', 0.5, 0.6);
    }
  }
  // the thrown axe, sticking out of the floor (or tumbling away if it was thrown in the air)
  drawThrownAxe(spr) {
    const A = this.thrownAxe, M = this.move, S = M && M.scream;
    const show = A && S && this.state === 'attack' && this.t >= S.throwAt && this.t < S.pickAt && this.sheets.axe;
    if (!show) { if (this.axeSpr) this.axeSpr.setVisible(false); return; }
    if (!this.axeSpr || this.axeSpr.texture.key !== this.sheets.axe) {
      if (this.axeSpr) this.axeSpr.destroy();
      this.axeSpr = this.scene.add.sprite(0, 0, this.sheets.axe, 0).setOrigin(0.5, 1); this.match.addWorld(this.axeSpr);
    }
    const k = Math.min(1, (this.t - S.throwAt) / Math.max(1, S.land - S.throwAt));
    let x = A.x, y = A.y + 6, rot = (A.f > 0 ? 0.25 : -0.25);              // stuck in at a slant, the blade sunk 6 px in
    if (k < 1) { y = A.y0 + (A.y + 6 - A.y0) * k * k; x = this.x + A.f * S.axeX * k; rot = -A.f * Math.PI * 2 * (1 - k); }   // still flying
    if (!A.stuck && k >= 1) { y = A.y + (this.t - S.land) * (this.t - S.land) * 0.2; rot += A.f * 0.2 * (this.t - S.land); }   // thrown in the air: it falls away
    this.axeSpr.setVisible(true).setPosition(x, y).setRotation(rot).setFlipX(A.f < 0).setDepth(spr.depth - 0.02);
  }
  drawSeen(g, spr) {
    this.drawThrownAxe(spr);
    if (this.state === 'axecharge') this.drawAxeCharge(g);
    if (this.frenzy > 0) {                                             // FRENZY: a red pulse round it, blood steaming off it
      const pulse = 0.12 + 0.08 * Math.sin(this.anim * 0.3), mid = this.y - this.def.body.h * 0.5;
      this.fxBack.fillStyle(0xff1a1a, pulse); this.fxBack.fillEllipse(this.x, mid, this.def.body.w * 2.6, this.def.body.h * 1.5);
      this.fxBack.fillStyle(0x6a0000, pulse * 0.8); this.fxBack.fillEllipse(this.x, mid, this.def.body.w * 1.6, this.def.body.h * 1.1);
      if (!this.match.frozen && this.anim % 5 === 0) this.match.particles.push({ shape: 'smoke', x: this.x + (Math.random() - 0.5) * 20, y: this.y - Math.random() * this.def.body.h, vx: 0, vy: -0.6, life: 20, maxLife: 20, r: 3, color: 0x8a0a0a, grav: -0.01 });
    }
    if ((this.anim * 11) % 53 < 2) spr.x += (Math.random() < 0.5 ? -4 : 4);                  // a skipped frame
    g.fillStyle(0x000000, 0.12); this.fxBack.fillStyle(0x000000, 0.08); this.fxBack.fillEllipse(this.x, this.y - 26, 40, 60);
  }

  // ---- the SIGHTINGS meter: a strip of eyes over her head, opening one by one
  drawSightings(g) {
    const S = this.def.sightings; if (!S || !this.alive) return;
    const n = 5, k = (this.sightings || 0) / S.max, x0 = this.x - (n - 1) * 5, y = this.y - (this.def.tagY || 64) - 10;
    for (let i = 0; i < n; i++) {
      const open = k * n - i, x = x0 + i * 10;
      g.fillStyle(0x0e0a08, 0.8); g.fillEllipse(x, y, 9, 5);
      if (open > 0) {
        const o = Math.min(1, open);
        g.fillStyle(0xf4f2ec, 1); g.fillEllipse(x, y, 7, 3 * o + 0.5);
        if (o >= 1) { g.fillStyle(k >= 1 && this.anim % 10 < 5 ? 0xff2a2a : 0x2a2a30, 1); g.fillRect(x - 1, y - 1, 2, 2); }
      }
    }
  }
}
