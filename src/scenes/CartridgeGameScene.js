import {cartridgeById} from './cartridges.js';
import {STAR_WAVES,CRYPT_ROOMS} from './cartridgeLevels.js';
import {FONT} from '../config.js';
import {makeButton} from '../ui/button.js';
import {sfx} from '../audio/sfx.js';
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2;
const HIGH='rebirth.cartridgeScores';
/** Plays the inserted cartridge with shared keyboard, controller and touch controls. */
export class CartridgeGameScene extends Phaser.Scene{
 constructor(){super('CartridgeGame');}
 /** Opens the cartridge screen and wires controls and score displays. */
 create(data={}){this.leaving=false;if(this.input.manager.pointers.length<4)this.input.addPointer(4-this.input.manager.pointers.length);this.gameDef=cartridgeById(data.id);this.g=this.add.graphics();this.keys=this.input.keyboard.addKeys({left:'LEFT',right:'RIGHT',a:'A',d:'D',fire:'J',space:'SPACE',jump:'UP',w:'W',esc:'ESC',pause:'P',retry:'R'});this.touch={left:false,right:false,action:false};this.heldAction=false;this.padPrev={};this.acc=0;this.paused=false;this.ended=false;this.message=this.sub=this.retry=this.notice=null;this.startRun();
 const style={fontFamily:FONT,fontSize:'7px',color:'#fff0ca',stroke:'#0a0715',strokeThickness:2};this.title=this.add.text(320,15,this.gameDef.name,style).setOrigin(.5);this.hud=this.add.text(45,43,'',style);this.stageLabel=this.add.text(320,69,'',{...style,fontSize:'6px'}).setOrigin(.5);this.notice=this.add.text(320,160,'',{...style,fontSize:'11px',align:'center',lineSpacing:12}).setOrigin(.5);this.message=this.add.text(320,156,'',{...style,fontSize:'11px',align:'center',lineSpacing:12}).setOrigin(.5);this.sub=this.add.text(320,198,'',{...style,fontSize:'6px',align:'center',lineSpacing:9}).setOrigin(.5);
 makeButton(this,8,6,'EJECT',()=>this.eject(),{size:'7px',depth:10});makeButton(this,521,6,'PAUSE',()=>this.togglePause(),{size:'7px',depth:10});this.retry=makeButton(this,261,227,'PLAY AGAIN',()=>this.startRun(),{size:'8px',depth:10}).setVisible(false);
 for(const [label,key,x,w]of[['<','left',44,80],['>','right',132,80],[this.gameDef.id==='neon-rally'?'BRAKE':'ACTION','action',470,126]]){const b=this.add.rectangle(x,307,w,43,0x353046,.95).setOrigin(0).setStrokeStyle(2,this.gameDef.color).setInteractive();this.add.text(x+w/2,329,label,style).setOrigin(.5);b.on('pointerdown',()=>this.touch[key]=true).on('pointerup',()=>this.touch[key]=false).on('pointerout',()=>this.touch[key]=false);}
 this.add.text(320,315,'A/D MOVE  J/SPACE ACTION',{...style,fontSize:'5px'}).setOrigin(.5);this.add.text(320,333,'P PAUSE  R RETRY  ESC EJECT',{...style,fontSize:'5px'}).setOrigin(.5);this.events.once('shutdown',()=>{this.touch={};});this.draw();}
 startRun(){this.pendingJump=false;this.acc=0;this.frame=0;this.levelIntro=0;this.level=null;this.score=0;this.lives=3;this.invincible=0;this.ended=false;this.won=false;this.paused=false;this.wave=1;this.room=1;this.cooldown=0;this.bullets=[];this.shots=[];this.cars=[];this.player={x:320,y:270,w:14,h:14,vx:0,vy:0,grounded:false};this.setupLevel();this.message?.setText('');this.sub?.setText('');this.retry?.setVisible(false);}
 /** Loads fresh enemies or a hand-built room while keeping score and remaining lives. */
 setupLevel(){
  this.levelFrame=0;this.notice?.setText('');
  if(this.gameDef.id==='star-patrol'){
   this.level=STAR_WAVES[this.wave-1];this.enemies=[];
   const add=(x,y,hp=1)=>this.enemies.push({x,y,baseX:x,baseY:y,w:hp>1?44:20,h:hp>1?26:14,hp,maxHP:hp,phase:this.enemies.length});
   if(this.level.formation==='ranks')for(let row=0;row<2;row++)for(let col=0;col<6;col++)add(135+col*74,100+row*32);
   if(this.level.formation==='chevron'){
    for(let col=0;col<7;col++)add(140+col*60,98+Math.abs(3-col)*13);
    for(let col=0;col<6;col++)add(170+col*60,143+Math.abs(2.5-col)*9);
   }
   if(this.level.formation==='escort'){
    add(320,102,10);for(let row=0;row<2;row++)for(let col=0;col<5;col++)add(160+col*80,151+row*32);
   }
   this.player.x=320;this.player.y=270;this.bullets=[];this.shots=[];
  }
  if(this.gameDef.id==='crypt-runner'){
   this.level=CRYPT_ROOMS[this.room-1];this.player={x:85,y:266,w:12,h:17,vx:0,vy:0,grounded:false};
   this.platforms=this.level.platforms.map(([x1,x2,y])=>({x1,x2,y}));
   this.gems=this.level.gems.map(([x,y])=>({x,y,w:10,h:12}));
   this.monsters=this.level.patrols.map(([home,floor,range,speed],i)=>({x:home,y:floor-8,w:16,h:16,home,range,speed,phase:i*Math.PI}));
  }
 }
 /** Shows the next encounter briefly; clears old projectiles and preserves the run's progress. */
 advanceLevel(){
  const shooter=this.gameDef.id==='star-patrol',index=shooter?this.wave:this.room,total=shooter?STAR_WAVES.length:CRYPT_ROOMS.length;
  if(index===total)return this.finish(true);
  if(shooter)this.wave++;else this.room++;
  this.score+=150;this.setupLevel();this.levelIntro=75;this.pendingJump=false;
  this.notice?.setText((shooter?'WAVE ':'ROOM ')+(index+1)+' / '+total+'\n'+this.level.name);sfx('ding',.3);
 }
 controls(){const pads=navigator.getGamepads?.()||[],pad=Array.from(pads).find(p=>p?.connected),button=i=>!!pad?.buttons[i]?.pressed,axis=pad?.axes[0]||0;const left=this.keys.left.isDown||this.keys.a.isDown||this.touch.left||button(14)||axis<-.3,right=this.keys.right.isDown||this.keys.d.isDown||this.touch.right||button(15)||axis>.3,action=this.keys.fire.isDown||this.keys.space.isDown||this.keys.jump.isDown||this.keys.w.isDown||this.touch.action||button(0);const jump=action&&!this.heldAction;this.heldAction=action;const back=button(1),pause=button(9);if(back&&!this.padPrev.back)this.eject();if(pause&&!this.padPrev.pause)this.togglePause();this.padPrev={back,pause};return {x:Number(right)-Number(left),action,jump};}
 togglePause(){if(this.ended)return;this.paused=!this.paused;this.message.setText(this.paused?'PAUSED':'');this.sub.setText(this.paused?'PRESS P / START TO RESUME':'');}
 loseLife(){if(this.invincible||this.ended)return;this.lives--;this.invincible=100;sfx('hit',.3);if(this.lives<=0)return this.finish(false);if(this.gameDef.id==='crypt-runner')Object.assign(this.player,{x:85,y:266,vy:0,grounded:false});}
 finish(won){if(this.ended)return;this.ended=true;this.won=won;if(won)this.score+=500;let scores={};try{scores=JSON.parse(localStorage.getItem(HIGH)||'{}')||{};scores[this.gameDef.id]=Math.max(Number(scores[this.gameDef.id])||0,this.score);localStorage.setItem(HIGH,JSON.stringify(scores));}catch{}this.message.setText(won?'YOU WIN!':'GAME OVER');this.sub.setText('SCORE '+this.score+'  /  BEST '+(scores[this.gameDef.id]||this.score)+'\nR / PLAY AGAIN TO RESTART');this.retry.setVisible(true);sfx(won?'ding':'curse',.4);}
 eject(){if(this.leaving)return;this.leaving=true;this.scene.start('Treehouse',{cartridge:this.gameDef.id});}
 /** Advances the chosen game by one 60 Hz tick; c supplies movement and action input. */
 step(c){
  if(this.paused||this.ended)return;
  if(this.levelIntro){if(--this.levelIntro===0)this.notice?.setText('');return;}
  this.frame++;this.levelFrame++;if(this.invincible)this.invincible--;if(this.cooldown)this.cooldown--;
  if(this.gameDef.id==='star-patrol')this.stepPatrol(c);
  if(this.gameDef.id==='crypt-runner')this.stepCrypt(c);
 if(this.gameDef.id==='neon-rally'){const p=this.player;p.y=261;p.w=18;p.h=27;p.x=Math.max(190,Math.min(450,p.x+c.x*3.6));const speed=c.action?1.7:3.6+Math.min(2,this.frame/900);if(this.frame%48===0)this.cars.push({x:206+(Math.floor(this.frame/48)*7%4)*75,y:45,w:22,h:30,color:Math.floor(this.frame/48)%2?0xff667a:0x75c5ee});for(const car of this.cars){car.y+=speed;if(overlap(p,car)){this.loseLife();car.y=400;}}this.cars=this.cars.filter(c=>c.y<325);if(this.frame%6===0)this.score++;if(this.frame>=2700)this.finish(true);}
 }
 /** Moves a distinct alien formation and resolves its fire pattern and the player's shots. */
 stepPatrol(c){
  const p=this.player,level=this.level,t=this.levelFrame;
  p.x=Math.max(70,Math.min(570,p.x+c.x*3.5));
  if(c.action&&!this.cooldown){this.bullets.push({x:p.x,y:p.y-12,w:3,h:8});this.cooldown=12;sfx('swing',.06,1.9);}
  for(const b of this.bullets)b.y-=5;
  for(const e of this.enemies){
   const descent=Math.floor(t/330)*7;e.x=e.baseX+Math.sin(t*.018*level.speed)*35;e.y=e.baseY+descent;
   if(level.formation==='chevron'){
    const dive=(t+e.phase*23)%360;if(dive>260){e.x+=Math.sin((dive-260)/100*Math.PI)*42;e.y+=Math.sin((dive-260)/100*Math.PI)*44;}
   }
   if(level.formation==='escort'){e.x=e.baseX+Math.sin(t*.022+e.phase*.4)*(e.maxHP>1?85:28);e.y+=Math.sin(t*.024+e.phase)*9;}
  }
  if(t%level.fireEvery===0&&this.enemies.length){
   const e=this.enemies[Math.floor(t/level.fireEvery)%this.enemies.length],velocities=level.pattern==='spread'?[-1.1,1.1]:[level.pattern==='aimed'?Math.max(-1.8,Math.min(1.8,(p.x-e.x)/75)):0];
   for(const vx of velocities)this.shots.push({x:e.x,y:e.y+8,w:4,h:7,vx,vy:level.shotSpeed});
  }
  for(const b of this.bullets){
   const e=this.enemies.find(e=>overlap(e,b));if(!e)continue;
   e.hp--;b.y=-100;this.score+=e.hp<=0?(e.maxHP>1?250:25):5;
   if(e.hp<=0)this.enemies.splice(this.enemies.indexOf(e),1);sfx('hit',.12,1.5);
  }
  for(const b of this.shots){b.x+=b.vx||0;b.y+=b.vy||level.shotSpeed;if(overlap(b,p)){this.loseLife();b.y=400;}}
  this.bullets=this.bullets.filter(b=>b.y>55);this.shots=this.shots.filter(b=>b.y<295&&b.x>40&&b.x<600);
  if(this.ended)return;
  if(this.enemies.some(e=>e.y+e.h/2>253))return this.finish(false);
  if(!this.enemies.length)this.advanceLevel();
 }
 /** Runs platform physics, room-specific patrols, gems, and the unlocked exit door. */
 stepCrypt(c){
  const p=this.player;p.vx=c.x*2.7;
  if(c.jump&&p.grounded){p.vy=-7.7;p.grounded=false;sfx('jump',.15);}
  const old=p.y;p.x=Math.max(70,Math.min(570,p.x+p.vx));p.vy=Math.min(8,p.vy+.34);p.y+=p.vy;p.grounded=false;
  for(const ground of this.platforms)if(p.vy>=0&&p.x>=ground.x1&&p.x<=ground.x2&&old+p.h/2<=ground.y+1&&p.y+p.h/2>=ground.y){p.y=ground.y-p.h/2;p.vy=0;p.grounded=true;}
  for(const gem of this.gems)if(!gem.taken&&overlap(p,gem)){gem.taken=true;this.score+=100;sfx('ding',.2);}
  for(const m of this.monsters){m.x=m.home+Math.sin(this.levelFrame*m.speed+m.phase)*m.range;if(overlap(p,m))this.loseLife();}
  if(this.ended)return;
  if(p.y>320){this.loseLife();if(!this.ended)Object.assign(p,{x:85,y:266,vy:0,grounded:false});return;}
  const [x,y]=this.level.exit;if(this.gems.every(g=>g.taken)&&overlap(p,{x,y:y-18,w:22,h:36}))this.advanceLevel();
 }
 /** Draws native pixel sprites, clipped to the CRT playfield, and refreshes the score HUD. */
 draw(){const g=this.g;let clip=false;const box=(x,y,w,h,c)=>{x=Math.round(x);y=Math.round(y);if(clip){const right=Math.min(600,x+w),bottom=Math.min(290,y+h);x=Math.max(40,x);y=Math.max(60,y);w=right-x;h=bottom-y;if(w<=0||h<=0)return;}g.fillStyle(c);g.fillRect(x,y,w,h);};g.clear();box(0,0,640,360,0x100c1a);box(26,34,588,266,0x504454);box(32,37,576,258,0x090d1c);box(40,60,560,230,this.gameDef.id==='star-patrol'?this.level.background:0x121a2b);clip=true;const p=this.player,color=this.gameDef.color;
 if(this.gameDef.id==='star-patrol'){
  for(let i=0;i<50;i++)box(50+(i*83)%535,65+(i*43+this.frame*.25)%216,2,2,i%3?0x526588:0xabb6c8);
  for(const e of this.enemies){
   const col=this.level.color;
   if(e.maxHP>1){box(e.x-22,e.y-8,44,17,col);box(e.x-14,e.y-14,28,8,col);box(e.x-8,e.y-6,16,8,0x151528);box(e.x-5,e.y-3,10,3,0xff7894);box(e.x-24,e.y+7,10,5,col);box(e.x+14,e.y+7,10,5,col);box(e.x-20,e.y-20,40*e.hp/e.maxHP,2,0xff7894);}
   else if(this.level.formation==='chevron'){box(e.x-4,e.y-8,8,16,col);box(e.x-12,e.y-3,24,5,col);box(e.x-9,e.y+2,5,6,col);box(e.x+4,e.y+2,5,6,col);box(e.x-2,e.y-3,4,3,0x151528);}
   else{box(e.x-10,e.y-5,20,10,col);box(e.x-6,e.y-9,3,4,col);box(e.x+3,e.y-9,3,4,col);box(e.x-6,e.y-2,3,3,0x151528);box(e.x+3,e.y-2,3,3,0x151528);}
  }
  for(const b of this.bullets)box(b.x-1,b.y-4,3,8,color);for(const b of this.shots)box(b.x-2,b.y-3,4,7,0xff7894);
  if(!this.invincible||this.frame%8<4){box(p.x-4,p.y-12,8,22,color);box(p.x-14,p.y,28,8,color);box(p.x-2,p.y-6,4,7,0xe8f6ff);}
 }
 if(this.gameDef.id==='crypt-runner')this.drawCrypt(box);
 if(this.gameDef.id==='neon-rally'){box(176,60,288,230,0x292536);for(const x of [176,460])box(x,60,4,230,0xe9caaf);for(let lane=1;lane<4;lane++)for(let y=65+(this.frame*3)%34;y<290;y+=34)box(176+lane*72,y,3,18,0xa79baf);const car=(c,col)=>{box(c.x-c.w/2,c.y-c.h/2,c.w,c.h,col);box(c.x-c.w/2+3,c.y-c.h/2+5,c.w-6,7,0x23203a);box(c.x-c.w/2-2,c.y-c.h/2+5,2,8,0x080811);box(c.x+c.w/2,c.y-c.h/2+5,2,8,0x080811);};for(const c of this.cars)car(c,c.color);if(!this.invincible||this.frame%8<4)car(p,color);}
 for(let y=62;y<290;y+=4)box(40,y,560,1,0x080b15);if(this.paused||this.ended||this.levelIntro){g.fillStyle(0x0a0817,.88);g.fillRect(100,113,440,145);}this.notice?.setVisible(!!this.levelIntro&&!this.paused&&!this.ended);this.stageLabel?.setText(this.level?.name||'HIGHWAY 01');this.hud?.setText('SCORE '+String(this.score).padStart(5,'0')+'   LIVES '+this.lives+'   '+(this.gameDef.id==='star-patrol'?'WAVE '+this.wave+'/'+STAR_WAVES.length:this.gameDef.id==='crypt-runner'?'ROOM '+this.room+'/'+CRYPT_ROOMS.length:'TIME '+Math.max(0,45-Math.floor(this.frame/60))));}
 /** Draws each crypt's own palette and landmarks around its actual platforms and patrols. */
 drawCrypt(box){
  const r=this.level,p=this.player;
  box(40,60,560,230,r.wall);
  for(let x=45;x<598;x+=24)for(let y=66;y<285;y+=18){box(x,y,22,16,r.wall);box(x,y+15,22,1,0x141723);box(x+21,y,1,16,0x141723);}
  for(const x of [104,258,400,548]){box(x,88,14,198,0x121523);box(x-3,88,20,5,r.stone);}
  if(r.theme==='gate'||r.theme==='crown'){
   box(276,112,88,117,0x12101c);box(287,101,66,13,0x12101c);
   for(let x=286;x<360;x+=14)box(x,116,3,111,r.stone);
   if(r.theme==='crown'){box(294,126,52,14,r.trim);for(const x of [294,316,338])box(x,116,8,13,r.trim);}
  }
  if(r.theme==='moss')for(let i=0;i<14;i++){const x=58+i*39;box(x,80,3,31+i%3*12,0x396144);box(x-4,96+i%3*8,11,4,0x658656);}
  if(r.theme==='water'){box(40,281,560,9,0x24506b);for(let i=0;i<10;i++)box(50+i*58+(this.frame/8%12),283,19,2,0x64abc1);}
  if(r.theme==='ember')for(const x of [126,280,442,542]){box(x,180,12,8,r.stone);box(x+4,167,4,13,r.trim);box(x+1,170+(this.frame%16<8?0:3),10,8,0xffd478);}
  if(r.theme==='frost')for(let x=60;x<590;x+=37){box(x,80,12,10,0x648794);box(x+3,90,6,14,r.trim);box(x+5,104,2,5,r.trim);}
  if(r.theme==='bells'){for(const x of [146,320,494]){box(x,80,2,32,r.stone);box(x-10,111,22,23,r.trim);box(x-15,133,32,5,r.trim);box(x-2,139,6,6,r.trim);}}
  if(r.theme==='crystal')for(let i=0;i<9;i++){const x=74+i*61;box(x,135,9,31,r.trim);box(x+2,129,5,6,r.trim);box(x+9,147,6,19,0x7762ac);}
  for(const ground of this.platforms){box(ground.x1,ground.y,ground.x2-ground.x1,18,r.stone);box(ground.x1,ground.y,ground.x2-ground.x1,3,r.trim);}
  const [dx,dy]=r.exit,open=this.gems.every(g=>g.taken);box(dx-11,dy-41,22,41,0x0b0a15);box(dx-8,dy-38,16,38,open?0x72d5b2:0x414157);box(dx+3,dy-17,2,3,open?0xffde79:0x202033);
  for(const gem of this.gems)if(!gem.taken){box(gem.x-3,gem.y-6,6,12,0xffde79);box(gem.x-5,gem.y-2,10,4,0xffde79);}
  for(const m of this.monsters){box(m.x-8,m.y-7,16,14,0xe36d85);box(m.x-5,m.y-4,3,3,0x130f25);box(m.x+3,m.y-4,3,3,0x130f25);}
  if(!this.invincible||this.frame%8<4){box(p.x-6,p.y-9,12,8,0xffd5ac);box(p.x-6,p.y-1,12,10,r.trim);box(p.x-7,p.y+8,5,3,0xf0eff7);box(p.x+2,p.y+8,5,3,0xf0eff7);}
 }
 update(_,delta){if(this.leaving)return;if(Phaser.Input.Keyboard.JustDown(this.keys.esc))return this.eject();if(Phaser.Input.Keyboard.JustDown(this.keys.pause))this.togglePause();if(Phaser.Input.Keyboard.JustDown(this.keys.retry)&&this.ended)this.startRun();const c=this.controls();if(this.leaving)return;this.acc+=Math.min(delta,100);this.pendingJump=this.pendingJump||c.jump;while(this.acc>=1000/60){this.step({...c,jump:this.pendingJump});this.pendingJump=false;this.acc-=1000/60;}this.draw();}
}
