// HOPPLE's LOST BUILD (methods copied onto HoppleBossStage at the bottom of hoppleBossStage.js; a name clash throws on
// load). Everything that happens once he turns, at half health:
// - THE HAUNTING, the cutscene (`HAUNT`, `cutStep`): the picture freezes on him - YOU'RE STILL PLAYING? - the tape
//   tears, and the screen goes BLACK. In the dark a MISSING poster flashes up (`hopple_missing`, made by
//   tools/sprites/hopple_poster.py: CASSIE HOLLOWAY, age 9, last seen playing a video game in 1994), strobing with
//   static, while YOU DID THIS TO HER fills the screen around it, line after line, more and more, shaking. The poster
//   comes back with her eyes scratched out and his writing over it, closer, closer, the heartbeat faster - then silence -
//   then his face, all at once. The picture comes back on the LOST BUILD: blood rain, a sky of blood, and him, gored,
//   head down... THEN LET'S PLAY THE REAL GAME. (`HAUNT` timings; the music ducks out through it - duckMusic.)
// - HIS GORE (`drawGore`, into his PixelPen after the rest of him): matted blood on his fur, blood running from his
//   grin and his black eye sockets, the torn ear's raw stump, a stitched-up rip across his belly with stuffing and
//   blood coming out of it, red gloves; blood drips off him (`drips`) and stains the grass (`stains`).
// - THE LOST WORLD (`stepWorld` / `drawWorld`): blood rain, lightning (`WORLD.bolt`) that shows a little girl in
//   pigtails standing on the hills - closer every time (`girl`); missing posters on the trees and the sign; the hills
//   drift; the ? blocks bob up and down, bleeding, and carry whoever stands on them (`WORLD.bob`).
// - New attacks: RUN. (`run`: on all fours across the floor and back, leaving a smear - jump him), CREDITS ROLL
//   (`credits`: the game's credits rise up the screen, each line a bar with one gap - be in it; the last line is IN
//   MEMORY OF CASSIE HOLLOWAY), HIDE AND SEEK (`hide`: dark, he counts to ten while two red eyes move under the floor
//   toward you - READY OR NOT - he bursts up where they are), and, in both halves, HOPPLE'S FRIENDS (`friends`: his
//   little cartoon pals waddle after you - one hit pops one; gory once he's lost).
import { sfx } from '../audio/sfx.js';
import { duckMusic } from '../audio/music.js';
import { FONT } from '../config.js';

// the island's floor ends and the ? block ledges (height, inner and outer x) - hoppleBossStage.js uses these too
export const FLOOR = { x1: -262, x2: 262 };
export const LEDGE = { y: -112, x1: 142, x2: 222 };
// THE HAUNTING (frames): his question, the tape tears, black, the poster strobes, the scratched poster, every word red,
// silence, his face, the picture back, he speaks, his name card, the end
export const HAUNT = { ask: 4, tear: 70, black: 100, strobe: 124, words: 150, scrawl: 260, red: 360, quiet: 420, scare: 452, back: 468, speak: 548, card: 640, n: 660 };
// the flashes of the first poster ([from, to] frames), and how many lines of text there are at most
const FLASHES = [[124, 130], [146, 149], [166, 175], [188, 191], [204, 214], [226, 229], [238, 252]];
const MAX_WORDS = 64;
// the poster sheet (tools/sprites/hopple_poster.py): key, frame size
export const POSTER = { key: 'hopple_missing', w: 200, h: 272 };
// THE LOST WORLD: rain drops, frames between lightning (min, max), the girl's spots on the hills (screen x, y, scale -
// one more each strike, closer), the ? blocks' bob (px, frames a cycle)
const WORLD = { rain: 90, bolt: [300, 560], girl: [[96, 246, 0.5], [548, 250, 0.6], [190, 262, 0.78], [452, 276, 0.95], [300, 300, 1.3]], bob: 14, period: 260 };
// his blood: drips (every n frames), how long a stain lasts
const GORE = { drip: 5, stain: 420 };
// RUN.: passes (calm / lost), wind-up, speed, his hit
const RUN = { n: [2, 3], wind: 44, speed: 8.5, skid: 18, hit: [12, [40, 6.4, 0.8]] };
// CREDITS ROLL: the lines (the last one doesn't hurt), their spacing, rise speed, the gap's width, the bar's hit
const CREDITS = {
  lines: ['HOPPLE\'S HAPPY HILLS', 'PROGRAMMING ... R. HOLLOWAY', 'GRAPHICS ... R. HOLLOWAY', 'SOUND ... R. HOLLOWAY', 'PLAYTESTING ... CASSIE', 'SPECIAL THANKS ... YOU', 'IN MEMORY OF CASSIE HOLLOWAY'],
  space: 76, speed: 1.75, gap: 86, hit: [8, [90, 5.2, 0.6]],
};
// HIDE AND SEEK: frames per number counted, how fast his eyes move under the floor, the warning, the burst (width, hit)
const HIDE = { per: 24, eyes: 1.5, warn: 34, w: 64, hit: [15, [88, 7, 0.9]] };
// HOPPLE'S FRIENDS: how many (calm / lost), walk speed, size, how long they last, their hit
const PALS = { n: [3, 4], speed: 1.25, r: 12, life: 560, hit: [6, [50, 4, 0.45]] };
// blood colours
const BLOOD = { d: 0x3a0306, m: 0x7a0a12, l: 0xb81a22, meat: 0xd85a5a, stuff: 0xe8e0c8, stitch: 0x140808 };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;

