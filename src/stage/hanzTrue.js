// THE TRUE FACE - HANZ & $@L's last act (its methods are copied onto HanzBossStage at the bottom of hanzBossStage.js;
// a name clash throws on load). Below `TRUE.at` of his health in the void he flies to the middle of the sky, raises his
// hands and STARS RAIN on the desk (`starfall`) while his mask cracks - and on the last crack it breaks in two: under
// it, the purple star that split him in two (src/scenes/AGENTS.md, his lore). The cutscene THE STAR THAT FELL (`true`,
// played by hanzCinema's cutStep) turns the room into the night sky (world 'stars') and he's WHOLE: his mood is
// `whole` for good, the two halves of his mask circle him (`maskIm`, mask_halves.png from tools/sprites/hanz_fight.py),
// he takes `TRUE.armor` of every hit and fights with five moves of his own - SUPERNOVA, CONSTELLATION, TWO-FACED,
// EVENT HORIZON and THE COMET. Below `TRUE.low`: LAST CALL (short pauses).
import { sfx } from '../audio/sfx.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { BossArena } from './bossBase.js';

// where the last act starts (of his health), how much of each hit he takes then, LAST CALL and its pause (frames)
export const TRUE = { at: 0.22, armor: 0.8, low: 0.08, lowWait: 24 };
// THE STARFALL: frames to reach the sky, when the stars start, how many, the gap, warning frames, fall speed, size,
// hit; when his mask cracks (three times) and breaks; when it ends; how high his waist floats in the sky
const STARFALL = { rise: 46, start: 84, n: 42, every: 4, warn: 30, v: 10, r: 9, hit: [9, [80, 5.5, 0.7]], cracks: [118, 158, 196], shatter: 236, end: 268, y: -215 };
// THE STAR THAT FELL (the cutscene): its length, the beats
const TRUECUT = { n: 380, fell: 96, whole: 176, close: 262 };
// SUPERNOVA: rising (frames), charging, the warning, the sweep, the beam's width and reach, hit; the rings after (count, gap, speed, gap width, hit)
const NOVA = { rise: 26, charge: 74, warn: 24, sweep: 56, w: 30, reach: 760, hit: [14, [55, 7.5, 0.9]], rings: 3, ringEvery: 14, ringV: 4.2, ringGap: 1.0, ringHit: [8, [60, 5, 0.6]] };
// CONSTELLATION: stars in the figure, frames between them appearing, warning, gap between lines lighting, how long
// each burns, width, hit; how many figures (the second traced the other way)
const CONST = { stars: 7, pop: 7, warn: 40, every: 6, live: 26, w: 14, hit: [11, [70, 6.5, 0.8]], rounds: 2 };
// TWO-FACED: the red half's lunges, aiming frames, speed, dash frames, size, hit; the grey half's tears (gap, fall speed, hit); frames to fly home
const TWO = { lunges: 3, aim: 26, v: 11, dash: 34, r: 16, hit: [10, [45, 6.5, 0.85]], tear: 15, tearV: 3.3, tearHit: [6, [80, 4, 0.5]], back: 40, open: 1.3 };
// EVENT HORIZON: where it opens, frames opening, pulling, pull strength (px a frame), the core (radius, hit), the
// shards spiralling in (count, hit), frames collapsing, the collapse's rings (speed, gap width, hit)
const HOLE = { x: 0, y: -126, open: 40, pull: 200, str: 1.6, core: 26, coreHit: [16, [90, 8, 1]], orbiters: 10, orbHit: [6, [60, 4, 0.5]], collapse: 30, ringV: 5.2, ringGap: 1.1, ringHit: [12, [70, 7.5, 0.9]] };
// THE COMET: dashes, aiming frames, speed, his body's radius, hit; the last plunge's hit and its star shards (count, hit)
const COMET = { legs: 4, aim: 22, v: 15, r: 44, hit: [12, [50, 7, 0.9]], slam: [15, [85, 8, 1]], shards: 10, shard: [6, [70, 4.5, 0.6]] };
// the mask halves circling him: radius, turn speed, size
const HALF = { r: 74, spin: 0.028, scale: 0.55 };
// THE TRUE FACE's colours
const STAR = [0xc07aff, 0xfff4ff, 0x8a5aff, 0xffb8f0, 0x2a1050, 0xff7ab8];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** THE TRUE FACE: the last act's attacks, its cutscene beats, the night sky and his face. */
export class HanzTrue {
  /** True once he's lost enough in the void for THE STARFALL (between attacks, not in a cutscene). */
  trueDue(match) { const B = this.boss; return this.world === 'void' && !this.starfallGone && !this.cut && !B.atk && B.hp <= B.max * TRUE.at; }
  /** Starts THE STARFALL now (it isn't in any mood's list: the fight calls it once). */
  startStarfall(match) {
    const B = this.boss; this.starfallGone = true;
    B.atk = { name: 'starfall', t: 0, id: ++B.uid }; B.last = 'starfall';
    this.start_starfall(match, B.atk);
  }
  /** Until his true face shows he can't be beaten: his health stops at the last act's line. */
  startDeath(match) {
    if (!this.trueFace) { this.boss.hp = Math.max(1, this.boss.max * TRUE.at * 0.97); return; }
    BossArena.prototype.startDeath.call(this, match);
  }

