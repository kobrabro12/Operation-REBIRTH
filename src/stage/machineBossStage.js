// THE DESKTOP - the arena of BEIGE.EXE, THE OLD MACHINE (boss V, a vintage 90s computer; Trinkets > BOSS FIGHTS,
// src/data/bosses.js). An original homage to old home computers - no real brand, logo, program or OS name anywhere.
// You fight on top of a DESK in a bedroom in the evening (a window onto a dusky street, posters, a bookcase of games,
// a guitar, a lava lamp); the two wall shelves above the desk are the ledges. On the desk sits the MACHINE: a fat
// beige CRT monitor with a pixel face on its green screen, its tower beside it, the keyboard and the mouse in front -
// and its giant MOUSE CURSOR, which climbs out of the screen, is its hand. It attacks with its PROGRAMS: each one's
// window zooms out of the screen into the room.
//   Weak point: its SCREEN (x1; x1.5 while it's NOT RESPONDING - every few attacks it freezes, an hourglass spinning
//   and its screen greyed out). The beige casing takes x0.5, the cursor x0.3.
//   Programs: PAINT (a brush sweeps a wavy stroke across the room, then the paint bucket floods half the desk),
//   MINESWEEPER (a grid spreads along the desk, flags pop up on the mines - one under you - then they all blow),
//   CALCULATOR (the numbers it punches in fly out at you), NOTEPAD (the keyboard clacks and the letters it types fly
//   across the room: GET OUT), SOLITAIRE (bouncing cards), plus DOUBLE CLICK and ERROR CASCADE (error windows that land
//   on the desk as ledges). At half health its screen goes BLUE (FATAL EXCEPTION) and it adds MEDIA PLAYER (a
//   visualizer of bars bounces out of the desk to the beat - stand in the short ones), RECYCLE BIN (it sucks everyone
//   to the middle, then spits balls of paper), PIPES (the old screensaver) and SYSTEM CRASH (glitch blocks rain down).
//   SLUDGE (its paint bucket pours sticky purple goo onto the desk - puddles that slow you to half speed); below 35%
//   health its CD tray slides out and it fires CDs at you. It's a snob (a monocle, a bow tie, a raised brow, remarks
//   like HOW QUAINT.) and evil (glaring, red-eyed once it's angry). The desk stands on two thick legs above the floor.
// Stage hazards (also in VS, where the switched-off monitor just shows its reflection): POP-UP (a window falls on a
// marked spot and lies there as a ledge) and DIAL-UP (a screeching modem beam sweeps across a marked band).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

// 90s desktop greys, teal, title-bar blue, beige plastic
const C = { out: 0x101010, teal: [0x007070, 0x008080, 0x109090], grey: [0x404040, 0x808080, 0xc0c0c0, 0xdfdfdf, 0xffffff], navy: 0x000080, blue: 0x1084d0,
  beige: [0x8a8070, 0xb8ae98, 0xd8d0b8, 0xece6d4], home: { wall: [0x5a6a8a, 0x52617f], trim: 0xe8e0d0, floor: 0x5a3a28, frame: 0xf0e8d8, curtain: [0x8a2a3a, 0x7a2232], wood: [0x4a2e1a, 0x6a4428, 0x8a5a34, 0xb07a48] }, screen: [0x0a2a1a, 0x103a24, 0x30ff80, 0xb0ffd0], bsod: 0x0000aa, sludge: [0x2a1a3a, 0x5a2a6a, 0x8a4a9a, 0xc08ad0], card: [0xffffff, 0xd02020, 0x101010, 0x2050c0], pipe: [0xc02020, 0x20a040, 0x2060d0, 0xe0c020] };
// the monitor: where its screen's centre floats, its size, the casing round it
const MON = { x: 0, y: -150, sw: 170, sh: 124, bez: 22 };
// DOUBLE CLICK: tracking frames, the drop, the click's hit
const CLICK = { track: 54, drop: 7, hold: 8, hit: [12, [70, 6.2, 0.9]] };
// PAINT: the brush stroke (frames), the bucket's warning, the paint colours, the brush's and the flood's hits
const PAINT = { stroke: 54, warn: 34, cols: [0xff3040, 0x30a0ff, 0xffd020, 0x40d060, 0xc040ff, 0xff8020], hit: [10, [45, 5.8, 0.75]], fill: [12, [85, 6, 0.75]] };
// MINESWEEPER: tile width, mines (normal / enraged), the reveal (frames), frames between blasts, a blast's hit
const MINES = { w: 45, n: [4, 6], reveal: 60, chain: 7, hit: [11, [80, 6, 0.8]] };
// CALCULATOR: numbers (normal / enraged), frames apart, flight frames, gravity, a number's hit
const CALC = { n: [5, 7], every: 13, flight: 42, grav: 0.3, hit: [8, [55, 5.2, 0.6]] };
// NOTEPAD: the words it types, frames per letter, the letters' speed and hit
const NOTES = { words: ['GET OUT', 'GO AWAY', 'BYE BYE'], every: 9, speed: 6.5, hit: [7, [30, 5.2, 0.6]] };
// SLUDGE: puddles, frames apart, the pour (frames), how long a puddle lasts, its width, how long it slows you each
// frame you're in it (Fighter.slow = half speed), the pour's splash hit
const SLUDGE = { n: [2, 3], every: 40, pour: 26, life: 420, w: 84, slow: 12, hit: [5, [80, 4.4, 0.35]] };
// CDs (below `CDS.at` health): discs (per volley), frames apart, speed, the disc's hit
// spread: how far each disc's aim strays (px), so a volley fans out instead of all hitting you
const CDS = { at: 0.35, n: [4, 6], every: 11, speed: 8, r: 13, spread: 60, hit: [7, [40, 5.4, 0.65]] };
// its snobby remarks: frames between them (at rest), the lines, and what it says when you hit its screen
const SNOB = { every: 420, lines: ['HOW QUAINT.', 'UGH. A PEASANT.', 'YOU CALL THAT A COMBO?', 'I HAVE 640K. YOU HAVE NOTHING.', 'DO NOT TOUCH MY KEYBOARD.', 'PATHETIC. TRULY.', 'I WAS TOP OF THE LINE, YOU KNOW.'], hurt: ['HOW DARE YOU.', 'MY SCREEN!', 'FINGERPRINTS?! DISGUSTING.', 'YOU WILL PAY FOR THAT.'] };
// MEDIA PLAYER (enraged): bar width, frames per beat, beats, the tall bars' height and hit
const MUSIC = { w: 45, beat: 24, beats: 9, tall: 130, hit: [9, [85, 5.6, 0.6]] };
// RECYCLE BIN (enraged): the suck (frames), how hard it pulls, paper balls, their hit
const BIN = { suck: 80, pull: 1.25, n: 6, hit: [8, [50, 5.4, 0.65]] };
// NOTEPAD's pixel letters (5x7, one bit per pixel per row)
const GLYPHS = { G: [14, 17, 16, 23, 17, 17, 15], E: [31, 16, 16, 30, 16, 16, 31], T: [31, 4, 4, 4, 4, 4, 4], O: [14, 17, 17, 17, 17, 17, 14], U: [17, 17, 17, 17, 17, 17, 14], A: [14, 17, 17, 31, 17, 17, 17], W: [17, 17, 17, 21, 21, 21, 10], Y: [17, 17, 10, 4, 4, 4, 4], B: [30, 17, 17, 30, 17, 17, 30] };
// ERROR CASCADE: dialogs (normal / enraged), frames apart, mark warning, fall speed, dialog size, how long they lie there, hit
const ERR = { n: [3, 4], every: 16, warn: 34, fall: 13, w: 96, h: 62, life: 260, hit: [11, [80, 5.8, 0.75]] };
// SOLITAIRE: cards (normal / enraged), frames apart, bounce, the card's hit
const CARDS = { n: [5, 7], every: 9, bounce: 0.82, grav: 0.32, hit: [7, [55, 5, 0.6]] };
// PIPES (enraged): pipes, step size, frames per step, steps, the growing end's hit
const PIPES = { n: 2, step: 14, every: 3, steps: 46, hit: [9, [60, 5.4, 0.6]] };
// SYSTEM CRASH (enraged): blocks, frames apart, warning, hit
const CRASH = { n: 9, every: 6, warn: 30, hit: [9, [80, 5, 0.55]] };
// NOT RESPONDING: every `every` attacks it freezes for `dur` frames
const HANG = { every: 4, dur: 170 };
// hazards: POP-UP (a window falls on a mark) and DIAL-UP (a screeching beam: warning frames, sweep frames, band height, hit)
const POPUP = { warn: 50, hit: [10, [80, 5.6, 0.7]] };
const DIAL = { warn: 70, on: 60, h: 30, hit: [5, [40, 4.6, 0.4]] };
// where the bedroom backdrop sits on the background camera (deco = how much lower its window, posters and furniture are)
const SKY = { x: 320, y: 250, deco: 250 };

/** A point along the way from a to b (k = 0..1). */
const lerpN = (a, b, k) => a + (b - a) * k;

