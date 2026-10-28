// Test Fighters (TRINKETS > TEST FIGHTERS): the lab. Experimental fighters (roster.TEST_ROSTER) can be
// tried out before they join the real roster: TRAINING (against a dummy, with hitboxes and the speed
// controls), VS CPU (you play it: a 2-stock match against a random fighter from the real roster), FIGHT IT
// (the other way round: you play a real fighter, it's the CPU - A/D picks yours) or WIN SCREEN (plays its win
// cutscene, WinScene.js), on any map.
// W/S picks a fighter, A/D picks their costume (in FIGHT IT: your fighter), E (or a pad's X) picks the map,
// Q (or a pad's Y) switches mode, J / Enter / A starts, K / Esc / B goes back. Mouse: click a fighter, the < >
// arrows, a swatch, the map arrows or a mode.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ROSTER, TEST_ROSTER, showFighter } from '../fighters/roster.js';
import { settings } from '../settings.js';
import { skinsFor, stepSkin as stepSkinUnlocked, skinUnlocked } from '../fighters/skins.js';
import { STAGES } from '../stage/stages.js';

const GOLD = '#f3c358', DIM = '#8a87a3', LINE = 0x5ee07a, PANEL = 0x10241a;
const L = { x: 16, y: 56, w: 200, h: 262 }, R = { x: 228, y: 56, w: 396, h: 262 };
const MODES = ['TRAINING', 'VS CPU', 'FIGHT IT', 'WIN SCREEN'];
const FIGHT_IT = 2, WIN_SCREEN = 3;
let lastYou = 0;                                  // the real fighter you play in FIGHT IT (remembered)
// the maps to pick from: every stage, then RANDOM. Remembered while the game is open.
const MAPS = () => [...STAGES.filter((st) => st.available), { id: 'random', name: 'RANDOM' }];
let lastMap = 0;

export class TestFightersScene extends Phaser.Scene {
  constructor() { super('TestFighters'); }

