// Things fighters create: fireballs and summoned souls.
import { sfx } from '../audio/sfx.js';
import { skinInfo, minionTexture } from './skins.js';

let nextId = 100000;

// Soul Summoner's summoned soul: the designer's burning skull flame, animated by
// tools/sprites/soul_minion.py into a 12-frame wildly flickering loop (60x68 frames). Drawn a bit smaller than a fighter.
const SOUL_SCALE = 0.7;
const SOUL_ORIGIN = { x: 23 / 60, y: 45 / 68 };   // the skull's centre sits on the soul's position

// --- costume shapes (skins.js `style`) -------------------------------------------------------
// A rose seen from above: rings of petals around a curled centre, turning as it flies.
function drawRose(g, x, y, r, spin, P, open = 1) {
  g.fillStyle(P.shade, 1);                                              // two leaves behind it
  for (const s of [-1, 1]) g.fillEllipse(x + Math.cos(spin + s * 2.4) * r * 0.95, y + Math.sin(spin + s * 2.4) * r * 0.95, r * 0.9, r * 0.5);
  g.fillStyle(P.outline, 1); g.fillCircle(x, y, r * (0.75 + 0.3 * open) + 1);
  const rings = [[r * open, 6, P.deep], [r * 0.7 * (0.5 + open / 2), 5, P.mid], [r * 0.42, 4, P.light]];
  rings.forEach(([rr, n, c], k) => {
    for (let i = 0; i < n; i++) { const a = spin * (k % 2 ? -1 : 1) + (i / n) * Math.PI * 2 + k * 0.4; g.fillStyle(c, 1); g.fillCircle(x + Math.cos(a) * rr * 0.55, y + Math.sin(a) * rr * 0.55, rr * 0.5); }
  });
  g.fillStyle(P.core, 1); g.fillCircle(x, y, Math.max(1, r * 0.18));
  g.lineStyle(1, P.deep, 1); g.beginPath(); g.arc(x, y, r * 0.28, spin, spin + 3.6); g.strokePath();   // the spiral at its heart
}
// 1-BIT: a possessed skull - black with a hard white outline, hollow eyes with pinprick pupils.
// Every few frames it inverts, like a glitching screen.
function drawSkull(g, x, y, r, dir, t) {
  const inv = (t >> 2) % 6 === 0, B = inv ? 0xf4f4f0 : 0x0e0e10, W = inv ? 0x0e0e10 : 0xf4f4f0;
  const j = (t % 9 === 0) ? (dir > 0 ? 1 : -1) : 0;                    // a twitch now and then
  g.fillStyle(W, 1); g.fillRect(x - r - 1 + j, y - r - 1, r * 2 + 2, r * 1.5 + 2); g.fillRect(x - r * 0.6 - 1 + j, y + r * 0.5 - 1, r * 1.2 + 2, r * 0.6 + 2);
  g.fillStyle(B, 1); g.fillRect(x - r + j, y - r, r * 2, r * 1.5); g.fillRect(x - r * 0.6 + j, y + r * 0.5, r * 1.2, r * 0.6);
  const ex = Math.max(2, Math.round(r * 0.45));
  for (const s of [-1, 1]) {                                           // hollow eyes, pupils glaring forward
    g.fillStyle(W, 1); g.fillRect(x + s * r * 0.45 - ex / 2 + j, y - r * 0.35, ex, ex);
    g.fillStyle(B, 1); g.fillRect(x + s * r * 0.45 - ex / 2 + 1 + j, y - r * 0.35 + 1, ex - 2, ex - 2);
    g.fillStyle(W, 1); g.fillRect(x + s * r * 0.45 + dir + j, y - r * 0.35 + ex / 2 - 1, 1, 1);
  }
  g.fillStyle(W, 1); for (let k = -1; k <= 1; k++) g.fillRect(x + k * r * 0.35 + j, y + r * 0.6, 1, r * 0.4);   // teeth
  for (let i = 1; i <= 3; i++) {                                       // a torn, dithered trail of static
    const tx = x - dir * (r + i * 4);
    for (let yy = -r + 1; yy < r; yy += 2) if (((yy + i + t) & 1) === 0) { g.fillStyle(i % 2 ? W : B, 1 - i * 0.25); g.fillRect(tx + ((yy * 7 + t) % 3), y + yy, 2, 1); }
  }
}

export class Fireball {
  constructor(match, owner, k) {
    const fb = owner.def.moves.fireball;
    this.match = match; this.owner = owner; this.k = k;
    this.x = owner.x + owner.facing * (owner.def.handOffset.x + 6);
    this.y = owner.y + owner.def.handOffset.y + 4;
    this.dir = owner.facing;
    this.vx = this.dir * (fb.speed + 1.6 * k);
    this.r = 5 + 8 * k;
    this.dmg = Math.round(fb.minDmg + (fb.maxDmg - fb.minDmg) * k);
    this.life = fb.life + Math.round(30 * k);
    this.id = nextId++;
    this.alive = true; this.t = 0;
    this.g = match.add.graphics();
    match.addWorld(this.g);
  }
  hitbox() {
    return {
      x1: this.x - this.r, x2: this.x + this.r, y1: this.y - this.r, y2: this.y + this.r,
      h: { dmg: this.dmg, angle: 32, base: 2.2 + 2.6 * this.k, growth: 2.0 + 4.0 * this.k },
      owner: this.owner, id: this.id, facing: this.dir, projectile: this,
    };
  }
  step() {
    this.t++;
    this.x += this.vx;
    this.y += Math.sin(this.t * 0.25) * 0.4;
    if (this.t % 3 === 0) this.match.puff(this.x - this.dir * this.r, this.y, this.t % 6 ? this.owner.pal.light : this.owner.pal.deep, 1);
    // fizzles against the island's sides
    const P = this.match.stage.platforms[0];
    if (this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.bottom) this.kill();
    if (--this.life <= 0) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, this.owner.pal.light, 8); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, r = this.r, x = Math.round(this.x), y = Math.round(this.y);
    const pulse = this.t % 4 < 2 ? 1 : 0;
    g.clear();
    const P = this.owner.pal;
    if (this.owner.style === 'onebit') { drawSkull(g, x, y, r + 1, this.dir, this.t); return; }
    g.fillStyle(P.deep, 1); g.fillRect(x - r - pulse, y - r + 1, r * 2 + pulse * 2, r * 2 - 2); g.fillRect(x - r + 1, y - r - pulse, r * 2 - 2, r * 2 + pulse * 2);
    g.fillStyle(P.light, 1); g.fillRect(x - r * 0.65, y - r * 0.65, r * 1.3, r * 1.3);
    g.fillStyle(P.core, 1); g.fillRect(x - r * 0.3 + this.dir * 2, y - r * 0.3, r * 0.6, r * 0.6);
    // trailing tail
    g.fillStyle(P.deep, 0.8); g.fillRect(x - this.dir * (r + 6), y - r * 0.4, 6 * this.dir > 0 ? 6 : 6, r * 0.8);
  }
}

// An energy bolt fired from a staff gem (Mr Wake's Drifting Soul).
// `spec` comes from the move data: speed, life, w, h, homing, hit { dmg, angle, base, growth }.
export class EnergyBolt {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * (owner.def.handOffset.x + 4);
    this.y = owner.y + owner.def.handOffset.y;
    this.vx = this.dir * spec.speed; this.vy = 0;
    this.life = spec.life; this.t = 0; this.alive = true; this.id = nextId++;
    this.color = owner.fxColor;
    this.g = match.add.graphics();
    match.addWorld(this.g);
    sfx('djump', 0.4, spec.homing ? 0.6 : 1.4);
  }
  hitbox() {
    const w = this.spec.w, h = this.spec.h;
    return { x1: this.x - w / 2, x2: this.x + w / 2, y1: this.y - h / 2, y2: this.y + h / 2, h: this.spec.hit, owner: this.owner, id: this.id, facing: this.dir, projectile: this };
  }
  step() {
    this.t++;
    if (this.spec.homing) {
      // curve toward the nearest opponent's height
      let best = null, bd = 1e9;
      for (const f of this.match.fighters) {
        if (!f.alive || f.team === this.owner.team) continue;
        const d = Math.abs(f.x - this.x); if (d < bd) { bd = d; best = f; }
      }
      if (best) this.vy = Phaser.Math.Clamp(this.vy + Math.sign(best.y - 28 - this.y) * this.spec.homing, -2.5, 2.5);
    }
    this.x += this.vx; this.y += this.vy;
    if (this.t % 3 === 0) this.match.puff(this.x - this.dir * this.spec.w / 2, this.y, this.t % 6 ? this.owner.pal.light : this.owner.pal.deep, 1);
    const P = this.match.stage.platforms[0];
    if (this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.bottom) this.kill();
    if (--this.life <= 0) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, this.owner.pal.light, 8); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, w = this.spec.w, h = this.spec.h, x = Math.round(this.x), y = Math.round(this.y);
    const p = this.t % 4 < 2 ? 1 : 0;
    g.clear();
    const P = this.owner.pal;
    if (this.owner.style === 'rose') {                    // Rosebud: a thrown rose, spinning as it flies
      g.lineStyle(2, P.shade, 1); g.lineBetween(x - this.dir * 4, y, x - this.dir * (w / 2 + 8), y + 2);   // its stem
      drawRose(g, x, y, Math.max(w, h) * 0.55, this.t * 0.3 * this.dir, P);
      return;
    }
    g.fillStyle(P.outline, 1); g.fillRect(x - w / 2 - 1, y - h / 2 - 1 + p, w + 2, h + 2 - p * 2);
    g.fillStyle(P.mid, 1); g.fillRect(x - w / 2, y - h / 2 + p, w, h - p * 2);
    g.fillStyle(P.light, 1); g.fillRect(x - w / 3, y - h / 3, (w * 2) / 3, (h * 2) / 3);
    g.fillStyle(P.core, 1); g.fillRect(x - w / 8 + this.dir * w / 6, y - h / 6, w / 4, h / 3);
    g.fillStyle(P.mid, 0.7); g.fillRect(this.dir > 0 ? x - w / 2 - 8 : x + w / 2, y - h / 4, 8, h / 2);   // trail
  }
}

