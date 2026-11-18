// CLASSIC MODE's ENDING: after the boss at the end of a CLASSIC run falls, a minute-long cinematic of what that fighter
// did next (the shots and captions are `ENDINGS` in src/data/classic.js; %B = the boss they beat): eight shots of
// `SHOT` frames, each a code-drawn backdrop (`paint<Kind>`: the beaten boss's arena smoking at dawn, the road home,
// a campfire, a town, above the clouds, the sea, a shrine, a castle, a gig, sunrise, or a stage's own picture),
// the fighter in it (their idle sprite: standing, walking, far off, sitting), captions typed into the letterbox, a fade
// between shots. Then THE END, and their CLASSIC TROPHY is revealed - a gold statue turning on a pedestal - with the
// coins the clear paid. J / Enter / A skips to the trophy (after a moment); then any of them goes back to CLASSIC.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { fighterById, showFighter } from '../fighters/roster.js';
import { stageById } from '../stage/stages.js';
import { ENDINGS, CLASSIC_TROPHIES, CLASSIC_TIERS, goldStatue } from '../data/classic.js';

// timings (frames): one shot, the fade at each end of it, how fast captions type, THE END card, before a skip works
const SHOT = 450, FADE = 30, TYPE = 2, END = 240, SKIP_AFTER = 60;
// the letterbox: its height top and bottom
const BAR = { top: 28, bottom: 56 };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A colour part of the way from one to another (k = 0..1). */
const mix = (c1, c2, k) => { const a = Phaser.Display.Color.IntegerToColor(c1), b = Phaser.Display.Color.IntegerToColor(c2); return Phaser.Display.Color.GetColor(lerp(a.red, b.red, k), lerp(a.green, b.green, k), lerp(a.blue, b.blue, k)); };

/** CLASSIC MODE's ending cinematic and trophy reveal (see the top of the file). */
export class ClassicEndingScene extends Phaser.Scene {
  constructor() { super('ClassicEnding'); }

  /** data: { fighter, skin, tier, boss (its short name), stage (its arena), coins, first }. Sets up the layers. */
  create(data = {}) {
    this.d = data; this.t = 0; this.menu = new MenuInput(this);
    const F = fighterById(data.fighter); this.def = F.def; this.fname = F.name;
    this.E = ENDINGS[data.fighter] || { music: 'bgm_trophy_hall', tint: 0xffd060, shots: ENDINGS['soul-summoner'].shots.map((s) => ({ ...s, text: s === ENDINGS['soul-summoner'].shots[0] ? s.text : ['AND SO THE ROAD WENT ON.', 'AS ROADS DO.'] })) };
    this.total = this.E.shots.length * SHOT;
    playMusic(this, this.E.music || 'bgm_trophy_hall');
    this.cameras.main.setBackgroundColor('#000000');
    this.bg = this.add.graphics(); this.pic = this.add.graphics(); this.mid = this.add.graphics();
    this.hero = this.add.sprite(0, 0, 'ss_idle', 0);
    this.front = this.add.graphics(); this.ui = this.add.graphics();
    const T = (x, y, size, color, o = {}) => this.add.text(x, y, '', { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 3, align: 'center', ...o }).setOrigin(0.5);
    this.cap = [T(VIEW_W / 2, VIEW_H - 40, 8, '#ffffff'), T(VIEW_W / 2, VIEW_H - 22, 8, '#ffffff')];
    this.big = T(VIEW_W / 2, 150, 22, '#ffffff', { strokeThickness: 6 });
    this.sub = T(VIEW_W / 2, 186, 8, '#ffe08a');
    this.line = T(VIEW_W / 2, 300, 6, '#e8e4ff', { wordWrap: { width: 460 }, lineSpacing: 4 });
    this.shot = -1; this.phase = 'film';
  }

  /** Which shot is playing, and how far into it (frames). */
  shotAt(t) { return { i: Math.min(this.E.shots.length - 1, Math.floor(t / SHOT)), f: t % SHOT }; }

