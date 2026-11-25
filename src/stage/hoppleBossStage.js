// HAPPY HILLS (LOST BUILD) - the arena of HOPPLE, THE FRIEND WHO STAYED (boss IX; Trinkets > BOSS FIGHTS,
// src/data/bosses.js). Video-game analog horror, all original: HOPPLE'S HAPPY HILLS was a 16-bit platformer about a
// cheerful rabbit mascot that was never released. Somebody found the cartridge, recorded it to a VHS tape - and this is
// the tape. You fight on the first level: a checkered dirt island, rolling striped hills, a smiling sun, clouds with
// faces, two rows of ? blocks for ledges, a fake game HUD in the corner (his lives, the score) and the whole picture
// running through a worn tape (scanlines, a tracking band, PLAY > and a timecode in the corner).
// HOPPLE is drawn as real pixel art (PixelPen, like SMUDGE): a big cream rabbit in blue overalls and red sneakers, about
// twice a fighter's height - with eyes that, now and then, for a frame, are not cartoon eyes at all.
// His attacks (`pattern`): BIG HOP (off the top of the screen, his shadow finds you, he lands - shockwaves both ways),
// SAY HELLO (an RPG text box types his line, drops on you, then its letters fly at you), MISSING FRAMES (the tape skips
// and he's beside you, three times, grabbing), EXTRA LIVES (the life icons peel off the HUD and come for you, chomping -
// one hit pops one), PLEASE STAND BY (red X's under you, then the picture cuts to a test card - move! - and spikes come up
// where you were) and BLEEDING COINS (red coins rain from the sky, dripping).
// At half health: THE LOST BUILD (a cutscene when a player's watching): the game breaks - the sky turns to blood, the
// hills die, his ear tears, his eyes go black for good and his smile splits. Then he adds EMERGENCY BROADCAST (an alert
// takes over the tape; crawling bars of text sweep the arena at floor or ledge height - jump the low ones, get down for
// the high ones), DEBUG MODE (a grid falls over everything, SOLID blocks drop on the marked cells and lie there as
// ledges) and IT SEES YOU (the lights go out, his face rises behind the hills, the ? blocks glow - get up on one - then
// the jumpscare: his mouth closes over the whole floor).
// His death: GAME OVER - he freezes, the picture tears, he falls apart into pixels, THANK YOU FOR PLAYING... and the tape
// stops. Stage hazards (VS too): STATIC (a column of static, then a shock) and TRACKING ROLL (a band of bad tape rolls
// along the floor - jump it).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { PixelPen } from './pixelPen.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W } from '../config.js';

// the island: the floor's ends; the ? block ledges (height, inner and outer x)
const FLOOR = { x1: -262, x2: 262 };
const LEDGE = { y: -112, x1: 142, x2: 222 };
// his pixel canvas (w x h) and how he moves between attacks (hop height, hop speed, how far he roams)
const PX = { w: 180, h: 236 };
const BODY = { hop: 14, speed: 2.2, range: 205 };
// all his hits: x damage, x base knockback, x knockback growth
const HIT = { dmg: 0.9, base: 1.0, growth: 0.95 };
// BIG HOP: crouch, rise, the shadow following you, locked, fall speed; hops (calm / lost); the landing and the shockwaves
const HOP = { crouch: 22, rise: 30, track: 44, lock: 14, fall: 17, n: [1, 2], hit: [14, [80, 6.2, 0.9]], wave: [7, [60, 4.4, 0.45]], waveSpeed: 5.5 };
// SAY HELLO: the box's size, typing frames, drop warning, fall speed, its hit; the letters (speed, homing, life, hit)
const BOX = { w: 230, h: 56, type: 60, warn: 34, fall: 15, hit: [13, [75, 6, 0.85]], speed: 4.2, turn: 0.045, life: 220, letter: [5, [45, 3.2, 0.35]] };
// MISSING FRAMES: skips (calm / lost), frames gone, wind-up beside you, the grab's frames and hit, how far behind you he appears
const SKIP = { n: [3, 4], gone: 12, wind: 16, grab: 7, hit: [9, [40, 5, 0.6]], behind: 46 };
// EXTRA LIVES: heads (calm / lost), how fast they fly and turn, how long they last, their hit
const LIVES = { n: [3, 5], speed: 2.7, turn: 0.07, life: 330, r: 11, hit: [6, [50, 3.6, 0.4]] };
// PLEASE STAND BY: the red X's (frames), the test card (frames), the spikes (size, frames, hit)
const STANDBY = { mark: 40, card: 54, spikeW: 44, spikeH: 76, spike: 26, hit: [14, [85, 6.4, 0.9]] };
// BLEEDING COINS: coins (calm / lost), over how many frames, fall speed, hit
const COINS = { n: [14, 22], over: 120, speed: 3.6, hit: [5, [80, 3, 0.3]] };
// EMERGENCY BROADCAST (lost): the alert's frames, the crawls (bands: 'lo' = floor height, 'hi' = ledge height), their speed and hit
const CAST = { alert: 70, crawls: [['lo'], ['hi'], ['lo', 'hi2']], gap: 60, speed: 6.5, hit: [9, [45, 5, 0.6]] };
// DEBUG MODE (lost): the grid, how many blocks, warning frames, fall speed, how long they lie as ledges, hit
const DEBUG = { cell: 40, n: 5, warn: 36, every: 22, fall: 12, lie: 260, hit: [10, [80, 5.6, 0.7]] };
// IT SEES YOU (lost): the dark, his face rising, the bite (everything below `top` on the floor), its hit
const SEES = { dark: 30, rise: 120, scare: 12, top: -74, hit: [18, [80, 7.2, 1.0]] };
// THE LOST BUILD cutscene (half health): its length, when the picture breaks, when he speaks
const LOST = { n: 230, tear: 70, smile: 120, card: 200 };
// GAME OVER, his death: when he freezes, falls to pixels, the thank-you, the tape stops
const DIE = { freeze: 30, pixels: 80, thanks: 150, stop: 230, len: 290 };
// stage hazards: STATIC (warning, shock, width, hit) and TRACKING ROLL (warning, speed, height, hit)
const STATIC = { warn: 60, dur: 22, w: 46, hit: [8, [90, 5, 0.5]] };
const TRACK = { warn: 50, speed: 4.4, h: 18, hit: [6, [60, 4.4, 0.4]] };
// his colours, cartoon (`base`) and in the lost build (`lost`)
const COL = {
  base: { fur: 0xf6ecd4, furD: 0xd8c8a0, pink: 0xf4a0b8, overall: 0x3a6ad8, overallD: 0x2a4aa8, button: 0xffd040, shoe: 0xe03030, sole: 0xffffff, glove: 0xffffff, mouth: 0x6a1020, ink: 0x1a1020 },
  lost: { fur: 0xb8ae9c, furD: 0x8a8070, pink: 0x9a4a5a, overall: 0x2a2a4a, overallD: 0x1a1a30, button: 0x8a7a30, shoe: 0x6a1414, sole: 0xa8a098, glove: 0xd0ccc0, mouth: 0x050204, ink: 0x07040a },
};
// what he says (in the RPG box)
const SAY = {
  hello: ['HI FRIEND! LET\'S PLAY!', 'YOU CAME BACK! YOU CAME BACK!', 'HOPPLE LOVES NEW FRIENDS!'],
  lost: ['LET\'S PLAY FOREVER.', 'NOBODY ELSE CAME BACK.', 'THE GAME NEVER ENDS.', 'I CAN SEE YOU THROUGH THE SCREEN.'],
};
// his hand poses, relative to his feet, facing right: front hand x, y, back hand x, y
const POSE = { idle: [24, -46, -24, -46], wave: [30, -104, -24, -46], up: [26, -112, -26, -112], grab: [56, -62, 44, -58], point: [48, -74, -24, -46], crouch: [26, -34, -26, -34], fall: [34, -96, -34, -96], hold: [30, -108, -30, -108] };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A colour mixed toward another (k = 0..1). */
const mix = (a, b, k) => { const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (c(16) << 16) | (c(8) << 8) | c(0); };
/** Ease out (fast, then settling). */
const easeOut = (q) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 3);
/** The points of an oval turned by `rot` (for ears and the like). */
const oval = (cx, cy, rx, ry, rot, n = 18) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) }; });

