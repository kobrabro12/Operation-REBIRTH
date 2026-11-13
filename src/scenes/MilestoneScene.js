// THE MILESTONE ROAD (CHARACTER FILES > MILESTONE ROAD, or M there): one fighter's four milestone costumes as a
// gallery. Each stands on its own lit plinth along a road of KOs (0 - 25 - 50 - 75 - 100), wearing the costume
// with its aura (motes in its colours rising, orbiting sparks, a crown of god-rays at tier IV); costumes not yet
// earned are black silhouettes with a glowing seal and the KOs still to go. The road glows gold as far as you've
// come. Pick a costume to read its whole story (MILESTONE_LORE) in the plaque below.
// A/D picks a costume, W/S changes fighter, K / Esc / B goes back to the files.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { showFighter } from '../fighters/roster.js';
import { skinsFor, skinUnlocked } from '../fighters/skins.js';
import { MILESTONE_KOS, getKOs } from '../progress.js';
import { MILESTONE_LORE } from '../data/lore.js';
import { filesFighters } from './FilesScene.js';

// where the four plinths stand (x), their floor (y); the road under them
const SPOT = { xs: [104, 246, 394, 536], y: 238, road: 274 };
// roman numerals for the tiers
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
/** A colour as a '#rrggbb' string. */
const css = (c) => '#' + c.toString(16).padStart(6, '0');
/** A colour mixed toward another (k = 0..1). */
const mix = (a, b, k) => { const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (c(16) << 16) | (c(8) << 8) | c(0); };

/** The MILESTONE ROAD gallery (see the top of the file). */
export class MilestoneScene extends Phaser.Scene {
  constructor() { super('Milestones'); }

  /** Builds the gallery for fighter `data.fi` of the CHARACTER FILES list. */
  create(data) {
    this.t = 0; this.menu = new MenuInput(this);
    this.fighters = filesFighters(); this.fi = (data && data.fi) || 0; this.sel = 0; this.motes = [];
    playMusic(this, 'bgm_trophy_hall');
    this.skyG = this.add.graphics(); this.rayG = this.add.graphics(); this.backG = this.add.graphics();
    this.sprites = SPOT.xs.map((x) => this.add.sprite(x, SPOT.y, 'ss_idle', 0));
    this.frontG = this.add.graphics();
    const T = (x, y, size, col, o = {}) => this.add.text(x, y, '', { fontFamily: FONT, fontSize: size + 'px', color: col, stroke: '#07060e', strokeThickness: 3, align: 'center', ...o }).setOrigin(0.5);
    this.title = T(VIEW_W / 2, 18, 13, '#ffe08a', { strokeThickness: 5 });
    this.sub = T(VIEW_W / 2, 36, 6, '#c9c4dc');
    this.names = SPOT.xs.map((x) => T(x, SPOT.y + 16, 6, '#ffffff'));
    this.tiers = SPOT.xs.map((x) => T(x, 64, 7, '#ffe08a'));
    this.need = SPOT.xs.map((x) => T(x, 80, 5, '#b8b0ff'));
    this.nodeT = MILESTONE_KOS.map(() => T(0, SPOT.road + 13, 5, '#c9c4dc'));
    this.you = T(0, SPOT.road - 12, 5, '#ffffff');
    this.plaqueHead = T(VIEW_W / 2, 302, 7, '#ffe08a');
    this.plaque = this.add.text(VIEW_W / 2, 314, '', { fontFamily: FONT, fontSize: '5px', color: '#efe8ff', align: 'center', lineSpacing: 4, wordWrap: { width: 560 } }).setOrigin(0.5, 0);
    this.done = T(VIEW_W / 2, 52, 6, '#07060e', { stroke: '#ffe08a', strokeThickness: 0 });
    makeButton(this, 8, 6, '< FILES', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.add.text(VIEW_W / 2, VIEW_H - 6, 'A/D COSTUME   W/S FIGHTER   CLICK A PLINTH   K / ESC  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5);
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      const i = SPOT.xs.findIndex((x) => Math.abs(p.x - x) < 60 && p.y > 70 && p.y < SPOT.y + 24);
      if (i >= 0 && i < this.list.length) this.pick(i);
    });
    this.load_();
  }

