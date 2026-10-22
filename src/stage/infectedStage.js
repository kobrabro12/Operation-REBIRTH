// "INFECTED.EXE": the desktop of an old PC that opened every attachment it was ever sent. You fight on the
// taskbar of a giant CRT monitor, and on the title bars of windows left open above it. Three infamous
// viruses take turns with the machine:
//   YOU ARE AN IDIOT  laughing pop-up windows flashing black and white bounce all over the screen and
//                     slam into whoever they touch. Hit one to close it... and two more open.
//   ILOVEYOU          "1 NEW MESSAGE". Love letters rain onto the taskbar and burst into hearts - then it
//                     mails itself to everyone: a second wave falls right on top of each fighter.
//   THE RED ROOM      "Do you like the red room?" won't stay closed. The screen goes red, a crosshair picks
//                     someone and follows them... then locks on, and a red window slams down on that spot.
// All art is drawn in code. Music: 'bgm_infected' and YOU ARE AN IDIOT's song 'sfx_idiot' are Mason's tracks
// (public/assets/audio/music/infected.*, sfx/idiot.*); the music is levelled well below the others to sit in the background.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';
import { FONT } from '../config.js';

// THE RED ROOM's Japanese: "It's your fault for doing this", "She's still alive", "Welcome to the red room"
const JP_FONT = '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "MS Gothic", sans-serif';
const JP = ['これをしたあなたのせいだ', '彼女はまだ生きている', '赤い部屋へようこそ'];
const JP_FLASHES = 16;                                           // how many lines can be flashing on screen at once
// a repeatable 0..1 number from a few integers (so the flashes don't touch the game's random numbers)
const hash = (a, b, c = 0) => { let x = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

export const VPAL = {
  desk: 0x108484, deskDark: 0x0a6a6a, deskLight: 0x2aa0a0,                  // the teal wallpaper
  win: 0xc0c0c0, winLight: 0xffffff, winShade: 0x808080, winDark: 0x2a2a2a,  // grey bevelled windows
  title: 0x0a2484, titleLight: 0x2a6ad8, titleOff: 0x7a7a7a,
  plastic: 0xd8d0b8, plasticShade: 0xb0a88c, plasticDark: 0x7a745e,          // the monitor's beige case
  love: 0xff7ab0, heart: 0xff2a5a, heartDark: 0x9a0a2a, paper: 0xfff6e8, paperShade: 0xe0d0b8,
  red: 0x8a0000, redHot: 0xff2a2a, redDark: 0x2a0000,
  icon: 0xf0e070, outline: 0x0a0a12,
};

// a grey bevelled box, the way every window and button on this desktop is drawn
function bevel(g, x, y, w, h, P = VPAL, sunk = false) {
  g.fillStyle(P.outline, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(sunk ? P.winShade : P.winLight, 1); g.fillRect(x, y, w, h);
  g.fillStyle(sunk ? P.winLight : P.winShade, 1); g.fillRect(x + 1, y + 1, w - 1, h - 1);
  g.fillStyle(P.win, 1); g.fillRect(x + 1, y + 1, w - 2, h - 2);
}
// a window: frame, title bar (with fake text and an X button), and the client area's colour
function drawWindow(g, x, y, w, h, body = VPAL.winLight, title = VPAL.title, P = VPAL) {
  bevel(g, x, y, w, h);
  g.fillStyle(title, 1); g.fillRect(x + 2, y + 2, w - 4, 8);
  g.fillStyle(P.titleLight, title === P.title ? 1 : 0); g.fillRect(x + w * 0.5, y + 2, w * 0.5 - 2, 8);   // the title bar fades lighter
  g.fillStyle(0xffffff, 1); for (let i = 0; i < Math.min(6, (w - 20) / 6); i++) g.fillRect(x + 4 + i * 5, y + 5, 3 + (i % 2), 2);   // the title, too small to read
  bevel(g, x + w - 10, y + 3, 7, 6);
  g.fillStyle(P.outline, 1); g.fillRect(x + w - 8, y + 5, 3, 1); g.fillRect(x + w - 7, y + 6, 1, 1); g.fillRect(x + w - 8, y + 7, 3, 1);   // the X
  g.fillStyle(body, 1); g.fillRect(x + 3, y + 11, w - 6, h - 14);
}
function drawSmiley(g, cx, cy, r, face, ink) {
  g.fillStyle(ink, 1); g.fillCircle(cx, cy, r + 1);
  g.fillStyle(face, 1); g.fillCircle(cx, cy, r);
  g.fillStyle(ink, 1);
  g.fillRect(cx - r * 0.45, cy - r * 0.45, Math.max(1, r * 0.25), Math.max(2, r * 0.4)); g.fillRect(cx + r * 0.2, cy - r * 0.45, Math.max(1, r * 0.25), Math.max(2, r * 0.4));
  for (let i = -3; i <= 3; i++) g.fillRect(cx + i * r * 0.17 - 0.5, cy + r * 0.25 + (3 - Math.abs(i)) * r * 0.08, Math.max(1, r * 0.18), Math.max(1, r * 0.14));
}
function drawHeart(g, x, y, s, col) {
  g.fillStyle(col, 1);
  g.fillCircle(x - s * 0.5, y - s * 0.2, s * 0.55); g.fillCircle(x + s * 0.5, y - s * 0.2, s * 0.55);
  g.fillTriangle(x - s * 1.05, y - s * 0.05, x + s * 1.05, y - s * 0.05, x, y + s * 1.05);
}
function drawEnvelope(g, x, y, P = VPAL) {
  g.fillStyle(P.outline, 1); g.fillRect(x - 12, y - 8, 24, 16);
  g.fillStyle(P.paper, 1); g.fillRect(x - 11, y - 7, 22, 14);
  g.fillStyle(P.paperShade, 1); g.fillTriangle(x - 11, y - 7, x + 11, y - 7, x, y + 1);
  g.fillStyle(P.outline, 1); for (let i = 0; i < 11; i++) { g.fillRect(x - 11 + i, y - 7 + i * 0.73, 1, 1); g.fillRect(x + 10 - i, y - 7 + i * 0.73, 1, 1); }
  drawHeart(g, x, y + 1, 3, P.heart);
}

// YOU ARE AN IDIOT's pop-ups
const IDIOT = {
  end: 920,          // frames the hazard lasts (pop-ups from frame 70, so about 14 seconds of them)
  every: 26,         // a new pop-up opens this often (frames)
  max: 12,           // most pop-ups on screen at once
  total: 40,         // most pop-ups in one hazard (counting the two that open when you close one)
  w: 68, h: 54,      // pop-up size in pixels
};

export class InfectedStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -280, x2: 280, y: 0, solid: true, bottom: 60 },     // the taskbar of the giant monitor
      { x1: -214, x2: -94, y: -86, solid: false },             // title bars of windows left open
      { x1: 94, x2: 214, y: -86, solid: false },
      { x1: -58, x2: 58, y: -164, solid: false },              // an error dialog's title bar, up high
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_infected';
    this.t = 0;
    this.cycle = new HazardCycle(this, ['idiot', 'love', 'redroom'], { color: '#ffffff', stroke: '#0a2484', gap: 560, jitter: 240, first: 360 });
    this.hearts = [];                                            // ILOVEYOU's heart confetti (drawn by the stage)
  }

  // ---------------------------------------------------------------- drawing (built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = VPAL;
    // the wallpaper: teal, in hard bands, with faint CRT scanlines
    const g = s.add.graphics().setScrollFactor(0);
    const bands = [0x0a6a6a, 0x0c7272, 0x0e7a7a, 0x108282, 0x128a8a, 0x108484, 0x0e7c7c, 0x0c7474];
    bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(-400, -60 + i * 70, 1440, 71); });
    for (let y = -60; y < 540; y += 3) { g.fillStyle(0x000000, 0.08); g.fillRect(-400, y, 1440, 1); }
    // far: desktop icons down the left, a cascade of old error dialogs, a giant mouse pointer
    const far = s.add.graphics().setScrollFactor(0.3);
    const icons = [['MY PC', 'pc'], ['TRASH', 'bin'], ['LOVE-LETTER-FOR-YOU.TXT.vbs', 'txt'], ['idiot.exe', 'exe'], ['readme', 'txt']];
    this.iconLabels = [];
    icons.forEach(([label, kind], i) => {
      const x = 40, y = 24 + i * 50;
      this.drawIcon(far, x, y, kind);
      const tx = s.add.text(x + 12, y + 30, label, { fontFamily: FONT, fontSize: '6px', color: '#ffffff', backgroundColor: '#108484', align: 'center', wordWrap: { width: 80, useAdvancedWrap: true } })
        .setOrigin(0.5, 0).setScrollFactor(0.3);
      this.iconLabels.push(tx);
    });
    for (let i = 0; i < 4; i++) {                                // error dialogs nobody closed
      const x = 470 + i * 16, y = 40 + i * 16;
      drawWindow(far, x, y, 130, 64, P.win);
      far.fillStyle(P.redHot, 1); far.fillCircle(x + 18, y + 32, 8); far.fillStyle(0xffffff, 1); far.fillRect(x + 14, y + 31, 9, 2); far.fillRect(x + 17, y + 28, 2, 8);
      far.fillStyle(P.outline, 1); for (let l = 0; l < 3; l++) far.fillRect(x + 32, y + 24 + l * 7, 70 - l * 14, 2);
      bevel(far, x + 50, y + 48, 28, 10); far.fillStyle(P.outline, 1); far.fillRect(x + 58, y + 52, 12, 2);
    }
    // the giant pointer
    far.fillStyle(P.outline, 1); far.fillTriangle(330, 180, 330, 262, 386, 236);
    far.fillStyle(0xffffff, 1); far.fillTriangle(334, 190, 334, 252, 376, 233);
    far.fillStyle(P.outline, 1); far.fillRect(352, 240, 10, 34); far.fillStyle(0xffffff, 1); far.fillRect(354, 240, 6, 32);
    bgLayer.push(g, far, ...this.iconLabels);
    this.bgFx = s.add.graphics().setScrollFactor(0); bgLayer.push(this.bgFx);   // the red room flood, a wandering cursor, flashes
    // THE RED ROOM: "welcome to the red room" pasted over and over across the whole wall
    const row = (JP[2] + '　').repeat(6);
    this.jpWall = s.add.text(-40, -20, Array.from({ length: 18 }, (_, i) => (i % 2 ? '　　　' : '') + row).join('\n'), { fontFamily: JP_FONT, fontSize: '16px', color: '#1a0000', lineSpacing: 6 })
      .setScrollFactor(0).setVisible(false);
    bgLayer.push(this.jpWall);

    worldLayer.push(this.drawMonitor(s));
    this.platG = s.add.graphics(); this.hzG = s.add.graphics(); this.fxG = s.add.graphics();
    this.drawPlatforms();
    worldLayer.push(this.platG, this.hzG, this.fxG);
    // YOU ARE AN IDIOT's caption, the inbox alert, and the red room's question
    const txt = (size, color, stroke) => s.add.text(0, 0, '', { fontFamily: FONT, fontSize: size, color, stroke, strokeThickness: 4, align: 'center', lineSpacing: 4 }).setOrigin(0.5).setVisible(false);
    this.idiotText = txt('14px', '#ffffff', '#000000'); worldLayer.push(this.idiotText);
    this.mailText = txt('9px', '#ffffff', '#9a0a2a'); worldLayer.push(this.mailText);
    this.overG = s.add.graphics().setScrollFactor(0).setDepth(-1); s.addUI(this.overG);   // (under the HUD)
    this.redText = s.add.text(320, 150, '', { fontFamily: FONT, fontSize: '9px', color: '#000000', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(-1).setVisible(false);
    s.addUI(this.redText);
    this.yesNo = [[282, 'YES'], [358, 'NO']].map(([x, label]) => s.add.text(x, 186, label, { fontFamily: FONT, fontSize: '8px', color: '#000000' }).setOrigin(0.5).setScrollFactor(0).setDepth(-1).setVisible(false));
    s.addUI(...this.yesNo);
    // and its phrases flashing all over the screen (under the HUD)
    this.jpFlash = Array.from({ length: JP_FLASHES }, () => s.add.text(0, 0, '', { fontFamily: JP_FONT, fontSize: '20px', color: '#ff2a2a', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(-1).setVisible(false));
    s.addUI(...this.jpFlash);
    this.cycle.makeBanner(s);
  }
  drawIcon(g, x, y, kind) {
    const P = VPAL;
    if (kind === 'pc') {
      g.fillStyle(P.outline, 1); g.fillRect(x, y, 24, 18); g.fillStyle(P.plastic, 1); g.fillRect(x + 1, y + 1, 22, 16);
      g.fillStyle(P.desk, 1); g.fillRect(x + 3, y + 3, 18, 11); g.fillStyle(P.plasticShade, 1); g.fillRect(x + 6, y + 19, 12, 4);
    } else if (kind === 'bin') {
      g.fillStyle(P.outline, 1); g.fillRect(x + 4, y + 2, 16, 22); g.fillStyle(P.win, 1); g.fillRect(x + 5, y + 3, 14, 20);
      g.fillStyle(P.winShade, 1); for (let i = 0; i < 3; i++) g.fillRect(x + 7 + i * 4, y + 6, 2, 15);
    } else if (kind === 'exe') {
      drawWindow(g, x, y + 2, 24, 20, P.winLight); drawSmiley(g, x + 12, y + 16, 4, 0xffffff, P.outline);
    } else {
      g.fillStyle(P.outline, 1); g.fillRect(x + 3, y, 18, 24); g.fillStyle(0xffffff, 1); g.fillRect(x + 4, y + 1, 16, 22);
      g.fillStyle(P.winShade, 1); for (let i = 0; i < 5; i++) g.fillRect(x + 6, y + 4 + i * 4, 11 - (i % 2) * 3, 1);
      if (kind === 'txt' && x) { drawHeart(g, x + 17, y + 20, 3, P.heart); }
    }
  }
  // the main platform: the taskbar along the bottom of a giant beige CRT, sinking away below
  drawMonitor(s) {
    const g = s.add.graphics(), P = VPAL, x1 = -280, x2 = 280;
    for (let row = 0; row < 12; row++) {                         // the case, narrowing as it goes down
      const inset = Math.floor(row * row * 0.8) + row * 5, y = 14 + row * 6;
      g.fillStyle(P.outline, 1); g.fillRect(x1 + inset - 2, y, x2 - x1 - inset * 2 + 4, 7);
      g.fillStyle(row < 2 ? P.plastic : row < 6 ? P.plasticShade : P.plasticDark, 1); g.fillRect(x1 + inset, y, x2 - x1 - inset * 2, 6);
    }
    for (let x = -120; x <= 120; x += 6) { g.fillStyle(P.plasticDark, 1); g.fillRect(x, 28, 3, 10); }   // vents
    g.fillStyle(0x3aff6a, 1); g.fillRect(232, 22, 4, 3);                                                   // the power light
    g.fillStyle(P.outline, 1); g.fillRect(x1 - 2, -2, x2 - x1 + 4, 17);
    g.fillStyle(P.winLight, 1); g.fillRect(x1, 0, x2 - x1, 14);
    g.fillStyle(P.win, 1); g.fillRect(x1, 1, x2 - x1, 13);
    bevel(g, x1 + 3, 2, 46, 10);                                 // START
    g.fillStyle(0xd83a2a, 1); g.fillRect(x1 + 6, 4, 3, 3); g.fillStyle(0x3ab83a, 1); g.fillRect(x1 + 10, 4, 3, 3);
    g.fillStyle(0x2a6ad8, 1); g.fillRect(x1 + 6, 8, 3, 3); g.fillStyle(0xf0c020, 1); g.fillRect(x1 + 10, 8, 3, 3);
    g.fillStyle(P.outline, 1); g.fillRect(x1 + 16, 6, 28, 2);
    for (const [x, w] of [[-218, 70], [-142, 70], [-66, 70]]) { bevel(g, x, 2, w, 10, P, x === -142); g.fillStyle(P.outline, 1); g.fillRect(x + 14, 6, w - 22, 2); g.fillStyle(P.title, 1); g.fillRect(x + 4, 4, 7, 6); }   // open programs
    bevel(g, 206, 2, 70, 10, P, true);                           // the clock tray
    g.fillStyle(P.heart, 1); g.fillRect(212, 5, 5, 4); g.fillStyle(P.redHot, 1); g.fillRect(220, 5, 5, 4);
    g.fillStyle(P.outline, 1); g.fillRect(240, 6, 30, 2);
    return g;
  }
  // the floating platforms: title bars of windows (the windows themselves are faint, half-transparent)
  drawPlatforms() {
    const g = this.platG, P = VPAL; g.clear();
    for (const p of this.platforms) {
      if (p.solid) continue;
      const w = p.x2 - p.x1, high = p.y < -120;
      g.fillStyle(P.win, 0.22); g.fillRect(p.x1, p.y + 10, w, high ? 40 : 52);                   // the window, ghosted out
      g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 12);
      g.fillStyle(high ? P.redHot : P.title, 1); g.fillRect(p.x1, p.y, w, 10);
      g.fillStyle(high ? 0xff8a5a : P.titleLight, 1); g.fillRect(p.x1 + w / 2, p.y, w / 2, 10);
      g.fillStyle(P.winLight, 1); g.fillRect(p.x1, p.y, w, 1);
      for (let i = 0; i < 7; i++) g.fillRect(p.x1 + 4 + i * 5, p.y + 4, 3, 2);
      for (let b = 0; b < 3; b++) { bevel(g, p.x2 - 10 - b * 9, p.y + 2, 7, 6); }                   // _ [] X
      g.fillStyle(P.outline, 1); g.fillRect(p.x2 - 8, p.y + 4, 3, 3);
    }
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    this.hzG.clear(); this.fxG.clear(); this.bgFx.clear(); this.overG.clear();
    this.idiotText.setVisible(false); this.mailText.setVisible(false); this.redText.setVisible(false); this.yesNo.forEach((b) => b.setVisible(false));
    this.jpWall.setVisible(false); this.jpFlash.forEach((x) => x.setVisible(false));
    this.drawAmbience();
    const out = this.cycle.run(match, []);
    this.stepHearts();
    return out;
  }
  // a pointer drifting around the wallpaper, clicking on things
  drawAmbience() {
    const g = this.bgFx, t = this.t, P = VPAL;
    const cx = 320 + Math.sin(t * 0.007) * 220 + Math.sin(t * 0.019) * 40, cy = 150 + Math.sin(t * 0.011 + 1) * 90;
    g.fillStyle(P.outline, 0.5); g.fillTriangle(cx, cy, cx, cy + 14, cx + 10, cy + 10);
    g.fillStyle(0xffffff, 0.5); g.fillTriangle(cx + 1, cy + 2, cx + 1, cy + 12, cx + 8, cy + 10);
    if (t % 180 < 6) { g.lineStyle(1, 0xffffff, 0.4); g.strokeCircle(cx, cy, 4 + (t % 180)); }    // click
  }

  // ---------------------------------------------------------------- hazards
  // YOU ARE AN IDIOT: laughing pop-ups bounce around the screen. Hit one to close it - two more open.
  start_idiot(match, h) { h.title = 'YOU ARE AN IDIOT'; h.wins = []; h.end = IDIOT.end; h.n = 0; h.spawned = 0; }
  // its song (Mason's sfx_idiot): starts when the pop-ups do, fades out as they close
  idiotSong(match, h) {
    const sm = this.scene.sound, vol = Math.min(1, 1.0 * match.sfxVol() * 1.25);
    if (h.t === 70 && vol > 0 && this.scene.cache.audio.exists('sfx_idiot')) {
      this.song = sm.add('sfx_idiot', { volume: vol }); this.song.play();
      if (!this.songHook) { this.songHook = true; this.scene.events.once('shutdown', () => this.stopSong()); }   // leaving the match mid-song
    }
    if (this.song && h.t > h.end - 30) this.song.setVolume(vol * Math.max(0, (h.end - h.t) / 30));
    if (h.t >= h.end) this.stopSong();
  }
  // a recorded sound effect (BootScene loads it), at the player's effects volume
  playClip(match, key, volume) {
    const v = Math.min(1, volume * match.sfxVol() * 1.25);
    if (v > 0 && this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume: v });
  }
  stopSong() { if (this.song) { this.song.stop(); this.song.destroy(); this.song = null; } }
  openWindow(h, x, y) {
    if (h.spawned >= IDIOT.total) return;
    const a = Math.random() * Math.PI * 2, sp = 1.8 + Math.random() * 0.9;
    h.wins.push({ x, y, vx: Math.cos(a) * sp || 1.5, vy: Math.sin(a) * sp, n: ++h.n, open: 0, seen: new Set() });
    h.spawned++;
  }
  step_idiot(match, h, out) {
    const W = IDIOT.w, H = IDIOT.h, inv = (h.t >> 3) % 2, closing = h.t > h.end - 30;
    this.idiotSong(match, h);
    if (h.t === 70) { for (const [x, y] of [[-160, -190], [160, -160], [-40, -120], [60, -210]]) this.openWindow(h, x, y); sfx('popup', 1); }
    if (h.t > 70 && h.t < h.end - 80 && h.t % IDIOT.every === 0 && h.wins.length < IDIOT.max) { this.openWindow(h, (Math.random() - 0.5) * 400, -230); sfx('popup', 0.9, 1.1); }
    for (const w of h.wins) {
      w.open = Math.min(1, w.open + 0.15);
      w.x += w.vx; w.y += w.vy;
      if (w.x < -300 + W / 2 || w.x > 300 - W / 2) { w.vx = -w.vx; w.x = Math.max(-300 + W / 2, Math.min(300 - W / 2, w.x)); }
      if (w.y < -244 + H / 2 || w.y > -H / 2 - 2) { w.vy = -w.vy; w.y = Math.max(-244 + H / 2, Math.min(-H / 2 - 2, w.y)); }
      const k = closing ? Math.max(0, (h.end - h.t) / 30) : w.open, ww = W * k, hh = H * k;
      if (ww < 6) continue;
      const g = this.hzG, x = Math.round(w.x - ww / 2), y = Math.round(w.y - hh / 2), fg = inv ? 0xffffff : 0x000000, bg = inv ? 0x000000 : 0xffffff;
      drawWindow(g, x, y, ww, hh, bg);
      if (k > 0.8) for (let i = -1; i <= 1; i++) drawSmiley(g, w.x + i * 19, w.y + 7, 6, 0xffffff, fg === 0x000000 ? 0x000000 : 0x2a2a2a);
      if (k > 0.8) out.push({ x1: x, x2: x + ww, y1: y, y2: y + hh, dmg: 5, angle: 50, base: 3.4, growth: 2.6, dirX: Math.sign(w.vx) || 1, id: 'idiot' + h.id + ':' + w.n + ':' + Math.floor(h.t / 40), hazard: true });
    }
    if (h.wins.length && !closing) {                             // the caption across the sky, flashing with them
      this.idiotText.setText('YOU ARE AN IDIOT!\nHA HA HA HA HA').setPosition(0, -222).setColor(inv ? '#000000' : '#ffffff').setStroke(inv ? '#ffffff' : '#000000', 4).setVisible(true);
      this.bgFx.fillStyle(inv ? 0x000000 : 0xffffff, 0.06); this.bgFx.fillRect(0, 0, 640, 360);
    }
    return h.t >= h.end;
  }
  // a fighter's hit closes a pop-up... and two more open in its place
  strikeTargets(match, hbs) {
    const h = this.cycle.hz;
    if (!h || h.kind !== 'idiot' || !this.hazardsOn || h.t > h.end - 80) return;
    for (const w of [...h.wins]) {
      if (w.open < 1) continue;
      const b = { x1: w.x - IDIOT.w / 2, x2: w.x + IDIOT.w / 2, y1: w.y - IDIOT.h / 2, y2: w.y + IDIOT.h / 2 };
      const hb = hbs.find((x) => x.x1 < b.x2 && x.x2 > b.x1 && x.y1 < b.y2 && x.y2 > b.y1 && !w.seen.has(x.id));
      if (!hb) continue;
      w.seen.add(hb.id);
      h.wins.splice(h.wins.indexOf(w), 1);
      match.puff(w.x, w.y, 0xffffff, 8); match.puff(w.x, w.y, 0x000000, 6);
      sfx('popup', 1);
      if (h.wins.length < IDIOT.max) { this.openWindow(h, w.x - 20, w.y); this.openWindow(h, w.x + 20, w.y); }
    }
  }

  // ILOVEYOU: "1 NEW MESSAGE" - love letters rain onto the taskbar and burst into hearts, then a second wave
  // mails itself straight to every fighter
  start_love(match, h) {
    h.title = 'ILOVEYOU';
    h.letters = Array.from({ length: 5 }, (_, i) => ({ x: -240 + i * 120 + (Math.random() - 0.5) * 60, at: 80 + i * 14 }));
    h.wave2 = 210; h.sent = false;
  }
  step_love(match, h, out) {
    const g = this.hzG, P = VPAL;
    if (h.t < 70) {                                              // the new-mail alert, bouncing above the stage
      this.mailText.setText('1 NEW MESSAGE\nSUBJECT: ILOVEYOU').setPosition(0, -182 - Math.abs(Math.sin(h.t * 0.15)) * 4).setVisible((h.t >> 3) % 4 !== 0);
      drawEnvelope(g, 0, -208 - Math.abs(Math.sin(h.t * 0.15)) * 4);
      if (h.t === 10) sfx('mail', 0.7);
    }
    if (h.t === h.wave2 - 30 && !h.sent) {                       // it found your address book
      h.sent = true; sfx('mail', 0.6, 1.2);
      for (const f of match.fighters) if (f.alive && f.state !== 'respawn') h.letters.push({ x: f.x, at: h.wave2 + h.letters.length % 3 * 6, follow: f });
    }
    if (h.t === h.letters[0].at || h.t === h.wave2) this.playClip(match, 'sfx_mail_voice', 1);   // "You've got mail!" as they fall from the sky
    let live = false;
    for (const L of h.letters) {
      if (L.done) continue; live = true;
      if (h.t < L.at) {                                          // a heart-shaped target on the floor (it follows its fighter until it drops)
        if (L.follow && L.follow.alive) L.x = L.follow.x;
        const fy = L.follow && L.follow.alive ? L.follow.y : 0;
        L.fy = fy;
        g.fillStyle(P.love, 0.3 + 0.25 * ((h.t >> 2) % 2)); g.fillEllipse(L.x, fy + 1, 30, 6);
        drawHeart(g, L.x, fy - 3, 2, P.heart);
        continue;
      }
      if (L.y === undefined) { L.y = (L.fy ?? 0) - 330; L.vy = 0; L.floor = L.fy ?? 0; }
      if (L.burst === undefined) {
        L.vy = Math.min(9, L.vy + 0.45); L.y += L.vy;
        const sway = Math.sin((h.t + L.at) * 0.3) * 3;
        drawEnvelope(g, L.x + sway, L.y);
        out.push({ x1: L.x - 12, x2: L.x + 12, y1: L.y - 8, y2: L.y + 8, dmg: 5, angle: 80, base: 3.0, growth: 2.6, id: 'letter' + h.id + ':' + L.at + ':' + Math.round(L.x), hazard: true });
        const landed = (L.y >= L.floor - 2 && L.x > -280 && L.x < 280 && L.floor === 0) || L.y >= L.floor + 4 || L.y > 260;
        if (landed) {
          L.burst = 0; sfx('petal', 0.7, 0.9); sfx('hit', 0.4, 1.4);
          for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); this.hearts.push({ x: L.x, y: L.y, vx: Math.cos(a) * (1 + Math.random() * 2.4), vy: Math.sin(a) * (2 + Math.random() * 2), life: 40, s: 2 + Math.random() * 2 }); }
        }
      } else {
        L.burst++;
        const r = 10 + L.burst * 5;
        g.lineStyle(2, P.love, 1 - L.burst / 8); g.strokeCircle(L.x, L.y - 4, r);
        if (L.burst <= 5) out.push({ x1: L.x - 34, x2: L.x + 34, y1: L.y - 40, y2: L.y + 6, dmg: 7, angle: 70, base: 3.6, growth: 3.4, radial: true, id: 'heartburst' + h.id + ':' + L.at + ':' + Math.round(L.x), hazard: true });
        if (L.burst >= 8) L.done = true;
      }
    }
    return h.sent && !live;
  }
  stepHearts() {
    const g = this.fxG;
    for (const p of this.hearts) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.98; p.life--; drawHeart(g, p.x, p.y, p.s, p.life % 10 < 5 ? VPAL.heart : VPAL.love); }
    this.hearts = this.hearts.filter((p) => p.life > 0);
  }

  // THE RED ROOM: the pop-up that won't stay closed. Then the screen goes red, a crosshair picks someone and
  // follows them... locks on... and a red window slams down on that spot. Keep moving.
  start_redroom(match, h) {
    h.title = 'THE RED ROOM';
    const alive = match.fighters.filter((f) => f.alive && f.state !== 'respawn');
    h.target = alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
    h.cx = h.target ? h.target.x : 0; h.cy = h.target ? h.target.y - 26 : -26;
    h.lockAt = 280; h.slamAt = 316; h.end = 380;
  }
  // the Japanese: the welcome pasted over the wall, scrolling up; the three phrases flashing everywhere, faster and
  // more of them as the slam comes
  redRoomText(h, t, red) {
    this.jpWall.setVisible(true).setAlpha(0.75 * red).setY(-20 - ((this.t * 0.4) % 44));
    const step = t > h.lockAt ? 3 : 6, slot = Math.floor(t / step), n = Math.round(JP_FLASHES * (t < 140 ? 0.3 : t < h.lockAt ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const r = (k) => hash(h.id, slot, i * 7 + k);
      if (r(0) < 0.3) continue;                                     // flicker
      const big = r(1) < 0.2, col = ['#ff2a2a', '#ffffff', '#000000', '#ff8a8a'][Math.floor(r(2) * 4)];
      this.jpFlash[i].setText(JP[Math.floor(r(3) * JP.length)]).setPosition(40 + r(4) * 560, 20 + r(5) * 300)
        .setFontSize(big ? 34 : 12 + Math.floor(r(6) * 14)).setColor(col).setStroke(col === '#000000' ? '#ff2a2a' : '#000000', 3)
        .setAngle((r(7) - 0.5) * 16).setAlpha(red * (0.6 + 0.4 * r(8))).setVisible(true);
    }
  }
  step_redroom(match, h, out) {
    const P = VPAL, g = this.hzG, o = this.overG, t = h.t;
    // the pop-up: open, closed, open, closed... and open again
    if (t < 110) {
      const shown = t < 30 || (t >= 42 && t < 62) || t >= 74;
      if ((t === 0 || t === 42 || t === 74)) sfx('popup', 0.7, t === 74 ? 0.8 : 1);
      if (shown) {
        drawWindow(o, 220, 112, 200, 92, P.win, t >= 74 ? P.red : P.title);
        bevel(o, 262, 178, 40, 14); bevel(o, 338, 178, 40, 14);                        // [YES] [NO] - neither one closes it
        this.redText.setText('DO YOU LIKE THE\nRED ROOM?').setColor(t >= 74 ? '#8a0000' : '#000000').setPosition(320, 150).setVisible(true);
        this.yesNo.forEach((b) => b.setVisible(true));
      }
    }
    // the room goes red
    const red = Math.min(1, Math.max(0, (t - 100) / 20)) * Math.min(1, Math.max(0, (h.end - t) / 30));
    if (red > 0) {
      const b = this.bgFx; b.fillStyle(P.red, 0.85 * red); b.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 6; i++) { b.fillStyle(P.redDark, 0.5 * red); b.fillRect(0, ((i * 67 + this.t * 0.6) % 380) - 20, 640, 10); }
      o.fillStyle(P.red, 0.18 * red); o.fillRect(0, 0, 640, 360);
      this.redRoomText(h, t, red);
      if (t > 120 && t < h.lockAt && (t >> 4) % 2) { this.redText.setText('DO YOU LIKE THE RED ROOM?').setColor('#ff2a2a').setPosition(320, 40).setVisible(true); }
    }
    // the crosshair: follows its target, then locks
    const T = h.target;
    if (t >= 120 && t < h.lockAt && T && T.alive) { h.cx += (T.x - h.cx) * 0.07; h.cy += (T.y - 26 - h.cy) * 0.07; }
    if (t === 120) sfx('curse', 0.6, 0.6);
    if (t === h.lockAt) { sfx('warn', 0.8, 1.4); h.lockY = h.cy; }
    if (t >= 120 && t < h.slamAt) {
      const blink = t >= h.lockAt && (t >> 1) % 2, r = t < h.lockAt ? 22 : 22 - (t - h.lockAt) * 0.3;
      g.lineStyle(2, blink ? 0xffffff : P.redHot, 1); g.strokeCircle(h.cx, h.cy, r);
      g.fillStyle(blink ? 0xffffff : P.redHot, 1);
      g.fillRect(h.cx - r - 8, h.cy - 1, 12, 2); g.fillRect(h.cx + r - 4, h.cy - 1, 12, 2); g.fillRect(h.cx - 1, h.cy - r - 8, 2, 12); g.fillRect(h.cx - 1, h.cy + r - 4, 2, 12);
      if (t >= h.lockAt) { g.fillStyle(P.redHot, 0.15 + 0.1 * ((t >> 1) % 2)); g.fillRect(h.cx - 28, -420, 56, h.cy + 446); }   // where it'll land
    }
    // the slam: a red window drops on the spot like a guillotine
    if (t >= h.slamAt && t < h.slamAt + 22) {
      const k = Math.min(1, (t - h.slamAt + 1) / 4), bottom = -420 + (h.lockY + 30 + 420) * k;
      drawWindow(g, h.cx - 30, bottom - 120, 60, 120, P.red, P.redHot);
      g.fillStyle(P.redDark, 1); g.fillRect(h.cx - 22, bottom - 96, 44, 2); g.fillRect(h.cx - 22, bottom - 80, 30, 2);
      if (t === h.slamAt + 3) { sfx('bighit', 1, 0.6); sfx('glitch', 0.6, 0.6); match.shake(9, 10); match.puff(h.cx, h.lockY + 26, P.redHot, 12); }
      if (t >= h.slamAt + 2 && t <= h.slamAt + 7) out.push({ x1: h.cx - 30, x2: h.cx + 30, y1: bottom - 120, y2: bottom, dmg: 15, angle: 80, base: 5.0, growth: 4.8, id: 'redroom' + h.id, hazard: true });
    }
    return t >= h.end;
  }
}