// Mr Wake's Shadow Pool: a puddle of his blob body left on the ground. Opponents who step in are slowed
// (the slow keeps refreshing while they stand in it, then lasts `slow` frames after they leave).
export class ShadowPool {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.x = owner.x; this.w = spec.width; this.life = spec.life; this.t = 0; this.alive = true;
    // settle on the platform under him (a pool cast in the air drips down)
    let best = null;
    for (const p of match.stage.platforms) if (this.x >= p.x1 && this.x <= p.x2 && p.y >= owner.y - 2 && (!best || p.y < best.y)) best = p;
    if (!best) { this.alive = false; return; }
    this.y = best.y;
    const pf = best; this.x1 = Math.max(pf.x1, this.x - this.w / 2); this.x2 = Math.min(pf.x2, this.x + this.w / 2);
    this.g = match.add.graphics();
    match.addWorld(this.g);
    sfx('curse', 0.5, 0.7);
  }
  step() {
    if (!this.alive) return;
    this.t++;
    for (const f of this.match.fighters) {
      if (!f.alive || f.team === this.owner.team) continue;
      if (f.x >= this.x1 && f.x <= this.x2 && Math.abs(f.y - this.y) < 6) {
        if (f.slow <= 0) this.match.puff(f.x, f.y - 4, this.owner.pal.shade, 4);
        f.slow = Math.max(f.slow, this.spec.slow);
      }
    }
    if (this.t % 7 === 0) this.match.puff(this.x1 + Math.random() * (this.x2 - this.x1), this.y - 2, this.t % 14 ? this.owner.pal.mid : this.owner.pal.shade, 1);
    if (this.t >= this.life) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; if (this.g) this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, grow = Math.min(1, this.t / 10), fade = this.life - this.t < 30 ? (this.life - this.t) / 30 : 1;
    const cx = (this.x1 + this.x2) / 2, half = ((this.x2 - this.x1) / 2) * grow;
    g.clear();
    // stepped blob shape: wider at the base, wobbling edge
    const wob = Math.round(Math.sin(this.t * 0.15) * 2);
    const P = this.owner.pal;
    g.fillStyle(P.void, 0.95 * fade); g.fillRect(cx - half, this.y - 4, half * 2, 6);
    g.fillStyle(P.void, 0.95 * fade); g.fillRect(cx - half + 5 + wob, this.y - 7, half * 2 - 10, 3);
    g.fillStyle(P.void, 0.95 * fade); g.fillRect(cx - half + 14 - wob, this.y - 9, half * 2 - 28, 2);
    g.fillStyle(P.shade, fade); g.fillRect(cx - half + 4, this.y - 5, half * 2 - 8, 4);
    // purple sheen and bubbles
    g.fillStyle(P.mid, 0.9 * fade); g.fillRect(cx - half * 0.6 - wob, this.y - 6, half * 0.5, 1);
    g.fillStyle(P.mid, 0.9 * fade); g.fillRect(cx + half * 0.2 + wob, this.y - 4, half * 0.4, 1);
    for (let k = 0; k < 4; k++) {
      const bx = cx - half + ((k * 37 + this.t * 2) % Math.max(1, half * 2));
      const by = this.y - 9 - ((this.t + k * 11) % 16) / 2;
      g.fillStyle(P.light, fade); g.fillRect(bx, by, 2, 2);
    }
    if (this.owner.style === 'rose') for (let k = 0; k < 5; k++) {     // Rosebud: rose petals floating on the pool
      const px = cx - half + 6 + ((k * 53 + Math.floor(this.t / 3)) % Math.max(1, half * 2 - 12)), py = this.y - 6 + Math.round(Math.sin(this.t * 0.1 + k) * 1.5);
      g.fillStyle(k % 2 ? P.mid : P.light, fade); g.fillEllipse(px, py, 4, 2);
    }
  }
}

