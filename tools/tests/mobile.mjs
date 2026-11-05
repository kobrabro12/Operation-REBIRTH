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

 await page.evaluate(async()=>{const {MatchScene}=await import('/src/scenes/MatchScene.js'),{WinScene}=await import('/src/scenes/WinScene.js');window.matchUpdate=MatchScene.prototype.update;MatchScene.prototype.update=function(){};window.winUpdate=WinScene.prototype.update;WinScene.prototype.update=function(){};});

 const phone=await page.evaluate(async()=>{
  const {PHONE_DEVICE,lowEffects}=await import('/src/performance.js'),{settings,saveOptions}=await import('/src/settings.js');
  if(!PHONE_DEVICE||!lowEffects())throw Error('Phone profile did not activate');
  const title=window.game.scene.getScene('Title');if(window.game.scene.isActive('Match')||!title.lightTitle)throw Error('Phone title should not run a CPU match');
  const texture=window.game.textures.get('yl_moves');if(!texture.customData.mobileAtlas||texture.get(0).realWidth!==160||texture.get(0).realHeight!==128)throw Error('Packed frame origin changed');
  const bg=window.game.textures.get('aero_moves').getSourceImage();if(bg.width>4096||bg.height>4096)throw Error('Atlas exceeds mobile texture limit');
  window.game.scene.stop('Title');window.game.scene.start('Options');await new Promise(r=>setTimeout(r,100));const options=window.game.scene.getScene('Options'),row=options.items().find(r=>r.label==='PERFORMANCE');if(!row)throw Error('Missing performance setting');row.change(1);if(settings.performance!=='low'||JSON.parse(localStorage.getItem('rebirth.options')).performance!=='low')throw Error('Low option failed');row.change(1);if(settings.performance!=='full'||lowEffects())throw Error('Full option failed');settings.performance='auto';saveOptions();
  const {addCoins,buyItem}=await import('/src/progress.js');addCoins(2000);buyItem('cos-judgment',2000);
  window.game.scene.stop('Options');Object.assign(settings,{mode:'stock',stocks:3,picks:['young-link','soul-summoner'],skins:[2,19],cpuCount:1,p1Pad:null,extraPads:[],stage:'gravemoon-bridge',items:false,hazards:false,crt:false,touch:'auto'});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,150));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));
  const m=window.game.scene.getScene('Match'),f=m.fighters[0],enemy=m.fighters[1];if(!m.touchPad)throw Error('Phone touch controls missing');m.countdown=0;m.intros?.g.clear();m.intros=null;m.bigText.setText('');
  let poses=0;for(const [name,a]of Object.entries(f.def.moveAnims)){if(f.def.moves[name]&&name!=='upb')f.startAttack(name);else if(name.startsWith('throw_')){f.setState('attack');f.moveName='throw';f.throwDir=name.slice(6);}else f.setState(name==='victory'?'taunt':name);for(let t=0;t<a[1];t+=4){f.t=t;m.draw();if(!f.sprite.texture.key.includes('@SHADOW LINK')||f.sprite.originY!==112/128)throw Error('Packed skin lost pose or origin');poses++;}}
  const {judgmentEye}=await import('/src/fighters/judgmentFx.js');enemy.setState('attack');enemy.moveName='ftilt';enemy.move=enemy.def.moves.ftilt;enemy.t=8;m.draw();if(!judgmentEye(enemy.sprite))throw Error('Packed Judgment eye anchor missing');
  const {skinSheets,skinsFor}=await import('/src/fighters/skins.js');const bitIndex=skinsFor('soul-summoner').findIndex(s=>s.name==='1-BIT'),bit=skinSheets(m,enemy.def,bitIndex),bitMoves=m.textures.get(bit.moves);if(bitMoves.get(0).realWidth!==112||bitMoves.customData.mobileAtlas)throw Error('Outlined costume grid fallback failed');
  m.particles=Array.from({length:700},()=>({x:0,y:0,vx:0,vy:0,life:100}));m.stepEffects();if(m.particles.length>120)throw Error('Phone particle budget failed');
  f.setState('attack');f.moveName='neutralB';f.move=f.def.moves.neutralB;f.t=20;m.draw();
  const packed=Object.values(window.game.textures.list).filter(t=>t.customData?.mobileAtlas).length,{MOBILE_ATLASES}=await import('/src/mobileAtlasManifest.js'),unpacked=Object.keys(MOBILE_ATLASES).filter(k=>window.game.textures.exists(k)&&!window.game.textures.get(k).customData?.mobileAtlas);
  f.placeAt(0,0);f.facing=1;f.grounded=true;enemy.placeAt(180,0);enemy.invincible=0;enemy.percent=0;f.setState('limit');let flight=0;for(let t=1;t<90;t++){f.t=t;f.st_limit();m.draw();if(f.ult?.phase==='flight'){flight++;if(f.sprite.y!==Math.round(f.y))throw Error('Triangle hand origin drifted');}if(f.ult?.phase==='cutscene')break;}if(!flight||f.ult?.phase!=='cutscene')throw Error('Mobile triangle failed to capture');f.endBladeLimit();
  const {checkLinkCompanion}=await import('/tools/tests/link-companion-check.js'),companion=await checkLinkCompanion(m,f,skinSheets);
  return {companion,phone:PHONE_DEVICE,packed,unpacked,poses,particles:m.particles.length,touch:!!m.touchPad,audio:window.game.sound.constructor.name,canvas:[window.game.canvas.width,window.game.canvas.height]};
 });
 const cdp=await page.context().newCDPSession(page),button=await page.evaluate(()=>{const r=window.game.canvas.getBoundingClientRect();return {x:r.x+r.width*594/640,y:r.y+r.height*258/360};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:button.x,y:button.y}]});await page.waitForTimeout(50);
 const touch=await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];f.setState('idle');f.grounded=true;f.hitstop=0;f.ctrl.beginFrame();f.ctrl.poll();f.step();return {held:f.ctrl.held('attack'),move:f.moveName};});assert.ok(touch.held);assert.equal(touch.move,'jab');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(80);await page.screenshot({path:'recordings/test-output/mobile-match.png'});
 assert.deepEqual(errors,[]);assert.ok(phone.packed>=20,'packed atlases in use: '+phone.packed);assert.deepEqual(phone.unpacked,[],'loaded sheets that have a packed atlas but were loaded as full grids');console.log('PASS',JSON.stringify(phone));
}finally{await browser.close();await server.close();}
