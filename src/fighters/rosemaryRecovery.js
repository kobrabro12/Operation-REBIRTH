import {sfx} from '../audio/sfx.js';
import {newAttackId} from './attackIds.js';
import {LS_RECOVERY_CLIPS,LS_RECOVERY_GRIPS} from './lsRecoveryFrames.js';

/** Throw, chase and catch the axe, then commit to a fast downward recovery strike. */
export function stepRosemaryRecovery(f,c,u){
  const A=u.aether,t=f.t;
  if(t<u.riseAt){f.vx*=.7;f.vy=0;if(t===A.throwAt)sfx('swing',.65,1.25);return;}
  if(t===u.riseAt){f.vy=u.riseV;f.grounded=false;f.platform=null;f.fastFalling=false;sfx('djump',.7,.8);}
  f.vx=c.x*(t>=A.fallAt?.35:u.drift);
  if(t>=A.catchAt&&t<A.fallAt)f.vy*=.45;
  if(t===A.catchAt){sfx('clang',.6,1.3);f.match.puff(f.x+f.facing*12,f.y-55,f.pal.light,5);}
  if(t>=A.fallAt){
    f.fastFalling=true;f.vy=A.fallSpeed;
    if(t===A.fallAt){f.attackId=newAttackId();sfx('whoosh',.7,.65);}
    if(t%4===0)f.match.puff(f.x,f.y-24,f.pal.light,1);
  }
  if(t>=u.frames){f.fastFalling=false;f.setState('helpless');}
}

/** On a real landing, exchange the dive for one shieldable shockwave and punishable recovery. */
export function landRosemaryRecovery(f){
  const u=f.def.moves.upb,A=u.aether;
  if(!A||f.state!=='upb'||f.t<A.fallAt)return false;
  f.move={frames:A.landFrames,hits:[A.landing],recoveryLanding:true};f.moveName='recoveryLanding';
  f.attackId=newAttackId();f.hitList=new Set();f.fastFalling=false;f.vx=f.vy=f.lx=f.ly=0;f.setState('attack');
  sfx('bighit',.75,.7);f.match.shake(5,6);f.match.puff(f.x,f.y,f.pal.light,10);
  return true;
}

/** Sample authored toss/rise/catch/plunge/landing cels on the same foot pivot for every costume. */
export function rosemaryRecoveryPose(f){
  if(!f.sheets.recovery||!f.def.moves.upb.aether)return null;
  let name,ticks,span;
  const t=f.t,A=f.def.moves.upb.aether;
  if(f.state==='attack'&&f.move?.recoveryLanding){name='land';ticks=t;span=A.landFrames;}
  else if(f.state!=='upb')return null;
  else if(t<A.throwAt){name='wind';ticks=t;span=A.throwAt;}
  else if(t<f.def.moves.upb.riseAt){name='throw';ticks=t-A.throwAt;span=f.def.moves.upb.riseAt-A.throwAt;}
  else if(t<A.catchAt){name='rise';ticks=t-f.def.moves.upb.riseAt;span=A.catchAt-f.def.moves.upb.riseAt;}
  else if(t<A.fallAt){name='catch';ticks=t-A.catchAt;span=A.fallAt-A.catchAt;}
  else{name='fall';ticks=t-A.fallAt;span=6;}
  const [start,count]=LS_RECOVERY_CLIPS[name];
  return {sheet:f.sheets.recovery,frame:start+Math.min(count-1,Math.max(0,Math.floor(ticks*count/span)))};
}

/** Draw the loose axe on a toss-and-catch arc; the body strip owns it again after the catch. */
export function drawRosemaryRecovery(f,g){
  const A=f.def.moves.upb.aether;if(!A||f.state!=='upb')return;
  const t=f.t;
  if(t>=A.throwAt&&t<A.catchAt&&!(f.axeLost>0)){
    const k=(t-A.throwAt)/(A.catchAt-A.throwAt),q=Math.max(0,Math.min(1,k));
    const key=f.sheets.recovery.split('@')[0],look=key==='ls_recovery'?'base':key.replace(/^ls_wrong/,'seen').replace(/^ls_/,'').replace(/_recovery$/,'');
    const pose=rosemaryRecoveryPose(f),grip=LS_RECOVERY_GRIPS[look]?.[pose.frame]||[10,-48];
    const x=f.x+f.facing*(grip[0]+Math.sin(q*Math.PI)*5),y=f.y+grip[1]-Math.sin(q*Math.PI)*54;
    // A bright edge identifies the weapon without a second body silhouette.
    g.lineStyle(3,0x32271f,1);g.lineBetween(x,y-15,x,y+14);
    g.fillStyle(f.def.wrong?0xb8b1a0:0xafd1c6,1);g.fillTriangle(x-2,y-14,x+15,y-12,x+9,y-1);
    g.lineStyle(1,f.pal.light,.7);g.lineBetween(x+15,y-12,x+9,y-1);
  }
  if(t>=A.fallAt){g.lineStyle(2,f.pal.light,.4);g.lineBetween(f.x-f.facing*7,f.y-60,f.x-f.facing*7,f.y-25);}
}
