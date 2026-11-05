// Integration test: the actual game simulates the new Limit; damage is never scripted.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene.isActive('Title'),null,{timeout:120000});
 const simulation=page.evaluate(async()=>{
  const {settings}=await import('/src/settings.js');const {MatchScene}=await import('/src/scenes/MatchScene.js');const {SpiritualSkeleton}=await import('/src/fighters/spiritualSkeleton.js');const {GladiatorSkeleton}=await import('/src/fighters/gladiatorSkeleton.js');const {skinsFor,skinUnlocked}=await import('/src/fighters/skins.js');const {MASTER_SWORD_PATCHES}=await import('/src/fighters/masterSwordPatches.js');
  MatchScene.prototype.update=function(){};
  for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
  Object.assign(settings,{mode:'stock',stocks:5,cpuCount:2,difficulty:0,cpuLevels:[0,0,0],extraPads:[],p1Pad:null,picks:['soul-summoner','mr-wake','hero-knight'],skins:[0,0,0],stage:'sky-sanctum',hazards:false,items:false,crt:false});
  window.game.scene.start('Match');await new Promise(r=>setTimeout(r,250));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));
  const m=window.game.scene.getScene('Match');m.countdown=0;m.bigText.setText('');m.intros=null;
  for(let i=0;i<40;i++)m.tick();
  const caster=m.fighters[0];caster.placeAt(-145,-1);m.fighters[1].placeAt(95,-1);m.fighters[2].placeAt(175,-1);
  m.fighters.forEach(f=>{f.invincible=0;f.percent=0;f.setState('idle');});
  const seen=new Set(),giants=new Set();let trackedProjectiles=m.projectiles;
  Object.defineProperty(m,'projectiles',{configurable:true,get:()=>trackedProjectiles,set(next){
    trackedProjectiles=next;
    for(const p of next)if(p instanceof SpiritualSkeleton){seen.add(p.id);if(p instanceof GladiatorSkeleton)giants.add(p.id);}
    next.push=function(...items){for(const p of items)if(p instanceof SpiritualSkeleton){seen.add(p.id);if(p instanceof GladiatorSkeleton)giants.add(p.id);}return Array.prototype.push.apply(this,items);};
  }});m.projectiles=trackedProjectiles;
  let spiritHits=0,beamHits=0;const hit=m.applyHit;
  m.applyHit=function(t,hb,x){if(hb.owner===caster){if(hb.projectile instanceof SpiritualSkeleton)spiritHits++;else if(String(hb.id).startsWith('beam'))beamHits++;}return hit.call(this,t,hb,x);};
  caster.limit=100;caster.grounded=false;
  const rejected=caster.startLimit()===false && caster.limit===100 && caster.state!=='limit';
  caster.buffer.limit=3;caster.tryCommon(caster.ctrl,false);
  const bufferedRejected=caster.buffer.limit===0 && caster.limit===100 && caster.state!=='limit';
  caster.grounded=true;caster.platform=m.stage.platforms[0];caster.y=0;caster.startLimit();
  for(let i=0;i<750;i++){m.tick();if(i%4===0)m.draw();if(i===80){window.earthPreviewReady=true;await new Promise(r=>window.resumeEarthPreview=r);}if(i===280){window.gladiatorPreviewReady=true;await new Promise(r=>window.resumeGladiatorPreview=r);}}
  const facts={airRejected:rejected,airBufferRejected:bufferedRejected,spawned:seen.size,giants:giants.size,remaining:m.projectiles.filter(p=>p instanceof SpiritualSkeleton).length,spiritHits,beamHits,name:caster.def.limit.name,type:caster.def.limit.type,damageDealt:caster.stats.damageDealt,casterState:caster.state};
  // Shield collision must use the normal block path and consume the spirit.
  const blocker=m.fighters[1];blocker.setState('shield');blocker.shieldHp=60;blocker.invincible=0;blocker.star=0;
  const p=new SpiritualSkeleton(m,caster,0);p.age=p.emergeTicks+25;p.phase='approach';p.phaseT=3;p.facing=1;p.x=blocker.x;p.y=blocker.y-25;m.projectiles.push(p);
  m.resolveHits(null);facts.shieldBlocked=blocker.shieldHp<60&&p.phase!=='approach'&&p.hitbox()===null;
  const climbing = new SpiritualSkeleton(m,caster,1);
  facts.noDamageWhileClimbing=climbing.hitbox()===null;
  for(let i=0;i<22;i++)climbing.step();climbing.render();
  facts.climbFrame=climbing.sprite.frame.name;
  facts.nativePixels=climbing.sprite.scaleX===1 && climbing.sprite.frame.width===48 && climbing.sprite.frame.height===56;
  facts.onSurface=climbing.ground===caster.spiritGround && climbing.x>=climbing.ground.x1 && climbing.x<=climbing.ground.x2;
  climbing.kill();climbing.finish();
  // The gladiator has no contact/windup damage, and its one real soul-sword hit deals exactly 20.
  const big=new GladiatorSkeleton(m,caster,14);
  facts.noGiantWalkDamage=big.hitbox()===null;
  blocker.alive=true;blocker.setState('idle');blocker.percent=0;blocker.invincible=0;blocker.star=0;blocker.x=100;blocker.y=big.ground.y;
  big.x=50;big.facing=1;big.phase='windup';big.phaseT=20;facts.noGiantWindupDamage=big.hitbox()===null;
  big.phase='swing';big.phaseT=10;m.projectiles=m.projectiles.filter(p=>p.alive);m.projectiles.push(big);
  const before=blocker.percent;m.resolveHits(null);const once=blocker.percent;m.resolveHits(null);
  facts.giantDamage=once-before;facts.strongerKnockback=Math.hypot(blocker.lx,blocker.ly)>7;facts.singleGiantHit=blocker.percent===once;
  big.kill();facts.kneelsHarmless=big.phase==='kneel'&&big.hitbox()===null;
  for(let i=0;i<12;i++){big.step();big.render();}
  facts.giantKneelTexture=big.sprite.texture.key==='gladiator_kneel';
  m.draw();window.kneelPreviewReady=true;await new Promise(r=>window.resumeKneelPreview=r);
  for(let i=0;i<15;i++){big.step();big.render();}
  facts.giantSpectralFade=big.phase==='fade'&&big.sprite.alpha<.96;
  facts.noDebris=!big.debris;
  const fadeBounds=[big.sprite.displayWidth,big.sprite.displayHeight,big.sprite.x,big.sprite.y,big.sprite.frame.name];
  facts.stableFadeSize=true;
  for(let i=0;i<30;i++){big.step();big.render();facts.stableFadeSize&&=JSON.stringify([big.sprite.displayWidth,big.sprite.displayHeight,big.sprite.x,big.sprite.y,big.sprite.frame.name])===JSON.stringify(fadeBounds);}
  for(let i=0;i<50;i++)big.step();facts.giantPoofs=!big.alive&&!big.sprite.active;
  // Regular spirits now use their original contact/poof behavior without a swing texture.
  const contact=new SpiritualSkeleton(m,caster,0);contact.age=contact.emergeTicks+15;contact.render();
  facts.normalNoSwing=contact.sprite.texture.key==='spirit_flight' && contact.hitbox()?.persist===false;
  contact.kill();facts.normalDeathHarmless=contact.hitbox()===null;
  for(let i=0;i<45;i++){contact.step();contact.render();}
  facts.normalKneelFade=contact.phase==='fade'&&contact.sprite.texture.key==='spirit_kneel'&&contact.sprite.alpha<.94;
  for(let i=0;i<50;i++)contact.step();facts.normalPoofs=!contact.alive;
  // Check all eight distinct attack poses and per-frame planted soles in the actual renderer.
  const animated=new GladiatorSkeleton(m,caster,14);animated.change('windup');const attackFrames=new Set();
  let planted=true,stableAnchor=true;
  for(let i=0;i<79;i++){animated.step();animated.render();attackFrames.add(animated.sprite.texture.key+':'+animated.sprite.frame.name);planted&&=animated.sprite.y===Math.round(animated.ground.y);stableAnchor&&=animated.sprite.originX===.5&&animated.sprite.frame.width===64&&animated.sprite.frame.height===64&&animated.sprite.scaleX===3;}
  facts.attackFrames=attackFrames.size;facts.plantedFeet=planted;facts.stableWeaponAnchor=stableAnchor;animated.finish();
  // Losing targets must be safe and must not leave permanent spirits behind.
  m.fighters.slice(1).forEach(f=>{f.alive=false;});
  const orphan=new SpiritualSkeleton(m,caster,0);for(let i=0;i<=caster.def.limit.spiritLife+90;i++)orphan.step();facts.noTargetExpires=!orphan.alive;
  // Free recolor: same sprite alpha/geometry, different colors, with a real following fairy.
  const index=skinsFor('hero-knight').findIndex(s=>s.name==='HYLIAN HERO');
  facts.heroSkinFree=index>=0&&skinUnlocked('hero-knight',index);
  Object.assign(settings,{picks:['hero-knight','mr-wake'],skins:[index,0],cpuCount:1});
  window.game.scene.stop('Match');window.game.scene.start('Match');await new Promise(r=>setTimeout(r,250));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));
  const next=window.game.scene.getScene('Match');next.countdown=0;next.intros=null;next.bigText.setText('');
  for(let i=0;i<20;i++)next.tick();next.draw();
  const lacy=next.fighters[0],beforeFairy=lacy.fairyPosition?.x;
  lacy.x+=50;for(let i=0;i<25;i++)next.draw();
  facts.fairyFollows=Number.isFinite(beforeFairy)&&lacy.fairyPosition.x>beforeFairy+25;
  facts.fairySkinOnly=!next.fighters[1].fairyPosition;
  const base=next.textures.get('hk_idle').getSourceImage(),colored=next.textures.get(lacy.sheets.idle).getSourceImage();
  const pixels=img=>{const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,cv.width,cv.height).data;};
  const weaponPixels=new Set((MASTER_SWORD_PATCHES.hk_idle||[]).map(([x,y])=>y*base.width+x));
  const a=pixels(base),b=pixels(colored);let sameAlpha=a.length===b.length,different=0;
  for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3]&&!weaponPixels.has(i/4))sameAlpha=false;if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])different++;}
  facts.recolorPreservesPixels=sameAlpha&&different>0;
  window.fairyPreviewReady=true;await new Promise(r=>window.resumeFairyPreview=r);
  return facts;
 });
 await page.waitForFunction(()=>window.earthPreviewReady);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 mkdirSync('recordings/test-output/earth-skeletons',{recursive:true});
 await page.screenshot({path:'recordings/test-output/earth-skeletons/in-game.png'});
 await page.evaluate(()=>window.resumeEarthPreview());
 await page.waitForFunction(()=>window.gladiatorPreviewReady);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:'recordings/test-output/earth-skeletons/gladiator-in-game.png'});
 await page.evaluate(()=>window.resumeGladiatorPreview());
 await page.waitForFunction(()=>window.kneelPreviewReady);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:'recordings/test-output/earth-skeletons/kneeling-gladiator.png'});
 await page.evaluate(()=>window.resumeKneelPreview());
 await page.waitForFunction(()=>window.fairyPreviewReady);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:'recordings/test-output/earth-skeletons/hylian-lacy.png'});
 await page.evaluate(()=>window.resumeFairyPreview());
 const result=await simulation;
 assert.ok(result.airRejected);assert.ok(result.airBufferRejected);assert.ok(result.noDamageWhileClimbing);assert.equal(result.climbFrame,5);assert.ok(result.nativePixels);assert.ok(result.onSurface);assert.equal(result.spawned,15);assert.equal(result.giants,1);assert.ok(result.noGiantWalkDamage);assert.ok(result.noGiantWindupDamage);assert.equal(result.giantDamage,20);assert.ok(result.singleGiantHit);assert.ok(result.kneelsHarmless);assert.ok(result.giantKneelTexture);assert.ok(result.giantSpectralFade);assert.ok(result.noDebris);assert.ok(result.stableFadeSize);assert.ok(result.normalDeathHarmless);assert.ok(result.normalKneelFade);assert.ok(result.stableWeaponAnchor);assert.ok(result.giantPoofs);assert.ok(result.normalNoSwing);assert.equal(result.attackFrames,8);assert.ok(result.plantedFeet);assert.ok(result.strongerKnockback);assert.ok(result.heroSkinFree);assert.ok(result.fairyFollows);assert.ok(result.fairySkinOnly);assert.ok(result.recolorPreservesPixels);assert.ok(result.normalPoofs);assert.equal(result.remaining,0);assert.ok(result.spiritHits>0);assert.equal(result.beamHits,0);assert.equal(result.name,'MARCH OF THE FALLEN');assert.equal(result.type,'spirits');assert.ok(result.shieldBlocked);assert.ok(result.noTargetExpires);assert.notEqual(result.casterState,'limit');assert.deepEqual(errors,[]);
 console.log('PASS',JSON.stringify(result));
} finally {await browser.close();await server.close();}
