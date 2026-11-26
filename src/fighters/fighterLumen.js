// Fighter methods: LUMEN (def lumen.js) - CONSTELLATIONS. Stars she plants (ShowShots that sting on touch), comets
// that relay through them, CONSTELLATE's beams, STARBLINK (the Sprite Fusion blink, src/fx/sfMovement.js) and her
// Limit THE STARFALL. Reached through the `def.show` hooks (fighterShow.js): lumenSpecial / lumenStep / lumenTick /
// lumenLanded / drawLumen / drawLumenHud / starfallLimit. Mixed into the Fighter class (Fighter.js) - `this` is she.
import { sfx } from '../audio/sfx.js';
import { spawnShot, nearestFoe, burstHit, skyLayer, pixStar, segDist, foesOf } from './showShot.js';
import movement, { SF_PALETTES, hex } from '../fx/sfMovement.js';
import { sfSpawn, sfActor } from '../fx/sfRunner.js';

let lmIds = 1;

/** LUMEN's own methods (attached to Fighter.prototype). */
export class FighterLumen {
  /** Her live stars, oldest first. */
  lumStarList() { this.lumStars = (this.lumStars || []).filter((s) => s.alive); return this.lumStars; }

  /** Her specials: all four are her own moves (`show: true`); up = STARBLINK, aimed now with the stick. */
  lumenSpecial(c) {
    if (c.up) {
      if (this.usedUpB) return false;
      this.usedUpB = true; this.startAttack('upb'); this.aimBlink(c); return true;
    }
    if (c.down) { this.startAttack('downB'); return true; }
    if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); this.startAttack('sideB'); return true; }
    this.startAttack('neutralB'); return true;
  }

  /** STARBLINK's aim: `range` px the way the stick points (straight up when it's let go), or one of her stars in
   *  roughly that direction (within `range + snap`) - the nearest to the aimed spot. Sets this.blink. */
  aimBlink(c) {
    const B = this.def.moves.upb.blink;
    let dx = c.x, dy = c.y; const L = Math.hypot(dx, dy);
    if (L < 0.3) { dx = 0; dy = -1; } else { dx /= L; dy /= L; }
    if (Math.abs(dx) > 0.2) this.facing = Math.sign(dx);
    const cx = this.x, cy = this.y - 26;
    let tx = cx + dx * B.range, ty = cy + dy * B.range, star = null, best = 1e9;
    for (const s of this.lumStarList()) {
      const vx = s.x - cx, vy = s.y - cy, d = Math.hypot(vx, vy);
      if (d < 12 || d > B.range + B.snap) continue;
      if ((vx * dx + vy * dy) / d < B.cone) continue;
      const miss = Math.hypot(s.x - tx, s.y - ty);
      if (miss < best) { best = miss; star = s; }
    }
    if (star) { tx = star.x; ty = star.y; }
    let fy = ty + 26;                                                  // (feet under the body's middle)
    for (const p of this.match.stage.platforms) if (p.solid && tx > p.x1 - 8 && tx < p.x2 + 8 && fy > p.y && fy < p.bottom + 50) fy = p.y;   // never inside the stage: on top of it
    this.blink = { fx: this.x, fy: this.y, tx, ty: fy, star };
    sfx('summon', 0.4, 1.8); sfx('glass', 0.25, 2.2);
    const x0 = Math.min(this.x, tx) - 70, x1 = Math.max(this.x, tx) + 70, y0 = Math.min(this.y, fy) - 110, y1 = Math.max(this.y, fy) + 40;
    sfSpawn(this.match, movement({ kind: 'blink', actor: sfActor(this), to: tx, toY: fy, out: B.out / 60, in: B.in / 60,
      colors: this.lumBlinkColors(), colors2: SF_PALETTES.ICE, seed: (this.age * 7 + this.slot) | 0 }), { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  /** The blink's colours, matched to her costume (her `pal`). */
  lumBlinkColors() {
    const P = this.pal, A = SF_PALETTES.ARCANE;
    return [hex(0xffffff), hex(P.core), hex(P.light), hex(P.mid), hex(P.deep), A[5], A[6], A[7]];
  }

  /** Every frame of her own moves (from st_attack). Returns true when it ended the move itself. */
  lumenStep(m) {
    const n = this.moveName, M = this.match, t = this.t;
    if (n === 'neutralB') {                                            // PLANT STAR
      if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
      if (t === m.plantAt) this.plantStar();
    } else if (n === 'sideB') {                                        // COMET
      if (!this.grounded) this.vy = Math.min(this.vy, 1.0);
      if (t === m.spawnAt) this.throwComet(m.comet);
    } else if (n === 'upb') {                                          // STARBLINK
      const B = m.blink, K = this.blink; if (!K) { this.setState('helpless'); return true; }
      if (t < B.out) { this.vx *= 0.6; this.vy = Math.min(this.vy, 0) * 0.5; return false; }
      this.invincible = Math.max(this.invincible, 2); this.vx = this.vy = this.lx = this.ly = 0; this.fastFalling = false;
      if (t === B.out) { sfx('laser', 0.35, 1.7); M.shake(2, 4); }
      if (t < B.in) { this.x = K.fx; this.y = K.fy; return false; }
      this.x = K.tx; this.y = K.ty;
      if (t === B.in) { this.grounded = false; this.platform = null; }
      if (t < B.arrive) return false;
      // arrived: a burst, then a star refreshes her, open air leaves her helpless
      burstHit(this, K.tx, K.ty - 26, m.r, B.burst, 'lmblink' + this.attackId);
      sfx('ding', 0.5, 1.5); sfx('glass', 0.3, 1.6); M.shake(3, 6);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; M.particles.push({ shape: 'star', x: K.tx, y: K.ty - 26, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 18, color: i % 2 ? this.pal.light : 0xffffff, grav: 0, drag: 0.9, size: 2 }); }
      const star = K.star && K.star.alive ? K.star : null; this.blink = null;
      if (star) { star.kill(); this.usedUpB = false; this.jumpsLeft = Math.max(this.jumpsLeft, 1); M.popText(this, 'STARBLINK!', '#' + this.pal.light.toString(16).padStart(6, '0')); }
      this.vy = -1;
      this.setState(this.grounded ? 'idle' : star ? 'air' : 'helpless'); return true;
    } else if (n === 'downB') {                                        // CONSTELLATE
      const L = m.link; if (!this.grounded) this.vy = Math.min(this.vy, 0.8);
      if (t === m.linkAt) {
        this.links = [this.staffTip(), ...this.lumStarList().map((s) => s)];
        sfx(this.links.length > 1 ? 'laser' : 'shing', 0.45, 1.3);
        if (this.links.length < 2) burstHit(this, this.x + this.facing * 10, this.y - 30, m.link.flareR, L.flare, 'lmflare' + this.attackId);
      }
      if (this.links && t > m.linkAt && t < m.burstAt && this.links.length > 1) {   // the beams hit what they cross
        const pts = this.links.map((p) => (p.alive === undefined ? p : { x: p.x, y: p.y }));
        for (const o of foesOf(this)) {
          if (o.isIntangible()) continue;
          const c = o.center(), key = 'lmlink' + this.attackId + ':' + o.slot; if (M.hits.has(key)) continue;
          for (let i = 1; i < pts.length; i++) if (segDist(c.x, c.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) < 8 + o.body.w / 2) {
            M.hits.add(key); M.applyHit(o, { h: L.beam, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'lmlink' + this.attackId, pillar: true }, c.x); break;
          }
        }
      }
      if (t === m.burstAt && this.links) {
        for (const s of this.links) if (s.alive) { burstHit(this, s.x, s.y, m.link.r, L.burst, 'lmburst' + this.attackId + s.id); this.starPop(s); s.kill(); }
        if (this.links.length > 1) { sfx('bighit', 0.45, 1.4); M.shake(4, 8); }
        this.links = null;
      }
    }
    return false;
  }

  /** The tip of her staff, where stars and comets come from. */
  staffTip() { return { x: this.x + this.facing * this.def.handOffset.x, y: this.y + this.def.handOffset.y }; }

  /** PLANT STAR: a new star ahead of her (the oldest fades if she already has `max`). */
  plantStar() {
    const S = this.def.show.stars, L = this.lumStarList(), M = this.match;
    while (L.length >= S.max) { const old = L.shift(); this.starPop(old); old.kill(); }
    const x = this.x + this.facing * S.ahead, y = this.y + S.up, me = this;
    const star = spawnShot(M, this, { name: 'STAR', x, y, life: S.life, w: 14, h: 14, hit: S.touch, persist: true, solid: false,
      step: (s) => { s.hitId = s.id + ':' + Math.floor(s.t / S.rehit); if (s.flash > 0) s.flash--; },
      draw: (g, s) => me.drawStar(g, s, S) });
    star.n = lmIds++; star.flash = 10; L.push(star);
    sfx('ding', 0.4, 1.8 + 0.15 * L.length);
    for (let i = 0; i < 6; i++) M.particles.push({ shape: 'star', x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 14, color: this.pal.light, grav: 0, drag: 0.9, size: 2 });
  }
  /** One of her stars, twinkling (fading out in its last two seconds). */
  drawStar(g, s, S) {
    const P = this.pal, left = S.life - s.t, a = left < 120 ? (Math.floor(left / 6) % 2 ? 0.35 : 1) : 1;
    const y = s.y + Math.sin(s.t * 0.06 + s.n) * 2, tw = (s.t >> 3) % 4 === 0 ? 1 : 0, r = 4 + tw + (s.flash > 0 ? 3 : 0);
    g.fillStyle(P.mid, 0.16 * a); g.fillCircle(s.x, y, 12 + tw * 2);
    g.fillStyle(P.light, 0.22 * a); g.fillCircle(s.x, y, 7);
    pixStar(g, s.x, y, r, P.deep, P.light, 0xffffff, a);
    if (tw) { g.fillStyle(0xffffff, a); g.fillRect(s.x + 3, y - 4, 1, 1); g.fillRect(s.x - 4, y + 3, 1, 1); }
  }
  /** A star bursting into sparkles. */
  starPop(s) {
    if (!s) return;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.match.particles.push({ shape: 'star', x: s.x, y: s.y, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, life: 16, color: i % 2 ? this.pal.light : 0xffffff, grav: 0, drag: 0.9, size: 2 }); }
  }

  /** COMET: off the staff, straight ahead; her stars relay it (see lumen.js). */
  throwComet(C) {
    const tip = this.staffTip(), me = this, M = this.match;
    const spec = { name: 'COMET', x: tip.x, y: tip.y, vx: this.facing * C.speed, vy: 0, life: C.life, w: 14, h: 12, hit: { ...C.hit }, solid: true,
      step: (s) => me.cometStep(s, C), draw: (g, s) => me.drawComet(g, s) };
    const s = spawnShot(M, this, spec); s.trail = []; s.visited = new Set(); s.relays = 0; s.speed = C.speed;
    sfx('flame', 0.25, 1.8); sfx('whoosh', 0.3, 1.6);
  }
  /** A comet's frame: its trail, and relaying through any of her stars it passes. */
  cometStep(s, C) {
    s.trail.unshift({ x: s.x, y: s.y }); if (s.trail.length > 10 + s.relays * 3) s.trail.pop();
    for (const st of this.lumStarList()) {
      if (s.visited.has(st.n) || Math.hypot(st.x - s.x, st.y - s.y) > 13) continue;
      s.visited.add(st.n); s.relays++; st.flash = 12;
      const R = C.relay; s.spec.hit = { ...s.spec.hit, dmg: s.spec.hit.dmg + R.dmg, growth: s.spec.hit.growth + R.growth };
      s.speed += R.speed; s.life += R.life; s.hitId = s.id + ':r' + s.relays; s.x = st.x; s.y = st.y;
      const next = this.lumStarList().find((o) => !s.visited.has(o.n)) || nearestFoe(this, s);
      if (next) { const c = next.center ? next.center() : next, d = Math.hypot(c.x - s.x, c.y - s.y) || 1; s.vx = ((c.x - s.x) / d) * s.speed; s.vy = ((c.y - s.y) / d) * s.speed; }
      else { const d = Math.hypot(s.vx, s.vy) || 1; s.vx = (s.vx / d) * s.speed; s.vy = (s.vy / d) * s.speed; }
      sfx('ding', 0.45, 1.6 + 0.2 * s.relays); this.match.shake(1 + s.relays, 4);
      this.match.popText({ x: st.x, y: st.y + 30 }, 'RELAY x' + s.relays, '#ffffff');
      break;
    }
  }
  /** A comet: a bright head, a tapering tail of her light (longer after every relay). */
  drawComet(g, s) {
    const P = this.pal, n = s.trail.length;
    for (let i = n - 1; i >= 0; i--) { const p = s.trail[i], k = 1 - i / n, r = 1 + k * (3 + s.relays); g.fillStyle(i < 2 ? 0xffffff : i < n / 2 ? P.light : P.mid, 0.25 + 0.6 * k); g.fillCircle(p.x, p.y, r); }
    g.fillStyle(P.mid, 0.25); g.fillCircle(s.x, s.y, 9 + s.relays * 2);
    pixStar(g, s.x, s.y, 3 + s.relays, P.deep, P.light, 0xffffff);
  }

  /** Every frame: her stars' list, a faint trail of starlight while she floats. */
  lumenTick() {
    if (this.state !== 'attack' || this.moveName !== 'upb') this.blink = null;
    if (this.state !== 'attack' || this.moveName !== 'downB') this.links = null;
    if (!this.match.demo && this.age % 7 === 0 && !this.grounded && this.state !== 'limit') this.match.particles.push({ shape: 'star', x: this.x + (Math.random() - 0.5) * 16, y: this.y - 4, vx: 0, vy: 0.3, life: 18, color: Math.random() < 0.5 ? this.pal.light : 0xffffff, grav: 0, size: 1 });
  }
  /** One of her hits landed: a little burst of stars on them. */
  lumenLanded(t) {
    const c = t.center();
    for (let i = 0; i < 4; i++) this.match.particles.push({ shape: 'star', x: c.x, y: c.y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, life: 16, color: i % 2 ? this.pal.light : 0xffffff, grav: 0.05, drag: 0.92, size: 2 });
  }

  /** What's drawn round her: her blink (the sprite gone while the effect carries her), the beams, the Limit. */
  drawLumen(g, spr) {
    const s = this.state, M = this.def.moves;
    if (s === 'attack' && this.moveName === 'upb' && this.blink) {
      const B = M.upb.blink, t = this.t;
      if (t >= B.out) spr.setAlpha(t < B.arrive - 5 ? 0 : (t - (B.arrive - 5)) / 5);
    }
    if (this.links && this.links.length > 1 && s === 'attack' && this.moveName === 'downB') {   // CONSTELLATE: beams reach star to star
      const m = M.downB, k = Math.min(1, (this.t - m.linkAt) / 6), P = this.pal, fade = this.t > m.burstAt - 6 ? (m.burstAt - this.t) / 6 : 1;
      const pts = this.links.map((p) => ({ x: p.x, y: p.y }));
      pts[0] = this.staffTip();
      const total = pts.length - 1, upto = k * total;
      for (let i = 1; i < pts.length; i++) {
        const u = Math.max(0, Math.min(1, upto - (i - 1))); if (u <= 0) break;
        const a = pts[i - 1], b = { x: a.x + (pts[i].x - a.x) * u, y: a.y + (pts[i].y - a.y) * u }, jit = (this.anim % 3) - 1;
        g.lineStyle(7, P.mid, 0.25 * fade); g.lineBetween(a.x, a.y, b.x, b.y + jit);
        g.lineStyle(3, P.light, 0.8 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(1, 0xffffff, fade); g.lineBetween(a.x, a.y, b.x, b.y);
        for (let q = 0; q < 3; q++) { const v = ((this.anim * 0.07 + q / 3) % 1) * u; pixStar(g, a.x + (pts[i].x - a.x) * v, a.y + (pts[i].y - a.y) * v, 2, P.deep, 0xffffff, 0xffffff, fade); }
      }
      g.lineStyle(0);
    }
    if (s === 'limit' && this.lumUlt) this.drawStarfall(g, this.def.limit, this.lumUlt);
    else if (this.showSky) this.showSky.clear();
  }

  /** On her player plate: a pip for each star she has out (dim = room for another). */
  drawLumenHud(g, x, y) {
    const S = this.def.show.stars, n = this.lumStarList().length, P = this.pal;
    for (let i = 0; i < S.max; i++) {
      const sx = x + 66 + i * 11, sy = y + 6;
      if (i < n) { g.fillStyle(P.mid, 0.35); g.fillCircle(sx, sy, 5); pixStar(g, sx, sy, 3, P.deep, P.light, 0xffffff); }
      else pixStar(g, sx, sy, 2, 0x07060e, 0x3a3450, 0x4a4466, 0.9);
    }
  }

  /** THE STARFALL (Limit, `type: 'starfall'`): the sky darkens, her heart-shard rises and splits, shards rain on
   *  every foe, then a pillar of light under each. Ends after `frames`. */
  starfallLimit(L) {
    const t = this.t, M = this.match;
    if (t === 1 || !this.lumUlt) this.lumUlt = { sx: this.x, sy: this.y - 40, pillars: [] };
    const U = this.lumUlt; this.invincible = Math.max(this.invincible, 2); this.vx = this.vy = 0;
    if (t < L.splitAt) { U.sx = this.x; U.sy = this.y - 40 - 170 * Math.pow(t / L.splitAt, 1.6); if (t % 4 === 0) sfx('clocktick', 0.2, 1.6 + t / 40); }
    if (t === L.splitAt) { sfx('glass', 0.8, 0.8); sfx('bighit', 0.6, 0.7); M.shake(8, 16); U.burst = 0; }
    if (U.burst !== undefined) U.burst++;
    if (t >= L.rainFrom && t <= L.rainTo && (t - L.rainFrom) % L.rainEvery === 0) {
      const me = this;
      for (const o of foesOf(this)) {
        const tx = o.x + (Math.random() - 0.5) * L.spread * 2, ty = o.y - 24, x0 = tx - 90 + Math.random() * 30, y0 = U.sy - 10;
        const d = Math.hypot(tx - x0, ty - y0) || 1, sp = 10;
        const s = spawnShot(M, this, { name: 'STAR SHARD', x: x0, y: y0, vx: ((tx - x0) / d) * sp, vy: ((ty - y0) / d) * sp, life: 60, w: 12, h: 14, hit: L.shard, solid: true,
          draw: (g, q) => { g.lineStyle(2, me.pal.light, 0.5); g.lineBetween(q.x, q.y, q.x - q.vx * 2.4, q.y - q.vy * 2.4); g.lineStyle(0); pixStar(g, q.x, q.y, 3, me.pal.deep, me.pal.light, 0xffffff); },
          onKill: (q) => { for (let i = 0; i < 4; i++) M.particles.push({ shape: 'star', x: q.x, y: q.y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 12, color: me.pal.light, grav: 0.1, size: 2 }); } });
        s.hitId = 'lmshard' + this.slot + ':' + t;
      }
      sfx('ding', 0.25, 2 + Math.random() * 0.4);
    }
    if (t === L.pillarAt - 14) U.pillars = foesOf(this).map((o) => ({ x: o.x, y: o.y }));
    if (t === L.pillarAt) {
      for (const p of U.pillars) M.limitHits.push({ t: 0, hb: { x1: p.x - 22, x2: p.x + 22, y1: p.y - 300, y2: p.y + 10, h: L.pillar, owner: this, facing: Math.sign(p.x - this.x) || this.facing, id: 'lmpillar' + this.slot + ':' + M.frame + ':' + p.x, pillar: true } });
      sfx('laser', 0.8, 0.7); sfx('bighit', 0.7, 0.8); M.shake(10, 18);
    }
    if (t >= L.frames) { this.lumUlt = null; if (this.showSky) this.showSky.clear(); this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  /** THE STARFALL's look: the night falling over the sky, the rising heart-shard and its breaking, the pillars. */
  drawStarfall(g, L, U) {
    const t = this.t, P = this.pal, sky = skyLayer(this);
    const dark = Math.min(1, t / 24) * (t > L.frames - 16 ? (L.frames - t) / 16 : 1);
    sky.clear(); sky.fillStyle(0x07041a, 0.78 * dark); sky.fillRect(0, 0, 640, 360);
    for (let i = 0; i < 70; i++) { const x = (i * 97) % 640, y = (i * 53) % 300, tw = (t + i * 5) % 40 < 34; if (tw) { sky.fillStyle(i % 5 ? 0xffffff : P.light, dark * (0.4 + (i % 3) * 0.2)); sky.fillRect(x, y, i % 7 ? 1 : 2, i % 7 ? 1 : 2); } }
    if (t < L.splitAt) {                                                // the heart-shard rising, ringed in light
      const r = 4 + t / 8;
      g.fillStyle(P.mid, 0.2); g.fillCircle(U.sx, U.sy, r * 3);
      g.fillStyle(P.light, 0.4); g.fillCircle(U.sx, U.sy, r * 1.8);
      g.fillStyle(0xffffff, 1); g.fillTriangle(U.sx, U.sy - r * 1.4, U.sx - r * 0.8, U.sy, U.sx + r * 0.8, U.sy); g.fillTriangle(U.sx, U.sy + r * 1.4, U.sx - r * 0.8, U.sy, U.sx + r * 0.8, U.sy);
      g.fillStyle(P.light, 1); g.fillTriangle(U.sx, U.sy - r, U.sx - r * 0.5, U.sy, U.sx, U.sy + r);
      if (t > L.splitAt - 10) { g.lineStyle(1, 0xffffff, 1); g.lineBetween(U.sx - 1, U.sy - r * 1.4, U.sx + 2, U.sy + r * 1.4); g.lineStyle(0); }   // the crack
    }
    if (U.burst !== undefined && U.burst < 40) {                       // it breaks: a ring and a flash
      const k = U.burst / 40;
      g.lineStyle(3 * (1 - k) + 1, 0xffffff, 1 - k); g.strokeCircle(U.sx, U.sy, 10 + 160 * k); g.lineStyle(0);
      g.fillStyle(0xffffff, 0.6 * (1 - k)); g.fillCircle(U.sx, U.sy, 30 * (1 - k) + 4);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3; pixStar(g, U.sx + Math.cos(a) * 80 * k, U.sy + Math.sin(a) * 50 * k, 3, P.deep, P.light, 0xffffff, 1 - k); }
    }
    if (U.burst !== undefined && t < L.pillarAt + 20) { g.fillStyle(P.light, 0.12); g.fillCircle(U.sx, U.sy, 40 + Math.sin(t * 0.2) * 4); pixStar(g, U.sx, U.sy, 5, P.deep, P.light, 0xffffff, 0.7); }
    for (const p of U.pillars) {                                        // the warning glow, then the pillar
      if (t < L.pillarAt) { const w = 4 + (t - (L.pillarAt - 14)); g.fillStyle(P.light, 0.15 + 0.03 * w); g.fillRect(p.x - w, p.y - 300, w * 2, 300); g.fillStyle(0xffffff, 0.5); g.fillRect(p.x - 12, p.y - 2, 24, 2); }
      else if (t < L.pillarAt + 22) {
        const k = (t - L.pillarAt) / 22, w = 26 * (1 - k * 0.6);
        g.fillStyle(P.mid, 0.4 * (1 - k)); g.fillRect(p.x - w - 8, p.y - 320, (w + 8) * 2, 330);
        g.fillStyle(P.light, 0.8 * (1 - k)); g.fillRect(p.x - w, p.y - 320, w * 2, 330);
        g.fillStyle(0xffffff, 1 - k); g.fillRect(p.x - w * 0.4, p.y - 320, w * 0.8, 330);
      }
    }
  }
}
