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
 const result=await page.evaluate(async()=>{
 const {settings}=await import('/src/settings.js');
 const {STAGES,STAGE_SLOTS}=await import('/src/stage/stages.js');
 if(STAGES.length>=STAGE_SLOTS)throw Error('stage inaccessible');
 for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
 Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,difficulty:0,extraPads:[],p1Pad:null,picks:['hero-knight','soul-summoner'],skins:[0,0],stage:'the-construct',items:false,hazards:true,crt:false});
 const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
 window.game.scene.start('Match');await new Promise(r=>setTimeout(r,300));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match'),s=m.stage,f=m.fighters[0],p=s.platforms[1];
 f.placeAt((p.x1+p.x2)/2,p.y);f.grounded=true;f.platform=p;
 const seen=new Set();let hits=0,warnings=0;
 for(let i=0;i<2160;i++){const ox=f.x,oy=f.y,px=p.x1,py=p.y;const out=s.step(m);if(Math.abs((f.x-ox)-(p.x1-px))>1e-6||Math.abs((f.y-oy)-(p.y-py))>1e-6)throw Error('rider drift');if(!Number.isFinite(f.x+f.y))throw Error('nonfinite');if(out.length)hits++;else if(s.cycle.hz?.t<90)warnings++;if(i%720===300)seen.add(s.platforms.slice(1).map(q=>Math.round(q.y/10)).join());}
 s.hazardsOn=false;for(let i=0;i<200;i++)if(s.step(m).length)throw Error('hazards disabled');
 m.countdown=0;m.intros=null;m.bigText.setText('');f.placeAt(-150,0);m.fighters[1].placeAt(150,0);s.t=530;s.movePlatforms(m);s.paint();m.draw();
 return {layouts:seen.size,hits,warnings,stageCount:STAGES.length};
 });
 assert.equal(result.layouts,3);assert.ok(result.hits>0&&result.warnings>0);
 await page.screenshot({path:'recordings/test-output/construct-stage.png'});
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(result));
}finally{await browser.close();await server.close();}
