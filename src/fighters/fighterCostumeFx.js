// Fighter methods: Costume effects drawn around the fighter: Samurai spin dragon, milestone auras, afterimage trails.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.

export class FighterCostumeFx {

  // SAMURAI costume's Cyclone Slash: a red-and-gold Eastern dragon chasing its tail around her.
  // The head leads at angle `head` on the ellipse (rx, ry) and the long body trails behind, rippling.
  drawSpinDragon(front, cx, cy, rx, ry, head, fade, big) {
    const back = this.fxBack, layer = (a) => (Math.sin(a) < 0 ? back : front);   // the upper half of the loop is behind her
    ry = Math.max(ry, 18 * big);
    const f = this.facing, N = 64, pts = [];
    for (let k = 0; k < N; k++) {
      const a = head - k * 0.1 * f;
      const wob = Math.sin(k * 0.55 - this.anim * 0.45) * 3 * big;
      pts.push({ x: cx + Math.cos(a) * (rx + wob * 0.6), y: cy + Math.sin(a) * ry + wob, a });
    }
    const thick = (k) => Math.max(1.3, (k < 6 ? 4 + k * 0.35 : 6 - (k - 6) * 0.08) * big);
    const OUT = 0x2a0406, RED = 0xc81e28, LIT = 0xf05a3c, GOLD = 0xf3c358, DGOLD = 0xb07818;
    // tail flame tuft
    const t = pts[N - 1], tp = pts[N - 3];
    let g = layer(t.a);
    for (let i = 0; i < 3; i++) {
      const ang = Math.atan2(t.y - tp.y, t.x - tp.x) + (i - 1) * 0.6 + Math.sin(this.anim * 0.5 + i) * 0.2;
      g.fillStyle(i === 1 ? GOLD : 0xe0702a, 0.95 * fade);
      g.fillTriangle(t.x, t.y - 2, t.x, t.y + 2, t.x + Math.cos(ang) * 10 * big, t.y + Math.sin(ang) * 10 * big);
    }
    // body: dark outline, red scales, gold belly, back to front so the neck sits on top
    for (let pass = 0; pass < 3; pass++) {
      for (let k = N - 1; k >= 1; k--) {
        const p = pts[k], r = thick(k); g = layer(p.a);
        if (pass === 0) { g.fillStyle(OUT, 0.95 * fade); g.fillCircle(p.x, p.y, r + 1); }
        else if (pass === 1) { g.fillStyle((k >> 1) % 2 ? RED : LIT, fade); g.fillCircle(p.x, p.y, r); }
        else {
          g.fillStyle(GOLD, 0.95 * fade); g.fillCircle(p.x, p.y + r * 0.45, r * 0.45);       // belly plates
          if (k % 5 === 0 && k < N - 6) {                                                   // dorsal spines pointing away from her
            const ox = Math.cos(p.a), oy = Math.sin(p.a) * (ry / rx);
            const n = Math.hypot(ox, oy) || 1;
            g.fillStyle(k % 10 ? GOLD : DGOLD, fade);
            g.fillTriangle(p.x - 2, p.y - r * 0.6, p.x + 2, p.y - r * 0.6, p.x + (ox / n) * (r + 5), p.y - r - 3 + (oy / n) * 3);
          }
        }
      }
    }
    // head, facing the way it travels
    const h = pts[0], n1 = pts[3];
    g = layer(h.a);
    const dx = h.x - n1.x, dy = h.y - n1.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, vx = -uy, vy = ux;
    const at = (fwd, side) => [h.x + ux * fwd * big + vx * side * big, h.y + uy * fwd * big + vy * side * big];
    const up = vy < 0 ? 1 : -1;                                         // "up" side of the head on screen
    const tri = (A, B, C, col) => { g.fillStyle(col, fade); g.fillTriangle(A[0], A[1], B[0], B[1], C[0], C[1]); };
    // horns sweeping back
    tri(at(-2, 3 * up), at(0, 4 * up), at(-12, 10 * up), GOLD);
    tri(at(-4, 2 * up), at(-2, 3 * up), at(-13, 6 * up), DGOLD);
    // skull and snout
    g.fillStyle(OUT, fade); g.fillCircle(h.x, h.y, 6.5 * big); { const s = at(6, 0); g.fillCircle(s[0], s[1], 4.5 * big); }
    g.fillStyle(RED, fade); g.fillCircle(h.x, h.y, 5.5 * big); { const s = at(6, 0); g.fillCircle(s[0], s[1], 3.6 * big); }
    // open jaw with fangs
    const jaw = this.anim % 12 < 6 ? 3.5 : 2;
    tri(at(1, -1 * up), at(11, -jaw * up), at(3, -4 * up), LIT);
    tri(at(8, -0.5 * up), at(9, -2.5 * up), at(10, -0.5 * up), 0xffffff);
    // mane tufts behind the head
    tri(at(-3, -4 * up), at(-5, 0), at(-12, -6 * up), GOLD);
    // eye
    { const e = at(2, 2 * up); g.fillStyle(0xfff2a0, fade); g.fillRect(Math.round(e[0]) - 1, Math.round(e[1]) - 1, 3, 2); g.fillStyle(OUT, fade); g.fillRect(Math.round(e[0]) + (ux > 0 ? 1 : -1), Math.round(e[1]) - 1, 1, 2); }
    // long whiskers streaming back
    g.lineStyle(1, GOLD, 0.9 * fade);
    for (const side of [1, -1]) {
      let [px, py] = at(9, side * up * 1.5);
      for (let i = 1; i <= 7; i++) {
        const [qx, qy] = at(9 - i * 3.2, side * up * (1.5 + i * 0.9) + Math.sin(this.anim * 0.4 + i * 0.9) * 1.5);
        g.lineBetween(px, py, qx, qy); px = qx; py = qy;
      }
    }
    // pearl of light it chases
    { const pr = at(20, 0); g.fillStyle(0xfff6d0, 0.6 * fade); g.fillCircle(pr[0], pr[1], 3.5 * big); g.fillStyle(0xffffff, fade); g.fillCircle(pr[0], pr[1], 1.5 * big); }
  }

