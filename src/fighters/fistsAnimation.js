import {sfx} from '../audio/sfx.js';
import {BLAST} from '../config.js';
import {FISTS_CLIPS as C} from './fistsAnims.js';
// Hold readable key poses for at least three simulation ticks, even in dense source clips.
const pick=(clip,t,duration)=>{const count=Math.min(clip.length,Math.max(1,Math.floor(duration/3))),step=Math.min(count-1,Math.floor(Math.max(0,t)*count/Math.max(1,duration)));return clip[count===1?0:Math.round(step*(clip.length-1)/(count-1))];};
const subset=(name,a,b)=>C[name].slice(a,b);
// Two adjacent planted guard poses form a slow breath rather than a bouncing loop.
export const fistsIdleFrame=t=>{const phase=((Math.floor(t)%180)+180)%180;return phase>=76&&phase<100?1:0;};
const SIDE_KICK=[...C.sideB.slice(0,6),...C.sideB.slice(10,13)];
const downAirPose=t=>C.dive[t<4?11:t<7?12:t<9?13:t<11?14:t<14?15:t<19?16:t<23?17:t<27?18:19];
// Keep windup, contact, and recovery aligned with the actual hit windows.
function attackPose(clip,t,move){const hits=move?.hits||[],first=hits[0]?.from||5,last=hits.at(-1)?.to||Math.round((move?.frames||30)*.65),end=move?.frames||30,n=clip.length,a=Math.max(1,Math.floor(n*.28)),b=Math.min(n-1,Math.max(a+1,Math.ceil(n*.8)));if(t<first)return pick(clip.slice(0,a),t,first);if(t<=last)return pick(clip.slice(a,b),t-first,last-first+1);return pick(clip.slice(b),t-last-1,end-last-1);}
const POSES={ftilt:C.ftilt,utilt:C.utilt,dtilt:C.dtilt,dashAttack:subset('rush',9,14),fsmash:C.fsmash,usmash:C.upflame,dsmash:C.downsmash,nair:C.nair,fair:SIDE_KICK,bair:SIDE_KICK,uair:subset('utilt',2,7),sideB:SIDE_KICK,downB:C.downB,grab:C.ftilt};
export function fistsPose(f){const s=f.state,t=f.t,S=f.sheets,move=frame=>({sheet:S.moves,frame});if(s!=='run'&&f.fistsStride)f.fistsStride.age=f.age;
 if(s==='attack'){
  if(f.moveName==='jab'){const at=t<4?0:t<7?1:t<11?0:t<14?1:t<19?0:t<23?2:0;return move(C.jab[at]);}
  if(f.moveName==='dair')return move(downAirPose(t));
  if(f.moveName==='neutralB'){if(t<5)return move(C.rush[0]);if(t<24)return move(C.rush[[1,2,3,4,3,2][Math.floor((t-5)/3)%6]]);return move(pick(C.rush.slice(9,14),t-24,16));}
  if(f.moveName==='throw'){const a=f.throwDir==='up'?C.upflame:f.throwDir==='down'?C.downB:C.ftilt;return move(pick(a,t,f.move?.frames||28));}
  return move(attackPose(POSES[f.moveName]||C.jab,t,f.move));
 }
 if(s==='upb')return move(attackPose(C.upflame,t,f.def.moves.upb));
 if(s==='limit'){const U=f.ult;if(U?.phase==='cutscene'){const c=U.ct;if(c<20)return move(pick(C.upflame,c,20));if(c<92){const clips=[C.nair,SIDE_KICK,C.utilt,C.ftilt],at=c-20,clip=clips[Math.floor(at/18)%4];return move(pick(clip,at%18,18));}if(c<110)return move(C.upflame[3]);return move(pick(C.dive.slice(14,20),c-110,18));}if(t<36)return move(pick(C.taunt,t,36));if(t<44)return move(pick(C.rush,t-36,8));return move(pick(C.upflame,t-44,12));}
 if(s==='shield')return move(C.guard[0]);
 if(s==='holding')return move(f.pummelCd>0?C.jab[1]:C.ftilt[1]);
 if(['hitstun','dizzy','grabbed','seized'].includes(s))return move(pick(C.hurt.slice(0,4),t,18));
 if(s==='dying')return move(pick(C.hurt,t,35));
 if(s==='taunt')return move(pick(C.win,t,f.def.taunt.frames));
 if(['roll','ledgeroll','spotdodge','airdodge'].includes(s))return move(pick(C.airB,t,s==='spotdodge'?22:30));
 if(s==='ledgeattack')return move(pick(C.ftilt,t,32));
 if(['ledge','ledgeclimb'].includes(s))return {sheet:S.jump,frame:2};
 if(s==='run'){
  const clock=f.fistsStride||(f.fistsStride={age:f.age,phase:0});const elapsed=Math.max(0,Math.min(4,f.age-clock.age));clock.age=f.age;clock.phase=(clock.phase+Math.min(.1,elapsed*Math.abs(f.vx)/160))%1;return {sheet:S.run,frame:1+Math.floor(clock.phase*10)};
 }
 if(['air','helpless'].includes(s)){const rise=f.vy<0,progress=rise?1-Math.min(1,Math.abs(f.vy)/Math.abs(f.def.jumpV)):Math.min(1,f.vy/7);return {sheet:rise?S.jump:S.fall,frame:rise?Math.min(4,Math.floor(progress*5)):Math.min(3,Math.floor(progress*4))};}
 return {sheet:S.idle,frame:fistsIdleFrame(t)};
}
// A connecting launcher confirms the cinematic; a miss spends the super and recovers.
export function stepFistsLimit(f){const t=f.t,m=f.match;
 if(!f.ult)f.ult={phase:'rush',victims:[],origin:{x:f.x,y:f.y},ct:0};const U=f.ult;
 f.invincible=Math.max(f.invincible,2);f.vx=f.vy=f.lx=f.ly=0;
 const hit=(v,dmg,final=false)=>{m.applyHit(v,{owner:f,facing:f.facing,id:'comet:'+f.slot+':'+t,h:{dmg,angle:final?-65:85,base:final?9:1,growth:final?8:0,stun:final?35:999}},f.x);f.hitstop=v.hitstop=0;if(!final){v.vx=v.vy=v.lx=v.ly=0;v.hitstun=999;}m.puff(v.x,v.y-25,final?0xffd568:f.fxColor,final?18:5);m.shake(final?11:3,final?10:3);sfx(final?'bighit':'swing',final?.9:.4,final?.7:1.2);};
 const end=()=>{m.frozen=0;if(m.cutscene===f)m.cutscene=null;f.ult=null;f.grounded=false;f.platform=null;f.invincible=30;f.setState('air');};
 if(U.phase==='rush'){
  if(t>=36&&t<55){f.vx=f.facing*7;for(const v of m.fighters){const dx=(v.x-f.x)*f.facing;if(v===f||!v.alive||v.team===f.team||v.isIntangible()||['grabbed','seized'].includes(v.state)||dx<0||dx>54||Math.abs(v.y-f.y)>65)continue;
   U.phase='cutscene';U.victims=[v];U.cx=v.x;U.startY=v.y;U.skyY=Math.max(BLAST.top+100,Math.min(v.y,f.y)-145);U.from={x:f.x,y:f.y};f.grounded=v.grounded=false;f.platform=v.platform=null;f.vx=0;hit(v,6);m.cutscene=f;m.frozen=9999;return;
  }}if(t>=70)return end();return;
 }
 const v=U.victims[0];if(!v?.alive||v.state==='dying')return end();const c=++U.ct;
 if(c<=20){const k=1-Math.pow(1-c/20,2);v.y=U.startY+(U.skyY-U.startY)*k;v.x=U.cx;f.x=U.from.x+(U.cx-f.facing*28-U.from.x)*k;f.y=U.from.y+(U.skyY-U.from.y)*k;}
 else if(c<92){const at=c-20,segment=Math.floor(at/18),q=(at%18)/18,side=segment%2?1:-1;v.x=U.cx;v.y=U.skyY-4*Math.sin(q*Math.PI);f.x=U.cx+side*(34-15*Math.sin(q*Math.PI));f.y=U.skyY+Math.sin(segment*1.7)*18;f.facing=side<0?1:-1;if(at%9===1)hit(v,2);}
 else if(c<110){f.x=U.cx;f.y=U.skyY-42;v.x=U.cx;v.y=U.skyY; if(c%4===0)m.puff(f.x,f.y-22,0xffd568,3);}
 else if(c===110){f.y=U.skyY-28;hit(v,18,true);U.released=true;}
 else if(c<128){f.y+=2; // Let the launched opponent fly while the cinematic camera follows.
  v.hitstop=0;v.hitstun=Math.max(v.hitstun,20);v.physics(v.ctrl);v.checkBlast();
 }
 if(!U.released){v.hitstop=0;v.hitstun=999;v.vx=v.vy=v.lx=v.ly=0;}
 if(c>=128)return end();
}
