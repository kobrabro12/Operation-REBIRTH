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
 const packs=await page.evaluate(async()=>{
  const {SKIN_UPGRADES}=await import('/src/fighters/skinUpgradeData.js');const {skinsFor}=await import('/src/fighters/skins.js');const {MatchScene}=await import('/src/scenes/MatchScene.js');const {WinScene}=await import('/src/scenes/WinScene.js');
  window.cineVoices=[];const realPlay=window.game.sound.play;window.game.sound.play=function(key,...args){if(String(key).startsWith('cin_')){window.cineVoices.push(key);return true;}return realPlay.call(this,key,...args);};
  MatchScene.prototype.update=function(){};window.renderWin=WinScene.prototype.update;WinScene.prototype.update=function(){};
  return SKIN_UPGRADES.map(u=>({...u,index:skinsFor(u.fighter).findIndex(s=>s.name===u.name)}));
 });
 mkdirSync('recordings/test-output/five-skins',{recursive:true});
 const results=[];
 for(const pack of packs){
  const facts=await page.evaluate(async(pack)=>{
   const {azureShoulder}=await import('/src/fighters/azureCape.js');const {settings}=await import('/src/settings.js');const {Fireball}=await import('/src/fighters/entities.js');
   for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
   Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,difficulty:0,extraPads:[],p1Pad:null,picks:[pack.fighter,pack.fighter==='hero-knight'?'soul-summoner':'hero-knight'],skins:[pack.index,0],stage:'gravemoon-bridge',items:false,hazards:false,crt:false});
   window.game.scene.start('Match');await new Promise(r=>setTimeout(r,250));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match');m.countdown=0;m.intros=null;m.bigText.setText('');const f=m.fighters[0];f.placeAt(-50,0);f.grounded=true;f.platform=m.stage.platforms[0];f.hurtAnim=0;f.setState(pack.fighter==='hero-knight'?'counter':'idle');f.t=12;f.anim=40;m.fighters[1].placeAt(210,0);
   let p;if(pack.fighter==='soul-summoner'){p=new Fireball(m,f,.7);m.projectiles.push(p);}else if(pack.key==='ghost'){p=m.spawnBolt(f,f.def.moves.sideB.projectile);}else if(pack.key==='azure'){p=m.spawnSword(f,f.def.moves.sideB.sword);}
   const before=p?JSON.stringify(p.hitbox().h):null;if(p){p.x=70;p.y=-45;p.t=15;}
   m.skinHitFx(f,120,-42,4,1,8);const impacts=m.particles.some(p=>p.shape===f.vfx.hit.shape);
   m.stage.step(m);for(let i=0;i<18;i++)m.draw();
   let capeMirrors=true;if(pack.key==='azure'){f.facing=-1;m.draw();capeMirrors=f.azureCape.flipX===azureShoulder(f.sprite).flip&&Math.abs(f.azureCape.x-azureShoulder(f.sprite).x)<=1;f.facing=1;m.draw();}
   return {capeMirrors,cape:pack.key!=='azure'||!!(f.azureCape?.visible&&f.azureCape.frame.width===64&&f.azureCape.frame.height===64),impacts,theme:f.theme,draws:f.fx.commandBuffer.length>0,projectileUnchanged:p?before===JSON.stringify(p.hitbox().h):true,captionFairy:pack.key!=='hylian'||!!f.fairyPosition};
  },pack);
  assert.equal(facts.theme,pack.key);assert.ok(facts.draws);assert.ok(facts.impacts);assert.ok(facts.cape);assert.ok(facts.capeMirrors);assert.ok(facts.projectileUnchanged);assert.ok(facts.captionFairy);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'recordings/test-output/five-skins/'+pack.key+'-match.png'});
  const shots=await page.evaluate(async(pack)=>{
   window.game.scene.stop('Match');window.game.scene.start('Win',{preview:true,results:[{fighter:pack.fighter,skin:pack.index,slot:0,name:'P1'},{fighter:'hero-knight',skin:0,slot:1,name:'CPU'}]});await new Promise(r=>setTimeout(r,200));const w=window.game.scene.getScene('Win');
   return {fn:w.cut.fn,shots:w.cut.shots.map(([from,name],i)=>({name,t:Math.floor((from+(w.cut.shots[i+1]?.[0]||w.cut.len))/2)}))};
  },pack);
  assert.equal(shots.fn,'five_'+pack.key);
  if(pack.key==='frost'){const snap=await page.evaluate(()=>{const w=window.game.scene.getScene('Win');w.t=0;window.renderWin.call(w);return {beam:w.cineAction.beam,distance:w.cineAction.distance,length:w.cut.len};});assert.ok(snap.beam);assert.ok(snap.distance>=450);assert.ok(snap.length<=420);}
  for(const shot of shots.shots){
   const geometry=await page.evaluate(shot=>{const w=window.game.scene.getScene('Win');w.t=shot.t-1;window.renderWin.call(w);return {cape:w.cineAzureCape?.visible,plannedHidden:w.cineFrame?.actorHidden,camera:w.cineFrame,action:w.cineAction,visible:w.hero.visible,x:w.hero.x,y:w.hero.y,scale:w.hero.scaleX,finite:Number.isFinite(w.hero.x+w.hero.y+w.hero.scaleX),texture:w.hero.texture.key};},shot);
   assert.ok((geometry.visible||geometry.plannedHidden)&&geometry.finite);assert.ok(geometry.camera?.shot);if(pack.key==='azure')assert.equal(!!geometry.cape,geometry.visible);assert.ok(geometry.scale>=3&&geometry.scale<=4);assert.ok(!geometry.texture.includes('__MISSING'));
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'recordings/test-output/five-skins/'+pack.key+'-'+shot.name+'.png'});
  }
  const stable=await page.evaluate(()=>{const w=window.game.scene.getScene('Win'),views=new Set(),zooms=new Set();let contact=false,embedded=false,released=false,turnUp=false,turnDown=false,beam=false,frozen=false,frostGrowth=false,planetGreen=false,planetBlue=false,orb=false,exploded=false,nearPlanet=false,farPlanet=false,resting=null;for(let t=1;t<w.cut.len;t+=3){w.t=t-1;window.renderWin.call(w);if(!Number.isFinite(w.hero.x+w.hero.y+w.hero.scaleX+w.cineWorld.x+w.cineWorld.y))return {ok:false};views.add(w.cineFrame.shot);zooms.add(w.cineFrame.zoom.toFixed(2));const a=w.cineAction;if(a?.beam)beam=true;if(a?.freeze===1)frozen=true;if(a?.screenFrost>.5)frostGrowth=true;if(a?.phase==='orb-held')orb=true;if(a?.phase==='orb-explosion')exploded=true;if(a?.phase==='orbit-pullback'){nearPlanet ||= a.planetRadius>350;farPlanet ||= a.planetRadius<130;}if(a?.phase==='planet'){planetGreen ||= a.green>0&&a.flood===0;planetBlue ||= a.green===0&&a.flood===1;}if(a?.phase==='grip'){turnUp ||= a.tip[1]<100;turnDown ||= a.tip[1]>200;}if(a?.phase==='insert'){if(w.hero2.visible)return {ok:false};if(a.tip[1]<a.stoneTop)contact=true;if(a.tip[1]>a.stoneTop+12)embedded=true;}if(a?.phase==='release'&&(!w.cineHands.visible||w.cineWorld.getIndex(w.cineHands)<=w.cineWorld.getIndex(w.hero2)))return {ok:false};if(a?.handsReleased)released=true;if(a?.swordPosition){const p=JSON.stringify(a.swordPosition);if(resting&&resting!==p)return {ok:false};resting=p;}}return {ok:true,views:views.size,zooms:zooms.size,contact,embedded,released,turnUp,turnDown,beam,frozen,frostGrowth,planetGreen,planetBlue,orb,exploded,nearPlanet,farPlanet};});assert.ok(stable.ok);assert.ok(stable.views>=5);assert.ok(stable.zooms>=3);if(pack.key==='frost'){assert.ok(stable.beam&&stable.frozen&&stable.frostGrowth);}if(pack.key==='azure'){assert.ok(stable.orb&&stable.exploded&&stable.nearPlanet&&stable.farPlanet&&stable.planetGreen&&stable.planetBlue);}if(pack.key==='hylian'){assert.ok(stable.turnUp&&stable.turnDown);assert.ok(stable.contact);assert.ok(stable.embedded);assert.ok(stable.released);}
  results.push({name:pack.name,match:true,shots:shots.shots.length,fullTimeline:stable.ok,cameraShots:stable.views});
 }
 const legacy=await page.evaluate(async()=>{window.game.scene.stop('Win');window.game.scene.start('Win',{preview:true,results:[{fighter:'hero-knight',skin:0,slot:0},{fighter:'mr-wake',skin:0,slot:1}]});await new Promise(r=>setTimeout(r,180));const w=window.game.scene.getScene('Win');w.t=70;window.renderWin.call(w);return !w.cineWorld&&w.hero.visible&&Number.isFinite(w.hero.x+w.hero.y);});assert.ok(legacy);
 const voices=await page.evaluate(()=>window.cineVoices);assert.deepEqual(voices,[],'character dialogue must be silent');
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(results));
}finally{await browser.close();await server.close();}
