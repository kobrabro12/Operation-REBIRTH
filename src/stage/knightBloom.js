// THORNWARD IN BLOOM - THORNWARD's second form (the boss fight in THE ELDER GROVE, knightBossStage.js) - and the new
// attacks of both his forms.
// At half health the grove claims him: he sinks to one knee, his soul pops out of the visor in a panic (HUH?! WHAT'S
// THE GROVE DOING?!), roots surge up out of the floor and wind round him - and in a white flash he BLOOMS into THE
// ELDER (`drawElder`): the armour falls away to a body of living heartwood with gold sap glowing in its veins and a
// burning heart-knot in his chest, willow strands hanging from his shoulders like a cloak, root-feet that grip the
// floor, a carved bone-pale stag mask with his soul's light in its eyes (split open once he's BERSERK, the soul inside),
// great antlers in blossom, a whole flowering tree-crown of a canopy over him hung with glowing lantern-fruit, a maul
// that's a living burl in flower, and a shield that's a slice of an ancient trunk, its rings round a glowing flower.
// The grove goes gold, petals drift down. A cutscene when a player is watching (SECOND FORM name card), else at once.
// His armoured form's own new attacks (gone once he blooms):
//   VINE HOOK - a thorned vine lashes out of his shield arm, hooks you and YANKS you back to him - into a maul slam.
//   ROOT CAGE - roots rise round each player in two twisting walls, curl over - and snap shut. Get out before they close.
// IN BLOOM (his armour still can't be hurt - hit the soul; BERSERK still comes below 25%) he fights with:
//   PETAL STORM - petals swirl in round him, then burst out in three spinning rings of razor petals, each with a gap.
//   SEEDFALL - a maul slam shakes glowing seeds out of his crown; a thorn root bursts up wherever one lands.
//   GREAT OAK - roots glow under you, then a whole oak tree bursts up out of the floor there, its crown flinging acorns.
//   STAG RUSH - he lowers his antlers and charges the length of the clearing like a stag, skids, turns, charges back.
// This class's methods are mixed into KnightBossStage (the loop at the bottom of knightBossStage.js; a name may only
// exist once across them).
import { sfx } from '../audio/sfx.js';
import { BossArena } from './bossBase.js';

