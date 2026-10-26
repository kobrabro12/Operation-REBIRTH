// Fighter methods: WHAT ONCE WAS (test fighter) - its SIGNAL meter and CHANNEL menu, CHANNEL SURF, MISSING
// posters, the WRONG DOOR, OUT OF BODY (its TV head and the bodies it grows), its screen beams, and its Limit, LEVEL 0 (the Backrooms
// chase). Mixed into the Fighter class (Fighter.js) - `this` is the fighter. A few methods (markMissing,
// drawMissingMark) are used on whoever it hits, so they work on any fighter.
import { sfx } from '../audio/sfx.js';
import { PHYS } from '../config.js';
import { drawDoor, drawPoster, drawCursor } from './entities.js';
import { WOW_SCREENS, WOW_HEAD } from './wowScreens.js';
import { skinSheets, skinTexture, skinInfo } from './skins.js';
import { newAttackId } from './attackIds.js';

// LEVEL 0's hallway, in each costume's version of the Backrooms
const HALLS = {
  default: { wall: 0xd4c06a, stripe: 0xb8a24c, ceil: 0xe6dca8, tile: 0xc8bc88, carpet: 0x8f7d45, carpetDark: 0x6e5f32, skirt: 0xa08c40, lit: 0xfffbe0, dead: 0x5a5440, thing: [0x070504, 0x1c130c, 0x3a2a1c], eyes: 0xffffff, mouth: 0x2a0806, teeth: 0xe8e0c8 },
  // FRUTIGER: a glossy aqua-sky office hallway, white tiles, bubbles - and something dark teal in it
  wowAero: { wall: 0x8adcf0, stripe: 0xc8f4ff, ceil: 0xf4fbff, tile: 0xb8e4f2, carpet: 0xe6f4fb, carpetDark: 0x9ac8dc, skirt: 0x3fc8ea, lit: 0xffffff, dead: 0x6a9aac, thing: [0x02141c, 0x0a2e3a, 0x1a6a80], eyes: 0x9ff0ff, mouth: 0x02343e, teeth: 0xffffff },
  // ROOT ACCESS: a wireframe corridor on black, green phosphor
  wowHack: { wall: 0x041008, stripe: 0x0e3a1a, ceil: 0x020804, tile: 0x1a6a2a, carpet: 0x020a04, carpetDark: 0x1a6a2a, skirt: 0x3ae060, lit: 0x9affb0, dead: 0x0e2a14, thing: [0x000000, 0x041a08, 0x0e4a1a], eyes: 0x3ae060, mouth: 0x000000, teeth: 0x9affb0 },
  // RONIN: shoji walls, tatami floor, paper lanterns - and an ink-black oni
  wowRonin: { wall: 0xf0e4c8, stripe: 0x3a2a1a, ceil: 0x4a3426, tile: 0x2a1c12, carpet: 0xb8a468, carpetDark: 0x6a5a30, skirt: 0x3a2a1a, lit: 0xff8a5a, dead: 0x5a3a2a, thing: [0x0a0606, 0x1e1010, 0x5a1010], eyes: 0xff3a2a, mouth: 0x8a0a0a, teeth: 0xf0e8d8 },
  // DIAL-UP: a teal desktop for walls with windows open on it, grey office carpet - and a blue-screen thing in it
  wowDial: { wall: 0x108484, stripe: 0x0a6a6a, ceil: 0xc0c0c0, tile: 0x808080, carpet: 0x5a6a8a, carpetDark: 0x3a4a6a, skirt: 0x808080, lit: 0xffffff, dead: 0x606060, thing: [0x000020, 0x0a1a6a, 0x2a5ad8], eyes: 0xffffff, mouth: 0x000000, teeth: 0xffffff },
};
// the costume's effect colours: beams, static
const FXS = {
  default: { beam: [0xfff6b0, 0xffffff, 0xffffff], beamRed: [0xa8140e, 0xff4a3a, 0xffd0c0], car: [0x2e2a22, 0x3e382c, 0x7a7468, 0x4a463c], cable: 0x16120a },
  wowAero: { beam: [0x3fc8ea, 0xc8f8ff, 0xffffff], beamRed: [0xc0408a, 0xff7ac0, 0xffe0f0], car: [0x9adcf0, 0xc8f0fa, 0xffffff, 0x3fb8d8], cable: 0x6fd03a },
  wowHack: { beam: [0x157a2e, 0x3ae060, 0xb8ffc8], beamRed: [0x7a0a0a, 0xff2a2a, 0xffb0a0], car: [0x020a04, 0x0e3a1a, 0x3ae060, 0x1a6a2a], cable: 0x3ae060 },
  wowDial: { beam: [0x0a2484, 0x2a6ad8, 0xffffff], beamRed: [0x8a0000, 0xff2a1a, 0xffd0c0], car: [0xc0c0c0, 0xd8cfb0, 0x0a2484, 0x808080], cable: 0xb0b0b0 },
  wowRonin: { beam: [0xd9a32e, 0xffe08a, 0xffffff], beamRed: [0x5a0a0a, 0xe02a1a, 0xffd060], car: [0x241c22, 0x3a2a1a, 0xd9a32e, 0xb82a22], cable: 0xb82a22 },
};

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
  get styleKey() { return HALLS[this.style] ? this.style : 'default'; }
  hall() { return HALLS[this.styleKey]; }
  fxs() { return FXS[this.styleKey]; }

  // ---- the MODE screen: an animated picture (mode_screens.png) placed exactly over its TV's screen in
  // every frame (wowScreens.js says where), so SEE's eye can look about and SMILE's grin can glitch
  // Its body sheets have no head: the TV is drawn here, wherever wowScreens.js says the head is in the sprite's
  // current frame (any body wears any costume's TV), with its MODE face over the screen once it has one.
  headXform(spr) {
    const S = this.sheets, key = spr.texture.key;
    const kind = key === S.moves ? 'moves' : key === S.idle ? 'idle' : key === S.run ? 'run' : key === S.jump ? 'jump' : key === S.fall ? 'fall' : null;
    const tr = (kind && WOW_SCREENS[kind][+spr.frame.name]) || WOW_SCREENS.idle[0];
    const big = kind === 'moves', ox = big ? 56 : 32, oy = big ? 95 : 59, flip = spr.flipX ? -1 : 1;
    const dx = (tr[0] / 10 - ox) * flip * spr.scaleX, dy = (tr[1] / 10 - oy) * spr.scaleY, r = spr.rotation, c = Math.cos(r), sn = Math.sin(r);
    return { x: spr.x + dx * c - dy * sn, y: spr.y + dx * sn + dy * c, rot: r + flip * tr[2] * Math.PI / 180, flip, sx: tr[3] / 100 * spr.scaleX, sy: tr[4] / 100 * spr.scaleY, scr: tr[5] || 0 };
  }
  drawHead(spr) {
    if (!this.headImg) {
      const set = skinInfo(this.def.id, this.skin).sheetSet;
      this.headKey = set ? 'wow_heads' : skinTexture(this.scene, 'wow_heads', this.def.id, this.skin);   // plain costumes recolour the TV like the body
      this.headImg = this.scene.add.image(0, 0, this.headKey, 0).setOrigin(WOW_HEAD.ox / WOW_HEAD.w, WOW_HEAD.oy / WOW_HEAD.h);
      if (this.scrImg) this.scrImg.destroy();
      this.scrImg = this.scene.add.image(0, 0, 'wow_modescr', 0).setOrigin(0.5);
      if (this.faceImg) this.faceImg.destroy();
      this.faceImg = this.scene.add.image(0, 0, 'wow_faces', 0).setOrigin(0.5);
      this.match.addWorld(this.headImg, this.scrImg, this.faceImg);
    }
    const head = this.headImg, img = this.scrImg, U = this.def.moves.upb, s = this.state;
    let X = this.headXform(spr), alpha = spr.alpha;
    if (this.headless) {                                             // OUT OF BODY: the TV on its own
      const R = U.regrow, f = this.facing < 0 ? -1 : 1;
      const loose = { x: this.x, y: this.y - 10, rot: this.grounded ? 0 : this.tvSpin, flip: f, sx: 1, sy: 1, scr: (this.anim >> 3) % 2 ? 1 : 2 };   // flashing WARNING / MISSING
      if (s === 'regrow' && this.tvAt) {
        const floor = { ...loose, x: this.tvAt.x, y: this.tvAt.y - 10, rot: 0, scr: 0 };
        const k = Math.max(0, Math.min(1, (this.t - R.pickAt) / (R.placeAt - R.pickAt))), e = k * k * (3 - 2 * k);
        X = k <= 0 ? floor : { ...X, x: floor.x + (X.x - floor.x) * e, y: floor.y + (X.y - floor.y) * e - Math.sin(k * Math.PI) * 8, rot: X.rot * e, scr: 0 };
      } else { X = loose; alpha = this.isIntangible() && (this.anim >> 2) % 2 ? 0.45 : 1; spr.setAlpha(0); }
    }
    if (!spr.visible || !this.alive) { head.setVisible(false); img.setVisible(false); this.faceImg.setVisible(false); return; }
    const row = this.def.screenRow[this.styleKey] || 0;
    head.setFrame(row * WOW_HEAD.screens + X.scr).setPosition(X.x, X.y).setRotation(X.rot).setFlipX(X.flip < 0).setScale(X.sx, X.sy)
      .setAlpha(alpha).setDepth(spr.depth).setTint(spr.tintTopLeft).setTintMode(spr.tintMode).setVisible(alpha > 0.02);
    const mode = this.wowMode, face = !mode && !this.headless && alpha >= 0.05 && !(this.flash > 0) && !(this.silhouette > 0) ? this.screenFace() : -1;
    if (face >= 0) {                                                 // one of Mason's faces on the screen (a flicker as it tunes in)
      this.faceImg.setFrame(row * 3 + face).setPosition(X.x, X.y).setRotation(X.rot).setFlipX(X.flip < 0)
        .setScale(X.sx, X.sy).setAlpha(alpha * ((this.anim - (this.faceFrom || 0)) < 4 && this.anim % 2 ? 0.4 : 1)).setDepth(spr.depth).setVisible(true);
    } else this.faceImg.setVisible(false);
    if (!mode || alpha < 0.05 || this.flash > 0 || this.silhouette > 0) { img.setVisible(false); return; }
    const a = this.anim, mi = { see: 0, incoming: 1, smile: 2 }[mode];
    const sub = mode === 'see' ? [0, 0, 1, 0, 2, 0, 0, 3][(a >> 4) % 8] : mode === 'incoming' ? (a >> 2) % 4 : ((a * 7) % 53 < 4 ? 1 + ((a >> 1) % 3) : 0);
    img.setFrame(row * 12 + mi * 4 + sub).setPosition(X.x, X.y).setRotation(X.rot).setFlipX(X.flip < 0)
      .setScale(X.sx, X.sy).setAlpha(alpha).setDepth(spr.depth).setVisible(true);
  }
  hideModeScreen() { if (this.scrImg) this.scrImg.setVisible(false); if (this.headImg) this.headImg.setVisible(false); if (this.faceImg) this.faceImg.setVisible(false); }
  // which of Mason's faces (faces.png: 0 grimace, 1 staring tongue-out, 2 toothy grin) its screen shows now, or -1:
  // the grimace while it's hurt, the stare while it taunts, the grin for a moment after it lands a hit - and now
  // and then one of them flickers on all by itself
  screenFace() {
    const dealt = this.stats ? this.stats.damageDealt : 0;
    if (dealt > (this.faceDealt ?? dealt)) { this.faceIdx = 2; this.faceUntil = this.anim + 36; }
    this.faceDealt = dealt;
    let f = -1;
    if (this.state === 'hitstun' || this.state === 'dizzy') f = 0;
    else if (this.state === 'taunt') f = 1;
    else if ((this.faceUntil || 0) > this.anim) f = this.faceIdx;
    else { const c = this.anim + this.slot * 211; if (c % 540 < 48) f = Math.floor(c / 540) % 3; }   // every 9 s or so, for under a second
    if (f !== this.faceWas) { this.faceWas = f; this.faceFrom = this.anim; }
    return f;
  }

  // ---- OUT OF BODY (up special): it heaves and its TV launches off its neck - the player flies as the TV,
  // hitting anyone above. The body it left slumps and sinks into the floor. Wherever the TV lands, a new body
  // grows up out of the floor (a random one of def.bodies, never the one it just had), picks the TV up and puts
  // it on. It keeps that body until its next up special (or until it's KO'd).
  tvUpB(c, u) {
    if (this.t < u.launchAt) { this.vy = 0; this.vx *= 0.7; return; }
    if (this.t === u.launchAt) this.launchTv(u);
    this.vx = c.x * u.drift * this.speedMult;
    this.tvSpin += 0.32 * this.facing;
    if (this.t % 3 === 0) this.match.particles.push({ shape: 'pixel2', x: this.x + (Math.random() - 0.5) * 10, y: this.y - 2, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random(), life: 14, color: [this.pal.light, 0xffffff, this.pal.deep][this.t % 3], drag: 0.9, grav: 0 });
    if (this.t >= u.frames) this.setState('helpless');
  }
  launchTv(u) {
    this.dropBody();
    this.headless = true; this.bodyOverride = u.tv; this.tvSpin = 0;
    this.y -= u.neck; this.vy = u.launchV; this.grounded = false; this.platform = null;
    sfx('djump', 0.7, 0.6); sfx('glitch', 0.45, 0.8);
    this.match.puff(this.x, this.y + 6, this.fxColor, 8);
  }
  // the body it leaves behind plays body_drop on its own, then sinks away (or falls, if it was in the air)
  dropBody() {
    const d = this.def, A = d.moveAnims.body_drop;
    const spr = this.scene.add.sprite(Math.round(this.x), Math.round(this.y), this.sheets.moves, A[0]).setOrigin(d.movesOrigin[0], d.movesOrigin[1])
      .setFlipX(this.facing < 0).setTint(this.sprite.tintTopLeft).setDepth(this.sprite.depth - 0.1);
    this.match.addWorld(spr);
    (this.leftBodies ||= []).push({ spr, born: this.age, y: spr.y, air: !this.grounded });
  }
  stepBodies() {
    if (!this.leftBodies || !this.leftBodies.length) return;
    const A = this.def.moveAnims.body_drop, end = A[1] * A[2];
    for (const b of this.leftBodies) {
      const t = this.age - b.born;                                   // game frames since it was left (so it keeps time with the match)
      b.spr.setFrame(A[0] + Math.min(A[1] - 1, Math.floor(t / A[2])));
      if (b.air) { b.spr.y = b.y + Math.min(t * t * PHYS.gravity / 2, t * PHYS.maxFall); b.spr.setAlpha(Math.max(0, 1 - t / 60)); }
      else if (t > end) {                                            // sinking into the carpet in a fizz of static
        const k = (t - end) / 40; b.spr.setAlpha(Math.max(0, 1 - k)); b.spr.y = b.y + (t - end) * 0.35;
        if (t % 3 === 0) this.match.particles.push({ shape: 'pixel2', x: b.spr.x + (Math.random() - 0.5) * 30, y: b.spr.y - Math.random() * 14, vx: 0, vy: -0.6, life: 16, color: Math.random() < 0.5 ? 0xf0f0f0 : 0x4a4a4a, grav: 0 });
      }
      if (b.spr.alpha <= 0.01) { b.spr.destroy(); b.dead = true; }
    }
    this.leftBodies = this.leftBodies.filter((b) => !b.dead);
  }
  clearBodies() { for (const b of this.leftBodies || []) b.spr.destroy(); this.leftBodies = []; }
  // every frame (Fighter.step): a TV on the ground grows a body
  bodyTick() {
    const s = this.state;
    if (this.regrowing && s !== 'regrow') this.finishRegrow();     // knocked out of it: the TV's on anyway
    if (this.headless && this.grounded && !['regrow', 'hitstun', 'grabbed', 'seized', 'dying', 'respawn', 'limit', 'upb'].includes(s)) this.startRegrow();
  }
  startRegrow() {
    const pool = this.def.bodies.filter((b) => b !== (this.bodyKind || 'self'));
    this.setBody(pool[Math.floor(Math.random() * pool.length)]);
    this.bodyOverride = null; this.regrowing = true; this.vx = 0;
    this.tvAt = { x: this.x + this.facing * 16, y: this.y };
    this.setState('regrow');
    sfx('glitch', 0.4, 0.6); this.match.puff(this.x, this.y, this.fxColor, 6);
  }
  st_regrow() {
    const R = this.def.moves.upb.regrow;
    this.t += R.speed - 1;                                          // the 64-frame growth plays a little faster
    if (this.headless && this.t >= R.placeAt) { this.headless = false; sfx('land', 0.5, 0.6); sfx('buzz', 0.3, 1.4); this.match.puff(this.x, this.y - 50, this.fxColor, 5); }
    if (this.t >= R.frames) { this.regrowing = false; this.setState('idle'); }
  }
  finishRegrow() { this.headless = false; this.regrowing = false; this.bodyOverride = null; }
  // which body it's wearing: 'self' (the costume's own) or one of def.bodySheets
  setBody(kind) {
    this.bodyKind = kind;
    this.sheets = kind === 'self' ? skinSheets(this.scene, this.def, this.skin) : { ...this.def.bodySheets[kind] };
  }

  // ---- the costume's own ambient effects (FRUTIGER / ROOT ACCESS / RONIN)
  drawStyleAura(g) {
    const R = Math.random, P = this.match.particles, t = this.anim, k = this.styleKey;
    if (k === 'wowAero') {                                           // glossy bubbles drifting up off it, a soft sky-blue glow
      if (t % 9 === 0) P.push({ shape: 'bubble', x: this.x + (R() - 0.5) * 28, y: this.y - 10 - R() * 40, vx: (R() - 0.5) * 0.4, vy: -0.5 - R() * 0.6, life: 40 + R() * 20, color: R() < 0.5 ? 0x9ff0ff : 0xffffff, grav: -0.01, r: 1 + Math.floor(R() * 3), sway: R() * 6 });
      if (t % 40 === 0) P.push({ shape: 'glint', x: this.x - 6, y: this.y - 56, vx: 0, vy: 0, life: 8, maxLife: 8, color: 0xffffff, grav: 0, dir: 1 });
    } else if (k === 'wowHack') {                                    // green code raining off it; now and then it glitches sideways
      if (t % 4 === 0) P.push({ shape: 'pixel2', x: this.x + (R() - 0.5) * 30, y: this.y - 64 + R() * 10, vx: 0, vy: 1.2 + R(), life: 22 + R() * 10, color: R() < 0.7 ? 0x3ae060 : 0xb8ffc8, grav: 0 });
      if ((t * 13) % 97 < 3) { g.fillStyle(0x3ae060, 0.35); g.fillRect(this.x - 14 + (R() - 0.5) * 8, this.y - 40 + (R() - 0.5) * 30, 28, 2); }
    } else if (k === 'wowDial') {                                    // a mouse cursor tags along and clicks, an hourglass spins by its head
      this.drawDialAura(g, t, R, P);
    } else if (k === 'wowRonin') {                                   // sakura petals in the air around it, a faint red battle aura
      if (t % 11 === 0) P.push({ shape: 'sakura', x: this.x + (R() - 0.5) * 60, y: this.y - 70 - R() * 20, vx: -0.3 - R() * 0.4, vy: 0.4 + R() * 0.3, life: 60, color: R() < 0.6 ? 0xffb7c5 : 0xffffff, grav: 0, sway: R() * 6 });
      g.fillStyle(0xb82a22, 0.05 + 0.03 * Math.sin(t * 0.1)); g.fillEllipse(this.x, this.y - 30, 44, 70);
    }
  }

  drawDialAura(g, t, R, P) {
    // the cursor: drifts after it (a little behind and above), now and then "clicks" with a ring
    const tx = this.x - this.facing * 22, ty = this.y - 70;
    if (this.cursorX == null) { this.cursorX = tx; this.cursorY = ty; }
    this.cursorX += (tx - this.cursorX) * 0.06 + Math.sin(t * 0.05) * 0.4; this.cursorY += (ty - this.cursorY) * 0.06 + Math.cos(t * 0.07) * 0.3;
    const cx = Math.round(this.cursorX), cy = Math.round(this.cursorY), click = t % 90;
    if (click < 8) { g.lineStyle(1, 0xffffff, 1 - click / 8); g.strokeCircle(cx, cy, 2 + click); }
    drawCursor(g, cx, cy, click < 4 ? 1 : 0);
    // the hourglass, spinning when it's standing still
    if (this.state === 'idle') {
      const hx = this.x + this.facing * 16, hy = this.y - 72 + Math.round(Math.sin(t * 0.08) * 2), flip = Math.floor(t / 30) % 2;
      g.fillStyle(0x000000, 1); g.fillRect(hx - 3, hy - 5, 7, 1); g.fillRect(hx - 3, hy + 5, 7, 1);
      g.fillStyle(0xffffff, 1); g.fillTriangle(hx - 2, hy - 4, hx + 3, hy - 4, hx + 0.5, hy); g.fillTriangle(hx - 2, hy + 4, hx + 3, hy + 4, hx + 0.5, hy);
      g.fillStyle(0xd8cfb0, 1); if (flip) g.fillRect(hx - 1, hy + 2, 3, 2); else g.fillRect(hx - 1, hy - 3, 3, 2);
      g.fillStyle(0xd8cfb0, 1); g.fillRect(hx, hy, 1, 2);
    }
    // little error windows popping off it now and then
    if (t % 70 === 0) P.push({ shape: 'win95', x: this.x + (R() - 0.5) * 30, y: this.y - 40 - R() * 20, vx: (R() - 0.5) * 0.6, vy: -0.4, life: 40, color: 0x0a2484, grav: 0 });
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

  // ---- a beam out of its screen (def move.beam): white light (CRT BLAST) or a column of red static (ANTENNA SURGE)
  drawBeam(g, B) {
    const a = B.angle * Math.PI / 180, dx = Math.cos(a) * this.facing, dy = Math.sin(a);
    const ox = this.x + this.facing * B.ox, oy = this.y + B.oy, k = (this.t - B.from) / Math.max(1, B.to - B.from);
    const grow = Math.min(1, (this.t - B.from + 1) / 3), fade = Math.min(1, (B.to - this.t + 1) / 4) * (this.anim % 4 === 0 ? 0.7 : 1);
    const len = B.len * grow, px = -dy, py = dx, ex = ox + dx * len, ey = oy + dy * len, w = B.w * (1 - 0.3 * k);
    const [c1, c2, c3] = B.red ? this.fxs().beamRed : this.fxs().beam;
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
    this.drawSignal(g, spr); this.drawCord(g); this.drawStyleAura(g); this.stepBodies();
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
        drawDoor(this.fxBack, this.walkFrom.x, this.walkFrom.y, open, 1, false, this.style);
        spr.setAlpha(fade);
      } else if (this.walkTo) {
        const st = t - W.swapAt, close = Math.max(0, (st - 8) / 6);
        drawDoor(this.fxBack, this.walkTo.x, this.walkTo.y, 1 - Math.min(1, close), Math.min(1, 1.6 - close), false, this.style);
        spr.setAlpha(Math.min(1, st / 6));
      }
    }
    if (s === 'limit' && this.ult && this.def.limit.type === 'level0') this.drawLevel0(g, this.def.limit, this.ult);
    this.drawHead(spr);                                               // last: the head follows whatever the sprite ended up as
  }

  // ------------------------------------------------------------------ SIGNAL meter and the three MODES
  // The meter (def.signal) fills from damage dealt and taken (MatchScene.applyHit calls addSignal). When it's
  // full, the screen glitches and it TRANSFORMS into one of three modes at random - SEE, INCOMING or SMILE.
  // The mode lasts until it's KO'd; then the meter starts again from empty and the next mode is a new roll.
  // Each mode has a passive and replaces its side special with a brutal command grab (def.modes).
  addSignal(n) {
    const S = this.def.signal; if (!S || this.wowMode) return;
    this.signal = Math.min(S.max, (this.signal || 0) + n);
    if (this.signal >= S.max) this.transform();
  }
  transform() {
    const names = Object.keys(this.def.modes), m = this.match;
    this.wowMode = names[Math.floor(Math.random() * names.length)];
    const M = this.def.modes[this.wowMode];
    this.modeFlash = 30; this.glitchBurst(24);
    sfx('glitch', 1, 0.6); sfx('limitready', 0.7, 0.6); sfx('buzz', 0.6, 0.8); m.shake(6, 10);
    m.popText(this, M.name, M.textColor);
    this.say(M.lines[Math.floor(Math.random() * M.lines.length)], 70, this.vfx && this.vfx.wow ? null : 'taunt');
  }
  get modeDef() { return this.wowMode ? this.def.modes[this.wowMode] : null; }
  // passives, read by Fighter.dmgMult / speedMult, and SMILE's healing (called from Fighter.step)
  get modeDmg() { const M = this.modeDef; return M && M.dmg ? M.dmg : 1; }
  get modeSpeed() { const M = this.modeDef; return M && M.speed ? M.speed : 1; }
  modeTick() {
    const M = this.modeDef; if (!M || !M.heal || !this.alive) return;
    if (this.age % M.heal.every !== 0) return;
    const m = this.match;
    if (m.mode === 'stamina') { if (this.hp >= this.maxHp) return; this.hp = Math.min(this.maxHp, this.hp + M.heal.amount); }
    else { if (this.percent <= 0) return; this.percent = Math.max(0, this.percent - M.heal.amount); }
    m.particles.push({ shape: 'cross', x: this.x + (Math.random() - 0.5) * 18, y: this.y - 40 - Math.random() * 20, vx: 0, vy: -0.5, life: 22, color: this.skinFx('heal', 0x9affb0), grav: 0, r: 2 });
  }
  clearMode() { this.wowMode = null; this.signal = 0; }

  // ---- the mode side specials: a reach (or lunge, or teleport) state, then a hold state once it catches
  startModeSide() {
    const st = this.def.modes[this.wowMode].side;
    this.usedDive = true; this.seized = null; this.lx = this.ly = 0; this.attackId = newAttackId();
    this.setState(st); this.quip('modeSide');
  }
  // whoever is in box [x, y, w, h] in front of it (a grab: shields don't stop it)
  grabTarget(box) {
    const [bx, by, bw, bh] = box, x1 = this.facing > 0 ? this.x + bx : this.x - bx - bw, x2 = x1 + bw, y1 = this.y + by, y2 = y1 + bh;
    for (const o of this.match.fighters) {
      if (o === this || !o.alive || o.team === this.team || o.isIntangible() || ['respawn', 'dying', 'grabbed', 'seized', 'limit'].includes(o.state)) continue;
      const h = o.hurtbox();
      if (h.x1 < x2 && h.x2 > x1 && h.y1 < y2 && h.y2 > y1) return o;
    }
    return null;
  }
  seize(o, holdState) {
    if (o.grabbed) { o.grabbed.grabbedBy = null; o.grabbed.setState('air'); o.grabbed = null; }
    o.stopChargeSound(); o.setState('seized'); o.seizedBy = this; o.vx = o.vy = o.lx = o.ly = 0; o.possessed = 0;
    this.seized = o; this.setState(holdState); this.vx = 0; this.lx = this.ly = 0;
    sfx('shield', 0.7, 0.5);
  }
  // a hit on the held victim that keeps holding them (no knockback); `last` lets it fly
  holdHit(h, tag, last = false) {
    const o = this.seized; if (!o || !o.alive) return;
    this.match.applyHit(o, { h, owner: this, facing: this.facing, id: tag + this.slot + ':' + this.age, pillar: true }, o.x);
    if (!last && o.alive && o.state !== 'dying') { o.setState('seized'); o.lx = o.ly = 0; o.vx = o.vy = 0; }
    if (last) { o.seizedBy = null; this.seized = null; }
  }
  holdAt(x, y) { const o = this.seized; if (!o) return; o.x = x; o.y = y; o.grounded = false; o.platform = null; }
  releaseSeized() { const o = this.seized; if (o) { o.seizedBy = null; if (o.state === 'seized') o.setState('air'); } this.seized = null; }
  endModeSide() { this.releaseSeized(); this.setState(this.grounded ? 'idle' : 'air'); }
  holdFloat() { if (!this.grounded) { this.vy = 0; this.fastFalling = false; } }   // hangs in place while it works on them
  // the victim's side: held still until it's let go (or whoever held them got interrupted)
  st_seized() {
    const by = this.seizedBy;
    if (!by || !by.alive || by.seized !== this || !['see_hold', 'inc_hold', 'smile_hold'].includes(by.state)) { this.seizedBy = null; this.setState('air'); }
  }

  // SEE: the long arm shoots out and grabs them by the neck... a crack... then down into the floor
  st_see_side() {
    const S = this.def.modes.see.grab;
    this.vx *= 0.7; if (!this.grounded) this.vy = Math.min(this.vy, 1);
    if (this.t === S.from) sfx('swing', 0.7, 0.6);
    if (this.t >= S.from && this.t <= S.to) { const o = this.grabTarget(S.box); if (o) return this.seize(o, 'see_hold'); }
    if (this.t >= S.frames) this.endModeSide();
  }
  st_see_hold() {
    const S = this.def.modes.see.grab, o = this.seized, t = this.t, m = this.match;
    if (!o || !o.alive || o.state === 'dying') return this.endModeSide();
    this.holdFloat();
    const lift = Math.min(1, t / 14);
    if (t < S.slamAt) this.holdAt(this.x + this.facing * (44 - 6 * lift), this.y - 6 - 26 * lift);
    if (t === S.snapAt) {                                           // the neck snap
      this.holdHit(S.snap, 'seesnap');
      sfx('clang', 0.9, 0.45); sfx('hit', 0.8, 0.5); m.shake(6, 6); o.snapFx = 18;
      for (let i = 0; i < 8; i++) m.particles.push({ shape: 'shard', x: o.x, y: o.y - o.body.h + 6, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 14, color: 0xffffff, ang: Math.random() * 6, grav: 0.1 });
      m.popText(o, 'CRACK', '#ffffff');
    }
    if (t === S.slamAt) {                                           // then slammed into the floor
      const floor = this.floorUnder(this.x + this.facing * 30);
      this.holdAt(this.x + this.facing * 30, floor ?? this.y);
      if (floor !== null) { o.grounded = true; o.y = floor; }
      this.holdHit(S.slam, 'seeslam', true);
      sfx('bighit', 1, 0.5); m.shake(14, 10);
      m.puff(o.x, o.y, 0x8a7a4a, 14); m.puff(o.x, o.y, 0xffffff, 6);
    }
    if (t >= S.holdFrames) this.endModeSide();
  }
  floorUnder(x) {
    let best = null;
    for (const p of this.match.stage.platforms) if (x >= p.x1 && x <= p.x2 && p.y >= this.y - 4 && (best === null || p.y < best)) best = p.y;
    return best !== null && best - this.y < 140 ? best : null;
  }

  // INCOMING: it charges, tackles them to the floor, a fury of blows, then hauls them up and throws them away
  st_inc_side() {
    const S = this.def.modes.incoming.rush;
    if (this.t === S.from) { sfx('djump', 0.7, 0.6); sfx('glitch', 0.5, 1.4); }
    if (this.t >= S.from && this.t <= S.to) {
      this.vx = this.facing * S.vx; this.lx = this.ly = 0;
      if (!this.grounded) this.vy = 0;
      if (this.t % 2 === 0) this.match.particles.push({ shape: 'pixel2', x: this.x - this.facing * 10, y: this.y - 20 - Math.random() * 30, vx: -this.facing, vy: 0, life: 10, color: this.skinFx('rush', 0xff4a3a), grav: 0, drag: 0.9 });
      const o = this.grabTarget(S.box); if (o) return this.seize(o, 'inc_hold');
    }
    if (this.t > S.to) this.vx *= 0.8;
    if (this.t >= S.frames) this.endModeSide();
  }
  st_inc_hold() {
    const S = this.def.modes.incoming.rush, o = this.seized, t = this.t, m = this.match;
    if (!o || !o.alive || o.state === 'dying') return this.endModeSide();
    this.holdFloat(); this.vx = 0;
    if (t === 1) {                                                   // tackled into the floor
      this.holdHit(S.tackle, 'inctack'); sfx('bighit', 0.8, 0.7); m.shake(8, 6); m.puff(o.x, o.y, 0x8a7a4a, 10);
    }
    if (t < S.liftAt) this.holdAt(this.x + this.facing * 24, this.y);
    if (t >= S.furyFrom && t <= S.furyTo && (t - S.furyFrom) % S.furyEvery === 0) {   // the fury
      this.holdHit(S.fury, 'incfury'); sfx('hit', 0.6, 1 + Math.random() * 0.4); m.shake(3, 3);
      m.skinHitFx(this, o.x, o.y - 14, 2, this.facing, 2);
    }
    if (t >= S.liftAt && t < S.throwAt) {                            // hauled up overhead
      const k = Math.min(1, (t - S.liftAt) / 10);
      this.holdAt(this.x + this.facing * (24 - 14 * k), this.y - 54 * k);
    }
    if (t === S.throwAt) { this.holdHit(S.throw, 'incthrow', true); sfx('swing', 1, 0.6); sfx('bighit', 0.7, 0.9); m.shake(10, 6); }
    if (t >= S.holdFrames) this.endModeSide();
  }

  // SMILE: if someone is in range it flickers out and back in right behind them... laughs... lifts them on its
  // power cord, shocks them, and they vanish - dropped somewhere random on the stage
  st_smile_side() {
    const S = this.def.modes.smile.tele, m = this.match;
    this.vx *= 0.7; if (!this.grounded) this.vy = Math.min(this.vy, 0.8);
    if (this.t === S.at) {
      let best = null, bd = 1e9;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.isIntangible() || ['respawn', 'dying', 'seized', 'limit'].includes(o.state)) continue;
        const dx = Math.abs(o.x - this.x), dy = Math.abs(o.y - this.y);
        if (dx <= S.range && dy <= S.rangeY && dx + dy < bd) { bd = dx + dy; best = o; }
      }
      if (!best) { sfx('curse', 0.4, 1.4); this.glitchBurst(6); this.smileMiss = true; return; }
      this.glitchBurst(16); sfx('glitch', 0.9, 0.7);
      const side = -(best.facing || 1);
      this.x = best.x + side * S.behind; this.y = best.y; this.vx = this.vy = 0; this.facing = -side;
      this.grounded = best.grounded; this.platform = best.platform; this.fastFalling = false;
      this.glitchBurst(16);
      const o = this.grabTarget(S.box);
      if (o) return this.seize(o, 'smile_hold');
    }
    if (this.t >= S.frames) { this.smileMiss = false; this.endModeSide(); }
  }
  st_smile_hold() {
    const S = this.def.modes.smile.tele, o = this.seized, t = this.t, m = this.match;
    if (!o || !o.alive || o.state === 'dying') return this.endModeSide();
    this.holdFloat(); this.vx = 0;
    if (t === 1) { this.say(S.laugh[Math.floor(Math.random() * S.laugh.length)], 60, this.vfx && this.vfx.wow ? null : 'taunt'); }
    if (t < S.laughFor && t % 8 === 1) sfx('glitch', 0.4, 1.6 + (t % 16 ? 0.2 : 0));   // the laugh: stuttering, distorted
    const lift = Math.max(0, Math.min(1, (t - S.laughFor) / 14));
    this.holdAt(this.x + this.facing * (18 + 10 * lift), this.y - 46 * lift);
    if (t > S.laughFor && t <= S.laughFor + 14 && t % 4 === 0) sfx('swing', 0.3, 1.8);
    if (t >= S.shockFrom && t <= S.shockTo && (t - S.shockFrom) % S.shockEvery === 0) {   // electric shocks down the cord
      this.holdHit(S.shock, 'smileshock'); sfx('laser', 0.5, 1.6); m.shake(3, 4); o.shockFx = 8;
    }
    if (t === S.dropAt) {                                            // gone - and back somewhere random on the stage
      const plats = m.stage.platforms, P = plats[Math.floor(Math.random() * plats.length)];
      const nx = P.x1 + 20 + Math.random() * Math.max(0, P.x2 - P.x1 - 40), ny = P.y - 110;
      this.glitchBurstAt(o.x, o.y - 26, 14);
      o.x = nx; o.y = ny; o.grounded = false; o.platform = null;
      this.holdHit(S.drop, 'smiledrop', true);
      this.glitchBurstAt(nx, ny - 26, 18); sfx('glitch', 0.9, 0.5); sfx('ko', 0.3, 2);
    }
    if (t >= S.holdFrames) this.endModeSide();
  }
  glitchBurstAt(x, y, n) {
    const R = Math.random;
    for (let i = 0; i < n; i++) this.match.particles.push({ shape: 'pixel2', x: x + (R() - 0.5) * 24, y: y + (R() - 0.5) * 40, vx: (R() - 0.5) * 4, vy: (R() - 0.5) * 3, life: 14 + R() * 10, color: [this.pal.light, 0xffffff, 0x4a4a4a][i % 3], drag: 0.88, grav: 0 });
  }
  // the electric cord from its head to whoever it's holding (SMILE), and shock sparks
  drawCord(g) {
    const o = this.seized; if (!o || this.state !== 'smile_hold' || this.t < this.def.modes.smile.tele.laughFor) return;
    const hx = this.x - this.facing * 8, hy = this.y - 58, tx = o.x, ty = o.y - o.body.h + 8, col = this.skinFx('cord', 0x1e1c18);
    g.lineStyle(2, col, 1);
    const mx = (hx + tx) / 2, my = Math.min(hy, ty) - 24;
    let px = hx, py = hy;
    for (let i = 1; i <= 10; i++) { const k = i / 10, x = (1 - k) * (1 - k) * hx + 2 * (1 - k) * k * mx + k * k * tx, y = (1 - k) * (1 - k) * hy + 2 * (1 - k) * k * my + k * k * ty; g.lineBetween(px, py, x, y); px = x; py = y; }
    g.fillStyle(col, 1); g.fillCircle(tx, ty, 3);                           // wrapped round their neck
    if (o.shockFx > 0) {
      o.shockFx--;
      const sc = this.skinFx('shock', 0x9ae8ff);
      g.lineStyle(1, sc, 1);
      for (let b = 0; b < 3; b++) { let x = hx, y = hy; for (let i = 0; i < 6; i++) { const nx = x + (tx - hx) / 6 + (Math.random() - 0.5) * 10, ny = y + (ty - hy) / 6 + (Math.random() - 0.5) * 10; g.lineBetween(x, y, nx, ny); x = nx; y = ny; } }
      g.fillStyle(sc, 0.35); g.fillCircle(tx, ty - 10, 22);
    }
  }

  // posted MISSING (a poster hit): takes more damage until it runs out. Works on any fighter.
  markMissing(frames, style = null) {
    if (!this.alive) return;
    this.missingStyle = style;
    if (!(this.missingMark > 0)) { this.match.popText(this, 'MISSING', '#c8281e'); sfx('petal', 0.6, 0.8); }
    this.missingMark = Math.max(this.missingMark || 0, frames);
  }
  drawMissingMark(g) {                                                // a little poster pinned over their head
    const k = Math.min(1, this.missingMark / 20), y = this.y - (this.def.tagY || 60) - 20 + Math.sin(this.anim * 0.15) * 1.5;
    drawPoster(g, this.x, y, Math.sin(this.anim * 0.1) * 0.5, k, 1, this.missingStyle);
  }
  // the meter under its name tag; once transformed, the mode's name in its colour, and the mode's aura
  drawSignal(g, spr) {
    const S = this.def.signal, s = this.state, M = this.modeDef;
    if (this.modeFlash > 0) {                                         // the transformation: a flash of static over it
      this.modeFlash--;
      for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? 0xffffff : 0x4a4a4a, 0.5 * this.modeFlash / 30); g.fillRect(this.x - 16 + ((this.anim * 7 + i * 11) % 8) - 4, this.y - 66 + i * 11, 32, 3); }
    }
    if (M) this.drawModeAura(g, spr, M);
    if (!S || s === 'limit' || s === 'respawn') return;
    const v = this.signal || 0, w = 30, x = Math.round(this.x - w / 2), y = Math.round(this.y - (this.def.tagY || 60) + 3);
    g.fillStyle(0x0b0a14, 0.85); g.fillRect(x - 1, y - 1, w + 2, 4);
    if (M) { g.fillStyle(M.color, this.anim % 30 < 20 ? 1 : 0.6); g.fillRect(x, y, w, 2); }
    else { g.fillStyle(0xd8c860, 1); g.fillRect(x, y, Math.round(w * v / S.max), 2); for (let i = 1; i < 5; i++) { g.fillStyle(0x0b0a14, 0.8); g.fillRect(x + i * w / 5, y, 1, 2); } }
  }
  drawModeAura(g, spr, M) {
    const R = Math.random;
    if (this.wowMode === 'incoming') {                                // speed streaks and a red glow
      if (Math.abs(this.vx) > 1.5 && this.anim % 2 === 0) this.match.particles.push({ x: this.x - Math.sign(this.vx) * 10, y: this.y - 8 - R() * 44, vx: -this.vx * 0.3, vy: 0, life: 10, color: M.color, size: 2, grav: 0 });
      g.fillStyle(M.color, 0.08 + 0.05 * Math.sin(this.anim * 0.3)); g.fillEllipse(this.x, this.y - 30, 46, 70);
    } else if (this.wowMode === 'see') {                              // the room watches with it: faint eyes open and close nearby
      for (let i = 0; i < 3; i++) {
        const ph = (this.anim + i * 50) % 150; if (ph > 40) continue;
        const ex = this.x + Math.sin(i * 2.1 + Math.floor((this.anim + i * 50) / 150)) * 46, ey = this.y - 40 + Math.cos(i * 1.3) * 26, open = Math.sin(ph / 40 * Math.PI);
        g.fillStyle(0xf0ece0, 0.7 * open); g.fillEllipse(ex, ey, 9, 5 * open); g.fillStyle(0x0a0a0a, open); g.fillCircle(ex, ey, 1.6 * open);
      }
    } else if (this.wowMode === 'smile') {                            // static motes drifting off it
      if (this.anim % 6 === 0) this.match.particles.push({ shape: 'pixel2', x: this.x + (R() - 0.5) * 24, y: this.y - 20 - R() * 40, vx: 0, vy: -0.4, life: 24, color: R() < 0.5 ? M.color : 0xffffff, grav: 0 });
    }
  }
  // a colour that a costume can override for its own effects (skins.js `vfx.wow`)
  skinFx(key, dflt) { const w = this.vfx && this.vfx.wow; return w && w[key] !== undefined ? w[key] : dflt; }

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
    const wrap = (x, span) => ((x % span) + span) % span, HALL = this.hall(), sk = this.styleKey;
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
    if (sk === 'wowRonin') {                                         // shoji: a lattice of wooden bars over the paper walls
      g.fillStyle(HALL.stripe, 0.8 * fade); for (let y = ceil + 18; y < fy - 6; y += 22) g.fillRect(x0, y, W, 2);
      for (let x = x0 - wrap(scroll, 30); x < X1; x += 30) g.fillRect(Math.round(x), ceil, 3, fy - ceil);
    } else if (sk === 'wowDial') {                                   // windows left open all down the desktop walls
      for (let x = x0 - wrap(scroll, 120); x < X1; x += 120) {
        const wx = Math.round(x + 20), wy = ceil + 20 + ((Math.round(x) * 7) & 15);
        g.fillStyle(0x000000, fade); g.fillRect(wx - 1, wy - 1, 52, 36);
        g.fillStyle(0xc0c0c0, fade); g.fillRect(wx, wy, 50, 34);
        g.fillStyle(0x0a2484, fade); g.fillRect(wx + 2, wy + 2, 46, 6);
        g.fillStyle(0xffffff, fade); g.fillRect(wx + 3, wy + 10, 44, 21);
        g.fillStyle(0x808080, fade); for (let l = 0; l < 3; l++) g.fillRect(wx + 6, wy + 14 + l * 5, 20 + ((l * 13) % 18), 2);
      }
    } else if (sk === 'wowHack') {                                   // a wireframe grid scrolling past
      g.fillStyle(HALL.tile, 0.5 * fade); for (let y = ceil; y < fy; y += 16) g.fillRect(x0, y, W, 1);
    } else if (sk === 'wowAero') {                                   // glossy shine bands and bubbles rising up the walls
      g.fillStyle(0xffffff, 0.25 * fade); g.fillRect(x0, ceil + 8, W, 6); g.fillRect(x0, ceil + 18, W, 2);
      for (let i = 0; i < 10; i++) { const bx2 = x0 + wrap(i * 97 - scroll * 0.5, W), by2 = fy - ((ct * 1.5 + i * 37) % (fy - ceil)); g.lineStyle(1, 0xffffff, 0.7 * fade); g.strokeCircle(bx2, by2, 2 + (i % 3)); }
    }
    g.fillStyle(HALL.skirt, fade); g.fillRect(x0, fy - 4, W, 4);                 // skirting board
    g.fillStyle(HALL.carpet, fade); g.fillRect(x0, fy, W, Y1 - fy);                // damp carpet
    g.fillStyle(HALL.carpetDark, fade); for (let x = x0 - wrap(scroll, 23); x < X1; x += 23) g.fillRect(Math.round(x), fy + 3, 12, 1);
    for (let x = x0 - wrap(scroll, 140); x < X1; x += 140) g.fillEllipse(Math.round(x + 40), fy + 12, 50, 7);
    // the dark it drags along behind it
    for (let i = 0; i < 12; i++) { g.fillStyle(0x000000, 0.09 * fade); g.fillRect(x0, y0, Math.max(0, bx - x0 + 40 - i * 12), H); }
    if (ct > C.from) this.drawBacteria(g, bx, fy, ct, k, ct >= catchAt, HALL);
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
  drawBacteria(g, x, fy, ct, k, lunge, HALL = HALLS.default) {
    const R = (n) => (((ct * 73 + n * 151) % 97) / 97 - 0.5);                     // deterministic twitch
    const [BLK, DRK, WET] = HALL.thing, H = 118;
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
    g.fillStyle(HALL.mouth, 1); g.fillTriangle(hx + 2, hy + 3, hx + 20, hy + 3 + gape * 0.7, hx + 2, hy + 6 + gape * 0.6);   // the inside of its mouth
    g.fillStyle(HALL.teeth, 1);                                                          // too many teeth
    for (let i = 0; i < 6; i++) { const tx = hx + 2 + i * 3; g.fillTriangle(tx, hy + 2, tx + 2, hy + 2, tx + 1, hy + 6); g.fillTriangle(tx, hy + 4 + gape * 0.6 * (i / 6), tx + 2, hy + 4 + gape * 0.6 * (i / 6), tx + 1, hy + gape * 0.6 * (i / 6)); }
    g.fillStyle(HALL.eyes, 1); g.fillRect(Math.round(hx + 8), Math.round(hy - 6), 2, 1); g.fillRect(Math.round(hx + 13), Math.round(hy - 5), 1, 1);   // pinprick eyes
    if (ct % 30 < 3) { g.fillStyle(0xffffff, 0.5); g.fillRect(Math.round(hx + 6), Math.round(hy - 7), 6, 3); }   // they catch the light
    fringe(hx - 6, hy - 10, hx + 14, hy - 10, 8, 6, 50);
    arm(1, BLK, 0);
    if ((ct >> 2) % 6 === 0) { g.fillStyle(DRK, 0.4); g.fillEllipse(hipX + tilt * 0.45 + R(5) * 16, (hipY + shY) / 2, 48, 72); }   // a glitchy double
    g.fillStyle(BLK, 0.85);                                                            // spores drifting off it
    for (let i = 0; i < 14; i++) g.fillRect(Math.round(hipX - 20 + R(10 + i) * 80), Math.round(fy - 110 + R(20 + i) * 120), 2, 2);
  }
}
