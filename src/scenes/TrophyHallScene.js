// TROPHY HALL (Trinkets > TROPHY HALL): a grand gallery in real low-poly 3D, built with the same renderer as the N64
// stages (poly3d.js) - a long marble hall with a polished checkerboard floor that mirrors the columns, a coffered
// ceiling with gold beams, crimson walls with gold-framed spaces for paintings, rows of marble columns, a lit
// pedestal in every bay, chandeliers, and at the far end a dais with a great empty plinth under a stained-glass window.
// It's EMPTY for now: every pedestal, frame and the plinth is a slot (src/data/trophyHall.js) waiting for trophies,
// statues and art. You arrive through two tall doors that swing open, then walk the hall.
// W/S or up/down walk, A/D or left/right look, K / Esc / B back. Touch / mouse: hold the top half to walk forward,
// the bottom half to walk back, left or right of the middle to look that way.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { readPad } from '../input/controllers.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { titleBanner, hintBar, ARC } from '../ui/arcade.js';
import { Poly3D, boxFaces, prismFaces, blobFaces } from '../stage/poly3d.js';
import { HALL, HALL_SLOTS, DISPLAY } from '../data/trophyHall.js';

// the room (px; x 0 = the middle of the hall, y 0 = eye height, +y down, +z away from you)
const FLOOR = 110;          // the floor's height
const CEIL = -330;          // the ceiling's height
const WALL = 300;           // the side walls (x = -WALL and +WALL)
const COL_X = 262;          // the columns' line
const PED_X = 196;          // the pedestals' line
const DOOR_Z = -40;         // the entrance (the doors swing open into the hall)
const LEN = HALL.length;    // the far wall
// walking: how fast, how far, where you start
const WALK = { speed: 7, accel: 0.12, start: -560, enter: 0, max: LEN - 900, look: 150 };
// the arrival: doors open over `open` frames, then the camera glides in until `glide`
const ARRIVE = { open: 70, glide: 170 };
// colours: marble, gold, crimson, wood, the ceiling, glass
const P = {
  marbleW: 0xece4d4, marbleK: 0x2a2632, vein: 0xc8bea8, column: 0xf0e8da, colDark: 0xb8ae9c,
  gold: 0xe0b040, goldD: 0xa07020, crimson: 0x7a1424, crimsonD: 0x4a0a16, wood: 0x4a2414, woodD: 0x2a140a,
  ceil: 0x1a2440, coffer: 0x26345a, carpet: 0xb01828, carpetD: 0x7a0e1c, frameIn: 0x120a14, banner: 0x4a1a7a,
  glass: [0xff3a5a, 0x3a8aff, 0xffd040, 0x3ae08a, 0xb04aff, 0xff9a2a],
};
const ease = (v) => v * v * (3 - 2 * v);

/** A flat face with a known outward normal (so it's culled and lit like the stage geometry). */
const face = (pts, n, c, extra = {}) => ({ p: pts, n, c, ...extra });

/** The TROPHY HALL screen: the 3D gallery you walk through. */
export class TrophyHallScene extends Phaser.Scene {
  constructor() { super('TrophyHall'); }

