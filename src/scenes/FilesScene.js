// Character Files (TRINKETS > CHARACTER FILES): a dossier on each fighter - file number, alias, class,
// weapon, origin, signature moves and Limit - their story, and a costume browser with each costume's
// own story. Milestone costumes can be looked at and read here before they're unlocked (marked LOCKED,
// with how many KOs it takes to wear one).
// W/S switches fighter, A/D switches costume, K / Esc / B goes back.
// Mouse: click a fighter tab, or the < > arrows under the costume.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ROSTER, showFighter } from '../fighters/roster.js';
import { skinsFor, skinUnlocked, skinTier } from '../fighters/skins.js';
import { MILESTONE_KOS, getKOs } from '../progress.js';
import { FILES, SKIN_LORE, MILESTONE_LORE } from '../data/lore.js';
import { ArcadeBg, titleBanner, hintBar, panel, slant, ARC, shade } from '../ui/arcade.js';

const GOLD = '#ffd23f', DIM = '#8a87a3', LINE = ARC.sections.files, PANEL = 0x1c1230;
const TAB_W = 150, TAB_Y = 44, L = { x: 16, y: 70, w: 190, h: 262 }, R = { x: 216, y: 70, w: 408, h: 262 };

export class FilesScene extends Phaser.Scene {
  constructor() { super('Files'); }

