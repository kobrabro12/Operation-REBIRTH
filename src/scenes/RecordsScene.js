// THE RECORDS OFFICE (Trinkets > LORE): THE ARCHIVIST behind her counter, a PS1-look 3D render like HANZ in LOST
// (tools/sprites/archivist_3d.py -> public/assets/lore/records/ + recordsFrames.js). Click her (or J) and she asks WHO
// DO YOU WANT FILES ON?; type a name (keyboard, or the on-screen keys on a touch screen / with a pad) and Enter. If she
// has it (src/data/records.js findRecord) she digs it out of her bins (papers fly), slides the folder across the
// counter and it opens: the file, paged. Every file she gives you stays in your BRIEFCASE for good (C / the briefcase
// on the counter / the button; `rebirth.briefcase`). Secret names get secret files - BACKROOMS: she draws a portal in
// the air, reaches through and pulls the file out of the yellow rooms.
// Her FACE is drawn by the game on her blank head (`drawFace`, at each frame's exported face spot): curved lids over
// dot eyes, a wide open smile with teeth - and every expression in EXPR (she talks, laughs, winks, thinks, sulks).
// F = THE DOSSIERS (the old LORE pages, FilesScene), R = THE ARCHIVE, K / Esc / B = back to Trinkets.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { touchEnabled } from '../input/touch.js';
import { RECORDS_FRAMES as RF } from './recordsFrames.js';
import { findRecord, recordById, briefcase, fileAway, recordCount, ARCH_LINES } from '../data/records.js';
import { RecordsLife } from './recordsLife.js';
import { RecordsTrips } from './recordsTrips.js';

const DIR = 'assets/lore/records/';
const TICKS = 4;                                          // game frames per animation frame (her renders are 15 fps)
// the speech box at the bottom; how fast she types (characters a frame)
const BOX = { x: 398, y: 60, w: 230, h: 118 }, TYPE_SPEED = 0.7;
// what you can type, and the on-screen keys (touch screens and pads)
const TYPABLE = /^[a-zA-Z0-9 .&$@'-]$/;
const KEYS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'SPC', 'DEL', 'OK'];
const PAD = { cols: 10, w: 34, h: 20, gap: 4, y: 196 };
// her expressions: eyes + mouth (+ a blush)
const EXPR = {
  happy: ['dot', 'grin'], smile: ['dot', 'smile'], laugh: ['shut', 'laugh', 1], wink: ['wink', 'grin', 1], surprised: ['wide', 'o'],
  think: ['think', 'flat'], sly: ['half', 'smirk'], sad: ['sad', 'frown'], focus: ['half', 'tongue'], shy: ['shut', 'smile', 1], scared: ['wide', 'wobble'],
  sip: ['shut', 'none', 1],
};
// Mason's drawn faces (faces.png from tools/sprites/archivist_faces.py): frame, and where the eyes' middle sits in it
const FACE_IMG = { smug: [0, 28, 18], annoyed: [1, 25.5, 24], shocked: [2, 29.5, 20] };
// the expression each animation starts with
const ANIM_EXPR = { idle: 'smile', greet: 'happy', ask: 'happy', listen: 'smile', dig: 'focus', give: 'happy', portal: 'focus', think: 'think', laugh: 'laugh', shrug: 'sly', stamp: 'focus', tip: 'wink', explain: 'happy',
  cocoa: 'smile', tape: 'happy', cipher: 'focus', dizzy: 'focus', radio: 'focus', spook: 'smile', wow: 'focus',
  door_go: 'smile', door_back: 'smug', mine: 'focus', handheld: 'focus', ears: 'annoyed', push: 'focus', binoculars: 'focus',
  warp: 'sly', grab: 'focus', snapback: 'smug' };
// left alone: a little something every IDLE frames (think / explain / a hint)
const IDLE = 900;
const INK = 0x16121a;

/** The page of a file: wraps text into pages of `lines`. Returns [{ head, text }]. */
function pagesOf(rec, wrap, lines) {
  const out = [];
  for (const [head, body] of rec.sections || []) {
    const ls = wrap(body);
    for (let i = 0; i < Math.max(1, ls.length); i += lines) out.push({ head, text: ls.slice(i, i + lines).join('\n') });
  }
  return out.length ? out : [{ head: rec.name, text: '' }];
}

/** THE RECORDS OFFICE (see the top of the file). */
export class RecordsScene extends Phaser.Scene {
  constructor() { super('Records'); }

  /** Loads the room, the counter and her animations. */
  preload() {
    for (const n of ['room', 'counter']) if (!this.textures.exists('rec_' + n)) this.load.image('rec_' + n, DIR + n + '.png');
    if (!this.textures.exists('rec_faces')) this.load.spritesheet('rec_faces', DIR + 'faces.png', { frameWidth: 64, frameHeight: 64 });
    for (const [a, spec] of Object.entries(RF.anims)) if (!this.textures.exists('rec_' + a)) this.load.image('rec_' + a, DIR + spec.file);
  }

  /** Builds the office, her, the speech box and the buttons; she greets you. */
  create() {
    this.t = 0; this.menu = new MenuInput(this); this.busy = false; this.overlay = null; this.typed = null; this.fx = [];
    this.kC = null; this.leaving = false; this.portal = null; this.holding = null; this.sliding = null; this.full = null; this.queue = []; this.mouse = null;
    this.cameras.main.setBackgroundColor(0x120e10);
    for (const [a, spec] of Object.entries(RF.anims)) {
      const tex = this.textures.get('rec_' + a);
      spec.frames.forEach((f, i) => { if (!tex.has(String(i))) tex.add(String(i), 0, f[0], f[1], f[2], f[3]); });
    }
    this.add.image(0, 0, 'rec_room').setOrigin(0).setScale(RF.scale).setDepth(0);
    this.add.image(RF.counter[0], RF.counter[1], 'rec_counter').setOrigin(0).setScale(RF.scale).setDepth(1);
    this.her = this.add.image(0, 0, 'rec_idle', '0').setOrigin(0).setScale(RF.scale).setDepth(2);
    this.faceG = this.add.graphics().setDepth(3);
    this.faceImg = this.add.image(0, 0, 'rec_faces', 0).setDepth(3).setVisible(false);
    this.backG = this.add.graphics().setDepth(1.5);                   // (things behind her: a portal's far glow)
    this.fxG = this.add.graphics().setDepth(4);                       // papers, the folder in her hand, the stamp
    this.portalG = this.add.graphics().setDepth(5);
    if (RF.plate[1] < VIEW_H - 4) this.add.text(RF.plate[0], RF.plate[1], 'RECORDS', { fontFamily: FONT, fontSize: '7px', color: '#4a3014' }).setOrigin(0.5).setDepth(1.2);
    // the speech box
    this.boxG = this.add.graphics().setDepth(20);
    this.nameT = this.add.text(BOX.x + 12, BOX.y - 7, 'THE ARCHIVIST', { fontFamily: FONT, fontSize: '6px', color: '#f4e6c4', backgroundColor: '#7c1f30', padding: { x: 6, y: 3 } }).setDepth(21);
    this.lineT = this.add.text(BOX.x + 14, BOX.y + 16, '', { fontFamily: FONT, fontSize: '7px', color: '#2a1e18', lineSpacing: 6, wordWrap: { width: BOX.w - 28 } }).setDepth(21);
    this.inputT = this.add.text(BOX.x + 14, BOX.y + BOX.h - 24, '', { fontFamily: FONT, fontSize: '9px', color: '#7c1f30' }).setDepth(21);
    this.caseT = this.add.text(VIEW_W - 104, 26, '', { fontFamily: FONT, fontSize: '5px', color: '#f4e6c4' }).setOrigin(1, 0).setDepth(21);
    this.hintT = this.add.text(VIEW_W / 2, VIEW_H - 8, 'CLICK HER OR J: ASK FOR A FILE   C: BRIEFCASE   F: DOSSIERS   R: ARCHIVE   K: BACK', { fontFamily: FONT, fontSize: '5px', color: '#d8c8a8' }).setOrigin(0.5).setDepth(21);
    // (the buttons sit over everything, so her trinket trips' worlds don't cover them)
    [makeButton(this, 8, 6, '< TRINKETS', () => this.leave()),
      makeButton(this, VIEW_W - 104, 6, 'BRIEFCASE', () => this.openCase(), { originX: 1 }),
      makeButton(this, 92, 6, 'DOSSIERS', () => this.go('Files')),
      makeButton(this, 160, 6, 'ARCHIVE', () => this.go('Archive')),
      addFullscreenButton(this, VIEW_W - 8, 6)].forEach((b) => { if (b && b.setDepth) b.setDepth(21); });
    this.keyG = this.add.graphics().setDepth(22); this.keyTs = [];
    this.overG = this.add.graphics().setDepth(30); this.overTs = [];
    this.input.on('pointerdown', (p, over) => this.click(p, over));
    this.input.on('pointermove', (p) => { this.mouse = { x: p.x, y: p.y }; });
    this.events.once('shutdown', () => this.cleanup());
    this.setExpr('smile'); this.play('idle');
    this.initLife();
    this.initTrips();
    this.lastAct = 0; this.hintN = 0; this.misses = 0;
    const first = !localStorage.getItem('rebirth.recordsSeen');
    try { localStorage.setItem('rebirth.recordsSeen', '1'); } catch (e) { /* storage unavailable */ }
    this.time.delayedCall(250, () => { this.play('greet', null, () => this.play('idle')); this.say(first ? ARCH_LINES.first : [this.pick('hello')], 'happy'); });
  }

