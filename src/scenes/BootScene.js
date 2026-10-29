import { loadVoiceLines } from '../audio/voiceLines.js';
import { initSfx } from '../audio/sfx.js';
import { makeItemTextures } from '../items/items.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.spritesheet('ss_idle', 'assets/fighters/soul-summoner/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_idle', 'assets/fighters/mr-wake/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_run', 'assets/fighters/mr-wake/run_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_moves', 'assets/fighters/mr-wake/moves_sheet.png', { frameWidth: 176, frameHeight: 120 });   // tools/sprites/mr_wake_moves.py
    for (const [k, dir] of [['wake', ''], ['wake_roses', 'roses/']]) for (const s of ['jump', 'fall']) this.load.spritesheet(k + '_' + s, 'assets/fighters/mr-wake/' + dir + s + '_sheet.png', { frameWidth: 64, frameHeight: 64 });   // tools/sprites/mr_wake_moves.py
    this.load.spritesheet('wake_roses_moves', 'assets/fighters/mr-wake/roses/moves_sheet.png', { frameWidth: 176, frameHeight: 120 });
    this.load.spritesheet('wake_roses_run', 'assets/fighters/mr-wake/roses/run_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wake_roses_idle', 'assets/fighters/mr-wake/roses/idle_sheet.png', { frameWidth: 64, frameHeight: 64 });   // Rosebud costume
    this.load.spritesheet('soul_minion_1bit', 'assets/fighters/soul-summoner/onebit_minion_sheet.png', { frameWidth: 60, frameHeight: 68 });
    this.load.spritesheet('soul_minion', 'assets/fighters/soul-summoner/soul_minion_sheet.png', { frameWidth: 60, frameHeight: 68 });
    this.load.spritesheet('ss_jump', 'assets/fighters/soul-summoner/jump_sheet.png', { frameWidth: 64, frameHeight: 64 });   // tools/sprites/soul_summoner_moves.py
    this.load.spritesheet('ss_fall', 'assets/fighters/soul-summoner/fall_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('ss_moves', 'assets/fighters/soul-summoner/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });   // tools/sprites/soul_summoner_moves.py
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('nu_' + k, 'assets/fighters/nu/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });   // NU (test fighter): tools/sprites/nu_moves.py
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_' + k, 'assets/fighters/aero/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });   // AERO (test fighter): tools/sprites/aero_moves.py
    this.load.spritesheet('aero_moves', 'assets/fighters/aero/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    // FULL AERO: his transformed look (Mason's drawings, tools/sprites/art/full_aero*.png, built by aero_moves.py);
    // the white-and-navy one is what he wears on INFECTED.EXE
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_king_' + k, 'assets/fighters/aero/king/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('aero_king_moves', 'assets/fighters/aero/king/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_king_inf_' + k, 'assets/fighters/aero/king/infected/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('aero_king_inf_moves', 'assets/fighters/aero/king/infected/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    this.load.spritesheet('nu_moves', 'assets/fighters/nu/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    this.load.spritesheet('nu_school_amp', 'assets/fighters/nu/school/amp.png', { frameWidth: 32, frameHeight: 64 });   // HOMEROOM's AMP DROP: a locker and a boombox
    // LAST SEEN (test fighter) and SEEN, what she turns into: tools/sprites/last_seen_moves.py
    // (SEEN's costumes AFTER HOURS / GRAND OPENING / LAKEBED redraw the animatronic: wrong/<set>/)
    for (const [pre, dir] of [['ls_', ''], ['ls_wrong_', 'wrong/'], ...['rave', 'showtime', 'drowned', 'angler'].map((c) => ['ls_wrong_' + c + '_', 'wrong/' + c + '/'])]) {
      for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet(pre + k, 'assets/fighters/last-seen/' + dir + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet(pre + 'moves', 'assets/fighters/last-seen/' + dir + 'moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
      if (pre !== 'ls_') this.load.spritesheet(pre + 'axe', 'assets/fighters/last-seen/' + dir + 'axe.png', { frameWidth: 32, frameHeight: 40 });   // SEEN's axe, stuck in the floor (SCREAM)
    }
    for (const c of ['inferno', 'street', 'bones', 'school']) {   // NU's costumes with their own drawing (tools/sprites/nu_costume_moves.py)
      for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('nu_' + c + '_' + k, 'assets/fighters/nu/' + c + '/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('nu_' + c + '_moves', 'assets/fighters/nu/' + c + '/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    }
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('wow_' + k, 'assets/fighters/what-once-was/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });   // WHAT ONCE WAS (test fighter): tools/sprites/what_once_was_moves.py
    this.load.spritesheet('wow_moves', 'assets/fighters/what-once-was/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    for (const [s, dir] of [['aero', 'frutiger'], ['hack', 'root-access'], ['ronin', 'ronin'], ['dial', 'dial-up']]) {   // its costumes with their own drawing
      for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('wow_' + s + '_' + k, 'assets/fighters/what-once-was/' + dir + '/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('wow_' + s + '_moves', 'assets/fighters/what-once-was/' + dir + '/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    }
    for (const [s, dir] of [['suit', 'body-suit'], ['swat', 'body-swat'], ['doctor', 'body-doctor']]) {   // the bodies OUT OF BODY grows
      for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('wow_' + s + '_' + k, 'assets/fighters/what-once-was/' + dir + '/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('wow_' + s + '_moves', 'assets/fighters/what-once-was/' + dir + '/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    }
    for (const [s, dir] of [['menu', ''], ['aero_menu', 'frutiger/'], ['hack_menu', 'root-access/'], ['ronin_menu', 'ronin/'], ['dial_menu', 'dial-up/']]) this.load.spritesheet('wow_' + s, 'assets/fighters/what-once-was/' + dir + 'menu_idle_sheet.png', { frameWidth: 64, frameHeight: 64 });   // with the head, for menus
    this.load.spritesheet('wow_heads', 'assets/fighters/what-once-was/heads.png', { frameWidth: 32, frameHeight: 32 });   // its TV heads: a row per costume, a column per screen picture
    this.load.spritesheet('wow_modescr', 'assets/fighters/what-once-was/mode_screens.png', { frameWidth: 11, frameHeight: 9 });   // its animated MODE screens
    this.load.spritesheet('wow_faces', 'assets/fighters/what-once-was/faces.png', { frameWidth: 11, frameHeight: 9 });   // Mason's three faces for its screen (tools/sprites/wow_faces.py)
    this.load.spritesheet('ss_run', 'assets/fighters/soul-summoner/run_sheet.png', { frameWidth: 64, frameHeight: 64 });
    // shop costumes with their own drawing (tools/sprites/shop_costumes.py): sheets in <fighter>/<costume>/
    for (const [pre, dir, ks, mw, mh] of [['ss_eclipse_', 'soul-summoner/eclipse/', ['idle', 'juggle', 'run', 'jump', 'fall'], 112, 104], ['ss_aurora_', 'soul-summoner/aurora/', ['idle', 'juggle', 'run', 'jump', 'fall'], 112, 104],
      ['wake_vampire_', 'mr-wake/vampire/', ['idle', 'run', 'jump', 'fall'], 176, 120], ['wake_sakura_', 'mr-wake/sakura/', ['idle', 'run', 'jump', 'fall'], 176, 120],
      ['nu_vapor_', 'nu/vapor/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['aero_sunset_', 'aero/sunset/', ['idle', 'run', 'jump', 'fall'], 112, 104]]) {
      for (const k of ks) this.load.spritesheet(pre + k, 'assets/fighters/' + dir + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet(pre + 'moves', 'assets/fighters/' + dir + 'moves_sheet.png', { frameWidth: mw, frameHeight: mh });
    }
    for (const k of ['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard', 'grab', 'idle_u', 'run_u', 'jump_u', 'fall_u', 'hit_u']) {
      this.load.spritesheet('hk_' + k, 'assets/fighters/hero-knight/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });
      for (const w of [1, 2, 3]) this.load.spritesheet('hk_w' + w + '_' + k, 'assets/fighters/hero-knight/worn' + w + '/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Battle-Worn stages
      this.load.spritesheet('hk_aka_' + k, 'assets/fighters/hero-knight/akatsuki/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Akatsuki costume
      this.load.spritesheet('hk_sam_' + k, 'assets/fighters/hero-knight/samurai/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Samurai costume
      for (const [p, dir] of [['hk_obs_', 'obsidian/'], ['hk_cyb_', 'cyber/']]) this.load.spritesheet(p + k, 'assets/fighters/hero-knight/' + dir + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // shop costumes
    }
    for (const [key, dir] of [['hk_moves', ''], ['hk_w1_moves', 'worn1/'], ['hk_w2_moves', 'worn2/'], ['hk_w3_moves', 'worn3/'], ['hk_sam_moves', 'samurai/'], ['hk_aka_moves', 'akatsuki/'], ['hk_obs_moves', 'obsidian/'], ['hk_cyb_moves', 'cyber/']]) {
      this.load.spritesheet(key, 'assets/fighters/hero-knight/' + dir + 'moves_sheet.png', { frameWidth: 180, frameHeight: 140 });   // tools/sprites/hero_knight_moves.py
    }
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight']) this.load.image('icon_' + id, 'assets/fighters/' + id + '/icon.png');   // select-screen icons
    this.load.spritesheet('ss_taunt', 'assets/fighters/soul-summoner/taunt_sheet.png', { frameWidth: 64, frameHeight: 64 });   // his taunt: Mason's drawing (16 frames)
    this.load.spritesheet('ss_juggle', 'assets/fighters/soul-summoner/juggle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight', 'random', 'unlock', 'sky-sanctum', 'verdant-spires', 'gravemoon-bridge', 'neon-arcade', 'elderwood-hollow']) this.load.audio('voice_' + id, ['assets/audio/voice/' + id + '.ogg', 'assets/audio/voice/' + id + '.mp3']);   // announcer
    this.load.audio('bgm_arcade', ['assets/audio/music/arcade.ogg', 'assets/audio/music/arcade.mp3']);
    this.load.audio('bgm_title', ['assets/audio/music/title.ogg', 'assets/audio/music/title.mp3']);
    this.load.audio('bgm_select', ['assets/audio/music/select.ogg', 'assets/audio/music/select.mp3']);
    this.load.audio('bgm_sky', ['assets/audio/music/sky.ogg', 'assets/audio/music/sky.mp3']);
    this.load.audio('bgm_spires', ['assets/audio/music/spires.ogg', 'assets/audio/music/spires.mp3']);
    this.load.audio('bgm_forest', ['assets/audio/music/forest.ogg', 'assets/audio/music/forest.mp3']);   // Elderwood Hollow: plays once these files are added
    this.load.audio('bgm_gravemoon', ['assets/audio/music/gravemoon.ogg', 'assets/audio/music/gravemoon.mp3']);
    this.load.audio('bgm_backrooms', ['assets/audio/music/backrooms.ogg', 'assets/audio/music/backrooms.mp3']);   // tools/audio/backrooms_music.py
    this.load.audio('bgm_aero', ['assets/audio/music/aero.ogg', 'assets/audio/music/aero.mp3']);   // tools/audio/aero_music.py
    for (const n of ['neon', 'lofi', 'chip', 'organ', 'surf', 'jazz', 'taiko', 'dream', 'mason']) this.load.audio('bgm_shop_' + n, ['assets/audio/music/shop_' + n + '.ogg', 'assets/audio/music/shop_' + n + '.mp3']);   // battle music sold in the shop (tools/audio/shop_music.py; 'mason' = Mason's own pixelated_audio 12)
    loadVoiceLines(this.load);   // Mason's voice lines (VOICE STUDIO -> src/data/voiceLines.js)
    for (const f of ['calm', 'happy', 'money', 'shock', 'smug', 'glasses']) this.load.spritesheet('shop_face_' + f, 'assets/shop/face_' + f + '.png', { frameWidth: 64, frameHeight: 64 });   // the shopkeeper's faces (Mason's drawings; a sheet of 64x64 frames each, so they can be animated)
    this.load.image('bp_guest', 'assets/stages/baseplate/guest.png');                 // BASEPLATE 2012's guests: Mason's drawings, half size (tools/sprites/baseplate_guests.py)
    this.load.image('bp_guest_glitch', 'assets/stages/baseplate/guest_glitch.png');   // ...and the one in fifty
    for (const n of [4, 5, 6, 10]) this.load.audio('bgm_baseplate_' + n, ['assets/audio/music/baseplate_' + n + '.ogg', 'assets/audio/music/baseplate_' + n + '.mp3']);   // BASEPLATE 2012's rotating soundtrack: Mason's pixelated_audio 4, 5, 6, 10
    for (const n of ['shrine', 'rosebud', 'abyss', 'dialup', 'western', 'monster', 'ragtime', 'victory', 'weather']) this.load.audio('bgm_outro_' + n, ['assets/audio/music/outro_' + n + '.ogg', 'assets/audio/music/outro_' + n + '.mp3']);   // costume outro music (tools/audio/outro_music.py)
    this.load.spritesheet('hk_sam_pray', 'assets/fighters/hero-knight/samurai/pray_sheet.png', { frameWidth: 64, frameHeight: 64 });   // Mason's praying animation for Samurai Lacy's outro (9 frames, a 3x3 grid; feet at 32,58)
    this.load.audio('bgm_infected', ['assets/audio/music/infected.ogg', 'assets/audio/music/infected.mp3']);   // Mason's track, levelled down ~10 dB so it sits under the fight
    this.load.audio('sfx_idiot', ['assets/audio/sfx/idiot.ogg', 'assets/audio/sfx/idiot.mp3']);   // INFECTED.EXE: plays while YOU ARE AN IDIOT's pop-ups are up
    for (let i = 1; i <= 5; i++) this.load.audio('amp_song' + i, ['assets/audio/sfx/amp_song' + i + '.ogg', 'assets/audio/sfx/amp_song' + i + '.mp3']);   // NU's AMP: 8-bit rock loops at 90 BPM (1-4: tools/audio/amp_songs.py; 5: Mason's own track)
    this.load.audio('sfx_seen_scream', ['assets/audio/sfx/seen_scream.ogg', 'assets/audio/sfx/seen_scream.mp3']);   // LAST SEEN as SEEN: its SCREAM (cut from Mason's pixelated_audio_3)
    this.load.audio('sfx_mail_voice', ['assets/audio/sfx/mail_voice.ogg', 'assets/audio/sfx/mail_voice.mp3']);   // INFECTED.EXE: "You've got mail!" (tools/audio/mail_voice.py)
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
