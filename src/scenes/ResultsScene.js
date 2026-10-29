import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT, PLAYER_CSS, PLAYER_COLORS, PLAYER_TINTS } from '../config.js';
import { MODE_NAMES, settings } from '../settings.js';
import { MenuInput } from './menuInput.js';
import { ROSTER, showFighter } from '../fighters/roster.js';
import { voiceLine } from '../audio/voiceLines.js';
import { checkAchievements } from '../achievements.js';
import { achievementToasts } from '../ui/toast.js';
import { sfx } from '../audio/sfx.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { skinsFor } from '../fighters/skins.js';
import { getKOs, MILESTONE_KOS } from '../progress.js';
import { announce } from '../audio/announcer.js';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  create(data) {
    this.menu = new MenuInput(this); this.t = 0;
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    const win = data.results[0];
    g.fillStyle(PLAYER_COLORS[win.slot], 0.2); g.fillRect(0, 30, VIEW_W, 90);
    this.add.text(VIEW_W / 2, 18, MODE_NAMES[data.mode] + ' - RESULTS', { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' }).setOrigin(0.5);
    this.add.text(VIEW_W / 2 + 40, 62, win.label + ' WINS!', { fontFamily: FONT, fontSize: '22px', color: PLAYER_CSS[win.slot], stroke: '#0b0a14', strokeThickness: 6 }).setOrigin(0.5);
    this.heroDef = (ROSTER.find((r) => r.id === win.fighter) || ROSTER[0]).def;
    this.time.delayedCall(900, () => voiceLine(this, win.fighter, 'win'));   // Mason's win line, if he made one
    this.hero = showFighter(this.add.sprite(120, 112, this.heroDef.sheets.idle, 0), this.heroDef, 0, win.skin || 0).setScale(1.6).setTint(PLAYER_TINTS[win.slot]);
    const unit = data.mode === 'stamina' ? ' HP' : '%';
    for (const [txt, x] of [['PLACE', 60], ['PLAYER', 116], ['KOS', 254], ['FALLS', 310], ['DEALT', 386], ['TAKEN', 486]]) {
      this.add.text(x, 144, txt, { fontFamily: FONT, fontSize: '7px', color: '#8a87a3' });
    }
    data.results.forEach((r, i) => {
      const y = 164 + i * 26;
      g.fillStyle(PLAYER_COLORS[r.slot], 0.15); g.fillRect(52, y - 6, 536, 20);
      const cols = [['#' + (i + 1), 60], [r.label, 116], [String(r.kos), 254], [String(r.falls), 310], [r.dealt + unit, 386], [r.taken + unit, 486]];
      for (const [txt, x] of cols) this.add.text(x, y, txt, { fontFamily: FONT, fontSize: '8px', color: x === 116 ? PLAYER_CSS[r.slot] : '#ffffff' });
    });
    this.milestones(data, g);
    // the coins each human earned (for the shop: Trinkets > SHOP)
    if (data.coins && data.coins.length) {
      const txt = data.coins.map((c) => c.label + ' +' + c.coins).join('   ') + '   COINS  (' + data.total + ' IN THE BANK)';
      this.coinT = this.add.text(VIEW_W / 2, 318, txt, { fontFamily: FONT, fontSize: '7px', color: '#f3c358', stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(0.5);
      this.time.delayedCall(400, () => sfx('ding', 0.4, 1.6));
    }
    achievementToasts(this, checkAchievements(), { delay: 900 });   // anything this match unlocked (achievements.js)
    this.prompt = this.add.text(VIEW_W / 2, 336, 'CLICK / ENTER / A  CONTINUE', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }).setOrigin(0.5);
    sfx('limitready', 0.8);
    this.clicked = false;
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.clicked = true; });
    addFullscreenButton(this, VIEW_W - 8, 6);
  }
  // Milestone costumes: a banner for each costume unlocked this match, otherwise each human's progress.
  milestones(data, g) {
    this.unlocks = (data.unlocks || []).map((u) => {
      const r = ROSTER.find((f) => f.id === u.fighter), list = skinsFor(u.fighter), i = list.findIndex((k) => k.milestone === u.tier);
      return { ...u, def: r.def, name: r.name, skin: i, info: list[i] };
    });
    this.ui = -1;
    if (this.unlocks.length) {
      g.fillStyle(0x0b0a14, 1); g.fillRect(50, 262, 540, 66);
      g.fillStyle(0xf3c358, 1); g.fillRect(50, 262, 540, 2); g.fillRect(50, 326, 540, 2);
      g.fillStyle(0x1b1640, 1); g.fillRect(52, 264, 536, 62);
      this.ulSprite = this.add.sprite(100, 322, 'ss_idle', 0);
      this.ulHead = this.add.text(170, 270, 'NEW COSTUME UNLOCKED!', { fontFamily: FONT, fontSize: '10px', color: '#f3c358', stroke: '#0b0a14', strokeThickness: 3 });
      this.ulName = this.add.text(170, 287, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' });
      this.ulLore = this.add.text(170, 300, '', { fontFamily: FONT, fontSize: '6px', color: '#c9c4dc', wordWrap: { width: 400 }, lineSpacing: 3 });
      this.showUnlock(0);
      this.time.delayedCall(700, () => announce(this, 'unlock'));
    } else {
      const humans = data.results.filter((r) => !r.cpu);
      humans.forEach((h, k) => {
        const f = ROSTER.find((x) => x.id === h.fighter), n = getKOs(h.fighter), list = skinsFor(h.fighter);
        if (!f || !list.some((s2) => s2.milestone)) return;           // (test fighters have no milestone costumes)
        const next = MILESTONE_KOS.findIndex((v, i) => i > 0 && n < v), nextSkin = list.find((s2) => s2.milestone === next);
        const txt = next < 0 || !nextSkin ? 'ALL MILESTONE COSTUMES UNLOCKED' : 'NEXT: ' + nextSkin.name + ' AT ' + MILESTONE_KOS[next] + ' KOS';
        this.add.text(60, 268 + k * 14, h.label + '  ' + (f ? f.name : '') + '  ' + n + ' KOS   ' + txt, { fontFamily: FONT, fontSize: '7px', color: PLAYER_CSS[h.slot] });
      });
    }
  }
  showUnlock(i) {
    const u = this.unlocks[i % this.unlocks.length];
    this.ui = i % this.unlocks.length;
    showFighter(this.ulSprite, u.def, 0, u.skin).setScale(u.def.sheets.idle === 'hk_idle' ? 0.9 : 1);
    this.ulName.setText(u.name + '  -  ' + u.info.name + '   (' + MILESTONE_KOS[u.tier] + ' KOS)');
    this.ulLore.setText(u.info.lore || '');
  }

  update() {
    this.t++;
    if (this.unlocks.length) {
      const u = this.unlocks[this.ui];
      showFighter(this.ulSprite, u.def, Math.floor(this.t / 6), u.skin);
      if (this.unlocks.length > 1 && this.t % 180 === 0) this.showUnlock(this.ui + 1);
    }
    this.hero.setFrame(Math.floor(this.t / 6) % ((this.heroDef.frameCounts && this.heroDef.frameCounts.idle) || 32));
    this.prompt.setVisible(this.t % 60 < 40);
    if (this.t <= 40) this.clicked = false;
    const m = this.menu.poll();
    if (this.t > 40 && (m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start'))) { sfx('select', 0.8); this.scene.start(settings.from || 'Setup'); }   // back to wherever the match was started from
  }
}
