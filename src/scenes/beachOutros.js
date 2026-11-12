// The beach costumes NU and AERO joined the main roster with: their win cutscenes (mixed into WinScene like
// winSkins.js; the entries are spread into SKIN_CUTS there). Music: tools/audio/beach_outros.py.
//   NU    SURF ROCK  SURF'S UP - golden hour on the shore, he catches a curling wave and rides it in, then plays a
//                    bonfire show for the beaten, buried up to their necks in the sand beside their sandcastles
//   AERO  TIDE POOL  LOW TIDE - midday shallows with crabs, a dive into a sunlit underwater world of kelp and fish,
//                    then the tide goes out and leaves the beaten stranded on the wet sand like starfish
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { skinInfo } from '../fighters/skins.js';

const W = VIEW_W, H = VIEW_H;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

export const BEACH_CUTS = {
  'nu:SURF ROCK': { fn: 'nu_surf', len: 720, card: 600, name: 'NU', sub: 'SURF ROCK', line: "SURF'S UP. YOU'RE DOWN.", music: 'bgm_outro_surf',
    color: '#2ad0d0', stroke: '#0a2a3a', shots: [[0, 'shore'], [200, 'ride'], [430, 'show']] },
  'aero:TIDE POOL': { fn: 'aero_tide', len: 720, card: 600, name: 'AERO', sub: 'TIDE POOL', line: 'THE TIDE TAKES EVERYTHING.', music: 'bgm_outro_tide',
    color: '#90f4f0', stroke: '#06304a', shots: [[0, 'shallows'], [200, 'dive'], [430, 'lowtide']] },
};

