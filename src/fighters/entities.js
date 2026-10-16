// Things fighters create: fireballs and summoned souls.
import { sfx } from '../audio/sfx.js';

let nextId = 100000;

// Pixel maps for the summoned soul (two frames so its tail flickers). Letters map to palette colours.
const SOUL_MAP = [
  [
    '.....oooooo.....',
    '...oowwwwwwoo...',
    '..owwlllllllwo..',
    '.owlllllllllldo.',
    '.owllpplllppldo.',
    'owlllpplllppllo.',
    'owllllllllllldo.',
    'owllllooolllldo.',
    'owlllllllllllddo',
    '.olllllllllldddo',
    '.oddlllllllddddo',
    '..odddllllddddo.',
    '..oddddddddddo..',
    '...oddo.oddo....',
    '....oo...odo....',
    '..........o.....',
  ],
  [
    '.....oooooo.....',
    '...oowwwwwwoo...',
    '..owwlllllllwo..',
    '.owlllllllllldo.',
    '.owllpplllppldo.',
    'owlllpplllppllo.',
    'owllllllllllldo.',
    'owllllooolllldo.',
    'owlllllllllllddo',
    '.olllllllllldddo',
    '.oddlllllllddddo',
    '..odddllllddddo.',
    '..oddddddddddo..',
    '....oddo.oddo...',
    '....odo...oo....',
    '.....o..........',
  ],
];
const SOUL_COLORS = { o: 0x0b1a33, w: 0xf0f2f3, l: 0x78a0c6, d: 0x076cc2, p: 0xf50f96 };

export function makeSoulTextures(scene) {
  if (scene.textures.exists('soul0')) return;
  SOUL_MAP.forEach((rows, f) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (SOUL_COLORS[ch] !== undefined) { g.fillStyle(SOUL_COLORS[ch], 1); g.fillRect(x, y, 1, 1); }
    }));
    g.generateTexture('soul' + f, 16, 16);
    g.destroy();
  });
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

// A soul raised from the grave by Soul Summoner. Floats toward the nearest opponent and bites.
export class Soul {
  constructor(match, owner) {
    this.match = match; this.owner = owner; this.team = owner.team;
    this.x = owner.x + owner.facing * 30; this.y = owner.y; this.rise = 24;
    this.vx = 0; this.vy = 0; this.hp = 18; this.life = 900; this.cool = 30;
    this.alive = true; this.t = 0; this.id = nextId++; this.attackId = nextId++; this.flash = 0;
    this.sprite = match.add.sprite(this.x, this.y, 'soul0').setScale(1.5);
    this.sprite.setTint(owner.slot === 0 ? 0xffffff : 0xddeeff);
    match.addWorld(this.sprite);
    match.puff(this.x, this.y, 0x6b5b73, 10);
  }
  hurtbox() { return { x1: this.x - 10, x2: this.x + 10, y1: this.y - 12, y2: this.y + 10 }; }
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
      x1: this.x - 9, x2: this.x + 9, y1: this.y - 10, y2: this.y + 9,
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
    s.setTexture('soul' + (Math.floor(this.t / 8) % 2));
    s.setFlipX(this.vx < 0);
    s.setAlpha(this.life < 120 && this.life % 10 < 5 ? 0.4 : this.rise > 0 ? 0.6 : 0.95);
    if (this.flash > 0) s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else s.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
  }
}
