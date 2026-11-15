// THE DEVOTED's three lore costumes' win cutscenes (mixed into WinScene like devotedOutros.js; LORE_CUTS is spread
// into SKIN_CUTS). Each is a 15 s short scored to its own music (tools/audio/devoted_outros.py), shot like a film:
// letterbox, grain, a slow camera (`dvCam` moves the real camera: push-ins, pans, pull-backs) and light that moves.
//   HEARTWOOD        THE GROVE - a dead forest at dawn in drifting fog and god-rays, she walks between the trees; she
//                    kneels and drives her thorn into the earth and veins of glowing sap race out across the ground;
//                    the beaten kneel in a ring as roots climb them and they sprout into saplings; a vast tree blooms
//                    gold behind her and its leaves fall over the little new trees - THINGS KNEEL TO ME.
//   FORGEBOUND       TEMPERED (the rude one) - her forge in the dark, every hammer blow a burst of sparks; one of the
//                    beaten laid across the anvil and hammered flat (HOLD STILL.); another dunked head first in the
//                    quench barrel (TSSSSS); she casts a little crying statue of them, sets it on her REJECTS shelf and
//                    flicks it off to smash; she sits on the pile of them like a bench, sharpening her blade, and gives
//                    them a thumbs down - NOT EVEN WORTH THE IRON.
//   THE LAST KEEPER  THE LAST LIGHT - a storm at sea, the lighthouse beam sweeping the black waves; up in the lamp room
//                    she lifts her lantern and the great lens blazes; the beaten cling to a wrecked boat on the black
//                    tide, the beam finds them... and swings away; dawn on a calm sea, the tower in ruins, her lantern
//                    still lit on the rocks - SOMEONE HAD TO KEEP THE LIGHT.
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';

const W = VIEW_W, H = VIEW_H;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
/** A colour part way (k = 0..1) between colours a and b: used to fade skies and light between shots. */
const mixC = (a, b, k) => {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k, bl = (a & 255) + ((b & 255) - (a & 255)) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};

export const LORE_CUTS = {
  'devoted:HEARTWOOD': { fn: 'dv_heart', len: 900, card: 770, name: 'THE DEVOTED', sub: 'HEARTWOOD', line: 'THINGS KNEEL TO ME.', music: 'bgm_outro_heartwood',
    color: '#ffc040', stroke: '#1a1008', film: true, shots: [[0, 'mist'], [210, 'root'], [390, 'kneel'], [600, 'bloom']] },
  'devoted:FORGEBOUND': { fn: 'dv_forge', len: 900, card: 790, name: 'THE DEVOTED', sub: 'FORGEBOUND', line: 'NOT EVEN WORTH THE IRON.', music: 'bgm_outro_forge',
    color: '#ffa030', stroke: '#1a0806', film: true, shots: [[0, 'forge'], [200, 'anvil'], [360, 'quench'], [480, 'shelf'], [660, 'bench']] },
  'devoted:THE LAST KEEPER': { fn: 'dv_keep', len: 900, card: 780, name: 'THE DEVOTED', sub: 'THE LAST KEEPER', line: 'SOMEONE HAD TO KEEP THE LIGHT.', music: 'bgm_outro_keeper',
    color: '#ffe890', stroke: '#06141a', film: true, shots: [[0, 'storm'], [200, 'lamp'], [380, 'tide'], [600, 'dawn']] },
};