  // ------------------------------------------------------------------ THE STARFALL
  /** He flies up to the middle of the sky, raises both hands, and the stars come down. */
  start_starfall(match, a) {
    this.pin = true; this.front = true; this.clearFx(); a.n = 0; this.crackK = 0;
    this.play('idle'); this.say('s', 'ENOUGH.', 50); sfx('whoosh', 0.9, 0.45); this.flash(0x000000, 0.4);
  }
  /** One frame of THE STARFALL: rising, hands up, stars on marks all over the desk, his mask cracking, breaking. */
  atk_starfall(match, a, out) {
    const t = a.t, S = STARFALL;
    this.hx = lerp(this.hx, 0, 0.07); this.hy = lerp(this.hy, S.y + Math.sin(this.t * 0.05) * 3, 0.07);
    this.skyK = clamp((t - S.rise) / 70, 0, 1);
    if (t === S.rise) { this.play('raise', { hold: true }); this.say('h', 'LOOK UP.', 60); sfx('warn', 0.8, 0.55); }
    if (t === S.start - 10) { this.flash(0xc07aff, 0.35); sfx('thunder', 0.8, 0.7); match.shake(6, 10); }
    if (t >= S.start && a.n < S.n && (t - S.start) % S.every === 0) {
      a.n++;
      const f = a.n % 3 === 0 ? this.victim(match) : null, x = clamp(f ? f.x : -262 + Math.random() * 524, -268, 268);
      this.fstars.push({ x: x - 60 + Math.random() * 120, y: -560, tx: x, t: 0, ph: 'warn', id: this.nid('sf'), c: STAR[a.n % 4] });
    }
    if (S.cracks.includes(t)) { this.crackK++; sfx('glass', 0.7, 1.5 - 0.2 * this.crackK); match.shake(4, 6); this.flash(0xffffff, 0.15); const h = this.headAt(); this.burst(match, h.x, h.y, 8, [0xffffff, STAR[0]]); }
    if (t === S.shatter) {
      const h = this.headAt();
      this.trueFace = true; this.voidFace = false; this.crackK = 0; this.halfK = 0;
      this.burst(match, h.x, h.y, 46, [0xb8121c, 0xd2d0cc, 0xffffff, STAR[0], STAR[1]]);
      for (let i = 0; i < 3; i++) match.particles.push({ shape: 'ring', x: h.x, y: h.y, vx: 0, vy: 0, life: 24 + i * 8, maxLife: 24 + i * 8, color: STAR[i], grav: 0, r: 6, dr: 5 + i * 2 });
      sfx('glass', 1, 0.6); sfx('bighit', 1, 0.5); sfx('roar', 0.6, 0.5); match.shake(14, 18); this.flash(0xffffff, 0.8);
    }
    if (t >= S.end && !this.fstars.length) { this.trueReady = true; return true; }
    return false;
  }

  /** The last act begins: the cutscene (watched) or straight in (the sim). */
  startTrue(match) { this.trueReady = false; this.startCut(match, 'true', TRUECUT.n, () => this.becomeWhole(match)); }
  /** WHOLE: the night sky, his mood for good, the mask halves round him, quicker and tougher. */
  becomeWhole(match) {
    this.setWorld('stars'); this.trueFace = true; this.voidFace = false; this.skyK = 1; this.halfK = 1;
    this.mood = 'whole'; if (this.moodT) this.moodT.setText('THEY ARE WHOLE').setColor('#d8a8ff');
    this.rageText.setText('THE TRUE FACE'); this.boss.rage = 90; this.boss.wait = 60;
  }
  /** THE STAR THAT FELL, beat by beat (from hanzCinema's cutStep): close on his true face, the room becomes the night
   *  sky, the halves of his mask fly out round him, he laughs. Returns the camera shot. */
  trueStep(match, t, once, h) {
    const T = TRUECUT;
    once('hold', 1, () => { this.play('raise', { hold: true }); this.hold(999); this.say('h', '...YOU REALLY WANTED TO SEE IT.', 70); });
    once('fell', T.fell, () => { this.say('s', 'THE STAR THAT SPLIT US IN TWO. IT NEVER LEFT.', 80); this.flash(STAR[0], 0.3); sfx('clocktick', 0.8, 0.5); });
    once('whole', T.whole, () => {
      this.setWorld('stars'); this.skyK = 1; this.halfK = 0.01; this.flash(0xffffff, 1);
      sfx('roar', 0.8, 0.45); sfx('bighit', 1, 0.5); sfx('thunder', 0.7, 0.6); match.shake(16, 20);
      this.burst(match, h.x, h.y, 40, STAR); this.say('h', 'TWO HALVES. ONE STAR.', 70);
    });
    once('close', T.close, () => { this.play('laugh'); this.say('s', "NOW WE'RE WHOLE. CLOSING TIME, CUSTOMER.", 90); sfx('laugh', 0.8, 0.5); });
    if (this.halfK > 0 && this.halfK < 1) this.halfK = Math.min(1, this.halfK + 0.02);
    return t < T.whole ? { x: h.x, y: h.y + 8, zoom: 3.2 } : t < T.close + 50 ? { x: this.hx, y: this.hy - 70, zoom: 1.7 } : { x: 0, y: -120, zoom: 1.05 };
  }

