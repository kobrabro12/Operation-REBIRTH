import {HK_META_MOVES,HK_META_ANCHORS} from './hkMetaMoves.js';
import {skinAirFrame,skinRunFrame,skinMoveFrame} from './skinAnimation.js';

/** Identify Lacy's drawn Meta Knight costume without changing her fighter definition. */
export function isMetaKnight(f){return f.def.id==='hero-knight'&&f.sheets.idle==='hk_meta_idle';}

/** Sample one authored clip using simulation ticks, with no frame blending or sprite rotation. */
export function metaKnightClip(name,t=0){
  const clip=HK_META_MOVES[name];
  return clip?skinMoveFrame(clip,t):null;
}

/** Pick Meta Knight's custom body pose, including swordless frames after Blade Toss releases. */
export function metaKnightPose(f){
  if(!isMetaKnight(f))return null;
  const S=f.sheets,s=f.state,t=Math.max(0,f.t),count=key=>Math.max(1,f.scene.textures.get(key).frameTotal-1);
  const strip=(name,tick,duration)=>({sheet:S[name],frame:Math.min(count(S[name])-1,Math.floor(Math.max(0,tick)*count(S[name])/duration))});
  const move=(name,tick=t)=>{const frame=metaKnightClip(name,tick);return frame===null?null:{sheet:S.moves,frame};};
  const unarmed=!!f.swordOut&&(s!=='swordthrow'||t>=f.def.moves.sideB.sword.throwAt);
  if(f.hurtAnim>0&&!['attack','upb','dying','limit','ledge','ledgeclimb','ledgeroll','ledgeattack','grabbed','seized'].includes(s))return strip(unarmed?'hit_u':'hit',16-f.hurtAnim,16);
  if(s==='attack')return move(f.moveName==='throw'?'throw_'+f.throwDir:f.moveName)||move('jab');
  if(s==='upb'){
    if(f.spinGround&&f.spinStart<0)return move('spincharge');
    return move(f.spinGround?'groundspin':'upb',f.spinGround?t-f.spinStart:t);
  }
  if(s==='swingcharge')return move('swingcharge');
  if(s==='swordthrow')return move('swordthrow');
  if(s==='holding')return (f.pummelCd>0?move('pummel',12-f.pummelCd):move('holding'))||move('holding');
  if(s==='counter'||s==='counterstrike')return move(s);
  if(s==='limit'){
    const U=f.ult,L=f.def.limit;
    if(!U||U.phase==='grow')return move('limit_charge');
    if(U.phase==='slash')return move('limit_slash',t-L.slashFrom);
    if(U.phase==='whiff')return move('limit_recover',t-L.slashTo);
    if(U.appearAt!==undefined&&U.ct>=U.appearAt){
      if(U.ct<U.finalAt)return U.charge>0?move('limit_charge',Math.min(30,U.charge*30)):move('swingcharge',0);
      return move('limit_final',U.ct-U.finalAt);
    }
    return move('limit_cut',(U.ct||0)%L.cutEvery);
  }
  if(s==='run')return {...skinRunFrame(f),sheet:unarmed?S.run_u:S.run};
  if(['air','helpless','airdodge'].includes(s))return {...skinAirFrame(f,unarmed?{jump:S.jump_u,fall:S.fall_u}:S),alpha:s==='airdodge'?.55:1};
  if(s==='shield')return move('shield',Math.min(24,t));
  if(['hitstun','dizzy','grabbed','seized'].includes(s))return unarmed?strip('hit_u',t,16):(move(s)||strip('hit',t,16));
  if(s==='dying')return strip('death',t,66);
  if(s==='ledge')return move('ledge');
  if(s==='ledgeclimb')return move('ledgeclimb')||move('land');
  if(s==='ledgeattack')return move('ledgeattack')||move('ftilt');
  if(['roll','ledgeroll','spotdodge'].includes(s))return {...(move('dodge')||strip('guard',t,24)),alpha:.55};
  if(['land','jumpsquat','crouch','taunt'].includes(s))return move(s)||move('land');
  const key=unarmed?S.idle_u:S.idle;
  return {sheet:key,frame:Math.floor(t/4)%count(key)};
}

/** Return the drawn hand or blade tip in world space so glints follow the current cel. */
export function metaKnightAnchor(f,kind='tip'){
  if(!isMetaKnight(f))return null;
  const pose=metaKnightPose(f),track=pose?.sheet===f.sheets.moves?HK_META_ANCHORS[pose.frame]:null;
  const anchor=track?.[kind];
  return anchor?{x:Math.round(f.x+f.facing*anchor[0]),y:Math.round(f.y+anchor[1])}:null;
}

/** Attach the giant visual blade to the held cel while leaving shared combat geometry unchanged. */
export function metaKnightLimitGeom(f,geometry){
  if(!isMetaKnight(f))return geometry;
  const pose=metaKnightPose(f),track=pose?.sheet===f.sheets.moves?HK_META_ANCHORS[pose.frame]:null;
  if(!track?.hand)return geometry;
  return {...geometry,hx:Math.round(f.x+f.facing*track.hand[0]),hy:Math.round(f.y+track.hand[1]),ang:track.angle??geometry.ang};
}

export const META_KNIGHT_BLADE={outline:0x211a32,deep:0x86602b,mid:0xd8a54c,light:0xffd976,core:0xfff7c1};

/** Draw the gold barbed projectile once, replacing the ordinary steel Blade Toss drawing. */
export function drawMetaKnightSword(projectile,g,x,y,length,c,s){
  if(!isMetaKnight(projectile.owner))return false;
  const p=(along,across)=>({x:Math.round(x+c*along-s*across),y:Math.round(y+s*along+c*across)});
  const polygon=(points,color)=>{g.fillStyle(color,1);g.fillPoints(points.map(([a,b])=>p(a,b)),true);};
  polygon([[-10,-2],[-4,-2],[-5,-7],[-1,-5],[1,-3],[length-5,-3],[length,0],[length-5,3],[1,3],[-1,5],[-5,7],[-4,2],[-10,2]],0x13162d);
  polygon([[-3,-4],[0,-2],[length-5,-2],[length-1,0],[length-5,2],[0,2],[-3,4]],0xe5ad45);
  polygon([[0,-1],[length-5,-1],[length-2,0],[0,0]],0xfff1b1);
  polygon([[-10,-1],[-4,-1],[-4,1],[-10,1]],0x7360a6);
  return true;
}
