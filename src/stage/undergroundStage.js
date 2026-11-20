// "THE UNDERGROUND": an underground rap and rock show deep under the city. A floating stage deck hangs over the mosh
// pit with a GIANT speaker stack in the middle and two big ones beside it (scenery - not platforms), tonight's act
// performing on them, a giant ring of crowd round it all cheering, jumping and waving banners, stage lights sweeping
// through the haze. Who performs rotates every fight (`ACTS`): the rapper BLACKTOP sitting on the giant speaker, or the
// four-piece band COFFIN NAILS (drummer up on the stack, singer, guitarist and bassist on the side speakers). No hazards.
//
// THE OPENING (startIntro / introStep / skipIntro / introCam - MatchScene runs them before the countdown, the same
// hooks as a boss intro): a grimy little room up at street level, a light bulb swinging to the bass coming up through
// the floor; the door creaks open, someone walks in and goes down the hatch in the floor; the camera pulls far back -
// the room is a shack on a city street - and sinks down the stairwell through the earth into the cavern: THE
// UNDERGROUND. The announcer welcomes everyone and calls tonight's fighters (on screen; voiced when the game's name
// calls are on - speechPolicy.js), then a flash cuts to the act on stage and the music kicks in. A fresh press skips.
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { announce } from '../audio/announcer.js';
import { settings } from '../settings.js';

export const PAL = {
  void: 0x07050a, rock0: 0x0d0a11, rock1: 0x17111b, rock2: 0x221a27, rock3: 0x2f2534,
  con0: 0x26232b, con1: 0x37333d, con2: 0x4c4753, con3: 0x67616e,
  steel0: 0x2b2f38, steel1: 0x464c58, steel2: 0x737c8c, steel3: 0xaab2c0,
  tolex: 0x141418, tolex2: 0x24242b, grille: 0x1c1c22, cone: 0x101013, cone2: 0x34343d, corner: 0x9ba2ad,
  red: 0xe23a46, red2: 0x8e1d2a, teal: 0x2fd8c4, gold: 0xf2c14a, purple: 0xa04ae6, pink: 0xff4fa8, amber: 0xffa83a,
  hazard: 0xf2c12e, white: 0xf1eef4, black: 0x09090c,
  earth0: 0x2a1d16, earth1: 0x3a281d, earth2: 0x4a3424, earth3: 0x5e4430,
  sky0: 0x0a0c1e, sky1: 0x121633, sky2: 0x1b2148, sky3: 0x2a2c5c, asphalt: 0x1d1d22,
};
// the music's tempo (Concrete Grudge, tools/audio/underground_music.py): frames per beat at 60 fps - everything bobs to it
const BEAT = 3600 / 168;
// the crowd ring behind the stage (tiers of people): centre, rows, how far each row reaches round, how it rakes upward
const RING = { cy: 120, rows: 11, rx: 290, rxStep: 40, ry: 64, ryStep: 15, rake: 13, gap: 9 };
// where the floating stage deck is; the speakers on it (scenery): the giant one in the middle, the big ones beside it
const DECK = { x1: -250, x2: 250, bottom: 38 };
const BIG = { x: -72, w: 144, h: 150 };
const SIDE = { w: 80, h: 92, at: 150 };
// tonight's acts, one per fight in turn (saved as rebirth.underground): name card text and colour
const ACTS = [
  { id: 'rapper', name: 'BLACKTOP', tag: 'LIVE ON THE BIG STACK', color: '#ff4a5a' },
  { id: 'band', name: 'COFFIN NAILS', tag: 'LIVE FROM THE PIT', color: '#3fe0cc' },
];
// the opening, in frames: the room, the pull-back + descent, the announcer, the flash to the act (then the countdown)
const OPEN = { room: 230, pull: 250, announce: 300, act: 150, roomY: -1180 };
// the stage lights: how many beams, how fast they sweep, their colours
const LIGHTS = { n: 6, speed: 0.013, colors: [PAL.red, PAL.purple, PAL.teal, PAL.amber, PAL.pink, PAL.red] };
// banners held up in the crowd: how many, how big
const BANNERS = { n: 9, w: 34, h: 22 };

/** A pseudo-random number 0..1 from a seed (the art is the same every time, and doesn't touch Math.random). */
function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
/** Eases 0..1 in and out. */
const io = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

/** Which act plays this fight (and, outside the title demo, moves the rotation on for the next one). */
function nextAct(advance) {
  let n = 0;
  try { n = parseInt(localStorage.getItem('rebirth.underground') || '0', 10) || 0; if (advance) localStorage.setItem('rebirth.underground', String(n + 1)); } catch (e) { /* storage off: always the first act */ }
  return ACTS[n % ACTS.length];
}

/** A thick pixel line from (x1, y1) to (x2, y2): w x w blocks stepped along it (limbs, guitar necks, drumsticks). */
function seg(g, x1, y1, x2, y2, w, c) {
  const d = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)), n = Math.max(1, Math.ceil(d));
  g.fillStyle(c, 1);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(lerp(x1, x2, i / n) - w / 2), Math.round(lerp(y1, y2, i / n) - w / 2), w, w);
}

/** The end of a two-part limb: from (x, y), `a` degrees (0 = right, 90 = down) for length `l`. */
/** A stand-in for a Graphics that draws everything shifted by (dx, dy) in one dark colour: drawing a figure through
 *  it four times (left, right, up, down) before the real thing gives it a 1 px outline. */
function outline(g, dx, dy) {
  return {
    fillStyle: () => g.fillStyle(0x050407, 1),
    fillRect: (x, y, w, h) => g.fillRect(x + dx, y + dy, w, h),
    fillCircle: (x, y, r) => g.fillCircle(x + dx, y + dy, r),
    fillPoints: (pts, c) => g.fillPoints(pts.map((p) => ({ x: p.x + dx, y: p.y + dy })), c),
    lineStyle: () => g.lineStyle(1, 0x050407, 1),
    lineBetween: (a, b, c, d) => g.lineBetween(a + dx, b + dy, c + dx, d + dy),
  };
}

const reach = (x, y, a, l) => ({ x: x + Math.cos(a * Math.PI / 180) * l, y: y + Math.sin(a * Math.PI / 180) * l });

