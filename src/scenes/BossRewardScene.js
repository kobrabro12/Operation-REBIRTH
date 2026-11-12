// After a boss fight (MatchScene.toBossReward): the WIN screen - BOSS DEFEATED!, the boss, the difficulty, your time,
// and every reward you got, counted in one by one (coins for the win, the first-win bonus, a speed bonus, the arena
// opened for VS on HARD, the trophy on NIGHTMARE, any achievements it earned) with your coin total - or the DEFEATED
// screen (how much health the boss had left). Then FIGHT AGAIN or back to BOSS FIGHTS. Rewards were already paid
// (bosses.js claimBossRewards); trophies and achievements are checked here (checkAchievements pays their coins).
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { hintBar, slant, hex } from '../ui/arcade.js';
import { bossById, TIERS, clock } from '../data/bosses.js';
import { checkAchievements } from '../achievements.js';
import { getCoins } from '../progress.js';
import { fighterById, showFighter } from '../fighters/roster.js';
import { achievementToasts } from '../ui/toast.js';

// how quickly the reward lines come in (frames apart), and the first one's delay
const LINE = { first: 50, every: 26 };

/** The win / defeat screen after a boss fight (see the top of the file). */
export class BossRewardScene extends Phaser.Scene {
  constructor() { super('BossReward'); }

/** data: { boss: { id, tier, won, time, hp, fighter, skin, falls, dealt, taken, setup }, rewards } from MatchScene.toBossReward. Checks trophies and achievements, lays out the reward lines. */
  create(data) {
    const R = data.boss, B = bossById(R.id), T = TIERS[R.tier];
    this.R = R; this.B = B; this.t = 0; this.choice = 0; this.menu = new MenuInput(this);
    this.won = R.won;
    const fresh = this.won ? checkAchievements() : [];
    this.lines = [...(data.rewards || []), ...fresh.map((a) => ({ kind: a.label ? 'trophy' : 'ach', text: (a.label ? 'TROPHY: ' : 'ACHIEVEMENT: ') + a.name, coins: a.coins }))];
    this.total = this.lines.reduce((n, l) => n + (l.coins || 0), 0); this.counted = 0;
    playMusic(this, 'bgm_title');
    sfx(this.won ? 'limitready' : 'curse', 0.9, this.won ? 1 : 0.7);
    this.bg = this.add.graphics(); this.fx = this.add.graphics();
    const txt = (x, y, s, size = 8, color = '#ffffff', o = {}) => this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#07060e', strokeThickness: 4, lineSpacing: 5, ...o });
    this.head = txt(VIEW_W / 2, 22, this.won ? 'BOSS DEFEATED!' : 'DEFEATED...', 22, this.won ? '#ffe08a' : '#ff6a5a').setOrigin(0.5, 0).setAngle(this.won ? -3 : 0);
    txt(VIEW_W / 2, 60, B.name, 9, hex(B.color)).setOrigin(0.5, 0);
    txt(VIEW_W / 2, 74, T.name + (this.won ? '   TIME ' + clock(R.time) : '   BOSS HEALTH LEFT ' + Math.round(R.hp * 100) + '%'), 7, hex(T.color)).setOrigin(0.5, 0);
    const def = fighterById(R.fighter).def;
    this.sprite = this.add.sprite(118, 250, def.sheets.idle, 0).setScale(2.6);
    txt(118, 270, def.name, 8).setOrigin(0.5, 0);
    txt(118, 286, 'FALLS ' + R.falls + '   DAMAGE ' + R.dealt, 6, '#c9c4dc').setOrigin(0.5, 0);
    this.def = def;
    this.rows = this.lines.map((l, i) => {
      const y = 104 + i * 22;
      const a = txt(236, y, l.text, 7, l.kind === 'unlock' ? '#7affb0' : l.kind === 'trophy' ? '#ffd23f' : l.kind === 'ach' ? '#ffb0ff' : '#ffffff').setAlpha(0);
      const b = txt(610, y, l.coins ? '+' + l.coins : l.kind === 'unlock' ? 'NEW!' : l.kind === 'record' ? '!' : '', 8, '#ffe08a').setOrigin(1, 0).setAlpha(0);
      return { a, b, at: LINE.first + i * LINE.every };
    });
    if (!this.won) txt(236, 120, 'NO REWARDS THIS TIME.\n\n' + this.tip(), 7, '#c9c4dc', { wordWrap: { width: 380 } });
    this.totalT = txt(610, 104 + Math.max(1, this.lines.length) * 22 + 10, '', 9, '#ffe08a').setOrigin(1, 0);
    this.coinT = txt(236, 104 + Math.max(1, this.lines.length) * 22 + 12, '', 6, '#c9c4dc');
    this.actions = [makeButton(this, 236, 318, this.won ? 'FIGHT AGAIN' : 'RETRY', () => this.leave(0), { size: '8px', bg: '#8a1a14', hover: '#d8342a' }),
      makeButton(this, 400, 318, 'BOSS FIGHTS', () => this.leave(1), { size: '8px' })];
    hintBar(this, 'A/D CHOOSE   J / ENTER / A  CONFIRM   K / ESC / B  BOSS FIGHTS', B.color);
    this.drawBg();
    if (fresh.length) achievementToasts(this, fresh);
  }

