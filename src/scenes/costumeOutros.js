// THE MIRACLE COSTUMES' OUTROS (Trinkets > SHOP): STORMCALLER, SUN PHARAOH and SPACEWALK (AERO) each replace their fighter's
// win cutscene with their own (COSTUME_CUTS, spread into SKIN_CUTS in winSkins.js; CostumeShots is mixed into
// WinScene, so `this` is the WinScene and its helpers - sky, glow, idle, move, strip, closeUp, posLosers, label,
// vignette... - are all here). Music: bgm_outro_storm / pharaoh / starfarer (tools/audio/costume_outros.py, scored
// to the shots below).
//   STORMCALLER "THE SKY ANSWERS": a mountain peak at night in a storm - him on the summit, the beaten on the rocks
//     below; low on him as he raises his hand and the clouds wheel into a vortex over him; the bolts come down on each
//     of the beaten in turn; close on his face, the crown of lightning crackling; dawn breaks, the clouds part.
//   SUN PHARAOH "THE ETERNAL": across the dunes at sunset, pyramids on the skyline, the beaten trudging after him;
//     his temple by torchlight, the beaten kneeling before his throne; he raises the staff and its sun blazes until
//     it fills the screen; they stand wrapped as mummies in gold coffins as the lids swing shut; night, the pyramid,
//     the door slab sliding down.
//   SPACEWALK "ONE SMALL SPLASH": the launch pad at night, 3-2-1 and lift-off; drifting in orbit over a blue world,
//     the beaten tumbling away into the dark; the moon - he lands and plants a goldfish flag; close on his dome, the
//     world reflected in the glass; he waves from the moon while the beaten drift off among the stars.
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';

const W = VIEW_W, H = VIEW_H;
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };

export const COSTUME_CUTS = {
  'soul-summoner:STORMCALLER': { fn: 'cs_storm', len: 840, card: 660, name: 'SOUL SUMMONER', sub: 'STORMCALLER', line: 'THE SKY ANSWERS TO ME.', music: 'bgm_outro_storm',
    color: '#ffe040', stroke: '#0a1020', shots: [[0, 'peak'], [190, 'raise'], [330, 'strike'], [470, 'crown'], [600, 'dawn']] },
  'mr-wake:SUN PHARAOH': { fn: 'cs_pharaoh', len: 840, card: 660, name: 'MR WAKE', sub: 'SUN PHARAOH', line: 'YOUR TOMB IS READY. I CARVED YOUR NAME MYSELF.', music: 'bgm_outro_pharaoh',
    color: '#ffd860', stroke: '#1a0e04', shots: [[0, 'dunes'], [180, 'temple'], [330, 'sun'], [470, 'wrap'], [620, 'tomb']] },
  'aero:SPACEWALK': { fn: 'cs_star', len: 840, card: 660, name: 'AERO', sub: 'SPACEWALK', line: 'ONE SMALL SPLASH FOR A FISH.', music: 'bgm_outro_starfarer',
    color: '#c8a8ff', stroke: '#0a0618', shots: [[0, 'launch'], [200, 'orbit'], [380, 'moon'], [540, 'dome'], [640, 'wave']] },
};