const PETAL = [0xffb8d8, 0xff8ac0, 0xfff0f6, 0xffd860];
const GOLD = [0xc8f070, 0xf0ffa0, 0xfff4c0];
// THE ELDER's colours: heartwood (dark to light), leaves, gold sap, the bone-pale mask, a slice of trunk
const WOOD = [0x140c06, 0x2e1c0e, 0x4a3018, 0x6a4826, 0x8c6638];
const LEAF = [0x143412, 0x1f5418, 0x347a24, 0x52a434, 0x86cc4c];
const SAP = [0xffb830, 0xffe07a, 0xfff8d8];
const MASK = [0x6e5e44, 0xa8946c, 0xd8c8a0, 0xf4ead0];
const RING = [0x7a5634, 0xb08458, 0xd6ae7c];
// his canopy: leaf clumps [x, y, radius] round its middle, blossoms on it, lantern-fruit hanging under it
const CANOPY = [[-118, 26, 26], [118, 26, 26], [-96, -2, 36], [96, -2, 36], [-60, -30, 42], [60, -30, 42], [-18, -46, 44], [22, -44, 42], [-70, 18, 36], [70, 18, 36], [-30, 4, 46], [30, 4, 46], [0, 26, 40], [-104, 38, 22], [104, 38, 22]];
const BLOOMS = [[-96, -16], [-58, -52], [-12, -70], [34, -64], [76, -38], [104, 0], [-110, 26], [-40, -14], [18, -22], [58, 4], [-70, 22], [88, 28], [0, 16], [-24, 36]];
const LANTERNS = [[-84, 44], [-30, 56], [34, 58], [86, 46]];
const OUT = 0x0a120c;
// where it starts (part of his health); the cutscene's beats (frames): kneel, the soul pops out, the roots climbing,
// the bloom, the crown growing, standing up, the soul's last word, the whole length
const ELDER = { at: 0.5, kneel: 26, soul: 40, roots: [36, 132], bloom: 140, grow: [140, 214], rise: [150, 214], say: 222, n: 262 };
// PETAL STORM: the gathering (frames), rings, frames between them, petals per ring, the gap (petals), ring speed, hit
const STORM = { gather: 46, rings: 3, every: 34, n: 20, gap: 5, speed: 2.8, max: 430, hit: [5, [55, 4.2, 0.45]] };
// SEEDFALL: the wind-up, seeds (BERSERK too), how they drift (fall speed, sway), the root's delay after landing, its hit
// VINE HOOK (his armoured form): wind-up, the vine's flight out and back, how far it reaches, its hit (pulls you in:
// angle > 90 = back toward him), and the maul slam it pulls you into
const HOOK = { wind: 28, shoot: 14, back: 14, reach: 300, hit: [6, [160, 5.6, 0.2]], slam: [10, [55, 5.6, 0.8]] };
// ROOT CAGE (his armoured form): the warning, the walls rising, how long they hold while curling over, half its
// width, its height, the snap's hit
const CAGE = { warn: 42, rise: 10, hold: 46, w: 62, h: 150, hit: [10, [85, 5.6, 0.8]] };
// GREAT OAK (IN BLOOM): the warning, the tree's rise, how long it stands, sinking away, its trunk's half-width and
// height, the burst's hit, the acorns' hit
const OAK = { warn: 52, rise: 10, stand: 70, sink: 20, w: 26, h: 220, hit: [10, [88, 5.8, 0.8]], acorn: [5, [70, 4.4, 0.45]] };
// STAG RUSH (IN BLOOM): wind-up, charge speed, the skid at each end, where the clearing ends, its hit
const STAG = { wind: 34, speed: 7, skid: 18, range: 235, hit: [10, [38, 5.8, 0.8]] };
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

  /** Every frame of the fight (from step): starts the bloom at half health; moves the cages and oaks; IN BLOOM, petals drift through the grove. */
  stepBloom(match, out) {
    const B = this.boss; if (!B || B.dying) return;
    if (!this.elder && !this.cut && B.hp <= B.max * ELDER.at && this.soul.st === 'home' && !B.atk) this.startBloom(match);
    this.stepCages(match, out); this.stepOaks(match, out);
    if (!this.elder) return;
    if (this.t % 6 === 0) { const j = this.joints(), q = (Math.random() - 0.5) * 2; match.particles.push({ x: j.head.x + q * 90, y: j.head.y - 70 + Math.abs(q) * 30, vx: 0.4 + Math.random() * 0.4, vy: 0.6 + Math.random() * 0.6, life: 70, color: PETAL[Math.floor(Math.random() * 3)], size: 2 }); }   // petals off his canopy
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
    else { this.aim('idle', 0.06); C.shot = t < ELDER.grow[1] ? { x: j.chest.x, y: j.head.y - 40, zoom: 1.15 } : { x: j.chest.x * 0.6, y: -150, zoom: 1 }; }
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
    const base = phase === 1 ? ['slam', 'grasp', 'charge', 'volley'] : ['slam', 'grasp', 'charge', 'volley', 'fury'];
    return base.concat(['petals', 'seeds', 'oak', 'stag']);
  }
  start_petals() { this.tally(); } start_seeds() { this.tally(); } start_oak() { this.tally(); } start_stag() { this.tally(); } start_hook() { this.tally(); } start_cage() { this.tally(); }
  /** Whether he's drawn as THE ELDER: IN BLOOM, or THE BLOOM's cutscene past its flash. */
  elderLook() { return !!this.elder || !!(this.cut && this.cut.kind === 'bloom' && this.cut.t >= ELDER.bloom); }

  /**
   * VINE HOOK (his armoured form): a thorned vine coils round his shield arm, lashes out at you - and if it hooks
   * you, YANKS you back to him, straight into a maul slam.
   */
  atk_hook(match, a, out) {
    const D = this.kn, w = this.sp(HOOK.wind), f = a.t - w;
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; sfx('whoosh', 0.5, 1.4); }
    if (a.t < w) {
      this.aim('guard', 0.2); const tg = this.nearest(match, D.x);
      if (tg) { a.tx = Math.max(-262, Math.min(262, tg.x)); a.ty = Math.min(-12, tg.y - 22); D.dir = Math.sign(tg.x - D.x) || D.dir; } else { a.tx = D.x + D.dir * 200; a.ty = -40; }
      return false;
    }
    const j = this.joints(), h = { x: j.h2.x + D.dir * 8, y: j.h2.y };
    if (f === 0) { const dx = a.tx - h.x, dy = a.ty - h.y, L = Math.hypot(dx, dy) || 1; a.ux = dx / L; a.uy = dy / L; a.L = Math.min(HOOK.reach, L + 30); a.dir = Math.sign(dx) || D.dir; sfx('whoosh', 1, 0.9); }
    if (f < HOOK.shoot + HOOK.back) {
      const k = f < HOOK.shoot ? (f + 1) / HOOK.shoot : 1 - (f - HOOK.shoot) / HOOK.back, tip = { x: h.x + a.ux * a.L * k, y: h.y + a.uy * a.L * k };
      this.vine = { a: h, b: tip, k };
      if (f < HOOK.shoot + 3) out.push(this.bhit('hk' + a.id, tip.x - 20, tip.y - 20, tip.x + 20, tip.y + 20, ...HOOK.hit, { dirX: a.dir }));
      if (f === HOOK.shoot) sfx('slash', 0.7, 1.2);
      this.aim('guard', 0.3); return false;
    }
    this.vine = null;
    const g = f - HOOK.shoot - HOOK.back, up = this.sp(12);
    if (g < up) { this.aim('over', 0.3); return false; }
    if (g < up + 7) { this.aim('down', 0.55); this.maulHits(out, 'hks' + a.id, HOOK.slam); if (g === up) sfx('slash', 0.9, 0.6); return false; }
    if (g === up + 7) { sfx('bighit', 1, 0.55); match.shake(9, 10); this.burst(match, j.tip.x, -4, [LEAF[2], LEAF[3], WOOD[3]], 14); }
    this.aim('down', 0.15);
    return g > up + 40;
  }
  /** ROOT CAGE (his armoured form): roots glow round every player, rise in two twisting walls, curl over and snap shut. */
  atk_cage(match, a) {
    if (a.t === 1) { sfx('rumble', 0.9, 0.8); match.shake(4, 20); for (const f of match.fighters) if (f.alive && f.state !== 'respawn' && this.cages.length < 3) this.cages.push({ x: Math.max(-200, Math.min(200, f.x)), t: 0, id: this.sid('cage') }); }
    this.aim('grasp', 0.15);
    return a.t > 20 && !this.cages.length;
  }
  /** The cages: warning, rising, curling over, the snap (its hit), withering away. */
  stepCages(match, out) {
    this.cages = this.cages || [];
    const W = this.sp(CAGE.warn), snap = W + CAGE.rise + this.sp(CAGE.hold);
    for (const c of this.cages) {
      c.t++;
      if (c.t === W) { sfx('geyser', 0.7, 1.2); match.shake(4, 6); this.burst(match, c.x - CAGE.w, -4, [WOOD[3], LEAF[2]], 8); this.burst(match, c.x + CAGE.w, -4, [WOOD[3], LEAF[2]], 8); }
      if (c.t === snap - 12) sfx('whoosh', 0.7, 0.7);
      if (c.t >= snap && c.t < snap + 6) out.push(this.bhit(c.id, c.x - CAGE.w + 8, -CAGE.h, c.x + CAGE.w - 8, 0, ...CAGE.hit, { radial: true }));
      if (c.t === snap) { sfx('bighit', 0.9, 0.7); sfx('slash', 0.7, 0.8); match.shake(8, 10); this.burst(match, c.x, -CAGE.h * 0.7, [WOOD[3], LEAF[3], LEAF[2]], 16); }
    }
    this.cagesSnap = snap; this.cagesWarn = W;
    this.cages = this.cages.filter((c) => c.t < snap + 22);
  }
  /** GREAT OAK (IN BLOOM): roots glow under each target, then a whole oak bursts up out of the floor there. */
  atk_oak(match, a) {
    this.aim('pose', 0.15);
    if (a.t === 1) {
      sfx('summon', 0.9, 0.8); const tg = this.nearest(match, this.kn.x), xs = [tg ? tg.x : 0];
      if (this.boss.phase === 2) xs.push(-Math.sign(xs[0] || 1) * (90 + Math.random() * 120));
      for (const x of xs) this.oaks.push({ x: Math.max(-232, Math.min(232, x)), t: 0, id: this.sid('oak') });
      match.popText({ x: this.joints().head.x, y: this.joints().head.y - 70 }, 'GROW!', '#c8f070');
    }
    return a.t > 50;
  }
  /** The oaks: warning roots, the burst upward (its hit), the crown flinging acorns, standing, sinking away; the acorns bouncing. */
  stepOaks(match, out) {
    this.oaks = this.oaks || []; this.acorns = this.acorns || [];
    const W = this.sp(OAK.warn);
    for (const o of this.oaks) {
      o.t++; const f = o.t - W;
      o.h = f < 0 ? 0 : f < OAK.rise ? OAK.h * (f / OAK.rise) : f < OAK.rise + OAK.stand ? OAK.h : OAK.h * Math.max(0, 1 - (f - OAK.rise - OAK.stand) / OAK.sink);
      if (f === 0) { sfx('bighit', 1, 0.5); sfx('geyser', 0.8, 0.9); match.shake(10, 12); this.burst(match, o.x, -4, [WOOD[3], LEAF[2], LEAF[3]], 18); }
      if (f >= 0 && f < OAK.rise + 4) out.push(this.bhit(o.id, o.x - OAK.w - 6, -o.h, o.x + OAK.w + 6, 0, ...OAK.hit));
      if (f === OAK.rise) {
        sfx('shing', 0.7, 0.8);
        for (let i = 0; i < 24; i++) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: o.x + Math.cos(q) * 50, y: -OAK.h - 30 + Math.sin(q) * 34, vx: Math.cos(q) * 3, vy: Math.sin(q) * 2 - 1, life: 40, color: i % 3 ? LEAF[3] : PETAL[i % 2], size: 3, drag: 0.95 }); }
        for (let i = 0; i < 4; i++) this.acorns.push({ x: o.x + (i - 1.5) * 18, y: -OAK.h - 10, vx: (i - 1.5) * 2.2, vy: -3 - Math.random() * 2, b: 0, a: 0, id: this.sid('acorn') });
      }
    }
    this.oaks = this.oaks.filter((o) => o.t < W + OAK.rise + OAK.stand + OAK.sink);
    for (const c of this.acorns) {
      c.vy += 0.35; c.x += c.vx; c.y += c.vy; c.a += c.vx * 0.1;
      out.push(this.bhit(c.id, c.x - 9, c.y - 9, c.x + 9, c.y + 9, ...OAK.acorn, { radial: true }));
      if (c.y >= -8) { if (c.b < 1) { c.y = -8; c.vy = -c.vy * 0.5; c.b++; sfx('land', 0.4, 1.3); } else c.dead = true; }
      if (Math.abs(c.x) > 300) c.dead = true;
    }
    this.acorns = this.acorns.filter((c) => !c.dead);
  }
  /** STAG RUSH (IN BLOOM): he lowers his antlers and charges the length of the clearing, skids, turns and charges back. */
  atk_stag(match, a, out) {
    const D = this.kn, w = this.sp(STAG.wind);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; a.leg = 0; a.skid = 0; a.to = D.dir * STAG.range; }
    if (a.t < w) {
      this.aim('volley', 0.2); D.p.head = 0.75;
      if (a.t % 8 === 0) { sfx('land', 0.4, 0.7); match.particles.push({ x: D.x - D.dir * 20, y: -4, vx: -D.dir * 2.5, vy: -1, life: 18, color: WOOD[3], size: 3 }); }
      if (a.t === w - 10) { sfx('roar', 0.8, 1.2); match.popText({ x: D.x, y: this.joints().head.y - 60 }, 'HRRRAAH!', '#c8f070'); }
      return false;
    }
    if (a.leg >= 2) { this.aim('idle', 0.1); return true; }
    if (a.skid > 0) {
      a.skid--; this.aim('volley', 0.2); if (a.skid % 3 === 0) match.particles.push({ x: D.x + D.dir * 20, y: -4, vx: D.dir * 2, vy: -1.5, life: 18, color: WOOD[3], size: 3 });
      if (!a.skid) { a.leg++; D.dir = -D.dir; a.to = D.dir * STAG.range; if (a.leg < 2) sfx('roar', 0.6, 1.3); }
      return false;
    }
    const done = this.walkTo(a.to, STAG.speed * (this.boss.phase === 2 ? 1.15 : 1));
    this.aim('volley', 0.4); D.p.head = 0.8;
    const j = this.joints(), fx = j.head.x + D.dir * 26;
    out.push(this.bhit('sg' + a.id + a.leg, Math.min(j.hip.x, fx) - 30, j.head.y - 50, Math.max(j.hip.x, fx) + 30, 0, ...STAG.hit, { dirX: D.dir }));
    if (a.t % 3 === 0) match.particles.push({ x: j.head.x - D.dir * 30, y: j.head.y - 40 + Math.random() * 30, vx: -D.dir * 2, vy: -0.5, life: 30, color: PETAL[a.t % 3], size: 3 });
    if (a.t % 10 === 0) { sfx('land', 0.5, 0.6); match.shake(2, 4); }
    if (done) { a.skid = STAG.skid; sfx('bighit', 0.6, 0.9); match.shake(6, 8); }
    return false;
  }
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
   * THE ELDER (IN BLOOM), painted at full size from rawJoints on the layer render scales round his feet: his canopy and
   * the branches up into it, a willow cloak, heartwood limbs with gold sap veins and root-feet, the heartwood body with
   * its burning heart-knot and what's left of his armour, the stag mask (split, the soul showing, when BERSERK) under
   * antlers in blossom, the flowering burl maul and the tree-ring shield. `eld.k` (0..1) grows the canopy and antlers in.
   */
  drawElder(g, flash) {
    const j = this.rawJoints(), D = this.kn, d = D.dir, t = this.t, gk = this.eld ? Math.max(0.05, this.eld.k) : 1;
    const W = flash ? [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff] : WOOD, berserk = this.boss && this.boss.phase === 2, pulse = 0.65 + 0.35 * Math.sin(t * 0.09);
    const quad = (a, b, wa, wb) => { const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; return [{ x: a.x + nx * wa, y: a.y + ny * wa }, { x: b.x + nx * wb, y: b.y + ny * wb }, { x: b.x - nx * wb, y: b.y - ny * wb }, { x: a.x - nx * wa, y: a.y - ny * wa }]; };
    const limb = (a, b, wa, wb, cols) => {
      g.fillStyle(OUT, 1); g.fillPoints(quad(a, b, wa + 2.5, wb + 2.5), true); g.fillStyle(cols[0], 1); g.fillPoints(quad(a, b, wa, wb), true);
      g.fillStyle(cols[1], 1); g.fillPoints(quad(a, b, wa * 0.45, wb * 0.45).slice(0, 2).concat(quad(a, b, wa * 0.1, wb * 0.1).slice(0, 2).reverse()), true);
      const m = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.1, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.1 };
      g.lineStyle(2, SAP[0], 0.85 * pulse); g.lineBetween(a.x, a.y, m.x, m.y); g.lineBetween(m.x, m.y, b.x, b.y); g.lineStyle(1, SAP[2], 0.6 * pulse); g.lineBetween(m.x - 2, m.y, b.x, b.y);
      g.lineStyle(0); g.fillStyle(OUT, 1); g.fillCircle(b.x, b.y, wb + 2.5); g.fillStyle(cols[0], 1); g.fillCircle(b.x, b.y, wb); g.fillStyle(W[1], 1); g.fillCircle(b.x - 2, b.y + 1, wb * 0.45);   // a knot at the joint
    };
    const branch = (pts, w) => { for (const [lw, c] of [[w + 4, OUT], [w, W[2]], [Math.max(1, w * 0.35), W[3]]]) { g.lineStyle(lw, c, 1); for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); } g.lineStyle(0); };
    const rootFoot = (ft, front) => {
      for (const [ex, ey] of [[-26, 1], [d * 34, 0], [d * 12, 2], [-d * 14, 1]]) branch([{ x: ft.x, y: ft.y - 8 }, { x: ft.x + ex * 0.5, y: ft.y - 3 }, { x: ft.x + ex, y: ft.y + ey }], front ? 5 : 4);
      g.fillStyle(OUT, 1); g.fillEllipse(ft.x, ft.y - 7, 30, 16); g.fillStyle(front ? W[3] : W[2], 1); g.fillEllipse(ft.x, ft.y - 8, 26, 12); g.fillStyle(LEAF[2], 1); g.fillEllipse(ft.x - d * 4, ft.y - 13, 16, 5);
    };
    // the canopy: branches up out of his shoulders and head, then the crown of leaves over them
    const cx = j.head.x - d * 8, cy = j.head.y - 150 * gk + 10, ck = 0.82 * gk, sway = (i) => Math.sin(t * 0.025 + i * 0.9) * 3;
    branch([j.s2, { x: lerp(j.s2.x, cx - 60 * gk, 0.5) - d * 10, y: lerp(j.s2.y, cy, 0.5) }, { x: cx - 56 * ck, y: cy + 10 }], 9);
    branch([j.s1, { x: lerp(j.s1.x, cx + 60 * gk, 0.5) + d * 10, y: lerp(j.s1.y, cy, 0.5) }, { x: cx + 56 * ck, y: cy + 10 }], 9);
    branch([{ x: j.chest.x, y: j.chest.y - 10 }, { x: cx - d * 6, y: lerp(j.chest.y, cy, 0.5) }, { x: cx, y: cy - 10 }], 10);
    const C2 = CANOPY.map(([ox, oy, r], i) => ({ x: cx + ox * ck + sway(i), y: cy + oy * ck, r: r * ck }));
    for (const c of C2) { g.fillStyle(OUT, 1); g.fillCircle(c.x, c.y, c.r + 4); }
    for (const c of C2) { g.fillStyle(LEAF[1], 1); g.fillCircle(c.x, c.y, c.r); }
    for (const c of C2) { g.fillStyle(LEAF[0], 0.8); g.fillEllipse(c.x + 2, c.y + c.r * 0.5, c.r * 1.6, c.r * 0.7); }
    for (const c of C2) { g.fillStyle(LEAF[2], 1); g.fillCircle(c.x - c.r * 0.18, c.y - c.r * 0.24, c.r * 0.7); }
    for (const c of C2) { g.fillStyle(LEAF[3], 1); g.fillCircle(c.x - c.r * 0.3, c.y - c.r * 0.42, c.r * 0.38); g.fillStyle(LEAF[4], 0.8); g.fillCircle(c.x - c.r * 0.38, c.y - c.r * 0.5, c.r * 0.16); }
    LANTERNS.forEach(([ox, oy], i) => {                                                                     // lantern-fruit hanging under it
      const lx = cx + ox * ck + Math.sin(t * 0.03 + i) * 4, ly = cy + oy * ck + 16;
      g.lineStyle(2, OUT, 1); g.lineBetween(cx + ox * ck, cy + oy * ck - 4, lx, ly - 6); g.lineStyle(0);
      g.fillStyle(SAP[0], 0.18 * pulse); g.fillCircle(lx, ly, 16); g.fillStyle(SAP[0], 0.3); g.fillCircle(lx, ly, 9);
      g.fillStyle(OUT, 1); g.fillEllipse(lx, ly, 13, 16); g.fillStyle(SAP[1], 1); g.fillEllipse(lx, ly, 10, 13); g.fillStyle(SAP[2], 1); g.fillCircle(lx - 2, ly - 3, 2.5);
    });
    BLOOMS.forEach(([ox, oy], i) => this.blossom(g, cx + ox * ck + sway(i), cy + oy * ck, (6 + (i % 3)) * Math.min(1, gk * 1.3), PETAL[i % 3], i + t * 0.004));
    // the willow cloak: strands hanging from his shoulders to the floor
    for (let i = 0; i < 13; i++) {
      const q = i / 12, top = { x: lerp(j.s2.x, j.s1.x, q * 0.7) - d * 8, y: lerp(j.s2.y, j.s1.y, q * 0.7) - 4 }, pts = [];
      for (let k = 0; k <= 8; k++) { const kk = k / 8; pts.push({ x: top.x - d * (12 + i * 5) * kk + Math.sin(t * 0.04 + i + kk * 3) * 6 * kk, y: lerp(top.y, D.y - 4 - (i % 3) * 6, kk) }); }
      g.lineStyle(5, OUT, 1); for (let k = 1; k < pts.length; k++) g.lineBetween(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
      g.lineStyle(3, LEAF[i % 2 ? 1 : 2], 1); for (let k = 1; k < pts.length; k++) g.lineBetween(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
      g.lineStyle(0); for (let k = 2; k < pts.length; k += 2) { g.fillStyle(LEAF[3], 1); g.fillEllipse(pts[k].x + 3, pts[k].y, 6, 3); }
      if (i % 4 === 1) this.blossom(g, pts[5].x, pts[5].y, 4, PETAL[i % 3]);
    }
    // the back arm (root-hand) and back leg
    const back = [W[1], W[2]], front = [W[2], W[3]];
    limb(j.hip, j.kn2, 15, 12, back); limb(j.kn2, j.ft2, 12, 9, back); rootFoot(j.ft2, false);
    limb(j.s2, j.e2, 13, 11, back); limb(j.e2, j.h2, 11, 9, back);
    // the body: heartwood with bark grain, the burning heart-knot, moss, a belt of roots
    const waist = { x: lerp(j.hip.x, j.chest.x, 0.38), y: lerp(j.hip.y, j.chest.y, 0.38) };
    g.fillStyle(OUT, 1); g.fillPoints(quad(j.hip, waist, 29, 23), true); g.fillPoints(quad(waist, j.chest, 23, 48), true);
    g.fillStyle(W[2], 1); g.fillPoints(quad(j.hip, waist, 26, 20), true); g.fillPoints(quad(waist, j.chest, 20, 45), true);
    for (let i = 0; i < 3; i++) { const q = 0.5 + i * 0.16, p = { x: lerp(j.hip.x, j.chest.x, q), y: lerp(j.hip.y, j.chest.y, q) }, wd = lerp(22, 44, (q - 0.38) / 0.62); branch([{ x: p.x - wd, y: p.y + 6 }, { x: p.x, y: p.y - 2 }, { x: p.x + wd, y: p.y + 6 }], 3); }   // root-ribs
    g.fillStyle(W[3], 1); g.fillPoints(quad({ x: lerp(j.hip.x, j.chest.x, 0.2) + d * 8, y: lerp(j.hip.y, j.chest.y, 0.2) }, { x: j.chest.x + d * 12, y: j.chest.y }, 8, 18), true);
    for (let i = -2; i <= 2; i++) { const a = { x: j.hip.x + i * 10, y: j.hip.y }, b = { x: j.chest.x + i * 15, y: j.chest.y + 4 }, m = { x: (a.x + b.x) / 2 + Math.sin(i * 2.3) * 5, y: (a.y + b.y) / 2 }; g.lineStyle(2, W[1], 0.9); g.lineBetween(a.x, a.y, m.x, m.y); g.lineBetween(m.x, m.y, b.x, b.y); }
    g.lineStyle(0);
    const hk = { x: lerp(j.chest.x, j.hip.x, 0.32) + d * 4, y: lerp(j.chest.y, j.hip.y, 0.32) };
    g.fillStyle(SAP[0], 0.16 * pulse); g.fillCircle(hk.x, hk.y, 40); g.fillStyle(SAP[0], 0.22); g.fillCircle(hk.x, hk.y, 24);
    for (let i = 0; i < 8; i++) { const q = i / 8 * Math.PI * 2 + t * 0.01; g.lineStyle(2, SAP[1], 0.35 * pulse); g.lineBetween(hk.x + Math.cos(q) * 14, hk.y + Math.sin(q) * 18, hk.x + Math.cos(q) * 30, hk.y + Math.sin(q) * 36); }
    g.lineStyle(0); g.fillStyle(OUT, 1); g.fillEllipse(hk.x, hk.y, 28, 36); g.fillStyle(SAP[0], 1); g.fillEllipse(hk.x, hk.y, 22, 30); g.fillStyle(SAP[1], 1); g.fillEllipse(hk.x, hk.y + 2, 14, 20); g.fillStyle(SAP[2], pulse); g.fillEllipse(hk.x, hk.y + 3, 7, 10);
    for (const s of [-1, 1]) branch([{ x: hk.x + s * 14, y: hk.y - 18 }, { x: hk.x + s * 18, y: hk.y }, { x: hk.x + s * 12, y: hk.y + 18 }], 4);   // roots round the knot
    g.fillStyle(LEAF[2], 1); g.fillEllipse(j.chest.x - d * 12, j.chest.y + 2, 34, 12); g.fillStyle(LEAF[3], 1); g.fillEllipse(j.chest.x - d * 14, j.chest.y, 18, 5);
    g.fillStyle(OUT, 1); g.fillPoints([{ x: j.hip.x - 30, y: j.hip.y - 4 }, { x: j.hip.x + 30, y: j.hip.y - 4 }, { x: j.hip.x + 26, y: j.hip.y + 8 }, { x: j.hip.x - 26, y: j.hip.y + 8 }], true);
    g.lineStyle(3, W[3], 1); g.lineBetween(j.hip.x - 28, j.hip.y - 1, j.hip.x + 28, j.hip.y + 2); g.lineBetween(j.hip.x - 26, j.hip.y + 4, j.hip.x + 26, j.hip.y + 1); g.lineStyle(0);
    // the front leg
    limb(j.hip, j.kn1, 16, 13, front); limb(j.kn1, j.ft1, 13, 10, front); rootFoot(j.ft1, true);
    // the head: antlers in blossom, the stag mask, moss hanging off its jaw
    const h = j.head, tilt = D.p.lean + D.p.head, HK = 1.65, ak = 0.55 + 0.45 * gk;
    const H = (lx, ly) => { lx *= HK; ly *= HK; const c = Math.cos(tilt), s = Math.sin(tilt); return { x: h.x + (lx * c - ly * s) * d, y: h.y + lx * s + ly * c }; };
    const HP = (pts, col) => { g.fillStyle(col, 1); g.fillPoints(pts.map(([x, y]) => H(x, y)), true); };
    for (const side of [-1, 1]) {
      const P = (x, y) => H((side > 0 ? x : -x - 4) * ak, -12 + (y + 12) * ak);
      const base = P(4, -14), mid = P(14, -36), tip = P(10, -62), b1 = P(32, -48), b2 = P(-2, -50), b3 = P(26, -72), b4 = P(44, -36);
      branch([base, mid, tip, b3], side > 0 ? 6 : 5); branch([mid, b1, b4], side > 0 ? 5 : 4); branch([P(9, -28), b2], 4);
      [tip, b1, b3, b4, b2].forEach((p, i) => { g.fillStyle(LEAF[2], 1); g.fillEllipse(p.x - 5, p.y + 4, 12, 6); this.blossom(g, p.x, p.y, (5 + (i % 2)) * Math.min(1, gk * 1.3), PETAL[(i + (side > 0 ? 0 : 1)) % 3], i + t * 0.006); });
      for (let k = 0; k < 3; k++) { const m = P(16 + k * 8, -40 + k * 4); g.lineStyle(2, LEAF[1], 1); g.lineBetween(m.x, m.y, m.x + Math.sin(t * 0.05 + k) * 3, m.y + 14 + k * 4); g.lineStyle(0); }   // moss hanging off them
    }
    const lit = this.soul.st === 'home' ? (this.lit || 1) : 0, bare = this.bare() || (this.boss && this.boss.dying);
    HP([[-14, -18], [10, -19], [17, -9], [16, 6], [11, 18], [4, 25], [-4, 22], [-12, 10], [-16, -5]], OUT);   // the mask: a long, pale stag skull of carved wood
    HP([[-12, -16], [9, -17], [15, -8], [14, 5], [9, 16], [3, 22], [-3, 19], [-10, 9], [-14, -4]], MASK[1]);
    HP([[-10, -15], [8, -15], [12, -8], [10, 2], [4, 14], [-2, 10], [-8, 2], [-11, -6]], MASK[2]);
    HP([[-6, -14], [6, -14], [8, -9], [-4, -9]], MASK[3]);
    HP([[-12, -10], [14, -10], [14, -7], [-12, -7]], MASK[0]);                                              // the carved brow line
    HP([[6, 6], [12, 6], [10, 16], [5, 18]], MASK[0]);                                                      // the muzzle
    if (bare) {                                                                                             // BERSERK: split down the middle, the soul inside
      HP([[-1, -18], [4, -18], [6, 0], [3, 24], [-2, 24], [-4, 2]], OUT);
      const c = H(1, 2); if (!['free', 'gone'].includes(this.soul.st)) this.drawSoul(g, c.x, c.y, 0.55, flash, berserk && t % 50 < 25);
    } else {
      for (const [ex, ey, s] of [[9, -4, 1], [-4, -5, 0.7]]) {
        HP([[ex - 4 * s, ey], [ex, ey - 3 * s], [ex + 4 * s, ey], [ex, ey + 3 * s]], OUT);
        if (lit) { const e = H(ex, ey); g.fillStyle(0x5affb8, 0.25 * pulse); g.fillCircle(e.x, e.y, 10 * s); HP([[ex - 2.6 * s, ey], [ex, ey - 2 * s], [ex + 2.6 * s, ey], [ex, ey + 2 * s]], 0x9affd8); }
      }
    }
    for (const [mx, my] of [[-8, 12], [-3, 18], [3, 22], [8, 20]]) { const m = H(mx, my); g.lineStyle(3, OUT, 1); g.lineBetween(m.x, m.y, m.x + Math.sin(t * 0.06 + mx) * 2, m.y + 14); g.lineStyle(2, LEAF[2], 1); g.lineBetween(m.x, m.y, m.x + Math.sin(t * 0.06 + mx) * 2, m.y + 13); }
    g.lineStyle(0);
    for (const [bx, by, i] of [[-9, -18, 0], [1, -20, 1], [11, -16, 2]]) { const b = H(bx, by); this.blossom(g, b.x, b.y, 5 * Math.min(1, gk * 1.3), PETAL[i], i); }
    // the front shoulder (a cracked pauldron gone to moss and glowing mushrooms), the maul arm, the maul
    const pa = j.s1;
    g.fillStyle(OUT, 1); g.fillEllipse(pa.x, pa.y, 48, 34); g.fillStyle(0x3a4640, 1); g.fillEllipse(pa.x, pa.y, 42, 28); g.fillStyle(0x56665c, 1); g.fillEllipse(pa.x - 4, pa.y - 5, 22, 10);
    g.lineStyle(2, OUT, 1); g.lineBetween(pa.x - 6, pa.y - 12, pa.x + 2, pa.y + 2); g.lineBetween(pa.x + 2, pa.y + 2, pa.x - 2, pa.y + 12); g.lineStyle(0);
    g.fillStyle(LEAF[2], 1); g.fillEllipse(pa.x - d * 4, pa.y - 12, 36, 12); g.fillStyle(LEAF[3], 1); g.fillEllipse(pa.x - d * 6, pa.y - 14, 18, 5);
    for (const [ox, sz] of [[-10, 5], [-2, 7], [7, 4]]) { const mx = pa.x + ox * d, my = pa.y - 16; g.fillStyle(0xe8e0c8, 1); g.fillRect(mx - 1, my - sz, 2, sz); g.fillStyle(0x2ad0c0, 1); g.fillEllipse(mx, my - sz, sz * 2, sz); g.fillStyle(0x8affe8, 0.2 * pulse); g.fillCircle(mx, my - sz, sz * 1.6); }
    limb(j.s1, j.e1, 14, 12, front); limb(j.e1, j.h1, 12, 10, front);
    this.drawElderMaul(g, j.h1, j.tip, W, berserk);
    g.fillStyle(OUT, 1); g.fillCircle(j.h1.x, j.h1.y, 12); g.fillStyle(W[3], 1); g.fillCircle(j.h1.x, j.h1.y, 10);
    // the shield: a slice of an ancient trunk - bark rim, growth rings, a crack, a glowing flower at its heart
    const sx = j.h2.x + d * 10, sy = j.h2.y - 4;
    g.fillStyle(OUT, 1); g.fillCircle(sx, sy, 38); g.fillStyle(W[1], 1); g.fillCircle(sx, sy, 35); g.fillStyle(RING[1], 1); g.fillCircle(sx, sy, 29); g.fillStyle(RING[2], 1); g.fillCircle(sx - 3, sy - 3, 20);
    for (const r of [6, 11, 16, 21, 25]) { g.lineStyle(1.5, RING[0], 0.85); g.strokeCircle(sx + 1, sy + 1, r); }
    g.lineStyle(3, OUT, 1); g.lineBetween(sx + 4, sy - 29, sx + 1, sy - 12); g.lineBetween(sx + 1, sy - 12, sx + 6, sy - 4); g.lineStyle(0);
    for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2; g.fillStyle(W[2], 1); g.fillCircle(sx + Math.cos(q) * 33, sy + Math.sin(q) * 33, 3); }
    g.fillStyle(SAP[0], (berserk ? 0.35 : 0.22) * pulse); g.fillCircle(sx, sy, 16); this.blossom(g, sx, sy, 8, SAP[1], t * 0.01);
    g.fillStyle(LEAF[2], 1); g.fillEllipse(sx - 8, sy - 33, 26, 9); g.fillStyle(LEAF[3], 1); g.fillEllipse(sx - 10, sy - 35, 12, 4);
    this.rootHand(g, j.h2, d);
  }
  /** The root-hand on his shield arm: four twig fingers gripping the shield's rim. */
  rootHand(g, h, d) {
    for (let i = 0; i < 4; i++) { const q = -0.9 + i * 0.6, e = { x: h.x + d * Math.cos(q) * 14, y: h.y + Math.sin(q) * 14 }; g.lineStyle(5, OUT, 1); g.lineBetween(h.x, h.y, e.x, e.y); g.lineStyle(3, WOOD[3], 1); g.lineBetween(h.x, h.y, e.x, e.y); }
    g.lineStyle(0); g.fillStyle(OUT, 1); g.fillCircle(h.x, h.y, 9); g.fillStyle(WOOD[3], 1); g.fillCircle(h.x, h.y, 7);
  }
  /** THE ELDER's maul: a living branch for a haft, sprouting leaves, its head a gnarled burl in flower with sap glowing in its cracks. */
  drawElderMaul(g, a, b, W, glow) {
    for (const [lw, c] of [[12, OUT], [8, W[2]], [3, W[3]]]) { g.lineStyle(lw, c, 1); g.lineBetween(a.x - (b.x - a.x) * 0.15, a.y - (b.y - a.y) * 0.15, b.x, b.y); }
    g.lineStyle(0);
    for (const q of [0.35, 0.65]) { const p = { x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q) }; g.fillStyle(LEAF[3], 1); g.fillEllipse(p.x + 6, p.y - 4, 12, 5); g.fillStyle(LEAF[2], 1); g.fillEllipse(p.x - 6, p.y + 3, 10, 4); }
    const burl = (r) => [0, 0.8, 1.6, 2.3, 3.1, 3.9, 4.7, 5.5].map((q, i) => ({ x: b.x + Math.cos(q) * r * (i % 2 ? 0.84 : 1.08), y: b.y + Math.sin(q) * r * (i % 3 ? 0.9 : 1.06) }));
    g.fillStyle(OUT, 1); g.fillPoints(burl(34), true); g.fillStyle(W[2], 1); g.fillPoints(burl(31), true); g.fillStyle(W[3], 1); g.fillCircle(b.x - 7, b.y - 8, 17); g.fillStyle(W[4], 1); g.fillCircle(b.x - 11, b.y - 12, 6);
    for (const [kx, ky] of [[12, 8], [-14, 10], [6, -14]]) { g.fillStyle(W[1], 1); g.fillEllipse(b.x + kx, b.y + ky, 9, 7); g.fillStyle(OUT, 1); g.fillEllipse(b.x + kx, b.y + ky, 4, 3); }   // knots
    g.lineStyle(2, SAP[0], glow ? 1 : 0.8); g.lineBetween(b.x - 20, b.y + 4, b.x - 6, b.y + 10); g.lineBetween(b.x - 6, b.y + 10, b.x + 4, b.y + 22); g.lineBetween(b.x + 10, b.y - 20, b.x + 18, b.y - 4); g.lineStyle(0);
    g.fillStyle(LEAF[2], 1); g.fillEllipse(b.x + 2, b.y - 24, 38, 12); g.fillStyle(LEAF[3], 1); g.fillEllipse(b.x, b.y - 26, 20, 5);
    this.blossom(g, b.x + 10, b.y - 26, 8, PETAL[0], this.t * 0.01); this.blossom(g, b.x - 12, b.y - 22, 6, PETAL[2], 1);
    if (glow) { g.fillStyle(SAP[0], 0.25); g.fillCircle(b.x, b.y, 36); }
  }
  /** In front: THE BLOOM's roots climbing him and its flash, VINE HOOK's vine, ROOT CAGEs, GREAT OAKs and acorns, PETAL STORM's rings, the seeds. */
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
    if (this.vine) {                                                                                         // VINE HOOK
      const V = this.vine, n = 10, pts = []; for (let i = 0; i <= n; i++) { const q = i / n; pts.push({ x: lerp(V.a.x, V.b.x, q) + Math.sin(q * 9 + t * 0.4) * 4 * (1 - q), y: lerp(V.a.y, V.b.y, q) + Math.sin(q * Math.PI) * 10 * (1 - V.k) }); }
      for (const [lw, c] of [[8, OUT], [5, LEAF[1]], [2, LEAF[3]]]) { x.lineStyle(lw, c, 1); for (let i = 1; i < pts.length; i++) x.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); }
      x.lineStyle(0); pts.forEach((p, i) => { if (i % 2) { x.fillStyle(OUT, 1); x.fillTriangle(p.x - 3, p.y, p.x + 3, p.y, p.x, p.y - 7); x.fillStyle(WOOD[4], 1); x.fillTriangle(p.x - 2, p.y, p.x + 2, p.y, p.x, p.y - 5); } else if (i) { x.fillStyle(LEAF[3], 1); x.fillEllipse(p.x + 4, p.y + 3, 8, 4); } });
      const e = V.b, ux = Math.sign(V.b.x - V.a.x) || 1; x.fillStyle(OUT, 1); x.fillTriangle(e.x - ux * 4, e.y - 9, e.x + ux * 14, e.y - 2, e.x - ux * 4, e.y + 7); x.fillStyle(WOOD[4], 1); x.fillTriangle(e.x - ux * 2, e.y - 6, e.x + ux * 11, e.y - 2, e.x - ux * 2, e.y + 4);   // the hooked thorn
    }
    for (const c of this.cages || []) {                                                                     // ROOT CAGE
      const W = this.cagesWarn || CAGE.warn, snap = this.cagesSnap || W + CAGE.rise + CAGE.hold;
      if (c.t < W) { const k = c.t / W; x.fillStyle(LEAF[3], 0.2 + 0.3 * k * (t % 6 < 3 ? 1 : 0.6)); x.fillEllipse(c.x, -1, CAGE.w * 2 + 20, 8); for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { x.fillStyle(WOOD[3], 1); x.fillTriangle(c.x + sd * CAGE.w - 8 + i * 8, 0, c.x + sd * CAGE.w - 4 + i * 8, 0, c.x + sd * CAGE.w - 6 + i * 8, -6 * k - 2); } continue; }
      const up = Math.min(1, (c.t - W) / CAGE.rise), curl = Math.max(0, Math.min(1, (c.t - W - CAGE.rise) / Math.max(1, snap - W - CAGE.rise))), fade = c.t > snap ? Math.max(0, 1 - (c.t - snap) / 22) : 1;
      for (const sd of [-1, 1]) for (let s = 0; s < 3; s++) {
        const pts = []; for (let i = 0; i <= 12; i++) { const q = i / 12, cq = curl * curl * Math.pow(q, 2.2); pts.push({ x: c.x + sd * (CAGE.w - (CAGE.w - 4) * cq) + Math.sin(q * 7 + s * 2 + t * 0.08) * 5 + (s - 1) * 5 * (1 - cq), y: -CAGE.h * up * q - Math.sin(cq * Math.PI) * 10 }); }
        for (const [lw, col] of [[9, OUT], [6, WOOD[2 + (s % 2)]], [2, WOOD[4]]]) { x.lineStyle(lw, col, fade); for (let i = 1; i < pts.length; i++) x.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); }
        x.lineStyle(0); for (let i = 2; i < pts.length; i += 3) { const p = pts[i]; x.fillStyle(OUT, fade); x.fillTriangle(p.x - 3, p.y, p.x + 3, p.y, p.x - sd * 9, p.y - 3); }
      }
      if (c.t >= snap && c.t < snap + 8) { x.fillStyle(0xffffff, 0.5 * (1 - (c.t - snap) / 8)); x.fillCircle(c.x, -CAGE.h * 0.8, 40); }
    }
    for (const o of this.oaks || []) {                                                                      // GREAT OAK
      const W = this.sp(OAK.warn);
      if (o.t < W) { const k = o.t / W; x.fillStyle(SAP[0], 0.15 + 0.3 * k * (t % 6 < 3 ? 1 : 0.6)); x.fillEllipse(o.x, -1, 70 + 20 * k, 9); for (let i = 0; i < 5; i++) { const q = i / 5 * Math.PI * 2 + t * 0.05; x.fillStyle(PETAL[i % 3], 0.9); x.fillEllipse(o.x + Math.cos(q) * 34 * k, -3 + Math.sin(q) * 4, 5, 3); } continue; }
      const hh = o.h || 0; if (hh <= 2) continue;
      const crown = Math.min(1, (o.t - W) / OAK.rise) * (hh / OAK.h), w = OAK.w;
      x.fillStyle(OUT, 1); x.fillPoints([{ x: o.x - w - 14, y: 2 }, { x: o.x - w * 0.6, y: -hh }, { x: o.x + w * 0.6, y: -hh }, { x: o.x + w + 14, y: 2 }], true);
      x.fillStyle(WOOD[2], 1); x.fillPoints([{ x: o.x - w - 10, y: 0 }, { x: o.x - w * 0.6 + 3, y: -hh }, { x: o.x + w * 0.6 - 3, y: -hh }, { x: o.x + w + 10, y: 0 }], true);
      x.fillStyle(WOOD[3], 1); x.fillPoints([{ x: o.x - w * 0.4, y: 0 }, { x: o.x - w * 0.3, y: -hh }, { x: o.x, y: -hh }, { x: o.x - w * 0.05, y: 0 }], true);
      for (let i = -1; i <= 1; i++) { x.lineStyle(2, WOOD[1], 1); x.lineBetween(o.x + i * 10, -4, o.x + i * 7 + Math.sin(i) * 3, -hh * 0.9); }
      x.lineStyle(0);
      const cy = -hh - 26 * crown;
      for (const [ox, oy, r] of [[-46, 10, 30], [46, 10, 30], [-24, -14, 36], [24, -14, 36], [0, 8, 40]]) { x.fillStyle(OUT, 1); x.fillCircle(o.x + ox * crown, cy + oy * crown, (r + 3) * crown); }
      for (const [ox, oy, r] of [[-46, 10, 30], [46, 10, 30], [-24, -14, 36], [24, -14, 36], [0, 8, 40]]) { x.fillStyle(LEAF[2], 1); x.fillCircle(o.x + ox * crown, cy + oy * crown, r * crown); x.fillStyle(LEAF[3], 1); x.fillCircle(o.x + (ox - 6) * crown, cy + (oy - 8) * crown, r * 0.5 * crown); }
      for (let i = 0; i < 6; i++) this.blossom(x, o.x + Math.cos(i * 1.1) * 40 * crown, cy + Math.sin(i * 1.7) * 18 * crown, 5 * crown, PETAL[i % 3], i);
    }
    for (const c of this.acorns || []) { x.fillStyle(OUT, 1); x.fillEllipse(c.x, c.y, 14, 17); x.fillStyle(WOOD[3], 1); x.fillEllipse(c.x, c.y + 2, 10, 11); x.fillStyle(WOOD[1], 1); x.fillEllipse(c.x, c.y - 4, 13, 7); x.fillStyle(WOOD[4], 1); x.fillCircle(c.x - 2, c.y + 1, 2); }
    for (const s of this.seeds || []) { x.fillStyle(GOLD[0], 0.3 + 0.15 * Math.sin(t * 0.3 + s.p)); x.fillCircle(s.x, s.y, 16); x.fillStyle(OUT, 1); x.fillEllipse(s.x, s.y, 13, 16); x.fillStyle(GOLD[1], 1); x.fillEllipse(s.x, s.y, 9, 12); x.fillStyle(0xffffff, 0.8); x.fillCircle(s.x - 2, s.y - 3, 2); x.fillStyle(0x48902e, 1); x.fillTriangle(s.x, s.y - 4, s.x + 5, s.y - 9, s.x + 1, s.y - 6); }
  }
}
