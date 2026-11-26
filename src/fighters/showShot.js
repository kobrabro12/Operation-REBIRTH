// A plain projectile the newer fighters build their own shots from (LUMEN's comets and stars, KAMI's cranes and
// shuriken): it moves, hits like any projectile (MatchScene.resolveHits reads
// hitbox()), and its owner says how it looks and anything special it does - `spec.draw(g, shot)` every frame,
// `spec.step(shot)` before it moves (return false to stop it), `spec.onKill(shot)` as it goes. Lives in
// match.projectiles.
let nextId = 1;

/** One shot: spec = { name, x, y, vx, vy, life, w, h, hit, gravity?, persist?, solid?, draw, step?, onKill? }. */
export class ShowShot {
  constructor(match, owner, spec) {
    this.match = match; this.owner = owner; this.spec = spec;
    this.x = spec.x; this.y = spec.y; this.vx = spec.vx || 0; this.vy = spec.vy || 0;
    this.life = spec.life || 60; this.t = 0; this.alive = true; this.id = 'shot' + (nextId++);
    this.dir = Math.sign(this.vx) || owner.facing || 1; this.kind = spec.name || 'SHOT';   // (kind: training's LAST HIT label)
    this.g = match.add.graphics();
    if (match.addWorld) match.addWorld(this.g);
  }
  /** Its hitbox (null while `spec.harmless` or once it has hit, unless it `persist`s). */
  hitbox() {
    if (this.spec.harmless || !this.spec.hit) return null;
    const w = this.spec.w || 12, h = this.spec.h || 12;
    return { x1: this.x - w / 2, x2: this.x + w / 2, y1: this.y - h / 2, y2: this.y + h / 2, h: this.spec.hit, owner: this.owner, id: this.hitId || this.id, facing: Math.sign(this.vx) || this.dir, projectile: this, persist: !!this.spec.persist };
  }
  /** Moves it on one frame. */
  step() {
    this.t++;
    if (this.spec.step && this.spec.step(this) === false) return;
    this.vy += this.spec.gravity || 0;
    this.x += this.vx; this.y += this.vy;
    if (this.spec.solid !== false) {                               // into the main stage: gone
      const P = this.match.stage.platforms[0];
      if (P && this.x > P.x1 && this.x < P.x2 && this.y > P.y + 2 && this.y < P.y + (P.bottom || 60)) this.kill();
    }
    if (Math.abs(this.x) > 900 || this.y > 600 || this.y < -700) this.kill();
    if (--this.life <= 0) this.kill();
  }
  /** Ends it. */
  kill() { if (!this.alive) return; this.alive = false; if (this.spec.onKill) this.spec.onKill(this); this.g.destroy(); }
  /** Draws it. */
  render() { if (!this.alive) return; this.g.clear(); if (this.spec.draw) this.spec.draw(this.g, this); }
}

/** Starts a shot for `owner` (pushed into match.projectiles). */
export function spawnShot(match, owner, spec) { const s = new ShowShot(match, owner, spec); match.projectiles.push(s); return s; }

/** The nearest live opponent of fighter f (or null). */
export function nearestFoe(f, from) {
  let best = null, bd = 1e9; const x = from ? from.x : f.x, y = from ? from.y : f.y;
  for (const o of f.match.fighters) {
    if (o === f || !o.alive || (o.team !== undefined && o.team === f.team) || o.state === 'respawn') continue;
    const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; }
  }
  return best;
}

/** Hits every opponent of f within r of (x, y) once (`id` keeps it to one hit each). */
export function burstHit(f, x, y, r, hit, id) {
  const M = f.match;
  for (const o of M.fighters) {
    if (o === f || !o.alive || (o.team !== undefined && o.team === f.team) || o.state === 'respawn' || o.isIntangible()) continue;
    const c = o.center ? o.center() : { x: o.x, y: o.y - 25 };
    if (Math.hypot(c.x - x, c.y - y) > r) continue;
    const key = id + ':' + o.slot; if (M.hits.has(key)) continue; M.hits.add(key);
    M.applyHit(o, { h: hit, owner: f, facing: Math.sign(o.x - x) || f.facing, id, pillar: true }, x);
  }
}

/** Fighter f's own screen-space layer behind the stage (drawn over the backdrop, under the platforms and fighters) -
 *  for a Limit that darkens the sky. Made on first use; clear it yourself each frame. */
export function skyLayer(f) {
  const M = f.match;
  if (!f.showSky || !f.showSky.scene) { f.showSky = M.add.graphics().setScrollFactor(0).setDepth(49); M.addBg(f.showSky); }
  return f.showSky;
}

/** A pixel 4-point star at (x, y): arms r long, colours out (rim) / mid / core. */
export function pixStar(g, x, y, r, out, mid, core, a = 1) {
  x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
  g.fillStyle(out, a); g.fillRect(x - r - 1, y - 1, 2 * r + 3, 3); g.fillRect(x - 1, y - r - 1, 3, 2 * r + 3);
  g.fillStyle(mid, a); g.fillRect(x - r, y, 2 * r + 1, 1); g.fillRect(x, y - r, 1, 2 * r + 1); g.fillRect(x - 1, y - 1, 3, 3);
  g.fillStyle(core, a); g.fillRect(x, y, 1, 1);
}

/** The distance from point (px, py) to the segment (ax, ay)-(bx, by). */
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(px - ax - u * dx, py - ay - u * dy);
}

/** Every live opponent of fighter f. */
export function foesOf(f) {
  return f.match.fighters.filter((o) => o !== f && o.alive && !(o.team !== undefined && o.team === f.team) && o.state !== 'respawn');
}
