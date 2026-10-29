// "MASKED THRONE": a drowned-dark ruin in a purple void, ruled by a giant faceless stone king who wears the CROWN OF
// MASKS (one face laughs, one weeps) and holds a black sword up into the fog. Built from Mason's picture: the statue on
// its pedestal, a studded slate floor, purple light leaking out of the ruins, pink crystal growths, a lone brazier.
// Unlocked by buying the CROWN OF MASKS (Trinkets > SHOP > EXTRAS - only on the shelf after the shopkeeper's code NOLI);
// the stage entry carries `shop: 'ext-crown'`.
// What makes it different from every other stage: IT'S DARK. A darkness layer covers the screen and the only light is
// what fighters carry (a glow round each one), the brazier, and the purple seams - you fight half-blind (DARK tunables).
// Hazards (HazardCycle):
//   THE KING'S SWORD    the statue's eyes light up, a purple line marks a spot, then the king's sword falls out of the
//                       sky onto it - a huge vertical hit - and its impact sends a shockwave along the floor
//   COMEDY & TRAGEDY    two giant masks hang over the stage: under COMEDY you heal, under TRAGEDY purple tears rain
//                       down and hurt; halfway through they swap sides
//   LIGHTS OUT          the dark closes in until only a sliver of light is left round each fighter; eyes open in the dark
// Music: Mason's pixelated_audio 14 (also sold as THE MASKED KING, 'bgm_shop_noli').
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const MPAL = {
  sky: [0x07040f, 0x0b0617, 0x10081f, 0x150b28, 0x1a0e30, 0x1f1138, 0x231340],
  fog: 0x3a1a5a, void: 0x8a2be2, voidHot: 0xc77dff, voidPale: 0xe8c8ff,
  slate: 0x1a1c2e, slateLit: 0x272a42, slateDark: 0x10111c, stud: 0x2e3150, studLit: 0x3c4066,
  stone: 0x16121e, stoneLit: 0x241e30, stoneEdge: 0x342a46, outline: 0x040208,
  pink: 0xc8407e, pinkLit: 0xf070a8, coral: 0x8a1e3a, fire: 0xff7a2a, fireHot: 0xffd27a,
};

// how dark it is: the darkness's strength, each fighter's light radius (screen pixels), the brazier's light
// where the stone king stands in the background (its pedestal's bottom middle), how big, how much it scrolls
const KING = { x: 470, y: 272, scale: 0.7, sf: 0.3 };
const DARK = { alpha: 0.6, fighter: 78, brazier: 96, seam: 40, lightsOut: { alpha: 0.94, fighter: 30, ramp: 40 } };
// THE KING'S SWORD: warning time, fall speed, the blade's hit and the floor shockwave
const SWORD = { warn: 96, fall: 2.2, maxFall: 34, w: 30, dmg: 17, angle: 80, base: 6.6, growth: 5.2, stuck: 70,
  wave: { dmg: 6, angle: 40, base: 4.4, growth: 3.4, speed: 6, life: 34 } };
// COMEDY & TRAGEDY: how long, comedy's healing (% every `every` ticks), tragedy's tears
const MASKS = { length: 600, heal: 1, every: 22, tearEvery: 5, tear: { dmg: 4, angle: -90, base: 2.2, growth: 1.6 } };
// LIGHTS OUT: how long it stays dark
const LIGHTS = { length: 480 };

