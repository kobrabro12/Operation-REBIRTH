// Things fighters create: fireballs and summoned souls.
import { sfx } from '../audio/sfx.js';
import { skinInfo } from './skins.js';

let nextId = 100000;

// Soul Summoner's summoned soul: the designer's burning skull flame, animated by
// tools/sprites/soul_minion.py into a 12-frame wildly flickering loop (60x68 frames). Drawn a bit smaller than a fighter.
const SOUL_SCALE = 0.7;
const SOUL_ORIGIN = { x: 23 / 60, y: 45 / 68 };   // the skull's centre sits on the soul's position

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
      h: { dmg: this.dmg, angle: 32, base: 2.2 + 3.2 * this.k, growth: 2.0 + 5.0 * this.k },
      owner: this.owner, id: this.id, facing: this.dir, projectile: this,
    };
  }
  step() {
    this.t++;
    this.x += this.vx;
    this.y += Math.sin(this.t * 0.25) * 0.4;
    if (this.t % 3 === 0) this.match.puff(this.x - this.dir * this.r, this.y, this.t % 6 ? 0x78a0c6 : 0x076cc2, 1);
    // fizzles against the island's sides
    const P = this.match.stage.platforms[0];
    if (this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.bottom) this.kill();
    if (--this.life <= 0) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, 0x78a0c6, 8); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, r = this.r, x = Math.round(this.x), y = Math.round(this.y);
    const pulse = this.t % 4 < 2 ? 1 : 0;
    g.clear();
    g.fillStyle(0x076cc2, 1); g.fillRect(x - r - pulse, y - r + 1, r * 2 + pulse * 2, r * 2 - 2); g.fillRect(x - r + 1, y - r - pulse, r * 2 - 2, r * 2 + pulse * 2);
    g.fillStyle(0x78a0c6, 1); g.fillRect(x - r * 0.65, y - r * 0.65, r * 1.3, r * 1.3);
    g.fillStyle(0xf0f2f3, 1); g.fillRect(x - r * 0.3 + this.dir * 2, y - r * 0.3, r * 0.6, r * 0.6);
    // trailing tail
    g.fillStyle(0x076cc2, 0.8); g.fillRect(x - this.dir * (r + 6), y - r * 0.4, 6 * this.dir > 0 ? 6 : 6, r * 0.8);
  }
}

// An energy bolt fired from a staff gem (Mr Wake's Wake Bolt and Drifting Soul).
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
    if (this.t % 3 === 0) this.match.puff(this.x - this.dir * this.spec.w / 2, this.y, this.t % 6 ? 0x9b5de5 : 0x560c83, 1);
    const P = this.match.stage.platforms[0];
    if (this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.bottom) this.kill();
    if (--this.life <= 0) this.kill();
  }
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, 0x9b5de5, 8); this.g.destroy(); }
  render() {
    if (!this.alive) return;
    const g = this.g, w = this.spec.w, h = this.spec.h, x = Math.round(this.x), y = Math.round(this.y);
    const p = this.t % 4 < 2 ? 1 : 0;
    g.clear();
    g.fillStyle(0x1a0a2e, 1); g.fillRect(x - w / 2 - 1, y - h / 2 - 1 + p, w + 2, h + 2 - p * 2);
    g.fillStyle(0x6d26bd, 1); g.fillRect(x - w / 2, y - h / 2 + p, w, h - p * 2);
    g.fillStyle(0x9b5de5, 1); g.fillRect(x - w / 3, y - h / 3, (w * 2) / 3, (h * 2) / 3);
    g.fillStyle(0xdab8fe, 1); g.fillRect(x - w / 8 + this.dir * w / 6, y - h / 6, w / 4, h / 3);
    g.fillStyle(0x6d26bd, 0.7); g.fillRect(this.dir > 0 ? x - w / 2 - 8 : x + w / 2, y - h / 4, 8, h / 2);   // trail
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
        if (f.slow <= 0) this.match.puff(f.x, f.y - 4, 0x2a1040, 4);
        f.slow = Math.max(f.slow, this.spec.slow);
      }
    }
    if (this.t % 7 === 0) this.match.puff(this.x1 + Math.random() * (this.x2 - this.x1), this.y - 2, this.t % 14 ? 0x6d26bd : 0x2a1040, 1);
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
    g.fillStyle(0x0c0521, 0.95 * fade); g.fillRect(cx - half, this.y - 4, half * 2, 6);
    g.fillStyle(0x0c0521, 0.95 * fade); g.fillRect(cx - half + 5 + wob, this.y - 7, half * 2 - 10, 3);
    g.fillStyle(0x0c0521, 0.95 * fade); g.fillRect(cx - half + 14 - wob, this.y - 9, half * 2 - 28, 2);
    g.fillStyle(0x2a1040, fade); g.fillRect(cx - half + 4, this.y - 5, half * 2 - 8, 4);
    // purple sheen and bubbles
    g.fillStyle(0x6d26bd, 0.9 * fade); g.fillRect(cx - half * 0.6 - wob, this.y - 6, half * 0.5, 1);
    g.fillStyle(0x6d26bd, 0.9 * fade); g.fillRect(cx + half * 0.2 + wob, this.y - 4, half * 0.4, 1);
    for (let k = 0; k < 4; k++) {
      const bx = cx - half + ((k * 37 + this.t * 2) % Math.max(1, half * 2));
      const by = this.y - 9 - ((this.t + k * 11) % 16) / 2;
      g.fillStyle(0x9b5de5, fade); g.fillRect(bx, by, 2, 2);
    }
  }
}

// A soul raised from the grave by Soul Summoner. Floats toward the nearest opponent and bites.
export class Soul {
  constructor(match, owner) {
    this.match = match; this.owner = owner; this.team = owner.team;
    this.x = owner.x + owner.facing * 30; this.y = owner.y; this.rise = 24;
    this.vx = 0; this.vy = 0; this.hp = 18; this.life = 900; this.cool = 30;
    this.alive = true; this.t = 0; this.id = nextId++; this.attackId = nextId++; this.flash = 0;
    const minionKey = skinInfo(owner.def.id, owner.skin).minion;   // some costumes raise their own kind of soul
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
      h: { dmg: 4, angle: 50, base: 2.6, growth: 2.2 },
      owner: this.owner, id: this.attackId, facing: Math.sign(this.vx) || 1, soul: this,
    };
  }
  onBite() { this.cool = 55; this.attackId = nextId++; this.vx *= -1.5; this.vy = -1.5; sfx('soulhit', 0.4); }
  damage(dmg, dirX) {
    this.hp -= dmg; this.flash = 6; this.vx = dirX * 3; this.vy = -2;
    if (this.hp <= 0) this.kill(true);
  }
  kill(popped) {
    if (!this.alive) return;
    this.alive = false;
    this.match.puff(this.x, this.y, popped ? 0xf0f2f3 : 0x78a0c6, popped ? 12 : 6);
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
