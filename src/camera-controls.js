import {MobileTileGesture} from './mobile-tile-gesture.js';
import * as THREE from '../vendor/three/three.module.js';
import {TILE_TOP,worldToAxial,axialToWorld} from './visuals/hex-layout.js';
export class CameraControls{
 constructor(canvas,camera,onChange,onTap,tileCallbacks=null){
  this.canvas=canvas;this.camera=camera;this.onChange=onChange;this.onTap=onTap;this.points=new Map();this.listeners=[];this.reset();
  if(tileCallbacks)this.touch=new MobileTileGesture({...tileCallbacks,tap:onTap,pan:(...args)=>{this.translate(...args);this.update();}});
  const listen=(type,fn,options)=>{canvas.addEventListener(type,fn,options);this.listeners.push([type,fn,options]);};
  listen('contextmenu',e=>e.preventDefault());
  listen('pointerdown',e=>{
   if(e.pointerType==='mouse'&&![0,2].includes(e.button))return;
   e.preventDefault();canvas.setPointerCapture(e.pointerId);
   this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(e.pointerType==='touch'&&this.touch){if(this.points.size===1)this.touch.down(e,this.pick(e.clientX,e.clientY));else this.touch.cancel();}
   if(this.points.size===1){this.start={id:e.pointerId,x:e.clientX,y:e.clientY};this.moved=false;this.pan=e.shiftKey||e.button===2;}
   else this.moved=true;
  });
  listen('pointermove',e=>{
   const prev=this.points.get(e.pointerId);if(!prev)return;
   const old=[...this.points.values()],next={x:e.clientX,y:e.clientY};this.points.set(e.pointerId,next);
   const dx=next.x-prev.x,dy=next.y-prev.y;
   if(e.pointerType==='touch'&&this.touch&&this.points.size===1){if(this.touch.state!=='idle')this.touch.move(e);return;}
   if(this.points.size>=2){
    const now=[...this.points.values()],dist=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    if(dist(old)>1&&dist(now)>1)this.distance*=dist(old)/dist(now);
    const centroid=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});
    const a=centroid(old),b=centroid(now);this.translate(b.x-a.x,b.y-a.y,a.x,a.y);this.moved=true;
   }else{
    const wasMoved=this.moved;
    if(this.start&&Math.hypot(next.x-this.start.x,next.y-this.start.y)>8)this.moved=true;
    const origin=this.pan&&!wasMoved?this.start:prev;
    if(this.moved){if(this.pan)this.translate(next.x-origin.x,next.y-origin.y,origin.x,origin.y);else{this.angle-=dx*.008;this.elevation+=dy*.006;}}
   }
   if(this.moved)this.update();
  });
  listen('pointerup',e=>{
   if(!this.points.has(e.pointerId))return;
   if(e.pointerType==='touch'&&this.touch){this.touch.up(e);this.points.delete(e.pointerId);return;}
   const tap=!this.pan&&this.points.size===1&&!this.moved&&this.start?.id===e.pointerId&&Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)<=8;
   this.points.delete(e.pointerId);if(tap)this.onTap(this.pick(e.clientX,e.clientY));
   if(!this.points.size)this.start=null;
  });
  const cancel=e=>{if(this.points.has(e.pointerId)){this.touch?.cancel();this.points.delete(e.pointerId);this.moved=true;this.start=null;}};
  listen('pointercancel',cancel);listen('lostpointercapture',cancel);
  listen('wheel',e=>{e.preventDefault();this.zoom(e.deltaY>0?1.08:1/1.08);},{passive:false});
 }
 reset(){this.angle=.6;this.elevation=.9;this.distance=17;this.target=new THREE.Vector3();this.update();}
 center(board){
  this.reset();
  const points=[...board.values()].map(t=>axialToWorld(t.q,t.r));if(!points.length)return;
  this.target.x=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2;
  this.target.z=(Math.min(...points.map(p=>p.z))+Math.max(...points.map(p=>p.z)))/2;
  const radius=Math.max(...points.map(p=>Math.hypot(p.x-this.target.x,p.z-this.target.z)))+1;
  const halfH=THREE.MathUtils.degToRad(this.camera.fov/2),halfW=Math.atan(Math.tan(halfH)*this.camera.aspect);
  this.distance=Math.max(17,radius/Math.sin(Math.min(halfH,halfW)*.85));this.update();
 }
 translate(dx,dy,anchorX,anchorY){
  const rect=this.canvas.getBoundingClientRect();
  const x=anchorX??rect.left+rect.width/2,y=anchorY??rect.top+rect.height/2;
  // Grab the board plane: the world point under the old screen position must
  // arrive at the new screen position. No angle-specific sign approximations.
  const before=this.pointOnBoard(x,y),after=this.pointOnBoard(x+dx,y+dy);
  if(before&&after){this.target.x+=before.x-after.x;this.target.z+=before.z-after.z;}
 }
 zoom(factor){this.distance*=factor;this.update();}
 update(){
  this.distance=Math.max(6,Math.min(42,this.distance));this.elevation=Math.max(.4,Math.min(1.3,this.elevation));
  this.camera.position.set(this.target.x+Math.sin(this.angle)*Math.cos(this.elevation)*this.distance,Math.sin(this.elevation)*this.distance,this.target.z+Math.cos(this.angle)*Math.cos(this.elevation)*this.distance);
  this.camera.lookAt(this.target);this.camera.updateMatrixWorld();this.onChange?.();
 }
 pointOnBoard(x,y){
  const r=this.canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);
  const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-TILE_TOP),new THREE.Vector3());
  return point;
 }
 pick(x,y){const point=this.pointOnBoard(x,y);return point?worldToAxial(point.x,point.z):null;}
 dispose(){this.touch?.cancel();for(const args of this.listeners)this.canvas.removeEventListener(...args);this.points.clear();}
}
