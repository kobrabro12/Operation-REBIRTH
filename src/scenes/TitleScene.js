import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { addFullscreenButton } from '../ui/fullscreen.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.t = 0;
    const g = this.add.graphics();
    playMusic(this, 'bgm_title');
    const bands = [0x0b0a14, 0x131029, 0x1b1640, 0x241d57, 0x2e246c];
    bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * 72, VIEW_W, 72); });
    this.stars = this.add.graphics();
    this.starList = Array.from({ length: 50 }, (_, i) => ({ x: (i * 97) % VIEW_W, y: (i * 53) % 220, s: i % 3 }));

    this.add.text(VIEW_W / 2, 62, 'OPERATION', { fontFamily: FONT, fontSize: '14px', color: '#78a0c6', stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5);
    this.logo = this.add.text(VIEW_W / 2, 96, 'REBIRTH', { fontFamily: FONT, fontSize: '40px', color: '#f3c358', stroke: '#4a280b', strokeThickness: 8 }).setOrigin(0.5);
    this.hero = this.add.sprite(VIEW_W / 2, 262, 'ss_idle', 0).setOrigin(0.5, 59 / 64).setScale(2);
    this.glow = this.add.graphics();
    this.prompt = this.add.text(VIEW_W / 2, 300, 'CLICK OR PRESS ENTER / START', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(VIEW_W / 2, 340, 'WASD MOVE   SPACE JUMP   J ATTACK   K SPECIAL   L SHIELD   I GRAB   O LIMIT   (TOUCH CONTROLS ON PHONES)', { fontFamily: FONT, fontSize: '6px', color: '#8a87a3' }).setOrigin(0.5);
    this.menu = new MenuInput(this);
    this.clicked = false;
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.clicked = true; });
    addFullscreenButton(this, VIEW_W - 8, 8);
  }
  update() {
    this.t++;
    this.stars.clear();
    for (const s of this.starList) {
      this.stars.fillStyle(0xf0f2f3, (this.t + s.x) % 90 < 70 ? 0.9 : 0.3);
      this.stars.fillRect(s.x, s.y, 1 + s.s % 2, 1 + s.s % 2);
    }
    this.hero.setFrame(Math.floor(this.t / 6) % 32);
    this.logo.y = 96 + Math.round(Math.sin(this.t / 30) * 2);
    this.prompt.setVisible(this.t % 60 < 40);
    this.glow.clear();
    this.glow.fillStyle(0x78a0c6, 0.15); this.glow.fillRect(VIEW_W / 2 - 60, 262, 120, 4);
    const m = this.menu.poll();
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'start' || p.button === 'a')) {
      sfx('select', 0.8);
      if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume();
      this.scene.start('Setup');
    }
  }
}
