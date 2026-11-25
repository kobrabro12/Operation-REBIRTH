// THE ESCAPE - HANZ & $@L's dreamcore dimension (one of THE SHIFT's, hanzLight.js `DIM`) and the one attack he only
// has there, NO EXIT (methods copied onto HanzBossStage at the bottom of hanzBossStage.js; a name clash throws).
// THE ESCAPE: a liminal place you've been in a dream - a pastel sky with clouds too perfect to be real, a smiling
// sun, an endless white-tiled pool room with arches standing in still blue water, a slide into nowhere, a lone EXIT
// sign hanging in the air, and words that fade in: YOU'VE BEEN HERE BEFORE.
// NO EXIT (`doors`): pastel doors rise out of the desk, each with a glowing EXIT sign. He walks into one and it shuts
// (he's gone - `inDoor`). The signs flicker. Under the door he's behind, if you look, his two shoes show in the
// light - one red, one grey. Hit a door: a wrong one bursts open and soaks you with pool water; HIS door throws him
// out DAZED (`dazed`: easy to hurt for a while). Find nothing in time and the doors open one by one - light and
// water out of the wrong ones - and his door last: he lunges out at you. NO EXIT.
import { sfx } from '../audio/sfx.js';
import { VIEW_W, VIEW_H } from '../config.js';

// NO EXIT: how many doors, how far apart, the doors' size; frames to rise, to go in, to hide (before they open on
// their own), between two doors opening; the wrong doors' splash and blast; his lunge; how long he's dazed when
// found (frames) and how much more he's hurt then
export const DOORS = {
  n: 5, gap: 106, w: 34, h: 62, rise: 46, enter: 44, hide: 170, every: 16,
  splash: [7, [70, 5.5, 0.6]], blast: [9, [80, 6, 0.7]], lunge: [16, [40, 7.5, 0.9]], lungeV: 14,
  daze: 150, dazeHurt: 1.6,
};
const lerp = (a, b, k) => a + (b - a) * k;
// the dream's colours
// NO EXIT's water (teaColumn's colours: glow, outside, inside, streaks, foam, outline)
const POOL = [0x8fe4f0, 0x2a9ab8, 0x5cc8dc, 0xe8fcff, 0xffffff, 0x1a4a5a];
const PASTEL = { sky: [0xffd6ea, 0xf4d8ff, 0xd8e4ff, 0xc8f0ff], tile: 0xf6f8fa, grout: 0xc8d4dc, water: 0x8fe4f0, deep: 0x5cc8dc, door: [0xffb8d8, 0xb8e0ff, 0xfff0b0, 0xc8f0c8, 0xe0c8ff], exit: 0x3aff8a };

/** THE ESCAPE's backdrop and NO EXIT. */
export class HanzDream {
  /** NO EXIT is ready: only in THE ESCAPE, once per visit (the visit's own attack - it comes up often there). */
  dreamReady() { return this.dim === 'dream' && !this.dreamUsed && !this.cut ? ['doors', 'doors', 'doors'] : []; }