/** The outros' shots (mixed into WinScene - see the top of the file). */
export class CostumeShots {
  // ================================================================ STORMCALLER
  /** A jagged bolt of lightning from (x0, y0) to (x1, y1): a wide glow and a white core, with a fork. */
  csBolt(g, x0, y0, x1, y1, seed, a = 1) {
    const pts = [[x0, y0]], n = 9;
    for (let i = 1; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + (((seed * 31 + i * 17) % 21) - 10) * 2, y0 + (y1 - y0) * k]); }
    pts.push([x1, y1]);
    for (const [w, c, al] of [[12, 0x6ae0ff, 0.25], [6, 0xffe040, 0.8], [2, 0xffffff, 1]]) {
      g.lineStyle(w, c, al * a);
      for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      const m = pts[4]; g.lineBetween(m[0], m[1], m[0] + 40, m[1] + 50);
    }
    g.lineStyle(0);
  }
  /** The storm sky: churning cloud bands; flash = a lightning flash lighting them (0..1); dawn = the sky clearing (0..1). */
  csStormSky(g, t, flash = 0, dawn = 0) {
    const top = dawn ? 0x2a1a3a : 0x05070e, bot = dawn ? 0xff9a6a : 0x1a2234;
    this.sky(g, top, bot);
    if (dawn) this.glow(g, W / 2, 300, 200, 0xffd080, 0.5 * dawn);
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {
      const x = (i * 90 + t * (0.4 + row * 0.15) * (row % 2 ? -1 : 1)) % (W + 120) - 60, y = 30 + row * 26 + Math.sin(i + t * 0.01) * 6, r = 40 + (i % 3) * 12;
      const c = flash > 0 ? 0x8a9ac8 : row < 2 ? 0x141a2a : 0x222c44;
      g.fillStyle(c, (0.9 - dawn * 0.75) * (1 - row * 0.08)); g.fillEllipse(x + dawn * (i % 2 ? 300 : -300), y - dawn * 60, r * 2.4, r);
    }
    if (flash > 0) { g.fillStyle(0xd8e8ff, 0.35 * flash); g.fillRect(0, 0, W, H); }
  }
  /** The mountain: a jagged peak (his summit at sx, sy) and the rocks below. */
  csPeak(g, sx, sy, lit = 0) {
    const c = lit ? 0x3a3048 : 0x0c0e18, c2 = lit ? 0x5a4a62 : 0x161a28;
    g.fillStyle(c, 1); g.fillPoints([{ x: -20, y: H }, { x: 80, y: 250 }, { x: 160, y: 280 }, { x: sx - 40, y: sy + 30 }, { x: sx - 10, y: sy }, { x: sx + 30, y: sy + 4 }, { x: sx + 90, y: sy + 70 }, { x: 470, y: 240 }, { x: 560, y: 280 }, { x: W + 20, y: 230 }, { x: W + 20, y: H }], true);
    g.fillStyle(c2, 1); g.fillPoints([{ x: sx - 10, y: sy }, { x: sx + 30, y: sy + 4 }, { x: sx + 50, y: sy + 60 }, { x: sx + 5, y: sy + 40 }], true);
    g.fillStyle(c2, 1); g.fillRect(380, 300, 260, 60); g.fillStyle(c, 1); g.fillRect(380, 300, 260, 3);
  }
  /** THE SKY ANSWERS, 1: the storm-lashed peak - him on the summit, the beaten on the rocks below, lightning flashing. */
  shot_cs_storm_peak(t, k, s) {
    const flash = s % 70 < 4 ? 1 - (s % 70) / 4 : 0;
    this.csStormSky(this.bg, t, flash);
    this.csPeak(this.bg, 240, 200, flash);
    this.idle(250, 202, 2.2, t);
    this.posLosers([[440, 302, 1.6, 0, 1], [500, 304, 1.6, 0, 1], [560, 302, 1.6, 0, 1]], flash ? 0x5a6a88 : 0x0a0c14);
    if (s % 70 === 0) { sfx('thunder', 0.5, 0.8 + (s % 3) * 0.1); this.csBolt(this.fx, 60 + (s * 7) % 500, 0, 40 + (s * 13) % 560, 200, s, 0.8); }
    else if (flash) this.csBolt(this.fx, 60 + ((s - s % 70) * 7) % 500, 0, 40 + ((s - s % 70) * 13) % 560, 200, s - s % 70, flash);
    this.rain(this.fx, t, 0x8ab8e8, 0.45);
    this.vignette(this.over, 0.55);
  }
  /** 2: low on him raising his hand - the clouds wheel into a vortex overhead and lightning gathers in his fist. */
  shot_cs_storm_raise(t, k, s) {
    const g = this.bg, vx = W / 2, vy = 60, e = ease(k * 1.4);
    this.csStormSky(g, t, 0);
    for (let arm = 0; arm < 5; arm++) for (let i = 0; i < 26; i++) {                      // the vortex, wheeling over him
      const r = 10 + i * 9 * e, q = arm * 1.2566 + i * 0.32 + t * 0.06;
      g.fillStyle(i % 2 ? 0x34405e : 0x5a6a88, 0.7 * (1 - i / 30)); g.fillEllipse(vx + Math.cos(q) * r * 1.6, vy + Math.sin(q) * r * 0.5, 24, 9);
    }
    this.glow(g, vx, vy, 40 + 30 * e, 0xbfe8ff, 0.6 * e);
    this.hideLosers();
    this.move('summon', Math.min(12, s / 6), W / 2, 380, 4.2);                          // low on him, the hand going up
    const hx = W / 2 + this.def.handOffset.x * 4.2, hy = 380 + this.def.handOffset.y * 4.2;
    for (let i = 0; i < 6; i++) { const q = s * 0.3 + i; this.fx.lineStyle(2, i % 2 ? 0xffe040 : 0x8ae8ff, 0.9); this.fx.lineBetween(hx, hy, hx + Math.cos(q) * 24 * e, hy + Math.sin(q) * 24 * e); }
    this.fx.lineStyle(0); this.glow(this.fx, hx, hy, 26 * e, 0xfff8c0, 0.8);
    if (s > 70 && s % 20 === 0) { this.csBolt(this.fx, vx, vy, hx, hy, s, 0.9); sfx('laser', 0.3, 0.6); }
    if (s === 1) sfx('rumble', 0.7, 0.6);
    this.rain(this.fx, t, 0x8ab8e8, 0.35); this.vignette(this.over, 0.6);
  }
  /** 3: the bolts come down on each of the beaten in turn - white, then falling, smoking. */
  shot_cs_storm_strike(t, k, s) {
    const xs = [440, 500, 560], flash = [0, 1, 2].some((i) => s >= 20 + i * 30 && s < 24 + i * 30) ? 1 : 0;
    this.csStormSky(this.bg, t, flash);
    this.csPeak(this.bg, 240, 200, flash);
    this.idle(250, 202, 2.2, t);
    this.posLosers(xs.map((x) => [x, 302, 1.6, 0, 1]), 0x0a0c14);
    this.losers.forEach((l, i) => {
      if (!l.def) return;
      const at = 20 + i * 30, d = s - at;
      if (d >= 0 && d < 5) this.csBolt(this.fx, xs[i] + 30, 0, xs[i], 270, at);
      if (d === 0) { sfx('thunder', 0.9, 1 - i * 0.08); sfx('bighit', 0.7, 0.8); this.flash = 4; this.cameras.main.shake(140, 0.012); }
      if (d >= 0) { const p = ease(d / 30); l.s.setTint(d < 8 ? 0xffffff : 0x1a1418).setRotation(p * 1.5 * (i % 2 ? -1 : 1)).setPosition(xs[i] + p * 16, 302 + p * 4); for (let j = 0; j < 3; j++) { this.fx.fillStyle(0x6a6a7a, Math.max(0, 0.5 - d / 120)); this.fx.fillCircle(xs[i] + Math.sin(d * 0.1 + j) * 6, 280 - d * 0.6 - j * 10, 6 + j * 2); } }   // struck, falling, smoking
    });
    this.rain(this.fx, t, 0x8ab8e8, 0.4); this.vignette(this.over, 0.55);
  }
  /** 4: close on his face, the crown of lightning crackling, letterboxed. */
  shot_cs_storm_crown(t, k, s) {
    this.csStormSky(this.bg, t, s % 40 < 3 ? 1 : 0);
    this.hideLosers();
    this.closeUp(W / 2, 190, 10, t);
    for (let i = 0; i < 7; i++) {                                                          // the crown, crackling
      if ((s + i * 4) % 14 > 6) continue;
      const x = W / 2 - 60 + i * 20, y = 70 + (i % 2) * 10;
      this.fx.lineStyle(2, i % 2 ? 0xffe040 : 0xffffff, 0.9); this.fx.lineBetween(x, y, x + ((s + i) % 7) - 3, y - 26); this.fx.lineStyle(0);
    }
    if (s % 40 === 0) { this.csBolt(this.fx, 60, 0, 120, H, s, 0.6); sfx('thunder', 0.35, 1.1); }
    this.over.fillStyle(0x000000, 1); this.over.fillRect(0, 0, W, 60); this.over.fillRect(0, 300, W, 60);
    this.vignette(this.over, 0.45);
  }
  /** 5: the clouds part and dawn breaks over the peak; the beaten lie smoking in the sunbeams. */
  shot_cs_storm_dawn(t, k, s) {
    const dawn = ease(s / 120);
    this.csStormSky(this.bg, t, 0, dawn);
    this.csPeak(this.bg, 240, 200, 1);
    this.idle(250, 202, 2.2, t);
    this.posLosers([[440, 306, 1.6, 1.5, 1], [510, 306, 1.6, -1.5, 1], [580, 306, 1.6, 1.5, 1]], 0x1a1418);
    for (let i = 0; i < 6; i++) { this.fx.fillStyle(0xfff0c0, 0.12 * dawn); this.fx.fillTriangle(W / 2 - 40 + i * 30, 0, W / 2 - 20 + i * 30, 0, 200 + i * 60, H); }   // sunbeams breaking through
    for (let i = 0; i < 3; i++) { this.fx.fillStyle(0x8a8a9a, 0.3 * (1 - dawn)); this.fx.fillCircle(450 + i * 65, 290 - (s * 0.4) % 60, 6); }
    this.vignette(this.over, 0.45);
  }

  // ================================================================ SUN PHARAOH
  /** The desert: a banded dusk sky, a huge low sun, pyramids, dunes. night = after sunset (0..1). */
  csDesert(g, t, ground, night = 0) {
    this.sky(g, night ? 0x05081a : 0x3a1a4a, night ? 0x1a2a5a : 0xff9a3a);
    if (!night) { this.glow(g, 470, ground - 40, 140, 0xffd060, 0.6); g.fillStyle(0xffe490, 1); g.fillCircle(470, ground - 30, 62); }
    else for (let i = 0; i < 40; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(t * 0.05 + i)); g.fillRect(sp[0] * W, sp[1] * ground * 0.7, 1, 1); }
    for (const [x, w, h] of [[120, 180, 120], [300, 120, 80], [560, 140, 96]]) {
      g.fillStyle(night ? 0x14182c : 0x8a4a3a, 1); g.fillTriangle(x - w / 2, ground, x + w / 2, ground, x, ground - h);
      g.fillStyle(night ? 0x0a0c18 : 0x5a2a2a, 1); g.fillTriangle(x, ground, x + w / 2, ground, x, ground - h);
    }
    g.fillStyle(night ? 0x2a2438 : 0xd8904a, 1); g.fillEllipse(W * 0.3, ground + 40, W, 110); g.fillStyle(night ? 0x1a1828 : 0xb8703a, 1); g.fillEllipse(W * 0.8, ground + 50, W * 0.9, 100);
    g.fillRect(0, ground + 40, W, H - ground);
  }
  /** THE ETERNAL, 1: across the dunes at sunset, the beaten trudging after him through the blowing sand. */
  shot_cs_pharaoh_dunes(t, k, s) {
    const ground = 270, x = 120 + k * 260;
    this.csDesert(this.bg, t, ground);
    this.strip('run', s / 8, x, ground + 30, 2.2);                                          // him, crossing the dunes...
    this.posLosers([[x - 90, ground + 34, 1.4, 0.1, 1], [x - 150, ground + 36, 1.4, 0.1, 1], [x - 210, ground + 34, 1.4, 0.1, 1]], 0x2a1410);   // ...them trudging after
    for (let i = 0; i < 24; i++) { const sp = this.spots[i]; this.fx.fillStyle(0xffe0a0, 0.5); this.fx.fillRect((sp[0] * W + s * (3 + sp[2] * 2)) % W, ground - 20 + sp[1] * 70, 2, 1); }   // blowing sand
    if (s === 1) sfx('whoosh', 0.4, 0.4);
    this.vignette(this.over, 0.5);
  }
  /** His temple: sandstone walls with painted friezes, two torches, a gold throne on a dais. */
  csTemple(g, t, floor) {
    g.fillStyle(0x3a2414, 1); g.fillRect(0, 0, W, H);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {                      // the friezes: little painted figures, eyes, suns
      const x = 20 + i * 52, y = 50 + row * 60;
      g.fillStyle(0x5a3a1a, 1); g.fillRect(x, y, 44, 48);
      g.fillStyle([0x1a44b8, 0xd8301a, 0xe0aa30][(i + row) % 3], 0.8);
      if ((i + row) % 3 === 0) { g.fillCircle(x + 22, y + 22, 9); } else if ((i + row) % 3 === 1) { g.fillEllipse(x + 22, y + 24, 22, 10); g.fillStyle(0x0a0a0a, 1); g.fillCircle(x + 22, y + 24, 4); } else { g.lineStyle(3, 0xe0aa30, 0.8); g.strokeEllipse(x + 22, y + 11, 10, 12); g.lineStyle(0); g.fillRect(x + 19, y + 16, 6, 24); g.fillRect(x + 11, y + 19, 22, 5); }   // an ankh
    }
    for (const x of [90, W - 90]) {                                                        // torches
      g.fillStyle(0x2a1a0a, 1); g.fillRect(x - 4, floor - 120, 8, 120);
      this.glow(g, x, floor - 132, 50, 0xff9a3a, 0.5);
      for (let i = 0; i < 3; i++) { g.fillStyle([0xff5a1a, 0xffa020, 0xffe070][i], 1); g.fillEllipse(x + Math.sin(t * 0.3 + i) * 2, floor - 130 - i * 4, 14 - i * 4, 20 - i * 5); }
    }
    g.fillStyle(0x6a4a24, 1); g.fillRect(200, floor - 30, 240, 30); g.fillStyle(0xe0aa30, 1); g.fillRect(200, floor - 30, 240, 4);   // the dais
    g.fillStyle(0xb07e1c, 1); g.fillRect(W / 2 - 40, floor - 150, 80, 120); g.fillStyle(0xe0aa30, 1); g.fillRect(W / 2 - 34, floor - 144, 68, 110);   // the throne
    g.fillStyle(0x1a44b8, 1); for (let i = 0; i < 6; i++) g.fillRect(W / 2 - 34, floor - 140 + i * 18, 68, 6);
    g.fillStyle(0x2a1a0a, 1); g.fillRect(0, floor, W, H - floor);
  }
  /** 2: his temple by torchlight - him on the dais, the beaten kneeling. */
  shot_cs_pharaoh_temple(t, k, s) {
    const floor = 300;
    this.csTemple(this.bg, t, floor);
    this.idle(W / 2, floor - 28, 2.6, t);
    this.posLosers([[150, floor + 6, 1.6, 0.15, 1, 1], [240, floor + 8, 1.6, 0.15, 1, 1], [420, floor + 8, 1.6, -0.15, 1, 1]], 0x1a0e06);   // kneeling
    if (s === 1) sfx('curse', 0.4, 0.7);
    this.vignette(this.over, 0.55);
  }
  /** 3: he raises the staff and its sun blazes until its light fills the screen. */
  shot_cs_pharaoh_sun(t, k, s) {
    const floor = 300, e = ease(s / 110);
    this.csTemple(this.bg, t, floor);
    this.move('neutralB', Math.min(14, s / 5), W / 2, floor + 6, 2.8);                    // the staff up
    const sx = W / 2 + 70 * 2.8 * 0.3, sy = floor - 170;
    this.glow(this.fx, sx, sy, 30 + 400 * e * e, 0xffe490, 0.4 + 0.6 * e);
    for (let i = 0; i < 18; i++) { const q = t * 0.02 + i / 18 * Math.PI * 2; this.fx.fillStyle(0xfff0b0, 0.25 * e); this.fx.fillTriangle(sx + Math.cos(q - 0.05) * 40, sy + Math.sin(q - 0.05) * 40, sx + Math.cos(q + 0.05) * 40, sy + Math.sin(q + 0.05) * 40, sx + Math.cos(q) * 500, sy + Math.sin(q) * 500); }
    this.posLosers([[150, floor + 6, 1.6, 0.15, 1, 1], [240, floor + 8, 1.6, 0.15, 1, 1], [420, floor + 8, 1.6, -0.15, 1, 1]], 0x1a0e06);
    if (s === 1) sfx('summon', 0.8, 0.5);
    if (s === 100) { sfx('ding', 0.9, 0.5); this.flash = 6; }
    if (s > 110) { this.over.fillStyle(0xfff8e0, Math.min(1, (s - 110) / 20)); this.over.fillRect(0, 0, W, H); }
  }
  /** 4: the beaten wrapped as mummies before gold coffins - the lids swing shut over them. */
  shot_cs_pharaoh_wrap(t, k, s) {
    const floor = 300, xs = [180, 320, 460], shut = ease((s - 70) / 50);
    this.csTemple(this.bg, t, floor);
    this.idle(W / 2 + 230, floor + 2, 2, t);
    for (const x of xs) {                                                                  // the gold coffins behind them
      this.bg.fillStyle(0x6a440c, 1); this.bg.fillRoundedRect(x - 40, floor - 170, 80, 170, 30);
      this.bg.fillStyle(0xe0aa30, 1); this.bg.fillRoundedRect(x - 34, floor - 164, 68, 160, 26);
      this.bg.fillStyle(0x1a44b8, 1); for (let i = 0; i < 5; i++) this.bg.fillRect(x - 30, floor - 120 + i * 20, 60, 6);
    }
    this.posLosers(xs.map((x) => [x, floor - 4, 1.8, 0, 1]), 0xd8c8a0);                  // wrapped...
    this.losers.forEach((l, i) => {
      if (!l.def) return;
      for (let b = 0; b < 9; b++) { const y = floor - 110 + b * 12 + ((b * 7) % 5); this.fx.lineStyle(2, 0x9a8a6a, 0.8); this.fx.lineBetween(xs[i] - 22, y, xs[i] + 22, y + (b % 2 ? 6 : -6)); }   // bandages
      this.fx.lineStyle(0);
      if (shut > 0) {                                                                      // ...and the lid swings shut over them
        const w = 84 * shut;
        this.front.fillStyle(0x8a5a10, 1); this.front.fillRoundedRect(xs[i] - 42, floor - 172, w, 172, 30);
        if (shut > 0.6) { this.front.fillStyle(0xffd860, 1); this.front.fillCircle(xs[i], floor - 130, 14); this.front.fillStyle(0x0a0a0a, 1); this.front.fillEllipse(xs[i] - 5, floor - 132, 5, 3); this.front.fillEllipse(xs[i] + 5, floor - 132, 5, 3); }
      }
    });
    if (s === 70) sfx('clang', 0.7, 0.5);
    if (s === 120) { sfx('bighit', 0.8, 0.5); this.cameras.main.shake(120, 0.008); }
    this.vignette(this.over, 0.55);
  }
  /** 5: night - the great pyramid, its light going out as the door slab slides down. */
  shot_cs_pharaoh_tomb(t, k, s) {
    const ground = 270, door = ease(s / 60);
    this.csDesert(this.bg, t, ground, 1);
    const g = this.bg, px = W / 2;
    g.fillStyle(0x1a1830, 1); g.fillTriangle(px - 200, ground + 20, px + 200, ground + 20, px, ground - 190);   // the great pyramid
    g.fillStyle(0x0e0c1c, 1); g.fillTriangle(px, ground + 20, px + 200, ground + 20, px, ground - 190);
    g.fillStyle(0xffd860, 0.5 * (1 - door)); g.fillRect(px - 20, ground - 40, 40, 60);   // the light inside, going out
    g.fillStyle(0x2a2438, 1); g.fillRect(px - 22, ground - 40 - 60 * (1 - door), 44, 60);   // the slab sliding down
    if (s === 58) { sfx('bighit', 0.8, 0.4); this.cameras.main.shake(140, 0.006); }
    this.idle(px - 140, ground + 30, 2, t);
    this.hideLosers();
    this.vignette(this.over, 0.5);
  }

  // ================================================================ SPACEWALK
  /** A field of stars (drifting by dx), with a few bright ones. */
  csStars(g, t, dx = 0) {
    g.fillStyle(0x03030c, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) { const sp = this.spots[i % 40], x = ((sp[0] * W + i * 53 + dx * (0.3 + sp[2])) % W + W) % W, y = (sp[1] * H + i * 29) % H; g.fillStyle(i % 9 ? 0xffffff : 0xc8a8ff, 0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + i))); g.fillRect(x, y, i % 13 ? 1 : 2, i % 13 ? 1 : 2); }
    g.fillStyle(0x5a2a8a, 0.15); g.fillEllipse(W * 0.3, H * 0.3, 380, 120); g.fillStyle(0x2a4aba, 0.12); g.fillEllipse(W * 0.7, H * 0.6, 320, 100);
  }
  /** The blue world (an original planet: oceans, two continents, cloud bands), centre (x, y), radius r. */
  csWorld(g, x, y, r) {
    g.fillStyle(0x6ac8ff, 0.2); g.fillCircle(x, y, r + 12);
    g.fillStyle(0x1a4aa8, 1); g.fillCircle(x, y, r);
    g.fillStyle(0x3aa860, 1); g.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.6, r * 0.4); g.fillEllipse(x + r * 0.35, y + r * 0.25, r * 0.5, r * 0.3);
    g.fillStyle(0xffffff, 0.5); for (let i = 0; i < 4; i++) g.fillEllipse(x - r * 0.2 + i * r * 0.15, y - r * 0.5 + i * r * 0.3, r * 0.9, r * 0.06);
    g.fillStyle(0x000000, 0.35); g.fillCircle(x + r * 0.25, y + r * 0.2, r * 0.9);
  }
  /** ONE SMALL SPLASH, 1: the launch pad at night - 3, 2, 1, LIFT-OFF! - and the rocket climbs away. */
  shot_cs_star_launch(t, k, s) {
    const g = this.bg, LIFT = 120, up = Math.max(0, s - LIFT), climb = up * up * 0.05;
    this.sky(g, 0x02040e, 0x142040);
    for (let i = 0; i < 30; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.6); g.fillRect(sp[0] * W, sp[1] * 200 + climb * 0.2, 1, 1); }
    const gy = 320 + climb;                                                                // the ground falls away as we climb
    g.fillStyle(0x0a0c14, 1); g.fillRect(0, gy, W, H); g.fillStyle(0x3a3a4a, 1); g.fillRect(W / 2 - 80, gy - 10, 160, 10);
    g.fillStyle(0x5a5a6a, 1); g.fillRect(W / 2 + 50, gy - 220, 14, 210);                   // the launch tower
    for (let i = 0; i < 10; i++) { g.lineStyle(1, 0x7a7a8a, 1); g.lineBetween(W / 2 + 50, gy - 20 - i * 20, W / 2 + 64, gy - 40 - i * 20); } g.lineStyle(0);
    const rx = W / 2, ry = gy - 20 - (s > LIFT ? climb : 0) + (s > LIFT - 30 && s < LIFT ? Math.sin(s) * 1.5 : 0);
    g.fillStyle(0xe8eef8, 1); g.fillRect(rx - 18, ry - 150, 36, 150); g.fillStyle(0xd8301a, 1); g.fillTriangle(rx - 18, ry - 150, rx + 18, ry - 150, rx, ry - 196);   // the rocket
    g.fillStyle(0x1a1a2a, 1); g.fillCircle(rx, ry - 110, 9); g.fillStyle(0x3a6aff, 1); g.fillCircle(rx, ry - 110, 6); g.fillStyle(0xff8a40, 1); g.fillCircle(rx - 1, ry - 110, 3);   // a porthole, the fish inside
    g.fillStyle(0xd8301a, 1); g.fillTriangle(rx - 18, ry - 30, rx - 34, ry, rx - 18, ry); g.fillTriangle(rx + 18, ry - 30, rx + 34, ry, rx + 18, ry);
    if (s > LIFT - 20) for (let i = 0; i < 6; i++) { this.fx.fillStyle([0xffffff, 0xffe040, 0xff7a20][i % 3], 0.8); this.fx.fillEllipse(rx + Math.sin(s + i) * 4, ry + 14 + i * 12, 28 - i * 3, 34 - i * 2); }   // the flame
    if (s > LIFT - 30) for (let i = 0; i < 14; i++) { const sp = this.spots[i]; this.fx.fillStyle(0xc8c8d4, 0.6); this.fx.fillCircle(rx + (sp[0] - 0.5) * (80 + (s - LIFT + 30) * 3), gy - 4 - sp[1] * 30, 14 + sp[2] * 14); }   // smoke billowing
    const n = 3 - Math.floor(s / 40);
    if (s < LIFT) { this.label(0, n > 0 ? String(n) : 'LIFT-OFF!', W / 2, 80, 30, '#ffffff').setOrigin(0.5); if (s % 40 === 0) sfx('ding', 0.6, n > 0 ? 1 : 1.6); }
    if (s === LIFT) { sfx('rumble', 1, 0.6); sfx('bighit', 0.8, 0.5); }
    if (s > LIFT) this.cameras.main.shake(30, 0.002);
    this.hero.setVisible(false); this.hideLosers();
    this.vignette(this.over, 0.5);
  }
  /** 2: drifting in orbit over the blue world, jetpack puffing, the beaten tumbling away into the dark. */
  shot_cs_star_orbit(t, k, s) {
    this.csStars(this.bg, t, -s * 0.4);
    this.csWorld(this.bg, W / 2, H + 260, 420);
    const ax = W / 2 - 40 + Math.sin(s * 0.02) * 20, ay = 220 + Math.sin(s * 0.03) * 12;
    this.glow(this.bg, ax + 6, ay - 120, 48, 0x8aa8ff, 0.45);                                // starlight on his glass, so the dark dome reads against space
    this.strip('fall', s / 6, ax, ay, 2.6);
    this.hero.setRotation(Math.sin(s * 0.02) * 0.25);
    const xs = [430, 500, 560];
    this.posLosers(xs.map((x, i) => [x + s * (0.4 + i * 0.15), 150 + i * 40 - s * 0.2, 1.2 - k * 0.6, s * 0.03 * (i % 2 ? -1 : 1), 1]), 0x0a0a18);   // the beaten, tumbling away
    for (let i = 0; i < 4; i++) { const p = (s * 2 + i * 15) % 60; this.fx.fillStyle(0xc8c8d8, 0.4 * (1 - p / 60)); this.fx.fillCircle(W / 2 - 64 - p * 0.6, 210 + p * 0.3, 4 + p * 0.1); }   // jetpack puffs
    if (s === 1) sfx('whoosh', 0.4, 0.4);
    this.vignette(this.over, 0.5);
  }
  /** The moon's surface: grey dust with craters, the blue world up in the black sky. */
  csMoon(g, t, ground) {
    this.csStars(g, t, 0);
    this.csWorld(g, 500, 80, 46);
    g.fillStyle(0x8a8a96, 1); g.fillEllipse(W / 2, ground + 200, W * 1.6, 420);
    g.fillStyle(0x6a6a78, 1); for (const [x, y, r] of [[90, ground + 30, 30], [260, ground + 50, 18], [480, ground + 26, 40], [600, ground + 60, 22]]) { g.fillEllipse(x, y, r * 2, r * 0.6); g.fillStyle(0x9a9aa8, 1); g.fillEllipse(x, y - 3, r * 1.8, r * 0.3); g.fillStyle(0x6a6a78, 1); }
  }
  /** 3: the moon - he floats down, lands in slow dust and plants a goldfish flag. */
  shot_cs_star_moon(t, k, s) {
    const ground = 280, LAND = 50, PLANT = 100;
    this.csMoon(this.bg, t, ground);
    const y = s < LAND ? ground + 10 - 200 * (1 - s / LAND) * (1 - s / LAND) : ground + 10;
    if (s < LAND) this.strip('fall', s / 6, W / 2 - 60, y, 2.4); else this.idle(W / 2 - 60, y, 2.4, t);
    if (s === LAND) { sfx('land', 0.8, 0.6); }
    if (s >= LAND && s < LAND + 30) for (let i = 0; i < 8; i++) { const d = s - LAND; this.fx.fillStyle(0xb8b8c4, 0.6 * (1 - d / 30)); this.fx.fillCircle(W / 2 - 60 + (i - 3.5) * (8 + d), ground + 6 - d * 0.5 * (i % 2), 5 + d * 0.2); }   // dust, slow and floaty
    if (s >= PLANT) {                                                                       // the flag: a goldfish on a blue field
      const fx = W / 2 + 10, rise = ease((s - PLANT) / 20), top = ground - 110 * rise, wave = Math.sin(s * 0.1) * 2;
      this.fx.fillStyle(0xd8d8e0, 1); this.fx.fillRect(fx - 2, top, 4, ground + 10 - top);
      this.fx.fillStyle(0x2a4aba, 1); this.fx.fillRect(fx + 2, top, 64, 40 + wave); this.fx.fillStyle(0xff8a40, 1); this.fx.fillEllipse(fx + 32, top + 20, 26, 14); this.fx.fillTriangle(fx + 44, top + 20, fx + 54, top + 12, fx + 54, top + 28);
      this.fx.fillStyle(0x0a0a0a, 1); this.fx.fillCircle(fx + 24, top + 18, 2);
      if (s === PLANT) { sfx('clang', 0.6, 1.2); this.cameras.main.shake(60, 0.004); }
    }
    this.hideLosers();
    this.vignette(this.over, 0.5);
  }
  /** 4: close on his dome, the world reflected in the glass. */
  shot_cs_star_dome(t, k, s) {
    this.csStars(this.bg, t, 0);
    this.hideLosers();
    this.closeUp(W / 2, 170, 9, t);
    this.fx.lineStyle(4, 0x6ac8ff, 0.35); this.fx.beginPath(); this.fx.arc(W / 2 - 20, 150, 70, -2.6, -1.4, false); this.fx.strokePath();   // the world, reflected in the glass
    this.fx.lineStyle(2, 0x3aa860, 0.4); this.fx.beginPath(); this.fx.arc(W / 2 - 20, 150, 64, -2.4, -1.8, false); this.fx.strokePath(); this.fx.lineStyle(0);
    this.fx.fillStyle(0xffffff, 0.35); this.fx.fillEllipse(W / 2 + 50, 110, 30, 14);       // a glint
    if (s % 30 === 0) sfx('glass', 0.25, 1.6);
    this.over.fillStyle(0x000000, 1); this.over.fillRect(0, 0, W, 50); this.over.fillRect(0, 310, W, 50);
    this.vignette(this.over, 0.45);
  }
  /** 5: he waves from beside the flag while the beaten drift off among the stars. */
  shot_cs_star_wave(t, k, s) {
    const ground = 280;
    this.csMoon(this.bg, t, ground);
    const fx = W / 2 + 10, top = ground - 110;
    this.fx.fillStyle(0xd8d8e0, 1); this.fx.fillRect(fx - 2, top, 4, 120); this.fx.fillStyle(0x2a4aba, 1); this.fx.fillRect(fx + 2, top, 64, 40); this.fx.fillStyle(0xff8a40, 1); this.fx.fillEllipse(fx + 32, top + 20, 26, 14); this.fx.fillTriangle(fx + 44, top + 20, fx + 54, top + 12, fx + 54, top + 28);
    this.move('taunt', s / 2, W / 2 - 60, ground + 10, 2.4);                              // he waves
    this.posLosers([[120 - s * 0.3, 70 + s * 0.05, 0.6, s * 0.04, 1], [200 - s * 0.2, 40, 0.5, -s * 0.05, 1], [600 + s * 0.2, 150 - s * 0.1, 0.5, s * 0.03, 1]], 0x0a0a18);   // the beaten, drifting off among the stars
    this.vignette(this.over, 0.5);
  }
}
