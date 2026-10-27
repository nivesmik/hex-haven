import {test} from 'node:test';import assert from 'node:assert/strict';
import {MobileTileGesture} from '../src/mobile-tile-gesture.js';
test('tap, pan-before-timeout, long-press hysteresis, release and cancellation are exclusive',()=>{
 let timer,rot=0,taps=0,pans=0,starts=0,cancels=0,ends=0;
 const g=new MobileTileGesture({canRotate:c=>!!c,tap:()=>taps++,pan:()=>pans++,start:()=>starts++,rotate:s=>rot+=s,end:()=>ends++,cancel:()=>cancels++},{setTimer:fn=>(timer=fn,1),clearTimer:()=>timer=null});
 const e=x=>({clientX:x,clientY:100});g.down(e(0),{});g.up(e(0));assert.equal(taps,1);assert.equal(timer,null);
 g.down(e(0),{});g.move(e(15));assert.equal(g.state,'pan');assert.equal(timer,null);g.up(e(20));assert.equal(starts,0);assert.equal(pans,1);
 g.down(e(0),{});timer();g.move(e(35));assert.equal(rot,0);g.move(e(40));assert.equal(rot,1);g.move(e(32));assert.equal(rot,1);g.move(e(-9));assert.equal(rot,0);g.up(e(-9));assert.equal(ends,1);assert.equal(taps,1);
 g.down(e(0),{});timer();g.cancel();assert.equal(cancels,1);assert.equal(g.state,'idle');
 g.down(e(0),null);assert.equal(g.timer,null);g.up(e(0));assert.equal(starts,2);
});

test('almanac records derive from persisted discovery IDs without granting rewards',async()=>{
 const {animalDiscoveryRecords}=await import('../src/animal-discoveries.js');
 const game={ecosystem:{seen:['river','habitat','vegetation','otter']},experiment:{theme:'temperate-river',id:'living-river',seed:42}};
 const before=JSON.stringify(game),records=animalDiscoveryRecords(game);
 assert.equal(records.version,1);assert.equal(records.animals.length,1);assert.equal(records.animals[0].id,'otter');assert.equal(JSON.stringify(game),before);
 assert.deepEqual(animalDiscoveryRecords({}),{version:1,animals:[]});
});