  // ------------------------------------------------------------------ the five moves
  /** SUPERNOVA: he rises, the star in his face swells, then a beam sweeps down from the sky onto the far side of the
   *  desk (safe underneath him, close in) - and the star bursts in rings. */
  start_supernova(match, a) { this.pin = true; a.ph = 'rise'; a.t0 = 0; this.play('raise', { hold: true }); sfx('warn', 0.8, 0.45); this.say('s', 'MAKE A WISH.', 50); }
  /** One frame of SUPERNOVA. */
  atk_supernova(match, a, out) {
    const t = a.t - a.t0, h = this.headAt();
    if (a.ph === 'rise') { this.hy = lerp(this.hy, this.hoverY() - 70, 0.1); if (t > NOVA.rise) { a.ph = 'charge'; a.t0 = a.t; sfx('rumble', 0.9, 0.6); } }
    else if (a.ph === 'charge') {
      this.novaK = t / this.sp(NOVA.charge);
      if (t % 2 === 0) { const q = Math.random() * Math.PI * 2, d = 90 + Math.random() * 70; match.particles.push({ x: h.x + Math.cos(q) * d, y: h.y + Math.sin(q) * d, vx: -Math.cos(q) * d / 16, vy: -Math.sin(q) * d / 16, life: 16, color: STAR[t % 4], size: 2 }); }
      if (t >= this.sp(NOVA.charge)) {
        const f = this.nearest(match, this.hx), side = f ? (Math.sign(f.x - this.hx) || 1) : 1;
        a.side = side; a.a0 = -Math.PI / 2 - side * 0.15; a.a1 = Math.atan2(0 - h.y, side * 290 - h.x); if (side < 0 && a.a1 > 0) a.a1 -= Math.PI * 2;   // (round over the top, not under him)
        a.ph = 'warn'; a.t0 = a.t; sfx('laser', 0.6, 1.6);
      }
    } else if (a.ph === 'warn') {
      this.novaLine = { x: h.x, y: h.y, a0: a.a0, a1: a.a1, k: t / NOVA.warn };
      if (t >= NOVA.warn) { a.ph = 'sweep'; a.t0 = a.t; this.novaLine = null; a.beam = { kind: 'nova', x1: h.x, y1: h.y, x2: h.x, y2: h.y, w: NOVA.w, warn: 0, live: NOVA.sweep, fade: 12, t: 0, id: this.nid('nv'), hit: NOVA.hit }; this.beams.push(a.beam); sfx('laser', 1, 0.5); sfx('bighit', 0.8, 0.6); match.shake(10, NOVA.sweep); this.flash(STAR[1], 0.35); }
    } else if (a.ph === 'sweep') {
      const k = Math.min(1, t / NOVA.sweep), q = lerp(a.a0, a.a1, 1 - (1 - k) ** 2);
      Object.assign(a.beam, { x1: h.x, y1: h.y, x2: h.x + Math.cos(q) * NOVA.reach, y2: h.y + Math.sin(q) * NOVA.reach });
      if (t % 3 === 0) this.impact(match, clamp(h.x + Math.cos(q) * (0 - h.y) / Math.max(0.2, Math.sin(q)), -280, 280), 0, 0.3);
      if (t >= NOVA.sweep) { a.ph = 'nova'; a.t0 = a.t; a.k = 0; this.novaK = 0; }
    } else if (a.ph === 'nova') {
      if (t % NOVA.ringEvery === 0 && a.k < NOVA.rings) {
        a.k++; this.rings.push({ x: h.x, y: h.y, r: 14, v: NOVA.ringV, gap: Math.random() * Math.PI * 2, gw: NOVA.ringGap, id: this.nid('nr'), hit: NOVA.ringHit, c: STAR[a.k % 3] });
        sfx('bighit', 0.7, 1.1); this.flash(STAR[0], 0.2); this.burst(match, h.x, h.y, 14, STAR);
      }
      if (t > NOVA.rings * NOVA.ringEvery + 16) { this.play('idle'); return true; }
    }
    return false;
  }

  /** CONSTELLATION: stars appear one by one across the room - right where you are among them - joined by faint lines;
   *  then the lines light one after another into burning beams. Twice, the second traced back the other way. */
  start_constellation(match, a) { a.round = 0; this.play('pitch'); this.say('h', 'CONNECT THE DOTS.', 50); this.newFigure(match, a); }
  /** Lays out a figure of CONST.stars stars from one side to the other, zig-zagging high and low; the nearest star to
   *  each fighter moves onto them. */
  newFigure(match, a) {
    const n = CONST.stars, dir = (a.round % 2 ? -1 : 1) * (Math.random() < 0.5 ? 1 : -1);
    a.pts = Array.from({ length: n }, (_, i) => ({ x: dir * (-250 + i * 500 / (n - 1)) + (Math.random() - 0.5) * 30, y: i % 2 ? -150 - Math.random() * 90 : -26 - Math.random() * 40 }));
    for (const f of match.fighters) if (f.alive && f.state !== 'respawn') { let best = 0; a.pts.forEach((p, i) => { if (Math.abs(p.x - f.x) < Math.abs(a.pts[best].x - f.x)) best = i; }); a.pts[best] = { x: clamp(f.x, -268, 268), y: Math.min(-20, f.y - 24) }; }
    a.vis = 0; a.t0 = a.t; a.lit = false; this.cpts = a.pts; this.cvis = 0;
  }
  /** One frame of CONSTELLATION. */
  atk_constellation(match, a, out) {
    const t = a.t - a.t0, n = a.pts.length;
    if (a.vis < n && t % CONST.pop === 0) { a.vis++; this.cvis = a.vis; const p = a.pts[a.vis - 1]; sfx('ding', 0.5, 0.8 + a.vis * 0.12); this.burst(match, p.x, p.y, 6, STAR); }
    if (a.vis >= n && !a.lit) {
      a.lit = true; a.end = a.t + CONST.warn + (n - 1) * CONST.every + CONST.live + 14;
      for (let i = 0; i < n - 1; i++) { const p = a.pts[i], q = a.pts[i + 1]; this.beams.push({ kind: 'cline', x1: p.x, y1: p.y, x2: q.x, y2: q.y, w: CONST.w, warn: CONST.warn + i * CONST.every, live: CONST.live, fade: 14, t: 0, id: this.nid('cl'), hit: CONST.hit }); }
    }
    if (a.lit && a.t >= a.end) {
      for (const p of a.pts) { this.burst(match, p.x, p.y, 8, STAR); }
      sfx('glass', 0.6, 1.3);
      if (++a.round < CONST.rounds) { this.newFigure(match, a); a.pts.reverse(); return false; }
      this.cpts = null; return true;
    }
    return false;
  }