// A soul raised from the grave by Soul Summoner. Floats toward the nearest opponent and bites.
export class Soul {
  constructor(match, owner) {
    this.match = match; this.owner = owner; this.team = owner.team;
    this.x = owner.x + owner.facing * 30; this.y = owner.y; this.rise = 24;
    this.vx = 0; this.vy = 0; this.hp = 18; this.life = 660; this.cool = 30;
    this.alive = true; this.t = 0; this.id = nextId++; this.attackId = nextId++; this.flash = 0;
    const minionKey = skinInfo(owner.def.id, owner.skin).minion || minionTexture(match, owner.def.id, owner.skin);   // some costumes raise their own kind of soul
    this.sprite = match.add.sprite(this.x, this.y, minionKey && match.textures.exists(minionKey) ? minionKey : 'soul_minion', 0).setScale(SOUL_SCALE).setOrigin(SOUL_ORIGIN.x, SOUL_ORIGIN.y);
    this.sprite.setTint(owner.slot === 0 ? 0xffffff : 0xddeeff);
    match.addWorld(this.sprite);
    match.puff(this.x, this.y, 0x6b5b73, 10);
  }
  hurtbox() { return { x1: this.x - 12, x2: this.x + 12, y1: this.y - 14, y2: this.y + 10 }; }
  target() {
    let best = null, bd = 1e9;
    for (const f of this.match.fighters) {
      if (!f.alive || f.team === this.team || f.state === 'respawn') continue;
      const d = Math.hypot(f.x - this.x, f.y - 26 - this.y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  step() {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.rise > 0) { this.rise--; this.y -= 1.2; return; }     // climbing out of the grave
    if (this.cool > 0) this.cool--;
    const tgt = this.target();
    let tx = this.owner.x - this.owner.facing * 30, ty = this.owner.y - 50;   // idle: hover near the summoner
    if (tgt) { tx = tgt.x; ty = tgt.y - 26; }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const spd = this.cool > 0 ? 0.9 : 1.75;
    this.vx += (dx / d * spd - this.vx) * 0.08;
    this.vy += (dy / d * spd - this.vy) * 0.08 + Math.sin(this.t * 0.1) * 0.03;
    this.x += this.vx; this.y += this.vy;
    if (--this.life <= 0 || this.y > 400) this.kill(false);
  }
  // the soul's bite, active when it is touching an enemy and not cooling down
  hitbox() {
    if (this.rise > 0 || this.cool > 0) return null;
    return {
      x1: this.x - 11, x2: this.x + 11, y1: this.y - 12, y2: this.y + 9,
      h: { dmg: 3, angle: 50, base: 2.6, growth: 2.2 },
      owner: this.owner, id: this.attackId, facing: Math.sign(this.vx) || 1, soul: this,
    };
  }
  onBite() { this.cool = 65; this.attackId = nextId++; this.vx *= -1.5; this.vy = -1.5; sfx('soulhit', 0.4); }
  damage(dmg, dirX) {
    this.hp -= dmg; this.flash = 6; this.vx = dirX * 3; this.vy = -2;
    if (this.hp <= 0) this.kill(true);
  }
  kill(popped) {
    if (!this.alive) return;
    this.alive = false;
    this.match.puff(this.x, this.y, popped ? 0xf0f2f3 : this.owner.pal.light, popped ? 12 : 6);
    if (popped) sfx('soulhit', 0.5, 0.6);
    this.sprite.destroy();
  }
  render() {
    if (!this.alive) return;
    const s = this.sprite;
    s.setPosition(Math.round(this.x), Math.round(this.y + Math.sin(this.t * 0.12) * 2));
    s.setFrame(Math.floor(this.t / 3) % 12);                      // burning loop, 20 fps
    // the art flies down-left (skull first, tail trailing up-right); mirror it when moving right
    const right = this.vx > 0.05;
    s.setFlipX(right).setOrigin(right ? 1 - SOUL_ORIGIN.x : SOUL_ORIGIN.x, SOUL_ORIGIN.y);
    s.setAlpha(this.life < 120 && this.life % 10 < 5 ? 0.4 : this.rise > 0 ? 0.6 : 0.95);
    if (this.flash > 0) s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else s.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
  }
}

// Lacy's side special, Blade Toss: her sword flies out, spins in place in front of her for a couple of
// seconds (holding the button keeps it spinning longer), then flies back to her hand.
//   out    - thrown forward, slowing to a stop (one hit)
//   spin   - whirls in place, hitting again every few frames and holding opponents in it
//   return - homes back to her hand, striking anything on the way
// She can't attack while it's gone. Blocked or countered, it bounces straight back to her.
export class ThrownSword {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * 18; this.y = owner.y - 34;
    this.vx = this.dir * spec.speed; this.vy = 0;
    this.phase = 'out'; this.t = 0; this.pt = 0; this.ang = 0; this.alive = true;
    this.id = nextId++; this.persist = true; this.kind = 'BLADE TOSS';
    this.g = match.add.graphics();
    match.addWorld(this.g);
    sfx('swing', 0.8, 0.7);
  }
  hitbox() {
    const S = this.spec, r = this.phase === 'spin' ? S.spinR : 14;
    const h = this.phase === 'out' ? S.out : this.phase === 'spin' ? S.spin : S.ret;
    const id = this.phase === 'spin' ? this.id + ':' + Math.floor(this.pt / S.spinEvery) : this.id + this.phase;   // a fresh hit every few frames while spinning
    return { x1: this.x - r, x2: this.x + r, y1: this.y - r, y2: this.y + r, h, owner: this.owner, id, facing: Math.sign(this.vx) || this.dir, projectile: this, persist: true };
  }
  step() {
    const S = this.spec, o = this.owner;
    this.t++; this.pt++;
    if (!o.alive) { this.kill(); return; }
    if (this.phase === 'out') {
      this.vx -= this.dir * S.decel;
      this.ang += 0.6;
      if (Math.sign(this.vx) !== this.dir || this.pt > 20) { this.vx = 0; this.phase = 'spin'; this.pt = 0; sfx('dodge', 0.5, 0.7); }
    } else if (this.phase === 'spin') {
      this.ang += 0.75;
      this.vx = 0; this.vy = Math.sin(this.pt * 0.12) * 0.25;
      const held = o.ctrl && o.ctrl.held && o.ctrl.held('special');
      if (this.pt % 9 === 0) sfx(this.owner.style === 'samurai' ? 'shuriken' : this.owner.def.swingSfx || 'swing', 0.35, 1.3);
      if (this.pt >= S.spinTime + (held ? S.holdExtra : 0) || this.pt >= S.spinTime + S.holdExtra) this.recall();
    } else {
      this.ang += 0.5;
      const tx = o.x + o.facing * 14, ty = o.y - 34, dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(S.returnSpeed + this.pt * 0.15, 14);
      this.vx = dx / d * sp; this.vy = dy / d * sp;
      if (d < 16) { this.caught(); return; }
    }
    this.x += this.vx; this.y += this.vy;
    if (this.t % 3 === 0) this.match.puff(this.x, this.y, this.owner.fxColor, 1);
  }
  recall() { if (this.phase !== 'return') { this.phase = 'return'; this.pt = 0; sfx('djump', 0.5, 1.2); } }
  // projectiles get killed when they're blocked or countered: the sword bounces back to her instead
  kill() {
    if (!this.alive) return;
    if (this.owner.alive && this.phase !== 'return' && this.t > 0) { this.recall(); return; }
    this.remove();
  }
  caught() { this.match.puff(this.x, this.y, 0xffffff, 6); sfx('shield', 0.6, 1.4); this.remove(); if (this.owner.swordOut === this) this.owner.catchSword(); }
  remove() { this.alive = false; this.g.destroy(); if (this.owner.swordOut === this) this.owner.swordOut = null; }
  render() {
    if (!this.alive) return;
    const g = this.g, x = this.x, y = this.y, L = 18, c = Math.cos(this.ang), s = Math.sin(this.ang), col = this.owner.fxColor;
    g.clear();
    if (this.owner.style === 'onebit') return this.renderOneBit(g, x, y, L, c, s);
    if (this.phase === 'spin') {                    // the blur of the spinning blade and a ring of light
      g.fillStyle(col, 0.16); g.fillCircle(x, y, this.spec.spinR);
      g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(x, y, this.spec.spinR - 2);
      for (let k = 1; k <= 5; k++) {
        const a = this.ang - k * 0.32;
        g.lineStyle(3, col, 0.55 - k * 0.1);
        g.lineBetween(x - Math.cos(a) * L, y - Math.sin(a) * L, x + Math.cos(a) * L, y + Math.sin(a) * L);
      }
    } else {
      for (let k = 1; k <= 3; k++) { g.fillStyle(col, 0.35 - k * 0.1); g.fillCircle(x - this.vx * k * 1.2, y - this.vy * k * 1.2, 6 - k); }
    }
    // the sword: dark outline, steel blade with a bright edge, crossguard and grip
    const tipX = x + c * L, tipY = y + s * L, butX = x - c * L * 0.55, butY = y - s * L * 0.55;
    g.lineStyle(4, 0x14181c, 1); g.lineBetween(butX, butY, tipX, tipY);
    g.lineStyle(2, 0xc9c9c9, 1); g.lineBetween(x - c * 3, y - s * 3, tipX, tipY);
    g.lineStyle(1, 0xffffff, 1); g.lineBetween(x, y, tipX - c, tipY - s);
    g.lineStyle(3, this.owner.dragonSpin ? 0xf3c358 : 0x6a7880, 1); g.lineBetween(x - c * 3 - s * 5, y - s * 3 + c * 5, x - c * 3 + s * 5, y - s * 3 - c * 5);   // crossguard
    g.lineStyle(2, 0x2a2430, 1); g.lineBetween(x - c * 4, y - s * 4, butX, butY);                                                                         // grip
  }
  // 1-BIT Lacy: a white pixel blade with a black edge; spinning, it leaves a ring of black and white
  // blocks and stuttering afterimages, like a frame dropping on an old LCD
  renderOneBit(g, x, y, L, c, s) {
    const W = 0xf4f4f0, B = 0x0e0e10, t = this.match.frame || 0;
    if (this.phase === 'spin') {
      const R = this.spec.spinR - 2;
      for (let k = 0; k < 12; k++) { const a = k * 0.5236 + t * 0.12; g.fillStyle(k % 2 ? W : B, 1); g.fillRect(Math.round(x + Math.cos(a) * R) - 2, Math.round(y + Math.sin(a) * R) - 2, 4, 4); }
      for (let k = 1; k <= 3; k++) {                // stepped afterimages of the blade
        const a = this.ang - k * 0.45, cc = Math.cos(a), ss = Math.sin(a);
        for (let d = -L * 0.5; d <= L; d += 3) if ((k + Math.round(d / 3)) % 2) { g.fillStyle(W, 1); g.fillRect(Math.round(x + cc * d) - 1, Math.round(y + ss * d) - 1, 2, 2); }
      }
    } else for (let k = 1; k <= 3; k++) { g.fillStyle(k % 2 ? W : B, 1); g.fillRect(Math.round(x - this.vx * k * 1.4) - 2, Math.round(y - this.vy * k * 1.4) - 2, 4, 4); }
    const jit = t % 11 === 0 ? 2 : 0;               // a glitch twitch now and then
    for (let d = -L * 0.55; d <= L; d += 1.5) {
      const px = Math.round(x + c * d) + jit, py = Math.round(y + s * d);
      g.fillStyle(B, 1); g.fillRect(px - 2, py - 2, 4, 4);
    }
    for (let d = -2; d <= L - 1; d += 1.5) { g.fillStyle(W, 1); g.fillRect(Math.round(x + c * d) - 1 + jit, Math.round(y + s * d) - 1, 2, 2); }
    g.fillStyle(W, 1); g.fillRect(Math.round(x - c * 3 - s * 5) - 1 + jit, Math.round(y - s * 3 + c * 5) - 1, 2, 2); g.fillRect(Math.round(x - c * 3 + s * 5) - 1 + jit, Math.round(y - s * 3 - c * 5) - 1, 2, 2);   // crossguard tips
  }
}

// Mr Wake's neutral special, Void Orb: a slow orb of void energy swells as it drifts forward. Press
// special again to detonate it wherever it is (touching an opponent sets it off too, and it bursts on its
// own at the end of its flight). The detonation first IMPLODES - sucking nearby opponents into the middle
// with two small hits - then EXPLODES, launching them.
export class VoidOrb {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * (owner.def.handOffset.x + 6); this.y = owner.y + owner.def.handOffset.y;
    this.vx = this.dir * spec.speed; this.phase = 'fly'; this.t = 0; this.pt = 0; this.alive = true;
    this.id = nextId++; this.persist = true; this.r = spec.r0; this.kind = 'VOID ORB';
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('summon', 0.45, 1.6);
  }
  hitbox() {
    const S = this.spec, base = { owner: this.owner, facing: this.dir, projectile: this, persist: true };
    if (this.phase === 'fly') return { ...base, x1: this.x - this.r, x2: this.x + this.r, y1: this.y - this.r, y2: this.y + this.r, h: S.touch, id: this.id + 'touch' };
    if (this.phase === 'implode' && this.pt % S.pullEvery === 1 && this.pt < S.pullEvery * 2) return { ...base, x1: this.x - S.pullR, x2: this.x + S.pullR, y1: this.y - S.pullR, y2: this.y + S.pullR, h: S.pull, id: this.id + 'pull' + this.pt };
    if (this.phase === 'explode' && this.pt <= 3) return { ...base, x1: this.x - S.blastR, x2: this.x + S.blastR, y1: this.y - S.blastR, y2: this.y + S.blastR, h: S.blast, id: this.id + 'blast', facing: 0 };
    return null;
  }
  detonate() { if (this.phase === 'fly') { this.phase = 'implode'; this.pt = 0; this.vx = 0; sfx('curse', 0.8, 0.5); } }
  kill() { if (this.phase === 'fly') this.detonate(); else if (!this.owner.alive) this.remove(); }   // touching someone sets it off
  remove() { if (!this.alive) return; this.alive = false; this.g.destroy(); if (this.owner.voidOrb === this) this.owner.voidOrb = null; }
  step() {
    const S = this.spec; this.t++; this.pt++;
    if (!this.owner.alive && this.phase === 'fly') { this.remove(); return; }
    if (this.phase === 'fly') {
      this.vx *= 0.985; this.x += this.vx; this.y += Math.sin(this.t * 0.15) * 0.4;
      this.r = S.r0 + (S.r1 - S.r0) * Math.min(1, this.t / S.life);
      if (this.t >= S.life) this.detonate();
      if (this.t % 3 === 0) this.match.puff(this.x - this.dir * this.r, this.y, this.owner.fxColor, 1);
    } else if (this.phase === 'implode') {
      for (const f of this.match.fighters) {                      // suck opponents toward the middle
        if (!f.alive || f.team === this.owner.team || f.isIntangible() || f.state === 'grabbed') continue;
        const dx = this.x - f.x, dy = this.y - (f.y - f.body.h / 2), d = Math.hypot(dx, dy);
        if (d > S.pullR * 1.4) continue;
        f.x += dx * 0.14; if (!f.grounded) f.y += dy * 0.14;
        f.lx *= 0.5; f.ly *= 0.5;
      }
      if (this.pt >= S.implode) { this.phase = 'explode'; this.pt = 0; sfx('bighit', 0.9, 0.7); this.match.shake(7, 6);
        this.match.puff(this.x, this.y, 0xffffff, 10); this.match.puff(this.x, this.y, this.owner.fxColor, 14);
        if (this.owner.style === 'rose') sfx('petal', 1, 0.8); }
    } else if (this.pt >= 16) this.remove();
  }
  render() {
    if (!this.alive) return;
    const g = this.g, x = Math.round(this.x), y = Math.round(this.y), S = this.spec, col = this.owner.fxColor, t = this.t;
    g.clear();
    if (this.owner.style === 'rose') { this.renderRose(g, x, y, S, t); return; }
    if (this.phase === 'fly') {
      const r = this.r;
      g.fillStyle(col, 0.18); g.fillCircle(x, y, r + 5 + (t % 6 < 3 ? 1 : 0));
      const P = this.owner.pal;
      g.fillStyle(P.outline, 1); g.fillCircle(x, y, r);
      g.fillStyle(P.deep, 1); g.fillCircle(x, y, r * 0.8);
      g.fillStyle(0x0b0518, 1); g.fillCircle(x, y, r * 0.45);                       // dark core
      for (let k = 0; k < 4; k++) {                                                  // swirling streaks on the surface
        const a = t * 0.18 + k * Math.PI / 2;
        g.lineStyle(2, k % 2 ? col : P.core, 0.9); g.beginPath(); g.arc(x, y, r * 0.7, a, a + 0.9); g.strokePath();
      }
      for (let k = 0; k < 5; k++) { const a = -t * 0.12 + k * 1.26; g.fillStyle(P.core, 1); g.fillRect(Math.round(x + Math.cos(a) * (r + 4)) - 1, Math.round(y + Math.sin(a) * (r + 4)) - 1, 2, 2); }
      g.fillStyle(0xffffff, 0.9); g.fillRect(x - Math.round(r * 0.4), y - Math.round(r * 0.5), 2, 2);
    } else if (this.phase === 'implode') {
      const k = this.pt / S.implode, R = S.pullR * (1 - k * 0.7);
      g.fillStyle(0x0b0518, 0.25 + 0.3 * k); g.fillCircle(x, y, R);
      g.lineStyle(2, col, 0.9); g.strokeCircle(x, y, R);
      for (let i = 0; i < 16; i++) {                                                // streaks rushing inward
        const a = i * 0.39 + this.pt * 0.25, d = R * (1 - ((this.pt * 3 + i * 7) % 20) / 20);
        g.lineStyle(1, i % 2 ? this.owner.pal.core : col, 0.9); g.lineBetween(x + Math.cos(a) * d, y + Math.sin(a) * d, x + Math.cos(a) * (d + 6), y + Math.sin(a) * (d + 6));
      }
      g.fillStyle(0x0b0518, 1); g.fillCircle(x, y, 5 + 6 * k);
      g.fillStyle(0xffffff, k); g.fillCircle(x, y, 2 + 2 * k);
    } else {
      const k = this.pt / 16;
      g.fillStyle(0xffffff, 0.7 * (1 - k)); g.fillCircle(x, y, S.blastR * (0.4 + k * 0.5));
      g.lineStyle(4, col, 1 - k); g.strokeCircle(x, y, S.blastR * (0.5 + k * 0.8));
      g.lineStyle(2, this.owner.pal.core, 1 - k); g.strokeCircle(x, y, S.blastR * (0.3 + k * 1.1));
    }
  }
  // Rosebud: the orb is a closed rosebud on a short stem; it draws petals in as it implodes, then
  // bursts into full bloom - a ring of petals flung outward.
  renderRose(g, x, y, S, t) {
    const P = this.owner.pal;
    if (this.phase === 'fly') {
      const r = this.r, sway = Math.sin(t * 0.2) * 0.25;
      g.lineStyle(2, P.shade, 1); g.lineBetween(x, y + r * 0.6, x - this.dir * 3, y + r + 6);
      g.fillStyle(P.shade, 1); g.fillEllipse(x - r * 0.5, y + r * 0.6, r * 0.8, r * 0.4); g.fillEllipse(x + r * 0.5, y + r * 0.6, r * 0.8, r * 0.4);   // sepals
      g.fillStyle(P.outline, 1); g.fillEllipse(x, y, r * 1.5 + 2, r * 2 + 2);
      g.fillStyle(P.deep, 1); g.fillEllipse(x, y, r * 1.5, r * 2);
      g.fillStyle(P.mid, 1); g.fillEllipse(x + sway * r, y - r * 0.2, r * 0.9, r * 1.5);
      g.fillStyle(P.light, 1); g.fillEllipse(x + sway * r - r * 0.15, y - r * 0.5, r * 0.35, r * 0.7);
      return;
    }
    if (this.phase === 'implode') {
      const k = this.pt / S.implode, R = S.pullR * (1 - k * 0.7);
      g.fillStyle(P.void, 0.15 + 0.2 * k); g.fillCircle(x, y, R);
      for (let i = 0; i < 14; i++) {                                // petals swirling in
        const a = i * 0.45 + this.pt * 0.2, d = R * (1 - ((this.pt * 3 + i * 7) % 20) / 20);
        g.fillStyle(i % 3 ? P.mid : P.light, 0.95); g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 5, 3);
      }
      drawRose(g, x, y, 6 + 4 * k, this.pt * 0.25, P, 0.3 + 0.5 * k);
      return;
    }
    const k = this.pt / 16, R = S.blastR * (0.4 + k * 0.9);                   // full bloom
    g.fillStyle(P.light, 0.5 * (1 - k)); g.fillCircle(x, y, S.blastR * (0.5 + k * 0.4));
    for (let i = 0; i < 10; i++) {
      const a = i * 0.628 + k * 0.8;
      g.fillStyle(i % 2 ? P.deep : P.mid, 1 - k); g.fillEllipse(x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7, 16 * (1 - k * 0.4), 10 * (1 - k * 0.4));
    }
    drawRose(g, x, y, 14 * (1 - k * 0.5), k * 2, P, 1);
  }
}

