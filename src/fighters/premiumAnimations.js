import { PREMIUM_ANIMS } from './premiumAnimsData.js';
import { skinInfo } from './skins.js';
export function premiumAnimationFor(id,name){return PREMIUM_ANIMS[id+':'+name]||null;}
// Display-only idle loops and flourishes; taunts retain their existing duration.
export function premiumPose(f){
 const spec=premiumAnimationFor(f.def.id,skinInfo(f.def.id,f.skin).name);
 if(!spec||f.hurtAnim>0||f.swordOut)return null;
 let kind,local;
 if(f.state==='taunt'){kind='taunt';local=f.t;}
 else if(f.state==='idle'&&f.grounded){
  const phase=f.t>=120?(f.t-120)%360:-1;
  if(phase>=0&&phase<spec.flourish[1]*spec.flourish[2]){kind='flourish';local=phase;}
  else {const n=spec.idle[1],step=spec.idle[2],idleTime=phase<0?f.t:phase-spec.flourish[1]*spec.flourish[2],frame=Math.floor(Math.max(0,idleTime)/step)%n;return {sheet:spec.idleKey,frame,origin:spec.idleOrigin,kind:'idle',progress:frame/n};}
 }
 else return null;
 const [from,n,step]=spec[kind];if(kind==='flourish'&&local>=n*step)return null;
 return {sheet:spec.key,frame:from+Math.min(n-1,Math.floor(local/step)),origin:spec.origin,kind,progress:Math.min(1,local/(n*step))};
}