  // ------------------------------------------------------------------ her animations and face
  /** Plays animation `name`; onEv(eventName, frame) on its exported event frames, done() when a one-shot ends. */
  play(name, onEv, done) {
    if (!RF.anims[name]) name = 'idle';
    this.anim = name; this.af = 0; this.at = 0; this.onEv = onEv || null; this.onDone = done || null;
    if (ANIM_EXPR[name] && !this.talking()) this.setExpr(ANIM_EXPR[name]);
    this.showFrame();
  }
  /** Puts the current frame on screen. */
  showFrame() {
    const f = RF.anims[this.anim].frames[this.af];
    this.her.setTexture('rec_' + this.anim, String(this.af)).setPosition(f[4], f[5]);
  }
  /** Steps her animation (every TICKS game frames) and fires its events. */
  stepAnim() {
    if (++this.at < TICKS) return;
    this.at = 0;
    const spec = RF.anims[this.anim], n = spec.frames.length;
    if (this.af + 1 >= n) {
      if (spec.loop) this.af = 0;
      else { const d = this.onDone; this.onDone = null; if (d) d(); else this.play('idle'); return; }
    } else this.af++;
    this.showFrame();
    if (this.onEv) for (const [k, v] of Object.entries(spec.ev || {})) {
      if (v === this.af || (Array.isArray(v) && this.af >= v[0] && this.af <= v[1])) this.onEv(k, this.af);
    }
  }
  /** The current frame's numbers: [sx, sy, w, h, x, y, face, right hand, left hand]. */
  frame() { return RF.anims[this.anim].frames[this.af]; }
  /** Sets her expression (EXPR key). */
  setExpr(e) { this.expr = e; }