  /** TWO-FACED: the halves of his mask go for you on their own - $@L's red half lunges three times, HANZ's grey half
   *  floats over you crying tears that fall on you - while his face is left open (worth more). */
  start_twoface(match, a) { a.k = 0; a.ph = 'aim'; a.t0 = 0; this.play('argue'); this.say('s', 'SIC \'EM.', 40); sfx('whoosh', 0.8, 0.8); for (const m of this.halvesM) m.mode = 'atk'; }
  /** One frame of TWO-FACED. */
  atk_twoface(match, a, out) {
    const t = a.t - a.t0, R = this.halvesM[0], G = this.halvesM[1], f = this.nearest(match, R.x);
    if (f) {                                                                         // the grey half hangs over you, crying
      G.x = lerp(G.x, f.x + Math.sin(this.t * 0.03) * 30, 0.04); G.y = lerp(G.y, -232, 0.05); G.rot = Math.sin(this.t * 0.05) * 0.2;
      if (a.ph !== 'back' && this.t % TWO.tear === 0) { this.shots.push({ kind: 'tear', x: G.x + (Math.random() - 0.5) * 20, y: G.y + 20, vx: 0, vy: TWO.tearV, r: 6, id: this.nid('tr'), hit: TWO.tearHit, life: 150 }); sfx('petal', 0.25, 1.6); }
    }
    if (a.ph === 'aim') {
      const tx = f ? f.x : 0, ty = f ? f.y - 26 : -40, side = R.x < tx ? -1 : 1;
      R.x = lerp(R.x, tx + side * 120, 0.08); R.y = lerp(R.y, ty - 20, 0.08); R.rot = Math.sin(this.t * 0.4) * 0.15;
      a.tx = tx; a.ty = ty; this.aimHalf = { x: R.x, y: R.y, tx, ty, k: t / TWO.aim };
      if (t >= this.sp(TWO.aim)) { const dx = tx - R.x, dy = ty - R.y, d = Math.hypot(dx, dy) || 1; R.vx = dx / d * TWO.v; R.vy = dy / d * TWO.v; a.ph = 'dash'; a.t0 = a.t; a.id2 = this.nid('rd'); this.aimHalf = null; sfx('slash', 0.8, 0.7); }
    } else if (a.ph === 'dash') {
      R.x += R.vx; R.y = Math.min(-14, R.y + R.vy); R.rot += 0.5 * Math.sign(R.vx || 1);
      out.push(this.bhit(a.id2, R.x - TWO.r, R.y - TWO.r, R.x + TWO.r, R.y + TWO.r, ...TWO.hit, { dirX: Math.sign(R.vx) || 1 }));
      if (t % 2 === 0) match.particles.push({ x: R.x, y: R.y, vx: -R.vx * 0.2, vy: -R.vy * 0.2, life: 14, color: 0xff2a3a, size: 3 });
      if (t >= TWO.dash || Math.abs(R.x) > 300) { if (++a.k >= TWO.lunges) { a.ph = 'back'; a.t0 = a.t; } else { a.ph = 'aim'; a.t0 = a.t; } }
    } else if (a.ph === 'back') {
      for (const m of this.halvesM) m.mode = 'home';
      if (t >= TWO.back) { this.play('idle'); return true; }
    }
    return false;
  }

