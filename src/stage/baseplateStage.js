// "BASEPLATE 2012": a love letter to the old block-building games of 2010-2016 (an original stage - no
// names or logos from any real game). The fight is on a studded green baseplate floating in a bright default
// sky, between a red tower and a blue tower built for sword fights, with a grey brick hanging over the middle.
// Far off, guests (Mason's drawing) spawn in on their own floating plates, wander about, hop, chat in speech
// bubbles and log off again - and one spawn in fifty is the other one (his glitched drawing), which only stands
// there and stares. A blimp drifts past. On the plate: two jump pads that fling you up, and the grey brick slides
// back and forth overhead, carrying whoever's on it. Music: Mason's four tracks on rotation ('bgm_baseplate_4/5/6/10').
//
// Stage hazards, one at a time every 10-14 s, each announced with a CAUTION banner first:
//   ROCKET BARRAGE - red crosshairs appear on the plate; rockets fire from the tops of the towers and blow
//                    up on them (chunky orange explosions, bricks flying).
//   LOOSE BRICKS   - shadows on the plate grow as unanchored bricks fall out of the sky; they bounce off and
//                    tumble away.
//   LAG SPIKE      - the connection bars flicker... everything freezes, then everyone snaps back to where
//                    they were a moment ago.
//   THE GRIEFER    - a blocky troublemaker joins the game on top of one of the towers and throws a load of
//                    classic gear at you: a spinning sword, a bouncing superball, a ticking timebomb, a shaken-up
//                    soda can and a rocket. Then he logs off.
//   THE HACKER     - a hooded exploiter flies in over the plate, FLINGs himself across it (anyone he touches goes
//                    flying), SWAPs two players with a glitch beam - then the server BANS him.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
import { HazardCycle } from './hazardCycle.js';

export const BPAL = {
  sky: [0x5aa0e6, 0x63a8ea, 0x6db0ec, 0x78b8ee, 0x84c0f0, 0x92c8f2, 0xa0d0f4, 0xb0d8f6],
  cloud: 0xffffff, cloudShade: 0xdce8f4,
  plate: 0x4b9a3a, plateLight: 0x6cba4e, plateDark: 0x357a2a, plateSide: 0x2c6424, plateUnder: 0x1e4a1a,
  stud: 0x7cca5a, studShade: 0x2c6424,
  red: 0xc4281c, redLight: 0xe8503e, redDark: 0x8a1810,
  blue: 0x1e64c8, blueLight: 0x4a8ae8, blueDark: 0x12408a,
  grey: 0xa3a2a5, greyLight: 0xc8c8ca, greyDark: 0x6e6e72,
  yellow: 0xf5cd30, green: 0x4b974b, white: 0xf2f3f3, black: 0x1b2a35,
  outline: 0x10161c,
  skin: 0xf5cd30, shirt: 0x0d69ac, legs: 0xa4bd47,           // the classic default guest
  fire: [0xfff4a8, 0xffc23a, 0xff7a1a, 0xc8320a],
};
const BRICK_COLS = [[0xc4281c, 0xe8503e, 0x8a1810], [0x1e64c8, 0x4a8ae8, 0x12408a], [0xf5cd30, 0xffe680, 0xb8941a], [0x4b974b, 0x74c074, 0x2e6a2e], [0xa3a2a5, 0xc8c8ca, 0x6e6e72]];
// the guests: a new one spawns in every 'every' frames (min, max); each stays 'life' frames; one in glitchOdds is the
// glitched one, which stays 'glitchLife' frames
const GUEST = { every: [90, 240], life: [600, 1500], glitchOdds: 50, glitchLife: [180, 360] };
// the grey brick slides 'swing' px either side of the middle, there and back every 'period' frames
const BRICK = { swing: 96, period: 600 };
// the jump pads: where they are, how close you have to stand, how hard they fling you up, from which states
const PAD = { xs: [-120, 120], reach: 11, launch: -11.5, states: ['idle', 'run', 'land', 'walk', 'dash', 'crouch'] };
// THE GRIEFER: how many things he throws, the frames between throws, and what he can throw (each one's
// damage/launch is in its own section of step_griefer below)
const GRIEFER = { throws: 6, firstAt: 60, every: 32, items: ['sword', 'ball', 'bomb', 'soda', 'rocket'] };
// THE HACKER: joins after flying in, FLINGs (spins across the plate - anyone touched goes flying), SWAPs two players'
// places with a glitch beam, then gets BANNED. Tunables: how hard the fling hits, how many passes, how long each part takes.
const HACKER = { passes: 2, passFrames: 70, fling: { dmg: 9, angle: 50, base: 7.2, growth: 4.4 }, swapAt: 40 };
const HACK_CHAT = ['ez', 'fling time', 'admin abuse lol', 'u cant ban me', 'teleport go brrr', 'get flung', 'noclip on'];
const GRIEF_CHAT = ['lol', 'ez', 'catch!!', 'free gear', 'get noobed', 'ur bad', 'hehehe', 'incoming', 'rekt'];
const CHAT = ['lol', 'brb', 'who wants to sword fight', 'free admin??', 'can someone build me a house', 'lag...', 'noob', 'oof', 'follow me', 'gg', 'how do u jump', 'tix 4 trade', 'im a guest', 'meet at spawn'];

