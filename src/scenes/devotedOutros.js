// THE DEVOTED's drawn costumes' win cutscenes (mixed into WinScene like winSkins.js; their entries are spread into
// SKIN_CUTS there). Each is a 15 s short film scored to its own music (tools/audio/devoted_outros.py):
//   CARTRIDGE     POWER ON - a console boot, a sunny low-poly 3D field (a real Poly3D scene, camera panning with her)
//                 where she runs and leaps for glowing shards, THE LAST SHARD held high under a sunburst... then the
//                 cartridge corrupts: torn scanlines, a glitching DROWNED, a black wireframe void
//   HOLLOW BRIDE  THE WEDDING - a rain-lashed chapel lit by candles, she walks the aisle past the beaten seated as
//                 guests; through her veil, black tears; lightning; the vows; three cuts as the bell tolls; the bouquet
//                 of dead roses falls in slow motion; the last tableau under the broken rose window
//   EMBER SAINT   MARTYRDOM - a ruined cathedral, she stands on a pyre while the beaten close in with torches; the fire
//                 catches and her eyes burn through it; she rises out of the flames as the burning DROWNED, the windows
//                 burst into embers; she hangs in a shaft of light over the beaten, kneeling in the ash
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { skinInfo } from '../fighters/skins.js';
import { Poly3D } from '../stage/poly3d.js';

const W = VIEW_W, H = VIEW_H;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

export const DEVOTED_CUTS = {
  'devoted:CARTRIDGE': { fn: 'dv_cart', len: 900, card: 770, name: 'THE DEVOTED', sub: 'CARTRIDGE', line: 'THANKS FOR PLAYING.', music: 'bgm_outro_cartridge',
    color: '#2ac8c0', stroke: '#0c0418', shots: [[0, 'boot'], [150, 'field'], [420, 'shard'], [620, 'corrupt'], [700, 'void']] },
  'devoted:HOLLOW BRIDE': { fn: 'dv_bride', len: 900, card: 750, name: 'THE DEVOTED', sub: 'HOLLOW BRIDE', line: 'TILL DEATH DO US PART.', music: 'bgm_outro_bride',
    color: '#f6f2e6', stroke: '#0a0810', shots: [[0, 'aisle'], [210, 'veil'], [380, 'vows'], [470, 'cuts'], [560, 'bouquet'], [690, 'tableau']] },
  'devoted:EMBER SAINT': { fn: 'dv_ember', len: 900, card: 760, name: 'THE DEVOTED', sub: 'EMBER SAINT', line: 'ASHES TO ASHES.', music: 'bgm_outro_ember',
    color: '#ffb040', stroke: '#140604', shots: [[0, 'pyre'], [180, 'ignite'], [360, 'ascend'], [560, 'judgment']] },
};

/** The shots (WinScene methods: shot_<fn>_<name>(t, k, s) - t the cutscene frame, k 0-1 through the shot, s its frame). */
export class DevotedShots {
  // ------------------------------------------------------------- shared
  /** The texture key of one of her costume's strips at a sludge stage ('' / semi / taken / drowned). */
  dvKey(stage, strip) { return 'dv_' + skinInfo(this.def.id, this.win.skin || 0).sheetSet + '_' + (stage ? stage + '_' : '') + strip; }
  /** Shows her (on spr, the hero by default) in one frame of a strip (idle / run / jump / fall) of a sludge stage. */
  dvPose(stage, strip, frame, x, y, sc, flip = false, spr = this.hero) {
    const key = this.dvKey(stage, strip), n = Math.max(1, (this.textures.get(key).frameTotal || 2) - 1);
    spr.setTexture(key, Math.floor(frame) % n).setOrigin(0.5, this.def.originY).setPosition(x, y).setScale(sc).setFlipX(flip)
      .setRotation(0).setAlpha(1).clearTint().setTintMode(Phaser.TintModes.MULTIPLY).setVisible(true);
    return spr;
  }
  /** Shows her in frame i of one of her moves (DV_MOVES name), at a sludge stage. */
  dvMove(stage, name, i, x, y, sc, flip = false, spr = this.hero) {
    const A = this.def.moveAnims[name];
    spr.setTexture(this.dvKey(stage, 'moves'), A[0] + Math.max(0, Math.min(A[1] - 1, Math.floor(i)))).setOrigin(this.def.movesOrigin[0], this.def.movesOrigin[1])
      .setPosition(x, y).setScale(sc).setFlipX(flip).setRotation(0).setAlpha(1).clearTint().setTintMode(Phaser.TintModes.MULTIPLY).setVisible(true);
    return spr;
  }
  /** Fixed-length words on screen (one of the pooled tvLines). */
  dvText(i, txt, x, y, size, color, o = {}) {
    const L = this.tvLines[i];
    L.setText(txt).setFontSize(size).setColor(color).setPosition(x, y).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setAlpha(o.a ?? 1).setVisible(true);
    if (o.stroke) L.setStroke(o.stroke, o.sw || 4);
    return L;
  }
  /** A spinning faceted gem (an octahedron), flat-shaded - CARTRIDGE's shards and its boot logo. */
  dvGem(g, cx, cy, r, ang, cols, a = 1, tilt = 0.35) {
    const V = [[0, -1.35, 0], [0, 1.35, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]].map(([x, y, z]) => {
      const c = Math.cos(ang), s = Math.sin(ang), x1 = x * c + z * s, z1 = -x * s + z * c;
      const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      return [cx + x1 * r, cy + y2 * r, z2];
    });
    const F = [[0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 2], [1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 2, 5]];
    const faces = F.map((f, i) => {
      const [p, q, w] = f.map((j) => V[j]);
      const nz = (q[0] - p[0]) * (w[1] - p[1]) - (q[1] - p[1]) * (w[0] - p[0]);
      return { f, i, nz, z: (p[2] + q[2] + w[2]) / 3 };
    }).filter((o) => o.nz < 0).sort((a1, b1) => b1.z - a1.z);
    for (const o of faces) {
      const [p, q, w] = o.f.map((j) => V[j]), lit = 0.55 + 0.45 * Math.max(0, -o.z);
      const c = Phaser.Display.Color.IntegerToColor(cols[o.i % cols.length]);
      g.fillStyle(Phaser.Display.Color.GetColor(Math.min(255, c.r * lit + 30 * (o.i < 4)), Math.min(255, c.g * lit + 30 * (o.i < 4)), Math.min(255, c.b * lit)), a);
      g.fillTriangle(p[0], p[1], q[0], q[1], w[0], w[1]);
    }
  }
  /** Rays fanning out from a point (a sunburst behind something glorious). */
  dvRays(g, x, y, n, len, ang, col, a) {
    for (let i = 0; i < n; i++) {
      const q = ang + i * Math.PI * 2 / n, w = Math.PI / n * 0.55;
      g.fillStyle(col, a); g.fillTriangle(x, y, x + Math.cos(q - w) * len, y + Math.sin(q - w) * len, x + Math.cos(q + w) * len, y + Math.sin(q + w) * len);
    }
  }