  /** EVENT HORIZON: a black hole opens over the middle of the desk and drags everyone toward it while shards of starlight
   *  spiral in; then it collapses in rings (each with a gap). */
  start_blackhole(match, a) { this.play('raise', { hold: true }); this.hole = { x: HOLE.x, y: HOLE.y, r: 0, t: 0, orb: [] }; sfx('rumble', 1, 0.5); this.say('h', 'EVERYTHING GOES BACK IN THE BOX.', 60); }
  /** One frame of EVENT HORIZON. */
  atk_blackhole(match, a, out) {
    const H = this.hole, t = a.t; H.t = t;
    if (t <= HOLE.open) H.r = HOLE.core * (t / HOLE.open);
    else if (t <= HOLE.open + HOLE.pull) {
      H.r = HOLE.core * (1 + 0.08 * Math.sin(t * 0.4));
      for (const f of match.fighters) {
        if (!f.alive || f.state === 'respawn') continue;
        const dx = H.x - f.x, dy = H.y - (f.y - 20), d = Math.hypot(dx, dy) || 1;
        if (d > 8) { f.x += dx / d * HOLE.str * Math.min(1, 0.4 + (1 - d / 600)); if (!f.grounded) f.y += dy / d * HOLE.str * 0.5; }
      }
      if (t % Math.floor(HOLE.pull / HOLE.orbiters) === 0) H.orb.push({ q: Math.random() * Math.PI * 2, d: 300, id: this.nid('ob'), c: STAR[H.orb.length % 4] });
      out.push(this.bhit('hc' + a.id, H.x - HOLE.core, H.y - HOLE.core, H.x + HOLE.core, H.y + HOLE.core, ...HOLE.coreHit, { radial: true }));
      if (t % 20 === 0) sfx('rumble', 0.4, 0.7);
    } else if (t === HOLE.open + HOLE.pull + 1) {
      sfx('bighit', 1, 0.4); sfx('glass', 0.8, 0.5); match.shake(16, 20); this.flash(0xffffff, 0.6); this.burst(match, H.x, H.y, 40, STAR);
      for (let i = 0; i < 2; i++) this.rings.push({ x: H.x, y: H.y, r: 10 + i * 40, v: HOLE.ringV * (1 - i * 0.15), gap: Math.random() * Math.PI * 2, gw: HOLE.ringGap, id: this.nid('hr'), hit: HOLE.ringHit, c: STAR[i] });
      H.orb = [];
    }
    for (const o of H.orb) {                                                         // shards spiralling in
      o.q += 0.045 + 6 / Math.max(40, o.d); o.d -= 1.3;
      const x = H.x + Math.cos(o.q) * o.d, y = H.y + Math.sin(o.q) * o.d * 0.7; o.x = x; o.y = y;
      out.push(this.bhit(o.id, x - 7, y - 7, x + 7, y + 7, ...HOLE.orbHit, { radial: true }));
    }
    H.orb = H.orb.filter((o) => o.d > HOLE.core);
    if (t > HOLE.open + HOLE.pull) H.r = Math.max(0, H.r - 2);
    if (t >= HOLE.open + HOLE.pull + HOLE.collapse) { this.hole = null; this.play('idle'); return true; }
    return false;
  }

  /** THE COMET: he blazes and ricochets across the room at you - each run aimed along a line first - then climbs to the
   *  top of the sky and comes down on the middle of the desk, shockwaves and star shards both ways. */
  start_comet(match, a) { this.pin = true; a.k = 0; a.ph = 'aim'; a.t0 = 0; this.play('slam'); sfx('whoosh', 1, 0.4); this.say('s', 'CATCH!', 40); }
  /** One frame of THE COMET. */
  atk_comet(match, a, out) {
    const t = a.t - a.t0, top = -300, low = this.landY();
    if (a.ph === 'aim') {
      const f = this.nearest(match, this.hx), c = this.core(), tx = f ? f.x : 0, ty = f ? f.y - 30 : -60;
      let dx = tx - c.x, dy = ty - c.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let s = 900; for (const [p, v, lo, hi] of [[this.hx, dx, -270, 270], [this.hy, dy, top, low]]) { if (v > 0.001) s = Math.min(s, (hi - p) / v); else if (v < -0.001) s = Math.min(s, (lo - p) / v); }
      a.ex = this.hx + dx * s; a.ey = this.hy + dy * s; a.vx = dx * COMET.v; a.vy = dy * COMET.v;
      this.cometLine = { x1: c.x, y1: c.y, x2: a.ex, y2: a.ey - (this.hy - c.y), k: t / COMET.aim };
      if (t >= this.sp(COMET.aim)) { a.ph = 'go'; a.t0 = a.t; a.id2 = this.nid('cm'); this.cometLine = null; this.dashing = true; sfx('whoosh', 1, 0.6); sfx('flame', 0.6, 1.3); }
    } else if (a.ph === 'go') {
      this.hx += a.vx; this.hy += a.vy; const c = this.core();
      out.push(this.bhit(a.id2, c.x - COMET.r * 0.7, c.y - COMET.r, c.x + COMET.r * 0.7, this.hy + 20, ...COMET.hit, { dirX: Math.sign(a.vx) || 1 }));
      for (let i = 0; i < 2; i++) match.particles.push({ x: c.x + (Math.random() - 0.5) * 30, y: c.y + (Math.random() - 0.5) * 60, vx: -a.vx * 0.25, vy: -a.vy * 0.25, life: 22, color: STAR[(this.t + i) % 4], size: 3 });
      if ((a.ex - this.hx) * a.vx <= 0 && (a.ey - this.hy) * a.vy <= 0) {
        this.hx = a.ex; this.hy = a.ey; this.dashing = false; match.shake(6, 8); sfx('clang', 0.6, 0.6); this.burst(match, c.x, c.y, 12, STAR);
        if (++a.k >= COMET.legs) { a.ph = 'up'; a.t0 = a.t; } else { a.ph = 'aim'; a.t0 = a.t; }
      }
    } else if (a.ph === 'up') {
      this.hx = lerp(this.hx, 0, 0.12); this.hy = lerp(this.hy, top, 0.12);
      this.marks.push({ x: 0, y: 0, k: Math.min(1, t / 30), kind: 'fire', life: 1 });
      if (t > 34) { a.ph = 'fall'; a.t0 = a.t; a.id2 = this.nid('cf'); this.play('slam'); this.dashing = true; }
    } else if (a.ph === 'fall') {
      this.hy = Math.min(low, this.hy + 17); const c = this.core();
      out.push(this.bhit(a.id2, c.x - 40, c.y - 60, c.x + 40, this.hy + 20, ...COMET.slam, { radial: true }));
      if (this.hy >= low) {
        a.ph = 'land'; a.t0 = a.t; this.dashing = false;
        this.waves.push({ x: -30, dir: -1, v: 7, id: this.nid('w') }, { x: 30, dir: 1, v: 7, id: this.nid('w') });
        for (let i = 0; i < COMET.shards; i++) { const q = -Math.PI * (0.08 + 0.84 * i / (COMET.shards - 1)); this.shots.push({ kind: 'shard', ph: 'fly', x: 0, y: -20, vx: Math.cos(q) * 6, vy: Math.sin(q) * 7, grav: 0.2, r: 6, id: this.nid('cs'), c: STAR[i % 4], hit: COMET.shard, life: 110 }); }
        this.impact(match, 0, 0, 1.8); sfx('bighit', 1, 0.45); match.shake(18, 20); this.flash(0xffffff, 0.45);
      }
    } else if (a.ph === 'land') {
      if (t > 30) { this.hy = lerp(this.hy, this.hoverY(), 0.12); if (t > 54) { this.play('idle'); return true; } }
    }
    return false;
  }

