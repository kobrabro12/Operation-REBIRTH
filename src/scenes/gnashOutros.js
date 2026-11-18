// GNASH's three map costumes' win cutscenes (mixed into WinScene like winSkins.js; the entries are spread into
// SKIN_CUTS there). Each is set on the stage the costume is drawn after, and plays that stage's music.
//   HIGH SCORE    NEW HIGH SCORE - he swaggers into a dark arcade between rows of glowing cabinets; then he's inside
//                 one of the games, the beaten as pink pixel enemies on the CRT exploding into blocks; then the HIGH
//                 SCORES table, every line of it GNA, and the beaten at the bottom
//   GRAVEMOON     STONE COLD - GRAVEMOON BRIDGE under the full moon, mist and bats; his HOWL against the moon; then
//                 the beaten stand on the parapet as cracked stone gargoyles, and he sits among them
//   POP LINES     LINE DANCE - a subway platform at night, the empty black ad panels filling up with his chalk doodles;
//                 a huge flat-colour mural with the beaten painted on it in thick black lines, energy dashes pulsing
//                 round them; a block party in the street, the whole skyline drawn in, everyone dancing (music: outro_pop)
//   EXECUTIONER   THE VERDICT - dusk in the old town square: a crowd with torches, the bell tower, the scaffold, the
//                 beaten kneeling on it in a row as he climbs up; his giant shadow on the wall lifting the axe over the
//                 block while the drums roll; the axe falls - black, one slash of light, the bell swings and every crow
//                 in the tower bursts into the sky; a cold foggy dawn, the square empty, the axe left standing in the
//                 block with a crow on it, and him walking off into the fog (music: outro_exec)
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
  'gnash:EXECUTIONER': { fn: 'gn_exec', len: 720, card: 600, name: 'GNASH', sub: 'EXECUTIONER', line: 'THE VERDICT IS FINAL.', music: 'bgm_outro_exec',
    color: '#ff6a20', stroke: '#1a0d08', shots: [[0, 'square'], [180, 'shadow'], [360, 'bell'], [480, 'dawn']] },
  'gnash:POP LINES': { fn: 'gn_pop', len: 720, card: 600, name: 'GNASH', sub: 'POP LINES', line: 'EVERY WALL IS MINE.', music: 'bgm_outro_pop',
    color: '#ffd21e', stroke: '#000000', shots: [[0, 'subway'], [200, 'mural'], [430, 'party']] },
};
const POP = [0xe8281e, 0xffd21e, 0x1e64d8, 0x2ec850, 0xff7ab0];

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

  // ================================================================= POP LINES
  /** Black energy dashes in a ring round (x, y): `k` 0..1 pushes them out; `n` dashes. */
  gnDashes(g, x, y, r, k, n = 8, w = 3, col = 0x000000) {
    g.lineStyle(w, col, 1 - k * 0.5);
    for (let i = 0; i < n; i++) { const q = i / n * Math.PI * 2 + 0.2, r0 = r + k * 14; g.lineBetween(x + Math.cos(q) * r0, y + Math.sin(q) * r0, x + Math.cos(q) * (r0 + 10), y + Math.sin(q) * (r0 + 10)); }
    g.lineStyle(0);
  }
  /** A chalk doodle (in white lines) of kind 0..3 at (x, y), drawn up to `k` 0..1: a dancing figure, a heart, an X-eyed face, a zig-zag. */
  gnDoodle(g, kind, x, y, k, col = 0xf4f4f0) {
    if (k <= 0) return;
    g.lineStyle(2, col, 0.95);
    const seg = (pts) => { const n = Math.max(1, Math.floor((pts.length - 1) * Math.min(1, k)) + 1); for (let i = 1; i < n; i++) g.lineBetween(x + pts[i - 1][0], y + pts[i - 1][1], x + pts[i][0], y + pts[i][1]); };
    if (kind === 0) { g.strokeCircle(x, y - 22, 5 * Math.min(1, k * 3)); seg([[0, -17], [0, 2], [-8, 14]]); seg([[0, 2], [9, 13]]); seg([[-10, -14], [0, -10], [10, -16]]); }
    else if (kind === 1) seg([[0, 8], [-10, -2], [-9, -9], [-4, -11], [0, -6], [4, -11], [9, -9], [10, -2], [0, 8]]);
    else if (kind === 2) { g.strokeCircle(x, y - 4, 10 * Math.min(1, k * 2)); seg([[-6, -8], [-2, -4]]); seg([[-2, -8], [-6, -4]]); seg([[2, -8], [6, -4]]); seg([[6, -8], [2, -4]]); seg([[-5, 1], [-2, 3], [1, 1], [4, 3]]); }
    else seg([[-14, 0], [-9, -6], [-4, 0], [1, -6], [6, 0], [11, -6], [16, 0]]);
    if (k > 0.9) this.gnDashes(g, x, y - 8, 18, 0, 6, 2, col);
    g.lineStyle(0);
  }
  /** [0] A subway platform at night: tiled wall, black ad panels filling up with his chalk doodles as he goes. */
  shot_gn_pop_subway(t, k, s) {
    const g = this.bg; this.hideLosers();
    g.fillStyle(0xd8d4c4, 1); g.fillRect(0, 0, W, 300);
    g.lineStyle(1, 0xb8b4a4, 1); for (let y = 0; y < 300; y += 14) g.lineBetween(0, y, W, y); for (let x = 0; x < W; x += 22) g.lineBetween(x, 0, x, 300); g.lineStyle(0);
    g.fillStyle(0x2a6a3a, 1); g.fillRect(0, 34, W, 14);                                           // the station stripe
    g.fillStyle(0x3a3a3a, 1); g.fillRect(0, 300, W, H - 300); g.fillStyle(0xffd21e, 1); g.fillRect(0, 300, W, 5);   // the platform edge
    const panels = [[40, 90], [250, 90], [460, 90]];
    panels.forEach(([px, py], i) => {
      g.fillStyle(0x6a6a6a, 1); g.fillRect(px - 4, py - 4, 148, 108); g.fillStyle(0x0a0a0a, 1); g.fillRect(px, py, 140, 100);
      for (let j = 0; j < 4; j++) this.gnDoodle(this.mid, (i + j) % 4, px + 22 + j * 32, py + 66 - (j % 2) * 20, (s - 20 - i * 50 - j * 12) / 16);
    });
    const x = 70 + ease(s / 180) * 440;
    this.bchStrip('run', s / 6, x, 302, 2.4);
    for (let i = 0; i < 6; i++) { const d = (s * 2 + i * 9) % 40; this.fx.fillStyle(0xf4f4f0, 0.7 * (1 - d / 40)); this.fx.fillRect(x + 20 + d * 0.4, 230 - d, 2, 2); }   // chalk dust
    if (s % 40 === 10) sfx('dodge', 0.25, 1.6);
    this.vignette(this.over, 0.4);
  }
  /** [200] The mural: a white wall, the beaten painted on it as flat colour figures in thick black lines, dashes pulsing round everyone. */
  shot_gn_pop_mural(t, k, s) {
    const g = this.bg, beat = (s % 27) / 27;
    g.fillStyle(0xf6f2e8, 1); g.fillRect(0, 0, W, H);                                 // a white wall, like his canvases
    for (let i = 0; i < 7; i++) { g.fillStyle(POP[i % 5], 1); g.fillRect(i * 96 - 20, 300, 96, 60); }   // a band of flat colour along the bottom
    g.lineStyle(4, 0x000000, 1); g.lineBetween(0, 300, W, 300); g.lineStyle(0);
    const xs = [110, 230, 540], cols = [0xe8281e, 0x1e64d8, 0x2ec850];
    this.losers.forEach((l, i) => {
      if (!l.def || xs[i] === undefined) { l.s.setVisible(false); return; }
      const lean = Math.sin(s * 0.23 + i) * 0.15;
      l.s.setCrop().setPosition(xs[i], 296).setScale(2).setRotation(lean).setAlpha(1).setTintMode(Phaser.TintModes.FILL).setTint(cols[i]).setVisible(true);
      this.gnDashes(this.fx, xs[i], 240, 40, beat, 8, 4);
    });
    this.idle(380, 298, 2.6, s);
    this.gnDashes(this.fx, 380, 220, 56, beat, 12, 4);
    for (let i = 0; i < 5; i++) { const sp = this.spots[i]; this.gnDoodle(this.fx, 1, 40 + sp[0] * 560, 40 + sp[1] * 80, 1, 0x000000); }   // hearts painted up high
    if (s === 0) { this.flash = 4; sfx('ding', 0.5, 1.2); }
  }
  /** [430] The block party: the skyline drawn in flat colour, the beaten dancing, him dancing out front, hearts flying. */
  shot_gn_pop_party(t, k, s) {
    const g = this.bg, beat = (s % 27) / 27, bop = Math.abs(Math.sin(s * Math.PI / 27));
    g.fillStyle(0x1e64d8, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {                                                     // the skyline: flat blocks in thick black lines
      const bw = 50 + (i * 37) % 40, bh = 90 + (i * 53) % 110, bx = i * 74 - 10;
      g.fillStyle(0x000000, 1); g.fillRect(bx - 3, 270 - bh - 3, bw + 6, bh + 6); g.fillStyle(POP[(i + 1) % 5], 1); g.fillRect(bx, 270 - bh, bw, bh);
      g.fillStyle(0x000000, 1); for (let w = 0; w < 4; w++) g.fillRect(bx + 8 + (w % 2) * (bw - 24), 270 - bh + 14 + Math.floor(w / 2) * 26, 8, 12);
    }
    g.fillStyle(0x000000, 1); g.fillRect(0, 270, W, H - 270); g.fillStyle(0xf4f4f0, 1); g.fillRect(0, 274, W, H - 274);
    const xs = [100, 200, 540];
    this.losers.forEach((l, i) => {
      if (!l.def || xs[i] === undefined) { l.s.setVisible(false); return; }
      l.s.setCrop().setPosition(xs[i], 330 - bop * 10 * (i % 2 ? 1 : 0.6)).setScale(1.8).setRotation(Math.sin(s * 0.12 + i * 2) * 0.2).setAlpha(1).setTintMode(Phaser.TintModes.FILL).setTint(POP[(i + 2) % 5]).setVisible(true);
      this.gnDashes(this.fx, xs[i], 280, 30, beat, 6, 3);
    });
    this.fx.fillStyle(0x000000, 1); this.fx.fillRect(420, 312, 44, 24); this.fx.fillStyle(0xe8281e, 1); this.fx.fillRect(422, 314, 40, 20);   // a boombox
    this.fx.fillStyle(0x000000, 1); this.fx.fillCircle(432, 324, 6 + bop); this.fx.fillCircle(452, 324, 6 + bop);
    this.idle(320, 334, 2.6, s);
    this.gnDashes(this.fx, 320, 254, 56, beat, 12, 4);
    for (let i = 0; i < 14; i++) { const sp = this.spots[i], d = (s * 1.4 + i * 29) % 300; this.gnDoodle(this.front, 1, sp[0] * W, 300 - d, 1, POP[i % 5]); }   // hearts floating up
  }

  // ================================================================= EXECUTIONER
  /** The old town's rooftops and its bell tower against the sky, in colour `col` (tower at tx). */
  gnTown(g, col, tx = 520) {
    g.fillStyle(col, 1);
    for (let i = 0; i < 9; i++) { const x = i * 76 - 20, h = 70 + (i * 37) % 50; g.fillRect(x, 260 - h, 66, h + 100); g.fillTriangle(x - 6, 260 - h, x + 33, 260 - h - 30, x + 72, 260 - h); }
    g.fillRect(tx - 22, 60, 44, 240); g.fillTriangle(tx - 30, 60, tx, 10, tx + 30, 60);                 // the bell tower
  }
  /** The scaffold: a wooden platform at height y between x0 and x1, steps on the left, a beam overhead. */
  gnScaffold(g, x0, x1, y) {
    g.fillStyle(0x3a2416, 1); g.fillRect(x0, y, x1 - x0, 10); g.fillStyle(0x5a3a22, 1); g.fillRect(x0, y, x1 - x0, 3);
    for (let x = x0 + 8; x < x1; x += 40) { g.fillStyle(0x2a1a10, 1); g.fillRect(x, y + 10, 6, 360 - y); }
    for (let i = 0; i < 5; i++) { g.fillStyle(0x4a2e1a, 1); g.fillRect(x0 - 20 - i * 14, y + 8 + i * 12, 16, 4); }
  }
  /** Torchlit crowd silhouettes along the bottom of the picture. */
  gnCrowd(g, t, y = 330) {
    for (let i = 0; i < 26; i++) {
      const x = i * 26 - 10 + (i % 2) * 8, hy = y - (i % 3) * 6 + Math.sin(t * 0.05 + i) * 1.5;
      g.fillStyle(0x0a0606, 1); g.fillCircle(x, hy - 22, 9); g.fillRect(x - 13, hy - 14, 26, 60);
      if (i % 5 === 2) {                                                           // a torch held up
        g.fillStyle(0x3a2416, 1); g.fillRect(x + 10, hy - 50, 3, 34);
        const fl = 1 + 0.3 * Math.sin(t * 0.6 + i);
        g.fillStyle(0xff6a20, 0.2); g.fillCircle(x + 11, hy - 56, 18 * fl); g.fillStyle(0xff8a30, 1); g.fillTriangle(x + 7, hy - 50, x + 15, hy - 50, x + 11, hy - 50 - 12 * fl);
      }
    }
  }
  /** Letterbox bars and film grain over the whole picture. */
  gnFilm(g, t) {
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, 26); g.fillRect(0, H - 26, W, 26);
    for (let i = 0; i < 40; i++) { const sp = this.spots[(i + t) % 30]; g.fillStyle(i % 2 ? 0xffffff : 0x000000, 0.06); g.fillRect(((sp[0] * 997 + t * 37 + i * 61) % W), ((sp[1] * 991 + t * 53 + i * 29) % H), 2, 2); }
  }
  /** [0] Dusk in the town square: the crowd and their torches, the bell tower, the beaten kneeling on the scaffold, him climbing up to it. */
  shot_gn_exec_square(t, k, s) {
    const g = this.bg;
    this.sky(g, 0x1a0a14, 0xc0482a, 10);
    this.glow(g, 160, 230, 120, 0xff8a40, 0.35);                                   // the sun going down behind the roofs
    this.gnTown(g, 0x1a1016);
    this.gnScaffold(this.mid, 240, 600, 250);
    this.posLosers([[440, 250, 1.4, 0, 1, true], [510, 250, 1.4, 0, 1, true], [575, 250, 1.4, 0, 1, true]], 0x1a0d08);
    const walk = ease(s / 140), x = 120 + walk * 200, y = s < 70 ? 330 - Math.max(0, (s - 20)) * 0 : 250;
    if (s < 140) this.bchStrip('run', s / 8, x, s < 60 ? 312 - Math.max(0, x - 180) * 0.8 : 250, 2.0);
    else this.idle(330, 250, 2.0, s);
    this.gnCrowd(this.front, t, 350);
    if (s === 0) sfx('clang', 0.5, 0.45);
    if (s === 90) sfx('clang', 0.45, 0.45);
    this.gnFilm(this.over, t); this.vignette(this.over, 0.6);
  }
  /** [180] His giant shadow on the torchlit wall lifting the axe over the block; the beaten kneeling at it, head bowed. */
  shot_gn_exec_shadow(t, k, s) {
    const g = this.bg, fl = 0.9 + 0.1 * Math.sin(t * 0.6);
    g.fillStyle(0x4a3226, 1); g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 22) for (let x = (y / 22) % 2 ? -30 : 0; x < W; x += 60) { g.lineStyle(1, 0x2e1e16, 1); g.strokeRect(x, y, 60, 22); }   // the stone wall
    g.lineStyle(0);
    this.glow(g, 60, 300, 360 * fl, 0xff8a30, 0.45);                              // the torch, off to the left
    const lift = ease(s / 150), A = this.def.moveAnims.downB;                      // the shadow: his slam's wind-up, held up high
    this.move('downB', A ? Math.min(A[1] - 1, Math.floor(lift * 5)) : 0, 360 + Math.sin(t * 0.6) * 3, 330, 4.2 + lift * 0.4);
    this.hero.setTintMode(Phaser.TintModes.FILL).setTint(0x0a0606).setAlpha(0.85);
    this.mid.fillStyle(0x3a2416, 1); this.mid.fillRect(300, 300, 90, 40); this.mid.fillStyle(0x5a3a22, 1); this.mid.fillRect(300, 296, 90, 6);   // the block
    this.posLosers([[270, 336, 2.2, 0.35, 1, true]], 0x0a0606);
    for (let i = 0; i < 5; i++) { const cx = 470 + i * 30, cy = 60; this.fx.fillStyle(0x0a0808, 1); this.fx.fillEllipse(cx, cy, 10, 7); this.fx.fillCircle(cx + 4, cy - 5, 3); }   // crows on the ledge, watching
    this.fx.fillStyle(0x2a1a14, 1); this.fx.fillRect(440, 66, 200, 6);
    if (s === 20) sfx('taiko', 0.5, 0.6);
    if (s % 30 === 0 && s > 20) sfx('taiko', 0.3 + s / 600, 0.7);
    this.gnFilm(this.over, t); this.vignette(this.over, 0.65);
  }
  /** [360] The blow: black, one slash of light - then the bell swinging in its tower and every crow bursting into the sky. */
  shot_gn_exec_bell(t, k, s) {
    const g = this.bg;
    this.hideLosers(); this.hero.setVisible(false);
    if (s < 18) {
      g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, H);
      if (s >= 8) { const w = (18 - s) / 10; this.fx.lineStyle(6 * w + 1, 0xffffff, 1); this.fx.lineBetween(-20, 40, W + 20, H - 40); this.fx.lineStyle(2, 0xff6a20, w); this.fx.lineBetween(-20, 46, W + 20, H - 34); this.fx.lineStyle(0); }
      if (s === 8) { sfx('slash', 0.7, 0.5); sfx('bighit', 0.8, 0.5); this.cameras.main.shake(300, 0.012); }
    } else {
      this.sky(g, 0x2a0a10, 0x8a2a1a, 10);
      this.gnTown(g, 0x140a0e, 320);
      const sw = Math.sin((s - 18) * 0.12) * 0.5 * Math.max(0, 1 - (s - 18) / 120);   // the bell, swinging in the tower
      g.fillStyle(0x0a0606, 1); g.fillRect(290, 70, 60, 70);
      const bx = 320 + Math.sin(sw) * 18, by = 92;
      this.mid.fillStyle(0x8a6a2a, 1); this.mid.fillTriangle(bx - 22, by + 34, bx + 22, by + 34, bx, by - 6); this.mid.fillCircle(bx, by + 2, 13); this.mid.fillRect(bx - 24, by + 32, 48, 5);
      this.mid.fillStyle(0xd0a040, 1); this.mid.fillRect(bx - 12, by + 4, 3, 24);
      if (s === 18) sfx('clang', 0.7, 0.4);
      if (s === 80) sfx('clang', 0.5, 0.4);
      for (let i = 0; i < 26; i++) {                                                // the crows bursting out
        const sp = this.spots[i], d = (s - 18) * (1.5 + sp[0] * 2), q = -Math.PI / 2 + (sp[1] - 0.5) * 2.6, cx = 320 + Math.cos(q) * d, cy = 110 + Math.sin(q) * d * 0.7, w = (t + i) % 8 < 4 ? 7 : 2;
        this.fx.fillStyle(0x050404, 1); this.fx.fillTriangle(cx - w - 3, cy - 3, cx, cy, cx - 1, cy + 2); this.fx.fillTriangle(cx + w + 3, cy - 3, cx, cy, cx + 1, cy + 2); this.fx.fillEllipse(cx, cy, 6, 4);
      }
      if (s === 20) sfx('bats', 0.6, 0.6);
    }
    this.gnFilm(this.over, t); this.vignette(this.over, 0.6);
  }
  /** [480] Cold foggy dawn: the square empty, the axe left standing in the block with a crow on its haft, him walking off into the fog. */
  shot_gn_exec_dawn(t, k, s) {
    const g = this.bg;
    this.sky(g, 0x8a96a8, 0xd8dce0, 8);
    this.gnTown(g, 0x6a7280);
    this.gnScaffold(this.mid, 200, 560, 262);
    this.hideLosers();
    const bx = 300;                                                                  // the block, the axe standing in it, the crow
    this.mid.fillStyle(0x3a2416, 1); this.mid.fillRect(bx - 18, 240, 36, 22); this.mid.fillStyle(0x5a3a22, 1); this.mid.fillRect(bx - 18, 238, 36, 4);
    this.mid.fillStyle(0x6a4428, 1); this.mid.fillRect(bx + 4, 170, 4, 74);
    this.mid.fillStyle(0x7e8890, 1); this.mid.fillTriangle(bx - 2, 238, bx + 22, 238, bx + 20, 224); this.mid.fillRect(bx - 4, 230, 14, 10);
    this.mid.fillStyle(0x0a0808, 1); this.mid.fillEllipse(bx + 6, 164, 12, 8); this.mid.fillCircle(bx + 11, 159, 3.5); this.mid.fillStyle(0xd0a030, 1); this.mid.fillRect(bx + 14, 159, 3, 1);
    const x = 400 + s * 1.3;                                                         // him, walking away into the fog
    this.bchStrip('run', s / 9, x, 262, 2.0); this.hero.setAlpha(Math.max(0, 1 - s / 110)).setTint(0xb0b8c4);
    this.gnMist(this.front, t, 240, 0.22); this.gnMist(this.front, t + 300, 280, 0.25);
    if (s === 30) sfx('clang', 0.25, 0.5);
    this.gnFilm(this.over, t); this.vignette(this.over, 0.45);
  }
}
const SUN_CSS = ['#ffe56a', '#ffc85a', '#ffa058', '#ff7a62'];
