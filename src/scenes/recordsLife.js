// THE ARCHIVIST's life between requests and her five mysteries (RecordsScene; methods copied onto its prototype at
// the bottom of RecordsScene.js - a name may only exist once).
// - THE TAPES: her boombox on the shelf plays Mason's cassettes (TAPES, streamed once each by music.js playTrack);
//   when one ends she turns, ejects it, shelves it, puts in the next and presses PLAY (`tape` animation). Colourful
//   notes float out of the speakers while it plays, the reels turn in the window (`drawBoombox`).
// - THE COCOA BREAK: every COCOA frames left alone (or when you click the machine) she makes herself a hot cocoa -
//   the mug under the nozzle, the button, the pour, marshmallows one at a time - and drinks it facing you (`cocoa`).
//   During both she can't be interrupted: click her and she says ONE SEC! / COMING! (`busyLine`).
// - THE MYSTERIES (SECRET_RECORDS with fx): CICADA 3301 (a magnifying glass, a page of runes, a cicada flies in and
//   lands on her hat), POLYBIUS (she stares into the counter like a cabinet: a vector tunnel, then she goes dizzy -
//   stars round her head), UVB-76 (headphones: an oscilloscope box, the buzz, the strange words), THE RAKE (she looks
//   at the corner... it's there for a moment, the lights dim, she ducks behind the counter and peeks), THE WOW! SIGNAL
//   (a printout, a red pen circling, WOW!). Each ends with her handing the file over.
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { playTrack, playMusic } from '../audio/music.js';
import { settings } from '../settings.js';
import { ARCH_LINES } from '../data/records.js';
import { sfx } from '../audio/sfx.js';
import { RECORDS_FRAMES as RF } from './recordsFrames.js';

// her cassettes (music.js TRACKS 'tape_25' ...: Mason's pixelated_audio 25, 27, 28) and each label's colour
export const TAPES = [['bgm_tape_25', 0xf8c838], ['bgm_tape_27', 0xf070b0], ['bgm_tape_28', 0x3ec8a0]];
// the cocoa break: frames left alone before the first one, then between them
export const COCOA = { first: 60 * 35, every: 60 * 70 };
// the notes out of the boombox: frames between them, their colours
const NOTES = { every: 16, cols: [0xff5a8a, 0xffd23f, 0x5ad8ff, 0x7cf06a, 0xc08aff, 0xff9a3a] };
// how often ONE SEC! can be said (frames)
const BUSY_GAP = 50;
const TAPE_KEY = 'rebirth.recordsTape';

/** THE ARCHIVIST's routines and mysteries (see the top of the file). */
export class RecordsLife {
  /** Sets up the tapes, the cocoa timer and the effects' layers; the first tape starts playing. */
  initLife() {
    this.routine = null; this.lifeFx = []; this.tapeDue = false; this.playingTape = false; this.busySaid = -999;
    this.nextCocoa = this.t + COCOA.first; this.dim = 0; this.dimTo = 0; this.myst = null;
    this.lifeG = this.add.graphics().setDepth(4.5);
    this.doorG = this.add.graphics().setDepth(0.5);                   // (the back door: on the wall, behind her)
    this.door = null;
    this.darkG = this.add.graphics().setDepth(15);
    this.mystT = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#7cf06a' }).setDepth(16).setVisible(false);
    try { this.tapeI = (parseInt(localStorage.getItem(TAPE_KEY), 10) || 0) % TAPES.length; } catch (e) { this.tapeI = 0; }
    if (settings.recordsTapes) this.startTape();
    else playMusic(this, 'bgm_title');                                // (OPTIONS > ARCHIVIST'S TAPES off: the boombox stays quiet)
  }
  /** Puts the current cassette on (it plays once; when it ends she changes it). */
  startTape() {
    const [key] = TAPES[this.tapeI];
    this.playingTape = true;
    playTrack(this, key, () => { if (this.sys.isActive()) { this.playingTape = false; this.tapeDue = true; } }, 1);
  }
  /** Whether she's free for a routine (nothing asked, typed, open or playing). */
  free() { return !this.busy && !this.routine && this.typed === null && !this.overlay && !this.leaving && !this.talking() && !(this.queue && this.queue.length); }
  /** She's busy with a routine: ONE SEC! (now and then, not every click). Returns true if she was busy. */
  busyLine() {
    if (!this.routine) return false;
    if (this.t - this.busySaid > BUSY_GAP) { this.busySaid = this.t; this.say(this.pick('busy'), 'annoyed'); sfx('menu', 0.4, 0.7); }
    return true;
  }

