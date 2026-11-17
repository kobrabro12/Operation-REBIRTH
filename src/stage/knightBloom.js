// THORNWARD IN BLOOM - THORNWARD's second form (the boss fight in THE ELDER GROVE, knightBossStage.js).
// At half health the grove claims him: he sinks to one knee, his soul pops out of the visor in a panic (HUH?! WHAT'S
// THE GROVE DOING?!), roots surge up out of the floor and wind round him to the helm - and he BLOOMS: the armour's
// seams split with gold-green light, blossoms burst open all over him, his antlers grow into a great flowering crown of
// branches, and he rises in a storm of petals. The grove goes with him: the light shafts turn gold and petals drift down.
// A cutscene when a player is watching (with a SECOND FORM name card), else it just happens (the sim).
// IN BLOOM his armour still can't be hurt (hit the soul as before; BERSERK still comes below 25%), and two attacks join:
//   PETAL STORM - petals swirl in round him, then burst out in three spinning rings of razor petals, each with a gap
//     in it somewhere - find the gap (or jump the low ones).
//   SEEDFALL - he slams the maul down, his crown shakes loose a shower of glowing seeds that drift down over the
//     clearing - wherever one lands, a thorn root bursts up a moment later.
// This class's methods are mixed into KnightBossStage (the loop at the bottom of knightBossStage.js; a name may only
// exist once across them).
import { sfx } from '../audio/sfx.js';
import { BossArena } from './bossBase.js';

const PETAL = [0xffb8d8, 0xff8ac0, 0xfff0f6, 0xffd860];
const GOLD = [0xc8f070, 0xf0ffa0, 0xfff4c0];
const OUT = 0x0a120c;
// where it starts (part of his health); the cutscene's beats (frames): kneel, the soul pops out, the roots climbing,
// the bloom, the crown growing, standing up, the soul's last word, the whole length
const ELDER = { at: 0.5, kneel: 26, soul: 40, roots: [36, 132], bloom: 140, grow: [140, 214], rise: [150, 214], say: 222, n: 262 };
// PETAL STORM: the gathering (frames), rings, frames between them, petals per ring, the gap (petals), ring speed, hit
const STORM = { gather: 46, rings: 3, every: 34, n: 20, gap: 5, speed: 2.8, max: 430, hit: [5, [55, 4.2, 0.45]] };
// SEEDFALL: the wind-up, seeds (BERSERK too), how they drift (fall speed, sway), the root's delay after landing, its hit
const SEED = { wind: 34, n: [5, 7], fall: 1.7, sway: 1.3, delay: 16, hit: [7, [84, 4.6, 0.5]], ball: [4, [60, 3.4, 0.35]] };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;

/** THORNWARD IN BLOOM (see the top of the file): mixed into KnightBossStage. */
export class BloomPhase {
  /** A real player is watching this boss fight (the intro ran): the bloom plays as a cutscene. */
  startIntro(match) { BossArena.prototype.startIntro.call(this, match); this.watched = true; }
  /** The camera: the intro's, or the bloom's. */
  introCam() {
    if (!this.cut) return BossArena.prototype.introCam.call(this);
    const w = this.cut.shot || { x: 0, y: -150, zoom: 1 }, k = 0.08;
    this.ccam = { x: lerp(this.ccam.x, w.x, k), y: lerp(this.ccam.y, w.y, k), zoom: lerp(this.ccam.zoom, w.zoom, k) };
    return { ...this.ccam, exact: true };
  }
  /** Which form he's in, for the death card's quote. */
  cardForm() { return this.boss && this.boss.phase === 2 ? 'rage' : this.elder ? 'bloom' : 'base'; }