// Miniature of INFECTED.EXE for the select screen: the teal desktop, a laughing pop-up, a love letter, the taskbar
export function drawInfectedPreview(g, x, y, w, h) {
  const P = VPAL;
  g.fillStyle(P.desk, 1); g.fillRect(x, y, w, h);
  for (let sy = y; sy < y + h; sy += 3) { g.fillStyle(0x000000, 0.1); g.fillRect(x, sy, w, 1); }
  for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 1); g.fillRect(x + 4, y + 4 + i * 9, 6, 5); }                 // icons
  const wx = x + w * 0.52, wy = y + h * 0.12, ww = w * 0.36, wh = h * 0.36;                                          // the idiot pop-up
  g.fillStyle(P.outline, 1); g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2); g.fillStyle(0x000000, 1); g.fillRect(wx, wy, ww, wh);
  g.fillStyle(P.title, 1); g.fillRect(wx, wy, ww, 3);
  for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 1); g.fillCircle(wx + ww * (0.22 + i * 0.28), wy + wh * 0.6, Math.max(1.5, ww * 0.09)); }
  drawHeart(g, x + w * 0.3, y + h * 0.3, Math.max(2, w * 0.03), P.heart);
  const top = y + h * 0.72;                                                                                          // the taskbar on the monitor
  g.fillStyle(P.outline, 1); g.fillRect(x + w * 0.12, top - 1, w * 0.76, 5);
  g.fillStyle(P.win, 1); g.fillRect(x + w * 0.13, top, w * 0.74, 3);
  for (let r = 1; r < 5; r++) { g.fillStyle(r < 3 ? P.plastic : P.plasticShade, 1); g.fillRect(x + w * (0.13 + r * 0.04), top + r * 3, w * (0.74 - r * 0.08), 3); }
  g.fillStyle(P.title, 1); g.fillRect(x + w * 0.2, top - h * 0.2, w * 0.2, 2); g.fillRect(x + w * 0.6, top - h * 0.2, w * 0.2, 2);
}
