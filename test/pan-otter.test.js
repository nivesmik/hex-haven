import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {CameraControls} from '../src/camera-controls.js';
import {NatureKit} from '../src/visuals/nature.js';
import {createOtter,animateOtter} from '../src/visuals/otter.js';
import {otterAnchor} from '../src/visuals/otter-placement.js';
import {createExperiment,ecosystemProgress} from '../src/engine.js';
import {TILE_TOP} from '../src/visuals/hex-layout.js';
const canvas=()=>({clientHeight:800,addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:1280,height:800})});
const screen=(world,camera)=>{const p=world.clone().project(camera);return {x:(p.x+1)*640,y:(1-p.y)*400};};
test('plane grabbing follows horizontal/vertical drag at every tested camera orbit, pitch and zoom',()=>{
 const camera=new THREE.PerspectiveCamera(38,1280/800,.1,180),controls=new CameraControls(canvas(),camera,()=>{},()=>{});
 for(const angle of [0,.6,Math.PI/2,Math.PI,5.8])for(const elevation of [.4,.9,1.3])for(const distance of [8,22]){
  controls.angle=angle;controls.elevation=elevation;controls.distance=distance;controls.target.set(.5,0,-.7);controls.update();
  for(const [dx,dy] of [[60,0],[-60,0],[0,45],[0,-45],[40,-30]]){
   const point=controls.pointOnBoard(680,430);controls.translate(dx,dy,680,430);controls.update();const p=screen(point,camera);
   assert.ok(Math.abs(p.x-680-dx)<1e-7);assert.ok(Math.abs(p.y-430-dy)<1e-7);
  }
 }
});
test('seated otter has grounded support/feet and its root never floats during head/tail motion',()=>{
 const kit=new NatureKit(),otter=createOtter(kit);otter.position.y=TILE_TOP;
 const stone=otter.getObjectByName('support-stone');stone.geometry.computeBoundingBox();
 assert.ok(Math.abs(stone.position.y+stone.geometry.boundingBox.min.y)<1e-7); // Float32 geometry tolerance
 for(const foot of otter.children.filter(o=>o.name==='grounded-foot')){
  foot.geometry.computeBoundingBox();const bottom=foot.position.y+foot.geometry.boundingBox.min.y*foot.scale.y;
  assert.ok(bottom>=.18&&bottom<=.21);
 }
 const head=otter.userData.headPivot,tail=otter.userData.tailPivot;
 for(const t of [0,700,2300,7800]){
  animateOtter(otter,t);assert.equal(otter.position.y,TILE_TOP);assert.equal(otter.rotation.y,0);
  assert.ok(Math.abs(head.rotation.y)<=.16&&Math.abs(tail.rotation.y)<=.1);assert.ok(head.position.y>.7);
 }
 animateOtter(otter,900,true);assert.equal(head.rotation.y,0);assert.equal(tail.rotation.y,0);kit.dispose();
});
test('otter anchoring uses a real bank for mixed and neighboring terrain without changing discovery rules',()=>{
 const g=createExperiment('comfort',7);g.experiment.goals={water:1,forest:1};
 g.board=new Map([['0,0',{q:0,r:0,edges:['water','water','forest','forest','forest','water']}]]);
 let eco=ecosystemProgress(g);assert.equal(eco.otter,true);let anchor=otterAnchor(g.board,eco);assert.equal(anchor.supportTile,'0,0');
 g.board=new Map([['0,0',{q:0,r:0,edges:Array(6).fill('water')}],['1,0',{q:1,r:0,edges:Array(6).fill('forest')}]]);
 eco=ecosystemProgress(g);anchor=otterAnchor(g.board,eco);assert.equal(eco.otter,true);assert.equal(anchor.supportTile,'1,0');
 assert.ok(Number.isFinite(anchor.angle)&&Number.isFinite(anchor.x));
});
