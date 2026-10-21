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
    this.walkFrom = { x: this.x + this.facing * 4, y: this.y }; this.walkTo = null;
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
  // enough noclips out of reality into the Backrooms, where THE BACTERIA chases them down (level0Cutscene).
  // Nobody in reach: the lights just flicker.
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
  // In the Backrooms: a side-on hallway with the victims running for their lives and THE BACTERIA - a tall,
  // twitching black thing - gaining on them from behind while the lights die. It catches them: three
  // mauls in the dark, then it throws them back out of the walls. Damage: L.mauls x maul + final (50%).
  level0Cutscene(L, U) {
    const m = this.match;
    U.ct++;
    U.victims = U.victims.filter((v) => v.alive && v.state !== 'dying');
    if (!U.victims.length) return this.endLevel0();
    const C = L.chase, catchAt = C.from + C.frames, ct = U.ct;
    if (ct === 1) {                                                    // line them up in the hallway, all running away from it
      const a = U.victims[0];
      U.anchor = { x: a.x, y: a.y }; U.home = U.victims.map((v) => ({ x: v.x, y: v.y }));
      U.victims.forEach((v, i) => { v.x = a.x - i * 52; v.y = a.y; });
    }
    for (const v of U.victims) {
      v.hitstun = 999; v.lx = v.ly = 0;
      if (ct < catchAt) { v.facing = 1; if (v.state !== 'run') v.state = 'run'; v.vx = 4; v.grounded = true; }   // running (only the animation: the hallway scrolls instead)
      else if (v.state !== 'hitstun') { v.setState('hitstun'); v.vx = 0; v.hurtAnim = 16; }
    }
    // the chase: how far behind it is, closing in faster and faster
    const k = Math.min(1, Math.max(0, (ct - C.from) / C.frames));
    U.gap = C.gap0 * (1 - k * k);
    if (ct > C.from && ct < catchAt) {
      if (ct % 9 === 0) sfx('land', 0.35, 0.9);                         // their footsteps
      const every = Math.max(5, Math.round(14 - 9 * k));
      if (ct % every === 0) { sfx('hit', 0.25 + 0.4 * k, 0.45); m.shake(1 + 3 * k, 3); }   // its footsteps, louder and faster
      if (ct % 12 === 0) sfx('buzz', 0.3 + 0.4 * k, 1.1 - 0.4 * k);
      if (ct % 30 === 0) sfx('glitch', 0.3 + 0.3 * k, 0.5);
    }
    if (ct === C.from) { sfx('glitch', 0.8, 0.4); m.popText({ x: U.anchor.x, y: U.anchor.y - 50 }, 'RUN!', '#ff4a3a'); }
    if (ct === catchAt) { sfx('bighit', 1, 0.4); sfx('ko', 0.6, 0.5); m.shake(12, 8); }   // it lunges: lights out
    for (let i = 0; i < L.mauls; i++) {
      if (ct !== catchAt + 8 + i * L.maulEvery) continue;
      for (const t of U.victims) { m.applyHit(t, { h: L.maul, owner: this, facing: 1, id: 'lvl0m' + this.slot + ':' + i, pillar: true }, t.x); t.lx = t.ly = 0; t.hitstun = 999; }
      sfx('bighit', 0.7, 0.7 + i * 0.1); sfx('glitch', 0.6, 0.8 + i * 0.2); m.shake(8, 5);
    }
    if (ct === catchAt + 8 + L.mauls * L.maulEvery + 10) {             // thrown back out of the walls
      U.victims.forEach((t, i) => {
        const h = U.home[U.victims.indexOf(t)] || U.anchor; t.x = h.x; t.y = h.y; t.hitstun = 0;
        m.applyHit(t, { h: L.final, owner: this, facing: Math.sign(t.x - U.origin.x) || this.facing, id: 'lvl0out' + this.slot, pillar: true }, t.x);
        m.puff(t.x, t.y - 20, this.pal.light, 16); m.puff(t.x, t.y - 20, 0x0b0a0a, 12);
      });
      sfx('ko', 0.7, 0.8); sfx('glitch', 0.9, 1.2); m.shake(14, 12);
      return this.endLevel0();
    }
  }
  endLevel0() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { m.frozen = 0; m.cutscene = null; for (const v of U.victims) v.sprite.setDepth(0); }
    this.fx.setDepth(0); if (this.lvlTop) this.lvlTop.clear();
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
    if (U.phase !== 'cutscene' || !U.anchor) return;
    // ---- the Backrooms, side on: the hallway streams past as they run (drawn behind the victims)
    const ct = U.ct, C = L.chase, catchAt = C.from + C.frames, n = U.victims.length;
    const x0 = v.x - 4, y0 = v.y - 4, W = v.width + 8, H = v.height + 8, X1 = x0 + W, Y1 = y0 + H;
    const fy = U.anchor.y, ceil = fy - 104, scroll = ct < catchAt ? ct * C.speed : catchAt * C.speed;
    const fade = Math.min(1, ct / 10), k = Math.min(1, Math.max(0, (ct - C.from) / C.frames));
    const wrap = (x, span) => ((x % span) + span) % span;
    g.fillStyle(HALL.wall, fade); g.fillRect(x0, y0, W, H);
    g.fillStyle(HALL.stripe, 0.55 * fade);                                       // wallpaper stripes
    for (let x = x0 - wrap(scroll, 9); x < X1; x += 9) g.fillRect(Math.round(x), ceil, 2, fy - ceil);
    g.fillStyle(HALL.stripe, 0.35 * fade);                                        // damp stains on the wallpaper
    for (let x = x0 - wrap(scroll * 1, 170); x < X1; x += 170) g.fillEllipse(Math.round(x + 60), fy - 22, 46, 18);
    g.fillStyle(HALL.ceil, fade); g.fillRect(x0, y0, W, ceil - y0);               // drop ceiling
    g.fillStyle(HALL.tile, fade); for (let x = x0 - wrap(scroll, 36); x < X1; x += 36) g.fillRect(Math.round(x), y0, 1, ceil - y0);
    g.fillStyle(HALL.tile, fade); g.fillRect(x0, ceil - 1, W, 2);
    const bx = U.anchor.x - (n - 1) * 52 - 16 - U.gap;                          // the thing's front edge
    for (let x = x0 - wrap(scroll, 96); x < X1 + 96; x += 96) {                 // the fluorescent panels: dead behind it, flickering ahead
      const px = Math.round(x + 30), dead = ct >= catchAt || px < bx + 10, flick = !dead && ((ct * 7 + px) % (41 - Math.round(28 * k))) < 2 + 4 * k;
      g.fillStyle(dead || flick ? HALL.dead : HALL.lit, fade); g.fillRect(px, ceil - 4, 34, 4);
      if (!dead && !flick) { g.fillStyle(HALL.lit, 0.14 * fade); g.fillTriangle(px - 18, fy, px + 52, fy, px + 17, ceil); }
    }
    g.fillStyle(0xa08c40, fade); g.fillRect(x0, fy - 4, W, 4);                   // skirting board
    g.fillStyle(HALL.carpet, fade); g.fillRect(x0, fy, W, Y1 - fy);                // damp carpet
    g.fillStyle(HALL.carpetDark, fade); for (let x = x0 - wrap(scroll, 23); x < X1; x += 23) g.fillRect(Math.round(x), fy + 3, 12, 1);
    for (let x = x0 - wrap(scroll, 140); x < X1; x += 140) g.fillEllipse(Math.round(x + 40), fy + 12, 50, 7);
    // the dark it drags along behind it
    for (let i = 0; i < 12; i++) { g.fillStyle(0x000000, 0.09 * fade); g.fillRect(x0, y0, Math.max(0, bx - x0 + 40 - i * 12), H); }
    if (ct > C.from) this.drawBacteria(g, bx, fy, ct, k, ct >= catchAt);
    // over everything (the victims too): the catch - lights out, and the mauling in the dark
    if (!this.lvlTop) { this.lvlTop = this.scene.add.graphics().setDepth(5); this.match.addWorld(this.lvlTop); }
    const T = this.lvlTop; T.clear();
    if (ct >= catchAt) {
      const st = ct - catchAt;
      T.fillStyle(0x000000, Math.min(1, st / 3)); T.fillRect(x0, y0, W, H);
      for (let i = 0; i < L.mauls; i++) {
        const d = st - (8 + i * L.maulEvery);
        if (d < 0 || d > 7) continue;
        const a = 1 - d / 8, cx = U.anchor.x - (i - 1) * 14, cy = fy - 30;
        T.fillStyle(0xffffff, 0.35 * a); T.fillRect(x0, y0, W, H);
        T.lineStyle(5, 0xfff6b0, a);                                             // three claw marks across the dark
        for (let j = -1; j <= 1; j++) T.lineBetween(cx - 40 + j * 12, cy - 40 - j * 4, cx + 30 + j * 12, cy + 34 - j * 4);
        T.fillStyle(0xffffff, a); T.fillRect(cx - 2 + i * 6, cy - 50, 2, 2); T.fillRect(cx + 6 + i * 6, cy - 50, 2, 2);   // its pinprick eyes
      }
    }
  }
  // THE BACTERIA: a tall, thin, jittering black figure with arms far too long, reaching for whoever is closest
  drawBacteria(g, x, fy, ct, k, lunge) {
    const R = (n) => (((ct * 73 + n * 151) % 97) / 97 - 0.5);                     // deterministic twitch
    const jx = R(1) * 3, jy = R(2) * 2, ph = ct * (0.35 + 0.35 * k), H = 108;
    const hipX = x - 22 + jx, hipY = fy - 54 + jy, shX = hipX + 16 + 8 * k, shY = fy - H + 16 + jy;
    const draw = (ox, col, alpha) => {
      g.lineStyle(5, col, alpha);
      for (const s of [1, -1]) {                                                 // legs: long, bent wrong, striding
        const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 16;
        const kx = hipX + ox + sw * 0.5 + 8, ky = hipY + 26, fx2 = hipX + ox + sw, fy2 = fy;
        g.lineBetween(hipX + ox, hipY, kx, ky); g.lineBetween(kx, ky, fx2, fy2);
      }
      g.lineStyle(10, col, alpha); g.lineBetween(hipX + ox, hipY, shX + ox, shY); g.lineStyle(7, col, alpha); g.lineBetween(hipX + ox - 2, hipY + 4, hipX + ox + 2, hipY - 6);  // spine, hunched forward
      const reach = lunge ? 1 : 0.55 + 0.45 * k;
      for (const s of [1, -1]) {                                                 // arms: reaching out ahead, fingers splayed
        const sw = Math.sin(ph * 0.5 + s) * 6;
        const ex = shX + ox + 24 * reach, ey = shY + 12 + sw, hx = shX + ox + 56 * reach + s * 3, hy = shY + 4 + sw + s * 7;
        g.lineStyle(4, col, alpha); g.lineBetween(shX + ox, shY + 2, ex, ey); g.lineBetween(ex, ey, hx, hy);
        g.lineStyle(2, col, alpha); for (let f = -1; f <= 1; f++) g.lineBetween(hx, hy, hx + 11, hy + f * 5 + s * 2);
      }
      g.fillStyle(col, alpha); g.fillEllipse(shX + ox + 8 + R(3) * 4, shY - 11 + R(4) * 3, 15, 22);   // small head, twitching
    };
    if ((ct >> 2) % 5 === 0) draw(R(5) * 10, 0x3a2a10, 0.35);                     // a glitchy afterimage
    draw(0, 0x050403, 1);
    g.fillStyle(0xffffff, 0.9); g.fillRect(Math.round(shX + 10), Math.round(shY - 14), 2, 1); g.fillRect(Math.round(shX + 15), Math.round(shY - 14), 2, 1);
    g.fillStyle(0x050403, 0.8);                                                  // spores of static coming off it
    for (let i = 0; i < 8; i++) g.fillRect(Math.round(hipX - 10 + R(10 + i) * 50), Math.round(fy - 80 + R(20 + i) * 90), 2, 2);
  }
}
