// Fighter methods: THE WANDERER (test fighter) - NOCLIP, ALMOND WATER, the WRONG DOOR, the ELEVATOR, his torch
// beam, and his Limit, LEVEL 0 (the Backrooms cutscene). Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { PHYS } from '../config.js';
import { drawDoor } from './entities.js';

const HALL = { wall: 0xd4c06a, stripe: 0xb8a24c, ceil: 0xe6dca8, tile: 0xc8bc88, carpet: 0x8f7d45, carpetDark: 0x6e5f32, far: 0x2a2410, lit: 0xfffbe0, dead: 0x5a5440 };

export class FighterWanderer {

  // ---- the parts of his attacks that need code (called from st_attack)
  wandererAttackStep(m) {
    const M = this.match, R = Math.random;
    if (m.noclip) {                                                  // NOCLIP: gone from reality, sliding straight ahead
      const N = m.noclip;
      if (this.t === N.from) { this.usedDive = true; sfx('glitch', 0.7, 0.8); sfx('buzz', 0.4, 1.6); this.glitchBurst(10); }
      if (this.t >= N.from && this.t <= N.to) {
        this.vx = this.facing * N.vx; this.lx = this.ly = 0;
        if (!this.grounded) this.vy = -PHYS.gravity;                // a dead-straight line: gravity is added on top
        if (this.t % 2 === 0) M.particles.push({ shape: 'pixel2', x: this.x - this.facing * 6, y: this.y - 8 - R() * 40, vx: -this.facing * R(), vy: 0, life: 10 + R() * 8, color: R() < 0.5 ? this.pal.light : this.pal.mid, grav: 0, drag: 0.9 });
      }
      if (this.t === N.to + 1) { this.vx = this.facing * 1.5; sfx('glitch', 0.7, 1.3); M.shake(3, 4); this.glitchBurst(14); }
    }
    if (m.almond && this.t === m.spawnAt && !(this.bottleOut && this.bottleOut.alive)) this.bottleOut = M.spawnAlmond(this, m.almond);
    if (m.door && this.t === m.spawnAt) { this.doorOut = M.spawnDoor(this, m.door); if (!this.doorOut) { sfx('curse', 0.3, 1.5); M.puff(this.x - this.facing * 16, this.y - 10, 0xcbb662, 5); } }
    if (m.splash && this.t === m.splash) {                           // a splash off the damp carpet, both ways
      for (let i = 0; i < 12; i++) M.particles.push({ shape: 'drop', x: this.x + (i % 2 ? 1 : -1) * (6 + R() * 30), y: this.y - 2, vx: (i % 2 ? 1 : -1) * (0.5 + R() * 2.5), vy: -1.5 - R() * 2.5, life: 22 + R() * 10, color: R() < 0.5 ? 0xd8e8d8 : 0xb8a24c, grav: 0.2 });
    }
  }
  glitchBurst(n) {
    const R = Math.random;
    for (let i = 0; i < n; i++) this.match.particles.push({ shape: 'pixel2', x: this.x + (R() - 0.5) * 24, y: this.y - R() * 50, vx: (R() - 0.5) * 4, vy: (R() - 0.5) * 3, life: 14 + R() * 10, color: [this.pal.light, 0xffffff, this.pal.deep][i % 3], drag: 0.88, grav: 0 });
  }
  noclipping() { const m = this.move, N = m && m.noclip; return this.state === 'attack' && !!N && this.t >= N.from && this.t <= N.to; }

