import * as THREE from '../../vendor/three/three.module.js';
// One self-contained shoreline prop. Root is on TILE_TOP; stone base is y=0.
export function createOtter(kit){
 const g=new THREE.Group(),body=kit.geometry('otter-body',()=>new THREE.IcosahedronGeometry(1,1));
 const stone=kit.mesh(g,kit.geometry('otter-stone',()=>new THREE.CylinderGeometry(.4,.46,.2,7)),0x9caa94,0,.1,0,1.35,1,.9);stone.name='support-stone';
 kit.mesh(g,body,0x87694f,-.04,.45,0,.2,.27,.18).name='seated-body';
 kit.mesh(g,body,0xb59976,.105,.47,0,.095,.2,.145);
 const head=new THREE.Group();head.name='head-pivot';head.position.set(.07,.76,0);g.add(head);
 kit.mesh(head,body,0x87694f,0,0,0,.18,.17,.16);
 kit.mesh(head,body,0xc8ab85,.13,-.025,0,.09,.065,.11);
 kit.mesh(head,body,0x554b3f,.205,-.006,0,.029,.027,.034);
 for(const z of [-1,1]){
  kit.mesh(head,body,0x87694f,-.035,.13,z*.12,.05,.052,.045);
  kit.mesh(head,body,0x413e34,.12,.04,z*.12,.012,.014,.012);
  kit.mesh(g,body,0x87694f,.15,.245,z*.135,.12,.047,.07).name='grounded-foot';
  const arm=kit.mesh(g,body,0x87694f,.16,.47,z*.135,.055,.11,.055);arm.rotation.z=.3;
 }
 const tail=new THREE.Group();tail.name='tail-pivot';tail.position.set(-.13,.24,0);g.add(tail);
 const mesh=kit.mesh(tail,kit.geometry('seated-tail',()=>new THREE.ConeGeometry(.075,.46,6)),0x87694f,-.23,0,0);mesh.rotation.z=Math.PI/2;
 g.userData.headPivot=head;g.userData.tailPivot=tail;return g;
}
export function animateOtter(otter,time,reducedMotion=false){
 const head=otter.userData.headPivot,tail=otter.userData.tailPivot;
 head.rotation.y=reducedMotion?0:Math.sin(time*.0007)*.16;
 head.rotation.z=reducedMotion?0:Math.sin(time*.0011)*.025;
 tail.rotation.y=reducedMotion?0:Math.sin(time*.0013+.7)*.1;
}