// NU's POWER CHORD: a wall of sound rolling forward from the mic - three bright arcs that widen as they go.
// A held chord makes a bigger, faster one; passing through his AMP turns it into an AMPED wave.
export class SoundWave {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * (owner.def.handOffset.x + 4);
    this.y = owner.y + owner.def.handOffset.y + 6;
    this.life = spec.life; this.t = 0; this.alive = true; this.id = nextId++; this.kind = 'POWER CHORD';
    this.beat = !!owner.onBeatMove; this.amped = false; this.chord = spec.chord || 0;
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('summon', 0.5, 1.6 - this.chord * 0.5); sfx('bighit', 0.25 + this.chord * 0.4, 1.8 - this.chord * 0.7);
  }
  get h() { return (this.spec.h0 + (this.spec.h1 - this.spec.h0) * Math.min(1, this.t / 30)) * (this.amped ? 1.4 : 1); }
  hitbox() {
    const h = this.h;
    return { x1: this.x - 10, x2: this.x + 10, y1: this.y - h / 2, y2: this.y + h / 2, h: this.spec.hit, owner: this.owner, id: this.id, facing: this.dir, projectile: this };
  }
  // NU's AMP: a wave fired through it comes out bigger, faster and stronger
  amp(boost) {
    if (this.amped) return;
    this.amped = true;
    const H = this.spec.hit;
    this.spec = { ...this.spec, speed: this.spec.speed * 1.3, hit: { ...H, dmg: Math.round(H.dmg * boost), base: H.base * 1.2, growth: H.growth * 1.25 } };
    this.life = Math.max(this.life, 40); this.id = nextId++;
    sfx('bighit', 0.6, 1.1); this.match.puff(this.x, this.y, 0xffffff, 10);
  }
  step() {
    this.t++;
    this.x += this.dir * this.spec.speed * (this.t < 10 ? 1.3 : 1);
    const P = this.match.stage.platforms[0];
    if (this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.bottom) this.kill();
    if (--this.life <= 0) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, this.owner.pal.light, 6); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, P = this.owner.pal, fade = Math.min(1, this.life / 10), h = this.h;
    g.clear();
    const cols = this.amped ? [0xffffff, P.core, P.light, P.mid] : [P.core, P.light, P.mid, P.deep];
    const n = 3 + (this.chord > 0.5 || this.amped ? 1 : 0), big = this.chord >= 1 || this.amped;
    if (big) { g.fillStyle(P.light, 0.18 * fade); g.fillEllipse(this.x - this.dir * 8, this.y, 30, h); }
    for (let i = 0; i < n; i++) {                                     // the arcs, the leading one brightest
      const ax = this.x - this.dir * i * 7, r = h / 2 - i * 3;
      for (let a = -0.9; a <= 0.9; a += 0.1) {
        const px = ax + this.dir * Math.cos(a) * 6 - this.dir * 6, py = this.y + Math.sin(a) * r, sz = (i ? 2 : 3) + (big ? 1 : 0);
        g.fillStyle(cols[i], fade * (1 - i * 0.2)); g.fillRect(Math.round(px) - 1, Math.round(py) - 1, sz, sz);
      }
    }
    if (this.beat && this.t % 4 < 2) { g.fillStyle(0xffffff, 0.5 * fade); g.fillRect(this.x - 1, this.y - h / 2, 2, h); }   // on beat: it strobes
    if (this.t % (big ? 2 : 3) === 0) this.match.particles.push({ shape: 'note', x: this.x, y: this.y + (Math.random() - 0.5) * h * 0.6, vx: -this.dir * 0.4, vy: -0.6, life: 26, color: this.amped ? 0xffffff : P.light, grav: 0 });
  }
}

// NU's AMP DROP: a speaker cabinet dropped from above, in front of him. While it falls it crushes anyone it
// lands on (a hard spike - drop it off the ledge onto someone recovering). Once it lands it thumps a big
// shockwave on every beat that pushes people away, and any Power Chord fired through it comes out AMPED.
// One amp at a time; if it falls off the stage it's gone.
export class SpeakerAmp {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.life = spec.life; this.alive = true;
    this.x = owner.x + owner.facing * spec.ahead; this.y = owner.y - spec.dropFrom;
    this.vy = 1; this.falling = true; this.pulse = 0; this.crushed = new Set(); this.id = nextId++;
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('swing', 0.5, 0.6);
  }
  step() {
    if (!this.alive) return;
    const o = this.owner, m = this.match;
    if (this.falling) {
      this.vy = Math.min(this.spec.maxFall, this.vy + this.spec.gravity);
      const ny = this.y + this.vy;
      for (const p of m.stage.platforms) {                             // lands on the first floor it crosses
        if (this.x >= p.x1 && this.x <= p.x2 && this.y <= p.y && ny >= p.y) { this.y = p.y; this.land(); return; }
      }
      this.y = ny;
      for (const f of m.fighters) {                                    // crushes whoever it falls on
        if (f === o || !f.alive || f.team === o.team || f.isIntangible() || f.state === 'respawn' || this.crushed.has(f)) continue;
        const hw = f.body.w / 2 + 14;
        if (Math.abs(f.x - this.x) < hw && this.y > f.y - f.body.h && this.y - 60 < f.y) {   // two cabinets tall
          this.crushed.add(f); sfx('bighit', 0.9, 0.55); m.shake(10, 8);
          m.applyHit(f, { h: this.spec.drop, owner: o, facing: o.facing, id: 'ampdrop' + this.id + ':' + f.slot, projectile: this }, this.x);
        }
      }
      if (this.y > 340) this.kill();
      return;
    }
    this.t++;
    if (this.pulse > 0) this.pulse--;
    if (o.def.beat && o.age % o.def.beat.every === 0 && this.t > 10) {   // thump on the beat
      if (!this.song && this.t < 60) this.playSong();                  // the song kicks in on its first beat
      this.pulse = 16; sfx('taiko', 0.3, 1.0); m.shake(3, 4);
      for (const f of m.fighters) {
        if (f === o || !f.alive || f.team === o.team || f.isIntangible() || f.state === 'respawn') continue;
        if (Math.hypot(f.x - this.x, (f.y - 24 - (this.y - 28)) * 1.4) <= this.spec.radius)
          m.applyHit(f, { h: { ...this.spec.pulse, dirX: Math.sign(f.x - this.x) || 1 }, owner: o, facing: Math.sign(f.x - this.x) || 1, id: 'amp' + o.slot + ':' + f.slot + ':' + o.age, projectile: this }, this.x);
      }
    }
    for (const p of m.projectiles) {                                  // Power Chords passing through get AMPED
      if (p instanceof SoundWave && p.owner === o && !p.amped && Math.abs(p.x - this.x) < 14 && p.y > this.y - 70 && p.y < this.y + 4) p.amp(this.spec.boost);
    }
    if (this.song && this.t % 9 === 0) m.particles.push({ shape: 'note', x: this.x + (Math.random() - 0.5) * 20, y: this.y - 56, vx: (Math.random() - 0.5) * 1.6, vy: -1.2 - Math.random(), life: 34, color: Math.random() < 0.5 ? o.pal.light : 0xffffff, grav: -0.01, sway: Math.random() * 6 });   // notes blasting out
    if (this.song && this.life - this.t < 40) this.song.setVolume(this.songVol * Math.max(0, (this.life - this.t) / 40));   // fades out as it dies
    if (this.t >= this.life || !o.alive) this.kill();
  }
  // one of four 8-bit rock songs (amp_song1-4, 90 BPM so the thumps land on the kick); each amp he drops plays the next
  playSong() {
    const m = this.match, o = this.owner;
    o.ampSong = (o.ampSong || 0) % 4 + 1;
    const key = 'amp_song' + o.ampSong;
    this.songVol = Math.min(1, 0.6 * m.sfxVol());
    if (this.songVol <= 0 || !m.cache.audio.exists(key)) return;
    this.song = m.sound.add(key, { volume: this.songVol, loop: true }); this.song.play();
    this.stopHook = () => this.stopSong(); m.events.once('shutdown', this.stopHook);   // leaving the match mid-song
  }
  stopSong() {
    if (!this.song) return;
    this.song.stop(); this.song.destroy(); this.song = null;
    if (this.stopHook) { this.match.events.off('shutdown', this.stopHook); this.stopHook = null; }
  }
  land() {
    this.falling = false; this.t = 0;
    // its top is a platform anyone can stand on (and drop through, like a cloud)
    this.plat = { x1: this.x - 15, x2: this.x + 15, y: this.y - 60, solid: false, amp: true };
    this.match.stage.platforms.push(this.plat);
    sfx('bighit', 0.7, 0.6); this.match.shake(6, 6);
    this.match.puff(this.x - 14, this.y - 2, 0xd8d4e8, 6); this.match.puff(this.x + 14, this.y - 2, 0xd8d4e8, 6);
  }
  removePlat() {
    if (!this.plat) return;
    const P = this.match.stage.platforms, i = P.indexOf(this.plat);
    if (i >= 0) P.splice(i, 1);
    for (const f of this.match.fighters) if (f.platform === this.plat) { f.grounded = false; f.platform = null; if (['idle', 'run', 'land', 'taunt'].includes(f.state)) f.setState('air'); }
    this.plat = null;
  }
  kill() { if (!this.alive) return; this.alive = false; this.stopSong(); this.removePlat(); if (this.g) { this.match.puff(this.x, this.y - 12, 0x4a4656, 8); this.g.destroy(); } }
  render() {
    if (!this.alive) return;
    const g = this.g, P = this.owner.pal, fade = this.life - this.t < 40 ? (this.life - this.t) / 40 : 1;
    const squash = this.falling ? 1 : Math.min(1, 0.7 + this.t / 20), w = 30 / squash, h = 30 * squash, x = this.x - w / 2, y = this.y - h, k = this.pulse / 16;
    g.clear();
    if (this.falling) {                                               // speed lines above it, and a warning shadow below
      g.fillStyle(0xffffff, 0.5); for (const dx of [-10, 0, 10]) g.fillRect(this.x + dx, y - h - 6 - this.vy * 2, 1, this.vy * 2);
    }
    if (k > 0) {                                                      // the beat: a big shockwave rolling out
      const r = (1 - k) * this.spec.radius;
      g.lineStyle(3, P.light, 0.8 * k * fade); g.strokeEllipse(this.x, this.y - 28, r * 2 + 20, (r * 2 + 20) / 1.4);
      g.lineStyle(1, 0xffffff, k * fade); g.strokeEllipse(this.x, this.y - 28, r * 1.7 + 14, (r * 1.7 + 14) / 1.4);
    }
    // two cabinets stacked: a big single cone on the bottom, two smaller cones on top
    for (let c = 0; c < 2; c++) {
      const cy0 = y - c * h, top = c === 1;
      g.fillStyle(0x0b0a14, fade); g.fillRect(x - 1, cy0 - 1, w + 2, h + 2);
      g.fillStyle(0x2e2a36, fade); g.fillRect(x, cy0, w, h);
      g.fillStyle(0x4a4656, fade); g.fillRect(x, cy0, w, 2); g.fillRect(x, cy0, 2, h);
      const cones = top ? [[-7, 6], [7, 6]] : [[0, 9]];
      for (const [dx, r0] of cones) {                                 // the cones, pumping on the beat
        const pr = r0 + k * (top ? 2 : 3), cx = this.x + dx, cy = cy0 + h * (top ? 0.6 : 0.57);
        g.fillStyle(0x0b0a14, fade); g.fillCircle(cx, cy, pr + 1);
        g.fillStyle(0x4a4656, fade); g.fillCircle(cx, cy, pr);
        g.fillStyle(0x24212c, fade); g.fillCircle(cx, cy, pr * 0.55);
        g.fillStyle(P.light, (0.5 + 0.5 * k) * fade); g.fillCircle(cx, cy, top ? 1.5 : 2);
      }
      if (!top) { g.fillStyle(0x6c7480, fade); g.fillCircle(this.x - 8, cy0 + 6, 2); g.fillCircle(this.x + 8, cy0 + 6, 2); }   // knobs
      else { g.fillStyle(P.light, fade * (this.t % 20 < 10 ? 1 : 0.4)); g.fillRect(this.x + 11, cy0 + 3, 2, 2); }             // the power light
      g.fillStyle(P.mid, fade); g.fillRect(this.x - 4, cy0 + (top ? h - 5 : 3), 6, 2);   // brand plates
    }
  }
}