export class MaskedStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -262, x2: 262, y: 0, solid: true, bottom: 70 },     // the studded slate floor of the throne yard
      { x1: -216, x2: -126, y: -80, solid: false },            // tops of two broken purple pillars
      { x1: 126, x2: 216, y: -80, solid: false },
      { x1: -48, x2: 48, y: -156, solid: false },              // the king's upturned stone palm
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_shop_noli';
    this.t = 0; this.dark = DARK.alpha; this.light = DARK.fighter; this.eyes = 0; this.swordGone = false;
    this.cycle = new HazardCycle(this, ['sword', 'masks', 'dark'], { color: '#c77dff', stroke: '#10081f', gap: 560, jitter: 240, first: 420 });
  }

  // ---------------------------------------------------------------- drawing (built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = MPAL;
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 60, 1440, 61); });
    sky.fillStyle(P.sky[6], 1); sky.fillRect(-400, -60 + 7 * 60, 1440, 400);
    for (const [x, y, w, h, a] of [[420, 70, 520, 160, 0.16], [140, 150, 420, 120, 0.12], [560, 220, 600, 160, 0.1], [60, 40, 300, 90, 0.1]]) {   // purple fog banks
      for (let k = 0; k < 4; k++) { sky.fillStyle(k % 2 ? 0x4a2470 : P.fog, a * (1 - k * 0.2)); sky.fillEllipse(x, y, w * (1 - k * 0.2), h * (1 - k * 0.22)); }
    }
    bgLayer.push(sky);
    // the far ruins: slabs and towers with purple light leaking from their cracks, pink coral crystals, zigzag pillars
    const far = s.add.graphics().setScrollFactor(0.2); this.farRuins(far); bgLayer.push(far);
    // the king: a giant faceless statue on a pedestal, sword raised, wearing the crown of masks
    // (drawn round 0,0 = the bottom middle of its pedestal, then placed and scaled with KING)
    const put = (o) => o.setScrollFactor(KING.sf).setPosition(KING.x, KING.y).setScale(KING.scale);
    this.kingG = put(s.add.graphics()); this.king(this.kingG, 0, 0); bgLayer.push(this.kingG);
    this.swordG = put(s.add.graphics()); this.drawSword(this.swordG, this.swordAt.x, this.swordAt.y, 1); bgLayer.push(this.swordG);   // (hidden while it's been thrown)
    this.kingFx = put(s.add.graphics()); bgLayer.push(this.kingFx);   // its eyes, the sword's glint
    this.bgFx = s.add.graphics().setScrollFactor(0.2); bgLayer.push(this.bgFx);       // drifting motes, the purple river shimmer
    // the arena
    const g = s.add.graphics(); this.floor(g); worldLayer.push(g);
    for (const p of this.platforms.slice(1, 3)) { const c = s.add.graphics(); this.pillar(c, p); worldLayer.push(c); }
    const palm = s.add.graphics(); this.palm(palm, this.platforms[3]); worldLayer.push(palm);
    this.fxG = s.add.graphics(); worldLayer.push(this.fxG);   // brazier flame, seam glow, sparks
    this.hzG = s.add.graphics(); worldLayer.push(this.hzG);   // hazards
    // the darkness: a small canvas drawn every tick (dark everywhere, light punched out round the lights), stretched
    // over the screen on the UI camera, under the HUD
    if (s.textures.exists('masked_dark')) s.textures.remove('masked_dark');
    this.darkTex = s.textures.createCanvas('masked_dark', 160, 90);
    this.darkImg = s.add.image(0, 0, 'masked_dark').setOrigin(0, 0).setScale(4).setDepth(3);
    try { this.darkTex.setFilter(Phaser.Textures.FilterMode.LINEAR); } catch (e) { /* (older Phaser: stays chunky) */ }
    if (s.addUI) s.addUI(this.darkImg);
    this.cycle.makeBanner(s);
  }

  farRuins(g) {
    const P = MPAL;
    g.fillStyle(0x0e0a18, 1); g.fillRect(-300, 250, 1400, 200);                              // the far ground
    g.fillStyle(P.void, 0.5); g.fillRect(-300, 258, 1400, 3); g.fillStyle(P.voidHot, 0.35); g.fillRect(-300, 259, 1400, 1);   // a river of purple light
    for (let i = 0; i < 18; i++) {                                                           // ruined slabs and stairs
      const x = -240 + i * 72 + (i * 37) % 23, h = 26 + (i * 53) % 60, w = 34 + (i * 29) % 30;
      g.fillStyle(i % 2 ? 0x130e20 : 0x17112a, 1); g.fillRect(x, 252 - h, w, h);
      g.fillStyle(0x221a36, 1); g.fillRect(x, 252 - h, w, 2);
      if (i % 3 === 0) { g.fillStyle(P.void, 0.55); g.fillRect(x + 4, 252 - h + 6, 2, h - 10); g.fillStyle(P.voidHot, 0.3); g.fillRect(x + 4, 252 - h + 6, 1, h - 10); }
      if (i % 4 === 1) for (let k = 0; k < 4; k++) { g.fillStyle(0x130e20, 1); g.fillRect(x + w + k * 6, 252 - h + k * (h / 4), 6, h - k * (h / 4)); }   // steps
    }
    for (const [x, h, flip] of [[-170, 120, 1], [905, 140, -1], [700, 90, 1]]) {              // zigzag pillars of purple stone
      for (let k = 0; k < 7; k++) { const yy = 250 - k * (h / 7), xx = x + ((k % 2) ? 8 : 0) * flip; g.fillStyle(0x5a2a8a, 1); g.fillRect(xx, yy - h / 7, 16, h / 7 + 1); g.fillStyle(0x7a3ab0, 1); g.fillRect(xx, yy - h / 7, 4, h / 7 + 1); g.fillStyle(0x3a1a5a, 1); g.fillRect(xx + 12, yy - h / 7, 4, h / 7 + 1); }
    }
    for (const [x, hh] of [[60, 34], [140, 22], [560, 30], [820, 40], [-60, 26]]) {           // pink coral crystals
      g.fillStyle(P.coral, 1); g.fillRect(x - 2, 250 - hh, 5, hh); g.fillRect(x - 9, 250 - hh * 0.7, 4, hh * 0.4); g.fillRect(x + 6, 250 - hh * 0.8, 4, hh * 0.5);
      g.fillStyle(P.pink, 1); g.fillRect(x - 2, 250 - hh, 2, hh); g.fillRect(x - 9, 250 - hh * 0.7, 2, 4); g.fillRect(x + 6, 250 - hh * 0.8, 2, 4);
    }
    g.fillStyle(P.fire, 1); g.fillRect(212, 236, 3, 4); g.fillStyle(P.fireHot, 1); g.fillRect(213, 234, 1, 2);   // a far torch
  }

  // the stone king (in background coordinates: cx = its middle, by = the bottom of the pedestal)
  king(g, cx, by) {
    const P = MPAL, O = (x, y, w, h, c, lit) => { g.fillStyle(P.outline, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle(c, 1); g.fillRect(x, y, w, h); if (lit) { g.fillStyle(lit, 1); g.fillRect(x, y, 2, h); g.fillRect(x, y, w, 1); } };
    for (let i = 0; i < 5; i++) { g.fillStyle(P.void, 0.035); g.fillEllipse(cx, by - 200, 220 - i * 30, 420 - i * 50); }   // purple light behind him, so he stands out of the fog
    O(cx - 70, by - 30, 140, 30, 0x120e1a, P.stoneLit);                                     // the pedestal: a stepped plinth
    O(cx - 58, by - 92, 116, 64, 0x0f0b16, P.stoneLit);
    g.fillStyle(0x07050c, 1); g.fillRect(cx - 44, by - 80, 88, 38);                            // its dark panel
    g.lineStyle(1, P.stoneEdge, 1); g.strokeRect(cx - 44, by - 80, 88, 38);
    O(cx - 66, by - 100, 132, 10, 0x1a1424, P.stoneEdge);
    // the king himself: blocky legs, a square torso, a square head - and no face at all
    O(cx - 34, by - 168, 30, 68, P.stone, P.stoneLit); O(cx + 4, by - 168, 30, 68, P.stone);
    O(cx - 42, by - 248, 84, 82, P.stone, P.stoneLit);
    O(cx - 26, by - 296, 52, 48, P.stone, P.stoneLit);
    O(cx - 74, by - 246, 30, 70, P.stone, P.stoneLit);                                          // his left arm, hanging
    O(cx + 44, by - 290, 30, 52, P.stone);                                                      // his right arm, raised
    O(cx + 44, by - 312, 30, 24, P.stoneLit);                                                   // the fist
    this.swordAt = { x: cx + 59, y: by - 312 };
    // the crown of masks: black spikes, a cross on top, the laughing and the weeping face
    const cy = by - 300;
    g.fillStyle(P.outline, 1); g.fillRect(cx - 34, cy - 6, 68, 10);
    g.fillStyle(0x221a2a, 1); g.fillRect(cx - 32, cy - 5, 64, 8);
    for (const [x, d] of [[-34, -1], [34, 1]]) { g.fillStyle(0x221a2a, 1); g.fillTriangle(cx + x, cy + 2, cx + x - d * 4, cy - 6, cx + x + d * 10, cy - 30); g.fillStyle(0x3a2e48, 1); g.fillTriangle(cx + x, cy, cx + x + d * 2, cy - 6, cx + x + d * 10, cy - 30); }   // horns
    g.fillStyle(0x221a2a, 1); g.fillRect(cx - 2, cy - 26, 4, 22); g.fillRect(cx - 6, cy - 21, 12, 3);   // the cross
    for (const [mx, sad] of [[-13, false], [13, true]]) {
      g.fillStyle(0x4a4050, 1); g.fillEllipse(cx + mx, cy - 6, 18, 20); g.fillStyle(0x5a5062, 1); g.fillEllipse(cx + mx - 2, cy - 8, 12, 12);
      g.fillStyle(0x0e0a12, 1); g.fillRect(cx + mx - 6, cy - 10, 4, 2 + (sad ? 1 : 0)); g.fillRect(cx + mx + 2, cy - 10, 4, 2 + (sad ? 1 : 0));
      if (sad) { g.fillRect(cx + mx - 4, cy - 1, 8, 2); g.fillRect(cx + mx - 5, cy + 1, 2, 2); g.fillRect(cx + mx + 3, cy + 1, 2, 2); }
      else { g.fillRect(cx + mx - 5, cy - 3, 2, 2); g.fillRect(cx + mx + 3, cy - 3, 2, 2); g.fillRect(cx + mx - 3, cy - 1, 6, 2); }
    }
    g.fillStyle(P.void, 1); g.fillRect(cx - 1, cy - 2, 3, 3);                                   // a purple gem between the faces
  }
  drawSword(g, x, y, a) {
    const P = MPAL;
    g.fillStyle(P.outline, a); g.fillRect(x - 12, y - 6, 24, 6); g.fillRect(x - 6, y - 150, 12, 146);
    g.fillStyle(0x1e1a26, a); g.fillRect(x - 11, y - 5, 22, 4); g.fillRect(x - 5, y - 148, 10, 144);   // guard, blade
    g.fillStyle(0x3a3448, a); g.fillRect(x - 5, y - 148, 2, 144);
    g.fillStyle(P.outline, a); g.fillTriangle(x - 6, y - 150, x + 6, y - 150, x, y - 170);
    g.fillStyle(0x2a2436, a); g.fillTriangle(x - 4, y - 150, x + 4, y - 150, x, y - 166);
  }

  // the floor: dark slate studded like a baseplate, purple light in its seams, a stepped ruin underneath
  floor(g) {
    const P = MPAL, p = this.platforms[0], w = p.x2 - p.x1;
    for (let k = 0; k < 4; k++) {                                                              // stepped foundations
      const inset = 14 + k * 26, y = 8 + k * 16;
      g.fillStyle(P.outline, 1); g.fillRect(p.x1 + inset - 1, y - 1, w - inset * 2 + 2, 18);
      g.fillStyle(k % 2 ? 0x12101c : 0x161322, 1); g.fillRect(p.x1 + inset, y, w - inset * 2, 16);
      g.fillStyle(0x221c30, 1); g.fillRect(p.x1 + inset, y, w - inset * 2, 1);
      for (let x = p.x1 + inset + 18; x < p.x2 - inset - 10; x += 46) { g.fillStyle(P.void, 0.6); g.fillRect(x, y + 3, 2, 10); }   // purple seams
    }
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 2, -3, w + 4, 14);
    g.fillStyle(P.slate, 1); g.fillRect(p.x1, -2, w, 11);
    g.fillStyle(P.slateLit, 1); g.fillRect(p.x1, -2, w, 2);
    g.fillStyle(P.slateDark, 1); g.fillRect(p.x1, 7, w, 2);
    for (let x = p.x1 + 4; x < p.x2 - 4; x += 8) { g.fillStyle(P.stud, 1); g.fillRect(x, -4, 5, 2); g.fillStyle(P.studLit, 1); g.fillRect(x, -4, 2, 1); }   // studs
    for (let x = p.x1 + 40; x < p.x2 - 30; x += 62) { g.fillStyle(P.void, 0.8); g.fillRect(x, 0, 1, 8); g.fillRect(x - 6, 4, 6, 1); }   // cracks with light in them
    // pink crystal growths at the edges, a brazier on the left
    for (const [x, d] of [[p.x1 + 14, 1], [p.x2 - 16, -1]]) {
      for (const [dx, h] of [[0, 22], [d * 7, 14], [-d * 5, 10]]) { g.fillStyle(P.coral, 1); g.fillRect(x + dx, -4 - h, 4, h); g.fillStyle(P.pinkLit, 1); g.fillRect(x + dx, -4 - h, 2, h * 0.6); }
    }
    const bx = p.x1 + 58; this.brazier = { x: bx, y: -28 };
    g.fillStyle(P.outline, 1); g.fillRect(bx - 9, -26, 18, 6); g.fillRect(bx - 3, -22, 6, 18); g.fillRect(bx - 8, -6, 16, 4);
    g.fillStyle(0x2a2230, 1); g.fillRect(bx - 8, -25, 16, 4); g.fillRect(bx - 2, -21, 4, 16); g.fillRect(bx - 7, -5, 14, 2);
  }
  // a broken zigzag pillar of purple stone, its top a ledge
  pillar(g, p) {
    const cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1;
    for (let k = 0; k < 5; k++) { const y = p.y + 6 + k * 15, xx = cx - 8 + (k % 2 ? 6 : -6); g.fillStyle(0x3a1a5a, 1); g.fillRect(xx, y, 16, 16); g.fillStyle(0x5a2a8a, 1); g.fillRect(xx, y, 4, 16); g.fillStyle(0x24103a, 1); g.fillRect(xx + 12, y, 4, 16); }
    g.fillStyle(MPAL.outline, 1); g.fillRect(p.x1 - 2, p.y - 3, w + 4, 10);
    g.fillStyle(0x4a2274, 1); g.fillRect(p.x1, p.y - 2, w, 8); g.fillStyle(0x7a3ab0, 1); g.fillRect(p.x1, p.y - 2, w, 2);
    g.fillStyle(0x24103a, 1); g.fillRect(p.x1, p.y + 4, w, 2);
    g.fillStyle(MPAL.voidPale, 0.8); g.fillRect(p.x1 + 6, p.y - 2, 6, 1);
  }
  // the king's stone palm, floating up high, fingers curled
  palm(g, p) {
    const w = p.x2 - p.x1, P = MPAL;
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 2, p.y - 3, w + 4, 16); g.fillRect(p.x1 + 10, p.y + 12, w - 20, 8);
    g.fillStyle(P.stone, 1); g.fillRect(p.x1, p.y - 2, w, 13); g.fillRect(p.x1 + 12, p.y + 11, w - 24, 7);
    g.fillStyle(P.stoneLit, 1); g.fillRect(p.x1, p.y - 2, w, 2);
    for (let i = 0; i < 4; i++) { const x = p.x2 - 4 - i * 9; g.fillStyle(P.outline, 1); g.fillRect(x - 1, p.y - 11, 8, 10); g.fillStyle(P.stoneLit, 1); g.fillRect(x, p.y - 10, 6, 8); }   // curled fingers
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 6, p.y - 8, 10, 12); g.fillStyle(P.stoneLit, 1); g.fillRect(p.x1 - 5, p.y - 7, 8, 10);   // the thumb
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    this.hzG.clear();
    this.ambience();
    const out = this.cycle.run(match, []);
    this.drawDark(match);
    return out;
  }
  ambience() {
    const t = this.t, f = this.fxG, b = this.bgFx, k = this.kingFx; f.clear(); b.clear(); k.clear();
    const fl = 0.75 + 0.25 * Math.sin(t * 0.37) * Math.sin(t * 0.13), bz = this.brazier;     // the brazier's fire
    f.fillStyle(MPAL.fire, 0.12 * fl); f.fillCircle(bz.x, bz.y - 6, 22);
    f.fillStyle(MPAL.fire, 1); f.fillTriangle(bz.x - 7, bz.y + 2, bz.x + 7, bz.y + 2, bz.x + Math.sin(t * 0.2) * 2, bz.y - 12 * fl);
    f.fillStyle(MPAL.fireHot, 1); f.fillTriangle(bz.x - 3, bz.y + 2, bz.x + 3, bz.y + 2, bz.x + Math.sin(t * 0.25), bz.y - 6 * fl);
    if (t % 9 === 0) { f.fillStyle(MPAL.fireHot, 0.8); f.fillRect(bz.x - 2 + (t % 5), bz.y - 14 - (t % 7), 1, 1); }
    for (let i = 0; i < 18; i++) { const x = (i * 97 + t * (0.1 + (i % 4) * 0.05)) % 760 - 60, y = 250 - ((t * (0.2 + (i % 3) * 0.1) + i * 41) % 260), a = 0.3 + 0.4 * Math.abs(Math.sin(t * 0.03 + i)); b.fillStyle(i % 3 ? MPAL.voidHot : MPAL.pinkLit, a); b.fillRect(x, y, 1 + (i % 5 === 0), 1); }   // motes rising out of the ruins
    b.fillStyle(MPAL.voidHot, 0.2 + 0.15 * Math.sin(t * 0.05)); b.fillRect(-300, 259, 1400, 1);
    const e = Math.max(this.eyes, (t % 900) < 30 ? Math.sin((t % 900) / 30 * Math.PI) * 0.6 : 0), A = this.swordAt;   // the faceless king's eyes, opening
    if (e > 0.02) { k.fillStyle(MPAL.void, e * 0.25); k.fillCircle(0, -274, 22); k.fillStyle(MPAL.voidHot, e); k.fillRect(-14, -276, 9, 3); k.fillRect(5, -276, 9, 3); }
    this.swordG.setVisible(!this.swordGone);                                                   // (the sword's gone: thrown at you)
    if (!this.swordGone && (t % 300) < 20) { const y = A.y - 20 - ((t % 300) / 20) * 130; k.fillStyle(0xffffff, 0.5); k.fillRect(A.x - 4, y, 2, 6); }   // a glint running up the blade
    if (this.eyes > 0) this.eyes = Math.max(0, this.eyes - 0.01);
  }
  // the darkness: dark everywhere, with soft holes of light round each fighter, the brazier and the glowing seams
  drawDark(match) {
    const tex = this.darkTex; if (!tex) return;
    const c = tex.context, cam = match.worldCam, v = cam.worldView, z = cam.zoom, sx = (x) => (x - v.x) * z / 4, sy = (y) => (y - v.y) * z / 4;
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 160, 90);
    c.fillStyle = 'rgba(6,3,14,' + this.dark.toFixed(3) + ')'; c.fillRect(0, 0, 160, 90);
    c.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.7 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    for (const f of match.fighters) if (f.alive) hole(sx(f.x), sy(f.y - 24), this.light * z / 4, 1);
    const fl = 0.85 + 0.15 * Math.sin(this.t * 0.37), lo = this.dark > DARK.alpha + 0.1 ? 0.35 : 1;
    hole(sx(this.brazier.x), sy(this.brazier.y), DARK.brazier * z / 4 * fl * lo, 0.9);
    for (const x of [-140, 0, 140]) hole(sx(x), sy(6), DARK.seam * z / 4 * lo, 0.4);
    if (this.flash > 0) { hole(sx(this.flashX), sy(-60), 140 * z / 4, Math.min(1, this.flash / 10)); this.flash--; }
    if (this.lightsHz) for (const L of this.lightsHz) hole(sx(L.x), sy(L.y), L.r * z / 4, L.a);
    c.globalCompositeOperation = 'source-over';
    tex.refresh();
  }

  // ---------------------------------------------------------------- hazards
  // THE KING'S SWORD: his eyes light up; a purple line marks where it'll land (over someone), then the sword falls
  // out of the sky point-first, splits the floor, and a shockwave runs out both ways along it
  start_sword(match, h) {
    h.title = "THE KING'S SWORD";
    const live = match.fighters.filter((f) => f.alive), tgt = live.length ? live[Math.floor(Math.random() * live.length)] : null;
    h.x = Math.max(-230, Math.min(230, tgt ? tgt.x : (Math.random() - 0.5) * 300));
    h.y = -420; h.vy = 0; h.landed = 0; h.waves = []; this.eyes = 1; this.swordGone = true;
    sfx('curse', 0.5, 0.6);
  }
  step_sword(match, h, out) {
    const g = this.hzG, W = SWORD.warn;
    if (h.t < W) {                                                                            // the mark: a flickering line and a glow on the floor
      const k = h.t / W, on = (h.t >> 2) % 2 ? 1 : 0.55;
      g.fillStyle(MPAL.void, 0.15 + 0.35 * k * on); g.fillRect(h.x - 1, -400, 2, 400);
      g.fillStyle(MPAL.voidHot, 0.2 + 0.4 * k); g.fillEllipse(h.x, 0, 30 + 40 * k, 6);
      if (h.t === W - 30) sfx('whoosh', 0.5, 0.6);
      this.eyes = 1;
      return false;
    }
    if (!h.landed) {
      h.vy = Math.min(SWORD.maxFall, h.vy + SWORD.fall); h.y += h.vy;
      if (h.y >= 0) { h.y = 0; h.landed = h.t; sfx('bighit', 0.9, 0.6); sfx('rumble', 0.6, 0.8); match.shake(12, 14); this.flash = 16; this.flashX = h.x; h.waves = [{ x: h.x, d: -1 }, { x: h.x, d: 1 }]; this.sparks(match, h.x); }
      out.push({ x1: h.x - SWORD.w / 2, x2: h.x + SWORD.w / 2, y1: h.y - 180, y2: h.y, dmg: SWORD.dmg, angle: SWORD.angle, base: SWORD.base, growth: SWORD.growth, id: 'ksword' + h.id, hazard: true });
    }
    // the sword (point down), 180 long
    const x = h.x, tip = h.y, a = h.landed ? Math.max(0, 1 - Math.max(0, h.t - h.landed - SWORD.stuck) / 20) : 1, sink = h.landed ? 6 : 0;
    g.fillStyle(MPAL.outline, a); g.fillRect(x - 8, tip - 176 + sink, 16, 170); g.fillTriangle(x - 8, tip - 8 + sink, x + 8, tip - 8 + sink, x, tip + 6 + sink);
    g.fillStyle(0x2a2436, a); g.fillRect(x - 6, tip - 174 + sink, 12, 166); g.fillTriangle(x - 6, tip - 9 + sink, x + 6, tip - 9 + sink, x, tip + 3 + sink);
    g.fillStyle(0x4a4260, a); g.fillRect(x - 6, tip - 174 + sink, 3, 166);
    g.fillStyle(MPAL.voidHot, a * 0.8); g.fillRect(x - 1, tip - 160 + sink, 2, 140);           // a purple fuller
    g.fillStyle(MPAL.outline, a); g.fillRect(x - 22, tip - 186 + sink, 44, 10); g.fillRect(x - 5, tip - 210 + sink, 10, 26);
    g.fillStyle(0x3a3448, a); g.fillRect(x - 21, tip - 185 + sink, 42, 8); g.fillRect(x - 4, tip - 209 + sink, 8, 24);
    if (!h.landed) { g.fillStyle(MPAL.voidPale, 0.35); for (let i = 1; i < 5; i++) g.fillRect(x - 5, tip - 176 - i * 14, 10, 6); }   // speed streaks
    if (h.landed) {
      const lt = h.t - h.landed;
      g.lineStyle(2, MPAL.voidHot, Math.max(0, 1 - lt / 60)); g.lineBetween(x - 30, 2, x - 8, 0); g.lineBetween(x + 8, 0, x + 34, 3);   // the floor split
      for (const wv of h.waves) {
        if (lt > SWORD.wave.life) continue;
        wv.x += wv.d * SWORD.wave.speed; const hgt = 14 * (1 - lt / SWORD.wave.life);
        if (wv.x < this.platforms[0].x1 || wv.x > this.platforms[0].x2) continue;
        g.fillStyle(MPAL.void, 0.8); g.fillTriangle(wv.x - 10, 0, wv.x + 10, 0, wv.x + wv.d * 4, -hgt);
        g.fillStyle(MPAL.voidPale, 0.9); g.fillRect(wv.x - 1, -hgt + 2, 2, hgt - 2);
        out.push({ x1: wv.x - 10, x2: wv.x + 10, y1: -hgt - 6, y2: 2, dmg: SWORD.wave.dmg, angle: SWORD.wave.angle, base: SWORD.wave.base, growth: SWORD.wave.growth, dirX: wv.d, id: 'kwave' + h.id + (wv.d > 0 ? 'r' : 'l'), hazard: true });
      }
      if (lt > SWORD.stuck + 20) { this.swordGone = false; return true; }                      // (back in the statue's hand)
    }
    return false;
  }
  sparks(match, x) {
    for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.05 + 0.9 * Math.random()), sp = 2 + Math.random() * 4; match.particles.push({ shape: 'shard', x, y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 24 + Math.random() * 14, color: i % 3 ? MPAL.voidHot : MPAL.voidPale, drag: 0.94, grav: 0.16, ang: a }); }
  }

  // COMEDY & TRAGEDY: the crown's two faces, huge, hanging over the stage. Under the laughing one you heal; under the
  // weeping one purple tears fall and sting. Halfway through they spin round and swap sides.
  start_masks(match, h) { h.title = 'COMEDY & TRAGEDY'; h.side = Math.random() < 0.5 ? 1 : -1; h.tears = []; sfx('curse', 0.4, 1.3); }
  step_masks(match, h, out) {
    const g = this.hzG, L = MASKS.length, half = L / 2, t = h.t;
    const swap = t >= half ? -1 : 1, comedyX = 130 * h.side * swap, tragedyX = -comedyX;
    const inK = Math.min(1, t / 40), outK = Math.min(1, (L - t) / 40), k = Math.min(inK, outK);
    const spin = Math.abs(t - half) < 20 ? Math.cos((t - half) / 20 * Math.PI / 2) : 1;          // the turn at halfway
    if (t === half) sfx('whoosh', 0.5, 0.8);
    const y = -186 + (1 - k) * -90 + Math.sin(t * 0.04) * 6;
    this.mask(g, comedyX, y, false, k, spin, t); this.mask(g, tragedyX, y + 4, true, k, spin, t);
    if (k < 1 || Math.abs(t - half) < 20) return t >= L;
    // comedy: golden motes rain down on its side, and whoever's under it heals
    const side = (x, cx) => Math.sign(x || 1) === Math.sign(cx);
    for (let i = 0; i < 2; i++) { const x = comedyX + (Math.random() - 0.5) * 220; match.particles.push({ x, y: y + 30, vx: 0, vy: 1.5 + Math.random(), life: 40 + Math.random() * 40, color: i ? 0xffe8a0 : 0xffffff, size: 2, grav: 0.02 }); }
    if (t % MASKS.every === 0) for (const f of match.fighters) {
      if (!f.alive || !side(f.x, comedyX)) continue;
      if (match.mode === 'stamina') f.hp = Math.min(f.maxHp, f.hp + MASKS.heal); else f.percent = Math.max(0, f.percent - MASKS.heal);
      match.particles.push({ x: f.x + (Math.random() - 0.5) * 16, y: f.y - 40, vx: 0, vy: -0.8, life: 30, color: 0x9affb0, size: 3, grav: 0 });
    }
    // tragedy: tears fall from its eyes and anywhere on its side
    if (t % MASKS.tearEvery === 0) h.tears.push({ x: tragedyX + (Math.random() - 0.5) * 240, y: y + 20, vy: 2, id: t });
    h.tears = h.tears.filter((d) => {
      d.vy = Math.min(8, d.vy + 0.25); d.y += d.vy;
      g.fillStyle(MPAL.voidHot, 0.95); g.fillEllipse(d.x, d.y, 4, 7); g.fillStyle(MPAL.voidPale, 1); g.fillRect(d.x - 1, d.y - 2, 1, 2);
      out.push({ x1: d.x - 4, x2: d.x + 4, y1: d.y - 6, y2: d.y + 6, dmg: MASKS.tear.dmg, angle: MASKS.tear.angle, base: MASKS.tear.base, growth: MASKS.tear.growth, id: 'tear' + h.id + ':' + d.id, hazard: true });
      if (this.platforms.some((p) => d.y >= p.y && d.y - d.vy < p.y && d.x >= p.x1 && d.x <= p.x2) || d.y > 300) { g.fillStyle(MPAL.voidHot, 0.6); g.fillEllipse(d.x, d.y, 10, 3); return false; }
      return true;
    });
    return t >= L;
  }
  // a giant theatre mask: pale stone-grey, deep eye holes, a grin or a frown (spin squashes it sideways for the turn)
  mask(g, x, y, sad, a, spin, t) {
    const w = 64 * Math.max(0.08, Math.abs(spin)), h = 72, P = MPAL;
    g.fillStyle(sad ? P.void : 0xffe8a0, 0.08 * a); g.fillCircle(x, y, 64);
    g.fillStyle(P.outline, a); g.fillEllipse(x, y, w + 6, h + 6);
    g.fillStyle(sad ? 0x5a5068 : 0x8a8098, a); g.fillEllipse(x, y, w, h);
    g.fillStyle(sad ? 0x6a6078 : 0xa49ab2, a); g.fillEllipse(x - w * 0.12, y - 8, w * 0.6, h * 0.5);
    if (Math.abs(spin) < 0.3) return;
    const ex = w * 0.2, s = w / 64;
    g.fillStyle(0x0a060e, a);
    for (const d of [-1, 1]) {
      if (sad) g.fillTriangle(x + d * ex - 8 * s, y - 12 - d * 0, x + d * ex + 8 * s, y - 12, x + d * ex + d * 6 * s, y - 2);   // drooping eyes
      else g.fillTriangle(x + d * ex - 8 * s, y - 6, x + d * ex + 8 * s, y - 6, x + d * ex, y - 16);                       // smiling crescent eyes
    }
    if (sad) { g.fillTriangle(x - 14 * s, y + 24, x + 14 * s, y + 24, x, y + 12); g.fillStyle(P.voidHot, a); g.fillRect(x - ex - 1, y - 2, 2, 8 + (t % 20) / 4); g.fillRect(x + ex - 1, y - 2, 2, 8 + ((t + 10) % 20) / 4); }   // frown, tears
    else { g.fillTriangle(x - 18 * s, y + 10, x + 18 * s, y + 10, x, y + 26); g.fillStyle(0x8a8098, a); g.fillTriangle(x - 12 * s, y + 10, x + 12 * s, y + 10, x, y + 16); }   // a wide grin
  }

  // LIGHTS OUT: the dark closes in until there's only a sliver of light round each fighter; pairs of eyes open in the dark
  start_dark(match, h) { h.title = 'LIGHTS OUT'; h.eyesAt = []; for (let i = 0; i < 7; i++) h.eyesAt.push({ x: -300 + Math.random() * 600, y: -260 + Math.random() * 230, at: 40 + Math.floor(Math.random() * 380), sad: i % 2 }); sfx('curse', 0.6, 0.5); }
  step_dark(match, h, out) {
    const R = DARK.lightsOut.ramp, L = LIGHTS.length, t = h.t;
    const k = t < R ? t / R : t > L - R ? (L - t) / R : 1;
    this.dark = DARK.alpha + (DARK.lightsOut.alpha - DARK.alpha) * k; this.light = DARK.fighter + (DARK.lightsOut.fighter - DARK.fighter) * k;
    this.lightsHz = [];
    for (const e of h.eyesAt) {                                                               // eyes in the dark (they light their own little patch)
      const lt = t - e.at; if (lt < 0 || lt > 120) continue;
      const open = lt < 10 ? lt / 10 : lt > 110 ? (120 - lt) / 10 : ((lt % 60) < 4 ? 0.1 : 1);
      const g = this.hzG; g.fillStyle(e.sad ? MPAL.voidHot : 0xffe8a0, open); g.fillRect(e.x - 8, e.y, 5, 2 * open + 0.5); g.fillRect(e.x + 3, e.y, 5, 2 * open + 0.5);
      this.lightsHz.push({ x: e.x, y: e.y, r: 18, a: 0.5 * open });
      if (lt === 0) sfx('glitch', 0.25, 0.6 + Math.random() * 0.3);
    }
    if (t >= L) { this.dark = DARK.alpha; this.light = DARK.fighter; this.lightsHz = null; return true; }
    return false;
  }
}