  // ---- WRONG DOOR: the down special again, with a door out, steps him through it
  wrongDoor() { return this.doorOut && this.doorOut.alive ? this.doorOut : null; }
  startDoorWalk() {
    this.setState('doorwalk'); this.lx = this.ly = 0; this.vx *= 0.3;
    this.walkFrom = { x: this.x + this.facing * 10, y: this.y }; this.walkTo = null;
    sfx('dodge', 0.5, 0.6);
  }
  doorWalking() { if (this.state !== 'doorwalk') return false; const W = this.def.moves.downB.walk; return this.t >= W.safeFrom && this.t <= W.safeTo; }
  st_doorwalk() {
    const W = this.def.moves.downB.walk;
    this.vx *= 0.7;
    if (!this.grounded) this.vy = -PHYS.gravity;                     // hangs in the doorway mid-air
    if (this.t === W.swapAt) {
      const D = this.wrongDoor();
      if (D) {                                                         // out of the other door
        this.x = D.x; this.y = D.y; this.vx = this.vy = 0;
        this.grounded = true; this.platform = D.platform; this.fastFalling = false; this.jumpsLeft = 1; this.usedUpB = false; this.usedDive = false;
        this.walkTo = { x: D.x, y: D.y }; D.use();
        sfx('shield', 0.5, 0.45); this.match.puff(this.x, this.y - 18, 0x050403, 8);
      } else { this.walkTo = { ...this.walkFrom }; sfx('curse', 0.4, 1.4); }   // the door was broken: back out the way he came
    }
    if (this.t >= W.frames) this.setState(this.grounded ? 'idle' : 'air');
  }

  // ---- ELEVATOR (up special): the car around him, the cable above it
  drawElevator(g, bg) {
    const u = this.def.moves.upb, t = this.t, k = Math.min(1, (t - u.riseAt + 4) / 4) * Math.min(1, (u.frames - t) / 6);
    if (k <= 0) return;
    const x = Math.round(this.x), y = Math.round(this.y) + 3, w = 40, h = 66, top = y - h;
    bg.fillStyle(0x2e2a22, 0.95 * k); bg.fillRect(x - w / 2, top, w, h);                        // the back wall, behind him
    bg.fillStyle(0x3e382c, 0.95 * k); for (let i = 1; i < 4; i++) bg.fillRect(x - w / 2 + i * 10, top + 4, 1, h - 8);
    bg.fillStyle(t >= u.stopAt ? 0xffd860 : 0xff8a3a, k); bg.fillRect(x - 4, top + 6, 8, 4);    // the floor indicator
    g.fillStyle(0x16120a, k); g.fillRect(x - w / 2 - 2, top - 4, w + 4, 6); g.fillRect(x - w / 2 - 2, y - 2, w + 4, 5);   // roof and floor
    g.fillStyle(0x7a7468, k); g.fillRect(x - w / 2 - 1, top - 3, w + 2, 3); g.fillRect(x - w / 2 - 1, y - 1, w + 2, 3);
    g.fillStyle(0x4a463c, k); g.fillRect(x - w / 2 - 2, top, 3, h); g.fillRect(x + w / 2 - 1, top, 3, h);   // side posts
    g.fillStyle(0x16120a, 0.9 * k); g.fillRect(x - 1, top - 200, 2, 196);                     // the cable, up into the dark
    if (t >= u.stopAt && t < u.stopAt + 8) { g.fillStyle(0xfff6b0, 0.5 * (1 - (t - u.stopAt) / 8)); g.fillRect(x - w / 2, top, w, h); }   // ding!
  }

