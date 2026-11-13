// What THE GREAT PRESTO and CHEF ROUX (test fighters) throw and pour: playing cards, a spinning cleaver, a puddle
// of hot oil. Each is a projectile in match.projectiles (hitbox / step / render / kill, like entities.js);
// the fighters' code is in fighterShow.js, their tuning in presto.js / chef.js.
import { sfx } from '../audio/sfx.js';

let nextId = 1;
// card suits and their colours
const SUITS = [['spade', 0x14101c], ['heart', 0xe02a3a], ['diamond', 0xe02a3a], ['club', 0x14101c]];

/** Draws a little card-suit pip (spade / heart / diamond / club) of size s at x, y. */
export function drawSuit(g, kind, x, y, s, col) {
  g.fillStyle(col, 1);
  if (kind === 'heart') { g.fillCircle(x - s * 0.45, y - s * 0.2, s * 0.5); g.fillCircle(x + s * 0.45, y - s * 0.2, s * 0.5); g.fillTriangle(x - s * 0.95, y, x + s * 0.95, y, x, y + s); }
  else if (kind === 'diamond') g.fillPoints([{ x, y: y - s }, { x: x + s * 0.7, y }, { x, y: y + s }, { x: x - s * 0.7, y }], true);
  else if (kind === 'club') { g.fillCircle(x, y - s * 0.5, s * 0.45); g.fillCircle(x - s * 0.5, y + s * 0.1, s * 0.45); g.fillCircle(x + s * 0.5, y + s * 0.1, s * 0.45); g.fillRect(x - s * 0.12, y, s * 0.24, s * 0.9); }
  else { g.fillCircle(x - s * 0.45, y + s * 0.2, s * 0.5); g.fillCircle(x + s * 0.45, y + s * 0.2, s * 0.5); g.fillTriangle(x - s * 0.95, y, x + s * 0.95, y, x, y - s); g.fillRect(x - s * 0.12, y + s * 0.2, s * 0.24, s * 0.9); }
}
/** Draws one playing card (w x h) turned by angle a, face up with a suit pip - or its patterned back. */
export function drawCard(g, x, y, w, h, a, suit, back, trim = 0xb070f0) {
  const c = Math.cos(a), s = Math.sin(a), q = (px, py) => ({ x: x + px * c - py * s, y: y + px * s + py * c });
  g.fillStyle(0x14101c, 1); g.fillPoints([q(-w / 2 - 1, -h / 2 - 1), q(w / 2 + 1, -h / 2 - 1), q(w / 2 + 1, h / 2 + 1), q(-w / 2 - 1, h / 2 + 1)], true);
  g.fillStyle(back ? trim : 0xfafaf4, 1); g.fillPoints([q(-w / 2, -h / 2), q(w / 2, -h / 2), q(w / 2, h / 2), q(-w / 2, h / 2)], true);
  if (back) { g.fillStyle(0xffffff, 0.5); g.fillPoints([q(0, -h / 3), q(w / 3, 0), q(0, h / 3), q(-w / 3, 0)], true); return; }
  const S = SUITS.find((v) => v[0] === suit) || SUITS[0];
  drawSuit(g, S[0], x, y, Math.min(w, h) * 0.3, S[1]);
}

// CARD TRICK: a playing card flung off Presto's wand, spinning, a faint violet trail. A hit sticks a card on them
// (fighterShow.js: cardMark). Shields stop it.
/** CARD TRICK's card (see above). */
export class PlayingCard {
  constructor(match, owner, spec, ang) {
    this.match = match; this.owner = owner; this.spec = spec; this.dir = owner.facing;
    this.x = owner.x + owner.facing * owner.def.handOffset.x; this.y = owner.y + owner.def.handOffset.y;
    this.vx = Math.cos(ang) * spec.speed * this.dir; this.vy = Math.sin(ang) * spec.speed;
    this.life = spec.life; this.t = 0; this.alive = true; this.id = 'card' + nextId++; this.card = true;
    this.suit = SUITS[Math.floor(Math.random() * 4)][0];
    this.g = match.add.graphics(); match.addWorld(this.g);
  }
  hitbox() { return { x1: this.x - 7, x2: this.x + 7, y1: this.y - 7, y2: this.y + 7, h: this.spec.hit, owner: this.owner, id: this.id, facing: this.dir, projectile: this }; }
  /** Flies straight, slowing a little; gone when its time is up or it hits the floor. */
  step() {
    this.t++; this.x += this.vx; this.y += this.vy; this.vx *= 0.995;
    if (this.t % 3 === 0) this.match.particles.push({ x: this.x, y: this.y, vx: 0, vy: 0, life: 10, color: this.owner.pal.light, size: 2, grav: 0 });
    const P = this.match.stage.platforms[0];
    if ((this.x > P.x1 && this.x < P.x2 && this.y > P.y && this.y < P.bottom) || --this.life <= 0) this.kill();
  }
  /** Gone in a puff of violet sparks. */
  kill() { if (!this.alive) return; this.alive = false; this.match.puff(this.x, this.y, this.owner.pal.light, 5); this.g.destroy(); }
  /** The card, flipping as it spins (face, edge, back). */
  render() {
    if (!this.alive) return;
    const g = this.g; g.clear();
    const flip = Math.cos(this.t * 0.6), w = 10 * Math.max(0.15, Math.abs(flip));
    drawCard(g, this.x, this.y, w, 14, this.t * 0.25 * this.dir, this.suit, flip < 0, this.owner.pal.mid);
  }
}

