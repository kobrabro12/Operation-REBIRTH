// Fighter methods: Costume dialogue: QUIPS lines in a speech box over the fighter.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { FONT } from '../config.js';
import { sfx } from '../audio/sfx.js';

// Lines a costume says during its moves: shown in a little typed speech box over the fighter.
// key: '<fighter id>:<costume style>'; each event is [chance, ...lines] (one picked at random).
const QUIPS = {
  'hero-knight:onebit': {
    jab: [0.35, '> slice()', 'CUT.', '0x01'],
    attack: [0.25, 'HIT.', '> attack()', '01001000', 'BREAK;'],
    smash: [0.6, 'FORCE QUIT!', 'sudo slash'],
    slamFull: [1, 'BUFFER OVERFLOW!'], slam: [0.5, 'SWING.EXE'],
    throwSword: [1, 'THROW(BLADE);'], catchSword: [0.8, 'RETURN 0;'],
    counter: [1, 'INTERRUPT.'], upb: [0.5, 'JMP UP'],
    grab: [0.8, 'GOT YOU.'], throw: [0.7, 'DELETE.', 'DRAG > TRASH'],
    limit: [1, 'RUN THOUSAND_CUTS'], ko: [1, 'CTRL+ALT+DEL.', 'USER LOGGED OFF.'],
  },
  // Mr Wake in 1-BIT: a wizard who turned out to be a very old program
  'mr-wake:onebit': {
    jab: [0.3, '> bonk()', 'NULL.'],
    attack: [0.22, 'CAST.', '> spell()', '0xDEAD', 'EXEC;'],
    smash: [0.6, 'KERNEL PANIC!', 'rm -rf you'],
    grab: [0.7, 'LOCKED.'], throw: [0.7, 'EJECT.', 'PIPE > /DEV/NULL'],
    upb: [0.5, 'GOTO 10'], limit: [1, 'SINK();'], ko: [1, 'SEGFAULT.', 'PROCESS ENDED.'],
  },
  // AKATSUKI: an anime hero, shouting her moves
  'hero-knight:hero': {
    jab: [0.4, 'HAH!', 'HYAH!', 'TEH!'],
    attack: [0.3, 'SEIYA!', 'TAAH!', 'THERE!'],
    smash: [0.7, 'TAKE THIS!', 'HAAAAH!'],
    slamFull: [1, 'CRYSTAL... BREAKER!!'], slam: [0.6, 'RAAAH!'],
    throwSword: [1, 'FLY, MY BLADE!'], catchSword: [0.7, 'WELCOME BACK.'],
    counter: [1, 'TOO SLOW!'], upb: [0.6, 'NOT YET!'],
    grab: [0.7, 'GOTCHA!'], throw: [0.7, 'AWAY WITH YOU!', 'HUP!'],
    limit: [1, 'THIS IS MY RESOLVE!'], ko: [1, "I WON'T LOSE!", 'FOR EVERYONE!', 'I PROMISED!'],
  },
};
// how each costume's lines look: a terminal box (typed out) or a hero's shout (pops in, bounces)
const SPEECH = {
  onebit: { typed: true, style: { fontFamily: FONT, fontSize: '7px', color: '#f4f4f0', backgroundColor: '#0e0e10', padding: { x: 3, y: 2 } } },
  hero: { typed: false, style: { fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: '#ffe14a', stroke: '#2a0408', strokeThickness: 4 } },
  taunt: { typed: false, style: { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 } },   // every fighter's taunt line
};

export class FighterSpeech {

  // ---- attacks
  // ---- costume dialogue (QUIPS): a short typed line in a box over her head
  quip(event) {
    const q = QUIPS[this.def.id + ':' + this.style], e = q && q[event];
    if (!e || Math.random() > e[0]) return;
    this.say(e[1 + Math.floor(Math.random() * (e.length - 1))]);
  }
  say(text, life = 80, kind = null) {
    if (this.match.demo) return;
    this.speechKind = SPEECH[kind] || SPEECH[this.style] || SPEECH.onebit;
    if (!this.speech) {
      this.speech = this.match.add.text(0, 0, '', this.speechKind.style).setOrigin(0.5, 1).setDepth(8);
      this.match.addWorld(this.speech);
    } else this.speech.setStyle(this.speechKind.style);
    this.speechFull = text; this.speechT = 0; this.speechLife = life; this.speech.setVisible(true);
    if (this.speechKind.typed) sfx('menu', 0.15, 1.8);
  }
  updateSpeech() {
    if (!this.speech || !this.speech.visible) return;
    this.speechT++;
    let lift = 0;
    if (this.speechKind.typed) {
      const n = Math.min(this.speechFull.length, this.speechT);              // typed out fast, like a terminal
      const cursor = n < this.speechFull.length || (this.speechT >> 3) % 2 ? '_' : ' ';
      this.speech.setText(this.speechFull.slice(0, n) + cursor);
      if (n < this.speechFull.length && this.speechT % 2 === 0) sfx('menu', 0.06, 2.2);
    } else {                                                                    // a shout: pops in big and bounces
      this.speech.setText(this.speechFull);
      const k = Math.min(1, this.speechT / 6);
      this.speech.setScale(1.6 - 0.6 * k);
      lift = Math.round(Math.abs(Math.sin(this.speechT * 0.5)) * 3 * (1 - k)) + (this.speechT > this.speechLife - 10 ? this.speechT - (this.speechLife - 10) : 0);
      this.speech.setAlpha(this.speechT > this.speechLife - 10 ? (this.speechLife - this.speechT) / 10 : 1);
    }
    this.speech.setPosition(Math.round(this.x), Math.round(this.y - (this.def.tagY || 60) - 12 - lift));
    if (this.speechT > this.speechLife || !this.alive) this.speech.setVisible(false);
  }
}
