import { initSfx } from '../audio/sfx.js';
import { makeItemTextures } from '../items/items.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.spritesheet('ss_idle', 'assets/fighters/soul-summoner/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_idle', 'assets/fighters/mr-wake/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('soul_minion', 'assets/fighters/soul-summoner/soul_minion_sheet.png', { frameWidth: 60, frameHeight: 68 });
    this.load.spritesheet('ss_walk', 'assets/fighters/soul-summoner/walk_sheet.png', { frameWidth: 64, frameHeight: 64 });
    for (const k of ['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard']) {
      this.load.spritesheet('hk_' + k, 'assets/fighters/hero-knight/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });
      for (const w of [1, 2, 3]) this.load.spritesheet('hk_w' + w + '_' + k, 'assets/fighters/hero-knight/worn' + w + '/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Battle-Worn stages
    }
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight']) this.load.image('icon_' + id, 'assets/fighters/' + id + '/icon.png');   // select-screen icons
    this.load.spritesheet('ss_juggle', 'assets/fighters/soul-summoner/juggle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.audio('bgm_title', ['assets/audio/music/title.ogg', 'assets/audio/music/title.mp3']);
    this.load.audio('bgm_select', ['assets/audio/music/select.ogg', 'assets/audio/music/select.mp3']);
    this.load.audio('bgm_gravemoon', ['assets/audio/music/gravemoon.ogg', 'assets/audio/music/gravemoon.mp3']);
    this.load.audio('fireball_charge', 'assets/audio/sfx/fireball_charge.wav');
    this.load.audio('fireball_throw', 'assets/audio/sfx/fireball_throw.wav');
  }
  create() {
    initSfx(this);
    makeItemTextures(this);
    const l = document.getElementById('loading'); if (l) l.remove();
    this.scene.start('Title');
  }
}
