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
  const pause=()=>new Promise(r=>setTimeout(r,160));for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulBattle',{soulId:'healing-orb'});await pause();let s=window.game.scene.getScene('SoulBattle');
  const portrait=window.game.textures.get('soul_shadow_young_link').getSourceImage(),rgba=portrait.getContext('2d').getImageData(0,0,portrait.width,portrait.height).data;let opaque=0,red=0;for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]>0)opaque++;if(rgba[i]>200&&rgba[i+1]<30&&rgba[i+2]<30&&rgba[i+3])red++;}if(opaque<300||red<2)throw Error('Shadow portrait must contain visible art and red eyes');
  if(s.portrait.x!==302||s.portrait.texture.key!=='soul_healing_orb')throw Error('Centered Aid portrait missing');s.select(1);s.color();const fighter=s.roster[s.sel].id,skin=s.skin;s.changeTeam();await pause();if(!window.game.scene.isActive('SoulTeam'))throw Error('Team change unavailable');window.game.scene.getScene('SoulTeam').back();await pause();s=window.game.scene.getScene('SoulBattle');if(s.roster[s.sel].id!==fighter||s.skin!==skin)throw Error('Fighter selection lost when changing team');
  for(const o of [s.name,s.skinLabel,s.teamLabel]){const b=o.getBounds();if(b.left<16||b.right>624||b.bottom>345)throw Error('Setup text clips '+o.text);}
  if(!s.stagePreview||s.teamButton.x!==460||s.fightButton.y<=s.teamButton.y||s.puppet.x<=s.portrait.x)throw Error('Reference layout missing');return {referenceLayout:true,teamReturn:true,palette:true};
 });
 await page.waitForTimeout(80);await page.screenshot({path:'recordings/test-output/soul-setup-template.png'});for(const id of ['bill-cipher','cloud','steve','shadow-young-link','ember-ronin','moon-moth','gearling','leon','cinder-finch','reef-warden','static-imp','moss-tortoise','brass-marshal','boiler-beetle','chrono-owl']){await page.evaluate(id=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulBattle',{soulId:id});},id);await page.waitForTimeout(300);await page.screenshot({path:'recordings/test-output/soul-setup-'+id+'.png'});}
 const teamTap=await page.evaluate(()=>{const r=window.game.canvas.getBoundingClientRect();return {x:r.x+544/640*r.width,y:r.y+263/360*r.height};});await page.touchscreen.tap(teamTap.x,teamTap.y);await page.waitForFunction(()=>window.game.scene.isActive('SoulTeam'));
 assert.deepEqual(errors,[]);console.log('PASS soul setup',result);
}finally{await browser.close();await server.close();}