  /** THE TAPE CHANGE: she turns to the shelf, swaps the cassette and presses PLAY. */
  changeTape() {
    if (!settings.recordsTapes) { this.tapeDue = false; return; }
    this.routine = 'tape'; this.tapeDue = false; this.playingTape = false;
    this.say(this.pick('tape'), 'happy');
    this.play('tape', (ev) => {
      if (ev === 'eject') sfx('clang', 0.25, 2.2);
      if (ev === 'play') {
        sfx('select', 0.3, 0.8);
        this.tapeI = (this.tapeI + 1) % TAPES.length;
        try { localStorage.setItem(TAPE_KEY, String(this.tapeI)); } catch (e) { /* storage unavailable */ }
        this.startTape();
      }
      if (ev === 'done') { this.setExpr('smug'); this.say(this.pick('tapeOn'), 'smug'); }
    }, () => { this.routine = null; this.play('idle'); });
  }
  /** THE COCOA BREAK (see the top of the file). */
  makeCocoa() {
    this.routine = 'cocoa'; this.nextCocoa = this.t + COCOA.every;
    this.say(this.pick('cocoa'), 'happy');
    this.play('cocoa', (ev, f) => {
      if (ev === 'press') { sfx('menu', 0.5, 0.6); this.cocoaLight = 80; }
      if (ev === 'pour') { this.lifeFx.push({ k: 'pour', t: 0 }); if (f % 3 === 0) sfx('smoke', 0.08, 0.5 + Math.random() * 0.2); }
      if (ev.startsWith('drop')) { sfx('petal', 0.25, 1.8); const h = this.frame()[7]; for (let i = 0; i < 2; i++) this.lifeFx.push({ k: 'mallow', x: h[0] + (Math.random() - 0.5) * 6, y: h[1] + 6, vy: 0.4, t: 0 }); }
      if (ev === 'steam' && f % 2 === 0) { const h = this.frame()[8]; this.lifeFx.push({ k: 'steam', x: h[0] - 6 + Math.random() * 6, y: h[1] - 14, t: 0, ph: Math.random() * 6 }); }
      if (ev === 'sip' || ev === 'sip2') this.setExpr('sip');
      if (ev === 'sip2' && f === RF.anims.cocoa.ev.sip2[1]) { this.say(this.pick('sip'), 'smug'); }
      if (ev === 'sip' && f === RF.anims.cocoa.ev.sip[1]) { this.setExpr('happy'); this.say(this.pick('sip'), 'happy'); }
    }, () => { this.routine = null; this.setExpr('smile'); this.play('idle'); });
  }