  // ------------------------------------------------------------------ every frame
  /** The last act's moving parts: the falling stars, the mask halves circling him. */
  stepTrue(match, out) {
    const push = (h) => { if (out) out.push(h); };
    for (const s of this.fstars) {
      if (s.ph === 'warn') { if (++s.t >= STARFALL.warn) { s.ph = 'fall'; s.vx = (s.tx - s.x) / ((0 - s.y) / STARFALL.v); s.vy = STARFALL.v; } else { this.marks.push({ x: s.tx, y: 0, k: s.t / STARFALL.warn, kind: 'star', life: 1 }); continue; } }
      s.x += s.vx; s.y += s.vy;
      if (s.y >= -6) { s.dead = true; this.impact(match, s.x, 0, 0.45); sfx('glass', 0.25, 1.5 + Math.random() * 0.5); push(this.bhit(s.id + 'x', s.x - 26, -40, s.x + 26, 4, ...STARFALL.hit, { radial: true })); continue; }
      push(this.bhit(s.id, s.x - STARFALL.r, s.y - STARFALL.r, s.x + STARFALL.r, s.y + STARFALL.r, ...STARFALL.hit, { dirX: Math.sign(s.vx) || 1 }));
    }
    this.fstars = this.fstars.filter((s) => !s.dead);
    if (this.halfK > 0) this.halvesM.forEach((m, i) => {
      if (m.mode === 'atk') return;
      const q = this.t * HALF.spin + i * Math.PI, hx = this.hx + Math.cos(q) * HALF.r * this.halfK, hy = this.hy - 70 * this.zK() + Math.sin(q) * HALF.r * 0.45 * this.halfK;
      m.x = lerp(m.x ?? this.hx, hx, m.mode === 'home' ? 0.12 : 0.3); m.y = lerp(m.y ?? this.hy, hy, m.mode === 'home' ? 0.12 : 0.3); m.rot = lerp(m.rot || 0, Math.sin(q) * 0.25, 0.2); m.front = Math.sin(q) > 0;
      if (m.mode === 'home' && Math.hypot(m.x - hx, m.y - hy) < 6) m.mode = null;
    });
  }