// CLEAVER TOSS: Roux's cleaver, spinning out in a flat arc and boomeranging back to his hand (it keeps hitting -
// once going out, once coming back). While it's out his hand is empty (fighterShow.js: cleaverOut).
/** CLEAVER TOSS's cleaver (see above). */
export class Cleaver {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.dir = owner.facing;
    this.x = owner.x + owner.facing * 18; this.y = owner.y - 44;
    this.vx = this.dir * spec.speed; this.vy = -1.2; this.t = 0; this.alive = true; this.back = false; this.persist = true;
    this.id = 'cleaver' + nextId++; this.g = match.add.graphics(); match.addWorld(this.g); sfx('swing', 0.6, 0.8);
  }
  hitbox() { return { x1: this.x - 12, x2: this.x + 12, y1: this.y - 12, y2: this.y + 12, h: this.back ? this.spec.back : this.spec.out, owner: this.owner, id: this.id + (this.back ? 'b' : ''), facing: Math.sign(this.vx) || this.dir, projectile: this, persist: true }; }
  /** Out (slowing), then back toward his hand; caught when it reaches him. */
  step() {
    this.t++;
    const o = this.owner;
    if (!this.back) { this.vx -= this.dir * this.spec.decel; this.vy += 0.06; if (this.t >= this.spec.outTime || Math.sign(this.vx) !== this.dir) this.back = true; }
    else { const tx = o.x + o.facing * 14, ty = o.y - 40, d = Math.hypot(tx - this.x, ty - this.y) || 1, sp = Math.min(this.spec.returnSpeed + this.t * 0.05, 9); this.vx = (tx - this.x) / d * sp; this.vy = (ty - this.y) / d * sp; if (d < 16 || !o.alive || this.t > 160) { this.kill(true); return; } }
    this.x += this.vx; this.y += this.vy;
    if (this.t % 4 === 0) sfx('swing', 0.25, 1.6);
  }
  /** Caught (or lost): his hand has it again. */
  kill(caught) { if (!this.alive) return; this.alive = false; this.owner.cleaverOut = null; if (caught) sfx('clang', 0.5, 1.6); this.g.destroy(); }
  /** A heavy steel cleaver with a wooden handle, whirling, with a gleam on its edge. */
  render() {
    if (!this.alive) return;
    const g = this.g, a = this.t * 0.5 * this.dir, c = Math.cos(a), s = Math.sin(a), q = (px, py) => ({ x: this.x + px * c - py * s, y: this.y + px * s + py * c });
    const P = this.owner.style === 'chefGrill' ? [0xffa060, 0xe06020] : [0xe0e6ee, 0x748094];
    g.clear();
    if (this.owner.style === 'chefPastry') {                                  // PATISSIER: a whisk instead
      g.lineStyle(2, 0x7a4a24, 1); g.lineBetween(q(-12, 0).x, q(-12, 0).y, q(0, 0).x, q(0, 0).y);
      g.lineStyle(1.5, 0xd8dce8, 1); for (const r of [4, 6, 8]) g.strokeEllipse(q(8, 0).x, q(8, 0).y, 16, r * 2); g.lineStyle(0); return;
    }
    g.fillStyle(0x14101c, 1); g.fillPoints([q(-1, -8), q(15, -9), q(15, 7), q(-1, 6)], true);
    g.fillStyle(P[1], 1); g.fillPoints([q(0, -7), q(14, -8), q(14, 6), q(0, 5)], true);
    g.fillStyle(P[0], 1); g.fillPoints([q(1, -6), q(13, -7), q(13, -2), q(1, -1)], true);
    g.fillStyle(0xffffff, 1); g.fillPoints([q(13, -7), q(15, -8), q(15, 6), q(13, 5)], true);
    g.fillStyle(0x7a4a24, 1); g.fillPoints([q(-12, -2), q(0, -2), q(0, 2), q(-12, 2)], true);
    g.fillStyle(P[0], 0.3); g.fillCircle(this.x, this.y, 16);
  }
}

