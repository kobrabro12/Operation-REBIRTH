import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene.isActive('Title'),null,{timeout:120000});
 const facts=await page.evaluate(async()=>{
  const {settings}=await import('/src/settings.js');const {skinsFor,skinInfo,skinTexture}=await import('/src/fighters/skins.js');const {MASTER_SWORD_PATCHES,MASTER_SWORD_HAND_ANCHORS,MASTER_SWORD_POSES,MASTER_SWORD_HELMET_MASKS}=await import('/src/fighters/masterSwordPatches.js');const {MatchScene}=await import('/src/scenes/MatchScene.js');
  const index=skinsFor('hero-knight').findIndex(s=>s.name==='HYLIAN HERO');MatchScene.prototype.update=function(){};
  for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
  Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,difficulty:0,extraPads:[],p1Pad:null,picks:['hero-knight','mr-wake'],skins:[index,0],stage:'sky-sanctum',items:false,hazards:false});
  window.game.scene.start('Match');await new Promise(r=>setTimeout(r,250));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match');m.countdown=0;m.intros=null;m.bigText.setText('');for(let i=0;i<20;i++)m.tick();m.draw();
  const f=m.fighters[0];const pixels=img=>{const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const c=cv.getContext('2d');c.drawImage(img,0,0);return c.getImageData(0,0,cv.width,cv.height).data;};
  let patchesCorrect=true,bodyAlphaPreserved=true,helmetProtected=true,strips=0;
  for(const [key,patches] of Object.entries(MASTER_SWORD_PATCHES)){
   const original=m.textures.get(key).getSourceImage();const colored=m.textures.get(skinTexture(m,key,'hero-knight',index)).getSourceImage();
   const a=pixels(original),b=pixels(colored),allowed=new Set(patches.map(([x,y])=>y*original.width+x));
   for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]&&!allowed.has(i/4))bodyAlphaPreserved=false;
   for(const [x,y,color]of patches){const i=(y*original.width+x)*4;if(((b[i]<<16)|(b[i+1]<<8)|b[i+2])!==color||b[i+3]!==255)patchesCorrect=false;}
   const helmet=MASTER_SWORD_HELMET_MASKS[key]||[];
   helmetProtected&&=helmet.every(([x,y])=>!allowed.has(y*original.width+x)&&b[(y*original.width+x)*4+3]===a[(y*original.width+x)*4+3]);
   if(patches.length)strips++;
  }
  const normalSwordKey=skinTexture(m,'hk_idle','hero-knight',0);
  const unarmedUntouched=!MASTER_SWORD_PATCHES.hk_idle_u;
  const tossed=m.spawnSword(f,f.def.moves.sideB.sword);const colors=[];const line=tossed.g.lineStyle;
  tossed.g.lineStyle=function(width,color,...args){colors.push(color);return line.call(this,width,color,...args);};tossed.x=f.x+60;tossed.render();
  const thrownMatches=colors.includes(0x4d3d9d)&&colors.includes(0x8276df);tossed.finish?.();tossed.alive=false;tossed.g.clear();f.swordOut=null;
  f.t=25;f.drawBladeLimit(f.fx,f.def.limit,{phase:'grow'});f.drawBladeLimit(f.fx,f.def.limit,{phase:'cutscene',charge:.7,slashes:[]});
  const gripNearHands=Object.values(MASTER_SWORD_HAND_ANCHORS).every(frames=>frames.every(([i,hx,hy,x,y,ux,uy])=>Math.hypot(hx-ux*3-x,hy-uy*3-y)<.04));
  const raised=MASTER_SWORD_POSES.hk_attack1.find(p=>p[0]===1),held=f.bladeGeom(f.def.limit,{phase:'grow'},25);
  const limitAtHands=Math.abs(held.hx-(f.x+f.facing*(raised[1]-66)))<.01&&Math.abs(held.hy-(f.y+raised[2]-86))<.01;
  const callouts=[],play=m.sound.play;m.sound.play=(key)=>{callouts.push(key);return true;};settings.sfxVolume=1;
  for(let i=0;i<3;i++){f.fairyNextCall=(f.fairyClock||0)+1;m.frame+=700;f.stepCompanionFairy();}
  const fairySilent=callouts.length===0&&f.fairySpeech.text==='Listen!';m.sound.play=play;
  f.setState('counter');f.t=12;f.hurtAnim=0;m.draw();
  const {LACY_COUNTER_RIG}=await import('/src/fighters/lacyCounterRig.js');
  const counterPixels=pixels(m.textures.get(f.sheets.counter).getSourceImage());
  const twoHandedGuard=LACY_COUNTER_RIG.every((pose,frame)=>pose.hands.every(([x,y])=>counterPixels[(Math.round(y)*450+frame*150+Math.round(x))*4+3]===255));
  const fixedArmLengths=LACY_COUNTER_RIG.every(p=>p.joints.every(([s,e,h])=>Math.abs(Math.hypot(s[0]-e[0],s[1]-e[1])-9)<.001&&Math.abs(Math.hypot(e[0]-h[0],e[1]-h[1])-9)<.001));
  const noTrailingArm=LACY_COUNTER_RIG.every((_,frame)=>counterPixels[(63*450+frame*150+47)*4+3]===0);

  const counterPose=f.animFrame('counter');const counterUsesOwnStrip=counterPose.sheet===f.sheets.counter&&counterPose.frame===1&&f.counterReady();
  return{fixedArmLengths,noTrailingArm,twoHandedGuard,helmetProtected,fairySilent,counterUsesOwnStrip,gripNearHands,limitAtHands,strips,patchesCorrect,bodyAlphaPreserved,normalUntouched:normalSwordKey==='hk_idle'&&!skinInfo('hero-knight',0).masterSword,unarmedUntouched,thrownMatches,fairyStillPresent:!!f.fairyPosition};
 });
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));mkdirSync('recordings/test-output/master-sword',{recursive:true});await page.screenshot({path:'recordings/test-output/master-sword/in-game.png'});
 await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];f.setState('idle');f.hurtAnim=0;m.draw();});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'recordings/test-output/master-sword/idle.png'});
 assert.equal(facts.strips,15);for(const [k,v]of Object.entries(facts))if(k!=='strips')assert.equal(v,true,k);assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(facts));
}finally{await browser.close();await server.close();}
