import * as THREE from '../../vendor/three/three.module.js';
import {edgeVertices,edgePoint,TILE_TOP} from './hex-layout.js';
export const COLORS={grass:0xa7bf83,forest:0x648c68,water:0x74b5be,village:0xcbb592};
export function wedgeGeometry(dir){
 const [a,b]=edgeVertices(dir),g=new THREE.BufferGeometry();
 // Winding faces +Y; full radius gives neighboring tiles exactly shared edges.
 g.setAttribute('position',new THREE.Float32BufferAttribute([0,TILE_TOP,0,b.x,TILE_TOP,b.z,a.x,TILE_TOP,a.z],3));g.computeVertexNormals();return g;
}
export function tileGroup(tile,kit,{ghost=false,decorations=true}={}){
 const g=new THREE.Group();
 const base=kit.mesh(g,kit.geometry('hex-base',()=>new THREE.CylinderGeometry(1,1,.22,6)),0xb1a18a,0,-.02,0);

 for(let dir=0;dir<6;dir++){
  const terrain=tile.edges[dir],material=kit.material(COLORS[terrain]);
  const top=new THREE.Mesh(kit.geometry('wedge-'+dir,()=>wedgeGeometry(dir)),material);top.renderOrder=ghost?3:0;g.add(top);
  if(!decorations)continue;
  const p=edgePoint(dir,.48);
  if(terrain==='forest')kit.tree(g,p.x,p.z,.75+(dir%2)*.12);
  if(terrain==='village'&&dir%2===0)kit.house(g,p.x,p.z);
  if(terrain==='grass'&&dir===0)kit.rock(g,p.x*.5,p.z*.5);
 }
 if(decorations&&!tile.special&&tile.edges.filter(t=>t==='forest'||t==='grass').length>=4&&Math.abs((tile.q??0)*7+(tile.r??0)*11)%4===0)kit.mountain(g);
 if(tile.special){
  const star=kit.mesh(g,kit.geometry('special',()=>new THREE.OctahedronGeometry(.14)),0xd6ac50,0,.55,0);star.rotation.z=Math.PI/4;
 }
 if(ghost){const materials=new Map();g.traverse(o=>{if(!o.material)return;const original=o.material;if(!materials.has(original)){const m=original.clone();m.transparent=true;m.opacity=.8;m.depthWrite=true;materials.set(original,m);}o.material=materials.get(original);o.renderOrder=3;});}
 return g;
}
export function disposeGhost(group){group.traverse(o=>{if(o.material?.transparent)o.material.dispose();});}
