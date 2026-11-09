import {pixel,line,crystal} from '../fighters/themePixels.js';
import {kombatBolt,kombatFan,kombatChain,kombatSoul} from '../fighters/kombatFx.js';

const clamp=k=>Math.max(0,Math.min(1,k));
const ease=k=>{k=clamp(k);return k*k*(3-2*k);};
const mix=(a,b,k)=>a+(b-a)*clamp(k);
const ending=(kind,name,sub,line,color)=>({fn:'mk_'+kind,len:480,card:405,name,sub,line,color,stroke:'#080e1c',cinematic:true,shots:[[0,'sequence']]});

export const KOMBAT_CUTS={
  'soul-summoner:ERMAC':ending('ermac','ERMAC','THE SOUL COLLECTOR','WE ARE MANY. YOU ARE ONE.','#adff9f'),
  'mr-wake:RAIDEN':ending('raiden','RAIDEN','THUNDER GOD','THE STORM HAS SPOKEN.','#c3f2ff'),
  'hero-knight:KITANA':ending('kitana','KITANA','ROYAL WINDS','A VICTORY FIT FOR A PRINCESS.','#b5dcff'),
  'nu:SCORPION':ending('scorpion','SCORPION','HELLFIRE RECKONING','GET OVER HERE.','#ffcd79'),
  'aero:SUB-ZERO':ending('subzero','SUB-ZERO','THE ICE DRAGON','THE COLD NEVER FORGETS.','#c4faff'),
};

/** Five continuous costume finales using the match's actual defeated fighter. */
export class KombatShots {
  /** Build the native pixel temple, with a different sky and floor for each costume. */
  mkStage(kind,t){
    const palettes={ermac:[0x070f15,0x16312c,0x315340],raiden:[0x0c1426,0x25374f,0x435a74],kitana:[0x10142a,0x263263,0x53568d],scorpion:[0x180c17,0x4c2027,0x8d3c29],subzero:[0x091b2c,0x214460,0x4f8197]};
    const colors=palettes[kind];
    for(let i=0;i<6;i++)pixel(this.bg,-180,-90+i*75,1000,75,colors[Math.min(2,Math.floor(i/2))]);
    const moon=kind==='kitana'||kind==='subzero';
    if(moon){pixel(this.bg,451,40,48,48,0xb4d6dc);pixel(this.bg,446,46,58,35,0xb4d6dc);pixel(this.bg,458,50,12,7,0x89aaba);}
    for(const x of [-85,60,585,730]){
      pixel(this.bg,x,15,17,278,0x142735);pixel(this.bg,x+3,18,4,269,colors[2]);pixel(this.bg,x-8,16,33,8,0x70918a);
      pixel(this.bg,x-7,286,31,9,0x75908c);
    }
    pixel(this.mid,-180,294,1000,180,kind==='subzero'?0x739ba9:0x17232d);
    for(let y=297;y<440;y+=18)line(this.mid,-180,y,820,y,colors[2],1,.4);
    for(let i=-5;i<12;i++)line(this.mid,320+i*70,294,320+i*130,470,colors[2],1,.4);
    if(kind==='scorpion')for(let i=0;i<24;i++){const p=(t+i*19)%120/120;pixel(this.fx,(i*83)%800-80,305-p*240,2,3,i%2?0xffd283:0xef773e,(1-p)*.6);}
    if(kind==='raiden')for(let i=0;i<28;i++){const x=(i*73-t*2)%900-100,y=(i*53+t*5)%420-40;line(this.fx,x,y,x-4,y+12,0xa4c5e0,1,.3);}
    if(kind==='subzero')for(let i=0;i<24;i++)pixel(this.fx,(i*63+Math.sin(t*.01+i)*15)%880-100,(i*41+t*.7)%400-30,2,2,0xe0faff,.6);
  }

  /** Focus the cinematic camera before restoring the defeated actor to the frame. */
  mkCamera(shot,zoom=1,cx=320,cy=180){
    this.cineCamera(shot,zoom,cx,cy);this.cineAction={costume:this.cut.sub,phase:shot};
  }

  /** Pose the real match opponent; previews without one still show the effects. */
  mkRival(x=472,y=294,alpha=1,freeze=0,kneel=false){
    this.posLosers([[x,y,2.6,0,alpha,kneel]],freeze?0x90cce8:0x101a25);
    const l=this.losers[0];if(l)l.s.setFlipX(!l.def?.facesLeft);
  }

