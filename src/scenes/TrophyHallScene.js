// TROPHY HALL (Trinkets > TROPHY HALL): a grand gallery in real low-poly 3D, built with the same renderer as the N64
// stages (poly3d.js) - a long marble hall with a polished checkerboard floor that mirrors the columns, a coffered
// ceiling with gold beams, crimson walls with gold-framed spaces for paintings, rows of marble columns, a lit
// pedestal in every bay, chandeliers, and at the far end a dais with a great empty plinth under a stained-glass window.
// Every pedestal, frame and the plinth is a slot (src/data/trophyHall.js); what's on show is DISPLAY there: ten pixel
// paintings (public/assets/hall/paintings.png, drawn onto the walls in perspective as thin vertical strips -
// `makePaintings` / `drawPaintings`) and THE YOU DID IT TROPHY (a gold rock on a trophy base, real 3D, turning -
// `trophyFaces`). Walk up to one and press J to LOOK CLOSER (`openInspect`: the painting big with its story, or the
// trophy turning in a spotlight; left/right flips through everything on show).
// W/S or up/down walk, A/D or left/right look, J look closer, K / Esc / B back. Touch / mouse: hold the top half to
// walk forward, the bottom half to walk back, left or right of the middle to look that way; tap LOOK CLOSER.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { readPad } from '../input/controllers.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { titleBanner, hintBar, ARC } from '../ui/arcade.js';
import { Poly3D, boxFaces, prismFaces, blobFaces, pyramidFaces } from '../stage/poly3d.js';
import { checkAchievements, trophyEarned, trophyProgress, TROPHY_GOALS } from '../achievements.js';
import { achievementToasts } from '../ui/toast.js';
import { HALL, HALL_SLOTS, DISPLAY, PAINTINGS, TROPHIES } from '../data/trophyHall.js';

// the room (px; x 0 = the middle of the hall, y 0 = eye height, +y down, +z away from you)
const FLOOR = 110;          // the floor's height
const CEIL = -330;          // the ceiling's height
const WALL = 300;           // the side walls (x = -WALL and +WALL)
const COL_X = 262;          // the columns' line
const PED_X = 196;          // the pedestals' line
const DOOR_Z = -40;         // the entrance (the doors swing open into the hall)
const LEN = HALL.length;    // the far wall
// a painting's canvas on the wall: half its width (along the hall), its top and bottom, how many strips it's drawn in
// (ordinary frames hold 160x112 pictures, the GREAT frames at the far end the 320x224 masterpieces)
const CANVAS = { half: 78, top: -214, bot: -105, strips: 32 };
const GREAT = { half: 190, top: -282, bot: -16, strips: 56 };
const canvasOf = (slot) => (slot.big ? GREAT : CANVAS);
// a masterpiece's animation: game frames per picture
const ANIM = 9;
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
// the ledger of ACHIEVEMENTS: a lectern with an open book just inside the doors, on the left (look closer = the ACHIEVEMENTS page)
const LEDGER = { id: 'ledger', kind: 'ledger', side: -1, x: -132, z: 70 };
// where a trophy stands: on its pedestal, or (the phoenix) twice as big on the great plinth
const trophySpot = (sl) => (sl.kind === 'plinth' ? { x: 0, y: FLOOR - 122, z: sl.z, k: 2.2 } : { x: sl.side * PED_X, y: FLOOR - 64, z: sl.z, k: 1 });

/** A flat face with a known outward normal (so it's culled and lit like the stage geometry). */
const face = (pts, n, c, extra = {}) => ({ p: pts, n, c, ...extra });

/** The TROPHY HALL screen: the 3D gallery you walk through. */
export class TrophyHallScene extends Phaser.Scene {
  constructor() { super('TrophyHall'); }

  /** Loads the paintings (only this screen uses them). */
  preload() {
    this.load.spritesheet('hall_paintings', 'assets/hall/paintings.png', { frameWidth: 160, frameHeight: 112 });
    for (const P of PAINTINGS) if (P.big) this.load.spritesheet(P.sheet, 'assets/hall/master_' + P.id + '.png', { frameWidth: 320, frameHeight: 224 });
  }