/** The shots (WinScene methods shot_<fn>_<name>(t, k, s)). */
export class BeachShots {
  /** A beach: sky from top to horizon, the sun, the sea with rolling foam lines, sand. sun: 0 noon .. 1 setting. */
  bchScene(g, t, sun, horizon = 170, shore = 270) {
    const top = sun > 0.5 ? 0x3a2a7a : 0x2a8ae8, mid = sun > 0.5 ? 0xff6a7a : 0x8ad4ff, low = sun > 0.5 ? 0xffc06a : 0xd8f4ff;
    this.sky(g, top, mid, 6); const c1 = Phaser.Display.Color.IntegerToColor(mid), c2 = Phaser.Display.Color.IntegerToColor(low);
    for (let i = 0; i < 6; i++) { const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 5, i); g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1); g.fillRect(0, 90 + i * (horizon - 90) / 6, W, (horizon - 90) / 6 + 1); }
    const sy = horizon - 10 + sun * 30, sx = W * 0.7;
    this.glow(g, sx, sy, 70, sun > 0.5 ? 0xffb050 : 0xffffff, 0.5); g.fillStyle(sun > 0.5 ? 0xffd070 : 0xfffbe0, 1); g.fillCircle(sx, sy, 22);
    g.fillStyle(sun > 0.5 ? 0x2a4a8a : 0x1a8ad0, 1); g.fillRect(0, horizon, W, shore - horizon);       // the sea
    for (let i = 0; i < 18; i++) { const sp = this.spots[i], y = horizon + 4 + sp[0] * (shore - horizon - 10); g.fillStyle(sun > 0.5 ? 0xffc06a : 0xffffff, 0.5); g.fillRect((sp[1] * W + Math.sin(t * 0.05 + i) * 10) % W, y, 6 + sp[2] * 14, 1); }   // sun sparkle
    for (let i = 0; i < 3; i++) { const y = shore - 30 + ((t * 0.4 + i * 14) % 40); g.fillStyle(0xffffff, 0.55 - i * 0.12); g.fillRect(0, y, W, 2); }   // foam lines rolling in
    g.fillStyle(sun > 0.5 ? 0xd8a060 : 0xf0d48a, 1); g.fillRect(0, shore, W, H - shore);                  // the sand
    g.fillStyle(sun > 0.5 ? 0xb8804a : 0xd8b468, 1); for (let i = 0; i < 40; i++) { const sp = this.spots[i]; g.fillRect(sp[0] * W, shore + 4 + sp[1] * (H - shore), 2, 1); }
  }
  /** Shows the winner in one frame of a strip (run / jump / fall) of the costume they wear. */
  bchStrip(strip, frame, x, y, sc) {
    const set = skinInfo(this.def.id, this.win.skin || 0).sheetSet, key = set && this.def.costumeSheets && this.def.costumeSheets[set] ? this.def.costumeSheets[set][strip] : this.def.sheets[strip];
    const n = Math.max(1, (this.textures.get(key).frameTotal || 2) - 1);
    this.hero.setTexture(key, Math.floor(frame) % n).setOrigin(this.def.originX ?? 0.5, this.def.originY).setPosition(x, y).setScale(sc).setFlipX(!!this.def.facesLeft)
      .setRotation(0).setAlpha(1).clearTint().setTintMode(Phaser.TintModes.MULTIPLY).setVisible(true);
  }
  /** A palm tree silhouette leaning over the beach. */
  bchPalm(g, x, y, h, lean, col) {
    g.lineStyle(7, col, 1); g.beginPath(); g.moveTo(x, y); for (let i = 1; i <= 6; i++) g.lineTo(x + lean * i * i / 6, y - h * i / 6); g.strokePath();
    const tx = x + lean * 6, ty = y - h;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; g.fillStyle(col, 1); g.fillTriangle(tx, ty, tx + Math.cos(a - 0.2) * 60, ty + Math.sin(a - 0.2) * 30 + 20, tx + Math.cos(a + 0.2) * 60, ty + Math.sin(a + 0.2) * 30 + 26); }
  }

  // ================================================================= NU - SURF ROCK
  /** [0] Golden hour: he strolls along the shoreline, the sea rolling in, palms leaning over. */
  shot_nu_surf_shore(t, k, s) {
    this.bchScene(this.bg, t, 1);
    this.bchPalm(this.mid, 70, 300, 150, 6, 0x2a1a2a); this.bchPalm(this.mid, 600, 300, 170, -7, 0x2a1a2a);
    this.hideLosers();
    const x = 140 + ease(s / 190) * 220;
    this.bchStrip('run', s / 7, x, 300, 3);
    this.hero.setTint(0xffd8b0);
    for (let i = 0; i < 6; i++) { const fx = x - 40 - i * 34; if (fx > 0) { this.fx.fillStyle(0xb8804a, 0.6); this.fx.fillEllipse(fx, 304 + (i % 2) * 4, 8, 3); } }   // footprints in the sand
    this.vignette(this.over, 0.4);
  }
  /** [200] He catches a curling wave on a striped board and rides it, spray flying. */
  shot_nu_surf_ride(t, k, s) {
    const g = this.bg; this.hideLosers();
    this.sky(g, 0x3a2a7a, 0xffb06a, 10);
    const crest = 120 + Math.sin(s * 0.05) * 8;
    for (let i = 0; i < 7; i++) { g.fillStyle([0x0a3a6a, 0x0a5a8a, 0x107aa8, 0x2a9ac0, 0x48b8d8, 0x7ad4e8, 0xb8ecf4][i], 1); g.fillEllipse(W * 0.85 - i * 18, crest + 80 + i * 22, 820 - i * 60, 300 - i * 20); }   // the wave, curling over from the right
    g.fillStyle(0xffffff, 0.9); for (let i = 0; i < 18; i++) g.fillCircle(W - 40 - i * 22 + Math.sin(t * 0.3 + i) * 4, crest - 10 + Math.sin(i * 0.8) * 6, 8 - (i % 3));   // its foaming lip
    const bx = 260 + Math.sin(s * 0.04) * 40, by = 250 + Math.sin(s * 0.07) * 12, tilt = Math.sin(s * 0.04) * 0.15;
    this.mid.fillStyle(0xff6a3a, 1); this.mid.fillEllipse(bx, by + 4, 120, 12); this.mid.fillStyle(0xffffff, 1); this.mid.fillRect(bx - 50, by + 2, 100, 3);   // his surfboard
    this.idle(bx, by, 3, s); this.hero.setRotation(tilt);
    for (let i = 0; i < 24; i++) { const sp = this.spots[i], d = (s * 2 + i * 9) % 50; this.fx.fillStyle(i % 2 ? 0xffffff : 0xb8ecf4, Math.max(0, 1 - d / 50)); this.fx.fillCircle(bx - 60 - d * 2 - sp[0] * 20, by - d * (0.5 + sp[1]) + d * d * 0.02, 2 + sp[2] * 2); }   // spray off the tail
    if (s === 0) sfx('geyser', 0.6, 0.8);
    this.vignette(this.over, 0.35);
  }
  /** [430] Night on the beach: a bonfire, he plays - and the beaten are buried to their necks in the sand. */
  shot_nu_surf_show(t, k, s) {
    const g = this.bg, ground = 296;
    this.sky(g, 0x0a0a2a, 0x3a2a5a, 10);
    for (let i = 0; i < 30; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.4 + 0.5 * Math.abs(Math.sin(t * 0.05 + i))); g.fillRect(sp[0] * W, sp[1] * 140, 1, 1); }
    g.fillStyle(0x0a1a3a, 1); g.fillRect(0, 200, W, ground - 200); g.fillStyle(0xffffff, 0.3); g.fillRect(0, 230 + Math.sin(t * 0.05) * 3, W, 1);
    g.fillStyle(0x6a4a2a, 1); g.fillRect(0, ground, W, H - ground);
    const fx = 420;                                                                  // the bonfire
    this.glow(this.mid, fx, ground - 20, 120 + Math.sin(t * 0.3) * 8, 0xff8a2a, 0.35);
    for (let i = 0; i < 9; i++) { const ph = t * 0.25 + i; this.fx.fillStyle([0xff4a1a, 0xff9a2a, 0xffe070][i % 3], 0.9); this.fx.fillTriangle(fx - 22 + i * 5, ground, fx - 14 + i * 5, ground, fx - 18 + i * 5 + Math.sin(ph) * 4, ground - 24 - Math.abs(Math.sin(ph)) * 22); }
    this.fx.fillStyle(0x3a2216, 1); this.fx.fillRect(fx - 26, ground - 4, 52, 6);
    this.losers.forEach((l, i) => {                                                  // buried up to their necks, a sandcastle by each
      const bx = [120, 220, 540][i]; if (!l.def || bx === undefined) { l.s.setVisible(false); return; }
      l.s.setCrop().setPosition(bx, ground + 40).setScale(2).setRotation(0).setAlpha(1).setTintMode(Phaser.TintModes.FILL).setTint(0x1a0a1a).setVisible(true);
      l.s.setCrop(0, 0, l.s.frame.width, l.s.frame.height * 0.4);
      this.fx.fillStyle(0x8a6a3a, 1); this.fx.fillEllipse(bx, ground + 2, 70, 16);
      this.fx.fillStyle(0xc8a060, 1); this.fx.fillRect(bx + 30, ground - 18, 18, 18); this.fx.fillTriangle(bx + 30, ground - 18, bx + 39, ground - 28, bx + 48, ground - 18);
    });
    this.move('taunt', (s / 5) % (this.def.moveAnims.taunt ? this.def.moveAnims.taunt[1] : 8), 330, ground, 3);
    this.hero.setTint(0xffd0a0);
    for (let i = 0; i < 6; i++) { const d = (s * 1.2 + i * 30) % 160; this.fx.fillStyle(0xfff4a0, Math.max(0, 1 - d / 160)); this.fx.fillCircle(330 + Math.sin(d * 0.08 + i) * 30, 200 - d, 3); this.fx.fillRect(332 + Math.sin(d * 0.08 + i) * 30, 192 - d, 1, 8); }   // notes drifting up into the night
    this.vignette(this.over, 0.55);
  }

  // ================================================================= AERO - TIDE POOL
  /** [0] Midday shallows: he stands in clear water lapping round his legs; crabs scuttle past on the sand. */
  shot_aero_tide_shallows(t, k, s) {
    this.bchScene(this.bg, t, 0, 160, 250);
    this.bchPalm(this.mid, 40, 300, 160, 8, 0x2a6a3a);
    this.hideLosers();
    this.idle(320, 300, 3, s);
    this.front.fillStyle(0x58c8e8, 0.45); this.front.fillRect(0, 282 + Math.sin(t * 0.06) * 3, W, 20);                // the water over his feet
    this.front.fillStyle(0xffffff, 0.6); this.front.fillRect(0, 282 + Math.sin(t * 0.06) * 3, W, 2);
    for (let i = 0; i < 3; i++) {                                                     // crabs
      const cx = ((s * (0.8 + i * 0.3) + i * 220) % (W + 60)) - 30, cy = 320 + i * 8;
      this.fx.fillStyle(0xe84a3a, 1); this.fx.fillEllipse(cx, cy, 14, 8); this.fx.fillCircle(cx - 9, cy - 4, 3); this.fx.fillCircle(cx + 9, cy - 4, 3);
      this.fx.fillStyle(0x000000, 1); this.fx.fillRect(cx - 3, cy - 6, 1, 2); this.fx.fillRect(cx + 2, cy - 6, 1, 2);
    }
    for (let i = 0; i < 10; i++) { const sp = this.spots[i], d = (s + i * 17) % 90; this.bubble(this.fx, 300 + sp[0] * 60, 220 - d, 2 + sp[1] * 2, 1 - d / 90); }
    this.vignette(this.over, 0.3);
  }
  /** [200] Under the water: sunbeams, kelp swaying, a school of fish; he drifts in a stream of bubbles; the beaten tangled in the kelp. */
  shot_aero_tide_dive(t, k, s) {
    const g = this.bg;
    this.sky(g, 0x48c8e8, 0x0a3a6a, 12);
    for (let i = 0; i < 6; i++) { g.fillStyle(0xffffff, 0.06); g.fillTriangle(60 + i * 110 + Math.sin(t * 0.01 + i) * 20, 0, 110 + i * 110, 0, 20 + i * 120, H); }   // sunbeams
    g.fillStyle(0xd8b468, 1); g.fillRect(0, 316, W, 44);
    for (let i = 0; i < 9; i++) { const x = 30 + i * 74; g.lineStyle(4, 0x2a8a4a, 1); g.beginPath(); g.moveTo(x, 320); for (let j = 1; j <= 6; j++) g.lineTo(x + Math.sin(t * 0.04 + i + j * 0.5) * 8, 320 - j * 24); g.strokePath(); }   // kelp
    this.posLosers([[110, 312, 1.8, 1.4, 0.95], [520, 314, 1.8, -1.4, 0.95], [420, 318, 1.6, 1.5, 0.95]], 0x0a2a3a);
    for (let i = 0; i < 14; i++) { const fx = ((t * 1.5 + i * 23) % (W + 80)) - 40, fy = 110 + Math.sin(i * 1.7) * 20 + Math.sin(t * 0.05 + i) * 6; this.mid.fillStyle(i % 3 ? 0xffd23a : 0xff7a1a, 1); this.mid.fillEllipse(fx, fy, 10, 5); this.mid.fillTriangle(fx - 5, fy, fx - 10, fy - 4, fx - 10, fy + 4); }   // a school of fish
    const y = 236 + Math.sin(s * 0.04) * 10;
    this.bchStrip('fall', s / 8, 320, y, 3); this.hero.setTint(0xa8e8f0);
    for (let i = 0; i < 20; i++) { const sp = this.spots[i], d = (s * 1.5 + i * 13) % 200; this.bubble(this.fx, 320 + (sp[0] - 0.5) * 50 + Math.sin(d * 0.1) * 6, y - 60 - d, 2 + sp[1] * 3, 1 - d / 200); }
    if (s === 0) { this.flash = 3; sfx('geyser', 0.5, 0.6); }
    this.vignette(this.over, 0.5);
  }
  /** [430] Low tide at sunset: the water draws back, and the beaten are left on the wet sand like stranded starfish. */
  shot_aero_tide_lowtide(t, k, s) {
    const ebb = ease(s / 150);
    this.bchScene(this.bg, t, 1, 170, 230 + ebb * 30);
    this.bg.fillStyle(0xffd8a0, 0.25); this.bg.fillRect(0, 260, W, 40);                    // the wet sand, shining
    this.posLosers([[120, 318, 1.8, 1.45, 0.95], [520, 320, 1.8, -1.45, 0.95], [420, 324, 1.6, 1.5, 0.95]], 0x3a1a2a);
    this.losers.forEach((l, i) => {                                                   // ...each with a starfish stuck to it
      if (!l.s.visible) return; const x = l.s.x + (i % 2 ? -10 : 10), y = l.s.y - 8;
      for (let a = 0; a < 5; a++) { const q = a * Math.PI * 2 / 5 - Math.PI / 2; this.fx.lineStyle(3, 0xffa03a, 1); this.fx.lineBetween(x, y, x + Math.cos(q) * 7, y + Math.sin(q) * 7); }
    });
    this.idle(320, 300, 3.2, s); this.hero.setTint(0xffd8c0);
    const [hx, hy, ox, oy] = this.headOf(this.def);
    this.glow(this.fx, 320 + (hx - ox) * 3.2, 300 + (hy - oy) * 3.2, 26 + Math.sin(s * 0.2) * 4, 0xfff4c0, 0.45);   // the sun glinting on his dome
    this.vignette(this.over, 0.45);
  }
}
