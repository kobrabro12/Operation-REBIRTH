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

const ENTRIES = [
  { name: 'TRAINING', info: 'PRACTISE AGAINST DUMMIES WITH\nNO STOCKS AND NO TIMER.\n\nSEE YOUR DAMAGE AND COMBOS,\nSHOW HITBOXES, SLOW DOWN TIME\nAND FILL YOUR LIMIT GAUGE.\n\nPRESS ENTER TO SET IT UP.', go: true },
  { name: 'HOW TO PLAY', info: 'MOVE         WASD\nJUMP         SPACE  (OR W)\nATTACK       J\nSPECIAL      K  (+ A DIRECTION)\nSHIELD       L  (+ DIRECTION: DODGE)\nGRAB         I\nLIMIT        O  (WHEN THE GAUGE IS FULL)\nTAUNT        1  (OR CLICK A STICK)\nPAUSE        ESC\n\nKNOCK RIVALS OFF THE STAGE!\nTHE MORE DAMAGE THEY HAVE,\nTHE FARTHER THEY FLY.' },
  { name: 'TIPS & ITEMS', info: 'SMASH ATTACK: TAP A DIRECTION AND\n  ATTACK TOGETHER. SLOW, BUT IT KOS.\nHOLDING SOMEONE: J TO PUMMEL,\n  A DIRECTION TO THROW.\nGRABBED? MASH TO BREAK FREE.\nLIMITS CAN BE DODGED - WATCH FOR\n  THE WIND-UP AND JUMP OR ROLL.\n\nSOUL HEART    HEALS 25%\nLIMIT ORB     HALF A LIMIT GAUGE\nSWIFT FEATHER FASTER + EXTRA JUMP\nSTAR CANDY    5 S INVINCIBLE\nCURSED SKULL  SLOW AND WEAK!' },
  { name: 'CREDITS', info: 'OPERATION REBIRTH\n\nGAME DESIGN, ART DIRECTION\nAND ANNOUNCER:  KOBRABRO12\n\nCODE, PIXEL ART AND MUSIC\nBUILT WITH CLAUDE\n\nLACY BASED ON THE CC0\nHERO KNIGHT SPRITE PACK\n\nTHANKS FOR PLAYING!' },
  { name: 'BACK', info: '', back: true },
];

export class OtherScene extends Phaser.Scene {
  constructor() { super('Other'); }

  create() {
    this.t = 0; this.sel = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x0c2a1e, 1); g.fillRect(16, 56, 180, 260); g.fillRect(208, 56, 416, 260);
    g.fillStyle(0x2fa070, 1); g.fillRect(16, 56, 180, 2); g.fillRect(208, 56, 416, 2);
    this.add.text(VIEW_W / 2, 28, 'OTHER', { fontFamily: FONT, fontSize: '16px', color: '#6fe3a8', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
    this.cursor = this.add.graphics();
    this.items = ENTRIES.map((e, i) => this.add.text(34, 80 + i * 30, e.name, { fontFamily: FONT, fontSize: '9px', color: '#c9c4dc' }));
    this.info = this.add.text(226, 76, '', { fontFamily: FONT, fontSize: '7px', color: '#e8e4f4', lineSpacing: 8 });
    this.add.text(VIEW_W / 2, VIEW_H - 8, 'W/S SELECT   J / ENTER / A OPEN   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.clicked = false;
    const rowAt = (x, y) => (x > 20 && x < 192 ? (i => (i >= 0 && i < ENTRIES.length ? i : -1))(Math.floor((y - 72) / 30)) : -1);
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
    this.items.forEach((t, i) => t.setColor(i === this.sel ? (ENTRIES[i].back ? '#f3c358' : '#ffffff') : ENTRIES[i].back ? '#6fe3a8' : '#c9c4dc'));
    this.info.setText(e.info);
    const c = this.cursor; c.clear();
    c.fillStyle(0x2fa070, 0.3); c.fillRect(22, 74 + this.sel * 30, 168, 20);
    c.fillStyle(0x6fe3a8, 1); c.fillRect(22, 74 + this.sel * 30, 3, 20);
  }
}
