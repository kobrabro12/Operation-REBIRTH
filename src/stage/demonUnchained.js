// KARNAX UNCHAINED - KARNAX's third form (the boss fight in THE BURNING KEEP, demonBossStage.js).
// Below `UNCH.at` of his health (after he's gone MAD) he drops to one knee and laughs - the iron shackles on his wrists
// glow white-hot and BURST apart, he rises with his wings catching fire tip to tip, his mane turning to flame and a
// halo of fire round his horns, roars - and the sky goes with him: the moon goes black in a red corona and embers rain.
// A cutscene when a player is watching (with a FINAL FORM name card), else it just happens (the sim).
// UNCHAINED: everything's faster, his steps leave burning hoofprints, and two new attacks join MAD's:
//   CHAIN WHIP - the burning chains from his broken shackles: he whirls one over his head, then lashes it the length of
//     the walk, forward and back, the floor catching fire where it lands (jump it - twice).
//   INFERNO - he beats his burning wings and takes to the sky, rains fireballs down on marked spots, then dives on you
//     sword-first in a streak of fire that blows a fire wave out both ways.
// This class's methods are mixed into DemonBossStage (the loop at the bottom of demonBossStage.js; a name may only
// exist once across them).
import { sfx } from '../audio/sfx.js';
import { BossArena } from './bossBase.js';

const FIRE = [0xc02008, 0xff5010, 0xff9a20, 0xffe060, 0xfff8d8];
const IRON = [0x141218, 0x2a2630, 0x48444e, 0x6a6672];
// where it starts (part of his health); the cutscene's beats (frames): kneel, the shackles heating, the snap, rising,
// the wings catching, the roar, the sky turning, the whole length
const UNCH = { at: 0.28, kneel: 30, hot: [36, 118], snap: 122, rise: [132, 190], wings: [140, 205], roar: 208, sky: [208, 250], n: 276 };
// UNCHAINED: how much faster than MAD (wind-ups and pauses), how often he leaves a burning hoofprint (frames)
const FORM = { speed: 1.18, print: 26 };
// CHAIN WHIP: the whirl overhead (frames, radius), each lash (frames), the pause between, the chain's reach, its links,
// the hit; where it lands the floor burns
const CHAIN = { whirl: 40, r: 64, lash: 18, gap: 16, reach: 310, links: 16, hit: [11, [50, 6, 0.75]] };
// INFERNO: the climb (frames, how high), volleys (n, frames apart, fireballs each, their warning, fall speed, hit),
// the dive (aim frames, flight frames, hit) and the landing wave
const INFERNO = { climb: 40, high: 200, volleys: 3, every: 34, per: 3, warn: 30, fall: 7.5, ball: [8, [80, 4.8, 0.5]], aim: 18, dive: 20, hit: [15, [60, 6.8, 0.95]] };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** k (0..1) eased in and out. */
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** KARNAX UNCHAINED (see the top of the file): mixed into DemonBossStage. */
export class UnchainedPhase {
  /** A real player is watching this boss fight (the intro ran): the transformation plays as a cutscene. */
  startIntro(match) { BossArena.prototype.startIntro.call(this, match); this.watched = true; }
  /** The camera: the intro's, or the transformation's. */
  introCam() {
    if (!this.cut) return BossArena.prototype.introCam.call(this);
    const w = this.cut.shot || { x: 0, y: -150, zoom: 1 }, k = this.cut.snap ? 1 : 0.08; this.cut.snap = false;
    this.ccam = { x: lerp(this.ccam.x, w.x, k), y: lerp(this.ccam.y, w.y, k), zoom: lerp(this.ccam.zoom, w.zoom, k) };
    return { ...this.ccam, exact: true };
  }
  /** Which form he's in, for the death card's quote. */
  cardForm() { return this.unchained ? 'unchained' : this.boss && this.boss.phase === 2 ? 'rage' : 'base'; }
  /** Wind-ups and pauses: the difficulty's speed, and faster again UNCHAINED. */
  sp(n) { return Math.max(1, Math.round(n / ((this.boss ? this.boss.cfg.T.speed : 1) * (this.unchained ? FORM.speed : 1)))); }