// HOT OIL: oil poured from Roux's pan onto the floor in front of him: it sizzles there for a while - slowing
// whoever stands in it and burning them every so often. One puddle per chef.
/** HOT OIL's puddle (see above). */
export class HotOil {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec; this.t = 0; this.alive = true; this.id = 'oil' + nextId++; this.persist = true;
    const x = owner.x + owner.facing * spec.ahead;
    let best = null;
    for (const p of match.stage.platforms) if (x >= p.x1 && x <= p.x2 && p.y >= owner.y - 4 && (!best || p.y < best.y)) best = p;
    if (!best) { this.alive = false; return; }
    this.y = best.y; this.x1 = Math.max(best.x1, x - spec.width / 2); this.x2 = Math.min(best.x2, x + spec.width / 2);
    for (const p of match.projectiles) if (p !== this && p.owner === owner && p instanceof HotOil) p.kill();
    this.g = match.add.graphics(); match.addWorld(this.g); sfx('geyser', 0.5, 1.6); sfx('flame', 0.4, 1.4);
  }
  /** Every `every` frames a burn (a fresh id, so it can hit again); never in between. */
  hitbox() {
    if (!this.alive || this.t % this.spec.every > 2) return null;
    return { x1: this.x1, x2: this.x2, y1: this.y - 10, y2: this.y + 2, h: this.spec.burn, owner: this.owner, id: this.id + ':' + Math.floor(this.t / this.spec.every), facing: this.owner.facing, projectile: this, persist: true };
  }
  /** Slows whoever stands in it; spits and steams; dries up when its time is up. */
  step() {
    this.t++;
    for (const f of this.match.fighters) if (f.alive && f.team !== this.owner.team && f.x >= this.x1 && f.x <= this.x2 && Math.abs(f.y - this.y) < 6) f.slow = Math.max(f.slow || 0, this.spec.slow);
    if (this.t % 4 === 0) this.match.particles.push({ x: this.x1 + Math.random() * (this.x2 - this.x1), y: this.y - 3, vx: (Math.random() - 0.5), vy: -1.5 - Math.random() * 2, life: 14, color: Math.random() < 0.5 ? 0xffd060 : 0xffffff, size: 1, grav: 0.15 });
    if (this.t % 30 === 0) sfx('flame', 0.15, 2);
    if (this.t >= this.spec.life) this.kill();
  }
  /** Dried up. */
  kill() { if (!this.alive) return; this.alive = false; if (this.g) this.g.destroy(); }
  /** A golden puddle, shimmering, little bubbles popping; a heat haze over it. */
  render() {
    if (!this.alive) return;
    const g = this.g, grow = Math.min(1, this.t / 12), fade = Math.min(1, (this.spec.life - this.t) / 30), cx = (this.x1 + this.x2) / 2, half = (this.x2 - this.x1) / 2 * grow;
    g.clear();
    g.fillStyle(0x8a5a10, 0.9 * fade); g.fillEllipse(cx, this.y - 1, half * 2 + 6, 7);
    g.fillStyle(0xe8a020, 0.95 * fade); g.fillEllipse(cx, this.y - 2, half * 2, 5);
    g.fillStyle(0xfff0a0, 0.8 * fade); g.fillEllipse(cx - half * 0.3 + Math.sin(this.t * 0.1) * 4, this.y - 3, half * 0.6, 1.5);
    for (let k = 0; k < 5; k++) { const bx = cx - half + ((k * 41 + this.t) % Math.max(1, half * 2)), r = 1 + ((this.t + k * 7) % 12) / 6; g.lineStyle(1, 0xfff0a0, fade); g.strokeCircle(bx, this.y - 3, r); g.lineStyle(0); }
    g.fillStyle(0xffd080, 0.06 * fade); g.fillRect(cx - half, this.y - 30, half * 2, 28);
  }
}
