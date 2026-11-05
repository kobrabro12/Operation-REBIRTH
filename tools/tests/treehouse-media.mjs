import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('Treehouse');});await page.waitForFunction(()=>window.game.scene.isActive('Treehouse')&&window.game.scene.getScene('Treehouse').menu.started);
 await page.evaluate(()=>{const s=window.game.scene.getScene('Treehouse');if(s.records.length)throw Error('Unowned tracks granted');s.openRecords();s.toggleRecord('mus-chip');if(s.playingRecord)throw Error('Locked record played');s.closeModal();window.roomChildCount=s.children.length;s.activate(0);if(s.modal.kind!=='manga')throw Error('Book shelf did not open manga');});
 await page.screenshot({path:'recordings/test-output/iron-rain-page-1.png'});
 const tapText=async text=>{const point=await page.evaluate(text=>{const s=window.game.scene.getScene('Treehouse'),t=s.modal.parts.find(p=>p.text===text);if(!t)throw Error('Missing button '+text);const b=t.getBounds(),c=window.game.canvas.getBoundingClientRect();return {x:c.x+(b.x+b.width/2)*c.width/640,y:c.y+(b.y+b.height/2)*c.height/360};},text);await page.touchscreen.tap(point.x,point.y);};
 await tapText('NEXT >');await page.waitForFunction(()=>window.game.scene.getScene('Treehouse').modal?.page===1);await page.keyboard.press('ArrowLeft',{delay:100});await page.waitForFunction(()=>window.game.scene.getScene('Treehouse').modal?.page===0);
 for(let i=1;i<6;i++){await page.evaluate(i=>window.game.scene.getScene('Treehouse').openManga(i),i);await page.screenshot({path:`recordings/test-output/iron-rain-page-${i+1}.png`});}
 await tapText('CLOSE');assert.equal(await page.evaluate(()=>window.game.scene.getScene('Treehouse').modal),null);assert.ok(await page.evaluate(()=>window.game.scene.getScene('Treehouse').children.length===window.roomChildCount));
 // Make an actual shop purchase, then verify the room uses the same saved ownership.
 const bought=await page.evaluate(async()=>{
  const {SHOP}=await import('/src/data/shop.js'),p=await import('/src/progress.js');
  const ready=new Promise(resolve=>window.game.scene.getScene('Shop').events.once('create',resolve));window.game.scene.getScene('Treehouse').back();await ready;
  const shop=window.game.scene.getScene('Shop');shop.setTab(SHOP.findIndex(t=>t.name==='MUSIC'));const item=shop.item(),before=p.getCoins();shop.buy();
  if(!p.owns(item.id)||p.getCoins()!==before-item.price)throw Error('Purchase did not use shop transaction');
  p.grantItem('mus-noli');p.grantItem('mus-soviet');p.grantItem('ext-comic');window.expectedBattleMusic=p.equippedMusic();
  shop.scene.start('Treehouse');return item.id;
 });assert.equal(bought,'mus-neon');await page.waitForFunction(()=>window.game.scene.isActive('Treehouse')&&window.game.scene.getScene('Treehouse').records.length===3);
 await page.screenshot({path:'recordings/test-output/treehouse-purchased-vinyl.png'});
 const canvas=await page.locator('canvas').boundingBox();await page.touchscreen.tap(canvas.x+400/640*canvas.width,canvas.y+191/360*canvas.height);await page.waitForFunction(()=>window.game.scene.getScene('Treehouse').modal?.kind==='vinyl');
 await page.touchscreen.tap(canvas.x+250/640*canvas.width,canvas.y+153/360*canvas.height);await tapText('PLAY RECORD');
 await page.waitForFunction(()=>window.game.scene.getScene('Treehouse').playingRecord==='mus-noli');
 const playback=await page.evaluate(async()=>{const audio=await import('/src/audio/music.js'),p=await import('/src/progress.js'),s=window.game.scene.getScene('Treehouse');const sound=s.sound.get('bgm_shop_noli');const state=audio.musicState?.()||{key:sound?.key,playing:!!sound?.isPlaying,pending:!!sound?.pendingPlay};if(state.key!=='bgm_shop_noli'||(!state.playing&&!state.pending))throw Error('Record did not reach music engine');if(p.equippedMusic()!==window.expectedBattleMusic)throw Error('Room changed battle music');return state.key;});assert.equal(playback,'bgm_shop_noli');
 await page.screenshot({path:'recordings/test-output/treehouse-vinyl-player.png'});await page.keyboard.press('Escape',{delay:100});await page.waitForFunction(()=>!window.game.scene.getScene('Treehouse').modal);
 await page.evaluate(()=>{const s=window.game.scene.getScene('Treehouse');if(!s.playingRecord)throw Error('Closing collection stopped music');s.openManga(2);if(!s.playingRecord)throw Error('Reading interrupted vinyl');s.closeModal();s.openRecords(1);s.toggleRecord('mus-noli');if(s.playingRecord)throw Error('Record did not stop');});
 await page.evaluate(async()=>{const {SHOP}=await import('/src/data/shop.js'),{grantItem}=await import('/src/progress.js');for(const it of SHOP.flatMap(t=>t.items).filter(i=>i.kind==='music'))grantItem(it.id);const s=window.game.scene.getScene('Treehouse');s.closeModal();s.refreshCollection();if(s.records.length!==new Set(s.records.map(r=>r.id)).size)throw Error('Duplicate records');s.openRecords(s.records.length-1);if(s.modal.index!==s.records.length-1)throw Error('Last record inaccessible');});
 await page.screenshot({path:'recordings/test-output/treehouse-full-vinyl-library.png'});
 await page.evaluate(()=>{const s=window.game.scene.getScene('Treehouse');s.toggleRecord(s.records.at(-1).id);s.closeModal();s.pickUp('star-patrol');s.insert();if(s.playingRecord)throw Error('Cartridge insertion did not stop vinyl');});
 await page.waitForFunction(()=>window.game.scene.isActive('CartridgeGame'));await page.evaluate(()=>window.game.scene.getScene('CartridgeGame').eject());await page.waitForFunction(()=>window.game.scene.isActive('Treehouse'));
 const count=await page.evaluate(()=>window.game.scene.getScene('Treehouse').records.length);assert.ok(count>=20);await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('Treehouse');});await page.waitForFunction(n=>window.game.scene.isActive('Treehouse')&&window.game.scene.getScene('Treehouse').records.length===n,count);assert.deepEqual(errors,[]);
 console.log('PASS actual music purchase, owned/secret/gacha vinyl shelf, paginated collection, touch playback/stop, unchanged battle music, six illustrated manga pages, navigation/cleanup, cartridge audio handoff and ownership after reload');
}finally{await browser.close();await server.close();}