  /** Every frame of the fight (from step): starts the transformation when his health drops low enough; UNCHAINED's embers and hoofprints. */
  stepUnchained(match, out) {
    const B = this.boss; if (!B || B.dying) return;
    if (!this.unchained && !this.cut && B.phase === 2 && B.hp <= B.max * UNCH.at && !(B.atk && this.dm.y < -5)) this.startUnchain(match);
    if (!this.unchained) return;
    this.hellK = Math.min(1, (this.hellK || 0) + 0.02);
    const j = this.joints();
    if (this.t % 3 === 0) { const q = Math.random(); match.particles.push({ x: (Math.random() * 2 - 1) * 320, y: -340 + Math.random() * 60, vx: 0.6 + Math.random(), vy: 1.2 + Math.random() * 1.5, life: 120, color: FIRE[1 + Math.floor(q * 3)], size: 2 }); }   // embers raining
    if (this.t % 4 === 0) match.particles.push({ x: j.chest.x + (Math.random() - 0.5) * 70, y: j.chest.y + (Math.random() - 0.5) * 80, vx: (Math.random() - 0.5), vy: -1.5 - Math.random() * 1.5, life: 24, color: FIRE[2 + (this.t % 2)], size: 2 });
    if (this.dm.y === 0 && Math.abs(this.dm.x - (this.lastPrint ?? 999)) > 40 && this.t % FORM.print === 0) { this.lastPrint = this.dm.x; this.prints = (this.prints || []).concat([{ x: this.dm.x, t: 90 }]).slice(-8); }
    for (const p of this.prints || []) p.t--; this.prints = (this.prints || []).filter((p) => p.t > 0);
    this.stepFireballs(match, out);
  }
  /** Clears what he had going (sword out, blades, fire) and starts the transformation: a cutscene if watched, else at once. */
  startUnchain(match) {
    const B = this.boss; B.atk = null; B.wait = 60;
    Object.assign(this, { blade: null, storm: null, toss: null, glint: null, tail: null, laughing: false, fireballs: [] });
    Object.assign(this.dm, { held: true, y: 0, alpha: 1 });
    this.waves = []; this.pillars = [];
    if (this.watched && this.startCard) {
      const cam = match.worldCam || match.cameras.main;
      this.cut = { kind: 'unchain', t: 0, n: UNCH.n, once: new Set(), armed: false };
      this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
      this.rageText.setVisible(false); B.rage = 0;
      return;
    }
    this.unchainNow(match);
  }
  /** He's UNCHAINED: the new look, the burning sky, the new attacks. */
  unchainNow(match) {
    this.unchained = true; this.unch = { hot: 0, broken: true, wings: 1, rise: 1 }; this.hellK = Math.max(this.hellK || 0, 0.01);
    if (this.barName) this.barName.setText('KARNAX, THE UNCHAINED'); this.rageText.setText('KARNAX IS UNCHAINED!'); this.boss.rage = 90; this.boss.wait = 50;
    sfx('roar', 1, 0.5); match.shake(10, 30);
  }
  /**
   * One frame of THE UNCHAINING (MatchScene, while `cut` is set): he drops to one knee laughing, the shackles glow
   * white-hot and burst (chain links flying), he rises as his wings catch fire, roars, the sky turns - then the card.
   */
  cutStep(match) {
    const C = this.cut, t = ++C.t, D = this.dm, j = this.joints(), U = this.unch || (this.unch = { hot: 0, broken: false, wings: 0, rise: 0 });
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k), e = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    this.t++;
    if (t < UNCH.rise[0]) { this.aim('kneel', 0.08); C.shot = { x: j.chest.x, y: j.chest.y + 10, zoom: t < UNCH.kneel ? 1.2 : 1.6 }; }
    else { this.aim(t < UNCH.roar ? 'pose' : 'laugh', 0.08); C.shot = t < UNCH.roar ? { x: j.chest.x, y: j.head.y + 20, zoom: 1.35 } : { x: D.x * 0.5, y: -160, zoom: 0.92 }; }
    if (once('fall', 2)) { sfx('roar', 0.7, 0.6); match.shake(6, 10); }
    if (t > UNCH.kneel && t < UNCH.snap) { this.laughing = true; if (t % 24 === 6) this.ha(match); }
    U.hot = e(UNCH.hot[0], UNCH.hot[1]);
    if (t > UNCH.hot[0] && t < UNCH.snap && t % 10 === 0) { sfx('flame', 0.3 + U.hot * 0.5, 1.4 - U.hot * 0.6); match.shake(1 + U.hot * 3, 6); }
    if (once('snap', UNCH.snap)) {                                                       // SNAP: both shackles burst
      U.broken = true; this.laughing = false; sfx('clang', 1, 0.5); sfx('bighit', 1, 0.6); sfx('glass', 0.7, 0.5); match.shake(14, 18);
      for (const h of [j.h1, j.h2]) for (let i = 0; i < 18; i++) { const q = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6; match.particles.push({ x: h.x, y: h.y, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 2, life: 40, color: i % 3 ? IRON[3] : FIRE[3], size: 3, grav: 0.25 }); }
      match.popText({ x: j.head.x, y: j.head.y - 80 }, 'FREE!', '#ffd060');
    }
    U.rise = e(UNCH.rise[0], UNCH.rise[1]); U.wings = e(UNCH.wings[0], UNCH.wings[1]);
    if (t > UNCH.wings[0] && t < UNCH.wings[1] && t % 6 === 0) sfx('flame', 0.6, 0.6 + U.wings * 0.4);
    if (once('roar', UNCH.roar)) {
      sfx('roar', 1, 0.45); sfx('thunder', 0.9, 0.6); match.shake(16, 40);
      for (let i = 0; i < 48; i++) { const q = i / 48 * Math.PI * 2; match.particles.push({ x: j.chest.x, y: j.chest.y, vx: Math.cos(q) * 8, vy: Math.sin(q) * 6, life: 36, color: FIRE[1 + i % 4], size: 4, drag: 0.94 }); }
      match.popText({ x: j.head.x, y: j.head.y - 90 }, 'NO MORE CHAINS!', '#ff7a3a');
    }
    if (t > UNCH.roar) { this.laughing = true; D.p.head += Math.sin(t * 0.8) * 0.05; }
    this.hellK = e(UNCH.sky[0], UNCH.sky[1]);
    if (t >= C.n) this.endUnchain(match);
  }
  /** A fresh press skips the rest of THE UNCHAINING. */
  skipCut(match) { this.endUnchain(match); }
  /** The transformation's over: UNCHAINED, and his FINAL FORM name card. */
  endUnchain(match) {
    this.cut = null; this.laughing = false; this.unchainNow(match); this.hellK = 1; this.boss.rage = 0; this.rageText.setText('');
    this.startCard(match, { name: 'KARNAX UNCHAINED', title: 'THE HELLBORN KING', tag: '-  FINAL FORM  -' });
  }

  /** UNCHAINED adds CHAIN WHIP and INFERNO to MAD's attacks (and laughs less). */
  unchainedPattern() {
    if (this.atFeet()) return ['stomp', 'tail', 'chains'];
    if (this.count % 6 === 5) return ['laugh'];
    return ['combo', 'chains', 'inferno', 'leap', 'hellfire', 'chains', 'storm', 'inferno', 'behind'];
  }
  start_chains() { this.count++; } start_inferno() { this.count++; }

  /** The chain's links from his free hand to where its end is (end = { x, y }, slack = how much it sags). */
  chainPts(end, slack) {
    const h = this.joints().h2, pts = [];
    for (let i = 0; i <= CHAIN.links; i++) { const q = i / CHAIN.links; pts.push({ x: lerp(h.x, end.x, q), y: lerp(h.y, end.y, q) + Math.sin(q * Math.PI) * slack }); }
    return pts;
  }
  /**
   * CHAIN WHIP: he whirls a burning chain over his head (WHOOM WHOOM), then lashes it the whole length of the walk in
   * front of him - and back the other way behind him. Where it slams down, the floor burns.
   */
  atk_chains(match, a, out) {
    const D = this.dm, j = this.joints(), wh = this.sp(CHAIN.whirl), L = CHAIN.lash, gap = this.sp(CHAIN.gap);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; a.d = D.dir; sfx('laugh', 0.6, 0.9); }
    this.aim('laugh', 0.2); D.p.head = -0.2;
    if (a.t <= wh) {                                                                     // the whirl overhead
      const q = a.t * 0.32, c = { x: j.h2.x + Math.cos(q) * CHAIN.r, y: j.h2.y - 40 + Math.sin(q) * CHAIN.r * 0.45 };
      this.chain = this.chainPts(c, 6); if (a.t % 10 === 0) sfx('whoosh', 0.7, 0.8 + a.t * 0.01);
      return false;
    }
    const f = a.t - wh, lash = f < L ? 0 : f < L + gap ? -1 : f < 2 * L + gap ? 1 : 2;
    if (lash === 2) { this.chain = null; return f > 2 * L + gap + 24; }
    if (lash === -1) { const e = this.chain[this.chain.length - 1]; this.chain = this.chainPts({ x: lerp(e.x, j.h2.x + a.d * 40, 0.15), y: lerp(e.y, j.h2.y - 60, 0.15) }, 30); return false; }
    const s = lash === 0 ? a.d : -a.d, k = ease((lash === 0 ? f : f - L - gap) / L), ang = lerp(-1.75, 0.02, k);   // from straight up to flat along the floor
    const end = { x: Math.max(-280, Math.min(280, j.h2.x + s * Math.cos(ang) * CHAIN.reach * (0.5 + 0.5 * k))), y: Math.min(-6, j.h2.y + Math.sin(ang) * CHAIN.reach) };
    if (k <= 0.05 && (f === 0 || f === L + gap)) { sfx('whoosh', 1, 0.5); D.dir = s; }
    this.chain = this.chainPts(end, 20 * (1 - k));
    if (k > 0.3) for (let i = 4; i <= CHAIN.links; i += 2) { const p = this.chain[i]; out.push(this.bhit('ch' + a.id + lash, p.x - 16, p.y - 16, p.x + 16, p.y + 16, ...CHAIN.hit, { dirX: s })); }
    if (f === L - 1 || f === 2 * L + gap - 1) {                                        // it slams down: the floor burns
      sfx('bighit', 0.9, 0.6); sfx('flame', 0.8, 0.7); match.shake(9, 10);
      for (const q of [0.55, 0.8, 1]) { const p = this.chain[Math.round(q * CHAIN.links)]; if (Math.abs(p.x) < 262) this.cracks.push({ x: p.x, t: 0, id: this.sid('crack') }); }
    }
    return false;
  }
  /**
   * INFERNO: he beats his burning wings and climbs into the sky over the walk, rains volleys of fireballs down on
   * marked spots near you, then folds his wings and dives sword-first onto you in a streak of fire - a fire wave both ways.
   */
  atk_inferno(match, a, out) {
    const D = this.dm, I = INFERNO, climb = I.climb, hover = climb + I.volleys * this.sp(I.every) + 20, aim = hover + this.sp(I.aim), land = aim + I.dive;
    if (a.t === 1) { this.fireballs = this.fireballs || []; a.x0 = D.x; a.hx = Math.max(-150, Math.min(150, D.x * 0.5)); sfx('whoosh', 1, 0.4); sfx('flame', 1, 0.5); this.flying = true; }
    if (a.t <= climb) { const k = ease(a.t / climb); D.x = lerp(a.x0, a.hx, k); D.y = -I.high * k; this.aim('air', 0.15); if (a.t % 8 === 0) sfx('whoosh', 0.5, 0.6); return false; }
    if (a.t <= hover) {
      D.y = -I.high + Math.sin(a.t * 0.1) * 10; this.aim('laugh', 0.1); this.laughing = true;
      const tg = this.nearest(match, D.x); if (tg) { D.dir = Math.sign(tg.x - D.x) || D.dir; D.x = lerp(D.x, Math.max(-150, Math.min(150, tg.x)), 0.01); }
      const f = a.t - climb - 10;
      if (f >= 0 && f % this.sp(I.every) === 0 && f / this.sp(I.every) < I.volleys) {
        const j = this.joints(); sfx('flame', 0.9, 0.8); this.ha(match);
        for (let i = 0; i < I.per; i++) { const mx = Math.max(-255, Math.min(255, (tg ? tg.x : 0) + (i - (I.per - 1) / 2) * 70 + (Math.random() - 0.5) * 30)); this.fireballs.push({ x: j.chest.x, y: j.chest.y, mx, t: 0, id: this.sid('fb') }); }
      }
      if (a.t % 16 === 0) sfx('whoosh', 0.4, 0.7);
      return false;
    }
    this.laughing = false;
    if (a.t <= aim) { this.aim('over', 0.3); const tg = this.nearest(match, D.x); a.dx = Math.max(-240, Math.min(240, tg ? tg.x : 0)); a.dx0 = D.x; a.dy0 = D.y; D.dir = Math.sign(a.dx - D.x) || D.dir; if (a.t === aim) { sfx('roar', 0.7, 0.8); sfx('whoosh', 1, 0.5); } return false; }
    if (a.t < land) {                                                                    // the dive, in a streak of fire
      const k = (a.t - aim) / I.dive; D.x = lerp(a.dx0, a.dx, k); D.y = lerp(a.dy0, 0, k * k); this.aim('down', 0.4);
      const j = this.joints(); for (let i = 0; i < 3; i++) match.particles.push({ x: j.chest.x + (Math.random() - 0.5) * 40, y: j.chest.y + (Math.random() - 0.5) * 60, vx: 0, vy: -2, life: 20, color: FIRE[1 + i], size: 4 });
      if (k > 0.3) out.push(this.bhit('inf' + a.id, D.x - 48, D.y - 160, D.x + 48, D.y + 4, ...I.hit, { radial: true }));
      return false;
    }
    if (a.t === land) {
      D.y = 0; this.flying = false; sfx('bighit', 1, 0.4); sfx('flame', 1, 0.5); match.shake(16, 18);
      for (const s of [-1, 1]) this.waves.push({ x: D.x + s * 30, dir: s, t: 0, id: this.sid('wave') });
      if (Math.abs(D.x) < 250) this.cracks.push({ x: D.x, t: 0, id: this.sid('crack') });
    }
    this.aim('idle', 0.1);
    return a.t > land + 30;
  }
  /** INFERNO's fireballs: a warning mark on the walk, then each falls from him onto its mark and bursts into flame. */
  stepFireballs(match, out) {
    for (const b of this.fireballs || []) {
      b.t++;
      if (b.t < INFERNO.warn) continue;
      if (b.vx == null) { const dx = b.mx - b.x, dy = -8 - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * INFERNO.fall; b.vy = dy / d * INFERNO.fall; }
      b.x += b.vx; b.y += b.vy; b.vy += 0.05;
      out.push(this.bhit(b.id, b.x - 13, b.y - 13, b.x + 13, b.y + 13, ...INFERNO.ball, { radial: true }));
      if (b.y >= -8) { b.dead = true; sfx('flame', 0.7, 0.9); match.shake(3, 5); this.cracks.push({ x: b.mx, t: 0, id: this.sid('crack') }); for (let i = 0; i < 10; i++) match.particles.push({ x: b.mx, y: -6, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 3, life: 22, color: FIRE[1 + i % 4], size: 3, grav: 0.12 }); }
    }
    this.fireballs = (this.fireballs || []).filter((b) => !b.dead);
  }

  // ------------------------------------------------------------------ drawing
  /** The burning sky (the background layer): a red wash, the moon gone black in a burning corona, a glow at the horizon. */
  drawHellSky(g) {
    g.clear(); const k = this.hellK || 0; if (k <= 0) return;
    const t = this.t;
    g.fillStyle(0x6a0a08, 0.32 * k); g.fillRect(-700, -840, 1400, 1000);
    for (let i = 0; i < 4; i++) { g.fillStyle([0xff2a10, 0xff5a1a, 0xff9a30, 0xffd060][i], (0.35 - i * 0.07) * k); g.fillCircle(-200, -180, 64 - i * 4 + Math.sin(t * 0.06 + i) * 3); }
    g.fillStyle(0x050003, k); g.fillCircle(-200, -180, 50);
    g.lineStyle(2, 0xffd060, 0.8 * k); g.strokeCircle(-200, -180, 51); g.lineStyle(0);
    for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2 + t * 0.004, L = 70 + Math.sin(t * 0.08 + i * 2) * 14; g.lineStyle(2, 0xff5a1a, 0.4 * k); g.lineBetween(-200 + Math.cos(q) * 56, -180 + Math.sin(q) * 56, -200 + Math.cos(q) * L, -180 + Math.sin(q) * L); }
    g.lineStyle(0); g.fillStyle(0xff5010, 0.25 * k); g.fillRect(-700, 0, 1400, 70);
  }
  /** His UNCHAINED effects in front: the whip chain, fireballs (and their marks), the burning hoofprints. */
  drawUnchainedFx(x) {
    const t = this.t;
    for (const p of this.prints || []) { const a = Math.min(1, p.t / 30); x.fillStyle(FIRE[1], 0.6 * a); x.fillEllipse(p.x, -1, 16, 4); this.fire(x, p.x, 0, 4 * a, 9 * a, t + p.x); }
    if (this.chain) {
      const P = this.chain;
      for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; x.lineStyle(9, 0x12060a, 1); x.lineBetween(a.x, a.y, b.x, b.y); x.lineStyle(3, 0x8a2010, 1); x.lineBetween(a.x, a.y, b.x, b.y); }
      P.forEach((p, i) => { if (!i) return; x.lineStyle(3, 0x12060a, 1); x.strokeEllipse(p.x, p.y, i % 2 ? 9 : 5, i % 2 ? 5 : 9); x.lineStyle(2, i % 3 ? IRON[3] : FIRE[2], 1); x.strokeEllipse(p.x, p.y, i % 2 ? 7 : 4, i % 2 ? 4 : 7); });
      x.lineStyle(0);
      for (let i = 2; i < P.length; i += 2) { const p = P[i]; x.fillStyle(FIRE[1 + (i + (t >> 2)) % 3], 0.55); x.fillCircle(p.x + (Math.random() - 0.5) * 4, p.y - 4, 4 + Math.random() * 3); }
      const e = P[P.length - 1]; x.fillStyle(FIRE[3], 0.9); x.fillCircle(e.x, e.y, 7); x.fillStyle(FIRE[1], 0.4); x.fillCircle(e.x, e.y, 14);
    }
    for (const b of this.fireballs || []) {
      const k = Math.min(1, b.t / INFERNO.warn);
      x.fillStyle(0xff2a10, 0.25 + 0.35 * k * (t % 6 < 3 ? 1 : 0.5)); x.fillEllipse(b.mx, 0, 20 + 18 * k, 7);
      x.fillStyle(FIRE[0], 0.35); x.fillCircle(b.x, b.y, 18); x.fillStyle(FIRE[1], 1); x.fillCircle(b.x, b.y, 11); x.fillStyle(FIRE[3], 1); x.fillCircle(b.x, b.y, 6); x.fillStyle(FIRE[4], 1); x.fillCircle(b.x - 2, b.y - 2, 2.5);
      if (b.vx != null) { x.lineStyle(6, FIRE[1], 0.5); x.lineBetween(b.x, b.y, b.x - b.vx * 4, b.y - b.vy * 4); x.lineStyle(0); }
    }
  }
}
