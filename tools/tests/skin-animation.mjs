import assert from 'node:assert/strict';
import {stepSkinAnimation,skinRunFrame,skinAirFrame,skinMoveFrame,skinOrigin} from '../../src/fighters/skinAnimation.js';

/** Model a fixed-speed fighter drawing at different refresh rates. */
function sample(stride=1,repeat=1,own=false){
  const f={anim:0,hurtAnim:16,vx:4,def:{runCycle:[0,8],ownAnims:own,jumpV:-9},sheets:{run:'run',jump:'jump',fall:'fall'},scene:{textures:{get:key=>({frameTotal:key==='run'?25:5})}}};
  const poses=[];
  for(let tick=0;tick<=240;tick+=stride){
    for(let draw=0;draw<repeat;draw++){stepSkinAnimation(f,tick);const pose=skinRunFrame(f);if(tick%2===0&&draw===repeat-1)poses.push([tick,pose.frame,f.anim,f.hurtAnim]);}
  }
  return {poses,f};
}
for(const own of [false,true]){
  assert.deepEqual(sample(1,2,own).poses,sample(1,1,own).poses,'120Hz must not double animation');
  assert.deepEqual(sample(2,1,own).poses,sample(1,1,own).poses,'30Hz must follow the same stride');
}
const {f}=sample();const before={...f.skinClock};stepSkinAnimation(f,240);skinRunFrame(f);
assert.equal(f.anim,240);assert.equal(f.hurtAnim,0);assert.equal(f.skinClock.gait,before.gait,'redraw cannot move the feet');
const up=[-9,-8,-6,-4,-2,-.1].map(vy=>skinAirFrame({...f,vy}).frame);
const down=[0,1,2,3,4,5,6.5].map(vy=>skinAirFrame({...f,vy}).frame);
assert.deepEqual(up,[0,0,1,2,3,3]);assert.deepEqual(down,[0,0,1,1,2,3,3]);
assert.equal(skinMoveFrame([100,30,1],23,24),129,'shortened attacks must finish recovery');
assert.equal(skinMoveFrame([100,30,1],5,24,6),105,'compressed recovery must preserve contact timing');
assert.equal(skinMoveFrame([100,30,1],8,30),108,'matching authored hit poses must keep timing');
assert.equal(skinMoveFrame([100,8,2,1],16,100),100,'looping holds remain loops');
assert.deepEqual(skinOrigin([.44,.95],true),[.56,.95]);
console.log('PASS fixed-clock animation at 30/60/120Hz, repeat draws, 24-cel stride timing, air poses, recovery, foot pivots');
