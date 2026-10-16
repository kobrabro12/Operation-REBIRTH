import { initSfx } from '../audio/sfx.js';
import { makeSoulTextures } from '../fighters/entities.js';
import { makeItemTextures } from '../items/items.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.spritesheet('ss_idle', 'assets/fighters/soul-summoner/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_idle', 'assets/fighters/mr-wake/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('ss_juggle', 'assets/fighters/soul-summoner/juggle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.audio('fireball_charge', 'assets/audio/sfx/fireball_charge.wav');
    this.load.audio('fireball_throw', 'assets/audio/sfx/fireball_throw.wav');
  }
  create() {
    initSfx(this);
    makeSoulTextures(this);
    makeItemTextures(this);
    const l = document.getElementById('loading'); if (l) l.remove();
    this.scene.start('Title');
  }
}
