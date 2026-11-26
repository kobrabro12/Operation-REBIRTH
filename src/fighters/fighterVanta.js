// Fighter methods: VANTA (def vanta.js) - the neon street samurai. SYNC meter -> OVERCLOCK (a cut-in like GNASH's
// PSYCHO, then everyone else at half speed and his attacks echoing), IAI (hold + a PERFECT DRAW window), GHOST DASH
// (chained Sprite Fusion dashes whose echoes cut along their paths), NEON WIRE (a grapple), SAVE STATE (a save point he
// rewinds to with the Sprite Fusion blink) and his Limit BLACKOUT. He fights with TWO katanas (the second in his back
// hand): every normal's arc gets a twin in his accent colour. His NEON PANELS (vantaPanels.js) are his own comic-book
// streak - panels for his combos, big hits and KO STREAK. Every slash, cut and hit is a pixel effect from
// src/fx/sfSlash.js (built on the Sprite Fusion port's machinery). Reached through the `def.show` hooks
// (fighterShow.js): vantaSpecial / vantaStep / vantaTick / vantaBonus / vantaLanded / vantaHurt / drawVanta /
// drawVantaHud / vantaKO / blackoutLimit. Mixed into the Fighter class (Fighter.js) - `this` is he.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
import { burstHit, skyLayer, foesOf, nearestFoe } from './showShot.js';
import movement, { hex } from '../fx/sfMovement.js';
import { neonSlash, neonCut, neonImpact, glitchGhost, neonRise, neonRamp } from '../fx/sfSlash.js';
import { sfSpawn, sfActor } from '../fx/sfRunner.js';
import { NeonPanels, PANELS } from './vantaPanels.js';

const RAD = Math.PI / 180;
// which way each normal's slash sweeps (degrees, facing right: 0 = ahead, -90 = up, 90 = down)
const ARCS = {
  fwd: [-120, 50], up: [160, 380], down: [-20, 200], back: [300, 130], spin: [0, 360],
};
const ARC_OF = { jab: 'fwd', ftilt: 'fwd', fsmash: 'fwd', fair: 'fwd', dashAttack: 'fwd', uair: 'up', dtilt: 'down', dsmash: 'down', dair: 'down', bair: 'back', nair: 'spin' };

/** VANTA's own methods (attached to Fighter.prototype). */
export class FighterVanta {
  // ------------------------------------------------------------------ colours and effects
  /** His blade colour and his accent (visor / scarf), as 8-colour effect ramps - matched to his costume. */
  vtRamps() {
    const P = this.pal, key = P.mid + ':' + (P.accent ?? 0);
    if (!this._vtR || this._vtRK !== key) { this._vtRK = key; this._vtR = { blade: neonRamp(P.mid, hex), accent: neonRamp(P.accent ?? 0xff2ad8, hex) }; }
    return this._vtR;
  }
  /** Puts one of the neon effects in the world round (x, y), `pad` px of room each way. */
  vtFx(fx, x0, y0, x1, y1, pad = 40) {
    return sfSpawn(this.match, fx, { x: Math.min(x0, x1) - pad, y: Math.min(y0, y1) - pad, w: Math.abs(x1 - x0) + pad * 2, h: Math.abs(y1 - y0) + pad * 2 });
  }
  /** A neon sword arc round (x, y). */
  vtSlash(x, y, r, a0, a1, ramp, thick = 5, dur = 0.3) {
    this.vtFx(neonSlash({ x, y, r, a0: a0 * RAD, a1: a1 * RAD, colors: ramp, thick, dur, seed: (this.age * 31 + r) | 0 }), x - r, y - r, x + r, y + r, 30);
  }
  /** A straight neon cut from (x0, y0) to (x1, y1), landing `delay` s from now. */
  vtCut(x0, y0, x1, y1, ramp, delay = 0) {
    this.vtFx(neonCut({ x0, y0, x1, y1, delay, colors: ramp, seed: (this.age * 17 + x0) | 0 }), x0, y0, x1, y1, 30);
  }
  /** A hit flash. */
  vtImpact(x, y, ramp, size = 1) { this.vtFx(neonImpact({ x, y, colors: ramp, size, seed: (this.age * 13 + x) | 0 }), x, y, x, y, 34 * size); }
  /** An RGB-split afterimage of him where he stands (returns the running effect: `.fx.end()` ends it). */
  vtGhost(life, ramp) {
    const R = ramp || this.vtRamps().blade;
    return sfSpawn(this.match, glitchGhost({ actor: sfActor(this), life, colors: R, colorB: this.vtRamps().accent[2], seed: this.age | 0 }), { x: this.x - 50, y: this.y - 80, w: 100, h: 90 }, 5);
  }
  /** The world rect of one of his hitboxes right now (h.box from his feet, facing). */
  vtRect(h) {
    const [bx, by, bw, bh] = h.box, x1 = this.facing > 0 ? this.x + bx : this.x - bx - bw;
    return { x1, x2: x1 + bw, y1: this.y + by, y2: this.y + by + bh };
  }
  /** The slash a normal draws when its hit `h` comes out (and, OVERCLOCKED, the echo it leaves a beat later);
   *  `echoOnly` = just the echo (RISING MOON draws its own slash). */
  vtNormalSlash(h, echoOnly) {
    const R = this.vtRect(h), cx = (R.x1 + R.x2) / 2, cy = (R.y1 + R.y2) / 2, r = Math.max(R.x2 - R.x1, R.y2 - R.y1) * 0.55 + 4;
    let [a0, a1] = ARCS[ARC_OF[this.moveName] || (this.move && this.move.rise ? 'up' : 'fwd')];
    if (this.facing < 0) { a0 = 180 - a0; a1 = 180 - a1; }
    const big = h.dmg >= 12;
    if (!echoOnly) {
      this.vtSlash(cx - this.facing * 4, cy, r, a0, a1, this.vtRamps().blade, big ? 7 : 5, big ? 0.36 : 0.28);
      (this.vtLater = this.vtLater || []).push({ at: this.age + 2, fn: () => this.vtSlash(cx + this.facing * 3, cy + 3, r * 0.82, a1, a0, this.vtRamps().accent, big ? 5 : 3, 0.24) });   // the second blade, back the other way
    }
    if (this.vtOver > 0) {                                                            // OVERCLOCK: an echo of this cut, a beat later
      const S = this.def.show.sync;
      (this.vtEchoQ = this.vtEchoQ || []).push({ at: this.age + S.echoDelay, rect: R, cx, cy, r, a0, a1,
        h: { ...h, dmg: Math.max(1, Math.round(h.dmg * S.echoDmg)), base: h.base * 0.7, growth: h.growth * 0.6 } });
    }
  }

