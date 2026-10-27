import * as THREE from '../vendor/three/three.module.js';
import {TILE_TOP,worldToAxial,axialToWorld} from './visuals/hex-layout.js';
export class CameraControls{
 constructor(canvas,camera,onChange,onTap){
  this.canvas=canvas;this.camera=camera;this.onChange=onChange;this.onTap=onTap;this.points=new Map();this.listeners=[];this.reset();
  const listen=(type,fn,options)=>{canvas.addEventListener(type,fn,options);this.listeners.push([type,fn,options]);};
  listen('contextmenu',e=>e.preventDefault());
  listen('pointerdown',e=>{
   if(e.pointerType==='mouse'&&![0,2].includes(e.button))return;
   e.preventDefault();canvas.setPointerCapture(e.pointerId);
   this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(this.points.size===1){this.start={id:e.pointerId,x:e.clientX,y:e.clientY};this.moved=false;this.pan=e.shiftKey||e.button===2;}
   else this.moved=true;
  });
  listen('pointermove',e=>{
   const prev=this.points.get(e.pointerId);if(!prev)return;
   const old=[...this.points.values()],next={x:e.clientX,y:e.clientY};this.points.set(e.pointerId,next);
   const dx=next.x-prev.x,dy=next.y-prev.y;
   if(this.points.size>=2){
    const now=[...this.points.values()],dist=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    if(dist(old)>1&&dist(now)>1)this.distance*=dist(old)/dist(now);
    this.translate(dx/2,dy/2);this.moved=true;
   }else{
    if(this.start&&Math.hypot(next.x-this.start.x,next.y-this.start.y)>8)this.moved=true;
    if(this.moved){if(this.pan)this.translate(dx,dy);else{this.angle-=dx*.008;this.elevation+=dy*.006;}}
   }
   if(this.moved)this.update();
  });
  listen('pointerup',e=>{
   if(!this.points.has(e.pointerId))return;
   const tap=this.points.size===1&&!this.moved&&this.start?.id===e.pointerId&&Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)<=8;
   this.points.delete(e.pointerId);if(tap)this.onTap(this.pick(e.clientX,e.clientY));
   if(!this.points.size)this.start=null;
  });
  const cancel=e=>{if(this.points.has(e.pointerId)){this.points.delete(e.pointerId);this.moved=true;this.start=null;}};
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
 translate(dx,dy){
  const scale=this.distance/Math.max(this.canvas.clientHeight,1)*.75;
  this.target.x+=(-dx*Math.cos(this.angle)+dy*Math.sin(this.angle))*scale;
  this.target.z+=(dx*Math.sin(this.angle)+dy*Math.cos(this.angle))*scale;
 }
 zoom(factor){this.distance*=factor;this.update();}
 update(){
  this.distance=Math.max(6,Math.min(42,this.distance));this.elevation=Math.max(.4,Math.min(1.3,this.elevation));
  this.camera.position.set(this.target.x+Math.sin(this.angle)*Math.cos(this.elevation)*this.distance,Math.sin(this.elevation)*this.distance,this.target.z+Math.cos(this.angle)*Math.cos(this.elevation)*this.distance);
  this.camera.lookAt(this.target);this.camera.updateMatrixWorld();this.onChange?.();
 }
 pick(x,y){
  const r=this.canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);
  const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-TILE_TOP),new THREE.Vector3());
  return point?worldToAxial(point.x,point.z):null;
 }
 dispose(){for(const args of this.listeners)this.canvas.removeEventListener(...args);this.points.clear();}
}