  // ================================================================= CARTRIDGE - POWER ON
  /** [0] A console boot: stars, a spinning gem logo growing out of the dark, DEVOTED 64 bouncing in, PRESS START. */
  shot_dv_cart_boot(t, k, s) {
    const g = this.bg; this.hideLosers(); this.hero.setVisible(false); this.dvHideField();
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.3 + 0.7 * Math.abs(Math.sin(t * 0.05 + i))); g.fillRect(sp[0] * W, sp[1] * H, 1 + (i % 7 === 0), 1 + (i % 7 === 0)); }
    const grow = ease(s / 50), ang = s * 0.07;
    if (s > 4) {
      this.glow(this.mid, W / 2, 140, 90 * grow, 0x20e8ff, 0.35);
      this.dvGem(this.fx, W / 2, 140, 54 * grow, ang, [0x2ac8c0, 0xffe848, 0x9038c0, 0xff9420, 0x109098, 0xf0c81a, 0x641c90, 0xc85a0c]);
    }
    if (s === 6) sfx('glass', 0.5, 1.4);
    const word = 'DEVOTED 64';
    for (let i = 0; i < word.length; i++) {                                     // the letters drop in one by one and bounce
      const d = s - 50 - i * 4; if (d < 0) continue;
      const y = 238 - Math.max(0, 40 - d * 4) * Math.abs(Math.cos(d * 0.3)) * (d < 10 ? 1 : 0.3 * Math.exp(-(d - 10) / 6));
      const L = this.dvText(i, word[i], W / 2 - 115 + i * 25, y, 26, ['#2ac8c0', '#ffe848', '#c070f0', '#ff9420'][i % 4], { stroke: '#0c0418', sw: 6 });
      if (d === 0 && word[i] !== ' ') sfx('menu', 0.3, 1.2 + i * 0.05); L.setScale(1);
    }
    if (s > 100 && (s >> 4) % 2 === 0) this.dvText(9, 'PRESS START', W / 2, 288, 9, '#ffffff');
    if (s > 128) { this.over.fillStyle(0xffffff, (s - 128) / 22); this.over.fillRect(0, 0, W, H); }
  }
  /** Puts away the 3D field (other shots). */
  dvHideField() { if (this.dvField && this.dvField.g.scene) this.dvField.g.clear(); }
  /** Builds CARTRIDGE's low-poly 3D field once (a real Poly3D scene, drawn with a camera of our own). */
  dvMakeField() {
    if (this.dvField && this.dvField.g.scene) return this.dvField;
    const R = this.dvField = new Poly3D(this, [], { fog: 0xb8ecff, zFar: 3400, zNear: 400, f: 520, lift: 40, edge: 0.1 });
    R.g.setDepth(0); this.children.moveBelow(R.g, this.losers.length ? this.losers[0].s : this.mid);   // (just over the sky, under everything else)
    R.terrain({ x1: -800, x2: 4400, z1: -40, z2: 3200, y: 300, nx: 40, nz: 14, amp: 9, seed: 5,
      col: (i, j, x, z, kk) => ((i + j) % 2 ? [0x30d038, 0x38dc40] : [0x58ec50, 0x60f058])[kk],
      hill: (x, z) => -Math.max(0, z - 1600) * (0.25 + 0.15 * Math.sin(x / 500)) });
    for (let i = 0; i < 14; i++) {                                              // low-poly trees
      const x = -400 + i * 340 + (i % 3) * 60, z = 260 + (i % 4) * 230;
      R.prism(x, 220, 300, z, 12, 5, 0x8a4a1c); R.blob(x, 200, z, 50, 56, 50, [0x189828, 0x20b830, 0x30d038], i, null, 0.2);
    }
    for (let i = 0; i < 6; i++) R.pyramid(-600 + i * 900, 300, 2900, 900, 700, 520 + (i % 2) * 160, [0x7a5ad8, 0x5a6ae8, 0x8a6ad0][i % 3]);   // far mountains
    for (let i = 0; i < 6; i++) R.pyramid(-600 + i * 900, 300 - 520 - (i % 2) * 160 + 140, 2900, 260, 200, 150, 0xffffff);              // ...snow-capped
    for (const [x, y] of [[700, 190], [1500, 170], [2400, 200]]) { R.box(x - 70, y, -20, x + 70, y + 24, 80, 0xc89058, 0x58ec50); }      // floating grass blocks
    R.prism(3300, -200, 300, 1700, 70, 6, 0xf0e8d8, 0xf02818); R.pyramid(3300, -200, 1700, 180, 180, 160, 0xf02818);                        // a far-off tower
    for (let i = 0; i < 8; i++) R.blob(-500 + i * 640, -40 + (i % 3) * 50, 1800 + (i % 3) * 400, 160, 40, 90, [0xffffff, 0xf0f8ff], 30 + i, null, 0.3);   // clouds
    return R;
  }
  /** [150] The field: she runs right across a sunny low-poly world, the camera panning with her, leaping for shards. */
  shot_dv_cart_field(t, k, s) {
    const g = this.bg; this.hideLosers();
    this.sky(g, 0x1858e8, 0xb8ecff, 12);
    const R = this.dvMakeField(), cx = s * 3.4, cy = 0;
    R.scene = { cameras: { main: { midPoint: { x: cx + W / 2, y: cy + H / 2 }, worldView: { x: cx, y: cy, width: W, height: H } } } };
    R.g.setPosition(-cx, -cy);
    R.render([]);
    const hx = 230, jumpAt = [70, 175], shards = [[300, 270], [560, 200], [860, 270], [1210, 195]];
    let hy = 300, air = -1;
    for (const j of jumpAt) { const d = s - j; if (d >= 0 && d < 46) { hy = 300 - Math.sin(d / 46 * Math.PI) * 110; air = d; } }
    if (air < 0) this.dvPose('', 'run', s / 4, hx, hy, 3);
    else this.dvPose('', air < 23 ? 'jump' : 'fall', air / 6, hx, hy, 3);
    if (air === 0) sfx('jump', 0.5, 1.2);
    let got = 61;
    for (const [wx, wy] of shards) {                                            // the shards: spinning gems along the way
      const sx = wx - cx; if (sx < hx + 10) { got++; if (sx > hx + 6.6) sfx('ding', 0.4, 1.6); continue; }
      if (sx < W + 40) { this.glow(this.mid, sx, wy, 18, 0xffe848, 0.4); this.dvGem(this.fx, sx, wy, 10, t * 0.12 + wx, [0xffe848, 0xf0c81a, 0xff9420, 0xfff8a0]); }
    }
    this.dvText(0, 'SHARDS ' + Math.min(63, got) + ' / 64', 30, 50, 10, '#ffe848', { ox: 0, oy: 0, stroke: '#0c0418', sw: 4 });
    this.vignette(this.over, 0.25);
  }
  /** [420] THE LAST SHARD: it hangs above her in a sunburst; she leaps, catches it and holds it high. */
  shot_dv_cart_shard(t, k, s) {
    const g = this.bg; this.hideLosers(); this.dvHideField();
    this.sky(g, 0x0c3cd8, 0x58a4ff, 10);
    const R = this.dvMakeField(), cx = 918 + s * 0.3;
    R.scene = { cameras: { main: { midPoint: { x: cx + W / 2, y: H / 2 - 20 }, worldView: { x: cx, y: -20, width: W, height: H } } } };
    R.g.setPosition(-cx, 20); R.render([]);
    const caught = s >= 74, gx = W / 2, gy = caught ? 150 : 130 + Math.sin(s * 0.08) * 6;
    this.dvRays(this.mid, gx, caught ? 140 : gy, 14, 420, t * 0.01, 0xfff8a0, caught ? 0.22 : 0.12);
    if (s < 40) this.dvPose('', 'idle', s / 6, gx, 300, 3);
    else if (s < 74) { const d = s - 40, y = 300 - Math.sin(d / 68 * Math.PI) * 150; this.dvPose('', 'jump', d / 6, gx, y, 3); if (d === 0) sfx('jump', 0.5, 1); }
    else { const d = s - 74; this.dvMove('', 'upb', Math.min(9, d / 3), gx, 300 - Math.max(0, 40 - d * 2), 3); }
    if (!caught) { this.glow(this.fx, gx, gy, 36, 0xffe848, 0.5); this.dvGem(this.fx, gx, gy, 22, t * 0.1, [0xffe848, 0xf0c81a, 0xff9420, 0xfff8a0, 0xffffff]); }
    else {
      const d = s - 74, hx = gx + 30, hy = 300 - Math.max(0, 40 - d * 2) - 196;      // held up in her raised hand
      this.glow(this.fx, hx, hy, 40 + Math.sin(d * 0.2) * 4, 0xffe848, 0.55); this.dvGem(this.fx, hx, hy, 18, t * 0.14, [0xffe848, 0xf0c81a, 0xff9420, 0xfff8a0, 0xffffff]);
      if (d === 0) { this.flash = 6; sfx('limitready', 0.6, 1.2); this.cameras.main.shake(140, 0.006); }
      for (let i = 0; i < 16; i++) { const sp = this.spots[i], q = sp[0] * 6.28 + d * 0.02, r = 20 + ((d * 1.6 + sp[1] * 200) % 200); this.fx.fillStyle(i % 2 ? 0xffe848 : 0xffffff, Math.max(0, 1 - r / 200)); this.fx.fillRect(hx + Math.cos(q) * r, hy + Math.sin(q) * r, 2, 2); }
      if (d > 14) this.dvText(0, 'THE LAST SHARD!', W / 2, 74, 18, '#ffe848', { stroke: '#0c0418', sw: 6 }).setScale(Math.min(1, 0.4 + (d - 14) * 0.06));
      if (d > 30) this.dvText(1, 'SHARDS 64 / 64', W / 2, 98, 9, '#ffffff', { stroke: '#0c0418', sw: 3 });
    }
    this.vignette(this.over, 0.3);
  }
  /** [620] The cartridge corrupts: the picture tears into shifted scanlines, colours flip, she stutters into the glitch. */
  shot_dv_cart_corrupt(t, k, s) {
    const g = this.bg; this.hideLosers(); this.dvHideField();
    const bad = ease(s / 60), R = this.dvMakeField(), cx = 940 + Math.sin(s * 3.1) * 30 * bad;
    this.sky(g, s % 9 < 3 ? 0x3a1070 : 0x0c3cd8, s % 7 < 2 ? 0xff3ad8 : 0x58a4ff, 10);
    R.scene = { cameras: { main: { midPoint: { x: cx + W / 2, y: H / 2 - 20 }, worldView: { x: cx, y: -20, width: W, height: H } } } };
    R.g.setPosition(-cx, 20); R.render([]);
    const glitch = (s * 7) % 11 < 4 + bad * 6;
    this.dvPose(glitch ? 'drowned' : '', 'idle', s / 3, W / 2 + (glitch ? (s % 3 - 1) * 8 : 0), 300, 3);
    if (glitch) this.hero.setTint(s % 2 ? 0x20e8ff : 0xff3ad8);
    for (let i = 0; i < 18; i++) {                                               // torn bands of picture, shifted sideways
      const sp = this.spots[(i + (s >> 2)) % 40], y = 34 + sp[0] * (H - 68), h = 2 + sp[1] * 14 * bad, dx = (sp[2] - 0.5) * 120 * bad;
      this.front.fillStyle(i % 3 ? 0x20e8ff : 0xff3ad8, 0.25 + 0.35 * bad); this.front.fillRect(dx, y, W, h);
      this.front.fillStyle(0x000000, 0.5 * bad); this.front.fillRect(dx + W * sp[2], y, 60, h);
    }
    if (s % 6 < 3) for (let i = 0; i < 40; i++) { const sp = this.spots[i]; this.front.fillStyle(0xffffff, 0.6); this.front.fillRect(Math.floor(sp[0] * W / 8) * 8, Math.floor(((sp[1] * H + s * 13) % H) / 8) * 8, 8, 8); }
    if (s === 0) sfx('glitch', 0.7, 0.8); if (s === 30) sfx('glitch', 0.8, 0.5); if (s === 60) sfx('buzz', 0.6, 0.4);
    const msg = ['CARTRIDGE ERROR', 'C4RTR1DG3 3RR0R', 'PLEASE REINSERT', 'P L E A S E'][(s >> 3) % 4];
    if (s > 20) this.dvText(0, msg, W / 2 + (s % 5 - 2) * 3, 120, 16, s % 4 < 2 ? '#ff3ad8' : '#20e8ff', { stroke: '#000000', sw: 4 });
    if (s > 66) { this.over.fillStyle(0x000000, Math.min(1, (s - 66) / 10)); this.over.fillRect(0, 0, W, H); }
  }
  /** [700] The void: a black world of wireframe, the corrupted DROWNED hanging in it, the shard in pieces round her. */
  shot_dv_cart_void(t, k, s) {
    const g = this.bg; this.dvHideField();
    g.fillStyle(0x05010c, 1); g.fillRect(0, 0, W, H);
    const hor = 200, sc = (s * 0.6) % 40;
    for (let i = 0; i < 18; i++) { const z = (i * 40 + sc) / 720, y = hor + 140 * z * z * 2.2; g.lineStyle(1, i % 2 ? 0xff3ad8 : 0x20e8ff, 0.2 + 0.6 * z); g.lineBetween(0, y, W, y); }   // a wireframe floor, scrolling toward us
    for (let i = -10; i <= 10; i++) { g.lineStyle(1, 0x20e8ff, 0.35); g.lineBetween(W / 2 + i * 12, hor, W / 2 + i * 120, H); }
    for (let i = 0; i < 30; i++) { const sp = this.spots[i]; g.fillStyle(i % 2 ? 0x20e8ff : 0xff3ad8, 0.6); g.fillRect(sp[0] * W, sp[1] * hor, 1, 1); }
    this.posLosers([[110, 300, 1.5, 1.45, 0.9], [540, 302, 1.5, -1.45, 0.9], [440, 306, 1.4, 1.5, 0.9]], s % 24 < 2 ? 0x20e8ff : 0x1c0838);   // the beaten, felled, in the void
    const bob = Math.sin(s * 0.05) * 6;
    this.dvPose('drowned', 'idle', s / 6, W / 2, 268 + bob, 3.4);
    if (s % 40 < 3) this.hero.setTint(s % 2 ? 0x20e8ff : 0xff3ad8);
    for (let i = 0; i < 7; i++) {                                                // the broken shard, orbiting her in pieces
      const q = s * 0.03 + i * 0.9, x = W / 2 + Math.cos(q) * 110, y = 170 + bob + Math.sin(q) * 34, front = Math.sin(q) > 0;
      this.dvGem(front ? this.fx : this.mid, x, y, 5 + (i % 3) * 2, s * 0.1 + i, [0xffe848, 0xff3ad8, 0x20e8ff], front ? 1 : 0.6);
    }
    this.vignette(this.over, 0.6);
  }

  // ================================================================= HOLLOW BRIDE - THE WEDDING
  /** The chapel: a vaulted nave in perspective, tall arched windows streaming rain, candles, pews, the altar. light = 0-1 flash. */
  dvChapel(g, t, light = 0) {
    const vx = W / 2, vy = 150;
    g.fillStyle(light ? 0xc8d0e8 : 0x0c0e18, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(light ? 0x8a90a8 : 0x141826, 1);                                       // the side walls and the floor, converging
    g.fillTriangle(0, 0, vx - 70, vy - 70, 0, H); g.fillTriangle(W, 0, vx + 70, vy - 70, W, H);
    g.fillStyle(light ? 0x60667a : 0x0a0c14, 1); g.fillTriangle(0, H, vx - 70, vy + 40, vx + 70, vy + 40); g.fillTriangle(0, H, vx + 70, vy + 40, W, H);
    g.fillStyle(0x3a0a10, 1); g.fillTriangle(vx - 14, vy + 40, vx + 14, vy + 40, vx + 120, H); g.fillTriangle(vx - 14, vy + 40, vx + 120, H, vx - 120, H);   // the red runner up the aisle
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {                          // arched windows, rain running down them
      const z = 1 - i * 0.22, x = vx + side * (90 + 230 * z), w = 40 * z, top = vy - 60 - 70 * z, h = 120 * z;
      g.fillStyle(light ? 0xffffff : [0x1a2a5a, 0x3a1a4a, 0x1a3a4a, 0x2a1a3a][i], 1); g.fillRect(x - w / 2, top, w, h); g.fillEllipse(x, top, w, w * 0.9);
      g.fillStyle(0x0a0c14, 1); g.fillRect(x - 1, top - w * 0.4, 2, h + w * 0.4); g.fillRect(x - w / 2, top + h * 0.45, w, 2);
      for (let r = 0; r < 4; r++) { const ry = top + ((t * (2 + r) + r * 40 + i * 13) % h); g.fillStyle(0x8aa0d0, 0.5); g.fillRect(x - w / 2 + 3 + r * w / 4, ry, 1, 5 * z); }
    }
    g.fillStyle(light ? 0xd8d8e8 : 0x22202c, 1); g.fillRect(vx - 60, vy - 20, 120, 60);   // the altar
    g.fillStyle(light ? 0xffffff : 0x3a3448, 1); g.fillRect(vx - 2, vy - 70, 4, 46); g.fillRect(vx - 14, vy - 58, 28, 4);   // its cross
    for (let i = 0; i < 8; i++) {                                                         // candles down both sides, flickering
      const side = i % 2 ? 1 : -1, z = 1 - Math.floor(i / 2) * 0.24, x = vx + side * (40 + 170 * z), y = vy + 40 + 150 * z;
      const fl = 0.8 + 0.2 * Math.sin(t * 0.4 + i * 1.7) + (this.spots[i][0] - 0.5) * 0.1;
      this.glow(this.mid, x, y - 34 * z, 26 * z * fl, 0xffb050, 0.32);
      g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 3 * z, y - 30 * z, 6 * z, 30 * z);
      this.fx.fillStyle(0xffd070, 1); this.fx.fillEllipse(x, y - 34 * z, 4 * z, 8 * z * fl); this.fx.fillStyle(0xffffff, 1); this.fx.fillRect(x - 0.5, y - 34 * z, 1, 2);
    }
    for (let i = 0; i < 4; i++) {                                                         // pews
      const z = 1 - i * 0.22, y = vy + 70 + 130 * z;
      for (const side of [-1, 1]) { const x1 = vx + side * (30 + 20 * z), x2 = vx + side * (90 + 230 * z); g.fillStyle(light ? 0x6a5a4a : 0x241812, 1); g.fillRect(Math.min(x1, x2), y - 22 * z, Math.abs(x2 - x1), 22 * z); g.fillStyle(light ? 0x8a7a6a : 0x34241a, 1); g.fillRect(Math.min(x1, x2), y - 22 * z, Math.abs(x2 - x1), 3); }
    }
  }
  /** Dead rose petals falling, drifting and turning. */
  dvPetals(g, t, n, a = 1, speed = 1) {
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i % 40], x = (sp[0] * W + Math.sin(t * 0.02 + i) * 30 + i * 17) % W, y = ((sp[1] * H + t * (0.6 + sp[2]) * speed + i * 31) % (H + 20)) - 10;
      const w = 2 + 2 * Math.abs(Math.sin(t * 0.08 + i));
      g.fillStyle([0x5a1420, 0x7a2030, 0x3a0a14][i % 3], a); g.fillEllipse(x, y, w, 3);
    }
  }
  /** [0] Rain on the windows; she walks slowly up the aisle, the beaten seated in the pews like guests. */
  shot_dv_bride_aisle(t, k, s) {
    this.dvChapel(this.bg, t);
    this.posLosers([[150, 262, 1.4, 0, 0.95, 1], [500, 262, 1.4, 0, 0.95, 1], [196, 214, 1.0, 0, 0.9, 1]], 0x05040a);
    const p = ease(s / 210), sc = 3.4 - p * 1.7, y = 345 - p * 120;
    this.dvPose('', 'run', s / 14, W / 2 + Math.sin(s * 0.05) * 4, y, sc);           // walking slowly up the aisle to the altar
    this.hero.setTint(0xb8b8d0);
    this.rain(this.front, t, 0x8aa0d0, 0.15);
    this.vignette(this.over, 0.7);
  }
  /** [210] Close on her face through the veil: black tears run; lightning. */
  shot_dv_bride_veil(t, k, s) {
    const flash = s >= 90 && s < 96;
    this.dvChapel(this.bg, t, flash ? 1 : 0); this.hideLosers();
    this.bg.fillStyle(0x000000, flash ? 0 : 0.55); this.bg.fillRect(0, 0, W, H);
    const sc = 5.2 + k * 0.5, cx = W / 2 - 10, cy = 178;
    this.closeUp(cx, cy, sc, t);
    this.hero.setTint(flash ? 0xffffff : 0xd0d0e8);
    const [hx, hy] = this.headOf(this.def);
    for (const ex of [35, 39]) {                                                       // the tears, running from her eyes
      const x = cx + (ex - hx) * sc + sc / 2, y0 = cy + (14 - hy) * sc, len = Math.min(90, s * 0.6 + (ex === 39 ? 10 : 0));
      this.fx.fillStyle(0x060408, 0.95); this.fx.fillRect(x - sc * 0.35, y0, sc * 0.7, len);
      this.fx.fillCircle(x, y0 + len, sc * 0.5);
      const drop = (s * 2.2 + ex * 9) % 140; if (drop > len) { this.fx.fillCircle(x, y0 + drop, sc * 0.35); }
    }
    for (let i = 0; i < 60; i++) { const sp = this.spots[i % 40]; if ((i + Math.floor(sp[0] * 7)) % 3) continue; this.front.fillStyle(0xf6f2e6, 0.07); this.front.fillRect((sp[0] * W + i * 11) % W, 0, 2, H); }   // the veil's lace across the shot
    if (s === 90) { sfx('bighit', 0.4, 0.4); this.cameras.main.shake(200, 0.005); }
    if (s > 110) this.dvText(0, 'I WAITED FOR YOU.', W / 2, 286, 9, '#e8e0f0', { a: Math.min(1, (s - 110) / 20), stroke: '#000000', sw: 3 });
    this.vignette(this.over, 0.75);
  }
  /** [380] The vows at the altar: one of the beaten stands as the groom; she raises the knife. */
  shot_dv_bride_vows(t, k, s) {
    this.dvChapel(this.bg, t);
    this.bg.fillStyle(0x000000, 0.35); this.bg.fillRect(0, 0, W, H);
    const l = this.losers.find((x) => x.def); this.hideLosers();
    if (l) l.s.setCrop().setPosition(410, 306).setScale(3).setRotation(0).setAlpha(1).setTintMode(Phaser.TintModes.FILL).setTint(0x05040a).setFlipX(!l.def.facesLeft).setVisible(true);
    if (s < 50) this.dvPose('', 'idle', s / 6, 250, 306, 3);
    else this.dvMove('', 'upb', Math.min(9, (s - 50) / 4), 250, 306, 3);
    this.hero.setTint(0xd8d8e8);
    const T1 = 'DO YOU TAKE THIS HAND...', T2 = '...TILL DEATH?', n1 = Math.floor(s / 1.5), n2 = Math.floor((s - 50) / 2);
    this.dvText(0, T1.slice(0, n1), W / 2, 70, 10, '#f6f2e6', { stroke: '#000000', sw: 3 });
    if (n2 > 0) this.dvText(1, T2.slice(0, n2), W / 2, 92, 12, '#c8202a', { stroke: '#000000', sw: 4 });
    this.vignette(this.over, 0.7);
  }
  /** [470] Three cuts as the bell tolls: inverted impact frames, a red slash across the screen each time. */
  shot_dv_bride_cuts(t, k, s) {
    const c = Math.floor(s / 30), d = s % 30, inv = c % 2 === 0;
    const bgc = inv ? 0xf6f2e6 : 0x000000, fg = inv ? 0x000000 : 0xf6f2e6;
    this.bg.fillStyle(bgc, 1); this.bg.fillRect(0, 0, W, H);
    const l = this.losers[Math.min(c, this.losers.length - 1)] || this.losers[0]; this.hideLosers();
    if (l && l.def) l.s.setCrop().setPosition(380 + d * 1.5, 300).setScale(3).setRotation(0.05 * d).setAlpha(1).setTintMode(Phaser.TintModes.FILL).setTint(fg).setFlipX(!l.def.facesLeft).setVisible(true);
    this.dvMove('', ['ftilt', 'fsmash', 'fair'][c % 3], 2 + Math.min(6, d / 2), 260 - (2 - c) * 6, 300, 3);
    this.hero.setTintMode(Phaser.TintModes.FILL).setTint(fg);
    const a = [-0.5, 0.35, -0.15][c % 3], len = Math.min(1, d / 4) * 520;
    this.front.lineStyle(10 - d * 0.3, 0x9a0a1a, Math.max(0, 1 - d / 26)); this.front.lineBetween(W / 2 - Math.cos(a) * len / 2, 180 - Math.sin(a) * len / 2, W / 2 + Math.cos(a) * len / 2, 180 + Math.sin(a) * len / 2);
    for (let i = 0; i < 14; i++) { const sp = this.spots[i + c * 5], r = d * (3 + sp[0] * 4); this.front.fillStyle(0x9a0a1a, Math.max(0, 1 - d / 24)); this.front.fillCircle(400 + Math.cos(sp[1] * 6.28) * r, 220 + Math.sin(sp[1] * 6.28) * r * 0.6 + d * d * 0.05, 2 + sp[2] * 3); }
    if (d === 0) { sfx('slash', 0.8, 0.7 - c * 0.08); sfx('hit', 0.6, 0.6); this.cameras.main.shake(140, 0.012); }
  }
  /** [560] Slow motion: the bouquet of dead roses arcs through the dark nave, petals scattering over the slumped guests. */
  shot_dv_bride_bouquet(t, k, s) {
    this.dvChapel(this.bg, t);
    this.bg.fillStyle(0x000000, 0.45); this.bg.fillRect(0, 0, W, H);
    this.posLosers([[150, 266, 1.4, 0.5, 0.95, 1], [500, 266, 1.4, -0.6, 0.95, 1], [196, 218, 1.0, 0.7, 0.9, 1]], 0x05040a);
    this.hero.setVisible(false);
    const p = s / 130, bx = 120 + p * 400, by = 140 - Math.sin(p * Math.PI) * 60 + p * 80, rot = s * 0.04, Z = 2;   // the bouquet, tumbling slowly (big: we're close)
    this.glow(this.mid, bx, by, 30 * Z, 0xffd0d8, 0.15);
    for (let i = 0; i < 3; i++) { this.fx.lineStyle(2, 0x2a3a1a, 1); this.fx.lineBetween(bx, by, bx + Math.cos(rot + 1.6 + i * 0.2) * 22 * Z, by + Math.sin(rot + 1.6 + i * 0.2) * 22 * Z); }
    for (let i = 0; i < 7; i++) { const q = rot + i * 0.9, r = (6 + (i % 3) * 2) * Z; this.fx.fillStyle([0x3a0a14, 0x5a1420, 0x7a2030][i % 3], 1); this.fx.fillCircle(bx + Math.cos(q) * r, by + Math.sin(q) * r, 5 * Z); this.fx.fillStyle(0x9a3040, 1); this.fx.fillCircle(bx + Math.cos(q) * r - Z, by + Math.sin(q) * r - Z, 2 * Z); this.fx.lineStyle(1, 0x1a0408, 0.8); this.fx.strokeCircle(bx + Math.cos(q) * r, by + Math.sin(q) * r, 3 * Z); }
    this.fx.fillStyle(0xf6f2e6, 1); this.fx.fillRect(bx - 3 * Z, by + 2 * Z, 6 * Z, 3 * Z); this.fx.fillTriangle(bx, by + 4 * Z, bx - 8 * Z, by + 16 * Z, bx - 2 * Z, by + 14 * Z);     // its ribbon
    this.dvPetals(this.front, t, 30, 0.9, 0.5);
    if (s === 0) sfx('whoosh', 0.4, 0.4);
    this.vignette(this.over, 0.75);
  }
  /** [690] The last tableau: she stands at the altar under the broken rose window, moonlight on her, the guests still. */
  shot_dv_bride_tableau(t, k, s) {
    const g = this.bg, z = 1 + ease(s / 210) * 0.12;
    g.fillStyle(0x08080e, 1); g.fillRect(0, 0, W, H);
    const rx = W / 2, ry = 118;                                                       // the rose window, half its glass gone
    for (let i = 0; i < 12; i++) {
      const a1 = i * Math.PI / 6, a2 = a1 + Math.PI / 6;
      if (this.spots[i][0] > 0.35) { g.fillStyle([0x3a1a4a, 0x1a2a5a, 0x5a1a2a, 0x2a3a5a][i % 4], 1); g.slice(rx, ry, 70, a1, a2, false); g.fillPath(); }
    }
    g.lineStyle(3, 0x2a2836, 1); g.strokeCircle(rx, ry, 70); g.strokeCircle(rx, ry, 24);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineBetween(rx + Math.cos(a) * 24, ry + Math.sin(a) * 24, rx + Math.cos(a) * 70, ry + Math.sin(a) * 70); }
    this.mid.fillStyle(0xc8d8ff, 0.08); this.mid.fillTriangle(rx - 50, ry, rx + 50, ry, rx + 130, 300); this.mid.fillTriangle(rx - 50, ry, rx + 130, 300, rx - 130, 300);   // moonlight pouring through
    g.fillStyle(0x16141e, 1); g.fillRect(0, 290, W, 70); g.fillStyle(0x3a0a10, 1); g.fillRect(rx - 40, 290, 80, 70);
    g.fillStyle(0x22202c, 1); g.fillRect(rx - 90, 262, 180, 28);                       // the altar step
    this.posLosers([[110, 312, 1.8, 1.45, 0.95], [540, 314, 1.8, -1.45, 0.95], [430, 318, 1.6, 1.5, 0.95]], 0x05040a);
    this.dvPose('', 'idle', s / 6, rx, 290, 3.2 * z);
    this.hero.setTint(0xd8e0ff);
    this.dvPetals(this.fx, t, 22, 0.8, 0.4);
    if (s === 0) sfx('ding', 0.3, 0.4);
    this.vignette(this.over, 0.65);
  }

  // ================================================================= EMBER SAINT - MARTYRDOM
  /** The ruined cathedral: black pillars, tall dim windows, a stone floor. glass = 0-1 how much of the windows is left. */
  dvNave(g, t, glow = 0, glass = 1) {
    this.sky(g, 0x0a0406, Phaser.Display.Color.GetColor(40 + glow * 120, 10 + glow * 40, 6), 10);
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 140, top = 60, w = 46, h = 170;
      if (glass > this.spots[i][0] * 0.9) { g.fillStyle([0x5a1a1a, 0x5a3a0a, 0x3a1a4a, 0x5a1a1a, 0x5a3a0a][i], 0.8 + glow * 0.2); g.fillRect(x - w / 2, top, w, h); g.fillEllipse(x, top, w, w * 0.9); }
      g.fillStyle(0x060304, 1); g.fillRect(x - 1, top - 20, 2, h + 20); g.fillRect(x - w / 2, top + 60, w, 2);
    }
    for (let i = 0; i < 6; i++) { g.fillStyle(0x0c0606, 1); g.fillRect(-10 + i * 132, 0, 26, H); }   // pillars
    g.fillStyle(0x140a08, 1); g.fillRect(0, 300, W, 60);
    g.fillStyle(0x2a1610, 1); for (let x = 0; x < W; x += 48) g.fillRect(x, 300, 1, 60);
  }
  /** The pyre: a stack of logs under her. */
  dvPyre(g, x, y) {
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) {
      const lx = x - (5 - r) * 18 + i * 36 + r * 0, ly = y - r * 10;
      g.fillStyle(r % 2 ? 0x3a2216 : 0x4a2a1a, 1); g.fillRect(lx - 16, ly - 9, 32, 9); g.fillStyle(0x6a4a30, 1); g.fillCircle(lx + 16, ly - 4.5, 4.5);
    }
  }
  /** Fire: flickering tongues rising from a line, h tall. */
  dvFire(g, x, y, w, h, t, a = 1) {
    for (let i = 0; i < 26; i++) {
      const sp = this.spots[i % 40], fx = x - w / 2 + sp[0] * w, ph = (t * (0.12 + sp[2] * 0.1) + sp[1] * 6.28), fh = h * (0.5 + 0.5 * Math.abs(Math.sin(ph))) * (0.6 + sp[2] * 0.6);
      const fw = 10 + sp[1] * 16;
      g.fillStyle(0xa81808, 0.7 * a); g.fillTriangle(fx - fw, y, fx + fw, y, fx + Math.sin(ph) * 8, y - fh);
      g.fillStyle(0xff6a10, 0.8 * a); g.fillTriangle(fx - fw * 0.6, y, fx + fw * 0.6, y, fx + Math.sin(ph) * 6, y - fh * 0.75);
      g.fillStyle(0xffe070, 0.9 * a); g.fillTriangle(fx - fw * 0.3, y, fx + fw * 0.3, y, fx + Math.sin(ph) * 4, y - fh * 0.45);
    }
  }
  /** Embers swirling up. */
  dvEmbers(g, t, n, a = 1, y0 = H) {
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i % 40], y = y0 - ((t * (1 + sp[2] * 2) + sp[1] * 400 + i * 23) % (y0 + 20)), x = sp[0] * W + Math.sin(t * 0.05 + i) * 14;
      g.fillStyle(i % 3 ? 0xff9a20 : 0xffe070, a * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.2 + i)))); g.fillRect(x, y, 2, 2);
    }
  }
  /** [0] The pyre: she stands on it, still, while the beaten close in with torches; her heart beats. */
  shot_dv_ember_pyre(t, k, s) {
    this.dvNave(this.bg, t, 0.05);
    this.dvPyre(this.mid, W / 2, 300);
    this.dvPose('', 'idle', s / 6, W / 2, 262, 3);
    const p = ease(s / 180);
    this.posLosers([[80 + p * 110, 302, 2.2, 0, 1], [560 - p * 110, 302, 2.2, 0, 1], [30 + p * 70, 306, 2.0, 0, 0.9]], 0x080404);
    this.losers.forEach((l, i) => {                                                    // their torches
      if (!l.s.visible) return;
      const x = l.s.x + (i === 1 ? -22 : 22), y = l.s.y - 70;
      this.fx.lineStyle(3, 0x3a2216, 1); this.fx.lineBetween(x, y, x - (i === 1 ? -6 : 6), y + 28);
      this.glow(this.mid, x, y - 6, 30, 0xff6a10, 0.3); this.dvFire(this.fx, x, y, 10, 22, t + i * 30);
    });
    const beat = (s % 30) < 4 ? 1 : 0;
    this.vignette(this.over, 0.75 + beat * 0.15);
    if (s % 30 === 0) this.cameras.main.shake(60, 0.002);
  }
  /** [180] The torches fall; the pyre catches; the fire climbs over her - and close on her face, her eyes burning through. */
  shot_dv_ember_ignite(t, k, s) {
    this.dvNave(this.bg, t, 0.2 + k * 0.5);
    if (s < 90) {
      this.dvPyre(this.mid, W / 2, 300);
      this.dvPose('', 'idle', s / 6, W / 2, 262, 3);
      this.posLosers([[190, 302, 2.2, 0, 1], [450, 302, 2.2, 0, 1], [100, 306, 2.0, 0, 0.9]], 0x080404);
      const h = 20 + s * 2.4;
      this.glow(this.mid, W / 2, 280, 80 + s, 0xff6a10, 0.35);
      this.dvFire(this.fx, W / 2, 304, 220, h, t); this.dvEmbers(this.fx, t, 30, 1, 300);
      if (s === 0) { sfx('flame', 0.8, 0.7); sfx('whoosh', 0.5, 0.5); }
    } else {
      const d = s - 90, sc = 6.6;
      this.hideLosers();
      this.bg.fillStyle(0x140604, 0.8); this.bg.fillRect(0, 0, W, H);
      this.closeUp(W / 2, 172, sc, t);
      this.hero.setTint(Phaser.Display.Color.GetColor(255, 200 + Math.sin(t * 0.3) * 30, 160));
      const [hx, hy] = this.headOf(this.def);
      for (const ex of [35, 39]) { const x = W / 2 + (ex - hx) * sc + sc, y = 172 + (12.5 - hy) * sc; this.glow(this.fx, x, y, 16 + d * 0.15, 0xffd040, 0.55); }   // her eyes, burning
      this.glow(this.mid, W / 2 + (36 - hx) * sc, 172 + (1 - hy) * sc, 70 + Math.sin(t * 0.2) * 6, 0xffe070, 0.45);   // the halo, blazing
      this.dvFire(this.front, W / 2, H - 34, W + 100, 60 + d * 1.6, t, 0.9); this.dvEmbers(this.front, t, 40);
    }
    this.vignette(this.over, 0.6);
  }
  /** [360] She rises out of the fire as the burning DROWNED; the windows burst; a shockwave throws the beaten back. */
  shot_dv_ember_ascend(t, k, s) {
    const g = this.bg, burst = s >= 4;
    this.dvNave(g, t, 0.8, burst ? Math.max(0, 1 - s / 30) : 1);
    if (s === 0) { this.flash = 6; sfx('bighit', 1, 0.5); sfx('flame', 0.8, 0.5); this.cameras.main.shake(400, 0.02); }
    const y = 310 - ease(s / 160) * 60;
    this.glow(this.mid, W / 2, y - 60, 140, 0xff6a10, 0.4);
    this.dvRays(this.mid, W / 2, y - 70, 16, 500, t * 0.004, 0xffb040, 0.08);
    this.dvPose('drowned', 'idle', s / 6, W / 2, y, 3.4);
    for (let i = 0; i < 30; i++) {                                                      // the stained glass, blown out as embers
      const sp = this.spots[i % 40], wx = 40 + (i % 5) * 140, d = Math.max(0, s - 4);
      this.fx.fillStyle([0xff5a0a, 0xffe070, 0xa83a4a, 0x8a6ad8][i % 4], Math.max(0, 1 - d / 120)); this.fx.fillRect(wx + (sp[0] - 0.5) * d * 3, 140 + (sp[1] - 0.6) * d * 2 + d * d * 0.01, 3, 3);
    }
    if (s < 40) { this.front.lineStyle(6 - s * 0.14, 0xffe070, 1 - s / 40); this.front.strokeCircle(W / 2, 260, s * 14); }
    this.posLosers([[150 - s * 0.4, 312, 2.0, -1.4, 1], [490 + s * 0.4, 312, 2.0, 1.4, 1], [80, 316, 1.8, -1.5, 0.9]], 0x080404);
    this.dvFire(this.front, W / 2, H - 34, W + 100, 70 - k * 30, t, 1 - k * 0.5);
    this.dvEmbers(this.fx, t, 40);
    this.vignette(this.over, 0.5);
  }
  /** [560] She hangs in a shaft of light over the beaten, kneeling in falling ash, the white-hot blade at her side. */
  shot_dv_ember_judgment(t, k, s) {
    const g = this.bg;
    this.dvNave(g, t, 0.35, 0);
    this.mid.fillStyle(0xffe8a0, 0.1); this.mid.fillTriangle(W / 2 - 40, 0, W / 2 + 40, 0, W / 2 + 140, 300); this.mid.fillTriangle(W / 2 - 40, 0, W / 2 + 140, 300, W / 2 - 140, 300);
    const bob = Math.sin(s * 0.04) * 6;
    this.glow(this.mid, W / 2, 180 + bob, 110, 0xff9a20, 0.3);
    this.dvPose('drowned', 'idle', s / 6, W / 2, 262 + bob, 2.8);
    this.posLosers([[170, 304, 1.8, 0.1, 1, 1], [470, 304, 1.8, -0.1, 1, 1], [320, 314, 1.7, 0, 1, 1]], 0x160806);   // the beaten, kneeling in a ring
    for (let i = 0; i < 40; i++) { const sp = this.spots[i]; const x = (sp[0] * W + Math.sin(t * 0.01 + i) * 20) % W, y = (sp[1] * H + t * (0.3 + sp[2] * 0.4)) % H; this.front.fillStyle(0x8a8478, 0.6); this.front.fillRect(x, y, 2, 2); }   // ash, falling
    this.dvEmbers(this.fx, t, 20, 0.8, 300);
    this.vignette(this.over, 0.6);
  }
}

