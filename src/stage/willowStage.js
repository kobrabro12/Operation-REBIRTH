// 13 WILLOW LANE: a 90s slasher movie set. A big suburban house on a stormy night in 1996 - the party's over, the
// power's flickering, the phone keeps ringing, and someone in a cracked porcelain doll's face and a rain slicker is in
// the house.
// You fight on the front lawn and porch; the porch roof (left), the upstairs balcony (right) and the dormer up top
// are the ledges. Behind: rain, lightning over a row of dark houses, a TV glowing blue through the front window.
// An original homage - no real movie, killer or mask. Locked until the shopkeeper's code 13 (stage entry `secret`).
// Music: 'bgm_slasher' (tools/audio/slasher_music.py).
// Hazards (HazardCycle), all done by THE CALLER (drawn in code: `killer()`):
//   THE CALL     the phone on the porch rings and rings - then the front door bursts open and he charges across the lawn
//   BEHIND YOU   his shape slowly fades in right behind one fighter (following them) - then the knife comes down
//   THE STALK    he walks the length of the lawn, slow and steady, slashing at anyone who gets close. He can't be stopped
// Ambience: rain, lightning (with thunder) that now and then shows him standing in the upstairs window.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const WPAL = {
  sky: [0x0a0a1e, 0x10122a, 0x161a36, 0x1e2242, 0x262a4c, 0x2e3254], moon: 0xd8dce8,
  siding: 0x4a4e66, sidingLit: 0x5c6280, sidingDark: 0x34364a, trim: 0xd8d8e0, trimDark: 0x9a9aaa, roof: 0x24222e, roofLit: 0x34323e,
  glass: 0x10121e, lamp: 0xffd890, tv: 0x6a9aff, grass: 0x1e3a24, grassLit: 0x2e5232, dirt: 0x2a1e1a, dirtDark: 0x1a1210,
  wood: 0x5a3e2a, woodLit: 0x7a563a, fence: 0xc8c8d0, rain: 0x9aa8d0, blood: 0x8a0a12, outline: 0x06060c,
  coat: 0x1e2a1a, coatLit: 0x34442c, hat: 0x161e12, mask: 0xf0e8e0, maskShade: 0xc0b4a8, blade: 0xdce2ec,
};

// THE CALL: how long the phone rings, how fast he charges and for how long, and how hard he hits
const CALL = { ring: 150, speed: 6.4, run: 80, dmg: 14, angle: 40, base: 5.4, growth: 5.0 };
// BEHIND YOU: how long his shape takes to fade in behind them, the wind-up, and the stab
const BEHIND = { fade: 110, windup: 18, dmg: 17, angle: 60, base: 5.6, growth: 5.4, reach: 34 };
// THE STALK: his walking speed, how close you have to get before he slashes, how often he can, and the slash
const STALK = { speed: 1.05, near: 46, every: 48, dmg: 11, angle: 35, base: 4.6, growth: 4.2 };
// the lightning: how often (frames, on average) and how often (1 in N) it shows him in the upstairs window
const STORM = { every: 360, window: 3 };

