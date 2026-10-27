import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createExperiment,serialize,DIRECTIONS,place,objectives} from '../src/engine.js';
import {axialToWorld,worldToAxial,edgeVertices,TILE_TOP} from '../src/visuals/hex-layout.js';
import {CameraControls} from '../src/camera-controls.js';
import {placementPreview} from '../src/placement-preview.js';
import {wedgeGeometry,tileGroup} from '../src/visuals/hex-terrain.js';
import {NatureKit} from '../src/visuals/nature.js';
import {createOtter} from '../src/visuals/otter.js';

test('3D edges face all engine neighbors and share identical terrain boundaries',()=>{
 for(let dir=0;dir<6;dir++){
  const [q,r]=DIRECTIONS[dir],center=axialToWorld(q,r),a=edgeVertices(dir),opposite=edgeVertices((dir+3)%6);
  for(const vertex of a)assert.ok(opposite.some(v=>Math.hypot(v.x+center.x-vertex.x,v.z+center.z-vertex.z)<1e-9));
  const g=wedgeGeometry(dir);assert.ok(g.getAttribute('normal').getY(0)>.99);g.dispose();
 }
 for(let q=-8;q<=8;q++)for(let r=-8;r<=8;r++){const p=axialToWorld(q,r);const result=worldToAxial(p.x,p.z);assert.equal(result.q,q);assert.equal(result.r,r);}
});
function canvas(){const listeners=new Map();return {listeners,clientHeight:844,clientWidth:390,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:390,height:844})};}
test('ray selection stays correct across azimuth, zoom, elevation and pan',()=>{
 const el=canvas(),cam=new THREE.PerspectiveCamera(38,390/844,.1,180),controls=new CameraControls(el,cam,()=>{},()=>{});
 for(const angle of [0,.7,Math.PI,5.8])for(const distance of [8,22])for(const elevation of [.45,1.2]){
  controls.angle=angle;controls.distance=distance;controls.elevation=elevation;controls.target.set(.4,0,-.8);controls.update();
  for(const [q,r] of [[0,0],[1,-1],[-2,1]]){
   const p=axialToWorld(q,r),ndc=new THREE.Vector3(p.x,TILE_TOP,p.z).project(cam);
   assert.deepEqual(controls.pick((ndc.x+1)*195,(1-ndc.y)*422),{q,r});
  }
 }
 controls.dispose();assert.equal(el.listeners.size,0);
});
test('drag, cancelled gestures and two-finger pinch never select a tile',()=>{
 const el=canvas(),cam=new THREE.PerspectiveCamera(38,390/844,.1,180),taps=[];
 const controls=new CameraControls(el,cam,()=>{},p=>taps.push(p));
 const e=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,preventDefault(){}});
 const fire=(name,event)=>el.listeners.get(name)(event);
 fire('pointerdown',e(1,195,422));fire('pointerup',e(1,195,422));assert.equal(taps.length,1);
 fire('pointerdown',e(1,195,422));fire('pointermove',e(1,230,422));fire('pointerup',e(1,230,422));assert.equal(taps.length,1);
 fire('pointerdown',e(1,100,422));fire('pointerdown',e(2,200,422));const before=controls.distance;
 fire('pointermove',e(2,250,422));assert.ok(controls.distance<before);
 fire('pointerup',e(2,250,422));fire('pointerup',e(1,100,422));assert.equal(taps.length,1);
 fire('pointerdown',e(1,195,422));fire('pointercancel',e(1,195,422));fire('pointerup',e(1,195,422));assert.equal(taps.length,1);
 // Coalesced pointermove absence must not turn a long drag into a tap.
 fire('pointerdown',e(1,195,422));fire('pointerup',e(1,230,422));assert.equal(taps.length,1);
 controls.dispose();
});
test('forecast is side-effect free and agrees with actual placement for every rotation and mode',()=>{
 for(const mode of ['comfort','standard','challenge'])for(let rotation=0;rotation<6;rotation++){
  const g=createExperiment(mode,202607);g.rotation=rotation;
  const before=JSON.stringify(serialize(g)),predicted=placementPreview(g,{q:1,r:0});
  assert.equal(JSON.stringify(serialize(g)),before);
  const result=place(g,1,0);assert.equal(predicted.points,result.points);
  const after=serialize(g);assert.deepEqual(predicted.after,objectives(g));
  assert.equal(after.score,predicted.points);
 }
});
test('low-poly assets share resources, terrain sits above the base, otter has no ecology preconditions',()=>{
 const kit=new NatureKit(),tile={edges:['grass','forest','water','village','grass','water'],special:true};
 const a=tileGroup(tile,kit),count=kit.geometries.length,b=tileGroup(tile,kit);
 assert.equal(kit.geometries.length,count);assert.ok(a.children.length>6);assert.ok(b.children.length>6);
 assert.ok(a.children[0].position.y+.11<TILE_TOP);
 const otter=createOtter(kit);assert.ok(otter.children.length>=5);kit.dispose();
});

test('forecast includes new stars when predicting a clear, without firing discovery events',()=>{
 const g=createExperiment('comfort',7);g.target=1;g.experiment.goals={water:1,forest:1};
 g.board=new Map([['0,0',{q:0,r:0,edges:['forest','water','forest','forest','forest','forest']}]]);
 g.deck=[{id:'bank',edges:Array(6).fill('forest'),special:false}];
 const before=JSON.stringify(serialize(g)),forecast=placementPreview(g,{q:1,r:0});
 assert.equal(forecast.before.complete,false);assert.equal(forecast.after.complete,true);assert.equal(JSON.stringify(serialize(g)),before);
 place(g,1,0);assert.equal(g.status,'won');assert.deepEqual(forecast.after,objectives(g));
});