  /** Each frame: the film (shots, captions, fades), then THE END, then the trophy; J skips ahead, then leaves. */
  update() {
    this.t++;
    const m = this.menu.poll(), press = m.ok || m.pads.some((q) => q.button === 'a' || q.button === 'start');
    if (press && this.t > SKIP_AFTER) {
      if (this.phase === 'trophy' && this.tt > 60) { sfx('go', 0.8); this.scene.start('Classic', { trophies: this.d.fighter }); return; }
      if (this.phase !== 'trophy') { this.startTrophy(); return; }
    }
    if (this.phase === 'film') {
      if (this.t >= this.total) { this.phase = 'end'; this.et = 0; this.clearFilm(); sfx('bighit', 0.5, 0.5); }
      else this.film();
    }
    if (this.phase === 'end') {
      this.et++; const k = Math.min(1, this.et / 40), out = Math.max(0, (this.et - END + 40) / 40);
      this.big.setText('THE END').setAlpha(k * (1 - out)).setColor('#ffffff');
      this.sub.setText(this.fname + '  -  CLASSIC CLEAR  -  ' + CLASSIC_TIERS[this.d.tier || 0].name).setAlpha(k * (1 - out));
      this.ui.clear(); this.ui.fillStyle(this.E.tint, 0.5 * k * (1 - out)); this.ui.fillRect(VIEW_W / 2 - 120 * k, 170, 240 * k, 2);
      if (this.et >= END) this.startTrophy();
    }
    if (this.phase === 'trophy') this.trophy();
  }

  /** Hides the film's layers (for THE END and the trophy). */
  clearFilm() { this.bg.clear(); this.pic.clear(); this.mid.clear(); this.front.clear(); this.hero.setVisible(false); this.cap.forEach((c) => c.setText('')); }
  /** Starts the trophy reveal. */
  startTrophy() { this.phase = 'trophy'; this.tt = 0; this.clearFilm(); this.big.setText(''); this.sub.setText(''); this.ui.clear(); sfx('shing', 1, 0.7); sfx('summon', 0.7, 0.9); }

  /** One frame of the film: a new shot paints its fixed picture; the backdrop, the fighter, captions and the fade move on. */
  film() {
    const { i, f } = this.shotAt(this.t), S = this.E.shots[i];
    if (i !== this.shot) { this.shot = i; this.pic.clear(); if (S.bg === 'home' || S.bg === 'ruin') { const st = stageById(S.bg === 'ruin' ? this.d.stage : S.stage); if (st && st.preview) st.preview(this.pic, 0, 0, VIEW_W, VIEW_H); } }
    const g = this.bg, x = this.front, k = f / SHOT; g.clear(); this.mid.clear(); x.clear();
    const paint = this['paint' + S.bg[0].toUpperCase() + S.bg.slice(1)]; if (paint) paint.call(this, g, this.mid, x, f, S);
    this.placeHero(S, f, k);
    // the captions, typed in
    const lines = S.text.map((s) => s.replace('%B', this.d.boss || 'THE EVIL')), shown = Math.max(0, Math.floor((f - 20) / TYPE));
    this.cap[0].setText(lines[0].slice(0, shown)); this.cap[1].setText(shown > lines[0].length + 12 ? lines[1].slice(0, shown - lines[0].length - 12) : '');
    if (f % 4 === 0 && shown > 0 && shown < lines[0].length + lines[1].length + 12) sfx('menu', 0.06, 2.2);
    // the letterbox and the fade
    const u = this.ui; u.clear();
    u.fillStyle(0x000000, 1); u.fillRect(0, 0, VIEW_W, BAR.top); u.fillRect(0, VIEW_H - BAR.bottom, VIEW_W, BAR.bottom);
    u.fillStyle(this.E.tint, 0.6); u.fillRect(0, VIEW_H - BAR.bottom, VIEW_W, 1);
    const fade = f < FADE ? 1 - f / FADE : f > SHOT - FADE ? (f - (SHOT - FADE)) / FADE : 0;
    if (fade > 0) { u.fillStyle(0x000000, fade); u.fillRect(0, BAR.top, VIEW_W, VIEW_H - BAR.top - BAR.bottom); }
  }
  /** Puts the fighter in the shot by its `act`: standing, walking across, far off, sitting by the fire, or not there. */
  placeHero(S, f, k) {
    const h = this.hero, d = this.def, base = (d.menuScale || 2.4) * 0.95;
    if (S.act === 'none') { h.setVisible(false); return; }
    h.setVisible(true).setAlpha(1).clearTint();
    showFighter(h, d, Math.floor(this.t / 7), this.d.skin || 0);
    const ground = VIEW_H - BAR.bottom - 18;
    if (S.act === 'walk') { h.setPosition(lerp(120, 480, k), ground + Math.abs(Math.sin(f * 0.18)) * -3).setScale(base); }
    else if (S.act === 'far') { h.setPosition(470, ground - 30).setScale(base * 0.45); h.setTint(mix(0xffffff, 0x8a8aa8, 0.3)); }
    else if (S.act === 'sit') { h.setPosition(400, ground + 6).setScale(base * 1.05, base * 0.88); h.setTint(0xffc890); }
    else h.setPosition(lerp(392, 404, k), ground).setScale(base * (1 + k * 0.06));
    if (S.night || S.bg === 'camp') h.setTint(S.bg === 'camp' ? 0xffb880 : 0x9aa0d8);
    h.setFlipX(S.act === 'walk' ? !!d.facesLeft : !d.facesLeft);
  }

