// HANZ & $@L's three strangest tricks (methods copied onto HanzBossStage at the bottom of hanzBossStage.js; a name
// clash throws on load). Each has its own animation from tools/sprites/hanz_fight.py (`rewind`, `puppet`, `fold`),
// and the moment it happens is that clip's `go` frame.
// - THE REWIND (`rewind`): he winds his hands round each other backwards like a tape. While he winds, the room
//   remembers where everyone goes (`rec`); when his hands fly open time SNAPS BACK - everyone is thrown back to where
//   they stood when he started - and their own pasts replay as red ECHOES (`echoes`) running the same path again,
//   hurting whoever they touch. Don't stand where you've been.
// - THE MARIONETTE (`puppet`): strings of light shoot from his fingertips at you (`strings`). Caught, you dangle and he
//   works you through the air like a puppet; then he YANKS and slams you down into the desk. Hit a string to cut it
//   (STRINGS CUT!), or dodge it before it lands.
// - THE FOLD (`fold`): he grabs the edge of the world in front of him and folds the room over like a sheet of paper
//   (`foldS`). Everyone standing on the desk when the crease comes down is crushed - and whoever stood on the folded
//   half is carried over to the other side, mirrored. Be in the air.
import { sfx } from '../audio/sfx.js';

// THE REWIND: how often a position is remembered (frames), the grace before the echoes start, their size and hit,
// how far into the past they snap you (the start of the winding), the least time between two rewinds (frames)
export const REWIND = { every: 2, grace: 26, w: 26, h: 44, hit: [8, [50, 6, 0.7]], cool: 2000 };
// THE MARIONETTE: when the strings fly (frames into the clip), their speed, how near a string has to pass to catch you,
// how hard you're pulled about, the slam's hit, the least time between two
export const PUPPET = { shoot: 26, v: 11, catch: 30, pull: 0.08, sway: [90, 46], slam: [12, [-75, 7, 0.75]], cool: 2000 };
// THE FOLD: how far each half reaches from the crease, the slam's hit, how long the folded half lies there, its burning
// crease (frames, hit), the least time between two
export const FOLD = { w: 250, hit: [12, [80, 6.5, 0.8]], lie: 40, back: 26, crease: 36, creaseHit: [6, [90, 5, 0.5]], cool: 2000 };
// the least time between any two of these three (frames)
const ODD_GAP = 900;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ODD = { rewind: REWIND, puppet: PUPPET, fold: FOLD };

/** THE REWIND, THE MARIONETTE and THE FOLD (see the top of this file). */
export class HanzOdd {
  /** Which of the three are ready now (each has its own cooldown, and any two are ODD_GAP apart). Returns names. */
  oddReady() {
    this.oddAt = this.oddAt || {};
    if (this.cut || this.t - (this.oddLast ?? -1e9) < ODD_GAP) return [];
    return Object.keys(ODD).filter((n) => this.t - (this.oddAt[n] ?? -1e9) > ODD[n].cool && this.hasAnim(n));
  }
  /** Marks one of them used now. */
  oddUsed(name) { this.oddAt = this.oddAt || {}; this.oddAt[name] = this.t; this.oddLast = this.t; }
  /** The game frame (into the attack) its animation's `go` frame lands on - or whether it's reached it now. */
  atGo(name, a) {
    const spec = this.look(name).spec, go = (spec && spec.go) || 30;
    return this.an.name === name ? this.an.f >= go : a.t >= go * 4 + 8;
  }
  /** His fingertips in this frame (red, grey), in the world (his head if the frame doesn't say). */
  tips() { const fr = this.frame(), h = this.headAt(); return [fr.hand ? this.L(...fr.hand) : h, fr.hand2 ? this.L(...fr.hand2) : h]; }
  /** Every living fighter on the desk's side of the blast zones. */
  livers(match) { return match.fighters.filter((f) => f.alive && f.state !== 'respawn'); }

