import {test} from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {CameraControls} from '../src/camera-controls.js';
import {undoEnabled} from '../src/play-policy.js';
const setup=(width,height)=>{const canvas={addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width,height})};return new CameraControls(canvas,new THREE.PerspectiveCamera(38,width/height,.1,180),()=>{},()=>{});};
test('focus fits selected cell plus six neighbors and preserves angle/manual distance when sufficient',()=>{
 for(const [width,height,top,bottom] of [[390,844,170,680],[844,390,132,280],[768,1024,170,860],[1024,768,170,604],[320,568,170,400]]){
  const c=setup(width,height),rect={left:16,right:width-76,top,bottom};
  for(const angle of [.6,2.8,5.3])for(const distance of [6,17,35]){
   c.angle=angle;c.distance=distance;c.update();const result=c.focusPose({q:3,r:-2},rect);
   assert.ok(result.fits,JSON.stringify({width,height,angle,distance,result}));assert.ok(result.distance>=distance);assert.equal(c.distance,distance);assert.equal(c.angle,angle);
   c.target.copy(result.target);c.distance=result.distance;c.update();const p=new THREE.Vector3(Math.sqrt(3)*(3-1),.12,-3).project(c.camera);
   assert.ok(Math.abs((p.x+1)*width/2-(rect.left+rect.right)/2)<1e-7);assert.ok(Math.abs((1-p.y)*height/2-(top+bottom)/2)<1e-7);
   assert.deepEqual(c.pick((p.x+1)*width/2,(1-p.y)*height/2),{q:3,r:-2});
   const repeat=c.focusPose({q:3,r:-2},rect);assert.equal(repeat.distance,result.distance);
  }
  c.dispose();
 }
});
test('new input interrupts smooth focus without a late frame changing the camera',()=>{
 const oldRAF=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;let frame,cancelled=false;
 globalThis.requestAnimationFrame=fn=>(frame=fn,1);globalThis.cancelAnimationFrame=()=>cancelled=true;
 try{const c=setup(390,844);c.focusCell({q:2,r:0},{left:16,right:314,top:170,bottom:680});frame(0);frame(130);const target=c.target.clone();c.stopFocus();frame(260);assert.deepEqual(c.target,target);assert.equal(cancelled,true);
 c.focusCell({q:2,r:0},{left:16,right:314,top:170,bottom:680},{reducedMotion:true});assert.equal(c.focus,null);c.dispose();
 }finally{globalThis.requestAnimationFrame=oldRAF;globalThis.cancelAnimationFrame=oldCancel;}
});
test('undo requires an explicit test-only URL flag',()=>{
 for(const query of ['', '?testUndo=0','?undo=1','?testUndo=true'])assert.equal(undoEnabled(query),false);
 assert.equal(undoEnabled('?testUndo=1'),true);assert.equal(undoEnabled('?fresh=1&testUndo=1'),true);
});
