import { initSfx } from '../audio/sfx.js';
import { makeItemTextures } from '../items/items.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.spritesheet('ss_idle', 'assets/fighters/soul-summoner/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_idle', 'assets/fighters/mr-wake/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_run', 'assets/fighters/mr-wake/run_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_moves', 'assets/fighters/mr-wake/moves_sheet.png', { frameWidth: 176, frameHeight: 120 });   // tools/sprites/mr_wake_moves.py
    this.load.spritesheet('wake_roses_moves', 'assets/fighters/mr-wake/roses/moves_sheet.png', { frameWidth: 176, frameHeight: 120 });
    this.load.spritesheet('wake_roses_run', 'assets/fighters/mr-wake/roses/run_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_roses_idle', 'assets/fighters/mr-wake/roses/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });   // Rosebud costume
    this.load.spritesheet('soul_minion_1bit', 'assets/fighters/soul-summoner/onebit_minion_sheet.png', { frameWidth: 60, frameHeight: 68 });
    this.load.spritesheet('soul_minion', 'assets/fighters/soul-summoner/soul_minion_sheet.png', { frameWidth: 60, frameHeight: 68 });
    this.load.spritesheet('ss_jump', 'assets/fighters/soul-summoner/jump_sheet.png', { frameWidth: 64, frameHeight: 64 });   // tools/sprites/soul_summoner_air.py
    this.load.spritesheet('ss_fall', 'assets/fighters/soul-summoner/fall_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('ss_moves', 'assets/fighters/soul-summoner/moves_sheet.png', { frameWidth: 96, frameHeight: 96 });   // tools/sprites/soul_summoner_moves.py
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('nu_' + k, 'assets/fighters/nu/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });   // NU (test fighter): tools/sprites/nu_moves.py
    this.load.spritesheet('nu_moves', 'assets/fighters/nu/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    this.load.spritesheet('ss_run', 'assets/fighters/soul-summoner/run_sheet.png', { frameWidth: 64, frameHeight: 64 });
    for (const k of ['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard', 'grab', 'idle_u', 'run_u', 'jump_u', 'fall_u', 'hit_u']) {
      this.load.spritesheet('hk_' + k, 'assets/fighters/hero-knight/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });
      for (const w of [1, 2, 3]) this.load.spritesheet('hk_w' + w + '_' + k, 'assets/fighters/hero-knight/worn' + w + '/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Battle-Worn stages
      this.load.spritesheet('hk_aka_' + k, 'assets/fighters/hero-knight/akatsuki/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Akatsuki costume
      this.load.spritesheet('hk_sam_' + k, 'assets/fighters/hero-knight/samurai/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Samurai costume
    }
    for (const [key, dir] of [['hk_moves', ''], ['hk_w1_moves', 'worn1/'], ['hk_w2_moves', 'worn2/'], ['hk_w3_moves', 'worn3/'], ['hk_sam_moves', 'samurai/'], ['hk_aka_moves', 'akatsuki/']]) {
      this.load.spritesheet(key, 'assets/fighters/hero-knight/' + dir + 'moves_sheet.png', { frameWidth: 180, frameHeight: 140 });   // tools/sprites/hero_knight_moves.py
    }
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight']) this.load.image('icon_' + id, 'assets/fighters/' + id + '/icon.png');   // select-screen icons
    this.load.spritesheet('ss_juggle', 'assets/fighters/soul-summoner/juggle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight', 'random', 'unlock', 'sky-sanctum', 'verdant-spires', 'gravemoon-bridge', 'neon-arcade', 'elderwood-hollow']) this.load.audio('voice_' + id, ['assets/audio/voice/' + id + '.ogg', 'assets/audio/voice/' + id + '.mp3']);   // announcer
    this.load.audio('bgm_arcade', ['assets/audio/music/arcade.ogg', 'assets/audio/music/arcade.mp3']);
    this.load.audio('bgm_title', ['assets/audio/music/title.ogg', 'assets/audio/music/title.mp3']);
    this.load.audio('bgm_select', ['assets/audio/music/select.ogg', 'assets/audio/music/select.mp3']);
    this.load.audio('bgm_sky', ['assets/audio/music/sky.ogg', 'assets/audio/music/sky.mp3']);
    this.load.audio('bgm_spires', ['assets/audio/music/spires.ogg', 'assets/audio/music/spires.mp3']);
    this.load.audio('bgm_forest', ['assets/audio/music/forest.ogg', 'assets/audio/music/forest.mp3']);   // Elderwood Hollow: plays once these files are added
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
