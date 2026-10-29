// Other: everything that isn't a battle or a setting. A list on the left, details on the right:
//   TRAINING      - jumps into battle setup with Training mode picked
//   HOW TO PLAY   - the controls and the basics
//   TIPS & ITEMS  - smash attacks, grabs, dodging Limits and what each item does
//   CREDITS       - who made what
// W/S or arrows pick, J / Enter / A opens, K / Esc / B goes back; or use the mouse.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { settings } from '../settings.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ArcadeBg, titleBanner, hintBar, ARC } from '../ui/arcade.js';
import { ListScreen } from '../ui/listScreen.js';

const ENTRIES = [
  { name: 'TRAINING', icon: 'dummy', info: 'PRACTISE AGAINST DUMMIES WITH\nNO STOCKS AND NO TIMER.\n\nSEE YOUR DAMAGE AND COMBOS,\nSHOW HITBOXES, SLOW DOWN TIME\nAND FILL YOUR LIMIT GAUGE.\n\nPRESS ENTER TO SET IT UP.', go: true },
  { name: 'HOW TO PLAY', icon: 'pad', info: 'MOVE         WASD\nJUMP         SPACE  (OR W)\nATTACK       J\nSPECIAL      K  (+ A DIRECTION)\nSHIELD       L  (+ DIRECTION: DODGE)\nGRAB         I\nLIMIT        O  (WHEN THE GAUGE IS FULL)\nTAUNT        1  (OR CLICK A STICK)\nPAUSE        ESC\n\nKNOCK RIVALS OFF THE STAGE!\nTHE MORE DAMAGE THEY HAVE,\nTHE FARTHER THEY FLY.' },
  { name: 'TIPS & ITEMS', icon: 'bulb', info: 'SMASH ATTACK: TAP A DIRECTION AND\n  ATTACK TOGETHER. SLOW, BUT IT KOS.\nHOLDING SOMEONE: J TO PUMMEL,\n  A DIRECTION TO THROW.\nGRABBED? MASH TO BREAK FREE.\nLIMITS CAN BE DODGED - WATCH FOR\n  THE WIND-UP AND JUMP OR ROLL.\n\nSOUL HEART    HEALS 25%\nLIMIT ORB     HALF A LIMIT GAUGE\nSWIFT FEATHER FASTER + EXTRA JUMP\nSTAR CANDY    5 S INVINCIBLE\nCURSED SKULL  SLOW AND WEAK!' },
  { name: 'CREDITS', icon: 'star', info: 'OPERATION REBIRTH\n\nGAME DESIGN, ART DIRECTION\nAND ANNOUNCER:  KOBRABRO12\n\nCODE, PIXEL ART AND MUSIC\nBUILT WITH CLAUDE\n\nLACY BASED ON THE CC0\nHERO KNIGHT SPRITE PACK\n\nTHANKS FOR PLAYING!' },
  { name: 'BACK', icon: 'back', info: '', back: true },
];

export class OtherScene extends Phaser.Scene {
  constructor() { super('Other'); }

  create() {
    this.t = 0; this.sel = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ARC.sections.other);
    titleBanner(this, 'OTHER', ARC.sections.other, { crumb: 'MAIN MENU  >  OTHER' });
    this.list = new ListScreen(this, ENTRIES, ARC.sections.other);
    hintBar(this, 'W/S SELECT   CLICK PICK   J / ENTER / A OPEN   K / ESC / B  BACK', ARC.sections.other);
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
      if (e.go) { settings.mode = 'training'; sfx('go', 0.8); this.scene.start('Setup'); return; }
      sfx('menu', 0.5, 1.2);
    }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    this.bgFx.update(this.t); this.list.draw(this.sel, this.t);
  }
}