  /** Loads the current fighter's milestones (skin index + costume) and resets the gallery. */
  load_() {
    const f = this.fighters[this.fi];
    this.list = skinsFor(f.id).map((s, i) => ({ s, i })).filter((o) => o.s.milestone).sort((a, b) => a.s.milestone - b.s.milestone).slice(0, 4);
    this.kos = getKOs(f.id); this.motes = [];
    this.sel = Math.max(0, Math.min(this.sel, this.list.length - 1));
    this.title.setText('THE MILESTONE ROAD');
    this.sub.setText(f.name + (this.list.length ? '   -   ' + this.kos + ' KOS' : '   -   NO MILESTONES YET'));
    this.refresh();
  }
  /** Picks costume i on the road (with a little chime). */
  pick(i) { if (i === this.sel) return; this.sel = i; sfx('menu', 0.5, 1 + i * 0.12); this.refresh(); }
  /** Back to CHARACTER FILES, on the same fighter. */
  back() { sfx('menu', 0.6); this.scene.start('Files', { fi: this.fi }); }

  /** The texts: each plinth's name and tier, what's still to go, the chosen costume's story on the plaque. */
  refresh() {
    const f = this.fighters[this.fi];
    SPOT.xs.forEach((x, k) => {
      const o = this.list[k], show = !!o;
      this.names[k].setVisible(show); this.tiers[k].setVisible(show); this.need[k].setVisible(show); this.sprites[k].setVisible(show);
      if (!o) return;
      const open = skinUnlocked(f.id, o.i), tier = o.s.milestone;
      this.names[k].setText(open ? o.s.name : '? ? ?').setColor(open ? css(o.s.fx || 0xffffff) : '#5a5670');
      this.tiers[k].setText('MILESTONE ' + ROMAN[tier]).setColor(open ? '#ffe08a' : '#6a6680');
      this.need[k].setText(open ? '' : (MILESTONE_KOS[tier] - this.kos) + ' KOS TO GO');
    });
    const o = this.list[this.sel];
    if (!o) { this.plaqueHead.setText(''); this.plaque.setText('THIS FIGHTER HAS NO MILESTONE COSTUMES YET.'); this.done.setText(''); return; }
    const open = skinUnlocked(f.id, o.i), story = (MILESTONE_LORE[f.id] || {})[o.s.name] || o.s.lore || '';
    this.plaqueHead.setText((open ? o.s.name : 'SEALED') + '   -   MILESTONE ' + ROMAN[o.s.milestone] + '   (' + MILESTONE_KOS[o.s.milestone] + ' KOS)');
    this.plaque.setText(open ? story : (o.s.lore ? '"' + o.s.lore + '"\n\n' : '') + 'SCORE ' + MILESTONE_KOS[o.s.milestone] + ' KOS AS ' + f.name + ' TO UNSEAL IT. (' + this.kos + ' SO FAR)');
    const all = this.list.length && this.list.every((q) => skinUnlocked(f.id, q.i));
    this.done.setText(all ? ' THE ROAD IS COMPLETE ' : '');
  }

