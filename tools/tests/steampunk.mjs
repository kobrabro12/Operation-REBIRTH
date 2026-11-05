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







 const before=await page.evaluate(async()=>{
  const atlas=window.game.textures.get('soul_steampunk'),pixels=atlas.getSourceImage().getContext('2d').getImageData(0,0,192,192).data;for(let i=0;i<4;i++){const f=atlas.get(i);if(f.realWidth!==96||f.realHeight!==96)throw Error('Steampunk art must be native pixel art');let count=0;for(let y=0;y<96;y++)for(let x=0;x<96;x++){const a=pixels[((Math.floor(i/2)*96+y)*192+i%2*96+x)*4+3];if(a!==0&&a!==255)throw Error('Soft sprite edge');if(a)count++;}if(count<900)throw Error('Empty steampunk portrait '+i);}
  const {awardSoul}=await import('/src/souls/collection.js'),{setMainSoul,setAidSoul}=await import('/src/souls/team.js'),{addSoulXP,soulPower}=await import('/src/souls/progression.js');['brass-marshal','boiler-beetle','chrono-owl'].forEach(awardSoul);setMainSoul('brass-marshal');setAidSoul(0,'boiler-beetle');setAidSoul(1,'chrono-owl');addSoulXP('brass-marshal',1900);for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulTeam');return soulPower('brass-marshal');
 });await page.waitForTimeout(400);await page.screenshot({path:'recordings/test-output/steampunk-team.png'});await page.evaluate(()=>window.game.scene.getScene('SoulTeam').evolveMain());await page.waitForFunction(()=>window.game.scene.isActive('SoulEvolution'));await page.waitForTimeout(300);await page.screenshot({path:'recordings/test-output/steampunk-evolution-preview.png'});await page.evaluate(()=>window.game.scene.getScene('SoulEvolution').confirm());await page.waitForFunction(()=>window.game.scene.getScene('SoulEvolution').done);await page.waitForTimeout(200);await page.screenshot({path:'recordings/test-output/aether-marshal-evolved.png'});
 await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const combat=await page.evaluate(async()=>{
  const {getSoulTeam,mainSoul}=await import('/src/souls/team.js'),{soulPower,evolveSoul,evolutionStatus}=await import('/src/souls/progression.js');if(mainSoul(getSoulTeam()).name!=='Aether Marshal'||soulPower('brass-marshal').level!==25)throw Error('Evolution did not persist');if(evolveSoul('brass-marshal')||evolutionStatus('chrono-owl').eligible||evolutionStatus('boiler-beetle').eligible)throw Error('Evolution gates failed');
  const {MatchScene}=await import('/src/scenes/MatchScene.js'),{settings}=await import('/src/settings.js');MatchScene.prototype.update=function(){};for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:2,cpuCount:1,picks:['soul-summoner','hero-knight'],skins:[0,0],stage:'gravemoon-bridge',p1Pad:null,extraPads:[],hazards:false,items:false});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,400));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match'),f=m.fighters[0],t=m.fighters[1];
  const hit=(percent,projectile)=>{f.percent=percent;t.percent=0;m.applyHit(t,{owner:f,h:{dmg:20},facing:1,id:'steam-'+percent+'-'+projectile,...(projectile?{projectile:{}}:{})},f.x);return t.percent;};const ranged=hit(99,true),overpressure=hit(100,true),melee=hit(99,false);if(ranged!==33||overpressure!==36||melee!==26)throw Error('Incorrect projectile/Overpressure damage '+JSON.stringify({ranged,overpressure,melee}));
  f.buffer.jump=1;f.jumpsLeft=1;f.grounded=false;f.st_air(f.ctrl);const jump=f.vy;if(Math.abs(jump-f.def.doubleJumpV*1.06)>.001)throw Error('Chrono Owl jump bonus inactive');return {ranged,overpressure,melee,jump,level:soulPower('brass-marshal').level};
 });assert.ok(combat.level>before.level);assert.deepEqual(errors,[]);console.log('PASS steampunk pixel art, evolution/reload, projectile damage, Overpressure and stronger jumps',combat);
}finally{await browser.close();await server.close();}