  /** RISING MOON (his up tilt / up smash, `move.rise`), frame by frame: a glitch afterimage as he crouches, a pillar
   *  of light up from the floor in front of him with the pop-up hit, then the big crescent from low in front, over his
   *  head and behind with the launcher - an accent moon a beat after it, and on the smash a burst of light overhead.
   *  OVERCLOCKED, the launcher's cut echoes like any normal's. */
  vtRisingMoon(m) {
    const t = this.t + 1, [h1, h2] = m.hits, Rz = m.rise, R = this.vtRamps(), F = this.facing, M = this.match;
    if (t === 1) { this.vtGhost(0.32, R.accent); sfx('swing', 0.3, 0.7); }
    if (t === h1.from) {
      const px = this.x + F * 14;
      this.vtFx(neonRise({ x: px, y: this.y, h: Rz.pillar, w: Rz.burst ? 12 : 9, colors: R.blade, colors2: R.accent, seed: (this.age * 7) | 0 }), px, this.y - Rz.pillar, px, this.y, 40);
      sfx('shing', 0.45, 1.6);
      if (!M.demo) for (let i = 0; i < 8; i++) M.particles.push({ x: px + (Math.random() - 0.5) * 18, y: this.y - 2, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, life: 14, color: i % 2 ? this.pal.mid : (this.pal.accent ?? 0xff2ad8), size: 2, grav: 0 });
    }
    if (t === h2.from) {
      const cx = this.x + F * 2, cy = this.y - (Rz.burst ? 62 : 50), r = Rz.r;
      const a0 = F > 0 ? 40 : 140, a1 = F > 0 ? -210 : 390;                                // low in front -> straight up -> behind
      this.vtFx(neonSlash({ x: cx, y: cy, r, a0: a0 * RAD, a1: a1 * RAD, colors: R.blade, thick: Rz.thick, sweep: 0.08, dur: Rz.burst ? 0.5 : 0.42, seed: (this.age * 31) | 0 }), cx - r, cy - r, cx + r, cy + r, 40);
      (this.vtLater = this.vtLater || []).push({ at: this.age + 3, fn: () => this.vtSlash(cx, cy - 4, r + 9, a0 - 10 * F, a1, R.accent, Math.max(3, Rz.thick - 4), 0.34) });
      sfx('slash', 0.55, Rz.burst ? 0.8 : 1.1); M.shake(Rz.burst ? 3 : 1, 5);
      if (Rz.burst) this.vtLater.push({ at: this.age + 4, fn: () => { this.vtImpact(this.x, this.y - 118, R.accent, 1.3); this.vtCut(this.x - 30, this.y - 118, this.x + 30, this.y - 118, R.blade); sfx('bighit', 0.35, 1.6); } });
      if (this.vtOver > 0) this.vtNormalSlash(h2, true);
    }
  }

  // ------------------------------------------------------------------ specials
  /** His specials (all his own moves); a full SYNC meter turns the press into OVERCLOCK first. */
  vantaSpecial(c) {
    const M = this.def.moves, S = this.def.show.sync;
    if ((this.vtSync || 0) >= S.max && !(this.vtOver > 0)) this.startOverclock();
    if (c.up) {
      if (this.usedUpB) return false;
      this.usedUpB = true; this.startAttack('upb'); this.aimWire(c); return true;
    }
    if (c.down) { this.startAttack('downB'); return true; }
    if (Math.abs(c.x) > 0.5) {
      if (!this.grounded && (this.vtDashLeft ?? M.sideB.max) <= 0) return false;
      this.startGhostDash(c); return true;
    }
    this.startAttack('neutralB'); this.iai = { t: 0, cpuAt: this.isCpu ? 22 + Math.floor(Math.random() * 22) : 0 }; sfx('shing', 0.25, 0.7); return true;
  }

  /** OVERCLOCK: the cut-in (a freeze, drawn by drawVtCut), then `sync.time` frames of everyone else at half speed. */
  startOverclock() {
    const S = this.def.show.sync, m = this.match;
    this.vtSync = 0; this.vtOver = S.time;
    m.frozen = S.cut; m.psychoCut = { f: this, t: 0, len: S.cut, draw: this.drawVtCut, end: this.endVtCut };
    sfx('limit', 0.8, 1.3); sfx('glitch', 0.7, 0.8); sfx('laser', 0.5, 0.6); m.shake(6, 10);
    if (m.stat) m.stat('overclocks');
  }

