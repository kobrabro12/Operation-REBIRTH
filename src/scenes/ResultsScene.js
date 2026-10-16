import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT, PLAYER_CSS, PLAYER_COLORS, PLAYER_TINTS } from '../config.js';
import { MODE_NAMES } from '../settings.js';
import { MenuInput } from './menuInput.js';
import { ROSTER, showFighter } from '../fighters/roster.js';
import { sfx } from '../audio/sfx.js';
import { addFullscreenButton } from '../ui/fullscreen.js';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  create(data) {
    this.menu = new MenuInput(this); this.t = 0;
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    const win = data.results[0];
    g.fillStyle(PLAYER_COLORS[win.slot], 0.2); g.fillRect(0, 30, VIEW_W, 90);
    this.add.text(VIEW_W / 2, 18, MODE_NAMES[data.mode] + ' - RESULTS', { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' }).setOrigin(0.5);
    this.add.text(VIEW_W / 2 + 40, 62, win.label + ' WINS!', { fontFamily: FONT, fontSize: '22px', color: PLAYER_CSS[win.slot], stroke: '#0b0a14', strokeThickness: 6 }).setOrigin(0.5);
    this.heroDef = (ROSTER.find((r) => r.id === win.fighter) || ROSTER[0]).def;
    this.hero = showFighter(this.add.sprite(120, 112, this.heroDef.sheets.idle, 0), this.heroDef, 0, win.skin || 0).setScale(1.6).setTint(PLAYER_TINTS[win.slot]);
    const unit = data.mode === 'stamina' ? ' HP' : '%';
    for (const [txt, x] of [['PLACE', 60], ['PLAYER', 116], ['KOS', 254], ['FALLS', 310], ['DEALT', 386], ['TAKEN', 486]]) {
      this.add.text(x, 144, txt, { fontFamily: FONT, fontSize: '7px', color: '#8a87a3' });
    }
    data.results.forEach((r, i) => {
      const y = 164 + i * 26;
      g.fillStyle(PLAYER_COLORS[r.slot], 0.15); g.fillRect(52, y - 6, 536, 20);
      const cols = [['#' + (i + 1), 60], [r.label, 116], [String(r.kos), 254], [String(r.falls), 310], [r.dealt + unit, 386], [r.taken + unit, 486]];
      for (const [txt, x] of cols) this.add.text(x, y, txt, { fontFamily: FONT, fontSize: '8px', color: x === 116 ? PLAYER_CSS[r.slot] : '#ffffff' });
    });
    this.prompt = this.add.text(VIEW_W / 2, 336, 'CLICK / ENTER / A  CONTINUE', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }).setOrigin(0.5);
    sfx('limitready', 0.8);
    this.clicked = false;
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.clicked = true; });
    addFullscreenButton(this, VIEW_W - 8, 6);
  }
  update() {
    this.t++;
    this.hero.setFrame(Math.floor(this.t / 6) % ((this.heroDef.frameCounts && this.heroDef.frameCounts.idle) || 32));
    this.prompt.setVisible(this.t % 60 < 40);
    if (this.t <= 40) this.clicked = false;
    const m = this.menu.poll();
    if (this.t > 40 && (m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start'))) { sfx('select', 0.8); this.scene.start('Setup'); }
  }
}
