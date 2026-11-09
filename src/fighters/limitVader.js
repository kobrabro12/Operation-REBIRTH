import {sfx} from '../audio/sfx.js';
import {isDarthVader,vaderAnchor} from './vaderAnimation.js';

export const VADER_LIMIT_NAME='POWER OF THE DARK SIDE';

/** Find a real floor below a captured fighter, without adding or changing stage collision. */
function floorBelow(f,v){
  return f.match.stage.platforms.filter(p=>v.x>=p.x1&&v.x<=p.x2&&p.y>=v.y-2).sort((a,b)=>a.y-b.y)[0]||null;
}

/** Release a cinematic's ownership and any surviving victim on a miss, interruption, or finish. */
export function endVaderLimit(f){
  const m=f.match,U=f.ult;
  if(m.cutscene===f){m.cutscene=null;m.frozen=0;}
  for(const v of U?.victims||[])if(!U.released&&v.alive&&v.state!=='dying'){v.hitstun=18;v.invincible=Math.max(v.invincible,8);v.setState('hitstun');}
  f.ult=null;f.vx=f.vy=f.lx=f.ly=0;f.invincible=Math.max(f.invincible,20);
  f.setState(f.grounded?'idle':'air');
}

/** Apply a real Force/saber hit, keeping a living target locked only before the finishing slam. */
function strike(f,v,damage,type,final=false){
  const m=f.match;
  m.applyHit(v,{owner:f,facing:f.facing,id:'vader:'+f.slot+':'+f.age+':'+damage,pillar:true,h:{dmg:damage,damageType:type,angle:final?(f.ult.floor?75:-65):90,base:final?7.5:0,growth:final?7:0,stun:final?28:999}},f.x);
  f.hitstop=0;
  if(!final&&v.alive&&v.state!=='dying'){v.hitstop=0;v.vx=v.vy=v.lx=v.ly=0;v.hitstun=999;v.setState('hitstun');}
  m.puff(v.x,v.y-v.body.h*.5,final?0xffd0c6:0xff354f,final?18:5);
  sfx(final?'bighit':type==='sword'?'vaderSaber':'vaderForce',final?.9:.6,final?.65:1);
  m.shake(final?12:3,final?14:4);
}

/** A dodgeable Force catch becomes a lift, pull, three saber cuts, and one Force slam. */
export function stepVaderLimit(f){
  const m=f.match,t=f.t;
  if(!f.ult?.vader)f.ult={vader:true,phase:'cast',ct:0,victims:[],origin:{x:f.x,y:f.y},direction:f.facing,slashes:[]};
  const U=f.ult;f.vx=f.vy=f.lx=f.ly=0;
  if(U.phase==='cast'){
    if(t===1)sfx('vaderForce',.65,.8);
    if(t>=52&&t<=62){
      const target=m.fighters.filter(v=>v!==f&&v.alive&&v.team!==f.team&&!['respawn','dying','shield'].includes(v.state)&&!v.isIntangible()&&(v.x-f.x)*f.facing>12&&(v.x-f.x)*f.facing<165&&Math.abs(v.y-f.y)<85).sort((a,b)=>Math.abs(a.x-f.x)-Math.abs(b.x-f.x))[0];
      if(target){
        U.phase='cutscene';U.victims=[target];U.targetStart={x:target.x,y:target.y};U.floor=floorBelow(f,{x:f.x+f.facing*44,y:target.y});
        U.slamY=U.floor?U.floor.y:Math.min(240,target.y+75);U.ct=0;
        target.stopChargeSound();target.grounded=false;target.platform=null;target.vx=target.vy=target.lx=target.ly=0;target.setState('hitstun');target.hitstun=999;
        m.cutscene=f;m.frozen=9999;f.invincible=2;strike(f,target,6,'psychic');
      }
    }
    if(t>=92&&U.phase==='cast')endVaderLimit(f);
    return;
  }
  if(U.phase==='recover'){U.recovery++;if(U.recovery>=20)endVaderLimit(f);return;}
  const v=U.victims[0];if(!f.alive||!v?.alive||v.state==='dying'){endVaderLimit(f);return;}
  const c=++U.ct;f.invincible=Math.max(f.invincible,2);f.x=U.origin.x;f.y=U.origin.y;f.facing=U.direction;
  const ease=k=>1-(1-k)*(1-k),gripY=U.origin.y-14,gripX=U.origin.x+U.direction*44;
  if(c<30){const k=ease(c/30);v.x=U.targetStart.x;v.y=U.targetStart.y-82*k;}
  else if(c<54){const k=ease((c-30)/24);v.x=U.targetStart.x+(gripX-U.targetStart.x)*k;v.y=U.targetStart.y-82+(gripY-U.targetStart.y+82)*k;}
  else if(c<126){
    const at=c-54,phase=at%24;v.x=gripX;v.y=gripY-3*Math.sin(phase*Math.PI/24);
    if(phase===12){strike(f,v,8,'sword');U.slashes.push({x:v.x,y:v.y-v.body.h*.5,age:0,tilt:Math.floor(at/24)%2?1:-1});}
  }else if(c<146){const k=ease((c-126)/20);v.x=gripX;v.y=gripY-45*k;}
  else if(c<158){const k=((c-146)/12)**2;v.x=gripX;v.y=gripY-45+(U.slamY-gripY+45)*k;}
  else{
    v.x=gripX;v.y=U.slamY;strike(f,v,30,'psychic',true);U.released=true;U.phase='recover';U.recovery=0;
    U.impact={x:v.x,y:v.y,at:f.age};m.cutscene=null;m.frozen=0;
    return;
  }
  if(v.alive&&v.state!=='dying'){v.vx=v.vy=v.lx=v.ly=0;v.hitstop=0;v.hitstun=999;v.grounded=false;v.platform=null;}
  for(const sl of U.slashes)sl.age++;U.slashes=U.slashes.filter(sl=>sl.age<10);
}