export class WillowStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -258, x2: 258, y: 0, solid: true, bottom: 70 },     // the lawn and the porch
      { x1: -212, x2: -96, y: -94, solid: false },             // the porch roof
      { x1: 96, x2: 208, y: -104, solid: false },              // the upstairs balcony
      { x1: -44, x2: 44, y: -186, solid: false },              // the dormer, up on the roof
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -60, y: 0 }, { x: 60, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_slasher';
    this.t = 0; this.flash = 0; this.nextBolt = 200; this.inWindow = false;
    this.door = { x: -8, open: 0 };                           // the front door (0 shut .. 1 wide open)
    this.cycle = new HazardCycle(this, ['call', 'behind', 'stalk'], { color: '#ff2a3a', stroke: '#0a0004', gap: 600, jitter: 260, first: 460 });
  }

  // ---------------------------------------------------------------- drawing (built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = WPAL;
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 70, 1440, 71); });
    sky.fillStyle(P.sky[5], 1); sky.fillRect(-400, 360, 1440, 300);
    sky.fillStyle(P.moon, 0.9); sky.fillCircle(500, 70, 18); sky.fillStyle(P.sky[1], 0.55); sky.fillEllipse(500, 74, 90, 16); sky.fillEllipse(470, 62, 60, 10);   // the moon behind thin cloud
    bgLayer.push(sky);
    this.skyFlash = s.add.graphics().setScrollFactor(0); bgLayer.push(this.skyFlash);         // the lightning lights the sky
    // the street: a row of dark houses, a couple of porch lights, bare trees, a streetlamp
    const far = s.add.graphics().setScrollFactor(0.15); far.y = -40;
    far.fillStyle(0x0c0c18, 1); far.fillRect(-300, 300, 1400, 400);
    for (let i = 0; i < 12; i++) {
      const x = -260 + i * 110 + (i * 37) % 30, w = 70 + (i * 13) % 30, h = 46 + (i * 29) % 26, y = 300;
      far.fillStyle(0x14142a, 1); far.fillRect(x, y - h, w, h); far.fillTriangle(x - 6, y - h, x + w + 6, y - h, x + w / 2, y - h - 26);
      for (let k = 0; k < 3; k++) { const lit = (i * 3 + k) % 7 === 0; far.fillStyle(lit ? P.lamp : 0x0a0a16, lit ? 0.8 : 1); far.fillRect(x + 8 + k * 22, y - h + 12, 9, 10); }
    }
    for (let i = 0; i < 9; i++) {                                                                // bare trees
      const x = -200 + i * 150 + (i * 53) % 40, y = 300;
      far.lineStyle(3, 0x08080e, 1); far.lineBetween(x, y, x, y - 90);
      far.lineStyle(1, 0x08080e, 1); for (let k = 0; k < 6; k++) { const by = y - 40 - k * 9, d = (k % 2 ? 1 : -1); far.lineBetween(x, by, x + d * (16 + k * 2), by - 14); far.lineBetween(x + d * (10 + k), by - 9, x + d * (14 + k), by - 22); }
    }
    bgLayer.push(far);
    this.rainG = s.add.graphics().setScrollFactor(0); bgLayer.push(this.rainG);
    // the house and the lawn (world layer)
    const g = s.add.graphics(); this.house(g); worldLayer.push(g);
    this.liveG = s.add.graphics(); worldLayer.push(this.liveG);    // the door, the windows, the phone - things that change
    this.hzG = s.add.graphics(); worldLayer.push(this.hzG);        // THE CALLER
    this.frontRain = s.add.graphics().setScrollFactor(0); worldLayer.push(this.frontRain);   // rain in front of everything
    this.cycle.makeBanner(s);
  }

  // the house: two storeys of grey clapboard, white trim, a porch with posts and a roof, a balcony upstairs, a gable roof
  // with a dormer on top; the lawn with a picket fence, a mailbox with 13 on it, a carved pumpkin on the steps
  house(g) {
    const P = WPAL, F = this.platforms[0];
    // the lawn island and its underside
    const body = [[F.x1, 0], [F.x2, 0], [F.x2 - 8, 22], [F.x2 - 40, 42], [160, 58], [80, 68], [0, 72], [-90, 66], [-170, 54], [-224, 36], [F.x1 + 10, 16]];
    g.fillStyle(P.outline, 1); g.fillPoints(body.map(([x, y]) => ({ x: x * 1.02, y: y + 3 })), true);
    g.fillStyle(P.dirt, 1); g.fillPoints(body.map(([x, y]) => ({ x, y })), true);
    for (let i = 0; i < 30; i++) { g.fillStyle(P.dirtDark, 1); g.fillRect(-220 + (i * 61) % 440, 10 + (i * 23) % 50, 4, 2); }
    for (const [x, y] of [[-190, 40], [-60, 66], [100, 62], [200, 34]]) { g.lineStyle(1, 0x3a2a1a, 1); g.lineBetween(x, y, x - 3, y + 16); g.lineBetween(x - 3, y + 16, x + 2, y + 24); }   // roots
    // the house walls (behind the lawn's front edge), floors and windows
    const hx1 = -228, hx2 = 228, top = -150;
    g.fillStyle(P.siding, 1); g.fillRect(hx1, top, hx2 - hx1, -top);
    for (let y = top + 4; y < 0; y += 6) { g.fillStyle(P.sidingDark, 1); g.fillRect(hx1, y, hx2 - hx1, 1); g.fillStyle(P.sidingLit, 1); g.fillRect(hx1, y + 1, hx2 - hx1, 1); }   // clapboard
    g.fillStyle(P.trim, 1); g.fillRect(hx1, top, 4, -top); g.fillRect(hx2 - 4, top, 4, -top); g.fillRect(hx1, -98, hx2 - hx1, 4);   // corner boards, the band between floors
    // the gable roof and the dormer on top
    g.fillStyle(P.roof, 1); g.fillTriangle(hx1 - 14, top, hx2 + 14, top, 0, top - 92);
    for (let k = 1; k < 8; k++) { g.lineStyle(1, P.roofLit, 0.6); const y = top - k * 11, w = (hx2 + 14) * (1 - k * 11 / 92); g.lineBetween(-w, y, w, y); }   // shingle rows
    g.lineStyle(2, P.trim, 1); g.lineBetween(hx1 - 14, top, 0, top - 92); g.lineBetween(0, top - 92, hx2 + 14, top);
    const D = this.platforms[3];
    g.fillStyle(P.siding, 1); g.fillRect(D.x1 + 6, D.y, D.x2 - D.x1 - 12, 40); g.fillStyle(P.roof, 1); g.fillRect(D.x1, D.y - 2, D.x2 - D.x1, 6);
    g.fillStyle(P.trim, 1); g.fillRect(D.x1, D.y, D.x2 - D.x1, 2);
    g.fillStyle(P.trim, 1); g.fillRect(-12, D.y + 10, 24, 22); g.fillStyle(P.glass, 1); g.fillRect(-10, D.y + 12, 20, 18);   // the attic window (lit live)
    // the porch (left): its roof is a ledge, held up by white posts; a swing; the front steps
    const PR = this.platforms[1];
    g.fillStyle(P.outline, 1); g.fillRect(PR.x1 - 2, PR.y - 2, PR.x2 - PR.x1 + 4, 10);
    g.fillStyle(P.roof, 1); g.fillRect(PR.x1, PR.y, PR.x2 - PR.x1, 6); g.fillStyle(P.trim, 1); g.fillRect(PR.x1, PR.y + 6, PR.x2 - PR.x1, 2);
    for (const x of [PR.x1 + 4, PR.x1 + 58, PR.x2 - 8]) { g.fillStyle(P.trim, 1); g.fillRect(x, PR.y + 8, 4, -PR.y - 8); g.fillStyle(P.trimDark, 1); g.fillRect(x + 3, PR.y + 8, 1, -PR.y - 8); }
    g.lineStyle(1, P.trimDark, 1); g.lineBetween(PR.x1 + 18, PR.y + 8, PR.x1 + 18, -22); g.lineBetween(PR.x1 + 46, PR.y + 8, PR.x1 + 46, -22);   // the porch swing's chains
    g.fillStyle(P.wood, 1); g.fillRect(PR.x1 + 14, -24, 36, 4); g.fillRect(PR.x1 + 14, -34, 3, 10);
    g.fillStyle(P.wood, 1); g.fillRect(-212, -6, 120, 6); g.fillStyle(P.woodLit, 1); g.fillRect(-212, -6, 120, 1);   // the porch boards
    // the upstairs balcony (right): a ledge with a railing, French doors behind it
    const B = this.platforms[2];
    g.fillStyle(P.outline, 1); g.fillRect(B.x1 - 2, B.y - 1, B.x2 - B.x1 + 4, 9);
    g.fillStyle(P.wood, 1); g.fillRect(B.x1, B.y, B.x2 - B.x1, 6); g.fillStyle(P.trim, 1); g.fillRect(B.x1, B.y + 6, B.x2 - B.x1, 2);
    g.fillStyle(P.trim, 1); g.fillRect(B.x1, B.y - 16, B.x2 - B.x1, 2); for (let x = B.x1 + 2; x < B.x2; x += 7) g.fillRect(x, B.y - 15, 2, 15);   // the railing
    g.fillStyle(P.trim, 1); g.fillRect(132, -146, 40, 40); g.fillStyle(P.glass, 1); g.fillRect(134, -144, 17, 38); g.fillRect(153, -144, 17, 38);   // French doors
    // downstairs: the big front window (the TV glows through it, live) and the front door (live)
    g.fillStyle(P.trim, 1); g.fillRect(52, -72, 64, 50); g.fillStyle(P.glass, 1); g.fillRect(55, -69, 58, 44);
    g.fillStyle(P.trim, 1); g.fillRect(-24, -76, 34, 76);                                                   // the door frame
    g.fillStyle(P.trim, 1); g.fillRect(-190, -150, 36, 40); g.fillStyle(P.glass, 1); g.fillRect(-187, -147, 30, 34);   // the upstairs window (he's sometimes in it)
    // the front steps, the pumpkin, the picket fence, the mailbox
    for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? P.woodLit : P.wood, 1); g.fillRect(-30 + k * 2, -6 + k * 2, 46 - k * 4, 2); }
    g.fillStyle(0xc8601a, 1); g.fillEllipse(-46, -6, 16, 12); g.fillStyle(0x8a3a10, 1); g.fillRect(-47, -12, 2, 2); g.fillStyle(0x2a5a1a, 1); g.fillRect(-47, -14, 2, 3);
    g.fillStyle(0xffd060, 1); g.fillTriangle(-51, -8, -48, -8, -49.5, -10); g.fillTriangle(-44, -8, -41, -8, -42.5, -10); g.fillRect(-50, -4, 8, 1);   // its carved face, lit
    g.fillStyle(P.grass, 1); g.fillRect(F.x1, 0, F.x2 - F.x1, 6); for (let x = F.x1; x < F.x2; x += 4) { g.fillStyle(x % 8 ? P.grassLit : P.grass, 1); g.fillRect(x, -2 - (x % 3 === 0 ? 1 : 0), 2, 3); }
    for (const [x0, x1] of [[F.x1 + 2, -120], [70, F.x2 - 2]]) for (let x = x0; x < x1; x += 9) { g.fillStyle(P.fence, 0.85); g.fillRect(x, -16, 4, 16); g.fillTriangle(x, -16, x + 4, -16, x + 2, -19); }
    for (const [x0, x1] of [[F.x1 + 2, -120], [70, F.x2 - 2]]) { g.fillStyle(P.fence, 0.85); g.fillRect(x0, -12, x1 - x0, 2); g.fillRect(x0, -5, x1 - x0, 2); }
    const mx = F.x2 - 24;                                                                                    // the mailbox, 13 on its side
    g.fillStyle(P.wood, 1); g.fillRect(mx - 1, -20, 3, 20); g.fillStyle(0x2a2a38, 1); g.fillRect(mx - 9, -30, 18, 10); g.fillCircle(mx, -30, 9);
    g.fillStyle(0xc8201e, 1); g.fillRect(mx + 8, -36, 2, 8); g.fillRect(mx + 8, -36, 5, 3);
    g.fillStyle(P.trim, 1); g.fillRect(mx - 6, -28, 1, 5); g.fillRect(mx - 3, -28, 3, 1); g.fillRect(mx - 1, -28, 1, 5); g.fillRect(mx - 3, -26, 3, 1); g.fillRect(mx - 3, -24, 3, 1);   // 13
  }

  // ---------------------------------------------------------------- THE CALLER
  // a tall figure in a dark green rain slicker and a wide-brimmed rain hat, wearing a cracked porcelain doll's face - rosy
  // painted cheeks, a tiny painted red smile, painted lashes round the dark eye holes - and carrying a kitchen knife.
  // pose: 'walk' (with a step phase), 'raise' (knife up), 'stab' (knife thrust out), 'stand'. Feet at x, y.
  killer(g, x, y, dir, pose, alpha = 1, step = 0) {
    const P = WPAL, d = dir, a = alpha;
    const lean = pose === 'stab' ? 4 : pose === 'raise' ? -1 : 1, sw = pose === 'walk' ? Math.sin(step) * 4 : 0;
    g.fillStyle(0x14140e, a); g.fillRect(x - 5 + sw, y - 16, 4, 16); g.fillRect(x + 1 - sw, y - 16, 4, 16);                           // boots and legs
    g.fillStyle(P.coat, a); g.fillTriangle(x - 12 + lean * d, y - 10, x + 12 + lean * d, y - 10, x + lean * d, y - 46);                    // the slicker, flaring out
    g.fillRect(x - 8 + lean * d, y - 44, 16, 32);
    g.fillStyle(P.coatLit, a); g.fillRect(x - 7 + lean * d + (d > 0 ? 0 : 12), y - 42, 2, 28);                                            // the wet sheen down one side
    g.fillStyle(0xb8a040, a); for (let k = 0; k < 3; k++) g.fillRect(x + lean * d - 1 + d * 3, y - 38 + k * 8, 2, 2);                      // its brass toggles
    const hx = x + (lean + 1) * d, hy = y - 51;
    g.fillStyle(P.mask, a); g.fillEllipse(hx + d * 2, hy + 1, 11, 13);                                                                     // the doll's face
    g.fillStyle(P.maskShade, a); g.fillRect(hx + d * 2 - (d > 0 ? 5 : -4), hy - 3, 1, 9);
    g.fillStyle(0xe88a9a, a * 0.85); g.fillCircle(hx + d * 0, hy + 3, 1.5); g.fillCircle(hx + d * 6, hy + 3, 1.5);                          // rosy painted cheeks
    g.fillStyle(P.outline, a); g.fillCircle(hx + d * 1, hy - 1, 1.3); g.fillCircle(hx + d * 5, hy - 1, 1.3);                              // the dark eye holes
    g.fillRect(hx + d * 1 - 1, hy - 3, 1, 1); g.fillRect(hx + d * 1 + 1, hy - 3, 1, 1); g.fillRect(hx + d * 5 - 1, hy - 3, 1, 1); g.fillRect(hx + d * 5 + 1, hy - 3, 1, 1);   // painted lashes
    g.fillStyle(0xc8202a, a); g.fillRect(hx + d * 3 - 1, hy + 5, 3, 1);                                                                    // the tiny painted smile
    g.lineStyle(1, P.maskShade, a); g.lineBetween(hx + d * 4, hy - 6, hx + d * 2, hy); g.lineBetween(hx + d * 2, hy, hx + d * 3, hy + 3);   // the crack
    g.fillStyle(P.hat, a); g.fillRect(hx - 9 + d, hy - 7, 20, 3); g.fillEllipse(hx + d, hy - 9, 13, 7);                                   // the wide-brimmed rain hat
    g.fillStyle(P.coatLit, a); g.fillRect(hx - 9 + d, hy - 7, 20, 1);
    // the knife arm
    const ax = hx, ay = y - 36; let kx, ky; const kl = 11;
    if (pose === 'raise') { kx = x + d * 4; ky = y - 66; }
    else if (pose === 'stab') { kx = x + d * 22; ky = y - 34; }
    else { kx = x + d * 9; ky = y - 22 + Math.sin(step) * 1.5; }
    g.lineStyle(4, P.coat, a); g.lineBetween(ax, ay, kx, ky);
    g.fillStyle(0x0a0a0a, a); g.fillCircle(kx, ky, 2.5);                                                                                   // the glove
    const ang = pose === 'raise' ? -Math.PI / 2 - d * 0.3 : pose === 'stab' ? (d > 0 ? 0 : Math.PI) : (d > 0 ? 0.6 : Math.PI - 0.6);
    g.lineStyle(2, P.blade, a); g.lineBetween(kx, ky, kx + Math.cos(ang) * kl, ky + Math.sin(ang) * kl);                                  // the blade
    g.fillStyle(0xffffff, a); g.fillRect(kx + Math.cos(ang) * (kl - 2), ky + Math.sin(ang) * (kl - 2), 1, 1);
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    this.hzG.clear();
    this.ambience(match);
    return this.cycle.run(match, []);
  }
  ambience(match) {
    const t = this.t, P = WPAL, L = this.liveG, r = this.rainG, fr = this.frontRain, sf = this.skyFlash;
    L.clear(); r.clear(); fr.clear(); sf.clear();
    // lightning: a flash across the sky, thunder a moment later - and sometimes him, in the upstairs window
    if (--this.nextBolt <= 0) { this.flash = 14; this.thunderAt = t + 20 + Math.floor(Math.random() * 30); this.nextBolt = STORM.every / 2 + Math.floor(Math.random() * STORM.every); this.inWindow = Math.random() < 1 / STORM.window; }
    if (this.thunderAt === t) sfx('thunder', 0.45, 0.7 + Math.random() * 0.2);
    if (this.flash > 0) { this.flash--; sf.fillStyle(0xdce4ff, (this.flash % 5 > 1 ? 0.55 : 0.2) * this.flash / 14); sf.fillRect(0, 0, 640, 360); }
    const lit = this.flash > 6;
    // the windows: the TV's blue flicker downstairs; the attic glowing; the upstairs window - dark, or lit by lightning
    const tv = 0.45 + 0.25 * Math.sin(t * 0.7) * Math.sin(t * 0.13) + (t % 47 < 3 ? 0.25 : 0);
    L.fillStyle(P.tv, tv); L.fillRect(55, -69, 58, 44); L.fillStyle(0xffffff, tv * 0.25); L.fillRect(70, -60, 28, 20);
    L.fillStyle(P.lamp, 0.5 + 0.1 * Math.sin(t * 0.05)); L.fillRect(-10, this.platforms[3].y + 12, 20, 18);
    if (lit) { L.fillStyle(0xdce4ff, 0.8); L.fillRect(-187, -147, 30, 34); if (this.inWindow) this.killer(L, -172, -110, 1, 'stand', 0.95); }
    // the front door: shut, or swinging open (THE CALL)
    const D = this.door, ow = Math.round(30 * (1 - D.open));
    L.fillStyle(0x080810, 1); L.fillRect(-21, -73, 28, 73);
    L.fillStyle(0x6a2a22, 1); L.fillRect(-21, -73, Math.max(2, ow), 73); L.fillStyle(0x8a3a2e, 1); L.fillRect(-21, -73, Math.max(1, ow) / 3, 73);
    if (ow > 8) { L.fillStyle(0xd8b040, 1); L.fillRect(-21 + ow - 5, -38, 2, 2); }
    // the phone on its little table on the porch: shaking while it rings
    const ph = this.ringing ? Math.round(Math.sin(t * 2.2)) : 0;
    L.fillStyle(P.wood, 1); L.fillRect(-90, -16, 16, 3); L.fillRect(-88, -13, 2, 13); L.fillRect(-78, -13, 2, 13);
    L.fillStyle(0xd8d0c0, 1); L.fillRect(-88 + ph, -21, 12, 5); L.fillStyle(0xb8b0a0, 1); L.fillRect(-89 + ph, -24, 14, 3);
    if (this.ringing && t % 20 < 12) { L.lineStyle(1, 0xffffff, 0.8); for (const s of [-1, 1]) { L.lineBetween(-82 + s * 9, -26, -82 + s * 12, -29); L.lineBetween(-82 + s * 10, -21, -82 + s * 14, -21); } }
    // rain: long slanted streaks, far and near
    for (let i = 0; i < 90; i++) { const x = ((i * 89 + t * 3.2) % 720) - 40, y = ((i * 47 + t * 9) % 400) - 20; r.lineStyle(1, P.rain, 0.25); r.lineBetween(x, y, x - 3, y + 10); }
    for (let i = 0; i < 26; i++) { const x = ((i * 131 + t * 4.2) % 720) - 40, y = ((i * 71 + t * 13) % 420) - 30; fr.lineStyle(1, P.rain, 0.4); fr.lineBetween(x, y, x - 4, y + 16); }
  }

  // ---------------------------------------------------------------- hazards
  // THE CALL: the phone on the porch rings and rings. When it stops, the front door bursts open and he charges out across
  // the lawn - towards whichever side has more of you - knife out. Get off the ground.
  start_call(match, h) {
    h.title = 'THE PHONE IS RINGING...';
    this.ringing = true;
    const live = match.fighters.filter((f) => f.alive);
    h.dir = live.filter((f) => f.x > this.door.x).length >= live.length / 2 ? 1 : -1;
  }
  step_call(match, h, out) {
    const g = this.hzG;
    if (h.t < CALL.ring) { if (h.t % 33 === 1) sfx('phone', 0.5); return false; }
    if (h.t === CALL.ring) { this.ringing = false; }
    const t2 = h.t - CALL.ring;
    if (t2 < 30) { if (t2 === 20) sfx('buzz', 0.3, 0.5); return false; }                          // silence... then
    const t3 = t2 - 30;
    if (t3 === 0) { this.door.open = 1; sfx('bighit', 0.7, 0.6); sfx('scream', 0.25, 0.8); match.shake(6, 8); h.x = this.door.x; }
    if (t3 < CALL.run) {
      h.x += h.dir * CALL.speed * Math.min(1, t3 / 8);
      this.killer(g, h.x, 0, h.dir, t3 % 16 < 8 ? 'stab' : 'walk', 1, t3 * 0.6);
      out.push({ x1: h.x - 12 + h.dir * 6, x2: h.x + 12 + h.dir * 18, y1: -54, y2: 0, dmg: CALL.dmg, angle: CALL.angle, base: CALL.base, growth: CALL.growth, id: 'call' + h.id, hazard: true, dirX: h.dir });
      if (t3 % 6 === 0) match.particles.push({ x: h.x - h.dir * 8, y: -2, vx: -h.dir, vy: -0.6, life: 14, color: WPAL.grassLit, size: 2, grav: 0.1 });
      return false;
    }
    const k = (t3 - CALL.run) / 30;                                                                  // gone into the dark
    if (k < 1) { this.killer(g, h.x, 0, h.dir, 'walk', 1 - k, t3 * 0.6); return false; }
    this.door.open = Math.max(0, this.door.open - 0.05);
    return this.door.open <= 0;
  }

  // BEHIND YOU: his shape fades in right behind one of you - keeping behind them as they move - then the knife comes down
  start_behind(match, h) {
    h.title = 'BEHIND YOU!';
    const live = match.fighters.filter((f) => f.alive && f.state !== 'respawn');
    h.target = live.length ? live[Math.floor(Math.random() * live.length)] : null;
    sfx('buzz', 0.25, 0.4);
  }
  step_behind(match, h, out) {
    const g = this.hzG, T = h.target;
    if (!T || !T.alive) return h.t > 30;
    if (h.t <= BEHIND.fade) { h.dir = T.facing || 1; h.x = T.x - h.dir * 26; h.y = T.y; }               // keeping just behind them
    const a = Math.min(1, h.t / BEHIND.fade);
    if (h.t <= BEHIND.fade) { this.killer(g, h.x, h.y, h.dir, 'stand', a * 0.85); if (h.t === BEHIND.fade - 30) sfx('glass', 0.3, 0.6); return false; }
    const t2 = h.t - BEHIND.fade;
    if (t2 < BEHIND.windup) { this.killer(g, h.x, h.y, h.dir, 'raise', 1); if (t2 === 0) sfx('scream', 0.3, 1.1); return false; }
    const t3 = t2 - BEHIND.windup;
    if (t3 < 12) {
      this.killer(g, h.x, h.y, h.dir, 'stab', 1);
      if (t3 === 0) sfx('slash', 0.8, 0.8);
      if (t3 < 5) out.push({ x1: h.x + (h.dir > 0 ? 0 : -BEHIND.reach - 10), x2: h.x + (h.dir > 0 ? BEHIND.reach + 10 : 0), y1: h.y - 60, y2: h.y, dmg: BEHIND.dmg, angle: BEHIND.angle, base: BEHIND.base, growth: BEHIND.growth, id: 'behind' + h.id, hazard: true, dirX: h.dir });
      return false;
    }
    const k = (t3 - 12) / 24;
    if (k < 1) { this.killer(g, h.x, h.y, h.dir, 'stand', 1 - k); return false; }
    return true;
  }

  // THE STALK: he walks in from one end of the lawn to the other, slow and steady, slashing at anyone who comes near.
  // Nothing you do stops him - jump over, or stay up high until he's gone.
  start_stalk(match, h) {
    h.title = 'HE\'S IN THE YARD...';
    const F = this.platforms[0];
    h.dir = Math.random() < 0.5 ? 1 : -1; h.x = h.dir > 0 ? F.x1 - 20 : F.x2 + 20; h.end = h.dir > 0 ? F.x2 + 20 : F.x1 - 20;
    h.cool = 0; h.slash = -1;
  }
  step_stalk(match, h, out) {
    const g = this.hzG;
    const near = match.fighters.find((f) => f.alive && f.grounded && Math.abs(f.y) < 4 && Math.abs(f.x - (h.x + h.dir * 20)) < STALK.near);
    if (h.slash < 0 && near && h.cool <= 0) { h.slash = 0; h.cool = STALK.every; sfx('swing', 0.6, 0.7); }
    if (h.cool > 0) h.cool--;
    if (h.slash >= 0) {
      const s = h.slash++;
      this.killer(g, h.x, 0, h.dir, s < 10 ? 'raise' : 'stab', 1);
      if (s >= 10 && s < 15) out.push({ x1: h.x + (h.dir > 0 ? 0 : -44), x2: h.x + (h.dir > 0 ? 44 : 0), y1: -60, y2: 0, dmg: STALK.dmg, angle: STALK.angle, base: STALK.base, growth: STALK.growth, id: 'stalk' + h.id + ':' + Math.floor(h.t / STALK.every), hazard: true, dirX: h.dir });
      if (s === 10) sfx('slash', 0.7, 0.9);
      if (s > 22) h.slash = -1;
    } else {
      h.x += h.dir * STALK.speed;
      this.killer(g, h.x, 0, h.dir, 'walk', 1, h.t * 0.18);
      if (h.t % 70 === 0) sfx('land', 0.25, 0.5);                                                   // heavy, slow footsteps
    }
    return h.dir > 0 ? h.x > h.end : h.x < h.end;
  }
}