  // ------------------------------------------------------------------ NO EXIT
  /** The doors rise out of the desk. */
  start_doors(match, a) {
    this.dreamUsed = true; this.pin = true; this.front = true; this.play('pitch');
    const n = DOORS.n, xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * DOORS.gap);
    this.doors = xs.map((x, i) => ({ x, k: 0, open: 0, c: PASTEL.door[i % PASTEL.door.length], id: this.nid('dr'), seen: new Set(), done: false }));
    a.true = Math.floor(Math.random() * n); a.ph = 'rise'; a.t0 = 0; a.order = null;
    this.say('s', "LET'S PLAY A GAME.", 50); sfx('rumble', 0.6, 1.2);
  }
  /** One frame of NO EXIT: rising, him going in, hiding, the doors opening (or him found). */
  atk_doors(match, a, out) {
    const D = this.doors, t = a.t - a.t0; if (!D) return true;
    for (const d of D) if (!d.done) d.k = Math.min(1, d.k + 1 / DOORS.rise);
    if (a.ph === 'rise' && t >= DOORS.rise) { a.ph = 'enter'; a.t0 = a.t; this.say('h', '...FIND US.', 50); this.play('idle'); }
    else if (a.ph === 'enter') {
      const d = D[a.true]; this.hx = lerp(this.hx, d.x, 0.08); this.hy = lerp(this.hy, this.hoverY(), 0.1);
      d.open = Math.min(1, t / 14);
      if (t >= DOORS.enter) { this.gone = true; this.inDoor = true; d.open = 0; a.ph = 'hide'; a.t0 = a.t; sfx('clang', 0.8, 0.6); match.shake(4, 6); }
    } else if (a.ph === 'hide') {
      if (a.found) { this.dazeOut(match, a); return true; }
      if (t >= this.sp(DOORS.hide)) { a.ph = 'open'; a.t0 = a.t; a.order = D.map((_, i) => i).filter((i) => i !== a.true).sort(() => Math.random() - 0.5).concat([a.true]); sfx('warn', 0.7, 0.9); }
    } else if (a.ph === 'open') {
      if (a.found) { this.dazeOut(match, a); return true; }
      const k = Math.floor(t / this.sp(DOORS.every));
      for (let j = 0; j <= Math.min(k, a.order.length - 1); j++) {
        const i = a.order[j], d = D[i]; if (d.open > 0) continue;
        d.open = 0.01;
        if (i === a.true) { this.lungeOut(match, a); return false; }
        this.doorBlast(match, d, out);
      }
    } else if (a.ph === 'lunge') {
      a.lx += a.lv; this.hx = a.lx; this.hy = lerp(this.hy, this.hoverY(), 0.2);
      out.push(this.bhit(a.lid, this.hx - 26, this.hy - 120, this.hx + 26, this.hy + 20, ...DOORS.lunge, { dirX: Math.sign(a.lv) }));
      if (t % 2 === 0) match.particles.push({ x: this.hx, y: this.hy - 50, vx: -a.lv * 0.2, vy: 0, life: 14, color: 0xff9ad8, size: 3 });
      if (t > 26 || Math.abs(this.hx) > 250) { this.sinkDoors(); return true; }
    }
    for (const d of D) if (d.open > 0 && d.open < 1) d.open = Math.min(1, d.open + 0.12);
    return t > 700;
  }
  /** A wrong door bursts open: a column of white light and a wave of pool water out of it, both ways. */
  doorBlast(match, d, out) {
    out.push(this.bhit(d.id + 'b', d.x - 22, -DOORS.h - 40, d.x + 22, 2, ...DOORS.blast));
    for (const s of [-1, 1]) this.cols.push({ kind: 'tea', x: d.x + s * 30, w: 26, warn: 0, live: 14, fade: 10, t: 0, id: this.nid('dw'), hit: DOORS.splash, y1: -40, y2: 4, pal: POOL });
    this.burst(match, d.x, -30, 12, [0xffffff, PASTEL.water, d.c]); this.flash(0xffffff, 0.15); sfx('geyser', 0.6, 1.4); match.shake(4, 6);
  }
  /** Not found: his door opens last and he lunges out of it at the nearest of you. */
  lungeOut(match, a) {
    const d = this.doors[a.true], f = this.nearest(match, d.x), dir = f ? Math.sign(f.x - d.x) || 1 : 1;
    this.gone = false; this.inDoor = false; this.front = false; this.face = dir > 0 ? 'r' : 'l'; this.dashing = true;
    this.hx = d.x; a.lx = d.x; a.lv = dir * DOORS.lungeV; a.lid = this.nid('ln'); a.ph = 'lunge'; a.t0 = a.t;
    this.play('slam'); this.say('s', 'NO EXIT.', 50); sfx('whoosh', 1, 0.5); sfx('bighit', 0.7, 0.8); this.flash(0xff9ad8, 0.3);
  }
  /** Found: he tumbles out of his door dazed - easy to hurt for a while - and the doors sink. */
  dazeOut(match, a) {
    const d = this.doors[a.true];
    this.gone = false; this.inDoor = false; this.hx = d.x; this.dazed = DOORS.daze; this.boss.wait = DOORS.daze;
    this.play('twitch'); this.say('h', '...YOU FOUND US.', 60); this.popAt(match, d.x, -150, 'FOUND HIM!', '#ff9ad8');
    this.burst(match, d.x, -40, 24, [0xff2a3a, 0xd2d0cc, 0xffffff]); sfx('bighit', 0.9, 1.1); match.shake(8, 10);
    this.sinkDoors();
  }
  /** The doors sink back into the desk. */
  sinkDoors() { for (const d of this.doors || []) d.done = true; }
  /** Your hits on a door: a wrong one bursts open on you; his door throws him out. */
  strikeDoors(match, hbs) {
    const B = this.boss, A = B && B.atk; if (!this.doors || !A || A.name !== 'doors') return;
    for (const hb of hbs) {
      if (!hb.owner) continue;
      this.doors.forEach((d, i) => {
        if (d.open > 0 || d.done || d.k < 1 || d.seen.has(hb.id)) return;
        if (hb.x2 < d.x - DOORS.w / 2 || hb.x1 > d.x + DOORS.w / 2 || hb.y2 < -DOORS.h || hb.y1 > 0) return;
        d.seen.add(hb.id);
        if (i === A.true && A.ph === 'hide' || i === A.true && A.ph === 'open') { A.found = true; d.open = 0.01; return; }
        if (A.ph !== 'hide' && A.ph !== 'open') return;
        d.open = 0.01; this.popAt(match, d.x, -90, 'WRONG DOOR', '#8fe4f0');
        for (const s of [-1, 1]) this.cols.push({ kind: 'tea', x: d.x + s * 22, w: 30, warn: 0, live: 12, fade: 10, t: 0, id: this.nid('ds'), hit: DOORS.splash, y1: -40, y2: 4, pal: POOL });
        sfx('geyser', 0.5, 1.6);
      });
    }
  }
  /** Each frame: the dazed timer, the doors sinking away when they're done. */
  stepDream(match) {
    if (this.dazed > 0) { this.dazed--; if (this.boss && !this.boss.atk) this.boss.wait = Math.max(this.boss.wait, Math.min(this.dazed, 200)); if (this.dazed % 20 === 0 && !this.gone) { const h = this.headAt(); this.burst(match, h.x, h.y - 20, 3, [0xffe08a, 0xffffff]); } }
    if (this.doors) { for (const d of this.doors) if (d.done) d.k = Math.max(0, d.k - 0.05); if (this.doors.every((d) => d.done && d.k <= 0)) this.doors = null; }
  }
  /** Clears NO EXIT (a cutscene, an attack cut short): out of his door, the doors gone. */
  clearDream() { if (this.inDoor) { this.inDoor = false; this.gone = false; } this.doors = null; this.dazed = 0; }

  // ------------------------------------------------------------------ drawing
  /** THE ESCAPE (on the dimension layer, screen space): pastel sky, perfect clouds, the smiling sun, the pool room. */
  drawDream(g) {
    const t = this.t, W = VIEW_W, H = VIEW_H, HOR = 196;
    PASTEL.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * HOR / 4, W, HOR / 4 + 1); });
    for (let i = 0; i < 4; i++) { g.fillStyle(0xffffff, 0.22); g.fillRect(0, (i + 1) * HOR / 4 - 3, W, 6); }   // (soft seams between the bands)
    const sx = 470, sy = 70, blink = (t % 300) < 8;                                          // the smiling sun
    g.fillStyle(0xfff6c0, 0.35); g.fillCircle(sx, sy, 46); g.fillStyle(0xfff0a0, 1); g.fillCircle(sx, sy, 30);
    g.fillStyle(0x7a6a50, 1); if (blink) { g.fillRect(sx - 12, sy - 6, 7, 2); g.fillRect(sx + 5, sy - 6, 7, 2); } else { g.fillCircle(sx - 9, sy - 6, 3); g.fillCircle(sx + 9, sy - 6, 3); }
    g.lineStyle(2, 0x7a6a50, 1); g.beginPath(); g.arc(sx, sy + 2, 12, 0.3, Math.PI - 0.3); g.strokePath();
    g.fillStyle(0xff9ab8, 0.6); g.fillCircle(sx - 17, sy + 4, 4); g.fillCircle(sx + 17, sy + 4, 4);
    for (const [cx, cy, s, v] of [[90, 60, 1, 0.08], [250, 40, 0.8, 0.05], [580, 120, 1.2, 0.06], [380, 140, 0.7, 0.1]]) {   // clouds too perfect to be real
      const x = ((cx + t * v) % (W + 160)) - 80;
      g.fillStyle(0xffffff, 1); for (const [dx, dy, r] of [[0, 0, 22], [24, -10, 26], [50, 0, 20], [28, 6, 22]]) g.fillCircle(x + dx * s, cy + dy * s, r * s);
      g.fillStyle(0xe8eeff, 1); g.fillRect(x - 18 * s, cy + 8 * s, 86 * s, 10 * s);
    }
    g.fillStyle(PASTEL.tile, 1); g.fillRect(0, HOR, W, H - HOR);                                 // the pool room: white tiles to the horizon
    const vx = W / 2;
    g.lineStyle(1, PASTEL.grout, 0.9);
    for (let i = -16; i <= 16; i++) g.lineBetween(vx + i * 6, HOR, vx + i * 70, H);
    for (let j = 0; j < 12; j++) { const y = HOR + (H - HOR) * (j / 12) ** 1.8; g.lineBetween(0, y, W, y); }
    for (const [x0, x1, y0, y1] of [[40, 250, 230, 300], [380, 620, 214, 270]]) {               // still blue water, rippling
      g.fillStyle(PASTEL.deep, 1); g.fillRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle(PASTEL.water, 1); g.fillRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6);
      for (let k = 0; k < 9; k++) { const yy = y0 + 8 + ((k * 13 + t * 0.15) % (y1 - y0 - 14)); g.fillStyle(0xffffff, 0.45); g.fillRect(x0 + 10 + ((k * 37) % (x1 - x0 - 50)), yy, 24 + (k % 3) * 8, 1); }
    }
    for (let i = 0; i < 6; i++) {                                                               // arches standing in the water, going nowhere
      const k = 1 - i / 7, x = 120 + i * 28 + i * i * 4, y = HOR + 30 * k, w = 34 * k, h = 70 * k;
      g.fillStyle(0xffffff, 1); g.fillRect(x - w / 2, y - h, w, h); g.fillStyle(0xfff8e8, 1); g.fillRect(x - w / 2 + 4 * k, y - h + 8 * k, w - 8 * k, h - 8 * k);
      g.fillStyle(0xffe8b0, 0.6 + 0.3 * Math.sin(t * 0.03 + i)); g.fillRect(x - w / 2 + 6 * k, y - h + 12 * k, w - 12 * k, h - 12 * k);
    }
    g.lineStyle(3, 0xffb8d8, 1); g.lineBetween(520, 300, 590, 216); g.lineBetween(536, 300, 606, 216); g.fillStyle(0xffb8d8, 1); g.fillRect(588, 200, 26, 6);   // a slide into nowhere
    g.lineStyle(2, 0xd8d8e0, 1); g.lineBetween(606, 206, 606, 300); g.lineBetween(614, 206, 614, 300);
    const ex = 300 + Math.sin(t * 0.01) * 20, ey = 118 + Math.sin(t * 0.017) * 6;            // a lone EXIT sign hanging in the air
    g.fillStyle(0x1a4a2a, 1); g.fillRect(ex - 20, ey - 8, 40, 16); g.fillStyle(PASTEL.exit, (t % 90) < 4 ? 0.3 : 1); g.fillRect(ex - 18, ey - 6, 36, 12);
    g.fillStyle(0x1a4a2a, 1); for (let i = 0; i < 4; i++) g.fillRect(ex - 14 + i * 8, ey - 3, 5, 6);
    const msg = Math.floor(t / 400) % 4;                                                        // words that fade in and out
    if (this.dreamT) { this.dreamT.setText(['YOU\'VE BEEN HERE BEFORE', 'ARE YOU AWAKE?', 'IT\'S OKAY. STAY.', 'THE EXIT IS JUST AHEAD'][msg]).setAlpha(0.5 * Math.max(0, Math.sin((t % 400) / 400 * Math.PI))).setVisible(true); }
    g.fillStyle(0xffffff, 0.16); g.fillRect(0, 0, W, H);                                         // the haze of a dream
    for (let i = 0; i < 40; i++) { g.fillStyle(0xffffff, 0.5); g.fillRect((i * 97 + t * 0.3) % W, (i * 53 + Math.sin(t * 0.02 + i) * 6) % HOR, 1, 1); }
  }
  /** NO EXIT on the desk: the doors (their glowing EXIT signs, the light inside when one opens, his shoes under his),
   *  and the stars of his daze. */
  drawDoors() {
    const g = this.midG, gl = this.glowG, t = this.t, A = this.boss && this.boss.atk; if (!g || !this.doors) return;
    this.doors.forEach((d, i) => {
      const h = DOORS.h * d.k, w = DOORS.w, x = d.x, y = 0; if (h < 2) return;
      g.fillStyle(0xffffff, 1); g.fillRect(x - w / 2 - 4, y - h - 4, w + 8, h + 4);         // the frame
      const o = d.open;
      if (o > 0) { g.fillStyle(0xfffaf0, 1); g.fillRect(x - w / 2, y - h, w, h); gl.fillStyle(0xffffff, 0.12 * o); gl.fillEllipse(x, y - h / 2, w * 1.8, h * 1.1); }
      else { g.fillStyle(0xfff0d0, 1); g.fillRect(x - w / 2, y - h, w, h); }
      g.fillStyle(d.c, 1); g.fillRect(x - w / 2 + (o > 0 ? 0 : 0), y - h, w * (1 - o * 0.85), h);   // the door (swinging open)
      g.lineStyle(1, 0xffffff, 0.8); g.strokeRect(x - w / 2 + 4, y - h + 6, w * (1 - o * 0.85) - 8, h * 0.4); g.strokeRect(x - w / 2 + 4, y - h * 0.5, w * (1 - o * 0.85) - 8, h * 0.4);
      if (o === 0) { g.fillStyle(0xd8b040, 1); g.fillCircle(x + w / 2 - 6, y - h * 0.5, 2); }
      const flick = A && A.name === 'doors' && A.ph === 'hide' && (t + i * 7) % 47 < 3;        // the EXIT sign
      g.fillStyle(0x1a4a2a, 1); g.fillRect(x - 14, y - h - 18, 28, 11); g.fillStyle(PASTEL.exit, flick ? 0.25 : 1); g.fillRect(x - 13, y - h - 17, 26, 9);
      gl.fillStyle(PASTEL.exit, flick ? 0 : 0.25); gl.fillEllipse(x, y - h - 12, 40, 18);
      if (A && A.name === 'doors' && i === A.true && this.inDoor && (t % 60) < 44) {        // his shoes in the light under his door
        g.fillStyle(0xfff4dc, 0.9); g.fillRect(x - w / 2 + 2, y - 3, w - 4, 3);
        g.fillStyle(0xb8121c, 1); g.fillRect(x - 9, y - 3, 7, 3); g.fillStyle(0xa8a6a2, 1); g.fillRect(x + 2, y - 3, 7, 3);
      }
    });
  }
  /** Little stars round his head while he's dazed. */
  drawDazed() {
    if (!(this.dazed > 0) || this.gone || !this.topG) return;
    const h = this.headAt(), g = this.topG;
    for (let i = 0; i < 4; i++) { const q = this.t * 0.12 + i * Math.PI / 2; g.fillStyle(i % 2 ? 0xffe08a : 0xffffff, 1); g.fillCircle(h.x + Math.cos(q) * 34, h.y - 40 + Math.sin(q) * 10, 3); }
  }
}