  /** Builds the hall, its lights and its words, and starts the doors opening. */
  create(data) {
    this.t = 0; this.menu = new MenuInput(this);
    this.camZ = WALK.start; this.vz = 0; this.lookX = 0; this.look = 0; this.bob = 0;
    if (data && data.back) { this.t = ARRIVE.glide + 300; this.camZ = data.back.camZ; }   // (back from the ACHIEVEMENTS: where you were, doors already open)
    const fresh = checkAchievements();                                                    // (trophies earned since last time pop up)
    playMusic(this, 'bgm_trophy_hall');
    this.cameras.main.setBackgroundColor(0x05030a);
    this.bg = this.add.graphics().setDepth(-30);
    // the 3D layers, back to front: the floor, the columns' reflections in it, the hall itself
    const L = { fog: 0x0e0814, zNear: 500, zFar: 4700, fogMax: 0.78, f: 300, lift: 0, near: 70, sat: 1.15, edge: 0.08, light: [-0.25, 1, 0.45] };
    this.floorR = new Poly3D(this, [], { ...L, edge: 0.04 });
    this.reflR = new Poly3D(this, [], { ...L, edge: 0 });
    this.mainR = new Poly3D(this, [], L);                                                  // the room itself: walls, ceiling, frames, the far end
    this.objR = new Poly3D(this, [], L);                                                   // what stands in it: columns, pedestals, the dais, the trophy, doors, chandeliers
    for (const [R, d] of [[this.floorR, -25], [this.reflR, -24], [this.mainR, -23.5], [this.objR, -23]]) R.g.setDepth(d);   // (the paintings go between the walls and the columns)
    this.beams = this.add.graphics().setDepth(-22).setBlendMode(Phaser.BlendModes.ADD);   // spotlights, window light, chandelier glow
    this.motesG = this.add.graphics().setDepth(-21).setBlendMode(Phaser.BlendModes.ADD);
    this.items = Object.entries(DISPLAY).map(([slot, d]) => ({ slot: HALL_SLOTS.find((q) => q.id === slot), painting: d.painting && PAINTINGS.find((q) => q.id === d.painting), trophy: d.trophy && TROPHIES.find((q) => q.id === d.trophy) })).filter((it) => it.slot && (it.painting || it.trophy));
    for (const it of this.items) if (it.trophy) it.earned = !!it.trophy.free || trophyEarned(it.trophy.id);
    this.items.unshift({ slot: LEDGER, ledger: true });                                   // the ledger of ACHIEVEMENTS by the door
    this.build();
    this.makePaintings();
    this.motes = Array.from({ length: 70 }, (_, i) => ({ x: (this.rnd(i, 1) - 0.5) * 520, y: CEIL + this.rnd(i, 2) * (FLOOR - CEIL), z: this.rnd(i, 3) * 1400, s: 0.2 + this.rnd(i, 4) * 0.5 }));

    titleBanner(this, 'TROPHY HALL', ARC.sections.trinkets, { crumb: 'TRINKETS  >  TROPHY HALL' });
    hintBar(this, 'W/S WALK   A/D LOOK   J  LOOK CLOSER   Q  ACHIEVEMENTS   K / ESC / B  BACK', ARC.sections.trinkets);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    const shown = this.items.filter((it) => it.painting || it.earned).length, total = HALL_SLOTS.length, cups = this.items.filter((it) => it.trophy);
    this.count = this.add.text(VIEW_W - 10, 26, 'ON DISPLAY  ' + shown + ' / ' + total + '\nTROPHIES  ' + cups.filter((it) => it.earned).length + ' / ' + cups.length, { fontFamily: FONT, fontSize: '7px', color: '#f0d890', stroke: '#1a0a14', strokeThickness: 3 }).setOrigin(1, 0).setDepth(20);
    this.title = this.add.text(VIEW_W / 2, 132, 'WELCOME TO THE TROPHY HALL', { fontFamily: FONT, fontSize: '16px', color: '#f6d77a', stroke: '#2a0a10', strokeThickness: 5 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.sub = this.add.text(VIEW_W / 2, 154, 'WALK UP TO A PAINTING OR A TROPHY AND PRESS J', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#2a0a10', strokeThickness: 3 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.slotText = this.add.text(VIEW_W / 2, VIEW_H - 38, '', { fontFamily: FONT, fontSize: '7px', color: '#e8d0a0', stroke: '#1a0a14', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.prompt = this.add.text(VIEW_W / 2, VIEW_H - 27, 'J / ENTER / TAP  LOOK CLOSER', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', backgroundColor: '#5a2a7a', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(20).setVisible(false)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.near && !this.inspect) this.openInspect(this.items.indexOf(this.near)); });
    this.qKey = this.input.keyboard && this.input.keyboard.addKey('Q', false);
    if (fresh.length) achievementToasts(this, fresh, { delay: 3000 });
    this.held = null;
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.held = p; });
    this.input.on('pointerup', () => { this.held = null; });
    sfx('clang', 0.4, 0.5);
  }

  /** A repeatable 0-1 number (so the motes, veins and sway look the same every visit). */
  rnd(a, b) { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  /** Builds the hall's static geometry once (floor, reflections, walls, ceiling, columns, pedestals, frames, dais). */
  build() {
    const F = this.floorR, M = this.mainR, O = this.objR, Rf = this.reflR, T = 120;
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
      O.faces.push(...parts); Rf.faces.push(...this.mirror(parts));
    }
    // ---- a pedestal in every bay on both sides (empty), with a gold plaque on its front
    for (const sl of HALL_SLOTS.filter((q) => q.kind === 'pedestal')) {
      const x = sl.side * PED_X, z = sl.z, parts = [
        ...boxFaces(x - 22, FLOOR - 12, z - 22, x + 22, FLOOR, z + 22, P.marbleK, P.marbleK),
        ...boxFaces(x - 16, FLOOR - 58, z - 16, x + 16, FLOOR - 12, z + 16, P.marbleW, P.marbleW),
        ...boxFaces(x - 20, FLOOR - 64, z - 20, x + 20, FLOOR - 58, z + 20, P.gold, P.gold),
      ];
      O.faces.push(...parts, face([[x - 9, FLOOR - 40, z - 16.5], [x + 9, FLOOR - 40, z - 16.5], [x + 9, FLOOR - 32, z - 16.5], [x - 9, FLOOR - 32, z - 16.5]], [0, 0, -1], P.goldD));
      Rf.faces.push(...this.mirror(parts));
    }
    // ---- the ledger: a dark wood lectern with a big open book of achievements (gold-edged pages, a red ribbon)
    { const x = LEDGER.x, z = LEDGER.z, top = FLOOR - 52;
      O.faces.push(...boxFaces(x - 14, FLOOR - 6, z - 12, x + 14, FLOOR, z + 12, P.woodD, P.wood), ...prismFaces(x, top + 6, FLOOR - 6, z, 5, 8, P.wood, P.wood));
      O.faces.push({ p: [[x - 18, top - 4, z + 8], [x + 18, top - 4, z + 8], [x + 18, top + 6, z - 10], [x - 18, top + 6, z - 10]], n: [0, -0.87, -0.5], c: P.woodD });
      O.faces.push({ p: [[x - 16, top - 6, z + 6], [x - 1, top - 5, z + 6], [x - 1, top + 3, z - 8], [x - 16, top + 3, z - 8]], n: [0, -0.87, -0.5], c: 0xf4ead0, bias: -1 });
      O.faces.push({ p: [[x + 1, top - 5, z + 6], [x + 16, top - 6, z + 6], [x + 16, top + 3, z - 8], [x + 1, top + 3, z - 8]], n: [0, -0.87, -0.5], c: 0xece0c0, bias: -1 });
      O.faces.push({ p: [[x - 1, top - 5, z + 6], [x + 1, top - 5, z + 6], [x + 1, top + 12, z - 9], [x - 1, top + 12, z - 9]], n: null, c: 0xc01828, bias: -2 });
      Rf.faces.push(...this.mirror(boxFaces(x - 14, FLOOR - 6, z - 12, x + 14, FLOOR, z + 12, P.woodD, P.wood))); }
    // ---- the picture frames on the walls (a dark canvas inside a deep gold frame; the paintings are drawn over the canvas)
    for (const sl of HALL_SLOTS.filter((q) => q.kind === 'frame')) {
      const C = canvasOf(sl), s = sl.side, x = s * (WALL - 2), z = sl.z, n = [-s, 0, 0], w = C.half + 16, y1 = C.top - 16, y2 = C.bot + 16;
      M.faces.push(face([[x, y1, z - w], [x, y1, z + w], [x, y2, z + w], [x, y2, z - w]], n, P.gold, { bias: 200 }));
      M.faces.push(face([[x - s * 2, y1 + 10, z - w + 10], [x - s * 2, y1 + 10, z + w - 10], [x - s * 2, y2 - 10, z + w - 10], [x - s * 2, y2 - 10, z - w + 10]], n, P.goldD, { bias: 190 }));
      M.faces.push(face([[x - s * 3, y1 + 16, z - w + 16], [x - s * 3, y1 + 16, z + w - 16], [x - s * 3, y2 - 16, z + w - 16], [x - s * 3, y2 - 16, z - w + 16]], n, P.frameIn, { bias: 180 }));
      M.faces.push(face([[x - s * 3, y2 + 10, z - 22], [x - s * 3, y2 + 10, z + 22], [x - s * 3, y2 + 18, z + 22], [x - s * 3, y2 + 18, z - 22]], n, P.goldD, { bias: 180 }));   // its little nameplate
    }
    // ---- the far end: a three-step dais, the great plinth (empty), banners, and a stained-glass window
    const E = LEN, pl = HALL_SLOTS.find((q) => q.kind === 'plinth');
    for (let i = 0; i < 3; i++) { const w = 240 - i * 40, d = 300 - i * 50, top = FLOOR - 14 * (i + 1); const st = boxFaces(-w, top, E - d, w, top + 14, E, P.marbleW, i === 2 ? P.carpet : P.marbleW); O.faces.push(...st); Rf.faces.push(...this.mirror(st)); }
    const plinth = [...boxFaces(-46, FLOOR - 42 - 70, pl.z - 46, 46, FLOOR - 42, pl.z + 46, P.marbleW), ...boxFaces(-54, FLOOR - 42 - 80, pl.z - 54, 54, FLOOR - 42 - 70, pl.z + 54, P.gold)];
    O.faces.push(...plinth); Rf.faces.push(...this.mirror(plinth));
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
    for (let i = 0; i < 5; i++) {                                                         // chandeliers: a chain, a gold ring of candles, crystals
      const z = 240 + i * 900, sw = Math.sin(this.t * 0.02 + i) * 6, y = -190;
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
    for (const R of [this.floorR, this.reflR, this.mainR, this.objR]) {
      R.scene = { cameras: { main: cam } }; R.camZ = this.camZ;
      R.g.setPosition(VIEW_W / 2 - ex, VIEW_H / 2 - ey);
    }
    const g = this.bg; g.clear();
    g.fillGradientStyle(0x0a0614, 0x0a0614, 0x1a0a20, 0x1a0a20, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);   // (outside the doors: dark)
    this.floorR.render([]);
    const dyn = this.dynamic();
    this.reflR.render(this.mirror(dyn.lights));
    this.mainR.render([]);
    const cups = this.items.filter((it) => it.trophy), ang = this.t * 0.02, tf = [];
    for (const it of cups) { const S = trophySpot(it.slot); if (S.z - this.camZ < 4300) tf.push(...this.trophyFaces(it.trophy.model, S.x, S.y, S.z, ang, S.k, !it.earned)); }
    this.objR.render([...dyn.doors, ...dyn.lights, ...tf]);
    this.drawPaintings();
    // light: a soft cone from the ceiling onto every pedestal and onto the plinth, the window's glow, candle glows
    const b = this.beams; b.clear();
    const cone = (x, z, top, bot, w1, w2, col, a) => {
      const p1 = this.project(x - w1, top, z), p2 = this.project(x + w1, top, z), p3 = this.project(x + w2, bot, z), p4 = this.project(x - w2, bot, z);
      if (!p1 || !p2 || !p3 || !p4 || z - this.camZ > 3900) return;
      const fade = Math.max(0, 1 - (z - this.camZ) / 3900);
      b.fillGradientStyle(col, col, col, col, a * fade * 0.3, a * fade * 0.3, a * fade, a * fade); b.fillPoints([p1, p2, p3, p4], true);
      const q = this.project(x, bot + 1, z); if (q) { b.fillStyle(col, a * fade * 0.8); b.fillEllipse(q.x, q.y, w2 * 2.4 * q.s, w2 * 0.6 * q.s); }
    };
    for (const sl of HALL_SLOTS) {
      if (sl.kind === 'pedestal') cone(sl.side * PED_X, sl.z, CEIL + 40, FLOOR - 64, 6, 26, 0xfff0c8, 0.16);
      if (sl.kind === 'plinth') cone(0, sl.z, CEIL + 40, FLOOR - 122, 10, 64, 0xffe8b0, 0.22);
      if (sl.big) {                                                                     // a brass picture lamp washing light down a masterpiece
        const q = this.project(sl.side * (WALL - 6), GREAT.top - 4, sl.z), fk = Math.max(0, 1 - (sl.z - this.camZ) / 4000);
        if (q) for (let r = 0; r < 5; r++) { b.fillStyle(0xffe8b8, 0.045 * fk); b.fillEllipse(q.x, q.y + 30 * q.s, (300 - r * 50) * q.s * 0.6, (180 - r * 26) * q.s); }
      }
    }
    for (const it of cups) {                                                              // the earned trophies glinting
      if (!it.earned) continue;
      const S = trophySpot(it.slot);
      for (let i = 0; i < 5; i++) {
        const a = this.t * 0.05 + i * 1.26, q = this.project(S.x + Math.cos(a) * 16 * S.k, S.y - (34 + Math.sin(a * 1.7) * 8) * S.k, S.z + Math.sin(a) * 16 * S.k);
        if (q && (this.t + i * 11) % 40 < 20) { const r = Math.max(1, 3 * q.s); b.fillStyle(0xfff0a0, 0.9); b.fillRect(q.x - r, q.y, r * 2 + 1, 1); b.fillRect(q.x, q.y - r, 1, r * 2 + 1); }
      }
    }
    const w = this.project(0, -190, LEN - 3);                                              // the window's glow pouring in
    if (w) { for (let i = 0; i < 4; i++) { b.fillStyle([0xff6a8a, 0x6aa0ff, 0xffd870, 0xc08aff][i], 0.05); b.fillCircle(w.x + (i - 1.5) * 14 * w.s, w.y, (140 - i * 20) * w.s); } }
    const fl = this.project(0, FLOOR, LEN - 500);
    if (w && fl) { b.fillStyle(0xfff0d0, 0.05); b.fillTriangle(w.x - 90 * w.s, w.y, w.x + 90 * w.s, w.y, fl.x + 200 * fl.s, fl.y); b.fillTriangle(w.x - 90 * w.s, w.y, fl.x + 200 * fl.s, fl.y, fl.x - 200 * fl.s, fl.y); }
    for (let i = 0; i < 5; i++) {
      const z = 240 + i * 900, sw = Math.sin(this.t * 0.02 + i) * 6, c = this.project(sw, -200, z);
      if (!c) continue;
      const fk = Math.max(0, 1 - (z - this.camZ) / 4000), flick = 0.85 + 0.15 * Math.sin(this.t * 0.3 + i * 2);
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

  /**
   * A trophy in 3D: every one stands on the same black marble base with a gold plaque; on top, its own model, turning
   * slowly (built round 0,0,0 = the middle of the base's top, then turned by ang, scaled by k and set at x, y, z).
   * model: gold-rock (YOU DID IT: a gold stem and dish, a lumpy nugget of solid gold), sword (a toy sword with a red
   * hilt on a gold stand), boot (a winged bronze boot), goldfish (a silver goldfish leaping off a silver wave), crown
   * (crystal spikes on a gold band, on a red cushion), phoenix (a golden phoenix with spread wings, rising out of fire).
   * locked: the top is a dark shadow of itself. Returns the faces (for a Poly3D).
   */
  trophyFaces(model, x, y, z, ang, k = 1, locked = false) {
    const out = [];
    out.push(...boxFaces(x - 14 * k, y - 8 * k, z - 10 * k, x + 14 * k, y, z + 10 * k, 0x1a1418, 0x3a3440));
    out.push(...boxFaces(x - 10 * k, y - 15 * k, z - 7 * k, x + 10 * k, y - 8 * k, z + 7 * k, 0x2a2430, 0x4a4450));
    out.push({ p: [[x - 8 * k, y - 6.5 * k, z - 10.4 * k], [x + 8 * k, y - 6.5 * k, z - 10.4 * k], [x + 8 * k, y - 1.5 * k, z - 10.4 * k], [x - 8 * k, y - 1.5 * k, z - 10.4 * k]], n: [0, 0, -1], c: locked ? 0x5a5060 : 0xe0b040, bias: -1 });   // the plaque
    const T = [], flat = (pts, zz, c) => T.push({ p: pts.map(([px, py]) => [px, py, zz]), n: null, c });
    const G = [0xffd040, 0xf0b020, 0xffe070, 0xd89818];
    if (model === 'gold-rock') {
      T.push(...prismFaces(0, -10, 0, 0, 2.6, 6, G[1], G[0]), ...prismFaces(0, -13, -10, 0, 9, 8, G[3], G[2]), ...blobFaces(0, -22, 0, 11, 9, 10, G, 7, 0xfff0a0, 0.48));
    } else if (model === 'sword') {
      T.push(...prismFaces(0, -2, 0, 0, 7, 8, G[3], G[2]), ...prismFaces(0, -9, -2, 0, 1.7, 6, 0x6a3a1a));
      T.push(...boxFaces(-8, -12, -1.8, 8, -9, 1.8, 0xe83a3a, 0xff6a5a), ...boxFaces(-1.7, -46, -0.7, 1.7, -12, 0.7, 0xd8e0ec, 0xffffff), ...pyramidFaces(0, -46, 0, 3.4, 1.4, 7, 0xe8f0f8));
      T.push(...blobFaces(0, -10.5, 0, 2.4, 2.4, 2.4, [0xffd040, 0xffe070], 3, null, 0.1));
    } else if (model === 'boot') {
      const B = 0xc87a3a, BL = 0xe8a060;
      T.push(...boxFaces(-6, -3, -4.5, 10, 0, 4.5, 0x7a3a12), ...boxFaces(-6, -10, -4, 7, -3, 4, B, BL), ...blobFaces(7, -6, 0, 4.5, 4, 4, [B, BL], 4, null, 0.1));
      T.push(...boxFaces(-6, -26, -4, 1, -10, 4, B, BL), ...boxFaces(-7, -29, -5, 2, -25, 5, BL, 0xffc890));
      for (const zz of [-4.6, 4.6]) flat([[-6, -22], [-15, -31], [-12, -25], [-17, -24], [-12, -19], [-16, -16], [-6, -14]], zz, 0xffd040);   // its wings
    } else if (model === 'goldfish') {
      const S = 0xdde4ee;
      T.push(...blobFaces(0, -4, 0, 10, 4, 7, [0xa8c8e0, 0xc8e0f0, 0xffffff], 9, 0xffffff, 0.3), ...blobFaces(1, -18, 0, 9, 6, 4.5, [S, 0xc8d0dc], 5, 0xffffff, 0.1));
      flat([[-7, -18], [-16, -26], [-13, -18], [-16, -9]], 0, 0xc8d0dc); flat([[-2, -23], [2, -29], [6, -23]], 0, 0xc8d0dc);
      for (const zz of [-4.4, 4.4]) T.push(...boxFaces(6, -21, zz - 0.4, 8, -19, zz + 0.4, 0x101018));
    } else if (model === 'crown') {
      T.push(...blobFaces(0, -5, 0, 10, 5, 10, [0xa01828, 0xc02030], 6, 0xd8303a, 0.1), ...prismFaces(0, -17, -8, 0, 8.5, 10, 0xe0b040, 0xffe070));
      for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2; T.push(...pyramidFaces(Math.cos(q) * 7.5, -17, Math.sin(q) * 7.5, 3, 3, 7 + (i % 2) * 5, i % 2 ? 0x3ab0e8 : 0x7ae8ff)); }
      T.push(...pyramidFaces(0, -17, 0, 5, 5, 17, 0xc8f4ff));
      for (let i = 0; i < 5; i++) { const q = i / 5 * Math.PI * 2; T.push(...boxFaces(Math.cos(q) * 8.6 - 1, -13.5, Math.sin(q) * 8.6 - 1, Math.cos(q) * 8.6 + 1, -11.5, Math.sin(q) * 8.6 + 1, 0xe83a5a)); }
    } else if (model === 'phoenix') {
      for (let i = 0; i < 9; i++) { const q = i / 9 * Math.PI * 2; T.push(...pyramidFaces(Math.cos(q) * 6, 0, Math.sin(q) * 6, 4, 4, 10 + (i % 3) * 4, [0xff3a1a, 0xff8a1a, 0xffd040][i % 3])); }
      T.push(...blobFaces(0, -24, 0, 6, 8, 5, [0xffa030, 0xffc040], 8, 0xffe070, 0.12), ...blobFaces(2, -35, 0, 3.6, 3.6, 3, [0xffc040, 0xffd060], 2, null, 0.05));
      T.push(...boxFaces(5, -36, -0.6, 9, -34.5, 0.6, 0xff6a1a));
      for (const sx of [1, -1]) { flat([[2 * sx, -28], [18 * sx, -50], [14 * sx, -40], [24 * sx, -42], [16 * sx, -30], [22 * sx, -30], [10 * sx, -22]], sx * 1.5, 0xff8a1a); flat([[3 * sx, -27], [12 * sx, -40], [10 * sx, -30]], sx * 1.6, 0xffd040); }
      flat([[-1, -18], [-9, -4], [0, -9], [9, -4], [1, -18]], -3, 0xff5a1a); flat([[1, -38], [3, -46], [4, -38]], 0, 0xff3a1a);
    }
    const c = Math.cos(ang), sn = Math.sin(ang), rot = (v) => [v[0] * c + v[2] * sn, v[1], -v[0] * sn + v[2] * c], y0 = y - 15 * k;
    const dark = [0x1e1a28, 0x2a2436, 0x24202e];
    T.forEach((f, i) => out.push({ ...f, c: locked ? dark[i % 3] : f.c, p: f.p.map((v) => { const r = rot(v); return [x + r[0] * k, y0 + r[1] * k, z + r[2] * k]; }), n: f.n && rot(f.n), bias: -2 }));
    return out;
  }

  /** Cuts every painting on show into thin vertical strips (one Image each, a texture frame per strip and picture), so it can be drawn on the wall in perspective. */
  makePaintings() {
    for (const it of this.items) {
      const P = it.painting;
      if (!P) continue;
      const key = P.big ? P.sheet : 'hall_paintings', tex = this.textures.get(key), pw = P.big ? 320 : 160, phh = P.big ? 224 : 112;
      const N = canvasOf(it.slot).strips, SW = pw / N, pics = P.big ? P.frames : 1;
      it.key = key; it.pics = pics; it.imgs = [];
      for (let af = 0; af < pics; af++) {
        const fx = P.big ? af * pw : (P.frame % 5) * pw, fy = P.big ? 0 : Math.floor(P.frame / 5) * phh;
        for (let k = 0; k < N; k++) { const name = (P.big ? P.id : 'p' + P.frame) + '_' + af + '_' + k; if (!tex.has(name)) tex.add(name, 0, fx + k * SW, fy, SW, phh); }
      }
      for (let k = 0; k < N; k++) it.imgs.push(this.add.image(0, 0, key, (P.big ? P.id : 'p' + P.frame) + '_0_' + k).setOrigin(0, 0).setDepth(-23.2).setVisible(false));
    }
  }

  /** Draws each painting onto its canvas on the wall: every strip is a column of the picture at one distance down the hall; the masterpieces play their animation. */
  drawPaintings() {
    for (const it of this.items) {
      if (!it.imgs) continue;
      const C = canvasOf(it.slot), N = C.strips, P = it.painting, af = Math.floor(this.t / ANIM) % it.pics;
      const s = it.slot.side, x = s * (WALL - 5), z = it.slot.z, dz = z - this.camZ;
      const fog = Math.max(0, Math.min(1, (dz - 500) / 4200)) * 0.78, v = Math.round(255 * (1 - fog)), tint = (v << 16) | (v << 8) | v;
      for (let k = 0; k < N; k++) {
        const img = it.imgs[k], u0 = k / N, u1 = (k + 1) / N;
        const z0 = s < 0 ? z - C.half + 2 * C.half * u0 : z + C.half - 2 * C.half * u0;
        const z1 = s < 0 ? z - C.half + 2 * C.half * u1 : z + C.half - 2 * C.half * u1;
        const a = this.project(x, C.top, z0), b = this.project(x, C.bot, z0), c = this.project(x, C.top, z1), d = this.project(x, C.bot, z1);
        if (!a || !b || !c || !d || dz > 4400) { img.setVisible(false); continue; }
        const left = Math.min(a.x, c.x), w = Math.abs(c.x - a.x);
        if (left > VIEW_W || left + w < 0 || w < 0.02) { img.setVisible(false); continue; }
        if (it.pics > 1) img.setFrame(P.id + '_' + af + '_' + k);
        img.setVisible(true).setPosition(left, (a.y + c.y) / 2).setDisplaySize(w + 0.6, ((b.y - a.y) + (d.y - c.y)) / 2).setFlipX(c.x < a.x).setTint(tint);
      }
    }
  }

  /** Opens the close-up of item i (a painting big with its story, or a trophy turning in a spotlight). */
  openInspect(i) {
    const n = this.items.length; i = ((i % n) + n) % n;
    if (this.items[i].ledger) {                                                               // the ledger: the ACHIEVEMENTS page (back comes here)
      if (this.inspect) i = (i + (this.inspect.i > i ? -1 : 1) + n) % n;                     // (flipping past it in the close-up skips it)
      else return this.openLedger();
    }
    if (!this.insp) {
      const D = 50;
      this.insp = {
        bg: this.add.graphics().setDepth(D), img: this.add.image(VIEW_W / 2, 168, 'hall_paintings', 0).setDepth(D + 1),
        R: new Poly3D(this, [], { fog: 0x000000, fogMax: 0, f: 300, lift: 0, sat: 1.15, edge: 0.06, light: [-0.5, 1, 0.6] }),
        fx: this.add.graphics().setDepth(D + 3).setBlendMode(Phaser.BlendModes.ADD),
        title: this.add.text(VIEW_W / 2, 24, '', { fontFamily: FONT, fontSize: '12px', color: '#f6d77a', stroke: '#2a0a10', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 4),
        text: this.add.text(VIEW_W / 2, 302, '', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', align: 'center', lineSpacing: 3, wordWrap: { width: 520 } }).setOrigin(0.5, 0).setDepth(D + 4),
        plaque: this.add.text(VIEW_W / 2, 222, 'YOU DID IT', { fontFamily: FONT, fontSize: '7px', color: '#3a2408' }).setOrigin(0.5).setDepth(D + 3),   // engraved on the trophy's plaque
        hint: this.add.text(VIEW_W / 2, VIEW_H - 8, '< A / D >  MORE      J / K  BACK TO THE HALL', { fontFamily: FONT, fontSize: '6px', color: '#c8b8e8' }).setOrigin(0.5).setDepth(D + 4),
      };
      this.insp.R.g.setDepth(D + 2);
      this.insp.img.setInteractive().on('pointerdown', () => this.closeInspect());
    }
    this.inspect = { i, t: 0 }; const it = this.items[i], I = this.insp;
    for (const o of [I.bg, I.fx, I.title, I.text, I.hint, I.R.g]) o.setVisible(true);
    I.img.setVisible(!!it.painting);
    if (it.painting) I.img.setTexture(it.painting.big ? it.painting.sheet : 'hall_paintings', it.painting.big ? 0 : it.painting.frame).setScale(it.painting.big ? 1.1 : 2.25);
    I.title.setText((it.painting || it.trophy).title);
    if (it.trophy && !it.earned) { const T = TROPHY_GOALS.find((q) => q.id === it.trophy.id), [h, g] = trophyProgress(it.trophy.id); I.text.setText('LOCKED. TO EARN IT: ' + (T ? T.info : '') + '\nPROGRESS  ' + h + ' / ' + g + (T ? '      REWARD  ' + T.coins + ' COINS' : '')); }
    else I.text.setText((it.painting || it.trophy).text);
    if (it.trophy) I.plaque.setText(it.earned ? it.trophy.plaque : '? ? ?');
    sfx('menu', 0.5, 0.8);
  }

  /** Closes the close-up, back to walking. */
  closeInspect() {
    if (!this.insp) return;
    this.inspect = null;
    for (const o of Object.values(this.insp)) (o.g || o).setVisible(false);
    sfx('menu', 0.4, 0.6);
  }

  /** Draws the close-up every frame: a dark room, a gold frame round the painting (or the trophy turning on a lit stand). */
  drawInspect() {
    const I = this.insp, it = this.items[this.inspect.i], g = I.bg, t = ++this.inspect.t;
    g.clear(); g.fillStyle(0x07040c, 0.94); g.fillRect(0, 0, VIEW_W, VIEW_H);
    I.fx.clear();
    if (it.painting) {
      const big = it.painting.big, w = big ? 352 : 360, h = big ? 246 : 252, x = VIEW_W / 2 - w / 2, y = 168 - h / 2;
      if (big) I.img.setFrame(Math.floor(t / ANIM) % it.painting.frames);                    // (a masterpiece moves)
      g.fillStyle(0x7a4a10, 1); g.fillRect(x - 12, y - 12, w + 24, h + 24);                  // the frame: dark gold, bright gold, a bevel
      g.fillStyle(0xe0b040, 1); g.fillRect(x - 9, y - 9, w + 18, h + 18);
      g.fillStyle(0xfff0a0, 1); g.fillRect(x - 9, y - 9, w + 18, 2); g.fillRect(x - 9, y - 9, 2, h + 18);
      g.fillStyle(0xa07020, 1); g.fillRect(x - 3, y - 3, w + 6, h + 6);
      for (let i = 0; i < 4; i++) { I.fx.fillStyle(0xfff0c0, 0.04); I.fx.fillEllipse(VIEW_W / 2, y - 20, 300 - i * 60, 80 - i * 14); }   // a picture light above it
      I.R.g.clear();
    } else {
      for (let i = 0; i < 6; i++) { I.fx.fillStyle(0xfff0c0, 0.035); I.fx.fillTriangle(VIEW_W / 2 - 10 - i * 4, 34, VIEW_W / 2 + 10 + i * 4, 34, VIEW_W / 2 + 70 + i * 14, 268); I.fx.fillTriangle(VIEW_W / 2 - 10 - i * 4, 34, VIEW_W / 2 - 70 - i * 14, 268, VIEW_W / 2 + 70 + i * 14, 268); }
      g.fillStyle(0x2a2430, 1); g.fillEllipse(VIEW_W / 2, 268, 220, 30); g.fillStyle(0xe0b040, 1); g.fillEllipse(VIEW_W / 2, 264, 200, 24); g.fillStyle(0x3a3440, 1); g.fillEllipse(VIEW_W / 2, 262, 196, 20);
      const R = I.R; R.scene = { cameras: { main: { midPoint: { x: 0, y: 0 }, worldView: { x: -VIEW_W / 2, y: -VIEW_H / 2, width: VIEW_W, height: VIEW_H } } } }; R.camZ = 0;
      R.g.setPosition(VIEW_W / 2, 150);
      const big = it.trophy.model === 'phoenix';
      R.render(this.trophyFaces(it.trophy.model, 0, 110, 120, t * 0.025, big ? 4.2 : 5.2, !it.earned));
      if (!it.earned) {                                                                         // locked: a progress bar under it
        const [h, gl] = trophyProgress(it.trophy.id), bw = 220, bx = VIEW_W / 2 - bw / 2;
        g.fillStyle(0x000000, 0.8); g.fillRect(bx - 2, 276, bw + 4, 9); g.fillStyle(0x3a2a50, 1); g.fillRect(bx, 278, bw, 5); g.fillStyle(0xf3c358, 1); g.fillRect(bx, 278, bw * h / Math.max(1, gl), 5);
      }
      if (it.earned) for (let i = 0; i < 7; i++) {                                                            // glints off the gold
        const a = t * 0.04 + i * 0.9, px = VIEW_W / 2 + Math.cos(a) * 60, py = 70 + Math.sin(a * 1.6) * 30;
        if ((t + i * 13) % 50 < 24) { I.fx.fillStyle(0xfff6c0, 0.9); I.fx.fillRect(px - 5, py, 11, 1); I.fx.fillRect(px, py - 5, 1, 11); I.fx.fillStyle(0xffffff, 1); I.fx.fillRect(px - 1, py - 1, 3, 3); }
      }
      I.fx.fillStyle(0x2a1a08, 1);
    }
    I.text.setY(it.painting ? 303 : 290); I.plaque.setVisible(!it.painting).setY(it.trophy && it.trophy.model === 'phoenix' ? 214 : 222);
  }

  /** Opens the ACHIEVEMENTS page; its BACK returns here, where you stood. */
  openLedger() { sfx('menu', 0.6, 1.2); this.scene.start('Achievements', { from: { scene: 'TrophyHall', data: { back: { camZ: this.camZ } } } }); }

  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }

  /** Every frame: the arrival, walking and looking, then draws the hall and the words. */
  update() {
    this.t++;
    const m = this.menu.poll(), K = this.menu.keys;
    const okPress = m.ok || m.pads.some((p) => p.button === 'a'), backPress = m.back || m.pads.some((p) => p.button === 'b');
    if (this.inspect) {                                                                         // the close-up: flip through, or go back to the hall
      if (backPress || okPress) this.closeInspect();
      else { if (m.left) this.openInspect(this.inspect.i - 1); if (m.right) this.openInspect(this.inspect.i + 1); this.drawInspect(); }
      this.draw(); return;
    }
    if (backPress) return this.back();
    if (okPress && this.near) { this.openInspect(this.items.indexOf(this.near)); return; }
    if (this.qKey && Phaser.Input.Keyboard.JustDown(this.qKey)) return this.openLedger();
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
    // what you're looking at: the nearest thing on show a little way ahead, closest to the middle of the screen
    const ahead = (s) => s.z - this.camZ > 60 && s.z - this.camZ < 600, mid = (s) => { const q = this.project(s.x ?? (s.kind === 'plinth' ? 0 : s.side * (s.kind === 'frame' ? WALL : PED_X)), 0, s.z); return q ? Math.abs(q.x - VIEW_W / 2) : 999; };
    this.near = this.t > ARRIVE.glide ? this.items.filter((it) => ahead(it.slot)).sort((p, q) => mid(p.slot) - mid(q.slot))[0] : null;
    const empty = !this.near && HALL_SLOTS.filter((s) => s.kind !== 'frame' && !DISPLAY[s.id] && ahead(s)).sort((p, q) => mid(p) - mid(q))[0];
    const nearName = (it) => (it.ledger ? 'THE LEDGER OF ACHIEVEMENTS' : it.painting ? it.painting.title : it.trophy.title + (it.earned ? '' : '  -  LOCKED'));
    this.slotText.setText(a > 0.5 ? '' : this.near ? nearName(this.near) : empty ? (empty.kind === 'plinth' ? 'THE GREAT PLINTH  -  AWAITING A STATUE' : 'PEDESTAL ' + (empty.side < 0 ? 'L' : 'R') + empty.id.slice(-1) + '  -  EMPTY') : '');
    this.prompt.setVisible(!!this.near && a < 0.5);
  }
}
