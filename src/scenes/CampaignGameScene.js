import {FONT} from '../config.js';
import {makeButton} from '../ui/button.js';
import {cartridgeById} from './cartridges.js';
import {MOON_ROOMS,MOON_REGIONS,SKY_SECTORS,CAMPAIGN_SAVE} from './campaignData.js';
import {drawCampaign} from './campaignArt.js';
import {sfx} from '../audio/sfx.js';
const hit=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
/** Longer cartridge adventures with persistent room/sector checkpoints and shared four-way controls. */
export class CampaignGameScene extends Phaser.Scene{
 constructor(){super('CampaignGame');}
 /** Builds the CRT, directional touch controls and a saved or fresh campaign. */
 create(data={}){
  this.id=data.id==='skybreak'?'skybreak':'moonbound';this.def=cartridgeById(this.id);this.leaving=false;this.overlay=null;this.ui=[];this.touch={};this.acc=0;this.held=false;this.padPause=false;this.padBack=false;this.navHeld=0;
  if(this.input.manager.pointers.length<4)this.input.addPointer(4-this.input.manager.pointers.length);
  this.g=this.add.graphics();const style={fontFamily:FONT,fontSize:'6px',color:'#fff0d0',stroke:'#0b0918',strokeThickness:2};
  this.add.text(320,15,this.def.name,{...style,fontSize:'8px'}).setOrigin(.5);this.hud=this.add.text(45,44,'',style);this.area=this.add.text(320,70,'',style).setOrigin(.5);
  this.tip=this.add.text(320,283,'',{...style,fontSize:'5px',align:'center'}).setOrigin(.5);this.notice=this.add.text(320,101,'',{...style,fontSize:'7px',align:'center',wordWrap:{width:420}}).setOrigin(.5);
  this.keys=this.input.keyboard.addKeys({left:'LEFT',right:'RIGHT',up:'UP',down:'DOWN',a:'A',d:'D',w:'W',s:'S',action:'J',space:'SPACE',pause:'P',esc:'ESC'});
  makeButton(this,8,6,'EJECT',()=>this.eject(),{size:'7px',depth:10});makeButton(this,521,6,'PAUSE',()=>{if(!this.overlay)this.openMenu('pause');},{size:'7px',depth:10});
  for(const [label,key,x]of[['<','left',42],['>','right',108],['UP','up',174],['DOWN','down',240],['ACTION','action',477]]){
   const width=key==='action'?121:59,b=this.add.rectangle(x,307,width,43,0x353046).setOrigin(0).setStrokeStyle(2,this.def.color).setInteractive();
   this.add.text(x+width/2,328,label,style).setOrigin(.5);b.on('pointerdown',()=>this.touch[key]=true).on('pointerup',()=>this.touch[key]=false).on('pointerout',()=>this.touch[key]=false);
  }
  this.add.text(387,320,'WASD MOVE\nJ / A ACTION',{...style,fontSize:'5px',align:'center',lineSpacing:5}).setOrigin(.5);
  this.loadProgress();this.draw();this.events.once('shutdown',()=>{this.touch={};});
 }
 /** Validates stored checkpoints; a fresh run never alters another cartridge's save. */
 loadProgress(fresh=false){
  let p={};if(!fresh)try{p=JSON.parse(localStorage.getItem(CAMPAIGN_SAVE+this.id)||'{}')||{};}catch{}
  const num=(value,max)=>clamp(Math.floor(Number(value)||0),0,max);
  this.progress={version:1,room:num(p.room,11),sector:num(p.sector,8),coins:num(p.coins,9999),score:num(p.score,999999),power:num(p.power,3),shield:num(p.shield,3),rapid:num(p.rapid,3),cleared:Array.isArray(p.cleared)?[...new Set(p.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<12))]:[],won:!!p.won,hangar:!!p.hangar};
  this.pendingTap=false;this.score=this.progress.score;this.frame=0;this.invincible=0;this.cooldown=0;this.facing={x:1,y:0};this.overlay=null;this.clearMenu();
  if(this.id==='moonbound')this.enterRoom(this.progress.room);
  else{this.enterSector();if(this.progress.hangar&&!this.progress.won)this.openMenu('hangar');}
  this.saveProgress();if(this.progress.won)this.openMenu('win');
 }
 /** Stores completed objectives and upgrades, keeping a checkpoint even when the cartridge is ejected. */
 saveProgress(){
  this.progress.score=this.score;
  try{localStorage.setItem(CAMPAIGN_SAVE+this.id,JSON.stringify(this.progress));const best=JSON.parse(localStorage.getItem('rebirth.cartridgeScores')||'{}')||{};best[this.id]=Math.max(best[this.id]||0,this.score);localStorage.setItem('rebirth.cartridgeScores',JSON.stringify(best));}catch{}
 }
 /** Starts a room with its original patrols, or its rescued inhabitants if already cleared. */
 enterRoom(index,entry='left'){
  this.progress.room=index;this.room=MOON_ROOMS[index];this.region=MOON_REGIONS[Math.floor(index/4)];this.invincible=60;this.cooldown=0;this.shots=[];this.pickups=[];this.roomFrame=0;
  this.maxHP=6+this.progress.shield*2+(this.progress.cleared.includes(7)?2:0);this.damage=1+this.progress.power+(this.progress.cleared.includes(3)?1:0);
  this.player={x:entry==='right'?557:entry==='up'||entry==='down'?320:82,y:entry==='up'?103:entry==='down'?256:185,w:14,h:18};this.hp=this.maxHP;
  this.enemies=[];
  if(!this.progress.cleared.includes(index)&&this.room.kind!=='camp'){
   const tier=Math.floor(index/4),boss=this.room.kind==='boss';
   if(boss)this.enemies=[{x:463,y:177,w:40,h:40,hp:12+tier*8,maxHP:12+tier*8,boss:true,tier,home:463,phase:0}];
   else this.enemies=Array.from({length:3+tier},(_,i)=>({x:260+i%3*104,y:155+Math.floor(i/3)*55,w:18,h:18,hp:2+tier,maxHP:2+tier,phase:i*57,ranged:tier>0&&i%2===0}));
  }
  if(this.room.kind==='camp'&&!this.progress.cleared.includes(index)){this.progress.cleared.push(index);this.progress.coins+=2;}
  this.toast='CHECKPOINT / '+this.room.name;this.toastTime=100;this.saveProgress();
 }
 /** Loads a sector; bosses arrive after its scrolling approach, and purchased equipment remains. */
 enterSector(){
  this.sector=SKY_SECTORS[this.progress.sector];this.stageFrame=0;this.maxHP=5+this.progress.shield*2;this.hp=this.maxHP;this.invincible=60;this.cooldown=0;
  this.player={x:112,y:177,w:24,h:16};this.enemies=[];this.shots=[];this.bullets=[];this.pickups=[];this.bossSpawned=false;this.kills=0;this.toast='CHECKPOINT / SECTOR '+(this.progress.sector+1);this.toastTime=100;
 }
 /** Combines keyboard, gamepad and multi-touch input without losing quick action presses. */
 controls(){
  const k=this.keys,pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected),b=n=>!!pad?.buttons[n]?.pressed,axis=n=>pad?.axes[n]||0;
  const left=k.left.isDown||k.a.isDown||this.touch.left||b(14)||axis(0)<-.3,right=k.right.isDown||k.d.isDown||this.touch.right||b(15)||axis(0)>.3,up=k.up.isDown||k.w.isDown||this.touch.up||b(12)||axis(1)<-.3,down=k.down.isDown||k.s.isDown||this.touch.down||b(13)||axis(1)>.3;
  const action=k.action.isDown||k.space.isDown||this.touch.action||b(0),tap=action&&!this.held;this.held=action;
  if((b(1)&&!this.padBack)||Phaser.Input.Keyboard.JustDown(k.esc))this.eject();this.padBack=b(1);
  if((b(9)&&!this.padPause)||Phaser.Input.Keyboard.JustDown(k.pause)){if(this.overlay==='pause')this.closeMenu();else if(!this.overlay)this.openMenu('pause');}this.padPause=b(9);
  return{x:Number(right)-Number(left),y:Number(down)-Number(up),action,tap};
 }
 /** Prevents crossing room props while preserving full speed along their edges. */
 moveMoon(dx,dy){
  const p=this.player,blocked=()=>this.room.obstacles.some(([x,y,w,h])=>hit(p,{x:x+w/2,y:y+h/2,w,h}));
  const oldX=p.x;p.x+=dx;if(blocked())p.x=oldX;const oldY=p.y;p.y+=dy;if(blocked())p.y=oldY;
 }
 /** Takes one hit, grants recovery time, and offers the current checkpoint when health runs out. */
 hurt(amount=1){if(this.invincible||this.overlay)return;this.hp-=amount;this.invincible=65;sfx('hit',.25);if(this.hp<=0)this.openMenu('defeat');}
 /** Checks connected doors, regional seals and guardian gates before changing rooms. */
 moonDoors(){
  const p=this.player,n=this.progress.room,col=n%4,row=Math.floor(n/4),clear=this.progress.cleared.includes(n);
  const travel=(to,entry)=>{this.enterRoom(to,entry);return true;};
  if(p.x>581&&col<3&&clear){if(col===2&&!this.progress.cleared.includes(row*4+2)){this.toast='FIND THE REGION SEAL';this.toastTime=80;}else return travel(n+1,'left');}
  if(p.x<59&&col>0)return travel(n-1,'right');
  if(col===0&&p.x>280&&p.x<360){
   if(p.y>275&&row<2){if(this.progress.cleared.includes(row*4+3))return travel(n+4,'up');this.toast='DEFEAT THE REGION GUARDIAN FIRST';this.toastTime=70;}
   if(p.y<84&&row>0)return travel(n-4,'down');
  }
  p.x=clamp(p.x,59,581);p.y=clamp(p.y,84,275);return false;
 }
 /** Sword combat, pursuers and telegraphed guardian attacks within the connected adventure. */
 stepMoon(c){
  this.roomFrame++;const p=this.player,diagonal=c.x&&c.y?.707:1;this.moveMoon(c.x*2.1*diagonal,c.y*2.1*diagonal);if(c.x||c.y)this.facing={x:c.x,y:c.y};
  if(this.moonDoors())return;
  if(c.tap&&this.room.kind==='camp'&&Math.hypot(p.x-320,p.y-171)<62){this.openMenu('shop');return;}
  if(c.action&&!this.cooldown){
   this.cooldown=22;sfx('swing',.12);for(const e of this.enemies){const dx=e.x-p.x,dy=e.y-p.y;if(Math.hypot(dx,dy)<(e.boss?61:46)&&dx*this.facing.x+dy*this.facing.y>-10){e.hp-=this.damage;e.flash=8;}}
  }
  for(const e of this.enemies){
   if(e.hp<=0)continue;if(e.flash)e.flash--;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
   if(e.boss){
    const t=this.roomFrame%(e.tier===2?180:210);e.phase=t;
    if(e.tier===0){if(t<48){e.targetX=p.x;e.targetY=p.y;}else if(t<78){e.x+=clamp(e.targetX-e.x,-4,4);e.y+=clamp(e.targetY-e.y,-4,4);}else{e.x+=Math.sin(this.roomFrame*.025)*.6;e.y+=Math.cos(this.roomFrame*.03)*.5;}}
    if(e.tier===1){e.x=443+Math.sin(this.roomFrame*.024)*53;e.y=179+Math.sin(this.roomFrame*.043)*68;}
    if(e.tier===2){e.x=450+Math.sin(this.roomFrame*.032)*42;e.y=157+Math.sin(this.roomFrame*.019)*43;if(t<45){e.targetX=p.x;e.targetY=p.y;}if(t===55&&Math.hypot(p.x-e.targetX,p.y-e.targetY)<28)this.hurt(2);}
    const every=e.tier===2?80:100;if(this.roomFrame%every===0){const angles=e.tier===1?Array.from({length:6},(_,i)=>i*Math.PI/3):[-.45,0,.45].map(a=>Math.atan2(dy,dx)+a);for(const a of angles)this.shots.push({x:e.x,y:e.y,w:6,h:6,vx:Math.cos(a)*2.2,vy:Math.sin(a)*2.2});}
   }else{const speed=.55+Math.floor(this.progress.room/4)*.14;e.x+=dx/d*speed;e.y+=dy/d*speed;if(e.ranged&&(this.roomFrame+e.phase)%130===0)this.shots.push({x:e.x,y:e.y,w:5,h:5,vx:dx/d*1.8,vy:dy/d*1.8});}
   e.x=clamp(e.x,75,565);e.y=clamp(e.y,105,260);if(e.hp>0&&hit(e,p))this.hurt(e.boss?2:1);
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);this.moveShots();if(this.overlay)return;
  if(!this.enemies.length&&!this.progress.cleared.includes(this.progress.room)){
   const n=this.progress.room;this.progress.cleared.push(n);this.progress.coins+=this.room.kind==='boss'?8:4;this.score+=this.room.kind==='boss'?700:200;
   this.hp=Math.min(this.maxHP,this.hp+2);this.shots=[];
   this.toast=this.room.kind==='key'?'REGION SEAL FOUND / GUARDIAN DOOR OPEN':this.room.kind==='rescue'?'COURIER RESCUED / +4 COINS':this.room.kind==='boss'?'GUARDIAN FREED / NEW RELIC / RETURN TO CAMP':'AREA CLEARED / CHECKPOINT SAVED';this.toastTime=180;
   if(n===11){this.progress.won=true;this.saveProgress();this.openMenu('win');}else this.saveProgress();
  }
 }
 /** Scrolling enemy types, pickups, upgraded weapons and three boss battles in Skybreak. */
 stepSky(c){
  this.stageFrame++;const p=this.player,sector=this.progress.sector,t=this.stageFrame;
  p.x=clamp(p.x+c.x*2.8,62,568);p.y=clamp(p.y+c.y*2.8,88,273);
  if(c.action&&!this.cooldown){this.cooldown=Math.max(6,14-this.progress.rapid*2);for(const offset of this.progress.power>=2?[-5,5]:[0])this.bullets.push({x:p.x+16,y:p.y+offset,w:8,h:3,dmg:1+this.progress.power});sfx('swing',.04,1.8);}
  if(t<this.sector.duration&&t%Math.max(29,55-sector*2)===0&&this.enemies.length<18){const i=Math.floor(t/40),type=i%4;this.enemies.push({x:620,y:93+(i*53)%163,w:type===2?27:20,h:type===2?26:16,hp:(type===2?3:1)+Math.floor(sector/3),maxHP:4,type,phase:i*17});}
  if(this.sector.boss&&t>=this.sector.duration&&!this.bossSpawned){const hp=28+sector*3;this.enemies.push({x:550,y:173,w:66,h:62,hp,maxHP:hp,boss:true,phase:0,age:0,beamY:p.y});this.bossSpawned=true;this.toast=this.sector.name;this.toastTime=100;}
  for(const e of this.enemies){
   if(e.hp<=0)continue;if(e.flash)e.flash--;
   if(e.boss){e.x+=clamp(517-e.x,-1,1);e.y=176+Math.sin(t*.022)*61;e.phase=(++e.age)%(240-Math.floor(sector/3)*40);if(e.phase<40)e.beamY=p.y;if(e.phase===55&&Math.abs(p.y-e.beamY)<12)this.hurt(2);if(t%(48-Math.floor(sector/3)*7)===0)for(const vy of sector>=6?[-1.6,-.8,0,.8,1.6]:[-1.2,0,1.2])this.shots.push({x:e.x-33,y:e.y,w:7,h:5,vx:-3.1,vy});}
   else{e.x-=e.type===1?2.5:1.5+sector*.08;if(e.type===1)e.y+=Math.sin((t+e.phase)*.045)*1.2;if(e.type===3&&(t+e.phase)%90===0){const d=Math.hypot(p.x-e.x,p.y-e.y)||1;this.shots.push({x:e.x,y:e.y,w:5,h:5,vx:(p.x-e.x)/d*2.6,vy:(p.y-e.y)/d*2.6});}}
   if(e.hp>0&&hit(e,p)){this.hurt(e.boss?2:1);if(!e.boss)e.hp=0;}
  }
  for(const b of this.bullets){b.x+=7;const e=this.enemies.find(e=>e.hp>0&&hit(e,b));if(e){e.hp-=b.dmg;e.flash=5;b.x=900;if(e.hp<=0){this.score+=e.boss?1000:40;this.progress.coins++;this.kills++;if(!e.boss&&this.kills%5===0)this.pickups.push({x:e.x,y:e.y,w:10,h:10});}}}
  this.bullets=this.bullets.filter(b=>b.x<610);this.enemies=this.enemies.filter(e=>e.hp>0&&e.x>-30);
  for(const drop of this.pickups){drop.x-=1.4;if(hit(drop,p)){this.hp=Math.min(this.maxHP,this.hp+2);drop.x=-50;sfx('ding',.12);}}this.pickups=this.pickups.filter(d=>d.x>30);this.moveShots();
  if(this.overlay)return;
  if((!this.sector.boss&&t>=this.sector.duration)||(this.sector.boss&&this.bossSpawned&&!this.enemies.some(e=>e.boss))){
   this.progress.coins+=8;this.score+=350;this.progress.hangar=true;
   if(sector===8){this.progress.won=true;this.saveProgress();this.openMenu('win');}else{this.saveProgress();this.openMenu('hangar');}
  }
 }
 /** Moves hostile projectiles and removes them when they hit or leave the CRT. */
 moveShots(){for(const b of this.shots){b.x+=b.vx;b.y+=b.vy;if(hit(b,this.player)){this.hurt();b.x=-100;}}this.shots=this.shots.filter(b=>b.x>35&&b.x<605&&b.y>65&&b.y<295);}
 /** Applies an affordable equipment purchase; capped upgrades cannot drain coins. */
 buyUpgrade(kind){
  const cost=kind==='power'?6:kind==='shield'?5:4;if(this.progress[kind]>=3||this.progress.coins<cost){this.toast='NOT ENOUGH COINS / OR UPGRADE MAXED';this.toastTime=90;return false;}
  this.progress.coins-=cost;this.progress[kind]++;this.saveProgress();sfx('ding',.2);this.openMenu(this.overlay);return true;
 }
 /** Continues from a hangar checkpoint into the next, fully repaired sector. */
 nextSector(){this.progress.sector++;this.progress.hangar=false;this.saveProgress();this.closeMenu();this.enterSector();}
 /** Removes only temporary menu controls, leaving the game and directional controls intact. */
 clearMenu(){for(const p of this.ui||[]){p.plate?.destroy();p.destroy();}this.ui=[];this.menuButtons=[];}
 /** Shows checkpoint retry, campaign restart, upgrades or the ending with large touch targets. */
 openMenu(kind){
  if(this.leaving)return;this.clearMenu();this.overlay=kind;this.choice=0;this.menuButtons=[];const add=o=>{this.ui.push(o);return o;},style={fontFamily:FONT,fontSize:'9px',color:'#fff1cb',align:'center'};
  add(this.add.rectangle(320,177,490,202,0x100c1d,.97).setDepth(20).setStrokeStyle(2,this.def.color));
  const titles={pause:'PAUSED / CHECKPOINT SAVED',defeat:'SIGNAL LOST / RETRY CHECKPOINT',win:this.id==='moonbound'?'THE THREE LIGHTS RETURN':'THE ECLIPSE IS BROKEN',shop:'CAMP WORKSHOP',hangar:'SECTOR CLEAR / HANGAR',reset:'START A NEW CAMPAIGN?'};
  add(this.add.text(320,96,titles[kind],style).setOrigin(.5).setDepth(21));
  const button=(x,y,label,fn)=>{const text=add(makeButton(this,x,y,label,fn,{size:'7px',pad:{x:12,y:10},depth:22}));this.menuButtons.push({text,fn});};
  if(kind==='reset'){button(130,171,'YES / RESET SAVE',()=>this.loadProgress(true));button(380,171,'CANCEL',()=>this.openMenu('pause'));return;}
  if(kind==='shop'||kind==='hangar'){
   add(this.add.text(320,122,'COINS '+this.progress.coins+' / UPGRADES SAVE IMMEDIATELY',{...style,fontSize:'6px'}).setOrigin(.5).setDepth(21));
   button(100,149,'POWER '+this.progress.power+'/3 [6]',()=>this.buyUpgrade('power'));
   button(327,149,'HEALTH '+this.progress.shield+'/3 [5]',()=>this.buyUpgrade('shield'));
   if(kind==='hangar')button(100,193,'RAPID '+this.progress.rapid+'/3 [4]',()=>this.buyUpgrade('rapid'));
   button(kind==='hangar'?327:244,193,kind==='hangar'?'NEXT SECTOR':'BACK TO CAMP',()=>kind==='hangar'?this.nextSector():this.closeMenu());
  }else{
   add(this.add.text(320,133,kind==='win'?(this.id==='moonbound'?'12 AREAS / 3 GUARDIANS / A WORLD REBORN':'9 SECTORS / 3 FLAGSHIPS / THE SKY IS FREE'):'Your completed areas and equipment are safe.',{...style,fontSize:'6px'}).setOrigin(.5).setDepth(21));
   button(130,166,kind==='pause'?'RESUME':kind==='win'?'NEW CAMPAIGN':'RETRY CHECKPOINT',()=>{if(kind==='pause')this.closeMenu();else this.loadProgress(kind==='win');});
   button(380,166,'EJECT',()=>this.eject());
   if(kind==='pause')button(223,213,'NEW CAMPAIGN',()=>this.openMenu('reset'));
  }
 }
 /** Resumes play; newly bought health and power take effect without leaving a camp. */
 closeMenu(){const old=this.overlay;this.clearMenu();this.overlay=null;this.acc=0;if(old==='shop'){this.maxHP=6+this.progress.shield*2+(this.progress.cleared.includes(7)?2:0);this.damage=1+this.progress.power+(this.progress.cleared.includes(3)?1:0);this.hp=this.maxHP;}}
 /** Returns the cartridge to the player and retains its last completed checkpoint. */
 eject(){if(this.leaving)return;this.saveProgress();this.leaving=true;this.scene.start('Treehouse',{cartridge:this.id});}
 /** Advances a fixed tick and keeps pause/upgrade menus outside the simulation. */
 step(c){if(this.overlay||this.leaving)return;this.frame++;if(this.invincible)this.invincible--;if(this.cooldown)this.cooldown--;if(this.toastTime)this.toastTime--;if(this.id==='moonbound')this.stepMoon(c);else this.stepSky(c);}
 /** Draws native pixel environments, equipment, enemies and campaign progress. */
 draw(){drawCampaign(this);}
 /** Samples controls once and preserves action taps until a physics tick consumes them. */
 update(_,delta){
  const c=this.controls();if(this.leaving)return;
  if(this.overlay){const nav=c.x||c.y;if(nav&&!this.navHeld)this.choice=(this.choice+(nav<0?-1:1)+this.menuButtons.length)%this.menuButtons.length;this.navHeld=nav;this.menuButtons.forEach((b,i)=>b.text.setColor(i===this.choice?'#ffdc84':'#ffffff'));if(c.tap)this.menuButtons[this.choice]?.fn();this.acc=0;this.draw();return;}
  this.pendingTap=this.pendingTap||c.tap;this.acc+=Math.min(delta,100);
  while(this.acc>=1000/60){this.step({...c,tap:this.pendingTap});this.pendingTap=false;this.acc-=1000/60;}
  this.draw();
 }
}
