// Trinkets: a drawer of extras and experiments - CHARACTER FILES, TEST FIGHTERS, the SHOP and ACHIEVEMENTS (with
// the PROGRESS page: lifetime stats and each fighter's record).
// W/S or arrows pick, J / Enter / A opens, K / Esc / B goes back; or use the mouse.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ArcadeBg, titleBanner, hintBar, ARC } from '../ui/arcade.js';
import { ListScreen } from '../ui/listScreen.js';

const ENTRIES = [
  { name: 'CHARACTER FILES', icon: 'files', info: 'THE FILES ON EVERY FIGHTER: WHO THEY ARE,\nWHERE THEY COME FROM, THEIR MOVES -\nAND THE STORIES BEHIND THEIR COSTUMES.', scene: 'Files' },
  { name: 'TEST FIGHTERS', icon: 'flask', info: 'FIGHTERS STILL IN THE LAB. TRY THEM OUT\nIN TRAINING OR AGAINST A CPU BEFORE\nTHEY JOIN THE REAL ROSTER.', scene: 'TestFighters' },
  { name: 'SHOP', icon: 'shop', info: 'SPEND WHAT YOU EARN ON COSTUMES, STAGES,\nMUSIC AND OTHER EXTRAS - OR TRY YOUR\nLUCK AT THE GACHA MACHINES.', scene: 'Shop' },
  { name: 'ACHIEVEMENTS', icon: 'trophy', info: 'TROPHIES FOR WHAT YOU\'VE DONE - EACH ONE\nPAYS OUT COINS FOR THE SHOP.\n\nPLUS YOUR PROGRESS: MATCHES, WINS, KOS,\nCOMPLETION AND EVERY FIGHTER\'S RECORD.', scene: 'Achievements' },
  { name: 'BACK', icon: 'back', info: '', back: true },
];
const C = { panel: 0x2a1640, line: 0xc77dff, text: '#e6c8ff' };

export class TrinketsScene extends Phaser.Scene {
  constructor() { super('Trinkets'); }

  create() {
    this.t = 0; this.sel = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ARC.sections.trinkets);
    titleBanner(this, 'TRINKETS', ARC.sections.trinkets, { crumb: 'MAIN MENU  >  TRINKETS' });
    this.list = new ListScreen(this, ENTRIES, ARC.sections.trinkets);
    hintBar(this, 'W/S SELECT   CLICK PICK   J / ENTER / A OPEN   K / ESC / B  BACK', ARC.sections.trinkets);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.clicked = false;
    const rowAt = (x, y) => this.list.rowAt(x, y);
    this.input.on('pointermove', (p) => { const i = rowAt(p.x, p.y); if (i >= 0 && i !== this.sel) { this.sel = i; sfx('menu', 0.3); } });
    this.input.on('pointerdown', (p, over) => { if (over.length) return; const i = rowAt(p.x, p.y); if (i >= 0) { this.sel = i; this.clicked = true; } });
  }

  back() { sfx('menu', 0.6); this.scene.start('Menu'); }

  update() {
    this.t++;
    const m = this.menu.poll();
    if (m.up) { this.sel = (this.sel - 1 + ENTRIES.length) % ENTRIES.length; sfx('menu', 0.5); }
    if (m.down) { this.sel = (this.sel + 1) % ENTRIES.length; sfx('menu', 0.5); }
    const e = ENTRIES[this.sel];
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'a')) {
      this.clicked = false;
      if (e.back) return this.back();
      if (e.scene) { sfx('go', 0.8); this.scene.start(e.scene); return; }
      sfx('curse', 0.3, 1.5);
    }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    this.bgFx.update(this.t); this.list.draw(this.sel, this.t);
  }
}