// NU's GRAFFITI TAG: a dripping spray-painted tag on the floor. While NU stands on his own tag he's in
// RAGE MODE (his hits deal 20% more). One tag at a time; it fades after a while.
export class GraffitiTag {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.life = spec.life; this.alive = true;
    this.x = owner.x + owner.facing * spec.ahead;
    let best = null;
    for (const p of match.stage.platforms) if (this.x >= p.x1 && this.x <= p.x2 && p.y >= owner.y - 2 && (!best || p.y < best.y)) best = p;
    if (!best) { this.alive = false; return; }
    this.y = best.y;
    this.x1 = Math.max(best.x1, this.x - spec.width / 2); this.x2 = Math.min(best.x2, this.x + spec.width / 2);
    this.g = match.add.graphics(); match.addWorld(this.g);
    this.seed = Math.floor(Math.random() * 1000);
  }
  step() {
    if (!this.alive) return;
    this.t++;
    const o = this.owner;
    if (o.alive && o.grounded && o.x >= this.x1 - 4 && o.x <= this.x2 + 4 && Math.abs(o.y - this.y) < 4) {
      if (!(o.rage > 0)) { this.match.popText(o, 'RAGE MODE!', '#ff4a3a'); sfx('bighit', 0.4, 0.7); }
      o.rage = 30;                                                    // lingers half a second after stepping off
    }
    if (this.t >= this.life) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; if (this.g) this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, P = this.owner.pal, paint = Math.min(1, this.t / 14), fade = this.life - this.t < 40 ? (this.life - this.t) / 40 : 1;
    const cx = (this.x1 + this.x2) / 2, y = this.y - 1, w = (this.x2 - this.x1) * paint;
    g.clear();
    // the tag: a jagged zig-zag scrawl with drips, outlined dark, glowing a little while he stands on it
    const glow = this.owner.rage > 0 ? 0.35 + 0.15 * Math.sin(this.t * 0.4) : 0;
    if (glow) { g.fillStyle(0xff4a3a, glow * fade); g.fillRect(cx - w / 2 - 2, y - 7, w + 4, 9); }
    let rnd = this.seed;
    const r = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
    for (let x = cx - w / 2; x < cx + w / 2; x += 3) {
      const yy = y - 3 - Math.round(Math.abs(Math.sin((x - cx) * 0.22)) * 3);
      g.fillStyle(P.outline, fade); g.fillRect(x - 1, yy - 1, 5, 4);
      g.fillStyle(r() < 0.25 ? P.core : P.light, fade); g.fillRect(x, yy, 3, 2);
      if (r() < 0.18) { g.fillStyle(P.light, fade); g.fillRect(x + 1, yy + 2, 1, 2 + Math.floor(r() * 3)); }   // drips
    }
    // a crown scrawled over the middle
    if (paint >= 1) { g.fillStyle(P.core, fade); for (const [dx, dy] of [[-4, -8], [0, -10], [4, -8]]) g.fillRect(cx + dx, y + dy, 2, 3); g.fillRect(cx - 4, y - 6, 10, 2); }
  }
}

// AERO's BUBBLE TRAP: a big glossy bubble drifting forward. Whoever it touches is sealed inside and
// floats helplessly upward for a moment before it pops.
export class AeroBubble {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * (owner.def.handOffset.x + 8); this.y = owner.y + owner.def.handOffset.y + 4;
    this.vx = this.dir * spec.speed; this.life = spec.life; this.t = 0; this.alive = true; this.id = nextId++;
    this.r = spec.r; this.kind = 'BUBBLE TRAP';
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('item', 0.5, 1.6);
  }
  hitbox() { return { x1: this.x - this.r, x2: this.x + this.r, y1: this.y - this.r, y2: this.y + this.r, h: this.spec.hit, owner: this.owner, id: this.id, facing: this.dir, projectile: this }; }
  step() {
    this.t++;
    this.vx *= 0.99; this.x += this.vx; this.y += -0.25 + Math.sin(this.t * 0.12) * 0.35;
    if (--this.life <= 0) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; popBubble(this.match, this.x, this.y, this.r, this.owner.pal); this.g.destroy(); }
  render() { if (!this.alive) return; this.g.clear(); drawBubble(this.g, this.x, this.y, this.r + Math.sin(this.t * 0.3) * 0.6, this.owner.pal, Math.min(1, this.life / 12)); }
}
// a glossy bubble: a thin bright rim, a faint tinted body, a hard white shine and a little rainbow sheen
export function drawBubble(g, x, y, r, P, a = 1) {
  g.fillStyle(P.light, 0.16 * a); g.fillCircle(x, y, r);
  g.lineStyle(2, P.core, 0.85 * a); g.strokeCircle(x, y, r);
  g.lineStyle(1, P.mid, 0.6 * a); g.beginPath(); g.arc(x, y, r - 2, 0.2, 1.6); g.strokePath();
  g.lineStyle(1, 0xffb0e8, 0.45 * a); g.beginPath(); g.arc(x, y, r - 1, 3.6, 4.4); g.strokePath();   // rainbow sheen
  g.fillStyle(0xffffff, 0.95 * a); g.fillRect(x - r * 0.55, y - r * 0.55, Math.max(2, r * 0.3), 2); g.fillRect(x - r * 0.55, y - r * 0.55, 2, Math.max(2, r * 0.3));
  g.fillRect(x + r * 0.35, y + r * 0.35, 2, 2);
}
export function popBubble(m, x, y, r, P) {
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; m.particles.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 12, color: i % 2 ? 0xffffff : P.light, size: 2, grav: 0.02 }); }
  sfx('item', 0.35, 2.2);
}

// AERO's GOLDFISH FLING (side special): the goldfish leaps out of his bowl and arcs forward on a ribbon of
// water, hitting whoever it meets, then swims back through the air to the bowl - hitting again on the way
// home and tugging them toward AERO. Shielded or countered, it just turns round and swims home early.
export class GoldfishFling {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.dir = owner.facing;
    this.x = owner.x + this.dir * 10; this.y = owner.y - 44;              // straight out of the bowl
    this.vx = this.dir * spec.speed; this.vy = -(spec.liftOverride ?? spec.lift);
    this.phase = 'out'; this.t = 0; this.pt = 0; this.alive = true; this.id = nextId++; this.persist = true; this.kind = 'GOLDFISH';
    this.trail = [];
    this.g = match.add.graphics(); match.addWorld(this.g);
    owner.fishOut = (owner.fishOut || 0) + 1;                            // how many fish are out of the bowl
    sfx('item', 0.6, 1.3); this.splash(4);
  }
  hitbox() {
    const r = 10, h = this.phase === 'out' ? this.spec.out : this.spec.back;
    return { x1: this.x - r, x2: this.x + r, y1: this.y - r, y2: this.y + r, h, owner: this.owner, id: this.id + this.phase, facing: Math.sign(this.vx) || this.dir, projectile: this, persist: true };
  }
  step() {
    const S = this.spec, o = this.owner;
    this.t++; this.pt++;
    if (!o.alive) { this.remove(); return; }
    if (this.phase === 'out') {
      this.vx -= this.dir * S.decel; this.vy += S.grav;
      if (Math.sign(this.vx) !== this.dir || this.pt >= S.outTime) this.turn();
    } else {                                                                // swims home to the bowl, faster and faster
      const tx = o.x + o.facing * 2, ty = o.y - 50, dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(S.returnSpeed + this.pt * 0.14, 11);
      this.vx += (dx / d * sp - this.vx) * 0.3; this.vy += (dy / d * sp - this.vy) * 0.3;
      if (d < 12 || this.pt > 160) { this.home(); return; }
    }
    this.x += this.vx; this.y += this.vy;
    this.trail.push([this.x, this.y]); if (this.trail.length > 9) this.trail.shift();
    if (this.t % 4 === 0) this.splash(1);
  }
  splash(n) {
    const R = Math.random;
    for (let i = 0; i < n; i++) this.match.particles.push({ x: this.x, y: this.y, vx: (R() - 0.5) * 1.6, vy: -R() * 1.4, life: 16 + R() * 10, color: i % 2 ? 0xffffff : this.owner.pal.light, size: 2, grav: 0.12 });
  }
  turn() { if (this.phase === 'out') { this.phase = 'back'; this.pt = 0; sfx('djump', 0.4, 1.7); } }
  kill() { if (!this.alive) return; if (this.phase === 'out') { this.turn(); return; } this.remove(); }   // blocked: swims home
  home() { this.splash(6); sfx('item', 0.5, 2.2); this.remove(); }
  remove() { if (!this.alive) return; this.alive = false; this.g.destroy(); this.owner.fishOut = Math.max(0, (this.owner.fishOut || 0) - 1); }
  render() {
    if (!this.alive) return;
    const g = this.g, P = this.owner.pal, fx = Math.sign(this.vx) || this.dir, x = Math.round(this.x), y = Math.round(this.y);
    g.clear();
    this.trail.forEach(([tx, ty], i) => { const k = (i + 1) / this.trail.length; g.fillStyle(P.light, 0.12 + 0.25 * k); g.fillCircle(tx, ty, 2 + 4 * k); });   // the ribbon of water
    const wig = Math.sin(this.t * 0.8) * 2;
    g.fillStyle(0x5a1e08, 1); g.fillEllipse(x, y, 16, 10);                               // outline
    g.fillStyle(0xff8a2a, 1); g.fillEllipse(x, y, 14, 8);                                // body
    g.fillStyle(0xffc070, 1); g.fillEllipse(x + fx * 1, y - 2, 9, 3);                    // glossy back
    g.fillStyle(0xff8a2a, 1); g.fillTriangle(x - fx * 6, y, x - fx * 13, y - 5 + wig, x - fx * 13, y + 5 + wig);   // tail
    g.fillStyle(0xc0501a, 1); g.fillTriangle(x - fx * 1, y - 3, x - fx * 5, y - 7, x + fx * 2, y - 4);           // dorsal fin
    g.fillStyle(0xffffff, 1); g.fillRect(x + fx * 4 - 1, y - 2, 2, 2);                   // eye
    g.fillStyle(0x0b0a14, 1); g.fillRect(x + fx * 4 + (fx > 0 ? 0 : -1), y - 2, 1, 1);
    g.fillStyle(0xffffff, 0.9); g.fillRect(x - 2, y - 3, 3, 1);                          // shine
  }
}

