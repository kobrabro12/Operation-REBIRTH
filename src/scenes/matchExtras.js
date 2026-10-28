// SHOP EXTRAS IN MATCHES: what you bought in the shop (Trinkets > SHOP) and switched on shows up here.
//  - STAGE EFFECTS (one at a time, on every stage): weather and skies drawn over the stage - NIGHTFALL, THUNDERSTORM,
//    BLIZZARD, CHERRY BLOSSOM, FIREFLIES, BLOOD MOON, SANDSTORM, AURORA.
//  - EXTRAS (any number): DAMAGE NUMBERS, CONFETTI KOS, FINAL KO CAM (slow motion on the match-winning KO), PARTY HATS,
//    MOON GRAVITY, AIRHORN KOS, RAINBOW TRAILS, IMPACT FRAMES.
// MatchScene calls: onHit (every hit), onKO (every KO), onFinalKO, step (every tick), draw (every frame), timeScale
// (slow motion), cleanup. Not used in the title demo. Effects are visual only, except MOON GRAVITY.
import { VIEW_W, VIEW_H, FONT, PHYS } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { equippedStageFx, extraOn } from '../progress.js';

const W = VIEW_W, H = VIEW_H;
const RAINBOW = [0xff4a4a, 0xff9a3a, 0xffe04a, 0x5aff6a, 0x4ac8ff, 0x8a6aff, 0xff6ad8];
// MOON GRAVITY: how much of the normal gravity and fall speed is left
const MOON = { gravity: 0.55, fall: 0.7 };
// FINAL KO CAM: how slow, and for how many ticks
const FINAL = { speed: 0.3, ticks: 100 };

export class MatchExtras {
  constructor(m) {
    this.m = m; this.t = 0;
    this.fx = m.demo ? null : equippedStageFx();
    const on = (id) => !m.demo && extraOn(id);
    this.on = { numbers: on('ext-numbers'), confetti: on('ext-confetti'), finalcam: on('ext-finalcam'), hats: on('ext-hats'),
      moon: on('ext-moon'), airhorn: on('ext-airhorn'), rainbow: on('ext-rainbow'), impact: on('ext-impact') };
    this.slow = 0; this.impact = 0; this.flash = 0; this.bolt = null;
    // layers: the sky (behind the stage's things, on the background camera), the weather (over the world, under the HUD),
    // and world-space bits (hats)
    this.sky = m.add.graphics().setScrollFactor(0).setDepth(49); m.addBg(this.sky);
    this.weather = m.add.graphics().setDepth(4); m.addUI(this.weather);
    this.world = m.add.graphics().setDepth(6); m.addWorld(this.world);
    this.spots = Array.from({ length: 80 }, (_, i) => [((i * 7919) % 997) / 997, ((i * 104729) % 991) / 991, ((i * 31) % 97) / 97]);
    if (this.on.moon) { this.saved = { g: PHYS.gravity, f: PHYS.maxFall, ff: PHYS.fastFall }; PHYS.gravity *= MOON.gravity; PHYS.maxFall *= MOON.fall; PHYS.fastFall *= MOON.fall; }
  }
  cleanup() { if (this.saved) { PHYS.gravity = this.saved.g; PHYS.maxFall = this.saved.f; PHYS.fastFall = this.saved.ff; this.saved = null; } }

  // how fast the match runs right now (FINAL KO CAM's slow motion)
  timeScale() { return this.slow > 0 ? FINAL.speed : 1; }

