import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});








 const result=await page.evaluate(async()=>{
  const {settings}=await import('/src/settings.js'),{STAGES,stageLocked}=await import('/src/stage/stages.js'),{MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};const def=STAGES.find(s=>s.id==='endless-castle');if(!def||stageLocked(def))throw Error('Stage missing/locked');
  for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:2,cpuCount:1,extraPads:[],p1Pad:null,picks:['young-link','soul-summoner'],skins:[0,0],stage:def.id,track:'auto',hazards:true,items:false,crt:false});
  const m=await new Promise(resolve=>{const m=window.game.scene.getScene('Match');m.events.once('create',()=>resolve(m));window.game.scene.start('Match');}),stage=m.stage;
  const {musicState}=await import('/src/audio/music.js'),music=musicState();   // (music streams: ask music.js, not Phaser's sound list)
  if(!(music.key==='bgm_endless_castle'&&music.loop&&(music.playing||music.pending)))throw Error('Uploaded castle music not looping');
  if(stage.platforms.length!==4||stage.spawns.length!==4)throw Error('Layout missing');for(const spawn of stage.spawns)if(!stage.platforms.some(p=>p.solid&&spawn.x>=p.x1&&spawn.x<=p.x2&&spawn.y===p.y))throw Error('Unsafe spawn');
  for(let i=0;i<7200;i++)if(stage.step(m).length)throw Error('Stage generated a hazard');
  const f=m.fighters[0],c=f.ctrl;c.down=false;for(const [x,y] of [[-160,0],[180,-68],[-180,-104],[160,-164]]){f.placeAt(x,y-4);f.grounded=false;f.vy=6;f.ly=0;f.lx=0;f.x=x;f.y=y+1;f.platform=null;f.collide(x,y-4,c);if(!f.grounded||f.y!==y)throw Error('Landing failed at '+x+','+y);}
  f.placeAt(324,24);f.state='air';f.grounded=false;f.ledgeCooldown=0;f.possessed=0;f.vy=1;f.tryLedgeGrab({y:0});if(f.ledge?.p===stage.platforms[0])throw Error('Grabbed buried lower ledge');
  m.countdown=0;m.intros=null;m.bigText.setText('');m.fighters[0].placeAt(-168,0);m.fighters[1].placeAt(172,-68);m.draw();return {platforms:stage.platforms.length,hazardChecks:7200,stage:def.name};
 });await page.waitForTimeout(250);await page.screenshot({path:'recordings/test-output/endless-castle.png'});assert.deepEqual(errors,[]);console.log('PASS selectable stage, four safe spawn points, fixed terrace geometry and no hazards even when enabled',result);
}finally{await browser.close();await server.close();}