  /** Every frame of the fight (from step): starts the bloom at half health; IN BLOOM, petals drift through the grove. */
  stepBloom(match, out) {
    const B = this.boss; if (!B || B.dying) return;
    if (!this.elder && !this.cut && B.hp <= B.max * ELDER.at && this.soul.st === 'home' && !B.atk) this.startBloom(match);
    if (!this.elder) return;
    if (this.t % 7 === 0 && this.leaves.length < 44) this.leaves.push({ x: (Math.random() - 0.5) * 700, y: -420, vx: 0.4 + Math.random() * 0.6, p: Math.random() * 6, c: PETAL[Math.floor(Math.random() * 3)] });
    this.stepPetals(out); this.stepSeeds(match, out);
  }
  /** Starts the bloom: a cutscene if watched, else at once. */
  startBloom(match) {
    this.decoys = null; this.boss.wait = 60;
    if (this.watched && this.startCard) {
      const cam = match.worldCam || match.cameras.main;
      this.cut = { kind: 'bloom', t: 0, n: ELDER.n, once: new Set(), armed: false };
      this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.eld = { roots: 0, k: 0 };
      return;
    }
    this.bloomNow(match);
  }
  /** He's IN BLOOM: the new look, the golden grove, the new attacks. */
  bloomNow(match, card = false) {
    this.elder = true; this.eld = { roots: 0, k: 1 }; this.soul.st = 'home';
    if (this.barName) this.barName.setText('THORNWARD, IN FULL BLOOM');
    if (!card) { this.rageText.setText('THORNWARD BLOOMS!'); this.boss.rage = 90; }
    sfx('summon', 1, 0.7); match.shake(8, 20);
  }
  /**
   * One frame of THE BLOOM (MatchScene, while `cut` is set): he kneels, the soul pops out in a panic, roots surge up
   * round him, the flowers burst open and the antlers grow into a flowering crown, he rises - then the card.
   */
  cutStep(match) {
    const C = this.cut, t = ++C.t, j = this.joints(), E = this.eld, S = this.soul;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k), e = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    this.t++;
    if (t < ELDER.rise[0]) { this.aim('kneel', 0.08); C.shot = { x: j.chest.x, y: j.chest.y - 20, zoom: 1.35 }; }
    else { this.aim('pose', 0.06); C.shot = t < ELDER.grow[1] ? { x: j.chest.x, y: j.head.y + 10, zoom: 1.3 } : { x: j.chest.x * 0.6, y: -150, zoom: 1 }; }
    if (once('kneel', 2)) { sfx('rumble', 0.8, 0.6); match.shake(4, 20); }
    if (once('soul', ELDER.soul)) { S.st = 'out'; S.x = j.head.x; S.y = j.head.y; S.vx = 0; S.side = -this.kn.dir; sfx('soulhit', 0.8, 1.2); match.popText({ x: j.head.x, y: j.head.y - 80 }, 'HUH?! WHAT\'S THE GROVE DOING?!', '#9affd0'); }
    if (S.st === 'out') { S.x = lerp(S.x, j.head.x - this.kn.dir * 70 + Math.sin(t * 0.15) * 10, 0.08); S.y = lerp(S.y, j.head.y - 50 + Math.sin(t * 0.23) * 8, 0.08); }
    E.roots = e(ELDER.roots[0], ELDER.roots[1]);
    if (t > ELDER.roots[0] && t < ELDER.roots[1] && t % 12 === 0) { sfx('rumble', 0.5, 0.8 + E.roots * 0.4); match.shake(2 + E.roots * 3, 8); }
    if (once('bloom', ELDER.bloom)) {                                                    // the flowers burst open
      sfx('summon', 1, 0.6); sfx('shing', 0.9, 0.8); sfx('bighit', 0.7, 0.9); match.shake(12, 20); this.whiteK = 1;
      for (let i = 0; i < 60; i++) { const q = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6; match.particles.push({ x: j.chest.x + (Math.random() - 0.5) * 60, y: j.chest.y + (Math.random() - 0.5) * 80, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 1, life: 50, color: PETAL[i % 4], size: 3, drag: 0.95 }); }
    }
    E.k = e(ELDER.grow[0], ELDER.grow[1]);
    if (t > ELDER.grow[0] && t < ELDER.grow[1] && t % 9 === 0) sfx('shing', 0.3, 1 + E.k);
    if (t > ELDER.rise[0]) E.roots = Math.max(0, 1 - e(ELDER.rise[0], ELDER.rise[1]));
    if (once('home', ELDER.say - 14)) { S.st = 'home'; sfx('soulhit', 0.5, 1.5); }
    if (once('say', ELDER.say)) { match.popText({ x: j.head.x, y: j.head.y - 90 }, 'HEHEHE! PRETTY, HUH?', '#ffb8d8'); sfx('laugh', 0.5, 1.6); }
    if (this.whiteK > 0) this.whiteK = Math.max(0, this.whiteK - 0.05);
    if (t >= C.n) this.endBloom(match);
  }
  /** A fresh press skips the rest of THE BLOOM. */
  skipCut(match) { this.endBloom(match); }
  /** The bloom's over: IN BLOOM, and his SECOND FORM name card. */
  endBloom(match) {
    this.cut = null; this.whiteK = 0; this.bloomNow(match, true);
    this.startCard(match, { name: 'THORNWARD IN BLOOM', title: 'THE ELDER GROVE AWAKENS', tag: '-  SECOND FORM  -' });
  }

  /** IN BLOOM adds PETAL STORM and SEEDFALL to his attacks (the soul still comes out to taunt, until it's bared). */
  bloomPattern(phase) {
    const base = phase === 1 ? ['slam', 'grasp', 'charge', 'volley'] : ['slam', 'grasp', 'charge', 'volley', 'fury', 'slam'];
    return base.concat(['petals', 'seeds']);
  }
  start_petals() { this.tally(); } start_seeds() { this.tally(); }
  /**
   * PETAL STORM: he spreads his arms and petals swirl in round him, then burst outward in three spinning rings of
   * razor petals, one after another - each ring has a gap in it somewhere; find it (or jump the low part).
   */
  atk_petals(match, a) {
    const j = this.joints(), g = this.sp(STORM.gather);
    this.aim('pose', 0.15);
    if (a.t === 1) { sfx('whoosh', 0.8, 1.2); match.popText({ x: j.head.x, y: j.head.y - 80 }, 'BLOSSOM!', '#ffb8d8'); }
    if (a.t < g) { if (a.t % 2 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: j.chest.x + Math.cos(q) * 120, y: j.chest.y + Math.sin(q) * 90, vx: -Math.cos(q) * 4.5, vy: -Math.sin(q) * 3.4, life: 26, color: PETAL[a.t % 3], size: 3 }); } return false; }
    const f = a.t - g, ev = this.sp(STORM.every);
    if (f % ev === 0 && f / ev < STORM.rings) {
      const gapAt = Math.floor(Math.random() * STORM.n), spin = (f / ev) % 2 ? 1 : -1;
      this.rings = (this.rings || []).concat([{ x: j.chest.x, y: j.chest.y, r: 20, a: Math.random() * 6, spin, gapAt, id: this.sid('petals') }]);
      sfx('whoosh', 1, 0.9); sfx('shing', 0.6, 1.3); match.shake(3, 6);
    }
    return f > ev * STORM.rings + 30;
  }
  /** PETAL STORM's rings: growing outward, turning; each petal hits (once per ring). */
  stepPetals(out) {
    for (const R of this.rings || []) {
      R.r += STORM.speed; R.a += 0.012 * R.spin;
      for (const p of this.ringPts(R)) if (p.y < 4) out.push(this.bhit(R.id, p.x - 9, p.y - 9, p.x + 9, p.y + 9, ...STORM.hit, { radial: true }));
    }
    this.rings = (this.rings || []).filter((R) => R.r < STORM.max);
  }
  /** Where each petal of a ring is (the gap left out). */
  ringPts(R) {
    const pts = [];
    for (let i = 0; i < STORM.n; i++) { if ((i - R.gapAt + STORM.n) % STORM.n < STORM.gap) continue; const q = R.a + i / STORM.n * Math.PI * 2; pts.push({ x: R.x + Math.cos(q) * R.r, y: R.y + Math.sin(q) * R.r * 0.8, q }); }
    return pts;
  }
  /**
   * SEEDFALL: he slams the maul into the earth; his crown shakes loose a shower of glowing seeds that drift down over
   * the clearing, swaying - wherever one lands, a thorn root bursts up a moment later.
   */
  atk_seeds(match, a) {
    const j = this.joints(), w = this.sp(SEED.wind);
    if (a.t < w) { this.aim('over', 0.2); return false; }
    if (a.t === w) {
      this.aim('down', 0.6); sfx('bighit', 1, 0.6); sfx('rumble', 0.8, 0.8); match.shake(10, 14);
      const n = SEED.n[this.boss.phase - 1], tg = this.nearest(match, j.head.x);
      for (let i = 0; i < n; i++) { const tx = i === 0 && tg ? tg.x : (Math.random() * 2 - 1) * 250; this.seeds = (this.seeds || []).concat([{ x: j.head.x + (Math.random() - 0.5) * 60, y: j.head.y - 60, vx: (tx - j.head.x) / 70, vy: -3 - Math.random() * 2, tx, p: Math.random() * 6, id: this.sid('seed') }]); }
    }
    this.aim('down', 0.2);
    return a.t > w + 40;
  }
  /** The seeds: tossed up out of his crown, then drifting down, swaying, onto the floor - a thorn root where each lands. */
  stepSeeds(match, out) {
    for (const s of this.seeds || []) {
      s.t = (s.t || 0) + 1;
      if (s.vy < SEED.fall) s.vy += 0.12; s.x += s.vx + Math.sin(s.t * 0.08 + s.p) * SEED.sway * 0.5; s.vx *= 0.97; s.y += s.vy;
      if (s.t > 20) out.push(this.bhit(s.id, s.x - 7, s.y - 7, s.x + 7, s.y + 7, ...SEED.ball));
      if (s.y >= -4) { s.dead = true; this.spike(Math.max(-255, Math.min(255, s.x)), SEED.delay, SEED.hit, 'seed'); sfx('land', 0.3, 1.4); for (let i = 0; i < 6; i++) match.particles.push({ x: s.x, y: -4, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 18, color: GOLD[i % 3], size: 2, grav: 0.1 }); }
    }
    this.seeds = (this.seeds || []).filter((s) => !s.dead);
  }

  // ------------------------------------------------------------------ drawing
  /** One blossom: five petals round a gold heart (r = size). */
  blossom(g, x, y, r, col, rot = 0) {
    for (let i = 0; i < 5; i++) { const q = rot + i / 5 * Math.PI * 2; g.fillStyle(OUT, 1); g.fillCircle(x + Math.cos(q) * r * 0.7, y + Math.sin(q) * r * 0.7, r * 0.62); }
    for (let i = 0; i < 5; i++) { const q = rot + i / 5 * Math.PI * 2; g.fillStyle(col, 1); g.fillCircle(x + Math.cos(q) * r * 0.7, y + Math.sin(q) * r * 0.7, r * 0.5); }
    g.fillStyle(PETAL[3], 1); g.fillCircle(x, y, r * 0.38); g.fillStyle(0xffffff, 0.8); g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.14);
  }
  /**
   * IN BLOOM, behind his helm and over his armour (drawKnight calls it before the head): a great crown of branches
   * growing up out of the antlers, hung with leaves and blossoms; gold-green light in the armour's seams; blossoms
   * all over him. k = 0..1 (growing in during THE BLOOM).
   */
  drawBloomBody(g, j, d) {
    const E = this.eld, k = E ? E.k : 0; if (k <= 0) return;
    const t = this.t, h = j.head, tilt = this.kn.p.lean + this.kn.p.head, HK = 1.45;
    const H = (lx, ly) => { lx *= HK; ly *= HK; const c = Math.cos(tilt), s = Math.sin(tilt); return { x: h.x + (lx * c - ly * s) * d, y: h.y + lx * s + ly * c }; };
    g.fillStyle(GOLD[0], 0.12 * k); g.fillCircle(h.x, h.y - 50 * k, 90 * k);                                   // the crown's glow
    const br = [];
    for (const side of [-1, 1]) for (let b = 0; b < 3; b++) {                                                // the crown: branches up and out
      const base = H(side * (6 + b * 4), -30), ang = -Math.PI / 2 + side * (0.35 + b * 0.38), L = (46 + (2 - b) * 16) * k;
      const mid = { x: base.x + Math.cos(ang) * L * 0.55 * d, y: base.y + Math.sin(ang) * L * 0.55 }, tip = { x: base.x + Math.cos(ang + side * 0.25) * L * d, y: base.y + Math.sin(ang + side * 0.25) * L + Math.sin(t * 0.04 + b) * 2 };
      const tw = { x: mid.x + Math.cos(ang - side * 0.7) * L * 0.4 * d, y: mid.y + Math.sin(ang - side * 0.7) * L * 0.4 };
      for (const [lw, c] of [[7, OUT], [4, 0x7a5c38]]) { g.lineStyle(lw, c, 1); g.lineBetween(base.x, base.y, mid.x, mid.y); g.lineBetween(mid.x, mid.y, tip.x, tip.y); g.lineBetween(mid.x, mid.y, tw.x, tw.y); }
      g.lineStyle(0); br.push(tip, tw);
    }
    br.forEach((p, i) => { g.fillStyle(i % 2 ? 0x6ab840 : 0x48902e, 1); g.fillEllipse(p.x - 6, p.y + 3, 12, 6); if (i % 3 !== 2) this.blossom(g, p.x, p.y, (5 + (i % 2) * 2) * k, PETAL[i % 3], t * 0.01 + i); });
    const seam = 0.5 + 0.5 * Math.sin(t * 0.08);                                                              // light in the armour's seams
    g.lineStyle(2, GOLD[1], (0.5 + 0.4 * seam) * k);
    for (const [a, b] of [[j.hip, j.chest], [j.s1, j.e1], [j.hip, j.kn1], [j.s2, j.e2]]) { const m = { x: (a.x + b.x) / 2 + 5, y: (a.y + b.y) / 2 }; g.lineBetween(a.x, a.y, m.x, m.y); g.lineBetween(m.x, m.y, b.x, b.y); }
    g.lineStyle(0);
    const spots = [[j.chest, -18, 6], [j.chest, 14, 22], [j.hip, -20, -12], [j.hip, 22, -26], [j.kn1, 6, -6], [j.kn2, -4, -8], [j.e2, 0, -6], [j.s1, -8, -20], [j.e1, 4, -4]];
    spots.forEach(([p, ox, oy], i) => { if (i / spots.length < k * 1.2) this.blossom(g, p.x + ox * d, p.y + oy, 6 + (i % 3), PETAL[i % 3], i + t * 0.005); });
  }
  /** In front: THE BLOOM's roots climbing him and its flash, PETAL STORM's rings, the seeds. */
  drawBloomFx(x) {
    const t = this.t, E = this.eld;
    if (E && E.roots > 0 && this.boss) {
      const j = this.joints();
      for (let i = 0; i < 6; i++) {
        const sx = j.hip.x + (i - 2.5) * 22, top = { x: lerp(sx, j.chest.x + (i - 2.5) * 8, 0.8), y: lerp(0, j.head.y + 20, E.roots * (0.6 + (i % 3) * 0.15)) }, pts = [];
        for (let q = 0; q <= 10; q++) { const k = q / 10; pts.push({ x: lerp(sx, top.x, k) + Math.sin(k * 7 + i + t * 0.1) * 8, y: lerp(0, top.y, k) }); }
        for (const [lw, c] of [[9, OUT], [6, 0x5a3c20], [2, 0x7a5430]]) { x.lineStyle(lw, c, 1); for (let q = 1; q < pts.length; q++) x.lineBetween(pts[q - 1].x, pts[q - 1].y, pts[q].x, pts[q].y); }
        x.lineStyle(0);
      }
    }
    if (this.whiteK > 0 && this.boss) { const j = this.joints(); x.fillStyle(0xfff8e0, 0.6 * this.whiteK); x.fillCircle(j.chest.x, j.chest.y, 60 + (1 - this.whiteK) * 260); }
    for (const R of this.rings || []) { x.lineStyle(2, 0xffb8d8, 0.25); x.strokeEllipse(R.x, R.y, R.r * 2, R.r * 1.6); x.lineStyle(0); }   // each ring's path, faintly
    for (const R of this.rings || []) for (const p of this.ringPts(R)) {
      const sp = p.q * 2 + t * 0.25, c = Math.cos(sp), sn = Math.sin(sp), col = PETAL[(Math.floor(p.q * 3) + 3) % 3];
      x.fillStyle(0xff8ac0, 0.25); x.fillCircle(p.x, p.y, 13);
      x.fillStyle(OUT, 1); x.fillPoints([{ x: p.x + c * 11, y: p.y + sn * 11 }, { x: p.x - sn * 6, y: p.y + c * 6 }, { x: p.x - c * 9, y: p.y - sn * 9 }, { x: p.x + sn * 6, y: p.y - c * 6 }], true);
      x.fillStyle(col, 1); x.fillPoints([{ x: p.x + c * 9, y: p.y + sn * 9 }, { x: p.x - sn * 4.5, y: p.y + c * 4.5 }, { x: p.x - c * 7, y: p.y - sn * 7 }, { x: p.x + sn * 4.5, y: p.y - c * 4.5 }], true);
      x.fillStyle(0xffffff, 0.8); x.fillCircle(p.x + c * 3, p.y + sn * 3, 1.6);
    }
    for (const s of this.seeds || []) { x.fillStyle(GOLD[0], 0.3 + 0.15 * Math.sin(t * 0.3 + s.p)); x.fillCircle(s.x, s.y, 16); x.fillStyle(OUT, 1); x.fillEllipse(s.x, s.y, 13, 16); x.fillStyle(GOLD[1], 1); x.fillEllipse(s.x, s.y, 9, 12); x.fillStyle(0xffffff, 0.8); x.fillCircle(s.x - 2, s.y - 3, 2); x.fillStyle(0x48902e, 1); x.fillTriangle(s.x, s.y - 4, s.x + 5, s.y - 9, s.x + 1, s.y - 6); }
  }
}