/** The lore outros' shots (WinScene methods: shot_<fn>_<name>(t, k, s)), plus the film tools they share. */
export class LoreShots {
  // ------------------------------------------------------------- the film tools
  /** Points the real camera: zoom, and the world point at the middle of the screen (1, W/2, H/2 = as normal). */
  dvCam(zoom = 1, cx = W / 2, cy = H / 2) {
    zoom = Math.max(1, zoom);                                     // (never zoom out past the painted screen)
    const hw = W / 2 / zoom, hh = H / 2 / zoom;
    cx = Math.min(W - hw, Math.max(hw, cx)); cy = Math.min(H - hh, Math.max(hh, cy));   // (keep the view inside it: no bare edges)
    this.cameras.main.setZoom(zoom).centerOn(cx, cy); this.camNow = { zoom, cx, cy };
  }
  /** Letterbox bars, grain and a soft vignette, drawn where the camera is looking (so they stay on the screen). */
  dvFilm(t, bars = 34, grain = 40) {
    const c = this.camNow || { zoom: 1, cx: W / 2, cy: H / 2 }, vw = W / c.zoom, vh = H / c.zoom, x0 = c.cx - vw / 2, y0 = c.cy - vh / 2, o = this.over;
    for (let i = 0; i < 5; i++) { const m = (i * 10 + 8) / c.zoom; o.fillStyle(0x000000, 0.07); o.fillRect(x0, y0, vw, m); o.fillRect(x0, y0 + vh - m, vw, m); o.fillRect(x0, y0, m, vh); o.fillRect(x0 + vw - m, y0, m, vh); }
    for (let i = 0; i < grain; i++) { const sp = this.spots[(i + t) % 40], q = this.spots[(i * 7 + t * 3) % 40]; o.fillStyle(i % 2 ? 0xffffff : 0x000000, 0.06); o.fillRect(x0 + ((sp[0] + q[1] + t * 0.37) % 1) * vw, y0 + ((sp[1] + q[0] + t * 0.53) % 1) * vh, 1 / c.zoom + 0.5, 1 / c.zoom + 0.5); }
    o.fillStyle(0x000000, 1); o.fillRect(x0 - 2, y0 - 2, vw + 4, bars / c.zoom + 2); o.fillRect(x0 - 2, y0 + vh - bars / c.zoom, vw + 4, bars / c.zoom + 2);
  }
  /** Rays of light falling at an angle from the top (god-rays): n of them, col, alpha a, drifting with t. */
  dvGodRays(g, t, n, col, a, x0 = 0, ang = 0.35) {
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i + 3], x = x0 + sp[0] * W * 1.2 - 60 + Math.sin(t * 0.01 + i) * 10, w = 12 + sp[1] * 30, aa = a * (0.5 + 0.5 * Math.sin(t * 0.02 + i * 2));
      g.fillStyle(col, aa); g.fillPoints([{ x, y: 0 }, { x: x + w, y: 0 }, { x: x + w + H * ang, y: H }, { x: x + H * ang, y: H }], true);
    }
  }
  /** Bands of fog drifting across at a height, alpha a. */
  dvFog(g, t, y, a, col = 0xd8d0c0) {
    for (let i = 0; i < 6; i++) { const sp = this.spots[i + 10], x = ((sp[0] * W + t * (0.2 + sp[2] * 0.4)) % (W + 300)) - 150; g.fillStyle(col, a * (0.5 + sp[1] * 0.5)); g.fillEllipse(x, y + (sp[1] - 0.5) * 30, 260 + sp[2] * 200, 26 + sp[0] * 20); }
  }
  /** A bare dead tree silhouette: trunk at x, ground y, height h, colour c. */
  dvDeadTree(g, x, y, h, c, seed = 0) {
    const br = (x0, y0, a, l, w, d) => {
      const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
      g.lineStyle(Math.max(1, w), c, 1); g.lineBetween(x0, y0, x1, y1);
      if (d > 0) { const sp = this.spots[(seed + d * 7) % 40]; br(x1, y1, a - 0.35 - sp[0] * 0.3, l * 0.68, w * 0.62, d - 1); br(x1, y1, a + 0.3 + sp[1] * 0.3, l * 0.62, w * 0.62, d - 1); }
    };
    g.fillStyle(c, 1); g.fillTriangle(x - h * 0.05, y, x + h * 0.05, y, x, y - h * 0.5);
    br(x, y - h * 0.3, -Math.PI / 2 + (this.spots[seed % 40][0] - 0.5) * 0.3, h * 0.42, h * 0.05, 4);
  }

  // ================================================================= HEARTWOOD - THE GROVE
  /** The dead forest at dawn: a pale sky, three layers of trees, fog. glow = 0-1 the gold the grove ends in. */
  dvForest(t, glow = 0) {
    const g = this.bg;
    this.sky(g, mixC(0x3a3a4a, 0xffb050, glow), mixC(0xc8b8a0, 0xffe0a0, glow), 12);
    for (let i = 0; i < 9; i++) this.dvDeadTree(g, i * 80 + 20, 270, 150 + (i % 3) * 20, mixC(0x8a8478, 0xd8a868, glow), i);
    this.dvFog(g, t, 230, 0.25);
    for (let i = 0; i < 6; i++) this.dvDeadTree(this.mid, i * 130 - 10, 300, 230 + (i % 2) * 30, mixC(0x4a4238, 0x6a4a28, glow), i + 20);
    g.fillStyle(mixC(0x3a3428, 0x4a3418, glow), 1); g.fillRect(0, 290, W, H - 290);
    this.dvGodRays(this.mid, t, 7, mixC(0xfff0d0, 0xffd080, glow), 0.08 + glow * 0.06);
    this.dvFog(this.front, t * 1.3, 320, 0.18);
  }
  /** [0] Mist: the dead forest at dawn; she walks out of the fog between the trees. The camera pushes in. */
  shot_dv_heart_mist(t, k, s) {
    this.hideLosers();
    this.dvCam(1 + ease(k) * 0.12, W / 2, H / 2 + 10);
    this.dvForest(t, 0);
    const x = 470 - ease(k) * 170;
    this.dvPose('', 'run', s / 7, x, 300, 1.6, true).setTint(0xb8b0a0);
    this.glow(this.fx, x - 4, 248, 6, 0xffc040, 0.5);                                   // (her sap eyes, through the fog)
    for (let i = 0; i < 6; i++) { const sp = this.spots[i + 30], bx = (sp[0] * W + t * 0.6) % W, by = 70 + sp[1] * 40 + Math.sin(t * 0.1 + i) * 3; this.mid.fillStyle(0x2a2620, 1); this.mid.fillTriangle(bx - 4, by, bx + 4, by, bx, by + 2 + (t + i * 5) % 8 / 4); }   // crows, far off
    this.dvFilm(t);
  }
  /** Veins of glowing sap racing out over the ground from x, grown to k (0-1). */
  dvVeins(g, x, y, k, t, col = 0xffc040) {
    for (let i = 0; i < 9; i++) {
      let px = x, py = y, a = Math.PI + (i / 8) * Math.PI * (i % 2 ? 1 : -1) * 0.5 + (i < 5 ? 0 : Math.PI);
      const L = Math.floor(30 * k);
      for (let j = 0; j < L; j++) {
        const sp = this.spots[(i * 5 + j) % 40]; a += (sp[0] - 0.5) * 0.6;
        const nx = px + Math.cos(a) * 9, ny = py + Math.sin(a) * 2.2;
        g.lineStyle(3 - j / 14, col, 0.9 - j / 40 + 0.1 * Math.sin(t * 0.2 + j)); g.lineBetween(px, py, nx, ny); px = nx; py = ny;
        if (j % 7 === 3) { g.lineStyle(1, col, 0.6); g.lineBetween(px, py, px + Math.cos(a + 1) * 12, py + Math.sin(a + 1) * 3); }
      }
    }
  }
  /** [210] Root: she kneels and drives her thorn into the earth; veins of sap race out across the ground. */
  shot_dv_heart_root(t, k, s) {
    this.hideLosers();
    this.dvCam(1.35 - ease(k) * 0.2, W / 2, 250);
    this.dvForest(t, 0.1);
    const A = this.def.moveAnims.downB, stab = this.def.devoted.stabAt;
    this.dvMove('', 'downB', Math.min(A[1] - 1, s / 2.2), 300, 300, 1.8);
    const hit = Math.round(stab * 2.2);
    if (s === hit) { sfx('bighit', 0.7, 0.5); sfx('rumble', 0.6, 0.6); this.cameras.main.shake(260, 0.008); this.flash = 3; }
    if (s >= hit) { this.dvVeins(this.fx, 325, 302, ease((s - hit) / 90), t); this.glow(this.fx, 325, 300, 30 + Math.sin(t * 0.3) * 4, 0xffc040, 0.35); }
    this.dvFilm(t);
  }
  /** [390] Kneel: the beaten in a ring, kneeling; roots climb them and they sprout into saplings. The camera pans across. */
  shot_dv_heart_kneel(t, k, s) {
    this.dvCam(1.15, 230 + ease(k) * 180, H / 2 + 20);
    this.dvForest(t, 0.25);
    this.posLosers([[180, 312, 1.8, 0, 1, 1], [330, 312, 1.8, 0, 1, 1], [470, 312, 1.8, 0, 1, 1]], 0x2a1e14);
    const grow = ease((s - 30) / 150);
    this.losers.forEach((l, i) => {                                                     // roots coil up them; a sapling grows out of the top
      if (!l.s.visible) return;
      const b = l.s.getBounds();
      for (let j = 0; j < 3; j++) {
        const x0 = b.centerX + (j - 1) * 10, top = b.bottom - (b.height + 20) * grow;
        this.fx.lineStyle(3 - j * 0.6, 0x3a2414, 1);
        for (let y = b.bottom; y > top; y -= 4) this.fx.lineBetween(x0 + Math.sin(y * 0.15 + j) * 8, y, x0 + Math.sin((y - 4) * 0.15 + j) * 8, y - 4);
      }
      if (grow > 0.6) {
        const q = (grow - 0.6) / 0.4, hx = b.centerX, hy = b.top;
        this.fx.lineStyle(2, 0x4a3220, 1); this.fx.lineBetween(hx, hy, hx - 8 * q, hy - 22 * q); this.fx.lineBetween(hx, hy, hx + 9 * q, hy - 18 * q);
        for (const [dx, dy] of [[-8, -22], [9, -18], [-3, -14]]) { this.fx.fillStyle(i % 2 ? 0xd8a050 : 0x8ac04a, 1); this.fx.fillEllipse(hx + dx * q, hy + dy * q, 6 * q, 4 * q); }
      }
    });
    this.dvVeins(this.mid, 330, 316, 1, t, 0xffb030);
    this.dvPose('', 'idle', s / 6, 330 + 20, 300, 1.6, false).setAlpha(0.0);            // (she's off to one side - not in this shot)
    this.hero.setVisible(false);
    this.dvFilm(t);
  }
  /** [600] Bloom: a vast tree blooms gold behind her; she stands at its roots, the little new trees in front, leaves
   * falling through the light. The camera pulls back to show it all. */
  shot_dv_heart_bloom(t, k, s) {
    const card = t >= this.cut.card;
    if (card) this.dvCam(1, W / 2, H / 2); else this.dvCam(1.3 - ease(k * 1.4) * 0.3, W / 2, H / 2 - 10 + (1 - ease(k)) * 30);
    this.dvForest(t, ease(s / 80));
    const g = this.mid, bloom = ease(s / 90);
    this.glow(g, W / 2, 120, 220, 0xffd080, 0.25 * bloom);
    g.fillStyle(0x2a1a0c, 1); g.fillPoints([{ x: W / 2 - 34, y: 300 }, { x: W / 2 - 16, y: 120 }, { x: W / 2 + 16, y: 120 }, { x: W / 2 + 34, y: 300 }], true);   // the great trunk
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; g.lineStyle(10 - Math.abs(i - 3) * 2, 0x2a1a0c, 1); g.lineBetween(W / 2, 140, W / 2 + Math.cos(a) * 170, 140 + Math.sin(a) * 110); }
    for (let i = 0; i < 90; i++) {                                                       // the crown of gold leaves, blooming outward
      const sp = this.spots[i % 40], q = this.spots[(i * 3) % 40], a = sp[0] * Math.PI * 2, r = (40 + q[1] * 150) * bloom;
      this.fx.fillStyle([0xffc040, 0xd8a050, 0xffe890, 0xa86a2a][i % 4], 0.9); this.fx.fillEllipse(W / 2 + Math.cos(a) * r * 1.3, 90 + Math.sin(a) * r * 0.55, 10, 7);
    }
    this.dvPose('', 'idle', s / 6, W / 2, 304, 2.0, false);
    this.posLosers([[110, 334, 1.3, -0.1, 1, 1], [530, 334, 1.3, 0.1, 1, 1], [40, 340, 1.2, 0, 1, 1]], 0x1a1008);
    this.losers.forEach((l, i) => { if (!l.s.visible) return; const b = l.s.getBounds(); this.fx.fillStyle(i % 2 ? 0xd8a050 : 0x8ac04a, 1); this.fx.fillEllipse(b.centerX - 6, b.top - 10, 8, 5); this.fx.fillEllipse(b.centerX + 7, b.top - 14, 8, 5); this.fx.lineStyle(2, 0x3a2414, 1); this.fx.lineBetween(b.centerX, b.top, b.centerX, b.top - 14); });
    for (let i = 0; i < 40; i++) { const sp = this.spots[i]; const x = (sp[0] * W + Math.sin(t * 0.03 + i) * 30) % W, y = (sp[1] * H + t * (0.6 + sp[2])) % H; this.front.fillStyle(i % 2 ? 0xffc040 : 0xd8a050, 0.85); this.front.fillEllipse(x, y, 5, 3); }   // leaves falling
    if (s === 0) sfx('limitready', 0.6, 0.6);
    this.dvFilm(t);
  }

  // ================================================================= FORGEBOUND - TEMPERED
  /** Her smithy: soot-dark stone, tools on the wall, the forge's mouth glowing, the anvil, the quench barrel. heat = 0-1 how bright the forge is. */
  dvSmithy(t, heat = 1) {
    const g = this.bg, m = this.mid, flick = 0.85 + 0.15 * Math.sin(t * 0.5) * Math.sin(t * 0.13);
    g.fillStyle(0x140c0a, 1); g.fillRect(0, 0, W, H);
    for (let y = 0; y < 290; y += 18) for (let x = (y / 18) % 2 ? 0 : 20; x < W; x += 40) { g.fillStyle(0x1e1410, 1); g.fillRect(x, y, 38, 16); }   // stone blocks
    g.fillStyle(0x0c0806, 1); g.fillRect(0, 290, W, H - 290);
    this.glow(m, 520, 210, 180 * heat, 0xff6a10, 0.22 * heat * flick);                 // the forge's light on everything
    m.fillStyle(0x2a1e18, 1); m.fillRect(460, 150, 120, 140); m.fillStyle(0x0a0606, 1); m.fillRect(480, 200, 80, 60);   // the forge
    m.fillStyle(mixC(0x8a1a04, 0xffc040, heat * flick), 1); m.fillRect(486, 226, 68, 30); m.fillStyle(0xffe890, heat * flick); m.fillRect(498, 236, 44, 12);   // the coals
    m.fillStyle(0x2a1e18, 1); m.fillTriangle(470, 150, 570, 150, 520, 70); m.fillRect(505, 0, 30, 80);   // its hood and chimney
    for (const [x, l] of [[60, 50], [90, 70], [120, 44], [150, 60]]) { m.lineStyle(3, 0x3a2a20, 1); m.lineBetween(x, 60, x, 60 + l); m.fillStyle(0x4a4a52, 1); m.fillRect(x - 6, 60 + l, 12, 6); }   // tools on the wall
    m.fillStyle(0x3a2a20, 1); m.fillRect(40, 56, 140, 4);
    m.fillStyle(0x3a3a42, 1); m.fillRect(250, 262, 110, 18); m.fillTriangle(250, 262, 222, 266, 250, 274); m.fillRect(280, 280, 50, 40); m.fillRect(266, 318, 78, 8);   // the anvil
    m.fillStyle(0x6a6a78, 1); m.fillRect(252, 262, 106, 3);
    m.fillStyle(0x4a2c16, 1); m.fillRect(400, 268, 50, 56); m.fillStyle(0x2a1a0c, 1); m.fillRect(400, 278, 50, 4); m.fillRect(400, 306, 50, 4); m.fillStyle(0x0e2228, 1); m.fillEllipse(425, 270, 50, 8);   // the quench barrel
  }
  /** A burst of sparks off the anvil at x, y, d frames after the blow. */
  dvSparks(x, y, d, n = 24) {
    for (let i = 0; i < n; i++) { const sp = this.spots[i % 40], a = -Math.PI * (0.1 + sp[0] * 0.8), v = 2 + sp[1] * 5; const px = x + Math.cos(a) * v * d, py = y + Math.sin(a) * v * d + d * d * 0.12; this.front.fillStyle(i % 3 ? 0xffc040 : 0xfff0b8, Math.max(0, 1 - d / 26)); this.front.fillRect(px, py, 2, 2); }
  }
  /** [0] The forge: she hammers at the anvil, each blow a flash and a shower of sparks. The camera pushes in. */
  shot_dv_forge_forge(t, k, s) {
    this.hideLosers();
    this.dvCam(1 + ease(k) * 0.18, 330, H / 2 + 10);
    this.dvSmithy(t);
    const beat = s % 40, A = this.def.moveAnims.fsmash;
    this.dvMove('', 'fsmash', Math.min(A[1] - 1, beat < 26 ? beat / 2.6 : 9), 215, 322, 1.7);
    if (beat === 18) { sfx('clang', 0.8, 0.8 + (s % 80 ? 0 : 0.1)); this.cameras.main.shake(70, 0.004); }
    if (beat >= 18 && beat < 44) this.dvSparks(300, 262, beat - 18);
    if (beat >= 18 && beat < 21) this.glow(this.front, 300, 262, 40, 0xfff0b8, 0.5);
    this.dvKnifeGlow(300, 258);
    this.dvFilm(t);
  }
  /** A blade glowing on the anvil (the one she's working). */
  dvKnifeGlow(x, y) { this.front.fillStyle(0xffa030, 1); this.front.fillTriangle(x - 18, y, x + 14, y - 2, x + 18, y + 3); this.front.fillStyle(0xfff0b8, 1); this.front.fillRect(x - 10, y, 16, 1); }
  /** [200] The anvil: one of the beaten laid out across it - and she hammers them flat. HOLD STILL. */
  shot_dv_forge_anvil(t, k, s) {
    this.dvCam(1.25, 300, 250);
    this.dvSmithy(t);
    const beat = s % 34, squash = Math.max(0.35, 1 - Math.floor(s / 34) * 0.16);
    this.posLosers([[305, 262, 1.6, -Math.PI / 2, 1]]);
    const v = this.losers[0];
    if (v && v.s.visible) { v.s.setTintMode(Phaser.TintModes.MULTIPLY).setTint(0xffc8a0).setScale(1.6 * (beat < 4 && s > 20 ? squash * 0.8 : squash), 1.6); }
    this.losers.slice(1).forEach((l) => l.s.setVisible(false));
    const A = this.def.moveAnims.fsmash;
    this.dvMove('', 'fsmash', Math.min(A[1] - 1, beat < 22 ? beat / 2.2 : 9), 200, 322, 1.8);
    if (beat === 16) { sfx('clang', 0.9, 0.6); sfx('hit', 0.6, 1.4); this.cameras.main.shake(90, 0.006); }
    if (beat >= 16 && beat < 34) this.dvSparks(300, 250, beat - 16, 14);
    if (s >= 30) this.dvText(0, 'HOLD STILL.', W / 2 - 10, 90, 13, '#ffa030', { stroke: '#1a0806', sw: 5 });
    this.dvFilm(t);
  }
  /** [360] The quench: she dunks another of them head first in the barrel - a great hiss of steam. TSSSSS. */
  shot_dv_forge_quench(t, k, s) {
    this.dvCam(1.3, 410, 240);
    this.dvSmithy(t);
    const v = this.losers[1] || this.losers[0], dip = ease((s - 10) / 30);
    this.losers.forEach((l) => l.s.setVisible(false));
    if (v && v.def) { v.s.setCrop().setPosition(425, 200 + dip * 70).setScale(1.5).setRotation(Math.PI).setAlpha(1).setTintMode(Phaser.TintModes.MULTIPLY).setTint(0xffc8a0).setVisible(true); }
    this.mid.fillStyle(0x4a2c16, 1); this.mid.fillRect(400, 268, 50, 56); this.mid.fillStyle(0x2a1a0c, 1); this.mid.fillRect(400, 278, 50, 4); this.mid.fillRect(400, 306, 50, 4);
    this.fx.fillStyle(0x4a2c16, 1); this.fx.fillRect(400, 268, 50, 56); this.fx.fillStyle(0x2a1a0c, 1); this.fx.fillRect(400, 278, 50, 4); this.fx.fillRect(400, 306, 50, 4);   // (the barrel in front of them)
    this.dvPose('', 'idle', s / 6, 360, 322, 1.8, false);
    if (s === 40) { sfx('smoke', 0.9, 0.6); sfx('geyser', 0.5, 1.2); }
    if (s >= 40) for (let i = 0; i < 26; i++) { const sp = this.spots[i], d = s - 40, x = 425 + (sp[0] - 0.5) * (30 + d * 1.5), y = 262 - d * (0.8 + sp[1]) - sp[2] * 30; this.front.fillStyle(0xe8e4e0, Math.max(0, 0.6 - d / 140)); this.front.fillCircle(x, y, 8 + d * 0.25 + sp[2] * 10); }
    if (s >= 50) this.dvText(0, 'TSSSSSSS...', W / 2 + 40, 90, 13, '#e8e4e0', { stroke: '#1a0806', sw: 5 });
    this.dvFilm(t);
  }
  /** [480] The shelf: a little crying statue of them, cast in iron, set on her REJECTS shelf - then flicked off to smash. */
  shot_dv_forge_shelf(t, k, s) {
    this.hideLosers();
    this.dvCam(1.5, 200, 180);
    this.dvSmithy(t, 0.7);
    const m = this.mid;
    m.fillStyle(0x3a2a20, 1); m.fillRect(80, 196, 260, 6);                               // the shelf
    this.dvText(1, 'REJECTS', 210, 214, 9, '#c8a878', { stroke: '#1a0806', sw: 3 });
    for (let i = 0; i < 4; i++) { const x = 100 + i * 34; m.fillStyle(0x4a4a52, 1); m.fillRect(x, 182, 12, 14); m.fillCircle(x + 6, 178, 6); m.fillStyle(0x2a2a2e, 1); m.fillRect(x + 3, 177, 2, 1); m.fillRect(x + 7, 177, 2, 1); }   // other little statues, older rejects
    const fall = Math.max(0, s - 110), x = 260 + Math.min(1, fall / 8) * 14, y = 182 + fall * fall * 0.08, rot = fall * 0.15;
    if (y < 330) {
      m.save?.();
      m.fillStyle(0x6a6a78, 1); m.fillRect(x - 6 + Math.sin(rot) * 3, y, 14, 14); m.fillCircle(x + 1, y - 4, 7);
      m.fillStyle(0x2a2a2e, 1); m.fillRect(x - 3, y - 6, 2, 1); m.fillRect(x + 3, y - 6, 2, 1); m.fillStyle(0x8ad0ff, 1); m.fillRect(x - 3, y - 4, 1, 3); m.fillRect(x + 4, y - 4, 1, 3);   // its little crying face
    } else if (fall < 160) for (let i = 0; i < 12; i++) { const sp = this.spots[i], d = fall - 22; m.fillStyle(0x6a6a78, 1); m.fillRect(274 + (sp[0] - 0.5) * d * 3, 330 - sp[1] * d * 1.5 + d * d * 0.05, 3, 3); }
    if (s === 132) { sfx('glass', 0.8, 0.7); sfx('clang', 0.5, 1.4); }
    if (s < 90) { this.dvPose('', 'idle', s / 6, 330, 322, 2.2, true); this.dvText(0, '...', 330, 150, 12, '#ffa030', { stroke: '#1a0806', sw: 4 }); }   // she looks at it
    else { const A = this.def.moveAnims.jab; this.dvMove('', 'jab', Math.min(A[1] - 1, (s - 90) / 2), 330, 322, 2.2, true); }   // ...and flicks it off
    if (s > 140) this.dvText(0, '*YAWN*', 330, 140, 11, '#c8a878', { stroke: '#1a0806', sw: 4 });
    this.dvFilm(t);
  }
  /** [660] The bench: she sits on the pile of them, sharpening her glowing blade, and gives them a thumbs down. */
  shot_dv_forge_bench(t, k, s) {
    const card = t >= this.cut.card;
    if (card) this.dvCam(1, W / 2, H / 2); else this.dvCam(1.1 + ease(k) * 0.15, 310, 230);
    this.dvSmithy(t);
    this.posLosers([[280, 330, 1.5, Math.PI / 2, 1], [340, 326, 1.5, -Math.PI / 2, 1], [310, 316, 1.4, Math.PI / 2, 1]], 0x2a1a14);   // the pile
    this.dvPose('', 'idle', 0, 312, 290, 1.8, false).setScale(1.8, 1.55);                 // sitting on it
    if (s % 24 < 12) { this.dvSparks(352, 258, s % 24, 10); if (s % 24 === 0) sfx('shing', 0.35, 1.3); }   // the blade on the whetstone
    this.dvKnifeGlow(352, 256);
    if (s >= 60) {                                                                          // the thumbs down
      const f = this.front, x = 390, y = 200 + Math.sin(s * 0.2) * 2;
      f.fillStyle(0xd08a60, 1); f.fillRect(x - 6, y - 8, 12, 10); f.fillRect(x - 2, y + 2, 4, 9); f.fillStyle(0x1a0806, 1); f.fillRect(x - 6, y - 4, 12, 1);
    }
    if (s >= 70 && t < this.cut.card) this.dvText(0, 'MELTED DOWN FOR SCRAP.', W / 2, 90, 13, '#ffa030', { stroke: '#1a0806', sw: 5 });
    this.dvFilm(t);
  }

  // ================================================================= THE LAST KEEPER - THE LAST LIGHT
  /** The sea: rows of waves, from far (small, pale) to near (big, dark); calm = 0 storm .. 1 still; foam on the crests. */
  dvSea(g, t, y0, calm, cols) {
    for (let r = 0; r < 6; r++) {
      const y = y0 + r * r * 6 + r * 6, amp = (2 + r * 3) * (1 - calm * 0.85), len = 40 + r * 22, sp = 0.03 + r * 0.01;
      const pts = [{ x: 0, y: H }];
      for (let x = 0; x <= W; x += 8) pts.push({ x, y: y + Math.sin(x / len * 6.28 + t * sp * (r % 2 ? 1 : -1.2) + r) * amp });
      pts.push({ x: W, y: H });
      g.fillStyle(cols[Math.min(cols.length - 1, r)], 1); g.fillPoints(pts, true);
      if (calm < 0.7) for (let x = 0; x <= W; x += 16) { const yy = y + Math.sin(x / len * 6.28 + t * sp * (r % 2 ? 1 : -1.2) + r) * amp; if (Math.sin(x * 0.31 + t * 0.05 + r) > 0.5) { g.fillStyle(0xd8f0f0, 0.7); g.fillRect(x, yy - 1, 6, 2); } }
    }
  }
  /** The lighthouse on its rock at x: a striped tower, the lamp room; beam = its angle (null = dark); broken = 0-1 ruined. */
  dvLighthouse(g, x, y, sc, beam, broken = 0) {
    g.fillStyle(0x0a0e12, 1); g.fillEllipse(x, y + 6 * sc, 120 * sc, 30 * sc);
    const top = y - 130 * sc + broken * 40 * sc;
    g.fillStyle(0xd8d4cc, 1); g.fillPoints([{ x: x - 18 * sc, y }, { x: x + 18 * sc, y }, { x: x + 11 * sc, y: top }, { x: x - 11 * sc, y: top }], true);
    for (let i = 1; i < 4; i++) { const yy = y - i * 32 * sc; if (yy > top) { g.fillStyle(0xa81a1a, 1); g.fillRect(x - 17 * sc + i * 2 * sc, yy, (34 - i * 4) * sc, 12 * sc); } }
    if (broken < 0.5) {
      g.fillStyle(0x1a1a1e, 1); g.fillRect(x - 13 * sc, top - 4 * sc, 26 * sc, 4 * sc);
      g.fillStyle(beam === null ? 0x3a3a30 : 0xfff0b0, 1); g.fillRect(x - 9 * sc, top - 18 * sc, 18 * sc, 14 * sc);
      g.fillStyle(0x1a1a1e, 1); g.fillTriangle(x - 12 * sc, top - 18 * sc, x + 12 * sc, top - 18 * sc, x, top - 28 * sc);
      if (beam !== null) {
        const bx = x, by = top - 11 * sc, L = 900, w = 0.09;
        this.mid.fillStyle(0xfff0b0, 0.16); this.mid.fillTriangle(bx, by, bx + Math.cos(beam - w) * L, by + Math.sin(beam - w) * L * 0.3, bx + Math.cos(beam + w) * L, by + Math.sin(beam + w) * L * 0.3);
        this.mid.fillStyle(0xfff0b0, 0.12); this.mid.fillTriangle(bx, by, bx + Math.cos(beam - w * 0.4) * L, by + Math.sin(beam - w * 0.4) * L * 0.3, bx + Math.cos(beam + w * 0.4) * L, by + Math.sin(beam + w * 0.4) * L * 0.3);
        this.glow(this.mid, bx, by, 26 * sc, 0xfff0b0, 0.4);
      }
    } else { g.fillStyle(0x1a1a1e, 1); for (let i = 0; i < 5; i++) g.fillTriangle(x - 11 * sc + i * 5 * sc, top, x - 8 * sc + i * 5 * sc, top, x - 9 * sc + i * 5 * sc, top - (6 + (i % 2) * 8) * sc); }
  }
  /** Rain streaks over everything. */
  dvRain(t, n = 80, a = 0.35) { for (let i = 0; i < n; i++) { const sp = this.spots[i % 40], x = (sp[0] * W + i * 13 + t * 3) % (W + 40) - 20, y = (sp[1] * H + t * (10 + sp[2] * 4) + i * 37) % H; this.front.lineStyle(1, 0x9ab0c8, a); this.front.lineBetween(x, y, x - 4, y + 14); } }
  /** [0] Storm: night at sea, black waves, lightning; the lighthouse beam sweeping over it all. The camera pushes in. */
  shot_dv_keep_storm(t, k, s) {
    this.hideLosers(); this.hero.setVisible(false);
    this.dvCam(1 + ease(k) * 0.25, 430 - ease(k) * 20, H / 2 - 10);
    const bolt = (s >= 70 && s < 75) || (s >= 80 && s < 83) || (s >= 150 && s < 154);
    this.sky(this.bg, bolt ? 0x5a6a80 : 0x06080e, bolt ? 0x3a4a5a : 0x101820, 10);
    if (s === 70 || s === 150) { sfx('thunder', 0.7, 0.6); this.cameras.main.shake(140, 0.005); }
    for (let i = 0; i < 5; i++) { const sp = this.spots[i]; this.bg.fillStyle(bolt ? 0x4a5466 : 0x0c1018, 0.9); this.bg.fillEllipse(((sp[0] * W + t * 0.4) % (W + 200)) - 100, 40 + sp[1] * 60, 300, 50); }   // clouds rolling
    if (bolt) { let x = 160, y = 0; this.mid.lineStyle(3, 0xffffff, 1); for (let i = 0; i < 7; i++) { const nx = x + (this.spots[i + 5][0] - 0.5) * 50, ny = y + 28; this.mid.lineBetween(x, y, nx, ny); x = nx; y = ny; } }
    this.dvLighthouse(this.bg, 470, 230, 1, -Math.PI + (t * 0.025) % (Math.PI * 2));
    this.dvSea(this.fx, t * 1.4, 220, 0, [0x0e1a24, 0x0a141c, 0x081018, 0x060c12, 0x04080c, 0x020406]);
    this.dvRain(t);
    this.dvFilm(t);
  }
  /** [200] The lamp room: she lifts her lantern; the great lens blazes up round her; rain runs down the glass. */
  shot_dv_keep_lamp(t, k, s) {
    this.hideLosers();
    this.dvCam(1.25 + ease(k) * 0.12, W / 2 - 20, H / 2 + 10);
    const blaze = ease((s - 40) / 40), g = this.bg;
    g.fillStyle(0x0a1014, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { g.fillStyle(0x060a0e, 1); g.fillRect(i * 120 - 8, 0, 12, H); }   // the window frames
    for (let i = 0; i < 50; i++) { const sp = this.spots[i % 40], x = (sp[0] * W + i * 17) % W, y = (sp[1] * H + t * (1 + sp[2] * 1.5)) % H; g.fillStyle(0x6a8aa8, 0.4); g.fillRect(x, y, 1, 6 + sp[2] * 8); }   // rain on the glass
    const cx = 380, cy = 180;
    this.glow(this.mid, cx, cy, 120 + 60 * blaze, 0xfff0b0, 0.15 + 0.35 * blaze);
    for (let r = 8; r < 80; r += 9) { this.mid.lineStyle(3, mixC(0x3a4a50, 0xfff8d0, blaze), 0.7); this.mid.strokeEllipse(cx, cy, r * 1.2, r * 2); }   // the great lens's rings
    this.mid.fillStyle(0x2a2a2e, 1); this.mid.fillRect(cx - 50, 260, 100, 60);
    this.dvPose('', 'idle', s / 6, 250, 322, 2.2, false);
    if (s === 40) { sfx('limitready', 0.6, 0.8); this.flash = 2; }
    this.glow(this.fx, 228, 268, 22 + 8 * blaze, 0xffc040, 0.5);
    this.dvFilm(t);
  }
  /** [380] The tide: the beaten cling to a wrecked boat on the black tide; the beam finds them, holds - and swings away. */
  shot_dv_keep_tide(t, k, s) {
    this.hero.setVisible(false);
    this.dvCam(1.2, 320, H / 2 + 20);
    this.sky(this.bg, 0x04060a, 0x0c121a, 8);
    const bob = Math.sin(t * 0.06) * 6, tilt = Math.sin(t * 0.04) * 0.15;
    const lit = s >= 30 && s < 120 ? 1 : 0, away = ease((s - 120) / 20);
    this.dvSea(this.bg, t * 1.2, 230, 0.2, [0x0a1418, 0x08101a, 0x060c12]);
    this.mid.fillStyle(0x2a1a10, 1); this.mid.fillPoints([{ x: 250, y: 270 + bob }, { x: 390, y: 262 + bob }, { x: 370, y: 284 + bob }, { x: 268, y: 290 + bob }], true);   // the wrecked boat
    this.mid.lineStyle(3, 0x3a2414, 1); this.mid.lineBetween(330, 266 + bob, 300, 220 + bob);   // its broken mast
    this.posLosers([[280, 276 + bob, 1.4, tilt, 1], [340, 272 + bob, 1.4, -tilt, 1], [310, 280 + bob, 1.3, tilt * 2, 1]], 0x0a0e12);
    if (lit || away < 1) {
      const bx = 320 + away * 500, a = lit ? 0.22 : 0.22 * (1 - away);
      this.mid.fillStyle(0xfff0b0, a); this.mid.fillTriangle(bx - 20, -40, bx + 20, -40, bx + 90, 320); this.mid.fillTriangle(bx - 20, -40, bx + 90, 320, bx - 90, 320);
      if (lit) this.losers.forEach((l) => l.s.visible && l.s.setTintMode(Phaser.TintModes.MULTIPLY).setTint(0xfff0d0));
    }
    if (s === 30) sfx('shing', 0.5, 0.6);
    if (s >= 50 && s < 120) this.dvText(0, 'HELP!', 310, 150, 12, '#d8f0f0', { stroke: '#06141a', sw: 4 });
    if (s === 120) sfx('whoosh', 0.5, 0.5);
    this.dvSea(this.fx, t * 1.5, 286, 0.2, [0x060c12, 0x04080c, 0x020406]);
    this.dvRain(t, 50, 0.25);
    this.dvFilm(t);
  }
  /** [600] Dawn: a calm sea gone gold, the tower in ruins on its rock; she stands on the rocks with her lantern still lit. */
  shot_dv_keep_dawn(t, k, s) {
    const card = t >= this.cut.card;
    if (card) this.dvCam(1, W / 2, H / 2); else this.dvCam(1.25 - ease(k * 1.3) * 0.25, W / 2 + 40 - ease(k) * 40, H / 2);
    this.hideLosers();
    this.sky(this.bg, 0x3a4a7a, 0xffb070, 12);
    this.glow(this.bg, 200, 226, 120, 0xffe0a0, 0.5); this.bg.fillStyle(0xfff4d0, 1); this.bg.fillCircle(200, 226, 22);   // the sun, rising
    this.dvSea(this.bg, t * 0.5, 226, 1, [0xd88a60, 0xb86a50, 0x8a5048, 0x5a3a40, 0x3a2a34, 0x2a1e28]);
    for (let i = 0; i < 12; i++) { const y = 232 + i * 7; this.mid.fillStyle(0xfff0c0, 0.5 - i * 0.03); this.mid.fillRect(200 - 30 + Math.sin(t * 0.05 + i) * 10, y, 60 - i * 3, 2); }   // the sun's path on the water
    this.dvLighthouse(this.mid, 480, 262, 0.9, null, 1);
    this.mid.fillStyle(0x1a1418, 1); this.mid.fillEllipse(350, 330, 260, 60);              // the rocks she stands on
    this.dvPose('', 'idle', s / 6, 350, 312, 1.9, false);
    this.glow(this.fx, 330, 266, 18 + Math.sin(t * 0.2) * 2, 0xffc040, 0.6);              // her lantern, still lit
    for (let i = 0; i < 4; i++) { const sp = this.spots[i + 20], gx = (sp[0] * W + t * (0.5 + sp[1])) % (W + 60) - 30, gy = 70 + sp[2] * 60 + Math.sin(t * 0.05 + i) * 6, f = Math.sin(t * 0.25 + i) * 4; this.front.lineStyle(2, 0x2a2420, 1); this.front.lineBetween(gx - 8, gy - f, gx, gy); this.front.lineBetween(gx, gy, gx + 8, gy - f); }   // gulls
    this.dvFilm(t);
  }
}
