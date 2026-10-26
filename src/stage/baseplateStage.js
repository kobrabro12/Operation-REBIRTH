// "BASEPLATE 2012": a love letter to the old block-building games of 2010-2016 (an original stage - no
// names or logos from any real game). The fight is on a studded green baseplate floating in a bright default
// sky, between a red tower and a blue tower built for sword fights, with a grey brick hanging over the middle.
// Far off, blocky guests in the classic default colours stand around on their own floating plates, building
// things and chatting in speech bubbles. All art is drawn in code. Music: 'bgm_baseplate'.
//
// Stage hazards, one at a time every 10-14 s, each announced with a CAUTION banner first:
//   ROCKET BARRAGE - red crosshairs appear on the plate; rockets fire from the tops of the towers and blow
//                    up on them (chunky orange explosions, bricks flying).
//   LOOSE BRICKS   - shadows on the plate grow as unanchored bricks fall out of the sky; they bounce off and
//                    tumble away.
//   LAG SPIKE      - the connection bars flicker... everything freezes, then everyone snaps back to where
//                    they were a moment ago.
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
const CHAT = ['lol', 'brb', 'who wants to sword fight', 'free admin??', 'can someone build me a house', 'lag...', 'noob', 'oof', 'follow me', 'gg', 'how do u jump', 'tix 4 trade', 'im a guest', 'meet at spawn'];

export class BaseplateStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -280, x2: 280, y: 0, solid: true, bottom: 40 },      // the baseplate
      { x1: -262, x2: -170, y: -110, solid: false },             // the red tower's top
      { x1: 170, x2: 262, y: -110, solid: false },               // the blue tower's top
      { x1: -56, x2: 56, y: -190, solid: false },                // the floating grey brick
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.t = 0;
    this.music = 'bgm_baseplate';
    this.cycle = new HazardCycle(this, ['rockets', 'bricks', 'lag'], { color: '#ffffff', stroke: '#1b2a35' });
    const R = (n) => { let s = n; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
    const r = R(11);
    this.rnd = r;
    // the guests on the far plates: x, y on screen (parallax layer), and what they're up to
    this.guests = [[70, 236, 0], [112, 236, 1], [300, 210, 2], [520, 240, 3], [560, 240, 4], [760, 220, 5]].map(([x, y, i]) => ({ x, y, i, ph: r() * 6.28 }));
    this.bubbles = [];
    this.hist = new Map();                                   // where each fighter was, the last second (LAG SPIKE)
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
  // a classic blocky guest: yellow head and arms, blue torso, green legs
  guest(g, x, y, dir, wave, s = 1) {
    const P = BPAL, u = s;
    g.fillStyle(P.outline, 1); g.fillRect(x - 5 * u, y - 22 * u, 10 * u, 22 * u);
    g.fillStyle(P.legs, 1); g.fillRect(x - 4 * u, y - 9 * u, 4 * u, 9 * u); g.fillRect(x, y - 9 * u, 4 * u, 9 * u);
    g.fillStyle(P.shirt, 1); g.fillRect(x - 4 * u, y - 17 * u, 8 * u, 8 * u);
    g.fillStyle(P.skin, 1); g.fillRect(x - 6 * u, y - 17 * u + (wave ? -6 * u : 0), 2 * u, 8 * u); g.fillRect(x + 4 * u, y - 17 * u, 2 * u, 8 * u);   // arms (one waving)
    g.fillRect(x - 3 * u, y - 22 * u, 6 * u, 5 * u);                                    // head
    g.fillStyle(P.black, 1); g.fillRect(x + dir * u - u, y - 21 * u, u, u); g.fillRect(x + dir * u + u, y - 21 * u, u, u);   // eyes
    g.fillRect(x + dir * u - u, y - 19 * u, 3 * u, u);                                  // a smile
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
    bgLayer.push(sky, far);
    this.bgFx = s.add.graphics().setScrollFactor(0.3); bgLayer.push(this.bgFx);      // the guests (they move a little) and their chat
    this.chatText = [];
    for (let i = 0; i < 3; i++) {
      const tx = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#1b2a35' }).setOrigin(0.5, 1).setScrollFactor(0.3).setVisible(false);
      bgLayer.push(tx); this.chatText.push(tx);
    }
    // the world: the towers, the plate, the brick, the spawn pad
    const w = s.add.graphics();
    this.drawTowers(w); this.drawPlate(w); this.drawBrickPlatform(w);
    worldLayer.push(w);
    this.fxG = s.add.graphics(); this.hzG = s.add.graphics(); worldLayer.push(this.fxG, this.hzG);
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
  drawBrickPlatform(g) {
    const P = BPAL;
    this.brick(g, -56, -190, 112, 12, [P.grey, P.greyLight, P.greyDark], true);
    g.fillStyle(0x000000, 0.12); g.fillRect(-56, -178, 112, 3);
  }

  step(match) {
    this.t++;
    const t = this.t, P = BPAL, f = this.fxG, bg = this.bgFx;
    // where everyone has been (LAG SPIKE snaps them back here)
    for (const fi of match.fighters) {
      let h = this.hist.get(fi); if (!h) { h = []; this.hist.set(fi, h); }
      h.push([fi.x, fi.y]); if (h.length > 60) h.shift();
    }
    // the guests: idling, one waving now and then; a chat bubble pops up over one every few seconds
    bg.clear();
    for (const gst of this.guests) {
      const hop = (t + gst.i * 37) % 300 < 12 ? -Math.round(Math.sin(((t + gst.i * 37) % 300) / 12 * Math.PI) * 6) : 0;
      this.guest(bg, gst.x, gst.y + hop, gst.i % 2 ? -1 : 1, (t + gst.i * 50) % 240 < 40 && (t >> 3) % 2 === 0, 1);
    }
    if (t % 150 === 0) {
      const gst = this.guests[Math.floor(Math.random() * this.guests.length)];
      this.bubbles.push({ gst, text: CHAT[Math.floor(Math.random() * CHAT.length)], life: 140 });
      if (this.bubbles.length > 3) this.bubbles.shift();
    }
    this.bubbles = this.bubbles.filter((b) => --b.life > 0);
    this.chatText.forEach((tx, i) => {
      const b = this.bubbles[i];
      if (!b) { tx.setVisible(false); return; }
      const x = b.gst.x, y = b.gst.y - 28, wpx = b.text.length * 6 + 8;
      bg.fillStyle(0xffffff, 0.92); bg.fillRect(x - wpx / 2, y - 12, wpx, 12); bg.fillTriangle(x - 3, y, x + 3, y, x, y + 4);
      bg.lineStyle(1, P.black, 0.6); bg.strokeRect(x - wpx / 2, y - 12, wpx, 12);
      tx.setText(b.text).setPosition(x, y - 2).setVisible(true);
    });
    // a little life on the plate: the spawn pad's glow
    f.clear();
    f.fillStyle(0xffffff, 0.08 + 0.05 * Math.sin(t * 0.05)); f.fillRect(-24, -10, 48, 6);
    this.hzG.clear();
    return this.cycle.run(match, []);
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
