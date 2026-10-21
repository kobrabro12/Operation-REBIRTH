// Lacy's Limit: the Blade cutscene (speed lines, hack windows, burning swing) and its drawing.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';

const CRYSTAL_BLADE = { outline: 0x0a3a4a, deep: 0x2a8fb0, mid: 0x6fd6f0, light: 0xbff6ff, core: 0xffffff };

export class LimitBlade {

  // ------------------------------------------------------------------ blade Limit (Lacy: Thousand Cuts)
  // grow the giant sword -> one big slash -> miss: fade away / hit: teleporting cut cutscene
  bladeLimit(L) {
    const m = this.match;
    if (this.t === 1) this.ult = { phase: 'grow', victims: [], slashes: [], cut: 0, origin: { x: this.x, y: this.y } };
    const U = this.ult;
    if (!this.grounded) this.vy = Math.min(this.vy, 0.5);
    if (U.phase === 'grow' && this.t >= L.slashFrom) { U.phase = 'slash'; sfx('swing', 1, 0.5); sfx('dodge', 0.8, 0.5); }
    if (U.phase === 'slash') {
      // the hitbox is the giant blade itself: sample points along it, sweeping from where it was last
      // tick to where it is now, so a fast swing can't pass over anyone between frames
      const a = this.bladeGeom(L, U, this.t - 1), b = this.bladeGeom(L, U, this.t), pts = [];
      for (let s = 0; s <= 6; s++) {
        const k = s / 6, ang = a.ang + (b.ang - a.ang) * k, hx = a.hx + (b.hx - a.hx) * k, hy = a.hy + (b.hy - a.hy) * k;
        const dx = Math.cos(ang) * this.facing, dy = Math.sin(ang);
        for (let d = 0; d <= b.len; d += 8) pts.push([hx + dx * d, hy + dy * d]);
      }
      const pad = b.half + 2;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.state === 'dying' || U.victims.includes(o) || o.isIntangible()) continue;
        const hb = o.hurtbox();
        if (pts.some(([x, y]) => x > hb.x1 - pad && x < hb.x2 + pad && y > hb.y1 - pad && y < hb.y2 + pad)) U.victims.push(o);
      }
      if (U.victims.length && this.t >= L.slashFrom + 3) {        // caught someone: into the cutscene
        U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this;
        for (const v of U.victims) { v.vx = v.vy = v.lx = v.ly = 0; v.stopChargeSound(); v.setState('hitstun'); v.hitstun = 999; }
        sfx('limitready', 1, 0.6); m.shake(10, 8);
        return;
      }
      if (this.t >= L.slashTo) { U.phase = 'whiff'; sfx('dodge', 0.6, 0.6); }
    }
    if (U.phase === 'whiff' && this.t >= L.whiffEnd) return this.endBladeLimit();
    if (U.phase === 'cutscene') return this.bladeCutscene(L, U);
  }
  bladeCutscene(L, U) {
    const m = this.match;
    U.ct++;
    U.victims = U.victims.filter((v) => v.alive && v.state !== 'dying');
    for (const s of U.slashes) s.life--;
    U.slashes = U.slashes.filter((s) => s.life > 0);
    if (!U.victims.length) return this.endBladeLimit();
    const v = U.victims[0], c = v.center();
    if (U.cut < L.cuts && U.ct % L.cutEvery === 0) {
      // teleport to a new spot around the target and cut straight through to the other side
      const a = U.cut * 2.39996 + 0.4, r = 46 + (U.cut % 3) * 8;            // golden-angle spiral: never the same spot twice
      const sx = c.x + Math.cos(a) * r, sy = c.y + Math.sin(a) * r * 0.75;
      const ex = c.x - Math.cos(a) * r, ey = c.y - Math.sin(a) * r * 0.75;
      U.from = { x: this.x, y: this.y };
      this.x = ex; this.y = ey + this.body.h / 2; this.facing = Math.sign(ex - sx) || 1;
      U.slashes.push({ x1: sx, y1: sy, x2: ex, y2: ey, life: 10 });
      U.cut++;
      for (const t of U.victims) m.applyHit(t, { h: L.cut, owner: this, facing: this.facing, id: 'cut' + this.slot + ':' + U.cut, pillar: true }, this.x);
      for (const t of U.victims) { t.lx = t.ly = 0; t.hitstun = 999; }
      sfx('swing', 0.7, 1.3 + (U.cut % 4) * 0.1);
      m.shake(2, 2);
    }
    const taunt = this.style === 'samurai' ? 150 : this.style === 'onebit' ? 70 : this.style === 'hero' ? 60 : 0;
    const hero = this.style === 'hero';
    if (hero && U.ct === 1) { this.cutLine(U, 'SECRET ART: THOUSAND CRYSTAL CUTS!', 1); sfx('limitready', 0.6, 1.2); }
    if (hero) this.stepSpeedLines(U, L);   // a pause for a cold word before the last cut
    const bit = this.style === 'onebit';
    if (bit && U.ct === 1) this.cutLine(U, 'TARGET LOCKED.', 1);
    if (bit) this.stepHackWindows(U, L);
    if (bit && U.cut > 0 && U.ct % L.cutEvery === 1 && U.ct < L.cuts * L.cutEvery + 4) this.cutLine(U, '> CUT ' + String(U.cut).padStart(2, '0') + '/' + L.cuts, 0);
    const appear = L.cuts * L.cutEvery + 4;
    if (U.ct === appear) U.execute = U.victims.some((t) => t.percent > 100);   // past 100%: she charges one killing slice instead
    const charge = U.execute ? L.executeCharge : 0, chargeFrom = appear + 10 + taunt, finalAt = chargeFrom + charge;
    U.charge = U.execute && U.ct >= chargeFrom && U.ct < finalAt ? (U.ct - chargeFrom) / charge : 0;
    U.appearAt = appear; U.finalAt = finalAt;                          // for her poses (animFrame)
    if (U.execute && U.ct >= chargeFrom && U.ct < finalAt) {           // charging: the blade grows, light pours into it
      const k = U.charge;
      if (U.ct === chargeFrom) { sfx('limit', 0.9, 0.7); sfx('shing', 0.7, 0.6); }
      if ((U.ct - chargeFrom) % 6 === 0) sfx('djump', 0.25 + k * 0.3, 0.4 + k * 1.2);   // a rising whine
      this.match.shake(1 + k * 3, 2);
    }
    if (U.ct === appear) {                                             // reappear for the last cut
      this.x = c.x - this.facing * 40; this.y = v.y; this.facing = Math.sign(c.x - this.x) || 1;
      sfx('limitready', 0.8, 0.8);
      if (this.style === 'samurai') { sfx('shing', 0.7, 0.8); this.cutLine(U, 'YOU ARE WEAK.', 4); }
      if (bit) this.cutLine(U, U.execute ? 'ERROR: TARGET > 100%. EXECUTING...' : 'PROCESS COMPLETE.', 1);
      if (hero) { this.cutLine(U, U.execute ? 'THIS ENDS NOW!!' : "IT'S OVER!", 2); sfx('shing', 0.8, 0.7); }
    }
    if (U.line) {                                                      // typed out letter by letter, then held
      const full = U.lineFull, rate = U.lineRate, n = rate ? Math.min(full.length, Math.floor((U.ct - U.lineAt) / rate) + 1) : full.length;
      const cursor = bit ? ((U.ct >> 3) % 2 ? '_' : ' ') : '';
      if (U.line.text.replace(/[_ ]$/, '').length < n || bit) { U.line.setText(full.slice(0, n) + cursor); if (U.lineShown < n && full[n - 1] !== ' ') sfx('menu', bit ? 0.12 : 0.25, bit ? 2 : 0.7); U.lineShown = n; }
      if (this.style === 'samurai' && U.ct === appear + 4 * full.length + 20) sfx('taiko', 0.9);
    }
    if (U.ct === finalAt) {
      if (U.line && !bit) { U.line.destroy(); U.line = null; }
      if (hero) {                                                      // the art's name in big brush letters, and crystal bursting everywhere
        const k = this.match.add.text(VIEW_W / 2, VIEW_H / 2 - 40, '千 刃', { fontFamily: 'serif', fontSize: '48px', fontStyle: 'bold', color: '#ffffff', stroke: '#2a8fb0', strokeThickness: 8 }).setOrigin(0.5).setDepth(60);
        this.match.addUI(k); this.match.pops.push({ t: k, life: 60, ui: true });
        for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6; this.match.particles.push({ shape: 'shard', x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + Math.random() * 20, color: [0xbff6ff, 0xffffff, 0x6fd6f0][i % 3], size: 3, rot: a }); }
        sfx('taiko', 1); sfx('shing', 1, 0.6);
      }
      if (bit) { this.cutLine(U, U.execute ? 'TERMINATED.' : 'END OF LINE.', 1); sfx('glitch', 0.9, 0.6); }
      U.charge = 0;
      if (U.execute) {                                                 // the killing slice: one huge cut across the whole screen
        U.slashes.push({ x1: c.x - this.facing * 260, y1: c.y + 70, x2: c.x + this.facing * 300, y2: c.y - 90, life: 30, big: true, huge: true });
        for (const t of U.victims) { t.hitstun = 0; m.applyHit(t, { h: L.execute, owner: this, facing: this.facing, id: 'cutfinal' + this.slot, pillar: true }, this.x); }
        sfx('bighit', 1, 0.45); sfx('ko', 0.9, 0.8); m.shake(22, 20);
        for (let i = 0; i < 30; i++) m.puff(c.x + (Math.random() - 0.5) * 60, c.y + (Math.random() - 0.5) * 50, i % 3 ? 0xffffff : this.pal.light, 1);
      } else {
        U.slashes.push({ x1: c.x - this.facing * 60, y1: c.y + 20, x2: c.x + this.facing * 70, y2: c.y - 30, life: 18, big: true });
        for (const t of U.victims) { t.hitstun = 0; m.applyHit(t, { h: L.final, owner: this, facing: this.facing, id: 'cutfinal' + this.slot, pillar: true }, this.x); }
        sfx('bighit', 1, 0.6); m.shake(14, 12);
      }
    }
    if (U.ct >= finalAt + (U.execute ? 40 : 24)) return this.endBladeLimit();
  }
  // AKATSUKI: anime speed lines rushing in from the screen edges while she cuts, flashing on each cut
  stepSpeedLines(U, L) {
    const m = this.match;
    if (!U.speed) { U.speed = m.add.graphics().setDepth(54); m.addUI(U.speed); }
    const g = U.speed, cx = VIEW_W / 2, cy = VIEW_H / 2, R = Math.random, cutting = U.ct < L.cuts * L.cutEvery + 4;
    g.clear();
    const n = cutting ? 34 : 18;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, r0 = 150 + R() * 70, r1 = 420, w = 1 + R() * 2.5;
      g.lineStyle(w, i % 5 ? 0xffffff : 0xbff6ff, 0.25 + R() * 0.35);
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7);
    }
    if (cutting && U.ct % L.cutEvery === 0) { g.fillStyle(0xffffff, 0.12); g.fillRect(0, 0, VIEW_W, VIEW_H); }   // a flash on every cut
  }
  // 1-BIT Lacy: while she dashes around the target, hacker pop-up windows open all over the screen;
  // when the cuts end they glitch shut one by one. Drawn on the HUD camera, in screen pixels.
  stepHackWindows(U, L) {
    const m = this.match, cutsEnd = L.cuts * L.cutEvery + 4;
    if (!U.hack) U.hack = { wins: [], n: 0 };
    const H = U.hack, R = Math.random;
    if (U.ct < cutsEnd && U.ct % 7 === 3 && H.wins.length < 16) {           // a new window pops open
      const hex = () => Array.from({ length: 4 }, () => Math.floor(R() * 65536).toString(16).toUpperCase().padStart(4, '0')).join(' ');
      const pct = Math.min(99, Math.round(U.cut / L.cuts * 100));
      const T = [
        ['ERROR', 'ACCESS DENIED\n0x0000DEAD'], ['cut.exe', 'SLICING TARGET...\n[' + '#'.repeat(Math.round(pct / 10)) + '-'.repeat(10 - Math.round(pct / 10)) + '] ' + pct + '%'],
        ['C:\\>', '> sudo slice\n> rm -rf hp/'], ['WARNING', 'TARGET.SYS IS NOT\nRESPONDING'], ['memdump', hex() + '\n' + hex()],
        ['trace.log', '> tracing...\n> LOCK ' + Math.floor(R() * 900 + 100) + '.' + Math.floor(R() * 255)], ['FATAL', 'DEFENSE.DLL\nNOT FOUND'], ['upload', 'PAYLOAD 1/1\n' + '|'.repeat(4 + Math.floor(R() * 8))],
      ];
      const [title, body] = T[Math.floor(R() * T.length)];
      const w = 96 + Math.floor(R() * 40), h = 40, x = 8 + Math.floor(R() * (VIEW_W - w - 16)), y = 40 + Math.floor(R() * (VIEW_H - h - 120));
      const z = 50 + (H.n++) * 0.01;                                         // each window stacks over the last, its text with it
      const g = m.add.graphics().setDepth(z);
      const text = m.add.text(x + 4, y + 13, body, { fontFamily: FONT, fontSize: '6px', color: '#f4f4f0', lineSpacing: 3 }).setDepth(z + 0.005).setVisible(false);
      const tt = m.add.text(x + 3, y + 1, title, { fontFamily: FONT, fontSize: '6px', color: '#0e0e10' }).setDepth(z + 0.005).setVisible(false);
      m.addUI(g, text, tt);
      H.wins.push({ x, y, w, h, g, text, tt, t: 0 });
      sfx('menu', 0.25, 1.4 + R() * 0.8); if (R() < 0.4) sfx('glitch', 0.2, 1.5);
    }
    if (U.ct >= cutsEnd && H.wins.length && U.ct % 3 === 0) {             // the cuts are done: windows close, newest first
      const w = H.wins.pop(); w.g.destroy(); w.text.destroy(); w.tt.destroy(); sfx('glitch', 0.18, 2);
    }
    for (const w of H.wins) {
      const g = w.g; g.clear(); w.t++;
      const k = Math.min(1, w.t / 4), ww = Math.round(w.w * k), hh = Math.round(w.h * k), x = w.x + (w.w - ww) / 2, y = w.y + (w.h - hh) / 2;   // pops open
      const jx = (this.anim + w.x) % 37 === 0 ? 3 : 0;                    // glitch twitch
      g.fillStyle(0xf4f4f0, 1); g.fillRect(x - 1 + jx, y - 1, ww + 2, hh + 2);
      g.fillStyle(0x0e0e10, 1); g.fillRect(x + jx, y + 9, ww, hh - 9);
      for (let i = 0; i < 3; i++) { g.fillStyle(0x0e0e10, 1); g.fillRect(x + ww - 8 - i * 7 + jx, y + 2, 5, 5); }   // title-bar buttons
      w.text.setVisible(k >= 1).setX(w.x + 4 + jx); w.tt.setVisible(k >= 1).setX(w.x + 3 + jx);
    }
  }
  // a line of text in the cutscene's top letterbox, typed out `rate` ticks per letter (0: all at once)
  cutLine(U, text, rate) {
    if (!U.line) {
      const bit = this.style === 'onebit', hero = this.style === 'hero';
      U.line = this.match.add.text(VIEW_W / 2, 17, '', bit
        ? { fontFamily: FONT, fontSize: '12px', color: '#f4f4f0', backgroundColor: '#0e0e10', padding: { x: 6, y: 3 } }
        : hero ? { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ffe14a', stroke: '#2a0408', strokeThickness: 5 }
        : { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#c8102e', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
      this.match.addUI(U.line);
    }
    U.lineFull = text; U.lineRate = rate; U.lineAt = U.ct; U.lineShown = 0;
    if (!rate) U.line.setText(text);
  }
  endBladeLimit() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { this.x = U.origin.x; this.y = U.origin.y; m.frozen = 0; m.cutscene = null; }
    if (U && U.line) U.line.destroy();
    if (U && U.hack) for (const w of U.hack.wins) { w.g.destroy(); w.text.destroy(); w.tt.destroy(); }
    if (U && U.speed) U.speed.destroy();
    this.ult = null; this.invincible = 30; this.grounded = false;
    this.setState('air');
  }

  // 1-BIT Lacy's Thousand Cuts: her sword stays its own size but bursts into black-and-white pixel fire;
  // the slash throws a sweeping wave of that fire out to the full reach of the move (the hitbox).
  drawPixelFire(g, hx, hy, ang, len, power) {
    const W = 0xf4f4f0, B = 0x0e0e10, dx = Math.cos(ang) * this.facing, dy = Math.sin(ang), t = this.anim;
    for (let d = 2; d <= len; d += 3) {
      const bx = hx + dx * d, by = hy + dy * d;
      const h = Math.round((4 + 10 * power) * (0.45 + 0.55 * Math.abs(Math.sin(d * 0.9 + t * 0.55))) * (0.6 + 0.4 * d / len));
      for (let k = 0; k < h; k += 2) {                       // a column of flame blocks licking upward, thinning at the top
        const w = k > h * 0.6 ? 2 : 3, x = Math.round(bx + Math.sin(t * 0.4 + d + k) * (k / 4)) - 1, y = Math.round(by) - k - 2;
        g.fillStyle(B, 1); g.fillRect(x - 1, y - 1, w + 2, 3);
        g.fillStyle((k + (t >> 1)) % 6 < 4 ? W : B, 1); g.fillRect(x, y, w, 2);
      }
    }
    for (let i = 0; i < 3 + power * 4; i++) {               // sparks flying off
      const ph = (t * 2 + i * 13) % 24, d = (i * 7) % len;
      if (ph < 16) { g.fillStyle(i % 2 ? W : B, 1); g.fillRect(Math.round(hx + dx * d + ((i % 3) - 1) * ph * 0.5), Math.round(hy + dy * d - 6 - ph * 1.2), 2, 2); }
    }
  }
  drawBurningSwing(g, L, U) {
    const geo = this.bladeGeom(L, U, this.t), power = U.phase === 'grow' ? Math.min(1, this.t / L.growUntil) : U.phase === 'whiff' ? Math.max(0, 1 - (this.t - L.slashTo) / (L.whiffEnd - L.slashTo)) : 1;
    if (U.phase === 'grow' && this.t === 2) { sfx('flame', 0.8, 0.8); sfx('glitch', 0.5, 0.7); }   // it catches fire
    if (U.phase === 'grow' && this.t % 10 === 0) sfx('flame', 0.3, 1 + power * 0.4);
    this.drawPixelFire(g, geo.hx, geo.hy, geo.ang, 30, power);
    if (U.phase === 'slash') {                               // the fire wave: blocks along the sweep, out to the move's full reach
      const k = Math.min(1, (this.t - L.slashFrom) / (L.slashTo - L.slashFrom));
      for (let s = 0; s < 5; s++) {
        const a = geo.ang - s * 0.22 * k, dx = Math.cos(a) * this.facing, dy = Math.sin(a);
        for (let d = 24; d <= geo.len; d += 6) {
          if ((d + s + this.anim) % 3 === 0) continue;
          const sz = Math.max(2, 6 - s);
          g.fillStyle(0x0e0e10, 1); g.fillRect(Math.round(geo.hx + dx * d) - sz / 2 - 1, Math.round(geo.hy + dy * d) - sz / 2 - 1, sz + 2, sz + 2);
          g.fillStyle(s < 2 || (d >> 3) % 2 ? 0xf4f4f0 : 0x0e0e10, 1); g.fillRect(Math.round(geo.hx + dx * d) - sz / 2, Math.round(geo.hy + dy * d) - sz / 2, sz, sz);
        }
      }
    }
  }
  // Where the giant Limit blade is at tick t: hilt (hx, hy), angle, length and half-width. Used both to
  // draw it and as its hitbox, so the two always match.
  bladeGeom(L, U, t) {
    const RAISED = { x: -27, y: -41, ang: -1.774 }, GUARD = { x: 37, y: -26, ang: 0.59 };
    const ease = (k) => 1 - (1 - k) * (1 - k);
    let pose = RAISED, grow = ease(Math.max(0, Math.min(1, t / L.growUntil)));
    if (U.phase === 'slash') {
      const k = Math.max(0, Math.min(1, (t - L.slashFrom) / (L.slashTo - L.slashFrom)));
      pose = { x: RAISED.x + (GUARD.x - RAISED.x) * k, y: RAISED.y + (GUARD.y - RAISED.y) * k, ang: RAISED.ang + (GUARD.ang - RAISED.ang) * k };
    } else if (U.phase === 'whiff') {
      pose = GUARD; grow = 1 - ease(Math.min(1, (t - L.slashTo) / (L.whiffEnd - L.slashTo)));   // shrinks back to normal
    }
    return { len: 30 + 145 * grow, half: 1.5 + 6 * grow, glow: grow, ang: pose.ang, hx: this.x + this.facing * pose.x, hy: this.y + pose.y };
  }
  drawBladeLimit(g, L, U) {
    const C = this.style === 'hero' ? CRYSTAL_BLADE : L.colors;
    if (U.phase !== 'cutscene' && this.style === 'onebit') return this.drawBurningSwing(g, L, U);
    if (U.phase !== 'cutscene') {
      // Her own sword grows: the blade starts exactly on the sprite's sword (same hilt, angle and length)
      // and stretches into a giant blade of light. Raised pose (attack1 frame 1): hilt (-27,-41), pointing
      // up and slightly back. Guard pose (sword at the shoulder): hilt (37,-26), pointing down and forward.
      const { len, half, glow, ang, hx, hy } = this.bladeGeom(L, U, this.t);
      const dx = Math.cos(ang) * this.facing, dy = Math.sin(ang), nx = -dy, ny = dx;
      const blade = (w, col, a) => {
        g.fillStyle(col, a);
        g.fillPoints([
          { x: hx + nx * w, y: hy + ny * w }, { x: hx + dx * len * 0.88 + nx * w, y: hy + dy * len * 0.88 + ny * w },
          { x: hx + dx * len, y: hy + dy * len },
          { x: hx + dx * len * 0.88 - nx * w, y: hy + dy * len * 0.88 - ny * w }, { x: hx - nx * w, y: hy - ny * w },
        ], true);
      };
      if (this.style === 'onebit') {                                                            // 1-BIT: a hard white blade, black edge, torn by glitches
        blade(half + 2.5, 0xf4f4f0, 1); blade(half + 1, 0x0e0e10, 1); blade(half - 0.5, 0xf4f4f0, 1);
        for (let k = 0; k < 4; k++) {                                                            // glitch slices jumping off the blade
          if (((this.anim >> 1) + k * 3) % 5) continue;
          const d0 = len * (0.2 + k * 0.18), ox = ((this.anim * 7 + k * 13) % 9) - 4;
          g.fillStyle(k % 2 ? 0xf4f4f0 : 0x0e0e10, 1); g.fillRect(Math.round(hx + dx * d0 + ox * 2), Math.round(hy + dy * d0) - 1, 10 + k * 3, 3);
        }
      } else {
      if (glow > 0.05) blade(half + 6, this.pal.mid, (0.2 + 0.1 * Math.sin(this.anim * 0.5)) * glow);   // light around it
      blade(half + 1.5, C.outline, 1);
      blade(half, glow > 0.5 ? C.light : C.mid, 1);                                              // steel brightening into light
      blade(Math.max(0.6, half * 0.45), C.core, 0.6 + 0.4 * glow);
      }
      g.fillStyle(C.outline, 1); g.fillRect(hx - nx * (half + 4) - 1, hy - ny * (half + 4) - 1, 3, 3); g.fillRect(hx + nx * (half + 4) - 1, hy + ny * (half + 4) - 1, 3, 3);
      g.fillStyle(0x929ca0, 1); g.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4);       // hilt in her hands
      if (U.phase === 'grow' && this.t % 3 === 0 && glow < 1) this.match.puff(hx + dx * len, hy + dy * len, 0x9ad8f0, 1);   // sparks at the growing tip
      if (U.phase === 'slash') {                                                                 // swing trail
        for (let k = 1; k < 7; k++) {
          const a2 = ang - k * 0.16;
          g.lineStyle(10 - k, k < 3 ? 0xffffff : 0x9ad8f0, 0.5 - k * 0.06);
          g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a2) * this.facing * len, hy + Math.sin(a2) * len); g.strokePath();
        }
      }
      return;
    }
    // cutscene: every cut leaves a streak of light through the target
    if (U.charge > 0) {                                     // charging the killing slice: the sword raised high, growing and blazing
      const k = U.charge, ease = 1 - (1 - k) * (1 - k);
      const len = 40 + 150 * ease, half = 2 + 7 * ease, ang = -1.774 + Math.sin(this.anim * 0.9) * 0.02 * k;
      const hx = this.x + this.facing * -27, hy = this.y - 41;
      const dx = Math.cos(ang) * this.facing, dy = Math.sin(ang), nx = -dy, ny = dx;
      const blade = (w, col, a) => {
        g.fillStyle(col, a);
        g.fillPoints([{ x: hx + nx * w, y: hy + ny * w }, { x: hx + dx * len * 0.88 + nx * w, y: hy + dy * len * 0.88 + ny * w }, { x: hx + dx * len, y: hy + dy * len },
          { x: hx + dx * len * 0.88 - nx * w, y: hy + dy * len * 0.88 - ny * w }, { x: hx - nx * w, y: hy - ny * w }], true);
      };
      if (this.style === 'onebit') {                                                                  // 1-BIT: a ring of pixel blocks closing in
        const R = (20 + 60 * ease) * (1 - ((this.anim % 20) / 20) * 0.3);
        for (let i = 0; i < 16; i++) { const a = i * 0.3927 + this.anim * 0.05; g.fillStyle(i % 2 ? 0xf4f4f0 : 0x0e0e10, 1); g.fillRect(Math.round(hx + Math.cos(a) * R) - 2, Math.round(hy + Math.sin(a) * R) - 2, 4, 4); }
      } else {
        g.fillStyle(this.pal.mid, 0.12 + 0.18 * k); g.fillCircle(hx, hy, 20 + 60 * ease);               // aura swelling around her
        blade(half + 8 + Math.sin(this.anim * 0.6) * 2, this.pal.mid, 0.3 + 0.2 * k);
      }
      if (this.style === 'onebit') { this.drawPixelFire(g, hx, hy, ang, 30, 0.6 + 0.8 * k); g.fillStyle(0x929ca0, 1); g.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4); return; }   // her own sword, blazing hotter
      else { blade(half + 1.5, C.outline, 1); blade(half, C.light, 1); blade(Math.max(0.6, half * 0.5), C.core, 1); }
      for (let i = 0; i < 10; i++) {                                                                 // light streaming into the blade
        const a = i * 0.63 + this.anim * 0.21, d = (1 - ((this.anim * 3 + i * 17) % 40) / 40) * (50 + 40 * k);
        const tx = hx + dx * len * (0.3 + (i % 5) * 0.15), ty = hy + dy * len * (0.3 + (i % 5) * 0.15);
        g.fillStyle(i % 2 ? 0xffffff : C.light, 1); g.fillRect(Math.round(tx + Math.cos(a) * d), Math.round(ty + Math.sin(a) * d), 2, 2);
      }
      g.fillStyle(0x929ca0, 1); g.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4);
    }
    if (this.style === 'onebit') {                          // 1-BIT cuts: stair-stepped pixel lines, black under white, with a dithered tail
      for (const sl of U.slashes) {
        const k = sl.life / (sl.huge ? 30 : sl.big ? 18 : 10), w = sl.huge ? 8 : sl.big ? 5 : 3;
        const n = Math.ceil(Math.hypot(sl.x2 - sl.x1, sl.y2 - sl.y1) / w);
        for (let i = 0; i <= n; i++) {
          const x = Math.round((sl.x1 + (sl.x2 - sl.x1) * i / n) / w) * w, y = Math.round((sl.y1 + (sl.y2 - sl.y1) * i / n) / w) * w;
          g.fillStyle(0x0e0e10, 1); g.fillRect(x - 1, y - 1, w + 2, w + 2);
          if (k > 0.35 || (i + sl.life) % 2) { g.fillStyle(0xf4f4f0, 1); g.fillRect(x, y, w, w); }
        }
      }
      if (U.from) for (let yy = -44; yy < -4; yy += 2) if ((yy >> 1) % 2) { g.fillStyle(0xf4f4f0, 0.8); g.fillRect(U.from.x - 6, U.from.y + yy, 12, 1); }   // scanline afterimage
      return;
    }
    for (const sl of U.slashes) {
      const k = sl.life / (sl.huge ? 30 : sl.big ? 18 : 10), w = sl.huge ? 18 : sl.big ? 10 : 5;
      g.lineStyle(w + 6, this.pal.mid, 0.35 * k); g.beginPath(); g.moveTo(sl.x1, sl.y1); g.lineTo(sl.x2, sl.y2); g.strokePath();
      g.lineStyle(w, 0xffffff, 0.95 * k); g.beginPath(); g.moveTo(sl.x1, sl.y1); g.lineTo(sl.x2, sl.y2); g.strokePath();
    }
    if (U.from) { g.fillStyle(0x9ad8f0, 0.35); g.fillRect(U.from.x - 6, U.from.y - 44, 12, 40); }   // afterimage where she just was
  }
}