  // ------------------------------------------------------------------ THE REWIND
  /** He winds his hands backwards; the room starts remembering. */
  start_rewind(match, a) {
    this.oddUsed('rewind'); this.play('rewind'); this.pin = true;
    a.rec = new Map(); a.start = { x: this.hx, y: this.hy }; a.snapped = false;
    for (const f of this.livers(match)) a.rec.set(f, [{ x: f.x, y: f.y, face: f.facing }]);
    this.say('h', 'AGAIN. FROM THE TOP.', 60); sfx('clocktick', 0.7, 0.6); this.rewindK = 0.01;
  }
  /** One frame of THE REWIND: remembering, the snap back, then the echoes running everyone's past. */
  atk_rewind(match, a, out) {
    if (!a.snapped) {
      this.rewindK = Math.min(1, this.rewindK + 0.02);
      if (a.t % REWIND.every === 0) for (const f of this.livers(match)) { const r = a.rec.get(f); if (r) r.push({ x: f.x, y: f.y, face: f.facing }); }
      if (a.t % 12 === 0) sfx('clocktick', 0.4, 1.4 - Math.min(0.6, a.t / 200));
      if (this.atGo('rewind', a) || a.t > 220) {
        a.snapped = a.t; this.echoes = [];
        for (const [f, r] of a.rec) {
          if (!f.alive || f.state === 'respawn' || r.length < 4) continue;
          f.x = r[0].x; f.y = r[0].y; f.vx = 0; f.vy = 0; f.facing = r[0].face || f.facing;
          this.echoes.push({ path: r, i: 0, t: 0, id: this.nid('ec') });
          match.puff(f.x, f.y - 24, 0x7adcff, 10);
        }
        this.hx = a.start.x; this.hy = a.start.y;
        this.flash(0xc8f4ff, 0.7); match.shake(10, 12); sfx('glitch', 0.9, 0.5); sfx('whoosh', 1, 0.4);
        this.popAt(match, this.hx, this.hy - 120, '<< REWIND', '#9ae8ff');
      }
      return false;
    }
    this.rewindK = Math.max(0, this.rewindK - 0.05);
    return !this.echoes.length && a.t - a.snapped > REWIND.grace;
  }
  /** The echoes: each runs its fighter's remembered path again (after a moment's grace), hurting what it touches. */
  stepEchoes(match, push) {
    if (!this.echoes || !this.echoes.length) return;
    for (const e of this.echoes) {
      e.t++;
      if (e.t <= REWIND.grace) continue;
      e.i = Math.min(e.path.length - 1, e.i + 1 / REWIND.every);
      const p = e.path[Math.floor(e.i)];
      if (push) push(this.bhit(e.id, p.x - REWIND.w / 2, p.y - REWIND.h, p.x + REWIND.w / 2, p.y, ...REWIND.hit, { dirX: p.face || 1 }));
      if (e.t % 3 === 0) match.particles.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y - Math.random() * 40, vx: 0, vy: -0.5, life: 14, color: 0xff3a46, size: 2 });
    }
    this.echoes = this.echoes.filter((e) => e.i < e.path.length - 1);
  }

  // ------------------------------------------------------------------ THE MARIONETTE
  /** His hands go up; the strings are about to fly. */
  start_puppet(match, a) {
    this.oddUsed('puppet'); this.play('puppet'); this.pin = true; this.strings = [];
    this.say('s', "LET'S SEE YOU DANCE.", 60); sfx('staff', 0.6, 0.7);
  }
  /** One frame of THE MARIONETTE: the strings fly, catch and pull; the yank and the slam. */
  atk_puppet(match, a, out) {
    const [r, g] = this.tips(), dir = this.face === 'r' ? 1 : -1;
    if (a.t === this.sp(PUPPET.shoot)) {
      const L = this.livers(match).sort((p, q) => Math.abs(p.x - this.hx) - Math.abs(q.x - this.hx)).slice(0, 2);
      L.forEach((f, i) => this.strings.push({ f, from: i ? 1 : 0, x: (i ? g : r).x, y: (i ? g : r).y, tx: f.x, ty: f.y - 26, ph: 'fly', t: 0, id: this.nid('st') }));
      if (L.length === 1) this.strings.push({ f: L[0], from: 1, x: g.x, y: g.y, tx: L[0].x + dir * 30, ty: L[0].y - 50, ph: 'fly', t: 0, id: this.nid('st') });
      sfx('shing', 0.7, 0.6); sfx('laser', 0.4, 2);
    }
    for (const s of this.strings) {
      const h = s.from ? g : r; s.hx = h.x; s.hy = h.y; s.t++;
      if (s.ph === 'fly') {
        const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
        if (d <= PUPPET.v) {
          s.x = s.tx; s.y = s.ty;
          const f = s.f;
          if (f.alive && f.state !== 'respawn' && Math.hypot(f.x - s.x, f.y - 26 - s.y) < PUPPET.catch && !this.strings.some((q) => q !== s && q.f === f && q.ph === 'held')) {
            s.ph = 'held'; this.popAt(match, f.x, f.y - 60, 'CAUGHT!', '#ffe08a'); sfx('clang', 0.5, 1.8); match.puff(f.x, f.y - 26, 0xffe08a, 8);
          } else { s.ph = 'slack'; s.t = 0; }
        } else { s.x += dx / d * PUPPET.v; s.y += dy / d * PUPPET.v; }
      } else if (s.ph === 'held') {
        const f = s.f; if (!f.alive || f.state === 'respawn') { s.ph = 'slack'; s.t = 0; continue; }
        const px = clamp(this.hx + dir * 120 + Math.sin(a.t * 0.07 + s.from * 2) * PUPPET.sway[0], -250, 250), py = -70 + Math.cos(a.t * 0.11 + s.from) * PUPPET.sway[1];
        f.x += (px - f.x) * PUPPET.pull; f.y += (py - f.y) * PUPPET.pull; f.vx *= 0.6; f.vy = Math.min(f.vy, 0) * 0.5;
        s.x = f.x; s.y = f.y - 30;
      } else if (s.ph === 'slack') { s.y += 3; }
    }
    this.strings = this.strings.filter((s) => s.ph !== 'slack' || s.t < 24);
    if (!a.yanked && this.atGo('puppet', a)) {
      a.yanked = a.t;
      for (const s of this.strings) if (s.ph === 'held') {
        const f = s.f; s.ph = 'slack'; s.t = 0; f.y -= 24;
        out.push(this.bhit(this.nid('ys'), f.x - 22, f.y - 60, f.x + 22, f.y + 10, ...PUPPET.slam));
        for (const d of [-1, 1]) this.waves.push({ x: f.x + d * 20, dir: d, v: 5, id: this.nid('yw') });
        this.popAt(match, f.x, f.y - 70, 'YANK!', '#ff3a46');
      }
      sfx('whoosh', 1, 0.6); sfx('bighit', 0.9, 0.7); match.shake(12, 14); this.flash(0xffe08a, 0.25);
    }
    return a.yanked && a.t - a.yanked > 40;
  }
  /** Your hits on a string cut it (MatchScene's player hitboxes, through the cinema's strikeTargets). */
  strikeStrings(match, hbs) {
    for (const s of this.strings || []) {
      if (s.ph !== 'held' && s.ph !== 'fly') continue;
      for (const hb of hbs) {
        if (!hb.owner) continue;
        let cut = false;
        for (let k = 0.1; k < 0.95 && !cut; k += 0.1) { const x = lerp(s.hx ?? s.x, s.x, k), y = lerp(s.hy ?? s.y, s.y, k); cut = x > hb.x1 && x < hb.x2 && y > hb.y1 && y < hb.y2; }
        if (!cut) continue;
        s.ph = 'slack'; s.t = 0; sfx('slash', 0.7, 1.6); this.popAt(match, (hb.x1 + hb.x2) / 2, hb.y1 - 10, 'STRINGS CUT!', '#ffffff'); break;
      }
    }
  }

  // ------------------------------------------------------------------ THE FOLD
  /** He reaches for the edge of the world in front of him. */
  start_fold(match, a) {
    this.oddUsed('fold'); this.play('fold'); this.pin = true;
    const dir = this.face === 'r' ? 1 : -1, c = clamp(this.hx, -120, 120);
    this.foldS = { c, dir, k: 0, ph: 'grab', t: 0 };
    this.say('h', 'THIS PAGE IS FULL.', 60); sfx('rumble', 0.6, 0.9);
  }
  /** One frame of THE FOLD: the flap rising, the crease coming down (crushing, carrying over), the flap lying there,
   *  unfolding back. */
  atk_fold(match, a, out) {
    const F = this.foldS; if (!F) return true; F.t++;
    const spec = this.look('fold').spec, go = (spec && spec.go) || 28, grab = Math.round(go * 0.38);
    if (F.ph === 'grab') {
      if (this.an.name !== 'fold' || this.an.f >= grab) { F.ph = 'lift'; F.t0 = a.t; sfx('petal', 0.8, 0.4); this.popAt(match, F.c + F.dir * 120, -120, 'GET OFF THE DESK!', '#ffffff'); }
    } else if (F.ph === 'lift') {
      const n = Math.max(20, (go - grab) * 4); F.k = Math.min(0.98, ((a.t - F.t0) / n) ** 1.6);
      if (a.t % 10 === 0) sfx('whoosh', 0.3, 0.5 + F.k);
      if (this.atGo('fold', a) || a.t - F.t0 > n + 30) {
        F.ph = 'lie'; F.k = 1; F.t = 0;
        for (const f of this.livers(match)) {
          if (!f.grounded) continue;
          const side = (f.x - F.c) * F.dir;
          if (side > 0 && side < FOLD.w) { f.x = clamp(F.c - side * F.dir, -262, 262); f.facing = -f.facing; match.puff(f.x, f.y - 20, 0xffffff, 8); }
          if (Math.abs(f.x - F.c) < FOLD.w + 4) out.push(this.bhit(this.nid('fd'), f.x - 20, f.y - 50, f.x + 20, f.y + 4, ...FOLD.hit));
        }
        this.flash(0xffffff, 0.6); match.shake(16, 18); sfx('bighit', 1, 0.45); sfx('glass', 0.7, 0.5); sfx('petal', 0.8, 0.3);
        this.impact(match, F.c - F.dir * FOLD.w * 0.5, 0, 1.2);
      }
    } else if (F.ph === 'lie') {
      if (F.t < FOLD.crease) out.push(this.bhit('fc' + a.id, F.c - 8, -340, F.c + 8, 4, ...FOLD.creaseHit));
      if (F.t >= FOLD.lie) { F.ph = 'back'; F.t = 0; sfx('whoosh', 0.6, 0.6); }
    } else if (F.ph === 'back') {
      F.k = 1 - F.t / FOLD.back;
      if (F.t >= FOLD.back) { this.foldS = null; return true; }
    }
    return a.t > 600;
  }

  // ------------------------------------------------------------------ every frame
  /** The echoes run (the other two live inside their attacks). */
  stepOdd(match, out) { this.stepEchoes(match, out ? (h) => out.push(h) : null); if (!this.boss || !this.boss.atk || this.boss.atk.name !== 'rewind') this.rewindK = Math.max(0, (this.rewindK || 0) - 0.05); }
  /** Clears all three (a cutscene, the acts changing). */
  clearOdd() { this.echoes = []; this.strings = []; this.foldS = null; this.rewindK = 0; }

  // ------------------------------------------------------------------ drawing
  /** The tape-rewind tint and its trails, the echoes, the strings, the folding page. */
  drawOdd() {
    const g = this.topG, gl = this.glowG, m = this.midG, t = this.t; if (!g) return;
    const B = this.boss, A = B && B.atk;
    if (this.rewindK > 0) {                                                       // the tape: scanlines, a tint, the trails
      const k = this.rewindK, cam = this.scene.worldCam || this.scene.cameras.main, wv = cam.worldView;
      gl.fillStyle(0x7adcff, 0.08 * k); gl.fillRect(wv.x, wv.y, wv.width, wv.height);
      for (let y = wv.y + ((t * 3) % 6); y < wv.bottom; y += 6) { g.fillStyle(0x000000, 0.12 * k); g.fillRect(wv.x, y, wv.width, 1); }
      if (t % 30 < 3) { const y = wv.y + ((t * 41) % wv.height); g.fillStyle(0xffffff, 0.15 * k); g.fillRect(wv.x, y, wv.width, 4); }
      if (A && A.name === 'rewind' && A.rec && !A.snapped) for (const r of A.rec.values()) {
        for (let i = 0; i < r.length; i += 3) { const p = r[i], q = i / r.length; gl.fillStyle(0x9ae8ff, 0.08 + 0.25 * q); gl.fillEllipse(p.x, p.y - 22, 18, 40); }
      }
    }
    for (const e of this.echoes || []) {                                          // red ghosts of you, running your past
      const p = e.path[Math.floor(e.i)], warm = e.t <= REWIND.grace, a = warm ? (t % 6 < 3 ? 0.25 : 0.6) : 0.85;
      for (let j = 1; j <= 4; j++) { const q = e.path[Math.max(0, Math.floor(e.i) - j * 3)]; gl.fillStyle(0xff3a46, 0.12 * a / j); gl.fillEllipse(q.x, q.y - 22, 22, 44); }
      gl.fillStyle(0xff3a46, 0.45 * a); gl.fillEllipse(p.x, p.y - 24, 40, 62); gl.fillStyle(0xffffff, 0.15 * a); gl.fillEllipse(p.x, p.y - 30, 18, 30);
      g.fillStyle(0x2a0408, 0.75 * a); g.fillEllipse(p.x, p.y - 30, 16, 24); g.fillCircle(p.x, p.y - 46, 7); g.fillRect(p.x - 6, p.y - 20, 4, 20); g.fillRect(p.x + 2, p.y - 20, 4, 20);
      g.lineStyle(2, 0xff6a74, a); g.strokeEllipse(p.x, p.y - 30, 16, 24); g.strokeCircle(p.x, p.y - 46, 7);
      if (warm) { g.lineStyle(1, 0xffffff, 0.6); g.strokeCircle(p.x, p.y - 26, 26 - e.t * 0.6); }          // (a closing ring: it's about to run)
    }
    for (const s of this.strings || []) {                                         // the strings of light
      const hx = s.hx ?? s.x, hy = s.hy ?? s.y, sag = s.ph === 'slack' ? 30 + s.t * 2 : s.ph === 'held' ? 6 * Math.sin(t * 0.3) : 0, mx = (hx + s.x) / 2, my = (hy + s.y) / 2 + sag;
      const a = s.ph === 'slack' ? Math.max(0, 1 - s.t / 24) : 1;
      for (const [w, c, al] of [[5, 0xffe08a, 0.25], [1.5, 0xffffff, 0.95]]) { (w > 2 ? gl : g).lineStyle(w, c, al * a); (w > 2 ? gl : g).beginPath(); (w > 2 ? gl : g).moveTo(hx, hy); for (let i = 1; i <= 8; i++) { const u = i / 8, x = (1 - u) * (1 - u) * hx + 2 * u * (1 - u) * mx + u * u * s.x, y = (1 - u) * (1 - u) * hy + 2 * u * (1 - u) * my + u * u * s.y; (w > 2 ? gl : g).lineTo(x, y); } (w > 2 ? gl : g).strokePath(); }
      if (s.ph === 'fly') { g.fillStyle(0xffffff, 1); g.fillCircle(s.x, s.y, 3); g.lineStyle(1, 0xffe08a, 0.5); g.strokeCircle(s.tx, s.ty, 12 + Math.sin(t * 0.6) * 3); }
      if (s.ph === 'held') { g.lineStyle(2, 0xffe08a, 0.9); g.strokeCircle(s.x, s.y, 7); gl.fillStyle(0xffe08a, 0.3); gl.fillCircle(s.x, s.y, 12); }
    }
    const F = this.foldS; if (F && F.ph !== 'grab') this.drawFold(g, m, gl, F);
  }
  /** The folding page: the half of the room in front of him lifted along the crease and turned over onto the other
   *  half (k 0..1), its back side darker; where it came up from, the blank grid behind the world. */
  drawFold(g, m, gl, F) {
    const k = F.k, top = -330, bot = 40, W = FOLD.w + 40, q = Math.PI * k, ex = F.c + F.dir * W * Math.cos(q), lift = Math.sin(q) * 70;
    const C = { poly: [0xffd0e8, 0x7adcff], drawn: [0xf1e8d4, 0x261a18], void: [0x2a2a34, 0xff2a3a], stars: [0x2a1050, 0xc07aff] }[this.world] || [0xffffff, 0x000000];
    const back = k > 0.5, under = F.c + F.dir * W;
    m.fillStyle(0x050508, 0.92); m.fillRect(Math.min(F.c, under), top, Math.abs(under - F.c), bot - top);   // (the world's missing page)
    m.lineStyle(1, 0xffffff, 0.12); for (let x = 0; x <= W; x += 24) m.lineBetween(F.c + F.dir * x, top, F.c + F.dir * x, bot); for (let y = top; y <= bot; y += 24) m.lineBetween(Math.min(F.c, under), y, Math.max(F.c, under), y);
    const pts = [{ x: F.c, y: top }, { x: ex, y: top - lift * 0.6 }, { x: ex, y: bot - lift }, { x: F.c, y: bot }];
    const dst = back ? g : m, shade = back ? 0.55 : 1 - 0.35 * k;
    dst.fillStyle(C[0], 0.9 * shade + 0.1); dst.fillPoints(pts, true);
    dst.lineStyle(1, C[1], 0.25); for (let i = 1; i < 10; i++) { const u = i / 10; dst.lineBetween(lerp(F.c, ex, u), top - lift * 0.6 * u, lerp(F.c, ex, u), bot - lift * u); }
    dst.lineStyle(2, C[1], 0.8); dst.strokePoints(pts, true);
    gl.fillStyle(0xffffff, 0.15 + 0.25 * Math.sin(q)); gl.fillRect(F.c - 3, top, 6, bot - top);                // (the crease, glowing)
    if (F.ph === 'lift') {                                                        // (the desk on both halves flashes: get off it)
      for (const s of [-1, 1]) { gl.fillStyle(0xff3a46, (0.2 + 0.2 * (Math.floor(this.t / 5) % 2)) * k); gl.fillRect(Math.min(F.c, F.c + s * FOLD.w), -10, FOLD.w, 12); }
    }
  }
}