  onHit(t, dmg, kb) {
    const c = t.center();
    if (this.on.numbers) {                                        // the damage, popping off them - bigger and redder for big hits
      const big = dmg >= 12, col = dmg >= 18 ? '#ff3a3a' : big ? '#ffb84a' : '#ffffff';
      const txt = this.m.add.text(c.x + (Math.random() - 0.5) * 16, c.y - 20, String(dmg), { fontFamily: FONT, fontSize: (big ? 14 : 10) + 'px', color: col, stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5).setDepth(7);
      this.m.addWorld(txt); this.m.pops.push({ t: txt, life: 45 });
    }
    if (this.on.impact && kb > 9) { this.impact = 4; }            // IMPACT FRAMES: a big hit flashes black and white
  }

  onKO(f, x, y) {
    if (this.on.confetti) for (let i = 0; i < 60; i++) {        // confetti: paper bits that flutter down
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      this.m.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 60 + Math.random() * 50, color: RAINBOW[i % RAINBOW.length], size: 3, grav: 0.06, drag: 0.97, sway: i * 7 });
    }
    if (this.on.airhorn) { sfx('airhorn', 0.9); }
  }
  onFinalKO() { if (this.on.finalcam) { this.slow = FINAL.ticks; this.flash = 6; } }

  step() {
    this.t++;
    if (this.slow > 0) this.slow--;
    if (this.on.rainbow) for (const f of this.m.fighters) {        // RAINBOW TRAILS: launched fighters leave a rainbow
      if (!f.alive || f.state !== 'hitstun') continue;
      const sp = Math.hypot(f.lx || 0, f.ly || 0) + Math.hypot(f.vx || 0, f.vy || 0);
      if (sp < 3) continue;
      const c = f.center();
      for (let i = 0; i < 2; i++) this.m.particles.push({ x: c.x + (Math.random() - 0.5) * 8, y: c.y + (i - 0.5) * 6, vx: 0, vy: 0, life: 22, color: RAINBOW[(this.t + i * 3) % RAINBOW.length], size: 4, grav: 0 });
    }
    // weather that makes sounds: thunder
    if (this.fx === 'fx-storm' && !this.bolt && Math.random() < 1 / 420) { this.bolt = { t: 0, x: 60 + Math.random() * (W - 120) }; sfx('thunder', 0.5, 0.8 + Math.random() * 0.3); }
    if (this.bolt && ++this.bolt.t > 18) this.bolt = null;
  }

  draw() {
    const t = this.t, sk = this.sky, w = this.weather, wd = this.world;
    sk.clear(); w.clear(); wd.clear();
    const spot = (i) => this.spots[i % this.spots.length];
    switch (this.fx) {
      case 'fx-night':                                            // NIGHTFALL: deep blue, stars, a crescent moon
        for (let i = 0; i < 40; i++) { const s = spot(i); sk.fillStyle(0xffffff, 0.4 + 0.5 * Math.abs(Math.sin(t * 0.03 + i))); sk.fillRect(s[0] * W, s[1] * H * 0.5, 1 + (i % 5 === 0), 1); }
        sk.fillStyle(0xf4f0d8, 1); sk.fillCircle(540, 54, 18); sk.fillStyle(0x0a1030, 1); sk.fillCircle(548, 48, 16);
        w.fillStyle(0x0a1030, 0.5); w.fillRect(0, 0, W, H); break;
      case 'fx-storm':                                            // THUNDERSTORM: dark, rain, lightning
        w.fillStyle(0x0a0e1a, 0.42); w.fillRect(0, 0, W, H);
        for (let i = 0; i < 80; i++) { const s = spot(i), x = (s[0] * W * 1.2 + i * 37 - t * 4) % (W + 40), y = (s[1] * H + t * 13 + i * 19) % (H + 30) - 20; w.lineStyle(1, 0x9ab0d8, 0.55); w.lineBetween(x, y, x - 4, y + 12); }
        if (this.bolt) {
          const b = this.bolt; w.fillStyle(0xffffff, Math.max(0, 0.5 - b.t * 0.04)); w.fillRect(0, 0, W, H);
          if (b.t < 8) { w.lineStyle(3, 0xffffff, 1); let x = b.x, y = 0; for (let k = 0; k < 7; k++) { const nx = x + ((k * 37 + b.x) % 30) - 15, ny = y + 26; w.lineBetween(x, y, nx, ny); x = nx; y = ny; } }
        }
        break;
      case 'fx-snow':                                             // BLIZZARD: snow driving sideways, a white haze
        w.fillStyle(0xd8e8ff, 0.12); w.fillRect(0, 0, W, H);
        for (let i = 0; i < 90; i++) { const s = spot(i), x = (s[0] * W + t * (1.5 + s[2] * 2) + Math.sin(t * 0.05 + i) * 8) % W, y = (s[1] * H + t * (0.8 + s[2])) % H; w.fillStyle(0xffffff, 0.7 + 0.3 * s[2]); w.fillRect(x, y, 1 + (i % 3 === 0), 1 + (i % 3 === 0)); }
        w.fillStyle(0xffffff, 0.08); w.fillRect(0, H - 60, W, 60); break;
      case 'fx-sakura':                                           // CHERRY BLOSSOM: pink petals, a warm blush
        w.fillStyle(0xff8ab0, 0.06); w.fillRect(0, 0, W, H);
        for (let i = 0; i < 45; i++) { const s = spot(i), x = (s[0] * W + t * (0.6 + s[2]) + Math.sin(t * 0.04 + i) * 14) % W, y = (s[1] * H + t * (0.5 + s[2] * 0.5)) % H; w.fillStyle(i % 3 ? 0xffb8d0 : 0xffffff, 0.9); w.fillEllipse(x, y, 4 + Math.abs(Math.sin(t * 0.08 + i)) * 2, 3); }
        break;
      case 'fx-fireflies':                                        // FIREFLIES: a violet dusk, little lights drifting
        w.fillStyle(0x2a1440, 0.28); w.fillRect(0, 0, W, H); w.fillStyle(0xff9a3a, 0.08); w.fillRect(0, H * 0.55, W, H * 0.45);
        for (let i = 0; i < 26; i++) { const s = spot(i), x = s[0] * W + Math.sin(t * 0.013 + i * 2) * 40, y = H * 0.35 + s[1] * H * 0.6 + Math.cos(t * 0.017 + i) * 20, a = 0.5 + 0.5 * Math.sin(t * 0.09 + i * 3);
          w.fillStyle(0xd8ff6a, 0.2 * a); w.fillCircle(x, y, 6); w.fillStyle(0xf4ffc8, a); w.fillRect(x - 1, y - 1, 2, 2); }
        break;
      case 'fx-bloodmoon':                                        // BLOOD MOON: everything red, a huge moon, mist
        this.glowAt(sk, 470, 80, 90, 0xff2a2a, 0.35); sk.fillStyle(0xc81a1a, 1); sk.fillCircle(470, 80, 44); sk.fillStyle(0xe0383a, 1); sk.fillCircle(456, 70, 10); sk.fillCircle(488, 96, 7);
        w.fillStyle(0x5a0410, 0.3); w.fillRect(0, 0, W, H);
        for (let i = 0; i < 6; i++) { w.fillStyle(0xc81a2a, 0.08); w.fillEllipse(((t * (0.3 + i * 0.1) + i * 150) % (W + 300)) - 150, H - 30 + (i % 3) * 8, 300, 40); }
        break;
      case 'fx-sand':                                             // SANDSTORM: a tan haze, dust streaming past
        w.fillStyle(0xc89a5a, 0.24); w.fillRect(0, 0, W, H);
        for (let i = 0; i < 60; i++) { const s = spot(i), x = (s[0] * W - t * (6 + s[2] * 8)) % W + W, y = s[1] * H + Math.sin(t * 0.04 + i) * 6; w.lineStyle(1, 0xe8c890, 0.5); w.lineBetween(x % W, y, x % W + 14 + s[2] * 20, y); }
        break;
      case 'fx-aurora':                                           // AURORA: ribbons of green and violet light across the sky
        for (let i = 0; i < 30; i++) { const s = spot(i); sk.fillStyle(0xffffff, 0.5); sk.fillRect(s[0] * W, s[1] * H * 0.4, 1, 1); }
        for (let r = 0; r < 3; r++) for (let x = 0; x < W; x += 6) {
          const y = 40 + r * 24 + Math.sin(x * 0.012 + t * 0.02 + r) * 18 + Math.sin(x * 0.03 - t * 0.015) * 6, hgt = 30 + 14 * Math.sin(x * 0.02 + t * 0.03 + r * 2);
          sk.fillStyle(r === 1 ? 0x8a5aff : 0x3affa8, 0.12); sk.fillRect(x, y, 6, hgt); sk.fillStyle(r === 1 ? 0xc8a8ff : 0xa8ffd8, 0.1); sk.fillRect(x, y, 6, 4);
        }
        w.fillStyle(0x061420, 0.25); w.fillRect(0, 0, W, H); break;
    }
    // PARTY HATS: a striped cone on every fighter's head, with a pom-pom
    if (this.on.hats) for (const f of this.m.fighters) {
      if (!f.alive) continue;
      const x = f.x, y = f.y - (f.body ? f.body.h : 48) - 2, c1 = RAINBOW[(f.slot * 2) % RAINBOW.length], c2 = 0xffffff;
      wd.fillStyle(c1, 1); wd.fillTriangle(x - 7, y, x + 7, y, x + (f.facing || 1), y - 18);
      wd.fillStyle(c2, 1); wd.fillTriangle(x - 4.5, y - 6, x + 4.5, y - 6, x + 2.6, y - 10); wd.fillRect(x - 7, y - 1, 14, 2);
      wd.fillStyle(0xffe04a, 1); wd.fillCircle(x + (f.facing || 1), y - 18, 3);
    }
    // FINAL KO CAM: slow motion with letterbox bars sliding in
    if (this.slow > 0) { const k = Math.min(1, (FINAL.ticks - this.slow) / 12), bar = 34 * k; w.fillStyle(0x000000, 1); w.fillRect(0, 0, W, bar); w.fillRect(0, H - bar, W, bar); }
    if (this.flash > 0) { w.fillStyle(0xffffff, this.flash / 8); w.fillRect(0, 0, W, H); this.flash--; }
    // IMPACT FRAMES: two frames of black, two of white
    if (this.impact > 0) { w.fillStyle(this.impact > 2 ? 0x000000 : 0xffffff, 0.55); w.fillRect(0, 0, W, H); this.impact--; }
  }
  glowAt(g, x, y, r, col, a) { for (let i = 1; i <= 5; i++) { g.fillStyle(col, a / 5); g.fillCircle(x, y, r * (1.15 - i * 0.17)); } }
}