/** THE DESKTOP and BEIGE.EXE (see the top of the file). */
export class MachineBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_machine';
    this.platforms = [
      { x1: -270, x2: 270, y: 0, solid: true, bottom: 36 },
      { x1: -262, x2: -150, y: -112, solid: false },
      { x1: 150, x2: 262, y: -112, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['popup', 'dialup'], { color: '#ffffff', stroke: '#000080', gap: 700 });
    this.cur = { x: 120, y: -120, mode: 'arrow', press: 0 };
    this.count = 0; this.hang = 0; this.blue = 0; this.mood = 'idle';
    this.puddles = []; this.discs = []; this.tray = 0; this.pour = null; this.low = false;
    this.errs = []; this.cards = []; this.pipes = []; this.blocks = []; this.dial = null; this.win = null; this.paint = null; this.fill = null; this.mines = null; this.digits = []; this.letters = []; this.viz = null; this.balls = []; this.keyFlash = null;
    this.sparkColor = 0x30ff80; this.bodyW = 200; this.bodyH = 160;
  }

  /** Builds the bedroom wall behind (window, posters, shelves of stuff), the shelves (ledges) and the desk (the floor). */
  draw(world, bg) {
    const s = this.scene;
    const wall = s.add.graphics().setScrollFactor(0.15).setPosition(SKY.x, SKY.y); bg.push(wall);
    const deco = s.add.graphics().setScrollFactor(0.15).setPosition(SKY.x, SKY.y + SKY.deco); bg.push(deco); this.paintHome(wall, deco);
    const back = s.add.graphics(); world.push(back); this.paintShelves(back);
    this.monG = s.add.graphics(); world.push(this.monG);
    const front = s.add.graphics(); world.push(front); this.paintDesk(front);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  /** A bevelled grey box (lit top-left, shaded bottom-right) - the look of every old window and button. */
  bevel(g, x, y, w, h, inset = false) {
    g.fillStyle(C.grey[2], 1); g.fillRect(x, y, w, h);
    g.fillStyle(inset ? C.grey[0] : C.grey[4], 1); g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
    g.fillStyle(inset ? C.grey[4] : C.grey[0], 1); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
  }
  /**
   * The bedroom far behind the desk, late in the evening: striped wallpaper, a window onto a dusky street (houses,
   * lit windows, a streetlamp, the first stars) with curtains, a band-free poster and a star chart, a corkboard of
   * notes, a bookcase full of games and tapes, a guitar against the wall, a glowing lava lamp.
   */
  paintHome(w, g) {
    const H = C.home;
    w.fillStyle(H.wall[0], 1); w.fillRect(-700, -700, 1400, 1100);
    for (let x = -700; x < 700; x += 24) { w.fillStyle(H.wall[1], 1); w.fillRect(x, -700, 10, 1100); }
    w.fillStyle(H.trim, 1); w.fillRect(-700, 40, 1400, 14); w.fillStyle(H.floor, 1); w.fillRect(-700, 54, 1400, 300);
    // the window
    const wx = -150, wy = -470, ww = 300, wh = 230;
    g.fillStyle(H.frame, 1); g.fillRect(wx - 12, wy - 12, ww + 24, wh + 24);
    for (let i = 0; i < 6; i++) { g.fillStyle([0x1a2050, 0x283070, 0x3a3a8a, 0x6a4a9a, 0xb06a8a, 0xe8905a][i], 1); g.fillRect(wx, wy + i * wh / 6, ww, wh / 6 + 1); }
    for (let i = 0; i < 16; i++) { g.fillStyle(0xffffff, 0.7); g.fillRect(wx + (i * 67) % ww, wy + (i * 23) % 70, 1, 1); }
    for (let i = 0; i < 6; i++) { const hx = wx + i * 52, hh = 50 + (i * 37) % 40; g.fillStyle(0x141428, 1); g.fillRect(hx, wy + wh - hh, 46, hh); g.fillTriangle(hx - 4, wy + wh - hh, hx + 50, wy + wh - hh, hx + 23, wy + wh - hh - 22); for (let k = 0; k < 2; k++) { g.fillStyle(0xffd070, (i + k) % 3 ? 0.9 : 0.2); g.fillRect(hx + 8 + k * 20, wy + wh - hh + 14, 8, 10); } }
    g.fillStyle(0x30303a, 1); g.fillRect(wx + 250, wy + 90, 4, 140); g.fillStyle(0xffe8a0, 1); g.fillCircle(wx + 252, wy + 88, 6); g.fillStyle(0xffe8a0, 0.15); g.fillCircle(wx + 252, wy + 100, 40);
    g.fillStyle(H.frame, 1); g.fillRect(wx + ww / 2 - 5, wy, 10, wh); g.fillRect(wx, wy + wh / 2 - 5, ww, 10);
    for (const s of [-1, 1]) { g.fillStyle(H.curtain[0], 1); g.fillRect(s < 0 ? wx - 60 : wx + ww + 10, wy - 30, 50, wh + 70); for (let i = 0; i < 4; i++) { g.fillStyle(H.curtain[1], 1); g.fillRect((s < 0 ? wx - 56 : wx + ww + 14) + i * 12, wy - 30, 4, wh + 70); } }
    g.fillStyle(H.frame, 1); g.fillRect(wx - 80, wy - 40, ww + 160, 10);
    // posters and a corkboard
    g.fillStyle(0x101010, 1); g.fillRect(-470, -460, 120, 170); g.fillStyle(0xe85a2a, 1); g.fillRect(-464, -454, 108, 158); g.fillStyle(0xffd040, 1); g.fillCircle(-410, -390, 34); g.fillStyle(0x101010, 1); g.fillRect(-454, -320, 88, 8); g.fillRect(-444, -306, 68, 5);
    g.fillStyle(0x101010, 1); g.fillRect(250, -470, 140, 110); g.fillStyle(0x10183a, 1); g.fillRect(254, -466, 132, 102); for (let i = 0; i < 22; i++) { g.fillStyle(0xffffff, 0.8); g.fillRect(258 + (i * 47) % 124, -460 + (i * 29) % 94, 2, 2); } g.lineStyle(1, 0x8ab0ff, 0.6); g.lineBetween(270, -440, 310, -420); g.lineBetween(310, -420, 340, -440); g.lineBetween(340, -440, 370, -400); g.lineStyle(0);
    g.fillStyle(0x6a4a2a, 1); g.fillRect(260, -340, 150, 100); g.fillStyle(0xb08a5a, 1); g.fillRect(266, -334, 138, 88);
    for (let i = 0; i < 6; i++) { g.fillStyle([0xfff07a, 0x9ae0ff, 0xff9ac0, 0xffffff][i % 4], 1); g.fillRect(272 + (i % 3) * 44, -328 + Math.floor(i / 3) * 40, 34, 30); g.fillStyle(0xd02020, 1); g.fillCircle(289 + (i % 3) * 44, -326 + Math.floor(i / 3) * 40, 2); }
    // a bookcase (games, tapes, books), a guitar and a lava lamp
    g.fillStyle(H.wood[0], 1); g.fillRect(-640, -330, 150, 370); for (let k = 0; k < 4; k++) { g.fillStyle(H.wood[1], 1); g.fillRect(-632, -320 + k * 90, 134, 80); for (let i = 0; i < 9; i++) { g.fillStyle([0xc03030, 0x3060c0, 0x30a050, 0xe0c040, 0x8040a0, 0x202020][(i + k) % 6], 1); g.fillRect(-628 + i * 14, -300 + k * 90 + (i % 3) * 4, 11, 60 - (i % 3) * 4); } }
    g.fillStyle(0x8a3a1a, 1); g.fillEllipse(470, -40, 70, 90); g.fillEllipse(470, -100, 52, 60); g.fillStyle(0x101010, 1); g.fillCircle(470, -70, 12); g.fillStyle(0x5a3a1a, 1); g.fillRect(466, -250, 8, 150); g.fillRect(460, -262, 20, 16);
    g.fillStyle(0x3a3a50, 1); g.fillRect(-470, -30, 40, 70); g.fillStyle(0xff4aa0, 0.8); g.fillEllipse(-450, -80, 30, 80); g.fillStyle(0xffd040, 1); g.fillCircle(-452, -96, 7); g.fillCircle(-446, -66, 5); g.fillStyle(0xff4aa0, 0.12); g.fillCircle(-450, -80, 70);
  }
  /** The two wall shelves above the desk (the ledges): wooden planks on brackets with things on them. */
  paintShelves(g) {
    const H = C.home;
    for (const p of this.platforms.slice(1)) {
      g.fillStyle(C.out, 1); g.fillRect(p.x1 - 2, p.y - 2, p.x2 - p.x1 + 4, 14); g.fillStyle(H.wood[2], 1); g.fillRect(p.x1, p.y, p.x2 - p.x1, 10); g.fillStyle(H.wood[3], 1); g.fillRect(p.x1, p.y, p.x2 - p.x1, 3);
      for (const bx of [p.x1 + 14, p.x2 - 18]) { g.fillStyle(C.grey[1], 1); g.fillTriangle(bx, p.y + 10, bx + 4, p.y + 10, bx, p.y + 34); }
    }
    const L = this.platforms[1], R = this.platforms[2];
    for (let i = 0; i < 4; i++) { g.fillStyle([0x3060c0, 0xc03030, 0x30a050, 0xe0c040][i], 1); g.fillRect(L.x1 + 30 + i * 9, L.y - 30, 8, 30); }      // books
    g.fillStyle(0x5a3a2a, 1); g.fillRect(L.x1 + 80, L.y - 14, 18, 14); g.fillStyle(0x40a040, 1); g.fillCircle(L.x1 + 89, L.y - 22, 12); g.fillCircle(L.x1 + 82, L.y - 28, 7);   // a plant
    g.fillStyle(0xd8d0b8, 1); g.fillRect(R.x1 + 20, R.y - 22, 30, 22); g.fillStyle(0x202020, 1); g.fillRect(R.x1 + 24, R.y - 18, 22, 10);                                // a little TV
    g.fillStyle(0xe8c030, 1); g.fillRect(R.x1 + 62, R.y - 26, 16, 26); g.fillStyle(0xffe070, 1); g.fillCircle(R.x1 + 70, R.y - 30, 7);                                  // a trophy
  }
  /**
   * The desk (the floor): its top seen a little from above - a desk mat, the keyboard, a mug of pens, papers - then
   * the wooden front edge, drawers and the floor under it. The mouse is drawn every frame (it moves with the cursor).
   */
  paintDesk(g) {
    const P = this.platforms[0], H = C.home, x1 = P.x1, x2 = P.x2;
    g.fillStyle(C.out, 1); g.fillRect(x1 - 4, -30, x2 - x1 + 8, 34);
    g.fillStyle(H.wood[2], 1); g.fillRect(x1, -28, x2 - x1, 28); g.fillStyle(H.wood[3], 1); g.fillRect(x1, -28, x2 - x1, 3);
    for (let i = 0; i < 12; i++) { g.fillStyle(H.wood[1], 0.5); g.fillRect(x1 + (i * 97) % (x2 - x1), -24 + (i * 7) % 20, 60, 1); }
    g.fillStyle(0x2a3a4a, 1); g.fillRect(-150, -24, 300, 20);                                                           // the desk mat
    g.fillStyle(C.out, 1); g.fillRect(-118, -22, 236, 18); g.fillStyle(C.beige[2], 1); g.fillRect(-116, -21, 232, 15);   // the keyboard
    for (let r = 0; r < 3; r++) for (let k = 0; k < 18; k++) { g.fillStyle(C.beige[1], 1); g.fillRect(-112 + k * 12.6 + r * 3, -19 + r * 4.6, 10, 3.4); }
    g.fillStyle(0x2a2a2a, 1); g.fillRect(-250, -28, 22, 24); g.fillStyle(0xffffff, 1); g.fillRect(-248, -26, 18, 3); for (let i = 0; i < 4; i++) { g.fillStyle([0xd02020, 0x2050d0, 0x202020, 0xe0c020][i], 1); g.fillRect(-247 + i * 5, -38 - (i % 2) * 5, 2, 14); }   // pens in a mug
    g.fillStyle(0xf8f4e8, 1); g.fillPoints([{ x: 180, y: -24 }, { x: 236, y: -26 }, { x: 240, y: -6 }, { x: 184, y: -4 }], true); g.fillStyle(0x8a8a9a, 1); for (let i = 0; i < 4; i++) g.fillRect(190, -20 + i * 4, 36, 1);   // papers
    g.fillStyle(C.out, 1); g.fillRect(x1 - 4, 0, x2 - x1 + 8, 36); g.fillStyle(H.wood[1], 1); g.fillRect(x1, 0, x2 - x1, 32); g.fillStyle(H.wood[3], 1); g.fillRect(x1, 0, x2 - x1, 3);
    for (const dx of [x1 + 20, x2 - 120]) { g.fillStyle(H.wood[0], 1); g.fillRect(dx, 8, 100, 20); g.fillStyle(C.grey[2], 1); g.fillRect(dx + 40, 16, 20, 4); }
    // its legs: two thick turned legs down to the floor far below, a stretcher between them, the dark under the desk
    g.fillStyle(0x140c08, 0.7); g.fillRect(x1 + 30, 36, x2 - x1 - 60, 200);
    for (const lx of [x1 + 4, x2 - 34]) {
      g.fillStyle(C.out, 1); g.fillRect(lx - 2, 34, 34, 210); g.fillStyle(H.wood[1], 1); g.fillRect(lx, 34, 30, 208); g.fillStyle(H.wood[2], 1); g.fillRect(lx + 4, 34, 8, 208);
      for (const yy of [70, 150]) { g.fillStyle(C.out, 1); g.fillEllipse(lx + 15, yy, 40, 14); g.fillStyle(H.wood[2], 1); g.fillEllipse(lx + 15, yy - 1, 36, 10); }
      g.fillStyle(C.out, 1); g.fillRect(lx - 4, 236, 38, 10); g.fillStyle(H.wood[0], 1); g.fillRect(lx - 2, 237, 34, 7);
    }
    g.fillStyle(C.out, 1); g.fillRect(x1 + 30, 182, x2 - x1 - 60, 14); g.fillStyle(H.wood[1], 1); g.fillRect(x1 + 30, 184, x2 - x1 - 60, 10);
    g.fillStyle(H.floor, 1); g.fillRect(x1 - 200, 246, x2 - x1 + 400, 120);
  }
  /** The physical mouse on its mat: it slides along with the giant cursor (and its cable trails to the tower). */
  drawMouse(g) {
    const mx = Phaser.Math.Clamp(110 + (this.cur.x - 60) * 0.12, 60, 170), my = -14;
    g.lineStyle(3, C.out, 1); g.lineBetween(mx, my - 8, 196, -30); g.lineStyle(1.5, C.grey[1], 1); g.lineBetween(mx, my - 8, 196, -30); g.lineStyle(0);
    g.fillStyle(C.out, 1); g.fillEllipse(mx, my, 24, 16); g.fillStyle(C.beige[2], 1); g.fillEllipse(mx, my - 1, 21, 13); g.fillStyle(C.beige[3], 1); g.fillEllipse(mx - 3, my - 4, 8, 4);
    g.fillStyle(C.out, 1); g.fillRect(mx - 1, my - 7, 1, 6);
    if (this.cur.press > 0) { g.fillStyle(0xffffff, 0.6); g.fillRect(mx - 9, my - 7, 8, 4); }
  }

  // ------------------------------------------------------------------ BEIGE.EXE
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1250; this.cycle.next = 1500; }
  /** Its screen: what the camera, the death and the CPU aim at. */
  core() { return { x: MON.x, y: MON.y + this.bob() }; }
  /** How far it floats up and down. */
  bob() { return Math.sin(this.t * 0.03) * 6 + (this.hang > 0 ? 18 : 0); }
  /** Where it can be hit: the screen (x1, x1.5 NOT RESPONDING), the casing (x0.5), the cursor (x0.3). */
  hurt() {
    const c = this.core(), sw = MON.sw / 2, sh = MON.sh / 2, b = MON.bez, k = this.cur;
    return [{ x1: c.x - sw, y1: c.y - sh, x2: c.x + sw, y2: c.y + sh, mult: this.hang > 0 ? 1.5 : 1.0 },
      { x1: c.x - sw - b, y1: c.y - sh - b, x2: c.x + sw + b, y2: c.y + sh + b + 20, mult: 0.5 },
      { x1: k.x - 4, y1: k.y - 4, x2: k.x + 30, y2: k.y + 46, mult: 0.3 }];
  }
  /** What it does next: every few attacks it hangs (NOT RESPONDING); enraged adds PIPES and SYSTEM CRASH. */
  pattern(phase) {
    if (this.count % HANG.every === HANG.every - 1) return ['hang'];
    if (this.low) return ['cds', 'sludge', 'cds', 'paint', 'mines', 'music', 'bin', 'notes'];
    return phase === 1 ? ['paint', 'mines', 'calc', 'notes', 'click', 'errors', 'cards', 'sludge'] : ['paint', 'mines', 'calc', 'notes', 'music', 'bin', 'errors', 'pipes', 'crash', 'sludge'];
  }
  /** Counts its attacks (every few, it hangs). */
  tally() { this.count++; }
  start_click() { this.tally(); } start_paint() { this.tally(); } start_mines() { this.tally(); } start_calc() { this.tally(); } start_notes() { this.tally(); } start_music() { this.tally(); } start_bin() { this.tally(); } start_sludge() { this.tally(); } start_cds() { this.tally(); } start_errors() { this.tally(); } start_cards() { this.tally(); } start_pipes() { this.tally(); } start_crash() { this.tally(); } start_hang() { this.tally(); }
  rageLine() { return 'FATAL EXCEPTION!'; }
  /** Half health: the screen goes BLUE - a sad face, the error text - and the whole room flickers blue. */
  onRage(match) { this.blue = 150; sfx('glitch', 1, 0.6); sfx('ding', 1, 0.5); match.shake(8, 20); }
  /** You lost: it shows a big grin and the cursor waves a little goodbye. */
  onGloat(match, t) { this.mood = 'grin'; this.cur.mode = 'hand'; this.cur.x += (60 + Math.sin(t * 0.3) * 30 - this.cur.x) * 0.2; this.cur.y += (-150 - this.cur.y) * 0.2; }

  /** At rest: the cursor drifts over toward the nearest player, wiggling. */
  idle(match) {
    const tg = this.nearest(match, this.cur.x), k = this.cur;
    this.mood = 'idle'; k.mode = 'arrow';
    if (this.t % SNOB.every === 200) this.snob(match, SNOB.lines);
    if (tg) { k.x += (tg.x + 70 - k.x) * 0.03; k.y += (-180 + Math.sin(this.t * 0.07) * 14 - k.y) * 0.05; }
  }
  /** Moves the cursor part of the way toward a point. */
  toward(x, y, q) { this.cur.x += (x - this.cur.x) * q; this.cur.y += (y - this.cur.y) * q; }

  /** DOUBLE CLICK: the cursor tracks the nearest player from above (its shadow below), then clicks down twice. */
  atk_click(match, a, out) {
    const k = this.cur, tr = this.sp(CLICK.track), cyc = CLICK.drop + CLICK.hold + 8;
    this.mood = 'angry'; k.mode = 'arrow';
    if (a.t < tr) { const tg = this.nearest(match, k.x); if (tg) { a.tx = Phaser.Math.Clamp(tg.x, -255, 255); } this.toward(a.tx ?? 0, -190, 0.12); a.shadow = true; return false; }
    const q = a.t - tr, i = Math.floor(q / cyc), e = q % cyc;
    if (i >= 2) { a.shadow = false; this.toward(80, -170, 0.1); return a.t > tr + 2 * cyc + 20; }
    if (e < CLICK.drop) { k.y = -190 + (190 - 2) * (e + 1) / CLICK.drop; out.push(this.bhit('click' + a.id + i, k.x - 22, k.y - 30, k.x + 34, k.y + 6, ...CLICK.hit)); }
    else if (e === CLICK.drop) { k.press = 6; sfx('clang', 0.8, 2.2); sfx('hit', 0.6, 1.8); match.shake(6, 6); match.popText({ x: k.x, y: -60 }, 'CLICK!', '#ffffff'); }
    else if (e > CLICK.drop + CLICK.hold) k.y += (-190 - k.y) * 0.4;
    return false;
  }
  /** ERROR CASCADE: error dialogs drop onto marks one after another (a chime each) and land on the taskbar as ledges. */
  atk_errors(match, a, out) {
    const n = ERR.n[this.boss.phase - 1];
    this.mood = 'angry'; this.cur.mode = 'wait';
    if (a.t % ERR.every === 1 && a.t < n * ERR.every) { const tg = this.nearest(match), x = Phaser.Math.Clamp((a.t < ERR.every && tg ? tg.x : (Math.random() - 0.5) * 460), -215, 215); this.dropDialog(x, true); sfx('ding', 0.6, 1.1); }
    this.stepErrors(match, out);
    return a.t > n * ERR.every + ERR.warn + 40;
  }
  /** A dialog that will fall on x (boss = its hit is the boss's; else a hazard). */
  dropDialog(x, boss) { this.errs.push({ x, y: -460, t: 0, st: 'mark', id: 'mc-err-' + (++this.uidM || (this.uidM = 1)), life: 0, boss }); }
  /** Dialogs: the mark, the fall (a hit), then lying on the taskbar as a ledge until they close. */
  stepErrors(match, out) {
    for (const d of this.errs) {
      d.t++;
      if (d.st === 'mark' && d.t > (d.boss ? this.sp(ERR.warn) : POPUP.warn)) d.st = 'fall';
      if (d.st === 'fall') {
        d.y += ERR.fall; out.push(this.bhit(d.id, d.x - ERR.w / 2, d.y - ERR.h, d.x + ERR.w / 2, d.y, ...(d.boss ? ERR.hit : POPUP.hit)));
        if (d.y >= 0) { d.y = 0; d.st = 'lie'; sfx('bighit', 0.6, 1.3); match.shake(4, 6); d.plat = { x1: d.x - ERR.w / 2 + 4, x2: d.x + ERR.w / 2 - 4, y: -ERR.h, solid: false, temp: true }; this.platforms.push(d.plat); }
      }
      if (d.st === 'lie' && ++d.life > ERR.life) { d.st = 'close'; d.k = 1; this.platforms = this.platforms.filter((p) => p !== d.plat); sfx('menu', 0.4, 0.8); }
      if (d.st === 'close') { d.k -= 0.12; if (d.k <= 0) d.dead = true; }
    }
    this.errs = this.errs.filter((d) => !d.dead);
  }
  /** SOLITAIRE: cards fly out of its screen one after another and bounce across the taskbar, leaving trails of copies. */
  atk_cards(match, a, out) {
    const n = CARDS.n[this.boss.phase - 1], c = this.core();
    this.mood = 'happy';
    if (a.t % CARDS.every === 1 && a.t < n * CARDS.every) { const s = (a.t / CARDS.every) % 2 < 1 ? -1 : 1; this.cards.push({ x: c.x, y: c.y, vx: s * (2.2 + Math.random() * 2), vy: -3 - Math.random() * 2, trail: [], n: 0, id: 'mc-card-' + (++this.uidM || (this.uidM = 1)), suit: Math.floor(Math.random() * 4) }); sfx('menu', 0.5, 1.4); }
    this.stepCards(match, out);
    return a.t > n * CARDS.every && !this.cards.length;
  }
  /** The cards: gravity, a bounce on the taskbar, a trail; gone off either edge. */
  stepCards(match, out) {
    for (const k of this.cards) {
      k.vy += CARDS.grav; k.x += k.vx; k.y += k.vy;
      if (k.y > -16 && k.vy > 0 && Math.abs(k.x) < 270) { k.y = -16; k.vy = -Math.abs(k.vy) * CARDS.bounce; k.n++; sfx('land', 0.3, 1.5); }
      if (this.t % 2 === 0) { k.trail.push({ x: k.x, y: k.y }); if (k.trail.length > 40) k.trail.shift(); }
      out.push(this.bhit(k.id + k.n, k.x - 11, k.y - 16, k.x + 11, k.y + 16, ...CARDS.hit, { dirX: Math.sign(k.vx) || 1 }));
      if (Math.abs(k.x) > 330 || k.y > 300) k.dead = true;
    }
    this.cards = this.cards.filter((k) => !k.dead);
  }
  /** PIPES (enraged): the old screensaver - pipes grow across the room, turning at right angles; their growing ends hit. */
  atk_pipes(match, a, out) {
    this.mood = 'blank';
    if (a.t === 1) { sfx('limit', 0.6, 0.7); for (let i = 0; i < PIPES.n; i++) { const s = i % 2 ? 1 : -1; this.pipes.push({ pts: [{ x: s * 280, y: -40 - Math.random() * 160 }], dx: -s, dy: 0, n: 0, col: C.pipe[Math.floor(Math.random() * 4)], id: 'mc-pipe-' + (++this.uidM || (this.uidM = 1)), fade: 0 }); } }
    if (a.t % PIPES.every === 0) for (const p of this.pipes) {
      if (p.n >= PIPES.steps) continue;
      const h = p.pts[p.pts.length - 1];
      if (p.n % 6 === 5 || Math.random() < 0.12) { const turn = Math.random() < 0.5; [p.dx, p.dy] = turn ? [p.dy, -p.dx] : [-p.dy, p.dx]; }
      let nx = h.x + p.dx * PIPES.step, ny = h.y + p.dy * PIPES.step;
      if (Math.abs(nx) > 275 || ny > -14 || ny < -280) { p.dx = -p.dx; p.dy = -p.dy; nx = h.x + p.dx * PIPES.step; ny = h.y + p.dy * PIPES.step; }
      p.pts.push({ x: nx, y: ny }); p.n++;
      if (p.n % 4 === 0) sfx('clang', 0.15, 1.4);
    }
    for (const p of this.pipes) { const h = p.pts[p.pts.length - 1]; if (p.n < PIPES.steps) out.push(this.bhit(p.id + Math.floor(p.n / 6), h.x - 14, h.y - 14, h.x + 14, h.y + 14, ...PIPES.hit, { radial: true })); }
    if (this.pipes.every((p) => p.n >= PIPES.steps)) { for (const p of this.pipes) p.fade++; if (this.pipes[0] && this.pipes[0].fade > 40) { this.pipes = []; return true; } }
    return false;
  }
  /** SYSTEM CRASH (enraged): its screen glitches, and blocks of corrupted pixels rain down in marked columns. */
  atk_crash(match, a, out) {
    this.mood = 'glitch';
    if (a.t % CRASH.every === 1 && a.t < CRASH.n * CRASH.every) { const tg = this.nearest(match); this.blocks.push({ x: Phaser.Math.Clamp(a.t < CRASH.every * 2 && tg ? tg.x : (Math.random() - 0.5) * 500, -250, 250), y: -400, t: 0, id: 'mc-blk-' + (++this.uidM || (this.uidM = 1)), c: [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00][Math.floor(Math.random() * 4)] }); sfx('glitch', 0.4, 1.4); }
    for (const b of this.blocks) {
      b.t++; if (b.t < this.sp(CRASH.warn)) continue;
      b.y += 15; if (b.y > -20) out.push(this.bhit(b.id, b.x - 16, b.y - 16, b.x + 16, b.y + 16, ...CRASH.hit));
      if (b.y >= -8) { b.dead = true; sfx('hit', 0.4, 1.6); for (let i = 0; i < 6; i++) match.particles.push({ x: b.x, y: -6, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 16, color: b.c, size: 3 }); }
    }
    this.blocks = this.blocks.filter((b) => !b.dead);
    return a.t > CRASH.n * CRASH.every && !this.blocks.length;
  }
  /** NOT RESPONDING: it freezes - an hourglass cursor, its screen greyed, sagging - and its screen takes x1.7. */
  atk_hang(match, a) {
    if (a.t === 1) { this.hang = this.sp(HANG.dur) + 30; sfx('glitch', 0.8, 0.5); if (this.rageText && !this.boss.rage) { this.rageText.setText('(NOT RESPONDING)'); this.boss.rage = 70; } }
    this.mood = 'hang'; this.cur.mode = 'wait';
    return this.hang <= 0;
  }

  // ------------------------------------------------------------------ its programs
  /** Opens a program window: it zooms out of its screen to (x, y) - drawn by drawProgWin; kind picks its look and icon. */
  openWin(kind, x, y, w, h) { const c = this.core(); this.win = { kind, x, y, w, h, k: 0, fx: c.x, fy: c.y }; sfx('menu', 0.6, 1.2); sfx('ding', 0.4, 1.5); }
  /** Each frame: the window opening (k up to 1) or closing (down to 0, then gone). */
  stepWin() { const W = this.win; if (!W) return; if (W.close) { W.k -= 0.12; if (W.k <= 0) this.win = null; } else W.k = Math.min(1, W.k + 0.09); }
  /** Closes the open program window. */
  closeWin() { if (this.win) this.win.close = true; }

  /**
   * PAINT: a paint program opens; its cursor becomes a brush and sweeps a thick wavy stroke across the room at your
   * height (the brush hits); then it picks the paint bucket - one half of the desk flashes - and floods it with colour.
   */
  atk_paint(match, a, out) {
    const k = this.cur, st = 20, sw = this.sp(PAINT.stroke), bw = st + sw + this.sp(PAINT.warn);
    if (a.t === 1) { this.openWin('paint', 0, -258, 190, 64); const tg = this.nearest(match, 0); a.y = Phaser.Math.Clamp((tg ? tg.y : 0) - 22, -150, -16); a.s = Math.random() < 0.5 ? -1 : 1; a.col = PAINT.cols[Math.floor(Math.random() * PAINT.cols.length)]; this.paint = { pts: [], col: a.col }; k.mode = 'brush'; }
    this.mood = 'happy';
    if (a.t < st) { this.toward(-a.s * 270, a.y, 0.25); return false; }
    if (a.t < st + sw) {
      const q = (a.t - st) / sw; k.x = -a.s * 270 + a.s * 540 * q; k.y = a.y + Math.sin(q * Math.PI * 3) * 26;
      this.paint.pts.push({ x: k.x, y: k.y + 8 }); if (a.t % 5 === 0) sfx('whoosh', 0.25, 1.6);
      out.push(this.bhit('brush' + a.id + Math.floor(a.t / 12), k.x - 22, k.y - 18, k.x + 22, k.y + 26, ...PAINT.hit, { dirX: a.s }));
      return false;
    }
    if (a.t === st + sw) { const tg = this.nearest(match, 0); a.b = tg && tg.x < 0 ? -1 : 1; k.mode = 'bucket'; this.fill = { s: a.b, k: 0, col: a.col, warn: true }; sfx('ding', 0.8, 0.8); }
    if (a.t < bw) { this.toward(a.b * 130, -170, 0.2); return false; }
    if (a.t === bw) { this.fill.warn = false; sfx('geyser', 1, 1.3); match.shake(6, 10); }
    if (a.t < bw + 30) { this.fill.k = Math.min(1, (a.t - bw) / 8); out.push(this.bhit('bucket' + a.id, a.b < 0 ? -275 : 0, -135 * this.fill.k, a.b < 0 ? 0 : 275, 0, ...PAINT.fill)); return false; }
    this.fill.k -= 0.06; this.closeWin(); if (this.paint) this.paint.fade = (this.paint.fade || 0) + 1;
    if (this.fill.k <= 0) { this.fill = null; this.paint = null; k.mode = 'arrow'; return true; }
    return false;
  }
  /**
   * MINESWEEPER: a mines game opens and its grid spreads along the desk; tiles flip over one by one - numbers, and
   * little red flags on the mines (always one under you); then every flagged tile blows up, one after another.
   */
  atk_mines(match, a, out) {
    const rev = this.sp(MINES.reveal), n = MINES.n[this.boss.phase - 1];
    if (a.t === 1) {
      this.openWin('mines', -140, -250, 120, 70);
      const tg = this.nearest(match, 0), cols = Math.floor(540 / MINES.w), under = Phaser.Math.Clamp(Math.floor(((tg ? tg.x : 0) + 270) / MINES.w), 0, cols - 1), set = new Set([under]);
      while (set.size < n) set.add(Math.floor(Math.random() * cols));
      this.mines = { tiles: Array.from({ length: cols }, (_, i) => ({ i, x: -270 + i * MINES.w + MINES.w / 2, mine: set.has(i), open: 0, boom: 0 })), id: this.sid('mines') };
      for (const T of this.mines.tiles) T.num = [T.i - 1, T.i + 1].filter((j) => set.has(j)).length;
      sfx('menu', 0.6, 0.9);
    }
    const M = this.mines; this.mood = 'angry';
    M.tiles.forEach((T, i) => { if (a.t > 6 + i * (rev / M.tiles.length)) T.open = Math.min(1, T.open + 0.2); });
    const mines = M.tiles.filter((T) => T.mine);
    mines.forEach((T, j) => {
      const at = rev + 10 + j * MINES.chain;
      if (a.t === at) { T.boom = 1; sfx('bighit', 0.8, 1 + j * 0.05); match.shake(6, 6); for (let i = 0; i < 10; i++) match.particles.push({ x: T.x, y: -10, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5, life: 20, color: [0x101010, 0xff3020, 0xffd040][i % 3], size: 3, grav: 0.15 }); }
      if (a.t >= at && a.t < at + 6) out.push(this.bhit(M.id + T.i, T.x - MINES.w / 2 - 6, -96, T.x + MINES.w / 2 + 6, 0, ...MINES.hit, { radial: true }));
      if (T.boom) T.boom++;
    });
    if (a.t > rev + 10 + mines.length * MINES.chain + 24) { this.closeWin(); this.mines = null; return true; }
    return false;
  }
  /** CALCULATOR: a calculator opens and its keys clatter - each number it punches in flies out of its display at you, spinning. */
  atk_calc(match, a, out) {
    const n = CALC.n[this.boss.phase - 1], every = this.sp(CALC.every);
    if (a.t === 1) this.openWin('calc', 150, -250, 76, 96);
    this.mood = 'angry';
    if (a.t > 16 && (a.t - 16) % every === 0 && (a.t - 16) / every <= n) {
      const tg = this.nearest(match, 150), T = CALC.flight, x0 = 150, y0 = -270, tx = Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 60, -255, 255);
      this.digits.push({ x: x0, y: y0, vx: (tx - x0) / T, vy: ((tg ? tg.y - 20 : -10) - y0 - 0.5 * CALC.grav * T * T) / T, d: Math.floor(Math.random() * 10), a: 0, id: this.sid('digit') });
      sfx('clang', 0.3, 2.2); sfx('menu', 0.3, 1.8);
    }
    this.stepDigits(match, out);
    if (a.t > 16 + (n + 1) * every && !this.digits.length) { this.closeWin(); return true; }
    return false;
  }
  /** The calculator's digits: arcing, spinning, gone when they hit the desk. */
  stepDigits(match, out) {
    for (const D of this.digits) { D.vy += CALC.grav; D.x += D.vx; D.y += D.vy; D.a += 0.2; out.push(this.bhit(D.id, D.x - 13, D.y - 17, D.x + 13, D.y + 17, ...CALC.hit, { dirX: Math.sign(D.vx) || 1 })); if (D.y > -14) { D.dead = true; sfx('hit', 0.4, 1.7); for (let i = 0; i < 5; i++) match.particles.push({ x: D.x, y: -12, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 14, color: 0x30ff80, size: 2 }); } }
    this.digits = this.digits.filter((D) => !D.dead);
  }
  /** NOTEPAD: a text editor opens; the keyboard's keys clack down and the letters it types fly out across the room at your height: GET OUT. */
  atk_notes(match, a, out) {
    const every = this.sp(NOTES.every);
    if (a.t === 1) { a.w = Math.floor(Math.random() * NOTES.words.length); this.openWin('notes', 0, -258, 170, 64); const tg = this.nearest(match, 0); a.s = tg && tg.x < 0 ? -1 : 1; a.y = Phaser.Math.Clamp((tg ? tg.y : 0) - 24, -140, -18); a.typed = 0; }
    this.mood = 'grin';
    const W = NOTES.words[a.w];
    if (a.t > 14 && (a.t - 14) % every === 0 && a.typed < W.length) {
      const ch = W[a.typed++]; this.keyFlash = { i: Math.floor(Math.random() * 54), t: 6 };
      if (ch !== ' ') { this.letters.push({ ch, x: -a.s * 280, y: a.y + Math.sin(a.typed) * 6, vx: a.s * NOTES.speed, id: this.sid('letter') }); sfx('clang', 0.4, 2.4); }
    }
    this.stepLetters(match, out);
    if (a.typed >= W.length && !this.letters.length) { this.closeWin(); return true; }
    return false;
  }
  /** The typed letters: flying flat across the room. */
  stepLetters(match, out) {
    for (const L of this.letters) { L.x += L.vx; out.push(this.bhit(L.id, L.x - 11, L.y - 15, L.x + 11, L.y + 15, ...NOTES.hit, { dirX: Math.sign(L.vx) })); if (Math.abs(L.x) > 330) L.dead = true; }
    this.letters = this.letters.filter((L) => !L.dead);
  }
  /** MEDIA PLAYER (enraged): music blares and a visualizer of bars bounces up out of the desk to the beat - every other bar tall; stand in the short ones. */
  atk_music(match, a, out) {
    const beat = MUSIC.beat, warn = 3 * beat, live = MUSIC.beats * beat;
    if (a.t === 1) { this.openWin('music', 0, -258, 170, 60); a.flip = Math.random() < 0.5 ? 0 : 1; }
    this.mood = 'happy';
    const n = Math.floor(540 / MUSIC.w), b = Math.floor(a.t / beat), ph = (a.t % beat) / beat;
    this.viz = { bars: [] };
    for (let i = 0; i < n; i++) {
      const tall = (i + b + a.flip) % 2 === 0, x = -270 + i * MUSIC.w + MUSIC.w / 2;
      const h = a.t < warn ? 10 + 8 * Math.abs(Math.sin(a.t * 0.3 + i)) + (tall ? 14 : 0) : tall ? MUSIC.tall * (1 - ph * 0.6) : 16;
      this.viz.bars.push({ x, h, tall });
      if (a.t >= warn && tall && ph < 0.55) out.push(this.bhit('viz' + a.id + b + i, x - MUSIC.w / 2 + 3, -h, x + MUSIC.w / 2 - 3, 0, ...MUSIC.hit));
    }
    if (a.t % beat === 0) { sfx(a.t >= warn ? 'bighit' : 'land', a.t >= warn ? 0.4 : 0.3, 1.4); if (a.t >= warn) match.shake(2, 4); }
    if (a.t > warn + live) { this.viz = null; this.closeWin(); return true; }
    return false;
  }
  /** RECYCLE BIN (enraged): the bin opens and starts sucking - everyone is dragged toward the middle - then it empties itself: crumpled paper balls shoot out both ways. */
  atk_bin(match, a, out) {
    const suck = this.sp(BIN.suck);
    if (a.t === 1) { this.openWin('bin', 0, -262, 70, 70); sfx('geyser', 0.8, 0.6); }
    this.mood = 'angry';
    if (a.t < suck) {
      for (const f of match.fighters) if (f.alive && f.state !== 'respawn') f.x += Math.sign(0 - f.x) * BIN.pull * (Math.abs(f.x) > 8 ? 1 : 0);
      if (a.t % 3 === 0) { const s = Math.random() < 0.5 ? -1 : 1; match.particles.push({ x: s * 260, y: -40 - Math.random() * 160, vx: -s * 6, vy: -0.5, life: 40, color: 0xf8f4e8, size: 3 }); }
      if (a.t % 20 === 0) sfx('whoosh', 0.5, 0.5);
      return false;
    }
    if (a.t === suck) { sfx('bighit', 0.8, 0.8); for (let i = 0; i < BIN.n; i++) { const s = i % 2 ? 1 : -1; this.balls.push({ x: 0, y: -240, vx: s * (2.5 + (i >> 1) * 1.6), vy: -3 - Math.random() * 2, id: this.sid('ball'), a: 0 }); } }
    for (const B2 of this.balls) { B2.vy += 0.3; B2.x += B2.vx; B2.y += B2.vy; B2.a += 0.2; if (B2.y > -12 && B2.vy > 0) { B2.y = -12; B2.vy *= -0.55; B2.vx *= 0.8; } out.push(this.bhit(B2.id, B2.x - 12, B2.y - 12, B2.x + 12, B2.y + 12, ...BIN.hit, { radial: true })); if (Math.abs(B2.x) > 320 || a.t > suck + 120) B2.dead = true; }
    this.balls = this.balls.filter((b) => !b.dead);
    if (a.t > suck && !this.balls.length) { this.closeWin(); return true; }
    return false;
  }

  /** It says something snobby (a line from `list`) over its screen. */
  snob(match, list) { const c = this.core(); match.popText({ x: c.x, y: c.y - 40 }, list[Math.floor(Math.random() * list.length)], '#c8ffd8'); sfx('menu', 0.4, 0.7); }
  /** A hit on its screen: now and then it's outraged. */
  onHurt(match, r) { if (r.mult >= 1 && this.t - (this.lastHurtLine || -999) > 150 && Math.random() < 0.5) { this.lastHurtLine = this.t; this.snob(match, SNOB.hurt); } }
  /**
   * SLUDGE: it tips the paint bucket and pours thick, sticky sludge onto the desk in a few places - a splash where it
   * lands, then a gooey puddle that stays a while. Anyone standing in sludge moves at half speed.
   */
  atk_sludge(match, a, out) {
    const n = SLUDGE.n[this.boss.phase - 1], k = this.cur, every = this.sp(SLUDGE.every);
    this.mood = 'grin'; k.mode = 'bucket';
    const i = Math.floor((a.t - 1) / every), q = (a.t - 1) % every;
    if (i >= n) { k.mode = 'arrow'; this.pour = null; this.fill = null; return a.t > n * every + 20; }
    if (q === 0) { const tg = this.nearest(match, k.x); a.tx = Phaser.Math.Clamp((i === 0 && tg ? tg.x : (Math.random() - 0.5) * 460) + (i ? 0 : 0), -230, 230); if (i === 0) { this.fill = { col: C.sludge[1] }; match.popText({ x: this.core().x, y: this.core().y - 40 }, 'STAY. PUT.', '#c8ffd8'); } }
    this.toward(a.tx - 24, -150, 0.2);
    if (q >= 10 && q < 10 + SLUDGE.pour) {
      this.pour = { x: k.x + 26, y: k.y + 24 };
      if (q % 3 === 0) out.push(this.bhit('pour' + a.id + i, this.pour.x - 10, this.pour.y, this.pour.x + 10, 0, ...SLUDGE.hit));
      if (q === 10) sfx('geyser', 0.6, 0.6);
      if (q === 10 + SLUDGE.pour - 1) { this.puddles.push({ x: this.pour.x, t: 0, w: SLUDGE.w, seed: Math.random() * 9 }); sfx('land', 0.6, 0.5); this.pour = null; }
    } else this.pour = null;
    return false;
  }
  /** The sludge puddles: they grow in, slow anyone standing in them, bubble, and dry up. */
  stepPuddles(match) {
    for (const P of this.puddles) {
      P.t++;
      for (const f of match.fighters) if (f.alive && f.y > -8 && Math.abs(f.x - P.x) < P.w / 2 * Math.min(1, P.t / 12)) { f.slow = Math.max(f.slow || 0, SLUDGE.slow); if (this.t % 20 === 0 && Math.abs(f.vx || 0) > 0.5) sfx('land', 0.15, 0.4); }
    }
    this.puddles = this.puddles.filter((P) => P.t < SLUDGE.life);
  }
  /**
   * CDs (when it's low on health): the drive tray on its tower slides out and it fires CDs at you one after another -
   * spinning, glinting, skipping once off the desk. It sneers about its music collection.
   */
  atk_cds(match, a, out) {
    const n = CDS.n[this.boss.phase - 1], every = this.sp(CDS.every), o = this.trayTip();
    this.mood = 'angry';
    if (a.t === 1) { sfx('menu', 0.8, 0.6); match.popText({ x: o.x, y: o.y - 30 }, ['ENJOY MY MIXTAPE.', 'A CLASSIC. UNLIKE YOU.', 'SIDE B. EVEN WORSE.'][Math.floor(Math.random() * 3)], '#c8ffd8'); }
    this.tray = Math.min(1, a.t / 12);
    if (a.t > 14 && (a.t - 14) % every === 0 && (a.t - 14) / every <= n) {
      const tg = this.nearest(match, o.x), tx = (tg ? tg.x : -200) + (Math.random() * 2 - 1) * CDS.spread, ty = tg ? tg.y - 24 : -20, d = Math.hypot(tx - o.x, ty - o.y) || 1;
      this.discs.push({ x: o.x, y: o.y, vx: (tx - o.x) / d * CDS.speed, vy: (ty - o.y) / d * CDS.speed, a: 0, n: 0, id: this.sid('cd') });
      sfx('whoosh', 0.6, 1.9); sfx('clang', 0.25, 2.4);
    }
    this.stepDiscs(match, out);
    if (a.t > 14 + (n + 1) * every) { this.tray = Math.max(0, 1 - (a.t - 14 - (n + 1) * every) / 12); if (this.tray <= 0 && !this.discs.length) return true; }
    return false;
  }
  /** Where the CD tray's tip is (the tower's top drive, slid out toward the room). */
  trayTip() { return { x: 112 - 30 * (this.tray || 0), y: -196 + 18 }; }
  /** The CDs: flying, spinning; one skip off the desk; gone off screen. */
  stepDiscs(match, out) {
    for (const D of this.discs) {
      D.x += D.vx; D.y += D.vy; D.a += 0.5;
      if (D.y > -CDS.r && D.vy > 0 && Math.abs(D.x) < 270 && !D.n) { D.vy = -Math.abs(D.vy) * 0.7; D.n = 1; sfx('clang', 0.4, 2); }
      out.push(this.bhit(D.id, D.x - CDS.r, D.y - CDS.r, D.x + CDS.r, D.y + CDS.r, ...CDS.hit, { dirX: Math.sign(D.vx) || 1 }));
      if (Math.abs(D.x) > 360 || D.y < -460 || D.y > 200) D.dead = true;
    }
    this.discs = this.discs.filter((D) => !D.dead);
  }

  /** A pixel letter (5x7) - for NOTEPAD's typed words. */
  glyph(g, ch, x, y, s, col) {
    const G = GLYPHS[ch]; if (!G) return;
    g.fillStyle(col, 1); G.forEach((row, r) => { for (let c = 0; c < 5; c++) if (row & (16 >> c)) g.fillRect(x + c * s, y + r * s, s, s); });
  }
  /** A seven-segment digit (the calculator's numbers), w x h, in colour col. */
  seg7(g, d, x, y, w, h, col) {
    const S = ['1111110', '0110000', '1101101', '1111001', '0110011', '1011011', '1011111', '1110000', '1111111', '1111011'][d], t = Math.max(2, w * 0.2);
    const bars = [[x, y, w, t], [x + w - t, y, t, h / 2], [x + w - t, y + h / 2, t, h / 2], [x, y + h - t, w, t], [x, y + h / 2, t, h / 2], [x, y, t, h / 2], [x, y + h / 2 - t / 2, w, t]];
    g.fillStyle(col, 1); bars.forEach((b, i) => { if (S[i] === '1') g.fillRect(...b); });
  }
  /** A program window (zooming out of its screen as it opens): bevelled frame, title bar with its icon, and its contents by kind. */
  drawProgWin(g) {
    const W = this.win; if (!W || W.k <= 0.02) return;
    const k = W.k, e = 1 - Math.pow(1 - k, 3), cx = lerpN(W.fx, W.x, e), cy = lerpN(W.fy, W.y, e), w = W.w * e, h = W.h * e, x = cx - w / 2, y = cy - h / 2, t = this.t;
    g.fillStyle(C.out, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2); this.bevel(g, x, y, w, h);
    g.fillStyle(C.navy, 1); g.fillRect(x + 3, y + 3, w - 6, 10); g.fillStyle(C.blue, 1); g.fillRect(x + 3 + (w - 6) / 2, y + 3, (w - 6) / 2, 10);
    if (k < 0.7) return;
    const ix = x + 6, iy = y + 4, bx = x + 4, by = y + 15, bw = w - 8, bh = h - 19;
    if (W.kind === 'paint') { g.fillStyle(0xffd040, 1); g.fillCircle(ix + 4, iy + 4, 4); g.fillStyle(0xffffff, 1); g.fillRect(bx + 22, by, bw - 22, bh); PAINT.cols.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(bx + 2 + (i % 2) * 9, by + 2 + Math.floor(i / 2) * 9, 8, 8); }); if (this.paint) { g.fillStyle(this.paint.col, 1); g.fillRect(bx + 30, by + bh / 2, Math.min(bw - 40, this.paint.pts.length * 2), 5); } }
    if (W.kind === 'mines') { g.fillStyle(0x101010, 1); g.fillCircle(ix + 4, iy + 4, 4); this.bevel(g, cx - 8, by + 2, 16, 14); g.fillStyle(0xffe020, 1); g.fillCircle(cx, by + 9, 5); g.fillStyle(0x101010, 1); g.fillRect(cx - 3, by + 7, 2, 2); g.fillRect(cx + 1, by + 7, 2, 2); for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) this.bevel(g, bx + 6 + i * 13, by + 20 + j * 13, 12, 12, (i * 3 + j) % 4 === 0); }
    if (W.kind === 'calc') { g.fillStyle(0x606060, 1); g.fillRect(ix, iy, 8, 8); g.fillStyle(0x203a20, 1); g.fillRect(bx + 4, by + 2, bw - 8, 18); for (let i = 0; i < 4; i++) this.seg7(g, (Math.floor(t / 6) + i * 3) % 10, bx + 10 + i * 13, by + 5, 9, 12, 0x30ff80); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) this.bevel(g, bx + 4 + i * 16, by + 24 + j * 13, 14, 11); }
    if (W.kind === 'notes') { g.fillStyle(0xffffff, 1); g.fillRect(ix, iy, 7, 8); g.fillStyle(0xffffff, 1); g.fillRect(bx, by, bw, bh); for (let i = 0; i < 4; i++) { g.fillStyle(0x202020, 1); g.fillRect(bx + 4, by + 5 + i * 10, 20 + ((i * 37 + t) % 100), 3); } if (t % 30 < 15) { g.fillStyle(0x000000, 1); g.fillRect(bx + 30, by + 34, 2, 8); } }
    if (W.kind === 'music') { g.fillStyle(0xffa020, 1); g.fillTriangle(ix, iy, ix + 8, iy + 4, ix, iy + 8); g.fillStyle(0x000000, 1); g.fillRect(bx, by, bw, bh); for (let i = 0; i < 16; i++) { const hh = (bh - 6) * Math.abs(Math.sin(t * 0.3 + i * 0.7)); g.fillStyle([0x30ff80, 0xffe040, 0xff4040][Math.min(2, Math.floor(hh / (bh / 3)))], 1); g.fillRect(bx + 4 + i * (bw - 8) / 16, by + bh - 3 - hh, (bw - 8) / 16 - 2, hh); } }
    if (W.kind === 'bin') { g.fillStyle(C.grey[3], 1); g.fillRect(cx - 14, by + 6, 28, 34); g.fillStyle(C.grey[1], 1); for (let i = 0; i < 3; i++) g.fillRect(cx - 9 + i * 8, by + 10, 3, 26); g.fillStyle(C.grey[2], 1); g.fillRect(cx - 18, by + 2, 36, 5); }
  }

  /** Its death: the screen collapses to a line, then a dot (the explosions come from BossArena). */
  onDeath() { this.discs = []; this.pour = null; this.closeWin(); this.paint = null; this.fill = null; this.mines = null; this.digits = []; this.letters = []; this.viz = null; this.balls = []; this.cards = []; this.pipes = []; this.blocks = []; this.hang = 0; }

  /**
   * THE ENTRANCE (k = 0..1): the switched-off monitor sits dark; the tower's power light blinks on, it whirs and
   * beeps, the screen warms up from a dot to a line to a picture (a startup screen with a loading bar), its face
   * appears and grins - and its giant cursor slides in and clicks on you: the pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    this.boot = k; this.mood = k > 0.7 ? 'grin' : 'boot';
    if (t === Math.round(0.08 * n)) { sfx('ding', 0.8, 0.5); sfx('rumble', 0.5, 1.6); }
    if (t === Math.round(0.45 * n)) { sfx('ding', 0.9, 1.0); sfx('ding', 0.7, 1.26); sfx('ding', 0.6, 1.5); }
    const e = Phaser.Math.Clamp((k - 0.72) / 0.2, 0, 1);
    this.cur.x = 330 - 260 * (1 - Math.pow(1 - e, 3)); this.cur.y = -120; this.cur.mode = k > 0.9 ? 'hand' : 'arrow';
    if (t === Math.round(0.92 * n)) { this.cur.press = 8; sfx('clang', 0.8, 2.2); }
  }
  /** The entrance's camera: close on its dark screen, pulling back as it boots, wide for the cursor. */
  introShot(k) { const c = this.core(); return k < 0.45 ? { x: c.x, y: c.y + 20, zoom: 1.5 } : k < 0.72 ? { x: c.x, y: c.y + 30, zoom: 1.2 } : { x: 30, y: -140, zoom: 1.0 }; }
  /** The freeze frame: its screen and cursor. */
  introAt() { const c = this.core(); return { x: c.x + 20, y: c.y + 30, zoom: 1.05 }; }
  /** After the intro it's fully booted. */
  endIntro() { super.endIntro(); this.boot = 1; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_popup(match, h) { h.title = 'POP-UP!'; const tg = this.nearest(match); this.dropDialog(Phaser.Math.Clamp(tg ? tg.x : 0, -215, 215), false); }
  /** POP-UP: a window falls on the marked spot and lies there as a ledge (stepErrors does the work). */
  step_popup(match, h, out) { if (!this.boss) this.stepErrors(match, out); return h.t > POPUP.warn + 50; }
  start_dialup(match, h) { h.title = 'DIAL-UP!'; h.y = Math.random() < 0.5 ? -DIAL.h : -130; h.s = Math.random() < 0.5 ? -1 : 1; sfx('glitch', 0.5, 1.8); }
  /** DIAL-UP: a striped band flashes, then a screeching modem beam sweeps across it. */
  step_dialup(match, h, out) {
    if (h.t < DIAL.warn) { this.dial = { y: h.y, warn: h.t / DIAL.warn }; return false; }
    if (h.t < DIAL.warn + DIAL.on) {
      const q = (h.t - DIAL.warn) / DIAL.on, x = h.s * (-300 + 600 * q); this.dial = { y: h.y, x, s: h.s };
      out.push(this.bhit('dial' + h.id + Math.floor(h.t / 10), x - 60, h.y, x + 60, h.y + DIAL.h, ...DIAL.hit, { dirX: h.s }));
      if (h.t % 6 === 0) sfx('laser', 0.3, 0.6 + Math.random());
      return false;
    }
    this.dial = null; return true;
  }

  /** Moves the desktop and BEIGE.EXE one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (this.hang > 0) this.hang--;
      if (this.blue > 0) this.blue--;
      if (this.cur.press > 0) this.cur.press--;
      this.stepWin(); if (this.keyFlash && --this.keyFlash.t <= 0) this.keyFlash = null;
      if (!this.boss.atk || this.boss.atk.name !== 'calc') this.stepDigits(match, out);
      if (!this.boss.atk || this.boss.atk.name !== 'notes') this.stepLetters(match, out);
      if (!this.boss.atk || this.boss.atk.name !== 'errors') this.stepErrors(match, out);
      if (!this.boss.atk || this.boss.atk.name !== 'cards') this.stepCards(match, out);
      if (this.boss.dying) this.mood = 'dead';
      this.stepPuddles(match);
      if (!this.boss.atk || this.boss.atk.name !== 'cds') { this.stepDiscs(match, out); this.tray = Math.max(0, this.tray - 0.08); }
      if (!this.low && !this.boss.dying && this.boss.hp <= this.boss.max * CDS.at) { this.low = true; this.rageText.setText('MUSIC TRAY ONLINE.'); this.boss.rage = 90; sfx('ding', 1, 0.5); }
    }
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the machine (monitor + tower + cables), its cursor, dialogs, cards, pipes, blocks, the hazards; the bar. */
  render() {
    const t = this.t, B = this.boss, g = this.monG, x = this.fxG;
    g.clear(); x.clear();
    this.drawMachine(g, B ? B.flash > 0 : false, !B);
    this.drawMouse(x);
    for (const P of this.puddles) {                                                     // SLUDGE puddles: purple goo with bubbles, drying at the edges
      const k = Math.min(1, P.t / 12) * Math.min(1, (SLUDGE.life - P.t) / 40), w = P.w * k;
      x.fillStyle(C.sludge[0], 1); x.fillEllipse(P.x, -2, w + 6, 12); x.fillStyle(C.sludge[1], 1); x.fillEllipse(P.x, -3, w, 9); x.fillStyle(C.sludge[2], 1); x.fillEllipse(P.x - w * 0.15, -5, w * 0.5, 3);
      for (let i = 0; i < 3; i++) { const bx = P.x + Math.sin(P.seed + i * 2.1) * w * 0.35, ph = (t * 0.05 + i * 0.7 + P.seed) % 1; x.fillStyle(C.sludge[3], 0.8 * (1 - ph)); x.fillCircle(bx, -6 - ph * 6, 2 + ph * 3); }
      for (let i = 0; i < 4; i++) { x.fillStyle(C.sludge[1], 1); x.fillEllipse(P.x - w * 0.45 + i * w * 0.3, 2, 8, 6 + (i % 2) * 6); }
    }
    if (this.pour) { const P = this.pour; x.fillStyle(C.sludge[0], 1); x.fillRect(P.x - 7, P.y, 14, -P.y); x.fillStyle(C.sludge[1], 1); x.fillRect(P.x - 5, P.y, 10, -P.y); for (let i = 0; i < 4; i++) { x.fillStyle(C.sludge[2], 1); x.fillCircle(P.x + Math.sin(t * 0.4 + i) * 3, P.y + ((t * 6 + i * 30) % -P.y), 3); } }
    for (const D of this.discs) {                                                       // the CDs: silver discs with a rainbow glint, spinning
      const sq = Math.abs(Math.cos(D.a)) * 0.6 + 0.4;
      x.fillStyle(C.out, 1); x.fillEllipse(D.x, D.y, CDS.r * 2 + 3, (CDS.r * 2 + 3) * sq); x.fillStyle(0xd8dce8, 1); x.fillEllipse(D.x, D.y, CDS.r * 2, CDS.r * 2 * sq);
      x.fillStyle([0xff80c0, 0x80c0ff, 0xffe080, 0x80ffc0][Math.floor(D.a) % 4], 0.8); x.fillEllipse(D.x - 3, D.y - 3 * sq, CDS.r, CDS.r * 0.5 * sq);
      x.fillStyle(0x7a7a8a, 1); x.fillEllipse(D.x, D.y, 7, 7 * sq); x.fillStyle(0x000000, 1); x.fillEllipse(D.x, D.y, 3, 3 * sq);
    }
    if (this.tray > 0) { const o = this.trayTip(); x.fillStyle(C.out, 1); x.fillRect(o.x - 2, o.y - 6, 32 * this.tray + 2, 12); x.fillStyle(C.beige[1], 1); x.fillRect(o.x, o.y - 4, 30 * this.tray, 8); x.fillStyle(0x303030, 1); x.fillEllipse(o.x + 12, o.y, 18 * this.tray, 5); }
    this.drawProgWin(x);
    if (this.paint) { const P = this.paint, a = Math.max(0, 1 - (P.fade || 0) / 30); x.lineStyle(18, P.col, a); for (let i = 1; i < P.pts.length; i++) x.lineBetween(P.pts[i - 1].x, P.pts[i - 1].y, P.pts[i].x, P.pts[i].y); x.lineStyle(6, 0xffffff, 0.3 * a); for (let i = 1; i < P.pts.length; i++) x.lineBetween(P.pts[i - 1].x, P.pts[i - 1].y - 5, P.pts[i].x, P.pts[i].y - 5); x.lineStyle(0); for (let i = 0; i < P.pts.length; i += 7) { x.fillStyle(P.col, a); x.fillRect(P.pts[i].x - 2, P.pts[i].y + 8, 4, 6 + (i * 13) % 14); } }
    if (this.fill) { const F = this.fill, x1 = F.s < 0 ? -275 : 0, x2 = F.s < 0 ? 0 : 275; if (F.warn) { x.lineStyle(2, F.col, t % 8 < 4 ? 1 : 0.3); x.strokeRect(x1, -135, x2 - x1, 135); x.lineStyle(0); x.fillStyle(F.col, 0.12); x.fillRect(x1, -135, x2 - x1, 135); } else if (F.k > 0) { x.fillStyle(F.col, 0.85 * Math.min(1, F.k * 1.2)); x.fillRect(x1, -135 * Math.min(1, F.k), x2 - x1, 135 * Math.min(1, F.k)); x.fillStyle(0xffffff, 0.3); x.fillRect(x1, -135 * Math.min(1, F.k), x2 - x1, 4); } }
    if (this.mines) for (const T of this.mines.tiles) {                                   // MINESWEEPER's grid along the desk
      const tx = T.x - MINES.w / 2 + 1, w = MINES.w - 2;
      if (T.boom) { if (T.boom < 14) { x.fillStyle(0xffd040, 1 - T.boom / 14); x.fillCircle(T.x, -30, 20 + T.boom * 3); } x.fillStyle(0x101010, 1); x.fillRect(tx, -6, w, 6); continue; }
      if (T.open < 1) { this.bevel(x, tx, -10, w, 10); continue; }
      x.fillStyle(C.grey[3], 1); x.fillRect(tx, -10, w, 10); x.fillStyle(C.grey[1], 1); x.fillRect(tx, -10, 1, 10);
      if (T.mine) { x.fillStyle(0x101010, 1); x.fillRect(T.x - 1, -38, 2, 28); x.fillStyle(0xff2020, t % 10 < 5 ? 1 : 0.6); x.fillTriangle(T.x + 1, -38, T.x + 1, -26, T.x + 14, -32); }
      else if (T.num) { x.fillStyle(T.num > 1 ? 0x20a020 : 0x2040ff, 1); x.fillRect(T.x - 2, -9, 4, 8); }
    }
    for (const D of this.digits) { x.fillStyle(0x0a1a0a, 0.8); x.fillRect(D.x - 13, D.y - 17, 26, 34); this.seg7(x, D.d, D.x - 9, D.y - 13, 18, 26, 0x30ff80); }
    for (const L of this.letters) { x.fillStyle(0xffffff, 1); x.fillRect(L.x - 11, L.y - 15, 22, 30); x.fillStyle(C.grey[1], 1); x.fillRect(L.x - 11, L.y + 13, 22, 2); this.glyph(x, L.ch, L.x - 8, L.y - 11, 3.2, 0x101010); }
    if (this.viz) for (const b of this.viz.bars) { x.fillStyle(C.out, 1); x.fillRect(b.x - MUSIC.w / 2 + 2, -b.h - 1, MUSIC.w - 4, b.h + 1); for (let yy = 0; yy < b.h; yy += 8) { x.fillStyle(yy > 90 ? 0xff4040 : yy > 40 ? 0xffe040 : 0x30ff80, 1); x.fillRect(b.x - MUSIC.w / 2 + 4, -yy - 6, MUSIC.w - 8, 5); } }
    for (const B2 of this.balls) { x.fillStyle(C.out, 1); x.fillCircle(B2.x, B2.y, 12); x.fillStyle(0xf8f4e8, 1); x.fillCircle(B2.x, B2.y, 10); x.lineStyle(1, C.grey[1], 1); x.lineBetween(B2.x - 6 + Math.cos(B2.a) * 3, B2.y - 3, B2.x + 5, B2.y + 4 + Math.sin(B2.a) * 2); x.lineBetween(B2.x - 4, B2.y + 5, B2.x + 6, B2.y - 5); x.lineStyle(0); }
    for (const d of this.errs) this.drawDialog(x, d);
    for (const k of this.cards) { k.trail.forEach((p, i) => { if (i % 3 === 0) this.drawCard(x, p.x, p.y, k.suit, 0.9); }); this.drawCard(x, k.x, k.y, k.suit, 1); }
    for (const p of this.pipes) {                                                        // the screensaver's pipes: shaded tubes with ball joints
      const a = Math.max(0, 1 - p.fade / 40);
      for (const [lw, c, al] of [[16, C.out, 1], [12, p.col, 1], [4, 0xffffff, 0.45]]) { x.lineStyle(lw, c, a * al); for (let i = 1; i < p.pts.length; i++) x.lineBetween(p.pts[i - 1].x, p.pts[i - 1].y - (lw === 4 ? 3 : 0), p.pts[i].x, p.pts[i].y - (lw === 4 ? 3 : 0)); }
      x.lineStyle(0); for (let i = 1; i < p.pts.length - 1; i++) { const q = p.pts[i], pr = p.pts[i - 1], nx = p.pts[i + 1]; if ((q.x - pr.x) * (nx.y - q.y) !== (q.y - pr.y) * (nx.x - q.x)) { x.fillStyle(p.col, a); x.fillCircle(q.x, q.y, 9); x.fillStyle(0xffffff, 0.5 * a); x.fillCircle(q.x - 3, q.y - 3, 3); } }
    }
    for (const b of this.blocks) { if (b.t < this.sp(CRASH.warn)) { x.fillStyle(b.c, 0.3 + 0.3 * (t % 6 < 3 ? 1 : 0)); x.fillRect(b.x - 16, -4, 32, 4); continue; } for (let i = 0; i < 4; i++) { x.fillStyle([b.c, 0x000000, 0xffffff, b.c][i], 1); x.fillRect(b.x - 16 + (i % 2) * 16, b.y - 16 + Math.floor(i / 2) * 16, 16, 16); } }
    if (this.dial) {                                                                     // DIAL-UP: warning stripes, then the screech
      const D = this.dial;
      if (D.warn != null) { for (let sx = -270; sx < 270; sx += 20) { x.fillStyle(t % 10 < 5 ? 0xffff00 : 0x000000, 0.4 * D.warn + 0.1); x.fillTriangle(sx, D.y + DIAL.h, sx + 10, D.y, sx + 20, D.y + DIAL.h); } }
      else for (let i = 0; i < 24; i++) { x.fillStyle([0xffffff, 0x30ff80, 0x00ffff][i % 3], 0.7); x.fillRect(D.x - 60 + Math.random() * 120, D.y + Math.random() * DIAL.h, 3 + Math.random() * 10, 2); }
    }
    if (this.blue > 0 && this.blue % 10 < 5) { x.fillStyle(C.bsod, 0.25 * this.blue / 150); x.fillRect(-700, -700, 1400, 1100); }
    if (this.keyFlash) { const i = this.keyFlash.i, r = Math.floor(i / 18), k2 = i % 18; x.fillStyle(0xffffff, 0.8); x.fillRect(-112 + k2 * 12.6 + r * 3, -19 + r * 4.6 + 1, 10, 3.4); }
    this.drawCursor(x);
    if (B) this.drawBar();
  }
  /** One error dialog: a grey window, navy title bar with an X, a red error icon, two text lines, an OK button. */
  drawDialog(g, d) {
    if (d.st === 'mark') { if (d.t > 0) { g.fillStyle(0xff2020, 0.3 + 0.3 * (this.t % 8 < 4 ? 1 : 0)); g.fillRect(d.x - ERR.w / 2, -4, ERR.w, 4); } return; }
    const k = d.st === 'close' ? Math.max(0, d.k) : 1, w = ERR.w * k, h = ERR.h * k, x = d.x - w / 2, y = d.y - h;
    if (w < 4) return;
    g.fillStyle(C.out, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2); this.bevel(g, x, y, w, h);
    g.fillStyle(C.navy, 1); g.fillRect(x + 3, y + 3, w - 6, 11 * k); this.bevel(g, x + w - 14 * k, y + 4, 10 * k, 9 * k);
    if (k > 0.6) {
      g.fillStyle(0xd01010, 1); g.fillCircle(x + 18, y + 30, 10); g.lineStyle(3, 0xffffff, 1); g.lineBetween(x + 13, y + 25, x + 23, y + 35); g.lineBetween(x + 23, y + 25, x + 13, y + 35); g.lineStyle(0);
      g.fillStyle(C.out, 1); g.fillRect(x + 34, y + 23, 50, 3); g.fillRect(x + 34, y + 30, 38, 3);
      this.bevel(g, x + w / 2 - 16, y + h - 18, 32, 13); g.fillStyle(C.out, 1); g.fillRect(x + w / 2 - 6, y + h - 13, 4, 4); g.fillRect(x + w / 2 + 1, y + h - 13, 5, 4);
    }
  }
  /** A playing card (bouncing in the solitaire cascade): white with a red or black pip. */
  drawCard(g, x, y, suit, a) {
    g.fillStyle(C.out, a); g.fillRect(x - 11, y - 16, 22, 32); g.fillStyle(C.card[0], a); g.fillRect(x - 10, y - 15, 20, 30);
    const col = suit % 2 ? C.card[1] : C.card[2];
    g.fillStyle(col, a);
    if (suit === 1) { g.fillCircle(x - 3, y - 2, 4); g.fillCircle(x + 3, y - 2, 4); g.fillTriangle(x - 7, y, x + 7, y, x, y + 8); }
    else if (suit === 3) { g.fillTriangle(x, y - 8, x + 6, y, x, y + 8); g.fillTriangle(x, y - 8, x - 6, y, x, y + 8); }
    else { g.fillCircle(x, y - 3, 4); g.fillCircle(x - 4, y + 2, 4); g.fillCircle(x + 4, y + 2, 4); g.fillRect(x - 1, y + 2, 2, 7); }
    g.fillRect(x - 8, y - 13, 3, 4);
  }
  /** Its giant cursor: an arrow (white, black outline), a pointing hand, or the hourglass; pressed in when it clicks. */
  drawCursor(g) {
    const k = this.cur, s = 2.6 * (k.press > 0 ? 0.9 : 1), x = k.x, y = k.y;
    if (!this.boss && !this.boot) return;
    if (k.mode === 'wait') {
      const a = (this.t * 0.06) % Math.PI;
      g.fillStyle(C.out, 1); g.fillRect(x - 12, y - 4, 24, 46); g.fillStyle(C.grey[4], 1); g.fillRect(x - 10, y - 2, 20, 42);
      g.fillStyle(C.out, 1); g.fillRect(x - 12, y - 4, 24, 5); g.fillRect(x - 12, y + 37, 24, 5);
      g.fillStyle(0xe8c840, 1); g.fillTriangle(x - 7, y + 4, x + 7, y + 4, x, y + 19); g.fillTriangle(x - 7 * Math.cos(a), y + 36, x + 7 * Math.cos(a), y + 36, x, y + 22);
      return;
    }
    if (k.mode === 'brush') {                                                            // the paint brush: handle up and back, wet bristles at the tip
      const col = this.paint ? this.paint.col : 0xff3040;
      g.lineStyle(12, C.out, 1); g.lineBetween(x + 6, y - 10, x + 46, y - 60); g.lineStyle(8, 0xc08040, 1); g.lineBetween(x + 6, y - 10, x + 46, y - 60); g.lineStyle(0);
      g.fillStyle(C.grey[2], 1); g.fillRect(x - 4, y - 18, 16, 12); g.fillStyle(C.out, 1); g.fillTriangle(x - 8, y - 8, x + 14, y - 8, x, y + 12); g.fillStyle(col, 1); g.fillTriangle(x - 5, y - 7, x + 11, y - 7, x, y + 9);
      return;
    }
    if (k.mode === 'bucket') {                                                           // the paint bucket, tipping
      const col = this.fill ? this.fill.col : 0x30a0ff;
      g.fillStyle(C.out, 1); g.fillPoints([{ x: x - 20, y: y - 20 }, { x: x + 20, y: y - 26 }, { x: x + 26, y: y + 16 }, { x: x - 14, y: y + 22 }], true);
      g.fillStyle(C.grey[2], 1); g.fillPoints([{ x: x - 17, y: y - 17 }, { x: x + 17, y: y - 22 }, { x: x + 22, y: y + 13 }, { x: x - 12, y: y + 18 }], true);
      g.fillStyle(col, 1); g.fillEllipse(x + 22, y + 15, 16, 8); g.fillRect(x + 26, y + 15, 4, 10 + (this.t % 10));
      g.lineStyle(3, C.out, 1); g.beginPath(); g.arc(x, y - 22, 18, Math.PI, 0); g.strokePath(); g.lineStyle(0);
      return;
    }
    const P = k.mode === 'hand'
      ? [[3, 0], [6, 0], [6, 6], [9, 6], [12, 7], [14, 9], [14, 16], [11, 20], [4, 20], [0, 14], [0, 9], [3, 11]]
      : [[0, 0], [0, 16], [4, 12], [7, 19], [10, 18], [7, 11], [12, 11]];
    g.fillStyle(C.out, 1); g.fillPoints(P.map(([px, py]) => ({ x: x + px * s - 2, y: y + py * s - 2 })), true); g.fillPoints(P.map(([px, py]) => ({ x: x + px * s + 2, y: y + py * s + 2 })), true);
    g.fillStyle(C.grey[4], 1); g.fillPoints(P.map(([px, py]) => ({ x: x + px * s, y: y + py * s })), true);
    if (k.press > 0) { g.lineStyle(2, 0xffffff, k.press / 6); g.strokeCircle(x, y, 20 + (6 - k.press) * 4); g.lineStyle(0); }
    const A = this.boss && this.boss.atk;
    if (A && A.shadow) { g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 10, -2, 40, 8); }
  }
  /**
   * The machine: a beige tower case behind (drive slots, a power light), a fat CRT monitor floating on its stand -
   * beige casing with vents and a badge-less bezel, buttons and a power LED - and on its curved green screen its
   * face, by mood: idle / angry / happy / grin / hang (greyed out, an hourglass) / glitch / blank (the screensaver) /
   * blue (FATAL EXCEPTION: a sad face and error lines) / boot (the intro: off, a dot, a line, a loading bar) / dead.
   */
  drawMachine(g, flash, off) {
    const c = this.core(), sw = MON.sw, sh = MON.sh, b = MON.bez, Bg = flash ? [0xffffff, 0xffffff, 0xffffff, 0xffffff] : C.beige, t = this.t;
    const dk = this.deathK();
    // the tower case beside it on the desk
    const tx = 112, ty = -196, th = 172;
    g.fillStyle(C.out, 1); g.fillRect(tx - 2, ty - 2, 60, th + 2); g.fillStyle(Bg[1], 1); g.fillRect(tx, ty, 56, th); g.fillStyle(Bg[2], 1); g.fillRect(tx, ty, 48, th);
    for (let i = 0; i < 3; i++) { g.fillStyle(C.out, 1); g.fillRect(tx + 6, ty + 12 + i * 20, 36, 12); g.fillStyle(Bg[0], 1); g.fillRect(tx + 7, ty + 13 + i * 20, 34, 10); g.fillStyle(C.out, 1); g.fillRect(tx + 11, ty + 17 + i * 20, 22, 2); }
    g.fillStyle(off ? 0x203020 : (t % 40 < 30 ? 0x30ff60 : 0x108030), 1); g.fillRect(tx + 8, ty + 80, 6, 4); g.fillStyle(0xffa020, off ? 0.2 : (t % 7 < 3 ? 1 : 0.2)); g.fillRect(tx + 18, ty + 80, 6, 4);
    for (let i = 0; i < 7; i++) { g.fillStyle(Bg[0], 1); g.fillRect(tx + 8, ty + 100 + i * 9, 32, 3); }
    g.lineStyle(6, C.out, 1); g.lineBetween(c.x + 60, c.y + sh / 2 + b + 10, tx + 10, ty + 150); g.lineStyle(4, C.grey[1], 1); g.lineBetween(c.x + 60, c.y + sh / 2 + b + 10, tx + 10, ty + 150); g.lineStyle(0);
    // the stand (wearing a little bow tie)
    g.fillStyle(C.out, 1); g.fillRect(c.x - 26, c.y + sh / 2 + b - 4, 52, 34); g.fillStyle(Bg[1], 1); g.fillRect(c.x - 24, c.y + sh / 2 + b - 2, 48, 30);
    { const by = c.y + sh / 2 + b + 22; g.fillStyle(C.out, 1); g.fillTriangle(c.x, by, c.x - 22, by - 11, c.x - 22, by + 11); g.fillTriangle(c.x, by, c.x + 22, by - 11, c.x + 22, by + 11); g.fillStyle(0xb01830, 1); g.fillTriangle(c.x, by, c.x - 19, by - 8, c.x - 19, by + 8); g.fillTriangle(c.x, by, c.x + 19, by - 8, c.x + 19, by + 8); g.fillStyle(C.out, 1); g.fillCircle(c.x, by, 5); g.fillStyle(0xd02040, 1); g.fillCircle(c.x, by, 3.5); }
    g.fillStyle(C.out, 1); g.fillEllipse(c.x, c.y + sh / 2 + b + 32, 130, 22); g.fillStyle(Bg[2], 1); g.fillEllipse(c.x, c.y + sh / 2 + b + 30, 124, 18);
    // the CRT's deep back, then the bezel
    g.fillStyle(C.out, 1); g.fillRoundedRect(c.x - sw / 2 - b + 16, c.y - sh / 2 - b - 10, sw + b * 2 - 32, sh + b * 2 + 14, 14); g.fillStyle(Bg[0], 1); g.fillRoundedRect(c.x - sw / 2 - b + 18, c.y - sh / 2 - b - 8, sw + b * 2 - 36, 20, 10);
    g.fillStyle(C.out, 1); g.fillRoundedRect(c.x - sw / 2 - b - 2, c.y - sh / 2 - b - 2, sw + b * 2 + 4, sh + b * 2 + 22, 10);
    g.fillStyle(Bg[1], 1); g.fillRoundedRect(c.x - sw / 2 - b, c.y - sh / 2 - b, sw + b * 2, sh + b * 2 + 18, 9);
    g.fillStyle(Bg[3], 1); g.fillRoundedRect(c.x - sw / 2 - b + 3, c.y - sh / 2 - b + 3, sw + b * 2 - 6, 8, 4);
    g.fillStyle(Bg[2], 1); g.fillRect(c.x - sw / 2 - b + 3, c.y - sh / 2 - b + 10, sw + b * 2 - 6, sh + b * 2 - 6);
    g.fillStyle(Bg[0], 1); for (let i = 0; i < 5; i++) g.fillRect(c.x - sw / 2 + 6 + i * 6, c.y + sh / 2 + b + 4, 3, 8);       // vents
    g.fillStyle(C.out, 1); g.fillCircle(c.x + sw / 2 - 2, c.y + sh / 2 + b + 8, 5); g.fillStyle(Bg[1], 1); g.fillCircle(c.x + sw / 2 - 2, c.y + sh / 2 + b + 8, 4);
    g.fillStyle(off ? 0x203020 : 0x30ff60, 1); g.fillRect(c.x + sw / 2 - 16, c.y + sh / 2 + b + 6, 5, 3);
    // the screen
    const x0 = c.x - sw / 2, y0 = c.y - sh / 2;
    g.fillStyle(C.out, 1); g.fillRoundedRect(x0 - 3, y0 - 3, sw + 6, sh + 6, 10);
    const blue = this.blue > 0 || (this.boss && this.boss.phase === 2 && this.mood !== 'grin' && this.mood !== 'blank' && this.mood !== 'glitch' && this.t % 300 < 20);
    let bgc = C.screen[0];
    if (off || this.mood === 'dead') bgc = 0x101810; else if (this.mood === 'hang') bgc = 0x3a4a40; else if (blue) bgc = C.bsod; else if (this.mood === 'blank') bgc = 0x000000;
    g.fillStyle(bgc, 1); g.fillRoundedRect(x0, y0, sw, sh, 8);
    const px = (gx, gy, w = 1, h = 1, col = C.screen[2]) => { g.fillStyle(col, 1); g.fillRect(x0 + 15 + gx * 6, y0 + 10 + gy * 6, w * 6, h * 6); };   // the face's 20x15 pixel grid
    const boot = this.boot ?? 1;
    if (off) { g.fillStyle(0xffffff, 0.08); g.fillRoundedRect(x0 + 10, y0 + 8, 50, 26, 8); }
    else if (this.mood === 'dead') { const k = 1 - dk; g.fillStyle(0xffffff, 1); g.fillRect(c.x - sw / 2 * k, c.y - 1, sw * k, 2); }
    else if (boot < 0.45) {                                                              // booting: off, a dot, a line
      const q = boot / 0.45;
      if (q > 0.3) { g.fillStyle(0xffffff, 1); const w = q < 0.6 ? 4 : sw * (q - 0.6) / 0.4; g.fillRect(c.x - w / 2, c.y - 1, w, q < 0.6 ? 4 : 2); }
    } else if (boot < 0.7) {                                                             // the startup screen: a loading bar
      const q = (boot - 0.45) / 0.25;
      g.fillStyle(C.navy, 1); g.fillRoundedRect(x0, y0, sw, sh, 8); g.fillStyle(0xffffff, 1); g.fillRect(c.x - 22, c.y - 30, 44, 4); g.fillRect(c.x - 14, c.y - 20, 28, 4);
      g.fillStyle(C.grey[2], 1); g.fillRect(c.x - 50, c.y + 20, 100, 10); g.fillStyle(C.blue, 1); for (let i = 0; i < Math.floor(q * 12); i++) g.fillRect(c.x - 48 + i * 8, c.y + 22, 6, 6);
    } else if (blue) {                                                                   // FATAL EXCEPTION
      const W = 0xffffff; px(2, 2, 2, 2, W); px(2, 6, 2, 2, W); px(7, 2, 1, 6, W); px(8, 2, 2, 1, W); px(8, 7, 2, 1, W);   // a ":("
      for (let i = 0; i < 5; i++) px(2, 10 + i, 6 + ((i * 7) % 10), 0.4, W);
    } else if (this.mood === 'hang') {
      px(4, 3, 3, 3, C.grey[2]); px(13, 3, 3, 3, C.grey[2]); px(6, 10, 8, 1, C.grey[2]);
      g.fillStyle(0xffffff, 0.2); g.fillRect(x0, y0 + ((t * 3) % sh), sw, 3);
    } else if (this.mood === 'blank') {
      for (let i = 0; i < 20; i++) { g.fillStyle(0xffffff, 0.6); g.fillRect(x0 + ((i * 37 + t) % sw), y0 + ((i * 53) % sh), 2, 2); }
    } else if (this.mood === 'glitch') {
      for (let i = 0; i < 14; i++) { g.fillStyle([0xff00ff, 0x00ffff, 0xffff00, 0x30ff80][i % 4], 0.8); g.fillRect(x0 + Math.random() * (sw - 20), y0 + Math.random() * (sh - 8), 10 + Math.random() * 30, 4 + Math.random() * 6); }
    } else {                                                                              // its face
      const m = this.mood, blink = t % 140 < 6, evil = this.boss && (this.boss.phase === 2 || this.low), red = 0xff3a3a;
      const fc = evil ? red : C.screen[2];
      if (m === 'angry') {                                                                // evil: slanted brows, narrowed glaring eyes, a jagged sneer
        px(2, 2, 1, 1, fc); px(3, 3, 2, 1, fc); px(5, 4, 2, 1, fc); px(17, 2, 1, 1, fc); px(15, 3, 2, 1, fc); px(13, 4, 2, 1, fc);
        px(4, 5, 3, 1, fc); px(13, 5, 3, 1, fc); px(5, 5, 1, 1, evil ? 0xffffff : C.screen[3]); px(14, 5, 1, 1, evil ? 0xffffff : C.screen[3]);
        for (let i = 0; i < 6; i++) px(5 + i * 2, 10 + (i % 2), 2, 1, fc); px(4, 9, 1, 1, fc); px(16, 9, 1, 1, fc);
      } else if (m === 'grin' || m === 'happy') {                                          // a nasty, knowing grin
        px(3, 3, 4, 1, fc); px(13, 2, 4, 1, fc); px(4, 4, 3, 2, fc); px(13, 4, 3, 1, fc);
        px(4, 9, 12, 1, fc); px(5, 10, 10, 1, fc); px(6, 11, 8, 1, fc); px(6, 10, 8, 1, 0x0a2a1a); for (let i = 0; i < 4; i++) { px(6 + i * 2, 10, 1, 1, 0xffffff); }
      } else {                                                                              // SNOBBY at rest: half-lidded, one brow raised, a smirk off to the side
        px(3, 1, 4, 1, fc); px(13, 3, 4, 1, fc);
        if (blink) { px(4, 5, 3, 1, fc); px(13, 5, 3, 1, fc); } else { px(4, 4, 3, 2, fc); px(13, 4, 3, 2, fc); px(4, 4, 3, 1, 0x0a2a1a); px(13, 4, 3, 1, 0x0a2a1a); px(5, 5, 1, 1, C.screen[3]); px(14, 5, 1, 1, C.screen[3]); }
        px(9, 11, 6, 1, fc); px(15, 10, 1, 1, fc); px(8, 11, 1, 1, fc);
      }
      if (m !== 'angry') {                                                                  // the monocle, on its right eye, with its chain
        const mx = x0 + 15 + 14.5 * 6, my = y0 + 10 + 5 * 6;
        g.lineStyle(3, 0xe0c040, 1); g.strokeCircle(mx, my, 15); g.lineStyle(1, 0xffffff, 0.5); g.strokeCircle(mx - 2, my - 2, 11); g.lineStyle(0);
        g.fillStyle(0xffffff, 0.12); g.fillCircle(mx, my, 14);
        for (let i = 0; i < 6; i++) { g.fillStyle(0xe0c040, 1); g.fillRect(mx + 10 + i * 3, my + 12 + i * 5, 2, 2); }
      }
    }
    if (!off) { for (let y = y0; y < y0 + sh; y += 3) { g.fillStyle(0x000000, 0.12); g.fillRect(x0, y, sw, 1); } }   // scanlines
    g.fillStyle(0xffffff, 0.1); g.fillRoundedRect(x0 + 8, y0 + 6, sw * 0.45, sh * 0.25, 8);                         // the glass's shine
  }
}

