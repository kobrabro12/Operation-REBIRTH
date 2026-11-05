import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});

 await page.evaluate(async()=>{const {MatchScene}=await import('/src/scenes/MatchScene.js'),{WinScene}=await import('/src/scenes/WinScene.js');window.matchUpdate=MatchScene.prototype.update;MatchScene.prototype.update=function(){};window.winUpdate=WinScene.prototype.update;WinScene.prototype.update=function(){};});
 const facts=await page.evaluate(async()=>{
  const {TEST_ROSTER,ROSTER}=await import('/src/fighters/roster.js'),{settings}=await import('/src/settings.js');
  if([...TEST_ROSTER,...ROSTER].some(r=>r.id==='kirby'))throw Error('Kirby remains');
  if(!TEST_ROSTER.find(r=>r.id==='young-link'))throw Error('Young Link missing');
  for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
  window.game.scene.start('TestFighters');await new Promise(r=>setTimeout(r,100));const lab=window.game.scene.getScene('TestFighters');lab.sel=TEST_ROSTER.findIndex(r=>r.id==='young-link');lab.update();
  if(!lab.notes.text.includes('GREGARLINK10'))throw Error('Missing visible art credit');
  window.game.scene.stop('TestFighters');Object.assign(settings,{mode:'stock',stocks:3,picks:['young-link','hero-knight'],skins:[0,0],cpuCount:1,p1Pad:null,extraPads:[],stage:'gravemoon-bridge',items:false,hazards:false,crt:false});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,150));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match'),f=m.fighters[0],rival=m.fighters[1];
  if(f.def.id!=='young-link'||m.intros.list[0].I.kind!=='drop')throw Error('Wrong fighter/intro');
  m.countdown=0;m.intros.g.clear();m.intros=null;m.bigText.setText('');f.placeAt(-60,0);f.grounded=true;f.platform=m.stage.platforms[0];rival.placeAt(110,0);
  const {skinSheets,skinInfo,skinUnlocked}=await import('/src/fighters/skins.js');
  const {youngLinkHook,YoungLinkBomb}=await import('/src/fighters/youngLinkSpecials.js');
  if(skinInfo('young-link',1).name!=='METALLIC BLUE'||!skinUnlocked('young-link',1))throw Error('Metallic skin unavailable');
  const blue=skinSheets(m,f.def,1);let recolored=0,unchanged=0;
  for(const kind of ['idle','run','walk','jump','fall','moves']){
   const data=key=>{const im=m.textures.get(key).getSourceImage(),cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const c=cv.getContext('2d');c.drawImage(im,0,0);return c.getImageData(0,0,cv.width,cv.height).data;};
   const a=data(f.def.sheets[kind]),b=data(blue[kind]);
   for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3])throw Error('Skin changed alpha');if(!a[i+3])continue;const changed=a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2];if(changed){if(!(a[i+1]>a[i]&&a[i+1]>a[i+2]))throw Error('Skin changed non-clothing pixel');recolored++;}else unchanged++;}
  }
  if(recolored<500||unchanged<500)throw Error('Skin incomplete');f.sheets=blue;f.skin=1;
  let poses=0;
  for(const [name,a]of Object.entries(f.def.moveAnims)){
   for(const facing of [-1,1]){
    f.facing=facing;
    if(f.def.moves[name]&&name!=='upb')f.startAttack(name);
    else if(name.startsWith('throw_')){f.setState('attack');f.moveName='throw';f.throwDir=name.slice(6);f.move={frames:18};}
    else f.setState(name==='victory'?'taunt':name);
    for(let i=0;i<a[1];i++){f.t=i*a[2];m.draw();const spr=f.sprite;if(!spr.texture.key.includes('@METALLIC BLUE')||!spr.frame||spr.frame.name==='__BASE')throw Error('Invalid pose '+name);if(spr.originY!==112/128||!Number.isFinite(spr.x))throw Error('Bad origin '+name);poses++;}
   }
  }
  const controls={x:0,y:0,up:false,down:false,held:()=>false,pressed:()=>false,tappedDown:()=>false,tappedSide:()=>false};
  for(const facing of [-1,1]){f.facing=facing;f.startAttack('neutralB');f.t=20;f.hitstop=0;rival.placeAt(f.x+facing*youngLinkHook(20).reach,f.y);rival.grounded=false;rival.invincible=0;rival.hitstop=0;m.resolveHits(null);if(f.grabbed!==rival)throw Error('Hook must catch airborne rivals in both directions');f.t=12;f.st_holding({...controls,x:facing});}
  f.facing=1;f.startAttack('neutralB');f.t=20;const hb=f.activeHitboxes()[0];if(Math.abs((hb.x1+hb.x2)/2-(f.x+f.facing*youngLinkHook(20).reach))>.01)throw Error('Hook drawing and collision disagree');if(!hb.grab||hb.x2-hb.x1!==12)throw Error('Hookshot not a grab');rival.placeAt(f.x+110,f.y);const oldX=rival.x;f.onGrab(rival);if(rival.grabbedBy!==f)throw Error('Grab failed');f.t=4;f.st_holding(controls);if(rival.x===oldX||rival.x===f.x+f.facing*26)throw Error('Hook pull must travel smoothly');f.t=12;f.st_holding({...controls,x:1});if(rival.grabbedBy||f.moveName!=='throw')throw Error('Throw failed');
  f.grounded=false;f.startUpB(controls);f.t=6;f.st_upb(controls);if(f.vy>=0)throw Error('Spin does not recover');f.t=27;if(!f.activeHitboxes().length)throw Error('Spin finisher missing');
  const rushes=[];
  for(const hold of [1,30,60]){
   f.placeAt(-80,0);f.grounded=true;f.platform=m.stage.platforms.find(p=>p.solid);f.facing=1;f.startAttack('sideB');
   if(f.state!=='ylrushcharge')throw Error('Side special must charge before rushing');
   for(let i=0;i<hold&&f.state==='ylrushcharge';i++){f.t=i+1;f.st_ylrushcharge({...controls,held:()=>true});}
   if(f.state==='ylrushcharge')f.st_ylrushcharge(controls);
   if(f.state!=='attack'||!f.move.rush)throw Error('Side special did not release');
   const start=f.x,damage=f.move.hits[0].dmg,frames=f.move.frames;
   for(let t=1;t<frames;t++){f.t=t;f.st_attack(controls);f.physics(controls);}
   rushes.push({hold,damage,distance:Math.abs(f.x-start)});
  }
  if(!(rushes[0].distance<rushes[1].distance&&rushes[1].distance<rushes[2].distance&&rushes[0].damage<rushes[1].damage&&rushes[1].damage<rushes[2].damage))throw Error('Charge must increase distance and damage');
  f.placeAt(0,0);f.facing=1;f.grounded=false;f.startUpB(controls);rival.placeAt(14,-8);rival.grounded=false;rival.invincible=0;rival.percent=0;
  const juggleHits=[];let carried=0;
  for(let t=1;t<=31;t++){
   f.t=t;f.hitstop=rival.hitstop=0;f.st_upb(controls);f.physics(controls);rival.physics(controls);const previous=rival.percent;m.resolveHits(null);
   if(rival.percent>previous)juggleHits.push(t);
   if(t>7&&t<26&&rival.youngLinkJuggle){if(Math.abs(rival.x-f.x)>45||Math.abs(rival.y-f.y)>45)throw Error('Victim dropped out of the rising spin');carried++;}
  }
  if(juggleHits.length!==3||carried<14||rival.youngLinkJuggle)throw Error('Spin must carry through two hits and release with finisher');
  const platform=m.stage.platforms.find(p=>p.solid);
  for(const side of [-1,1]){
   const edge=side<0?platform.x1:platform.x2;f.placeAt(edge+side*90,platform.y+27);f.facing=-side;f.ledgeCooldown=0;f.usedUpB=true;f.jumpsLeft=0;f.startAttack('neutralB');f.t=20;f.tryLedgeGrab(controls);
   if(f.state!=='yltether')throw Error('Air hookshot must attach to reachable ledge');
   const start=f.x;f.t=5;f.st_yltether(controls);if(f.x===start||f.state!=='yltether')throw Error('Tether must visibly pull to ledge');
   f.t=12;f.st_yltether(controls);if(f.state!=='ledge'||f.usedUpB||f.jumpsLeft!==1)throw Error('Tether must restore standard ledge recovery');f.ledge=null;
  }
  rival.ledge={p:platform,side:-1};rival.setState('ledge');f.placeAt(platform.x1-90,platform.y+27);f.facing=1;f.ledgeCooldown=0;f.startAttack('neutralB');f.t=20;f.tryLedgeGrab(controls);if(f.state==='yltether')throw Error('Tether must respect occupied ledges');rival.ledge=null;rival.setState('air');
  f.placeAt(platform.x1-180,platform.y+27);f.facing=1;f.startAttack('neutralB');f.t=20;f.tryLedgeGrab(controls);if(f.state==='yltether')throw Error('Tether exceeded hookshot range');
  f.ledge=null;
  f.placeAt(-60,0);f.grounded=true;f.facing=1;f.hitstop=0;
  rival.placeAt(110,0);rival.grounded=true;rival.invincible=0;rival.hitstop=0;
  f.startAttack('downB');f.t=22;f.st_attack(controls);const bomb=m.projectiles.at(-1);if(!(bomb instanceof YoungLinkBomb))throw Error('Down special did not throw a bomb');
  for(let t=0;t<60&&bomb.blastAge<0;t++)bomb.step();if(bomb.blastAge<0||!bomb.hitbox())throw Error('Bomb did not detonate');
  bomb.render();const blast=bomb.hitbox();if(![blast.x1,blast.x2,blast.y1,blast.y2].every(Number.isFinite))throw Error('Bad blast bounds');
  rival.placeAt(bomb.x,bomb.y+20);rival.grounded=true;rival.invincible=0;rival.hitstop=0;const damage=rival.percent;m.resolveHits(null);if(rival.percent<=damage)throw Error('Bomb does not damage opponents');
  for(let i=0;i<18;i++)bomb.step();if(bomb.alive)throw Error('Bomb did not clean up');
  const contact=new YoungLinkBomb(m,f);contact.age=7;contact.x=rival.x;contact.y=rival.y-20;contact.vx=contact.vy=0;contact.step();if(contact.blastAge<0)throw Error('Bomb must explode on contact');contact.kill();
  f.placeAt(-60,0);f.grounded=true;f.facing=1;f.hitstop=0;rival.placeAt(230,-220);rival.invincible=0;rival.percent=0;
  f.setState('limit');for(let t=1;t<=81;t++){f.t=t;f.st_limit();}if(f.ult||m.cutscene||rival.percent!==0)throw Error('A missed triangle must end without a cinematic or damage');
  f.placeAt(-60,0);f.grounded=true;f.facing=1;f.hitstop=0;rival.placeAt(230,0);rival.grounded=true;rival.hitstop=0;rival.invincible=0;rival.percent=0;
  f.setState('limit');let trapped=false,flightFrames=0;for(let t=1;t<90;t++){f.t=t;f.st_limit();if(t<40&&f.ult?.phase==='cutscene')throw Error('Super caught before the triangle launch');if(f.ult?.phase==='flight')flightFrames++;if(f.ult?.phase==='cutscene'){trapped=true;break;}}if(flightFrames<10)throw Error('Triangle must travel to the distant opponent');if(!trapped)throw Error('Triforce failed to trap opponent');
  for(let t=0;t<35;t++){f.bladeCutscene(f.def.limit,f.ult);}m.draw();if(f.ult.cut<5||rival.percent<=0)throw Error('Triforce cuts do not damage');
  if(f.fx.commandBuffer.length<30)throw Error('Triforce effect missing');

  if(skinInfo('young-link',2).name!=='SHADOW LINK'||!skinUnlocked('young-link',2))throw Error('Shadow skin must be available');
  const shadow=skinSheets(m,f.def,2);let red=0;
  for(const kind of ['idle','walk','run','jump','fall','moves']){const img=m.textures.get(shadow[kind]).getSourceImage(),cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,cv.width,cv.height).data;for(let i=0;i<data.length;i+=4)if(data[i+3]&&data[i]>data[i+1]*1.7&&data[i]>data[i+2]*1.1)red++;}
  if(red<10)throw Error('Shadow skin missing red accents');f.skin=2;f.sheets=shadow;m.draw();if(!f.sprite.texture.key.includes('@SHADOW LINK'))throw Error('Shadow skin did not render');
  const {checkLinkCompanion}=await import('/tools/tests/link-companion-check.js'),companion=await checkLinkCompanion(m,f,skinSheets);
  return {flightFrames,companion,rushes,juggleHits,carried,tether:true,shadow:true,poses,roster:TEST_ROSTER.map(r=>r.id),hookshot:true,throw:true,recovery:true,limit:true,bomb:true,recolored,unchanged};
 });
 await page.waitForTimeout(80);await page.screenshot({path:'recordings/test-output/young-link-game.png'});
 await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];let big=false;for(let i=0;i<400&&f.ult;i++){const before=m.fighters[1].percent;f.bladeCutscene(f.def.limit,f.ult);if(m.fighters[1].percent-before===15&&f.ult?.slashes.some(s=>s.big))big=true;}if(!big||m.fighters[1].percent!==55)throw Error('Super needs twenty cuts and one big finishing slice');if(f.ult||m.cutscene||m.frozen>0)throw Error('Super failed to release target and resume match');});
 const outro=await page.evaluate(async()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('Win',{preview:true,results:[{fighter:'young-link',skin:2,slot:0,label:'P1'},{fighter:'hero-knight',skin:0,slot:1,label:'CPU'}]});await new Promise(r=>setTimeout(r,120));const w=window.game.scene.getScene('Win'),seen=new Set();for(let t=1;t<319;t+=3){w.t=t-1;window.winUpdate.call(w);seen.add(w.hero.frame.name);if(w.hero.originY!==112/128)throw Error('Wrong victory anchor');if(!w.hero.texture.key.includes('@SHADOW LINK'))throw Error('Skin lost during victory');}return {frames:seen.size,title:w.title.text};});
 await page.waitForTimeout(80);await page.screenshot({path:'recordings/test-output/young-link-win.png'});
 assert.ok(outro.frames>=8);assert.equal(outro.title,'YOUNG LINK');assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({facts,outro}));
}finally{await browser.close();await server.close();}