/** THE UNDERGROUND: one floating deck, scenery that moves to the beat, tonight's act, and its own opening. */
export class UndergroundStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [{ x1: DECK.x1, x2: DECK.x2, y: 0, solid: true, bottom: DECK.bottom }];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -55, y: 0 }, { x: 55, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_underground';
    this.holdMusic = true;                                     // (the opening starts the music on the flash to the act)
    this.act = nextAct(!scene.demo);
    this.t = 0;
  }

  // ---------------------------------------------------------------- drawing
  /** Builds the cavern, the crowd ring (pre-drawn into textures, two poses), the deck and speakers, and the layers that move. */
  draw(worldLayer, bgLayer) {
    const s = this.scene;
    const base = s.add.graphics().setScrollFactor(0);
    base.fillStyle(PAL.void, 1); base.fillRect(0, 0, VIEW_W, VIEW_H);
    bgLayer.push(base);

    const back = s.add.graphics();
    this.paintSurface(back);
    this.paintCavern(back);
    worldLayer.push(back);
    this.lightG = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);   // beams behind the crowd, through the haze
    worldLayer.push(this.lightG);
    this.bannerBackG = s.add.graphics(); worldLayer.push(this.bannerBackG);
    // the crowd: the back half of the ring (behind the stage) in two poses, flipped on the beat
    this.crowd = [];
    for (const half of ['back', 'front']) {
      const imgs = [0, 1].map((pose) => {
        const key = `ug_crowd_${half}_${pose}`;
        if (!s.textures.exists(key)) this.bakeCrowd(key, half, pose);
        const b = this.crowdBox(half);
        return s.add.image(b.x, b.y, key).setOrigin(0).setVisible(pose === 0);
      });
      this.crowd.push(imgs);
      worldLayer.push(...imgs);
      if (half === 'back') { this.bannerG = s.add.graphics(); worldLayer.push(this.bannerG); }
    }
    this.hazeG = s.add.graphics(); worldLayer.push(this.hazeG);
    // the deck and the speakers on it, their pumping cones, and tonight's act
    const deck = s.add.graphics();
    this.paintDeck(deck);
    this.paintSpeakers(deck);
    worldLayer.push(deck);
    this.coneG = s.add.graphics(); worldLayer.push(this.coneG);
    this.actG = s.add.graphics(); worldLayer.push(this.actG);
    this.frontG = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD); worldLayer.push(this.frontG);   // deck lights
    this.animate();
  }

  /** The night street up top and the shack the opening starts in, the earth under it and the stairwell down. */
  paintSurface(g) {
    const Y = OPEN.roomY;
    const sky = [PAL.sky0, PAL.sky0, PAL.sky1, PAL.sky1, PAL.sky2, PAL.sky3];
    sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(-1800, Y - 760 + i * 110, 3600, 112); });
    for (let i = 0; i < 90; i++) { g.fillStyle(PAL.white, 0.3 + hash(i) * 0.6); g.fillRect(-1700 + hash(i + 3) * 3400, Y - 760 + hash(i + 7) * 400, 1, 1); }
    // the skyline: towers with lit windows either side of the street
    for (let i = 0; i < 34; i++) {
      const x = -1700 + i * 100 + hash(i) * 30, w = 50 + hash(i + 1) * 60, h = 90 + hash(i + 2) * 260;
      if (Math.abs(x + w / 2) < 230) continue;
      g.fillStyle(i % 2 ? 0x0d0f20 : 0x111428, 1); g.fillRect(x, Y - h, w, h);
      for (let wy = Y - h + 8; wy < Y - 10; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 9)
        if (hash(wx * 3.1 + wy) > 0.72) { g.fillStyle(hash(wx + wy) > 0.5 ? 0xf2d27a : 0x8fb0e8, 0.8); g.fillRect(wx, wy, 3, 4); }
    }
    // the street, a lamp post, then the earth: strata, rocks and roots, pipes, down to the cavern's ceiling
    g.fillStyle(PAL.asphalt, 1); g.fillRect(-1800, Y, 3600, 14);
    g.fillStyle(0x3a3a44, 1); g.fillRect(-1800, Y, 3600, 2);
    for (let x = -1760; x < 1800; x += 80) { g.fillStyle(0xd8c86a, 0.5); g.fillRect(x, Y + 7, 34, 2); }
    g.fillStyle(PAL.steel1, 1); g.fillRect(-330, Y - 120, 4, 120); g.fillRect(-330, Y - 120, 26, 4);
    g.fillStyle(0xffe6a0, 0.9); g.fillRect(-308, Y - 117, 8, 4);
    const strata = [PAL.earth3, PAL.earth2, PAL.earth1, PAL.earth2, PAL.earth1, PAL.earth0, PAL.rock2, PAL.rock1];
    for (let y = Y + 14, i = 0; y < -540; y += 80, i++) {
      g.fillStyle(strata[Math.min(i, strata.length - 1)], 1); g.fillRect(-1800, y, 3600, 81);
      for (let k = 0; k < 40; k++) { g.fillStyle(strata[Math.min(i + 1, strata.length - 1)], 1); g.fillRect(-1800 + hash(i * 50 + k) * 3600, y + hash(k + i) * 70, 6 + hash(k * 2 + i) * 18, 4 + hash(k * 3) * 6); }
    }
    g.fillStyle(0x5a3e2a, 1);
    for (let k = 0; k < 18; k++) { const x = -900 + hash(k + 400) * 1800; seg(g, x, Y + 14, x + (hash(k) - 0.5) * 30, Y + 40 + hash(k + 9) * 40, 2, 0x5a3e2a); }
    g.fillStyle(PAL.steel0, 1); g.fillRect(-1800, Y + 60, 3600, 10); g.fillStyle(PAL.steel1, 1); g.fillRect(-1800, Y + 60, 3600, 2);
    g.fillStyle(PAL.steel0, 1); g.fillRect(-1800, Y + 300, 3600, 14); g.fillStyle(0x6a4a2a, 1); g.fillRect(-1800, Y + 300, 3600, 3);
    // the stairwell: a concrete shaft from the hatch down to the cavern, flights zig-zagging, a caged bulb per landing
    const sx = 40, sw = 64;
    g.fillStyle(PAL.con0, 1); g.fillRect(sx - 4, Y, sw + 8, -540 - Y);
    g.fillStyle(PAL.rock0, 1); g.fillRect(sx, Y, sw, -540 - Y);
    for (let y = Y + 10, k = 0; y < -560; y += 48, k++) {
      const l = k % 2 ? sx + sw - 6 : sx + 6, r = k % 2 ? sx + 6 : sx + sw - 6;
      for (let st = 0; st < 8; st++) { g.fillStyle(PAL.con2, 1); g.fillRect(Math.round(lerp(l, r, st / 8)) - 3, y + st * 6, 7, 2); }
      g.fillStyle(PAL.con1, 1); g.fillRect(sx, y + 46, sw, 3);
      g.fillStyle(0xffd27a, 0.85); g.fillRect(sx + sw / 2 - 1, y + 2, 3, 3);
    }
    // the shack: concrete walls, a roof slab, a door on the left, graffiti, a hatch in the floor
    const x1 = -120, x2 = 120, top = Y - 112;
    g.fillStyle(PAL.con3, 1); g.fillRect(x1 - 8, top - 10, x2 - x1 + 16, 10);
    g.fillStyle(PAL.con1, 1); g.fillRect(x1 - 8, top, 8, Y - top); g.fillRect(x2, top, 8, Y - top);
    g.fillStyle(PAL.con0, 1); g.fillRect(x1, top, x2 - x1, Y - top);
    for (let y = top + 4; y < Y; y += 9) { g.fillStyle(PAL.con1, 0.5); g.fillRect(x1, y, x2 - x1, 1); }
    g.fillStyle(0x5a2a2a, 0.5); g.fillRect(x1 + 6, Y - 40, x2 - x1 - 12, 3);                    // a water stain line
    this.tag(g, 10, Y - 92, PAL.red, 'UG');
    this.tag(g, -40, Y - 60, PAL.teal, 'X');
    g.fillStyle(PAL.black, 1); g.fillRect(-104, Y - 74, 38, 74);                                   // the doorway (black outside)
    g.fillStyle(PAL.steel1, 1); g.fillRect(-108, Y - 78, 46, 4); g.fillRect(-108, Y - 78, 4, 78); g.fillRect(-66, Y - 78, 4, 78);
    g.fillStyle(0x0c0c14, 1); g.fillRect(-104, Y - 74, 38, 74);
    g.fillStyle(0xffe6a0, 0.2); g.fillRect(-104, Y - 12, 38, 12);                                  // streetlight on the step
    g.fillStyle(PAL.rock0, 1); g.fillRect(sx, Y - 2, sw, 4);                                       // the hatch (open)
    g.fillStyle(PAL.steel2, 1); g.fillRect(sx - 6, Y - 2, 6, 3); g.fillRect(sx + sw, Y - 2, 6, 3);
    g.fillStyle(PAL.con2, 1); g.fillRect(x1, Y - 3, sx - x1, 3); g.fillRect(sx + sw, Y - 3, x2 - sx - sw, 3);
    // a few crates and a flyer on the wall
    g.fillStyle(0x5a3e24, 1); g.fillRect(-48, Y - 18, 22, 18); g.fillStyle(0x7a5630, 1); g.fillRect(-48, Y - 18, 22, 3); g.fillRect(-46, Y - 14, 2, 14);
    g.fillStyle(PAL.white, 0.8); g.fillRect(-20, Y - 72, 14, 18); g.fillStyle(PAL.red, 1); g.fillRect(-18, Y - 70, 10, 6);
  }

  /** Spray-paint letters (a blocky, drippy tag): 'U', 'G' or 'X' at (x, y). */
  tag(g, x, y, c, text) {
    const L = { U: ['1001', '1001', '1001', '1001', '0110'], G: ['0111', '1000', '1011', '1001', '0111'], X: ['1001', '0110', '0110', '1001', '1001'] };
    let cx = x;
    for (const ch of text) {
      const rows = L[ch] || L.X;
      rows.forEach((r, j) => [...r].forEach((b, i) => { if (b === '1') { g.fillStyle(c, 0.85); g.fillRect(cx + i * 4, y + j * 4, 4, 4); if (j === 4 && (i + j) % 2) g.fillRect(cx + i * 4 + 1, y + 20, 2, 5 + i); } }));
      cx += 20;
    }
  }

  /** The cavern: rough rock walls, a concrete ceiling with beams and pipes, graffiti walls, the hanging banners and lighting truss. */
  paintCavern(g) {
    g.fillStyle(PAL.rock0, 1); g.fillRect(-1800, -560, 3600, 1500);
    // a vaulted back wall of old concrete, arches lit from below
    for (let i = -6; i <= 6; i++) {
      const x = i * 170;
      g.fillStyle(i % 2 ? PAL.rock1 : PAL.rock2, 1); g.fillRect(x - 80, -520, 160, 400);
      g.fillStyle(PAL.rock0, 1); g.fillRect(x - 60, -470, 120, 320);
      g.fillStyle(PAL.rock1, 1); g.fillRect(x - 60, -470, 120, 6);
      g.fillStyle(PAL.rock3, 1); g.fillRect(x - 84, -520, 8, 400); g.fillRect(x + 76, -520, 8, 400);
    }
    // graffiti on the pillars: big drippy blocks of colour
    const cols = [PAL.red, PAL.teal, PAL.gold, PAL.purple, PAL.pink];
    for (let i = 0; i < 16; i++) {
      const x = -1000 + hash(i + 70) * 2000, y = -380 + hash(i + 71) * 140, c = cols[i % cols.length];
      g.fillStyle(c, 0.35); g.fillRect(x, y, 30 + hash(i) * 50, 10 + hash(i + 2) * 14);
      for (let d = 0; d < 4; d++) g.fillRect(x + 4 + d * 11, y + 10, 2, 6 + hash(i * 4 + d) * 16);
    }
    // the ceiling: a concrete slab with beams, pipes along it, chains hanging
    g.fillStyle(PAL.con0, 1); g.fillRect(-1800, -600, 3600, 70);
    g.fillStyle(PAL.con1, 1); g.fillRect(-1800, -536, 3600, 6);
    for (let x = -1700; x < 1800; x += 140) { g.fillStyle(PAL.con1, 1); g.fillRect(x, -600, 22, 84); g.fillStyle(PAL.con2, 1); g.fillRect(x, -600, 4, 84); }
    g.fillStyle(PAL.steel0, 1); g.fillRect(-1800, -520, 3600, 8); g.fillStyle(PAL.steel1, 1); g.fillRect(-1800, -520, 3600, 2);
    g.fillStyle(0x5a3a22, 1); g.fillRect(-1800, -508, 3600, 5);
    for (let x = -900; x < 900; x += 75) for (let y = -506; y < -440 - hash(x) * 40; y += 6) { g.fillStyle(PAL.steel1, 1); g.fillRect(x + (y / 6 % 2 ? 0 : 1), y, 2, 4); }
    // the big hanging banner over the stage: THE UNDERGROUND, and the lighting truss in front of it
    g.fillStyle(PAL.black, 1); g.fillRect(-170, -470, 340, 62);
    g.fillStyle(PAL.red2, 1); g.fillRect(-166, -466, 332, 54);
    g.fillStyle(PAL.black, 1); for (let x = -166; x < 166; x += 12) g.fillRect(x, -414, 6, 6);
    g.fillStyle(PAL.steel1, 1); g.fillRect(-150, -500, 2, 30); g.fillRect(148, -500, 2, 30);
    const tx = this.scene.add.text(0, -440, 'THE UNDERGROUND', { fontFamily: FONT, fontSize: '16px', color: '#f1eef4', stroke: '#09090c', strokeThickness: 4 }).setOrigin(0.5);
    this.scene.addWorld(tx);
    const tr = (y) => { g.fillStyle(PAL.steel1, 1); g.fillRect(-520, y, 1040, 3); g.fillRect(-520, y + 12, 1040, 3); for (let x = -520; x < 520; x += 14) seg(g, x, y + 2, x + 7, y + 13, 2, PAL.steel1); };
    tr(-390);
    for (let i = 0; i < LIGHTS.n; i++) { const x = -400 + i * 160; g.fillStyle(PAL.black, 1); g.fillRect(x - 7, -375, 14, 14); g.fillStyle(PAL.steel2, 1); g.fillRect(x - 7, -375, 14, 2); }
    // speaker stacks on the cavern floor at the back, either side, behind the crowd
    for (const sx of [-560, 470]) {
      for (let k = 0; k < 3; k++) {
        const y = -140 - k * 70;
        g.fillStyle(PAL.tolex, 1); g.fillRect(sx, y, 90, 68);
        g.fillStyle(PAL.grille, 1); g.fillRect(sx + 4, y + 4, 82, 60);
        for (const [cx, cy] of [[22, 18], [66, 18], [22, 50], [66, 50]]) { g.fillStyle(PAL.cone, 1); g.fillCircle(sx + cx, y + cy, 14); g.fillStyle(PAL.cone2, 1); g.fillCircle(sx + cx, y + cy, 4); }
      }
    }
  }

  /** Where a crowd half's texture sits in the world (and how big it is). */
  crowdBox(half) {
    const R = RING, out = R.rx + R.rxStep * R.rows + 20;
    if (half === 'back') return { x: -out, y: R.cy - (R.ry + R.ryStep * R.rows) - R.rake * R.rows - 40, w: out * 2, h: (R.ry + R.ryStep * R.rows) + R.rake * R.rows + 50 };
    return { x: -out, y: R.cy - 10, w: out * 2, h: R.ry + R.ryStep * R.rows + 40 };
  }

  /**
   * Bakes one half of the crowd ring in one pose into a texture: rows of people round an ellipse round the stage, the
   * back half raked up behind it, the front half (the pit) below it; nearer rows bigger and lit by the stage. `pose`
   * 0/1 = everyone in one of two positions (arms up or down, jumping or not), flipped on the beat.
   */
  bakeCrowd(key, half, pose) {
    const s = this.scene, R = RING, box = this.crowdBox(half), g = s.add.graphics();
    const skins = [0xc79a7a, 0x8d5a3e, 0xe0b898, 0x5e3b28, 0xb07a58];
    const shirts = [0x1a1a20, 0x2a1630, 0x161e2c, 0x2c1414, 0x202020, 0x302838, 0x14262a];
    const rows = [...Array(R.rows).keys()];
    const order = half === 'back' ? rows.reverse() : rows;
    for (const i of order) {
      const rx = R.rx + i * R.rxStep, ry = R.ry + i * R.ryStep, cy = R.cy - (half === 'back' ? R.rake * i : 0);
      const sc = half === 'back' ? 1 - i * 0.035 : 1 + i * 0.07;
      const dark = half === 'back' ? i / R.rows : 0.15 + i * 0.03;
      const step = R.gap * sc, len = Math.PI * (rx + ry) / 2, n = Math.floor(len / step);
      for (let k = 0; k <= n; k++) {
        const a = (k + (i % 2) * 0.5) / n * Math.PI;
        const x = -Math.cos(a) * rx, y = half === 'back' ? cy - Math.sin(a) * ry : cy + Math.sin(a) * ry;
        if (half === 'back' && y > -4 && Math.abs(x) < DECK.x2 + 6) continue;            // (behind the deck: never seen)
        const id = i * 1000 + k + (half === 'front' ? 50000 : 0);
        this.person(g, x - box.x, y - box.y, sc, id, pose, dark, skins, shirts);
      }
    }
    g.generateTexture(key, box.w, box.h);
    g.destroy();
  }

  /** One fan in the crowd (into the bake): head, shoulders, arms (up, horns up, clapping, or down), shirt, lit rim. */
  person(g, x, y, sc, id, pose, dark, skins, shirts) {
    const h = hash(id), jump = (pose === 1 && hash(id + 0.5) > 0.45) ? -3 * sc : 0;
    const shade = (c) => { const k = 1 - dark * 0.75; return (((c >> 16) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k); };
    const skin = shade(skins[Math.floor(h * skins.length)]), shirt = shade(shirts[Math.floor(hash(id + 1) * shirts.length)]);
    const hw = 3.2 * sc, by = y + jump;
    g.fillStyle(shirt, 1); g.fillRect(x - hw * 1.4, by - 2 * sc, hw * 2.8, 9 * sc);                         // shoulders
    const up = (pose === 0) === (hash(id + 2) > 0.5), horns = hash(id + 3) > 0.7;
    if (up) {
      const sp = hash(id + 4) * 3;
      for (const sd of [-1, 1]) {
        if (hash(id + 5 + sd) > 0.8) continue;                                                              // (one arm only)
        g.fillStyle(shirt, 1); g.fillRect(x + sd * (hw * 1.3 + sp * sc * 0.5) - sc, by - 13 * sc, 2 * sc, 11 * sc);
        g.fillStyle(skin, 1); g.fillRect(x + sd * (hw * 1.3 + sp * sc * 0.5) - sc * 1.2, by - 16 * sc, 2.6 * sc, 3.4 * sc);
        if (horns) { g.fillRect(x + sd * (hw * 1.3 + sp * sc * 0.5) - sc * 1.2, by - 19 * sc, 0.9 * sc, 3 * sc); g.fillRect(x + sd * (hw * 1.3 + sp * sc * 0.5) + sc * 0.6, by - 19 * sc, 0.9 * sc, 3 * sc); }
      }
    }
    g.fillStyle(skin, 1); g.fillCircle(x, by - 5 * sc, hw);                                                  // head
    const hair = hash(id + 6);
    if (hair > 0.5) { g.fillStyle(shade(hair > 0.85 ? 0xd04a7a : 0x161012), 1); g.fillRect(x - hw, by - 5 * sc - hw, hw * 2, hw * 0.9); }
    if (hair > 0.92) { g.fillStyle(shade(0x3fe0cc), 1); g.fillRect(x - 0.6 * sc, by - 5 * sc - hw - 3 * sc, 1.2 * sc, 3 * sc); }     // a mohawk
    if (hash(id + 7) > 0.8) { g.fillStyle(shade(0x101014), 1); g.fillRect(x - hw, by - 5 * sc - hw * 0.4, hw * 2, hw * 0.6); }       // a beanie
    // a rim of stage light on the nearer rows
    if (dark < 0.5) { g.fillStyle(hash(id + 8) > 0.5 ? PAL.red : PAL.purple, 0.35 * (1 - dark)); g.fillRect(x - hw, by - 5 * sc - hw, hw * 0.8, hw * 2); }
    if (hash(id + 9) > 0.965) { g.fillStyle(0xfff6c8, 1); g.fillRect(x + hw * 1.5, by - 14 * sc, 1.5 * sc, 2.5 * sc); }                // a phone light
  }

  /** The floating stage deck: diamond-plate top with a hazard-striped lip, road-case front, a truss underneath with lights. */
  paintDeck(g) {
    const { x1, x2, bottom } = DECK, w = x2 - x1;
    g.fillStyle(PAL.black, 1); g.fillRect(x1 - 3, -3, w + 6, bottom + 6);
    g.fillStyle(PAL.steel1, 1); g.fillRect(x1, 0, w, 6);
    for (let x = x1 + 2; x < x2; x += 6) { g.fillStyle(PAL.steel2, 1); g.fillRect(x, 1 + ((x / 6) % 2), 3, 1); }
    for (let x = x1; x < x2; x += 12) { g.fillStyle(PAL.hazard, 1); g.fillRect(x, 6, 6, 4); g.fillStyle(PAL.black, 1); g.fillRect(x + 6, 6, 6, 4); }
    g.fillStyle(PAL.tolex, 1); g.fillRect(x1, 10, w, bottom - 10);
    for (let x = x1 + 30; x < x2 - 10; x += 60) { g.fillStyle(PAL.tolex2, 1); g.fillRect(x, 14, 40, bottom - 18); g.fillStyle(PAL.corner, 1); g.fillRect(x + 16, 22, 8, 4); }
    g.fillStyle(PAL.corner, 1); g.fillRect(x1, 10, 6, 6); g.fillRect(x2 - 6, 10, 6, 6); g.fillRect(x1, bottom - 6, 6, 6); g.fillRect(x2 - 6, bottom - 6, 6, 6);
    // the truss under it, tapering, with the glow of its underlights
    for (let r = 0; r < 4; r++) {
      const ins = 30 + r * 34, y = bottom + r * 12;
      g.fillStyle(PAL.steel0, 1); g.fillRect(x1 + ins, y, w - ins * 2, 3);
      for (let x = x1 + ins; x < x2 - ins; x += 16) seg(g, x, y, x + 8, y + 12, 2, PAL.steel0);
    }
  }

  /** The speakers on the deck: the giant stack in the middle and the big ones beside it (their cones are drawn live). */
  paintSpeakers(g) {
    const cab = (x, y, w, h) => {
      g.fillStyle(PAL.black, 1); g.fillRect(x - 2, y - 2, w + 4, h + 2);
      g.fillStyle(PAL.tolex, 1); g.fillRect(x, y, w, h);
      g.fillStyle(PAL.grille, 1); g.fillRect(x + 5, y + 5, w - 10, h - 12);
      for (let gy = y + 7; gy < y + h - 8; gy += 3) { g.fillStyle(0x15151a, 1); g.fillRect(x + 5, gy, w - 10, 1); }
      g.fillStyle(PAL.corner, 1);
      for (const [cx, cy] of [[x, y], [x + w - 6, y], [x, y + h - 6], [x + w - 6, y + h - 6]]) g.fillRect(cx, cy, 6, 6);
      g.fillStyle(PAL.tolex2, 1); g.fillRect(x + w / 2 - 8, y + h - 6, 16, 3);
    };
    cab(BIG.x, -BIG.h, BIG.w, BIG.h);
    g.fillStyle(PAL.red, 1); g.fillRect(BIG.x + BIG.w / 2 - 18, -18, 36, 7);                                   // the stack's badge
    g.fillStyle(PAL.white, 1); g.fillRect(BIG.x + BIG.w / 2 - 15, -16, 30, 3);
    for (const sd of [-1, 1]) {
      const x = sd * SIDE.at - SIDE.w / 2;
      cab(x, -SIDE.h, SIDE.w, SIDE.h);
      // an amp head on top with its glowing tubes behind the grille
      g.fillStyle(PAL.black, 1); g.fillRect(x + 6, -SIDE.h - 18, SIDE.w - 12, 18);
      g.fillStyle(PAL.tolex2, 1); g.fillRect(x + 8, -SIDE.h - 16, SIDE.w - 16, 14);
      for (let k = 0; k < 6; k++) { g.fillStyle(PAL.steel3, 1); g.fillCircle(x + 14 + k * 9, -SIDE.h - 6, 1.6); }
      g.fillStyle(PAL.amber, 0.8); g.fillRect(x + 12, -SIDE.h - 14, SIDE.w - 24, 2);
    }
    // monitor wedges and cables along the front edge
    for (const x of [-210, 192]) { g.fillStyle(PAL.black, 1); g.fillPoints([{ x, y: 0 }, { x: x + 20, y: 0 }, { x: x + 20, y: -9 }, { x: x + 4, y: -14 }], true); g.fillStyle(PAL.grille, 1); g.fillRect(x + 6, -10, 10, 7); }
    g.fillStyle(PAL.black, 1); g.fillRect(-140, -2, 280, 2);
  }

  // ---------------------------------------------------------------- moving parts
  /** The beat right now: { b (beats so far), k (0..1 through this beat), hit (1 on the downbeat, fading) }. */
  beat() { const b = this.t / BEAT, k = b % 1; return { b: Math.floor(b), k, hit: Math.max(0, 1 - k * 3) }; }

  /** One frame of everything that moves: crowd, banners, lights, haze, cones, the act. */
  animate() {
    const B = this.beat(), half = Math.floor(this.t / (BEAT / 2)) % 2;
    for (const [i, imgs] of this.crowd.entries()) {
      imgs[0].setVisible(half === 0); imgs[1].setVisible(half === 1);
      const box = this.crowdBox(i ? 'front' : 'back');
      for (const im of imgs) im.y = box.y - B.hit * (i ? 2 : 1);
    }
    this.drawBanners();
    this.drawLights();
    this.drawHaze();
    this.drawCones(B);
    this.drawAct(B);
  }

  /** The banners held up in the crowd on poles, waving: torn cloth in band colours with a skull, a bolt or stripes. */
  drawBanners() {
    const g = this.bannerG; g.clear(); this.bannerBackG.clear();
    for (let i = 0; i < BANNERS.n; i++) {
      const a = (i + 0.5) / BANNERS.n * Math.PI, row = 3 + (i % 3) * 3;
      const rx = RING.rx + row * RING.rxStep, ry = RING.ry + row * RING.ryStep;
      const x = -Math.cos(a) * rx, y = RING.cy - RING.rake * row - Math.sin(a) * ry - 26;
      const sw = Math.sin(this.t * 0.05 + i * 1.7) * 6, gg = row > 5 ? this.bannerBackG : g, c = [PAL.red2, 0x2a1a44, 0x14403c, 0x4a1a1a][i % 4];
      seg(gg, x, y + 34, x + sw * 0.3, y - BANNERS.h + 4, 2, PAL.steel1);
      for (let k = 0; k < BANNERS.w; k += 3) {
        const wv = Math.sin(this.t * 0.12 + i + k * 0.18) * 3 * (k / BANNERS.w), bx = x + sw * 0.3 + k, by = y - BANNERS.h + 4 + wv;
        gg.fillStyle(c, 1); gg.fillRect(bx, by, 3, BANNERS.h - (k % 9 === 6 ? 4 : 0));
        if (i % 3 === 0 && k % 6 === 0) { gg.fillStyle(PAL.black, 1); gg.fillRect(bx, by + 6, 3, 3); }
      }
      const cx = x + sw * 0.3 + BANNERS.w / 2, cy = y - BANNERS.h / 2 + 4 + Math.sin(this.t * 0.12 + i + 3) * 1.5;
      gg.fillStyle(PAL.white, 0.9);
      if (i % 3 === 1) { gg.fillCircle(cx, cy - 1, 5); gg.fillRect(cx - 3, cy + 3, 6, 3); gg.fillStyle(PAL.black, 1); gg.fillRect(cx - 3, cy - 2, 2, 2); gg.fillRect(cx + 1, cy - 2, 2, 2); }   // a skull
      else if (i % 3 === 2) { gg.fillStyle(PAL.gold, 1); gg.fillPoints([{ x: cx + 2, y: cy - 8 }, { x: cx - 4, y: cy + 1 }, { x: cx, y: cy + 1 }, { x: cx - 2, y: cy + 8 }, { x: cx + 4, y: cy - 1 }, { x: cx, y: cy - 1 }], true); }   // a bolt
      else { gg.fillStyle(PAL.white, 0.8); gg.fillRect(cx - 10, cy - 3, 20, 2); gg.fillRect(cx - 10, cy + 2, 20, 2); }
    }
  }

  /** The stage lights: beams from the truss sweeping through the haze, pulsing on the beat. */
  drawLights() {
    const g = this.lightG, B = this.beat(); g.clear();
    for (let i = 0; i < LIGHTS.n; i++) {
      const x = -400 + i * 160, y = -362;
      const a = Math.PI / 2 + Math.sin(this.t * LIGHTS.speed * (1 + i * 0.13) + i * 1.9) * 0.55, L = 560;
      const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, wv = 70;
      const nx = -Math.sin(a) * wv, ny = Math.cos(a) * wv;
      const alpha = 0.07 + 0.06 * B.hit;
      g.fillStyle(LIGHTS.colors[i], alpha); g.fillTriangle(x, y, ex + nx, ey + ny, ex - nx, ey - ny);
      g.fillStyle(LIGHTS.colors[i], alpha * 1.2); g.fillTriangle(x, y, ex + nx * 0.35, ey + ny * 0.35, ex - nx * 0.35, ey - ny * 0.35);
      g.fillStyle(LIGHTS.colors[i], 0.6); g.fillCircle(x, y, 5);
    }
  }

  /** Haze drifting over the crowd (big faint puffs) - the beams cut through it. */
  drawHaze() {
    const g = this.hazeG; g.clear();
    for (let i = 0; i < 9; i++) {
      const x = ((i * 213 + this.t * (0.12 + hash(i) * 0.1)) % 1500) - 750, y = -90 + hash(i + 2) * 80;
      g.fillStyle(0x8a7aa8, 0.035); g.fillCircle(x, y, 60 + hash(i + 4) * 40); g.fillCircle(x + 40, y + 10, 40);
    }
  }

  /** The speakers' woofers: each cone thumps outward on the beat (a ring of light catches its rim). */
  drawCones(B) {
    const g = this.coneG; g.clear();
    const cone = (x, y, r) => {
      const p = B.hit * 2;
      g.fillStyle(PAL.black, 1); g.fillCircle(x, y, r + 2);
      g.fillStyle(PAL.cone, 1); g.fillCircle(x, y, r);
      g.fillStyle(PAL.cone2, 1); g.fillCircle(x, y, r * 0.62 + p);
      g.fillStyle(PAL.cone, 1); g.fillCircle(x, y, r * 0.55 + p * 0.6);
      g.fillStyle(PAL.cone2, 1); g.fillCircle(x, y, r * 0.22 + p * 0.4);
      g.fillStyle(PAL.steel2, 0.5 + B.hit * 0.4); g.fillRect(x - r * 0.5, y - r * 0.85, r, 1);
    };
    const bx = BIG.x, by = -BIG.h;
    for (const [cx, cy] of [[36, 46], [108, 46], [36, 108], [108, 108]]) cone(bx + cx, by + cy, 25);
    g.fillStyle(PAL.black, 1); g.fillRect(bx + BIG.w / 2 - 10, by + 70, 20, 12); g.fillStyle(PAL.steel2, 1); g.fillRect(bx + BIG.w / 2 - 7, by + 73, 14, 6);   // the horn
    for (const sd of [-1, 1]) { const x = sd * SIDE.at; cone(x, -SIDE.h + 30, 17); cone(x, -SIDE.h + 66, 17); }
  }

  // ---------------------------------------------------------------- the act
  /** Draws tonight's act on the speakers (the rapper or the band), moving to the beat. */
  drawAct(B) {
    const g = this.actG; g.clear();
    const draw = (gg) => { if (this.act.id === 'rapper') this.drawRapper(gg, B); else this.drawBand(gg, B); };
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(outline(g, dx, dy));   // a dark pixel outline first
    draw(g);
  }

  /**
   * A performer, in pixels: feet at (x, y); `o` = look { skin, hair, top, top2, legs, shoes, cap, hood, chain, long,
   * shades } and pose { sit, lean, bob, aL / eL, aR / eR (shoulder and elbow angles, degrees, 90 = hanging), legs }.
   * Returns the hands' positions (to hang an instrument or a mic on).
   */
  performer(g, x, y, o) {
    const sit = !!o.sit, hip = { x: x + (o.lean || 0) * 0.3, y: sit ? y : y - 18 };
    // legs: standing (spread a little) or sitting on the speaker's edge, hanging down its front
    const leg = (sd) => {
      if (sit) { seg(g, hip.x + sd * 4, hip.y, hip.x + sd * 6, hip.y + 4, 6, o.legs); seg(g, hip.x + sd * 6, hip.y + 4, hip.x + sd * 6 + (o.kick && sd === 1 ? 4 : 0), hip.y + 20, 5, o.legs); g.fillStyle(o.shoes, 1); g.fillRect(hip.x + sd * 6 - 3 + (o.kick && sd === 1 ? 4 : 0), hip.y + 19, 8, 4); return; }
      const sp = o.legs2 || 6;
      seg(g, hip.x + sd * 3, hip.y, x + sd * sp, y - 2, 5, o.legs);
      g.fillStyle(o.shoes, 1); g.fillRect(x + sd * sp - 4 + sd, y - 3, 8, 4);
    };
    leg(-1); leg(1);
    const sh = { x: hip.x + (o.lean || 0), y: hip.y - 17 + (o.bob || 0) * 0.5 };
    // body: a hoodie / tee / jacket
    g.fillStyle(o.top, 1); g.fillPoints([{ x: hip.x - 6, y: hip.y + 1 }, { x: hip.x + 6, y: hip.y + 1 }, { x: sh.x + 8, y: sh.y }, { x: sh.x - 8, y: sh.y }], true);
    if (o.top2) { g.fillStyle(o.top2, 1); g.fillRect(Math.round(lerp(hip.x, sh.x, 0.5)) - 3, Math.round(lerp(hip.y, sh.y, 0.6)), 6, 5); }
    if (o.chain) { g.fillStyle(PAL.gold, 1); for (let k = -4; k <= 4; k++) g.fillRect(sh.x + k, sh.y + 3 + Math.abs(k) * -0.4 + 4 - Math.abs(k) * 0.5, 1, 1); g.fillRect(sh.x - 1, sh.y + 6, 3, 3); }
    // head
    const hd = { x: sh.x + (o.lean || 0) * 0.4 + (o.headX || 0), y: sh.y - 6 + (o.bob || 0) };
    if (o.long) { g.fillStyle(o.hair, 1); g.fillRect(hd.x - 5, hd.y - 4, 10, 12 + (o.bang || 0)); }
    g.fillStyle(o.skin, 1); g.fillRect(hd.x - 4, hd.y - 5, 8, 9);
    if (o.hood) { g.fillStyle(o.top, 1); g.fillRect(hd.x - 5, hd.y - 7, 10, 4); g.fillRect(hd.x - 5, hd.y - 7, 2, 11); g.fillRect(hd.x + 3, hd.y - 7, 2, 11); }
    else if (o.cap) { g.fillStyle(o.cap, 1); g.fillRect(hd.x - 5, hd.y - 7, 10, 4); g.fillRect(hd.x - (o.capBack ? 8 : -3), hd.y - 4, 5, 2); }
    else if (!o.long) { g.fillStyle(o.hair, 1); g.fillRect(hd.x - 4, hd.y - 7, 8, 3); if (o.mohawk) g.fillRect(hd.x - 1, hd.y - 11, 3, 5); }
    else { g.fillStyle(o.hair, 1); g.fillRect(hd.x - 5, hd.y - 7, 10, 3); }
    if (o.shades) { g.fillStyle(PAL.black, 1); g.fillRect(hd.x - 4, hd.y - 2, 8, 2); g.fillStyle(PAL.teal, 0.8); g.fillRect(hd.x + 1, hd.y - 2, 2, 1); }
    else { g.fillStyle(PAL.black, 1); g.fillRect(hd.x - 2, hd.y - 2, 1, 2); g.fillRect(hd.x + 2, hd.y - 2, 1, 2); }
    if (o.paint) { g.fillStyle(PAL.white, 0.8); g.fillRect(hd.x - 3, hd.y - 3, 2, 3); g.fillRect(hd.x + 1, hd.y - 3, 2, 3); g.fillStyle(PAL.black, 1); g.fillRect(hd.x - 2, hd.y - 2, 1, 2); g.fillRect(hd.x + 2, hd.y - 2, 1, 2); }
    if (o.mouth) { g.fillStyle(0x3a0a10, 1); g.fillRect(hd.x - 1, hd.y + 1, 3, 2); }
    // arms: shoulder -> elbow -> hand
    const arm = (sd, a, e) => {
      const s0 = { x: sh.x + sd * 7, y: sh.y + 1 }, el = reach(s0.x, s0.y, a, 8), hd2 = reach(el.x, el.y, e, 8);
      seg(g, s0.x, s0.y, el.x, el.y, 4, o.top); seg(g, el.x, el.y, hd2.x, hd2.y, 3, o.sleeve || o.top);
      g.fillStyle(o.skin, 1); g.fillRect(Math.round(hd2.x) - 2, Math.round(hd2.y) - 2, 4, 4);
      return hd2;
    };
    return { L: arm(-1, o.aL ?? 100, o.eL ?? 90), R: arm(1, o.aR ?? 80, o.eR ?? 90), head: hd };
  }

  /**
   * BLACKTOP, the rapper: sits on the edge of the giant stack, legs over its front, hood up, gold chain, shades; the
   * mic comes up to his mouth for the bars, his free hand chops the beat, his head nods; every 8 bars he leans out
   * and points into the crowd.
   */
  drawRapper(g, B) {
    const bar = Math.floor(B.b / 4), inBar = B.b % 4, point = bar % 8 === 7, nod = -B.hit * 2;
    const mic = !point && (bar % 2 === 0 || inBar < 2);
    const o = { sit: true, lean: point ? 4 : -1 + Math.sin(B.b * 0.5) * 1, bob: nod, kick: inBar % 2 === 0,
      skin: 0x8d5a3e, hair: 0x101012, top: 0x18181d, top2: PAL.red, legs: 0x2a2f44, shoes: PAL.white, sleeve: 0x18181d,
      hood: true, chain: true, shades: true,
      aL: point ? -20 : 120 - B.hit * 40, eL: point ? -15 : 30 + B.hit * 60,
      aR: mic ? 150 : 60, eR: mic ? -100 : 100 };
    const p = this.performer(g, 0, -BIG.h, o);
    // the mic (in his right... his near hand), its cable falling down the stack
    g.fillStyle(PAL.steel2, 1); g.fillRect(p.L.x - 1, p.L.y - (mic ? 4 : 0), 3, 5);
    g.fillStyle(PAL.black, 1); g.fillRect(p.L.x - 1, p.L.y - (mic ? 6 : 2), 3, 3);
    seg(g, p.L.x, p.L.y + 3, -14, -BIG.h + 30, 1, PAL.black); seg(g, -14, -BIG.h + 30, -10, -2, 1, PAL.black);
    if (point) { g.fillStyle(0x8d5a3e, 1); g.fillRect(p.R.x + 1, p.R.y - 1, 4, 2); }
    // his crew's spray can and a bottle on the stack beside him
    g.fillStyle(PAL.teal, 1); g.fillRect(28, -BIG.h - 9, 5, 9); g.fillStyle(PAL.white, 1); g.fillRect(29, -BIG.h - 11, 3, 2);
  }

  /**
   * COFFIN NAILS, the band: the drummer up on the giant stack behind the kit (sticks on the beat, a crash every bar),
   * the singer beside the kit with a mic stand, the guitarist on the left speaker and the bassist on the right,
   * both headbanging and picking.
   */
  drawBand(g, B) {
    const bar = Math.floor(B.b / 4), inBar = B.b % 4, top = -BIG.h;
    // drum kit: kick drum facing out, toms, snare, two cymbals on stands
    const kx = 22;
    const crashHit = inBar === 0 ? B.hit : 0;
    for (const [cx, w] of [[kx - 30, 18], [kx + 30, 20]]) {
      seg(g, cx, top, cx, top - 34, 1, PAL.steel2);
      g.fillStyle(PAL.gold, 1); g.fillRect(cx - w / 2, top - 36 - (cx > kx ? crashHit * 2 : 0), w, 2);
    }
    const drummer = this.performer(g, kx, top - 4, { sit: true, bob: -B.hit * 3, skin: 0xe0b898, hair: 0x101012, top: 0x101014, legs: 0x101014, shoes: 0x2a2a2a, long: true, bang: B.hit * 3,
      aL: 140, eL: 60 + (B.b % 2 ? 0 : -60) * B.hit, aR: 40, eR: 120 + (B.b % 2 ? -60 : 0) * B.hit });
    for (const h of [drummer.L, drummer.R]) seg(g, h.x, h.y, h.x + (h === drummer.L ? -6 : 6), h.y - 6 + B.hit * 6, 1, 0xd8c08a);
    g.fillStyle(PAL.red2, 1); g.fillCircle(kx, top - 11, 11); g.fillStyle(PAL.black, 1); g.fillCircle(kx, top - 11, 9);
    g.fillStyle(PAL.white, 1); g.fillCircle(kx, top - 13, 3); g.fillRect(kx - 2, top - 10, 4, 2);                         // their skull logo
    g.fillStyle(PAL.steel2, 1); g.fillRect(kx - 22, top - 18, 12, 4); g.fillRect(kx + 10, top - 18, 12, 4);
    // the singer: screams on the downbeats of the chorus bars, mic stand tipped toward the crowd
    const scream = bar % 4 >= 2;
    const sg = this.performer(g, -46, top, { lean: scream ? -3 + B.hit * 2 : -1, bob: -B.hit * 2, skin: 0xc79a7a, hair: 0x1a1a1a, top: 0x2a0e14, top2: PAL.black, legs: 0x101014, shoes: 0x1a1a1a, mohawk: true, paint: true, mouth: scream,
      aL: scream ? 200 : 110, eL: scream ? 250 : 80, aR: 150 - (scream ? 0 : B.hit * 30), eR: -40 });
    seg(g, -58, top, -46 + (scream ? -6 : -2), sg.head.y + 4, 1, PAL.steel2);
    g.fillStyle(PAL.black, 1); g.fillRect(sg.R.x - 2, sg.R.y - 3, 4, 4);
    // guitarist (left speaker) and bassist (right): headbanging, a flying-V and a long-necked bass, picking hand on the beat
    for (const sd of [-1, 1]) {
      const fx = sd * SIDE.at, fy = -SIDE.h - 18, bang = Math.sin((B.b + B.k) * Math.PI) * 4;
      const p = this.performer(g, fx, fy, { lean: sd * -1 + bang * 0.4, bob: Math.abs(bang), headX: bang * 0.5, long: sd < 0, bang: Math.abs(bang),
        skin: sd < 0 ? 0xe0b898 : 0x5e3b28, hair: sd < 0 ? 0x2a1810 : 0x101012, top: sd < 0 ? 0x101014 : 0x1c1c26, top2: sd < 0 ? PAL.purple : null,
        legs: 0x1a1a22, shoes: 0x0e0e10, cap: sd > 0 ? PAL.black : null, shades: sd > 0,
        aL: 120, eL: 10, aR: 70 - B.hit * 20, eR: 150 - B.hit * 30, legs2: 9 });
      const body = { x: (p.L.x + p.R.x) / 2 + 3, y: p.R.y + 2 };
      const neck = { x: p.L.x - 14, y: p.L.y - 7 };
      if (sd < 0) { g.fillStyle(PAL.red, 1); g.fillPoints([{ x: body.x - 4, y: body.y - 2 }, { x: body.x + 10, y: body.y - 9 }, { x: body.x + 5, y: body.y }, { x: body.x + 10, y: body.y + 9 }], true); }
      else { g.fillStyle(0x2a5a8a, 1); g.fillCircle(body.x + 4, body.y, 6); g.fillCircle(body.x + 1, body.y - 3, 4); }
      seg(g, body.x - 2, body.y, neck.x, neck.y, 2, sd < 0 ? 0x2a1810 : 0x3a2a1a);
      g.fillStyle(PAL.steel3, 1); g.fillRect(neck.x - 2, neck.y - 1, 3, 3);
    }
  }

  // ---------------------------------------------------------------- the match
  /** Every frame: the crowd, the lights, the speakers and the act move. No hazards. */
  step() { this.t++; this.animate(); return null; }

  /** The camera keeps the stack's top in view now and then (the act). */
  camPoints() { return []; }

  // ---------------------------------------------------------------- the opening
  /** Starts the opening (MatchScene, before the countdown): its letterbox and captions, the HUD hidden till it's over. */
  startIntro(match) {
    const s = match;
    this.intro = { t: 0, said: {} };
    this.match = match;
    this.introW = s.add.graphics();                                    // (world: the door, the walker, the bulb)
    s.addWorld(this.introW);
    this.introG = s.add.graphics().setDepth(40);
    const T = (size, color) => s.add.text(VIEW_W / 2, 0, '', { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#07060e', strokeThickness: Math.max(3, size / 3), align: 'center' }).setOrigin(0.5).setDepth(41).setVisible(false);
    this.capBig = T(20, '#ffffff'); this.capSmall = T(8, '#d8d0e8');
    this.names = match.fighters.map((f) => T(14, '#' + (f.color || 0xffffff).toString(16).padStart(6, '0')));
    this.vsT = T(16, '#ff4a5a');
    this.introParts = [this.introG, this.capBig, this.capSmall, this.vsT, ...this.names];
    s.addUI(...this.introParts);
    this.hidUI = [];
    this.icam = null;
  }

  /** The opening's phases: which, frames into it, and 0..1 through it. */
  introPhase() {
    let t = this.intro.t;
    for (const ph of ['room', 'pull', 'announce', 'act']) { if (t < OPEN[ph]) return { ph, f: t, k: t / OPEN[ph] }; t -= OPEN[ph]; }
    return { ph: 'done', f: t, k: 1 };
  }

  /** Plays a sound once per opening (keyed), from the phase's frame f. */
  once(key, f, at, fn) { if (f >= at && !this.intro.said[key]) { this.intro.said[key] = true; fn(); } }

  /** Plays the opening's own recordings (loaded by MatchScene.preload for this stage), when there. */
  play(key, vol = 1) { const s = this.match; if (s.cache.audio.exists(key) && settings.sfxVolume > 0) s.sound.play(key, { volume: Math.min(1, vol * settings.sfxVolume) }); }

  /** One frame of the opening; returns true when it's over. */
  introStep(match) {
    const I = this.intro; if (!I) return true;
    I.t++; this.t++;
    if (!I.hid) {                                                       // (the HUD and buttons hide till it's over - all made by now)
      I.hid = true;
      this.hidUI = match.uiList.filter((o) => o.visible && !this.introParts.includes(o));
      for (const o of this.hidUI) o.setVisible(false);
    }
    this.animate();
    const P = this.introPhase();
    if (P.ph === 'room') {
      if (P.f % Math.round(BEAT * 2) === 0) sfx('rumble', 0.25, 0.6);                    // the bass coming up through the floor
      this.once('door', P.f, 34, () => this.play('ug_door', 0.8));
    } else if (P.ph === 'pull') {
      this.once('rumble', P.f, 10, () => sfx('rumble', 0.5, 0.5));
      this.once('crowd', P.f, 150, () => this.play('ug_crowd', 0.7));
    } else if (P.ph === 'announce') {
      this.once('welcome', P.f, 6, () => this.play('voice_ug-welcome', 1));
      const per = this.namePer();
      match.fighters.forEach((f, i) => this.once('name' + i, P.f, 110 + i * per, () => { announce(match, f.def.id); sfx('bighit', 0.4, 0.8); }));
      this.once('noise', P.f, 110 + match.fighters.length * per + 4, () => this.play('voice_ug-noise', 1));
    } else if (P.ph === 'act') {
      this.once('flash', P.f, 0, () => { sfx('bighit', 0.9, 0.5); sfx('thunder', 0.6, 1.4); this.play('ug_crowd', 0.9); match.startMusic(); });
    } else { this.endIntro(); return true; }
    this.drawIntro(P);
    return false;
  }

  /** Frames between the fighters' names in the announcer's call. */
  namePer() { return Math.floor(150 / Math.max(2, this.match.fighters.length)); }

  /** Skips the rest of the opening (a fresh press): the music starts, straight to the countdown. */
  skipIntro(match) { if (!this.intro) return; if (!this.intro.said.flash) match.startMusic(); this.endIntro(); }

  /** The opening is over: its pieces fade away, the HUD comes back, the camera eases back into play. */
  endIntro() {
    const s = this.match;
    this.intro = null; this.icam = null;
    this.introW.clear();
    s.tweens.add({ targets: this.introParts.filter((o) => o.visible), alpha: 0, duration: 400, onComplete: () => this.introParts.forEach((o) => o.setVisible(false)) });
    for (const o of this.hidUI) { o.setVisible(true); }
  }

  /** The opening's camera (null once it's over), exact: the room, the pull-back and descent, the stage, the act. */
  introCam() {
    if (!this.intro) return null;
    const P = this.introPhase(), Y = OPEN.roomY;
    if (P.ph === 'room') return { x: -20 + P.k * 30, y: Y - 56, zoom: 2.1 - P.k * 0.15, exact: true };
    if (P.ph === 'pull') {
      const a = io(P.f / 110), d = io((P.f - 90) / (OPEN.pull - 90));
      const zoom = lerp(lerp(1.95, 0.34, a), 0.82, d);
      return { x: lerp(10, 40, a) * (1 - d), y: lerp(Y - 56, Y - 200, a) + (-140 - (Y - 200)) * d, zoom, exact: true };
    }
    if (P.ph === 'announce') return { x: Math.sin(P.f * 0.01) * 20, y: lerp(-140, -110, io(P.k)), zoom: lerp(0.82, 0.95, io(P.k)), exact: true };
    const at = this.actAt(), k = io(P.f / 18);
    return { x: at.x, y: at.y + (1 - k) * 6, zoom: at.zoom * lerp(1.18, 1, io(P.k)), exact: true };
  }

  /** Where the camera looks for the act's close-up, and how close (the band needs all four in shot). */
  actAt() { return this.act.id === 'rapper' ? { x: 0, y: -BIG.h - 10, zoom: 2.2 } : { x: 0, y: -BIG.h + 4, zoom: 1.45 }; }

  /**
   * The opening's drawing. In the world: the door swinging open, the walker (a hooded kid with a backpack) crossing
   * the room and going down the hatch, the bulb on its cord swinging. On screen: the letterbox, the announcer's
   * captions (WELCOME TO THE UNDERGROUND, each fighter's name sliding in, VS), the flash and the act's name card.
   */
  drawIntro(P) {
    const w = this.introW, g = this.introG, Y = OPEN.roomY, W = VIEW_W, H = VIEW_H;
    w.clear(); g.clear();
    if (P.ph === 'room' || (P.ph === 'pull' && P.f < 140)) {
      // the bulb on its cord, swinging, its pool of light
      const sw = Math.sin((this.intro.t) * 0.045) * 10, bx = sw, by = Y - 70;
      w.lineStyle(1, PAL.black, 1); w.lineBetween(0, Y - 112, bx, by);
      w.fillStyle(0xffe8a8, 0.08); w.fillCircle(bx, by + 10, 70); w.fillStyle(0xffe8a8, 0.08); w.fillCircle(bx, by + 6, 40);
      w.fillStyle(0xfff4d0, 1); w.fillRect(bx - 2, by, 4, 5);
      // the door: closed, then swinging in (narrowing toward its hinge)
      const open = P.ph === 'room' ? io((P.f - 34) / 26) : 1, dw = 38 * (1 - open * 0.8);
      w.fillStyle(0x3c4250, 1); w.fillRect(-104, Y - 74, dw, 74);
      w.fillStyle(0x525a6a, 1); w.fillRect(-104, Y - 74, dw, 3);
      if (open < 0.6) { w.fillStyle(PAL.steel3, 1); w.fillRect(-104 + dw - 6, Y - 40, 3, 6); }
      // the walker
      const enter = P.ph === 'room' ? (P.f - 62) / 120 : 2;
      if (enter > 0 && P.ph === 'room') {
        const k = Math.min(1, enter), x = lerp(-90, 72, k), down = Math.max(0, (P.f - 182) / 40);
        const step = Math.sin(P.f * 0.3) * (k < 1 ? 3 : 0);
        const fy = Y - 2 + down * 46;
        const look = { lean: 1, skin: 0xc79a7a, hair: 0x101012, top: 0x3a2030, legs: 0x22283a, shoes: PAL.white, hood: true,
          aL: 100 + step * 6, eL: 95, aR: 80 - step * 6, eR: 85, legs2: 4 + step };
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this.performer(outline(w, dx, dy), x, fy, look);
        const p = this.performer(w, x, fy, look);
        w.fillStyle(0x1a3a3a, 1); w.fillRect(p.head.x - 11, p.head.y + 8, 6, 12);                     // backpack
        // the hatch's near lip covers him as he goes down
        w.fillStyle(PAL.con2, 1); w.fillRect(40, Y - 3, 64, 3); w.fillStyle(PAL.rock0, 1); w.fillRect(40, Y, 64, 60);
      }
    }
    // letterbox
    const bar = P.ph === 'act' ? 34 : 26;
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    for (const o of this.introParts.slice(1)) o.setVisible(false);
    if (P.ph === 'pull' && P.f > 150) {
      const a = io((P.f - 150) / 40);
      this.capSmall.setVisible(true).setText('300 FEET UNDER THE CITY...').setPosition(W / 2, H - bar / 2).setAlpha(a);
    }
    if (P.ph === 'announce') {
      const f = P.f, per = this.namePer(), n = this.names.length;
      if (f < 104) {
        const a = io(f / 12) * (1 - io((f - 92) / 12));
        this.capSmall.setVisible(true).setText('LADIES AND GENTLEMEN...').setPosition(W / 2, 92).setAlpha(a);
        this.capBig.setVisible(f > 34).setText('WELCOME TO\nTHE UNDERGROUND!').setPosition(W / 2, 140 - (1 - io((f - 34) / 10)) * 10).setAlpha(io((f - 34) / 8) * (1 - io((f - 92) / 12)));
      } else {
        this.capSmall.setVisible(true).setText("TONIGHT'S FIGHT").setPosition(W / 2, bar + 20).setAlpha(io((f - 104) / 10));
        const rowH = Math.min(40, 200 / n), y0 = H / 2 - ((n - 1) * rowH) / 2 + 6;
        this.names.forEach((t, i) => {
          const at = 110 + i * per, k = io((f - at) / 12), fi = this.match.fighters[i];
          t.setVisible(f >= at).setText((fi.label ? fi.label + '  ' : '') + fi.def.name).setPosition(W / 2 + (1 - k) * (i % 2 ? 260 : -260), y0 + i * rowH).setAlpha(k);
        });
        if (n === 2) { const at = 110 + per - 8; this.vsT.setVisible(f >= at).setText('VS').setPosition(W / 2, y0 + rowH / 2).setScale(1 + (1 - io((f - at) / 8)) * 1.5).setAlpha(io((f - at) / 8)); }
        const ma = 110 + n * per + 4;
        if (f > ma) { this.capSmall.setText('MAKE SOME NOISE!').setPosition(W / 2, H - bar - 18).setAlpha(Math.floor(f / 8) % 2 ? 1 : 0.6); }
      }
    }
    if (P.ph === 'act') {
      const f = P.f;
      if (f < 12) { g.fillStyle(0xffffff, 1 - f / 12); g.fillRect(0, 0, W, H); }
      const k = io((f - 8) / 14);
      this.capBig.setVisible(f > 8).setColor(this.act.color).setText(this.act.name).setPosition(W / 2 - (1 - k) * 200, H - bar - 30).setAlpha(k).setScale(1);
      this.capSmall.setVisible(f > 16).setText(this.act.tag).setPosition(W / 2 + (1 - io((f - 16) / 14)) * 200, H - bar - 10).setAlpha(io((f - 16) / 14));
      const sl = io((f - 4) / 12);
      g.fillStyle(0x000000, 0.55 * sl); g.fillRect(0, H - bar - 50, W * sl, 46);
      g.fillStyle(parseInt(this.act.color.slice(1), 16), 1); g.fillRect(0, H - bar - 50, W * sl, 2);
    }
  }
}

/** The stage select miniature: the cavern, the crowd ring, beams, the floating deck with the giant speaker stack. */
export function drawUndergroundPreview(g, x, y, w, h) {
  const u = w / 100, v = h / 60;
  g.fillStyle(PAL.rock0, 1); g.fillRect(x, y, w, h);
  g.fillStyle(PAL.rock1, 1); for (let i = 0; i < 6; i++) g.fillRect(x + i * 18 * u, y, 10 * u, h * 0.6);
  g.fillStyle(PAL.con0, 1); g.fillRect(x, y, w, 5 * v);
  const beams = [PAL.red, PAL.purple, PAL.teal, PAL.amber];
  beams.forEach((c, i) => { g.fillStyle(c, 0.18); g.fillTriangle(x + (15 + i * 23) * u, y + 6 * v, x + (5 + i * 23) * u, y + h, x + (30 + i * 23) * u, y + h); });
  for (let r = 0; r < 5; r++) for (let k = 0; k < 26; k++) {
    const a = (k + 0.5) / 26 * Math.PI, rx = (30 + r * 5) * u, ry = (10 + r * 3) * v;
    const px = x + w / 2 - Math.cos(a) * rx, py = y + 38 * v - Math.sin(a) * ry - r * 2 * v;
    g.fillStyle(0x2a1f30 + r * 0x030203, 1); g.fillCircle(px, py, 1.4 * u);
  }
  for (let k = 0; k < 30; k++) { g.fillStyle(0x241a2c, 1); g.fillCircle(x + (5 + k * 3.2) * u, y + (52 + (k % 2) * 3) * v, 1.6 * u); }
  g.fillStyle(PAL.tolex, 1); g.fillRect(x + 24 * u, y + 38 * v, 52 * u, 5 * v);
  g.fillStyle(PAL.hazard, 1); g.fillRect(x + 24 * u, y + 38 * v, 52 * u, 1 * v);
  g.fillStyle(PAL.black, 1); g.fillRect(x + 43 * u, y + 24 * v, 14 * u, 14 * v); g.fillRect(x + 32 * u, y + 30 * v, 8 * u, 8 * v); g.fillRect(x + 60 * u, y + 30 * v, 8 * u, 8 * v);
  g.fillStyle(PAL.cone2, 1); for (const [cx, cy] of [[46.5, 28], [53.5, 28], [46.5, 34.5], [53.5, 34.5], [36, 34], [64, 34]]) g.fillCircle(x + cx * u, y + cy * v, 2.4 * u);
  g.fillStyle(PAL.red2, 1); g.fillRect(x + 35 * u, y + 7 * v, 30 * u, 6 * v);
}
