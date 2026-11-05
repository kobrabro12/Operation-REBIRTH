import {MOON_ROOMS,MOON_REGIONS} from './campaignData.js';
/** Draws the campaign's current region or scrolling flight with pixel silhouettes and readable telegraphs. */
export function drawCampaign(s){
 const g=s.g;g.clear();let clip=false;
 const box=(x,y,w,h,c)=>{x=Math.round(x);y=Math.round(y);if(clip){const r=Math.min(600,x+w),b=Math.min(290,y+h);x=Math.max(40,x);y=Math.max(60,y);w=r-x;h=b-y;}if(w<=0||h<=0)return;g.fillStyle(c);g.fillRect(x,y,w,h);};
 const line=(x,y,xx,yy,c,w=1)=>{g.lineStyle(w,c);g.lineBetween(x,y,xx,yy);};
 box(0,0,640,360,0x100c1a);box(26,34,588,266,0x514659);box(32,37,576,258,0x090d1c);clip=true;
 const p=s.player,visible=!s.invincible||s.frame%8<4;
 if(s.id==='moonbound'){
  const r=s.region,n=s.progress.room,row=Math.floor(n/4),col=n%4,cleared=s.progress.cleared.includes(n);
  box(40,60,560,230,r.floor);
  for(let y=84;y<283;y+=18)for(let x=50;x<590;x+=23){box(x,y,18,1,row===0?0x2b4a3a:row===1?0x33395c:0x4b3c54);if((x+y)%3===0)box(x+8,y+8,2,2,r.wall);}
  box(45,160,550,39,row===0?0x796851:row===1?0x68647c:0x927664);
  for(let y=84;y<275;y+=29){box(43,y,10,19,r.wall);box(588,y,10,19,r.wall);}
  for(let x=55;x<586;x+=26){box(x,77,19,7,r.wall);box(x,279,19,7,r.wall);}
  if(col>0)box(40,164,15,32,r.accent);if(col<3)box(585,164,15,32,cleared?r.accent:0x995d69);
  if(col===0){box(302,78,36,8,row>0?r.accent:r.wall);box(302,278,36,8,s.progress.cleared.includes(row*4+3)?r.accent:0x995d69);}
  for(const [x,y,w,h]of s.room.obstacles){
   box(x,y,w,h,r.wall);box(x+3,y+3,w-6,h-8,row===0?0x49704d:row===1?0x7574aa:0xa08c8e);box(x+5,y+5,w-12,3,r.accent);
   if(row===0){box(x+6,y+h-2,5,8,0x695043);box(x+w-11,y+h-3,5,8,0x695043);}else if(row===1){box(x+w/2,y-6,7,11,r.accent);}
  }
  if(s.room.kind==='camp'){
   box(295,137,50,40,0x715b49);box(290,132,60,11,r.accent);box(300,176,5,9,0x211c2b);box(335,176,5,9,0x211c2b);
   box(312,115,17,16,0xd9c6ac);box(309,112,23,6,r.accent);box(315,120,3,3,0x201d2b);box(323,120,3,3,0x201d2b);
  }
  if(cleared&&s.room.kind==='rescue'){
   box(450,126,16,16,0xffcf86);box(453,129,10,6,0x24253e);box(451,144,14,15,0x82a8ba);box(448,159,6,4,0xffcf86);box(462,159,6,4,0xffcf86);
  }
  if(s.room.kind==='key'){box(302,120,36,30,0x313343);box(312,108,16,17,cleared?r.accent:0x90889e);box(317,113,6,6,0x242333);}
  for(const e of s.enemies){
   const c=e.flash?0xffffff:r.accent;
   if(e.boss){
    if(e.tier!==1&&e.phase<48){line(e.x,e.y,e.targetX||p.x,e.targetY||p.y,0xf08c81,2);box((e.targetX||p.x)-8,(e.targetY||p.y)-8,16,2,0xffc987);}
    if(e.tier===1){for(let i=0;i<5;i++)box(e.x-10+i*9,e.y+16+i*4,12,7,r.accent);box(e.x-37,e.y-14,14,20,r.accent);box(e.x+23,e.y-14,14,20,r.accent);}
    if(e.tier===2){g.lineStyle(2,0xffd98e);g.strokeCircle(e.x,e.y,31);if(e.phase>=45&&e.phase<65){g.lineStyle(3,0xfbb49a);g.strokeCircle(e.targetX||p.x,e.targetY||p.y,27);}}
    box(e.x-20,e.y-17,40,34,r.wall);box(e.x-15,e.y-24,30,22,c);box(e.x-12,e.y-17,24,5,0x222335);box(e.x-3,e.y-17,6,5,0xff7171);
    box(e.x-26,e.y-24,6,16,c);box(e.x+20,e.y-24,6,16,c);box(e.x-29,e.y-6,10,24,c);box(e.x+19,e.y-6,10,24,c);box(e.x-14,e.y+17,10,10,c);box(e.x+4,e.y+17,10,10,c);
    box(e.x-24,e.y-32,48,3,0x201b2e);box(e.x-24,e.y-32,48*e.hp/e.maxHP,3,0xef828b);
   }else{box(e.x-9,e.y-8,18,15,c);box(e.x-6,e.y-12,12,5,c);box(e.x-5,e.y-4,3,3,0x232338);box(e.x+3,e.y-4,3,3,0x232338);for(let i=0;i<3;i++)box(e.x-9+i*7,e.y+7,4,3,c);}
  }
  if(visible){box(p.x-6,p.y-10,12,10,0xffd8b0);box(p.x-10,p.y-14,20,5,r.accent);box(p.x-5,p.y-19,10,7,r.accent);box(p.x-8,p.y,16,12,0x83aa78);box(p.x-8,p.y+11,6,4,0x2b2530);box(p.x+2,p.y+11,6,4,0x2b2530);}
  if(s.cooldown>12){const a=Math.atan2(s.facing.y,s.facing.x);g.lineStyle(4,0xffedb1);g.beginPath();g.arc(p.x,p.y,34,a-.7,a+.7);g.strokePath();line(p.x,p.y,p.x+Math.cos(a)*32,p.y+Math.sin(a)*32,0xf0f3ec,2);}
  for(let rr=0;rr<3;rr++)for(let cc=0;cc<4;cc++){const id=rr*4+cc;box(532+cc*14,78+rr*10,11,7,s.progress.cleared.includes(id)?MOON_REGIONS[rr].accent:0x171c2a);if(id===n)box(536+cc*14,80+rr*10,3,3,0xffffff);}
  s.area.setText(s.room.name);s.hud.setText('HP '+s.hp+'/'+s.maxHP+'   COINS '+s.progress.coins+'   AREA '+(n+1)+'/12   POWER '+s.damage);
  s.tip.setText(s.room.kind==='camp'?'ACTION NEAR THE KEEPER: WORKSHOP / DOWN AFTER THE GUARDIAN':'CLEAR ENEMIES / FIND SEALS / RETURN TO CAMP TO GO DEEPER');
 }else{
  const r=s.sector,t=s.stageFrame;box(40,60,560,230,r.color);
  for(let i=0;i<72;i++){const x=45+((i*113-t*(i%3+1)*.45)%550+550)%550,y=78+i*47%206;box(x,y,i%7===0?3:1,1,r.accent);}
  for(let i=0;i<8;i++){const x=40+((i*100-t*.7)%650+650)%650;box(x,267-i%2*13,68,40,0x131b2c);box(x+5,261-i%2*13,8,7,r.accent);}
  for(const e of s.enemies){
   const c=e.flash?0xffffff:r.accent;
   if(e.boss){
    box(e.x-33,e.y-28,66,56,0x52506d);box(e.x-39,e.y-10,16,20,c);box(e.x-26,e.y-20,42,40,c);box(e.x-21,e.y-13,22,26,0x222339);box(e.x-16,e.y-7,12,14,0xffb682);box(e.x+17,e.y-34,14,68,c);
    box(205,83,230,4,0x10111e);box(205,83,230*e.hp/e.maxHP,4,0xf08a9a);
    if(e.phase<55){line(46,e.beamY,e.x-35,e.beamY,0xffa578,1);if(e.phase>40)line(46,e.beamY+2,e.x-35,e.beamY+2,0xfff4cb,2);}else if(e.phase<63)box(40,e.beamY-5,e.x-70,10,0xffeed2);
   }else if(e.type===2){box(e.x-13,e.y-10,26,20,0x8d7a83);box(e.x-8,e.y-14,16,28,0xa79098);box(e.x-6,e.y-5,8,6,0x51415b);}
   else{box(e.x-12,e.y-4,24,8,c);box(e.x-4,e.y-11,12,22,c);box(e.x-7,e.y-2,7,4,0x181a2a);}
  }
  for(const b of s.bullets){box(b.x-4,b.y-1,8,3,0xffe5a5);box(b.x-7,b.y,4,1,0xffffff);}
  for(const d of s.pickups){box(d.x-5,d.y-5,10,10,0x8fe7b3);box(d.x-3,d.y-1,6,2,0x203848);box(d.x-1,d.y-3,2,6,0x203848);}
  if(visible){box(p.x-12,p.y-4,24,8,0xdce5e9);box(p.x-4,p.y-10,9,20,r.accent);box(p.x+5,p.y-3,13,6,r.accent);box(p.x-17,p.y-3,5+(s.frame%4)*2,6,0xffbf75);box(p.x-2,p.y-3,7,6,0x263048);}
  box(45,288,550*Math.min(1,t/r.duration),2,r.accent);
  s.area.setText(r.name+(r.boss?' / FLAGSHIP':''));s.hud.setText('SHIELD '+s.hp+'/'+s.maxHP+'  CREDITS '+s.progress.coins+'  SECTOR '+(s.progress.sector+1)+'/9');s.tip.setText('ACTION: FIRE / GREEN CELLS REPAIR SHIELDS / DODGE MARKED BEAMS');
 }
 for(const b of s.shots)box(b.x-b.w/2,b.y-b.h/2,b.w,b.h,0xf2879b);
 for(let y=62;y<290;y+=5)box(40,y,560,1,0x080b15);
 s.notice.setText(s.toastTime?s.toast:'');
}
