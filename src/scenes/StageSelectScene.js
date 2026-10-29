// Stage select: a large preview of the highlighted stage on the left, the stage grid on the right.
// Move with WASD / arrows / stick, confirm with J / Enter / A, go back with K / Esc / B.
// Under the preview: the TRACK for the match (Q / E or a pad's LB / RB, or click the arrows) - AUTO, any stage's music,
// the shop tracks you own, or RANDOM (stages.js trackList). Changing it plays a preview.
import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { settings, MODE_NAMES } from '../settings.js';
import { STAGES, STAGE_SLOTS, trackList } from '../stage/stages.js';
import { SHOP } from '../data/shop.js';
import { owns } from '../progress.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { announce } from '../audio/announcer.js';

const PREV = { x: 16, y: 36, w: 352, h: 198 };
const COLS = 2, TILE_W = 118, TILE_H = 50, GAP = 4;   // 5 rows of 2 fit between the title bar and the help line
const GRID_X = 386, GRID_Y = 36;
const TRACK_Y = 336;                                  // the TRACK row, under the stage's description
const ARROWS = [PREV.x + 56, PREV.x + 236];             // the < and > of the TRACK row

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

    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 4) { g.fillStyle(0x131029, 1); g.fillRect(0, y, VIEW_W, 1); }
    g.fillStyle(0x1b1640, 1); g.fillRect(0, 0, VIEW_W, 22);
    g.fillStyle(0xf3c358, 1); g.fillRect(0, 22, VIEW_W, 2);
    this.add.text(10, 7, 'STAGE SELECT', { fontFamily: FONT, fontSize: '10px', color: '#f3c358' });
    this.add.text(VIEW_W - 10, 8, MODE_NAMES[settings.mode], { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' }).setOrigin(1, 0);

    // tiles (thumbnails drawn once)
    for (const t of this.tiles) {
      g.fillStyle(0x15122a, 1); g.fillRect(t.x, t.y, TILE_W, TILE_H);
      if (t.st.preview) t.st.preview(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);
      else if (t.st.id === 'random') this.drawRandom(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);
      else this.drawLocked(g, t.x + 2, t.y + 2, TILE_W - 4, TILE_H - 16);
      g.fillStyle(0x0b0a14, 1); g.fillRect(t.x, t.y + TILE_H - 14, TILE_W, 14);
      this.add.text(t.x + TILE_W / 2, t.y + TILE_H - 7, t.st.name, { fontFamily: FONT, fontSize: '6px', color: t.st.available ? '#ffffff' : '#4a4560' }).setOrigin(0.5);
    }
    this.selG = this.add.graphics();
    this.prevG = this.add.graphics();
    this.name = this.add.text(PREV.x, PREV.y + PREV.h + 12, '', { fontFamily: FONT, fontSize: '14px', color: '#f3c358', stroke: '#4a280b', strokeThickness: 4 });
    this.blurb = this.add.text(PREV.x, PREV.y + PREV.h + 36, '', { fontFamily: FONT, fontSize: '7px', color: '#c9c4dc', lineSpacing: 6 });
    this.hazard = this.add.text(PREV.x, PREV.y + PREV.h + 70, '', { fontFamily: FONT, fontSize: '6px', color: '#ffd34f', lineSpacing: 5 });
    this.add.text(VIEW_W / 2, VIEW_H - 4, 'CLICK A STAGE  OR  MOVE + J / ENTER / A    Q / E  TRACK    K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
    this.lastSel = -1;
    // the match's track
    this.tracks = trackList(SHOP.find((t) => t.name === 'MUSIC').items.filter((it) => owns(it.id)));
    this.ti = Math.max(0, this.tracks.findIndex((x) => x.id === settings.track));
    this.qKey = this.input.keyboard.addKey('Q'); this.eKey = this.input.keyboard.addKey('E');
    this.trackG = this.add.graphics();
    this.add.text(PREV.x, TRACK_Y, 'TRACK', { fontFamily: FONT, fontSize: '7px', color: '#78a0c6' }).setOrigin(0, 0.5);
    this.trackT = this.add.text(PREV.x + 152, TRACK_Y, '', { fontFamily: FONT, fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(PREV.x + 258, TRACK_Y, 'Q / E', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0, 0.5);

    // mouse: hover a tile to preview it, click a tile (or the big preview) to choose it
    this.input.mouse.disableContextMenu();
    addFullscreenButton(this, 520, 5);
    this.backBtn = makeButton(this, 170, 5, '< BACK', () => { sfx('menu', 0.6); this.scene.start('Setup'); });
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
      tg.fillStyle(0x1b1640, 1); tg.fillRect(PREV.x + 44, TRACK_Y - 8, 204, 16);
      tg.fillStyle(0xf3c358, 1);
      for (const [k, ax] of ARROWS.entries()) { const s = k ? 1 : -1; tg.fillTriangle(ax - 3 * s, TRACK_Y - 4, ax - 3 * s, TRACK_Y + 4, ax + 3 * s, TRACK_Y); }
      tg.fillStyle(0x78a0c6, 1); tg.fillRect(PREV.x + 34, TRACK_Y - 4, 2, 7); tg.fillRect(PREV.x + 34, TRACK_Y - 4, 5, 2); tg.fillCircle(PREV.x + 33, TRACK_Y + 3, 2); }   // a little note
    const tile = this.tiles[this.sel];
    const confirm = m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start');
    const back = m.back || m.pads.some((p) => p.button === 'b');
    this.clicked = false;
    if (confirm) {
      if (tile.st.available) { settings.stage = tile.st.id; sfx('select', 0.8); announce(this, tile.st.id); this.scene.start('Select'); return; }
      sfx('curse', 0.4, 1.4);
    }
    if (back) { sfx('menu', 0.6); this.scene.start('Setup'); return; }
    this.draw(tile);
  }

  draw(tile) {
    const sg = this.selG; sg.clear();
    const pulse = this.t % 30 < 15 ? 0xf3c358 : 0xffffff;
    sg.lineStyle(2, pulse, 1); sg.strokeRect(tile.x - 1, tile.y - 1, TILE_W + 2, TILE_H + 2);
    if (this.sel === this.lastSel && this.t % 10) return;   // preview only changes with the selection
    this.lastSel = this.sel;
    const g = this.prevG; g.clear();
    g.fillStyle(0xf3c358, 1); g.fillRect(PREV.x - 2, PREV.y - 2, PREV.w + 4, PREV.h + 4);
    const st = tile.st;
    if (st.preview) st.preview(g, PREV.x, PREV.y, PREV.w, PREV.h);
    else if (st.id === 'random') this.drawRandom(g, PREV.x, PREV.y, PREV.w, PREV.h);
    else this.drawLocked(g, PREV.x, PREV.y, PREV.w, PREV.h);
    this.name.setText(st.id === 'random' ? 'RANDOM' : st.available ? st.name : '???  COMING SOON');
    this.blurb.setText(st.blurb ? st.blurb.join('\n') : st.id === 'random' ? 'Picks one of the unlocked stages\nfor you when the match starts.' : 'This stage is still being built.');
    this.hazard.setText(st.hazard ? (settings.hazards ? st.hazard : 'STAGE HAZARDS ARE OFF') : '');
  }
}
