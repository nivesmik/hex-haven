import * as THREE from '../../vendor/three/three.module.js';
export function createOtter(kit){
 const g=new THREE.Group();
 const body=kit.geometry('otter-body',()=>new THREE.IcosahedronGeometry(1,1));
 kit.mesh(g,body,0x87694f,0,.04,0,.33,.13,.16);
 kit.mesh(g,body,0xb59976,.29,.12,0,.17,.14,.13);
 const tail=kit.mesh(g,kit.geometry('tail',()=>new THREE.ConeGeometry(.085,.48,5)),0x87694f,-.43,.03,0);tail.rotation.z=Math.PI/2;
 for(const z of [-.14,.14])kit.mesh(g,body,0x87694f,-.06,.01,z,.14,.04,.06);
 return g;
}
