// Title screen: the game's logo over a live demo - CPU bots fighting it out on a random stage with
// random fighters (MatchScene in demo mode, running underneath this scene). REBIRTH flashes through the
// rainbow, letter by letter.
import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { MenuInput } from './menuInput.js';
import { sfx, setSfxMuted } from '../audio/sfx.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { demoRequest } from '../settings.js';

const WORD = 'REBIRTH';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.t = 0;
    playMusic(this, 'bgm_title');
    // the demo match plays behind the title
    if (!this.scene.isActive('Match')) { demoRequest.next = true; this.scene.launch('Match'); }
    this.scene.bringToTop();

    // shade the top and bottom so the logo and prompts read over the action
    const g = this.add.graphics();
    for (let i = 0; i < 12; i++) { g.fillStyle(0x0b0a14, 0.75 - i * 0.06); g.fillRect(0, i * 12, VIEW_W, 12); }
    for (let i = 0; i < 8; i++) { g.fillStyle(0x0b0a14, 0.2 + i * 0.07); g.fillRect(0, 266 + i * 12, VIEW_W, 12); }
    g.fillStyle(0x0b0a14, 0.25); g.fillRect(0, 144, VIEW_W, 122);

    this.add.text(VIEW_W / 2, 50, 'OPERATION', { fontFamily: FONT, fontSize: '14px', color: '#78a0c6', stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5);
    // REBIRTH: one text per letter so each can cycle through the rainbow on its own
    const style = { fontFamily: FONT, fontSize: '40px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 8 };
    this.letters = WORD.split('').map((ch) => this.add.text(0, 86, ch, style).setOrigin(0.5));
    const widths = this.letters.map((l) => l.width - 8), total = widths.reduce((a, b) => a + b, 0) - 6 * (WORD.length - 1);
    let x = VIEW_W / 2 - total / 2;
    this.letters.forEach((l, i) => { l.x = Math.round(x + widths[i] / 2); x += widths[i] - 6; });

    this.prompt = this.add.text(VIEW_W / 2, 300, 'CLICK OR PRESS ENTER / START', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(VIEW_W / 2, 340, 'WASD MOVE   SPACE JUMP   J ATTACK   K SPECIAL   L SHIELD   I GRAB   O LIMIT   (TOUCH CONTROLS ON PHONES)', { fontFamily: FONT, fontSize: '6px', color: '#c9c4dc', stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(0.5);
    this.menu = new MenuInput(this);
    this.clicked = false;
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.clicked = true; });
    addFullscreenButton(this, VIEW_W - 8, 8);
  }
  update() {
    this.t++;
    // rapid rainbow: every letter races around the colour wheel, each a step ahead of the last
    this.letters.forEach((l, i) => {
      const hue = ((this.t * 14 + i * 38) % 360) / 360;
      const c = Phaser.Display.Color.HSVToRGB(hue, 0.85, 1);
      l.setColor(Phaser.Display.Color.RGBToString(c.r, c.g, c.b));
      l.y = 86 + Math.round(Math.sin(this.t / 10 + i * 0.7) * 3);          // a little wave through the word
    });
    this.prompt.setVisible(this.t % 60 < 40);
    const m = this.menu.poll();
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'start' || p.button === 'a')) {
      this.scene.stop('Match');                                                 // end the demo
      setSfxMuted(false);
      sfx('select', 0.8);
      if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume();
      this.scene.start('Menu');
    }
  }
}
