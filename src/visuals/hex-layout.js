// Presentation coordinates only. Engine edge order: E, NE, NW, W, SW, SE.
export const TILE_TOP=.12;
export const axialToWorld=(q,r)=>({x:Math.sqrt(3)*(q+r/2),z:1.5*r});
export function worldToAxial(x,z){
 const q=x/Math.sqrt(3)-z/3,r=2*z/3;
 let rx=Math.round(q),rz=Math.round(r),ry=Math.round(-q-r);
 const dx=Math.abs(rx-q),dz=Math.abs(rz-r),dy=Math.abs(ry+q+r);
 if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
 return {q:rx||0,r:rz||0};
}
export const edgePoint=(dir,radius=1,offset=0)=>({x:radius*Math.cos(-dir*Math.PI/3+offset),z:radius*Math.sin(-dir*Math.PI/3+offset)});
export const edgeVertices=dir=>[edgePoint(dir,1,-Math.PI/6),edgePoint(dir,1,Math.PI/6)];
