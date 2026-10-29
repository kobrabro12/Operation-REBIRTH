// SHOP EXTRAS IN MATCHES: what you bought in the shop (Trinkets > SHOP) and switched on shows up here.
//  - STAGE EFFECTS (one at a time, on every stage): each re-themes the stage - a new backdrop, props on the platforms
//    and a colour wash (stageThemes.js) - plus its weather and animated sky (here): NIGHTFALL, THUNDERSTORM,
//    BLIZZARD, CHERRY BLOSSOM, FIREFLIES, BLOOD MOON, SANDSTORM, AURORA, NEON CITY, CANDY LAND, SUNKEN RUINS, HARVEST MOON.
//  - EXTRAS (any number): DAMAGE NUMBERS, CONFETTI KOS, FINAL KO CAM (slow motion on the match-winning KO), PARTY HATS,
//    MOON GRAVITY, AIRHORN KOS, RAINBOW TRAILS, IMPACT FRAMES, COMIC HITS (POW! BAM! bursts), COMBO COUNTER,
//    GHOST TRAILS (afterimages in the costume's colour), DISCO FLOOR (light-up platforms, a mirror ball, spotlights).
// MatchScene calls: onHit (every hit), onKO (every KO), onFinalKO, step (every tick), draw (every frame), timeScale
// (slow motion), cleanup. Not used in the title demo. Effects are visual only, except MOON GRAVITY.
import { VIEW_W, VIEW_H, FONT, PHYS } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { equippedStageFx, extraOn } from '../progress.js';
import { makeTheme } from './stageThemes.js';
import { skinInfo } from '../fighters/skins.js';

const W = VIEW_W, H = VIEW_H;
const RAINBOW = [0xff4a4a, 0xff9a3a, 0xffe04a, 0x5aff6a, 0x4ac8ff, 0x8a6aff, 0xff6ad8];
// MOON GRAVITY: how much of the normal gravity and fall speed is left
const MOON = { gravity: 0.55, fall: 0.7 };
// FINAL KO CAM: how slow, and for how many ticks
const FINAL = { speed: 0.3, ticks: 100 };
// COMIC HITS: which hits get a word (knockback over `kb`), the words (big ones for knockback over `bigKb`), how long they stay
const COMIC = { kb: 6, bigKb: 10, words: ['POW!', 'BAM!', 'WHAM!', 'THWACK!', 'SMACK!'], big: ['KA-BOOM!', 'KRAKOOM!', 'KAPOW!'], life: 40 };
// COMBO COUNTER: a combo is hits on someone who hasn't got out of hitstun yet; shown from `from` hits up
const COMBO = { from: 2, life: 70 };
// GHOST TRAILS: an afterimage every `every` ticks while a fighter moves faster than `speed`, fading over `life` ticks
const GHOST = { every: 3, speed: 2.6, life: 16, alpha: 0.5, max: 40 };
// DISCO FLOOR: tile width, how many ticks a beat lasts, the tile colours
const DISCO = { tile: 12, beat: 30, colors: [0xff3ad8, 0x3ad8ff, 0xffe03a, 0x7aff5a, 0xb05aff, 0xff7a3a] };

export class MatchExtras {
  constructor(m) {
    this.m = m; this.t = 0;
    this.fx = m.demo ? null : equippedStageFx();
    const on = (id) => !m.demo && extraOn(id);
    this.on = { numbers: on('ext-numbers'), confetti: on('ext-confetti'), finalcam: on('ext-finalcam'), hats: on('ext-hats'),
      moon: on('ext-moon'), airhorn: on('ext-airhorn'), rainbow: on('ext-rainbow'), impact: on('ext-impact'),
      comic: on('ext-comic'), combo: on('ext-combo'), ghosts: on('ext-ghosts'), disco: on('ext-disco') };
    this.comics = []; this.combos = new Map(); this.ghosts = [];
    this.floor = this.on.disco ? m.add.graphics() : null; if (this.floor) m.addWorld(this.floor);   // (made before the fighters: under them)
    this.slow = 0; this.impact = 0; this.flash = 0; this.bolt = null;
    // layers: the sky (behind the stage's things, on the background camera), the weather (over the world, under the HUD),
    // and world-space bits (hats)
    this.theme = this.fx ? makeTheme(m, this.fx) : null;            // the backdrop (depth 48 / 48.5), platform props, colour wash
    this.sky = m.add.graphics().setScrollFactor(0).setDepth(48.2); m.addBg(this.sky);
    this.weather = m.add.graphics().setDepth(4); m.addUI(this.weather);
    this.world = m.add.graphics().setDepth(6); m.addWorld(this.world);
    this.spots = Array.from({ length: 80 }, (_, i) => [((i * 7919) % 997) / 997, ((i * 104729) % 991) / 991, ((i * 31) % 97) / 97]);
    if (this.on.moon) { this.saved = { g: PHYS.gravity, f: PHYS.maxFall, ff: PHYS.fastFall }; PHYS.gravity *= MOON.gravity; PHYS.maxFall *= MOON.fall; PHYS.fastFall *= MOON.fall; }
  }
  cleanup() { for (const g of this.ghosts) g.img.destroy(); this.ghosts = []; for (const c of this.comics) c.txt.destroy(); this.comics = [];
    if (this.saved) { PHYS.gravity = this.saved.g; PHYS.maxFall = this.saved.f; PHYS.fastFall = this.saved.ff; this.saved = null; } }