  /** Every frame: input, then the sky, god-rays, plinths, fighters, motes and the road. */
  update() {
    this.t++;
    const m = this.menu.poll(), n = this.fighters.length;
    if (m.left && this.list.length) this.pick((this.sel - 1 + this.list.length) % this.list.length);
    if (m.right && this.list.length) this.pick((this.sel + 1) % this.list.length);
    if (m.up) { this.fi = (this.fi - 1 + n) % n; sfx('menu', 0.6); this.load_(); }
    if (m.down) { this.fi = (this.fi + 1) % n; sfx('menu', 0.6); this.load_(); }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    this.draw();
  }
  /** Draws the gallery (see the top of the file). */
  draw() {
    const t = this.t, f = this.fighters[this.fi], def = f.def, sg = this.skyG, rg = this.rayG, bg = this.backG, fg = this.frontG, cur = this.list[this.sel];
    const tint = cur ? cur.s.fx || 0xffe08a : 0xffe08a;
    sg.clear(); rg.clear(); bg.clear(); fg.clear();
    // the sky: a deep violet night shading toward the chosen costume's colour at the horizon, stars, drifting veils
    sg.fillGradientStyle(0x07040e, 0x07040e, mix(0x140a24, tint, 0.25), mix(0x140a24, tint, 0.25), 1); sg.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 70; i++) { const x = (i * 97 + 13) % VIEW_W, y = (i * 53 + 7) % 220, tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.02 + i)); sg.fillStyle(0xffffff, 0.15 + 0.5 * tw * (i % 3 === 0 ? 1 : 0.4)); sg.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1); }
    for (let k = 0; k < 3; k++) { sg.fillStyle(mix(0x3a2a6a, tint, 0.3), 0.06); sg.fillEllipse(VIEW_W / 2 + Math.sin(t * 0.004 + k * 2) * 160, 120 + k * 30, 600, 60); }
    // the road: a long gilded path behind the plinths; the stretch you've walked burns gold; a node per milestone
    const rx0 = 40, rx1 = VIEW_W - 40, ry = SPOT.road, prog = Math.min(1, this.kos / MILESTONE_KOS[MILESTONE_KOS.length - 1]), px = rx0 + (rx1 - rx0) * prog;
    fg.fillStyle(0x07060e, 1); fg.fillRoundedRect(rx0 - 4, ry - 5, rx1 - rx0 + 8, 10, 5);
    fg.fillStyle(0x2a2440, 1); fg.fillRoundedRect(rx0, ry - 3, rx1 - rx0, 6, 3);
    fg.fillStyle(0xd8a830, 1); fg.fillRoundedRect(rx0, ry - 3, Math.max(6, px - rx0), 6, 3); fg.fillStyle(0xfff0b0, 1); fg.fillRect(rx0 + 2, ry - 2, Math.max(2, px - rx0 - 4), 1);
    for (let i = 0; i < 6; i++) { const sx = rx0 + ((t * 1.4 + i * 60) % Math.max(1, px - rx0)); fg.fillStyle(0xffffff, 0.7); fg.fillCircle(sx, ry, 1.5); }   // light running along it
    MILESTONE_KOS.forEach((k, i) => {
      const x = rx0 + (rx1 - rx0) * (k / MILESTONE_KOS[MILESTONE_KOS.length - 1]), lit = this.kos >= k;
      fg.fillStyle(0x07060e, 1); fg.fillCircle(x, ry, 8); fg.fillStyle(lit ? 0xffd860 : 0x3a3450, 1); fg.fillCircle(x, ry, 6);
      if (lit) { fg.fillStyle(0xfff6dc, 1); fg.fillCircle(x - 1.5, ry - 1.5, 2); fg.fillStyle(0xffd860, 0.15 + 0.1 * Math.sin(t * 0.08 + i)); fg.fillCircle(x, ry, 13); }
      this.nodeT[i].setText(String(k)).setPosition(x, ry + 14).setColor(lit ? '#ffe08a' : '#6a6680');
    });
    fg.fillStyle(0xffffff, 1); fg.fillTriangle(px - 5, ry + 14, px + 5, ry + 14, px, ry + 7);
    this.you.setPosition(Math.min(px, VIEW_W - 60), ry + 21).setText(this.kos >= 100 ? 'ALL THE WAY' : 'YOU');
    // the plinths, back to front: a god-ray spotlight, the stone, the fighter, the aura
    this.list.forEach((o, k) => this.drawPlinth(k, o, f, def, k === this.sel));
    // motes rising off unlocked costumes
    for (const M of this.motes) { M.x += M.vx; M.y += M.vy; M.vy *= 0.995; M.life--; fg.fillStyle(M.c, Math.min(1, M.life / 30)); fg.fillRect(M.x, M.y, M.s, M.s); }
    this.motes = this.motes.filter((M) => M.life > 0);
    // the story plaque
    fg.fillStyle(0x07060e, 0.85); fg.fillRoundedRect(28, 293, VIEW_W - 56, 56, 6);
    fg.lineStyle(1, tint, 0.8); fg.strokeRoundedRect(28, 293, VIEW_W - 56, 56, 6); fg.lineStyle(0);
    fg.fillStyle(tint, 1); for (const x of [36, VIEW_W - 36]) fg.fillCircle(x, 301, 2);
    if (this.done.text) { fg.fillStyle(0xffd860, 1); fg.fillRoundedRect(VIEW_W / 2 - 80, 46, 160, 13, 3); fg.fillStyle(0xffffff, 0.4); fg.fillRect(VIEW_W / 2 - 80 + ((t * 2) % 180) - 10, 46, 8, 13); }
  }
  /**
   * One plinth: a shaft of light in the costume's colour (stronger on the chosen one; tier IV gets a fan of god-rays),
   * a carved stone plinth with the tier's gems, and the fighter wearing it - unlocked: in full colour with its aura;
   * sealed: a black silhouette with a pulsing rune seal.
   */
  drawPlinth(k, o, f, def, on) {
    const t = this.t, x = SPOT.xs[k], y = SPOT.y, rg = this.rayG, bg = this.backG, open = skinUnlocked(f.id, o.i), tier = o.s.milestone, c = o.s.fx || 0xffe08a, glow = on ? 1 : 0.55;
    if (open) {
      rg.fillStyle(c, 0.08 * glow); rg.fillTriangle(x - 12, 60, x + 12, 60, x + 70, y); rg.fillTriangle(x - 12, 60, x - 70, y, x + 70, y);
      rg.fillStyle(0xffffff, 0.05 * glow); rg.fillTriangle(x - 4, 60, x + 4, 60, x + 30, y); rg.fillTriangle(x - 4, 60, x - 30, y, x + 30, y);
      if (tier >= 4) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.004; rg.fillStyle(c, 0.05 * glow); rg.fillTriangle(x, y - 50, x + Math.cos(a) * 160, y - 50 + Math.sin(a) * 160, x + Math.cos(a + 0.12) * 160, y - 50 + Math.sin(a + 0.12) * 160); }
      for (let r = 0; r < 4; r++) { rg.fillStyle(c, (0.05 + 0.03 * Math.sin(t * 0.05 + k)) * glow); rg.fillCircle(x, y - 45, 54 - r * 10); }
    } else { rg.fillStyle(0x6a5aa0, 0.05); rg.fillTriangle(x - 8, 60, x + 8, 60, x + 50, y); rg.fillTriangle(x - 8, 60, x - 50, y, x + 50, y); }
    // the plinth: a stepped stone drum with gilded edges and a gem per tier
    const stone = open ? 0x3a3450 : 0x221e30;
    bg.fillStyle(0x07060e, 1); bg.fillEllipse(x, y + 12, 112, 22); bg.fillStyle(stone, 1); bg.fillEllipse(x, y + 10, 104, 18);
    bg.fillStyle(0x07060e, 1); bg.fillRect(x - 46, y, 92, 12); bg.fillStyle(mix(stone, 0xffffff, 0.08), 1); bg.fillRect(x - 44, y, 88, 11);
    bg.fillStyle(0x07060e, 1); bg.fillEllipse(x, y, 96, 16); bg.fillStyle(mix(stone, 0xffffff, 0.15), 1); bg.fillEllipse(x, y, 90, 13);
    bg.fillStyle(open ? 0xd8a830 : 0x4a4460, 1); bg.fillRect(x - 44, y + 9, 88, 1);
    for (let i = 0; i < tier; i++) { const gx = x - (tier - 1) * 6 + i * 12; bg.fillStyle(0x07060e, 1); bg.fillCircle(gx, y + 6, 3.5); bg.fillStyle(open ? c : 0x3a3450, 1); bg.fillCircle(gx, y + 6, 2.5); if (open) { bg.fillStyle(0xffffff, 0.8); bg.fillRect(gx - 1, y + 4, 1, 1); } }
    if (on) { bg.lineStyle(1, open ? c : 0x8a80b0, 0.6 + 0.4 * Math.sin(t * 0.1)); bg.strokeEllipse(x, y, 100 + Math.sin(t * 0.1) * 4, 17); bg.lineStyle(0); }
    // the fighter
    const sp = this.sprites[k], sc = def.ownAnims ? 1.4 : 2;
    showFighter(sp, def, Math.floor(t / 6), o.i);
    sp.setPosition(x, y + 1).setScale(on ? sc * 1.06 : sc).setAlpha(1);
    if (open) sp.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    else sp.setTintMode(Phaser.TintModes.FILL).setTint(on ? 0x14102a : 0x0c0a18);
    if (open) {                                                                       // its aura: orbiting sparks, motes, a crown
      const top = y - (def.body ? def.body.h : 50) * sc;
      const orb = tier >= 2 ? (tier >= 4 ? 4 : 2) : 0;
      for (let i = 0; i < orb; i++) { const a = t * 0.04 + i / orb * Math.PI * 2, ox = x + Math.cos(a) * 40, oy = y - 50 + Math.sin(a) * 12; bg.fillStyle(c, 0.25); bg.fillCircle(ox, oy, 5); this.frontG.fillStyle(0xffffff, Math.sin(a) > 0 ? 1 : 0.4); this.frontG.fillCircle(ox, oy, 2); }
      if (tier >= 4) for (let i = 0; i < 5; i++) { const cx = x - 16 + i * 8, h = 6 + ((t >> 2) + i * 3) % 4; this.frontG.fillStyle(c, 0.9); this.frontG.fillTriangle(cx - 3, top - 4, cx + 3, top - 4, cx, top - 4 - h); this.frontG.fillStyle(0xffffff, 0.8); this.frontG.fillTriangle(cx - 1, top - 4, cx + 1, top - 4, cx, top - 6 - h * 0.6); }
      if (t % Math.max(2, 10 - tier * 2) === 0) this.motes.push({ x: x + (Math.random() - 0.5) * 60, y: y - Math.random() * 20, vx: (Math.random() - 0.5) * 0.3, vy: -0.4 - Math.random() * 0.6 * tier * 0.5, life: 60 + tier * 15, c: Math.random() < 0.3 ? 0xffffff : c, s: Math.random() < 0.2 ? 2 : 1 });
    } else {                                                                          // the seal: a slowly turning ring of runes over the silhouette
      const g = this.frontG, a = t * 0.02, cy = y - 46, pulse = 0.5 + 0.5 * Math.sin(t * 0.06 + k);
      g.lineStyle(1, 0x8a80d0, 0.3 + 0.4 * pulse); g.strokeCircle(x, cy, 22); g.strokeCircle(x, cy, 16); g.lineStyle(0);
      for (let i = 0; i < 8; i++) { const q = a + i / 8 * Math.PI * 2; g.fillStyle(0xb8b0ff, 0.4 + 0.5 * pulse); g.fillRect(x + Math.cos(q) * 19 - 1, cy + Math.sin(q) * 19 - 1, 2, 2); }
      g.fillStyle(0xd8d0ff, 0.6 + 0.4 * pulse); g.fillRect(x - 3, cy - 2, 6, 5); g.lineStyle(1.5, 0xd8d0ff, 0.6 + 0.4 * pulse); g.strokeRect(x - 2, cy - 6, 4, 4); g.lineStyle(0);
    }
  }
}
