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
  const {settings}=await import('/src/settings.js');const {MatchScene}=await import('/src/scenes/MatchScene.js');const {GladiatorSkeleton}=await import('/src/fighters/gladiatorSkeleton.js');
  MatchScene.prototype.update=function(){};for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
  Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,difficulty:0,extraPads:[],p1Pad:null,picks:['soul-summoner','hero-knight'],skins:[0,0],stage:'gravemoon-bridge',items:false,hazards:true,crt:false});
  window.game.scene.start('Match');await new Promise(r=>setTimeout(r,300));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match');m.countdown=0;m.intros=null;m.bigText.setText('');
  const owner=m.fighters[0];owner.placeAt(-180,0);m.fighters[1].placeAt(200,0);owner.spiritGround=m.stage.platforms[0];
  const g=new GladiatorSkeleton(m,owner,14);g.x=0;g.phase='walk';g.phaseT=18;g.age=80;m.projectiles.push(g);m.stage.step(m);m.draw();window.moonGiant=g;
  return {nativeGiant:g.sprite.frame.width===64&&g.sprite.frame.height===64&&g.sprite.scaleX===3,nativeTiles:m.textures.get('moon_tiles').get(0).width===64,fourPlatforms:m.stage.platforms.length===4,eyeSparks:g.eyeG.commandBuffer.length>0};
 });
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));mkdirSync('recordings/test-output/gravemoon',{recursive:true});await page.screenshot({path:'recordings/test-output/gravemoon/in-game.png'});
 const hazards=await page.evaluate(()=>{
  const m=window.game.scene.getScene('Match'),stage=m.stage;
  // The same authored floor and lantern hitbox still drive gameplay after the visual replacement.
  for(let i=0;i<10;i++){const b=stage.lampBox();stage.strikeTargets(m,[{...b,id:'qa'+i,facing:1,owner:m.fighters[0]}]);}
  const lanternFalls=stage.lamp.state==='fall';let fireHitbox=false;
  for(let i=0;i<90;i++){const out=[];stage.stepLantern(m,out);fireHitbox ||= out.some(h=>h.dmg===3&&h.hazard);}
  const h={t:100,id:'qa'};stage.start_gaze(m,h);h.t=100;const beams=[];stage.step_gaze(m,h,beams);
  return {lanternFalls,fireHitbox,gazeStillHits:beams.some(h=>h.dmg===10&&h.hazard)};
 });
 for(const [key,value]of Object.entries({...facts,...hazards}))assert.equal(value,true,key);assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({...facts,...hazards}));
}finally{await browser.close();await server.close();}