  // ---- his torch: a cone of fluorescent light for the moves that use it (def move.light)
  drawTorch(g, L) {
    const span = Math.max(1, L.to - L.from), k = (this.t - L.from) / span;
    const deg = L.angle + ((L.toAngle ?? L.angle) - L.angle) * k, a = deg * Math.PI / 180;
    const dx = Math.cos(a) * this.facing, dy = Math.sin(a);
    const ox = this.x + this.facing * 6 + dx * 18, oy = this.y - 34 + dy * 18 + (dy < -0.5 ? -8 : 0);
    const flick = this.anim % 5 === 0 ? 0.5 : 1, fade = Math.min(1, (L.to - this.t + 1) / 3) * flick;
    const px = -dy, py = dx, ex = ox + dx * L.len, ey = oy + dy * L.len;
    g.fillStyle(this.pal.light, 0.28 * fade); g.fillTriangle(ox, oy, ex + px * L.w, ey + py * L.w, ex - px * L.w, ey - py * L.w);
    g.fillStyle(this.pal.core, 0.45 * fade); g.fillTriangle(ox, oy, ex + px * L.w * 0.4, ey + py * L.w * 0.4, ex - px * L.w * 0.4, ey - py * L.w * 0.4);
    g.fillStyle(0xffffff, 0.9 * fade); g.fillCircle(ox, oy, 3 + (L.surge ? 3 : 0));
    if (L.surge && this.anim % 2 === 0) this.match.particles.push({ shape: 'pixel2', x: ex + (Math.random() - 0.5) * L.w, y: ey + Math.random() * 20, vx: (Math.random() - 0.5), vy: -0.5, life: 12, color: this.pal.light, grav: 0, drag: 0.9 });
  }

  // ---- everything of his drawn over (or instead of) the sprite: called from FighterRender.render
  drawWanderer(g, spr) {
    const s = this.state, m = this.move;
    if (s === 'attack' && m && m.light && this.t >= m.light.from && this.t <= m.light.to) this.drawTorch(g, m.light);
    if (s === 'upb' && this.def.moves.upb.elevator && this.t >= this.def.moves.upb.riseAt - 4) this.drawElevator(g, this.fxBack);
    if (this.noclipping()) {                                          // out of reality: only a glitchy smear where he is
      spr.setAlpha(0);
      for (let i = 0; i < 5; i++) {
        if ((this.anim + i * 3) % 4 === 0) continue;
        const yy = this.y - 6 - i * 10 + ((this.anim * 7 + i * 5) % 5) - 2, off = ((this.anim * 13 + i * 7) % 9) - 4;
        g.fillStyle(i % 2 ? this.pal.light : this.pal.mid, 0.55); g.fillRect(this.x - 10 + off, yy, 20, 3);
      }
    }
    if (s === 'doorwalk') {                                            // walking through a doorway: in one side, out the other
      const W = this.def.moves.downB.walk, t = this.t;
      if (t < W.swapAt) {
        const open = Math.min(1, t / 4), fade = Math.max(0, 1 - Math.max(0, t - 4) / (W.swapAt - 4));
        drawDoor(this.fxBack, this.walkFrom.x, this.walkFrom.y, open, 1);
        spr.setAlpha(fade);
      } else if (this.walkTo) {
        const st = t - W.swapAt, close = Math.max(0, (st - 8) / 6);
        drawDoor(this.fxBack, this.walkTo.x, this.walkTo.y, 1 - Math.min(1, close), Math.min(1, 1.6 - close));
        spr.setAlpha(Math.min(1, st / 6));
      }
    }
    if (s === 'limit' && this.ult && this.def.limit.type === 'level0') this.drawLevel0(g, this.def.limit, this.ult);
  }