  /** The night sky (world 'stars', and fading in under THE STARFALL): bands of deep blue to violet, nebulae, a field
   *  of twinkling stars, shooting stars, and far off the great purple star he fell from, its rays turning. */
  drawStarsBg() {
    const g = this.starsG, k = this.dim ? 0 : this.world === 'stars' ? 1 : this.skyK || 0; g.clear(); g.setVisible(k > 0); if (k <= 0) return;
    const t = this.t, bands = [0x05030c, 0x0a0618, 0x120a26, 0x1c0e36, 0x2a1450, 0x3a1a62];
    bands.forEach((c, i) => { g.fillStyle(c, k); g.fillRect(0, i * VIEW_H / bands.length, VIEW_W, VIEW_H / bands.length + 1); });
    for (const [x, y, w, h, c] of [[140, 120, 360, 120, 0x8a2aff], [480, 220, 300, 140, 0xff5ab8], [320, 60, 260, 90, 0x3a6aff]]) { g.fillStyle(c, 0.09 * k); g.fillEllipse(x + Math.sin(t * 0.003) * 10, y, w, h); g.fillStyle(c, 0.06 * k); g.fillEllipse(x, y, w * 0.6, h * 0.6); }
    for (let i = 0; i < 140; i++) {
      const x = (i * 197.3) % VIEW_W, y = (i * 113.7 + (i % 7) * 11) % VIEW_H, tw = 0.5 + 0.5 * Math.sin(t * (0.02 + (i % 5) * 0.012) + i);
      g.fillStyle(i % 9 === 0 ? STAR[3] : i % 5 === 0 ? STAR[0] : 0xffffff, (0.25 + 0.6 * tw) * k); g.fillRect(x, y, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
    }
    const sx = 500, sy = 70, p = 1 + 0.12 * Math.sin(t * 0.06);                          // the star he fell from
    g.fillStyle(STAR[0], 0.12 * k); g.fillCircle(sx, sy, 46 * p);
    for (let i = 0; i < 8; i++) { const q = i / 8 * Math.PI * 2 + t * 0.004, L = (i % 2 ? 26 : 60) * p; g.fillStyle(i % 2 ? STAR[3] : STAR[0], 0.5 * k); g.fillTriangle(sx + Math.cos(q) * L, sy + Math.sin(q) * L, sx + Math.cos(q + 0.12) * 6, sy + Math.sin(q + 0.12) * 6, sx + Math.cos(q - 0.12) * 6, sy + Math.sin(q - 0.12) * 6); }
    g.fillStyle(0xffffff, k); g.fillCircle(sx, sy, 5 * p);
    if (t % 140 < 22) { const s = (t % 140) / 22, x0 = (Math.floor(t / 140) * 211) % VIEW_W; g.lineStyle(2, 0xffffff, 0.7 * (1 - s) * k); g.lineBetween(x0 + s * 160, 30 + s * 70, x0 + s * 160 - 40, 30 + s * 70 - 18); }
  }

  /** His face once the mask is off: deep space in the shape of a face, nebula swirling in it, stars, and in the middle
   *  the purple star, pulsing; a red spark where $@L's eye was and a grey one where HANZ's was. Also the cracks
   *  spreading over the mask under THE STARFALL. */
  drawTrueFace(g, fr, SC) {
    const a = fr.eyes.sal, b = fr.eyes.hanz, sc = ((a[2] + b[2]) / 2) / 1.33, c = this.L((a[0] + b[0]) / 2 + 2, (a[1] + b[1]) / 2 + 14), t = this.t;
    if (this.crackK > 0 && !this.trueFace) {
      for (let i = 0; i < this.crackK * 4; i++) {
        let x = c.x, y = c.y - 6; const q0 = i * 1.7 + 0.4;
        g.lineStyle(1.5, 0xffffff, 0.9); g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 4; j++) { const q = q0 + Math.sin(i * 3 + j) * 0.6; x += Math.cos(q) * 6 * SC * 2.2 * sc; y += Math.sin(q) * 6 * SC * 2.2 * sc; g.lineTo(x, y); }
        g.strokePath();
      }
      g.fillStyle(STAR[0], 0.5); g.fillCircle(c.x, c.y - 6, 3 + this.crackK * 2);
      return;
    }
    if (!this.trueFace) return;
    const W = 76 * SC * sc, Hh = 100 * SC * sc, p = 1 + 0.15 * Math.sin(t * 0.12);
    g.fillStyle(0x07040e, 1); g.fillEllipse(c.x, c.y, W, Hh);
    g.fillStyle(0x2a1050, 0.9); g.fillEllipse(c.x + Math.sin(t * 0.05) * 2, c.y - 2, W * 0.8, Hh * 0.8);
    g.fillStyle(0x8a2aff, 0.35); g.fillEllipse(c.x - W * 0.12, c.y + Math.cos(t * 0.04) * 2, W * 0.5, Hh * 0.45);
    g.fillStyle(0xff5ab8, 0.22); g.fillEllipse(c.x + W * 0.14, c.y + Hh * 0.12, W * 0.42, Hh * 0.3);
    for (let i = 0; i < 9; i++) { const q = i * 2.4 + t * 0.01, r = (0.15 + (i % 4) * 0.08); g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(t * 0.1 + i)); g.fillRect(c.x + Math.cos(q) * W * r, c.y + Math.sin(q) * Hh * r, 1, 1); }
    for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2 + t * 0.02, L = W * 0.42 * p; g.fillStyle(STAR[i % 2 ? 3 : 0], 0.95); g.fillTriangle(c.x + Math.cos(q) * L, c.y - 4 + Math.sin(q) * L, c.x + Math.cos(q + 0.5) * 3, c.y - 4 + Math.sin(q + 0.5) * 3, c.x + Math.cos(q - 0.5) * 3, c.y - 4 + Math.sin(q - 0.5) * 3); }
    g.fillStyle(0xffffff, 1); g.fillCircle(c.x, c.y - 4, 2.5 * p);
    for (const [e, col] of [[a, 0xff2a3a], [b, 0xd2d0cc]]) { const q = this.L(e[0], e[1] + 4); g.fillStyle(col, 0.3); g.fillCircle(q.x, q.y, 3.5); g.fillStyle(col, 1); g.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 2, 2); }
  }

  /** The last act's effects: the falling stars and their trails, the constellation, the supernova, the event horizon,
   *  the comet's aim, the mask halves' aim and tears, and the halves themselves. */
  drawTrue() {
    this.drawStarsBg();
    const g = this.topG, gl = this.glowG, m = this.midG, t = this.t; if (!g) return;
    for (const s of this.fstars) {
      if (s.ph !== 'fall') continue;
      gl.lineStyle(8, s.c, 0.3); gl.lineBetween(s.x, s.y, s.x - s.vx * 7, s.y - s.vy * 7); gl.fillStyle(s.c, 0.35); gl.fillCircle(s.x, s.y, 16);
      this.starShape(g, s.x, s.y, STARFALL.r * 1.4, t * 0.2, 0xffffff, s.c);
    }
    for (const k of this.marks) if (k.kind === 'star') { m.lineStyle(1, STAR[0], 0.4 + 0.5 * k.k); m.lineBetween(k.x, -2, k.x, -420); }
    if (this.cpts) this.cpts.slice(0, this.cvis).forEach((p, i, L) => {
      gl.fillStyle(STAR[0], 0.35); gl.fillCircle(p.x, p.y, 12 + 3 * Math.sin(t * 0.2 + i));
      this.starShape(g, p.x, p.y, 8, t * 0.05 + i, 0xffffff, STAR[i % 4]);
      const q = L[i + 1]; if (q) { g.lineStyle(1, STAR[1], 0.35 + 0.25 * Math.sin(t * 0.3)); const n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 10); for (let j = 0; j < n; j += 2) g.lineBetween(lerp(p.x, q.x, j / n), lerp(p.y, q.y, j / n), lerp(p.x, q.x, (j + 1) / n), lerp(p.y, q.y, (j + 1) / n)); }
    });
    for (const b of this.beams) {
      if (b.kind !== 'cline' && b.kind !== 'nova') continue;
      if (b.t <= b.warn) continue;
      const lt = b.t - b.warn, fade = lt <= b.live ? 1 : 1 - (lt - b.live) / b.fade, w = b.w * fade * (1 + 0.15 * Math.sin(t * 0.9));
      gl.lineStyle(w * 2.4, STAR[0], 0.35 * fade); gl.lineBetween(b.x1, b.y1, b.x2, b.y2);
      g.lineStyle(w, b.kind === 'nova' ? STAR[3] : STAR[0], 0.9 * fade); g.lineBetween(b.x1, b.y1, b.x2, b.y2);
      g.lineStyle(w * 0.4, 0xffffff, fade); g.lineBetween(b.x1, b.y1, b.x2, b.y2);
    }
    if (this.novaLine) { const N = this.novaLine; for (const q of [N.a0, N.a1]) { g.lineStyle(1, 0xffffff, 0.3 + 0.5 * (Math.floor(t / 3) % 2)); g.lineBetween(N.x, N.y, N.x + Math.cos(q) * 700, N.y + Math.sin(q) * 700); } }
    if (this.novaK > 0) { const h = this.headAt(); gl.fillStyle(STAR[0], 0.25 + 0.3 * this.novaK); gl.fillCircle(h.x, h.y, 10 + 40 * this.novaK); gl.fillStyle(0xffffff, 0.5 * this.novaK); gl.fillCircle(h.x, h.y, 4 + 14 * this.novaK); }
    if (this.hole) {
      const H = this.hole;
      gl.fillStyle(STAR[0], 0.25); gl.fillCircle(H.x, H.y, H.r * 3.2); gl.fillStyle(STAR[3], 0.15); gl.fillCircle(H.x, H.y, H.r * 4.5);
      for (let i = 0; i < 3; i++) { g.lineStyle(3 - i, [0xffffff, STAR[3], STAR[0]][i], 0.8); g.strokeEllipse(H.x, H.y, H.r * (3 + i * 0.8), H.r * (1.0 + i * 0.25)); }
      g.fillStyle(0x000000, 1); g.fillCircle(H.x, H.y, H.r); g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(H.x, H.y, H.r + 1);
      for (const o of H.orb) { gl.fillStyle(o.c, 0.4); gl.fillCircle(o.x, o.y, 10); this.starShape(g, o.x, o.y, 6, t * 0.3, 0xffffff, o.c); }
      if (H.t < HOLE.open + HOLE.pull) for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2 + t * 0.05, r1 = 220 - ((t * 3 + i * 22) % 200); g.lineStyle(1, STAR[1], 0.4); g.lineBetween(H.x + Math.cos(q) * r1, H.y + Math.sin(q) * r1 * 0.7, H.x + Math.cos(q + 0.2) * (r1 - 18), H.y + Math.sin(q + 0.2) * (r1 - 18) * 0.7); }
    }
    if (this.cometLine) { const C = this.cometLine; g.lineStyle(2, STAR[3], 0.3 + 0.5 * (Math.floor(t / 2) % 2)); g.lineBetween(C.x1, C.y1, C.x2, C.y2); gl.lineStyle(10 * C.k, STAR[0], 0.2); gl.lineBetween(C.x1, C.y1, C.x2, C.y2); }
    if (this.dashing && this.world === 'stars') { const c = this.core(); gl.fillStyle(STAR[0], 0.3); gl.fillCircle(c.x, c.y, 60); gl.fillStyle(0xffffff, 0.2); gl.fillCircle(c.x, c.y, 30); }
    if (this.aimHalf) { const A = this.aimHalf; g.lineStyle(1, 0xff2a3a, 0.4 + 0.5 * (Math.floor(t / 2) % 2)); g.lineBetween(A.x, A.y, A.x + (A.tx - A.x) * 3, A.y + (A.ty - A.y) * 3); }
    for (const s of this.shots) if (s.kind === 'tear') { gl.fillStyle(0xbfe8ff, 0.3); gl.fillCircle(s.x, s.y, 9); g.fillStyle(0xd2e8ff, 1); g.fillTriangle(s.x, s.y - 9, s.x - 4, s.y, s.x + 4, s.y); g.fillCircle(s.x, s.y, 4); g.fillStyle(0xffffff, 0.9); g.fillRect(s.x - 2, s.y - 2, 1, 2); }
    // the halves of his mask
    this.maskIm.forEach((im, i) => {
      const M = this.halvesM[i], on = this.halfK > 0 && !this.gone && M.x !== undefined;
      im.setVisible(on); if (!on) return;
      im.setPosition(M.x, M.y).setRotation(M.rot || 0).setScale(HALF.scale).setDepth(0).setAlpha(M.mode === 'atk' || M.front !== false ? 1 : 0.75);
      gl.fillStyle(i ? 0xd2d0cc : 0xff2a3a, 0.18); gl.fillCircle(M.x, M.y, 30);
    });
  }

  /** A little four-point star at (x, y): radius r, turned q, outer colour c1 round a core c0. */
  starShape(g, x, y, r, q, c0, c1) {
    for (const [R, c] of [[r, c1], [r * 0.55, c0]]) for (let i = 0; i < 4; i++) { const a = q + i * Math.PI / 2; g.fillStyle(c, 1); g.fillTriangle(x + Math.cos(a) * R, y + Math.sin(a) * R, x + Math.cos(a + 0.6) * R * 0.3, y + Math.sin(a + 0.6) * R * 0.3, x + Math.cos(a - 0.6) * R * 0.3, y + Math.sin(a - 0.6) * R * 0.3); }
  }
}