  /** Draws her face on her head: curved lids over dot eyes and a wide smile (or whatever she's feeling). */
  drawFace() {
    const g = this.faceG; g.clear();
    const fc = this.frame()[6]; this.faceImg.setVisible(false); if (!fc) return;
    const [cx, cy, s, roll, facing, side] = fc;
    if (facing < 0.3 || this.her.alpha < 0.05) return;
    const ct = RF.spots.counterTop;                                    // (below this the counter hides her face)
    const k = Math.min(1, (facing - 0.3) / 0.25) * this.her.alpha, sq = Math.max(0.35, Math.min(1, side)), r = roll * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    const P = (u, v) => { const x = u * s * sq, y = -v * s; return { x: cx + x * cs - y * sn, y: cy + x * sn + y * cs }; };
    const lw = Math.max(1.6, s * 0.42);
    const line = (pts, w = lw, a = k) => { g.lineStyle(w, INK, a); g.strokePoints(pts.map((p) => P(p[0], p[1])), false); };
    const arc = (ux, uy, rx, ry, a0, a1, n = 9) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * i / (n - 1); return [ux + rx * Math.cos(a), uy + ry * Math.sin(a)]; });
    const dot = (ux, uy, rr) => { const p = P(ux, uy); g.fillStyle(INK, k); g.fillEllipse(p.x, p.y, rr * 2 * s * sq, rr * 2 * s); };
    const fi = FACE_IMG[this.expr];
    if (fi) {                                                         // one of Mason's drawn faces, laid on her head like the drawn one
      const sc = s / 4, eye = P(0, 2.0);
      const top = eye.y - fi[2] * sc, rows = Math.max(0, Math.min(64, (ct - top) / sc));
      this.faceImg.setVisible(rows > 2).setFrame(fi[0]).setOrigin(fi[1] / 64, fi[2] / 64).setPosition(eye.x, eye.y)
        .setScale(sc * sq, sc).setRotation(r).setAlpha(k).setCrop(0, 0, 64, rows);
      return;
    }
    const [eyes, mouth, blush] = EXPR[this.expr] || EXPR.happy;
    const eyesHid = P(0, 1.5).y > ct, mouthHid = P(0, -3.4).y > ct - 1;
    // where she's looking: at the pointer, gently
    let lx = 0, ly = 0;
    if (this.lookAt) { lx = Math.max(-1, Math.min(1, (this.lookAt.x - cx) / 160)); ly = Math.max(-1, Math.min(1, (cy - this.lookAt.y) / 120)); }
    const blink = (this.t % 260) < 7 && (eyes === 'dot' || eyes === 'think');
    for (const sd of eyesHid ? [] : [-1, 1]) {
      const ex = sd * 3.3, ey = 2.0;
      const kind = blink ? 'blink' : eyes === 'wink' ? (sd < 0 ? 'dot' : 'closed') : eyes;
      if (kind === 'dot' || kind === 'think') {
        const up = kind === 'think' && sd > 0 ? 0.8 : 0;
        line(arc(ex, ey + 0.6 + up, 2.0, 1.5, 0.15, Math.PI - 0.15));
        dot(ex + lx * 0.6 + (kind === 'think' ? 0.5 : 0), ey + ly * 0.35 + (kind === 'think' ? 0.5 : -0.2), 0.95);
      } else if (kind === 'wide') { line(arc(ex, ey + 1.2, 2.2, 1.9, 0.1, Math.PI - 0.1)); dot(ex + lx * 0.5, ey - 0.2, 1.25); }
      else if (kind === 'half') { line([[ex - 1.9, ey + 0.6 - sd * 0.15], [ex + 1.9, ey + 0.6 + sd * 0.15]]); dot(ex + lx * 0.6, ey - 0.25, 0.85); }
      else if (kind === 'sad') { line(arc(ex, ey + 0.4, 2.0, 1.2, 0.15, Math.PI - 0.15).map(([u, v]) => [u, v + (u - ex) * -sd * 0.35])); dot(ex + lx * 0.4, ey - 0.4, 0.85); }
      else if (kind === 'shut' || kind === 'closed') line(arc(ex, ey - 0.4, 1.9, 1.5, 0.1, Math.PI - 0.1));
      else if (kind === 'blink') line(arc(ex, ey + 0.4, 1.9, 0.6, Math.PI + 0.2, 2 * Math.PI - 0.2));
    }
    if (mouthHid) return;
    if (blush) { g.fillStyle(0xff7a8a, 0.32 * k); for (const sd of [-1, 1]) { const p = P(sd * 5.4, -1.2); g.fillEllipse(p.x, p.y, 3.4 * s * sq, 1.6 * s); } }
    // the mouth (talking cycles it while she types a line)
    let m = mouth;
    if (this.talking() && (mouth === 'grin' || mouth === 'smile')) m = ['talkA', 'grin', 'talkB', 'smile'][Math.floor(this.t / 5) % 4];
    const fillPoly = (pts, col, a = k) => { g.fillStyle(col, a); g.fillPoints(pts.map((p) => P(p[0], p[1])), true); };
    const openU = (w, top, depth, teeth) => {
      const pts = [[-w, top], ...arc(0, top, w, depth, Math.PI, 2 * Math.PI, 14), [w, top]];
      fillPoly(pts, INK);
      if (teeth) {                                                    // the row of upper teeth
        const th = Math.min(1.2, depth * 0.36), tw = w * 0.86;
        fillPoly([[-tw, top - 0.35], [tw, top - 0.35], [tw * 0.94, top - 0.35 - th], [-tw * 0.94, top - 0.35 - th]], 0xfffaf0);
        g.lineStyle(Math.max(1, lw * 0.45), INK, k);
        for (let i = 1; i < 5; i++) { const u = -tw + (2 * tw) * i / 5; const a = P(u, top - 0.35), b = P(u, top - 0.35 - th); g.lineBetween(a.x, a.y, b.x, b.y); }
      }
    };
    if (m === 'grin') openU(3.7, -1.9, 3.9, true);
    else if (m === 'laugh') { openU(4.5, -1.5, 5.2, true); fillPoly(arc(0, -5.4, 2.2, 1.0, Math.PI, 2 * Math.PI, 8).concat([[2.2, -5.4]]), 0xd04a5a); }
    else if (m === 'talkA') openU(2.8, -2.1, 3.0, true);
    else if (m === 'talkB') openU(2.2, -2.4, 2.0, false);
    else if (m === 'smile') line(arc(0, -1.4, 3.6, 2.6, Math.PI + 0.25, 2 * Math.PI - 0.25, 12));
    else if (m === 'smirk') line(arc(0.8, -2.2, 2.8, 1.6, Math.PI + 0.5, 2 * Math.PI - 0.1, 10));
    else if (m === 'o') dot(0, -3.6, 1.35);
    else if (m === 'flat') line([[-1.8, -3.4], [0.4, -3.2], [1.8, -2.8]]);
    else if (m === 'frown') line(arc(0, -4.6, 2.8, 1.4, 0.3, Math.PI - 0.3, 10));
    else if (m === 'wobble') line([[-2.6, -3.6], [-1.3, -3.0], [0, -3.6], [1.3, -3.0], [2.6, -3.6]]);
    else if (m === 'tongue') { line(arc(0, -1.6, 3.2, 2.2, Math.PI + 0.3, 2 * Math.PI - 0.3, 12)); const p = P(1.7, -3.6); g.fillStyle(0xe0566a, k); g.fillEllipse(p.x, p.y, 1.6 * s * sq, 1.8 * s); }
  }

  // ------------------------------------------------------------------ talking
  /** Picks a line from ARCH_LINES[key] (in turn, so she doesn't repeat herself), with %N / %B filled in. */
  pick(key, rec) {
    const L = ARCH_LINES[key] || [key]; this.lineN = this.lineN || {};
    const i = this.lineN[key] = ((this.lineN[key] ?? -1) + 1) % L.length;
    return L[i].replace(/%N/g, rec ? rec.name || rec.tab : '').replace(/%B/g, rec && rec.boss ? rec.boss.short : 'ITS BOSS');
  }
  /** She says lines (one after another, each waiting `hold` frames once typed), with an expression. */
  say(lines, expr, done) {
    this.queue = (Array.isArray(lines) ? lines : [lines]).slice(); this.sayDone = done || null;
    if (expr) this.setExpr(expr);
    this.nextLine();
  }
  /** Starts typing the next queued line. */
  nextLine() {
    const l = this.queue.shift();
    if (l === undefined) { const d = this.sayDone; this.sayDone = null; if (d) d(); return; }
    this.full = l; this.shown = 0; this.lineT.setText(''); this.holdT = 0;
  }
  /** Whether she's still typing a line. */
  talking() { return this.full && this.shown < this.full.length; }
  /** Types her line out, then holds it and moves on to the next. */
  stepTalk() {
    if (!this.full) return;
    if (this.shown < this.full.length) {
      const was = Math.floor(this.shown); this.shown = Math.min(this.full.length, this.shown + TYPE_SPEED);
      if (Math.floor(this.shown) !== was && this.full[was] !== ' ' && was % 2 === 0) sfx('menu', 0.12, 1.6 + Math.random() * 0.4);
      this.lineT.setText(this.full.slice(0, Math.floor(this.shown)));
    } else if (this.queue.length || this.sayDone) { if (++this.holdT > 70) this.nextLine(); }
  }

  // ------------------------------------------------------------------ asking for a file
  /** She leans in and asks who you want files on; typing opens. */
  ask() {
    if (this.busyLine()) return;
    if (this.busy || this.overlay) return;
    this.busy = true; this.lastAct = this.t;
    sfx('select', 0.4, 1.2);
    this.play('ask', null, () => this.play('listen'));
    this.say(this.pick('ask'), 'happy', () => this.openTyping());
  }
  /** The typing line opens (keyboard; the on-screen keys too on touch screens). */
  openTyping() {
    this.typed = ''; this.keyI = 0; this.showKeys = touchEnabled() || this.usedPad;
    this.input.keyboard.enabled = false; this.input.keyboard.disableGlobalCapture();   // (the game's keys step aside while you type)
    this.onKey = (e) => {
      if (e.key === 'Escape') { this.closeTyping(); this.cancelAsk(); return; }
      if (e.key === 'Enter') { this.submit(); return; }
      if (e.key === 'Backspace') { this.typeKey('DEL'); e.preventDefault(); return; }
      if (e.key.length === 1 && TYPABLE.test(e.key)) { this.typeKey(e.key === ' ' ? 'SPC' : e.key.toUpperCase()); e.preventDefault(); }
    };
    window.addEventListener('keydown', this.onKey);
    if (this.showKeys) this.keyTs = KEYS.map((k, i) => { const r = this.keyRect(i); return this.add.text(r.x + r.w / 2, r.y + PAD.h / 2, k, { fontFamily: FONT, fontSize: k.length > 1 ? '5px' : '8px', color: '#3a2418' }).setOrigin(0.5).setDepth(23); });
  }
  /** Where on-screen key i sits ({x, y, w}): rows of PAD.cols, the last row's words twice as wide. */
  keyRect(i) {
    const row = Math.floor(i / PAD.cols), inRow = Math.min(PAD.cols, KEYS.length - row * PAD.cols), wide = (k) => (KEYS[k].length > 1 ? 2 : 1);
    let rowW = -PAD.gap; for (let k = row * PAD.cols; k < row * PAD.cols + inRow; k++) rowW += wide(k) * PAD.w + (wide(k) - 1) * PAD.gap + PAD.gap;
    let x = (VIEW_W - rowW) / 2; for (let k = row * PAD.cols; k < i; k++) x += wide(k) * (PAD.w + PAD.gap);
    return { x, y: PAD.y + row * (PAD.h + PAD.gap), w: wide(i) * PAD.w + (wide(i) - 1) * PAD.gap };
  }
  /** One key typed (a letter, SPC, DEL or OK). */
  typeKey(k) {
    if (this.typed === null) return;
    if (k === 'OK') return this.submit();
    if (k === 'DEL') this.typed = this.typed.slice(0, -1);
    else if (this.typed.length < 20) this.typed += k === 'SPC' ? ' ' : k;
    this.keyFlash = { k, t: this.t };
    sfx('menu', 0.25, 1.1 + Math.random() * 0.3);
  }
  /** The typing line closes (keys back to the game). */
  closeTyping() {
    if (this.onKey) { window.removeEventListener('keydown', this.onKey); this.onKey = null; }
    try { this.input.keyboard.enabled = true; this.input.keyboard.enableGlobalCapture(); } catch (e) { /* plugin gone */ }
    this.keyTs.forEach((t) => t.destroy()); this.keyTs = []; this.keyG.clear();
    this.typed = null; this.inputT.setText('');
    this.menu.poll();                                                   // (so the Enter that sent it isn't read as J too)
  }
  /** Backed out of asking: she straightens up. */
  cancelAsk() { this.busy = false; this.play('idle'); this.say('OKAY! I\'LL BE RIGHT HERE.', 'smile'); }

  /** You pressed Enter: she looks the name up and fetches the file - or doesn't. */
  submit() {
    const name = (this.typed || '').trim();
    this.closeTyping();
    if (!name) return this.cancelAsk();
    const rec = findRecord(name);
    if (!rec) {
      this.misses++;
      this.play('shrug', null, () => { this.busy = false; this.play('idle'); });
      const lines = [this.pick('unknown', { name })];
      if (this.misses % 3 === 0) lines.push(this.pick('hint'));
      return this.say(lines, 'sly');
    }
    if (rec.refuse) { this.play('shrug', null, () => { this.busy = false; this.play('idle'); }); return this.say(rec.say, rec.hintOnly ? 'sly' : 'scared'); }
    if (rec.anim === 'door') return this.fetchDoor(rec);
    if (rec.anim === 'portal') return this.fetchPortal(rec);
    if (rec.fx) return this.fetchMystery(rec);
    if (rec.anim === 'self') return this.fetchSelf(rec);
    this.fetchBins(rec);
  }

  /** She turns to her bins and rummages (papers fly), comes back with the folder, then slides it over. */
  fetchBins(rec) {
    this.say(rec.quiet ? ARCH_LINES.quiet : this.pick('found', rec), rec.quiet ? 'sad' : 'happy');
    this.holding = null;
    this.play('dig', (ev, f) => {
      if (ev === 'rummage' && f % 2 === 0) { this.paper(this.frame()[7]); this.paper(this.frame()[8]); if (f % 4 === 0) sfx('whoosh', 0.15, 1.6 + Math.random() * 0.4); }
      if (ev === 'grab') { this.holding = rec; sfx('item', 0.3, 1.4); }
    }, () => (rec.sealed ? this.stampIt(rec, () => this.handOver(rec)) : this.handOver(rec)));
  }
  /** THE ARCHIVIST's own file: she laughs, tips her hat - and it's inside. */
  fetchSelf(rec) {
    this.say(rec.say, 'surprised');
    this.play('laugh', null, () => this.play('tip', (ev) => { if (ev === 'off') { this.holding = rec; sfx('item', 0.3, 1.2); this.setExpr('shy'); } }, () => this.handOver(rec)));
  }
  /** A secret from somewhere else: she draws a circle in the air, it opens, she reaches through and pulls the file out. */
  fetchPortal(rec) {
    this.say(rec.say, 'sly');
    const frames = RF.anims.portal.frames, ev = RF.anims.portal.ev;
    const pts = frames.slice(ev.draw[0], ev.draw[1] + 1).map((f) => f[7]);
    const c = { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length };
    const rad = Math.max(...pts.map((p) => Math.hypot(p[0] - c.x, p[1] - c.y)));
    this.portal = { c, rx: rad * 1.25, ry: rad * 1.45, k: 0, open: false, trail: [], kind: rec.portal, t0: this.t };
    sfx('summon', 0.35, 0.8);
    this.play('portal', (e, f) => {
      const P = this.portal; if (!P) return;
      if (e === 'draw') { P.trail.push({ x: this.frame()[7][0], y: this.frame()[7][1] }); if (f % 3 === 0) sfx('petal', 0.2, 1.4); }
      if (e === 'open') { P.open = true; sfx('laser', 0.3, 0.6); sfx('buzz', 0.25, 0.9); this.setExpr('surprised'); this.cameras.main.shake(180, 0.004); }
      if (e === 'reach') this.setExpr('focus');
      if (e === 'grab') { this.holding = rec; sfx('item', 0.35, 0.9); this.setExpr('happy'); }
      if (e === 'out') { P.closing = true; sfx('whoosh', 0.3, 0.7); }
    }, () => { this.say(rec.after, 'wink'); this.handOver(rec); });
  }
  /** SEALED: she slams her stamp on the folder first. */
  stampIt(rec, done) {
    this.play('stamp', (ev) => { if (ev === 'hit') { sfx('clang', 0.35, 1.6); this.cameras.main.shake(120, 0.005); this.fx.push({ kind: 'stamp', x: RF.hits.pad[0] + 20, y: RF.hits.pad[1] - 30, t: 0, word: 'SEALED' }); } }, done);
    this.say(this.pick('sealed', rec), 'focus');
  }
  /** She slides the folder across the counter, lets go, and it opens for you; it goes in your briefcase. */
  handOver(rec) {
    this.holding = rec;
    this.play('give', (ev) => {
      if (ev === 'release') { this.holding = null; this.sliding = { rec, t: 0 }; sfx('whoosh', 0.2, 1.2); }
    }, () => {
      this.play('idle');
      const fresh = fileAway(rec.id);
      this.say(fresh ? this.pick('give') : this.pick('again'), 'happy');
      this.time.delayedCall(350, () => { this.sliding = null; this.busy = false; this.openFile(rec, fresh); });
    });
  }

  // ------------------------------------------------------------------ the effects
  /** A sheet of paper flung up out of a bin at screen point p. */
  paper(p) {
    if (!p) return;
    this.fx.push({ kind: 'paper', x: p[0], y: p[1], vx: (Math.random() - 0.5) * 3 - 0.6, vy: -2.6 - Math.random() * 2.2, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, t: 0, col: Math.random() < 0.35 ? 0xe2c47e : 0xf4efe0 });
  }
  /** A manila folder (with a name tab) at x, y turned by rot, w wide. */
  folder(g, x, y, w, rot, alpha = 1, red = false) {
    const h = w * 0.72, cs = Math.cos(rot), sn = Math.sin(rot);
    const C = red ? [0x7c1f30, 0xf4efe0, 0x9a2a3a, 0x3a0e16, 0x16121a] : [0xc9a862, 0xf4efe0, 0xe2c47e, 0x7a5a2a, 0x7c1f30];
    const P = (u, v) => ({ x: x + u * cs - v * sn, y: y + u * sn + v * cs });
    const poly = (pts, col, a = alpha) => { g.fillStyle(col, a); g.fillPoints(pts.map(([u, v]) => P(u, v)), true); };
    poly([[-w / 2, -h / 2 - w * 0.12], [-w / 2 + w * 0.36, -h / 2 - w * 0.12], [-w / 2 + w * 0.42, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], C[0]);
    poly([[-w / 2 + 1, -h / 2 + w * 0.06], [w / 2 - 1, -h / 2 + w * 0.06], [w / 2 - 1, -h / 2 + w * 0.1], [-w / 2 + 1, -h / 2 + w * 0.1]], C[1]);
    poly([[-w / 2, -h / 2 + w * 0.1], [w / 2, -h / 2 + w * 0.1], [w / 2, h / 2], [-w / 2, h / 2]], C[2]);
    g.lineStyle(1, C[3], alpha); g.strokePoints([P(-w / 2, -h / 2 - w * 0.12), P(-w / 2 + w * 0.36, -h / 2 - w * 0.12), P(-w / 2 + w * 0.42, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)], true);
    poly([[-w * 0.3, -h * 0.05], [w * 0.3, -h * 0.05], [w * 0.3, h * 0.08], [-w * 0.3, h * 0.08]], C[4], alpha * 0.8);
  }
  /** The portal (behind / in front of her), the folder in her hand or sliding, papers, stamps. */
  drawFx() {
    const g = this.fxG, pg = this.portalG, bg = this.backG; g.clear(); pg.clear(); bg.clear();
    const f = this.frame();
    if (this.holding && f[7]) {                                       // (smaller when she's further away, at the back door)
      const k = f[6] ? Math.min(1, f[6][2] / RF.anims.idle.frames[0][6][2]) : 1;
      this.folder(g, f[7][0] + 2 * k, f[7][1] - 6 * k, 26 * k, -0.25 + 0.05 * Math.sin(this.t * 0.2), this.her.alpha, !!this.holding.confidential);
    }
    if (this.sliding) {
      const s = this.sliding; s.t++;
      const [a, b] = RF.slide, k = Math.min(1, s.t / 14);
      this.folder(g, a[0] + (b[0] - a[0]) * k, b[1] + 4 - s.t * 0.6, 26 + s.t * 1.6, -0.1, Math.max(0, 1 - s.t / 30), !!s.rec.confidential);
    }
    for (const p of this.fx) {
      p.t++;
      if (p.kind === 'paper') {
        p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.r += p.vr; p.vx *= 0.99;
        const a = Math.max(0, 1 - p.t / 55), cs = Math.cos(p.r), sn = Math.sin(p.r), w = 7, h = 9 * Math.abs(Math.cos(p.t * 0.18));
        const pts = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) => ({ x: p.x + u * cs - v * sn, y: p.y + u * sn + v * cs }));
        g.fillStyle(p.col, a); g.fillPoints(pts, true); g.lineStyle(1, 0x8a7a5a, a * 0.7); g.strokePoints(pts, true);
      } else if (p.kind === 'stamp') {
        const a = Math.max(0, 1 - Math.max(0, p.t - 50) / 30), sc = Math.max(1, 2.2 - p.t * 0.12);
        if (!p.text) p.text = this.add.text(p.x, p.y, p.word, { fontFamily: FONT, fontSize: '14px', color: '#c0202c', stroke: '#f4efe0', strokeThickness: 2 }).setOrigin(0.5).setAngle(-12).setDepth(6);
        p.text.setScale(sc).setAlpha(a);
        g.lineStyle(3, 0xc0202c, a * 0.9); g.strokeRect(p.x - 52 * sc, p.y - 14 * sc, 104 * sc, 28 * sc);
        if (p.t > 80) { p.text.destroy(); p.dead = true; }
      }
    }
    this.fx = this.fx.filter((p) => !p.dead && !(p.kind === 'paper' && p.t > 55));
    if (this.portal) this.drawPortal(pg, bg);
  }
  /** The portal: the glowing line she draws, then a hole in the air onto the yellow rooms (lights humming, wallpaper,
   *  wet carpet), a ring of light round it. Drawn over her, so her arm vanishes into it. */
  drawPortal(g, bg) {
    const P = this.portal;
    if (P.open && !P.closing) P.k = Math.min(1, P.k + 0.08);
    if (P.closing) { P.k = Math.max(0, P.k - 0.06); if (P.k <= 0) { this.portal = null; return; } }
    const { c, rx, ry } = P, t = this.t;
    if (!P.open) {                                                    // the line she's drawing
      if (P.trail.length < 2) return;
      g.lineStyle(4, 0xffe9a0, 0.35); g.strokePoints(P.trail, false);
      g.lineStyle(2, 0xfff6d0, 0.95); g.strokePoints(P.trail, false);
      const h = P.trail[P.trail.length - 1]; if (h) { g.fillStyle(0xffffff, 0.8); g.fillCircle(h.x, h.y, 3 + Math.sin(t * 0.6)); }
      return;
    }
    const k = P.k, ax = rx * (0.15 + 0.85 * k), ay = ry * k;
    bg.fillStyle(0xffe680, 0.12 * k); bg.fillEllipse(c.x, c.y, ax * 3.2, ay * 2.8);
    // inside: the yellow rooms, row by row inside the oval
    const rows = Math.max(1, Math.floor(ay));
    for (let i = -rows; i < rows; i += 2) {
      const yy = c.y + i, half = ax * Math.sqrt(Math.max(0, 1 - (i / ay) ** 2)); if (half < 1) continue;
      const v = (i + rows) / (2 * rows);
      const col = v < 0.18 ? 0xe8e2b8 : v < 0.72 ? 0xc8b35a : 0x8a7a3c;   // ceiling, wallpaper, carpet
      g.fillStyle(col, 1); g.fillRect(c.x - half, yy, half * 2, 2);
      if (v < 0.16) {                                                   // the ceiling's light panels, humming
        g.fillStyle(0xffffff, 0.75 + 0.25 * Math.sin(t * 0.7 + i));
        for (const px of [-0.5, 0.05]) { const x0 = c.x + px * ax, x1 = x0 + ax * 0.4; const l = Math.max(x0, c.x - half), r = Math.min(x1, c.x + half); if (r > l) g.fillRect(l, yy, r - l, 2); }
      } else if (v >= 0.72) { g.fillStyle(0x7a6a32, 1); for (let x = -ax + ((i * 3) % 7); x < ax; x += 7) if (Math.abs(x) < half - 1) g.fillRect(c.x + x, yy, 2, 2); }
      if (v >= 0.18 && v < 0.72) {                                    // the wallpaper's stripes, a doorway going on and on
        g.fillStyle(0xb09a48, 1);
        for (let x = -ax; x < ax; x += 6) if (Math.abs(x) < half - 1) g.fillRect(c.x + x, yy, 1, 2);
        if (i > -ay * 0.45 && i < ay * 0.44) {                         // a doorway onto more of the same, and more, and more
          for (const [f, col] of [[0.42, 0xa8943e], [0.26, 0x8a7a34], [0.14, 0x6a5c26], [0.06, 0x3a3012]]) { const dw = ax * f; g.fillStyle(col, 1); g.fillRect(c.x + ax * 0.12 - dw / 2, yy, dw, 2); }
        }
      }
    }
    const flick = 0.75 + 0.25 * Math.sin(t * 0.9) * (Math.random() < 0.1 ? -1 : 1);
    g.fillStyle(0xffffff, 0.2 * flick); g.fillEllipse(c.x, c.y - ay * 0.7, ax * 1.4, ay * 0.3);
    // the ring of light round it, sparks turning
    for (let w = 7; w >= 2; w -= 2.5) { g.lineStyle(w, w > 4 ? 0xffd860 : 0xfff6d0, w > 4 ? 0.35 : 0.95); g.strokeEllipse(c.x, c.y, ax * 2, ay * 2); }
    for (let i = 0; i < 10; i++) {
      const a = t * 0.05 + i * Math.PI / 5; g.fillStyle(0xfff6d0, 0.9); g.fillCircle(c.x + Math.cos(a) * ax, c.y + Math.sin(a) * ay, 1.5 + (i % 2));
    }
  }

  // ------------------------------------------------------------------ the file and the briefcase
  /** Clears the overlay's drawing and texts. */
  clearOver() { this.overG.clear(); this.overTs.forEach((t) => t.destroy()); this.overTs = []; if (this.overImg) { this.overImg.destroy(); this.overImg = null; } }
  /** A text on the overlay. */
  oText(x, y, s, size, color, opts = {}) { const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: size, color, ...opts }).setDepth(31); this.overTs.push(t); return t; }

  /** Opens a file: a big manila folder with the name on its tab and the file inside, paged. fresh = just given. */
  openFile(rec, fresh, from) {
    this.closeOver(true);
    const wrapT = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', lineSpacing: 5, wordWrap: { width: 400 } }).setVisible(false);
    const pages = pagesOf(rec, (s) => wrapT.getWrappedText(s), 17); wrapT.destroy();
    this.overlay = { kind: 'file', rec, pages, page: 0, fresh, from, t: 0 };
    sfx('item', 0.35, 1.3);
    this.drawFile();
  }
  /** Draws the open file's current page. */
  drawFile() {
    const o = this.overlay, rec = o.rec, pg = o.pages[o.page]; this.clearOver();
    const g = this.overG, X = 70, Y = 34, W = 500, Hh = 300;
    g.fillStyle(0x0a0608, 0.72); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0xc9a862, 1); g.fillRoundedRect(X, Y, W, Hh, 6);                                 // the folder
    g.fillStyle(0xc9a862, 1); g.fillRoundedRect(X + 14, Y - 16, 150, 22, 5);                       // its tab
    g.fillStyle(0xe2c47e, 1); g.fillRoundedRect(X + 6, Y + 6, W - 12, Hh - 12, 4);
    g.fillStyle(0xfaf6ea, 1); g.fillRect(X + 22, Y + 14, W - 44, Hh - 30);                       // the page
    g.lineStyle(1, 0xd8cfb4, 1); for (let yy = Y + 70; yy < Y + Hh - 22; yy += 11) g.lineBetween(X + 26, yy, X + W - 26, yy);
    g.lineStyle(1, 0xe8a0a0, 0.8); g.lineBetween(X + 46, Y + 14, X + 46, Y + Hh - 16);
    g.fillStyle(0x8a8a96, 1); g.fillRoundedRect(X + W - 62, Y + 6, 8, 26, 3);                     // a paperclip
    this.oText(X + 24, Y - 12, rec.tab || rec.name, '8px', '#3a2410');
    this.oText(X + 54, Y + 20, 'RECORDS OFFICE  -  SKY SANCTUM', '5px', '#8a6a4a');
    this.oText(X + 54, Y + 30, rec.name, '11px', '#2a1810');
    this.oText(X + 54, Y + 46, (rec.kind || '') + (rec.from ? '   /   ' + rec.from : ''), '5px', '#7c1f30', { wordWrap: { width: W - 140 } });
    this.oText(X + 54, Y + 59, pg.head, '6px', '#7c1f30');
    this.oText(X + 54, Y + 73, pg.text, '6px', '#2a2018', { lineSpacing: 5, wordWrap: { width: 400 } });
    if (rec.icon && this.textures.exists('icon_' + rec.icon)) {
      this.overImg = this.add.image(X + W - 70, Y + 44, 'icon_' + rec.icon).setDepth(31);
      const s = 52 / Math.max(this.overImg.width, this.overImg.height); this.overImg.setScale(s);
    }
    if (o.pages.length > 1) this.oText(X + W / 2, Y + Hh - 14, '<  PAGE ' + (o.page + 1) + ' / ' + o.pages.length + '  >', '6px', '#5a3a1a').setOrigin(0.5);
    this.oText(VIEW_W / 2, VIEW_H - 9, 'A/D TURN THE PAGE   K / ESC / CLICK OUTSIDE: CLOSE' + (o.from ? '   (BACK TO YOUR BRIEFCASE)' : ''), '5px', '#e8dcc0').setOrigin(0.5);
    if (o.fresh || rec.sealed || rec.confidential) {
      const word = rec.confidential ? 'CONFIDENTIAL' : rec.sealed ? 'HALF SEALED' : 'FILED';
      const st = rec.confidential ? this.oText(X + W - 96, Y + Hh - 34, word, '9px', '#c0202c').setOrigin(0.5).setAngle(-8).setAlpha(0.85)
        : this.oText(X + W - 150, Y + 30, word, '12px', '#c0202c').setOrigin(0.5).setAngle(-10).setAlpha(0.8);
      g.lineStyle(2, 0xc0202c, 0.7); g.strokeRect(st.x - st.width / 2 - 6, st.y - 12, st.width + 12, 24);
    }
  }
  /** Opens your BRIEFCASE: every file she's given you, as folders you can open again. */
  openCase(sel = 0) {
    if (this.busy || this.busyLine()) return;
    const ids = briefcase();
    if (!ids.length) { this.say(this.pick('empty'), 'smile'); this.play('explain'); return; }
    this.closeOver(true);
    this.overlay = { kind: 'case', ids, sel: Math.min(sel, ids.length - 1), page: 0 };
    sfx('select', 0.4, 0.9);
    this.drawCase();
  }
  /** Draws the open briefcase and its folders. */
  drawCase() {
    const o = this.overlay; this.clearOver();
    const g = this.overG, X = 60, Y = 48, W = 520, Hh = 270, COLS = 4, ROWS = 5, per = COLS * ROWS;
    o.page = Math.floor(o.sel / per);
    g.fillStyle(0x0a0608, 0.72); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.lineStyle(7, 0x4a2c18, 1); g.strokeRoundedRect(VIEW_W / 2 - 40, Y - 26, 80, 34, 10);           // the handle
    g.fillStyle(0x7a4a2a, 1); g.fillRoundedRect(X, Y, W, Hh, 10);                                  // the case
    g.fillStyle(0x5c3520, 1); g.fillRoundedRect(X + 10, Y + 10, W - 20, Hh - 20, 6);
    g.fillStyle(0x5e1624, 1); g.fillRect(X + 18, Y + 18, W - 36, Hh - 36);                         // the lining
    g.fillStyle(0xd9ab48, 1); g.fillRect(X + 60, Y - 2, 22, 10); g.fillRect(X + W - 82, Y - 2, 22, 10);   // the clasps
    this.oText(X + 26, Y + 24, 'YOUR BRIEFCASE', '9px', '#f4e6c4');
    this.oText(X + W - 26, Y + 26, o.ids.length + ' / ' + recordCount() + ' FILES', '6px', '#d9ab48').setOrigin(1, 0);
    const cw = (W - 60) / COLS, ch = 38;
    o.cells = [];
    o.ids.slice(o.page * per, o.page * per + per).forEach((id, i) => {
      const rec = recordById(id); if (!rec) return;
      const cx = X + 30 + (i % COLS) * cw + cw / 2, cy = Y + 66 + Math.floor(i / COLS) * (ch + 4);
      const on = o.page * per + i === o.sel;
      if (on) { g.fillStyle(0xffe9a0, 0.25); g.fillRoundedRect(cx - cw / 2 + 2, cy - ch / 2 - 4, cw - 4, ch + 6, 4); }
      this.folder(g, cx - cw / 2 + 22, cy, 30, 0, 1, !!rec.confidential);
      const col = rec.confidential ? '#ff5a6a' : rec.secret ? '#ffd860' : rec.sealed ? '#ff8a8a' : '#f4e6c4';
      this.oText(cx - cw / 2 + 42, cy - 8, rec.tab || rec.name, '6px', on ? '#ffffff' : col, { wordWrap: { width: cw - 46 } });
      this.oText(cx - cw / 2 + 42, cy + 6, rec.confidential ? 'CONFIDENTIAL' : rec.secret ? 'SECRET' : rec.id[0] === 'f' ? 'FIGHTER' : rec.id[0] === 'b' ? 'WARDEN' : 'WORLD', '5px', '#c8a8a0');
      o.cells.push({ x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, i: o.page * per + i });
    });
    const pagesN = Math.ceil(o.ids.length / per);
    if (pagesN > 1) this.oText(VIEW_W / 2, Y + Hh - 22, 'PAGE ' + (o.page + 1) + ' / ' + pagesN, '6px', '#d9ab48').setOrigin(0.5);
    this.oText(VIEW_W / 2, VIEW_H - 9, 'W/A/S/D PICK   J / CLICK: OPEN   K / ESC: CLOSE', '5px', '#e8dcc0').setOrigin(0.5);
  }
  /** Closes the file / the briefcase (a file opened from the briefcase goes back to it). */
  closeOver(quiet) {
    const o = this.overlay; this.overlay = null; this.clearOver();
    if (!quiet) sfx('menu', 0.5, 0.8);
    if (!quiet && o && o.kind === 'file' && o.from != null) this.openCase(o.from);
  }

  // ------------------------------------------------------------------ input
  /** Clicks: the overlay first, then the keys, then her and the things on the counter. */
  click(p, over) {
    this.lastAct = this.t; this.quietAt = this.t;
    const o = this.overlay;
    if (o) {
      if (o.kind === 'trinket') {
        if (p.x < 56 || p.x > 584 || p.y < 26 || p.y > 334) return this.closeOver();
        if (o.list.length > 1) return this.flipTrinket(p.x < VIEW_W / 2 ? -1 : 1);
        return;
      }
      if (o.kind === 'file') {
        const inside = p.x > 70 && p.x < 570 && p.y > 18 && p.y < 334;
        if (!inside) return this.closeOver();
        if (o.pages.length > 1) return this.turnPage(p.x < VIEW_W / 2 ? -1 : 1);
        return;
      }
      const c = (o.cells || []).find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
      if (c) { o.sel = c.i; return this.openFile(recordById(o.ids[c.i]), false, c.i); }
      if (p.y < 22 || p.y > 330 || p.x < 50 || p.x > 590) return this.closeOver();
      return;
    }
    if (over.length) return;
    if (this.typed !== null) {
      if (this.showKeys) for (let i = 0; i < KEYS.length; i++) { const r = this.keyRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + PAD.h) return this.typeKey(KEYS[i]); }
      return;
    }
    const inBox = (b) => b && p.x >= b[0] && p.x <= b[0] + b[2] && p.y >= b[1] && p.y <= b[1] + b[3];
    const ti = this.shelfAt(p); if (ti >= 0) return this.openTrinket(ti);
    for (const [n, b] of Object.entries(RF.hits)) if (inBox(b)) return this.touchDesk(n);
    if (inBox(RF.her)) return this.ask();
    if (this.full && !this.talking() && !this.busy) this.nextLine();
  }
  /** Something on the counter clicked: the bell dings, the briefcase opens, the rest get a word from her. */
  touchDesk(n) {
    if (n === 'briefcase') return this.busyLine() || this.openCase();
    if (this.busyLine() || this.busy) return;
    if (n === 'boombox') { this.say(this.pick('boombox'), 'happy'); this.time.delayedCall(900, () => { if (this.free()) this.changeTape(); }); return; }
    if (n === 'machine' && this.t > 600) { this.say(this.pick('machine'), 'sly'); this.time.delayedCall(1200, () => { if (this.free()) this.makeCocoa(); }); return; }
    if (n === 'bell') { sfx('ding', 0.6, 1.0); this.play('laugh'); return this.say(this.pick('bell'), 'laugh'); }
    if (n === 'pad') { this.play('stamp', (ev) => { if (ev === 'hit') { sfx('clang', 0.3, 1.8); this.fx.push({ kind: 'stamp', x: RF.hits.pad[0] + 20, y: RF.hits.pad[1] - 30, t: 0, word: 'APPROVED' }); } }); return this.say(this.pick('pad'), 'wink'); }
    this.play('explain'); this.say(this.pick(n), 'happy');
  }
  /** Turns the open file's page. */
  turnPage(d) { const o = this.overlay, n = o.pages.length; if (n < 2) return; o.page = (o.page + d + n) % n; sfx('menu', 0.4, 1.3); this.drawFile(); }
  /** Leaves to another scene (DOSSIERS / ARCHIVE). */
  go(key) { if (this.typed !== null) this.closeTyping(); sfx('menu', 0.7, 1.2); this.scene.start(key, { from: 'Records' }); }
  /** Back to Trinkets; she tips her hat. */
  leave() {
    if (this.leaving) return; this.leaving = true;
    if (this.typed !== null) this.closeTyping();
    this.play('tip'); this.say(this.pick('bye'), 'wink');
    this.time.delayedCall(700, () => this.scene.start('Trinkets'));
  }
  /** Puts the keyboard back and drops the typing listener. */
  cleanup() {
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
    try { this.input.keyboard.enabled = true; this.input.keyboard.enableGlobalCapture(); } catch (e) { /* plugin gone */ }
  }

  /** The on-screen keys while you type (touch screens and pads). */
  drawKeys() {
    const g = this.keyG; g.clear();
    if (!this.showKeys || this.typed === null) return;
    KEYS.forEach((k, i) => {
      const r = this.keyRect(i), on = i === this.keyI, flash = this.keyFlash && this.keyFlash.k === k && this.t - this.keyFlash.t < 8;
      g.fillStyle(flash ? 0x7c1f30 : 0xf4ead2, 0.95); g.fillRoundedRect(r.x, r.y, r.w, PAD.h, 3);
      g.lineStyle(on ? 2 : 1, on ? 0x7c1f30 : 0x8a6a4a, 1); g.strokeRoundedRect(r.x + 0.5, r.y + 0.5, r.w - 1, PAD.h - 1, 3);
      if (this.keyTs[i]) this.keyTs[i].setColor(flash ? '#ffffff' : '#3a2418');
    });
  }
  /** The speech box: a cream card with a maroon edge, her name on a tab; the typing line when she's listening. */
  drawBox() {
    const g = this.boxG; g.clear();
    const fc = this.frame()[6], hx = fc ? fc[0] + 24 : 350, hy = fc ? fc[1] - 6 : 150;
    g.fillStyle(0x1a0e10, 0.3); g.fillRoundedRect(BOX.x + 3, BOX.y + 4, BOX.w, BOX.h, 8);
    g.fillStyle(0xf6efdc, 0.97); g.fillTriangle(BOX.x + 2, BOX.y + 54, BOX.x + 2, BOX.y + 76, Math.min(BOX.x - 12, hx + 18), Math.max(BOX.y + 40, Math.min(BOX.y + 110, hy)));
    g.fillRoundedRect(BOX.x, BOX.y, BOX.w, BOX.h, 8);
    g.lineStyle(2, 0x7c1f30, 1); g.strokeRoundedRect(BOX.x + 3, BOX.y + 3, BOX.w - 6, BOX.h - 6, 6);
    if (this.full && !this.talking() && this.queue && this.queue.length && this.t % 40 < 24) { g.fillStyle(0x7c1f30, 1); g.fillTriangle(BOX.x + BOX.w - 22, BOX.y + BOX.h - 14, BOX.x + BOX.w - 12, BOX.y + BOX.h - 14, BOX.x + BOX.w - 17, BOX.y + BOX.h - 9); }
    if (this.typed !== null) {
      this.inputT.setText('> ' + this.typed + (this.t % 40 < 22 ? '_' : ''));
      g.lineStyle(1, 0xc0a080, 1); g.lineBetween(BOX.x + 14, BOX.y + BOX.h - 10, BOX.x + BOX.w - 14, BOX.y + BOX.h - 10);
    }
    const n = briefcase().length; this.caseT.setText(n ? n + ' FILE' + (n > 1 ? 'S' : '') : '');
  }

  /** Every frame: input, her animation and face, talking, effects, and her little idle habits. */
  update() {
    this.t++;
    const m = this.menu.poll(), o = this.overlay;
    if (m.pads.length) this.usedPad = true;
    if (m.pads.length || m.ok || m.back || m.left || m.right || m.up || m.down) this.quietAt = this.t;
    this.lookAt = this.mouse || null;
    if (this.typed !== null) {
      // pad typing on the on-screen keys
      if (this.showKeys) {
        if (m.left) this.keyI = (this.keyI + KEYS.length - 1) % KEYS.length;
        if (m.right) this.keyI = (this.keyI + 1) % KEYS.length;
        if (m.up) this.keyI = Math.max(0, this.keyI - PAD.cols);
        if (m.down) this.keyI = Math.min(KEYS.length - 1, this.keyI + PAD.cols);
        if (m.pads.some((q) => q.button === 'a')) this.typeKey(KEYS[this.keyI]);
        if (m.pads.some((q) => q.button === 'b')) { this.closeTyping(); this.cancelAsk(); }
      }
    } else if (o) {
      if (o.kind === 'trinket') { if (m.left) this.flipTrinket(-1); if (m.right) this.flipTrinket(1); if (m.back || m.ok || m.pads.some((q) => q.button === 'b')) this.closeOver(); } else if (o.kind === 'file') { if (m.left) this.turnPage(-1); if (m.right) this.turnPage(1); if (m.back || m.ok || m.pads.some((q) => q.button === 'b')) this.closeOver(); }
      else {
        const n = o.ids.length;
        if (m.left) o.sel = (o.sel + n - 1) % n; if (m.right) o.sel = (o.sel + 1) % n;
        if (m.up) o.sel = Math.max(0, o.sel - 4); if (m.down) o.sel = Math.min(n - 1, o.sel + 4);
        if (m.left || m.right || m.up || m.down) { sfx('menu', 0.3, 1.2); this.drawCase(); }
        if (m.ok) this.openFile(recordById(o.ids[o.sel]), false, o.sel);
        else if (m.back || m.pads.some((q) => q.button === 'b')) this.closeOver();
      }
    } else {
      if (m.ok) { if (this.full && !this.talking() && this.queue.length) this.nextLine(); else this.ask(); }
      if (m.back || m.pads.some((q) => q.button === 'b')) this.leave();
      const kb = this.input.keyboard;
      if (kb && kb.enabled && !this.busy) {
        if (!this.kC) { this.kC = kb.addKey('C'); this.kF = kb.addKey('F'); this.kR = kb.addKey('R'); }
        if (Phaser.Input.Keyboard.JustDown(this.kC)) this.openCase();
        if (Phaser.Input.Keyboard.JustDown(this.kF)) this.go('Files');
        if (Phaser.Input.Keyboard.JustDown(this.kR)) this.go('Archive');
      }
      // left alone a while: she thinks, hums, or drops a hint
      if (!this.busy && !this.routine && !this.talking() && this.anim === 'idle' && this.t - this.lastAct > IDLE) {
        this.lastAct = this.t;
        const r = this.hintN++ % 3;
        if (r === 1) { this.play('think'); this.say(this.pick('hint'), 'think'); } else if (r === 2) { this.play('explain'); this.say(this.pick('idle'), 'smile'); } else { this.play('laugh'); this.say(this.pick('idle'), 'laugh'); }
      }
    }
    // the pointer over her / the counter things
    if (this.mouse && !o && this.typed === null) {
      const p = this.mouse, inBox = (b) => b && p.x >= b[0] && p.x <= b[0] + b[2] && p.y >= b[1] && p.y <= b[1] + b[3];
      const hot = inBox(RF.her) || Object.values(RF.hits).some(inBox) || this.shelfAt(p) >= 0;
      if (this.game.canvas) this.game.canvas.style.cursor = hot ? 'pointer' : '';
    }
    this.stepLife();
    this.stepAnim(); this.stepTalk(); this.drawFace(); this.drawFx(); this.drawLife(); this.drawTrips(); this.drawBox(); this.drawKeys();
  }
}

// her routines and mysteries (recordsLife.js) and her trinket trips (recordsTrips.js) join the scene; a method name
// may only exist once
for (const mix of [RecordsLife, RecordsTrips]) for (const k of Object.getOwnPropertyNames(mix.prototype)) {
  if (k === 'constructor') continue;
  if (k in RecordsScene.prototype) throw new Error(mix.name + ': ' + k + ' already exists on RecordsScene');
  RecordsScene.prototype[k] = mix.prototype[k];
}
