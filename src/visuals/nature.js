import * as THREE from '../../vendor/three/three.module.js';
// Reusable low-poly primitives, shared across tiles and disposed with the scene.
export class NatureKit{
 constructor(){this.geometries=[];this.materials=[];this.geo={};this.mat={};}
 geometry(id,make){return this.geo[id]??=(this.geometries.push(make()),this.geometries.at(-1));}
 material(color){return this.mat[color]??=(this.materials.push(new THREE.MeshLambertMaterial({color,flatShading:true})),this.materials.at(-1));}
 mesh(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,this.material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 tree(parent,x,z,scale=1){
  this.mesh(parent,this.geometry('trunk',()=>new THREE.CylinderGeometry(.055,.08,.36,5)),0x846c50,x,.3*scale+.12,z,scale,scale,scale);
  this.mesh(parent,this.geometry('pine',()=>new THREE.ConeGeometry(.29,.72,5)),0x538362,x,.7*scale+.12,z,scale,scale,scale);
 }
 house(parent,x,z){
  this.mesh(parent,this.geometry('house',()=>new THREE.BoxGeometry(.35,.32,.32)),0xe0c2a0,x,.29,z);
  const roof=this.mesh(parent,this.geometry('roof',()=>new THREE.ConeGeometry(.3,.26,4)),0xad755b,x,.58,z);roof.rotation.y=Math.PI/4;
 }
 mountain(parent){this.mesh(parent,this.geometry('mountain',()=>new THREE.ConeGeometry(.32,.6,5)),0x98a28b,0,.42,0);}
 rock(parent,x,z){this.mesh(parent,this.geometry('rock',()=>new THREE.DodecahedronGeometry(.22,0)),0x9caa94,x,.23,z,1,.65,.8);}
 dispose(){this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());}
}