  /** Builds the hall, its lights and its words, and starts the doors opening. */
  create() {
    this.t = 0; this.menu = new MenuInput(this);
    this.camZ = WALK.start; this.vz = 0; this.lookX = 0; this.look = 0; this.bob = 0;
    playMusic(this, 'bgm_trophy_hall');
    this.cameras.main.setBackgroundColor(0x05030a);
    this.bg = this.add.graphics().setDepth(-30);
    // the 3D layers, back to front: the floor, the columns' reflections in it, the hall itself
    const L = { fog: 0x0e0814, zNear: 500, zFar: 4200, fogMax: 0.78, f: 300, lift: 0, near: 70, sat: 1.15, edge: 0.08, light: [-0.25, 1, 0.45] };
    this.floorR = new Poly3D(this, [], { ...L, edge: 0.04 });
    this.reflR = new Poly3D(this, [], { ...L, edge: 0 });
    this.mainR = new Poly3D(this, [], L);
    for (const [R, d] of [[this.floorR, -25], [this.reflR, -24], [this.mainR, -23]]) R.g.setDepth(d);
    this.beams = this.add.graphics().setDepth(-22).setBlendMode(Phaser.BlendModes.ADD);   // spotlights, window light, chandelier glow
    this.motesG = this.add.graphics().setDepth(-21).setBlendMode(Phaser.BlendModes.ADD);
    this.build();
    this.motes = Array.from({ length: 70 }, (_, i) => ({ x: (this.rnd(i, 1) - 0.5) * 520, y: CEIL + this.rnd(i, 2) * (FLOOR - CEIL), z: this.rnd(i, 3) * 1400, s: 0.2 + this.rnd(i, 4) * 0.5 }));

    titleBanner(this, 'TROPHY HALL', ARC.sections.trinkets, { crumb: 'TRINKETS  >  TROPHY HALL' });
    hintBar(this, 'W/S WALK   A/D LOOK   K / ESC / B  BACK', ARC.sections.trinkets);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    const shown = Object.keys(DISPLAY).length, total = HALL_SLOTS.length;
    this.count = this.add.text(VIEW_W - 10, 26, 'ON DISPLAY  ' + shown + ' / ' + total, { fontFamily: FONT, fontSize: '7px', color: '#f0d890', stroke: '#1a0a14', strokeThickness: 3 }).setOrigin(1, 0).setDepth(20);
    this.title = this.add.text(VIEW_W / 2, 132, 'THE HALL STANDS EMPTY', { fontFamily: FONT, fontSize: '16px', color: '#f6d77a', stroke: '#2a0a10', strokeThickness: 5 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.sub = this.add.text(VIEW_W / 2, 154, 'TROPHIES, STATUES AND ART WILL BE DISPLAYED HERE', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#2a0a10', strokeThickness: 3 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.slotText = this.add.text(VIEW_W / 2, VIEW_H - 30, '', { fontFamily: FONT, fontSize: '7px', color: '#e8d0a0', stroke: '#1a0a14', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.held = null;
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.held = p; });
    this.input.on('pointerup', () => { this.held = null; });
    sfx('clang', 0.4, 0.5);
  }

  /** A repeatable 0-1 number (so the motes, veins and sway look the same every visit). */
  rnd(a, b) { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  /** Builds the hall's static geometry once (floor, reflections, walls, ceiling, columns, pedestals, frames, dais). */
  build() {
    const F = this.floorR, M = this.mainR, Rf = this.reflR, T = 120;
    // ---- the floor: polished black-and-white marble checkers, a red carpet with gold edges down the middle
    for (let z = -600; z < LEN; z += T) for (let x = -WALL; x < WALL; x += T) {
      const k = (Math.round(x / T) + Math.round(z / T)) & 1;
      F.faces.push(face([[x, FLOOR, z + T], [x + T, FLOOR, z + T], [x + T, FLOOR, z], [x, FLOOR, z]], [0, -1, 0], k ? P.marbleK : P.marbleW, { bias: 1000 }));
    }
    for (let z = -600; z < LEN - 300; z += T) {
      F.faces.push(face([[-58, FLOOR, z + T], [58, FLOOR, z + T], [58, FLOOR, z], [-58, FLOOR, z]], [0, -1, 0], (z / T) & 1 ? P.carpet : P.carpetD));
      for (const s of [-1, 1]) F.faces.push(face([[s * 58, FLOOR, z + T], [s * 66, FLOOR, z + T], [s * 66, FLOOR, z], [s * 58, FLOOR, z]], [0, -1, 0], P.gold));
    }
    // ---- the side walls, bay by bay: dark wood wainscot, a gold rail, crimson above, gold crown moulding
    for (let z = -600; z < LEN; z += HALL.bay / 2) {
      const z2 = z + HALL.bay / 2;
      for (const s of [-1, 1]) {
        const x = s * WALL, n = [-s, 0, 0];
        M.faces.push(face([[x, 30, z], [x, 30, z2], [x, FLOOR, z2], [x, FLOOR, z]], n, P.wood, { bias: 400 }));
        M.faces.push(face([[x, CEIL + 30, z], [x, CEIL + 30, z2], [x, 22, z2], [x, 22, z]], n, (z / (HALL.bay / 2)) & 1 ? P.crimson : P.crimsonD, { bias: 400 }));
        M.faces.push(face([[x - s, 22, z], [x - s, 22, z2], [x - s, 30, z2], [x - s, 30, z]], n, P.gold, { bias: 380 }));
        M.faces.push(face([[x - s, CEIL, z], [x - s, CEIL, z2], [x - s, CEIL + 30, z2], [x - s, CEIL + 30, z]], n, P.goldD, { bias: 380 }));
      }
    }
    // ---- the ceiling: dark blue coffers between gold beams that cross the hall at every column
    for (let z = -600; z < LEN; z += T) for (let x = -WALL; x < WALL; x += T)
      M.faces.push(face([[x, CEIL, z], [x + T, CEIL, z], [x + T, CEIL, z + T], [x, CEIL, z + T]], [0, 1, 0], ((x + z) / T) & 1 ? P.ceil : P.coffer, { bias: 600 }));
    for (let i = -1; i <= HALL.bays + 1; i++) { const z = i * HALL.bay; M.faces.push(...boxFaces(-WALL, CEIL, z - 14, WALL, CEIL + 26, z + 14, P.goldD, P.goldD).map((f) => ({ ...f, bias: 300 }))); }
    M.faces.push(...boxFaces(-16, CEIL, -600, 16, CEIL + 14, LEN, P.goldD).map((f) => ({ ...f, bias: 320 })));   // the spine beam
    // ---- the columns (8-sided marble shafts with a gold capital and a square base), mirrored in the floor
    for (let i = -1; i <= HALL.bays; i++) for (const s of [-1, 1]) {
      const x = s * COL_X, z = i * HALL.bay, parts = [
        ...prismFaces(x, CEIL + 50, FLOOR - 22, z, 20, 8, P.column),
        ...boxFaces(x - 28, CEIL + 26, z - 28, x + 28, CEIL + 50, z + 28, P.gold),
        ...boxFaces(x - 30, FLOOR - 22, z - 30, x + 30, FLOOR, z + 30, P.colDark, P.marbleW),
      ];
      M.faces.push(...parts); Rf.faces.push(...this.mirror(parts));
    }
    // ---- a pedestal in every bay on both sides (empty), with a gold plaque on its front
    for (const sl of HALL_SLOTS.filter((q) => q.kind === 'pedestal')) {
      const x = sl.side * PED_X, z = sl.z, parts = [
        ...boxFaces(x - 22, FLOOR - 12, z - 22, x + 22, FLOOR, z + 22, P.marbleK, P.marbleK),
        ...boxFaces(x - 16, FLOOR - 58, z - 16, x + 16, FLOOR - 12, z + 16, P.marbleW, P.marbleW),
        ...boxFaces(x - 20, FLOOR - 64, z - 20, x + 20, FLOOR - 58, z + 20, P.gold, P.gold),
      ];
      M.faces.push(...parts, face([[x - 9, FLOOR - 40, z - 16.5], [x + 9, FLOOR - 40, z - 16.5], [x + 9, FLOOR - 32, z - 16.5], [x - 9, FLOOR - 32, z - 16.5]], [0, 0, -1], P.goldD));
      Rf.faces.push(...this.mirror(parts));
    }
    // ---- the picture frames on the walls (empty: dark canvas inside a deep gold frame)
    for (const sl of HALL_SLOTS.filter((q) => q.kind === 'frame')) {
      const s = sl.side, x = s * (WALL - 2), z = sl.z, n = [-s, 0, 0], w = 78, y1 = -230, y2 = -70;
      M.faces.push(face([[x, y1, z - w], [x, y1, z + w], [x, y2, z + w], [x, y2, z - w]], n, P.gold, { bias: 200 }));
      M.faces.push(face([[x - s * 2, y1 + 10, z - w + 10], [x - s * 2, y1 + 10, z + w - 10], [x - s * 2, y2 - 10, z + w - 10], [x - s * 2, y2 - 10, z - w + 10]], n, P.goldD, { bias: 190 }));
      M.faces.push(face([[x - s * 3, y1 + 16, z - w + 16], [x - s * 3, y1 + 16, z + w - 16], [x - s * 3, y2 - 16, z + w - 16], [x - s * 3, y2 - 16, z - w + 16]], n, P.frameIn, { bias: 180 }));
      M.faces.push(face([[x - s * 3, y2 + 10, z - 22], [x - s * 3, y2 + 10, z + 22], [x - s * 3, y2 + 18, z + 22], [x - s * 3, y2 + 18, z - 22]], n, P.goldD, { bias: 180 }));   // its little nameplate
    }
    // ---- the far end: a three-step dais, the great plinth (empty), banners, and a stained-glass window
    const E = LEN, pl = HALL_SLOTS.find((q) => q.kind === 'plinth');
    for (let i = 0; i < 3; i++) { const w = 240 - i * 40, d = 300 - i * 50, top = FLOOR - 14 * (i + 1); const st = boxFaces(-w, top, E - d, w, top + 14, E, P.marbleW, i === 2 ? P.carpet : P.marbleW); M.faces.push(...st); Rf.faces.push(...this.mirror(st)); }
    const plinth = [...boxFaces(-46, FLOOR - 42 - 70, pl.z - 46, 46, FLOOR - 42, pl.z + 46, P.marbleW), ...boxFaces(-54, FLOOR - 42 - 80, pl.z - 54, 54, FLOOR - 42 - 70, pl.z + 54, P.gold)];
    M.faces.push(...plinth); Rf.faces.push(...this.mirror(plinth));
    M.faces.push(face([[-WALL, CEIL, E], [WALL, CEIL, E], [WALL, FLOOR, E], [-WALL, FLOOR, E]], [0, 0, -1], P.crimsonD, { bias: 500 }));
    // the window: a tall pointed arch of coloured glass in lead, glowing (no fog on it)
    const wy1 = -300, wy2 = -60, ww = 110, segs = 9;
    const arch = []; for (let i = 0; i <= segs; i++) { const a = Math.PI * i / segs; arch.push([Math.cos(a) * ww, wy1 + 60 - Math.sin(a) * 90]); }
    M.faces.push(face([[-ww - 10, wy1 + 60, E - 1], [ww + 10, wy1 + 60, E - 1], [ww + 10, wy2 + 10, E - 1], [-ww - 10, wy2 + 10, E - 1]], [0, 0, -1], P.goldD, { bias: 450 }));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x1 = -ww + c * ww / 2, y1 = wy1 + 60 + r * (wy2 - wy1 - 60) / 4, x2 = x1 + ww / 2 - 3, y2 = y1 + (wy2 - wy1 - 60) / 4 - 3;
      M.faces.push(face([[x1 + 1.5, y1 + 1.5, E - 2], [x2, y1 + 1.5, E - 2], [x2, y2, E - 2], [x1 + 1.5, y2, E - 2]], [0, 0, -1], P.glass[(r * 3 + c * 5) % P.glass.length], { bias: 440, nofog: true }));
    }
    for (let i = 0; i < segs; i++) {
      const [ax, ay] = arch[i], [bx, by] = arch[i + 1];
      M.faces.push(face([[0, wy1 + 60, E - 2], [bx * 0.94, by + 3, E - 2], [ax * 0.94, ay + 3, E - 2]], [0, 0, -1], P.glass[i % P.glass.length], { bias: 440, nofog: true }));
    }
    for (const s of [-1, 1]) {                                                            // banners hanging either side
      const x = s * 190;
      M.faces.push(face([[x - 34, CEIL + 40, E - 4], [x + 34, CEIL + 40, E - 4], [x + 34, -20, E - 4], [x, 8, E - 4], [x - 34, -20, E - 4]], [0, 0, -1], P.banner, { bias: 430 }));
      M.faces.push(face([[x - 34, CEIL + 40, E - 5], [x + 34, CEIL + 40, E - 5], [x + 34, CEIL + 52, E - 5], [x - 34, CEIL + 52, E - 5]], [0, 0, -1], P.gold, { bias: 420 }));
      M.faces.push(face([[x, -120, E - 5], [x + 14, -100, E - 5], [x, -80, E - 5], [x - 14, -100, E - 5]], [0, 0, -1], P.gold, { bias: 420 }));
    }
    // ---- the entrance wall round the doorway (seen from outside as you arrive)
    for (const [x1, x2, y1, y2] of [[-WALL, -150, CEIL, FLOOR], [150, WALL, CEIL, FLOOR], [-150, 150, CEIL, -210]])
      M.faces.push(face([[x1, y1, DOOR_Z], [x2, y1, DOOR_Z], [x2, y2, DOOR_Z], [x1, y2, DOOR_Z]], [0, 0, -1], P.crimsonD));
    M.faces.push(...boxFaces(-166, -226, DOOR_Z - 8, 166, -210, DOOR_Z + 2, P.gold));
  }

  /** The same faces flipped upside down about the floor (their reflection in the polished marble), faint. */
  mirror(faces) {
    return faces.map((f) => ({ p: f.p.map(([x, y, z]) => [x, 2 * FLOOR - y, z]).reverse(), n: f.n ? [f.n[0], -f.n[1], f.n[2]] : null, c: f.c, a: 0.22 }));
  }

  /** This frame's moving parts: the two doors swinging open, and the chandeliers swaying on their chains. Returns { doors, lights }. */
  dynamic() {
    const doors = [], out = [], open = ease(Math.min(1, this.t / ARRIVE.open)) * 1.75;
    for (const s of [-1, 1]) {                                                            // the doors (hinged at the doorway's sides)
      const hx = s * 150, ex = hx - s * Math.cos(open) * 150, ez = DOOR_Z + Math.sin(open) * 150;
      doors.push({ p: [[hx, -210, DOOR_Z], [ex, -210, ez], [ex, FLOOR, ez], [hx, FLOOR, DOOR_Z]], n: null, c: P.wood });
      const k = (u) => [hx + (ex - hx) * u, DOOR_Z + (ez - DOOR_Z) * u];
      const [ax, az] = k(0.12), [bx, bz] = k(0.88);
      for (const [y1, y2] of [[-196, -60], [-40, 96]]) doors.push({ p: [[ax, y1, az - 0.5], [bx, y1, bz - 0.5], [bx, y2, bz - 0.5], [ax, y2, az - 0.5]], n: null, c: P.woodD, bias: -2 });
      const [gx, gz] = k(0.8); doors.push(...boxFaces(gx - 3, -20, gz - 4, gx + 3, 0, gz - 1, P.gold));
    }
    for (let i = 0; i < 4; i++) {                                                         // chandeliers: a chain, a gold ring of candles, crystals
      const z = 240 + i * 960, sw = Math.sin(this.t * 0.02 + i) * 6, y = -190;
      out.push(...boxFaces(-2 + sw * 0.3, CEIL + 26, z - 2, 2 + sw * 0.3, y, z + 2, P.goldD));
      out.push(...prismFaces(sw, y, y + 8, z, 46, 10, P.gold, P.gold));
      out.push(...blobFaces(sw, y + 22, z, 14, 20, 14, [0xd8f0ff, 0xa8d0f0, 0xffffff], i, null, 0.15));
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, cx = sw + Math.cos(a) * 44, cz = z + Math.sin(a) * 44; out.push(...boxFaces(cx - 2, y - 12, cz - 2, cx + 2, y, cz + 2, 0xf8f0d8)); }
    }
    return { doors, lights: out };
  }