  /** Lift the rival, call the souls inward, and seal them in Ermac's hands. */
  shot_mk_ermac_sequence(t){
    this.mkStage('ermac',t);
    const lift=ease((t-65)/85),seal=ease((t-230)/85),ritual=t>90&&t<340;
    this.mkCamera(t<75?'the red temple':t<175?'soul levitation':t<280?'we are many':t<350?'soul convergence':'the collector',t<75?.9:t<175?1.12:1,t<175?345:320,186);
    this.idle(178,294-(t>350?Math.sin((t-350)*.045)*5:0),3,t);
    if(ritual)this.move('summon',Math.min(20,Math.floor((t-90)/8)),178,294,3);
    this.mkRival(472,294-lift*65+Math.sin(t*.08)*lift*3,1-seal);
    if(lift>0&&seal<1){this.fx.lineStyle(2,0x6aff96,.7*(1-seal));this.fx.strokeEllipse(472,274-lift*65,74,18);this.fx.strokeEllipse(472,248-lift*65,62,14);}
    for(let i=0;i<8;i++){
      const a=t*.035+i*Math.PI/4,r=(t<180?48:mix(48,5,seal)),x=mix(472,202,seal)+Math.cos(a)*r,y=mix(197,203,seal)+Math.sin(a)*r*.7;
      if(t>130)kombatSoul(this.front,x,y,t+i*7,1.5,.85);
    }
    if(t>230){const r=12+Math.sin(t*.07)*3;this.front.fillStyle(0x6df6a0,.18);this.front.fillCircle(202,203,r+12);kombatSoul(this.front,202,203,t,2,.9);this.cineCue('mk-souls','summon',.4,.7);}
  }

  /** Charge the staff, call a lightning pillar, then teleport through the storm. */
  shot_mk_raiden_sequence(t){
    this.mkStage('raiden',t);
    const strike=ease((t-170)/28),settle=ease((t-265)/65),teleport=clamp((t-310)/55);
    this.mkCamera(t<90?'thunder temple':t<175?'the heavens answer':t<265?'lightning judgment':t<365?'ride the lightning':'thunder god',t<90?.88:t<175?1.25:1, t<175?255:320,190);
    this.idle(172+(teleport>0?ease(teleport)*140:0),294,3,t);
    this.mkRival(472,294-strike*52*(1-settle),1,0,t>300);
    if(t>70&&t<265){for(let i=0;i<3;i++)kombatBolt(this.front,177,150,140+i*38,85+Math.sin(t*.07+i)*26,t+i*9,0x9cdfff,2);}
    if(t>170&&t<275){kombatBolt(this.fx,470,-70,472,294,t,0x408ad1,14);kombatBolt(this.front,470,-70,472,294,t+2,0xe0ffff,4);this.cineCue('mk-thunder','laser',.55,.6);}
    if(teleport>0&&teleport<1){this.hero.setAlpha(Math.abs(teleport-.5)*2);kombatBolt(this.front,312,-60,312,294,t,0xc5f5ff,4);}
    if(t>365){for(let i=0;i<2;i++)kombatBolt(this.front,312,205,285+i*54,170,t+i*6,0xbff8ff,1);}
  }

  /** Dual fans lift the rival in a royal cyclone before a graceful catch and bow. */
  shot_mk_kitana_sequence(t){
    this.mkStage('kitana',t);
    const wind=ease((t-105)/60)*(1-ease((t-265)/65)),finish=ease((t-310)/50);
    this.mkCamera(t<85?'moonlit royal court':t<155?'unfold the steel':t<275?'royal cyclone':t<355?'catch the fans':'royal winds',t<85?.88:t<155?1.2:1,320,185);
    this.idle(185,294,3,t);this.mkRival(472,294-wind*(85+Math.sin(t*.09)*8),1,0,finish>.5);
    const spread=t<105?ease((t-40)/65):1;
    for(let i=0;i<2;i++){
      const a=t*.12+i*Math.PI,p=ease((t-285)/55),x=mix(185+Math.cos(a)*52,163+i*44,p),y=mix(191+Math.sin(a)*39,210,p);
      kombatFan(this.front,x,y,24*spread,a*(1-p)-Math.PI/2,.95);
    }
    if(wind>0){
      for(let i=0;i<9;i++){const a=t*.15+i*.9,r=25+i*4,x=472+Math.cos(a)*r,y=287-i*13;line(this.fx,x-12,y,x+12,y-4,0xb9e5ff,2,wind*.75);kombatFan(this.front,x,y,9,a,wind);}
      this.cineCue('mk-fans','whoosh',.4,1.2);
    }
    if(t>350)this.hero.setAngle(Math.sin(ease((t-350)/55)*Math.PI)*-9);
  }