export class BaseplateStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -280, x2: 280, y: 0, solid: true, bottom: 40 },      // the baseplate
      { x1: -262, x2: -170, y: -110, solid: false },             // the red tower's top
      { x1: 170, x2: 262, y: -110, solid: false },               // the blue tower's top
      { x1: -56, x2: 56, y: -190, solid: false },                // the floating grey brick (it slides: BRICK below)
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.t = 0;
    this.musicList = ['bgm_baseplate_4', 'bgm_baseplate_5', 'bgm_baseplate_6', 'bgm_baseplate_10'];   // Mason's four tracks, taking turns (music.js playPlaylist)
    this.cycle = new HazardCycle(this, ['rockets', 'bricks', 'lag', 'griefer', 'hacker'], { color: '#ffffff', stroke: '#1b2a35' });
    const R = (n) => { let s = n; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
    const r = R(11);
    this.rnd = r;
    // the guests: they spawn in on the far plates (screen x, the plate's top y, its width; parallax layer)
    this.plates = [[30, 233, 140], [250, 207, 120], [480, 237, 150], [720, 217, 110]];
    this.guests = [];
    this.nextGuest = 20;                                     // frames until the next one spawns in
    this.bubbles = [];
    this.hist = new Map();                                   // where each fighter was, the last second (LAG SPIKE)
    this.pads = PAD.xs.map((x) => ({ x, squash: 0 }));
  }

  // ---------------------------------------------------------------- drawing helpers
  // a brick: a flat face, a lit top edge, a dark bottom/right, studs along the top
  brick(g, x, y, w, h, col, studs = true) {
    const [c, l, d] = col;
    g.fillStyle(BPAL.outline, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(c, 1); g.fillRect(x, y, w, h);
    g.fillStyle(l, 1); g.fillRect(x, y, w, 2); g.fillRect(x, y, 1, h);
    g.fillStyle(d, 1); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 1, y, 1, h);
    if (studs) for (let sx = x + 3; sx < x + w - 3; sx += 8) { g.fillStyle(d, 1); g.fillRect(sx, y - 3, 5, 3); g.fillStyle(l, 1); g.fillRect(sx, y - 3, 4, 2); g.fillStyle(0xffffff, 0.35); g.fillRect(sx + 1, y - 3, 1, 1); }
  }
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = BPAL;
    // the sky: hard bands of the classic default blue, white flat clouds
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 46, 1440, 47); });
    sky.fillStyle(P.sky[7], 1); sky.fillRect(-400, -60 + 8 * 46, 1440, 400);
    sky.fillStyle(0xfff8d0, 0.25); sky.fillCircle(560, 50, 40); sky.fillStyle(0xfffbe8, 1); sky.fillCircle(560, 50, 18);   // the sun
    const cloud = (x, y, w) => {
      sky.fillStyle(P.cloudShade, 1); sky.fillRect(x, y + 8, w, 8);
      sky.fillStyle(P.cloud, 1); sky.fillRect(x, y, w, 10); sky.fillRect(x + w * 0.2, y - 8, w * 0.4, 8); sky.fillRect(x + w * 0.5, y - 4, w * 0.3, 4);
    };
    cloud(30, 60, 110); cloud(250, 30, 80); cloud(420, 90, 130); cloud(700, 50, 100); cloud(880, 100, 90);
    // far: other people's floating plates, their builds and the guests standing around on them
    const far = s.add.graphics().setScrollFactor(0.3);
    const plate = (x, y, w) => {
      far.fillStyle(P.plateSide, 1); far.fillRect(x, y, w, 8); far.fillStyle(P.plate, 1); far.fillRect(x, y - 3, w, 4);
      far.fillStyle(P.stud, 1); for (let sx = x + 2; sx < x + w - 2; sx += 6) far.fillRect(sx, y - 5, 3, 2);
    };
    plate(30, 236, 140); plate(250, 210, 120); plate(480, 240, 150); plate(720, 220, 110);
    // a little house (someone's first build), an obstacle course of floating coloured bricks, a lopsided tower
    far.fillStyle(0xd8c8a0, 1); far.fillRect(270, 176, 50, 32); far.fillStyle(0x8a3a2a, 1); far.fillTriangle(262, 178, 328, 178, 295, 154);
    far.fillStyle(0x6a4a2a, 1); far.fillRect(290, 190, 10, 18); far.fillStyle(0x9ad0f0, 1); far.fillRect(274, 184, 10, 8); far.fillRect(306, 184, 10, 8);
    BRICK_COLS.forEach((c, i) => { far.fillStyle(c[0], 1); far.fillRect(600 + i * 26, 200 - (i % 2) * 24 - i * 6, 18, 6); far.fillStyle(c[1], 1); far.fillRect(600 + i * 26, 200 - (i % 2) * 24 - i * 6, 18, 2); });
    for (let k = 0; k < 7; k++) { const c = BRICK_COLS[k % 5]; far.fillStyle(c[0], 1); far.fillRect(740 + Math.round(Math.sin(k) * 4) + k * 2, 214 - k * 10, 22, 9); far.fillStyle(c[1], 1); far.fillRect(740 + Math.round(Math.sin(k) * 4) + k * 2, 214 - k * 10, 22, 2); }
    // blocky trees: a brown trunk and a green cube on top
    for (const [x, y] of [[40, 233], [150, 233], [600, 237], [820, 217]]) {
      far.fillStyle(0x6a4a2a, 1); far.fillRect(x - 2, y - 14, 4, 14);
      far.fillStyle(0x2e7a2e, 1); far.fillRect(x - 9, y - 30, 18, 17); far.fillStyle(0x4ba04b, 1); far.fillRect(x - 9, y - 30, 18, 4); far.fillStyle(0x1e5a1e, 1); far.fillRect(x + 5, y - 30, 4, 17);
    }
    // a red and white checkpoint flag, and a spawn pad on each plate (where the guests appear)
    far.fillStyle(0xdcdcdc, 1); far.fillRect(540, 205, 2, 32); far.fillStyle(0xc4281c, 1); far.fillRect(542, 206, 14, 9); far.fillStyle(0xffffff, 1); far.fillRect(546, 208, 6, 5);
    for (const [x, y, w] of this.plates) { far.fillStyle(0x6e6e72, 1); far.fillRect(x + w / 2 - 9, y - 2, 18, 3); far.fillStyle(0xc8c8ca, 1); far.fillRect(x + w / 2 - 9, y - 2, 18, 1); }
    // further still, faint: a huge obstacle course of floating platforms, towers and a lava strip
    const haze = s.add.graphics().setScrollFactor(0.15);
    haze.fillStyle(0x9cc8ee, 1);                                         // (just a shade off the sky: very far away)
    for (let i = 0; i < 9; i++) haze.fillRect(120 + i * 70, 170 - (i % 3) * 12 - (i > 4 ? 8 : 0), 30, 5);
    haze.fillRect(70, 140, 14, 50); haze.fillRect(860, 130, 16, 60);
    bgLayer.push(sky, haze, far);
    // the blimp: drifts slowly across the sky now and then (moved in step)
    this.blimp = s.add.graphics().setScrollFactor(0.12);
    const bl = this.blimp;
    bl.fillStyle(BPAL.outline, 1); bl.fillRect(-46, -15, 92, 30); bl.fillRect(-52, -10, 6, 20); bl.fillRect(46, -10, 6, 20);
    bl.fillStyle(0xe8e8ec, 1); bl.fillRect(-45, -14, 90, 28); bl.fillRect(-50, -9, 4, 18); bl.fillRect(46, -9, 4, 18);
    bl.fillStyle(0xffffff, 1); bl.fillRect(-45, -14, 90, 4); bl.fillStyle(0xb8b8c0, 1); bl.fillRect(-45, 9, 90, 5);
    bl.fillStyle(0xc4281c, 1); bl.fillRect(-58, -12, 10, 8); bl.fillRect(-58, 4, 10, 8);              // tail fins
    bl.fillStyle(0x1e64c8, 1); bl.fillRect(-30, -6, 60, 12); bl.fillStyle(0xffffff, 1);
    for (let i = 0; i < 6; i++) bl.fillRect(-26 + i * 10, -3, 6, 6);                                   // blocks on its banner
    bl.fillStyle(0x6e6e72, 1); bl.fillRect(-10, 15, 20, 7); bl.fillStyle(0x9ad0f0, 1); bl.fillRect(-7, 17, 4, 3); bl.fillRect(1, 17, 4, 3);   // the gondola
    bl.setScale(0.75).setPosition(-200, 46);
    bgLayer.push(bl);
    // the guests: Mason's drawings, a pool of sprites (half size: tools/sprites/baseplate_guests.py)
    this.guestSpr = [];
    for (let i = 0; i < 8; i++) {
      const sp = s.add.image(0, 0, 'bp_guests', 0).setOrigin(0.5, 1).setScrollFactor(0.3).setVisible(false);
      bgLayer.push(sp); this.guestSpr.push(sp);
    }
    this.bgFx = s.add.graphics().setScrollFactor(0.3); bgLayer.push(this.bgFx);      // spawn sparkles, poofs, static, chat bubbles
    this.chatText = [];
    for (let i = 0; i < 3; i++) {
      const tx = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#1b2a35' }).setOrigin(0.5, 1).setScrollFactor(0.3).setVisible(false);
      bgLayer.push(tx); this.chatText.push(tx);
    }
    // the world: the towers, the plate, the brick, the spawn pad
    const w = s.add.graphics();
    this.drawTowers(w); this.drawPlate(w);                               // (the sliding brick and the jump pads are drawn every frame)
    worldLayer.push(w);
    this.fxG = s.add.graphics(); this.hzG = s.add.graphics(); worldLayer.push(this.fxG, this.hzG);
    this.grText = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#1b2a35' }).setOrigin(0.5, 1).setVisible(false);   // the griefer's chat
    this.hkText = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#0a3a12' }).setOrigin(0.5, 1).setVisible(false);   // the hacker's chat
    this.hkTag = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#5aff6a' }).setOrigin(0.5, 1).setVisible(false);   // his name tag
    worldLayer.push(this.grText, this.hkText, this.hkTag);
    this.cycle.makeBanner(this.scene);
  }
  drawPlate(g) {
    const P = BPAL;
    // the slab: green top, studs, a darker side, stepping in underneath like it was built from smaller plates
    for (let r = 0; r < 5; r++) {
      const inset = r * r * 3 + r * 6, y = 4 + r * 8;
      g.fillStyle(P.outline, 1); g.fillRect(-282 + inset, y - 1, 564 - inset * 2, 10);
      g.fillStyle(r === 0 ? P.plateSide : r < 3 ? P.plateUnder : 0x163a14, 1); g.fillRect(-281 + inset, y, 562 - inset * 2, 8);
      g.fillStyle(0x000000, 0.15); for (let x = -281 + inset; x < 281 - inset; x += 32) g.fillRect(x, y, 1, 8);   // the seams between plates
    }
    g.fillStyle(P.outline, 1); g.fillRect(-282, -1, 564, 6);
    g.fillStyle(P.plate, 1); g.fillRect(-281, 0, 562, 4);
    g.fillStyle(P.plateLight, 1); g.fillRect(-281, 0, 562, 1);
    for (let x = -276; x < 276; x += 8) { g.fillStyle(P.studShade, 1); g.fillRect(x, -3, 5, 3); g.fillStyle(P.stud, 1); g.fillRect(x, -3, 4, 2); g.fillStyle(0xffffff, 0.4); g.fillRect(x + 1, -3, 1, 1); }
    // the spawn pad in the middle: a grey square with a dark border and a chevron
    g.fillStyle(P.outline, 1); g.fillRect(-25, -5, 50, 5);
    g.fillStyle(P.grey, 1); g.fillRect(-24, -5, 48, 4); g.fillStyle(P.greyLight, 1); g.fillRect(-24, -5, 48, 1);
    g.fillStyle(P.greyDark, 1); for (let i = 0; i < 4; i++) g.fillRect(-6 + i * 3, -4 + Math.abs(i - 1.5) * 0.8, 2, 2);
  }
  drawTowers(g) {
    const P = BPAL;
    // two sword-fight towers built from bricks, red on the left, blue on the right; their tops are platforms
    for (const [x1, col] of [[-262, [P.red, P.redLight, P.redDark]], [170, [P.blue, P.blueLight, P.blueDark]]]) {
      const w = 92;
      for (let y = -12, row = 0; y > -110; y -= 12, row++) {                  // brick courses, staggered
        const off = row % 2 ? 0 : 23;
        for (let x = x1 - off; x < x1 + w; x += 46) {
          const bx = Math.max(x1 + 6, x), bw = Math.min(x + 46, x1 + w - 6) - bx;
          if (bw > 4) this.brick(g, bx, y, bw - 1, 11, col, false);
        }
      }
      this.brick(g, x1, -110, w, 8, col, true);                            // the top: studded
      for (let k = 0; k < 4; k++) { g.fillStyle(col[2], 1); g.fillRect(x1 + 8 + k * 22, -118, 8, 8); g.fillStyle(col[1], 1); g.fillRect(x1 + 8 + k * 22, -118, 8, 2); }   // battlements
      g.fillStyle(0x000000, 0.35); g.fillRect(x1 + 40, -70, 12, 16);          // a window
    }
  }
  // ---- the sliding grey brick
  drawBrickPlatform(g, x) {
    const P = BPAL;
    this.brick(g, x - 56, -190, 112, 12, [P.grey, P.greyLight, P.greyDark], true);
    g.fillStyle(0x000000, 0.12); g.fillRect(x - 56, -178, 112, 3);
    g.fillStyle(0x000000, 0.07); g.fillRect(x - 40, -2, 80, 2);                       // its shadow far below
  }
  // ---- a jump pad: a squat studded block with a spring in it (squashed for a moment after it fires)
  drawPad(g, x, squash) {
    const P = BPAL, h = 6 - squash * 3;
    g.fillStyle(P.outline, 1); g.fillRect(x - 13, -h - 2, 26, h + 2);
    g.fillStyle(0x2ad84a, 1); g.fillRect(x - 12, -h - 1, 24, h); g.fillStyle(0x9aff8a, 1); g.fillRect(x - 12, -h - 1, 24, 1);
    g.fillStyle(0x1a8a2a, 1); g.fillRect(x - 12, -2, 24, 1);
    for (const sx of [-9, -3, 3]) { g.fillStyle(0x9aff8a, 1); g.fillRect(x + sx, -h - 3, 5, 2); }
    g.fillStyle(0xffffff, 0.5 + 0.3 * Math.sin(this.t * 0.2)); g.fillTriangle(x - 4, -h - 6, x + 4, -h - 6, x, -h - 11);   // an arrow, bobbing
  }

  step(match) {
    this.t++;
    const t = this.t, P = BPAL, f = this.fxG, bg = this.bgFx;
    if (!this.cycle.hz || this.cycle.hz.kind !== 'hacker') { this.hkText.setVisible(false); this.hkTag.setVisible(false); }   // (the hacker's name tag and chat only while he's here)
    // where everyone has been (LAG SPIKE snaps them back here)
    for (const fi of match.fighters) {
      let h = this.hist.get(fi); if (!h) { h = []; this.hist.set(fi, h); }
      h.push([fi.x, fi.y]); if (h.length > 60) h.shift();
    }
    bg.clear(); f.clear();
    this.stepGuests(bg);
    // the blimp: across the sky every 40 s or so, slowly
    const bt = t % 2400; this.blimp.setVisible(bt < 1500).setPosition(-160 + bt * 0.85, 46 + Math.sin(t * 0.01) * 4);
    // the grey brick slides back and forth; whoever is standing on it rides along
    const plat = this.platforms[3], bx = Math.round(Math.sin(t * Math.PI * 2 / BRICK.period) * BRICK.swing), dx = bx - (plat.x1 + 56);
    if (dx) {
      plat.x1 += dx; plat.x2 += dx;
      for (const fi of match.fighters) if (fi.grounded && fi.platform === plat) fi.x += dx;
    }
    this.drawBrickPlatform(f, bx);
    // the jump pads
    for (const pad of this.pads) {
      if (pad.squash > 0) pad.squash--;
      for (const fi of match.fighters) {
        if (!fi.alive || !fi.grounded || fi.platform !== this.platforms[0] || Math.abs(fi.x - pad.x) > PAD.reach) continue;
        if (!PAD.states.includes(fi.state) || (fi.bpPadCd || 0) > t) continue;
        fi.vy = PAD.launch; fi.vx *= 0.5; fi.grounded = false; fi.platform = null; fi.setState('air');
        fi.bpPadCd = t + 30; pad.squash = 8;
        sfx('djump', 0.6, 1.4); sfx('land', 0.3, 1.8);
        for (let i = 0; i < 5; i++) match.particles.push({ shape: 'pixel2', x: pad.x + (Math.random() - 0.5) * 20, y: -6, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, life: 18, color: i % 2 ? 0x9aff8a : 0xffffff, grav: 0.1 });
      }
      this.drawPad(f, pad.x, pad.squash / 8);
    }
    // a little life on the plate: the spawn pad's glow
    f.fillStyle(0xffffff, 0.08 + 0.05 * Math.sin(t * 0.05)); f.fillRect(-24, -10, 48, 6);
    this.hzG.clear();
    return this.cycle.run(match, []);
  }

  // ---------------------------------------------------------------- the guests
  // They spawn in on a plate's pad in a column of sparkles, wander about, hop, chat now and then, and log off in a
  // puff. One spawn in GUEST.glitchOdds is the glitched one: no sparkles - it's just there, flickering, static
  // crackling round its head; it doesn't move or talk, the guests on its plate log off, and then it's gone.
  spawnGuest() {
    const free = this.guestSpr.filter((sp) => !this.guests.some((g) => g.spr === sp));
    if (!free.length) return;
    const pi = Math.floor(Math.random() * this.plates.length), [px, py, pw] = this.plates[pi];
    const glitch = Math.random() < 1 / GUEST.glitchOdds;
    if (glitch && this.guests.some((g) => g.glitch)) return;
    const x = glitch ? px + 14 + Math.random() * (pw - 28) : px + pw / 2;
    const g = { spr: free[0], plate: pi, x, y: py, vy: 0, h: 0, t: 0, glitch, state: 'spawn', dir: Math.random() < 0.5 ? -1 : 1,
      life: glitch ? GUEST.glitchLife[0] + Math.random() * (GUEST.glitchLife[1] - GUEST.glitchLife[0]) : GUEST.life[0] + Math.random() * (GUEST.life[1] - GUEST.life[0]), walk: 0 };
    g.spr.setTexture('bp_guests', glitch ? 1 : 0).setVisible(true).setAlpha(glitch ? 1 : 0);
    this.guests.push(g);
    if (glitch) {
      for (const o of this.guests) if (o !== g && o.plate === pi && o.state !== 'leave') { o.state = 'leave'; o.t = 0; }   // everyone near it logs off
      this.bubbles = this.bubbles.filter((b) => b.gst.plate !== pi);
    }
  }
  stepGuests(bg) {
    const t = this.t, P = BPAL;
    if (--this.nextGuest <= 0) { this.spawnGuest(); this.nextGuest = GUEST.every[0] + Math.floor(Math.random() * (GUEST.every[1] - GUEST.every[0])); }
    for (const g of this.guests) {
      g.t++;
      const [px, py, pw] = this.plates[g.plate];
      if (g.state === 'spawn') {                                         // sparkles rising, the guest fading in
        if (!g.glitch) {
          const k = g.t / 24;
          g.spr.setAlpha(Math.min(1, k * 1.4) * (g.t % 4 < 2 ? 1 : 0.6));
          for (let i = 0; i < 5; i++) { bg.fillStyle(i % 2 ? 0xffffff : 0xfff4a8, 1 - k); bg.fillRect(g.x - 10 + ((i * 7 + g.t * 3) % 20), g.y - ((g.t * 2 + i * 9) % 36), 2, 2); }
        }
        if (g.t >= 24) { g.state = 'idle'; g.t = 0; }
      } else if (g.state === 'leave') {                                  // a puff, and gone
        g.spr.setAlpha(Math.max(0, 1 - g.t / 10));
        for (let i = 0; i < 6; i++) { bg.fillStyle(0xffffff, 1 - g.t / 16); bg.fillRect(g.x - 8 + ((i * 11) % 16), g.y - 6 - ((i * 13 + g.t * 2) % 26), 3, 3); }
        if (g.t >= 16) g.gone = true;
      } else if (g.glitch) {                                             // it just stands there
        g.spr.setAlpha(Math.random() < 0.08 ? 0.15 : 1).setPosition(Math.round(g.x + (Math.random() < 0.1 ? (Math.random() < 0.5 ? -2 : 2) : 0)), g.y);
        if (Math.random() < 0.3) {                                        // static crackling round its head
          const hx = g.x + (Math.random() - 0.5) * 30, hy = g.y - 30 + (Math.random() - 0.5) * 12;
          bg.lineStyle(1, 0x000000, 0.8); bg.lineBetween(hx, hy, hx + (Math.random() - 0.5) * 8, hy + (Math.random() - 0.5) * 8);
        }
        if (g.t > g.life) { g.gone = true; sfx('glitch', 0.25, 0.5); }   // no puff: one frame it's there, the next it isn't
        continue;
      } else {
        if (g.t > g.life) { g.state = 'leave'; g.t = 0; continue; }
        if (g.walk <= 0 && Math.random() < 0.02) { g.walk = 30 + Math.floor(Math.random() * 60); g.dir = Math.random() < 0.5 ? -1 : 1; }
        if (g.walk > 0) { g.walk--; g.x += g.dir * 0.4; if (g.x < px + 8 || g.x > px + pw - 8) { g.dir *= -1; g.x = Math.max(px + 8, Math.min(px + pw - 8, g.x)); } }
        if (g.h === 0 && Math.random() < 0.006) g.vy = -2.6;              // a hop
        if (g.vy || g.h < 0) { g.h += g.vy; g.vy += 0.18; if (g.h >= 0) { g.h = 0; g.vy = 0; } }
        if (Math.random() < 0.0016 && this.bubbles.length < 3 && !this.bubbles.some((b) => b.gst === g)) this.bubbles.push({ gst: g, text: CHAT[Math.floor(Math.random() * CHAT.length)], life: 140 });
      }
      g.spr.setPosition(Math.round(g.x), Math.round(g.y + g.h - (g.walk > 0 && (g.t >> 3) % 2 ? 1 : 0)));
    }
    for (const g of this.guests) if (g.gone) { g.spr.setVisible(false); this.bubbles = this.bubbles.filter((b) => b.gst !== g); }
    this.guests = this.guests.filter((g) => !g.gone);
    // the chat bubbles, over whoever said it
    this.bubbles = this.bubbles.filter((b) => --b.life > 0);
    this.chatText.forEach((tx, i) => {
      const b = this.bubbles[i];
      if (!b) { tx.setVisible(false); return; }
      const x = Math.round(b.gst.x), y = Math.round(b.gst.y + b.gst.h) - 36, wpx = b.text.length * 6 + 8;
      bg.fillStyle(0xffffff, 0.92); bg.fillRect(x - wpx / 2, y - 12, wpx, 12); bg.fillTriangle(x - 3, y, x + 3, y, x, y + 4);
      bg.lineStyle(1, P.black, 0.6); bg.strokeRect(x - wpx / 2, y - 12, wpx, 12);
      tx.setText(b.text).setPosition(x, y - 2).setVisible(true);
    });
  }

  // ---------------------------------------------------------------- hazards
  // ---- ROCKET BARRAGE: crosshairs on the plate, then rockets from the tower tops
  start_rockets(match, h) {
    h.title = 'ROCKET BARRAGE - DODGE!';
    const foes = match.fighters.filter((f) => f.alive && f.state !== 'respawn');
    h.rockets = Array.from({ length: 4 }, (_, i) => {
      const tgt = foes.length && Math.random() < 0.6 ? foes[Math.floor(Math.random() * foes.length)] : null;
      const tx = tgt ? Math.max(-260, Math.min(260, Math.round(tgt.x))) : Math.round(-250 + Math.random() * 500);
      const side = i % 2 ? 1 : -1;
      return { fx: side * 216, fy: -128, tx, ty: -2, fire: 70 + i * 22, state: 'wait', x: side * 216, y: -128 };
    });
  }
  step_rockets(match, h, out) {
    const g = this.hzG, P = BPAL;
    let busy = false;
    for (const r of h.rockets) {
      if (r.state === 'done') continue;
      busy = true;
      if (r.state === 'wait') {                                           // a crosshair on the spot it's going to hit
        const k = Math.min(1, h.t / r.fire), blink = h.t % 10 < 6 ? 1 : 0.4;
        g.lineStyle(2, 0xff2a2a, blink); g.strokeCircle(r.tx, r.ty - 6, 22 - 10 * k);
        g.lineBetween(r.tx - 26, r.ty - 6, r.tx - 14, r.ty - 6); g.lineBetween(r.tx + 14, r.ty - 6, r.tx + 26, r.ty - 6); g.lineBetween(r.tx, r.ty - 32, r.tx, r.ty - 20);
        if (h.t >= r.fire) { r.state = 'fly'; sfx('whoosh', 0.6, 1.3); sfx('laser', 0.3, 0.5); match.puff(r.fx, r.fy, P.grey, 4); }
        continue;
      }
      if (r.state === 'fly') {                                            // the rocket: a grey block with a dark nose, a smoke trail
        const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy), sp = 7.5;
        if (d <= sp) { r.state = 'boom'; r.bt = 0; r.x = r.tx; r.y = r.ty; sfx('bighit', 0.8, 0.7); sfx('rumble', 0.6, 1.2); match.shake(8, 8);
          for (let i = 0; i < 8; i++) { const c = BRICK_COLS[i % 5]; match.particles.push({ x: r.x, y: r.y - 6, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, life: 40, color: c[0], size: 3, grav: 0.25 }); }
          continue; }
        r.x += dx / d * sp; r.y += dy / d * sp;
        const a = Math.atan2(dy, dx), cx = Math.cos(a), cy = Math.sin(a);
        if (h.t % 2 === 0) match.particles.push({ shape: 'smoke', x: r.x - cx * 10, y: r.y - cy * 10, vx: 0, vy: -0.2, life: 22, maxLife: 22, r: 3, color: 0xd8d8dc, grav: 0 });
        g.lineStyle(5, P.outline, 1); g.lineBetween(r.x - cx * 10, r.y - cy * 10, r.x + cx * 6, r.y + cy * 6);
        g.lineStyle(3, P.grey, 1); g.lineBetween(r.x - cx * 9, r.y - cy * 9, r.x + cx * 3, r.y + cy * 3);
        g.lineStyle(3, P.black, 1); g.lineBetween(r.x + cx * 3, r.y + cy * 3, r.x + cx * 6, r.y + cy * 6);
        g.fillStyle(P.fire[1], 1); g.fillCircle(r.x - cx * 11, r.y - cy * 11, 2 + (h.t % 3));
        out.push({ x1: r.x - 7, x2: r.x + 7, y1: r.y - 7, y2: r.y + 7, dmg: 6, angle: 60, base: 3, growth: 3, id: 'rkt' + h.id + ':' + r.fire, hazard: true });
        continue;
      }
      // the explosion: a chunky orange ball, swelling then breaking up
      r.bt++;
      const k = r.bt / 26, R = 14 + 34 * Math.min(1, r.bt / 8);
      if (r.bt > 26) { r.state = 'done'; continue; }
      for (let i = 3; i >= 0; i--) { g.fillStyle(P.fire[i], (1 - k) * (i ? 0.9 : 1)); g.fillCircle(r.x, r.y - 10, R * (0.35 + i * 0.22)); }
      if (r.bt < 6) out.push({ x1: r.x - 44, x2: r.x + 44, y1: r.y - 54, y2: r.y + 10, dmg: 13, angle: 70, base: 5.4, growth: 5.2, radial: true, cx: r.x, cy: r.y - 10, id: 'boom' + h.id + ':' + r.fire, hazard: true });
    }
    return !busy && h.t > 100;
  }

  // ---- LOOSE BRICKS: shadows grow on the plate as bricks fall from the sky
  start_bricks(match, h) {
    h.title = 'LOOSE BRICKS - TAKE COVER!';
    const xs = [];
    while (xs.length < 6) { const x = Math.round(-250 + Math.random() * 500); if (xs.every((o) => Math.abs(o - x) > 56)) xs.push(x); }
    h.bricks = xs.map((x, i) => ({ x, y: -420, vy: 0, at: 60 + i * 18, col: BRICK_COLS[Math.floor(Math.random() * 5)], state: 'wait', rot: 0, vx: 0, spin: 0 }));
  }
  step_bricks(match, h, out) {
    const g = this.hzG;
    let busy = false;
    for (const b of h.bricks) {
      if (b.state === 'gone') continue;
      busy = true;
      if (b.state === 'wait' || b.state === 'fall') {                     // its shadow on the plate, growing as it comes
        const k = Math.max(0, Math.min(1, (b.y + 420) / 418));
        g.fillStyle(0x000000, 0.15 + 0.3 * k); g.fillEllipse(b.x, -1, 12 + 26 * k, 4 + 3 * k);
      }
      if (b.state === 'wait') { if (h.t >= b.at) { b.state = 'fall'; sfx('whoosh', 0.3, 0.7); } continue; }
      if (b.state === 'fall') {
        b.vy = Math.min(11, b.vy + 0.35); b.y += b.vy;
        if (b.y >= -12) {                                                 // lands - bounces off and tumbles away
          b.y = -12; b.state = 'tumble'; b.vy = -4.5; b.vx = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2); b.spin = b.vx * 0.06;
          sfx('land', 0.8, 0.7); sfx('clang', 0.4, 1.4); match.shake(4, 5); match.puff(b.x, -2, 0xd8d8dc, 5);
        }
        out.push({ x1: b.x - 14, x2: b.x + 14, y1: b.y - 2, y2: b.y + 12, dmg: 9, angle: 72, base: 4, growth: 4.2, id: 'brick' + h.id + ':' + b.x, hazard: true });
      } else {
        b.vy += 0.35; b.y += b.vy; b.x += b.vx; b.rot += b.spin;
        if (b.y > 420) { b.state = 'gone'; continue; }
      }
      // the brick itself (rotated corners for the tumble)
      const c = b.col, ca = Math.cos(b.rot), sa = Math.sin(b.rot), cx = b.x, cy = b.y + 5;
      const pt = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca];
      const quad = (x0, y0, x1, y1, col) => { const [a1, a2] = pt(x0, y0), [b1, b2] = pt(x1, y0), [c1, c2] = pt(x1, y1), [d1, d2] = pt(x0, y1); g.fillStyle(col, 1); g.fillTriangle(a1, a2, b1, b2, c1, c2); g.fillTriangle(a1, a2, c1, c2, d1, d2); };
      quad(-15, -6, 15, 6, BPAL.outline); quad(-14, -5, 14, 5, c[0]); quad(-14, -5, 14, -3, c[1]); quad(-14, 3, 14, 5, c[2]);
      for (let s = -10; s <= 6; s += 8) quad(s, -8, s + 4, -5, c[1]);     // studs
    }
    return !busy;
  }

  // ---- LAG SPIKE: the connection flickers... everything freezes, then everyone snaps back a moment
  start_lag(match, h) { h.title = 'LAG SPIKE - CONNECTION UNSTABLE'; }
  step_lag(match, h, out) {
    const g = this.hzG, P = BPAL, cx = 0, cy = -250;
    if (h.t < 90) {                                                       // the connection bars, flickering lower
      const bars = Math.max(1, 4 - Math.floor(h.t / 25)), on = h.t % 8 < 5;
      for (let i = 0; i < 4; i++) { g.fillStyle(i < bars && on ? (bars > 2 ? 0x5ad05a : bars > 1 ? 0xffd23a : 0xff3a2a) : 0x3a3a40, 1); g.fillRect(cx - 14 + i * 8, cy - i * 5, 6, 6 + i * 5); }
      return false;
    }
    if (h.t === 90) {
      if (match.frozen > 0 || match.cutscene) return true;                 // (never in the middle of a Limit)
      match.frozen = 40;                                                  // FREEZE. (this stage stops stepping until it's over)
      sfx('glitch', 0.7, 0.6); sfx('buzz', 0.5, 0.5);
      g.fillStyle(0x000000, 0.35); g.fillRect(-700, -500, 1400, 1000);       // the whole screen dims while it hangs...
      for (let i = 0; i < 8; i++) { g.fillStyle(0xffffff, 0.25 + i * 0.09); g.fillCircle(cx + Math.cos(i * 0.785) * 12, cy + 30 + Math.sin(i * 0.785) * 12, 2.5); }   // ...a loading spinner
      return false;
    }
    if (h.t === 91) {                                                     // it caught up: everyone snaps back to where they were
      sfx('glitch', 0.8, 1.3); match.shake(3, 4);
      for (const f of match.fighters) {
        if (!f.alive || ['respawn', 'limit', 'grabbed', 'holding', 'seized', 'dying'].includes(f.state) || f.state.startsWith('ledge')) continue;
        const hist = this.hist.get(f); if (!hist || hist.length < 2) continue;
        const [ox, oy] = hist[0];
        for (let i = 0; i < 6; i++) match.particles.push({ shape: 'pixel2', x: f.x + (Math.random() - 0.5) * 20, y: f.y - Math.random() * 40, vx: 0, vy: 0, life: 14, color: i % 2 ? 0xffffff : 0x9ad0f0, grav: 0 });
        f.x = ox; f.y = oy; f.vx = f.vy = 0; f.lx = f.ly = 0;
        if (f.state === 'run' || f.state === 'idle') { f.grounded = false; f.platform = null; f.setState('air'); }
      }
      return true;
    }
    return true;
  }

  // ---- THE GRIEFER: joins the game on a tower top and throws classic gear at whoever's on the plate
  start_griefer(match, h) {
    h.title = 'A GRIEFER JOINED THE GAME!';
    h.side = Math.random() < 0.5 ? -1 : 1;                                 // which tower he stands on
    h.gx = h.side * 238; h.gy = -110;
    const pool = GRIEFER.items.slice().sort(() => Math.random() - 0.5);   // a bit of everything, in a random order
    h.queue = Array.from({ length: GRIEFER.throws }, (_, i) => pool[i % pool.length]);
    h.items = []; h.thrown = 0; h.leaveAt = 0; h.say = null;
  }
  // a classic blocky player, but a troublemaker: a backwards red cap, shades, a black shirt with a skull, a smirk.
  // Drawn clean: every block snapped to whole pixels, each part with its own outline, the throwing arm a rotated block.
  drawGriefer(g, x, y, dir, armA, alpha) {
    const P = BPAL; x = Math.round(x); y = Math.round(y);
    this.avatar(g, x, y, dir, armA, alpha, {
      legs: [0x2e3440, 0x3c4452], torso: [0x16161c, 0x24242c], skin: P.skin, skinShade: 0xd8b028,
      chest: (cx, cy) => { g.fillStyle(0xf2f3f3, alpha); g.fillRect(cx - 2, cy + 2, 4, 3); g.fillRect(cx - 2, cy + 5, 1, 1); g.fillRect(cx + 1, cy + 5, 1, 1); g.fillStyle(0x16161c, alpha); g.fillRect(cx - 1, cy + 3, 1, 1); g.fillRect(cx + 1, cy + 3, 1, 1); },   // a little skull
      head: (hx, hy) => {
        g.fillStyle(0x101014, alpha); g.fillRect(hx - 5 + (dir > 0 ? 1 : 0), hy + 3, 9, 2);                      // shades
        g.fillStyle(0x4a5aa8, alpha); g.fillRect(hx - 4 + (dir > 0 ? 1 : 0), hy + 3, 2, 1);                      // (a glint)
        g.fillStyle(0x6a3a10, alpha); g.fillRect(hx - 1 + dir, hy + 8, 3, 1); g.fillRect(hx + dir * 2 + (dir > 0 ? 1 : -1), hy + 7, 1, 1);   // a smirk
        g.fillStyle(P.outline, alpha); g.fillRect(hx - 7, hy - 4, 14, 4); g.fillRect(hx - dir * 9 - 2, hy - 2, 5, 3);   // backwards cap + brim behind
        g.fillStyle(P.red, alpha); g.fillRect(hx - 6, hy - 3, 12, 3); g.fillRect(hx - dir * 9 - 1, hy - 1, 4, 1);
        g.fillStyle(P.redLight, alpha); g.fillRect(hx - 6, hy - 3, 12, 1);
      },
    });
  }
  // a blocky avatar (the GRIEFER, the HACKER): legs, torso, head, a resting arm and a swinging one (armA radians,
  // 0 = straight out in front, + = down). Parts are crisp rectangles with 1px outlines; look = colours + extra details.
  avatar(g, x, y, dir, armA, alpha, look) {
    const P = BPAL, O = (rx, ry, w, h, c, shade) => { g.fillStyle(P.outline, alpha); g.fillRect(rx - 1, ry - 1, w + 2, h + 2); g.fillStyle(c, alpha); g.fillRect(rx, ry, w, h); if (shade != null) { g.fillStyle(shade, alpha); g.fillRect(rx, ry, Math.max(1, Math.round(w / 3)), h); } };
    O(x - 8, y - 18, 7, 18, look.legs[0], look.legs[1]); O(x + 1, y - 18, 7, 18, look.legs[0], look.legs[1]);    // legs
    const back = x - dir * 12 - 3;
    O(back, y - 34, 6, 15, look.arm || look.skin, look.arm ? look.torso[1] : look.skinShade);                   // the arm at his side
    O(x - 9, y - 35, 18, 17, look.torso[0], look.torso[1]);                                                     // torso
    if (look.chest) look.chest(x, y - 33);
    O(x - 6, y - 47, 12, 12, look.skin, look.skinShade);                                                        // head
    if (look.head) look.head(x, y - 47);
    // the throwing arm: a 6x15 block pivoting at the shoulder
    const sx = x + dir * 10, sy = y - 32, c = Math.cos(armA), sn = Math.sin(armA), L = 15, half = 3;
    const ax = c * dir, ay = sn, px = -ay, py = ax;                                                             // along the arm, across it
    const quad = (o) => [{ x: sx - px * (half + o) - ax * o, y: sy - py * (half + o) - ay * o }, { x: sx + px * (half + o) - ax * o, y: sy + py * (half + o) - ay * o },
      { x: sx + px * (half + o) + ax * (L + o), y: sy + py * (half + o) + ay * (L + o) }, { x: sx - px * (half + o) + ax * (L + o), y: sy - py * (half + o) + ay * (L + o) }];
    g.fillStyle(P.outline, alpha); g.fillPoints(quad(1), true);
    g.fillStyle(look.arm || look.skin, alpha); g.fillPoints(quad(0), true);
  }
  // one piece of gear, drawn where it is (spinning things use it.rot)
  drawGear(g, it) {
    const P = BPAL, x = it.x, y = it.y;
    if (it.kind === 'sword') {                                             // the classic sword: grey blade, crossguard, dark grip
      const c = Math.cos(it.rot), sn = Math.sin(it.rot), at = (d) => [x + c * d, y + sn * d];
      const [tx, ty] = at(14), [hx, hy] = at(-8), [gx, gy] = at(-4);
      g.lineStyle(4, P.outline, 1); g.lineBetween(hx, hy, tx, ty);
      g.lineStyle(2, 0xd8dce4, 1); g.lineBetween(gx, gy, tx, ty);
      g.lineStyle(2, 0x5a3a1a, 1); g.lineBetween(hx, hy, gx, gy);
      g.lineStyle(2, 0x8a8a96, 1); g.lineBetween(gx - sn * 5, gy + c * 5, gx + sn * 5, gy - c * 5);
    } else if (it.kind === 'ball') {                                       // the superball: bright red, a white shine
      g.fillStyle(P.outline, 1); g.fillCircle(x, y, 7); g.fillStyle(0xe8202a, 1); g.fillCircle(x, y, 6);
      g.fillStyle(0xff8a8a, 1); g.fillCircle(x - 2, y - 2, 2.5); g.fillStyle(0xffffff, 1); g.fillRect(x - 3, y - 4, 2, 2);
    } else if (it.kind === 'bomb') {                                       // the timebomb: black, a fuse, blinking red as it ticks
      const blink = it.state === 'tick' && (it.tt % (it.tt > 40 ? 6 : 14) < 3);
      g.fillStyle(P.outline, 1); g.fillCircle(x, y, 8); g.fillStyle(blink ? 0xe8202a : 0x2a2a30, 1); g.fillCircle(x, y, 7);
      g.fillStyle(0x5a5a64, 1); g.fillCircle(x - 2, y - 3, 2);
      g.lineStyle(2, 0x8a6a3a, 1); g.lineBetween(x + 3, y - 6, x + 6, y - 11);
      g.fillStyle(it.t % 4 < 2 ? 0xffd23a : 0xff7a1a, 1); g.fillCircle(x + 6, y - 12, 2);
    } else if (it.kind === 'soda') {                                       // a plain red soda can, tumbling
      const c = Math.cos(it.rot), sn = Math.sin(it.rot), at = (d) => [x + c * d, y + sn * d];
      const [ax, ay] = at(-6), [bx, by] = at(6);
      g.lineStyle(9, P.outline, 1); g.lineBetween(ax, ay, bx, by);
      g.lineStyle(7, 0xc4281c, 1); g.lineBetween(ax, ay, bx, by);
      g.lineStyle(2, 0xf2f3f3, 1); g.lineBetween(...at(-2), ...at(2));
      g.lineStyle(7, 0xc8c8ca, 1); g.lineBetween(...at(5), bx, by);
    } else if (it.kind === 'rocket') {                                     // a rocket, straight at them
      const c = Math.cos(it.rot), sn = Math.sin(it.rot);
      g.lineStyle(5, P.outline, 1); g.lineBetween(x - c * 10, y - sn * 10, x + c * 6, y + sn * 6);
      g.lineStyle(3, P.grey, 1); g.lineBetween(x - c * 9, y - sn * 9, x + c * 3, y + sn * 3);
      g.lineStyle(3, P.black, 1); g.lineBetween(x + c * 3, y + sn * 3, x + c * 6, y + sn * 6);
      g.fillStyle(P.fire[1], 1); g.fillCircle(x - c * 11, y - sn * 11, 2 + (it.t % 3));
    }
  }
  // an explosion (the timebomb, the rocket): a chunky orange ball that swells then breaks up
  drawBoom(g, it) {
    const P = BPAL, k = it.bt / 26, R = 14 + 34 * Math.min(1, it.bt / 8);
    for (let i = 3; i >= 0; i--) { g.fillStyle(P.fire[i], (1 - k) * (i ? 0.9 : 1)); g.fillCircle(it.x, it.y - 6, R * (0.35 + i * 0.22)); }
  }
  // ---- THE HACKER
  start_hacker(match, h) {
    h.title = 'A HACKER JOINED THE GAME!';
    h.x = (Math.random() < 0.5 ? -1 : 1) * 200; h.y = -150; h.phase = 'fly'; h.pt = 0; h.pass = 0; h.dir = h.x > 0 ? -1 : 1; h.say = null;
    h.name = ['xX_n0clip_Xx', 'h4x0r_2013', 'ExploitKing', 'flingbot99'][Math.floor(Math.random() * 4)];
  }
  // a hooded exploiter: a black hoodie with a green glowing trim, a dark face with green eyes, a little floating code
  drawHacker(g, x, y, dir, armA, alpha, t) {
    x = Math.round(x); y = Math.round(y);
    this.avatar(g, x, y, dir, armA, alpha, {
      legs: [0x1a1e24, 0x262c34], torso: [0x15181c, 0x22272e], skin: 0xb8c0c8, skinShade: 0x8a929c, arm: 0x15181c,
      chest: (cx, cy) => { g.fillStyle(0x5aff6a, alpha); g.fillRect(cx - 8, cy + 13, 16, 1); g.fillRect(cx - 1, cy + 1, 2, 9); },   // a glowing zip and hem
      head: (hx, hy) => {
        g.fillStyle(BPAL.outline, alpha); g.fillRect(hx - 8, hy - 3, 16, 15);                                    // the hood
        g.fillStyle(0x15181c, alpha); g.fillRect(hx - 7, hy - 2, 14, 13);
        g.fillStyle(0x06080a, alpha); g.fillRect(hx - 4, hy + 2, 9, 8);                                          // a face in shadow
        const blink = (t % 90) < 4 ? 0 : 1;
        g.fillStyle(0x5aff6a, alpha * blink); g.fillRect(hx - 3 + (dir > 0 ? 1 : 0), hy + 5, 2, 1); g.fillRect(hx + 1 + (dir > 0 ? 1 : 0), hy + 5, 2, 1);   // green eyes
        g.fillStyle(0x5aff6a, alpha); g.fillRect(hx - 8, hy - 3, 16, 1);
      },
    });
    for (let i = 0; i < 4; i++) { const k = ((t + i * 11) % 44) / 44; g.fillStyle(0x5aff6a, alpha * (1 - k)); g.fillRect(x - 14 + i * 9, y - 40 - k * 26, 2, 3); g.fillRect(x - 13 + i * 9, y - 44 - k * 26, 1, 2); }   // code drifting off him
  }
  step_hacker(match, h, out) {
    const g = this.hzG, R = Math.random, H = HACKER; h.pt++;
    const alive = match.fighters.filter((f) => f.alive && !['respawn', 'dying', 'grabbed', 'seized', 'limit', 'ledge', 'ledgeclimb'].includes(f.state));
    let armA = Math.PI / 2 - 0.3, alpha = 1, spinning = false;
    if (h.t === 1) sfx('ding', 0.5, 1.2);
    if (h.phase === 'fly') {                                               // flyhacks in over the plate, bobbing
      alpha = Math.min(1, h.pt / 16);
      h.x += (h.dir * 40 - h.x) * 0.03; h.y = -150 + h.pt * 1.2 + Math.sin(h.pt * 0.1) * 3;
      armA = -0.4;
      if (h.pt === 30) h.say = { text: HACK_CHAT[Math.floor(R() * HACK_CHAT.length)], until: h.t + 50 };
      if (h.y >= -2 || h.pt > 130) { h.y = -2; h.phase = 'fling'; h.pt = 0; sfx('glitch', 0.6, 0.7); h.say = { text: 'fling time', until: h.t + 40 }; }
    } else if (h.phase === 'fling') {                                     // FLING: a blur spinning across the plate and back
      const k = h.pt / H.passFrames, from = -h.dir * 250, to = h.dir * 250;
      h.x = from + (to - from) * (h.pass % 2 ? 1 - k : k); h.y = -2;
      spinning = true; if (h.pt % 6 === 0) sfx('whoosh', 0.35, 0.8 + R() * 0.4);
      out.push({ x1: h.x - 20, x2: h.x + 20, y1: -52, y2: 0, dmg: H.fling.dmg, angle: H.fling.angle, base: H.fling.base, growth: H.fling.growth, dirX: (h.pass % 2 ? -1 : 1) * h.dir, id: 'hack' + h.id + ':' + h.pass, hazard: true });
      if (h.pt % 2 === 0) match.particles.push({ shape: 'pixel2', x: h.x + (R() - 0.5) * 20, y: -R() * 46, vx: (R() - 0.5) * 2, vy: -R() * 2, life: 14, color: R() < 0.5 ? 0x5aff6a : 0x1a1e24, grav: 0 });
      if (h.pt >= H.passFrames) { h.pt = 0; if (++h.pass >= H.passes) { h.phase = 'swap'; sfx('glitch', 0.5, 1.4); h.say = { text: 'teleport go brrr', until: h.t + 50 }; } }
    } else if (h.phase === 'swap') {                                      // SWAP: two players trade places in a glitch beam
      armA = -0.9;
      if (h.pt === 1) { const pick = alive.slice().sort(() => R() - 0.5); h.pair = pick.slice(0, 2); }
      const pair = h.pair || [];
      if (h.pt < H.swapAt) for (const f of pair) { g.lineStyle(2, 0x5aff6a, (h.pt >> 2) % 2 ? 0.9 : 0.4); g.lineBetween(h.x + h.dir * 10, -34, f.x, f.y - 30); g.fillStyle(0x5aff6a, 0.25); g.fillRect(f.x - 14, f.y - 56, 28, 56); }
      if (h.pt === H.swapAt && pair.length === 2 && pair.every((f) => f.alive && f.state !== 'respawn')) {
        const [a, b] = pair, ax = a.x, ay = a.y;
        for (const [f, x, y] of [[a, b.x, b.y], [b, ax, ay]]) { f.x = x; f.y = y; f.vx = 0; f.vy = 0; f.grounded = false; f.platform = null; if (['idle', 'run'].includes(f.state)) f.setState('air'); match.puff(x, y - 24, 0x5aff6a, 6); }
        sfx('laser', 0.5, 1.6); match.shake(4, 6);
      }
      if (h.pt > H.swapAt + 30) { h.phase = 'ban'; h.pt = 0; sfx('curse', 0.6, 0.8); h.say = null; }
    } else if (h.phase === 'ban') {                                       // BANNED: a red stamp, he glitches out of the game
      alpha = h.pt < 30 ? 1 : Math.max(0, 1 - (h.pt - 30) / 20);
      const sy = -90, wob = h.pt < 8 ? (8 - h.pt) * 0.06 : 0;
      g.fillStyle(0xe8202a, Math.min(1, h.pt / 4)); g.fillRect(h.x - 46, sy - 10, 92, 20); g.fillStyle(0xffffff, Math.min(1, h.pt / 4)); g.fillRect(h.x - 44, sy - 8, 88, 16); g.fillStyle(0xe8202a, 1); g.fillRect(h.x - 42, sy - 6, 84, 12);
      this.hkText.setVisible(false);
      this.hkTag.setText('BANNED').setColor('#ffffff').setStroke('#8a1010', 3).setPosition(h.x, sy + 5).setRotation(wob - 0.06).setVisible(true);
      if (h.pt > 30 && h.pt % 3 === 0) match.particles.push({ shape: 'pixel2', x: h.x + (R() - 0.5) * 24, y: -R() * 50, vx: (R() - 0.5) * 3, vy: -1 - R() * 2, life: 18, color: R() < 0.5 ? 0x5aff6a : 0xe8202a, grav: 0 });
      if (h.pt > 56) { this.hkTag.setVisible(false).setRotation(0); this.hkText.setVisible(false); return true; }
    }
    // him (a spinning blur while flinging: drawn three times, offset, fading)
    if (alpha > 0) {
      if (spinning) { for (let i = 2; i >= 0; i--) this.drawHacker(g, h.x - i * 7 * (h.pass % 2 ? -h.dir : h.dir), h.y, ((h.pt >> 1) % 2 ? 1 : -1), (h.pt * 0.9) % 6.28, alpha * (1 - i * 0.3), h.t); }
      else { g.fillStyle(0x5aff6a, 0.12 * alpha); g.fillEllipse(h.x, h.y + 1, 30, 5); this.drawHacker(g, h.x, h.y, h.dir, armA, alpha, h.t); }
    }
    if (h.phase !== 'ban') {
      this.hkTag.setText(h.name).setColor('#5aff6a').setStroke('#06140a', 0).setRotation(0).setPosition(h.x, h.y - 52).setVisible(alpha > 0.3);
      if (alpha > 0.3) { const tw = h.name.length * 6 + 6; g.fillStyle(0x06140a, 0.75 * alpha); g.fillRect(h.x - tw / 2, h.y - 61, tw, 10); }   // a dark plate behind his name
      if (h.say && h.t < h.say.until) {
        const x = h.x, y = h.y - 62, wpx = h.say.text.length * 6 + 8;
        g.fillStyle(0x0a140c, 0.9); g.fillRect(x - wpx / 2, y - 12, wpx, 12); g.fillTriangle(x - 3, y, x + 3, y, x, y + 4);
        g.lineStyle(1, 0x5aff6a, 0.8); g.strokeRect(x - wpx / 2, y - 12, wpx, 12);
        this.hkText.setText(h.say.text).setColor('#5aff6a').setPosition(x, y - 2).setVisible(true);
      } else this.hkText.setVisible(false);
    }
    return false;
  }

  step_griefer(match, h, out) {
    const g = this.hzG, P = BPAL, G = GRIEFER, R = Math.random;
    const foes = match.fighters.filter((f) => f.alive && f.state !== 'respawn' && f.state !== 'dying');
    // ---- him: sparkles in, throws, then poofs out
    const fadeIn = Math.min(1, h.t / 20), fadeOut = h.leaveAt ? Math.max(0, 1 - (h.t - h.leaveAt) / 16) : 1, alpha = fadeIn * fadeOut;
    if (h.t === 1) sfx('ding', 0.5, 1.4);                                  // "joined the game"
    if (h.t < 24) for (let i = 0; i < 2; i++) match.particles.push({ shape: 'pixel2', x: h.gx + (R() - 0.5) * 30, y: h.gy - R() * 50, vx: 0, vy: -0.6, life: 16, color: i ? 0xffffff : 0x9ad0f0, grav: 0 });
    const next = G.firstAt + h.thrown * G.every, wind = h.thrown < h.queue.length ? Math.max(0, Math.min(1, 1 - (next - h.t) / 10)) : 0;
    const target = foes.length ? foes.reduce((a, b) => (Math.abs(b.x - h.gx) < Math.abs(a.x - h.gx) === (h.thrown % 2 === 0) ? b : a)) : null;   // the nearest, then the furthest, by turns
    const dir = target ? (Math.sign(target.x - h.gx) || -h.side) : -h.side;
    const armA = wind > 0 ? -Math.PI / 2 - wind * 1.2 : (h.t - next + G.every < 8 ? 0.2 : Math.PI / 2 - 0.3);   // wound up behind his head; follow-through; resting
    if (alpha > 0) {
      g.fillStyle(0x000000, 0.18 * alpha); g.fillEllipse(h.gx, h.gy + 1, 26, 4);
      this.drawGriefer(g, h.gx, h.gy, dir, armA, alpha);
    }
    // ---- his chat
    if (h.say && h.t < h.say.until && alpha > 0.5) {
      const x = h.gx, y = h.gy - 54, wpx = h.say.text.length * 6 + 8;
      g.fillStyle(0xffffff, 0.92); g.fillRect(x - wpx / 2, y - 12, wpx, 12); g.fillTriangle(x - 3, y, x + 3, y, x, y + 4);
      g.lineStyle(1, P.black, 0.6); g.strokeRect(x - wpx / 2, y - 12, wpx, 12);
      this.grText.setText(h.say.text).setPosition(x, y - 2).setVisible(true);
    } else this.grText.setVisible(false);
    // ---- a throw
    if (h.thrown < h.queue.length && h.t === next) {
      const kind = h.queue[h.thrown++], sx = h.gx + dir * 10, sy = h.gy - 36;
      const tx = target ? Math.max(-270, Math.min(270, target.x + target.vx * 18)) : (R() - 0.5) * 400, ty = target ? Math.min(0, target.y - 20) : -20;
      const it = { kind, x: sx, y: sy, t: 0, rot: 0, state: 'fly', bounces: 0, id: h.id + ':' + h.thrown };
      if (kind === 'rocket') {                                            // straight at them
        const d = Math.hypot(tx - sx, ty - sy) || 1; it.vx = (tx - sx) / d * 7.5; it.vy = (ty - sy) / d * 7.5; it.rot = Math.atan2(it.vy, it.vx);
        sfx('whoosh', 0.6, 1.3); sfx('laser', 0.3, 0.5); match.puff(sx, sy, P.grey, 3);
      } else {                                                            // lobbed: lands on them in T frames
        const T = kind === 'sword' ? 26 : 34, gr = 0.3;
        it.vx = (tx - sx) / T; it.vy = (ty - sy) / T - 0.5 * gr * T; it.grav = gr; it.spin = (kind === 'sword' ? 0.45 : 0.25) * Math.sign(it.vx || 1);
        sfx('whoosh', 0.5, kind === 'sword' ? 1.2 : 0.9);
      }
      h.items.push(it);
      if (R() < 0.6) { h.say = { text: GRIEF_CHAT[Math.floor(R() * GRIEF_CHAT.length)], until: h.t + 50 }; }
    }
    // ---- the gear in the air
    const onPlate = (x) => Math.abs(x) <= 280;
    for (const it of h.items) {
      if (it.state === 'gone') continue;
      it.t++;
      if (it.state === 'boom') {                                          // (bomb, rocket) exploding
        it.bt++; this.drawBoom(g, it);
        if (it.bt < 6) out.push({ x1: it.x - 44, x2: it.x + 44, y1: it.y - 54, y2: it.y + 10, dmg: it.kind === 'bomb' ? 14 : 12, angle: 70, base: 5.4, growth: 5.2, radial: true, cx: it.x, cy: it.y - 6, id: 'grf' + it.id, hazard: true });
        if (it.bt > 26) it.state = 'gone';
        continue;
      }
      if (it.state === 'stuck') {                                         // the sword, stuck in the plate, then gone
        if (it.t > it.until) { it.state = 'gone'; match.puff(it.x, it.y, 0xd8d8dc, 3); continue; }
        this.drawGear(g, it); continue;
      }
      if (it.state === 'tick') {                                          // the timebomb, sat on the plate, ticking
        it.tt++;
        if (it.tt % (it.tt > 40 ? 8 : 16) === 0) sfx('ding', 0.25, 2);
        if (it.tt >= 60) { it.state = 'boom'; it.bt = 0; sfx('bighit', 0.8, 0.7); sfx('rumble', 0.6, 1.2); match.shake(8, 8); }
        this.drawGear(g, it); continue;
      }
      if (it.state === 'fizz') {                                          // the soda can, burst: a fizzy spray for a moment
        it.ft++;
        if (it.ft % 2 === 0) for (let i = 0; i < 3; i++) match.particles.push({ shape: 'drop', x: it.x, y: it.y - 4, vx: (R() - 0.5) * 5, vy: -2 - R() * 4, life: 24, color: i ? 0x8a3a1a : 0xf2f3f3, grav: 0.2 });
        if (it.ft < 24) out.push({ x1: it.x - 26, x2: it.x + 26, y1: it.y - 40, y2: it.y + 4, dmg: 3, angle: 85, base: 3.4, growth: 1.6, id: 'grf' + it.id + ':' + Math.floor(it.ft / 12), hazard: true });
        if (it.ft > 30) it.state = 'gone';
        continue;
      }
      // flying
      it.x += it.vx; it.y += it.vy; if (it.grav) it.vy += it.grav; if (it.spin) it.rot += it.spin;
      if (it.kind === 'rocket') { it.rot = Math.atan2(it.vy, it.vx); if (it.t % 2 === 0) match.particles.push({ shape: 'smoke', x: it.x - Math.cos(it.rot) * 10, y: it.y - Math.sin(it.rot) * 10, vx: 0, vy: -0.2, life: 22, maxLife: 22, r: 3, color: 0xd8d8dc, grav: 0 }); }
      const landed = onPlate(it.x) && it.y >= -6 && it.vy > 0;
      if (it.kind === 'sword') {
        out.push({ x1: it.x - 12, x2: it.x + 12, y1: it.y - 12, y2: it.y + 12, dmg: 8, angle: 45, base: 3.6, growth: 3.8, dirX: Math.sign(it.vx) || 1, id: 'grf' + it.id, hazard: true });
        if (landed) { it.state = 'stuck'; it.y = -10; it.rot = -Math.PI / 2 + 0.25 * Math.sign(it.vx || 1) + Math.PI; it.until = it.t + 50; sfx('clang', 0.5, 1.2); match.puff(it.x, -2, 0xd8d8dc, 3); }
      } else if (it.kind === 'ball') {                                    // bounces along the plate, lower each time
        out.push({ x1: it.x - 8, x2: it.x + 8, y1: it.y - 8, y2: it.y + 8, dmg: 5, angle: 80, base: 3.2, growth: 2.6, id: 'grf' + it.id + ':' + it.bounces, hazard: true });
        if (landed) {
          it.y = -6; it.bounces++; it.vy = -Math.abs(it.vy) * 0.78; it.vx *= 0.95;
          sfx('land', 0.4, 1.6 + it.bounces * 0.1); match.puff(it.x, -2, 0xe8202a, 2);
          if (it.bounces > 4 || Math.abs(it.vy) < 1.5) { it.state = 'gone'; match.puff(it.x, -4, 0xe8202a, 4); sfx('dodge', 0.3, 1.8); continue; }   // out of bounce: pop
        }
      } else if (it.kind === 'bomb') {
        if (landed) { it.state = 'tick'; it.tt = 0; it.y = -8; sfx('land', 0.5, 1.2); }
      } else if (it.kind === 'soda') {
        out.push({ x1: it.x - 7, x2: it.x + 7, y1: it.y - 7, y2: it.y + 7, dmg: 4, angle: 60, base: 2.4, growth: 2.2, id: 'grf' + it.id + ':c', hazard: true });
        if (landed) { it.state = 'fizz'; it.ft = 0; it.y = -2; sfx('smoke', 0.6, 1.6); sfx('glass', 0.3, 1.4); }
      } else if (it.kind === 'rocket') {
        out.push({ x1: it.x - 7, x2: it.x + 7, y1: it.y - 7, y2: it.y + 7, dmg: 6, angle: 60, base: 3, growth: 3, id: 'grf' + it.id + ':r', hazard: true });
        const hit = foes.some((f) => Math.abs(f.x - it.x) < 14 && it.y > f.y - (f.def.body ? f.def.body.h : 50) && it.y < f.y);
        if (landed || hit) { it.state = 'boom'; it.bt = 0; if (landed) it.y = -2; sfx('bighit', 0.8, 0.7); sfx('rumble', 0.6, 1.2); match.shake(8, 8); continue; }
      }
      if (it.y > 60 || Math.abs(it.x) > 340) { it.state = 'gone'; continue; }        // off the edge: gone
      if (it.state !== 'gone') this.drawGear(g, it);
    }
    // ---- done throwing and everything's landed: he logs off
    const busy = h.items.some((it) => it.state !== 'gone');
    if (h.thrown >= h.queue.length && !busy && !h.leaveAt) {
      h.leaveAt = h.t; sfx('dodge', 0.5, 0.8);
      h.say = { text: 'gtg bye', until: h.t + 16 };
    }
    if (h.leaveAt && h.t === h.leaveAt + 8) for (let i = 0; i < 10; i++) match.particles.push({ shape: 'smoke', x: h.gx + (R() - 0.5) * 20, y: h.gy - R() * 44, vx: (R() - 0.5) * 1.5, vy: -0.4, life: 20, maxLife: 20, r: 4, color: 0xffffff, grav: 0 });
    if (h.leaveAt && h.t > h.leaveAt + 16) { this.grText.setVisible(false); return true; }
    return false;
  }
}

