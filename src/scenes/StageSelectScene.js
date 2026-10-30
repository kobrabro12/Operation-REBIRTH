// Stage select: a large preview of the highlighted stage on the left, the stage grid on the right.
// Move with WASD / arrows / stick, confirm with J / Enter / A, go back with K / Esc / B.
// Under the preview: the TRACK for the match (Q / E or a pad's LB / RB, or click the arrows) - AUTO, any stage's music,
// the shop tracks you own, or RANDOM (stages.js trackList). Changing it plays a preview.
import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { settings, MODE_NAMES } from '../settings.js';
import { STAGES, STAGE_SLOTS, trackList, stageLocked } from '../stage/stages.js';
import { SHOP } from '../data/shop.js';
import { owns } from '../progress.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { announce } from '../audio/announcer.js';
import { ArcadeBg, titleBanner, hintBar, slant, ARC, shade } from '../ui/arcade.js';

const ACC = ARC.sections.stage;

const PREV = { x: 16, y: 36, w: 352, h: 198 };
const COLS = 2, TILE_W = 118, TILE_H = 38, GAP = 4;   // 7 rows of 2 fit between the title bar and the help line
const GRID_X = 386, GRID_Y = 36;
const TRACK_Y = 336;                                  // the TRACK row, under the stage's description
const ARROWS = [PREV.x + 56, PREV.x + 256];             // the < and > of the TRACK row

export class StageSelectScene extends Phaser.Scene {
  constructor() { super('StageSelect'); }

