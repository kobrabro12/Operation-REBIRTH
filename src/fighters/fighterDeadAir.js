// Fighter methods: DEAD AIR (test fighter) - its tape look (colour bleed, tracking lines), REWIND, SIGNAL LOST and
// its Limit, LOOK AWAY. Mixed into the Fighter class (Fighter.js) - `this` is the fighter. Tuning: deadAir.js.
import { sfx } from '../audio/sfx.js';

const TAPE = 90;                                   // how many frames of its own past it keeps for REWIND

export class FighterDeadAir {
  // every frame: remember where it was (REWIND plays this back)
  tapeTick() {
    if (!this.tape) this.tape = [];
    if (this.state === 'attack' && this.move && this.move.rewind) return;   // don't record the rewind itself
    this.tape.push([this.x, this.y]);
    if (this.tape.length > TAPE) this.tape.shift();
  }

  // ---- REWIND (side special): fly back along its own recent path, untouchable, hitting anyone in the way
  rewindStep(m) {
    const R = m.rewind;
    if (this.t === 1) {
      const T = this.tape || [], i = Math.max(0, T.length - R.back);
      this.rewindPath = T.slice(i).reverse();                        // newest to oldest: played backwards
      this.usedDive = true; this.grounded = false; this.platform = null;
      sfx('glitch', 0.7, 0.6); sfx('swing', 0.5, 0.5);
    }
    if (this.t >= R.from && this.t <= R.to && this.rewindPath && this.rewindPath.length) {
      const P = this.rewindPath, k = (this.t - R.from) / (R.to - R.from), j = Math.min(P.length - 1, Math.round(k * (P.length - 1)));
      const [x, y] = P[j];
      this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.lx = this.ly = 0;
      this.invincible = Math.max(this.invincible, 2);
      if (this.t % 2 === 0) this.tapeGhost();
    }
    if (this.t === R.to + 1) { this.vy = -2; this.tape = []; }
  }
  // a faded, colour-split copy left behind (REWIND, SIGNAL LOST)
  tapeGhost() {
    const m = this.match, R = Math.random;
    for (const [c, dx] of [[0xff2040, -3], [0x20e0ff, 3]]) m.particles.push({ x: this.x + dx, y: this.y - 26 + (R() - 0.5) * 30, vx: 0, vy: 0, life: 10, color: c, size: 3, grav: 0 });
    for (let i = 0; i < 4; i++) m.particles.push({ shape: 'pixel2', x: this.x + (R() - 0.5) * 20, y: this.y - R() * 50, vx: (R() - 0.5), vy: 0, life: 12, color: R() < 0.5 ? 0xffffff : 0x8a8a90, grav: 0, drag: 0.9 });
  }

