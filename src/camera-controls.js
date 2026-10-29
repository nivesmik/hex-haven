import {available} from './engine.js';
import {MobileTileGesture} from './mobile-tile-gesture.js';
import * as THREE from '../vendor/three/three.module.js';
import {TILE_TOP,worldToAxial,axialToWorld} from './visuals/hex-layout.js';
export class CameraControls{
 constructor(canvas,camera,onChange,onTap,tileCallbacks=null){
  this.canvas=canvas;this.camera=camera;this.onChange=onChange;this.onTap=onTap;this.points=new Map();this.listeners=[];this.reset();
  if(tileCallbacks)this.touch=new MobileTileGesture({...tileCallbacks,tap:onTap,pan:(...args)=>{this.translate(...args);this.update();},cameraMove:(dx,dy)=>{this.angle-=dx*.008;this.distance*=Math.exp(dy*.008);this.update();}});
  const listen=(type,fn,options)=>{canvas.addEventListener(type,fn,options);this.listeners.push([type,fn,options]);};
  for(const event of ['contextmenu','selectstart','dragstart'])listen(event,e=>{if(e.cancelable)e.preventDefault();},{passive:false});
  listen('pointerdown',e=>{
   if(e.pointerType==='mouse'&&![0,2].includes(e.button))return;
   this.stopFocus();this.stopViewTransition();if(e.cancelable)e.preventDefault();canvas.setPointerCapture(e.pointerId);
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
   if(e.pointerType==='touch'&&this.touch){this.touch.up(e);this.points.delete(e.pointerId);if(!this.points.size)this.settleBounds();return;}
   const tap=!this.pan&&this.points.size===1&&!this.moved&&this.start?.id===e.pointerId&&Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)<=8;
   this.points.delete(e.pointerId);if(tap)this.onTap(this.pick(e.clientX,e.clientY),{pointerType:e.pointerType});
   if(!this.points.size){this.start=null;this.settleBounds();}
  });
  const cancel=e=>{if(this.points.has(e.pointerId)){this.touch?.cancel();this.points.delete(e.pointerId);this.moved=true;this.start=null;}};
  listen('pointercancel',cancel);listen('lostpointercapture',cancel);
  this.extraListeners=[];if(globalThis.window&&globalThis.document){const blur=()=>this.cancelInputs(),hidden=()=>{if(document.hidden)this.cancelInputs();};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);this.extraListeners.push([window,'blur',blur],[document,'visibilitychange',hidden]);}
  listen('wheel',e=>{e.preventDefault();this.zoom(e.deltaY>0?1.08:1/1.08);},{passive:false});
 }
 reset(){this.stopFocus();this.stopViewTransition();this.strategic=false;this.landscapeElevation=.9;this.angle=.6;this.elevation=.9;this.distance=17;this.target=new THREE.Vector3();this.update();}
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
 zoom(factor){this.stopFocus();this.distance*=factor;this.update();}
 update(){
  this.distance=Math.max(6,Math.min(42,this.distance));this.elevation=Math.max(.4,Math.min(1.3,this.elevation));
  this.camera.position.set(this.target.x+Math.sin(this.angle)*Math.cos(this.elevation)*this.distance,Math.sin(this.elevation)*this.distance,this.target.z+Math.cos(this.angle)*Math.cos(this.elevation)*this.distance);
  this.camera.lookAt(this.target);this.camera.updateMatrixWorld();
  if(this.bounds){const target=this.limitedTarget(true);if(target.distanceTo(this.target)>1e-8){this.target.copy(target);this.camera.position.set(this.target.x+Math.sin(this.angle)*Math.cos(this.elevation)*this.distance,Math.sin(this.elevation)*this.distance,this.target.z+Math.cos(this.angle)*Math.cos(this.elevation)*this.distance);this.camera.lookAt(this.target);this.camera.updateMatrixWorld();}}
  if(!this.focus)this.updateViewMode();this.onChange?.();
 }
 focusPose(cell,rect){
  const canvasRect=this.canvas.getBoundingClientRect(),camera=this.camera.clone();
  const center=axialToWorld(cell.q,cell.r),target=new THREE.Vector3(center.x,0,center.z);
  const desired={x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2};
  const project=p=>{const v=p.clone().project(camera);return {x:canvasRect.left+(v.x+1)*canvasRect.width/2,y:canvasRect.top+(1-v.y)*canvasRect.height/2};};
  const sample=[];
  for(const [dq,dr] of [[0,0],[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){
   const p=axialToWorld(cell.q+dq,cell.r+dr);
   for(let i=0;i<6;i++)for(const y of [TILE_TOP,.95])sample.push(new THREE.Vector3(p.x+Math.cos(i*Math.PI/3+Math.PI/6),y,p.z+Math.sin(i*Math.PI/3+Math.PI/6)));
  }
  const pose=distance=>{
   target.set(center.x,0,center.z);
   const apply=()=>{camera.position.set(target.x+Math.sin(this.angle)*Math.cos(this.elevation)*distance,Math.sin(this.elevation)*distance,target.z+Math.cos(this.angle)*Math.cos(this.elevation)*distance);camera.lookAt(target);camera.updateMatrixWorld();};
   apply();
   const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((desired.x-canvasRect.left)/canvasRect.width*2-1,-(desired.y-canvasRect.top)/canvasRect.height*2+1),camera);
   const beneath=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-TILE_TOP),new THREE.Vector3());
   if(beneath){target.x+=center.x-beneath.x;target.z+=center.z-beneath.z;}apply();
   const points=sample.map(project),bounds={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
   return {target:target.clone(),distance,bounds,fits:bounds.left>=rect.left&&bounds.right<=rect.right&&bounds.top>=rect.top&&bounds.bottom<=rect.bottom};
  };
  let result=pose(this.distance);if(result.fits)return result;
  let low=this.distance,high=42;result=pose(high);if(!result.fits)return result;
  for(let i=0;i<20;i++){const mid=(low+high)/2;if(pose(mid).fits)high=mid;else low=mid;}
  return pose(high);
 }
 focusCell(cell,rect,{duration=260,reducedMotion=false}={}){
  this.stopFocus();const to=this.focusPose(cell,rect),from={target:this.target.clone(),distance:this.distance};
  if(reducedMotion){this.target.copy(to.target);this.distance=to.distance;this.update();return;}
  const focus={start:null,frame:null};this.focus=focus;
  const frame=now=>{if(this.focus!==focus)return;if(focus.start===null)focus.start=now;const t=Math.min(1,(now-focus.start)/duration),ease=t*t*(3-2*t);
   this.target.lerpVectors(from.target,to.target,ease);this.distance=from.distance+(to.distance-from.distance)*ease;this.update();
   if(t<1)focus.frame=requestAnimationFrame(frame);else{this.focus=null;this.updateViewMode();}
  };focus.frame=requestAnimationFrame(frame);
 }
 stopFocus(){if(this.focus?.frame!=null)cancelAnimationFrame(this.focus.frame);this.focus=null;}
 setBoard(board){
  const points=[...board.values(),...available(board)].map(p=>axialToWorld(p.q,p.r));
  this.bounds=points.length?{minX:Math.min(...points.map(p=>p.x))-1,maxX:Math.max(...points.map(p=>p.x))+1,minZ:Math.min(...points.map(p=>p.z))-1,maxZ:Math.max(...points.map(p=>p.z))+1}:null;
 }
 limitedTarget(soft=false){
  if(!this.bounds)return this.target.clone();const r=this.canvas.getBoundingClientRect();
  const points=[[0,0],[r.width,0],[0,r.height],[r.width,r.height]].map(([x,y])=>this.pointOnBoard(r.left+x,r.top+y)).filter(Boolean);
  const span=axis=>points.length?Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis])):this.distance;
  const marginX=Math.max(.2,Math.min(2,span('x')*.125)),marginZ=Math.max(.2,Math.min(2,span('z')*.125));
  const limit=(v,min,max,margin)=>{let lo=min+1.7-margin,hi=max-1.7+margin;if(lo>hi)lo=hi=(min+max)/2;const clamped=Math.max(lo,Math.min(hi,v)),delta=v-clamped;return clamped+(soft?delta/(1+Math.abs(delta)*4):0);};
  return new THREE.Vector3(limit(this.target.x,this.bounds.minX,this.bounds.maxX,marginX),0,limit(this.target.z,this.bounds.minZ,this.bounds.maxZ,marginZ));
 }
 settleBounds(){
  if(!this.bounds||this.focus)return;const to=this.limitedTarget();if(to.distanceTo(this.target)<.001)return;
  const from=this.target.clone(),animation={frame:null,start:null};this.focus=animation;
  const frame=now=>{if(this.focus!==animation)return;if(animation.start===null)animation.start=now;const t=Math.min(1,(now-animation.start)/140);this.target.lerpVectors(from,to,1-(1-t)**3);this.update();if(t<1)animation.frame=requestAnimationFrame(frame);else{this.focus=null;this.updateViewMode();}};animation.frame=requestAnimationFrame(frame);
 }
 updateViewMode(){
  const normalized=this.distance*Math.sqrt(Math.min(1,this.camera.aspect));let next=this.strategic;
  if(!next&&normalized>24)next=true;else if(next&&normalized<20)next=false;if(next===this.strategic)return;
  if(next)this.landscapeElevation=this.elevation;this.strategic=next;
  this.stopViewTransition();const from=this.elevation,to=next?1.22:this.landscapeElevation;
  if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){this.elevation=to;return;}
  let start=null;const animate=now=>{if(start===null)start=now;const t=Math.min(1,(now-start)/240);this.elevation=from+(to-from)*t*t*(3-2*t);this.update();if(t<1)this.viewFrame=requestAnimationFrame(animate);else this.viewFrame=null;};
  if(globalThis.requestAnimationFrame)this.viewFrame=requestAnimationFrame(animate);else this.elevation=to;
 }
 stopViewTransition(){if(this.viewFrame!=null)cancelAnimationFrame(this.viewFrame);this.viewFrame=null;}
 pauseInputs(){if(['rotate','camera'].includes(this.touch?.state))this.touch.up({clientX:this.touch.previous.x,clientY:this.touch.previous.y});this.cancelInputs();}
 cancelInputs(){this.touch?.cancel();const ids=[...this.points.keys()];this.points.clear();this.start=null;this.moved=true;for(const id of ids)if(this.canvas.hasPointerCapture?.(id))this.canvas.releasePointerCapture(id);this.stopFocus();this.stopViewTransition();}
 pointOnBoard(x,y){
  const r=this.canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);
  const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-TILE_TOP),new THREE.Vector3());
  return point;
 }
 pick(x,y){const point=this.pointOnBoard(x,y);return point?worldToAxial(point.x,point.z):null;}
 dispose(){this.cancelInputs();for(const [target,type,fn] of this.extraListeners??[])target.removeEventListener(type,fn);for(const args of this.listeners)this.canvas.removeEventListener(...args);this.points.clear();}
}
