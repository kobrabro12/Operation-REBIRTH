// GNASH's three map costumes' win cutscenes (mixed into WinScene like winSkins.js; the entries are spread into
// SKIN_CUTS there). Each is set on the stage the costume is drawn after, and plays that stage's music.
//   HIGH SCORE    NEW HIGH SCORE - he swaggers into a dark arcade between rows of glowing cabinets; then he's inside
//                 one of the games, the beaten as pink pixel enemies on the CRT exploding into blocks; then the HIGH
//                 SCORES table, every line of it GNA, and the beaten at the bottom
//   GRAVEMOON     STONE COLD - GRAVEMOON BRIDGE under the full moon, mist and bats; his HOWL against the moon; then
//                 the beaten stand on the parapet as cracked stone gargoyles, and he sits among them
//   INFECTED.EXE  ILOVEYOU - the old PC's desktop, GNASH.EXE opens; pop-ups multiply across the screen with the beaten
//                 trapped in them; then THE RED ROOM: the crosshair picks each of them off while he grins
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';

const W = VIEW_W, H = VIEW_H;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const SUN = [0xffe56a, 0xffc85a, 0xffa058, 0xff7a62, 0xff5a72, 0xff3f86];

export const GNASH_CUTS = {
  'gnash:HIGH SCORE': { fn: 'gn_arcade', len: 720, card: 600, name: 'GNASH', sub: 'HIGH SCORE', line: 'NEW HIGH SCORE. INSERT COIN.', music: 'bgm_arcade',
    color: '#ff3fd0', stroke: '#14042a', shots: [[0, 'cabinets'], [200, 'ingame'], [430, 'scores']] },
  'gnash:GRAVEMOON': { fn: 'gn_moon', len: 720, card: 600, name: 'GNASH', sub: 'GRAVEMOON', line: 'TURNED TO STONE.', music: 'bgm_gravemoon',
    color: '#e6eaff', stroke: '#17143e', shots: [[0, 'bridge'], [200, 'howl'], [430, 'statues']] },
  'gnash:INFECTED.EXE': { fn: 'gn_virus', len: 720, card: 600, name: 'GNASH', sub: 'INFECTED.EXE', line: 'ILOVEYOU.', music: 'bgm_infected',
    color: '#ff7ab0', stroke: '#0a0a12', shots: [[0, 'desktop'], [200, 'popups'], [430, 'redroom']] },
};