  // ------------------------------------------------------------------ milestone costume effects
  // Ambient effects around a fighter wearing a milestone costume (skins.js vfx.aura). Higher milestones
  // stack more of them: orbiting wisps, a crown of flames, a halo, wings, bubbles, glowing spots...
  drawSkinAura(g) {
    const a = this.vfx.aura;
    if (!a || this.state === 'respawn' && this.anim % 4 < 2) return;
    const d = this.def, back = this.fxBack, t = this.anim, f = this.facing, R = Math.random, P = this.match.particles;
    const cx = this.x, top = this.y - (d.headTop || d.body.h + 4), mid = this.y - d.body.h * 0.55;
    if (a.wings) {                                   // feathered wings of light behind her back, slowly beating
      const sx = cx - f * 4, sy = this.y - d.body.h * 0.78, flap = Math.sin(t * 0.08);
      for (const far of [1, 0]) {                     // far wing first (dimmer, a little higher), then the near one
        const ox = far ? f * 3 : 0, oy = far ? -3 : 0, lift = flap * (far ? 0.12 : 0.18);
        const arm = [];                               // the wing's leading edge, sweeping up and back
        for (let k = 0; k <= 8; k++) {
          const u = k / 8, rise = 30 * (1 + lift);
          arm.push([sx + ox - f * (u * 26 + u * u * 6), sy + oy - u * rise + u * u * rise * 0.45]);
        }
        for (let k = 8; k >= 1; k--) {                // feathers hanging off the arm: long primaries at the tip
          const [px, py] = arm[k], u = k / 8, len = 12 + u * 18, bk = -f * (0.15 + u * 0.4);
          const ex = px + bk * len, ey = py + len * 0.92 - flap * 2 * u;
          this.fxBack.fillStyle(a.wings[far ? 2 : (k > 5 ? 0 : 1)], far ? 0.55 : 0.9);
          this.fxBack.fillTriangle(px - 3, py, px + 3, py, ex, ey);
          this.fxBack.fillStyle(0xffffff, far ? 0.3 : 0.75); this.fxBack.lineStyle(1, 0xffffff, far ? 0.25 : 0.6);
          this.fxBack.lineBetween(px, py, (px + ex) / 2, (py + ey) / 2);
        }
        for (let k = 0; k < 8; k++) {                 // the arm itself: soft coverts along the top
          const [ax, ay] = arm[k], [bx, by] = arm[k + 1];
          this.fxBack.lineStyle(4 - (k >> 2), a.wings[far ? 2 : 0], far ? 0.6 : 1); this.fxBack.lineBetween(ax, ay, bx, by);
        }
      }
      back.fillStyle(0xffffff, 0.22); back.fillCircle(sx, sy, 6 + Math.sin(t * 0.2));
    }
    if (a.halo !== undefined) {                      // a thin ring of light floating over the head
      const hy = top - 6 + Math.round(Math.sin(t * 0.07));
      back.lineStyle(2, a.halo, 0.9); back.strokeEllipse(cx, hy, 16, 5);
      g.lineStyle(1, 0xffffff, 0.7); g.strokeEllipse(cx, hy, 12, 3);
    }
    if (a.crown) {                                   // a crown of floating flames above the head
      const n = a.crown.n, sp = a.crown.big ? 6 : 5, base = top - 4 + Math.round(Math.sin(t * 0.06));
      g.fillStyle(a.crown.colors[0], 0.22); g.fillEllipse(cx, base - 5, n * sp + 12, 14);
      for (let k = 0; k < n; k++) {
        const off = k - (n - 1) / 2, x = Math.round(cx + off * sp), lift = Math.round((n / 2 - Math.abs(off)) * 2);
        const h = 7 + ((t >> 2) + k * 3) % 3 + (a.crown.big ? 3 : 0), y = base - lift;
        for (let r = 0; r < h; r++) {                // a tapering, flickering tongue of flame
          const u = r / h, w = Math.max(1, Math.round(5 * Math.pow(1 - u, 0.7))), sx = x + Math.round(Math.sin(t * 0.25 + k * 1.3 + r * 0.6) * u * 1.4) - (w >> 1);
          g.fillStyle(a.crown.colors[0], 0.95); g.fillRect(sx, y - r, w, 1);
          if (w >= 3) { g.fillStyle(a.crown.colors[1], 1); g.fillRect(sx + 1, y - r, w - 2, 1); }
          if (r < h * 0.35 && w >= 3) { g.fillStyle(a.crown.colors[2], 1); g.fillRect(sx + (w >> 1), y - r, 1, 1); }
        }
      }
    }
    if (a.coral) {                                   // a crown of coral branches on the hat
      const base = top + 1;
      g.fillStyle(a.coral[1], 1); g.fillRect(Math.round(cx) - 7, base, 15, 2);       // gold band
      for (const [dx, h, br] of [[-5, 7, -1], [0, 10, 1], [5, 7, 1], [-2, 5, 1], [3, 5, -1]]) {
        const x = Math.round(cx + dx);
        g.fillStyle(a.coral[0], 1); g.fillRect(x, base - h, 2, h);
        g.fillRect(x + br * 2, base - h + 2, 2, 1); g.fillRect(x + br * 3, base - h, 1, 3);
        g.fillStyle(a.coral[1], 1); g.fillRect(x, base - h - 1, 2, 1); g.fillRect(x + br * 3, base - h - 1, 1, 1);
      }
    }
    if (a.orbit) {                                   // wisps circling the body, passing behind it
      const o = a.orbit;
      for (let k = 0; k < o.n; k++) {
        const ang = t * 0.06 + k * Math.PI * 2 / o.n, x = cx + Math.cos(ang) * o.r, y = mid + Math.sin(ang) * o.r * 0.35 + Math.sin(t * 0.1 + k) * 3;
        const gg = Math.sin(ang) < 0 ? back : g, c = o.colors[k % o.colors.length];
        for (let j = 1; j <= 4; j++) { const pa = ang - j * 0.12; gg.fillStyle(c, 0.5 - j * 0.1); gg.fillRect(Math.round(cx + Math.cos(pa) * o.r) - 1, Math.round(mid + Math.sin(pa) * o.r * 0.35 + Math.sin(t * 0.1 + k) * 3) - 1, 2, 2); }
        gg.fillStyle(c, 0.3); gg.fillCircle(x, y, 5);
        gg.fillStyle(c, 1); gg.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        gg.fillStyle(0xffffff, 1); gg.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
    }
    if (a.ribbons) {                                 // two ribbons of water coiling around him
      for (let k = 0; k < 2; k++) {
        for (let j = 0; j < 22; j++) {
          const ang = t * 0.05 + k * Math.PI + j * 0.16, x = cx + Math.cos(ang) * 24, y = this.y - 8 - j * 2.2 + Math.sin(ang) * 6;
          const gg = Math.sin(ang) < 0 ? back : g;
          gg.fillStyle(a.ribbons.colors[(j >> 2) % 2], 0.85 - j * 0.03); gg.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 2);
        }
      }
    }
    if (a.spots) {                                   // bioluminescent spots blinking on and off around him
      for (let k = 0; k < a.spots.n; k++) {
        const h = Math.sin(k * 91.7) * 0.5 + 0.5, h2 = Math.sin(k * 37.3) * 0.5 + 0.5;
        const x = cx + (h - 0.5) * d.body.w * 1.6, y = this.y - 6 - h2 * d.body.h * 0.9, on = Math.sin(t * 0.08 + k * 1.7);
        if (on < 0) continue;
        g.fillStyle(a.spots.colors[k % a.spots.colors.length], 0.4 * on); g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        g.fillStyle(0xffffff, on); g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    if (a.bling && !this.match.frozen) {            // BLOCK BOSS: his chain throws off bling; sneaker scuffs when he runs
      if (t % 46 === 0) P.push({ shape: 'glint', x: cx + f * 2, y: this.y - d.body.h * 0.62, vx: 0, vy: 0, life: 10, maxLife: 10, color: 0xffe08a, grav: 0, dir: 1 });
      if (t % 46 === 3) P.push({ shape: 'star', x: cx + f * 4 + (R() - 0.5) * 6, y: this.y - d.body.h * 0.66, vx: 0, vy: -0.3, life: 14, color: 0xfff0a8, grav: 0 });
      if (this.grounded && Math.abs(this.vx) > 2.5 && t % 6 === 0) P.push({ shape: 'smoke', x: cx - f * 8, y: this.y - 2, vx: -f * 0.4, vy: -0.3, life: 18, maxLife: 18, r: 2, color: 0xd8d4e8, grav: 0 });
    }
    if (a.spooky) {                                  // BONEZ: a ghostly green glow pulsing round him, wisps drifting off
      const pulse = 0.08 + 0.06 * Math.sin(t * 0.08);
      back.fillStyle(0x9aff6a, pulse); back.fillEllipse(cx, this.y - d.body.h * 0.5, d.body.w * 2.4, d.body.h * 1.5);
      back.fillStyle(0x9aff6a, pulse * 0.8); back.fillEllipse(cx, this.y - d.body.h * 0.5, d.body.w * 1.6, d.body.h * 1.1);
      if (!this.match.frozen && t % 8 === 0) P.push({ shape: 'wisp', x: cx + (R() - 0.5) * d.body.w * 1.6, y: this.y - R() * d.body.h, vx: (R() - 0.5) * 0.3, vy: -0.6 - R() * 0.5, life: 36 + R() * 20, color: R() < 0.7 ? 0x9aff6a : 0xe8ffd8, grav: -0.01, sway: R() * 6 });
    }
    if (a.inferno) {                                 // INFERNO: heat glow round his burning hair, embers, a scorched trail
      const hy = top + 6, fl = 0.16 + 0.06 * Math.sin(t * 0.5);
      back.fillStyle(0xff7a1a, fl); back.fillCircle(cx - f * 3, hy, 14);
      back.fillStyle(0xffd060, fl * 0.8); back.fillCircle(cx - f * 3, hy, 8);
      g.fillStyle(0xff7a1a, 0.18); g.fillEllipse(cx, this.y + 1, 26, 5);
      if (!this.match.frozen) {
        if (t % 3 === 0) P.push({ x: cx - f * (2 + R() * 10), y: top - R() * 4, vx: -f * (0.3 + R() * 0.6), vy: -0.8 - R() * 1.2, life: 20 + R() * 24, color: [0xffd060, 0xff7a1a, 0xff3a1a][t % 3], size: 1 + (R() < 0.3), grav: -0.01, sway: R() * 6 });
        if (this.grounded && Math.abs(this.vx) > 2 && t % 4 === 0) {
          P.push({ x: cx - f * 6, y: this.y - 1, vx: 0, vy: -0.6 - R(), life: 14, color: R() < 0.5 ? 0xff7a1a : 0xffd060, size: 2, grav: -0.02 });
          P.push({ shape: 'smoke', x: cx - f * 8, y: this.y - 3, vx: -f * 0.3, vy: -0.4, life: 24, maxLife: 24, r: 2, color: 0x2a1e1e, grav: -0.01 });
        }
      }
    }
    if (!this.match.frozen) {                        // particles that drift off the body
      if (a.motes && t % a.motes.rate === 0) {
        const c = a.motes.colors[(t / a.motes.rate) % a.motes.colors.length | 0];
        if (a.motes.feathers && t % (a.motes.rate * 3) === 0) P.push({ shape: 'feather', x: cx - f * 6 + (R() - 0.5) * 30, y: this.y - d.body.h, vx: (R() - 0.5) * 0.5, vy: 0.2, life: 70, color: c, grav: 0.004, sway: R() * 6 });
        else P.push({ x: cx + (R() - 0.5) * d.body.w * 1.4, y: this.y - R() * d.body.h, vx: 0, vy: -0.3 - R() * 0.4, life: 30 + R() * 20, color: c, size: 1 + (R() < 0.4), grav: -0.004 });
      }
      if (a.bubbles && t % a.bubbles.rate === 0) P.push({ shape: 'bubble', x: cx + (R() - 0.5) * d.body.w * 1.4, y: this.y - R() * d.body.h * 0.8, vx: 0, vy: -0.4 - R() * 0.4, life: 40 + R() * 20, color: a.bubbles.colors[(t / a.bubbles.rate) % a.bubbles.colors.length | 0], grav: -0.01, r: 1 + Math.floor(R() * 2), sway: R() * 6 });
    }
  }

  // Afterimages (the 100-KO costumes): faded copies of the last few frames trail behind when moving fast.
  drawTrail(spr) {
    if (!this.ghosts.length) return;
    const h = this.trailHist;
    h.push({ x: spr.x, y: spr.y, key: spr.texture.key, frame: spr.frame.name, flip: spr.flipX, rot: spr.rotation, sx: spr.scaleX, sy: spr.scaleY, ox: spr.originX, oy: spr.originY });
    if (h.length > 12) h.shift();
    const fast = Math.hypot(this.vx + this.lx, this.vy + this.ly) > 2.6 || ['attack', 'upb', 'airdodge', 'roll', 'limit', 'counterstrike'].includes(this.state);
    this.ghosts.forEach((gh, i) => {
      const e = h[h.length - 1 - (i + 1) * 3];
      if (!fast || !e) { gh.setVisible(false); return; }
      gh.setVisible(true).setTexture(e.key, e.frame).setPosition(e.x, e.y).setFlipX(e.flip).setRotation(e.rot).setScale(e.sx, e.sy).setOrigin(e.ox, e.oy)
        .setTint(this.vfx.trail).setTintMode(Phaser.TintModes.FILL).setAlpha(0.42 - i * 0.12);
    });
  }
}
