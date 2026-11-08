/** Advance cosmetic time once per simulation frame, regardless of redraw frequency. */
export function stepSkinAnimation(f,frameCount) {
  const now=Number.isFinite(frameCount)?frameCount:(f.match?.frame??f.age??0);
  const clock=f.skinClock||(f.skinClock={frame:now,delta:0,gait:0});
  const delta=Math.max(0,now-clock.frame);
  clock.frame=now;clock.delta=delta;
  f.anim+=delta;
  if(delta>0&&f.hurtAnim>0)f.hurtAnim=Math.max(0,f.hurtAnim-delta);
  return clock;
}

/** Use every run cel while retaining the costume's original stride duration. */
export function skinRunFrame(f) {
  const key=f.sheets.run,texture=f.scene.textures.get(key),actual=Math.max(1,texture.frameTotal-1);
  const [from,nominal]=f.def.runCycle||(f.def.ownAnims?[0,f.def.frameCounts?.run||8]:[3,5]);
  const count=from===0?actual:Math.min(nominal,actual-from);
  const clock=f.skinClock||(f.skinClock={frame:f.match?.frame??0,delta:0,gait:0});
  const cadence=f.def.ownAnims ? .1+Math.abs(f.vx)*.06 : .11+Math.abs(f.vx)*.035;
  // A repeated draw of the same tick cannot move the feet a second time.
  if(clock.gaitFrame!==clock.frame){clock.gait=(clock.gait+clock.delta*cadence/nominal)%1;clock.gaitFrame=clock.frame;}
  return {sheet:key,frame:from+Math.floor((clock.gait+1e-9)*count)%count};
}

/** Progress once from takeoff to the apex, then once through the descent. */
export function skinAirFrame(f,strips=f.sheets) {
  const rising=f.vy<0,key=rising?strips.jump:strips.fall;
  const count=Math.max(1,f.scene.textures.get(key).frameTotal-1);
  const jump=Math.abs(f.def.jumpV||9),progress=rising?1-Math.min(1,Math.abs(f.vy)/jump):Math.min(1,Math.max(0,f.vy)/6.5);
  return {sheet:key,frame:Math.min(count-1,Math.floor(progress*count))};
}

/** Finish shortened authored clips instead of cutting off their recovery poses. */
export function skinMoveFrame(clip,t,duration,lastHit=0) {
  const [from,n,step,loop]=clip,local=Math.max(0,t);
  if(loop)return from+Math.floor(local/step)%n;
  const authored=n*step;
  const start=Math.min(Math.max(0,(duration||authored)-2),Math.max(0,lastHit+1));
  const tick=duration>0&&duration<authored&&local>start?Math.min(authored-1,start+(local-start)*(authored-1-start)/Math.max(1,duration-1-start)):local;
  return from+Math.min(n-1,Math.floor(tick/step));
}

/** Mirror the source foot pivot along with the pixels when a fighter turns. */
export function skinOrigin(origin,flip) {
  return [flip?1-origin[0]:origin[0],origin[1]];
}

/** Keep enlarged costume taunts on the same foot anchor as the normal body and moves. */
export function skinSheetOrigin(f,sheet) {
  const d=f.def;
  if(d.movesOrigin&&sheet===f.sheets.moves)return d.movesOrigin;
  if(d.costumeTauntOrigin&&Object.values(d.costumeSheets||{}).some(s=>s.taunt===sheet))return d.costumeTauntOrigin;
  return [d.originX??.5,d.originY??f.sprite.originY];
}

/** Identify a pose, including effects that can change while a simulation tick is paused. */
function drawStamp(f) {
  return [f.state,f.t,f.age,f.x,f.y,f.vx,f.vy,f.facing,f.skin,f.anim,f.moveName,f.throwDir,f.spinGround,f.spinStart,f.counterFlash,f.ult?.phase,f.ult?.ct,f.charge,f.swingCharge,f.spinCharge,f.sightings,f.axeLost,f.soulTint,f.mode,f.signalMode,f.hurtAnim,f.flash,f.silhouette,f.reform,f.wiggleFx,f.percent,f.star,f.swift,f.slow,f.curse,f.shaken,f.possessed,f.fullAero,f.spawnFlash,f.invincible,!!f.swordOut,f.pummelCd,f.grounded,f.alive,f.theme,f.match?.countdown].join('|');
}

/** Keep a completed same-tick drawing instead of spawning duplicate trails and particles. */
export function skinRenderCached(f,frameCount) {
  const c=f.skinClock,now=Number.isFinite(frameCount)?frameCount:(f.match?.frame??f.age??0);
  return !!c&&c.drawFrame===now&&c.drawDef===f.def&&c.drawSheets===f.sheets&&c.drawStamp===drawStamp(f);
}

/** Save the pose after cosmetic timers were consumed; debug changes still trigger a redraw. */
export function rememberSkinRender(f,frameCount) {
  const c=f.skinClock;if(!c)return;
  c.drawFrame=Number.isFinite(frameCount)?frameCount:(f.match?.frame??f.age??0);
  c.drawDef=f.def;c.drawSheets=f.sheets;c.drawStamp=drawStamp(f);
}
