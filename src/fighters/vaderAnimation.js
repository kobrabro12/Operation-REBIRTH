import {HK_VADER_MOVES,HK_VADER_ANCHORS,HK_VADER_BARE_MOVES,HK_VADER_SPECIALS,HK_VADER_SPECIAL_ANCHORS} from './hkVaderMoves.js';
import {skinAirFrame,skinRunFrame,skinMoveFrame} from './skinAnimation.js';

/** Identify Lacy's drawn Darth Vader costume without changing her fighter definition. */
export function isDarthVader(f){return f.def.id==='hero-knight'&&f.sheets.idle==='hk_vader_idle';}

/** Sample one authored clip using simulation ticks, with no frame blending or sprite rotation. */
export function vaderClip(name,t=0){
  const clip=HK_VADER_MOVES[name];
  return clip?skinMoveFrame(clip,t):null;
}

/** Pick Darth Vader's custom body pose, including swordless frames after Blade Toss releases. */
export function vaderPose(f){
  if(!isDarthVader(f))return null;
  const S=f.sheets,s=f.state,t=Math.max(0,f.t),count=key=>Math.max(1,f.scene.textures.get(key).frameTotal-1);
  const strip=(name,tick,duration)=>({sheet:S[name],frame:Math.min(count(S[name])-1,Math.floor(Math.max(0,tick)*count(S[name])/duration))});
  const move=(name,tick=t)=>{const frame=vaderClip(name,tick);return frame===null?null:{sheet:S.moves,frame};};
  const unarmed=!!f.swordOut&&(s!=='swordthrow'||t>=f.def.moves.sideB.sword.throwAt);
  if(f.hurtAnim>0&&!['attack','upb','dying','limit','ledge','ledgeclimb','ledgeroll','ledgeattack','grabbed','seized'].includes(s))return strip(unarmed?'hit_u':'hit',16-f.hurtAnim,16);
  if(unarmed&&S.bare_moves){
    const key=({shield:'counter',roll:'dodge',ledgeroll:'dodge',spotdodge:'dodge',ledgeclimb:'climb',ledgeattack:'ledgeattack',land:'land',jumpsquat:'jumpsquat',crouch:'crouch',taunt:'taunt',dying:'death'})[s];
    const clip=HK_VADER_BARE_MOVES[key];
    if(clip)return {sheet:S.bare_moves,frame:skinMoveFrame(clip,s==='shield'?Math.min(24,t):t),alpha:['roll','ledgeroll','spotdodge'].includes(s)?.55:1};
  }
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
    const U=f.ult,ct=U?.ct||0;
    let key='force_hold',tick=t;
    if(U?.phase==='cutscene'){
      if(ct<30){key='force_hold';tick=ct;}
      else if(ct<54){key='force_pull';tick=ct-30;}
      else if(ct<126){key='vader_slash';tick=((ct-54)%24)*30/24;}
      else {key='force_slam';tick=Math.min(29,ct-126);}
    }
    if(U?.phase==='recover'){key='force_slam';tick=29;}
    const clip=HK_VADER_SPECIALS[key];
    return clip&&S.specials?{sheet:S.specials,frame:skinMoveFrame(clip,tick)}:move('swingcharge',0);
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
export function vaderAnchor(f,kind='tip'){
  if(!isDarthVader(f))return null;
  const pose=vaderPose(f),track=pose?.sheet===f.sheets.moves?HK_VADER_ANCHORS[pose.frame]:pose?.sheet===f.sheets.specials?HK_VADER_SPECIAL_ANCHORS[pose.frame]:null;
  const anchor=track?.[kind];
  return anchor?{x:Math.round(f.x+f.facing*anchor[0]),y:Math.round(f.y+anchor[1])}:null;
}

/** Draw the red lightsaber projectile once, replacing the ordinary steel Blade Toss drawing. */
export function drawVaderSword(projectile,g,x,y,length,c,s){
  if(!isDarthVader(projectile.owner))return false;
  const p=(along,across)=>({x:Math.round(x+c*along-s*across),y:Math.round(y+s*along+c*across)});
  const polygon=(points,color)=>{g.fillStyle(color,1);g.fillPoints(points.map(([a,b])=>p(a,b)),true);};
  polygon([[-10,-2],[-1,-2],[0,-4],[length-1,-3],[length+2,0],[length-1,3],[0,4],[-1,2],[-10,2]],0x851b31);
  polygon([[0,-2],[length,-2],[length+1,0],[length,2],[0,2]],0xf74b5d);
  polygon([[0,-1],[length,-1],[length,1],[0,1]],0xffefeb);
  polygon([[-10,-2],[0,-2],[0,2],[-10,2]],0x20232d);
  polygon([[-9,-1],[-2,-1],[-2,0],[-9,0]],0xa7a9b3);
  return true;
}

/** Show saber ignition in the arrival cinematic at its own unscaled foot pivot. */
export function vaderIntroPose(f,progress){
  if(!isDarthVader(f)||!f.sheets.specials)return null;
  const clip=HK_VADER_SPECIALS.intro;
  return clip?{sheet:f.sheets.specials,frame:skinMoveFrame(clip,Math.max(0,Math.min(47,progress*48)))}:null;
}