  // ------------------------------------------------------------------ LEVEL 0 (Limit)
  // He holds the torch up while the lights buzz louder and louder... then clicks it off. Everyone close
  // enough noclips out of reality into the Backrooms: an endless hallway where the ceiling lights die
  // one by one (a hit each), then the dark throws them back out. Nobody in reach: the lights just flicker.
  level0Limit(L) {
    const m = this.match;
    if (this.t === 1) { this.ult = { phase: 'buzz', victims: [], origin: { x: this.x, y: this.y } }; sfx('buzz', 0.6, 1); }
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    this.vy = this.grounded ? 0 : 1.2;                                 // sinks gently if he started in the air
    if (U.phase === 'buzz') {
      if (this.t % 10 === 0) sfx('buzz', 0.3 + this.t / 120, 1 + this.t / 160);   // the hum grows
      if (this.t === L.grabAt) {
        sfx('shield', 0.7, 0.35);                                      // click
        for (const o of m.fighters) {
          if (o === this || !o.alive || o.team === this.team || o.isIntangible() || o.state === 'respawn' || o.state === 'dying') continue;
          if (Math.abs(o.x - this.x) > L.reach || Math.abs(o.y - this.y) > L.reachY) continue;
          U.victims.push(o); o.vx = o.vy = o.lx = o.ly = 0; o.stopChargeSound(); o.setState('hitstun'); o.hitstun = 999;
          if (o.grabbed) { o.grabbed.grabbedBy = null; o.grabbed.setState('air'); o.grabbed = null; }
        }
        if (U.victims.length) {
          U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this;
          this.fx.setDepth(4); for (const v of U.victims) v.sprite.setDepth(4.5);
          sfx('glitch', 1, 0.6); sfx('ko', 0.4, 1.6); m.shake(10, 10);
        } else { U.phase = 'fizzle'; sfx('buzz', 0.5, 0.7); }
      }
      return;
    }
    if (U.phase === 'fizzle') { if (this.t >= L.grabAt + 30) this.endLevel0(); return; }
    if (U.phase === 'cutscene') return this.level0Cutscene(L, U);
  }
  level0Cutscene(L, U) {
    const m = this.match;
    U.ct++;
    U.victims = U.victims.filter((v) => v.alive && v.state !== 'dying');
    if (!U.victims.length) return this.endLevel0();
    for (const v of U.victims) { v.hitstun = 999; v.lx = v.ly = 0; }
    const start = 30, darkAt = start + L.lights * L.lightEvery;
    if (U.ct > start && U.ct <= darkAt && (U.ct - start) % L.lightEvery === 0) {   // a light dies: a hit each
      const n = (U.ct - start) / L.lightEvery;
      for (const t of U.victims) m.applyHit(t, { h: L.flicker, owner: this, facing: this.facing, id: 'lvl0' + this.slot + ':' + n, pillar: true }, t.x);
      for (const t of U.victims) { t.lx = t.ly = 0; t.hitstun = 999; }
      sfx('glitch', 0.6, 0.5 + n * 0.08); sfx('hit', 0.5, 0.6); m.shake(4, 4);
    }
    if (U.ct > darkAt && U.ct % 8 === 0) sfx('buzz', 0.6, 0.5);          // in the dark, only the hum
    if (U.ct === darkAt + L.darkFor) {                                 // thrown back out of the walls
      for (const t of U.victims) {
        t.hitstun = 0;
        m.applyHit(t, { h: L.final, owner: this, facing: Math.sign(t.x - U.origin.x) || this.facing, id: 'lvl0out' + this.slot, pillar: true }, t.x);
        m.puff(t.x, t.y - 20, this.pal.light, 16); m.puff(t.x, t.y - 20, 0xffffff, 8);
      }
      sfx('ko', 0.7, 0.8); sfx('glitch', 0.9, 1.2); m.shake(14, 12);
      return this.endLevel0();
    }
  }
  endLevel0() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { m.frozen = 0; m.cutscene = null; for (const v of U.victims) v.sprite.setDepth(0); }
    this.fx.setDepth(0);
    this.ult = null; this.invincible = 30;
    this.setState(this.grounded ? 'idle' : 'air');
  }
  // where the world camera is looking right now (worldView only catches up when the frame renders)
  cameraView() {
    const c = this.match.worldCam, w = c.width / c.zoom, h = c.height / c.zoom;
    return { x: c.scrollX + (c.width - w) / 2, y: c.scrollY + (c.height - h) / 2, width: w, height: h };
  }
  drawLevel0(g, L, U) {
    const v = this.cameraView();
    if (U.phase === 'buzz' || U.phase === 'fizzle') {                  // the lights buzz and stutter over everything
      const k = U.phase === 'buzz' ? Math.min(1, this.t / L.grabAt) : 1 - (this.t - L.grabAt) / 30;
      const stutter = (this.anim * 7) % 11 < 2 ? 0.18 : 0;
      g.fillStyle(0xd8c860, (0.06 + 0.1 * k) + stutter); g.fillRect(v.x, v.y, v.width, v.height);
      if (U.phase === 'fizzle' && this.t < L.grabAt + 6) { g.fillStyle(0x000000, 0.6); g.fillRect(v.x, v.y, v.width, v.height); }   // a blink of darkness, then nothing
      return;
    }
    if (U.phase !== 'cutscene') return;
    // ---- the Backrooms: an endless one-point-perspective hallway filling the view
    const ct = U.ct, start = 30, x0 = v.x - 4, y0 = v.y - 4, W = v.width + 8, H = v.height + 8;
    const cx = x0 + W / 2, cy = y0 + H * 0.46, fw = W * 0.12, fh = H * 0.14;   // the far end
    const fx1 = cx - fw / 2, fx2 = cx + fw / 2, fy1 = cy - fh / 2, fy2 = cy + fh / 2;
    const fadeIn = Math.min(1, ct / 12);
    g.fillStyle(HALL.wall, fadeIn); g.fillRect(x0, y0, W, H);
    g.fillStyle(HALL.ceil, fadeIn); g.fillTriangle(x0, y0, x0 + W, y0, fx2, fy1); g.fillTriangle(x0, y0, fx2, fy1, fx1, fy1);
    g.fillStyle(HALL.carpet, fadeIn); g.fillTriangle(x0, y0 + H, x0 + W, y0 + H, fx2, fy2); g.fillTriangle(x0, y0 + H, fx2, fy2, fx1, fy2);
    g.fillStyle(HALL.far, fadeIn); g.fillRect(fx1, fy1, fw, fh);
    // wallpaper stripes and carpet seams, converging on the far end
    for (let i = 1; i < 14; i++) {
      const k = i / 14, lx = x0 + (fx1 - x0) * k, rx = x0 + W - (x0 + W - fx2) * k;
      const ty = y0 + (fy1 - y0) * k, by = y0 + H - (y0 + H - fy2) * k;
      g.fillStyle(HALL.stripe, 0.5 * fadeIn); g.fillRect(lx, ty, 1, by - ty); g.fillRect(rx, ty, 1, by - ty);
      g.fillStyle(HALL.carpetDark, 0.5 * fadeIn); g.fillRect(lx, by, rx - lx, 1);
      g.fillStyle(HALL.tile, 0.6 * fadeIn); g.fillRect(lx, ty, rx - lx, 1);
    }
    // the ceiling lights, near to far; they die from the far end toward you
    const out = Math.max(0, Math.min(L.lights, Math.floor((ct - start) / L.lightEvery)));
    for (let i = 0; i < L.lights; i++) {
      const k = 0.15 + (i / L.lights) * 0.8, ly = y0 + (fy1 - y0) * k + 3, lw = (W - (W - fw) * k) * 0.22, lh = Math.max(2, 10 * (1 - k));
      const dead = i >= L.lights - out, flick = !dead && (ct * 7 + i * 13) % 37 < 2;
      g.fillStyle(dead || flick ? HALL.dead : HALL.lit, fadeIn); g.fillRect(cx - lw / 2, ly, lw, lh);
      if (!dead && !flick) { g.fillStyle(HALL.lit, 0.18 * fadeIn); g.fillRect(cx - lw, ly + lh, lw * 2, lh * 3); }
    }
    // darkness creeping in as the lights die, then near-black
    const dark = ct > start + L.lights * L.lightEvery ? 0.92 : (out / L.lights) * 0.7;
    if (dark > 0) { g.fillStyle(0x000000, dark); g.fillRect(x0, y0, W, H); }
    if (ct > start + L.lights * L.lightEvery && (ct >> 3) % 3 === 0) { g.fillStyle(HALL.lit, 0.08); g.fillRect(x0, y0, W, H); }   // one last stutter of light
  }
}
