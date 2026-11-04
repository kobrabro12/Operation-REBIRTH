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









 const result=await page.evaluate(async()=>{const {settings}=await import('/src/settings.js'),{MatchScene}=await import('/src/scenes/MatchScene.js'),{fistsAnchors}=await import('/src/fighters/fistsDevil.js');MatchScene.prototype.update=function(){};
 const start=async()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:2,picks:['fists','soul-summoner'],skins:[3,0],cpuCount:1,cpuLevels:[1],stage:'sky-sanctum',items:false,hazards:false,extraPads:[],p1Pad:null});return await new Promise(resolve=>{window.game.scene.getScene('Match').events.once('create',()=>{const m=window.game.scene.getScene('Match');m.countdown=0;m.intros=null;m.bigText.setText('');resolve(m);});window.game.scene.start('Match');});};
 let m=await start(),f=m.fighters[0],v=m.fighters[1];f.placeAt(-40,-120);f.setState('air');f.grounded=false;f.percent=81;f.jumpsLeft=1;f.buffer.jump=1;f.st_air(f.ctrl);if(f.vy>f.def.doubleJumpV*1.3)throw Error('Devil double jump not higher');f.startAttack('jab');f.hitstop=0;for(let i=0;i<9;i++)f.step();if(f.t!==6)throw Error('Devil attack not slowed '+f.t);f.percent=0;f.startAttack('jab');for(let i=0;i<9;i++)f.step();if(f.t!==9)throw Error('Normal attack incorrectly slowed');
 const hit=percent=>{f.percent=percent;v.percent=0;v.invincible=0;v.grounded=false;m.applyHit(v,{owner:f,facing:1,h:{dmg:10,base:2,growth:0,angle:30},id:'test'+percent},f.x);return v.percent;};if(hit(0)!==10||hit(81)!==16)throw Error('Devil damage bonus wrong');f.setState('idle');f.render(0);let a=fistsAnchors(f);f.x+=50;f.y+=20;f.render(0);let b=fistsAnchors(f);if(b.head.x-a.head.x!==50||b.head.y-a.head.y!==20)throw Error('Head attachments detached');f.setState('run');f.vx=4.5;f.age+=4;f.render(0);const run=fistsAnchors(f);if(run.head.y===b.head.y)throw Error('Head anchor ignores run pose');
 const superCase=async(initial)=>{m=await start();f=m.fighters[0];v=m.fighters[1];f.skin=0;f.percent=0;f.placeAt(-50,0);f.grounded=true;f.facing=1;v.placeAt(-15,0);v.percent=initial;v.invincible=v.star=0;f.startLimit();let beforeFinal;for(let tick=0;tick<270&&f.state==='limit';tick++){f.t++;m.frame++;if(f.ult?.ct===145)beforeFinal=v.percent;f.st_limit();}return {beforeFinal,holes:m.stageHoles.length};};
 const low=await superCase(40);if(low.beforeFinal!==70||low.holes)throw Error('70 percent must not shatter '+JSON.stringify(low));const high=await superCase(41);if(high.beforeFinal!==71||high.holes!==1)throw Error('Qualifying finisher did not break stage '+JSON.stringify(high));const h=m.stageHoles[0],center=(h.x1+h.x2)/2;if(m.stage.platforms.some(p=>p.y===0&&p.x1<center&&p.x2>center))throw Error('Hole still has collision');f.placeAt(center,-4);f.percent=0;f.setState('air');f.grounded=false;f.vy=7;for(let i=0;i<18;i++)f.physics(f.ctrl);if(f.grounded||f.y<=64)throw Error('Fighter cannot fall through hole');if(m.stageHoles.length!==1)throw Error('Hole vanished');f.placeAt(h.x1-25,0);f.setState('idle');f.grounded=true;f.platform=m.stage.platforms.find(p=>p.y===0&&f.x>=p.x1&&f.x<=p.x2);f.render(0);v.render(0);m.draw();window.holeTest={low,high};window.resetHoleTest=async()=>{const fresh=await start();if(fresh.stageHoles.length||fresh.stage.platforms.length!==4)throw Error('Stage damage leaked to new match');};return {low,high};});
 await page.waitForTimeout(180);await page.screenshot({path:'/workspace/work/devil-stage-hole.png'});await page.evaluate(()=>window.resetHoleTest());assert.deepEqual(errors,[]);console.log('PASS Devil double jump, slower attack clock, real damage increase, pose-relative attachments, 70-percent boundary, collision/art holes and fresh-match reset',result);
}finally{await browser.close();await server.close();}