  /** A tip for the defeat screen, about the boss you lost to. */
  tip() {
    return { colossus: 'TIP: AFTER ITS STEAM VENT IT OVERHEATS - ITS GLOWING HEART TAKES EXTRA DAMAGE. HIT IT THEN.',
      polygon: 'TIP: EVERY FEW ATTACKS THE KING FRAME-DROPS AND SINKS LOW. HIS HEAD TAKES EXTRA DAMAGE WHILE HE STUTTERS.',
      demon: 'TIP: WHEN HE STOPS TO LAUGH, GO FOR HIS HEAD - IT TAKES EXTRA DAMAGE. RED EYES BEHIND YOU MEAN MOVE.' }[this.R.id] || '';
  }

  /** The backdrop: rays in the boss's colour (dim red when you lost), a panel for the rewards. */
  drawBg() {
    const g = this.bg, c = this.won ? this.B.color : 0x5a1a1a;
    g.fillStyle(0x07060e, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, b = a + 0.06; g.fillStyle(i % 2 ? c : 0x14112a, i % 2 ? 0.16 : 0.5); g.fillTriangle(VIEW_W / 2, 40, VIEW_W / 2 + Math.cos(a) * 800, 40 + Math.sin(a) * 800, VIEW_W / 2 + Math.cos(b) * 800, 40 + Math.sin(b) * 800); }
    slant(g, 220, 96, 404, 210, 0x000000, 0.6, 10); slant(g, 216, 92, 404, 210, 0x14112a, 0.95, 10);
    g.fillStyle(c, 1); g.fillRect(222, 299, 390, 3);
    g.fillStyle(c, 0.18); g.fillCircle(118, 220, 70);
  }

  /** Back to the fight (same boss, difficulty, fighter) or to BOSS FIGHTS. */
  leave(i) {
    sfx('go', 0.7);
    if (i === 0 && this.R.setup) this.scene.start('Match', { boss: { id: this.R.id, tier: this.R.tier, setup: this.R.setup } });
    else this.scene.start('BossFights');
  }

/** Brings the reward lines in one by one, counts the total up, confetti on a win; the two buttons. */
  update() {
    this.t++;
    showFighter(this.sprite, this.def, Math.floor(this.t / 6), this.R.skin);
    this.sprite.setPosition(118, 252);
    for (const r of this.rows) if (this.t === r.at) { r.a.setAlpha(1); r.b.setAlpha(1); sfx('ding', 0.5, 1 + this.rows.indexOf(r) * 0.08); }
    for (const r of this.rows) if (this.t > r.at && this.t < r.at + 10) { const k = (this.t - r.at) / 10; r.a.x = 236 + (1 - k) * 30; }
    const done = this.rows.length ? this.rows[this.rows.length - 1].at : 0;
    if (this.won && this.t > LINE.first && this.counted < this.total) { this.counted = Math.min(this.total, this.counted + Math.max(1, Math.ceil(this.total / 90))); if (this.t % 3 === 0) sfx('ding', 0.15, 1.8); }
    if (this.won) { this.totalT.setText(this.t > LINE.first ? 'TOTAL  +' + this.counted : ''); this.coinT.setText(this.t > done + 20 ? 'YOU NOW HAVE ' + getCoins() + ' COINS' : ''); }
    const f = this.fx; f.clear();
    if (this.won) for (let i = 0; i < 14; i++) { const ph = (this.t * 1.3 + i * 37) % 160, x = 40 + (i * 97) % 560, y = -10 + ph * 2.4; f.fillStyle([0xffd23f, 0xffffff, this.B.color][i % 3], 1); f.fillRect(x + Math.sin(ph * 0.1 + i) * 8, y, 4, 2 + (i % 3)); }
    this.head.setScale(1 + Math.max(0, 0.3 - this.t * 0.02));
    this.actions.forEach((a, i) => a.setColor(i === this.choice ? '#ffdf83' : '#ffffff'));
    const m = this.menu.poll();
    if (this.t < 20) return;
    if (m.left) this.choice = 0; if (m.right) this.choice = 1;
    if (m.ok || m.pads.some((p) => p.button === 'a')) this.leave(this.choice);
    else if (m.back || m.pads.some((p) => p.button === 'b')) this.leave(1);
  }
}