// Miniature of BASEPLATE 2012 drawn into a box (x, y, w, h), for the stage select screen.
export function drawBaseplatePreview(g, x, y, w, h) {
  const P = BPAL, u = w / 100, v = h / 100;
  const bh = Math.ceil(h / P.sky.length);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(P.cloud, 1); g.fillRect(x + 8 * u, y + 10 * v, 22 * u, 4 * v); g.fillRect(x + 62 * u, y + 6 * v, 26 * u, 4 * v);
  g.fillStyle(P.plateSide, 1); g.fillRect(x + 6 * u, y + 76 * v, 88 * u, 6 * v);                       // the plate
  g.fillStyle(P.plate, 1); g.fillRect(x + 6 * u, y + 73 * v, 88 * u, 3 * v);
  g.fillStyle(P.stud, 1); for (let i = 0; i < 22; i++) g.fillRect(x + (7 + i * 4) * u, y + 71.5 * v, 2 * u, 1.5 * v);
  g.fillStyle(P.red, 1); g.fillRect(x + 8 * u, y + 46 * v, 16 * u, 27 * v); g.fillStyle(P.redLight, 1); g.fillRect(x + 8 * u, y + 46 * v, 16 * u, 2 * v);   // towers
  g.fillStyle(P.blue, 1); g.fillRect(x + 76 * u, y + 46 * v, 16 * u, 27 * v); g.fillStyle(P.blueLight, 1); g.fillRect(x + 76 * u, y + 46 * v, 16 * u, 2 * v);
  g.fillStyle(P.grey, 1); g.fillRect(x + 40 * u, y + 30 * v, 20 * u, 4 * v); g.fillStyle(P.greyLight, 1); g.fillRect(x + 40 * u, y + 30 * v, 20 * u, 1 * v);   // the brick
  // a guest on the plate
  g.fillStyle(P.legs, 1); g.fillRect(x + 47 * u, y + 66 * v, 4 * u, 7 * v);
  g.fillStyle(P.shirt, 1); g.fillRect(x + 46 * u, y + 60 * v, 6 * u, 6 * v);
  g.fillStyle(P.skin, 1); g.fillRect(x + 47 * u, y + 55 * v, 4 * u, 5 * v); g.fillRect(x + 44.5 * u, y + 60 * v, 1.5 * u, 6 * v); g.fillRect(x + 52 * u, y + 60 * v, 1.5 * u, 6 * v);
}