// AERO's DESKTOP (down special): a glossy little computer set down on the floor ahead of him. While AERO
// stays near one he is POWERED UP - stronger, faster, higher jumps, and he takes less knockback (Fighter
// .aeroLevel). Opponents can smash it: it has 30 HP. At most two; a third replaces the oldest. Two out at
// once when he uses his Limit turns it into FULL AERO (Fighter.fullAeroLimit).
export class AeroPC {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.alive = true; this.id = nextId++;
    this.x = owner.x + owner.facing * spec.ahead; this.y = owner.y - 10; this.vy = 0; this.landed = false;
    this.hp = spec.hp; this.hitIds = new Set(); this.flash = 0; this.shake = 0; this.facing = owner.facing;
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('item', 0.5, 0.9); sfx('select', 0.4, 1.6);
  }
  box() { return { x1: this.x - 15, x2: this.x + 15, y1: this.y - 26, y2: this.y }; }
  floorBelow() {
    let best = null;
    for (const p of this.match.stage.platforms) if (this.x >= p.x1 && this.x <= p.x2 && p.y >= this.y - 1 && (best === null || p.y < best)) best = p.y;
    return best;
  }
  inRange(f) { return f.alive && Math.hypot(f.x - this.x, (f.y - 24) - (this.y - 14)) < this.spec.radius; }
  step() {
    this.t++;
    if (this.flash > 0) this.flash--; if (this.shake > 0) this.shake--;
    if (!this.landed) {                                            // set down: drops to the floor below
      this.vy = Math.min(this.vy + 0.5, 9); this.y += this.vy;
      const fl = this.floorBelow();
      if (fl !== null && this.y >= fl) { this.y = fl; this.landed = true; sfx('land', 0.5, 1.4); this.match.puff(this.x, this.y, 0xffffff, 5); }
      if (this.y > 400) { this.destroy(); return; }                // dropped off the stage
    }
    const o = this.owner;
    if (!o.alive) { this.kill(); return; }
    if (this.landed && this.inRange(o)) o.pcBuff = 3;               // AERO is powered up while he's in range
  }
  // attacks that overlap it chip its HP (MatchScene.resolveHits)
  strike(hbs) {
    if (!this.alive) return;
    const b = this.box();
    for (const hb of hbs) {
      if (!hb.owner || hb.owner.team === this.owner.team || hb.grab || this.hitIds.has(hb.id)) continue;
      if (!(hb.x1 < b.x2 && hb.x2 > b.x1 && hb.y1 < b.y2 && hb.y2 > b.y1)) continue;
      this.hitIds.add(hb.id);
      this.hp -= hb.h.dmg || 5; this.flash = 6; this.shake = 8;
      sfx('clang', 0.4, 1.6);
      if (hb.projectile && !hb.persist) hb.projectile.kill();
      if (this.hp <= 0) { this.destroy(); return; }
    }
  }
  destroy() {
    const R = Math.random;
    for (let i = 0; i < 16; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3.5; this.match.particles.push({ shape: 'shard', x: this.x, y: this.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 26 + R() * 14, color: [0xffffff, 0x9ff0ff, 0x3fc8ea][i % 3], drag: 0.94, grav: 0.12, ang: a, size: 2 }); }
    sfx('glitch', 0.7, 0.9); sfx('bighit', 0.5, 1.5);
    this.match.popText({ x: this.x, y: this.y + 40 }, 'PC DOWN!', '#9ff0ff');
    this.kill();
  }
  absorb() { this.absorbed = true; this.kill(); }          // FULL AERO: its power flows into him
  kill() { if (!this.alive) return; this.alive = false; if (!this.absorbed) this.match.puff(this.x, this.y - 12, 0xffffff, 6); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, P = this.owner.pal, x = Math.round(this.x + (this.shake ? (this.shake % 2 ? 1 : -1) : 0)), y = Math.round(this.y), t = this.t;
    g.clear();
    const o = this.owner, on = this.landed && this.inRange(o) && o.state !== 'respawn';
    if (on) {                                                     // the power link: a glossy beam from the screen to AERO
      const tx = o.x, ty = o.y - 30;
      g.lineStyle(4, P.light, 0.25); g.lineBetween(x, y - 18, tx, ty);
      g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(x, y - 18, tx, ty);
      const k = (t % 20) / 20; g.fillStyle(0xffffff, 1); g.fillCircle(x + (tx - x) * k, y - 18 + (ty - y + 18) * k, 2);
    }
    if (this.landed) { g.lineStyle(1, P.light, 0.18 + 0.08 * Math.sin(t * 0.1)); g.strokeCircle(x, y - 14, this.spec.radius); }   // its range
    const W = this.flash ? 0xffffff : 0xf4fbff;
    // tower
    g.fillStyle(0x0d3550, 1); g.fillRect(x + 8, y - 22, 9, 22);
    g.fillStyle(W, 1); g.fillRect(x + 9, y - 21, 7, 20);
    g.fillStyle(0x9ad8ee, 1); g.fillRect(x + 15, y - 21, 1, 20);
    g.fillStyle(0x3fc8ea, 1); g.fillRect(x + 10, y - 17, 5, 1); g.fillRect(x + 10, y - 15, 5, 1);
    g.fillStyle(t % 30 < 15 ? 0x8be04a : 0x4a9a1e, 1); g.fillRect(x + 12, y - 5, 2, 2);          // power light
    // monitor: rounded glossy white bezel, a wallpaper screen (sky over a green hill), a stand
    g.fillStyle(0x0d3550, 1); g.fillRoundedRect(x - 17, y - 28, 26, 21, 4);
    g.fillStyle(W, 1); g.fillRoundedRect(x - 16, y - 27, 24, 19, 3);
    g.fillStyle(0x3fc8ea, 1); g.fillRect(x - 14, y - 25, 20, 14);
    g.fillStyle(0x9ff0ff, 1); g.fillRect(x - 14, y - 25, 20, 5);
    g.fillStyle(0x8be04a, 1); g.fillEllipse(x - 4, y - 11, 26, 9);
    g.fillStyle(0xd6ff9a, 1); g.fillRect(x - 10, y - 15, 6, 1);
    g.fillStyle(0x3fc8ea, 1); g.fillRect(x - 14, y - 10, 20, 1);
    const sx = x - 14 + ((t * 0.3) % 20); g.fillStyle(0xffffff, 0.5); g.fillRect(Math.round(sx), y - 25, 2, 14);   // the screen's moving shine
    g.fillStyle(0xffffff, 1); g.fillRect(x - 13, y - 24, 4, 1); g.fillRect(x - 13, y - 24, 1, 3);
    g.fillStyle(0x0d3550, 1); g.fillRect(x - 6, y - 8, 4, 4); g.fillRect(x - 11, y - 4, 14, 3);
    g.fillStyle(0xa8cfe0, 1); g.fillRect(x - 5, y - 8, 2, 4); g.fillRect(x - 10, y - 4, 12, 2);
    // keyboard
    g.fillStyle(0x0d3550, 1); g.fillRect(x - 16, y - 2, 14, 2);
    g.fillStyle(0xe6f4fb, 1); g.fillRect(x - 15, y - 2, 12, 1);
    if (this.hp < this.spec.hp) {                                       // health bar once it's been hit
      g.fillStyle(0x0b0a14, 0.8); g.fillRect(x - 14, y - 34, 28, 3);
      g.fillStyle(this.hp > this.spec.hp * 0.4 ? 0x8be04a : 0xff5a5a, 1); g.fillRect(x - 13, y - 33, 26 * Math.max(0, this.hp) / this.spec.hp, 1);
    }
  }
}

// FULL AERO's down special: a glossy cloud overhead that sprays CDs at the nearest opponent, fast - 5% each.
export class CdCloud {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.life = spec.life; this.alive = true; this.id = nextId++;
    this.x = owner.x + owner.facing * spec.ahead; this.y = owner.y - spec.height; this.y0 = this.y;
    this.g = match.add.graphics(); match.addWorld(this.g);
    owner.cdCloud = this;
    sfx('item', 0.5, 0.8); match.puff(this.x, this.y, 0xffffff, 10);
  }
  target() {
    let best = null, bd = 1e9;
    for (const f of this.match.fighters) if (f.alive && f.team !== this.owner.team && f.state !== 'respawn') { const d = Math.hypot(f.x - this.x, f.y - this.y); if (d < bd) { bd = d; best = f; } }
    return best;
  }
  step() {
    const S = this.spec;
    this.t++;
    const o = this.owner;
    if (!o.alive) { this.kill(); return; }
    this.x += ((o.x + o.facing * S.ahead) - this.x) * 0.04;                 // follows him around, loosely
    this.y0 += ((o.y - S.height) - this.y0) * 0.04; this.y = this.y0 + Math.sin(this.t * 0.08) * 3;
    if (this.t > 10 && this.t % S.every === 0) {
      const tg = this.target();
      if (tg) {
        const ang = Math.atan2(tg.y - 26 - this.y, tg.x - this.x) + (Math.random() - 0.5) * S.spread;
        // CDs fired in the same short window share one hit id, so each opponent takes at most one CD per window
        this.match.projectiles.push(new FlyingCD(this.match, o, S.cd, this.x, this.y + 6, ang, 'cd' + this.id + ':' + Math.floor(this.t / S.window)));
        sfx('swing', 0.25, 2 + Math.random() * 0.3);
      }
    }
    if (this.t >= this.life) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, 0xffffff, 8); this.g.destroy(); if (this.owner.cdCloud === this) this.owner.cdCloud = null; }
  render() {
    if (!this.alive) return;
    const g = this.g, P = this.owner.pal, x = this.x, y = this.y, w = 56;
    const fade = Math.min(1, this.t / 8, (this.life - this.t) / 16);
    g.clear();
    const puffs = [[-0.36, 0, 0.26], [-0.12, -0.12, 0.32], [0.16, -0.08, 0.3], [0.38, 0.02, 0.22], [0, 0.06, 0.3]];
    g.fillStyle(P.deep, 0.9 * fade); for (const [px, py, r] of puffs) g.fillCircle(x + px * w, y + py * w + 2, r * w + 1);
    g.fillStyle(0xe8f8ff, fade); for (const [px, py, r] of puffs) g.fillCircle(x + px * w, y + py * w, r * w);
    g.fillStyle(0xf3c358, 0.8 * fade); g.fillRect(x - w * 0.45, y + w * 0.12, w * 0.9, 2);                 // a gold lining
    g.fillStyle(0xffffff, fade); g.fillRect(x - w * 0.2, y - w * 0.3, w * 0.18, 2); g.fillRect(x - w * 0.2, y - w * 0.3, 2, 4);
  }
}

