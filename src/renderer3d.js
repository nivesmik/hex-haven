import * as THREE from '../vendor/three/three.module.js';
import {available,key,ecosystemProgress} from './engine.js';
import {placementPreview} from './placement-preview.js';
import {axialToWorld,edgeVertices,edgePoint,TILE_TOP} from './visuals/hex-layout.js';
import {NatureKit} from './visuals/nature.js';
import {tileGroup,disposeGhost,COLORS} from './visuals/hex-terrain.js';
import {createOtter,animateOtter} from './visuals/otter.js';
import {otterAnchor} from './visuals/otter-placement.js';
export class Board3D{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xe5ebe1);
  this.camera=new THREE.PerspectiveCamera(38,1,.1,180);
  this.kit=new NatureKit();this.tiles=new Map();this.spots=new Map();this.preview=null;this.highlight=new THREE.Group();this.ecology=new THREE.Group();this.scene.add(this.highlight,this.ecology);
  this.scene.add(new THREE.HemisphereLight(0xf1f4e9,0xa0ac8c,2.4));
  const sun=new THREE.DirectionalLight(0xffebce,2.2);sun.position.set(-4,9,6);this.scene.add(sun);
  this.ground=this.kit.mesh(this.scene,this.kit.geometry('ground',()=>new THREE.PlaneGeometry(180,180)),0xdce3d5,0,-.4,0);this.ground.rotation.x=-Math.PI/2;
  this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  this.onMotion=()=>this.invalidate();this.motion.addEventListener('change',this.onMotion);
  this.onVisibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=null;}else this.invalidate();};document.addEventListener('visibilitychange',this.onVisibility);
  this.onLost=e=>{e.preventDefault();cancelAnimationFrame(this.frame);this.frame=null;this.lost=true;canvas.dispatchEvent(new CustomEvent('hex-webgl-lost'));};
  this.onRestored=()=>{this.lost=false;this.invalidate();canvas.dispatchEvent(new CustomEvent('hex-webgl-restored'));};canvas.addEventListener('webglcontextlost',this.onLost);canvas.addEventListener('webglcontextrestored',this.onRestored);
 }
 resize(){
  const {width,height}=this.canvas.getBoundingClientRect();this.renderer.setSize(width,height,false);this.camera.aspect=width/Math.max(1,height);this.camera.updateProjectionMatrix();this.invalidate();
 }
 clearPreview(){
  if(this.preview){this.scene.remove(this.preview);disposeGhost(this.preview);this.preview=null;}
  for(const child of [...this.highlight.children]){this.highlight.remove(child);child.geometry.dispose();child.material.dispose();}
 }
 setGame(game,cell){
  for(const [id,entry] of this.tiles)if(game.board.get(id)!==entry.tile){this.scene.remove(entry.group);this.tiles.delete(id);}
  for(const [id,tile] of game.board)if(!this.tiles.has(id)){
   const group=tileGroup(tile,this.kit),p=axialToWorld(tile.q,tile.r);group.position.set(p.x,0,p.z);this.scene.add(group);this.tiles.set(id,{tile,group});
  }
  const frontier=game.status==='playing'?new Map(available(game.board).map(p=>[key(p.q,p.r),p])):new Map();
  for(const [id,group] of this.spots)if(!frontier.has(id)){this.scene.remove(group);this.spots.delete(id);}
  for(const [id,p] of frontier)if(!this.spots.has(id)){
   const group=new THREE.Group(),pos=axialToWorld(p.q,p.r);
   const mark=this.kit.mesh(group,this.kit.geometry('spot',()=>new THREE.CircleGeometry(.09,8)),0x9db29b,0,TILE_TOP,0);mark.rotation.x=-Math.PI/2;
   group.position.set(pos.x,0,pos.z);this.scene.add(group);this.spots.set(id,group);
  }
  for(const [id,group] of this.spots)group.visible=!cell||id!==key(cell.q,cell.r);
  this.clearPreview();const forecast=placementPreview(game,cell);
  if(forecast){
   const p=axialToWorld(cell.q,cell.r);this.preview=tileGroup({...forecast,...cell},this.kit,{ghost:true});this.preview.position.set(p.x,0,p.z);this.scene.add(this.preview);
   for(const connection of forecast.connections){
    const [a,b]=edgeVertices(connection.dir),geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x+a.x,TILE_TOP+.025,p.z+a.z),new THREE.Vector3(p.x+b.x,TILE_TOP+.025,p.z+b.z)]);
    const material=new THREE.LineBasicMaterial({color:COLORS[connection.terrain],transparent:true,opacity:connection.matches?1:.35});
    this.highlight.add(new THREE.Line(geometry,material));
    if(connection.matches){
     const m=edgePoint(connection.dir,.86),dot=new THREE.Mesh(this.kit.geometry('match',()=>new THREE.SphereGeometry(.065,6,4)),new THREE.MeshBasicMaterial({color:0xffdc88}));
     // Unique marker geometry lets all preview resources have one cleanup path.
     dot.geometry=dot.geometry.clone();dot.position.set(p.x+m.x,TILE_TOP+.055,p.z+m.z);this.highlight.add(dot);
    }
   }
  }
  const eco=ecosystemProgress(game),signature=JSON.stringify(eco&&[eco.waterTiles,eco.forestTiles,eco.river,eco.habitat,eco.vegetation,eco.otter]);
  if(signature!==this.ecoSignature){
   this.ecology.clear();this.otter=null;this.ecoSignature=signature;
   if(eco?.river){
    const tile=game.board.get(eco.waterTiles[0]),p=axialToWorld(tile.q,tile.r);
    if(eco.otter){const anchor=otterAnchor(game.board,eco);this.otter=createOtter(this.kit);this.otter.rotation.y=anchor.angle;this.otter.position.set(anchor.x,TILE_TOP,anchor.z);this.ecology.add(this.otter);}
    else{
     this.kit.mesh(this.ecology,this.kit.geometry('fish',()=>new THREE.OctahedronGeometry(.13)),0xf1ce88,p.x,TILE_TOP+.03,p.z,1.4,.35,.6);
    }
   }
   if(eco?.habitat)for(const id of eco.forestTiles){
    const tile=game.board.get(id),p=axialToWorld(tile.q,tile.r);
    this.kit.tree(this.ecology,p.x+.1,p.z-.13,eco.vegetation?.8:.4);
   }
  }
  this.invalidate();return forecast;
 }
 invalidate(){
  if(this.lost||document.hidden)return;
  if(this.otter&&this.motion.matches)animateOtter(this.otter,0,true);
  this.renderer.render(this.scene,this.camera);
  if(this.otter&&!this.motion.matches&&this.frame==null)this.frame=requestAnimationFrame(t=>this.animate(t));
 }
 animate(t){
  this.frame=null;
  if(this.lost||document.hidden||!this.otter)return;
  if(this.motion.matches){this.invalidate();return;}
  animateOtter(this.otter,t);
  this.invalidate();
 }
 projectWorld(x,y,z){const p=new THREE.Vector3(x,y,z).project(this.camera),r=this.canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
 otterPose(){return this.otter?{rootY:this.otter.position.y,headYaw:this.otter.userData.headPivot.rotation.y,tailYaw:this.otter.userData.tailPivot.rotation.y}:null;}
 stats(){return {drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,pixelRatio:this.renderer.getPixelRatio()};}
 dispose(){
  cancelAnimationFrame(this.frame);this.clearPreview();this.kit.dispose();this.renderer.dispose();
  this.motion.removeEventListener('change',this.onMotion);document.removeEventListener('visibilitychange',this.onVisibility);this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
 }
}