// Miniature of MASKED THRONE for the select screen: purple fog, the faceless king with his sword up, the dark floor
export function drawMaskedPreview(g, x, y, w, h) {
  const P = MPAL, bh = Math.ceil(h / 7);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(P.fog, 0.4); g.fillEllipse(x + w * 0.4, y + h * 0.3, w * 0.7, h * 0.3);
  const cx = x + w * 0.5, by = y + h * 0.72, s = h / 90;
  g.fillStyle(0x07050c, 1); g.fillRect(cx - 10 * s, by - 12 * s, 20 * s, 12 * s);                      // pedestal
  g.fillStyle(P.stone, 1); g.fillRect(cx - 7 * s, by - 34 * s, 14 * s, 22 * s); g.fillRect(cx - 5 * s, by - 42 * s, 10 * s, 8 * s);   // body, head
  g.fillRect(cx + 7 * s, by - 44 * s, 4 * s, 12 * s);                                                 // raised arm
  g.fillStyle(0x2a2436, 1); g.fillRect(cx + 8 * s, by - 70 * s, 2 * s, 26 * s);                        // the sword
  g.fillStyle(0x4a4050, 1); g.fillRect(cx - 5 * s, by - 46 * s, 10 * s, 4 * s);                        // crown
  g.fillStyle(P.voidHot, 1); g.fillRect(cx - 2 * s, by - 39 * s, 1 * s + 1, 1); g.fillRect(cx + 1 * s, by - 39 * s, 1 * s + 1, 1);   // eyes
  g.fillStyle(P.slate, 1); g.fillRect(x + w * 0.12, by, w * 0.76, 4); g.fillStyle(P.void, 1); g.fillRect(x + w * 0.12, by + 4, w * 0.76, 1);
  g.fillStyle(0x4a2274, 1); g.fillRect(x + w * 0.16, by - h * 0.18, w * 0.16, 2); g.fillRect(x + w * 0.68, by - h * 0.18, w * 0.16, 2);
  g.fillStyle(P.fire, 1); g.fillRect(x + w * 0.2, by - 4, 2, 3);
}
