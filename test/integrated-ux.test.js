import {test} from 'node:test';import assert from 'node:assert/strict';
import {MobileTileGesture} from '../src/mobile-tile-gesture.js';
import {PreviewMotion} from '../src/preview-motion.js';
import {restoreSession,startSession,finishSession,mayContinue} from '../src/session-state.js';
import {CameraControls} from '../src/camera-controls.js';
import * as T from '../vendor/three/three.module.js';
import {createExperiment,serialize,place} from '../src/engine.js';
function gesture(){let time=0,id=0,taps=0,starts=0,moves=0,ends=0,rot=0;const timers=new Map(),cell={q:0,r:0};const g=new MobileTileGesture({canRotate:c=>c?.q===1,canCamera:c=>c?.q!==1,tap:()=>taps++,start(){},rotate:n=>rot+=n,end(){},cancel(){},pan(){},cameraStart:()=>starts++,cameraMove:()=>moves++,cameraEnd:()=>ends++},{now:()=>time,setTimer:(fn,ms)=>{timers.set(++id,{fn,at:time+ms});return id;},clearTimer:id=>timers.delete(id)});const advance=ms=>{time+=ms;for(const [id,t] of [...timers])if(t.at<=time){timers.delete(id);t.fn();}};const e=(x=100,y=100)=>({clientX:x,clientY:y});return {g,cell,e,advance,timers,state:()=>({taps,starts,moves,ends,rot})};}
test('background tap waits for the double-tap window; camera hold cancels pending tile cancellation',()=>{
 const a=gesture();a.g.down(a.e(),a.cell);a.g.up(a.e());assert.equal(a.state().taps,0);a.advance(100);a.g.down(a.e(),a.cell);a.advance(150);assert.equal(a.g.state,'camera');a.g.move(a.e(130));a.g.up(a.e(130));assert.deepEqual(a.state(),{taps:0,starts:1,moves:1,ends:1,rot:0});a.advance(500);assert.equal(a.state().taps,0);
 a.g.down(a.e(),a.cell);a.g.up(a.e());a.advance(240);assert.equal(a.state().taps,1);
});
test('short double-tap is inert; tile taps remain immediate; cancellation clears all delayed work',()=>{
 const a=gesture();a.g.down(a.e(),a.cell);a.g.up(a.e());a.advance(40);a.g.down(a.e(),a.cell);a.g.up(a.e());a.advance(500);assert.equal(a.state().taps,0);assert.equal(a.state().starts,0);
 a.g.down(a.e(),{q:1,r:0});a.g.up(a.e());assert.equal(a.state().taps,1);
 a.g.down(a.e(),a.cell);a.g.up(a.e());a.g.cancel();a.advance(500);assert.equal(a.state().taps,1);assert.equal(a.timers.size,0);
});
test('pan and rotation win their own thresholds and never dispatch a tap',()=>{
 const a=gesture();a.g.down(a.e(),a.cell);a.g.move(a.e(120));a.advance(500);a.g.up(a.e(120));assert.equal(a.state().taps,0);
 a.g.down(a.e(),{q:1,r:0});a.advance(400);a.g.move(a.e(145));a.g.up(a.e(145));assert.equal(a.state().rot,1);assert.equal(a.state().taps,0);
});
test('preview lift and turn retarget rather than queue, with complete reduced-motion reset',()=>{
 const p=new PreviewMotion();p.setHeld(true,0);assert.equal(p.sample(120).scale,1.07);assert.equal(p.sample(240).scale,1.03);assert.equal(p.sample(240).height,.04);p.turn(1,250);p.turn(1,270);assert.ok(p.sample(270).turn>Math.PI/3);assert.equal(p.sample(400).turn,0);p.setHeld(false,410);assert.deepEqual(p.sample(540),{scale:1,height:0,turn:0,active:false});assert.deepEqual(p.sample(100,true),{scale:1,height:0,turn:0,active:false});
});
test('legacy game migration preserves snapshots and separates abandoned, failed and passed attempts',()=>{
 const game=createExperiment(),before=JSON.stringify(serialize(game)),s=restoreSession(null,{experiment:game});assert.equal(mayContinue(s,game),true);finishSession(s,game,true);assert.equal(mayContinue(s,game),false);assert.equal(s.slots.experiment.status,'abandoned');assert.equal(JSON.stringify(serialize(game)),before);assert.deepEqual(restoreSession(s),s);
 startSession(s,game);assert.equal(mayContinue(s,game),true);game.status='lost';finishSession(s,game);assert.equal(s.slots.experiment.status,'failed');game.status='won';finishSession(s,game);assert.equal(s.slots.experiment.status,'passed');assert.equal(mayContinue(s,game),false);
});
test('world pan limits grow with the board; strategic mode has distinct enter/exit thresholds',()=>{
 const el={addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:1024,height:768})},camera=new T.PerspectiveCamera(38,1024/768,.1,180),c=new CameraControls(el,camera,()=>{},()=>{}),g=createExperiment();c.setBoard(g.board);const first=c.bounds.maxX;c.target.set(1000,0,-1000);c.update();assert.ok(c.target.x<10&&c.target.z>-10);place(g,1,0);c.setBoard(g.board);assert.ok(c.bounds.maxX>first);c.distance=25;c.update();assert.equal(c.strategic,true);c.distance=22;c.update();assert.equal(c.strategic,true);c.distance=19;c.update();assert.equal(c.strategic,false);c.dispose();
});
