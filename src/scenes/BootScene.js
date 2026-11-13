import {makeOriginalSoulPortraits,SOUL_ATLASES} from '../souls/portraits.js';
import {installMobileTextures} from '../mobileTextures.js';
import {deferCostumeSheets} from '../fighters/lazySheets.js';
import {PREMIUM_ANIMS} from '../fighters/premiumAnimsData.js';
import {CHARACTER_SPEECH,CHARACTER_NAME_CALLS,FIGHTER_ANNOUNCER_IDS} from '../audio/speechPolicy.js';
import {KEEPER_SCAR_ASSET,NOLI_TAP_FACE_ASSET} from '../data/shopFacePolicy.js';
import { loadFairyVoice } from '../audio/fairyVoice.js';
import { NOLI_MOODS } from './ShopScene.js';
import { loadVoiceLines } from '../audio/voiceLines.js';
import { DV_SETS } from '../fighters/devoted.js';
import { initSfx } from '../audio/sfx.js';
import { makeItemTextures, SOUL_HEART } from '../items/items.js';
import flagEmblemUrl from './flag_emblem.png?inline';
// AERO's SCORCHED EARTH costume: its small strips are inlined (tools/sprites/aero_scorched.py), its moves sheet is a file
import scIdle from '../fighters/aero_scorched/idle_sheet.png?inline';
import scRun from '../fighters/aero_scorched/run_sheet.png?inline';
import scJump from '../fighters/aero_scorched/jump_sheet.png?inline';
import scFall from '../fighters/aero_scorched/fall_sheet.png?inline';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    installMobileTextures(this);
    deferCostumeSheets(this);   // costume strips other than idle load per match (src/fighters/lazySheets.js)
    for(const k of ['idle','walk','run','jump','fall'])this.load.spritesheet('fists_'+k,'assets/fighters/fists/'+k+'_sheet.png',{frameWidth:96,frameHeight:96});
    this.load.spritesheet('fists_moves','assets/fighters/fists/moves_sheet.png',{frameWidth:192,frameHeight:192});
    for(const id of ['bill-cipher','shadow-young-link'])this.load.audio('soul_music_'+id,['assets/audio/soul-battles/'+id+'.ogg','assets/audio/soul-battles/'+id+'.mp3']);
    // soul portraits: the pre-made 96 px sheets (npm run bake:souls); ?bakeSouls=1 loads the full pictures to make them
    const bakeSouls=/[?&]bakeSouls=1\b/.test(location.search);if(bakeSouls)globalThis.__soulBake={};
    for(const a of SOUL_ATLASES)bakeSouls?this.load.image(a.key+'_source','assets/souls/'+a.file):this.load.image(a.key+'_baked','assets/souls/baked/'+a.key+'.png');
    this.load.image('soul_shadow_young_link_source','assets/souls/shadow-young-link.png');
    this.load.image('soul_healing_orb','assets/souls/healing-orb.png');
    this.load.spritesheet('soul_portraits','assets/souls/portraits.png',{frameWidth:724,frameHeight:724});
    // The HTML image is visible before Phaser and remains above its canvas during asset loading.
    const loadingProgress=(value)=>{
      const percent=Math.round(value*100),bar=document.getElementById('loading-progress');
      bar?.setAttribute('aria-valuenow',String(percent));
      const fill=document.getElementById('loading-fill'),label=document.getElementById('loading-percent');
      if(fill)fill.style.width=percent+'%';if(label)label.textContent=percent+'%';
    };
    this.load.on('progress',loadingProgress);
    this.events.once('shutdown',()=>this.load.off('progress',loadingProgress));
    for(const a of Object.values(PREMIUM_ANIMS)){this.load.spritesheet(a.key,a.path,{frameWidth:a.width,frameHeight:a.height});this.load.spritesheet(a.idleKey,a.idlePath,{frameWidth:a.idleWidth,frameHeight:a.idleHeight});}
    for(const k of ['idle','run','juggle','jump','fall'])this.load.spritesheet('ss_judgment_'+k,'assets/fighters/soul-summoner/judgment/'+k+'_sheet.png',{frameWidth:64,frameHeight:64});
    this.load.spritesheet('ss_judgment_moves','assets/fighters/soul-summoner/judgment/moves_sheet.png',{frameWidth:112,frameHeight:104});
    this.load.spritesheet('azure_water_cape','assets/fighters/hero-knight/azure_water_cape.png',{frameWidth:64,frameHeight:64});
    if(NOLI_TAP_FACE_ASSET)this.load.spritesheet('shop_face_noli_tap',NOLI_TAP_FACE_ASSET,{frameWidth:64,frameHeight:64});
    if(KEEPER_SCAR_ASSET)this.load.spritesheet('shop_face_scar',KEEPER_SCAR_ASSET,{frameWidth:64,frameHeight:64});
    if(CHARACTER_SPEECH)for(const key of ['fairy_question','lacy_restored','frost_freeze'])this.load.audio('cin_'+key,['assets/audio/outro-voices/'+key+'.ogg','assets/audio/outro-voices/'+key+'.mp3']);
    for(const key of ['shrine','shrine_turn','shrine_release_u','shrine_hands_u','shrine_weapon'])this.load.spritesheet('hk_'+key,'assets/fighters/hero-knight/'+key+'_sheet.png',{frameWidth:150,frameHeight:90});
    loadFairyVoice(this.load);
    this.load.spritesheet('moon_tiles','assets/stages/gravemoon/tiles.png',{frameWidth:64,frameHeight:64});
    this.load.spritesheet('gladiator_attack', new URL('../gladiator-attack-aligned.png', import.meta.url).href, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('spirit_gladiator', new URL('../gladiator-aligned.png', import.meta.url).href, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('spirit_kneel', new URL('../spirit-kneel.png', import.meta.url).href, { frameWidth: 48, frameHeight: 56 });
    this.load.spritesheet('gladiator_kneel', new URL('../gladiator-kneel.png', import.meta.url).href, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('spirit_flight', new URL('../earth-skeletons.png', import.meta.url).href, { frameWidth: 48, frameHeight: 56 });
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
    for (const k of ['idle','walk','run','jump','fall','moves']) this.load.spritesheet('yl_'+k, 'assets/fighters/young-link/'+k+'_sheet.png', {frameWidth:160,frameHeight:128});
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_' + k, 'assets/fighters/aero/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });   // AERO (test fighter): tools/sprites/aero_moves.py
    this.load.spritesheet('aero_moves', 'assets/fighters/aero/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    // FULL AERO: his transformed look (Mason's drawings, tools/sprites/art/full_aero*.png, built by aero_moves.py);
    // the white-and-navy one is what he wears on INFECTED.EXE
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_king_' + k, 'assets/fighters/aero/king/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('aero_king_moves', 'assets/fighters/aero/king/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_king_inf_' + k, 'assets/fighters/aero/king/infected/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('aero_king_inf_moves', 'assets/fighters/aero/king/infected/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    // AERO64's FULL AERO (3D, tools/sprites/aero_3d.py --king); all but idle load with the costume (lazySheets)
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('aero_king_n64_' + k, 'assets/fighters/aero/n64/king/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('aero_king_n64_moves', 'assets/fighters/aero/n64/king/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    this.load.spritesheet('nu_moves', 'assets/fighters/nu/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    this.load.spritesheet('nu_school_amp', 'assets/fighters/nu/school/amp.png', { frameWidth: 32, frameHeight: 64 });   // HOMEROOM's AMP DROP: a locker and a boombox
    // LAST SEEN (test fighter) and SEEN, what she turns into: tools/sprites/last_seen_moves.py
    // (SEEN's costumes AFTER HOURS / GRAND OPENING / LAKEBED redraw the animatronic: wrong/<set>/)
    // ROSEMARY's RED ARMY costume (code PAPERSPLEASE): her redrawn calm form, and the TANK she turns into (all 112x104)
    for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('ls_soviet_' + k, 'assets/fighters/last-seen/soviet/' + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('ls_soviet_moves', 'assets/fighters/last-seen/soviet/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    for (const k of ['idle', 'run', 'jump', 'fall', 'moves']) this.load.spritesheet('ls_tank_' + k, 'assets/fighters/last-seen/tank/' + k + '_sheet.png', { frameWidth: 112, frameHeight: 104 });
    for (const [pre, dir] of [['ls_', ''], ['ls_bunny_', 'bunny/'], ['ls_wrong_bunny_', 'bunny/wrong/'], ['ls_wrong_', 'wrong/'], ...['rave', 'showtime', 'drowned', 'angler'].map((c) => ['ls_wrong_' + c + '_', 'wrong/' + c + '/'])]) {
      for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet(pre + k, 'assets/fighters/last-seen/' + dir + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet(pre + 'moves', 'assets/fighters/last-seen/' + dir + 'moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
      if (pre !== 'ls_' && pre !== 'ls_bunny_') this.load.spritesheet(pre + 'axe', 'assets/fighters/last-seen/' + dir + 'axe.png', { frameWidth: 32, frameHeight: 40 });   // SEEN's axe, stuck in the floor (SCREAM)
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
      ['wake_choir_', 'mr-wake/choir/', ['idle', 'run', 'jump', 'fall'], 176, 120], ['wake_artist_', 'mr-wake/artist/', ['idle', 'run', 'jump', 'fall'], 176, 120], ['wake_vampire_', 'mr-wake/vampire/', ['idle', 'run', 'jump', 'fall'], 176, 120], ['wake_sakura_', 'mr-wake/sakura/', ['idle', 'run', 'jump', 'fall'], 176, 120],
      ['nu_vapor_', 'nu/vapor/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['aero_sunset_', 'aero/sunset/', ['idle', 'run', 'jump', 'fall'], 112, 104],
      ['ss_orrery_', 'soul-summoner/orrery/', ['idle', 'juggle', 'run', 'jump', 'fall'], 112, 104], ['ss_celestial_', 'soul-summoner/celestial/', ['idle', 'juggle', 'run', 'jump', 'fall'], 112, 104], ['ss_olive_', 'soul-summoner/olive/', ['idle', 'juggle', 'run', 'jump', 'fall'], 112, 104], ['wake_plague_', 'mr-wake/plague/', ['idle', 'run', 'jump', 'fall'], 176, 120],
      ['nu_glam_', 'nu/glam/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['nu_surf_', 'nu/surf/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['aero_tide_', 'aero/tide/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['aero_n64_', 'aero/n64/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['aero_midnight_', 'aero/midnight/', ['idle', 'run', 'jump', 'fall'], 112, 104],
      // the nesting-doll costumes (code PAPERSPLEASE)
      ['ss_tricolore_', 'soul-summoner/tricolore/', ['idle', 'juggle', 'run', 'jump', 'fall'], 112, 104], ['wake_teatime_', 'mr-wake/teatime/', ['idle', 'run', 'jump', 'fall'], 176, 120],
      ['nu_luckyred_', 'nu/luckyred/', ['idle', 'run', 'jump', 'fall'], 112, 104], ['aero_amber_', 'aero/amber/', ['idle', 'run', 'jump', 'fall'], 112, 104]]) {
      for (const k of ks) this.load.spritesheet(pre + k, 'assets/fighters/' + dir + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet(pre + 'moves', 'assets/fighters/' + dir + 'moves_sheet.png', { frameWidth: mw, frameHeight: mh });
    }
    for (const [k, url] of [['idle', scIdle], ['run', scRun], ['jump', scJump], ['fall', scFall]]) this.load.spritesheet('aero_scorched_' + k, url, { frameWidth: 64, frameHeight: 64 });
    // THE DEVOTED (WIP test fighter): one set per sludge stage (tools/sprites/devoted_draw.py)
    for (const dir of ['', 'semi', 'taken', 'drowned', ...DV_SETS.flatMap((s) => [s, s + '/semi', s + '/taken', s + '/drowned'])]) {   // (+ the drawn costumes', loaded per match)
      for (const k of ['idle', 'run', 'jump', 'fall']) this.load.spritesheet('dv_' + (dir ? dir.replace('/', '_') + '_' : '') + k, 'assets/fighters/devoted/' + (dir ? dir + '/' : '') + k + '_sheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('dv_' + (dir ? dir.replace('/', '_') + '_' : '') + 'moves', 'assets/fighters/devoted/' + (dir ? dir + '/' : '') + 'moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    }
    this.load.spritesheet('aero_scorched_moves', 'assets/fighters/aero/scorched/moves_sheet.png', { frameWidth: 112, frameHeight: 104 });
    for (const k of ['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard', 'counter', 'grab', 'idle_u', 'run_u', 'jump_u', 'fall_u', 'hit_u']) {
      this.load.spritesheet('hk_' + k, 'assets/fighters/hero-knight/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });
      for (const w of [1, 2, 3]) this.load.spritesheet('hk_w' + w + '_' + k, 'assets/fighters/hero-knight/worn' + w + '/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Battle-Worn stages
      this.load.spritesheet('hk_aka_' + k, 'assets/fighters/hero-knight/akatsuki/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Akatsuki costume
      this.load.spritesheet('hk_sam_' + k, 'assets/fighters/hero-knight/samurai/' + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // Samurai costume
      for (const [p, dir] of [['hk_obs_', 'obsidian/'], ['hk_cyb_', 'cyber/'], ['hk_ver_', 'verdant/'], ['hk_lib_', 'liberty/'], ['hk_prism_', 'prism/']]) this.load.spritesheet(p + k, 'assets/fighters/hero-knight/' + dir + k + '_sheet.png', { frameWidth: 150, frameHeight: 90 });   // shop costumes
    }
    for (const [key, dir] of [['hk_moves', ''], ['hk_w1_moves', 'worn1/'], ['hk_w2_moves', 'worn2/'], ['hk_w3_moves', 'worn3/'], ['hk_sam_moves', 'samurai/'], ['hk_aka_moves', 'akatsuki/'], ['hk_obs_moves', 'obsidian/'], ['hk_cyb_moves', 'cyber/'], ['hk_ver_moves', 'verdant/'], ['hk_lib_moves', 'liberty/'], ['hk_prism_moves', 'prism/']]) {
      this.load.spritesheet(key, 'assets/fighters/hero-knight/' + dir + 'moves_sheet.png', { frameWidth: 180, frameHeight: 140 });   // tools/sprites/hero_knight_moves.py
    }
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight']) this.load.image('icon_' + id, 'assets/fighters/' + id + '/icon.png');   // select-screen icons
    this.load.spritesheet('ss_taunt', 'assets/fighters/soul-summoner/taunt_sheet.png', { frameWidth: 64, frameHeight: 64 });   // his taunt: Mason's drawing (16 frames)
    this.load.spritesheet('ss_juggle', 'assets/fighters/soul-summoner/juggle_sheet.png', { frameWidth: 64, frameHeight: 64 });
    for (const id of ['soul-summoner', 'mr-wake', 'hero-knight', 'nu', 'aero', 'new-challenger', 'random', 'unlock', 'sky-sanctum', 'verdant-spires', 'gravemoon-bridge', 'neon-arcade', 'elderwood-hollow']) if(CHARACTER_NAME_CALLS||!FIGHTER_ANNOUNCER_IDS.has(id))this.load.audio('voice_' + id, ['assets/audio/voice/' + id + '.ogg', 'assets/audio/voice/' + id + '.mp3']);   // announcer
    // Music (bgm_*) isn't loaded here: each track streams when it's played - its name goes in TRACKS in src/audio/music.js
    loadVoiceLines(this.load);   // Mason's voice lines (VOICE STUDIO -> src/data/voiceLines.js)
    this.load.image('shop_fragment', 'assets/shop/fragment.png');
    this.load.image('shop_crown', 'assets/shop/crown.png');
    // the code PAPERSPLEASE (tools/sprites/soviet_art.py): the OUR VICTORY poster, the VODKA bottle (unlocks STALINGRAD), the nesting dolls
    this.load.image('shop_poster', 'assets/shop/poster.png');
    this.load.image('shop_flag_emblem', flagEmblemUrl);   // (inlined: tools/sprites/soviet_art.py writes it into src/scenes)
    this.load.spritesheet('shop_dolls', 'assets/shop/dolls.png', { frameWidth: 40, frameHeight: 56 });   // the CROWN OF MASKS (from Mason's picture, tools/sprites/art/crown_of_masks.png) - hidden in EXTRAS until NOLI, unlocks MASKED THRONE   // the GALAXY FRAGMENT (Mason's gem) - sold in EXTRAS, unlocks FRACTURED
    this.load.spritesheet('shop_rtd', 'assets/shop/rtd_scream.png', { frameWidth: 68, frameHeight: 68 });   // the shop's RTD secret: Rosemary screaming (tools/sprites/rosemary_scream.py)
    for (const f of ['calm', 'happy', 'money', 'shock', 'smug', 'glasses', 'grin', 'melt', 'bow', 'stare', 'noli', 'sickle']) this.load.spritesheet('shop_face_' + f, 'assets/shop/face_' + f + '.png', { frameWidth: 64, frameHeight: 64 });   // the shopkeeper's faces (Mason's drawings; a sheet of 64x64 frames each, so they can be animated)
    if(CHARACTER_SPEECH)for (const [k, n] of Object.entries(NOLI_MOODS)) for (let i = 0; i < n; i++) this.load.audio('noli_v_' + k + '_' + i, ['assets/shop/noli_voice/' + k + '_' + i + '.ogg', 'assets/shop/noli_voice/' + k + '_' + i + '.mp3']);   // NOLI's glitchy voice (tools/audio/noli_voice.py)
    this.load.spritesheet('bp_guests', 'assets/stages/baseplate/guests.png', { frameWidth: 32, frameHeight: 32 });   // BASEPLATE 2012's guests: Mason's drawings, half size - frame 0, and 1 = the one in fifty (tools/sprites/baseplate_guests.py)
    this.load.spritesheet('hk_sam_pray', 'assets/fighters/hero-knight/samurai/pray_sheet.png', { frameWidth: 64, frameHeight: 64 });   // Mason's praying animation for Samurai Lacy's outro (9 frames, a 3x3 grid; feet at 32,58)
    this.load.audio('sfx_idiot', ['assets/audio/sfx/idiot.ogg', 'assets/audio/sfx/idiot.mp3']);   // INFECTED.EXE: plays while YOU ARE AN IDIOT's pop-ups are up
    for (let i = 1; i <= 5; i++) this.load.audio('amp_song' + i, ['assets/audio/sfx/amp_song' + i + '.ogg', 'assets/audio/sfx/amp_song' + i + '.mp3']);   // NU's AMP: 8-bit rock loops at 90 BPM (1-4: tools/audio/amp_songs.py; 5: Mason's own track)
    this.load.audio('sfx_seen_scream', ['assets/audio/sfx/seen_scream.ogg', 'assets/audio/sfx/seen_scream.mp3']);   // LAST SEEN as SEEN: its SCREAM (cut from Mason's pixelated_audio_3)
    if(CHARACTER_SPEECH)this.load.audio('sfx_mail_voice', ['assets/audio/sfx/mail_voice.ogg', 'assets/audio/sfx/mail_voice.mp3']);
    this.load.spritesheet('item_heart_anim', SOUL_HEART.url, { frameWidth: SOUL_HEART.frame, frameHeight: SOUL_HEART.frame });
    this.load.audio('fireball_charge', ['assets/audio/sfx/fireball_charge.ogg', 'assets/audio/sfx/fireball_charge.mp3']);
    this.load.audio('fireball_throw', ['assets/audio/sfx/fireball_throw.ogg', 'assets/audio/sfx/fireball_throw.mp3']);
  }
  create() {
    initSfx(this);
    makeItemTextures(this);
    makeOriginalSoulPortraits(this);
    this.scene.start('Title');
    const loading=document.getElementById('loading');
    if(loading)requestAnimationFrame(()=>{loading.classList.add('ready');setTimeout(()=>loading.remove(),200);});
  }
}