  /** A chain kunai pulls the rival through a hellfire gate before Scorpion returns. */
  shot_mk_scorpion_sequence(t){
    this.mkStage('scorpion',t);
    const reach=ease((t-70)/65),pull=ease((t-165)/95),burn=ease((t-240)/60),returning=ease((t-315)/55);
    this.mkCamera(t<75?'the netherrealm':t<165?'get over here':t<255?'chain reckoning':t<335?'hellfire gate':'hellfire survivor',t<75?.88:1,320,187);
    this.idle(168+returning*105,294,3,t);
    const rx=mix(472,245,pull);this.mkRival(rx,294,1-burn);
    if(t>70&&t<280){kombatChain(this.front,199,208,mix(199,rx,reach),mix(208,225,reach),t,1-burn);if(reach>.9)this.cineCue('mk-chain','slash',.4,.7);}
    if(t>230&&t<355){
      const alpha=1-ease((t-320)/35);
      for(let i=0;i<18;i++){const a=i*Math.PI*2/18,x=245+Math.cos(a)*38,y=238+Math.sin(a)*66;pixel(this.fx,x,y,8,14,0xf07831,alpha);pixel(this.front,x+2,y-5,4,9,0xffdb85,alpha);}
      for(let i=0;i<12;i++){const q=(t*2+i*11)%90/90;pixel(this.front,215+i%6*12,294-q*130,4,8,0xffb451,(1-q)*alpha);}
      this.cineCue('mk-firegate','explosion',.45,.7);
    }
    if(t>355)kombatChain(this.front,295,208,330,273,t);
  }

  /** Freeze the defeated fighter, summon an ice dragon, and leave a crystalline seal. */
  shot_mk_subzero_sequence(t){
    this.mkStage('subzero',t);
    const freeze=ease((t-85)/70),dragon=ease((t-170)/100),vanish=ease((t-295)/55);
    this.mkCamera(t<85?'the frozen courtyard':t<170?'creeping ice':t<295?'the ice dragon':t<355?'crystal seal':'grandmaster of ice',t<85?.9:1,320,185);
    this.idle(170,294,3,t);this.mkRival(472,294,1-vanish,freeze);
    if(freeze>0&&vanish<1){
      pixel(this.front,434,294-freeze*124,76,freeze*124,0x8bc9ed,.25*(1-vanish));
      this.front.lineStyle(2,0xd9fcff,(1-vanish)*freeze);this.front.strokeRect(434,170,76,124);
      for(let i=0;i<6;i++)line(this.front,442+i*10,290,451+i*9,190+i*8,0xc8f6ff,1,freeze*(1-vanish));
    }
    if(t>85&&t<170){for(let i=0;i<8;i++)crystal(this.fx,mix(197,472,(i/8+freeze)%1),255+Math.sin(i+t*.1)*12,3,0x8adaff);this.cineCue('mk-freeze','shield',.4,.65);}
    if(t>170&&t<350){
      const fade=1-vanish;
      // Stepped plates coil into a long neck, with a horned ice dragon head.
      for(let i=0;i<30;i++){const a=dragon*5-i*.11,x=330+Math.cos(a)*112,y=200+Math.sin(a)*67+i*.6;crystal(this.fx,x,y,4+i%3,0x5599c9,0xc9f7ff,fade);}
      const hx=330+Math.cos(dragon*5)*112,hy=200+Math.sin(dragon*5)*67;
      pixel(this.front,hx-15,hy-8,32,17,0x84c9e9,fade);pixel(this.front,hx+14,hy-2,15,9,0xb0e8fa,fade);
      for(let i=0;i<3;i++)crystal(this.front,hx-13+i*9,hy-13,6,0x76b7d9,0xe8ffff,fade);
      pixel(this.front,hx+8,hy-4,5,3,0xf2ffff,fade);this.cineCue('mk-dragon','summon',.35,.6);
    }
    if(t>295)for(let i=0;i<18;i++){const a=i*2.4,p=ease((t-295)/70),r=15+p*100;crystal(this.front,472+Math.cos(a)*r,225+Math.sin(a)*r,3,0x8ed6f5,0xe7ffff,1-p);}
    if(t>350)for(let i=-3;i<=3;i++)crystal(this.front,472+i*9,294,4-Math.abs(i)*.5,0x6bb5d7);
  }
}