  create() {
    this.t = 0; this.sel = 0; this.mode = 0; this.menu = new MenuInput(this);
    this.real = ROSTER.filter((r) => r.available); this.you = Math.min(lastYou, this.real.length - 1);
    this.maps = MAPS(); this.map = Math.min(lastMap, this.maps.length - 1);
    this.eKey = this.input.keyboard.addKey('E');
    this.skin = {};                                  // the costume picked for each test fighter
    this.qKey = this.input.keyboard.addKey('Q');
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 4) { g.fillStyle(0x0e1712, 1); g.fillRect(0, y, VIEW_W, 1); }   // lab scanlines
    g.fillStyle(PANEL, 1); g.fillRect(L.x, L.y, L.w, L.h); g.fillRect(R.x, R.y, R.w, R.h);
    g.fillStyle(LINE, 1); g.fillRect(L.x, L.y, L.w, 2); g.fillRect(R.x, R.y, R.w, 2);
    this.add.text(VIEW_W / 2, 28, 'TEST FIGHTERS', { fontFamily: FONT, fontSize: '14px', color: '#5ee07a', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
    this.add.text(L.x + 10, L.y + 10, 'IN THE LAB', { fontFamily: FONT, fontSize: '6px', color: DIM });
    this.cursor = this.add.graphics();
    this.names = TEST_ROSTER.map((f, i) => this.add.text(L.x + 18, L.y + 32 + i * 24, f.name, { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc' }));
    if (!TEST_ROSTER.length) this.add.text(L.x + 18, L.y + 32, 'NOTHING HERE YET.', { fontFamily: FONT, fontSize: '7px', color: DIM });
    // right: the fighter, its notes, and how to try it
    this.stageG = this.add.graphics();
    this.sprite = this.add.sprite(R.x + 80, R.y + 190, ROSTER[0].def.sheets.idle, 0).setVisible(false);
    const tx = R.x + 160;
    this.head = this.add.text(tx, R.y + 14, '', { fontFamily: FONT, fontSize: '9px', color: GOLD });
    this.tag = this.add.text(tx, R.y + 30, '', { fontFamily: FONT, fontSize: '5px', color: '#0b0a14', backgroundColor: '#5ee07a', padding: { x: 3, y: 2 } });
    this.notes = this.add.text(tx, R.y + 50, '', { fontFamily: FONT, fontSize: '5px', color: '#e8e4f4', lineSpacing: 5, wordWrap: { width: R.w - 172 } });
    this.modeTexts = MODES.map((m, i) => this.add.text(tx + (i % 2) * 120, R.y + R.h - 40 + Math.floor(i / 2) * 18, m, { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }));
    this.youText = this.add.text(tx, R.y + R.h - 58, '', { fontFamily: FONT, fontSize: '6px', color: GOLD });   // FIGHT IT: who you play
    // the map: a little picture of it, its name, arrows
    this.mapG = this.add.graphics();
    const MX = L.x + L.w / 2, MY = L.y + 150;                       // (in the left panel, under the list)
    this.mapLabel = this.add.text(L.x + 10, MY - 12, 'MAP  (E)', { fontFamily: FONT, fontSize: '6px', color: DIM });
    this.mapName = this.add.text(MX, MY + 76, '', { fontFamily: FONT, fontSize: '7px', color: GOLD }).setOrigin(0.5);
    this.mapArrows = [-1, 1].map((d) => makeButton(this, MX + d * 84, MY + 34, d < 0 ? '<' : '>', () => this.stepMap(d), { originX: 0.5, originY: 0.5, size: '8px' }));
    this.empty = this.add.text(R.x + R.w / 2, R.y + R.h / 2, 'THE LAB IS EMPTY.\n\nNEW FIGHTERS SHOW UP HERE TO BE\nTRIED OUT BEFORE THEY JOIN THE ROSTER.', { fontFamily: FONT, fontSize: '7px', color: DIM, align: 'center', lineSpacing: 8 }).setOrigin(0.5).setVisible(!TEST_ROSTER.length);
    // costume picker under the platform: name, a row of swatches, arrows
    const cx = R.x + 80;
    this.skinName = this.add.text(cx, R.y + 214, '', { fontFamily: FONT, fontSize: '7px', color: GOLD }).setOrigin(0.5);
    this.skinCount = this.add.text(cx, R.y + 246, '', { fontFamily: FONT, fontSize: '5px', color: DIM }).setOrigin(0.5);
    this.swatchG = this.add.graphics();
    this.arrows = [-1, 1].map((d) => makeButton(this, cx + d * 66, R.y + 214, d < 0 ? '<' : '>', () => this.stepSkin(d), { originX: 0.5, originY: 0.5, size: '8px' }));
    this.add.text(VIEW_W / 2, VIEW_H - 8, 'W/S FIGHTER   A/D COSTUME (FIGHT IT: YOU)   E MAP   Q MODE   J / ENTER / A START   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: DIM }).setOrigin(0.5, 1);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.clicked = false;
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      const i = Math.floor((p.y - L.y - 26) / 24);
      if (p.x < L.x + L.w && i >= 0 && i < TEST_ROSTER.length) { this.sel = i; sfx('menu', 0.5); return; }
      const f = TEST_ROSTER[this.sel];
      if (f && Math.abs(p.y - (R.y + 230)) < 7) {                       // a swatch
        const n = skinsFor(f.id).length, x0 = R.x + 80 - (n * 14) / 2;
        const k = Math.floor((p.x - x0) / 14);
        if (k >= 0 && k < n && skinUnlocked(f.id, k)) { this.skin[f.id] = k; sfx('menu', 0.5, 1.2); return; }
      }
      if (this.mode === FIGHT_IT && p.x >= this.youText.x && p.x < this.youText.x + this.youText.width && Math.abs(p.y - (this.youText.y + 3)) < 8) { this.stepYou(1); return; }
      this.modeTexts.forEach((m, k) => { if (p.x >= m.x - 6 && p.x < m.x + m.width + 6 && Math.abs(p.y - (m.y + 4)) < 9) { this.mode = k; this.clicked = true; } });
    });
  }

  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }
  stepMap(d) { const n = this.maps.length; this.map = (this.map + d + n) % n; lastMap = this.map; sfx('menu', 0.5, 1.1); }
  stepYou(d) { const n = this.real.length; this.you = (this.you + d + n) % n; lastYou = this.you; sfx('menu', 0.5, 1.2); }
  stepSkin(d) {
    const f = TEST_ROSTER[this.sel]; if (!f) return;
    const n = skinsFor(f.id).length;
    this.skin[f.id] = stepSkinUnlocked(f.id, (this.skin[f.id] || 0), d); sfx('menu', 0.5, 1.2);   // (shop costumes stay locked until bought)
  }

  start() {
    const f = TEST_ROSTER[this.sel]; if (!f) { sfx('curse', 0.3, 1.5); return; }
    const foes = ROSTER.filter((r) => r.available);
    const foe = foes[Math.floor(Math.random() * foes.length)].id;
    const stage = this.maps[this.map].id, sk = this.skin[f.id] || 0;
    if (this.mode === WIN_SCREEN) {                                    // its win cutscene, against two random real fighters
      const others = [...foes].sort(() => Math.random() - 0.5).slice(0, 2);
      const results = [{ label: 'P1', slot: 0, fighter: f.id, skin: sk }, ...others.map((o, i) => ({ label: 'CPU', slot: i + 1, fighter: o.id, skin: 0 }))];
      sfx('select', 0.8);
      return this.scene.start('Win', { results, mode: 'stock', unlocks: [], preview: true });
    }
    if (this.mode === FIGHT_IT) Object.assign(settings, { mode: 'stock', stocks: 2, picks: [this.real[this.you].id, f.id], skins: [0, sk], cpuCount: 1, cpuLevels: [], stage });
    else Object.assign(settings, this.mode === 0
      ? { mode: 'training', dummy: 'stand', picks: [f.id, foe], skins: [sk, 0], cpuCount: 1, cpuLevels: [], stage }
      : { mode: 'stock', stocks: 2, picks: [f.id, foe], skins: [sk, 0], cpuCount: 1, cpuLevels: [], stage });
    settings.from = 'TestFighters';                  // after the match (and its win cutscene, and the results): back to the lab
    sfx('go', 0.8);
    this.scene.start('Match');
  }

  update() {
    this.t++;
    const m = this.menu.poll(), n = TEST_ROSTER.length;
    if (n && m.up) { this.sel = (this.sel - 1 + n) % n; sfx('menu', 0.5); }
    if (n && m.down) { this.sel = (this.sel + 1) % n; sfx('menu', 0.5); }
    if (m.left || m.right) { if (this.mode === FIGHT_IT) this.stepYou(m.left ? -1 : 1); else this.stepSkin(m.left ? -1 : 1); }
    if (Phaser.Input.Keyboard.JustDown(this.qKey) || m.pads.some((p) => p.button === 'y')) { this.mode = (this.mode + 1) % MODES.length; sfx('menu', 0.5, 1.2); }
    if (Phaser.Input.Keyboard.JustDown(this.eKey) || m.pads.some((p) => p.button === 'x')) this.stepMap(1);
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start')) { this.clicked = false; return this.start(); }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    const f = TEST_ROSTER[this.sel], c = this.cursor; c.clear();
    this.names.forEach((t, i) => t.setColor(i === this.sel ? '#ffffff' : '#8fbfa0'));
    this.tag.setVisible(!!f); this.skinName.setVisible(!!f); this.skinCount.setVisible(!!f); this.arrows.forEach((a) => a.setVisible(!!f));
    this.mapLabel.setVisible(!!f); this.mapName.setVisible(!!f); this.mapArrows.forEach((a) => a.setVisible(!!f)); this.mapG.clear();
    this.modeTexts.forEach((t, i) => t.setVisible(!!f).setColor(i === this.mode ? (this.t % 30 < 15 ? GOLD : '#ffffff') : '#5a6a60'));
    this.youText.setVisible(!!f && this.mode === FIGHT_IT).setText('YOU PLAY:  < ' + (this.real[this.you] ? this.real[this.you].name : '') + ' >   (A/D)');
    if (!f) return;
    c.fillStyle(LINE, 0.22); c.fillRect(L.x + 8, L.y + 26 + this.sel * 24, L.w - 16, 20);
    c.fillStyle(LINE, 1); c.fillRect(L.x + 8, L.y + 26 + this.sel * 24, 3, 20);
    const mt = this.modeTexts[this.mode]; c.fillStyle(LINE, 0.25); c.fillRect(mt.x - 6, mt.y - 6, mt.width + 12, 20);
    const mp = this.maps[this.map], mw = 128, mh = 68, mx = L.x + (L.w - mw) / 2, my = L.y + 150, mg = this.mapG;   // the map picker
    mg.fillStyle(LINE, 1); mg.fillRect(mx - 2, my - 2, mw + 4, mh + 4); mg.fillStyle(0x0b0a14, 1); mg.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
    if (mp.preview) mp.preview(mg, mx, my, mw, mh);
    else {                                                            // RANDOM: a big question mark
      mg.fillStyle(0x1e3a2a, 1); mg.fillRect(mx, my, mw, mh); mg.fillStyle(0x5ee07a, 1);
      const q = (x, y, w, h) => mg.fillRect(mx + mw / 2 - 12 + x * 4, my + 10 + y * 4, w * 4, h * 4);
      q(1, 0, 4, 1); q(0, 1, 1, 2); q(5, 1, 1, 3); q(3, 4, 2, 1); q(3, 5, 1, 3); q(3, 9, 1, 2);
    }
    this.mapName.setText(mp.name);
    this.head.setText(f.name);
    this.tag.setText(f.tag || 'PROTOTYPE');
    this.notes.setText(f.notes || '');
    this.notes.setLineSpacing(5); if (this.notes.height > R.h - 116) this.notes.setLineSpacing(2);  // long notes squeeze up so they clear the mode buttons
    if (this.notes.height > R.h - 116) this.notes.setLineSpacing(0);
    // the fighter on a lab platform under a scanning light
    const sg = this.stageG, cx = R.x + 80, by = R.y + 200; sg.clear();
    sg.fillStyle(0x5ee07a, 0.06 + 0.04 * Math.sin(this.t * 0.06)); sg.fillTriangle(cx - 10, R.y + 8, cx + 10, R.y + 8, cx + 60, by); sg.fillTriangle(cx - 10, R.y + 8, cx - 60, by, cx + 60, by);
    const scan = by - ((this.t * 1.5) % 150);
    sg.fillStyle(0x5ee07a, 0.35); sg.fillRect(cx - 44, scan, 88, 1);
    sg.fillStyle(0x1e3a2a, 1); sg.fillRect(cx - 54, by, 108, 6); sg.fillStyle(0x5ee07a, 1); sg.fillRect(cx - 54, by, 108, 1);
    const si = this.skin[f.id] || 0, skins = skinsFor(f.id);
    showFighter(this.sprite.setVisible(true), f.def, Math.floor(this.t / 6), si);
    this.skinName.setText(skins[si].name); this.skinCount.setText((si + 1) + ' / ' + skins.length);
    const sw = this.swatchG; sw.clear();
    const x0 = cx - (skins.length * 14) / 2;
    skins.forEach((s, i) => {
      const x = x0 + i * 14 + 2, y = R.y + 225;
      if (i === si) { sw.fillStyle(0xf3c358, 1); sw.fillRect(x - 2, y - 2, 14, 14); }
      sw.fillStyle(0x0b0a14, 1); sw.fillRect(x - 1, y - 1, 12, 12);
      sw.fillStyle(s.swatch ?? 0xffffff, 1); sw.fillRect(x, y, 10, 10);
      if (!skinUnlocked(f.id, i)) { sw.fillStyle(0x0b0a14, 0.7); sw.fillRect(x, y, 10, 10); sw.fillStyle(0x8a87a3, 1); sw.fillRect(x + 3, y + 4, 4, 4); sw.fillRect(x + 3, y + 2, 1, 2); sw.fillRect(x + 6, y + 2, 1, 2); sw.fillRect(x + 4, y + 1, 2, 1); }   // a padlock: a shop costume not bought yet
    });
    this.sprite.setPosition(cx, by).setScale(f.def.ownAnims ? 1.4 : 2);
  }
}