// a spinning compact disc: rainbow sheen, silver face, a hole in the middle
export class FlyingCD {
  constructor(match, owner, hit, x, y, ang, group) {
    this.match = match; this.owner = owner; this.hit = hit; this.x = x; this.y = y; this.group = group;
    this.vx = Math.cos(ang) * hit.speed; this.vy = Math.sin(ang) * hit.speed; this.dir = Math.sign(this.vx) || 1;
    this.t = 0; this.alive = true; this.id = nextId++; this.kind = 'CD';
    this.g = match.add.graphics(); match.addWorld(this.g);
  }
  hitbox() { return { x1: this.x - 6, x2: this.x + 6, y1: this.y - 6, y2: this.y + 6, h: this.hit, owner: this.owner, id: this.group || this.id, facing: this.dir, projectile: this }; }
  step() {
    this.t++; this.x += this.vx; this.y += this.vy;
    const P = this.match.stage.platforms[0];
    if ((this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.bottom) || this.t > 45) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, 0xe6f4fb, 3); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, x = Math.round(this.x), y = Math.round(this.y), sq = Math.abs(Math.cos(this.t * 0.6));
    g.clear();
    g.fillStyle(0x0d3550, 1); g.fillEllipse(x, y, 13, 13 * Math.max(0.25, sq) + 1);
    g.fillStyle(0xdfe8ee, 1); g.fillEllipse(x, y, 11, 11 * Math.max(0.2, sq));
    const cols = [0xff9ad8, 0x9ff0ff, 0xd6ff9a, 0xfff2a8];
    g.fillStyle(cols[Math.floor(this.t / 2) % 4], 0.8); g.fillEllipse(x - 2, y - 1, 5, 4 * Math.max(0.2, sq));   // rainbow sheen
    g.fillStyle(0x0d3550, 1); g.fillRect(x - 1, y - 1, 2, 2);
  }
}

// ---------------------------------------------------------------- WHAT ONCE WAS (test fighter)
// MISSING POSTER: a paper poster flung from its claw. It flutters forward, rising and dipping; whoever it
// hits is MARKED - posted MISSING - for a moment (they take more damage, see Fighter.dmgTakenMult).
// Costumes change what a "poster" is: FRUTIGER sends it inside a glossy bubble, ROOT ACCESS throws an
// ERROR popup window, RONIN a paper talisman (ofuda) with a red seal.
// an old desktop's arrow mouse pointer, tip at (x, y) (DIAL-UP); `down` = mid-click (it darkens)
export function drawCursor(g, x, y, down = 0, a = 1) {
  const rows = [1, 2, 3, 4, 5, 6, 7, 4, 2];
  g.fillStyle(0x000000, a); for (let r = 0; r < rows.length; r++) g.fillRect(x - 1, y + r - 1, rows[r] + 2, 3);
  g.fillStyle(down ? 0xc0c0c0 : 0xffffff, a); for (let r = 0; r < 7; r++) g.fillRect(x, y + r, Math.max(1, rows[r] - 1), 1);
  g.fillRect(x + 2, y + 7, 1, 2);
}
// a little grey dialog window with a blue title bar and its [x] (DIAL-UP)
export function drawMiniWindow(g, x, y, w, h, a = 1, title = 0x0a2484) {
  g.fillStyle(0x000000, a); g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(0xffffff, a); g.fillRect(x, y, w, h);
  g.fillStyle(0xc0c0c0, a); g.fillRect(x + 1, y + 1, w - 1, h - 1);
  g.fillStyle(title, a); g.fillRect(x + 1, y + 1, w - 2, Math.max(2, Math.round(h * 0.22)));
  g.fillStyle(0xc0c0c0, a); g.fillRect(x + w - 4, y + 1, 3, Math.max(2, Math.round(h * 0.22)));
  g.fillStyle(0x000000, a); g.fillRect(x + w - 3, y + 2, 1, 1);
}
export function drawPoster(g, x, y, tilt = 0, a = 1, s = 1, style = null) {
  x = Math.round(x); y = Math.round(y);
  if (style === 'wowDial') {                                       // DIAL-UP: a dialog box - MISSING.TXT, a face, an OK button
    const w = 16 * s, h = 13 * s;
    drawMiniWindow(g, x - w / 2, y - h / 2, w, h, a);
    g.fillStyle(0xffffff, a); g.fillRect(x - w / 2 + 2, y - h / 2 + 4 * s, w - 4, 6 * s);
    g.fillStyle(0xc8281e, a); g.fillRect(x - w / 2 + 3, y - h / 2 + 5 * s, 4 * s, 1);
    g.fillStyle(0x3a342a, a); g.fillRect(x + 1 + Math.round(tilt), y - h / 2 + 5 * s, 3 * s, 2 * s); g.fillRect(x + Math.round(tilt), y - h / 2 + 7 * s, 5 * s, 2 * s);
    g.fillStyle(0x000000, a); g.fillRect(x - 3 * s, y + h / 2 - 3 * s, 6 * s, 2 * s); g.fillStyle(0xc0c0c0, a); g.fillRect(x - 3 * s + 1, y + h / 2 - 3 * s + 1, 6 * s - 2, 2 * s - 2);   // [ OK ]
    return;
  }
  if (style === 'wowHack') {
    const w = 15 * s, h = 11 * s;
    g.fillStyle(0x3ae060, a); g.fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
    g.fillStyle(0x020a04, a); g.fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(0x3ae060, a); g.fillRect(x - w / 2, y - h / 2, w, 2 * s);                         // title bar
    g.fillStyle(0xff2a2a, a); g.fillRect(x + w / 2 - 3 * s, y - h / 2, 2 * s, 2 * s);             // [x]
    g.fillStyle(0xff2a2a, a); g.fillRect(x - w / 2 + 2, y - h / 2 + 4 * s, 5 * s, 2 * s);         // ERROR
    g.fillStyle(0x3ae060, a); g.fillRect(x - w / 2 + 2, y - h / 2 + 7 * s, w - 4, 1); g.fillRect(x - w / 2 + 2, y - h / 2 + 9 * s, w - 7, 1);
    return;
  }
  if (style === 'wowRonin') {
    const w = 7 * s, h = 16 * s;
    g.fillStyle(0x1a0606, a); g.fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
    g.fillStyle(0xf4ecd8, a); g.fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(0x1a1614, a); for (let i = 0; i < 4; i++) g.fillRect(x - 1 + ((i * 3) % 3) - 1 + Math.round(tilt), y - h / 2 + 2 + i * 3 * s, 3, 2);   // ink strokes
    g.fillStyle(0xc8281e, a); g.fillCircle(x, y + h / 2 - 3 * s, 2 * s);                          // the red seal
    return;
  }
  if (style === 'wowAero') {
    g.fillStyle(0x9ff0ff, 0.2 * a); g.fillCircle(x, y, 11 * s);
    g.lineStyle(1, 0xffffff, 0.9 * a); g.strokeCircle(x, y, 11 * s);
    g.fillStyle(0xffffff, a); g.fillRect(x - 7 * s, y - 7 * s, 3, 1); g.fillRect(x - 7 * s, y - 7 * s, 1, 3);   // gloss
  }
  const w = 10 * s, h = 13 * s, sk = Math.round(tilt * 2);
  g.fillStyle(0x16120a, a); g.fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
  g.fillStyle(0xe8e2cc, a); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(0xc8281e, a); g.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, 2 * s);             // MISSING
  g.fillStyle(0x3a342a, a); g.fillRect(x - 2 * s + sk, y - h / 2 + 4 * s, 4 * s, 3 * s);         // a face
  g.fillRect(x - 3 * s + sk, y - h / 2 + 7 * s, 6 * s, 2 * s);
  g.fillStyle(0x8a8478, a); g.fillRect(x - w / 2 + 1, y + h / 2 - 3 * s, w - 2, 1); g.fillRect(x - w / 2 + 1, y + h / 2 - 2, w - 4, 1);   // text lines
}
export class MissingPoster {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.alive = true; this.id = nextId++;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * 30; this.y = owner.y - 34; this.y0 = this.y;
    this.vx = this.dir * spec.speed; this.life = spec.life;
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('swing', 0.4, 1.7); sfx('petal', 0.5, 0.6);
  }
  hitbox() { return { x1: this.x - 7, x2: this.x + 7, y1: this.y - 9, y2: this.y + 9, h: this.spec.hit, owner: this.owner, id: this.id, facing: this.dir, projectile: this }; }
  step() {
    this.t++;
    this.vx *= 0.985;
    this.x += this.vx; this.y = this.y0 + Math.sin(this.t * 0.18) * this.spec.flutter - this.t * 0.05;
    if (this.t % 4 === 0) this.match.particles.push({ x: this.x - this.dir * 6, y: this.y + 4, vx: -this.dir * 0.3, vy: 0.2, life: 12, color: 0xe8e2cc, size: 1, grav: 0 });
    if (--this.life <= 0) this.remove(true);
  }
  // it hit someone: they're posted MISSING
  kill() {
    if (!this.alive) return;
    let best = null, bd = 1e9;
    for (const f of this.match.fighters) { if (!f.alive || f.team === this.owner.team) continue; const d = Math.hypot(f.x - this.x, f.y - 26 - this.y); if (d < bd) { bd = d; best = f; } }
    if (best && bd < 40 && best.state === 'hitstun') best.markMissing(this.spec.mark, this.owner.style);
    sfx('petal', 0.6, 1.2); this.remove(false);
  }
  remove(fade) {
    if (!this.alive) return; this.alive = false; this.g.destroy();
    if (fade) this.match.puff(this.x, this.y, 0xe8e2cc, 4);
    if (this.owner.posterOut === this) this.owner.posterOut = null;
  }
  render() {
    if (!this.alive) return;
    const g = this.g; g.clear();
    drawPoster(g, this.x, this.y, Math.sin(this.t * 0.3), Math.min(1, this.life / 10), 1, this.owner.style);
  }
}