/** HOPPLE's lost build: the haunting, his gore, the lost world and its attacks (see the top of the file). */
export class HoppleLost {
  // ------------------------------------------------------------------ setup
  /** Makes the haunting's layers (above everything on the screen, even the health bar) and the world's extras. */
  makeLost(s, world, bg, ui) {
    this.drips = []; this.stains = []; this.rain = []; this.bolt = 0; this.nextBolt = WORLD.bolt[0]; this.girlI = -1; this.hillOff = 0;
    this.rainG = s.add.graphics().setScrollFactor(0); bg.push(this.rainG);
    this.hauntG = ui(s.add.graphics().setDepth(45).setVisible(false));
    const has = s.textures.exists(POSTER.key);
    this.posterIm = ui(s.add.image(320, 180, has ? POSTER.key : '__WHITE', 0).setDepth(46).setVisible(false));
    this.hWords = Array.from({ length: MAX_WORDS }, () => ui(s.add.text(0, 0, 'YOU DID THIS TO HER', { fontFamily: FONT, fontSize: '8px', color: '#b01010' }).setOrigin(0.5).setDepth(47).setVisible(false)));
    this.hBig = ui(s.add.text(320, 330, '', { fontFamily: FONT, fontSize: '12px', color: '#ff1a1a', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(48).setVisible(false));
    this.scareIm = ui(s.add.image(320, 180, s.textures.exists('hopple_scare') ? 'hopple_scare' : '__WHITE').setScale(2).setDepth(49.5).setVisible(false));   // (the jumpscare, from hopple_poster.py)
    this.cutBoxG = ui(s.add.graphics().setDepth(44));
    this.cutBoxT = ui(s.add.text(150, 276, '', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', lineSpacing: 8 }).setDepth(44.5).setVisible(false));
    this.bigT = ui(s.add.text(320, 120, '', { fontFamily: FONT, fontSize: '26px', color: '#ff1a1a', stroke: '#000000', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(3.9).setVisible(false));
    // posters on the trees (background) and on the sign (world): only in the lost build
    this.treePosters = [1, 3, 5].map((i) => { const im = s.add.image(40 + i * 112 + (i % 2) * 20, 262 + (i % 3) * 8 - 10, has ? POSTER.key : '__WHITE', 0).setScrollFactor(0).setScale(0.07).setVisible(false); bg.push(im); return im; });
    this.signPoster = s.add.image(-233, -40, has ? POSTER.key : '__WHITE', 0).setScale(0.1).setVisible(false); world.push(this.signPoster);
    this.creditT = Array.from({ length: CREDITS.lines.length }, () => { const t = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1).setVisible(false); world.push(t); return t; });
    // the word positions for the haunting: fixed, so the screen fills the same creepy way each time
    let seed = 1994; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    this.wordAt = Array.from({ length: MAX_WORDS }, (_, i) => ({ x: 20 + rnd() * 600, y: 14 + rnd() * 332, size: 7 + Math.floor(rnd() * 3) * 3, flip: rnd() < 0.18, white: rnd() < 0.2, delay: i, ph: rnd() * 6 }));
  }

  // ------------------------------------------------------------------ the switch
  /** Half health: THE HAUNTING if someone's watching (the cutscene), otherwise it just turns. */
  onRage(match) {
    this.pinned = false; this.e.hide = false; this.clearFx(); this.e.tilt = 0;
    if (this.watched) { if (this.boss) this.boss.rage = 0; if (this.rageText) this.rageText.setText('').setVisible(false); this.cut = { kind: 'lost', t: 0, shot: null, once: new Set() }; this.ccam = { x: this.e.x, y: -100, zoom: 1.6 }; sfx('glitch', 1, 0.5); }
    else this.goLost();
  }
  /** The build is lost for good: the colours, his eyes and smile, the torn ear, the gore, the dying world. */
  goLost() { this.lostOn = true; this.lost = 1; this.gore = 1; this.e.eyes = 1; this.e.grin = 1; this.e.tear = 1; this.livesShown = 0; this.paintGround(); for (const p of this.treePosters || []) p.setVisible(true); if (this.signPoster) this.signPoster.setVisible(true); if (this.signT) this.signT.setVisible(false); }

  /** One frame of THE HAUNTING (see `HAUNT`): MatchScene runs it while everyone else holds still. */
  cutStep(match) {
    const C = this.cut, t = ++C.t, E = this.e, H = HAUNT, once = (k, at, fn) => { if (t >= at && !C.once.has(k)) { C.once.add(k); fn(); } };
    this.t++; if (this.flash > 0) this.flash--; this.glitchK *= 0.92;
    const h = this.core();
    // the camera: on his face; (black); low on the ground, then up to him
    C.shot = t < H.black ? { x: h.x, y: h.y + 8, zoom: 2.6 } : t < H.back ? { x: h.x, y: h.y, zoom: 2.6 } : t < H.speak ? { x: lerp(E.x - 120, h.x, Math.min(1, (t - H.back) / 70)), y: lerp(-24, h.y + 4, Math.min(1, (t - H.back) / 70)), zoom: lerp(1.3, 2.4, Math.min(1, (t - H.back) / 70)) } : { x: h.x, y: h.y + 6, zoom: 2.8 };
    once('duck', 1, () => duckMusic(0.35));
    if (t < H.tear) { E.arms = 'wave'; E.dir = 1; E.y = 0; }
    once('ask', H.ask, () => { this.box = { x: E.x, y: -230, shown: 0, text: 'YOU\'RE STILL PLAYING?', fade: 0, cut: true }; });
    if (this.box && this.box.cut && t < H.tear) { const n = Math.min(this.box.text.length, Math.floor(t / 2)); if (n > this.box.shown) { this.box.shown = n; sfx('menu', 0.25, 1.4); } }
    once('tear', H.tear, () => { this.box = null; this.glitchK = 1; this.flash = 6; sfx('glitch', 1, 0.4); sfx('buzz', 0.8, 0.4); match.shake(10, 30); this.osdLine = { text: 'TRACKING', t: 40 }; E.eyes = 1; });
    if (t > H.tear && t < H.black) { E.ghost = 0.6 + Math.random() * 0.4; E.tilt = (Math.random() - 0.5) * 0.12; E.grin = Math.random() < 0.3 ? 1 : 0; if (t % 5 === 0) sfx('glitch', 0.5, 0.4 + Math.random() * 0.5); }
    // the dark
    once('black', H.black, () => { this.haunt = { on: true }; duckMusic(0); sfx('buzz', 0.5, 0.3); E.ghost = 0; E.tilt = 0; });
    const hn = this.haunt;
    if (hn && t < H.back) {
      const fl = FLASHES.find(([a, b]) => t >= a && t < b);
      hn.poster = t >= H.scrawl ? (t < H.red || t % 8 < 6 ? 1 : 0) : fl ? 0 : -1;
      if (fl && t === fl[0]) { sfx('buzz', 0.7, 0.45 + Math.random() * 0.3); sfx('glitch', 0.5, 0.6); }
      hn.scale = t >= H.scrawl ? lerp(1.0, 1.55, Math.min(1, (t - H.scrawl) / (H.quiet - H.scrawl))) : 1.0 + Math.random() * 0.02;
      hn.shake = t >= H.scrawl ? lerp(1, 7, Math.min(1, (t - H.scrawl) / (H.quiet - H.scrawl))) : fl ? 3 : 0;
      hn.words = t >= H.words ? Math.min(MAX_WORDS, Math.floor((t - H.words) / (t > H.scrawl ? 2.2 : 4.5))) : 0;
      hn.red = t >= H.red;
      hn.static = !!fl || (t >= H.scrawl && Math.random() < 0.2);
      const every = Math.round(lerp(46, 10, Math.max(0, Math.min(1, (t - H.words) / (H.quiet - H.words)))));
      if (t >= H.words && t < H.quiet && t % every === 0) { sfx('bighit', 0.55, 0.32); match.shake(2, 3); }
      once('scrawl', H.scrawl, () => { sfx('scream', 0.25, 0.45); sfx('buzz', 0.8, 0.35); });
      if (t >= H.quiet) { hn.poster = -1; hn.words = 0; hn.static = false; hn.shake = 0; }
      once('quiet', H.quiet, () => { this.goLost(); E.x = E.x || 0; E.y = 0; E.arms = 'idle'; E.headDown = 1; E.grin = 0.2; });
      once('scare', H.scare, () => { this.scare = 1; this.scareGore = true; sfx('scream', 1, 0.6); sfx('bighit', 1, 0.45); match.shake(18, 16); });
      if (t >= H.scare) this.scare = t < H.back - 6 ? 1 : Math.max(0, (H.back - t) / 6);
    }
    once('back', H.back, () => { this.haunt = null; this.scare = 0; this.flash = 4; this.bolt = 12; this.girlI = 0; sfx('thunder', 0.9, 0.8); duckMusic(0.6); this.ccam = { x: E.x - 120, y: -24, zoom: 1.3 }; });
    if (t >= H.back) { this.stepWorld(match); E.headDown = Math.max(0, 1 - Math.max(0, t - (H.speak - 30)) / 40); this.stepGore(); }
    once('speak', H.speak, () => { this.box = { x: E.x, y: -230, shown: 0, text: 'THEN LET\'S PLAY THE REAL GAME.', fade: 0, cut: true, red: true }; sfx('laugh', 0.8, 0.45); });
    if (t >= H.speak && this.box && this.box.cut) { E.grin = Math.min(1, (t - H.speak) / 50); const n = Math.min(this.box.text.length, Math.floor((t - H.speak) / 2)); if (n > this.box.shown) { this.box.shown = n; sfx('menu', 0.25, 0.6); } }
    once('card', H.card, () => { this.box = null; this.flash = 10; sfx('roar', 0.9, 0.5); });
    if (t >= H.n) this.endCut(match);
  }
  /** A fresh press skips the rest of the cutscene. */
  skipCut(match) { this.endCut(match); }
  /** The cutscene's over: lost for good, the music back, and the name card. */
  endCut(match) {
    if (!this.cut) return; this.cut = null; this.box = null; this.haunt = null; this.scare = 0; this.goLost();
    const E = this.e; E.tilt = 0; E.ghost = 0; E.headDown = 0; E.grin = 1; E.y = 0; duckMusic(1);
    this.startCard(match, { name: 'HOPPLE.LOST', title: 'HE NEVER LET HER STOP PLAYING', tag: '-  LOST BUILD  -' });
  }
  /** The cutscene's dialogue box (on the screen, like the game's own RPG box): his little face and his words. */
  drawCutBox() {
    const g = this.cutBoxG, X = this.box && this.box.cut ? this.box : null; g.clear();
    this.cutBoxT.setVisible(!!X); if (!X) return;
    const red = !!X.red, x = 70, y = 262, w = 500, h = 74;
    g.fillStyle(red ? 0x140204 : 0x0a0a3a, 0.94); g.fillRect(x, y, w, h);
    g.lineStyle(3, red ? 0xb01010 : 0xffffff, 1); g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.lineStyle(1, red ? 0x5a0a0a : 0x6a8aff, 1); g.strokeRect(x + 6, y + 6, w - 12, h - 12);
    g.fillStyle(0x000000, 1); g.fillRect(x + 12, y + 12, 50, 50);
    this.drawHead(g, x + 37, y + 40, 1, red && this.t % 20 < 10 ? 1 : 0);
    if (red) { g.fillStyle(0x9a0a12, 1); g.fillRect(x + 31, y + 41, 2, 8); g.fillRect(x + 41, y + 41, 2, 6); }
    this.cutBoxT.setText('HOPPLE:\n' + X.text.slice(0, X.shown)).setColor(red ? '#ff3a3a' : '#ffffff').setPosition(x + 76 + (red ? (Math.random() - 0.5) * 2 : 0), y + 14);
  }
  /** THE HAUNTING on the screen (black, the poster, the words, static) - over everything, even the health bar. */
  drawHaunt() {
    const g = this.hauntG, hn = this.haunt;
    g.setVisible(!!hn); this.posterIm.setVisible(false); this.hBig.setVisible(false);
    for (const w of this.hWords) w.setVisible(false);
    if (!hn) return;
    g.clear(); g.fillStyle(0x000000, 1); g.fillRect(0, 0, 640, 360);
    const t = this.cut ? this.cut.t : 0;
    if (hn.poster >= 0 && this.scene.textures.exists(POSTER.key)) {
      const j = () => (Math.random() - 0.5) * 2 * hn.shake;
      this.posterIm.setVisible(true).setTexture(POSTER.key, hn.poster).setPosition(320 + j(), 180 + j()).setScale(hn.scale * 1.18).setAlpha(Math.random() < 0.08 ? 0.5 : 1).setTint(hn.red && t % 6 < 3 ? 0xff9a9a : 0xffffff);
    }
    for (let i = 0; i < hn.words; i++) {
      const W = this.wordAt[i], w = this.hWords[i], jit = hn.red ? 3 : 1;
      w.setVisible((t + i) % 23 > (hn.red ? 1 : 4)).setFontSize(W.size + (hn.red ? 2 : 0)).setPosition(W.x + (Math.random() - 0.5) * jit * 2, W.y + (Math.random() - 0.5) * jit * 2).setFlipX(W.flip).setColor(hn.red ? (t % 4 < 2 ? '#ff1010' : '#8a0000') : W.white ? '#d8d0d0' : '#a00e0e').setAlpha(0.55 + 0.45 * Math.abs(Math.sin(t * 0.07 + W.ph)));
    }
    if (hn.words > 20) this.hBig.setVisible(t % 30 < 22).setText('YOU DID THIS TO HER').setFontSize(hn.red ? 18 : 12).setPosition(320 + (Math.random() - 0.5) * (hn.red ? 6 : 2), 336);
    if (hn.static) for (let i = 0; i < 70; i++) { const c = Math.random() < 0.5 ? 0xffffff : 0x606060; g.fillStyle(c, Math.random() * 0.5); g.fillRect(Math.random() * 640, Math.random() * 360, 2 + Math.random() * 40, 1 + Math.random() * 2); }
    if (hn.red) { g.fillStyle(0x6a0000, 0.18 + 0.1 * Math.sin(t * 0.5)); g.fillRect(0, 0, 640, 360); }
  }

  // ------------------------------------------------------------------ the lost world
  /** The lost world's frame: blood rain, lightning and the girl on the hills, the bobbing ? blocks, his blood. */
  stepWorld(match) {
    if (!this.lostOn) return;
    while (this.rain.length < WORLD.rain) this.rain.push({ x: Math.random() * 700, y: Math.random() * 360, v: 6 + Math.random() * 4, l: 6 + Math.random() * 8 });
    for (const r of this.rain) { r.y += r.v; r.x -= r.v * 0.25; if (r.y > 360) { r.y = -10; r.x = Math.random() * 700; } }
    this.hillOff += 0.15;
    if (this.bolt > 0) this.bolt--;
    if (--this.nextBolt <= 0 && !this.cut) { this.bolt = 12; this.nextBolt = WORLD.bolt[0] + Math.floor(Math.random() * (WORLD.bolt[1] - WORLD.bolt[0])); this.girlI = (this.girlI + 1) % (WORLD.girl.length + 1); sfx('thunder', 0.7, 0.7 + Math.random() * 0.3); this.boltX = 80 + Math.random() * 480; }
    // the ? blocks bob (in opposite time), carrying whoever stands on them
    const P = this.platforms;
    for (const [i, ph] of [[1, 0], [2, Math.PI]]) {
      const p = P[i]; if (!p) continue;
      const ny = Math.round(LEDGE.y + Math.sin(this.t * Math.PI * 2 / WORLD.period + ph) * WORLD.bob), dy = ny - p.y;
      if (dy && match && match.fighters) { p.y = ny; for (const f of match.fighters) if (f.grounded && f.platform === p) f.y += dy; }
    }
  }
  /** His blood: drips off his mouth and hands, and the stains they leave on the grass. */
  stepGore() {
    const E = this.e;
    if (this.gore > 0 && !E.hide && this.t % GORE.drip === 0) {
      const d = E.dir, from = [[E.x + d * 10, E.y - 70], [E.x + d * 26, E.y - 46], [E.x - d * 22, E.y - 46], [E.x + d * 4, E.y - 36]][Math.floor(Math.random() * 4)];
      this.drips.push({ x: from[0] + (Math.random() - 0.5) * 6, y: from[1], vy: 0.5 });
    }
    for (const p of this.drips) { p.vy += 0.3; p.y += p.vy; if (p.y >= -1) { p.dead = true; if (this.stains.length < 60) this.stains.push({ x: p.x, r: 3 + Math.random() * 5, life: GORE.stain }); } }
    this.drips = this.drips.filter((p) => !p.dead);
    for (const s of this.stains) s.life--;
    this.stains = this.stains.filter((s) => s.life > 0);
  }
  /** The lost world's moving parts (background, screen pixels): blood rain, lightning, the girl on the hills. */
  drawWorld() {
    const g = this.rainG; g.clear();
    if (!this.lostOn) return;
    for (const r of this.rain) { g.lineStyle(1, 0x8a0a12, 0.55); g.lineBetween(r.x, r.y, r.x - r.l * 0.25, r.y + r.l); }
    if (this.bolt > 0) {
      const k = this.bolt / 12;
      g.fillStyle(0xffe0e0, 0.35 * k); g.fillRect(0, 0, 640, 360);
      let x = this.boltX || 320, y = 0; g.lineStyle(2, 0xffffff, k);
      while (y < 220) { const nx = x + (Math.random() - 0.5) * 40, ny = y + 20 + Math.random() * 20; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      const G = WORLD.girl[this.girlI];
      if (G) {                                                                    // her, in the lightning: a little girl with pigtails, standing still
        const [gx, gy, s] = G; g.fillStyle(0x050203, Math.min(1, k * 1.6));
        g.fillCircle(gx, gy - 30 * s, 6 * s); g.fillCircle(gx - 7 * s, gy - 27 * s, 3 * s); g.fillCircle(gx + 7 * s, gy - 27 * s, 3 * s);
        g.fillTriangle(gx - 9 * s, gy, gx + 9 * s, gy, gx, gy - 24 * s); g.fillRect(gx - 3 * s, gy, 2 * s, 7 * s); g.fillRect(gx + 1 * s, gy, 2 * s, 7 * s);
      }
    }
  }
  /** On the ground: his blood stains, the drips falling, the ? blocks' bleeding (world). */
  drawGoreFx(g) {
    for (const s of this.stains) { g.fillStyle(0x5a0408, Math.min(0.85, s.life / 120)); g.fillEllipse(s.x, 0, s.r * 2.4, s.r * 0.7); }
    for (const p of this.drips) { g.fillStyle(0x9a0a12, 1); g.fillRect(p.x - 1, p.y - 2, 2, 4); }
    if (this.lostOn) for (const i of [1, 2]) { const p = this.platforms[i]; if (!p) continue; for (let k = 0; k < 3; k++) { const x = p.x1 + 12 + k * 26, l = 4 + ((this.t >> 2) + k * 7) % 14; g.fillStyle(0x8a0a12, 1); g.fillRect(x, p.y + 16, 2, l); } }
  }

  // ------------------------------------------------------------------ his gore (pixel art)
  /**
   * Draws his gore into the pen over the rest of him (`P` = the PixelPen, `T(x, y)` = a point on him (relative to his
   * feet, facing right) in the world, `E` = him, `m` = where his mouth is and how wide (x, y, w)).
   */
  drawGore(P, T, E, m) {
    if (!(this.gore > 0)) return;
    const d = E.dir, bob = Math.sin(this.t * 0.12) * 1.5;
    // matted blood on his head and arms
    for (const [x, y, w, h] of [[-16, -104, 12, 8], [22, -96, 8, 6], [-24, -86, 7, 10], [6, -112, 9, 5]]) { const p = T(x, y + bob); P.fillStyle(BLOOD.m); P.fillEllipse(p.x, p.y, w, h); P.fillStyle(BLOOD.d); P.fillEllipse(p.x + 1, p.y + 1, w * 0.5, h * 0.5); }
    // blood out of his grin, down his chin and onto his chest
    for (const s of [-1, 1]) {
      const x0 = m.x + s * m.w * 0.42, len = 14 + ((this.t >> 3) + (s > 0 ? 3 : 0)) % 9;
      P.lineStyle(3, BLOOD.l); P.lineBetween(x0, m.y + 3, x0 + s, m.y + 3 + len);
      P.fillStyle(BLOOD.l); P.fillCircle(x0 + s, m.y + 4 + len, 2.2);
    }
    const ch = T(10, -64); P.fillStyle(BLOOD.m); P.fillEllipse(ch.x, ch.y, 20, 10);
    // red tears out of the black sockets
    for (const [ex, ey] of [[2, -96], [20, -96]]) { const p = T(ex, ey + 9 + bob), l = 10 + ((this.t >> 3) + ex) % 10; P.lineStyle(2, BLOOD.l); P.lineBetween(p.x, p.y, p.x, p.y + l); P.fillStyle(BLOOD.l); P.fillCircle(p.x, p.y + l, 1.6); }
    // the torn ear: a raw stump with stuffing
    const st = T(-13, -112 + bob); P.fillStyle(BLOOD.meat); P.fillCircle(st.x, st.y, 6); P.fillStyle(BLOOD.m); P.fillCircle(st.x, st.y, 3.5); P.fillStyle(BLOOD.stuff); P.fillCircle(st.x - 4 * d, st.y - 3, 2);
    // the rip across his belly: stuffing and blood through crude stitches
    const b0 = T(-16, -38), b1 = T(18, -30), mid = T(1, -34);
    P.fillStyle(BLOOD.d); P.fillPoints([{ x: b0.x, y: b0.y }, { x: mid.x, y: mid.y - 5 }, { x: b1.x, y: b1.y }, { x: mid.x, y: mid.y + 5 }]);
    P.fillStyle(BLOOD.m); P.fillEllipse(mid.x, mid.y, 18, 4);
    for (const k of [-0.3, 0.1, 0.45]) { const p = { x: lerp(b0.x, b1.x, k + 0.3), y: lerp(b0.y, b1.y, k + 0.3) }; P.fillStyle(BLOOD.stuff); P.fillCircle(p.x, p.y - 1, 2.5); }
    P.lineStyle(1, BLOOD.stitch);
    for (let i = 0; i < 5; i++) { const k = (i + 0.5) / 5, x = lerp(b0.x, b1.x, k), y = lerp(b0.y, b1.y, k); P.lineBetween(x - 3, y - 4, x + 3, y + 4); P.lineBetween(x + 3, y - 4, x - 3, y + 4); }
    for (let i = 0; i < 3; i++) { const x = lerp(b0.x, b1.x, 0.25 + i * 0.25), l = 8 + ((this.t >> 3) + i * 5) % 12; P.lineStyle(2, BLOOD.l); P.lineBetween(x, mid.y + 3, x, mid.y + 3 + l); }
    // red-soaked gloves
    for (const [hx, hy, r] of [[E.hp[0], E.hp[1], 7.5], [E.hp[2], E.hp[3], 6.5]]) { const p = T(hx, hy); P.fillStyle(BLOOD.m); P.fillEllipse(p.x, p.y + r * 0.35, r * 1.8, r); }
    // splashes on his shoes
    for (const s of [-1, 1]) { const f = T(s * 14 + 6, -7); P.fillStyle(BLOOD.m); P.fillCircle(f.x, f.y, 2.5); }
  }

  // ------------------------------------------------------------------ new attacks
  /** RUN.: big red letters - then he drops to all fours at one end of the island and charges across it and back. */
  start_run(match, a) {
    const f = this.nearest(match, this.e.x), side = f && f.x > 0 ? -1 : 1, E = this.e;
    a.n = RUN.n[this.lostOn ? 1 : 0]; a.st = 'wind'; a.k = 0; this.pinned = true;
    E.x = side * (FLOOR.x2 - 34); E.y = 0; E.dir = -side; E.ghost = 1; this.glitchK = 1;
    this.bigText('RUN.', 70); sfx('glitch', 0.8, 0.5); sfx('scream', 0.4, 0.5);
  }
  /** One frame of RUN. (see start_run). */
  atk_run(match, a, out) {
    const E = this.e; a.k++;
    if (a.st === 'wind') { E.arms = 'grab'; E.sq = Math.min(0.6, a.k / 30); E.tilt = E.dir * 0.2; if (a.k >= this.sp(RUN.wind)) { a.st = 'go'; a.k = 0; a.id = this.sid('run'); } }
    else if (a.st === 'go') {
      E.tilt = E.dir * 0.75; E.arms = 'grab'; E.sq = -0.2; E.x += E.dir * RUN.speed;
      out.push(this.bhit(a.id, E.x - 36, -72, E.x + 36, 2, ...RUN.hit, { dirX: E.dir }));
      if (a.k % 7 === 0) { sfx('land', 0.4, 0.6); if (this.stains) this.stains.push({ x: E.x, r: 6, life: GORE.stain }); }
      if (Math.abs(E.x) >= FLOOR.x2 - 34) { a.st = 'skid'; a.k = 0; match.shake(4, 6); }
    } else if (a.st === 'skid') { E.tilt = lerp(E.tilt, 0, 0.2); if (a.k >= RUN.skid) { if (--a.n > 0) { E.dir = -E.dir; a.st = 'go'; a.k = 0; a.id = this.sid('run'); sfx('roar', 0.4, 1.3); } else { E.tilt = 0; this.pinned = false; E.arms = 'idle'; return true; } } }
    return false;
  }

  /** CREDITS ROLL: the screen goes dark like the end of the game, and its credits rise up through the arena - every line a bar with one gap. */
  start_credits(match, a) {
    a.k = 0; this.dark = 0.45; this.rows = [];
    let last = 0;
    CREDITS.lines.forEach((text, i) => {
      const pick = () => FLOOR.x1 + 40 + Math.random() * (FLOOR.x2 - FLOOR.x1 - 80 - CREDITS.gap);
      let gx = pick();
      if (i > 0) for (let tries = 0; tries < 20 && Math.abs(gx - last) < 90; tries++) gx = pick();   // (not right above the last gap)
      last = gx; this.rows.push({ text, y: 70 + i * CREDITS.space, gx, id: this.sid('cr'), safe: i === CREDITS.lines.length - 1 });
    });
    this.osdLine = { text: 'THE END?', t: 120 }; sfx('ding', 0.5, 0.5); this.e.arms = 'idle';
  }
  /** One frame of CREDITS ROLL (see start_credits). */
  atk_credits(match, a, out) {
    a.k++;
    for (const r of this.rows) {
      r.y -= CREDITS.speed;
      if (r.safe || r.y > 30 || r.y < -380) continue;
      out.push(this.bhit(r.id + 'a', FLOOR.x1 - 60, r.y - 6, r.gx, r.y + 4, ...CREDITS.hit), this.bhit(r.id + 'b', r.gx + CREDITS.gap, r.y - 6, FLOOR.x2 + 60, r.y + 4, ...CREDITS.hit));
    }
    if (this.rows.every((r) => r.y < -400)) { this.rows = null; this.dark = 0; return true; }
    return false;
  }
  /** The credits' bars and words (world). */
  drawCredits(g) {
    for (const t of this.creditT) t.setVisible(false);
    if (!this.rows) return;
    this.rows.forEach((r, i) => {
      const T = this.creditT[i]; if (r.y > 80 || r.y < -400) return;
      if (!r.safe) { g.fillStyle(0xffffff, 0.9); g.fillRect(FLOOR.x1 - 60, r.y - 3, r.gx - FLOOR.x1 + 60, 4); g.fillRect(r.gx + CREDITS.gap, r.y - 3, FLOOR.x2 + 60 - r.gx - CREDITS.gap, 4); g.lineStyle(1, 0xff3a3a, 0.6); g.strokeRect(r.gx, r.y - 6, CREDITS.gap, 10); }
      const left = r.gx - FLOOR.x1 > FLOOR.x2 - r.gx - CREDITS.gap, cx = r.safe ? 0 : left ? (FLOOR.x1 + r.gx) / 2 : (r.gx + CREDITS.gap + FLOOR.x2) / 2;
      if (T) T.setVisible(true).setText(r.text).setPosition(cx, r.y - 6).setColor(r.safe ? '#ff4a4a' : '#ffffff');
    });
  }

  /** HIDE AND SEEK: dark, he sinks into the ground and counts to ten while his eyes creep toward you under the floor - READY OR NOT. */
  start_hide(match, a) {
    const E = this.e; a.st = 'sink'; a.k = 0; a.n = 0; this.pinned = true; this.dark = 0;
    this.seek = { x: E.x, on: false, glow: 0 }; this.bigText('LET\'S PLAY HIDE AND SEEK', 80, 12); sfx('laugh', 0.5, 0.6);
  }
  /** One frame of HIDE AND SEEK (see start_hide). */
  atk_hide(match, a, out) {
    const E = this.e, S = this.seek; a.k++;
    if (a.st === 'sink') { this.dark = Math.min(0.8, this.dark + 0.02); E.y = Math.min(60, E.y + 1.6); E.sq = 0.3; if (E.y > 50) { E.hide = true; S.on = true; a.st = 'count'; a.k = 0; } return false; }
    if (a.st === 'count') {
      const f = this.nearest(match, S.x); if (f) S.x += Math.sign(f.x - S.x) * Math.min(HIDE.eyes, Math.abs(f.x - S.x));
      S.x = Math.max(FLOOR.x1 + 20, Math.min(FLOOR.x2 - 20, S.x));
      if (a.k % this.sp(HIDE.per) === 1 && a.n < 10) { a.n++; this.bigText(a.n + '...', HIDE.per, 22); sfx('ding', 0.5, 0.45 + a.n * 0.02); }
      if (a.n >= 10 && a.k % this.sp(HIDE.per) === 0) { a.st = 'warn'; a.k = 0; this.bigText('READY OR NOT', HIDE.warn + 20, 18); sfx('warn', 0.7, 0.6); }
      return false;
    }
    if (a.st === 'warn') { S.glow = 1; match.shake(2, 2); if (a.k >= this.sp(HIDE.warn)) { a.st = 'burst'; a.k = 0; a.id = this.sid('seek'); E.x = S.x; E.y = 0; E.hide = false; E.sq = -0.8; E.arms = 'up'; S.on = false; sfx('scream', 0.9, 0.6); sfx('bighit', 1, 0.5); match.shake(14, 14); for (let i = 0; i < 18; i++) this.drips.push({ x: S.x + (Math.random() - 0.5) * 40, y: -10 - Math.random() * 60, vy: -4 - Math.random() * 4 }); } return false; }
    if (a.st === 'burst') {
      if (a.k <= 8) out.push(this.bhit(a.id, E.x - HIDE.w / 2, -150, E.x + HIDE.w / 2, 4, ...HIDE.hit));
      this.dark = Math.max(0, this.dark - 0.03);
      if (a.k >= 40) { this.seek = null; this.pinned = false; E.arms = 'idle'; this.dark = 0; return true; }
    }
    return false;
  }
  /** His eyes under the floor while he hides (screen layer, so they shine through the dark). */
  drawSeek(g, cam) {
    const S = this.seek; if (!S || !S.on || !cam) return;
    const px = (S.x - cam.worldView.x) * cam.zoom, py = (18 - cam.worldView.y) * cam.zoom, r = (3 + S.glow * 2) * cam.zoom;
    for (const s of [-1, 1]) { g.fillStyle(0xff0a0a, 0.25); g.fillCircle(px + s * 7 * cam.zoom, py, r * 2.2); g.fillStyle(0xff2a2a, 1); g.fillCircle(px + s * 7 * cam.zoom, py, r); }
  }

  /** HOPPLE'S FRIENDS: his little cartoon pals waddle in from both sides after you. One hit pops one. */
  start_friends(match, a) {
    const n = PALS.n[this.lostOn ? 1 : 0];
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1; this.shots.push({ k: 'pal', type: i % 3, x: side * (FLOOR.x2 - 10 - i * 14), y: -PALS.r, vx: 0, vy: 0, r: PALS.r, life: PALS.life, wait: 10 + i * 18, hit: PALS.hit, id: this.sid('pal'), pop: true, hop: 0 }); }
    a.k = 0; this.e.arms = 'wave'; sfx('ding', 0.5, 1.4);
  }
  /** One frame of HOPPLE'S FRIENDS: done when they're all popped (or old). */
  atk_friends(match, a) { a.k++; if (a.k > 50) this.e.arms = 'idle'; return (a.k > 90 && !this.shots.some((s) => s.k === 'pal')) || a.k > PALS.life + 40; }
  /** A friend walking after the nearest fighter and hopping now and then. */
  stepPal(s, match) {
    const f = this.nearest(match, s.x);
    s.vx = f ? Math.sign(f.x - s.x) * PALS.speed * (this.lostOn ? 1.4 : 1) : 0;
    s.x = Math.max(FLOOR.x1 + 8, Math.min(FLOOR.x2 - 8, s.x + s.vx));
    s.hop = (s.hop || 0) + 0.18; s.y = -PALS.r - Math.abs(Math.sin(s.hop)) * 8;
  }
  /** One friend: a bear, a duck or a cat with a big cartoon grin - gored and black-eyed in the lost build. */
  drawPal(g, s) {
    const x = s.x, y = s.y, d = s.vx < 0 ? -1 : 1, L = this.lostOn, col = [0xb8742a, 0xffd23a, 0xa8a8b8][s.type];
    g.fillStyle(0x140a0a, 1); g.fillEllipse(x, y + 2, 26, 26);
    if (s.type === 0) for (const e of [-1, 1]) { g.fillStyle(0x140a0a, 1); g.fillCircle(x + e * 9, y - 9, 6); g.fillStyle(col, 1); g.fillCircle(x + e * 9, y - 9, 4.5); }
    if (s.type === 2) for (const e of [-1, 1]) { g.fillStyle(0x140a0a, 1); g.fillTriangle(x + e * 4, y - 8, x + e * 12, y - 8, x + e * 10, y - 18); g.fillStyle(col, 1); g.fillTriangle(x + e * 5, y - 9, x + e * 11, y - 9, x + e * 9.5, y - 16); }
    g.fillStyle(col, 1); g.fillEllipse(x, y + 2, 23, 23);
    if (s.type === 1) { g.fillStyle(0xff8a1a, 1); g.fillEllipse(x + d * 9, y + 4, 10, 5); }
    for (const e of [-1, 1]) { const ex = x + d * 2 + e * 5; if (L) { g.fillStyle(0x020102, 1); g.fillEllipse(ex, y - 1, 5, 7); g.fillStyle(0xb81a22, 1); g.fillRect(ex - 0.5, y + 3, 1, 4 + ((this.t >> 3) + e) % 4); } else { g.fillStyle(0xffffff, 1); g.fillEllipse(ex, y - 1, 5, 7); g.fillStyle(0x101018, 1); g.fillCircle(ex + d, y, 1.6); } }
    g.fillStyle(L ? 0x3a0306 : 0x6a1020, 1); g.fillEllipse(x + d * 2, y + 7, L ? 13 : 8, L ? 5 : 3);
    if (L) { g.fillStyle(0xffffff, 1); for (let i = -2; i <= 2; i++) g.fillTriangle(x + d * 2 + i * 2.4 - 1, y + 5, x + d * 2 + i * 2.4 + 1, y + 5, x + d * 2 + i * 2.4, y + 7); g.fillStyle(0x7a0a12, 1); g.fillEllipse(x - 5, y + 6, 6, 3); }
  }

  /** Big words in the middle of the screen for a while (RUN., the counting). */
  bigText(s, frames, size = 26) { this.bigLine = { s, t: frames, size }; }
  /** The big words, each frame. */
  drawBigText() {
    const B = this.bigLine;
    if (!B || B.t <= 0) { this.bigT.setVisible(false); return; }
    B.t--;
    this.bigT.setVisible(true).setText(B.s).setFontSize(B.size).setPosition(320 + (Math.random() - 0.5) * 3, 120 + (Math.random() - 0.5) * 3);
  }
}