  /** One of the five mysteries: her own animation and effects, then the file. */
  fetchMystery(rec) {
    this.say(rec.say, 'surprised');
    this.myst = { fx: rec.fx, t: 0, pts: [], bug: null };
    const M = this.myst;
    if (rec.fx === 'arcade') sfx('popup', 0.3, 0.6);
    this.play(rec.anim, (ev, f) => {
      if (rec.fx === 'cicada') {
        if (ev === 'paper' && f % 3 === 0) { const h = this.frame()[8]; this.lifeFx.push({ k: 'rune', x: h[0] - 8 + Math.random() * 16, y: h[1] - 16, t: 0, a: Math.floor(Math.random() * 6) }); }
        if (ev === 'land') { M.bug = { x: -20, y: 90, t: 0 }; sfx('buzz', 0.2, 2.6); this.setExpr('focus'); }
        if (f === RF.anims.cipher.ev.land + 6) this.setExpr('shocked');
      }
      if (rec.fx === 'arcade') {
        if (ev === 'stare') { M.tunnel = Math.min(1, (M.tunnel || 0) + 0.12); this.setExpr('focus'); if (f % 4 === 0) sfx('menu', 0.15, 0.6 + (f % 8) * 0.1); }
        if (ev === 'dizzy') { M.tunnel = Math.max(0, (M.tunnel || 0) - 0.08); M.dizzy = true; this.setExpr('scared'); if (f % 6 === 0) sfx('glitch', 0.12, 1.5); }
      }
      if (rec.fx === 'buzzer' && ev === 'buzz') { M.scope = true; this.setExpr('focus'); if (f % 9 === 0) { sfx('buzz', 0.28, 0.7); M.pulse = 12; } }
      if (rec.fx === 'rake') {
        if (ev === 'see') { M.rake = 60; this.dimTo = 0.62; sfx('glitch', 0.2, 0.4); this.setExpr('shocked'); }
        if (ev === 'duck') { sfx('land', 0.6, 0.8); this.cameras.main.shake(120, 0.004); }
        if (ev === 'peek') this.setExpr('scared');
      }
      if (rec.fx === 'herobrine') {
        if (ev.startsWith('hit')) { sfx('land', 0.7, 0.7); this.cameras.main.shake(90, 0.003); const h = this.frame()[7]; for (let i = 0; i < 6; i++) this.lifeFx.push({ k: 'block', x: h[0] + 4, y: h[1] + 10, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2.5, t: 0, c: [0x8a5a34, 0x6a8a3a, 0x7a7a80][i % 3] }); }
        if (ev === 'eyes') { M.eyes = 80; this.dimTo = 0.66; sfx('glitch', 0.18, 0.5); this.setExpr('shocked'); }
      }
      if (rec.fx === 'killswitch') {
        if (ev === 'play') { M.screen = 'play'; this.setExpr('focus'); if (f % 3 === 0) sfx('menu', 0.12, 1.4 + Math.random() * 0.6); }
        if (ev === 'delete') { M.screen = 'delete'; M.del = 0; sfx('warn', 0.3, 0.8); this.setExpr('surprised'); }
        if (ev === 'shake') { if (f % 3 === 0) sfx('land', 0.3, 1.6); this.setExpr('annoyed'); }
      }
      if (rec.fx === 'lavender') {
        if (ev === 'tune') { M.tint = Math.min(1, (M.tint || 0) + 0.06); this.setExpr('annoyed');
          if (f % 3 === 0) { const sc = [2.0, 2.52, 3.0, 2.38, 2.0, 2.67, 3.17, 2.52]; sfx('ding', 0.12, sc[(f / 3) % 8]); }
          if (f % 2 === 0) this.lifeFx.push({ k: 'wisp', x: 120 + Math.random() * 400, y: 330, t: 0, ph: Math.random() * 6 }); }
      }
      if (rec.fx === 'truck') {
        if (ev === 'push') { M.push = (M.push || 0) + 1; this.setExpr('focus'); if (f % 4 === 0) sfx('land', 0.25, 0.6); }
      }
      if (rec.fx === 'bigfoot') {
        if (ev === 'look') { M.scope = Math.min(1, (M.scope || 0) + 0.12); this.setExpr('focus'); }
        if (ev === 'spot') { M.foot = 1; sfx('rumble', 0.25, 1.2); }
      }
      if (rec.fx === 'wow') {
        if (ev === 'circle') { this.setExpr('focus'); M.pts.push({ x: this.frame()[7][0] + 6, y: this.frame()[7][1] - 10 }); }
        if (ev === 'wow') { M.wow = 1; sfx('item', 0.5, 0.8); sfx('limitready', 0.35, 1); this.setExpr('happy'); this.cameras.main.shake(140, 0.004);
          for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3; this.lifeFx.push({ k: 'spark', x: VIEW_W / 2 - 20, y: 120, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, c: NOTES.cols[i % 6] }); } }
      }
    }, () => {
      this.dimTo = 0; this.endMystery(); this.myst = null; this.holding = rec;
      if (rec.fx === 'truck' || rec.fx === 'bigfoot' || rec.fx === 'killswitch') this.setExpr('smug');
      this.setExpr(rec.fx === 'rake' ? 'annoyed' : 'smug');
      this.say(rec.after, rec.fx === 'rake' ? 'annoyed' : 'smug');
      this.handOver(rec);
    });
  }

  /** THE BACK DOOR (the CONFIDENTIAL files): she snaps, a door opens in the wall behind her, she walks through it;
   *  rustling in the back room; she comes back out with a red folder, snaps over her shoulder and the door's gone. */
  fetchDoor(rec) {
    this.say(rec.say, 'sly');
    this.door = { k: 0, open: 0, rec, gone: false };
    const D = this.door;
    this.play('door_go', (ev, f) => {
      if (ev === 'snap') { D.grow = true; sfx('glass', 0.35, 1.6); sfx('summon', 0.25, 1.2); for (let i = 0; i < 14; i++) this.lifeFx.push({ k: 'spark', x: this.doorMid().x, y: this.doorMid().y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, t: 0, c: 0xffd860 }); }
      if (ev === 'walk' && f % 4 === 0) sfx('land', 0.12, 0.9);
      if (ev === 'through') { D.open = Math.min(1, D.open + 0.15); const n = RF.anims.door_go.ev.through; this.her.setAlpha(Math.max(0, 1 - (f - n[0]) / (n[1] - n[0]))); }
    }, () => {
      this.her.setAlpha(0); this.faceHidden = true;
      const lines = ARCH_LINES.backroom.slice();
      this.say(lines, 'smile');
      [0, 700, 1400, 2100].forEach((ms, i) => this.time.delayedCall(ms, () => sfx(i === 2 ? 'clang' : 'menu', 0.25, 0.5 + i * 0.1)));
      this.time.delayedCall(3200, () => {
        this.holding = rec; this.faceHidden = false;
        this.play('door_back', (ev, f) => {
          if (ev === 'appear') { const n = RF.anims.door_back.ev.appear; this.her.setAlpha(Math.min(1, (f - n[0] + 1) / (n[1] - n[0] + 1))); }
          if (ev === 'walk' && f % 4 === 0) sfx('land', 0.12, 0.9);
          if (ev === 'snap') { D.vanish = 1; sfx('glass', 0.35, 2.0); sfx('smoke', 0.3, 1.2); const m = this.doorMid(); for (let i = 0; i < 18; i++) this.lifeFx.push({ k: 'spark', x: m.x, y: m.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, t: 0, c: [0xffd860, 0xff5a6a, 0xffffff][i % 3] }); this.setExpr('wink'); }
        }, () => { this.her.setAlpha(1); this.door = null; this.say(rec.after, 'smug'); this.handOver(rec); });
      });
    });
  }
  /** The middle of the back door on screen. */
  doorMid() { const q = RF.spots.backDoor; return { x: (q[0][0] + q[1][0]) / 2, y: (q[0][1] + q[2][1]) / 2 }; }
  /** Draws the back door: it grows out of the wall with sparkles, swings open on the red-lit back room (rows of
   *  CONFIDENTIAL drawers), and folds away to nothing when she snaps. */
  drawDoor() {
    const g = this.doorG; g.clear();
    const D = this.door; if (!D) return;
    if (D.grow) D.k = Math.min(1, D.k + 0.06);
    if (D.vanish) { D.vanish += 1; D.k = Math.max(0, 1 - (D.vanish - 1) / 14); D.open = 0; }
    if (D.k <= 0) return;
    const q = RF.spots.backDoor, m = this.doorMid(), k = D.k;
    const P = (p) => ({ x: m.x + (p[0] - m.x) * k, y: m.y + (p[1] - m.y) * k });
    const [bl, br, tr, tl] = q.map(P);
    const quad = (a, b, c, d, col, al = 1) => { g.fillStyle(col, al); g.fillPoints([a, b, c, d], true); };
    quad({ x: bl.x - 4, y: bl.y }, { x: br.x + 4, y: br.y }, { x: tr.x + 4, y: tr.y - 4 }, { x: tl.x - 4, y: tl.y - 4 }, 0x3a2414);   // the frame
    // the back room behind it: red light, drawer fronts, a CONFIDENTIAL strip
    quad(bl, br, tr, tl, 0x1a0608);
    const W = br.x - bl.x, Hh = bl.y - tl.y;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { g.fillStyle(0x5a1a20, 0.9); g.fillRect(tl.x + 4 + c * (W - 8) / 3, tl.y + 8 + r * (Hh - 16) / 6, (W - 8) / 3 - 2, (Hh - 16) / 6 - 2); g.fillStyle(0xd9ab48, 0.8); g.fillRect(tl.x + 4 + c * (W - 8) / 3 + ((W - 8) / 3 - 2) / 2 - 1.5, tl.y + 8 + r * (Hh - 16) / 6 + 3, 3, 1.5); }
    g.fillStyle(0xff3a3a, 0.18 + 0.08 * Math.sin(this.t * 0.2)); g.fillRect(tl.x, tl.y, W, Hh);
    g.fillStyle(0xf8c838, 0.9); g.fillRect(tl.x, tl.y + Hh * 0.45, W, 5);
    // the door itself, swinging open (narrows toward its hinge on the left)
    const o = D.open, dw = W * (1 - o * 0.82);
    quad(bl, { x: bl.x + dw, y: bl.y + o * 4 }, { x: tl.x + dw, y: tl.y - o * 4 }, tl, 0x6b4226);
    g.fillStyle(0x4a2b18, 1); g.fillRect(tl.x + dw * 0.15, tl.y + Hh * 0.08, dw * 0.7, Hh * 0.36); g.fillRect(tl.x + dw * 0.15, tl.y + Hh * 0.52, dw * 0.7, Hh * 0.4);
    g.fillStyle(0xd9ab48, 1); g.fillCircle(tl.x + dw * 0.86, tl.y + Hh * 0.52, Math.max(1.5, 2.6 * k));
    g.fillStyle(0xf4efe0, 0.9); g.fillRect(tl.x + dw * 0.3, tl.y + Hh * 0.2, dw * 0.4, 5);
    g.fillStyle(0x7c1f30, 1); g.fillRect(tl.x + dw * 0.32, tl.y + Hh * 0.2 + 1.5, dw * 0.36, 2);
    if (D.k < 1 || D.vanish) { g.lineStyle(2, 0xffd860, 0.7 * (1 - Math.abs(k - 0.5) * 2 + 0.2)); g.strokeRect(tl.x - 3, tl.y - 3, W + 6, Hh + 6); }
  }

  /** Every frame: tape changes and cocoa breaks when she's free, the notes, effects moving. */
  stepLife() {
    this.stepTrips();
    if (this.tripDue()) this.startTrip();
    else if (this.tapeDue && this.free()) this.changeTape();
    else if (this.t >= this.nextCocoa && this.free() && this.t - this.lastAct > 600) this.makeCocoa();
    else if (this.t >= this.nextCocoa && !this.free()) this.nextCocoa = this.t + 600;
    if (this.playingTape && this.t % NOTES.every === 0 && !this.trip) {
      const sp = RF.spots.speakers[Math.floor(Math.random() * 2)];
      this.lifeFx.push({ k: 'note', x: sp[0] + (Math.random() - 0.5) * 8, y: sp[1] - 4, t: 0, c: NOTES.cols[Math.floor(Math.random() * NOTES.cols.length)], two: Math.random() < 0.35, ph: Math.random() * 6 });
    }
    this.dim += (this.dimTo - this.dim) * 0.08;
    if (this.cocoaLight) this.cocoaLight--;
    if (this.myst) this.myst.t++;
  }

  /** Draws a music note (or two joined) at x, y in colour c. */
  note(g, x, y, c, a, two) {
    g.fillStyle(c, a); g.fillEllipse(x, y, 7, 5); g.fillRect(x + 2.5, y - 11, 1.6, 11);
    if (two) { g.fillEllipse(x + 8, y - 2, 7, 5); g.fillRect(x + 10.5, y - 13, 1.6, 11); g.fillRect(x + 2.5, y - 12, 9.6, 2.4); }
    else { g.fillTriangle(x + 4, y - 11, x + 9, y - 6, x + 4, y - 7); }
  }
  /** The boombox while it plays: the reels turning in the window, a light. */
  drawBoombox(g) {
    const w = RF.spots.window;
    if (!this.playingTape) return;
    for (const dx of [-4, 4]) {
      g.lineStyle(1, 0xd8d8e0, 0.9); g.strokeCircle(w[0] + dx, w[1], 2.4);
      const a = this.t * 0.25; g.lineBetween(w[0] + dx - Math.cos(a) * 2.2, w[1] - Math.sin(a) * 2.2, w[0] + dx + Math.cos(a) * 2.2, w[1] + Math.sin(a) * 2.2);
    }
    g.fillStyle(0xff4a4a, 0.6 + 0.4 * Math.sin(this.t * 0.2)); g.fillCircle(w[0] + 12, w[1] - 6, 1.4);
  }
  /** Draws her routines' and mysteries' effects (notes, the pour, steam, runes, the cicada, the tunnel, the scope,
   *  the figure in the corner, the red circle and WOW!) and the dark. */
  drawLife() {
    const g = this.lifeG, dg = this.darkG; g.clear(); dg.clear();
    if (!(this.trip && this.trip.on)) this.drawBoombox(g);
    this.drawDoor();
    const sp = RF.spots;
    if (this.cocoaLight) { g.fillStyle(0x7cf06a, 0.8); g.fillCircle(sp.light[0], sp.light[1], 2.2); }
    for (const p of this.lifeFx) {
      p.t++;
      if (p.k === 'note') {
        const a = Math.max(0, 1 - p.t / 110); p.y -= 0.55; const x = p.x + Math.sin(p.t * 0.08 + p.ph) * 6;
        this.note(g, x, p.y, p.c, a, p.two); if (p.t > 110) p.dead = true;
      } else if (p.k === 'pour') {
        const n = sp.nozzle; g.fillStyle(0x6a3420, 0.95); g.fillRect(n[0] - 1.5, n[1], 3, 16 + Math.sin(this.t) * 1.5);
        g.fillStyle(0xb06a40, 0.6); g.fillRect(n[0] - 0.5, n[1], 1, 16); p.dead = p.t > 1;
      } else if (p.k === 'mallow') {
        p.y += p.vy; p.vy += 0.25; g.fillStyle(0xfff4f0, 1); g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); if (p.t > 12) p.dead = true;
      } else if (p.k === 'steam') {
        const a = Math.max(0, 0.5 - p.t / 80); p.y -= 0.45; g.fillStyle(0xffffff, a); g.fillCircle(p.x + Math.sin(p.t * 0.1 + p.ph) * 3, p.y, 2 + p.t / 30); if (p.t > 40) p.dead = true;
      } else if (p.k === 'rune') {
        const a = Math.max(0, 1 - p.t / 50); p.y -= 0.6; g.lineStyle(1.5, 0x3ec8a0, a);
        const x = p.x, y = p.y, s = 4, R = [[[0, -s, 0, s], [0, -s, s, 0]], [[0, -s, 0, s], [-s, 0, s, -s]], [[-s, -s, s, s], [s, -s, -s, s]], [[0, -s, 0, s], [0, 0, s, s]], [[-s, s, 0, -s], [0, -s, s, s]], [[0, -s, 0, s], [-s, -s / 2, s, -s / 2]]][p.a];
        for (const l of R) g.lineBetween(x + l[0], y + l[1], x + l[2], y + l[3]);
        if (p.t > 50) p.dead = true;
      } else if (p.k === 'block') {
        p.x += p.vx; p.y += p.vy; p.vy += 0.25; g.fillStyle(p.c, Math.max(0, 1 - p.t / 40)); g.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); g.fillStyle(0x000000, 0.25); g.fillRect(p.x - 2.5, p.y + 1, 5, 1.5); if (p.t > 40) p.dead = true;
      } else if (p.k === 'wisp') {
        p.y -= 0.9; const a = Math.min(1, p.t / 10) * Math.max(0, 1 - p.t / 120); g.fillStyle(0xb07ae8, a * 0.5); g.fillCircle(p.x + Math.sin(p.t * 0.06 + p.ph) * 10, p.y, 6); g.fillStyle(0xffffff, a * 0.6); g.fillCircle(p.x + Math.sin(p.t * 0.06 + p.ph) * 10 - 2, p.y - 1, 1.2); g.fillCircle(p.x + Math.sin(p.t * 0.06 + p.ph) * 10 + 2, p.y - 1, 1.2); if (p.t > 120) p.dead = true;
      } else if (p.k === 'spark') {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; const a = Math.max(0, 1 - p.t / 60); g.fillStyle(p.c, a);
        g.fillTriangle(p.x, p.y - 4, p.x - 2, p.y, p.x + 2, p.y); g.fillTriangle(p.x, p.y + 4, p.x - 2, p.y, p.x + 2, p.y); if (p.t > 60) p.dead = true;
      }
    }
    this.lifeFx = this.lifeFx.filter((p) => !p.dead);
    if (this.dim > 0.01) {                                            // (the dark first: the figure in the corner shows through it)
      dg.fillStyle(0x05040a, this.dim); dg.fillRect(0, 0, VIEW_W, VIEW_H);
      const L = RF.hits.lamp; dg.fillStyle(0xfff0b8, this.dim * 0.1); dg.fillCircle(L[0] + L[2] / 2, L[1] + L[3], 70);
    }
    const M = this.myst, f = this.frame();
    if (M) this.drawMystery(g, M, f);
    else this.mystT.setVisible(false);
  }
  /** The mystery playing now (see drawLife). */
  drawMystery(g, M, f) {
    const dg = this.darkG, fc = f[6];
    if (M.fx === 'cicada' && M.bug) {
      const B = M.bug; B.t++;
      const hat = fc ? { x: fc[0] + fc[2] * 1.2, y: fc[1] - fc[2] * 15.5 } : { x: 320, y: 90 };
      const k = Math.min(1, B.t / 70);
      if (k < 1) { B.x = 40 + (hat.x - 40) * k + Math.sin(B.t * 0.22) * 40 * (1 - k); B.y = 60 + (hat.y - 60) * k + Math.cos(B.t * 0.3) * 26 * (1 - k); } else { B.x = hat.x; B.y = hat.y; }
      const flap = k < 1 ? Math.sin(B.t * 1.6) * 3 : 0;
      g.fillStyle(0xbfe8ff, 0.55); g.fillEllipse(B.x - 4, B.y - 1 - flap, 9, 4); g.fillEllipse(B.x + 4, B.y - 1 + flap, 9, 4);
      g.fillStyle(0x3a5a2a, 1); g.fillEllipse(B.x, B.y, 5, 9); g.fillStyle(0xd8323a, 1); g.fillCircle(B.x - 2, B.y - 4, 1.2); g.fillCircle(B.x + 2, B.y - 4, 1.2);
      this.mystT.setVisible(k >= 1).setText('3301').setColor('#3ec8a0').setPosition(B.x + 8, B.y - 14).setFontSize(6);
    }
    if (M.fx === 'arcade') {
      const k = M.tunnel || 0;
      if (k > 0.02) {
        dg.fillStyle(0x020206, 0.55 * k); dg.fillRect(0, 0, VIEW_W, VIEW_H);
        const cx = VIEW_W / 2, cy = 150;
        for (let i = 0; i < 9; i++) {
          const r = ((this.t * 2 + i * 22) % 200) + 4, a = this.t * 0.02 + i * 0.3, col = [0x3cff8a, 0x3ad8ff, 0xff3ac8][i % 3];
          dg.lineStyle(1.5, col, k * Math.min(1, r / 40) * 0.9);
          const pts = Array.from({ length: 7 }, (_, j) => ({ x: cx + Math.cos(a + j * Math.PI * 2 / 6) * r * 1.4, y: cy + Math.sin(a + j * Math.PI * 2 / 6) * r * 0.8 }));
          dg.strokePoints(pts, false);
        }
        this.mystT.setVisible(this.t % 20 < 14).setText('POLYBIUS').setFontSize(14).setColor('#3cff8a').setOrigin(0.5).setPosition(cx, 40).setAlpha(k);
      } else this.mystT.setVisible(false).setOrigin(0).setAlpha(1);
      if (M.dizzy && fc) for (let i = 0; i < 3; i++) {
        const a = this.t * 0.12 + i * Math.PI * 2 / 3, x = fc[0] + Math.cos(a) * fc[2] * 12, y = fc[1] - fc[2] * 13 + Math.sin(a) * fc[2] * 3;
        g.fillStyle(0xffd23f, 1); g.fillTriangle(x, y - 4, x - 3, y + 2, x + 3, y + 2); g.fillTriangle(x, y + 4, x - 3, y - 2, x + 3, y - 2);
      }
    }
    if (M.fx === 'buzzer' && M.scope) {
      const X = 150, Y = 60, W = 150, Hh = 52;
      g.fillStyle(0x081208, 0.92); g.fillRoundedRect(X, Y, W, Hh, 4); g.lineStyle(2, 0x2a4a2a, 1); g.strokeRoundedRect(X, Y, W, Hh, 4);
      g.lineStyle(1, 0x1a3a1a, 1); for (let x = X + 10; x < X + W; x += 14) g.lineBetween(x, Y + 4, x, Y + Hh - 4);
      M.pulse = Math.max(0, (M.pulse || 0) - 1);
      const amp = 4 + M.pulse * 1.4, pts = [];
      for (let x = 0; x <= W - 12; x += 2) pts.push({ x: X + 6 + x, y: Y + Hh / 2 + Math.sin(x * 0.35 + this.t * 0.6) * amp * (M.pulse ? (Math.random() * 0.6 + 0.6) : 0.25) });
      g.lineStyle(1.5, 0x7cf06a, 1); g.strokePoints(pts, false);
      const words = '4625 kHz  ...  M D Z H B  ...  0 1 1 2 ...  N A M E S';
      this.mystT.setVisible(true).setOrigin(0).setAlpha(1).setFontSize(5).setColor('#7cf06a').setPosition(X + 6, Y + Hh + 4).setText(words.slice(0, Math.floor(M.t / 3)));
    }
    if (M.fx === 'rake') {
      if (M.rake > 0) {
        M.rake--;
        const c = RF.spots.corner, flick = (M.rake % 9 < 6) || M.rake < 20 ? 1 : 0.2, a = Math.min(1, M.rake / 15) * flick;
        const x = c[0] + 8, y = c[1] + 30;
        dg.fillStyle(0xd8d4cc, a * 0.85);
        dg.fillEllipse(x, y - 54, 12, 15);                                  // the head, tilted down
        dg.fillPoints([{ x: x - 7, y: y - 46 }, { x: x + 9, y: y - 44 }, { x: x + 12, y: y - 18 }, { x: x - 4, y: y - 12 }], true);   // the hunched back
        dg.lineStyle(2, 0xd8d4cc, a * 0.85);
        dg.lineBetween(x + 4, y - 40, x - 14, y - 20); dg.lineBetween(x - 14, y - 20, x - 16, y + 4);   // a long arm
        dg.lineBetween(x + 8, y - 38, x + 2, y - 14); dg.lineBetween(x + 2, y - 14, x - 2, y + 6);
        dg.lineBetween(x + 10, y - 16, x + 18, y + 6); dg.lineBetween(x - 2, y - 12, x - 8, y + 6);   // folded legs
        dg.fillStyle(0x000000, a); dg.fillEllipse(x - 3, y - 55, 3, 4.5); dg.fillEllipse(x + 3, y - 55, 3, 4.5);
      }
    }
    if (M.fx === 'herobrine' && M.eyes > 0) {
      M.eyes--;
      const c = [RF.spots.corner[0] + 26, RF.spots.corner[1] + 16], a = Math.min(1, M.eyes / 12) * ((M.eyes % 11 < 8) ? 1 : 0.3);
      dg.fillStyle(0x3a3430, a * 0.8); dg.fillRect(c[0] - 15, c[1] - 30, 30, 30); dg.fillRect(c[0] - 13, c[1], 26, 46);     // a blocky head and body in the dark
      dg.fillStyle(0xffffff, a * 0.3); dg.fillCircle(c[0] - 7, c[1] - 16, 9); dg.fillCircle(c[0] + 7, c[1] - 16, 9);
      dg.fillStyle(0xffffff, a); dg.fillRect(c[0] - 11, c[1] - 18, 8, 4); dg.fillRect(c[0] + 3, c[1] - 18, 8, 4);          // two white eyes
    }
    if (M.fx === 'killswitch' && M.screen) {
      const h = f[7] || [300, 260], x = h[0] + 2, y = h[1] - 34, W = 40, Hh = 28;
      g.fillStyle(0x3a3a44, 1); g.fillRoundedRect(x - W / 2 - 4, y - 4, W + 8, Hh + 8, 3); g.fillStyle(0x0a140a, 1); g.fillRect(x - W / 2, y, W, Hh);
      if (M.screen === 'play') {                                       // a little dark mine and a moving dot (you can't see yourself)
        g.fillStyle(0x2a4a2a, 1); for (let i = 0; i < 5; i++) g.fillRect(x - W / 2 + i * 9, y + Hh - 6 - (i % 2) * 4, 7, 6 + (i % 2) * 4);
        g.fillStyle(0x9af06a, 0.4 + 0.4 * Math.sin(this.t * 0.4)); g.fillRect(x - W / 2 + ((this.t * 0.7) % W), y + 10, 2, 2);
      } else {
        M.del = (M.del || 0) + 1;
        const k = Math.min(1, M.del / 50);
        if (k < 1) { this.mystT.setVisible(true).setOrigin(0.5).setFontSize(5).setColor('#9af06a').setPosition(x, y + 8).setText('DELETING...'); g.fillStyle(0x9af06a, 1); g.fillRect(x - W / 2 + 4, y + 17, (W - 8) * k, 4); g.lineStyle(1, 0x9af06a, 1); g.strokeRect(x - W / 2 + 4, y + 17, W - 8, 4); }
        else this.mystT.setVisible(M.del < 90).setOrigin(0.5).setFontSize(10).setColor('#ff3a3a').setPosition(VIEW_W / 2 - 40, 80).setText('ONE PLAY ONLY.');
      }
    }
    if (M.fx === 'lavender' && M.tint) {
      dg.fillStyle(0x6a3a9a, 0.22 * M.tint + 0.06 * Math.sin(this.t * 0.15)); dg.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (M.fx === 'truck') {
      const s0 = RF.slide[1], x = s0[0] + 14 + (M.push ? Math.sin(this.t * 1.7) * 0.8 : 0), y = RF.spots.counterTop - 8;
      g.fillStyle(0xf4f1ea, 1); g.fillRect(x - 18, y - 8, 36, 8); g.fillRect(x - 2, y - 15, 15, 7);          // the bed and the cab
      g.fillStyle(0x48a8f0, 1); g.fillRect(x + 1, y - 13, 10, 4);                                              // its window
      g.fillStyle(0x2a2a34, 1); g.fillCircle(x - 11, y + 1, 3.4); g.fillCircle(x + 10, y + 1, 3.4);              // wheels
      g.lineStyle(1, 0x8a8478, 1); g.strokeRect(x - 18, y - 8, 36, 8);
      if (this.t % 150 < 40) { g.fillStyle(0xf6a8c8, 0.9); g.fillCircle(x - 3 + Math.sin(this.t * 0.2) * 4, y + 2, 2.4); g.fillStyle(0x16121a, 1); g.fillCircle(x - 3.6 + Math.sin(this.t * 0.2) * 4, y + 1.6, 0.6); }
    }
    if (M.fx === 'bigfoot' && M.scope) {
      const k = M.scope, c1 = { x: 200, y: 214 }, c2 = { x: 300, y: 214 }, R = 64;
      // the view through the binoculars: misty woods, and once - him
      for (const c of [c1, c2]) {
        for (let y = -R; y < R; y += 2) {
          const half = Math.sqrt(R * R - y * y), v = (y + R) / (2 * R);
          dg.fillStyle(v < 0.55 ? 0x6a8a7a : 0x2a3a26, k); dg.fillRect(c.x - half, c.y + y, half * 2, 2);
        }
        for (let i = 0; i < 9; i++) { const tx = c.x - R + ((i * 23 + this.t * 0.25) % (2 * R)); const h = Math.sqrt(Math.max(0, R * R - (tx - c.x) ** 2)); dg.fillStyle(0x1a2414, k * 0.9); dg.fillRect(tx, c.y - h * 0.9, 4, h * 1.9); }
        if (M.foot) {
          const fx = c.x - R + (M.foot * 1.1) - (c === c2 ? 104 : 0), fy = c.y + 6, sw = Math.sin(M.foot * 0.25);
          if (Math.abs(fx - c.x) < R - 10) { dg.fillStyle(0x6a4a30, k); dg.fillEllipse(fx, fy - 22, 14, 16); dg.fillEllipse(fx, fy, 20, 34); dg.fillRect(fx - 8 + sw * 3, fy + 12, 5, 18); dg.fillRect(fx + 3 - sw * 3, fy + 12, 5, 18); dg.fillRect(fx - 14, fy - 10 + sw * 4, 5, 24); }
        }
        dg.fillStyle(0xb8d8c8, 0.15 * k); dg.fillRect(c.x - R, c.y - 10, R * 2, 14);
      }
      if (M.foot) M.foot++;
      // black everywhere else
      dg.fillStyle(0x020203, k);
      for (let y = 0; y < VIEW_H; y += 2) {
        const segs = [];
        for (const c of [c1, c2]) { const dy = y - c.y; if (Math.abs(dy) < R) { const h = Math.sqrt(R * R - dy * dy); segs.push([c.x - h, c.x + h]); } }
        segs.sort((a, b) => a[0] - b[0]);
        let x = 0; for (const [a, b] of segs) { if (a > x) dg.fillRect(x, y, a - x, 2); x = Math.max(x, b); }
        if (x < VIEW_W) dg.fillRect(x, y, VIEW_W - x, 2);
      }
    }
    if (M.fx === 'wow') {
      if (M.pts.length > 1) { g.lineStyle(2, 0xd8323a, 1); g.strokePoints(M.pts, false); }
      if (M.wow) {
        M.wow++;
        const s = Math.min(1, M.wow / 8), a = Math.max(0, 1 - Math.max(0, M.wow - 70) / 20);
        this.mystT.setVisible(a > 0).setOrigin(0.5).setFontSize(28).setColor('#d8323a').setAlpha(a).setScale(0.6 + s * 0.4).setAngle(-8).setPosition(VIEW_W / 2 - 30, 110).setText('WOW!');
        g.lineStyle(2, 0xd8323a, a); g.strokeEllipse(VIEW_W / 2 - 30, 140, 90, 22);
        g.fillStyle(0xfff6d0, a); for (let i = 0; i < 6; i++) g.fillCircle(VIEW_W / 2 - 64 + i * 13, 140, 0.1);
        if (!M.code) M.code = this.add.text(VIEW_W / 2 - 30, 140, '6 E Q U J 5', { fontFamily: FONT, fontSize: '7px', color: '#2a2018', backgroundColor: '#f4efe0', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(15.5);
        M.code.setAlpha(a);
      }
    }
  }
  /** Clears what a mystery left on screen. */
  endMystery() { if (this.myst && this.myst.code) this.myst.code.destroy(); this.mystT.setVisible(false).setScale(1).setAngle(0).setOrigin(0).setAlpha(1); }
}