  create() {
    this.menu = new MenuInput(this);
    this.t = 0;
    this.tiles = [];
    playMusic(this, 'bgm_title');
    for (let i = 0; i < STAGE_SLOTS; i++) {
      const random = i === STAGE_SLOTS - 1;
      const st = random ? { id: 'random', name: 'RANDOM', available: true } : STAGES[i] || { id: null, name: '???', available: false };
      this.tiles.push({ st, x: GRID_X + (i % COLS) * (TILE_W + GAP), y: GRID_Y + Math.floor(i / COLS) * (TILE_H + GAP) });
    }
    this.sel = Math.max(0, this.tiles.findIndex((t) => t.st.id === settings.stage));

    this.bgFx = new ArcadeBg(this, ACC, { second: ARC.gold });
    const g = this.add.graphics();
    titleBanner(this, 'STAGE SELECT', ACC, { x: 6, y: 2, size: 9 });
    const mode = this.add.text(VIEW_W - 12, 9, MODE_NAMES[settings.mode], { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 }).setOrigin(1, 0);
    slant(g, mode.x - mode.width - 14, 4, mode.width + 22, 17, ACC, 1, 6);
    g.fillStyle(0x000000, 0.6); g.fillRect(PREV.x + 5, PREV.y + 5, PREV.w, PREV.h);            // the preview's shadow
    slant(g, PREV.x - 6, PREV.y + PREV.h + 4, 360, 26, 0x000000, 0.5, 10);                     // the name plate
    slant(g, PREV.x - 10, PREV.y + PREV.h + 1, 360, 26, ACC, 1, 10);
    slant(g, PREV.x - 6, PREV.y + PREV.h + 4, 352, 20, shade(ACC, 0.25), 1, 8);

    // tiles (thumbnails drawn once)
    for (const t of this.tiles) {
      g.fillStyle(0x000000, 0.6); g.fillRect(t.x + 3, t.y + 3, TILE_W, TILE_H);
      g.fillStyle(0x15122a, 1); g.fillRect(t.x, t.y, TILE_W, TILE_H);
      if (t.st.preview) t.st.preview(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);
      else if (t.st.id === 'random') this.drawRandom(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);
      else this.drawLocked(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);
      if (stageLocked(t.st)) this.drawShopLock(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);   // bought in the shop: dimmed, a padlock
      slant(g, t.x, t.y + TILE_H - 14, TILE_W, 14, 0x07060e, 1, 5); g.fillStyle(t.st.available ? ACC : 0x2a2440, 1); g.fillRect(t.x, t.y + TILE_H - 15, TILE_W, 1);
      this.add.text(t.x + TILE_W / 2, t.y + TILE_H - 7, t.st.name, { fontFamily: FONT, fontSize: '6px', color: t.st.available ? '#ffffff' : '#4a4560', stroke: '#07060e', strokeThickness: 2 }).setOrigin(0.5);
    }
    this.selG = this.add.graphics();
    this.prevG = this.add.graphics();
    this.name = this.add.text(PREV.x + 10, PREV.y + PREV.h + 7, '', { fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#07060e', strokeThickness: 5 });
    this.blurb = this.add.text(PREV.x, PREV.y + PREV.h + 36, '', { fontFamily: FONT, fontSize: '7px', color: '#e8e4f4', lineSpacing: 6 });
    this.hazard = this.add.text(PREV.x + 14, PREV.y + PREV.h + 70, '', { fontFamily: FONT, fontSize: '6px', color: '#ffd23f', lineSpacing: 5 });
    slant(g, PREV.x, PREV.y + PREV.h + 66, 8, 24, ARC.gold, 1, 4);                              // a caution mark beside the hazards
    hintBar(this, 'CLICK PICK   ARROWS MOVE   J / ENTER / A CHOOSE   Q / E TRACK   K / ESC / B  BACK', ACC);
    this.lastSel = -1;
    // the match's track
    this.tracks = trackList(SHOP.find((t) => t.name === 'MUSIC').items.filter((it) => owns(it.id)));
    this.ti = Math.max(0, this.tracks.findIndex((x) => x.id === settings.track));
    this.qKey = this.input.keyboard.addKey('Q'); this.eKey = this.input.keyboard.addKey('E');
    this.trackG = this.add.graphics();
    this.add.text(PREV.x, TRACK_Y, 'TRACK', { fontFamily: FONT, fontSize: '6px', color: '#ffb07a', stroke: '#07060e', strokeThickness: 3 }).setOrigin(0, 0.5);
    this.trackT = this.add.text(PREV.x + 156, TRACK_Y, '', { fontFamily: FONT, fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(PREV.x + 274, TRACK_Y, 'Q / E', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0, 0.5);

    // mouse: hover a tile to preview it, click a tile (or the big preview) to choose it
    this.input.mouse.disableContextMenu();
    addFullscreenButton(this, 532, 3);
    this.backBtn = makeButton(this, 198, 3, '< BACK', () => { sfx('menu', 0.6); this.scene.start('Setup'); });
    this.clicked = false;
    const tileAt = (x, y) => this.tiles.findIndex((t) => x >= t.x && x < t.x + TILE_W && y >= t.y && y < t.y + TILE_H);
    this.input.on('pointermove', (p) => {
      const i = tileAt(p.x, p.y);
      if (i >= 0 && i !== this.sel) { this.sel = i; sfx('menu', 0.3); }
    });
    this.input.on('pointerdown', (p) => {
      if (!p.leftButtonDown()) return;
      if (Math.abs(p.y - TRACK_Y) < 9) { for (const [k, ax] of ARROWS.entries()) if (Math.abs(p.x - ax) < 10) { this.stepTrack(k ? 1 : -1); return; } }
      const i = tileAt(p.x, p.y);
      const inPreview = p.x >= PREV.x && p.x < PREV.x + PREV.w && p.y >= PREV.y && p.y < PREV.y + PREV.h;
      if (i >= 0) { this.sel = i; this.clicked = true; } else if (inPreview) this.clicked = true;
    });
  }

  // pick the next / previous track, and play it as a preview
  stepTrack(d) {
    this.ti = (this.ti + d + this.tracks.length) % this.tracks.length;
    const tr = this.tracks[this.ti]; settings.track = tr.id; sfx('menu', 0.5, 1.2);
    const st = this.tiles[this.sel].st;
    const key = tr.id === 'auto' ? (st.music || (st.musicList && st.musicList[0])) : tr.id === 'random' ? null : tr.music || tr.musicList[0];
    playMusic(this, key || 'bgm_title', 0.55);
  }
  drawLocked(g, x, y, w, h) {
    g.fillStyle(0x1e1a38, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0x2a2450, 1); g.fillRect(x + w * 0.2, y + h * 0.62, w * 0.6, h * 0.12);
    g.fillStyle(0x4a4560, 1);
    const cx = x + w / 2, cy = y + h * 0.35;
    g.fillRect(cx - 4, cy - 8, 8, 2); g.fillRect(cx + 2, cy - 6, 2, 5); g.fillRect(cx - 1, cy - 1, 3, 3); g.fillRect(cx - 1, cy + 4, 3, 2);
  }
  drawShopLock(g, x, y, w, h) {
    g.fillStyle(0x0b0a14, 0.6); g.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    g.fillStyle(0xf3c358, 1); g.fillRect(cx - 6, cy - 2, 12, 9); g.lineStyle(2, 0xf3c358, 1); g.strokeRect(cx - 4, cy - 7, 8, 6);
    g.fillStyle(0x0b0a14, 1); g.fillRect(cx - 1, cy + 1, 2, 3);
  }
  drawRandom(g, x, y, w, h) {
    g.fillStyle(0x241d57, 1); g.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    g.fillStyle(0xf0f2f3, 1); g.fillRect(cx - 12, cy - 12, 24, 24);
    g.fillStyle(0x1a1020, 1);
    for (const [dx, dy] of [[-6, -6], [6, -6], [0, 0], [-6, 6], [6, 6]]) g.fillRect(cx + dx - 2, cy + dy - 2, 4, 4);
  }

  update() {
    this.t++;
    const m = this.menu.poll();
    const n = this.tiles.length;
    let moved = false;
    if (m.left && this.sel % COLS > 0) { this.sel--; moved = true; }
    if (m.right && this.sel % COLS < COLS - 1) { this.sel++; moved = true; }
    if (m.up && this.sel - COLS >= 0) { this.sel -= COLS; moved = true; }
    if (m.down && this.sel + COLS < n) { this.sel += COLS; moved = true; }
    if (moved) sfx('menu', 0.5);
    if (Phaser.Input.Keyboard.JustDown(this.qKey) || m.pads.some((p) => p.button === 'lb')) this.stepTrack(-1);
    if (Phaser.Input.Keyboard.JustDown(this.eKey) || m.pads.some((p) => p.button === 'rb')) this.stepTrack(1);
    { const tr = this.tracks[this.ti], tg = this.trackG; tg.clear();
      this.trackT.setText(tr.id === 'auto' ? "AUTO (THE STAGE'S OWN)" : tr.name + (tr.shop ? '  (SHOP)' : '')).setColor(tr.shop ? '#f3c358' : '#ffffff');
      for (const fs of [7, 6, 5]) { this.trackT.setFontSize(fs + 'px'); if (this.trackT.width <= 184) break; }   // long names shrink to fit between the arrows
      slant(tg, PREV.x + 44, TRACK_Y - 8, 224, 16, 0x1c1838, 1, 6); tg.fillStyle(ACC, 1); tg.fillRect(PREV.x + 44, TRACK_Y + 7, 218, 1);
      tg.fillStyle(ARC.gold, 1);
      for (const [k, ax] of ARROWS.entries()) { const s = k ? 1 : -1; tg.fillTriangle(ax - 3 * s, TRACK_Y - 4, ax - 3 * s, TRACK_Y + 4, ax + 3 * s, TRACK_Y); }
      tg.fillStyle(0x78a0c6, 1); tg.fillRect(PREV.x + 37, TRACK_Y - 4, 2, 7); tg.fillRect(PREV.x + 37, TRACK_Y - 4, 4, 2); tg.fillCircle(PREV.x + 36, TRACK_Y + 3, 2); }   // a little note
    const tile = this.tiles[this.sel];
    const confirm = m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start');
    const back = m.back || m.pads.some((p) => p.button === 'b');
    this.clicked = false;
    if (confirm) {
      if (stageLocked(tile.st)) { sfx('curse', 0.4, 1.4); }
      else if (tile.st.available) { settings.stage = tile.st.id; sfx('select', 0.8); announce(this, tile.st.id); this.scene.start('Select'); return; }
      sfx('curse', 0.4, 1.4);
    }
    if (back) { sfx('menu', 0.6); this.scene.start('Setup'); return; }
    this.draw(tile);
  }

  draw(tile) {
    const sg = this.selG; sg.clear(); this.bgFx.update(this.t);
    const pulse = this.t % 30 < 15 ? ARC.gold : 0xffffff, o = 2 + Math.round(Math.sin(this.t * 0.2) * 1.5);
    sg.lineStyle(3, pulse, 1); sg.strokeRect(tile.x - 1, tile.y - 1, TILE_W + 2, TILE_H + 2);
    sg.fillStyle(pulse, 1);
    for (const [cx, cy, dx, dy] of [[tile.x - o, tile.y - o, 1, 1], [tile.x + TILE_W + o, tile.y - o, -1, 1], [tile.x - o, tile.y + TILE_H + o, 1, -1], [tile.x + TILE_W + o, tile.y + TILE_H + o, -1, -1]]) { sg.fillRect(Math.min(cx, cx + dx * 10), cy - (dy < 0 ? 2 : 0), 10, 2); sg.fillRect(cx - (dx < 0 ? 2 : 0), Math.min(cy, cy + dy * 10), 2, 10); }
    const ff = this.t % 120; if (ff < 30) { sg.fillStyle(0xffffff, 0.12); slant(sg, PREV.x + (ff / 30) * (PREV.w + 60) - 40, PREV.y, 26, PREV.h, 0xffffff, 0.1, 40); }   // a glint sweeping the preview
    if (this.sel === this.lastSel && this.t % 10) return;   // preview only changes with the selection
    this.lastSel = this.sel;
    const g = this.prevG; g.clear();
    g.fillStyle(ACC, 1); g.fillRect(PREV.x - 3, PREV.y - 3, PREV.w + 6, PREV.h + 6); g.fillStyle(0x07060e, 1); g.fillRect(PREV.x - 1, PREV.y - 1, PREV.w + 2, PREV.h + 2);
    const st = tile.st;
    if (st.preview) { st.preview(g, PREV.x, PREV.y, PREV.w, PREV.h); if (stageLocked(st)) this.drawShopLock(g, PREV.x, PREV.y, PREV.w, PREV.h); }
    else if (st.id === 'random') this.drawRandom(g, PREV.x, PREV.y, PREV.w, PREV.h);
    else this.drawLocked(g, PREV.x, PREV.y, PREV.w, PREV.h);
    this.name.setText(st.id === 'random' ? 'RANDOM' : st.available ? st.name : '???  COMING SOON');
    this.blurb.setText(st.blurb ? st.blurb.join('\n') : st.id === 'random' ? 'Picks one of the unlocked stages\nfor you when the match starts.' : 'This stage is still being built.');
    const key = st.shop && SHOP.flatMap((t) => t.items).find((it) => it.id === st.shop);
    this.hazard.setText(stageLocked(st) && st.secret ? 'LOCKED: THE SHOPKEEPER KNOWS THE HOUSE NUMBER.\n(RING HIS BELL THREE TIMES)' : stageLocked(st) ? 'LOCKED: BUY THE ' + (key ? key.name : 'KEY') + ' IN THE SHOP\n(TRINKETS > SHOP > EXTRAS)' : st.hazard ? (settings.hazards ? st.hazard : 'STAGE HAZARDS ARE OFF') : '');
  }
}
