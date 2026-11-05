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







 const facts=[];for(const id of ['bill-cipher','cloud','healing-orb','shadow-young-link']){
  await page.evaluate(id=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulReward',{soulBattle:{soulId:id},soulWon:true});},id);await page.waitForTimeout(900);
  facts.push(await page.evaluate(async()=>{const s=window.game.scene.getScene('SoulReward'),{soulPower}=await import('/src/souls/progression.js');if(s.gotIt.text!=='GOT IT!'||s.portrait.x!==320||s.portrait.displayHeight<150||s.portrait.alpha<.95)throw Error('Victory artwork layout incomplete');if(s.soul.kind==='main'&&s.power.text!==String(soulPower(s.soul.id).power))throw Error('Wrong main power');if(s.soul.kind==='aid'&&s.level.text!=='ABILITY SOUL')throw Error('Aid should not level');if(s.benefits.text!==s.soul.description)throw Error('Benefits missing');for(const o of [s.gotIt,s.soulName,s.level,s.power,s.benefits,...s.actions]){const b=o.getBounds();if(b.left<0||b.right>640||b.top<0||b.bottom>346)throw Error('Reward text clips: '+o.text);}if(!s.starG.commandBuffer.length)throw Error('Pixel star rating missing');return {id:s.soul.id,kind:s.soul.kind,stars:s.soul.stars};}));
  await page.screenshot({path:'recordings/test-output/soul-reward-'+id+'.png'});
 }
 const point=await page.evaluate(()=>{const s=window.game.scene.getScene('SoulReward'),b=s.actions[1].getBounds(),r=window.game.canvas.getBoundingClientRect();return {x:r.x+b.centerX/640*r.width,y:r.y+b.centerY/360*r.height};});await page.touchscreen.tap(point.x,point.y);await page.waitForFunction(()=>window.game.scene.isActive('SoulTeam'));assert.deepEqual(errors,[]);console.log('PASS victory layout, shadowed pixel stars, Main/Aid stats and touch action',facts);
}finally{await browser.close();await server.close();}