  // ---- SIGNAL LOST (up special): switches off into static and comes back somewhere else
  teleUpB(c, u) {
    const T = u.tele, m = this.match;
    this.vx *= 0.8; this.vy = this.t < T.appear ? Math.min(this.vy * 0.7, 1) : this.vy;
    if (this.t === T.at) {                                             // gone
      this.vanished = true; sfx('glitch', 0.8, 0.5); sfx('buzz', 0.4, 1.4);
      for (let i = 0; i < 18; i++) this.tapeGhost();
      let dx = c.x, dy = c.y;
      if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = -1; }               // no direction held: straight up
      const d = Math.hypot(dx, dy); this.teleTo = { x: this.x + (dx / d) * T.dist, y: this.y + (dy / d) * T.dist };
      if (Math.abs(dx) > 0.3) this.facing = Math.sign(dx);
      this.grounded = false; this.platform = null;
    }
    if (this.vanished && this.t > T.at && this.t < T.appear) {          // static where it used to be
      this.vx = 0; this.vy = 0;
      if (this.t % 2 === 0) m.particles.push({ shape: 'pixel2', x: this.teleTo.x + (Math.random() - 0.5) * 30, y: this.teleTo.y - Math.random() * 50, vx: 0, vy: 0, life: 6, color: Math.random() < 0.5 ? 0xffffff : 0x5a5a62, grav: 0 });
    }
    if (this.t === T.appear) {                                         // back on the air
      this.x = this.teleTo.x; this.y = this.teleTo.y; this.vanished = false; this.vy = -2;
      sfx('glitch', 0.7, 1.2); m.shake(3, 4);
      for (let i = 0; i < 12; i++) this.tapeGhost();
    }
    if (this.t >= u.frames) { this.vanished = false; this.setState('helpless'); }
  }

  // ---- LOOK AWAY (Limit): the broadcast cuts to an alert and a countdown; anyone facing it when it ends sees it
  lookawayLimit(L) {
    const m = this.match;
    if (this.t === 1) { this.ult = { seen: [], safe: [], texts: [] }; sfx('eas', 0.8); }
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    if (!this.grounded) this.vy = Math.min(this.vy, 2);
    if (L.count.includes(this.t)) { sfx('eas', 0.5, 1.2 + L.count.indexOf(this.t) * 0.1); m.shake(2, 4); }
    if (this.t === L.revealAt) {
      sfx('ko', 0.8, 0.5); sfx('glitch', 1, 0.4); m.shake(18, 14);
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn') continue;
        const looking = o.facing === (Math.sign(this.x - o.x) || o.facing);
        if (looking && !o.isIntangible()) {
          U.seen.push(o);
          m.applyHit(o, { h: L.seen, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'look' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, this.x);
          m.popText(o, 'IT SAW YOU', '#ff3a2a');
        } else { U.safe.push(o); m.popText(o, 'SAFE', '#dcd8d0'); }
      }
    }
    if (this.t >= L.frames) { this.clearLookaway(); this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  clearLookaway() { if (this.ult && this.ult.texts) for (const t of this.ult.texts) t.destroy(); }
  drawLookaway(g, L, U) {
    const m = this.match, v = m.worldCam.worldView, t = this.t, R = Math.random;
    const on = t > 6 && t < L.revealAt, x0 = v.x - 4, y0 = v.y - 4, W = v.width + 8, H = v.height + 8;
    if (!U.texts.length) {                                               // the card's text, made once
      const mk = (s, size, col) => { const o = m.add.text(0, 0, s, { fontFamily: '"Press Start 2P", monospace', fontSize: size, color: col, stroke: '#000000', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(40); m.addWorld(o); U.texts.push(o); return o; };
      U.head = mk('EMERGENCY BROADCAST', '10px', '#ffffff'); U.warn = mk('DO NOT LOOK AT IT', '14px', '#ff3a2a'); U.sub = mk('TURN AROUND. FACE AWAY.', '8px', '#ffffff'); U.num = mk('3', '28px', '#ffffff');
    }
    for (const o of U.texts) o.setVisible(on);
    if (on) {
      // colour bars across the top, a black card below, scan lines, the odd tracking tear
      const bars = [0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0];
      const k = Math.min(1, (t - 6) / 10);
      bars.forEach((c, i) => { g.fillStyle(c, 0.85 * k); g.fillRect(x0 + (i * W) / 7, y0, W / 7 + 1, H * 0.34); });
      g.fillStyle(0x000000, 0.82 * k); g.fillRect(x0, y0 + H * 0.34, W, H * 0.66);
      g.fillStyle(0x000000, 0.18 * k); for (let y = y0 + ((t * 2) % 4); y < y0 + H; y += 4) g.fillRect(x0, y, W, 1);
      if (t % 23 < 3) { g.fillStyle(0xffffff, 0.25); g.fillRect(x0, y0 + R() * H, W, 3 + R() * 6); }
      const cx = v.x + v.width / 2, cy = v.y + v.height / 2;
      const left = L.count.filter((c) => t < c).length + (t < L.count[L.count.length - 1] + 24 ? 0 : 0);
      U.head.setPosition(cx, cy - 26); U.warn.setPosition(cx + (t % 30 < 2 ? 2 : 0), cy - 6).setAlpha(t % 20 < 14 ? 1 : 0.4);
      U.sub.setPosition(cx, cy + 14); U.num.setPosition(cx, cy + 50).setText(String(Math.max(1, left)));
    }
    if (t >= L.revealAt && t < L.revealAt + 22) {                         // the reveal: it fills the screen, smiling
      const k = 1 - (t - L.revealAt) / 22, cx = v.x + v.width / 2 + (R() - 0.5) * 8, cy = v.y + v.height / 2;
      g.fillStyle(0x000000, 0.9 * k); g.fillRect(x0, y0, W, H);
      g.fillStyle(0xdcd8d0, k); g.fillEllipse(cx, cy, v.width * 0.42, v.height * 0.8);
      g.fillStyle(0x050507, k); g.fillEllipse(cx - 40, cy - 30, 34, 26); g.fillEllipse(cx + 40, cy - 30, 34, 26);   // the eyes
      g.fillRect(cx - 90, cy + 40, 180, 8);                                                                        // the smile...
      g.fillStyle(0xf4f2ec, k); for (let i = 0; i < 12; i++) g.fillRect(cx - 84 + i * 15, cy + 40, 7, 6);       // ...and its teeth
      g.fillStyle(0xff2040, 0.35 * k); g.fillRect(x0, cy - 40 + (R() - 0.5) * 20, W, 6);
      g.fillStyle(0x20e0ff, 0.35 * k); g.fillRect(x0, cy + 10 + (R() - 0.5) * 20, W, 6);
    }
  }

  // ---- its look: two colour-split copies of the sprite (red one way, cyan the other) and a tracking line
  drawVhs(g, spr) {
    if (!this.vhsGhosts) {
      this.vhsGhosts = [0xff2040, 0x20e0ff].map((c) => { const s = this.scene.add.sprite(0, 0, spr.texture.key).setTint(c).setTintMode(Phaser.TintModes.FILL).setBlendMode(Phaser.BlendModes.ADD); this.match.addWorld(s); return s; });
    }
    const vis = spr.visible && spr.alpha > 0.05 && !this.vanished, j = (this.anim * 7) % 23 < 2 ? 3 : 1;   // now and then the colours slip further
    this.vhsGhosts.forEach((s, i) => {
      s.setVisible(vis); if (!vis) return;
      s.setTexture(spr.texture.key, spr.frame.name).setOrigin(spr.originX, spr.originY).setFlipX(spr.flipX).setScale(spr.scaleX, spr.scaleY).setRotation(spr.rotation)
        .setPosition(spr.x + (i ? j : -j), spr.y).setAlpha(0.32 * spr.alpha).setDepth(spr.depth - 0.01);
    });
    if (this.vanished) spr.setAlpha(0);
    const band = this.anim % 110;
    if (vis && band < 14) {                                              // a tracking line rolling down through it
      const y = this.y - this.body.h - 8 + band * 5;
      g.fillStyle(0xffffff, 0.35); g.fillRect(this.x - 18, y, 36, 1);
      g.fillStyle(0xffffff, 0.12); g.fillRect(this.x - 22, y - 2, 44, 5);
    }
  }
  destroyVhs() { if (this.vhsGhosts) for (const s of this.vhsGhosts) s.destroy(); this.vhsGhosts = null; }
}