  // ------------------------------------------------------------------ the backdrops
  /** A sky in bands from `top` to `bottom` down to y. */
  sky(g, top, bottom, y = VIEW_H) { for (let i = 0; i < 12; i++) { g.fillStyle(mix(top, bottom, i / 11), 1); g.fillRect(0, (i * y) / 12, VIEW_W, y / 12 + 1); } }
  /** Stars, twinkling. */
  stars(g, n = 60) { for (let i = 0; i < n; i++) { const x = (i * 97) % VIEW_W, y = 30 + (i * 53) % 160, a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 0.03 + i)); g.fillStyle(0xffffff, a); g.fillRect(x, y, i % 7 ? 1 : 2, i % 7 ? 1 : 2); } }
  /** A ridge of hills, scrolling by `off`, at height y, rising `h`. */
  hills(g, y, h, col, off, seed) { const pts = [{ x: 0, y: VIEW_H }]; for (let x = 0; x <= VIEW_W; x += 20) pts.push({ x, y: y - h * (0.5 + 0.5 * Math.sin((x + off) * 0.012 + seed) * Math.cos((x + off) * 0.005 + seed * 2)) }); pts.push({ x: VIEW_W, y: VIEW_H }); g.fillStyle(col, 1); g.fillPoints(pts, true); }
  /** A flickering flame, its base at (x, y). */
  flame(g, x, y, w, h) { const t = this.t, f = Math.sin(t * 0.4) * 0.15 + Math.sin(t * 0.9) * 0.1; for (const [c, s] of [[0xc02008, 1], [0xff7a1a, 0.75], [0xffd040, 0.45]]) { g.fillStyle(c, 0.9); g.fillTriangle(x - w * s, y, x + w * s, y, x + Math.sin(t * 0.2) * w * 0.3, y - h * s * (1 + f)); g.fillCircle(x, y - w * s * 0.4, w * s); } }
  /** A crowd of silhouettes along the bottom, bobbing (arms up when they're cheering). */
  crowd(g, y, col, cheer) { for (let i = 0; i < 40; i++) { const x = i * 17 - 8, b = cheer ? Math.abs(Math.sin(this.t * 0.2 + i * 1.7)) * 6 : 0; g.fillStyle(col, 1); g.fillCircle(x, y - 22 - b, 7); g.fillRect(x - 8, y - 16 - b, 16, 30); if (cheer && i % 2) { g.fillRect(x - 9, y - 40 - b, 3, 18); g.fillRect(x + 6, y - 38 - b, 3, 16); } } }
  /** A little kid beside the hero (Lacy's student). */
  kid(g, x, y) { g.fillStyle(0x2a1a14, 1); g.fillCircle(x, y - 30, 6); g.fillStyle(0x6a3a2a, 1); g.fillRect(x - 5, y - 24, 10, 14); g.fillStyle(0x3a3050, 1); g.fillRect(x - 5, y - 10, 4, 10); g.fillRect(x + 1, y - 10, 4, 10); g.fillStyle(0xb8b0a0, 1); g.fillRect(x + 6, y - 30, 2, 18); }

  /** THE RUIN: the beaten boss's arena (its picture), dark and smoking, a dawn coming up behind it. */
  paintRuin(g, m, x, f) {
    m.fillStyle(0x000000, 0.45); m.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 6; i++) { m.fillStyle(0xff9a40, 0.05 + i * 0.012); m.fillEllipse(VIEW_W / 2, VIEW_H - 40, 900 - i * 120, 260 - i * 30); }
    for (let i = 0; i < 14; i++) { const sx = (i * 61) % VIEW_W, sy = VIEW_H - 60 - ((f * 0.6 + i * 37) % 260); m.fillStyle(0x2a2430, 0.35); m.fillCircle(sx + Math.sin(f * 0.02 + i) * 10, sy, 10 + (i % 4) * 5); }
    for (let i = 0; i < 20; i++) { const ex = (i * 113 + f * 0.4) % VIEW_W, ey = VIEW_H - 60 - ((f * 1.2 + i * 29) % 220); x.fillStyle(0xffa040, 0.8); x.fillRect(ex, ey, 2, 2); }
    m.fillStyle(0x07060e, 0.85); m.fillRect(0, VIEW_H - BAR.bottom - 20, VIEW_W, 20);
  }
  /** THE ROAD: dusk (or rainy night), three ridges of hills sliding by, the road, fence posts; maybe a van. */
  paintRoad(g, m, x, f, S) {
    const night = S.night; this.sky(g, night ? 0x0a0c24 : 0x2a1a4a, night ? 0x2a2a50 : 0xff9a5a, 220);
    if (night) this.stars(g, 40); else { g.fillStyle(0xffe0a0, 0.9); g.fillCircle(470, 170, 34); g.fillStyle(0xffe0a0, 0.15); g.fillCircle(470, 170, 70); }
    this.hills(g, 200, 70, night ? 0x1a1a38 : 0x7a4a6a, f * 0.3, 1); this.hills(g, 230, 50, night ? 0x12122a : 0x4a2a4a, f * 0.7, 3); this.hills(g, 262, 26, night ? 0x0c0c1e : 0x2a1830, f * 1.3, 5);
    g.fillStyle(night ? 0x14141e : 0x3a2a2a, 1); g.fillRect(0, VIEW_H - BAR.bottom - 22, VIEW_W, 30); g.fillStyle(0xffe08a, 0.5); for (let i = 0; i < 12; i++) g.fillRect(((i * 70 - f * 2) % 760 + 760) % 760 - 60, VIEW_H - BAR.bottom - 8, 30, 2);
    for (let i = 0; i < 10; i++) { const px = ((i * 80 - f * 2.4) % 800 + 800) % 800 - 80; x.fillStyle(0x07060e, 1); x.fillRect(px, VIEW_H - BAR.bottom - 46, 4, 30); x.fillRect(px, VIEW_H - BAR.bottom - 40, 80, 2); }
    if (S.van) { const vx = lerp(-160, 300, f / SHOT); m.fillStyle(0x07060e, 1); m.fillRoundedRect(vx, VIEW_H - BAR.bottom - 62, 120, 42, 6); m.fillStyle(0xff5a8a, 1); m.fillRect(vx + 8, VIEW_H - BAR.bottom - 50, 60, 10); m.fillStyle(0x14141e, 1); m.fillCircle(vx + 24, VIEW_H - BAR.bottom - 20, 10); m.fillCircle(vx + 96, VIEW_H - BAR.bottom - 20, 10); }
    if (S.kid) this.kid(m, lerp(90, 450, f / SHOT), VIEW_H - BAR.bottom - 18);
    if (S.rain) for (let i = 0; i < 80; i++) { const rx = (i * 37 + f * 3) % VIEW_W, ry = (i * 71 + f * 9) % VIEW_H; x.lineStyle(1, 0x8a9ad8, 0.5); x.lineBetween(rx, ry, rx - 3, ry + 10); }
    x.lineStyle(0);
  }
  /** THE CAMPFIRE: night, trees, the fire crackling and its glow; sparks going up. */
  paintCamp(g, m, x, f) {
    this.sky(g, 0x04040e, 0x14142a, VIEW_H); this.stars(g, 80);
    this.hills(g, 230, 60, 0x0a0a14, 0, 2);
    for (let i = 0; i < 9; i++) { const tx = i * 80 + 10, th = 90 + (i * 23) % 50; g.fillStyle(0x05050a, 1); g.fillTriangle(tx - 26, VIEW_H - 60, tx + 26, VIEW_H - 60, tx, VIEW_H - 60 - th); }
    g.fillStyle(0x0a0806, 1); g.fillRect(0, VIEW_H - BAR.bottom - 20, VIEW_W, 30);
    const fx = 300, fy = VIEW_H - BAR.bottom - 18, gl = 0.85 + 0.15 * Math.sin(f * 0.3);
    for (let i = 0; i < 5; i++) { m.fillStyle(0xff8a30, 0.06 * gl); m.fillCircle(fx, fy - 10, 60 + i * 30); }
    m.fillStyle(0x3a2414, 1); m.fillRect(fx - 22, fy - 4, 44, 6); m.fillRect(fx - 14, fy - 8, 28, 5);
    this.flame(x, fx, fy - 4, 12, 40);
    for (let i = 0; i < 8; i++) { const sy = fy - 40 - ((f * 1.4 + i * 23) % 120); x.fillStyle(0xffc040, 0.9 * (1 - ((f * 1.4 + i * 23) % 120) / 120)); x.fillRect(fx + Math.sin(f * 0.05 + i) * 14, sy, 2, 2); }
  }
  /** THE TOWN: a row of houses with lit windows, lanterns strung between; a cheering crowd and confetti (or quiet shutters). */
  paintTown(g, m, x, f, S) {
    const night = S.night; this.sky(g, night ? 0x0a0c24 : 0x5a8ad8, night ? 0x2a2a4a : 0xffd0a0, 240); if (night) this.stars(g, 40);
    for (let i = 0; i < 9; i++) {
      const hx = i * 76 - 10, hh = 90 + (i * 31) % 50, hy = VIEW_H - BAR.bottom - 30 - hh;
      g.fillStyle(night ? 0x1a1424 : 0x8a5a4a, 1); g.fillRect(hx, hy, 70, hh); g.fillTriangle(hx - 6, hy, hx + 76, hy, hx + 35, hy - 36);
      for (let w = 0; w < 4; w++) { const lit = S.quiet ? (w + i) % 5 === 0 : true; g.fillStyle(lit ? 0xffd070 : 0x0a0810, 1); g.fillRect(hx + 10 + (w % 2) * 30, hy + 16 + Math.floor(w / 2) * 34, 18, 20); if (S.quiet) { g.fillStyle(0x3a2a20, 1); g.fillRect(hx + 10 + (w % 2) * 30, hy + 16 + Math.floor(w / 2) * 34, 8, 20); } }
    }
    for (let i = 0; i < 16; i++) { const lx = i * 42 + 10, ly = 90 + Math.sin(i * 0.8) * 10; m.fillStyle(0xffb040, 0.25); m.fillCircle(lx, ly, 9); m.fillStyle(0xff7a30, 1); m.fillCircle(lx, ly, 4); }
    g.fillStyle(0x2a2430, 1); g.fillRect(0, VIEW_H - BAR.bottom - 30, VIEW_W, 40);
    if (S.cheer) { this.crowd(x, VIEW_H - BAR.bottom + 6, 0x07060e, true); for (let i = 0; i < 40; i++) { const cx = (i * 53 + f * 0.6) % VIEW_W, cy = (i * 29 + f * 1.5) % (VIEW_H - 80) + 30; x.fillStyle([0xff5a5a, 0x5affb0, 0xffe05a, 0x5ab0ff][i % 4], 1); x.fillRect(cx, cy, 3, 2); } }
  }
  /** ABOVE THE CLOUDS: a bright sky (or starry night), the sun, clouds sliding past; bubbles; a glitch flicker. */
  paintSky(g, m, x, f, S) {
    const night = S.night; this.sky(g, night ? 0x04061a : 0x4a8ae8, night ? 0x1a1a40 : 0xc8e8ff, VIEW_H); if (night) this.stars(g, 90); else { g.fillStyle(0xfff4c0, 1); g.fillCircle(520, 80, 28); g.fillStyle(0xfff4c0, 0.2); g.fillCircle(520, 80, 60); }
    for (let i = 0; i < 12; i++) { const cx = ((i * 113 - f * (0.5 + (i % 3) * 0.4)) % 800 + 800) % 800 - 80, cy = 120 + (i * 47) % 160; m.fillStyle(night ? 0x2a2a50 : 0xffffff, night ? 0.6 : 0.9); m.fillCircle(cx, cy, 24); m.fillCircle(cx + 24, cy - 8, 30); m.fillCircle(cx + 52, cy, 22); if (!night) { m.fillStyle(0xd8e8ff, 1); m.fillRect(cx - 10, cy + 6, 70, 10); } }
    m.fillStyle(night ? 0x14143a : 0xf0f6ff, 1); m.fillRect(0, VIEW_H - BAR.bottom - 24, VIEW_W, 30); for (let i = 0; i < 20; i++) m.fillCircle(((i * 40 - f) % 840 + 840) % 840 - 60, VIEW_H - BAR.bottom - 24, 22);
    if (S.bubbles) for (let i = 0; i < 18; i++) { const bx = (i * 71 + Math.sin(f * 0.02 + i) * 20) % VIEW_W, by = VIEW_H - ((f * 0.8 + i * 40) % 340); x.lineStyle(1.5, 0xffffff, 0.8); x.strokeCircle(bx, by, 5 + (i % 4) * 2); x.fillStyle(0xffffff, 0.8); x.fillRect(bx - 2, by - 3, 2, 2); }
    if (S.flicker && f % 50 < 8) { x.fillStyle(0x5ae8d0, 0.25); x.fillRect(0, (f * 13) % VIEW_H, VIEW_W, 14); x.fillStyle(0xffffff, 0.1); x.fillRect(0, 0, VIEW_W, VIEW_H); }
    x.lineStyle(0);
  }
  /** THE SEA: moonlit water with a path of light and rolling waves; eyes opening under it; or a daytime pond. */
  paintSea(g, m, x, f, S) {
    if (S.pond) { this.sky(g, 0x6aa8e8, 0xd8f0ff, 180); this.hills(g, 180, 30, 0x5a9a4a, 0, 1); g.fillStyle(0x2a7aa8, 1); g.fillRect(0, 180, VIEW_W, VIEW_H); for (let i = 0; i < 8; i++) { const px = (i * 97) % VIEW_W, py = 200 + (i * 37) % 70; m.fillStyle(0x3a8a3a, 1); m.fillEllipse(px, py, 34, 12); m.fillStyle(0xff9ac8, 1); m.fillCircle(px + 6, py - 3, 4); } const fx = 300 + Math.sin(f * 0.03) * 60; m.fillStyle(0xff8a20, 1); m.fillEllipse(fx, 250, 14, 7); m.fillTriangle(fx - 7, 250, fx - 14, 245, fx - 14, 255); }
    else {
      this.sky(g, 0x04040e, 0x14183a, 190); this.stars(g, 70); g.fillStyle(0xe8e4f0, 1); g.fillCircle(200, 90, 26); g.fillStyle(0xe8e4f0, 0.12); g.fillCircle(200, 90, 50);
      g.fillStyle(0x060a1a, 1); g.fillRect(0, 190, VIEW_W, VIEW_H);
      for (let i = 0; i < 14; i++) { const y = 196 + i * 8, w = 30 + i * 6; m.fillStyle(0xe8e4f0, 0.35 - i * 0.02); m.fillRect(200 - w / 2 + Math.sin(f * 0.05 + i) * 6, y, w, 2); }
      for (let i = 0; i < 30; i++) { const wx = ((i * 53 + f * 0.3) % 700) - 30, wy = 200 + (i * 17) % 90; m.lineStyle(1, 0x2a3a6a, 0.8); m.lineBetween(wx, wy, wx + 16, wy); }
      if (S.eyes) for (let i = 0; i < 16; i++) { const ex = 40 + (i * 89) % 560, ey = 220 + (i * 31) % 70, open = Math.max(0, Math.sin(f * 0.02 + i * 1.3)); if (open > 0.1) { x.fillStyle(0xb07aff, 0.25 * open); x.fillCircle(ex, ey, 9); x.fillStyle(0xd8b0ff, open); x.fillEllipse(ex, ey, 10, 5 * open); x.fillStyle(0x07060e, 1); x.fillRect(ex - 1, ey - 2 * open, 2, 4 * open); } }
      m.fillStyle(0x0a0a14, 1); m.fillRect(330, 160, 310, 14); for (let i = 0; i < 6; i++) m.fillRect(350 + i * 50, 170, 6, 120);   // the bridge / pier
    }
    m.lineStyle(0);
  }
  /** THE SHRINE: a misty hilltop at dusk with a stone gate; souls of light rising, or the order's banner hung on it. */
  paintShrine(g, m, x, f, S) {
    this.sky(g, 0x1a1440, 0x8a6a9a, 260); this.stars(g, 30); this.hills(g, 250, 40, 0x2a2440, 0, 4);
    g.fillStyle(0x3a3448, 1); g.fillRect(0, VIEW_H - BAR.bottom - 26, VIEW_W, 40);
    const gx = 220; m.fillStyle(0x6a6478, 1); m.fillRect(gx - 70, 120, 18, 160); m.fillRect(gx + 52, 120, 18, 160); m.fillRect(gx - 90, 108, 180, 16); m.fillRect(gx - 76, 140, 152, 10); m.fillStyle(0x8a8498, 1); m.fillRect(gx - 90, 108, 180, 4);
    if (S.banner) { const sw = Math.sin(f * 0.05) * 4; m.fillStyle(0x9a1418, 1); m.fillPoints([{ x: gx - 30, y: 150 }, { x: gx + 30, y: 150 }, { x: gx + 30 + sw, y: 236 }, { x: gx + sw, y: 222 }, { x: gx - 30 + sw, y: 236 }], true); m.fillStyle(0xd8a838, 1); m.fillCircle(gx + sw * 0.5, 186, 12); m.fillStyle(0x9a1418, 1); m.fillCircle(gx + sw * 0.5, 186, 7); }
    for (let i = 0; i < 6; i++) { m.fillStyle(0xd8d0f0, 0.06); m.fillEllipse(((i * 150 + f * 0.4) % 900) - 100, VIEW_H - BAR.bottom - 30 + (i % 2) * 10, 260, 30); }
    if (S.souls) for (let i = 0; i < 14; i++) { const k = ((f * 0.8 + i * 33) % 300) / 300, sx = 400 + Math.sin(i * 2.1 + f * 0.02) * (20 + k * 120), sy = VIEW_H - 120 - k * 220; x.fillStyle(0x5ab8ff, 0.3 * (1 - k)); x.fillCircle(sx, sy, 10); x.fillStyle(0xd8f0ff, 1 - k); x.fillCircle(sx, sy, 3); }
  }
  /** THE CASTLE: a castle on a hill against a sunset - or burned to a ruin, smoke still rising. */
  paintCastle(g, m, x, f, S) {
    this.sky(g, S.ruined ? 0x2a1a2a : 0x3a2a6a, S.ruined ? 0x8a5a4a : 0xff9a6a, 280); this.hills(g, 280, 60, 0x1a1428, 0, 2);
    const cx = 200, cy = 250, c = 0x14101e;
    m.fillStyle(c, 1); m.fillRect(cx - 90, cy - 70, 180, 70);
    for (const [tx, th, broken] of [[-100, 130, true], [-30, 170, false], [60, 120, true], [100, 100, false]]) {
      const h = S.ruined && broken ? th * 0.55 : th; m.fillRect(cx + tx - 16, cy - h, 32, h);
      if (S.ruined && broken) m.fillTriangle(cx + tx - 16, cy - h, cx + tx + 4, cy - h - 14, cx + tx + 16, cy - h); else { m.fillTriangle(cx + tx - 22, cy - h, cx + tx + 22, cy - h, cx + tx, cy - h - 34); m.fillStyle(0xffc860, 1); m.fillRect(cx + tx - 3, cy - h + 20, 6, 10); m.fillStyle(c, 1); }
    }
    if (S.ruined) for (let i = 0; i < 10; i++) { const sy = cy - 80 - ((f * 0.5 + i * 30) % 200); m.fillStyle(0x3a3040, 0.35); m.fillCircle(cx - 60 + i * 14 + Math.sin(f * 0.02 + i) * 10, sy, 12 + i % 3 * 5); }
    else { const fw = Math.sin(f * 0.06) * 6; m.fillStyle(0x9a1418, 1); m.fillTriangle(cx - 30, cy - 200, cx - 30 + 26 + fw, cy - 192, cx - 30, cy - 184); m.fillRect(cx - 32, cy - 200, 2, 30); }
    g.fillStyle(0x0c0a14, 1); g.fillRect(0, VIEW_H - BAR.bottom - 24, VIEW_W, 30);
  }
  /** THE GIG: a dark stage with stacks of amps, spotlights sweeping, a crowd with their hands up; flame jets. */
  paintGig(g, m, x, f, S) {
    this.sky(g, 0x05040c, 0x1a0a20, VIEW_H);
    for (let i = 0; i < 4; i++) { const a = Math.sin(f * 0.03 + i * 1.6) * 0.5, sx = 80 + i * 160; m.fillStyle([0xff5a8a, 0x5ab8ff, 0xffe05a, 0xb07aff][i], 0.14); m.fillTriangle(sx, 30, sx + Math.sin(a) * 300 - 50, VIEW_H - 60, sx + Math.sin(a) * 300 + 50, VIEW_H - 60); }
    for (const ax of [60, 120, 520, 580]) { m.fillStyle(0x0a0a10, 1); m.fillRect(ax - 26, 160, 52, 120); m.fillStyle(0x2a2a34, 1); for (let k = 0; k < 2; k++) m.fillCircle(ax, 190 + k * 50, 16); m.fillStyle(0x07060e, 1); for (let k = 0; k < 2; k++) m.fillCircle(ax, 190 + k * 50, 6 + Math.abs(Math.sin(f * 0.3)) * 3); }
    m.fillStyle(0x1a1420, 1); m.fillRect(0, VIEW_H - BAR.bottom - 26, VIEW_W, 30);
    if (S.fire) for (const fx of [160, 480]) if (f % 90 < 50) this.flame(m, fx, VIEW_H - BAR.bottom - 26, 16, 90 + Math.sin(f) * 10);
    this.crowd(x, VIEW_H - BAR.bottom + 22, 0x05040a, true);
    for (let i = 0; i < 20; i++) { const nx = (i * 61 + f * 0.8) % VIEW_W, ny = 200 - ((f * 1.1 + i * 30) % 160); x.fillStyle(0xff5a8a, 0.7); x.fillRect(nx, ny, 3, 6); x.fillRect(nx + 3, ny, 4, 2); }
  }
  /** SUNRISE: dawn over the hills, a warm glow, birds; or a night with a purple star falling; maybe a kid beside them. */
  paintDawn(g, m, x, f, S) {
    if (S.night) { this.sky(g, 0x05051a, 0x2a1a4a, VIEW_H); this.stars(g, 100); if (S.star) { const k = Math.min(1, (f % SHOT) / 200); x.lineStyle(3, 0xb07aff, 0.8 * (1 - k * 0.3)); x.lineBetween(560 - k * 300, 50 + k * 140, 600 - k * 300, 30 + k * 140); x.fillStyle(0xe8c8ff, 1); x.fillCircle(560 - k * 300, 50 + k * 140, 4); x.lineStyle(0); } }
    else { const k = f / SHOT; this.sky(g, mix(0x2a2a6a, 0x6a9ae8, k), mix(0xff8a5a, 0xffd8a0, k), VIEW_H); g.fillStyle(0xffe8a0, 1); g.fillCircle(320, 260 - k * 70, 40); g.fillStyle(0xffe8a0, 0.15); g.fillCircle(320, 260 - k * 70, 90); for (let i = 0; i < 5; i++) { const bx = (i * 90 + f * 0.7) % VIEW_W, by = 100 + i * 14 + Math.sin(f * 0.1 + i) * 4; m.lineStyle(2, 0x2a1a2a, 1); m.lineBetween(bx - 6, by - 3, bx, by); m.lineBetween(bx, by, bx + 6, by - 3); } m.lineStyle(0); }
    this.hills(g, 270, 40, S.night ? 0x0c0a1a : 0x4a3a5a, 0, 3); this.hills(g, 290, 24, S.night ? 0x07060e : 0x2a2038, 0, 6);
    if (S.kid) this.kid(m, 340, VIEW_H - BAR.bottom - 18);
    if (S.bubbles) for (let i = 0; i < 14; i++) { const bx = (i * 71) % VIEW_W, by = VIEW_H - ((f * 0.7 + i * 50) % 340); x.lineStyle(1.5, 0xffffff, 0.8); x.strokeCircle(bx, by, 5 + (i % 3) * 3); } x.lineStyle(0);
  }
  /** A STAGE'S OWN PICTURE (home): its preview, a soft vignette over it. */
  paintHome(g, m) { for (let i = 0; i < 6; i++) { m.lineStyle(30, 0x000000, 0.08); m.strokeRect(-10 + i * 12, -10 + i * 12, VIEW_W + 20 - i * 24, VIEW_H + 20 - i * 24); } m.lineStyle(0); }

  /** THE TROPHY: a spotlight on a gold statue of the fighter turning on its pedestal, its plaque, the coins the clear paid. */
  trophy() {
    this.tt++;
    const t = this.tt, k = Math.min(1, t / 50), g = this.bg, x = this.front; g.clear(); x.clear(); this.mid.clear(); this.ui.clear();
    const info = CLASSIC_TROPHIES[this.d.fighter] || { name: this.fname, line: '' }, cx = VIEW_W / 2;
    g.fillStyle(0x07060e, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * 0.004; g.fillStyle(this.E.tint, 0.05 * k); g.fillTriangle(cx, 150, cx + Math.cos(a) * 500, 150 + Math.sin(a) * 500, cx + Math.cos(a + 0.12) * 500, 150 + Math.sin(a + 0.12) * 500); }
    g.fillStyle(0xfff0c0, 0.08 * k); g.fillTriangle(cx - 20, 0, cx + 20, 0, cx + 110, 250); g.fillTriangle(cx - 20, 0, cx - 110, 250, cx + 110, 250);
    g.fillStyle(0x000000, 0.5); g.fillEllipse(cx, 262, 200, 20);
    g.fillStyle(0x2a1c0c, 1); g.fillRect(cx - 70, 226, 140, 34); g.fillStyle(0xb8862a, 1); g.fillRect(cx - 76, 220, 152, 8); g.fillRect(cx - 76, 256, 152, 8); g.fillStyle(0xffe08a, 1); g.fillRect(cx - 76, 220, 152, 2);
    g.fillStyle(0xd8a838, 1); g.fillRect(cx - 40, 234, 80, 14); g.fillStyle(0x2a1c0c, 1); g.fillRect(cx - 37, 237, 74, 8);
    const h = this.hero, d = this.def, turn = Math.cos(t * 0.025), s = (d.menuScale || 2.4) * 1.25 * (0.6 + 0.4 * k);
    h.setVisible(true).setAlpha(k); showFighter(h, d, 0, 0); h.setPosition(cx, 222).setScale(s * Math.max(0.15, Math.abs(turn)), s).setFlipX(turn < 0 ? !d.facesLeft : !!d.facesLeft);
    h.clearTint(); goldStatue(h);
    for (let i = 0; i < 6; i++) { const q = (t * 0.02 + i) % 1, sx = cx + Math.sin(i * 2.4 + t * 0.01) * 60, sy = 200 - q * 120; x.fillStyle(0xfff0a0, 0.8 * (1 - q) * k); x.fillRect(sx, sy, 2, 2); }
    this.big.setText(this.d.first ? 'CLASSIC TROPHY UNLOCKED!' : 'CLASSIC CLEARED AGAIN!').setFontSize(14).setY(36).setAlpha(k).setColor('#ffe08a');
    this.sub.setText(info.name + '   +' + (this.d.coins || 0) + ' COINS').setY(58).setAlpha(k).setColor('#ffffff');
    this.line.setText(info.line + (t > 60 ? '\n\nPRESS J / ENTER / A' : '')).setY(292).setAlpha(k);
  }
}