  /** Where a point in the hall lands on the screen (and how much nearer things are scaled), or null behind you. */
  project(x, y, z) {
    const f = 300, d = z - this.camZ;
    if (d < 70 - f) return null;
    const s = f / (f + d);
    return { x: VIEW_W / 2 + (x - this.lookX) * s, y: VIEW_H / 2 + (y - this.bob) * s, s };
  }

  /** Draws every layer from where you stand. */
  draw() {
    const ex = this.lookX, ey = this.bob, cam = { midPoint: { x: ex, y: ey }, worldView: { x: ex - VIEW_W / 2, y: ey - VIEW_H / 2, width: VIEW_W, height: VIEW_H } };
    for (const R of [this.floorR, this.reflR, this.mainR]) {
      R.scene = { cameras: { main: cam } }; R.camZ = this.camZ;
      R.g.setPosition(VIEW_W / 2 - ex, VIEW_H / 2 - ey);
    }
    const g = this.bg; g.clear();
    g.fillGradientStyle(0x0a0614, 0x0a0614, 0x1a0a20, 0x1a0a20, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);   // (outside the doors: dark)
    this.floorR.render([]);
    const dyn = this.dynamic();
    this.reflR.render(this.mirror(dyn.lights));
    this.mainR.render([...dyn.doors, ...dyn.lights]);
    // light: a soft cone from the ceiling onto every pedestal and onto the plinth, the window's glow, candle glows
    const b = this.beams; b.clear();
    const cone = (x, z, top, bot, w1, w2, col, a) => {
      const p1 = this.project(x - w1, top, z), p2 = this.project(x + w1, top, z), p3 = this.project(x + w2, bot, z), p4 = this.project(x - w2, bot, z);
      if (!p1 || !p2 || !p3 || !p4 || z - this.camZ > 3400) return;
      const fade = Math.max(0, 1 - (z - this.camZ) / 3400);
      b.fillGradientStyle(col, col, col, col, a * fade * 0.3, a * fade * 0.3, a * fade, a * fade); b.fillPoints([p1, p2, p3, p4], true);
      const q = this.project(x, bot + 1, z); if (q) { b.fillStyle(col, a * fade * 0.8); b.fillEllipse(q.x, q.y, w2 * 2.4 * q.s, w2 * 0.6 * q.s); }
    };
    for (const sl of HALL_SLOTS) {
      if (sl.kind === 'pedestal') cone(sl.side * PED_X, sl.z, CEIL + 40, FLOOR - 64, 6, 26, 0xfff0c8, 0.16);
      if (sl.kind === 'plinth') cone(0, sl.z, CEIL + 40, FLOOR - 122, 10, 64, 0xffe8b0, 0.22);
    }
    const w = this.project(0, -190, LEN - 3);                                              // the window's glow pouring in
    if (w) { for (let i = 0; i < 4; i++) { b.fillStyle([0xff6a8a, 0x6aa0ff, 0xffd870, 0xc08aff][i], 0.05); b.fillCircle(w.x + (i - 1.5) * 14 * w.s, w.y, (140 - i * 20) * w.s); } }
    const fl = this.project(0, FLOOR, LEN - 500);
    if (w && fl) { b.fillStyle(0xfff0d0, 0.05); b.fillTriangle(w.x - 90 * w.s, w.y, w.x + 90 * w.s, w.y, fl.x + 200 * fl.s, fl.y); b.fillTriangle(w.x - 90 * w.s, w.y, fl.x + 200 * fl.s, fl.y, fl.x - 200 * fl.s, fl.y); }
    for (let i = 0; i < 4; i++) {
      const z = 240 + i * 960, sw = Math.sin(this.t * 0.02 + i) * 6, c = this.project(sw, -200, z);
      if (!c) continue;
      const fk = Math.max(0, 1 - (z - this.camZ) / 3600), flick = 0.85 + 0.15 * Math.sin(this.t * 0.3 + i * 2);
      for (let r = 0; r < 6; r++) { b.fillStyle(0xffd890, 0.035 * fk * flick); b.fillCircle(c.x, c.y, (120 - r * 18) * c.s); }   // (soft-edged: rings of faint light)
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, q = this.project(sw + Math.cos(a) * 44, -204, z + Math.sin(a) * 44); if (q) { b.fillStyle(0xffe070, 0.8 * fk); b.fillCircle(q.x, q.y, Math.max(1, 3 * q.s * flick)); } }
    }
    if (this.t < ARRIVE.glide) { const k = ease(Math.min(1, this.t / ARRIVE.open)); const d = this.project(0, -60, DOOR_Z + 200); if (d) { b.fillStyle(0xffe8c0, 0.18 * k * (1 - this.t / ARRIVE.glide)); b.fillRect(0, 0, VIEW_W, VIEW_H); } }   // light flooding out as the doors open
    // dust drifting in the light
    const mg = this.motesG; mg.clear();
    for (const m of this.motes) {
      m.y += 0.08; m.x += Math.sin(this.t * 0.01 + m.z) * 0.1; if (m.y > FLOOR) m.y = CEIL + 40;
      let z = m.z; while (z < this.camZ - 150) z += 1400; while (z > this.camZ + 1250) z -= 1400;
      const q = this.project(m.x, m.y, z); if (!q) continue;
      mg.fillStyle(0xfff0d0, m.s * Math.min(1, q.s * 1.5)); mg.fillRect(q.x, q.y, Math.max(1, 2 * q.s), Math.max(1, 2 * q.s));
    }
  }

  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }

  /** Every frame: the arrival, walking and looking, then draws the hall and the words. */
  update() {
    this.t++;
    const m = this.menu.poll(), K = this.menu.keys;
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    // walking and looking (keys, sticks / d-pads, or a held pointer)
    let fwd = 0, side = 0;
    if (K.up.isDown || K.up2.isDown) fwd += 1;
    if (K.down.isDown || K.down2.isDown) fwd -= 1;
    if (K.left.isDown || K.left2.isDown) side -= 1;
    if (K.right.isDown || K.right2.isDown) side += 1;
    for (let i = 0; i < 4; i++) {
      const p = readPad(i); if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0, bt = (n) => !!(p.buttons[n] && p.buttons[n].pressed);
      if (ay < -0.4 || bt(12)) fwd += 1; if (ay > 0.4 || bt(13)) fwd -= 1;
      if (ax < -0.4 || bt(14)) side -= 1; if (ax > 0.4 || bt(15)) side += 1;
    }
    if (this.held && this.held.isDown) { fwd += this.held.y < VIEW_H / 2 ? 1 : -1; side += Math.abs(this.held.x - VIEW_W / 2) > 90 ? Math.sign(this.held.x - VIEW_W / 2) : 0; }
    fwd = Math.max(-1, Math.min(1, fwd)); side = Math.max(-1, Math.min(1, side));
    if (this.t < ARRIVE.glide) {                                                            // the arrival: the doors open, you glide in
      const k = ease(Math.max(0, (this.t - ARRIVE.open * 0.6) / (ARRIVE.glide - ARRIVE.open * 0.6)));
      this.camZ = WALK.start + (WALK.enter - WALK.start) * k;
      if (this.t === 10) sfx('rumble', 0.4, 0.6);
    } else {
      this.vz += (fwd * WALK.speed - this.vz) * WALK.accel;
      this.camZ = Math.max(WALK.enter - 80, Math.min(WALK.max, this.camZ + this.vz));
      if ((this.camZ <= WALK.enter - 80 && this.vz < 0) || (this.camZ >= WALK.max && this.vz > 0)) this.vz = 0;
    }
    this.look += (side * WALK.look - this.look) * 0.08;
    this.lookX = this.look + Math.sin(this.t * 0.011) * 10;                                 // (and a slow, gentle sway)
    const walking = Math.abs(this.vz) > 0.5;
    this.bob = walking ? Math.sin(this.camZ * 0.045) * 2.5 : this.bob * 0.9;
    if (walking && Math.floor(this.camZ / 60) !== this.lastStep) { this.lastStep = Math.floor(this.camZ / 60); sfx('land', 0.12, 0.8); }
    this.draw();
    // the words: "the hall stands empty" after you arrive, then the slot you're passing
    const a = this.t < ARRIVE.glide ? 0 : this.t < ARRIVE.glide + 30 ? (this.t - ARRIVE.glide) / 30 : this.t < ARRIVE.glide + 240 ? 1 : Math.max(0, 1 - (this.t - ARRIVE.glide - 240) / 40);
    this.title.setAlpha(a); this.sub.setAlpha(a);
    const near = HALL_SLOTS.filter((s) => s.kind !== 'frame' && s.z - this.camZ > 120 && s.z - this.camZ < 520).sort((p, q) => Math.abs(p.side * PED_X - this.lookX) - Math.abs(q.side * PED_X - this.lookX))[0];
    this.slotText.setText(near && a < 0.5 ? (near.kind === 'plinth' ? 'THE GREAT PLINTH  -  AWAITING A STATUE' : 'PEDESTAL ' + (near.side < 0 ? 'L' : 'R') + near.id.slice(-1) + '  -  EMPTY') : '');
  }
}