/** THE DESKTOP's miniature for the stage select screen. */
export function drawDesktopPreview(g, x, y, w, h) {
  g.fillStyle(C.teal[1], 1); g.fillRect(x, y, w, h);
  g.fillStyle(C.grey[2], 1); g.fillRect(x, y + h * 0.82, w, h * 0.18); g.fillStyle(C.grey[4], 1); g.fillRect(x, y + h * 0.82, w, 1);
  g.fillStyle(C.grey[3], 1); g.fillRect(x + 2, y + h * 0.85, w * 0.12, h * 0.12);
  const cx = x + w * 0.5, cy = y + h * 0.4;
  g.fillStyle(C.beige[1], 1); g.fillRect(cx - w * 0.2, cy - h * 0.3, w * 0.4, h * 0.5); g.fillRect(cx - w * 0.06, cy + h * 0.2, w * 0.12, h * 0.1);
  g.fillStyle(C.screen[0], 1); g.fillRect(cx - w * 0.15, cy - h * 0.24, w * 0.3, h * 0.36);
  g.fillStyle(C.screen[2], 1); g.fillRect(cx - w * 0.08, cy - h * 0.14, 3, 3); g.fillRect(cx + w * 0.05, cy - h * 0.14, 3, 3); g.fillRect(cx - w * 0.08, cy, w * 0.16, 2);
  g.fillStyle(0xffffff, 1); g.fillTriangle(x + w * 0.75, y + h * 0.3, x + w * 0.75, y + h * 0.52, x + w * 0.82, y + h * 0.46);
  for (const s of [0.08, 0.72]) { g.fillStyle(C.grey[2], 1); g.fillRect(x + w * s, y + h * 0.5, w * 0.2, h * 0.25); g.fillStyle(C.navy, 1); g.fillRect(x + w * s, y + h * 0.5, w * 0.2, 3); }
}
