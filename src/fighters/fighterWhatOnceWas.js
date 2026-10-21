// Fighter methods: WHAT ONCE WAS (test fighter) - its SIGNAL meter and CHANNEL menu, CHANNEL SURF, MISSING
// posters, the WRONG DOOR, the OUT OF ORDER elevator, its screen beams, and its Limit, LEVEL 0 (the Backrooms
// chase). Mixed into the Fighter class (Fighter.js) - `this` is the fighter. A few methods (markMissing,
// drawMissingMark) are used on whoever it hits, so they work on any fighter.
import { sfx } from '../audio/sfx.js';
import { PHYS } from '../config.js';
import { drawDoor, drawPoster } from './entities.js';
import { FONT } from '../config.js';

const HALL = { wall: 0xd4c06a, stripe: 0xb8a24c, ceil: 0xe6dca8, tile: 0xc8bc88, carpet: 0x8f7d45, carpetDark: 0x6e5f32, far: 0x2a2410, lit: 0xfffbe0, dead: 0x5a5440 };

export class FighterWhatOnceWas {

  // ---- the parts of its attacks that need code (called from st_attack)
  wowAttackStep(m) {
    const M = this.match, R = Math.random;
    if (m.noclip) {                                                  // CHANNEL SURF: gone from reality, sliding straight ahead
      const N = m.noclip;
      if (this.t === N.from) { this.usedDive = true; sfx('glitch', 0.7, 0.8); sfx('buzz', 0.4, 1.6); this.glitchBurst(10); }
      if (this.t >= N.from && this.t <= N.to) {
        this.vx = this.facing * N.vx; this.lx = this.ly = 0;
        if (!this.grounded) this.vy = -PHYS.gravity;                // a dead-straight line: gravity is added on top
        if (this.t % 2 === 0) M.particles.push({ shape: 'pixel2', x: this.x - this.facing * 6, y: this.y - 8 - R() * 50, vx: -this.facing * R(), vy: 0, life: 10 + R() * 8, color: R() < 0.5 ? 0xf0f0f0 : 0x4a4a4a, grav: 0, drag: 0.9 });
      }
      if (this.t === N.to + 1) { this.vx = this.facing * 1.5; sfx('glitch', 0.7, 1.3); M.shake(3, 4); this.glitchBurst(14); }
    }
    if (m.poster && this.t === m.spawnAt && !(this.posterOut && this.posterOut.alive)) this.posterOut = M.spawnPoster(this, m.poster);
    if (m.door && this.t === m.spawnAt) { this.doorOut = M.spawnDoor(this, m.door); if (!this.doorOut) { sfx('curse', 0.3, 1.5); M.puff(this.x - this.facing * 16, this.y - 10, 0xcbb662, 5); } }
    if (m.static && this.t === m.static) {                           // a burst of TV static
      sfx('glitch', 0.6, 1.1);
      const fx = this.moveName === 'dsmash' ? 0 : this.facing * 26, fy = this.moveName === 'dsmash' ? -4 : -52;
      for (let i = 0; i < 18; i++) { const both = this.moveName === 'dsmash' ? (i % 2 ? 1 : -1) : this.facing; M.particles.push({ shape: 'pixel2', x: this.x + fx, y: this.y + fy + (R() - 0.5) * 10, vx: both * (1 + R() * 4), vy: (R() - 0.5) * 1.5, life: 12 + R() * 10, color: [0xf0f0f0, 0x9a9a9a, 0x4a4a4a][i % 3], grav: 0, drag: 0.9 }); }
    }
    if (m.beam && this.t === m.beam.from) { sfx(m.beam.red ? 'laser' : 'glitch', 0.7, m.beam.red ? 0.7 : 0.6); this.match.shake(4, 6); }
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

  // ---- a beam out of its screen (def move.beam): white light (CRT BLAST) or a column of red static (ANTENNA SURGE)
  drawBeam(g, B) {
    const a = B.angle * Math.PI / 180, dx = Math.cos(a) * this.facing, dy = Math.sin(a);
    const ox = this.x + this.facing * B.ox, oy = this.y + B.oy, k = (this.t - B.from) / Math.max(1, B.to - B.from);
    const grow = Math.min(1, (this.t - B.from + 1) / 3), fade = Math.min(1, (B.to - this.t + 1) / 4) * (this.anim % 4 === 0 ? 0.7 : 1);
    const len = B.len * grow, px = -dy, py = dx, ex = ox + dx * len, ey = oy + dy * len, w = B.w * (1 - 0.3 * k);
    const [c1, c2, c3] = B.red ? [0xa8140e, 0xff4a3a, 0xffd0c0] : [this.pal.light, this.pal.core, 0xffffff];
    g.fillStyle(c1, 0.35 * fade); g.fillTriangle(ox + px * 4, oy + py * 4, ex + px * w, ey + py * w, ex - px * w, ey - py * w); g.fillTriangle(ox + px * 4, oy + py * 4, ox - px * 4, oy - py * 4, ex - px * w, ey - py * w);
    g.fillStyle(c2, 0.6 * fade); g.fillTriangle(ox, oy, ex + px * w * 0.5, ey + py * w * 0.5, ex - px * w * 0.5, ey - py * w * 0.5);
    for (let i = 0; i < 10; i++) {                                    // scanlines of static streaming along it
      const t = ((i * 0.1 + this.anim * 0.05) % 1), sx = ox + dx * len * t, sy = oy + dy * len * t, sw = w * (0.3 + 0.7 * t) * ((i * 37 + this.anim) % 5) / 5;
      g.fillStyle(i % 2 ? c3 : c1, 0.7 * fade); g.fillRect(Math.round(sx + px * sw - 1), Math.round(sy + py * sw - 1), 2, 2);
    }
    g.fillStyle(c3, 0.9 * fade); g.fillRect(Math.round(ox) - 5, Math.round(oy) - 4, 10, 8);   // the screen, blown out white
  }

  // ---- everything of its drawn over (or instead of) the sprite: called from FighterRender.render
  drawWhatOnceWas(g, spr) {
    const s = this.state, m = this.move;
    if (s === 'attack' && m && m.beam && this.t >= m.beam.from && this.t <= m.beam.to) this.drawBeam(g, m.beam);
    this.drawSignal(g, spr);
    if (s === 'upb' && this.def.moves.upb.elevator && this.t >= this.def.moves.upb.riseAt - 4) this.drawElevator(g, this.fxBack);
    if (this.noclipping()) {                                          // out of reality: only a glitchy smear where it is
      spr.setAlpha(0);
      for (let i = 0; i < 5; i++) {
        if ((this.anim + i * 3) % 4 === 0) continue;
        const yy = this.y - 6 - i * 10 + ((this.anim * 7 + i * 5) % 5) - 2, off = ((this.anim * 13 + i * 7) % 9) - 4;
        g.fillStyle(i % 2 ? 0xf0f0f0 : 0x4a4a4a, 0.6); g.fillRect(this.x - 10 + off, yy, 20, 3);
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

  // ------------------------------------------------------------------ SIGNAL meter and the CHANNEL menu
  // The meter (def.signal) fills from damage dealt and taken (MatchScene.applyHit calls addSignal). Full, the
  // taunt key opens the CHANNEL menu over its head (Fighter.tryCommon); a direction picks a channel.
  addSignal(n) {
    const S = this.def.signal; if (!S || this.state === 'channel') return;
    const was = this.signal || 0;
    this.signal = Math.min(S.max, was + n);
    if (was < S.max && this.signal >= S.max) { sfx('limitready', 0.6, 0.7); sfx('buzz', 0.5, 1.3); this.match.popText(this, 'SIGNAL FOUND - PRESS 1', '#fff6b0'); }
  }
  signalFull() { const S = this.def.signal; return !!S && (this.signal || 0) >= S.max; }
  startChannel() {
    this.setState('channel'); this.channelPick = null; this.vx *= 0.3; this.lx = this.ly = 0;
    if (!this.grounded) this.vy = Math.min(this.vy, 0);
    sfx('glitch', 0.6, 0.6); sfx('menu', 0.7, 0.7);
  }
  // the menu: hangs in the air a little, waits for a direction; shield (or waiting too long) closes it
  st_channel(c) {
    const S = this.def.signal;
    this.vx *= 0.8;
    if (!this.grounded) this.vy = Math.min(this.vy, 0.6);
    if (this.t % 10 === 0) sfx('buzz', 0.25, 1.4);
    if (this.t >= 6) {
      const pick = c.up ? 'warning' : c.down ? 'deadAir' : Math.abs(c.x) > 0.5 ? 'missing' : null;
      if (pick) return this.pickChannel(pick);
    }
    if (this.t > S.menuFor || (this.t > 6 && this.buffer.shield)) { this.buffer.shield = 0; sfx('menu', 0.5, 0.5); this.setState(this.grounded ? 'idle' : 'air'); }
  }
  pickChannel(ch) {
    const S = this.def.signal, m = this.match;
    this.signal = 0; this.channelFlash = 20; this.channelName = ch;
    sfx('select', 0.8, 0.7); sfx('glitch', 0.8, 1);
    if (ch === 'warning') {                                          // WARNING: red screen, hits harder
      this.warnMode = S.warning.frames;
      m.popText(this, 'CH 1: WARNING', '#ff4a3a'); m.shake(4, 6);
    } else if (ch === 'missing') {                                   // MISSING: out of the static behind the nearest opponent
      let best = null, bd = 1e9;
      for (const o of m.fighters) { if (o === this || !o.alive || o.team === this.team || o.state === 'respawn') continue; const d = Math.hypot(o.x - this.x, o.y - this.y); if (d < bd) { bd = d; best = o; } }
      this.glitchBurst(16);
      if (best) {
        const P0 = m.stage.platforms[0], side = -(best.facing || 1);
        this.x = Phaser.Math.Clamp(best.x + side * S.missing.behind, Math.min(best.x, P0.x1 + 10), Math.max(best.x, P0.x2 - 10));
        this.y = best.y; this.vx = this.vy = 0; this.facing = Math.sign(best.x - this.x) || 1;
        this.grounded = best.grounded; this.platform = best.grounded ? best.platform : null;
        best.markMissing(S.missing.frames);
        this.glitchBurst(16);
      }
      m.popText(this, 'CH 2: MISSING', '#e8e2cc');
    } else {                                                         // DEAD AIR: patch itself up, nothing flinches it
      if (m.mode === 'stamina') this.hp = Math.min(this.maxHp, this.hp + S.deadAir.heal); else this.percent = Math.max(0, this.percent - S.deadAir.heal);
      this.armor = S.deadAir.armor;
      m.popText(this, 'CH 3: DEAD AIR', '#9ad8f0'); sfx('item', 0.6, 0.8);
    }
    this.setState(this.grounded ? 'idle' : 'air');
  }
  // posted MISSING (a poster hit, or CH 2): takes more damage until it runs out. Works on any fighter.
  markMissing(frames) {
    if (!this.alive) return;
    if (!(this.missingMark > 0)) { this.match.popText(this, 'MISSING', '#c8281e'); sfx('petal', 0.6, 0.8); }
    this.missingMark = Math.max(this.missingMark || 0, frames);
  }
  drawMissingMark(g) {                                                // a little poster pinned over their head
    const k = Math.min(1, this.missingMark / 20), y = this.y - (this.def.tagY || 60) - 20 + Math.sin(this.anim * 0.15) * 1.5;
    drawPoster(g, this.x, y, Math.sin(this.anim * 0.1) * 0.5, k);
  }
  // the meter over its head, the menu when it's open, and the channel effects
  drawSignal(g, spr) {
    const S = this.def.signal, s = this.state;
    if (this.warnMode > 0) {                                          // WARNING: red screen glow, static sparks
      if (this.anim % 6 < 3) spr.setTint(0xff9a8a).setTintMode(Phaser.TintModes.MULTIPLY);
      if (this.anim % 5 === 0) this.match.particles.push({ shape: 'pixel2', x: this.x + (Math.random() - 0.5) * 26, y: this.y - 50 - Math.random() * 14, vx: 0, vy: -0.6, life: 14, color: Math.random() < 0.5 ? 0xff4a3a : 0xffffff, grav: 0 });
    }
    if (this.armor > 0) {                                             // DEAD AIR: a flat blue test-card glow
      g.lineStyle(1, 0x9ad8f0, 0.35 + 0.2 * Math.sin(this.anim * 0.3)); g.strokeRect(this.x - 15, this.y - 66, 30, 66);
    }
    if (s !== 'channel') this.hideMenuLabels();
    if (!S || s === 'limit' || s === 'respawn') return;
    // the meter: a thin bar under the name tag; full, it blinks
    const v = this.signal || 0, full = v >= S.max, w = 30, x = Math.round(this.x - w / 2), y = Math.round(this.y - (this.def.tagY || 60) + 3);
    g.fillStyle(0x0b0a14, 0.85); g.fillRect(x - 1, y - 1, w + 2, 4);
    g.fillStyle(full ? (this.anim % 20 < 10 ? 0xfff6b0 : 0xff4a3a) : 0xd8c860, 1); g.fillRect(x, y, Math.round(w * v / S.max), 2);
    for (let i = 1; i < 5; i++) { g.fillStyle(0x0b0a14, 0.8); g.fillRect(x + i * w / 5, y, 1, 2); }
    if (s !== 'channel') return;
    // the CHANNEL menu: three little screens around its head - UP / SIDE / DOWN
    const cx = this.x, cy = this.y - 52, open = Math.min(1, this.t / 6);
    const items = [['warning', 0, -38, 'WARNING'], ['missing', 40 * this.facing, -6, 'MISSING'], ['deadAir', 0, 30, 'DEAD AIR']];
    for (const [id, dx, dy, label] of items) {
      const bx = cx + dx * open, by = cy + dy * open;
      g.fillStyle(0x0b0a14, 0.92); g.fillRect(bx - 15, by - 11, 30, 22);
      g.fillStyle(0x544e40, 1); g.fillRect(bx - 14, by - 10, 28, 20);
      g.fillStyle(0x161a18, 1); g.fillRect(bx - 12, by - 8, 24, 13);
      if (id === 'warning') { g.fillStyle(0xffd23a, 1); g.fillTriangle(bx, by - 7, bx - 6, by + 4, bx + 6, by + 4); g.fillStyle(0x14120c, 1); g.fillRect(bx, by - 3, 1, 4); }
      else if (id === 'missing') drawPoster(g, bx, by - 1, 0, 1, 0.8);
      else { const bars = [0xffffff, 0xffd23a, 0x3ad0e0, 0x3ad04a, 0xd03ab0, 0xd02a2a]; bars.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(bx - 12 + i * 4, by - 8, 4, 13); }); }   // a test card
      if (this.anim % 8 < 2) { g.fillStyle(0xffffff, 0.2); g.fillRect(bx - 12, by - 8 + (this.anim % 13), 24, 1); }   // a rolling scanline
    }
    // arrows pointing at them
    g.fillStyle(0xfff6b0, 0.6 + 0.4 * Math.sin(this.anim * 0.4));
    g.fillTriangle(cx, cy - 22, cx - 3, cy - 18, cx + 3, cy - 18);
    g.fillTriangle(cx, cy + 18, cx - 3, cy + 14, cx + 3, cy + 14);
    g.fillTriangle(cx + this.facing * 22, cy - 6, cx + this.facing * 18, cy - 9, cx + this.facing * 18, cy - 3);
    if (!this.menuLabels) {                                           // their names, small, under each screen (created once)
      this.menuLabels = items.map(([, , , label]) => { const t = this.scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: '5px', color: '#fff6b0', stroke: '#0b0a14', strokeThickness: 2 }).setOrigin(0.5, 0); this.match.addWorld(t); return t; });
    }
    items.forEach(([, dx, dy], i) => this.menuLabels[i].setPosition(cx + dx * open, cy + dy * open + 12).setVisible(true));
  }
  hideMenuLabels() { if (this.menuLabels) for (const t of this.menuLabels) t.setVisible(false); }