/** The shots (WinScene methods shot_<fn>_<name>(t, k, s)) and their scenery. */
export class GnashShots {
  /** A synthwave horizon: banded sky, the striped sun at (sx, hz), a pink grid floor scrolling toward you. */
  gnSynth(g, t, hz, sx = W / 2, sr = 80) {
    this.sky(g, 0x0d0221, 0xe0407c, 10);
    for (let i = 0; i < 30; i++) { const sp = this.spots[i]; if ((t + i * 7) % 40 > 3) { g.fillStyle(0xf0e6ff, 0.8); g.fillRect(sp[0] * W, sp[1] * (hz - 60), 2, 2); } }
    for (let y = -sr; y < 0; y += 4) {
      if (y > -sr * 0.55 && ((y + Math.floor(t / 2)) & 12) === 0) continue;
      const half = Math.sqrt(sr * sr - y * y), b = Math.min(5, Math.floor((y + sr) / (sr / 6)));
      g.fillStyle(SUN[b], 1); g.fillRect(sx - half, hz + y, half * 2, 4);
    }
    g.fillStyle(0x14042a, 1); g.fillRect(0, hz, W, H - hz);
    g.lineStyle(2, 0xff3fd0, 0.85);
    for (let i = -14; i <= 14; i++) g.lineBetween(W / 2 + i * 24, hz, W / 2 + i * 120, H);
    for (let j = 0; j < 9; j++) { const q = (j + (t * 0.03) % 1) / 9, y = hz + (H - hz) * q * q; g.lineBetween(0, y, W, y); }
    g.lineStyle(0);
  }
  /** An arcade cabinet's silhouette with its screen glowing `col` (x = its middle, y = the floor). */
  gnCabinet(g, x, y, sc, col, t, i) {
    const w = 46 * sc, h = 120 * sc;
    g.fillStyle(0x0a0614, 1); g.fillRect(x - w / 2, y - h, w, h); g.fillRect(x - w / 2 - 4 * sc, y - h * 0.48, w + 8 * sc, 10 * sc);
    g.fillStyle(col, 0.85); g.fillRect(x - w / 2 + 5 * sc, y - h + 18 * sc, w - 10 * sc, 34 * sc);
    g.fillStyle(0xffffff, 0.25 + 0.2 * Math.sin(t * 0.2 + i)); g.fillRect(x - w / 2 + 5 * sc, y - h + 18 * sc + ((t * 2 + i * 9) % (34 * sc)), w - 10 * sc, 2);
    g.fillStyle(col, 0.55); g.fillRect(x - w / 2, y - h, w, 8 * sc);                        // the lit marquee
    g.fillStyle(0xff3a3a, 1); g.fillCircle(x - 8 * sc, y - h * 0.5, 2.5 * sc); g.fillStyle(0x3af0ff, 1); g.fillCircle(x + 6 * sc, y - h * 0.5, 2.5 * sc);
  }
  /** The moon over GRAVEMOON BRIDGE's sky (x, y, radius): halo, disc, craters. */
  gnMoon(g, x, y, r) {
    this.glow(g, x, y, r * 2.2, 0x7470d0, 0.45);
    g.fillStyle(0xc2c8f0, 1); g.fillCircle(x, y, r); g.fillStyle(0xe6eaff, 1); g.fillCircle(x - r * 0.08, y - r * 0.08, r * 0.9);
    g.fillStyle(0x9ca4d8, 0.7); for (const [a, b, c] of [[0.3, -0.2, 0.16], [-0.35, 0.25, 0.12], [0.1, 0.4, 0.09], [-0.2, -0.4, 0.07]]) g.fillCircle(x + a * r, y + b * r, c * r);
  }
  /** The stone bridge deck from x0 to x1 at y, with its parapet posts and arches below. */
  gnBridge(g, y, col = 0x232239, lit = 0x53566c) {
    g.fillStyle(col, 1); g.fillRect(0, y, W, H - y);
    g.fillStyle(lit, 1); g.fillRect(0, y, W, 4);
    for (let x = 10; x < W; x += 64) { g.fillStyle(col, 1); g.fillRect(x, y - 26, 14, 26); g.fillStyle(lit, 1); g.fillRect(x - 2, y - 30, 18, 5); }
    g.fillStyle(0x0b0922, 1); for (let x = -40; x < W; x += 160) g.fillEllipse(x + 80, H + 20, 120, 110);
  }
  /** Mist drifting across at height y. */
  gnMist(g, t, y, a = 0.12) { for (let i = 0; i < 10; i++) { const x = ((i * 97 + t * (0.3 + (i % 3) * 0.2)) % (W + 200)) - 100; g.fillStyle(i % 2 ? 0x8aa8ff : 0xc8d0ff, a); g.fillEllipse(x, y + (i % 3) * 10, 160, 26); } }
  /** A Windows window: frame, title bar with title `ti` (label line i), close box. */
  gnWindow(g, x, y, w, h, al = 1) {
    g.fillStyle(0x0a0a12, al); g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0xc0c0c0, al); g.fillRect(x, y, w, h); g.fillStyle(0xffffff, al); g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
    g.fillStyle(0x808080, al); g.fillRect(x + w - 1, y, 1, h); g.fillRect(x, y + h - 1, w, 1);
    g.fillStyle(0x0a2484, al); g.fillRect(x + 2, y + 2, w - 4, 9);
    g.fillStyle(0xc0c0c0, al); g.fillRect(x + w - 11, y + 3, 8, 7); g.fillStyle(0x0a0a12, al); g.fillRect(x + w - 9, y + 5, 4, 3);
  }
  /** The teal desktop: wallpaper, a few icons, the taskbar with its START button. */
  gnDesktop(g) {
    g.fillStyle(0x108484, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { g.fillStyle(0xf0e070, 1); g.fillRect(18, 18 + i * 44, 20, 16); g.fillStyle(0xffffff, 1); g.fillRect(14, 38 + i * 44, 28, 3); }
    g.fillStyle(0xc0c0c0, 1); g.fillRect(0, H - 22, W, 22); g.fillStyle(0xffffff, 1); g.fillRect(0, H - 22, W, 1);
    g.fillStyle(0xc0c0c0, 1); g.fillRect(3, H - 19, 46, 16); g.fillStyle(0x0a0a12, 1); g.fillRect(3, H - 4, 46, 1); g.fillRect(48, H - 19, 1, 16);
  }

  // ================================================================= HIGH SCORE
  /** [0] A dark arcade: rows of cabinets glowing, a neon floor; he strolls in dragging the axe. */
  shot_gn_arcade_cabinets(t, k, s) {
    const g = this.bg, floor = 300; this.hideLosers();
    this.sky(g, 0x06020c, 0x1a0a2e, 8);
    const cols = [0xff3fd0, 0x3af0ff, 0xffc85a, 0x8a2aff];
    for (let i = 0; i < 9; i++) this.gnCabinet(g, 30 + i * 74, floor - 40, 0.7, cols[i % 4], t, i);           // the back row
    g.fillStyle(0x14042a, 1); g.fillRect(0, floor, W, H - floor);
    g.lineStyle(1, 0xff3fd0, 0.5); for (let i = -10; i <= 10; i++) g.lineBetween(W / 2 + i * 40, floor, W / 2 + i * 90, H); g.lineStyle(0);
    for (let i = 0; i < 5; i++) this.gnCabinet(this.mid, -20 + i * 160, floor + 6, 1.05, cols[(i + 2) % 4], t, i + 9);   // the front row
    const x = 60 + ease(s / 180) * 260;
    this.bchStrip('run', s / 6, x, floor + 4, 2.6);
    this.glow(this.fx, x, floor - 40, 60, 0xff3fd0, 0.18);
    this.fx.fillStyle(0xff3fd0, 0.25); this.fx.fillEllipse(x, floor + 4, 90, 8);                          // his neon on the floor
    for (let i = 0; i < 12; i++) { const sp = this.spots[i], d = (s * 1.4 + i * 19) % 120; this.fx.fillStyle(cols[i % 3], 1 - d / 120); this.fx.fillRect(x - 30 + sp[0] * 60, floor - 20 - d, 3, 3); }   // pixels drifting off him
    if (s === 20) sfx('ding', 0.4, 1.6);
    this.vignette(this.over, 0.5);
  }
  /** [200] Inside the game: a synthwave level on a CRT; the beaten are pink pixel enemies - each bursts into blocks. */
  shot_gn_arcade_ingame(t, k, s) {
    this.gnSynth(this.bg, t, 210, 470, 70);
    const xs = [120, 250, 560];
    this.losers.forEach((l, i) => {
      if (!l.def || xs[i] === undefined) { l.s.setVisible(false); return; }
      const pop = 40 + i * 40, gone = s > pop;
      l.s.setCrop().setPosition(xs[i], 300 + Math.sin(s * 0.2 + i) * 2).setScale(1.6).setRotation(0).setAlpha(gone ? 0 : 1).setTintMode(Phaser.TintModes.FILL).setTint(0xff3fd0).setVisible(true);
      if (s === pop) { sfx('hit', 0.5, 1.3); this.flash = 2; }
      if (gone && s < pop + 40) for (let j = 0; j < 16; j++) { const a = j * 0.4, d = (s - pop) * (1.5 + (j % 3)); this.fx.fillStyle([0xff3fd0, 0x3af0ff, 0xffc85a][j % 3], 1 - (s - pop) / 40); this.fx.fillRect(xs[i] + Math.cos(a) * d, 270 + Math.sin(a) * d, 5, 5); }
      if (gone && s < pop + 60) this.label(i + 2, '+' + (1000 * (i + 1)), xs[i] - 20, 230 - (s - pop) * 0.5, 9, '#3af0ff');
    });
    this.idle(380, 308, 2.4, s); this.hero.setTint(0xffd0f0);
    const sc = String(Math.min(999999, s * 2731)).padStart(6, '0');
    this.label(0, '1UP  ' + sc, 20, 14, 10, '#ffffff'); this.label(1, 'HI-SCORE  999999', W - 200, 14, 10, '#ffc85a');
    for (let y = 0; y < H; y += 3) { this.over.fillStyle(0x000000, 0.2); this.over.fillRect(0, y, W, 1); }   // scanlines
    this.over.lineStyle(14, 0x000000, 0.8); this.over.strokeRoundedRect(4, 4, W - 8, H - 8, 30); this.over.lineStyle(0);
    if (s === 0) this.flash = 4;
  }
  /** [430] The HIGH SCORES table: every top line GNA, the beaten at the bottom; he stands beside it, taunting. */
  shot_gn_arcade_scores(t, k, s) {
    const g = this.bg; this.hideLosers();
    this.sky(g, 0x06020c, 0x14042a, 6);
    for (let y = 0; y < H; y += 6) { g.fillStyle(0xff3fd0, 0.04); g.fillRect(0, y, W, 2); }
    this.label(0, 'HIGH SCORES', 64, 40, 16, t % 20 < 14 ? '#ff3fd0' : '#3af0ff');
    const rows = [['1ST', 'GNA', '999999'], ['2ND', 'GNA', '987650'], ['3RD', 'GNA', '966660'], ['4TH', 'GNA', '900000']];
    this.losers.forEach((l, i) => { if (l.def && l.name) rows.push([(5 + i) + 'TH', l.name.slice(0, 3), String(100 * (3 - i)).padStart(6, '0')]); });
    rows.slice(0, 7).forEach((r, i) => {
      const on = s > 20 + i * 18; if (!on) return;
      this.label(i + 1, r[0] + '  ' + r[1] + '   ' + r[2], 64, 80 + i * 26, 11, i < 4 ? SUN_CSS[i] : '#8a8aa8');
      if (s === 20 + i * 18 + 1) sfx('select', 0.3, 1.2 + i * 0.05);
    });
    const A = this.def.moveAnims.taunt;
    this.move('taunt', (s / 3) % (A ? A[1] : 8), 500, 320, 2.2);
    for (let i = 0; i < 20; i++) { const sp = this.spots[i], d = (s * 1.6 + i * 23) % 340; this.fx.fillStyle([0xff3fd0, 0x3af0ff, 0xffc85a][i % 3], 1); this.fx.fillRect(sp[0] * W, d - 20, 3, 3); }   // pixel confetti
    this.vignette(this.over, 0.45);
  }

  // ================================================================= GRAVEMOON
  /** [0] GRAVEMOON BRIDGE at night: the full moon, mist, bats wheeling; he stands on the parapet. */
  shot_gn_moon_bridge(t, k, s) {
    const g = this.bg; this.hideLosers();
    this.sky(g, 0x0b0922, 0x443e8a, 8);
    for (let i = 0; i < 30; i++) { const sp = this.spots[i]; g.fillStyle(0xc8ccff, 0.4 + 0.5 * Math.abs(Math.sin(t * 0.04 + i))); g.fillRect(sp[0] * W, sp[1] * 180, 1, 1); }
    this.gnMoon(g, 440, 120, 70);
    g.fillStyle(0x1a1a42, 1); g.fillTriangle(0, 260, 120, 190, 260, 260); g.fillTriangle(380, 260, 520, 180, 640, 260);   // far crags
    g.fillRect(150, 150, 14, 110); g.fillTriangle(146, 150, 157, 120, 168, 150);                                    // a castle spire
    this.gnBridge(this.mid, 280);
    this.gnMist(this.mid, t, 250, 0.1);
    const zoom = 2.4 + ease(s / 200) * 0.4;
    this.idle(320, 254, zoom, s);
    for (let i = 0; i < 9; i++) { const a = t * 0.04 + i * 0.7, bx = 440 + Math.cos(a) * (90 + i * 6), by = 120 + Math.sin(a * 1.3) * 40, w = (t + i * 3) % 8 < 4 ? 6 : 2; this.fx.fillStyle(0x0b0922, 1); this.fx.fillTriangle(bx - w - 3, by - 2, bx, by, bx - 1, by + 2); this.fx.fillTriangle(bx + w + 3, by - 2, bx, by, bx + 1, by + 2); }
    this.gnMist(this.front, t + 200, 300, 0.14);
    if (s === 10) sfx('bats', 0.5, 0.9);
    this.vignette(this.over, 0.55);
  }
  /** [200] His HOWL against the moon, a silhouette in its light; wisps spiral up round him. */
  shot_gn_moon_howl(t, k, s) {
    const g = this.bg; this.hideLosers();
    this.sky(g, 0x0b0922, 0x2f2a6a, 8);
    this.gnMoon(g, W / 2, 170, 140);
    const A = this.def.moveAnims.neutralB;
    this.move('neutralB', (s / 2) % (A ? A[1] : 8), W / 2, 334, 2.5);
    this.hero.setTintMode(Phaser.TintModes.FILL).setTint(0x0b0922);
    this.mid.fillStyle(0x0b0922, 1); this.mid.fillRect(0, 330, W, H - 330);
    for (let i = 0; i < 18; i++) { const sp = this.spots[i], d = (s * 1.2 + i * 17) % 200, a = d * 0.05 + i; this.fx.fillStyle(0xc8d0ff, 0.3 * (1 - d / 200)); this.fx.fillCircle(W / 2 + Math.cos(a) * (40 + d * 0.4), 320 - d, 4 + sp[0] * 4); }
    if (s === 6) sfx('roar', 0.6, 0.7);
    if (s > 6 && s < 40) this.cameras.main.shake(20, 0.002);
    this.vignette(this.over, 0.6);
  }
  /** [430] The beaten stand on the parapet as cracked stone gargoyles; he sits on the post between them, the moon going down. */
  shot_gn_moon_statues(t, k, s) {
    const g = this.bg;
    this.sky(g, 0x17143e, 0x7470d0, 8);
    this.gnMoon(g, 120, 90 + s * 0.12, 50);
    this.gnBridge(this.mid, 290);
    const spots = [[160, 262, 1.9, 0, 1], [470, 262, 1.9, 0, 1], [580, 262, 1.7, 0, 1]];
    this.posLosers(spots, 0x6e7290);
    this.losers.forEach((l, i) => {                                                   // stone: cracks and a little moss of moonlight
      if (!l.s.visible) return; const x = spots[i][0], y = 262;
      this.fx.fillStyle(0x53566c, 1); this.fx.fillRect(x - 24, y, 48, 8);
      this.fx.lineStyle(1, 0x17143e, 1); this.fx.lineBetween(x - 4, y - 70, x + 3, y - 46); this.fx.lineBetween(x + 3, y - 46, x - 5, y - 24); this.fx.lineBetween(x + 3, y - 46, x + 12, y - 40); this.fx.lineStyle(0);
      this.fx.fillStyle(0xe6eaff, 0.25); this.fx.fillRect(x - 10, y - 60, 3, 40);
    });
    this.idle(320, 262, 2.4, s);
    this.gnMist(this.front, t, 300, 0.16);
    for (let i = 0; i < 6; i++) { const sp = this.spots[i], d = (s + i * 30) % 160; this.fx.fillStyle(0xc8d0ff, 0.25 * (1 - d / 160)); this.fx.fillCircle(320 + (sp[0] - 0.5) * 60, 250 - d, 3); }
    if (s === 0) sfx('rumble', 0.4, 0.7);
    this.vignette(this.over, 0.5);
  }

  // ================================================================= INFECTED.EXE
  /** [0] The old PC's desktop; GNASH.EXE pops open and he's standing in the window. */
  shot_gn_virus_desktop(t, k, s) {
    this.gnDesktop(this.bg); this.hideLosers();
    const open = ease((s - 20) / 20), w = 300 * open, h = 220 * open, x = W / 2 - w / 2, y = 60;
    if (open > 0) { this.gnWindow(this.mid, x, y, w, h); this.mid.fillStyle(0x14042a, 1); this.mid.fillRect(x + 4, y + 14, w - 8, h - 18); }
    if (open >= 1) { this.label(0, 'GNASH.EXE', x + 6, y + 3, 7, '#ffffff'); this.idle(W / 2, y + h - 10, 2.2, s); } else this.hero.setVisible(false);
    if (s === 20) sfx('popup', 0.6, 1);
    this.label(1, 'START', 10, H - 16, 7, '#0a0a12');
    if (s % 90 < 2 && s > 40) { this.over.fillStyle(0xff2a8a, 0.4); this.over.fillRect(0, (s * 7) % H, W, 6); }
  }
  /** [200] Pop-ups multiplying all over the screen, ILOVEYOU in each; the beaten trapped in three of them, banging on the glass. */
  shot_gn_virus_popups(t, k, s) {
    this.gnDesktop(this.bg);
    const n = Math.min(26, Math.floor(s / 5));
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i], x = sp[0] * (W - 120), y = sp[1] * (H - 120);
      this.bg.fillStyle(0x0a0a12, 1); this.gnWindow(this.bg, x, y, 110, 70);
      this.bg.fillStyle(0xff2a5a, 1); this.bg.fillCircle(x + 50, y + 36, 7); this.bg.fillCircle(x + 60, y + 36, 7); this.bg.fillTriangle(x + 43, y + 38, x + 67, y + 38, x + 55, y + 54);
      if (i % 5 === 0 && s % 30 === i) sfx('popup', 0.3, 0.9 + sp[2] * 0.4);
    }
    const boxes = [[60, 120], [250, 90], [440, 140]];
    this.losers.forEach((l, i) => {
      const b = boxes[i]; if (!l.def || !b) { l.s.setVisible(false); return; }
      this.gnWindow(this.bg, b[0], b[1], 140, 130); this.bg.fillStyle(0xfff6e8, 1); this.bg.fillRect(b[0] + 4, b[1] + 14, 132, 112);   // (on the back layer: they're inside)
      l.s.setCrop().setPosition(b[0] + 70 + Math.sin(s * 0.5 + i) * 3, b[1] + 120).setScale(1.5).setRotation(0).setAlpha(1).setTintMode(Phaser.TintModes.FILL).setTint(0x0a2484).setVisible(true);
      this.label(i + 1, 'ILOVEYOU.TXT', b[0] + 6, b[1] + 3, 6, '#ffffff');
    });
    this.idle(W / 2 + 40, H - 26, 2.6, s);
    for (let i = 0; i < 6; i++) if ((t + i * 7) % 11 < 2) { this.over.fillStyle(i % 2 ? 0xff2a8a : 0x3af0ff, 0.5); this.over.fillRect(0, (i * 61 + t * 3) % H, W, 2 + i % 3); }
  }
  /** [430] THE RED ROOM: everything red, the crosshair lands on each of the beaten in turn; he stands in the middle, grinning. */
  shot_gn_virus_redroom(t, k, s) {
    const g = this.bg;
    g.fillStyle(0x8a0000, 1); g.fillRect(0, 0, W, H); g.fillStyle(0x2a0000, 1); g.fillRect(0, 290, W, H - 290);
    g.fillStyle(0xff2a2a, 0.12); for (let i = 0; i < 8; i++) g.fillRect(0, i * 46 + ((t * 0.5) % 46), W, 10);
    const xs = [130, 230, 520];
    this.posLosers(xs.map((x) => [x, 290, 1.9, 0, 1]), 0x2a0000);
    this.losers.forEach((l, i) => {                                                   // the crosshair, one after another
      if (!l.s.visible) return;
      const on = s - 30 - i * 45; if (on < 0) return;
      const lock = Math.min(1, on / 20), cx = xs[i] + (1 - lock) * 80 * Math.cos(on * 0.3), cy = 250 + (1 - lock) * 40 * Math.sin(on * 0.3), r = 22 - lock * 6;
      this.fx.lineStyle(2, lock >= 1 ? 0xffffff : 0xff2a2a, 1); this.fx.strokeCircle(cx, cy, r); this.fx.lineBetween(cx - r - 8, cy, cx + r + 8, cy); this.fx.lineBetween(cx, cy - r - 8, cx, cy + r + 8); this.fx.lineStyle(0);
      if (on === 20) { sfx('bighit', 0.5, 0.7); this.flash = 3; }
      if (on > 20) { l.s.setRotation(Math.min(1.5, (on - 20) * 0.1) * (i % 2 ? -1 : 1)); this.fx.fillStyle(0xff2a2a, 0.5); this.fx.fillRect(cx - 30, cy - 50, 60, 4); }
    });
    this.idle(380, 292, 2.6, s); this.hero.setTint(0xff9a9a);
    this.label(0, 'DO YOU LIKE THE RED ROOM?', 120, 40, 12, s % 30 < 20 ? '#ffffff' : '#ff7a7a');
    for (let y = 0; y < H; y += 4) { this.over.fillStyle(0x000000, 0.18); this.over.fillRect(0, y, W, 1); }
    this.vignette(this.over, 0.6);
  }
}
const SUN_CSS = ['#ffe56a', '#ffc85a', '#ffa058', '#ff7a62'];