  // how fast the match runs right now (FINAL KO CAM's slow motion)
  timeScale() { return this.slow > 0 ? FINAL.speed : 1; }

  onHit(t, dmg, kb, owner) {
    const c = t.center();
    if (this.on.comic && kb > COMIC.kb) {                           // COMIC HITS: a word in a starburst, like a comic book panel
      const big = kb > COMIC.bigKb, L = big ? COMIC.big : COMIC.words, word = L[Math.floor(Math.random() * L.length)];
      const x = c.x + (Math.random() - 0.5) * 20, y = c.y - 24 - Math.random() * 10;
      const txt = this.m.add.text(x, y, word, { fontFamily: FONT, fontSize: (big ? 13 : 10) + 'px', color: big ? '#ff2a2a' : '#1a1024', stroke: big ? '#ffe03a' : '#ffffff', strokeThickness: 3 }).setOrigin(0.5).setDepth(7).setAngle((Math.random() - 0.5) * 24);
      this.m.addWorld(txt); this.comics.push({ x, y, life: COMIC.life, big, txt, r: (big ? 34 : 26) + word.length * 2, spin: Math.random() * 6 });
    }
    if (this.on.combo && owner && owner !== t) {                    // COMBO COUNTER: hits landed before they got out of hitstun
      const k = this.combos.get(t), n = k && k.by === owner ? k.n + 1 : 1;
      if (k && k.txt) k.txt.destroy();
      const e = { by: owner, n, free: 0, life: COMBO.life, txt: null };
      if (n >= COMBO.from) {
        const col = n >= 8 ? '#ff3a3a' : n >= 5 ? '#ffb84a' : '#ffe8a0';
        e.txt = this.m.add.text(c.x, c.y - 52, n + ' HITS!', { fontFamily: FONT, fontSize: Math.min(16, 8 + n) + 'px', color: col, stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5).setDepth(7);
        this.m.addWorld(e.txt); if (n >= 5) sfx('ding', 0.25, 1 + n * 0.05);
      }
      this.combos.set(t, e);
    }
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
    if (this.on.combo) for (const [f, e] of this.combos) {         // a combo ends once they're free (and the count fades)
      if (f.state !== 'hitstun' && !(f.hitstop > 0)) e.free++;
      if (e.txt) { const c = f.center(); e.txt.setPosition(c.x, c.y - 52 - (COMBO.life - e.life) * 0.15); if (e.free > 0) e.txt.setAlpha(Math.max(0, e.life / 30)); }
      if (e.free > 0 && --e.life <= 0) { if (e.txt) e.txt.destroy(); this.combos.delete(f); }
    }
    if (this.on.ghosts) {                                           // GHOST TRAILS: afterimages in the costume's colour
      if (this.t % GHOST.every === 0) for (const f of this.m.fighters) {
        const s = f.sprite; if (!f.alive || !s || !s.visible || s.alpha < 0.5 || this.ghosts.length >= GHOST.max) continue;
        if (Math.hypot((f.vx || 0) + (f.lx || 0), (f.vy || 0) + (f.ly || 0)) < GHOST.speed) continue;
        const col = (skinInfo(f.def.id, f.skin) || {}).fx ?? 0xffffff;
        const img = this.m.add.image(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setRotation(s.rotation)
          .setTintMode(Phaser.TintModes.FILL).setTint(col).setAlpha(GHOST.alpha).setDepth(s.depth - 0.1).setBlendMode(Phaser.BlendModes.ADD);
        this.m.addWorld(img); this.ghosts.push({ img, life: GHOST.life });
      }
      this.ghosts = this.ghosts.filter((g) => { g.img.setAlpha(GHOST.alpha * --g.life / GHOST.life); if (g.life > 0) return true; g.img.destroy(); return false; });
    }
    this.comics = this.comics.filter((c) => { c.life--; c.txt.setScale(c.life > COMIC.life - 5 ? 1.4 - (COMIC.life - c.life) * 0.08 : 1).setAlpha(Math.min(1, c.life / 10)); if (c.life > 0) return true; c.txt.destroy(); return false; });
  }

  draw() {
    const t = this.t, sk = this.sky, w = this.weather, wd = this.world;
    sk.clear(); w.clear(); wd.clear();
    if (this.theme) this.theme.draw(t);
    const spot = (i) => this.spots[i % this.spots.length];
    switch (this.fx) {
      case 'fx-night':                                            // NIGHTFALL: deep blue, stars, a crescent moon
        for (let i = 0; i < 40; i++) { const s = spot(i); sk.fillStyle(0xffffff, 0.4 + 0.5 * Math.abs(Math.sin(t * 0.03 + i))); sk.fillRect(s[0] * W, s[1] * H * 0.5, 1 + (i % 5 === 0), 1); }
        sk.fillStyle(0xf4f0d8, 1); sk.fillCircle(540, 54, 18); sk.fillStyle(0x050a22, 1); sk.fillCircle(548, 48, 16);
        break;
      case 'fx-storm':                                            // THUNDERSTORM: dark, rain, lightning
        for (let i = 0; i < 80; i++) { const s = spot(i), x = (s[0] * W * 1.2 + i * 37 - t * 4) % (W + 40), y = (s[1] * H + t * 13 + i * 19) % (H + 30) - 20; w.lineStyle(1, 0x9ab0d8, 0.55); w.lineBetween(x, y, x - 4, y + 12); }
        if (this.bolt) {
          const b = this.bolt; w.fillStyle(0xffffff, Math.max(0, 0.5 - b.t * 0.04)); w.fillRect(0, 0, W, H);
          if (b.t < 8) { w.lineStyle(3, 0xffffff, 1); let x = b.x, y = 0; for (let k = 0; k < 7; k++) { const nx = x + ((k * 37 + b.x) % 30) - 15, ny = y + 26; w.lineBetween(x, y, nx, ny); x = nx; y = ny; } }
        }
        break;
      case 'fx-snow':                                             // BLIZZARD: snow driving sideways, a white haze
        for (let i = 0; i < 90; i++) { const s = spot(i), x = (s[0] * W + t * (1.5 + s[2] * 2) + Math.sin(t * 0.05 + i) * 8) % W, y = (s[1] * H + t * (0.8 + s[2])) % H; w.fillStyle(0xffffff, 0.7 + 0.3 * s[2]); w.fillRect(x, y, 1 + (i % 3 === 0), 1 + (i % 3 === 0)); }
        w.fillStyle(0xffffff, 0.08); w.fillRect(0, H - 60, W, 60); break;
      case 'fx-sakura':                                           // CHERRY BLOSSOM: pink petals, a warm blush
        for (let i = 0; i < 45; i++) { const s = spot(i), x = (s[0] * W + t * (0.6 + s[2]) + Math.sin(t * 0.04 + i) * 14) % W, y = (s[1] * H + t * (0.5 + s[2] * 0.5)) % H; w.fillStyle(i % 3 ? 0xffb8d0 : 0xffffff, 0.9); w.fillEllipse(x, y, 4 + Math.abs(Math.sin(t * 0.08 + i)) * 2, 3); }
        break;
      case 'fx-fireflies':                                        // FIREFLIES: a violet dusk, little lights drifting
        for (let i = 0; i < 26; i++) { const s = spot(i), x = s[0] * W + Math.sin(t * 0.013 + i * 2) * 40, y = H * 0.35 + s[1] * H * 0.6 + Math.cos(t * 0.017 + i) * 20, a = 0.5 + 0.5 * Math.sin(t * 0.09 + i * 3);
          w.fillStyle(0xd8ff6a, 0.2 * a); w.fillCircle(x, y, 6); w.fillStyle(0xf4ffc8, a); w.fillRect(x - 1, y - 1, 2, 2); }
        break;
      case 'fx-bloodmoon':                                        // BLOOD MOON: everything red, a huge moon, mist
        this.glowAt(sk, 470, 80, 90, 0xff2a2a, 0.35); sk.fillStyle(0xc81a1a, 1); sk.fillCircle(470, 80, 44); sk.fillStyle(0xe0383a, 1); sk.fillCircle(456, 70, 10); sk.fillCircle(488, 96, 7);
        for (let i = 0; i < 6; i++) { w.fillStyle(0xc81a2a, 0.08); w.fillEllipse(((t * (0.3 + i * 0.1) + i * 150) % (W + 300)) - 150, H - 30 + (i % 3) * 8, 300, 40); }
        break;
      case 'fx-sand':                                             // SANDSTORM: a tan haze, dust streaming past
        w.fillStyle(0xc89a5a, 0.12); w.fillRect(0, 0, W, H);
        for (let i = 0; i < 60; i++) { const s = spot(i), x = (s[0] * W - t * (6 + s[2] * 8)) % W + W, y = s[1] * H + Math.sin(t * 0.04 + i) * 6; w.lineStyle(1, 0xe8c890, 0.5); w.lineBetween(x % W, y, x % W + 14 + s[2] * 20, y); }
        break;
      case 'fx-aurora':                                           // AURORA: ribbons of green and violet light across the sky
        for (let i = 0; i < 30; i++) { const s = spot(i); sk.fillStyle(0xffffff, 0.5); sk.fillRect(s[0] * W, s[1] * H * 0.4, 1, 1); }
        for (let r = 0; r < 3; r++) for (let x = 0; x < W; x += 6) {
          const y = 40 + r * 24 + Math.sin(x * 0.012 + t * 0.02 + r) * 18 + Math.sin(x * 0.03 - t * 0.015) * 6, hgt = 30 + 14 * Math.sin(x * 0.02 + t * 0.03 + r * 2);
          sk.fillStyle(r === 1 ? 0x8a5aff : 0x3affa8, 0.12); sk.fillRect(x, y, 6, hgt); sk.fillStyle(r === 1 ? 0xc8a8ff : 0xa8ffd8, 0.1); sk.fillRect(x, y, 6, 4);
        }
        break;
      case 'fx-neon':                                             // NEON CITY: neon rain streaking down, a scanline shimmer
        for (let i = 0; i < 60; i++) { const s = spot(i), x = (s[0] * W + i * 13) % W, y = (s[1] * H + t * (9 + s[2] * 6) + i * 23) % (H + 30) - 20; w.lineStyle(1, i % 3 ? 0xff7ae8 : 0x3ad8ff, 0.45); w.lineBetween(x, y, x, y + 10); }
        for (let y = (t * 0.5) % 4; y < H; y += 4) { w.fillStyle(0xff3ad8, 0.025); w.fillRect(0, y, W, 1); }
        break;
      case 'fx-candy':                                            // CANDY LAND: sprinkles drifting down, a soft pink glow
        for (let i = 0; i < 50; i++) { const s = spot(i), x = (s[0] * W + Math.sin(t * 0.03 + i) * 10) % W, y = (s[1] * H + t * (0.5 + s[2] * 0.6)) % H; w.fillStyle([0xff5a9a, 0x5ad8ff, 0xffe05a, 0x7aff8a, 0xffffff][i % 5], 0.9); if (i % 2) w.fillRect(x, y, 3, 1); else w.fillRect(x, y, 1, 3); }
        w.fillStyle(0xffb8e0, 0.06); w.fillRect(0, 0, W, H); break;
      case 'fx-sunken':                                           // SUNKEN RUINS: bubbles rising, caustic light, fish drifting past far off
        for (let i = 0; i < 40; i++) { const s = spot(i), x = s[0] * W + Math.sin(t * 0.05 + i) * 4, y = H - ((s[1] * H + t * (0.6 + s[2])) % (H + 10)); w.lineStyle(1, 0xd8f8ff, 0.6); w.strokeCircle(x, y, 1 + (i % 3)); }
        for (let i = 0; i < 5; i++) { const x = ((i * 170 + t * (0.4 + i * 0.1)) % (W + 80)) - 40, y = 70 + i * 34; sk.fillStyle(0x0a2a4a, 0.6); sk.fillEllipse(x, y, 14, 6); sk.fillTriangle(x - 7, y, x - 12, y - 4, x - 12, y + 4); }
        for (let i = 0; i < 8; i++) { w.fillStyle(0xd8f8ff, 0.035); w.fillEllipse((i * 97 + Math.sin(t * 0.01 + i) * 40) % W, (i * 53) % H, 90, 20); }
        w.fillStyle(0x1a5a90, 0.08); w.fillRect(0, 0, W, H); break;
      case 'fx-harvest':                                          // HARVEST MOON: red and gold leaves tumbling on the wind
        for (let i = 0; i < 40; i++) { const s = spot(i), x = (s[0] * W + t * (0.8 + s[2]) + Math.sin(t * 0.04 + i) * 16) % W, y = (s[1] * H + t * (0.6 + s[2] * 0.5)) % H, a = t * 0.08 + i;
          w.fillStyle([0xc83a1a, 0xe8822a, 0xf4b83a, 0x9a2a1a][i % 4], 0.95); w.fillEllipse(x, y, 5 * Math.abs(Math.cos(a)) + 1, 3); }
        break;
    }
    // COMIC HITS: the starbursts behind the words
    for (const c of this.comics) {
      const a = Math.min(1, c.life / 10), pts = [];
      for (let i = 0; i < 24; i++) { const r = c.r * (i % 2 ? 0.62 : 1) * (0.9 + 0.1 * Math.sin(i * 2.3 + c.spin)), ang = i / 24 * Math.PI * 2 + c.spin * 0.1; pts.push({ x: c.x + Math.cos(ang) * r, y: c.y + Math.sin(ang) * r * 0.62 }); }
      wd.fillStyle(0x1a1024, a); wd.fillPoints(pts.map((p) => ({ x: c.x + (p.x - c.x) * 1.1, y: c.y + (p.y - c.y) * 1.1 })), true);
      wd.fillStyle(c.big ? 0xff3a2a : 0xffe03a, a); wd.fillPoints(pts, true);
      if (c.big) { wd.fillStyle(0xffe03a, a); wd.fillPoints(pts.map((p) => ({ x: c.x + (p.x - c.x) * 0.72, y: c.y + (p.y - c.y) * 0.72 })), true); }
      for (let i = 0; i < 6; i++) { wd.fillStyle(0xffffff, a * 0.8); wd.fillRect(c.x - c.r * 0.5 + i * c.r * 0.2, c.y + c.r * 0.3 - (i % 2) * 3, 2, 2); }   // halftone dots
    }
    // DISCO FLOOR: the platforms light up in tiles, flashing white under whoever stands on them; a mirror ball, spotlights
    if (this.floor) {
      const fl = this.floor; fl.clear();
      const beat = Math.floor(t / DISCO.beat), pulse = 1 - (t % DISCO.beat) / DISCO.beat;
      for (const p of this.m.stage.platforms || []) {
        for (let x = p.x1, i = 0; x < p.x2 - 1; x += DISCO.tile, i++) {
          const w = Math.min(DISCO.tile - 1, p.x2 - x - 1), lit = this.m.fighters.some((f) => f.alive && f.grounded && f.x >= x - 4 && f.x <= x + DISCO.tile + 4 && Math.abs(f.y - p.y) < 6);
          const col = DISCO.colors[(i + beat * (p.solid ? 1 : 2)) % DISCO.colors.length];
          fl.fillStyle(lit ? 0xffffff : col, lit ? 0.9 : 0.35 + 0.35 * pulse); fl.fillRect(x, p.y - 1, w, p.solid ? 4 : 3);
          if (lit) { fl.fillStyle(col, 0.25); fl.fillRect(x - 2, p.y - 10, w + 4, 9); }
        }
      }
      const bx = W / 2, by = 30;                                    // the mirror ball, turning, and its spotlights sweeping
      for (let i = 0; i < 4; i++) { const ang = Math.PI / 2 + Math.sin(t * 0.017 + i * 1.7) * 0.9, col = DISCO.colors[(i + beat) % DISCO.colors.length];
        w.fillStyle(col, 0.07); w.fillTriangle(bx, by, bx + Math.cos(ang - 0.08) * 420, by + Math.sin(ang - 0.08) * 420, bx + Math.cos(ang + 0.08) * 420, by + Math.sin(ang + 0.08) * 420);
        const ex = bx + Math.cos(ang) * 320, ey = by + Math.sin(ang) * 320; w.fillStyle(col, 0.08); w.fillEllipse(ex, Math.min(H - 20, ey), 70, 22); }
      w.lineStyle(1, 0x8a87a3, 1); w.lineBetween(bx, 0, bx, by - 9);
      w.fillStyle(0x8a8aa8, 1); w.fillCircle(bx, by, 10);
      for (let yy = -8; yy <= 8; yy += 3) for (let xx = -9; xx <= 9; xx += 3) if (xx * xx + yy * yy < 90) { w.fillStyle(((xx + yy + (t >> 3)) / 3 & 3) === 0 ? 0xffffff : 0xc8c8e0, 1); w.fillRect(bx + xx, by + yy, 2, 2); }
      for (let i = 0; i < 10; i++) { const s = spot(i + 40), a = Math.abs(Math.sin(t * 0.06 + i * 2)); w.fillStyle(DISCO.colors[i % DISCO.colors.length], a * 0.8); w.fillRect((s[0] * W + t * 0.7 * (i % 2 ? 1 : -1) + W) % W, s[1] * H * 0.8, 2, 2); }   // sparkles thrown off the ball
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