// Miniature of 13 WILLOW LANE for the select screen: a stormy night, the grey house with its lit attic window and a blue
// TV glow, the porch and balcony, the picket fence - and a doll's face in the upstairs window
export function drawWillowPreview(g, x, y, w, h) {
  const P = WPAL, bh = Math.ceil(h / 6);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(P.moon, 0.8); g.fillCircle(x + w * 0.82, y + h * 0.16, 7);
  g.lineStyle(1, 0xdce4ff, 0.8); g.lineBetween(x + w * 0.12, y, x + w * 0.16, y + h * 0.18); g.lineBetween(x + w * 0.16, y + h * 0.18, x + w * 0.13, y + h * 0.3);   // lightning
  const hx = x + w * 0.18, hw = w * 0.64, hy = y + h * 0.42, hh = h * 0.36;
  g.fillStyle(P.roof, 1); g.fillTriangle(hx - 6, hy, hx + hw + 6, hy, hx + hw / 2, hy - h * 0.24);
  g.fillStyle(P.siding, 1); g.fillRect(hx, hy, hw, hh);
  g.fillStyle(P.lamp, 0.8); g.fillRect(hx + hw / 2 - 4, hy - h * 0.12, 8, 7);
  g.fillStyle(P.tv, 0.8); g.fillRect(hx + hw * 0.62, hy + hh * 0.5, hw * 0.16, hh * 0.3);
  g.fillStyle(P.glass, 1); g.fillRect(hx + hw * 0.1, hy + 4, 12, 12); g.fillStyle(P.mask, 1); g.fillEllipse(hx + hw * 0.1 + 6, hy + 10, 4, 6); g.fillStyle(P.hat, 1); g.fillRect(hx + hw * 0.1 + 2, hy + 6, 8, 2); g.fillStyle(0xe88a9a, 1); g.fillRect(hx + hw * 0.1 + 4, hy + 11, 1, 1); g.fillRect(hx + hw * 0.1 + 7, hy + 11, 1, 1);   // him, in the window
  g.fillStyle(0x6a2a22, 1); g.fillRect(hx + hw * 0.45, hy + hh * 0.45, 9, hh * 0.55);
  g.fillStyle(P.grass, 1); g.fillRect(x + w * 0.08, y + h * 0.78, w * 0.84, 4); g.fillStyle(P.dirt, 1); g.fillRect(x + w * 0.12, y + h * 0.78 + 4, w * 0.76, h * 0.22 - 4);
  for (let fx = x + w * 0.1; fx < x + w * 0.9; fx += 7) { g.fillStyle(P.fence, 0.8); g.fillRect(fx, y + h * 0.72, 2, h * 0.06); }
  for (let i = 0; i < 40; i++) { g.lineStyle(1, P.rain, 0.35); const rx = x + (i * 37) % w, ry = y + (i * 23) % h; g.lineBetween(rx, ry, rx - 2, ry + 6); }
}