/** Draw restrained saber light and chest-height Force motes behind Vader's single body sprite. */
export function drawVaderAura(f,g){
  if(!isDarthVader(f)||f.match.countdown>0)return;
  const tip=vaderAnchor(f),hand=vaderAnchor(f,'hand');
  if(tip&&hand&&!f.swordOut){g.lineStyle(2,0xff2e49,.13);g.lineBetween(hand.x,hand.y,tip.x,tip.y);}
  if(f.state==='swingcharge'||f.state==='counter')for(let i=0;i<3;i++){const a=f.anim*.06+i*2.1;g.fillStyle(0xff405b,.5);g.fillRect(Math.round(f.x+Math.cos(a)*19),Math.round(f.y-25+Math.sin(a)*12),1,1);}
}

/** Render the Force catch, victim suspension, saber impact streaks and final ground pulse. */
export function drawVaderLimit(f,g){
  const U=f.ult;if(!U?.vader)return;
  const v=U.victims[0],x=f.x+f.facing*17,y=f.y-35;
  if(U.phase==='cast'){
    const k=Math.min(1,f.t/30);g.lineStyle(1,0xff425e,.3*k);
    for(let i=0;i<3;i++)g.strokeEllipse(x+f.facing*(30+i*35),y,12+8*i,20+10*i);
  }
  if(v&&U.phase==='cutscene'){
    const cy=v.y-v.body.h*.5;g.lineStyle(1,0xc52d4a,.6);g.strokeEllipse(v.x,cy,34,48);
    for(let i=0;i<5;i++){const a=U.ct*.06+i*1.257;g.fillStyle(i%2?0xff405b:0xb58bad,.7);g.fillRect(Math.round(v.x+Math.cos(a)*23),Math.round(cy+Math.sin(a)*25),2,2);}
  }
  for(const sl of U.slashes){const k=1-sl.age/10;g.lineStyle(3,0xff5367,k*.7);g.lineBetween(sl.x-27,sl.y-18*sl.tilt,sl.x+27,sl.y+18*sl.tilt);}
  if(U.impact){const age=Math.max(0,f.age-U.impact.at),r=10+age*3;g.lineStyle(3,0xff425d,Math.max(0,1-age/22));g.strokeEllipse(U.impact.x,U.impact.y,r*2,r*.4);}
}