// WRONG DOOR: a plain office door in a scrap of yellow wallpaper, standing on the floor. Using the down
// special again steps WHAT ONCE WAS out of it. Attacks chip its HP (like AERO's computers).
// Sized for a fighter: the opening is a bit taller and wider than a fighter's body (50 px tall), so
// it (or anyone) visibly fits through it.
export const DOOR = { w: 30, h: 64 };          // the doorway opening
// Costume doors: FRUTIGER a glass door onto a blue sky, ROOT ACCESS a wireframe portal, RONIN a sliding shoji screen.
export function drawDoor(g, x, y, open = 0, a = 1, flash = false, style = null) {
  x = Math.round(x); y = Math.round(y);
  const W = DOOR.w, H = DOOR.h, hw = W / 2, fr = 3, pw = hw + fr + 6, ph = H + fr + 8;
  if (style === 'wowAero' || style === 'wowHack' || style === 'wowRonin' || style === 'wowDial') return drawStyledDoor(g, x, y, open, a, flash, style, W, H, hw, fr);
  g.fillStyle(0x16120a, a); g.fillRect(x - pw - 1, y - ph - 1, pw * 2 + 2, ph + 1);
  g.fillStyle(0xcbb662, a); g.fillRect(x - pw, y - ph, pw * 2, ph);          // the wallpaper patch
  g.fillStyle(0xb09a48, a * 0.7); for (let sx = x - pw + 2; sx < x + pw; sx += 5) g.fillRect(sx, y - ph, 1, ph);
  g.fillStyle(0xa08c40, a); g.fillRect(x - pw, y - 4, pw * 2, 4);            // skirting board
  g.fillStyle(0x3a2e14, a); g.fillRect(x - hw - fr, y - H - fr, W + fr * 2, H + fr);   // frame
  g.fillStyle(0x5a4a24, a); g.fillRect(x - hw - fr, y - H - fr, W + fr * 2, 1);
  g.fillStyle(0x050403, a); g.fillRect(x - hw, y - H, W, H);                 // the dark beyond
  g.fillStyle(0x1a1608, a); g.fillRect(x - hw, y - 3, W, 3);                 // a sliver of floor through the gap
  const w = Math.max(0, Math.round(W * (1 - open)));
  if (w > 0) {                                                                // the door, swinging open on its left hinge
    const L = x - hw, top = y - H;
    g.fillStyle(flash ? 0xffffff : 0xe2d6a0, a); g.fillRect(L, top, w, H);
    g.fillStyle(0xbfb07a, a); g.fillRect(L + w - 1, top, 1, H);
    if (w > 12) {                                                             // two recessed panels
      g.fillStyle(0xbfb07a, a); g.fillRect(L + 4, top + 5, w - 8, 22); g.fillRect(L + 4, top + 32, w - 8, 26);
      g.fillStyle(0xe2d6a0, a); g.fillRect(L + 5, top + 6, w - 10, 20); g.fillRect(L + 5, top + 33, w - 10, 24);
    }
    if (w > W - 6) { g.fillStyle(0x8a7a4a, a); g.fillRect(L + w - 6, y - 32, 3, 3); g.fillStyle(0xf0e6b8, a); g.fillRect(L + w - 6, y - 32, 1, 1); }   // knob, at hand height
    g.fillStyle(0x3a2e14, a * 0.6); g.fillRect(L + 1, top + 8, 1, 3); g.fillRect(L + 1, y - 14, 1, 3);   // hinges
  }
}
function drawStyledDoor(g, x, y, open, a, flash, style, W, H, hw, fr) {
  const L = x - hw, top = y - H, w = Math.max(0, Math.round(W * (1 - open)));
  if (style === 'wowAero') {
    g.fillStyle(0x0d3550, a); g.fillRect(L - fr - 1, top - fr - 1, W + fr * 2 + 2, H + fr + 1);
    g.fillStyle(0xf4fbff, a); g.fillRect(L - fr, top - fr, W + fr * 2, H + fr);              // glossy white frame
    for (let i = 0; i < 6; i++) { g.fillStyle([0x3fc8ea, 0x5ad2ee, 0x7adcf2, 0x9ae6f6, 0xb8eef8, 0xd6f6fb][i], a); g.fillRect(L, top + i * H / 6, W, H / 6 + 1); }   // the sky beyond
    g.fillStyle(0xffffff, 0.9 * a); g.fillEllipse(x - 4, top + 14, 14, 5); g.fillEllipse(x + 6, top + 26, 10, 4);   // clouds
    g.fillStyle(0x8be04a, a); g.fillEllipse(x, y + 2, W + 8, 14);                            // a green hill
    if (w > 0) {                                                                             // the glass door, swinging open
      g.fillStyle(flash ? 0xffffff : 0x9ff0ff, 0.45 * a); g.fillRect(L, top, w, H);
      g.lineStyle(1, 0xffffff, a); g.strokeRect(L + 0.5, top + 0.5, w - 1, H - 1);
      g.fillStyle(0xffffff, 0.8 * a); for (let i = 0; i < 3; i++) g.fillRect(L + 3 + i * 2, top + 4 + i * 6, 2, Math.min(18, H / 3));   // shine
      if (w > W - 6) { g.fillStyle(0x3fc8ea, a); g.fillRect(L + w - 5, y - 32, 2, 6); }
    }
    return;
  }
  if (style === 'wowDial') {                                       // DIAL-UP: a window standing on the floor - the dark inside it
    drawMiniWindow(g, L - fr - 2, top - fr - 10, W + fr * 2 + 4, H + fr + 10, a);
    g.fillStyle(0xffffff, a); for (let i = 0; i < 3; i++) g.fillRect(L + 1 + i * 4, top - 8, 2, 1);   // the title, too small to read
    g.fillStyle(0x000000, a); g.fillRect(L, top, W, H);                                       // the dark beyond
    g.fillStyle(0x2a5ad8, 0.4 * a); for (let yy = top + 2; yy < y; yy += 3) g.fillRect(L, yy, W, 1);   // CRT scanlines
    if (w > 0) {                                                                              // a teal desktop "door", folding away
      g.fillStyle(flash ? 0xffffff : 0x108484, a); g.fillRect(L, top, w, H);
      if (w > 14) {                                                                           // a folder icon on it
        g.fillStyle(0xffd23a, a); g.fillRect(L + w / 2 - 6, top + 22, 12, 9); g.fillRect(L + w / 2 - 6, top + 20, 5, 2);
        g.fillStyle(0xb8901a, a); g.fillRect(L + w / 2 - 6, top + 30, 12, 1);
        g.fillStyle(0xffffff, a); g.fillRect(L + w / 2 - 5, top + 34, 10, 2);
      }
    }
    return;
  }
  if (style === 'wowHack') {
    g.fillStyle(0x000000, 0.9 * a); g.fillRect(L, top, W, H);
    const fl = flash ? 0xffffff : 0x3ae060;
    g.lineStyle(1, fl, a); g.strokeRect(L - 0.5, top - 0.5, W + 1, H + 1); g.strokeRect(L - 3.5, top - 3.5, W + 7, H + 4);
    g.fillStyle(0x3ae060, 0.5 * a); for (let i = 1; i < 8; i++) g.fillRect(x - Math.round(hw * (1 - i / 8)), top + H - i * 8, Math.round(W * (1 - i / 8)), 1);   // a tunnel of wireframe
    g.fillStyle(0x3ae060, a); g.fillRect(L, top - 8, W, 4); g.fillStyle(0x020a04, a); g.fillRect(L + 2, top - 7, 3, 2); g.fillRect(L + 7, top - 7, 9, 2);   // "> door"
    if (w > 0) { g.fillStyle(0x0e3a1a, 0.85 * a); g.fillRect(L, top, w, H); g.fillStyle(0x3ae060, a); for (let yy = top + 4; yy < y - 2; yy += 6) g.fillRect(L + 2, yy, Math.max(0, w - 4 - ((yy * 7) % 9)), 1); }   // scrolling code
    return;
  }
  // RONIN: a shoji screen in a dark wood frame; it slides open sideways
  g.fillStyle(0x1a0606, a); g.fillRect(L - fr - 1, top - fr - 4, W + fr * 2 + 2, H + fr + 4);
  g.fillStyle(0x3a2a1a, a); g.fillRect(L - fr, top - fr - 3, W + fr * 2, H + fr + 3);
  g.fillStyle(0x1a0606, a); g.fillRect(L, top, W, H);                                        // the dark room beyond
  g.fillStyle(0xff8a5a, 0.25 * a); g.fillCircle(x, top + 20, 8);                            // a lantern glowing far inside
  if (w > 0) {
    const sx = L + (W - w);                                                                  // slides to the right
    g.fillStyle(flash ? 0xffffff : 0xf0e4c8, a); g.fillRect(sx, top, w, H);
    g.fillStyle(0x3a2a1a, a); for (let yy = top + 10; yy < y; yy += 12) g.fillRect(sx, yy, w, 1);
    for (let xx = sx + 7; xx < sx + w; xx += 8) g.fillRect(xx, top, 1, H);
    g.fillRect(sx, top, 2, H);
  }
}
export class WrongDoor {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.life = spec.life; this.alive = true; this.id = nextId++;
    this.hp = spec.hp; this.hitIds = new Set(); this.flash = 0; this.shake = 0;
    const floor = (x) => { let best = null; for (const p of match.stage.platforms) if (x >= p.x1 + 26 && x <= p.x2 - 26 && p.y >= owner.y - 2 && (!best || p.y < best.y)) best = p; return best; };
    let x = owner.x - owner.facing * spec.behind, p = floor(x);   // (26 px margin keeps the whole door on the floor)
    if (!p) { x = owner.x; p = floor(x); }                                  // no floor behind him: right where he stands
    if (!p) { this.alive = false; return; }                                 // nothing below at all
    this.x = x; this.y = p.y; this.platform = p;
    this.g = match.add.graphics(); match.addWorld(this.g);
    sfx('land', 0.6, 0.6); sfx('shield', 0.35, 0.5);
    match.puff(this.x, this.y - 4, 0xcbb662, 6);
  }
  box() { return { x1: this.x - DOOR.w / 2 - 3, x2: this.x + DOOR.w / 2 + 3, y1: this.y - DOOR.h - 3, y2: this.y }; }
  step() {
    this.t++;
    if (this.flash > 0) this.flash--; if (this.shake > 0) this.shake--;
    if (!this.owner.alive || this.t >= this.life) { this.match.puff(this.x, this.y - 32, 0xcbb662, 10); this.kill(); }
  }
  strike(hbs) {
    if (!this.alive) return;
    const b = this.box();
    for (const hb of hbs) {
      if (!hb.owner || hb.owner.team === this.owner.team || hb.grab || this.hitIds.has(hb.id)) continue;
      if (!(hb.x1 < b.x2 && hb.x2 > b.x1 && hb.y1 < b.y2 && hb.y2 > b.y1)) continue;
      this.hitIds.add(hb.id);
      this.hp -= hb.h.dmg || 5; this.flash = 6; this.shake = 8;
      sfx('land', 0.6, 0.8);
      if (hb.projectile && !hb.persist) hb.projectile.kill();
      if (this.hp <= 0) { this.destroy(); return; }
    }
  }
  destroy() {
    const R = Math.random;
    for (let i = 0; i < 14; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3; this.match.particles.push({ shape: 'shard', x: this.x, y: this.y - 32, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 26 + R() * 14, color: [0xe2d6a0, 0xcbb662, 0x3a2e14][i % 3], drag: 0.94, grav: 0.14, ang: a }); }
    sfx('bighit', 0.5, 1.3);
    this.match.popText({ x: this.x, y: this.y + 40 }, 'DOOR BROKEN!', '#e2d6a0');
    this.kill();
  }
  use() { this.kill(); }                                                    // he came out of it: it's gone
  kill() { if (!this.alive) return; this.alive = false; if (this.g) this.g.destroy(); if (this.owner.doorOut === this) this.owner.doorOut = null; }
  render() {
    if (!this.alive) return;
    const g = this.g, fade = Math.min(1, this.t / 6) * (this.life - this.t < 60 && (this.t >> 2) % 2 ? 0.5 : 1);
    g.clear();
    drawDoor(g, this.x + (this.shake ? (this.shake % 2 ? 1 : -1) : 0), this.y, 0, fade, this.flash > 0, this.owner.style);
    if (this.hp < this.spec.hp) {
      const by = this.y - DOOR.h - 22;
      g.fillStyle(0x0b0a14, 0.8); g.fillRect(this.x - 14, by, 28, 3);
      g.fillStyle(this.hp > this.spec.hp * 0.4 ? 0xe2d6a0 : 0xff5a5a, 1); g.fillRect(this.x - 13, by + 1, 26 * Math.max(0, this.hp) / this.spec.hp, 1);
    }
  }
}