  create() {
    this.t = 0; this.menu = new MenuInput(this);
    this.fighters = ROSTER.filter((f) => f.available);
    this.fi = 0; this.si = 0;
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, LINE, { second: ARC.sections.trinkets });
    const g = this.add.graphics();
    panel(g, L.x, L.y, L.w, L.h, LINE); panel(g, R.x, R.y, R.w, R.h, LINE);
    titleBanner(this, 'CHARACTER FILES', LINE, { crumb: 'TRINKETS  >  FILES', size: 13 });
    this.tabG = this.add.graphics();
    this.tabs = this.fighters.map((f, i) => this.add.text(L.x + TAB_W / 2 + i * (TAB_W + 6), TAB_Y + 8, f.name, { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 }).setOrigin(0.5));
    // left: the fighter in the chosen costume, on a little plinth
    this.stageG = this.add.graphics();
    this.sprite = this.add.sprite(L.x + L.w / 2, L.y + 190, this.fighters[0].def.sheets.idle, 0);
    this.skinName = this.add.text(L.x + L.w / 2, L.y + 214, '', { fontFamily: FONT, fontSize: '8px', color: GOLD }).setOrigin(0.5);
    this.skinNote = this.add.text(L.x + L.w / 2, L.y + 232, '', { fontFamily: FONT, fontSize: '5px', color: DIM, align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0);
    this.arrows = [-1, 1].map((d) => makeButton(this, L.x + L.w / 2 + d * 82, L.y + 214, d < 0 ? '<' : '>', () => this.stepSkin(d), { originX: 0.5, originY: 0.5, size: '8px' }));
    // right: the file
    const tx = R.x + 14;
    this.head = this.add.text(tx, R.y + 10, '', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#07060e', strokeThickness: 4 });
    this.fields = ['ALIAS', 'CLASS', 'WEAPON', 'ORIGIN', 'MOVES', 'LIMIT'].map((k, i) => [
      this.add.text(tx, R.y + 34 + i * 12, k, { fontFamily: FONT, fontSize: '5px', color: DIM }),
      this.add.text(tx + 52, R.y + 34 + i * 12, '', { fontFamily: FONT, fontSize: '5px', color: '#ffffff' }),
    ]);
    this.add.text(tx, R.y + 112, 'LORE', { fontFamily: FONT, fontSize: '6px', color: '#ff9ae4', stroke: '#07060e', strokeThickness: 3 });
    this.lore = this.add.text(tx, R.y + 124, '', { fontFamily: FONT, fontSize: '5px', color: '#e8e4f4', lineSpacing: 5, wordWrap: { width: R.w - 28 } });
    this.skinHead = this.add.text(tx, R.y + 208, '', { fontFamily: FONT, fontSize: '6px', color: '#ff9ae4', stroke: '#07060e', strokeThickness: 3 });
    this.skinLore = this.add.text(tx, R.y + 220, '', { fontFamily: FONT, fontSize: '5px', color: '#e8e4f4', lineSpacing: 5, wordWrap: { width: R.w - 28 } });
    hintBar(this, 'W/S FIGHTER   CLICK TAB   A/D COSTUME   K / ESC / B  BACK', LINE);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      if (p.y >= TAB_Y && p.y < TAB_Y + 16) { const i = Math.floor((p.x - L.x) / (TAB_W + 6)); if (i >= 0 && i < this.fighters.length && i !== this.fi) this.pick(i); }
    });
    this.refresh();
  }

  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }
  pick(i) { this.fi = i; this.si = 0; sfx('menu', 0.6); this.refresh(); }
  stepSkin(d) { const n = skinsFor(this.fighters[this.fi].id).length; this.si = (this.si + d + n) % n; sfx('menu', 0.5, 1.2); this.refresh(); }

  refresh() {
    const f = this.fighters[this.fi], F = FILES[f.id] || {}, skins = skinsFor(f.id), skin = skins[this.si];
    this.head.setText('FILE ' + (F.no || '???') + '  -  ' + f.name);
    const vals = [F.alias, F.cls, F.weapon, F.origin, F.moves, F.limit];
    this.fields.forEach(([, v], i) => v.setText(vals[i] || '???'));
    this.lore.setText(F.lore || 'NO FILE YET.');
    const open = skinUnlocked(f.id, this.si), tier = skinTier(f.id, this.si);
    const story = (MILESTONE_LORE[f.id] || {})[skin.name] || skin.lore || (SKIN_LORE[f.id] || {})[skin.name];
    this.skinName.setText(skin.name);
    this.skinNote.setText((this.si + 1) + ' / ' + skins.length + (tier ? '\nMILESTONE ' + tier : '') + (open ? '' : skin.shop ? '\nLOCKED: BUY IT IN THE SHOP' : '\nLOCKED: REACH ' + MILESTONE_KOS[tier] + ' KOS (' + getKOs(f.id) + ' SO FAR)'));
    this.skinHead.setText('COSTUME FILE: ' + skin.name + (tier ? '  (MILESTONE ' + tier + (open ? ')' : ' - LOCKED)') : ''));
    this.skinLore.setText(story || 'NOTHING WRITTEN ABOUT THIS COSTUME YET.');
    this.locked = !open;
  }

  update() {
    this.t++;
    const m = this.menu.poll(), n = this.fighters.length;
    if (m.up) this.pick((this.fi - 1 + n) % n);
    if (m.down) this.pick((this.fi + 1) % n);
    if (m.left) this.stepSkin(-1);
    if (m.right) this.stepSkin(1);
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    // tabs
    const tg = this.tabG; tg.clear();
    this.tabs.forEach((tx, i) => {
      const x = L.x + i * (TAB_W + 6), on = i === this.fi;
      slant(tg, x + 3, TAB_Y + 3, TAB_W, 16, 0x000000, 0.5, 6); slant(tg, x, TAB_Y - (on ? 2 : 0), TAB_W, 16 + (on ? 2 : 0), on ? LINE : 0x2a1f44, 1, 6);
      if (on) slant(tg, x, TAB_Y - 2, TAB_W, 6, 0xffffff, 0.2, 2);
      tx.setColor(on ? '#ffffff' : '#c9c4dc');
    });
    // the fighter on a plinth, breathing; sealed costumes are a dark silhouette
    const f = this.fighters[this.fi], def = f.def, sg = this.stageG; sg.clear(); this.bgFx.update(this.t);
    const cx = L.x + L.w / 2, by = L.y + 190;
    for (let r = 0; r < 4; r++) { sg.fillStyle(LINE, 0.04 + 0.02 * Math.sin(this.t * 0.05)); sg.fillCircle(cx, by - 44, 70 - r * 14); }   // a soft spotlight
    for (let k = 0; k < 3; k++) slant(sg, cx - 60 + k * 44 + ((this.t * 0.5) % 44), L.y + 20, 10, by - L.y - 20, LINE, 0.06, 30);
    slant(sg, cx - 56, by, 112, 7, shade(LINE, 0.5), 1, 4); slant(sg, cx - 50, by + 7, 100, 4, shade(LINE, 0.3), 1, 3);   // the plinth
    sg.fillStyle(LINE, 1); sg.fillRect(cx - 52, by, 104, 1);
    showFighter(this.sprite, def, Math.floor(this.t / 6), this.si);
    this.sprite.setPosition(cx, by).setScale(def.ownAnims ? 1.4 : 2);
    this.sprite.clearTint().setAlpha(this.locked ? 0.75 + 0.1 * Math.sin(this.t * 0.08) : 1);   // a locked costume: shown, but a little ghostly
    const lg = this.stageG;
    if (this.locked) {                                               // a small padlock on the plinth
      lg.fillStyle(0xf3c358, 1); lg.fillRect(cx + 36, by - 8, 10, 8); lg.lineStyle(2, 0xf3c358, 1); lg.strokeRect(cx + 38, by - 13, 6, 6);
      lg.fillStyle(0x0b0a14, 1); lg.fillRect(cx + 40, by - 5, 2, 3);
    }
  }
}