/** HAPPY HILLS (LOST BUILD) and HOPPLE (see the top of the file). */
export class HoppleBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_hopple';
    this.platforms = [
      { x1: FLOOR.x1, x2: FLOOR.x2, y: 0, solid: true, bottom: 64 },
      { x1: -LEDGE.x2, x2: -LEDGE.x1, y: LEDGE.y, solid: false },
      { x1: LEDGE.x1, x2: LEDGE.x2, y: LEDGE.y, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -70, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['static', 'track'], { color: '#ff4a4a', stroke: '#0a0204', gap: 760 });
    this.e = { x: 120, y: 0, vy: 0, dir: -1, sq: 0, arms: 'idle', hp: [...POSE.idle], eyes: 0, grin: 0, tilt: 0, hide: false, ghost: 0, hopT: 0, tear: 0, scale: 1 };
    this.lost = 0; this.lostOn = false; this.shots = []; this.waves = []; this.spikes = []; this.marks = []; this.blocks = []; this.crawls = []; this.coins = [];
    this.box = null; this.card = 0; this.dark = 0; this.face = 0; this.scare = 0; this.grid = 0; this.alert = 0; this.glitchK = 0; this.score = 0; this.livesShown = 3;
    this.title = 0; this.osdLine = null; this.static = null; this.track = null; this.flash = 0; this.dPix = null;
    this.sparkColor = 0xff4a6a; this.bodyW = 70; this.bodyH = 130; this.introEnter = 320;
  }

  // ------------------------------------------------------------------ the arena
  /** Builds the sky and hills (on the background camera), the island and ledges, him (pixel art), the effects and the tape's overlay. */
  draw(world, bg) {
    const s = this.scene;
    this.skyG = s.add.graphics().setScrollFactor(0); bg.push(this.skyG);
    this.faceG = s.add.graphics().setScrollFactor(0); bg.push(this.faceG);                 // (IT SEES YOU: his face behind the hills)
    this.hillG = s.add.graphics().setScrollFactor(0); bg.push(this.hillG);
    this.groundG = s.add.graphics(); world.push(this.groundG);
    this.midG = s.add.graphics(); world.push(this.midG);
    this.pen = new PixelPen(s, 'hopple_px', PX.w, PX.h); world.push(this.pen.img);
    this.ghostR = s.add.image(0, 0, 'hopple_px').setOrigin(0).setTint(0xff2040).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); world.push(this.ghostR);
    this.ghostB = s.add.image(0, 0, 'hopple_px').setOrigin(0).setTint(0x20c0ff).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); world.push(this.ghostB);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.words = Array.from({ length: 28 }, () => { const t = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setVisible(false); world.push(t); return t; });
    this.boxT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', lineSpacing: 4, wordWrap: { width: BOX.w - 64 } }).setVisible(false); world.push(this.boxT);
    this.blockT = Array.from({ length: 8 }, () => { const t = s.add.text(0, 0, 'SOLID', { fontFamily: FONT, fontSize: '5px', color: '#7aff8a' }).setOrigin(0.5).setVisible(false); world.push(t); return t; });
    this.crawlT = Array.from({ length: 3 }, () => { const t = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff' }).setOrigin(0, 0.5).setVisible(false); world.push(t); return t; });
    // the tape (UI layer): scanlines + a vignette baked once, the tracking band and OSD every frame, the fake game HUD
    const ui = (o) => { if (s.addUI) s.addUI(o); return o; };
    if (!s.textures.exists('hopple_scan')) {
      const ct = s.textures.createCanvas('hopple_scan', 640, 360), c = ct.context;
      for (let y = 0; y < 360; y += 3) { c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(0, y, 640, 1); }
      const v = c.createRadialGradient(320, 180, 150, 320, 180, 400); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = v; c.fillRect(0, 0, 640, 360);
      ct.refresh();
    }
    this.darkG = ui(s.add.graphics().setDepth(3));
    this.scan = ui(s.add.image(0, 0, 'hopple_scan').setOrigin(0).setDepth(3.5));
    this.tapeG = ui(s.add.graphics().setDepth(3.6));
    this.osd = ui(s.add.text(VIEW_W - 12, 28, 'PLAY >', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setDepth(3.7));
    this.clock = ui(s.add.text(VIEW_W - 12, 40, '', { fontFamily: FONT, fontSize: '6px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setDepth(3.7));
    this.hudT = ui(s.add.text(12, 28, '', { fontFamily: FONT, fontSize: '7px', color: '#ffe060', stroke: '#2a1404', strokeThickness: 3, lineSpacing: 5 }).setDepth(3.7));
    this.titleT = ui(s.add.text(VIEW_W / 2, 118, 'HOPPLE\'S\nHAPPY HILLS', { fontFamily: FONT, fontSize: '22px', color: '#ffe060', stroke: '#c0301a', strokeThickness: 8, align: 'center', lineSpacing: 8 }).setOrigin(0.5).setDepth(3.8).setVisible(false));
    this.titleS = ui(s.add.text(VIEW_W / 2, 218, 'PRESS START', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#1a3a8a', strokeThickness: 4 }).setOrigin(0.5).setDepth(3.8).setVisible(false));
    this.cardT = ui(s.add.text(VIEW_W / 2, 180, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center', lineSpacing: 8 }).setOrigin(0.5).setDepth(3.9).setVisible(false));
    this.scareT = ui(s.add.text(VIEW_W / 2, 268, '', { fontFamily: FONT, fontSize: '10px', color: '#ff2a2a', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(3.9).setVisible(false));
    this.scareG = ui(s.add.graphics().setDepth(3.85));
    this.signT = s.add.text(-233, -40, 'START', { fontFamily: FONT, fontSize: '5px', color: '#3a2a10' }).setOrigin(0.5); world.push(this.signT);
    this.paintGround();
    this.cycle.makeBanner(s);
  }
  /** The island (dirt checkers, a grass lip with tufts and smiling flowers, a sign) and the two rows of ? blocks, in the build's state. */
  paintGround() {
    const g = this.groundG, L = this.lost; g.clear();
    const grass = mix(0x4ad84a, 0x4a4a42, L), grassD = mix(0x2a9a3a, 0x2a2a26, L), dirt = mix(0xd0803a, 0x4a2a22, L), dirtD = mix(0xa85a2a, 0x2a1414, L), ink = 0x1a0a08;
    for (let r = 0; r < 4; r++) {                                                        // the dirt, tapering under the island
      const inset = r * 22, y = 8 + r * 16;
      for (let x = FLOOR.x1 + inset; x < FLOOR.x2 - inset; x += 16) { g.fillStyle(((x - FLOOR.x1) / 16 + r) % 2 ? dirt : dirtD, 1); g.fillRect(x, y, Math.min(16, FLOOR.x2 - inset - x), 16); }
      g.fillStyle(ink, 1); g.fillRect(FLOOR.x1 + inset - 2, y, 2, 16); g.fillRect(FLOOR.x2 - inset, y, 2, 16);
    }
    g.fillStyle(ink, 1); g.fillRect(FLOOR.x1 + 66, 72, FLOOR.x2 - FLOOR.x1 - 132, 2);
    g.fillStyle(grassD, 1); g.fillRect(FLOOR.x1 - 4, 0, FLOOR.x2 - FLOOR.x1 + 8, 10);
    g.fillStyle(grass, 1); g.fillRect(FLOOR.x1 - 4, 0, FLOOR.x2 - FLOOR.x1 + 8, 6);
    for (let x = FLOOR.x1; x < FLOOR.x2; x += 12) { g.fillStyle(grass, 1); g.fillTriangle(x, 10, x + 6, 10, x + 3, 15); g.fillStyle(grassD, 1); g.fillRect(x + 2, -2, 2, 2); }
    g.fillStyle(ink, 1); g.fillRect(FLOOR.x1 - 4, -1, FLOOR.x2 - FLOOR.x1 + 8, 1);
    // the sign: START (STOP in the lost build)
    g.fillStyle(0x6a3a1a, 1); g.fillRect(-236, -34, 4, 34); g.fillStyle(mix(0xf0d8a0, 0x6a5a4a, L), 1); g.fillRect(-252, -48, 38, 16); g.lineStyle(1, ink, 1); g.strokeRect(-252, -48, 38, 16);
    if (this.signT) this.signT.setText(L > 0.5 ? 'STOP' : 'START').setColor(L > 0.5 ? '#a01010' : '#3a2a10');
    // the ? blocks
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      const x = (s < 0 ? -LEDGE.x2 : LEDGE.x1) + i * 16, y = LEDGE.y, q = i === 2;
      g.fillStyle(ink, 1); g.fillRect(x, y, 16, 16);
      g.fillStyle(q ? mix(0xffc030, 0x5a4a3a, L) : mix(0xc86030, 0x4a2020, L), 1); g.fillRect(x + 1, y + 1, 14, 14);
      if (q) { g.fillStyle(mix(0xffffff, 0xff2a2a, L), 1); g.fillRect(x + 6, y + 4, 4, 2); g.fillRect(x + 9, y + 5, 2, 3); g.fillRect(x + 7, y + 8, 2, 2); g.fillRect(x + 7, y + 11, 2, 2); }
      else { g.fillStyle(mix(0x8a3a1a, 0x2a1010, L), 1); g.fillRect(x + 1, y + 7, 14, 1); g.fillRect(x + 7, y + 1, 1, 6); g.fillRect(x + 4, y + 8, 1, 7); g.fillRect(x + 11, y + 8, 1, 7); }
    }
    this.painted = L;
  }
  /** The sky, the sun, the clouds and the hills (background camera, in screen pixels), redrawn as the build rots. */
  paintSky() {
    const g = this.skyG, h = this.hillG, L = this.lost, t = this.t; g.clear(); h.clear();
    const bands = [[0x5ab8ff, 0x1a0206], [0x7ac8ff, 0x34060e], [0x9ad6ff, 0x4e0a14], [0xbce4ff, 0x6a1018], [0xdcf2ff, 0x8a1a1a]];
    bands.forEach(([a, b], i) => { g.fillStyle(mix(a, b, L), 1); g.fillRect(0, i * 46, 640, 46 + (i === 4 ? 200 : 0)); if (i < 4) for (let x = (i % 2) * 2; x < 640; x += 4) { g.fillStyle(mix(bands[i + 1][0], bands[i + 1][1], L), 1); g.fillRect(x, i * 46 + 44, 2, 2); } });
    // the sun: a smiling sun... that is an eye in the lost build
    const sx = 548, sy = 66;
    g.fillStyle(mix(0xffe060, 0x2a0204, L), 1); g.fillCircle(sx, sy, 30);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.004; g.fillTriangle(sx + Math.cos(a) * 32, sy + Math.sin(a) * 32, sx + Math.cos(a + 0.18) * 32, sy + Math.sin(a + 0.18) * 32, sx + Math.cos(a + 0.09) * 44, sy + Math.sin(a + 0.09) * 44); }
    g.fillStyle(mix(0xfff0a0, 0x4a0408, L), 1); g.fillCircle(sx, sy, 24);
    if (L < 0.5) { g.fillStyle(0x3a1a08, 1); g.fillRect(sx - 10, sy - 8, 4, 6); g.fillRect(sx + 6, sy - 8, 4, 6); for (let i = -10; i <= 10; i += 2) g.fillRect(sx + i, sy + 6 + Math.round(Math.cos(i / 10 * 1.4) * 4), 2, 2); }
    else { const n = this.nearestX(), dx = Math.max(-6, Math.min(6, (n - 0) / 50)); g.fillStyle(0xf0e8d8, 1); g.fillEllipse(sx, sy, 40, 24); g.fillStyle(0xc01010, 1); g.fillCircle(sx + dx, sy, 9); g.fillStyle(0x000000, 1); g.fillCircle(sx + dx, sy, 4); }
    // clouds with faces (hollow eyes in the lost build)
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 190 + t * 0.12 * (i % 2 ? 1 : 0.7)) % 760) - 60, cy = 40 + (i % 3) * 30;
      g.fillStyle(mix(0xffffff, 0x5a3a3a, L), 1); for (const [ox, oy, r] of [[-18, 4, 12], [0, -2, 16], [18, 4, 12]]) g.fillCircle(cx + ox, cy + oy, r); g.fillRect(cx - 28, cy + 4, 56, 12);
      g.fillStyle(L < 0.5 ? 0x5a6a8a : 0x000000, 1);
      if (L < 0.5) { g.fillRect(cx - 7, cy, 2, 4); g.fillRect(cx + 5, cy, 2, 4); g.fillRect(cx - 4, cy + 8, 8, 2); }
      else { g.fillEllipse(cx - 6, cy + 2, 6, 9); g.fillEllipse(cx + 6, cy + 2, 6, 9); g.fillEllipse(cx, cy + 11, 5, 4); }
    }
    // the hills: far striped hills, near hills with trees
    const far = mix(0x6ad86a, 0x2a1a1e, L), farS = mix(0x58c058, 0x221418, L), near = mix(0x3aa84a, 0x180c10, L), nearS = mix(0x2a9038, 0x120808, L);
    for (let i = 0; i < 6; i++) { const cx = i * 130 - 20, r = 90 + (i % 2) * 30; h.fillStyle(far, 1); h.fillCircle(cx, 260, r); h.fillStyle(farS, 1); for (let k = 0; k < r; k += 10) h.fillRect(cx - Math.sqrt(r * r - k * k), 260 - k, 4, 2); }
    h.fillStyle(far, 1); h.fillRect(0, 250, 640, 110);
    for (let i = 0; i < 5; i++) { const cx = i * 170 + 60, r = 60 + (i % 2) * 20; h.fillStyle(near, 1); h.fillCircle(cx, 300, r); h.fillStyle(nearS, 1); h.fillCircle(cx + r * 0.3, 300 + r * 0.2, r * 0.6); }
    h.fillStyle(near, 1); h.fillRect(0, 300, 640, 60);
    for (let i = 0; i < 6; i++) {                                                         // trees (bare in the lost build)
      const tx = 40 + i * 112 + (i % 2) * 20, ty = 262 + (i % 3) * 8;
      h.fillStyle(mix(0x7a4a2a, 0x1a0a0a, L), 1); h.fillRect(tx - 2, ty - 18, 5, 20);
      if (L < 0.6) { h.fillStyle(mix(0x2a9a3a, 0x2a1a1a, L), 1); h.fillCircle(tx, ty - 24, 11); h.fillCircle(tx - 7, ty - 18, 8); h.fillCircle(tx + 7, ty - 18, 8); }
      else { h.lineStyle(2, 0x1a0a0a, 1); h.lineBetween(tx, ty - 16, tx - 9, ty - 30); h.lineBetween(tx, ty - 18, tx + 8, ty - 34); h.lineBetween(tx + 4, ty - 26, tx + 12, ty - 28); }
    }
  }
  /** Where the nearest fighter stands (x), for eyes that follow you. */
  nearestX() { const m = this.match; if (!m || !m.fighters) return 0; const f = this.nearest(m, this.e.x); return f ? f.x : 0; }

  // ------------------------------------------------------------------ the boss
  /** A boss fight starts: the hazards come less often, and his lives sit in the corner of the screen. */
  makeBoss() { this.cycle.gap = 1500; this.cycle.next = 1400; this.livesShown = 3; }
  /** The intro (a player's watching): it also means the mid-fight cutscene can play. */
  startIntro(match) { this.watched = true; super.startIntro(match); }
  /** His head (the CPU's target and the camera's). */
  core() { const E = this.e; return { x: E.x, y: E.y - 84 * E.scale }; }
  /** Where he can be hit: his head (big, weak), his body. Nothing while he's skipped out of the picture. */
  hurt() {
    const E = this.e; if (E.hide || this.cut) return [];
    const x = E.x, y = E.y;
    return [{ x1: x - 34, y1: y - 124, x2: x + 34, y2: y - 62, mult: this.lostOn ? 1.45 : 1.3 }, { x1: x - 28, y1: y - 64, x2: x + 28, y2: y, mult: 0.9 }];
  }
  /** His attacks (phase 2 = the lost build). */
  pattern(phase) {
    if (phase === 1) return ['hop', 'textbox', 'frames', 'lives', 'standby', 'coins'];
    if (this.sinceSees >= 4) return ['sees'];                                          // (IT SEES YOU every fifth attack or so)
    return ['hop', 'textbox', 'frames', 'lives', 'standby', 'coins', 'broadcast', 'debug', 'broadcast', 'debug', 'frames'];
  }
  /** His hits: scaled by HIT. */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more = {}) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg, [angle, base * HIT.base, growth * HIT.growth], more); }
  /** The death card's portrait: his pixel art. */
  cardObjs() { return [this.pen.img]; }
  /** Which form beat you: the cartoon, or the lost build. */
  cardForm() { return this.lostOn ? 'lost' : 'base'; }
  /** What flashes up at half health. */
  rageLine() { return 'LOST BUILD'; }

  /** Between attacks he hops after the nearest fighter, little cartoon hops - and keeps to the island. */
  idle(match) {
    const E = this.e, f = this.nearest(match, E.x); if (!f) return;
    const want = Math.max(-BODY.range, Math.min(BODY.range, f.x + (f.x > E.x ? -70 : 70)));
    if (Math.abs(want - E.x) > 14) { E.dir = want > E.x ? 1 : -1; E.x += E.dir * BODY.speed; if (E.y >= 0) { E.vy = -3.4; sfx('jump', 0.25, 0.7); } }
    else E.dir = f.x > E.x ? 1 : -1;
    E.arms = 'idle';
  }
  /** Gravity on his little hops (his attacks move him themselves when `pinned`). */
  physics() {
    const E = this.e; if (this.pinned) return;
    if (E.y < 0 || E.vy < 0) { E.vy += 0.42; E.y += E.vy; if (E.y >= 0) { E.y = 0; E.vy = 0; E.sq = 0.5; } }
    E.sq *= 0.82;
  }

  // ------------------------------------------------------------------ attacks
  /** BIG HOP: crouch, up out of the picture; his shadow finds you, locks, and he lands on it - shockwaves both ways. */
  start_hop(match, a) { a.n = HOP.n[this.lostOn ? 1 : 0]; a.st = 'crouch'; a.k = 0; this.pinned = true; }
  /** One frame of the hop attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_hop(match, a, out) {
    const E = this.e, f = this.nearest(match, E.x);
    a.k++;
    if (a.st === 'crouch') { E.arms = 'crouch'; E.sq = Math.min(1, a.k / this.sp(HOP.crouch)); if (a.k >= this.sp(HOP.crouch)) { a.st = 'rise'; a.k = 0; E.sq = -0.6; sfx('djump', 0.7, 0.6); } }
    else if (a.st === 'rise') { E.arms = 'up'; E.y -= 16; if (a.k >= HOP.rise) { a.st = 'track'; a.k = 0; E.hide = true; a.x = E.x; } }
    else if (a.st === 'track' || a.st === 'lock') {
      if (a.st === 'track' && f) a.x = lerp(a.x, Math.max(FLOOR.x1 + 30, Math.min(FLOOR.x2 - 30, f.x)), 0.12);
      this.marks = [{ k: 'shadow', x: a.x, r: 16 + 24 * Math.min(1, a.k / 30), lock: a.st === 'lock' }];
      if (a.st === 'track' && a.k >= this.sp(HOP.track)) { a.st = 'lock'; a.k = 0; sfx('warn', 0.5, 1.3); }
      if (a.st === 'lock' && a.k >= this.sp(HOP.lock)) { a.st = 'fall'; a.k = 0; E.hide = false; E.x = a.x; E.y = -420; E.arms = 'fall'; E.dir = f && f.x < E.x ? -1 : 1; a.id = this.sid('hop'); }
    } else if (a.st === 'fall') {
      E.y = Math.min(0, E.y + HOP.fall);
      out.push(this.bhit(a.id, E.x - 34, E.y - 110, E.x + 34, E.y + 4, ...HOP.hit));
      if (E.y >= 0) {
        this.marks = []; E.sq = 1; a.st = 'land'; a.k = 0; sfx('bighit', 1, 0.55); match.shake(12, 14);
        for (const d of [-1, 1]) this.waves.push({ x: E.x + d * 30, d, life: 70, id: this.sid('hw') });
        for (let i = 0; i < 8; i++) this.coins.push({ x: E.x, y: -10, vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 4, life: 60, deco: true });
      }
    } else if (a.st === 'land') { E.arms = 'crouch'; if (a.k >= this.sp(26)) { if (--a.n > 0) { a.st = 'crouch'; a.k = 0; } else { this.pinned = false; E.arms = 'idle'; return true; } } }
    return false;
  }

  /** SAY HELLO: an RPG text box types his line over you, drops onto you, then every letter flies at you. */
  start_textbox(match, a) {
    const f = this.nearest(match, this.e.x), list = this.lostOn ? SAY.lost : SAY.hello;
    a.text = list[Math.floor(Math.random() * list.length)]; a.st = 'type'; a.k = 0;
    this.box = { x: f ? Math.max(FLOOR.x1 + BOX.w / 2, Math.min(FLOOR.x2 - BOX.w / 2, f.x)) : 0, y: -300, shown: 0, text: a.text, drop: false };
    this.e.arms = 'hold';
  }
  /** One frame of the textbox attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_textbox(match, a, out) {
    const X = this.box, f = this.nearest(match, this.e.x); a.k++;
    if (a.st === 'type') {
      const per = this.sp(BOX.type) / a.text.length; const n = Math.min(a.text.length, Math.floor(a.k / per));
      if (n > X.shown) { X.shown = n; if (a.text[n - 1] !== ' ') sfx('menu', 0.3, this.lostOn ? 0.5 + Math.random() * 0.2 : 1.6); }
      if (f) X.x = lerp(X.x, Math.max(FLOOR.x1 + BOX.w / 2, Math.min(FLOOR.x2 - BOX.w / 2, f.x)), 0.05);
      X.y = lerp(X.y, -230, 0.1);
      if (a.k >= this.sp(BOX.type) + 20) { a.st = 'warn'; a.k = 0; sfx('warn', 0.6); }
    } else if (a.st === 'warn') { X.shake = 2; if (a.k >= this.sp(BOX.warn)) { a.st = 'fall'; a.k = 0; X.shake = 0; a.id = this.sid('box'); } }
    else if (a.st === 'fall') {
      X.y = Math.min(-BOX.h, X.y + BOX.fall);
      out.push(this.bhit(a.id, X.x - BOX.w / 2, X.y, X.x + BOX.w / 2, X.y + BOX.h, ...BOX.hit));
      if (X.y >= -BOX.h) { a.st = 'burst'; a.k = 0; sfx('bighit', 0.9, 0.8); match.shake(8, 10); }
    } else if (a.st === 'burst') {
      if (a.k === 18) {                                                                    // the letters fly off the box at you
        const letters = X.text.replace(/[^A-Z!?]/g, '').split('').slice(0, this.lostOn ? 16 : 11);
        letters.forEach((ch, i) => { const x = X.x - BOX.w / 2 + 40 + (i / Math.max(1, letters.length - 1)) * (BOX.w - 70), y = X.y + 22; const tg = this.nearest(match, x); const ang = tg ? Math.atan2(tg.y - 30 - y, tg.x - x) : -Math.PI / 2;
          this.shots.push({ k: 'letter', ch, x, y, vx: Math.cos(ang) * 1.2, vy: -2.5 - Math.random() * 1.5, sp: BOX.speed * (0.8 + Math.random() * 0.4), turn: BOX.turn, wait: 16 + i * 3, life: BOX.life, r: 6, hit: BOX.letter, id: this.sid('l'), pop: true }); });
        sfx('glitch', 0.6, 1.4);
      }
      if (a.k >= 18) X.fade = Math.min(1, (X.fade || 0) + 0.06);
      if (a.k >= 40) { this.box = null; this.e.arms = 'idle'; return true; }
    }
    return false;
  }

  /** MISSING FRAMES: the tape skips - he's gone, then right behind you mid-grab. Three times (four, lost). */
  start_frames(match, a) { a.n = SKIP.n[this.lostOn ? 1 : 0]; a.st = 'gone'; a.k = 0; this.pinned = true; this.e.hide = true; this.skipFx(match); }
  /** One frame of the frames attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_frames(match, a, out) {
    const E = this.e; a.k++;
    if (a.st === 'gone') {
      if (a.k >= this.sp(SKIP.gone)) {
        const f = this.nearest(match, E.x);
        const side = f ? (f.facing > 0 ? -1 : 1) : 1;
        E.x = f ? Math.max(FLOOR.x1 + 20, Math.min(FLOOR.x2 - 20, f.x + side * SKIP.behind)) : 0; E.y = f && f.y < -40 ? f.y + 10 : 0;
        E.dir = f && f.x < E.x ? -1 : 1; E.hide = false; E.arms = 'grab'; E.sq = 0.4; E.ghost = 1;
        a.st = 'wind'; a.k = 0; sfx('glitch', 0.8, 0.7);
      }
    } else if (a.st === 'wind') { E.ghost = Math.max(E.ghost, 0.5); if (a.k >= this.sp(SKIP.wind)) { a.st = 'grab'; a.k = 0; a.id = this.sid('grab'); sfx('swing', 0.8, 0.7); } }
    else if (a.st === 'grab') {
      const x = E.x + E.dir * 36;
      out.push(this.bhit(a.id, Math.min(E.x, x + E.dir * 30), E.y - 100, Math.max(E.x, x + E.dir * 30), E.y - 10, ...SKIP.hit));
      if (a.k >= SKIP.grab) { if (--a.n > 0) { a.st = 'gone'; a.k = 0; E.hide = true; this.skipFx(match); } else { a.st = 'back'; a.k = 0; } }
    } else if (a.st === 'back') { if (E.y < 0) E.y = Math.min(0, E.y + 8); if (a.k >= 20 && E.y >= 0) { this.pinned = false; E.arms = 'idle'; return true; } }
    return false;
  }
  /** The tape skipping: a glitch on screen and the PLAY readout stuttering. */
  skipFx() { this.glitchK = 1; this.osdLine = { text: '|| SKIP', t: 24 }; }

  /** EXTRA LIVES: his life icons peel off the HUD and fly at you, chomping. One hit pops one. */
  start_lives(match, a) {
    const n = LIVES.n[this.lostOn ? 1 : 0], cam = match.cameras.main.worldView;
    for (let i = 0; i < n; i++) this.shots.push({ k: 'head', x: cam.x + 30 + i * 16, y: cam.y + 44, vx: 1 + Math.random(), vy: 1, sp: LIVES.speed * (0.85 + Math.random() * 0.3), turn: LIVES.turn, wait: 20 + i * 14, life: LIVES.life, r: LIVES.r, hit: LIVES.hit, id: this.sid('hd'), pop: true });
    this.livesShown = 0; a.k = 0; this.e.arms = 'point'; sfx('laugh', 0.5, 1.4);
  }
  atk_lives(match, a) { a.k++; if (a.k > 60) this.e.arms = 'idle'; if (a.k > 120 && !this.shots.some((s) => s.k === 'head')) { this.livesShown = 3; return true; } return a.k > LIVES.life + 140; }

  /** PLEASE STAND BY: red X's under you - then the picture cuts to a test card. Move! Spikes come up where the X's were. */
  start_standby(match, a) {
    a.st = 'mark'; a.k = 0;
    this.marks = match.fighters.filter((f) => f.alive && f.state !== 'respawn').map((f) => ({ k: 'x', x: Math.max(FLOOR.x1 + 20, Math.min(FLOOR.x2 - 20, f.x)) }));
    if (this.lostOn) this.marks.push({ k: 'x', x: (Math.random() - 0.5) * 400 });
    this.e.arms = 'up'; sfx('warn', 0.6, 0.8);
  }
  /** One frame of the standby attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_standby(match, a, out) {
    a.k++;
    if (a.st === 'mark' && a.k >= this.sp(STANDBY.mark)) { a.st = 'card'; a.k = 0; this.card = 1; sfx('buzz', 0.7, 0.6); }
    else if (a.st === 'card') { if (a.k % 20 === 0) sfx('buzz', 0.4, 0.62); if (a.k >= this.sp(STANDBY.card)) { a.st = 'spike'; a.k = 0; this.card = 0; this.flash = 6; for (const m of this.marks) this.spikes.push({ x: m.x, t: 0, id: this.sid('sp') }); this.marks = []; sfx('bighit', 0.9, 0.7); match.shake(10, 10); } }
    else if (a.st === 'spike') { if (a.k >= STANDBY.spike + 20) { this.e.arms = 'idle'; return true; } }
    return false;
  }

  /** BLEEDING COINS: red coins rain from the sky on shadows, dripping as they fall. */
  start_coins(match, a) { a.n = COINS.n[this.lostOn ? 1 : 0]; a.k = 0; this.e.arms = 'wave'; sfx('ding', 0.5, 0.7); }
  /** One frame of the coins attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_coins(match, a) {
    a.k++;
    const every = Math.max(1, Math.floor(this.sp(COINS.over) / a.n));
    if (a.k % every === 0 && a.n > 0) {
      a.n--; const f = match.fighters[Math.floor(Math.random() * match.fighters.length)];
      const x = Math.random() < 0.5 && f ? f.x + (Math.random() - 0.5) * 50 : FLOOR.x1 + 20 + Math.random() * (FLOOR.x2 - FLOOR.x1 - 40);
      this.coins.push({ x, y: -380, vx: 0, vy: COINS.speed, life: 400, id: this.sid('c'), spin: Math.random() * 6 });
      if (a.n % 3 === 0) sfx('ding', 0.25, 0.5 + Math.random() * 0.2);
    }
    return a.n <= 0 && a.k > this.sp(COINS.over) + 40;
  }

  /** EMERGENCY BROADCAST (lost): an alert takes over the tape, then bars of crawling text sweep the arena at floor or ledge height. */
  start_broadcast(match, a) { a.st = 'alert'; a.k = 0; a.i = 0; this.alert = 1; sfx('airhorn', 0.5, 0.5); this.e.arms = 'up'; }
  /** One frame of the broadcast attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_broadcast(match, a) {
    a.k++;
    if (a.st === 'alert') { if (a.k % 24 === 0) sfx('buzz', 0.5, 0.9); if (a.k >= this.sp(CAST.alert)) { a.st = 'crawl'; a.k = 0; } return false; }
    if (a.st === 'crawl' && a.k === 1) {
      const d = Math.random() < 0.5 ? 1 : -1;
      for (const band of CAST.crawls[a.i]) this.crawls.push({ band, d, x: d > 0 ? FLOOR.x1 - 420 : FLOOR.x2 + 20, w: 400, id: this.sid('cr'), text: 'DO NOT CONTINUE PLAYING  ' });
      sfx('warn', 0.6, 0.7);
    }
    if (a.st === 'crawl' && a.k >= this.sp(CAST.gap) + 60) { a.i++; a.k = 0; if (a.i >= CAST.crawls.length) { a.st = 'end'; } }
    if (a.st === 'end' && !this.crawls.length) { this.alert = 0; this.e.arms = 'idle'; return true; }
    return false;
  }

  /** DEBUG MODE (lost): a grid falls over everything, cells over you light up, and SOLID blocks drop - then lie there as ledges. */
  start_debug(match, a) { a.k = 0; a.n = DEBUG.n; this.grid = 1; this.osdLine = { text: 'DEBUG MODE', t: 90 }; sfx('popup', 0.6, 0.7); this.e.arms = 'point'; }
  /** One frame of the debug attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_debug(match, a) {
    a.k++;
    if (a.n > 0 && a.k > 30 && (a.k - 30) % this.sp(DEBUG.every) === 0) {
      a.n--; const fs = match.fighters.filter((f) => f.alive && f.state !== 'respawn'), f = fs[Math.floor(Math.random() * fs.length)];
      const C = DEBUG.cell, x = Math.floor(((f && Math.random() < 0.75 ? f.x : (Math.random() - 0.5) * 460)) / C) * C + C / 2;
      this.blocks.push({ x: Math.max(FLOOR.x1 + C / 2, Math.min(FLOOR.x2 - C / 2, x)), y: -360, st: 'warn', t: 0, id: this.sid('blk') }); sfx('menu', 0.5, 0.5);
    }
    if (a.n <= 0 && a.k > 30 + DEBUG.n * this.sp(DEBUG.every) + 60) { this.grid = 0; this.e.arms = 'idle'; return true; }
    return false;
  }

  /** IT SEES YOU (lost): the lights go, his face rises behind the hills, the ? blocks glow - then the jumpscare and his mouth closes over the floor. */
  start_sees(match, a) { a.st = 'dark'; a.k = 0; this.sinceSees = 0; this.pinned = true; sfx('rumble', 0.7, 0.5); }
  /** One frame of the sees attack (see its start_): hitboxes into `out`; true when it's over. */
  atk_sees(match, a, out) {
    a.k++; const E = this.e;
    if (a.st === 'dark') { this.dark = Math.min(1, a.k / SEES.dark); if (a.k >= SEES.dark) { a.st = 'rise'; a.k = 0; E.hide = true; this.scareText('DON\'T LOOK AT IT.\nGET UP HIGH.'); } }
    else if (a.st === 'rise') { this.face = Math.min(1, a.k / this.sp(SEES.rise)); if (a.k % 30 === 0) sfx('rumble', 0.5, 0.4); if (a.k >= this.sp(SEES.rise)) { a.st = 'scare'; a.k = 0; this.scare = 1; a.id = this.sid('bite'); sfx('scream', 1, 0.7); sfx('bighit', 1, 0.5); match.shake(20, 24); this.scareText(''); } }
    else if (a.st === 'scare') {
      if (a.k <= 4) out.push(this.bhit(a.id, FLOOR.x1 - 30, SEES.top, FLOOR.x2 + 30, 20, ...SEES.hit));
      this.scare = Math.max(0, 1 - a.k / SEES.scare);
      if (a.k >= SEES.scare) { a.st = 'back'; a.k = 0; this.face = 0; E.hide = false; E.x = 0; E.y = 0; E.ghost = 1; }
    } else if (a.st === 'back') { this.dark = Math.max(0, 1 - a.k / 30); if (a.k >= 30) { this.pinned = false; return true; } }
    return false;
  }
  /** A line under the picture (IT SEES YOU). */
  scareText(s) { this.scareT.setText(s).setVisible(!!s); }

  // ------------------------------------------------------------------ the lost build (half health)
  /** Half health: THE LOST BUILD - a cutscene if someone's watching, otherwise it just breaks. */
  onRage(match) {
    this.pinned = false; this.e.hide = false; this.clearFx();
    if (this.watched) { this.cut = { kind: 'lost', t: 0, shot: null, once: new Set() }; this.ccam = { x: 0, y: -110, zoom: 1 }; sfx('glitch', 1, 0.5); }
    else this.goLost();
  }
  /** The build is lost for good: the colours, his eyes and smile, the torn ear. */
  goLost() { this.lostOn = true; this.lost = 1; this.e.eyes = 1; this.e.grin = 1; this.e.tear = 1; this.livesShown = 0; this.paintGround(); }
  /** One frame of THE LOST BUILD: frozen picture, the tape tears, the world rots, he turns to you and his smile splits. */
  cutStep(match) {
    const C = this.cut, t = ++C.t, E = this.e, once = (k, at, fn) => { if (t >= at && !C.once.has(k)) { C.once.add(k); fn(); } };
    this.t++; if (this.flash > 0) this.flash--; this.glitchK *= 0.92;
    const h = this.core();
    C.shot = t < LOST.tear ? { x: h.x, y: h.y + 10, zoom: 2.4 } : t < LOST.card ? { x: h.x, y: h.y + 4, zoom: 2.9 } : { x: 0, y: -110, zoom: 1.05 };
    E.x = lerp(E.x, 0, 0.05); E.y = 0; E.arms = t < LOST.tear ? 'wave' : 'idle'; E.dir = 1;
    once('hi', 4, () => { this.box = { x: 0, y: -230, shown: 0, text: 'YOU\'RE STILL PLAYING?', fade: 0, cut: true }; });
    if (this.box && this.box.cut) { const n = Math.min(this.box.text.length, Math.floor(t / 2)); if (n > this.box.shown) { this.box.shown = n; sfx('menu', 0.25, 1.4); } }
    once('tear', LOST.tear, () => { this.box = null; this.glitchK = 1; this.flash = 8; sfx('glitch', 1, 0.4); sfx('buzz', 0.8, 0.4); match.shake(10, 30); this.osdLine = { text: 'TRACKING', t: 120 }; });
    if (t > LOST.tear && t < LOST.smile) { this.lost = Math.min(1, (t - LOST.tear) / (LOST.smile - LOST.tear)); E.ghost = 0.6 + Math.random() * 0.4; E.tilt = Math.sin(t * 0.7) * 0.06; if (t % 6 === 0) { this.paintGround(); sfx('glitch', 0.5, 0.4 + Math.random() * 0.5); } }
    once('eyes', LOST.tear + 20, () => { E.eyes = 1; E.tear = 1; });
    if (t >= LOST.smile) { E.grin = Math.min(1, (t - LOST.smile) / 40); E.tilt = lerp(E.tilt, 0.12, 0.1); }
    once('smile', LOST.smile, () => { this.goLost(); E.grin = 0; this.box = { x: 0, y: -230, shown: 0, text: 'THEN LET\'S PLAY THE REAL GAME.', fade: 0, cut: true, red: true }; sfx('laugh', 0.8, 0.5); });
    once('card', LOST.card, () => { this.box = null; E.tilt = 0; this.flash = 10; sfx('roar', 0.9, 0.5); });
    if (t >= LOST.n) this.endCut(match);
  }
  /** A fresh press skips the rest of the cutscene. */
  skipCut(match) { this.endCut(match); }
  /** The cutscene's over: the lost build for good, and its name card. */
  endCut(match) {
    if (!this.cut) return; this.cut = null; this.box = null; this.goLost(); this.e.tilt = 0; this.e.ghost = 0;
    this.startCard(match, { name: 'HOPPLE.LOST', title: 'THE BUILD THEY NEVER RELEASED', tag: '-  LOST BUILD  -' });
  }
  /** The camera: the intro's, or the cutscene's own shots. */
  introCam() {
    if (!this.cut) return super.introCam();
    const w = this.cut.shot || { x: 0, y: -110, zoom: 1 }; this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** Clears every attack effect (a cutscene, his death). */
  clearFx() { this.shots = []; this.waves = []; this.spikes = []; this.marks = []; this.crawls = []; this.box = null; this.card = 0; this.dark = 0; this.face = 0; this.scare = 0; this.grid = 0; this.alert = 0; this.scareText(''); this.coins = this.coins.filter((c) => c.deco); for (const b of this.blocks) if (b.plat) this.dropPlat(b.plat); this.blocks = []; }
  /** Takes a block's ledge away again. */
  dropPlat(p) { const i = this.platforms.indexOf(p); if (i >= 0) this.platforms.splice(i, 1); }

  // ------------------------------------------------------------------ every frame
  /** The arena's frame: hazards, the boss, his effects; returns this frame's hitboxes. */
  step(match) {
    this.t++; this.match = match;
    const out = [];
    if (this.hazardsOn) this.cycle.run(match, out);
    if (this.flash > 0) this.flash--;
    this.glitchK *= 0.9;
    const E = this.e;
    if (this.boss) {
      const B = this.boss;
      this.bossStep(match, out);
      if (B.atk && B.atk.id !== this.atkId) { this.atkId = B.atk.id; if (this.lostOn) this.sinceSees = (this.sinceSees ?? 2) + 1; }
      if (!B.dying) { this.physics(); this.stepFx(match, out); this.watchHits(match); }
      if (!this.lostOn && !B.dying && Math.random() < 0.004) this.blinkT = 4;           // the cartoon's eyes... for a frame
    } else { E.y = 0; E.arms = 'idle'; E.dir = -1; this.stepFx(match, out); }
    if (this.blinkT > 0) this.blinkT--;
    E.ghost *= 0.9;
    if (this.osdLine && --this.osdLine.t <= 0) this.osdLine = null;
    return out;
  }
  /** His score goes up when he hits you (the fake HUD). */
  watchHits(match) {
    this.prevPct = this.prevPct || new Map();
    for (const f of match.fighters) { const p = this.prevPct.get(f) ?? f.percent; if (f.percent > p) this.score += Math.round((f.percent - p) * 100); this.prevPct.set(f, f.percent); }
  }
  /** Moves and hits with everything he's thrown: shockwaves, letters and heads, spikes, coins, crawls, blocks. */
  stepFx(match, out) {
    for (const w of this.waves) { w.x += w.d * HOP.waveSpeed; w.life--; out.push(this.bhit(w.id, w.x - 10, -18, w.x + 10, 2, ...HOP.wave)); }
    this.waves = this.waves.filter((w) => w.life > 0 && w.x > FLOOR.x1 - 20 && w.x < FLOOR.x2 + 20);
    for (const s of this.shots) {
      s.life--;
      if (s.wait > 0) { s.wait--; s.x += s.vx; s.y += s.vy; s.vy *= 0.9; s.vx *= 0.9; continue; }
      const f = this.nearest(match, s.x);
      if (f) { const want = Math.atan2(f.y - 26 - s.y, f.x - s.x), cur = Math.atan2(s.vy, s.vx); let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; const a = cur + Math.max(-s.turn, Math.min(s.turn, d)); s.vx = Math.cos(a) * s.sp; s.vy = Math.sin(a) * s.sp; }
      s.x += s.vx; s.y += s.vy;
      out.push(this.bhit(s.id, s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r, ...s.hit, { dirX: Math.sign(s.vx) || 1 }));
    }
    this.shots = this.shots.filter((s) => s.life > 0 && !s.dead);
    for (const sp of this.spikes) { sp.t++; const k = sp.t < 6 ? sp.t / 6 : sp.t > STANDBY.spike ? Math.max(0, 1 - (sp.t - STANDBY.spike) / 10) : 1; sp.k = k; if (sp.t < STANDBY.spike) out.push(this.bhit(sp.id, sp.x - STANDBY.spikeW / 2, -STANDBY.spikeH * k, sp.x + STANDBY.spikeW / 2, 2, ...STANDBY.hit)); }
    this.spikes = this.spikes.filter((sp) => sp.t < STANDBY.spike + 10);
    for (const c of this.coins) {
      c.life--; c.spin = (c.spin || 0) + 0.25;
      if (c.deco) { c.vy += 0.3; c.x += c.vx; c.y = Math.min(-4, c.y + c.vy); continue; }
      c.y += c.vy; if (c.y < -6) out.push(this.bhit(c.id, c.x - 7, c.y - 8, c.x + 7, c.y + 8, ...COINS.hit));
      if (c.y >= -6 && !c.landed) { c.landed = true; c.life = 50; sfx('ding', 0.2, 0.4); }
    }
    this.coins = this.coins.filter((c) => c.life > 0);
    const H = { lo: [-30, 2], hi: [-138, -98], hi2: [-150, -104] };
    for (const c of this.crawls) { c.x += c.d * CAST.speed; const [y1, y2] = H[c.band]; out.push(this.bhit(c.id, c.x, y1, c.x + c.w, y2, ...CAST.hit, { dirX: c.d })); }
    this.crawls = this.crawls.filter((c) => (c.d > 0 ? c.x < FLOOR.x2 + 60 : c.x + c.w > FLOOR.x1 - 60));
    for (const b of this.blocks) {
      b.t++; const C = DEBUG.cell;
      if (b.st === 'warn') { if (b.t >= this.sp(DEBUG.warn)) { b.st = 'fall'; b.t = 0; } }
      else if (b.st === 'fall') { b.y = Math.min(-C, b.y + DEBUG.fall); out.push(this.bhit(b.id, b.x - C / 2, b.y, b.x + C / 2, b.y + C, ...DEBUG.hit)); if (b.y >= -C) { b.st = 'lie'; b.t = 0; sfx('bighit', 0.6, 1.2); match.shake(4, 6); b.plat = { x1: b.x - C / 2, x2: b.x + C / 2, y: -C, solid: false, temp: true }; this.platforms.push(b.plat); } }
      else if (b.st === 'lie' && b.t >= DEBUG.lie) { this.dropPlat(b.plat); b.gone = true; }
    }
    this.blocks = this.blocks.filter((b) => !b.gone);
  }
  /** Players' hits: letters and life heads pop; the rest goes to him. */
  strikeTargets(match, hbs) {
    for (const hb of hbs) {
      if (!hb.owner) continue;
      for (const s of this.shots) if (s.pop && !s.dead && s.wait <= 0 && hb.x1 < s.x + s.r && hb.x2 > s.x - s.r && hb.y1 < s.y + s.r && hb.y2 > s.y - s.r) { s.dead = true; match.puff(s.x, s.y, 0xffffff, 6); match.puff(s.x, s.y, s.k === 'head' ? 0xf6ecd4 : 0xff4a6a, 5); sfx('popup', 0.4, 1.6); }
    }
    super.strikeTargets(match, hbs);
  }

  // ------------------------------------------------------------------ intro, gloat, death
  /** The intro: the cartridge's title screen on the tape, START, he hops in waving - then stops, and looks at you. */
  introPose(match, k) {
    const E = this.e;
    this.title = k < 0.3 ? 1 : k < 0.36 ? 1 - (k - 0.3) / 0.06 : 0;
    if (k < 0.36) { E.hide = true; E.x = 320; E.eyes = 0; E.grin = 0; }
    else if (k < 0.6) { const q = (k - 0.36) / 0.24; E.hide = false; E.x = lerp(320, 40, q); E.dir = -1; E.y = -Math.abs(Math.sin(q * Math.PI * 4)) * 30; E.arms = 'idle'; if (!this.introHop && E.y > -2) { this.introHop = true; sfx('jump', 0.4, 0.8); } if (E.y < -10) this.introHop = false; }
    else { E.x = 40; E.y = 0; E.arms = k < 0.74 ? 'wave' : 'idle'; E.dir = -1; E.hide = false;
      if (k >= 0.74) { const q = (k - 0.74) / 0.26; E.eyes = q > 0.25 ? 1 : (Math.random() < 0.3 ? 1 : 0); E.grin = Math.max(0, (q - 0.4) / 0.6); E.tilt = Math.sin(q * Math.PI) * 0.1; E.ghost = q > 0.2 && q < 0.35 ? 1 : 0; if (!this.introLook && q > 0.25) { this.introLook = true; sfx('glitch', 0.8, 0.5); this.glitchK = 1; } } }
    if (k >= 0.3 && !this.introStart) { this.introStart = true; sfx('ding', 0.8, 1.2); }
  }
  /** The intro's shots: the title screen wide, following his hops, then close on his face. */
  introShot(k) { const c = this.core(); return k < 0.36 ? { x: 0, y: -120, zoom: 1 } : k < 0.62 ? { x: this.e.x - 30, y: -80, zoom: 1.5 } : k < 0.74 ? { x: c.x, y: c.y + 20, zoom: 2 } : { x: c.x, y: c.y + 6, zoom: 2.8 }; }
  /** The intro's over: after that stare he's the cheerful cartoon again... for now. */
  endIntro() { super.endIntro(); if (!this.lostOn) { this.e.eyes = 0; this.e.grin = 0; this.e.tilt = 0; this.e.ghost = 0; } }
  /** The freeze frame's framing. */
  introAt() { const c = this.core(); return { x: c.x - 6, y: c.y + 26, zoom: 2.2 }; }
  /** Its name card: cheerful... mostly. */
  introCard() { return { name: 'HOPPLE', title: 'THE FRIEND WHO STAYED' }; }
  /** You lost: he waves goodbye at you, smiling, while the tape says GAME OVER. */
  onGloat(match, t) { const E = this.e; this.clearFx(); this.pinned = false; E.hide = false; E.arms = t % 60 < 30 ? 'wave' : 'idle'; E.eyes = 1; E.grin = 1; E.dir = 1; this.osdLine = { text: 'GAME OVER', t: 2 }; }

  /** GAME OVER, his death: he freezes, the picture tears, he falls apart into pixels, THANK YOU FOR PLAYING... and the tape stops. */
  deathLen() { return DIE.len; }
  /** The death's frames (see deathLen). */
  stepDeath(match) {
    const B = this.boss, t = B.dying, E = this.e;
    if (t === 1) { this.clearFx(); this.pinned = true; E.y = Math.min(0, E.y); E.hide = false; }
    if (t < DIE.freeze) { E.ghost = 1; E.tilt = (Math.random() - 0.5) * 0.2; if (t % 4 === 0) sfx('glitch', 0.6, 0.4 + Math.random() * 0.6); }
    if (t === DIE.freeze) { this.osdLine = { text: '|| PAUSE', t: 50 }; sfx('buzz', 0.7, 0.5); }
    if (t === DIE.pixels) {                                                              // he falls apart into pixels
      this.dPix = []; const P = this.pen, ctx = P.tex.getContext(), img = ctx.getImageData(0, 0, PX.w, PX.h).data;
      for (let y = 0; y < PX.h; y += 4) for (let x = 0; x < PX.w; x += 4) { const o = (y * PX.w + x) * 4; if (img[o + 3] > 100) this.dPix.push({ x: P.img.x + x, y: P.img.y + y, c: (img[o] << 16) | (img[o + 1] << 8) | img[o + 2], vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 3, d: Math.random() * 30 }); }
      E.hide = true; sfx('glass', 1, 0.5); sfx('bighit', 0.9, 0.6); match.shake(12, 12);
    }
    if (this.dPix) for (const p of this.dPix) { if (p.d > 0) { p.d--; continue; } p.vy += 0.25; p.x += p.vx; p.y += p.vy; if (p.y > -2) { p.y = -2; p.vy *= -0.3; p.vx *= 0.8; } }
    if (t === DIE.thanks) { this.cardT.setText('THANK YOU FOR PLAYING!').setColor('#ffe060').setVisible(true); sfx('ding', 0.6, 1); }
    if (t > DIE.thanks && t < DIE.stop && t > DIE.thanks + 40 && t % 6 === 0) this.cardT.setText(this.garble('THANK YOU FOR PLAYING!', (t - DIE.thanks - 40) / 40)).setColor('#ff3a3a');
    if (t === DIE.stop) { this.cardT.setVisible(false); this.osdLine = { text: 'STOP', t: 200 }; this.flash = 6; sfx('buzz', 0.8, 0.3); }
  }
  /** Text with some of its letters wrong (k = how much). */
  garble(s, k) { return s.split('').map((c) => (c !== ' ' && Math.random() < k * 0.6 ? 'HOPLE?!#'[Math.floor(Math.random() * 8)] : c)).join(''); }

  // ------------------------------------------------------------------ hazards (VS too)
  /** STATIC: a column of static fizzes on the floor - then it shocks. */
  start_static(match, h) { h.title = 'STATIC!'; const f = match.fighters[Math.floor(Math.random() * match.fighters.length)]; h.x = Math.max(FLOOR.x1 + 30, Math.min(FLOOR.x2 - 30, f ? f.x : 0)); h.id = 'hop-static-' + h.id; this.static = h; }
  /** One frame of the static hazard: hitboxes into `out`; true when it's over. */
  step_static(match, h, out) {
    if (h.t === STATIC.warn) { sfx('buzz', 0.6, 1.2); match.shake(4, 6); }
    if (h.t >= STATIC.warn && h.t < STATIC.warn + STATIC.dur) out.push(this.bhit(h.id, h.x - STATIC.w / 2, -260, h.x + STATIC.w / 2, 4, ...STATIC.hit));
    if (h.t >= STATIC.warn + STATIC.dur + 10) { this.static = null; return true; }
    return false;
  }
  /** TRACKING ROLL: a band of bad tape rolls along the floor - jump it. */
  start_track(match, h) { h.title = 'TRACKING ROLL!\nJUMP IT'; h.d = Math.random() < 0.5 ? 1 : -1; h.x = h.d > 0 ? FLOOR.x1 - 60 : FLOOR.x2 + 60; h.id = 'hop-track-' + h.id; this.track = h; }
  /** One frame of the track hazard: hitboxes into `out`; true when it's over. */
  step_track(match, h, out) {
    if (h.t < TRACK.warn) return false;
    h.x += h.d * TRACK.speed; out.push(this.bhit(h.id, h.x - 24, -TRACK.h, h.x + 24, 2, ...TRACK.hit, { dirX: h.d }));
    if (h.x < FLOOR.x1 - 80 || h.x > FLOOR.x2 + 80) { this.track = null; return true; }
    return false;
  }

  // ------------------------------------------------------------------ drawing
  /** Every frame: the sky (when it changes), him as pixel art, his effects, the tape's overlay and HUD. */
  render(match) {
    this.match = match;
    if (this.painted !== this.lost) this.paintGround();
    if (this.t % 2 === 0 || this.lost !== this.skyAt) { this.paintSky(); this.skyAt = this.lost; }
    const E = this.e, show = !E.hide;
    this.pen.img.setVisible(show);
    if (show) this.drawHopple();
    const gh = E.ghost > 0.08 && show;
    for (const [im, dx] of [[this.ghostR, -3], [this.ghostB, 3]]) im.setVisible(gh).setPosition(this.pen.img.x + dx * E.ghost + (Math.random() - 0.5) * 2, this.pen.img.y).setAlpha(0.6 * E.ghost);
    this.drawFx();
    this.drawFace();
    this.drawTape();
  }
  /** His colours now (cartoon blending into the lost build). */
  cols() { const a = COL.base, b = COL.lost, k = this.lost, o = {}; for (const n in a) o[n] = mix(a[n], b[n], k); return o; }
  /** HOPPLE as pixel art (into the PixelPen): feet, overalls, arms, the big head with its ears, his eyes and his smile. */
  drawHopple() {
    const P = this.pen, E = this.e, C = this.cols(), d = E.dir, sq = Math.max(-0.6, Math.min(1, E.sq));
    const x0 = Math.round(E.x), y0 = Math.round(E.y);
    P.begin(x0 - PX.w / 2, y0 - PX.h + 10);
    const sx = 1 + sq * 0.18, sy = 1 - sq * 0.2, rot = E.tilt || 0;
    const T = (px, py) => { const ux = px * sx * d, uy = py * sy; return { x: x0 + ux * Math.cos(rot) - uy * Math.sin(rot), y: y0 + ux * Math.sin(rot) + uy * Math.cos(rot) }; };
    const want = POSE[E.arms] || POSE.idle; for (let i = 0; i < 4; i++) E.hp[i] = lerp(E.hp[i], want[i], 0.25);
    if (E.arms === 'wave') E.hp[1] = want[1] + Math.sin(this.t * 0.35) * 8, E.hp[0] = want[0] + Math.sin(this.t * 0.35) * 6;
    const bob = Math.sin(this.t * 0.12) * 1.5;
    // ears (behind the head): long, the left one torn and flopped in the lost build
    const head = T(0, -90 + bob);
    for (const s of [-1, 1]) {
      const torn = s < 0 && E.tear > 0.5, sw = Math.sin(this.t * 0.08 + s) * 2;
      const base = T(s * 13, -112 + bob), tip = torn ? T(s * 13 - 28, -104 + bob + sw) : T(s * 22 + sw, -158 + bob);
      const a2 = Math.atan2(tip.y - base.y, tip.x - base.x), len = Math.hypot(tip.x - base.x, tip.y - base.y), c = { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 };
      P.fillStyle(C.fur); P.fillPoints(oval(c.x, c.y, len / 2 + 3, 10, a2));
      P.fillStyle(C.pink); P.fillPoints(oval(c.x, c.y, len / 2 - 4, 4.5, a2));
      if (torn) { P.fillStyle(C.mouth); P.fillCircle(tip.x, tip.y, 3); }
    }
    // the back arm
    const sh = T(-18, -64), hb = T(E.hp[2], E.hp[3]);
    P.lineStyle(9, C.furD); P.lineBetween(sh.x, sh.y, hb.x, hb.y); P.fillStyle(C.glove); P.fillCircle(hb.x, hb.y, 6.5);
    // feet and legs
    for (const s of [-1, 1]) { const f = T(s * 14 + 4, -5), k = T(s * 11, -22); P.fillStyle(C.fur); P.fillRect(k.x - 6, k.y - 6, 12, 16); P.fillStyle(C.shoe); P.fillEllipse(f.x + 5 * d, f.y, 30 * sx, 13); P.fillStyle(C.sole); P.fillRect(f.x - 9 + 5 * d, f.y + 3, 18, 3); }
    // body: overalls over a cream belly
    const b = T(0, -42);
    P.fillStyle(C.fur); P.fillEllipse(b.x, b.y - 6, 54 * sx, 52 * sy);
    P.fillStyle(C.overall); P.fillEllipse(b.x, b.y + 6, 54 * sx, 36 * sy); P.fillRect(b.x - 16, b.y - 22, 32, 26);
    P.fillStyle(C.overallD); P.fillRect(b.x - 16, b.y - 22, 32, 3);
    for (const s of [-1, 1]) { const st = T(s * 11, -66); P.lineStyle(5, C.overall); P.lineBetween(st.x, st.y, b.x + s * 12, b.y - 20); P.fillStyle(C.button); P.fillCircle(b.x + s * 12, b.y - 18, 3); }
    P.fillStyle(C.overallD); P.fillRect(b.x - 8, b.y - 12, 16, 10);
    // the front arm
    const fs = T(18, -64), hf = T(E.hp[0], E.hp[1]);
    P.lineStyle(9, C.fur); P.lineBetween(fs.x, fs.y, hf.x, hf.y); P.fillStyle(C.glove); P.fillCircle(hf.x, hf.y, 7.5);
    if (E.arms === 'point' || E.arms === 'grab') { P.fillStyle(C.glove); P.fillEllipse(hf.x + d * 8, hf.y, 12, 6); }
    // the head
    P.fillStyle(C.fur); P.fillEllipse(head.x, head.y, 68, 58);
    P.fillStyle(C.furD); P.fillEllipse(head.x - d * 24, head.y + 4, 14, 30);
    P.fillStyle(0xfffaf0); P.fillEllipse(head.x + d * 10, head.y + 12, 38, 24);              // muzzle
    P.fillStyle(C.pink); P.fillCircle(head.x + d * 26, head.y + 6, 5); P.fillCircle(head.x - d * 6, head.y + 6, 4);   // cheeks
    // eyes: big cartoon eyes looking at you - or, in the lost build (and for a frame now and then), black holes with a pinprick
    const voidEyes = E.eyes > 0.5 || this.blinkT > 0, tx = this.nearestX(), look = Math.max(-1, Math.min(1, (tx - E.x) / 120));
    for (const [ex, ey] of [[2, -6], [20, -6]]) {
      const p = T(ex, -90 + ey + bob);
      if (!voidEyes) { P.fillStyle(0xffffff); P.fillEllipse(p.x, p.y, 13, 19); P.fillStyle(0x101018); P.fillEllipse(p.x + look * 2.5, p.y + 2, 7, 11); P.fillStyle(0xffffff); P.fillRect(Math.round(p.x + look * 2.5) - 2, Math.round(p.y) - 2, 2, 2); }
      else { P.fillStyle(0x020102); P.fillEllipse(p.x, p.y + 1, 15, 21); if (this.t % 90 > 3) { P.fillStyle(0xffffff); P.fillRect(Math.round(p.x + look * 2), Math.round(p.y + 1), 2, 2); } if (this.lostOn) { P.fillStyle(0x020102); P.fillRect(Math.round(p.x) - 1, Math.round(p.y) + 8, 3, 8 + ((this.t >> 3) + ex) % 5); } }
    }
    // the nose and the smile: a buck-toothed grin... that splits wider and wider
    const n = T(12, -82 + bob); P.fillStyle(C.pink); P.fillTriangle(n.x - 4, n.y - 2, n.x + 4, n.y - 2, n.x, n.y + 3);
    const g = E.grin, m = T(10, -73 + bob);
    if (g < 0.15) { P.lineStyle(2, C.mouth); P.arc(m.x, m.y - 4, 9, 0.3, Math.PI - 0.3); P.fillStyle(0xffffff); P.fillRect(m.x - 4, m.y + 3, 8, 5); P.fillStyle(C.mouth); P.fillRect(m.x, m.y + 3, 1, 5); }
    else {
      const w = 18 + g * 34, h = 8 + g * 12, mx = m.x - d * g * 4;
      P.fillStyle(C.mouth); P.fillEllipse(mx, m.y + 2, w, h);
      P.fillStyle(mix(0xffffff, 0xe0d8c0, this.lost));
      const N = Math.round(6 + g * 8);
      for (let i = 0; i < N; i++) { const tx2 = mx - w / 2 + 3 + i * (w - 6) / (N - 1); P.fillTriangle(tx2 - 2, m.y + 2 - h / 2 + 1, tx2 + 2, m.y + 2 - h / 2 + 1, tx2, m.y + 2 - h / 2 + 5); P.fillTriangle(tx2 - 2, m.y + 2 + h / 2 - 1, tx2 + 2, m.y + 2 + h / 2 - 1, tx2, m.y + 2 + h / 2 - 5); }
    }
    const B = this.boss;
    P.finish(C.ink, B && B.flash > 0);
  }
  /** His effects in the world: shadows / X's, shockwaves, the text box, letters and heads, spikes, coins, crawls, the debug grid and blocks, hazards. */
  drawFx() {
    const g = this.midG, f = this.fxG, t = this.t; g.clear(); f.clear();
    for (const w of this.words) w.setVisible(false);
    for (const b of this.blockT) b.setVisible(false);
    for (const c of this.crawlT) c.setVisible(false);
    for (const m of this.marks) {
      if (m.k === 'shadow') { g.fillStyle(0x000000, 0.45); g.fillEllipse(m.x, 0, m.r * 2.4, m.r * 0.6); if (m.lock) { g.lineStyle(2, 0xff2a2a, t % 6 < 3 ? 1 : 0.4); g.strokeEllipse(m.x, 0, m.r * 2.6, m.r * 0.8); } }
      else { const a = t % 10 < 6 ? 1 : 0.5; f.lineStyle(5, 0xff1a1a, a); f.lineBetween(m.x - 14, -26, m.x + 14, -2); f.lineBetween(m.x + 14, -26, m.x - 14, -2); }
    }
    for (const w of this.waves) { f.fillStyle(0xffffff, 0.8); f.fillTriangle(w.x - 10, 0, w.x + 10, 0, w.x + w.d * 4, -18); f.fillStyle(0x7ad8ff, 0.7); f.fillTriangle(w.x - 6, 0, w.x + 6, 0, w.x + w.d * 3, -11); }
    for (const sp of this.spikes) {
      const h = STANDBY.spikeH * (sp.k || 0);
      for (let i = -2; i <= 2; i++) { const x = sp.x + i * 9, hh = h * (1 - Math.abs(i) * 0.18); f.fillStyle(0x0a0408, 1); f.fillTriangle(x - 6, 2, x + 6, 2, x, -hh); f.fillStyle(0x8a1020, 1); f.fillTriangle(x - 2, 0, x + 2, 0, x, -hh + 8); }
    }
    let wi = 0;
    for (const s of this.shots) {
      if (s.k === 'letter') { const w = this.words[wi++]; if (w) w.setVisible(true).setText(s.ch).setPosition(s.x, s.y).setColor(this.lostOn ? '#ff3a3a' : '#ffffff').setAngle(0); f.lineStyle(1, 0xffffff, 0.25); f.lineBetween(s.x, s.y, s.x - s.vx * 3, s.y - s.vy * 3); }
      else this.drawHead(f, s.x, s.y, s.vx < 0 ? -1 : 1, Math.floor(t / 5) % 2);
    }
    for (const c of this.coins) {
      const w = Math.abs(Math.cos(c.spin)) * 7 + 1, red = !c.deco || this.lostOn;
      if (!c.deco && !c.landed) { f.fillStyle(0x000000, 0.3); f.fillEllipse(c.x, 0, 14, 4); }
      f.fillStyle(0x2a0404, 1); f.fillEllipse(c.x, c.y, w * 2 + 2, 16);
      f.fillStyle(red ? 0xd01a1a : 0xffd040, 1); f.fillEllipse(c.x, c.y, w * 2, 14); f.fillStyle(red ? 0xff6a5a : 0xfff0a0, 1); f.fillRect(c.x - 1, c.y - 4, 2, 8);
      if (red && !c.deco) { f.fillStyle(0x9a0a0a, 1); f.fillRect(c.x - 1, c.y + 7, 2, 4 + (t + Math.floor(c.x)) % 6); if (c.landed) { f.fillStyle(0x6a0606, 0.8); f.fillEllipse(c.x, 0, 20, 4); } }
    }
    for (const [i, c] of this.crawls.entries()) {
      const y = { lo: -14, hi: -118, hi2: -127 }[c.band], hgt = c.band === 'lo' ? 32 : 40;
      f.fillStyle(0x000000, 0.9); f.fillRect(c.x, y - hgt / 2, c.w, hgt); f.fillStyle(0xd01010, 1); f.fillRect(c.x, y - hgt / 2, c.w, 3); f.fillRect(c.x, y + hgt / 2 - 3, c.w, 3);
      const T = this.crawlT[i]; if (T) T.setVisible(true).setText(c.text + c.text).setPosition(c.x + 8, y).setCrop(0, 0, c.w - 16, 24).setColor(t % 16 < 10 ? '#ffffff' : '#ff6a6a');
    }
    if (this.grid > 0) { g.lineStyle(1, 0x3aff6a, 0.35); for (let x = -320; x <= 320; x += DEBUG.cell) g.lineBetween(x, -360, x, 0); for (let y = 0; y >= -360; y -= DEBUG.cell) g.lineBetween(FLOOR.x1 - 60, y, FLOOR.x2 + 60, y);
      if (this.match) for (const fi of this.match.fighters) if (fi.alive) { g.lineStyle(1, 0x3aff6a, 0.9); g.strokeRect(fi.x - 12, fi.y - 44, 24, 44); }
      const E = this.e; if (!E.hide) { g.lineStyle(1, 0xff3a3a, 0.9); for (const r of this.hurt()) g.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1); } }
    this.blocks.forEach((b, i) => {
      const C = DEBUG.cell;
      if (b.st === 'warn') { g.fillStyle(0x3aff6a, t % 8 < 4 ? 0.35 : 0.15); g.fillRect(b.x - C / 2, -360, C, 360); }
      else { f.fillStyle(0x0a2a12, 1); f.fillRect(b.x - C / 2, b.y, C, C); f.lineStyle(2, 0x3aff6a, 1); f.strokeRect(b.x - C / 2 + 1, b.y + 1, C - 2, C - 2); f.lineBetween(b.x - C / 2, b.y, b.x + C / 2, b.y + C); f.lineBetween(b.x + C / 2, b.y, b.x - C / 2, b.y + C); const T = this.blockT[i]; if (T) T.setVisible(true).setPosition(b.x, b.y - 5); }
    });
    // the text box (an RPG dialogue box with his portrait)
    const X = this.box;
    this.boxT.setVisible(!!X);
    if (X) {
      const a = 1 - (X.fade || 0), bx = X.x - BOX.w / 2 + (X.shake ? (Math.random() - 0.5) * 4 : 0), by = X.y;
      f.fillStyle(0x0a0a3a, 0.95 * a); f.fillRect(bx, by, BOX.w, BOX.h); f.lineStyle(3, 0xffffff, a); f.strokeRect(bx + 2, by + 2, BOX.w - 4, BOX.h - 4); f.lineStyle(1, 0x6a8aff, a); f.strokeRect(bx + 5, by + 5, BOX.w - 10, BOX.h - 10);
      f.fillStyle(0xf6ecd4, a); f.fillRect(bx + 10, by + 10, 36, 36); f.fillStyle(0xf4a0b8, a); f.fillRect(bx + 14, by + 10, 6, 10); f.fillRect(bx + 36, by + 10, 6, 10);
      f.fillStyle(this.lostOn || X.red ? 0x000000 : 0x101018, a); f.fillRect(bx + 18, by + 22, 5, 8); f.fillRect(bx + 32, by + 22, 5, 8);
      f.fillStyle(this.lostOn || X.red ? 0x6a0a14 : 0x6a1020, a); f.fillRect(bx + 18, by + 36, this.lostOn || X.red ? 20 : 12, 3);
      if (!X.drop && t % 30 < 20 && X.shown >= X.text.length) { f.fillStyle(0xffffff, a); f.fillTriangle(bx + BOX.w - 18, by + BOX.h - 14, bx + BOX.w - 10, by + BOX.h - 14, bx + BOX.w - 14, by + BOX.h - 9); }
      this.boxT.setText('HOPPLE:\n' + X.text.slice(0, X.shown)).setPosition(bx + 54, by + 11).setAlpha(a).setColor(X.red || this.lostOn ? '#ff4a4a' : '#ffffff');
    }
    // hazards
    if (this.static) { const h = this.static, on = h.t >= STATIC.warn; for (let i = 0; i < (on ? 60 : 18); i++) { const y = -Math.random() * 260, c = Math.random() < 0.5 ? 0xffffff : 0x8a8a8a; f.fillStyle(c, on ? 0.9 : 0.35); f.fillRect(h.x - STATIC.w / 2 + Math.random() * STATIC.w, y, 2 + Math.random() * 4, 1 + Math.random() * 2); } if (on) { f.fillStyle(0xffffff, 0.25); f.fillRect(h.x - STATIC.w / 2, -260, STATIC.w, 262); } }
    if (this.track && this.track.t >= TRACK.warn) { const h = this.track; for (let i = 0; i < 8; i++) { f.fillStyle(i % 2 ? 0xffffff : 0x40e0ff, 0.6); f.fillRect(h.x - 24 + Math.random() * 6, -TRACK.h + i * 2.3, 48, 1); } f.fillStyle(0xff2a6a, 0.3); f.fillRect(h.x - 26, -TRACK.h, 52, TRACK.h); }
    // his death's pixels
    if (this.dPix) for (const p of this.dPix) { f.fillStyle(p.c, 1); f.fillRect(p.x, p.y, 4, 4); }
  }
  /** One of his life icons: his little head, chomping (o = mouth open). */
  drawHead(g, x, y, d, o) {
    g.fillStyle(0x1a1020, 1); g.fillEllipse(x, y, 26, 23);
    for (const s of [-1, 1]) { g.fillStyle(0x1a1020, 1); g.fillEllipse(x + s * 5, y - 15, 9, 18); g.fillStyle(0xf6ecd4, 1); g.fillEllipse(x + s * 5, y - 15, 6, 15); }
    g.fillStyle(0xf6ecd4, 1); g.fillEllipse(x, y, 23, 20);
    g.fillStyle(0x020102, 1); g.fillEllipse(x - 4 + d, y - 3, 5, 7); g.fillEllipse(x + 4 + d, y - 3, 5, 7);
    g.fillStyle(0x5a0a14, 1); g.fillEllipse(x + d * 2, y + 5, 12, o ? 8 : 3);
    if (o) { g.fillStyle(0xffffff, 1); for (let i = -2; i <= 2; i++) g.fillTriangle(x + d * 2 + i * 2.4 - 1, y + 2, x + d * 2 + i * 2.4 + 1, y + 2, x + d * 2 + i * 2.4, y + 4); }
  }
  /** IT SEES YOU: his huge face rising behind the hills (background, screen pixels) and the jumpscare filling the screen (UI). */
  drawFace() {
    const g = this.faceG, sg = this.scareG; g.clear(); sg.clear();
    if (this.face > 0) {
      const k = easeOut(this.face), cx = 320 + Math.sin(this.t * 0.05) * 4, cy = 420 - k * 250, r = 150 + k * 40;
      g.fillStyle(0xb8ae9c, 1); g.fillEllipse(cx, cy, r * 2, r * 1.7);
      for (const s of [-1, 1]) { g.fillStyle(0x020102, 1); g.fillEllipse(cx + s * 58, cy - 30, 54, 78); g.fillStyle(0xffffff, 1); g.fillRect(cx + s * 58 - 2, cy - 30, 4, 4); }
      g.fillStyle(0x050204, 1); g.fillEllipse(cx, cy + 70, 230 * k, 70); g.fillStyle(0xe0d8c0, 1); for (let i = 0; i < 14; i++) { const x = cx - 105 * k + i * 16 * k; g.fillTriangle(x - 5, cy + 40, x + 5, cy + 40, x, cy + 56); }
    }
    // the ? blocks glow while his face rises (the safe places)
    if (this.face > 0) for (const s of [-1, 1]) { const m = this.match, c = m && m.cameras.main; if (!c) continue; const px = ((s < 0 ? -LEDGE.x2 : LEDGE.x1) - c.worldView.x) * c.zoom, py = (LEDGE.y - c.worldView.y) * c.zoom; sg.lineStyle(2, 0xffe060, 0.5 + 0.5 * Math.sin(this.t * 0.3)); sg.strokeRect(px - 2, py - 2, (LEDGE.x2 - LEDGE.x1) * c.zoom + 4, 16 * c.zoom + 4); }
    if (this.scare > 0) {                                                                 // the jumpscare: his face fills the screen
      const k = this.scare, j = () => (Math.random() - 0.5) * 16 * k;
      sg.fillStyle(0x000000, 0.9 * k); sg.fillRect(0, 0, 640, 360);
      sg.fillStyle(0xc8bea8, k); sg.fillEllipse(320 + j(), 190 + j(), 700, 560);
      for (const s of [-1, 1]) { sg.fillStyle(0x000000, k); sg.fillEllipse(320 + s * 130 + j(), 130 + j(), 150, 200); }
      sg.fillStyle(0x050204, k); sg.fillEllipse(320 + j(), 290, 520, 170); sg.fillStyle(0xffffff, k); for (let i = 0; i < 16; i++) { const x = 90 + i * 30; sg.fillTriangle(x - 10, 214, x + 10, 214, x, 250); sg.fillTriangle(x - 10, 370, x + 10, 370, x, 330); }
    }
  }
  /** The tape: the dark (IT SEES YOU), the test card (PLEASE STAND BY), the alert, the tracking band, the OSD, the fake game HUD, the title screen. */
  drawTape() {
    const g = this.tapeG, d = this.darkG, t = this.t; g.clear(); d.clear();
    if (this.dark > 0) { d.fillStyle(0x000000, 0.86 * this.dark); d.fillRect(0, 0, 640, 360); }
    if (this.card > 0) {                                                                 // the test card
      const cols = [0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0];
      cols.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(i * 640 / 7, 0, 640 / 7 + 1, 240); });
      g.fillStyle(0x101010, 1); g.fillRect(0, 240, 640, 120); g.fillStyle(0xffffff, 1); g.fillRect(0, 270, 640 * 0.25, 60); g.fillStyle(0x2a0a5a, 1); g.fillRect(640 * 0.25, 270, 640 * 0.15, 60);
      g.fillStyle(0x000000, 0.85); g.fillRect(170, 130, 300, 60); g.lineStyle(2, 0xffffff, 1); g.strokeRect(170, 130, 300, 60);
      this.cardT.setText('PLEASE STAND BY').setColor('#ffffff').setPosition(320, 160).setVisible(true);
      const E = this.e, m = this.match, c = m && m.cameras.main;                         // ...and in it, faintly, his eyes
      if (c) { const px = (E.x - c.worldView.x) * c.zoom, py = (E.y - 96 - c.worldView.y) * c.zoom; g.fillStyle(0x000000, 0.6); g.fillEllipse(px - 8, py, 10, 14); g.fillEllipse(px + 8, py, 10, 14); }
    } else if (this.cardT.visible && !(this.boss && this.boss.dying)) this.cardT.setVisible(false);
    if (this.alert > 0) {
      g.fillStyle(0x000000, 0.55); g.fillRect(0, 70, 640, 44); g.fillStyle(t % 20 < 10 ? 0xd01010 : 0x8a0a0a, 1); g.fillRect(0, 70, 640, 4); g.fillRect(0, 110, 640, 4);
      this.scareT.setText('EMERGENCY BROADCAST\nDO NOT CONTINUE PLAYING').setPosition(320, 92).setVisible(true);
    } else if (this.scareT.y === 92) { this.scareT.setPosition(320, 268); if (!this.dark) this.scareT.setVisible(false); }
    // the tracking band: always a little, more when the tape glitches or the build is lost
    const strength = 0.25 + this.glitchK + this.lost * 0.35, by = ((t * (1.4 + this.lost)) % 460) - 50;
    for (let i = 0; i < 6; i++) { g.fillStyle(0xffffff, 0.04 * strength + Math.random() * 0.05 * strength); g.fillRect(Math.random() * 20 - 10, by + i * 3, 640, 2); }
    for (let i = 0; i < 20 * strength; i++) { g.fillStyle(0xffffff, 0.5 * Math.random()); g.fillRect(Math.random() * 640, Math.random() * 360, 1 + Math.random() * 3, 1); }
    if (this.glitchK > 0.2) for (let i = 0; i < 5; i++) { g.fillStyle([0xff2a4a, 0x2ad0ff, 0xffffff][i % 3], 0.25 * this.glitchK); g.fillRect(0, Math.random() * 360, 640, 2 + Math.random() * 8); }
    if (this.flash > 0) { g.fillStyle(0xffffff, this.flash / 10); g.fillRect(0, 0, 640, 360); }
    // the OSD and the clock (frames, so the timecode runs with the fight)
    const sec = Math.floor(t / 60), tc = `SP ${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    this.osd.setText(this.osdLine ? this.osdLine.text : 'PLAY >').setVisible(!this.osdLine || t % 30 < 22);
    this.clock.setText(this.lostOn && t % 120 < 6 ? 'SP 9:99:99' : tc);
    // the fake game HUD: his lives and the score
    const lives = this.lostOn ? 'HOPPLE x0' : 'HOPPLE x' + this.livesShown;
    this.hudT.setText(lives + '\nSCORE ' + String(Math.min(999999, this.score)).padStart(6, '0')).setColor(this.lostOn ? '#ff4a4a' : '#ffe060');
    for (let i = 0; i < (this.lostOn ? 0 : this.livesShown); i++) this.drawHead(g, 90 + i * 14, 33, 1, 0);
    // the title screen (the intro)
    const ti = this.title > 0 && !!this.intro;
    this.titleT.setVisible(ti).setAlpha(this.title).setScale(1 + Math.sin(t * 0.1) * 0.03); this.titleS.setVisible(ti && t % 40 < 26).setAlpha(this.title);
    if (ti) { g.fillStyle(0x2a5ad8, 0.75 * this.title); g.fillRect(0, 60, 640, 200); g.fillStyle(0xffffff, 0.6 * this.title); g.fillRect(0, 60, 640, 2); g.fillRect(0, 258, 640, 2); this.cardT.setText('(C) 1994 SUNNYSIDE SOFT').setFontSize(6).setPosition(320, 246).setVisible(true).setAlpha(this.title); }
    else if (this.cardT.text === '(C) 1994 SUNNYSIDE SOFT') this.cardT.setVisible(false).setFontSize(12).setAlpha(1);
  }
}

/** The select-screen miniature: a sunny 16-bit level gone wrong at the edges, a rabbit with black eyes. */
export function drawHappyHillsPreview(g, x, y, w, h) {
  g.fillStyle(0x7ac8ff, 1); g.fillRect(x, y, w, h * 0.6); g.fillStyle(0x8a1a1a, 1); g.fillRect(x + w * 0.7, y, w * 0.3, h * 0.6);
  g.fillStyle(0x5ad06a, 1); g.fillCircle(x + w * 0.25, y + h * 0.72, h * 0.3); g.fillCircle(x + w * 0.7, y + h * 0.75, h * 0.26); g.fillRect(x, y + h * 0.6, w, h * 0.4);
  g.fillStyle(0xd0803a, 1); g.fillRect(x + w * 0.08, y + h * 0.78, w * 0.84, h * 0.14); g.fillStyle(0x4ad84a, 1); g.fillRect(x + w * 0.08, y + h * 0.76, w * 0.84, 3);
  for (const s of [0.16, 0.7]) { g.fillStyle(0xffc030, 1); g.fillRect(x + w * s, y + h * 0.48, w * 0.14, 4); }
  const cx = x + w * 0.5, fy = y + h * 0.76;
  g.fillStyle(0xf6ecd4, 1); g.fillEllipse(cx - 3, fy - h * 0.5, 4, 10); g.fillEllipse(cx + 3, fy - h * 0.5, 4, 10); g.fillCircle(cx, fy - h * 0.36, 7);
  g.fillStyle(0x3a6ad8, 1); g.fillRect(cx - 5, fy - h * 0.26, 10, h * 0.2); g.fillStyle(0xe03030, 1); g.fillRect(cx - 6, fy - 3, 12, 3);
  g.fillStyle(0x000000, 1); g.fillRect(cx - 3, fy - h * 0.4, 2, 3); g.fillRect(cx + 1, fy - h * 0.4, 2, 3); g.fillStyle(0x5a0a14, 1); g.fillRect(cx - 3, fy - h * 0.33, 6, 2);
}