  // ------------------------------------------------------------------ LEVEL 0 (Limit)
  // The screen shows one huge eye while the lights buzz louder and louder... then floods red. Everyone close
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
  // THE BACTERIA: a hunched mass of black mould on long, wrongly jointed legs - ragged fringes of growth
  // all over it, arms like bundled roots ending in hooked fingers, and a long head split by a mouth full of
  // pale teeth. It twitches every frame and leaves spores behind.
  drawBacteria(g, x, fy, ct, k, lunge) {
    const R = (n) => (((ct * 73 + n * 151) % 97) / 97 - 0.5);                     // deterministic twitch
    const BLK = 0x070504, DRK = 0x1c130c, WET = 0x3a2a1c, H = 118;
    const jx = R(1) * 4, jy = R(2) * 3, ph = ct * (0.32 + 0.38 * k);
    const hipX = x - 30 + jx, hipY = fy - 62 + jy;
    const shX = hipX + 24 + 10 * k + (lunge ? 10 : 0), shY = fy - H + 26 + jy;
    // a limb: a tapered quad from (x1,y1) width w1 to (x2,y2) width w2
    const limb = (x1, y1, x2, y2, w1, w2, col) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      g.fillStyle(col, 1);
      g.fillTriangle(x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1, x2 + nx * w2, y2 + ny * w2);
      g.fillTriangle(x1 - nx * w1, y1 - ny * w1, x2 + nx * w2, y2 + ny * w2, x2 - nx * w2, y2 - ny * w2);
      g.fillCircle(x2, y2, w2);
    };
    const fringe = (x1, y1, x2, y2, n, len, seed) => {                         // ragged hairs of mould along a line
      g.lineStyle(1, BLK, 1);
      for (let i = 0; i < n; i++) {
        const t = i / n, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t, a = R(seed + i) * 3 + Math.PI * (0.8 + 0.4 * R(seed + 40 + i));
        g.lineBetween(px, py, px + Math.cos(a) * len * (0.5 + Math.abs(R(seed + 80 + i))), py + Math.sin(a) * len * (0.5 + Math.abs(R(seed + 80 + i))));
      }
    };
    // ---- far leg and far arm (dimmer, behind)
    const legs = (s, col) => {
      const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 20;
      const kx = hipX + sw * 0.4 + 14, ky = hipY + 26 + Math.abs(sw) * 0.2, ax = hipX + sw * 0.9 - 4, ay = fy - 10;   // knee bends backward, an extra ankle joint
      limb(hipX, hipY, kx, ky, 7, 4, col); limb(kx, ky, ax, ay, 4, 3, col); limb(ax, ay, ax + 10, fy, 3, 2, col);
      g.lineStyle(2, col, 1); for (let f = 0; f < 3; f++) g.lineBetween(ax + 10, fy, ax + 15 + f * 3, fy);   // splayed toes
    };
    const reach = lunge ? 1.25 : 0.6 + 0.5 * k;
    const arm = (s, col, off) => {
      const sw = Math.sin(ph * 0.6 + s * 1.3) * 7;
      const ex = shX + 22 * reach, ey = shY + 22 + sw + off, wx = shX + 52 * reach, wy = shY + 8 + sw * 0.5 + off * 0.6;
      limb(shX, shY + 4, ex, ey, 6, 4, col); limb(ex, ey, wx, wy, 4, 3, col);
      g.lineStyle(2, col, 1);
      for (let f = -1; f <= 2; f++) {                                            // long hooked fingers
        const fx = wx + 10 + f * 2, fy2 = wy + f * 5;
        g.lineBetween(wx, wy, fx, fy2); g.lineBetween(fx, fy2, fx + 4, fy2 + 4);
      }
    };
    legs(-1, DRK); arm(-1, DRK, -8);
    // ---- the body: a hunched, swollen mass, leaning toward them
    const tilt = shX - hipX;
    g.fillStyle(BLK, 1);
    g.fillEllipse(hipX + tilt * 0.45, (hipY + shY) / 2 + 4, 44, 66);                  // the bulk of it
    g.fillEllipse(shX - 4, shY + 6, 38, 30);                                           // a hump over the shoulders
    g.fillStyle(WET, 1);                                                               // a wet sheen, and ribs pushing through
    for (let i = 0; i < 4; i++) g.fillRect(Math.round(hipX + tilt * 0.3 + i * 4), Math.round(shY + 18 + i * 9), 10, 1);
    g.fillRect(Math.round(shX - 12), Math.round(shY - 2), 6, 2);
    fringe(hipX - 18, hipY + 6, shX - 16, shY - 4, 16, 9, 3);                          // mould bristling off its back
    fringe(shX - 14, shY - 6, shX + 4, shY - 10, 6, 7, 30);
    legs(1, BLK);
    // ---- the head: long, low, jutting forward on a thick neck; the jaw hangs open
    const hx = shX + 16 + R(3) * 4, hy = shY - 10 + R(4) * 3, gape = lunge ? 14 : 6 + 4 * Math.abs(Math.sin(ct * 0.2));
    limb(shX, shY, hx - 6, hy + 2, 9, 7, BLK);
    g.fillStyle(BLK, 1); g.fillEllipse(hx + 6, hy - 2, 30, 18);                        // skull
    g.fillTriangle(hx - 4, hy + 2, hx + 22, hy + 2 + gape, hx - 2, hy + 8 + gape);       // hanging jaw
    g.fillStyle(0x2a0806, 1); g.fillTriangle(hx + 2, hy + 3, hx + 20, hy + 3 + gape * 0.7, hx + 2, hy + 6 + gape * 0.6);   // the inside of its mouth
    g.fillStyle(0xe8e0c8, 1);                                                          // too many teeth
    for (let i = 0; i < 6; i++) { const tx = hx + 2 + i * 3; g.fillTriangle(tx, hy + 2, tx + 2, hy + 2, tx + 1, hy + 6); g.fillTriangle(tx, hy + 4 + gape * 0.6 * (i / 6), tx + 2, hy + 4 + gape * 0.6 * (i / 6), tx + 1, hy + gape * 0.6 * (i / 6)); }
    g.fillStyle(0xffffff, 1); g.fillRect(Math.round(hx + 8), Math.round(hy - 6), 2, 1); g.fillRect(Math.round(hx + 13), Math.round(hy - 5), 1, 1);   // pinprick eyes
    if (ct % 30 < 3) { g.fillStyle(0xffffff, 0.5); g.fillRect(Math.round(hx + 6), Math.round(hy - 7), 6, 3); }   // they catch the light
    fringe(hx - 6, hy - 10, hx + 14, hy - 10, 8, 6, 50);
    arm(1, BLK, 0);
    if ((ct >> 2) % 6 === 0) { g.fillStyle(DRK, 0.4); g.fillEllipse(hipX + tilt * 0.45 + R(5) * 16, (hipY + shY) / 2, 48, 72); }   // a glitchy double
    g.fillStyle(BLK, 0.85);                                                            // spores drifting off it
    for (let i = 0; i < 14; i++) g.fillRect(Math.round(hipX - 20 + R(10 + i) * 80), Math.round(fy - 110 + R(20 + i) * 120), 2, 2);
  }
}