  /** GHOST DASH: one Sprite Fusion dash the way the stick points (8 ways); it leaves an echo behind. */
  startGhostDash(c) {
    const m = this.def.moves.sideB;
    let dx = c.x, dy = c.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4); dx = Math.round(Math.cos(a) * 1000) / 1000; dy = Math.round(Math.sin(a) * 1000) / 1000;
    if (this.grounded && dy > 0.3) { dy = 0; dx = Math.sign(dx) || this.facing; }        // (can't dash into the floor)
    if (Math.abs(dx) > 0.2) this.facing = Math.sign(dx);
    if (!this.grounded) this.vtDashLeft = (this.vtDashLeft ?? m.max) - 1;
    this.vtChain = (this.state === 'attack' && this.moveName === 'sideB' ? this.vtChain || 0 : 0) + 1;
    this.startAttack('sideB');
    this.vtDash = { dx, dy, x0: this.x, y0: this.y };
    this.vtEchoGhosts = this.vtEchoGhosts || []; this.vtEchoGhosts.push(this.vtGhost(3, this.vtRamps().accent));
    const R = this.vtRamps(), dist = m.dist, ex = this.x + dx * dist, ey = this.y + dy * dist;
    sfSpawn(this.match, movement({ kind: 'dash', actor: sfActor(this), facing: Math.sign(dx) || this.facing, distance: dist, delay: m.dashAt / 60, time: m.dashFor / 60,
      grounded: () => this.grounded, colors: R.blade, seed: (this.age * 7 + this.vtChain) | 0 }),
    { x: Math.min(this.x, ex) - 80, y: Math.min(this.y, ey) - 90, w: Math.abs(ex - this.x) + 160, h: Math.abs(ey - this.y) + 120 });
    sfx('whoosh', 0.45, 1.4 + 0.15 * this.vtChain);
  }

  /** NEON WIRE's aim: where the stick points (up-and-ahead by default); a CPU off the stage aims at the ledge. */
  aimWire(c) {
    let dx = c.x, dy = c.y;
    if (this.isCpu) { const P = this.match.stage.platforms[0], lx = this.x < 0 ? P.x1 : P.x2; dx = lx - this.x; dy = P.y - 4 - (this.y - 40); }
    const L = Math.hypot(dx, dy);
    if (L < 0.3) { dx = this.facing * 0.5; dy = -0.87; } else { dx /= L; dy /= L; }
    if (dy > 0.2) dy = -0.2;                                                                 // (it only fires level or upward)
    if (Math.abs(dx) > 0.2) this.facing = Math.sign(dx);
    this.vtWire = { dx, dy, len: 0, phase: 'wait', t: 0 };
  }
  /** Where the wire leaves his hand. */
  wireHand() { return { x: this.x + this.facing * 8, y: this.y - 34 }; }

  /** Every frame of his own moves (from st_attack). True = it handled the frame (st_attack stops). */
  vantaStep(m, c) {
    const n = this.moveName, t = this.t;
    if (n === 'neutralB') {                                                                  // IAI: held in the draw stance
      const I = this.iai || (this.iai = { t: 0 });
      I.t++; if (!this.grounded) this.vy = Math.min(this.vy, 1);
      if (I.t === m.perfect[0]) sfx('ding', 0.35, 2.2);
      const held = this.isCpu ? I.t < I.cpuAt : c.held('special');
      if (!held || I.t >= m.max) {
        const perfect = I.t >= m.perfect[0] && I.t <= m.perfect[1];
        this.iaiCut = { perfect, held: I.t }; this.iai = null; this.startAttack('iaicut');
      }
      return true;
    }
    if (n === 'iaicut') {
      if (!this.grounded) this.vy = Math.min(this.vy, 0.6);
      if (t === m.at && this.iaiCut) this.iaiStrike(this.iaiCut);
      return false;
    }
    if (n === 'sideB') {                                                                     // GHOST DASH
      const D = this.vtDash; if (!D) return false;
      if (t >= m.dashAt && t < m.dashAt + m.dashFor) { this.vx = D.dx * (m.dist / m.dashFor); this.vy = D.dy * (m.dist / m.dashFor) - (this.grounded ? 0 : 0.42); this.invincible = Math.max(this.invincible, 2); if (D.dy < -0.3) { this.grounded = false; this.platform = null; } }
      if (t === m.dashAt + m.dashFor) {
        this.vx *= 0.25; this.vy = this.grounded ? 0 : -0.5;
        (this.vtEchoes = this.vtEchoes || []).push({ x0: D.x0, y0: D.y0, x1: this.x, y1: this.y });
      }
      if (!this.grounded && t > m.dashAt + m.dashFor) this.vy = Math.min(this.vy, 1.5);
      if (t >= m.chain[0] && t <= m.chain[1] && this.buffer.special && Math.abs(c.x) + Math.abs(c.y) > 0.5 && this.vtChain < m.max && (this.grounded || (this.vtDashLeft ?? 0) > 0)) {
        this.buffer.special = 0; this.startGhostDash(c); return true;                   // chain another dash
      }
      if (this.isCpu && t === m.chain[0] + 2 && this.vtChain < 2 && Math.random() < 0.5 && (this.grounded || (this.vtDashLeft ?? 0) > 0)) {   // the CPU chains now and then
        const o = nearestFoe(this); if (o) { const dx = Math.sign(o.x - this.x) || this.facing; this.startGhostDash({ x: dx, y: o.y < this.y - 40 ? -0.7 : 0 }); return true; }
      }
      return false;
    }
    if (n === 'upb') return this.wireStep(m);
    if (n === 'downB') return this.saveStep(m);
    return false;
  }

  /** IAI's cut: a quick one that grows with the hold, or the PERFECT DRAW - a long cut that freezes all it hits. */
  iaiStrike(K) {
    const N = this.def.moves.neutralB, M = this.match, R = this.vtRamps();
    const reach = K.perfect ? N.perfectReach : N.reach + Math.min(1, K.held / 30) * 30, y = this.y - 28;
    let h = { ...N.cut };
    if (K.perfect) h = { ...N.perfectCut };
    else { const k = Math.min(1, K.held / 30); h.dmg = Math.round(h.dmg + N.cutGrow.dmg * k); h.growth += N.cutGrow.growth * k; }
    const x1 = this.x, x2 = this.x + this.facing * reach;
    M.limitHits.push({ t: 0, hb: { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: y - 22, y2: y + 22, h, owner: this, facing: this.facing, id: 'vtiai' + this.attackId, pillar: true, perfect: K.perfect } });
    if (K.perfect) {
      this.vtCut(x1, y + 6, x2, y - 6, R.blade); this.vtCut(x1, y - 4, x2, y + 2, R.accent, 0.05);
      this.vtFlash = 10; this.vtPerfect = { x1, x2, y, t: 0 };
      M.popText(this, 'PERFECT DRAW', '#' + this.pal.mid.toString(16).padStart(6, '0'));
      sfx('shing', 0.8, 1.6); sfx('bighit', 0.6, 0.6); M.shake(8, 12); this.addSync(this.def.moves.neutralB.sync);
    } else {
      this.vtSlash(this.x + this.facing * reach * 0.45, y, reach * 0.55, this.facing > 0 ? -100 : 280, this.facing > 0 ? 60 : 120, R.blade, 6);
      sfx('slash', 0.55, 1.2);
    }
  }

  /** NEON WIRE, frame by frame: out to `range` (latching a platform's edge / top, or an opponent), then zip / yank / miss. */
  wireStep(m) {
    const W = this.vtWire, M = this.match, R = this.vtRamps();
    if (!W) { this.setState(this.grounded ? 'idle' : 'helpless'); return true; }
    W.t++;
    if (W.phase === 'wait') { this.vy *= 0.5; this.vx *= 0.8; if (this.t >= m.fireAt) { W.phase = 'out'; sfx('laser', 0.4, 2); } return true; }
    const h = this.wireHand();
    if (W.phase === 'out') {
      this.vy = Math.min(this.vy, 0.4); this.vx *= 0.9;
      W.len += m.speed; const tx = h.x + W.dx * W.len, ty = h.y + W.dy * W.len; W.tx = tx; W.ty = ty;
      for (const o of foesOf(this)) {                                                        // an opponent: yank them in
        if (o.isIntangible()) continue; const cc = o.center();
        if (Math.abs(cc.x - tx) < 16 && Math.abs(cc.y - ty) < 22) { W.phase = 'yank'; W.target = o; W.t = 0; o.vx = o.vy = o.lx = o.ly = 0; sfx('clang', 0.5, 1.6); this.vtImpact(cc.x, cc.y, R.accent, 0.8); return true; }
      }
      for (const p of M.stage.platforms) {                                                   // a platform: its top or edge
        if (tx < p.x1 - 8 || tx > p.x2 + 8) continue;
        const top = ty > p.y - 10 && ty < p.y + 8, inside = p.solid && ty >= p.y && ty < (p.bottom || p.y + 60) && tx > p.x1 - 4 && tx < p.x2 + 4;
        if (top || inside) { W.phase = 'zip'; W.lx = Math.max(p.x1 + 4, Math.min(p.x2 - 4, tx)); W.ly = p.y; W.t = 0; sfx('clang', 0.45, 2); this.vtImpact(W.lx, W.ly, R.blade, 0.7); return true; }
      }
      if (W.len >= m.range) { W.phase = 'back'; W.t = 0; }
      return true;
    }
    if (W.phase === 'zip') {                                                                 // ride the wire up to it
      const dx = W.lx - this.x, dy = W.ly - this.y, d = Math.hypot(dx, dy);
      burstHit(this, this.x, this.y - 24, 22, m.zipHit, 'vtzip' + this.attackId);
      if (d <= m.zip || W.t > 30) {
        this.x = W.lx; this.y = W.ly - 0.5; this.vx = this.facing * 1.5; this.vy = -5; this.grounded = false; this.platform = null;
        this.vtWire = null; this.vtSlash(this.x, this.y - 26, 22, this.facing > 0 ? 160 : 20, this.facing > 0 ? 380 : -200, R.blade, 5);
        this.setState('air'); return true;
      }
      this.vx = (dx / d) * m.zip; this.vy = (dy / d) * m.zip - 0.42; this.grounded = false; this.platform = null;
      return true;
    }
    if (W.phase === 'yank') {                                                                // reel them in, then the cut
      const o = W.target;
      if (!o || !o.alive) { this.vtWire = null; this.setState(this.grounded ? 'idle' : 'helpless'); return true; }
      const gx = this.x + this.facing * 22, gy = this.y;
      o.x += (gx - o.x) * 0.35; o.y += (gy - o.y) * 0.35; o.vx = o.vy = o.lx = o.ly = 0; o.hitstun = Math.max(o.hitstun || 0, 6); if (o.state !== 'hitstun') o.setState('hitstun');
      this.vy = Math.min(this.vy, 0.2); W.tx = o.x; W.ty = o.y - 25;
      if (W.t >= 7) {
        const key = 'vtyank' + this.attackId + ':' + o.slot; if (!M.hits.has(key)) { M.hits.add(key); M.applyHit(o, { h: m.yank, owner: this, facing: this.facing, id: 'vtyank' + this.attackId, pillar: true }, this.x); }
        this.vtSlash(o.x, o.y - 26, 24, this.facing > 0 ? 160 : 20, this.facing > 0 ? 380 : -200, R.blade, 6); sfx('slash', 0.6, 1);
        this.vtWire = null; this.vy = -4; this.setState('helpless'); return true;
      }
      return true;
    }
    if (W.phase === 'back') { W.len = Math.max(0, W.len - m.speed * 1.5); W.tx = h.x + W.dx * W.len; W.ty = h.y + W.dy * W.len; if (W.len <= 0) { this.vtWire = null; this.setState(this.grounded ? 'idle' : 'helpless'); } return true; }
    return true;
  }

  /** SAVE STATE: the first press saves (a glitching ghost of him stays there); the next rewinds him to it. */
  saveStep(m) {
    const t = this.t, S = m.save, M = this.match, R = this.vtRamps();
    if (!this.grounded && !this.vtRewind) this.vy = Math.min(this.vy, 1.2);
    if (t === m.at && !this.vtRewind) {
      const sv = this.vtSave;
      if (!sv) {
        if (this.age < (this.vtSaveCd || 0)) { M.popText(this, 'COOLDOWN', '#888888'); return false; }
        this.vtSave = { x: this.x, y: this.y, pct: M.mode === 'stamina' ? -this.hp : this.percent, until: this.age + S.life, ghost: this.vtGhost(S.life / 60 + 1, R.accent) };
        M.popText(this, 'SAVED', '#' + (this.pal.accent ?? 0xff2ad8).toString(16).padStart(6, '0')); sfx('popup', 0.4, 1.4); sfx('ding', 0.3, 1.8);
      } else {
        const x0 = this.x, y0 = this.y;
        sfSpawn(M, movement({ kind: 'blink', actor: sfActor(this), to: sv.x, toY: sv.y, out: 0.03, in: 0.08, colors: R.accent, colors2: R.blade, seed: this.age | 0 }),
          { x: Math.min(x0, sv.x) - 70, y: Math.min(y0, sv.y) - 110, w: Math.abs(sv.x - x0) + 140, h: Math.abs(sv.y - y0) + 150 });
        M.limitHits.push({ t: 0, hb: { x1: Math.min(x0, sv.x) - 10, x2: Math.max(x0, sv.x) + 10, y1: Math.min(y0, sv.y) - 50, y2: Math.max(y0, sv.y) + 4, h: S.trail, owner: this, facing: Math.sign(sv.x - x0) || this.facing, id: 'vtrw' + this.attackId, pillar: true } });
        this.vtCut(x0, y0 - 26, sv.x, sv.y - 26, R.accent, 0.08);
        const now = M.mode === 'stamina' ? -this.hp : this.percent, taken = Math.max(0, now - sv.pct), back = Math.round(taken * S.heal);
        if (back > 0) { if (M.mode === 'stamina') this.hp = Math.min(this.maxHp, this.hp + back); else this.percent = Math.max(0, this.percent - back); M.popText(this, 'CTRL+Z -' + back + '%', '#7dffc4'); }
        this.x = sv.x; this.y = sv.y - 0.5; this.vx = this.vy = this.lx = this.ly = 0; this.grounded = false; this.platform = null;
        if (sv.ghost) sv.ghost.fx.end();
        this.vtSave = null; this.vtSaveCd = this.age + S.cooldown; this.vtRewind = { t: 0 };
        sfx('glitch', 0.6, 1.2); sfx('laser', 0.4, 0.8); M.shake(4, 8);
      }
    }
    if (this.vtRewind) {                                                                     // hidden while the blink carries him
      const r = this.vtRewind; r.t++; this.invincible = Math.max(this.invincible, 2); this.vx *= 0.5; this.vy = 0;
      if (r.t >= 26) { this.vtRewind = null; this.setState(this.grounded ? 'idle' : 'air'); }
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ every frame
  /** Every frame: OVERCLOCK (the slowdown, its timer), the echoes, the save point's timer, slashes on his normals. */
  vantaTick() {
    const M = this.match, S = this.def.show.sync, R = this.vtRamps();
    if (this.grounded) this.vtDashLeft = this.def.moves.sideB.max;
    if (this.state === 'respawn' && this.vtSave) { if (this.vtSave.ghost) this.vtSave.ghost.fx.end(); this.vtSave = null; }
    if (this.vtSave && this.age > this.vtSave.until) { if (this.vtSave.ghost) this.vtSave.ghost.fx.end(); this.vtSave = null; }
    if (this.state !== 'attack' || this.moveName !== 'upb') this.vtWire = null;
    if (this.state !== 'attack' || this.moveName !== 'downB') this.vtRewind = null;
    if (this.state !== 'attack' || this.moveName !== 'neutralB') this.iai = null;
    // OVERCLOCK: everyone else runs at half speed; he's a little faster
    if (this.vtOver > 0) {
      this.vtOver--; this.demonSpeed = S.speed;
      if (M.frozen <= 0 && this.age % 2 === 0) for (const o of foesOf(this)) o.hitstop = Math.max(o.hitstop, 1);
      if (this.age % 3 === 0 && !M.demo) M.particles.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y - Math.random() * 50, vx: -this.facing * 1.5, vy: 0, life: 10, color: Math.random() < 0.5 ? this.pal.mid : (this.pal.accent ?? 0xff2ad8), size: 2, grav: 0 });
      if (this.vtOver === 0) { this.demonSpeed = 1; M.popText(this, 'SYNC LOST', '#888888'); }
    }
    // a normal's slash comes out with its hit
    if (this.state === 'attack' && this.move && this.move.hits && ARC_OF[this.moveName]) for (const h of this.move.hits) if (h.from === this.t + 1) this.vtNormalSlash(h);
    if (this.state === 'attack' && this.move && this.move.rise) this.vtRisingMoon(this.move);
    if (this.vtPanels) this.vtPanels.step();
    if (this.vtFalls !== this.falls) { this.vtFalls = this.falls; this.vtStreak = 0; this.vtCombo = 0; }   // KO'd: the streak is over
    if (this.vtLater && this.vtLater.length) { for (const q of this.vtLater) if (this.age >= q.at) { q.done = true; q.fn(); } this.vtLater = this.vtLater.filter((q) => !q.done); }
    // OVERCLOCK's echo cuts land
    if (this.vtEchoQ && this.vtEchoQ.length) {
      for (const e of this.vtEchoQ) if (this.age >= e.at) {
        e.done = true; M.limitHits.push({ t: 0, hb: { ...e.rect, h: e.h, owner: this, facing: this.facing, id: 'vtecho' + e.at + ':' + e.cx, pillar: true } });
        this.vtSlash(e.cx, e.cy, e.r, e.a0, e.a1, R.accent, 4, 0.26); sfx('swing', 0.25, 1.8);
      }
      this.vtEchoQ = this.vtEchoQ.filter((e) => !e.done);
    }
    // GHOST DASH's echoes: once the chain is over they all cut along their paths at once
    if (this.vtEchoes && this.vtEchoes.length) {
      const dashing = this.state === 'attack' && this.moveName === 'sideB';
      if (!dashing && !this.vtEchoAt) this.vtEchoAt = this.age + 6;
      if (this.vtEchoAt && this.age >= this.vtEchoAt) {
        const E = this.def.moves.sideB.echo, L = this.vtEchoes;
        L.forEach((s, i) => {
          const h = i === L.length - 1 ? E.last : E;
          M.limitHits.push({ t: 0, hb: { x1: Math.min(s.x0, s.x1) - 10, x2: Math.max(s.x0, s.x1) + 10, y1: Math.min(s.y0, s.y1) - 46, y2: Math.max(s.y0, s.y1) + 2, h, owner: this, facing: Math.sign(s.x1 - s.x0) || this.facing, id: 'vtghost' + this.age + ':' + i, pillar: true } });
          this.vtCut(s.x0, s.y0 - 24, s.x1, s.y1 - 24, i % 2 ? R.accent : R.blade, i * 0.03);
        });
        for (const g of this.vtEchoGhosts || []) if (g) g.fx.end();
        sfx('shing', 0.6, 1.3); if (L.length > 1) sfx('bighit', 0.4, 1.5); M.shake(2 + L.length, 6);
        this.vtEchoes = []; this.vtEchoGhosts = []; this.vtEchoAt = 0; this.vtChain = 0;
      }
    }
    if (this.vtFlash > 0) this.vtFlash--;
    if (this.vtPerfect && ++this.vtPerfect.t > 24) this.vtPerfect = null;
  }

  /** SYNC fills by n (up to the max). */
  addSync(n) { const S = this.def.show.sync; const was = this.vtSync || 0; this.vtSync = Math.min(S.max, was + n); if (was < S.max && this.vtSync >= S.max && !(this.vtOver > 0)) { this.match.popText(this, 'SYNC 100%', '#ffffff'); sfx('limitready', 0.5, 1.4); } }
  /** OVERCLOCKED he hits a little harder. */
  vantaBonus() { return this.vtOver > 0 ? { dmg: this.def.show.sync.dmg, kb: 1 } : null; }
  /** A hit landed: a neon flash on them, SYNC up (not while OVERCLOCKED); a PERFECT DRAW freezes them. His combo
   *  counts it (a panel at the milestones), and a big one gets a panel of its own. */
  vantaLanded(t, hb) {
    const c = t.center(), dmg = hb.h.dmg || 4, M = this.match;
    if (!M.demo) {
      const P = this.vtPanelSet(), h = hb.h, kb = (h.base || 0) + (h.growth || 0) * (t.percent || 0) / 100;
      if (this.age - (this.vtLastHit ?? -999) > PANELS.window) this.vtCombo = 0;
      const counts = this.age - (this.vtCounted ?? -999) >= PANELS.merge;                       // (a flurry's beats count once)
      this.vtLastHit = this.age;
      if (counts) { this.vtCounted = this.age; this.vtCombo = (this.vtCombo || 0) + 1; }
      if ((h.dmg || 0) >= PANELS.big.dmg || kb >= PANELS.big.kb) P.big(t); else if (counts) P.combo(this.vtCombo, t);
    }
    this.vtImpact(c.x, c.y, this.vtRamps().blade, dmg >= 12 ? 1.4 : 0.8);
    if (!(this.vtOver > 0)) this.addSync(dmg * this.def.show.sync.perDealt);
    if (hb.perfect) { t.hitstop = Math.max(t.hitstop, this.def.moves.neutralB.freeze); this.hitstop = Math.max(this.hitstop, 6); }
  }
  /** He was hurt: SYNC up a little, and his combo is broken. */
  vantaHurt(dmg) { if (!(this.vtOver > 0)) this.addSync(dmg * this.def.show.sync.perHurt); this.vtCombo = 0; }
  /** His NEON PANELS (made on first use). */
  vtPanelSet() { if (!this.vtPanels || this.vtPanels.m !== this.match) this.vtPanels = new NeonPanels(this); return this.vtPanels; }
  /** He KO'd `victim` (from MatchScene.onKO): his KO STREAK grows and the page plays. */
  vantaKO(victim) {
    if (this.match.demo || victim === this) return;
    this.vtStreak = (this.vtStreak || 0) + 1;
    this.vtPanelSet().ko(victim, this.vtStreak);
  }

  // ------------------------------------------------------------------ drawing
  /** His world layer over everything but the effects (BLACKOUT's dark, the PERFECT DRAW flash). */
  vtDarkLayer() {
    const M = this.match;
    if (!this.vtDarkG || !this.vtDarkG.scene) { this.vtDarkG = M.add.graphics().setDepth(5.5); M.addWorld(this.vtDarkG); }
    return this.vtDarkG;
  }
  /** What's drawn round him: IAI's closing ring, the wire, the save point marker, OVERCLOCK's glow, BLACKOUT. */
  drawVanta(g, spr) {
    const s = this.state, R = this.pal, acc = R.accent ?? 0xff2ad8;
    const D = this.vtDarkLayer(); D.clear();
    if (s === 'attack' && this.moveName === 'neutralB' && this.iai) {                          // IAI: the ring closing in; white in the PERFECT window
      const N = this.def.moves.neutralB, k = Math.min(1, this.iai.t / N.perfect[1]), r = 46 - 30 * k, inWin = this.iai.t >= N.perfect[0] && this.iai.t <= N.perfect[1];
      g.lineStyle(inWin ? 3 : 1, inWin ? 0xffffff : R.mid, inWin ? 1 : 0.4 + 0.5 * k); g.strokeCircle(this.x, this.y - 28, r);
      g.lineStyle(1, acc, 0.6); g.strokeCircle(this.x, this.y - 28, 16);
      if (inWin) { g.fillStyle(0xffffff, 0.25); g.fillCircle(this.x, this.y - 28, r); }
      g.lineStyle(0);
    }
    if (this.vtWire && this.vtWire.tx !== undefined) {                                          // the wire: neon with a white core, a hook at the tip
      const h = this.wireHand(), W = this.vtWire, j = (this.anim % 2) - 0.5;
      g.lineStyle(3, R.mid, 0.4); g.lineBetween(h.x, h.y, W.tx, W.ty + j);
      g.lineStyle(1, 0xffffff, 1); g.lineBetween(h.x, h.y, W.tx, W.ty);
      g.lineStyle(0); g.fillStyle(acc, 1); g.fillTriangle(W.tx - 3, W.ty - 3, W.tx + 3, W.ty - 3, W.tx, W.ty + 3); g.fillStyle(0xffffff, 1); g.fillRect(W.tx - 1, W.ty - 1, 2, 2);
    }
    if (this.vtSave) {                                                                          // the save point: a floor marker under the ghost, counting down
      const S = this.vtSave, left = (S.until - this.age) / this.def.moves.downB.save.life;
      g.lineStyle(1, acc, 0.8); g.strokeEllipse(S.x, S.y, 30, 7); g.lineStyle(2, acc, 1);
      g.beginPath(); g.arc(S.x, S.y - 70, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.strokePath(); g.lineStyle(0);
      if (this.anim % 30 < 20) { g.fillStyle(acc, 1); g.fillRect(S.x - 1, S.y - 73, 2, 6); }
    }
    if (this.vtRewind) spr.setAlpha(this.vtRewind.t < 8 ? 0 : (this.vtRewind.t - 8) / 18);
    if (this.vtOver > 0 && this.anim % 2 === 0) {                                                // OVERCLOCK: a cyan-magenta split round him
      g.lineStyle(1, R.mid, 0.6); g.strokeRect(this.x - 14 - 1, this.y - 54, 28, 54); g.lineStyle(1, acc, 0.6); g.strokeRect(this.x - 14 + 1, this.y - 53, 28, 54); g.lineStyle(0);
    }
    if (this.vtFlash > 0) { D.fillStyle(0xffffff, 0.06 * this.vtFlash); D.fillRect(-1200, -900, 2400, 1800); }
    if (s === 'limit' && this.vtBlack) this.drawBlackout(g, spr, D, this.def.limit, this.vtBlack);
    else if (this.showSky) this.showSky.clear();
  }

  /** On his player plate: the SYNC meter - ten cells, OVERCLOCK READY when full, draining magenta while OVERCLOCKED. */
  drawVantaHud(g, x, y, frame) {
    const S = this.def.show.sync, P = this.pal, acc = P.accent ?? 0xff2ad8;
    const over = this.vtOver > 0, k = over ? this.vtOver / S.time : Math.min(1, (this.vtSync || 0) / S.max), full = !over && k >= 1;
    const bx = x + 62, by = y + 3, cw = 6;
    g.fillStyle(0x000000, 0.7); g.fillRect(bx - 2, by - 1, cw * 10 + 3, 9);
    for (let i = 0; i < 10; i++) {
      const on = i < Math.floor(k * 10 + 0.001);
      g.fillStyle(on ? (over ? acc : full && frame % 10 < 5 ? 0xffffff : P.mid) : 0x1a1a26, 1); g.fillRect(bx + i * cw, by, cw - 1, 7);
      if (on) { g.fillStyle(0xffffff, 0.35); g.fillRect(bx + i * cw, by, cw - 1, 1); }
    }
    if (!this.vtHudText || !this.vtHudText.scene) { this.vtHudText = this.match.add.text(0, 0, '', { fontFamily: FONT, fontSize: '5px', color: '#ffffff', stroke: '#07060e', strokeThickness: 2 }).setOrigin(0.5).setDepth(12); this.match.addUI(this.vtHudText); }
    this.vtHudText.setText(over ? 'OVERCLOCK' : full ? (frame % 20 < 10 ? 'OVERCLOCK' : 'READY') : 'SYNC').setPosition(bx + cw * 5, by + 4).setVisible(!this.eliminated);
  }

  /** The OVERCLOCK cut-in (MatchScene draws it in the freeze through `psychoCut.draw`): a cyberpunk HUD - black bars
   *  sliding in, a scrolling perspective grid, glitch blocks, his visor huge with its slit flaring open, OVERCLOCK in
   *  split colours, readouts, scanlines, then a cut of light wipes it away. `C` = match.psychoCut. */
  drawVtCut(_o, C) {
    const m = this.match;
    if (!m.vtCutSet || !m.vtCutSet.g.scene) {
      const mk = (size, col) => { const t = m.add.text(0, 0, '', { fontFamily: FONT, fontSize: size + 'px', color: col }).setOrigin(0.5).setDepth(46).setVisible(false); m.addUI(t); return t; };
      const g = m.add.graphics().setDepth(44); m.addUI(g);
      m.vtCutSet = { g, a: mk(26, '#ff2ad8'), b: mk(26, '#3af0ff'), c: mk(26, '#ffffff'), info: mk(7, '#3af0ff'), info2: mk(7, '#ff2ad8') };
    }
    const T = m.vtCutSet, o = T.g, t = C.t, L = C.len, W = 640, H = 360, P = this.pal, acc = P.accent ?? 0xff2ad8, cy = H / 2;
    const inK = Math.min(1, t / 6), outK = t > L - 8 ? (t - (L - 8)) / 8 : 0;
    o.clear();
    const band = 220 * inK;
    o.fillStyle(0x05040a, 0.94); o.fillRect(0, cy - band / 2, W, band);
    for (let i = 0; i < 14; i++) { const z = ((i + t * 0.25) % 14) / 14, yy = cy + 8 + z * z * (band / 2 - 8); o.fillStyle(P.mid, 0.12 + 0.3 * z); o.fillRect(0, yy, W, 1); }   // the grid floor rushing in
    for (let i = -10; i <= 10; i++) { o.lineStyle(1, P.mid, 0.18); o.lineBetween(W / 2 + i * 8, cy + 8, W / 2 + i * 70, cy + band / 2); }
    o.lineStyle(0);
    for (let i = 0; i < 9; i++) { const gx = ((i * 137 + t * 23) % W), gy = cy - band / 2 + ((i * 59 + t * 7) % band); o.fillStyle(i % 2 ? acc : P.mid, 0.35); o.fillRect(gx, gy, 18 + (i * 7) % 40, 3); }   // glitch blocks
    const hx = 470 + (1 - inK) * 200, hy = cy - 6, s = 4;                                       // his helmet, big, the visor slit flaring
    o.fillStyle(P.mid, 1); o.fillRoundedRect(hx - 22 * s / 2 - 2, hy - 15 * s / 2 - 2, 22 * s + 4, 15 * s + 4, 18);
    o.fillStyle(0x101016, 1); o.fillRoundedRect(hx - 22 * s / 2, hy - 15 * s / 2, 22 * s, 15 * s, 16);
    const open = Math.min(1, Math.max(0, (t - 8) / 8)), sh = 2 + 8 * open;
    o.fillStyle(acc, 1); o.fillRect(hx - 36, hy - sh / 2 - 4, 76, sh); o.fillStyle(0xffffff, 1); o.fillRect(hx + 4, hy - sh / 4 - 4, 22, Math.max(1, sh / 2));
    o.fillStyle(acc, 0.25); o.fillRect(hx - 60, hy - sh - 4, 120, sh * 2);
    for (let yy = cy - band / 2; yy < cy + band / 2; yy += 2) { o.fillStyle(0x000000, 0.25); o.fillRect(0, yy, W, 1); }   // scanlines
    if (outK > 0) { const w = W * outK; o.fillStyle(0xffffff, 1); o.fillRect(0, cy - 2, w, 4); o.fillStyle(0x05040a, 1); o.fillRect(0, cy - band / 2, w, band / 2 - 2); o.fillRect(0, cy + 2, w, band / 2 - 2); }
    const jit = t % 4 < 2 ? 2 : -2, tx = 230 - (1 - inK) * 120;
    T.a.setText('OVERCLOCK').setPosition(tx - jit, cy - 18).setVisible(t > 4 && outK < 1);
    T.b.setText('OVERCLOCK').setPosition(tx + jit, cy - 18).setVisible(t > 4 && outK < 1);
    T.c.setText('OVERCLOCK').setPosition(tx, cy - 18).setVisible(t > 4 && outK < 1);
    T.info.setText('SYNC 100%  //  CLOCK x2.00').setPosition(tx, cy + 18).setVisible(t > 10 && outK < 1);
    T.info2.setText(t % 12 < 8 ? '> WORLD SPEED 0.50' : '> WORLD SPEED 0.5_').setPosition(tx, cy + 32).setVisible(t > 14 && outK < 1);
  }
  /** The cut-in is over: its graphics and lettering away. */
  endVtCut() {
    const T = this.match.vtCutSet; if (!T || !T.g.scene) return;
    T.g.clear(); for (const k of ['a', 'b', 'c', 'info', 'info2']) T[k].setVisible(false);
  }

  // ------------------------------------------------------------------ Limit
  /** BLACKOUT (Limit, `type: 'blackout'`): the lights die, he's beside each foe in turn cutting (each cut holds them),
   *  back where he started, sheathes - and every cut lands at once. */
  blackoutLimit(L) {
    const t = this.t, M = this.match, R = this.vtRamps();
    if (t === 1 || !this.vtBlack) this.vtBlack = { x: this.x, y: this.y, foes: foesOf(this), caught: new Set(), show: 99 };
    const B = this.vtBlack; this.invincible = Math.max(this.invincible, 2); this.vx = this.vy = 0;
    if (t === L.goAt) { this.vtGhost(0.6); sfx('glitch', 0.6, 0.6); }
    const n = B.foes.length, i = (t - L.goAt) / L.every;
    if (n && t >= L.goAt && Number.isInteger(i) && i < n * L.cutsEach) {
      const o = B.foes[i % n];
      if (o.alive) {
        const side = i % 2 ? 1 : -1; this.x = o.x + side * 26; this.y = o.y; this.facing = -side; B.show = t;
        const c = o.center(), a = (i * 53) % 180;
        this.vtCut(c.x - Math.cos(a * RAD) * 30, c.y - Math.sin(a * RAD) * 30, c.x + Math.cos(a * RAD) * 30, c.y + Math.sin(a * RAD) * 30, i % 2 ? R.accent : R.blade);
        M.applyHit(o, { h: L.cut, owner: this, facing: this.facing, id: 'vtblk' + this.slot + ':' + t + ':' + o.slot, pillar: true }, this.x);
        o.lx = o.ly = 0; B.caught.add(o); sfx('slash', 0.5, 1.4 + 0.05 * i);
      }
    }
    if (t === L.backAt) { this.x = B.x; this.y = B.y; B.show = 999; }
    if (t === L.clickAt) {                                                                      // click: every cut lands
      for (const o of B.caught) if (o.alive) {
        const c = o.center(); M.applyHit(o, { h: L.final, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'vtblkF' + this.slot + ':' + o.slot, pillar: true }, this.x);
        this.vtCut(c.x - 60, c.y + 20, c.x + 60, c.y - 20, R.blade); this.vtCut(c.x - 60, c.y - 20, c.x + 60, c.y + 20, R.accent, 0.04); this.vtImpact(c.x, c.y, R.blade, 1.8);
      }
      this.vtFlash = 12; sfx('clang', 0.8, 2.2); sfx('bighit', 0.9, 0.7); M.shake(12, 20);
    }
    if (t >= L.frames) { this.vtBlack = null; this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  /** BLACKOUT's look: the dark (over everyone - only the neon effects show through), him seen only in flashes. */
  drawBlackout(g, spr, D, L, B) {
    const t = this.t, k = Math.min(1, t / L.darkTo) * (t > L.frames - 10 ? (L.frames - t) / 10 : 1);
    const sky = skyLayer(this); sky.clear(); sky.fillStyle(0x000000, 0.9 * k); sky.fillRect(0, 0, 640, 360);
    if (t < L.clickAt) { D.fillStyle(0x000000, 0.82 * k); D.fillRect(-1200, -900, 2400, 1800); }
    const away = t >= L.goAt && t < L.backAt;
    spr.setAlpha(away ? (t - B.show < 4 ? 1 : 0) : 1);
    if (t >= L.backAt && t < L.clickAt) { g.fillStyle(this.pal.accent ?? 0xff2ad8, 1); g.fillRect(this.x - 3 + this.facing * 2, this.y - 41, 8, 2); }   // only his visor in the dark
  }
}
