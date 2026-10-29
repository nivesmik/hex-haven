import {neighbors,key} from '../engine.js';
import {axialToWorld,edgePoint} from './hex-layout.js';
// Select an actual bank of this river; no new discovery condition is added.
export function otterAnchor(board,eco){
 const forest=new Set(eco.forestTiles);
 for(const id of eco.waterTiles){
  const tile=board.get(id),waterCenter=axialToWorld(tile.q,tile.r);
  if(forest.has(id)){
   const land=edgePoint(tile.edges.indexOf('forest'),.28),water=edgePoint(tile.edges.indexOf('water'),.45);
   return {x:waterCenter.x+land.x,z:waterCenter.z+land.z,angle:-Math.atan2(water.z-land.z,water.x-land.x),supportTile:id};
  }
  for(const n of neighbors(tile.q,tile.r)){
   const other=board.get(key(n.q,n.r));
   if(tile.edges[n.dir]==='water'&&forest.has(key(n.q,n.r))&&other.edges[(n.dir+3)%6]==='forest'){
    const center=axialToWorld(n.q,n.r),offset=edgePoint((n.dir+3)%6,.5);
    return {x:center.x+offset.x,z:center.z+offset.z,angle:-Math.atan2(waterCenter.z-center.z-offset.z,waterCenter.x-center.x-offset.x),supportTile:key(n.q,n.r)};
   }
  }
 }
 // Defensive fallback for externally edited saves; valid engine progress has a bank.
 const t=board.get(eco.waterTiles[0]),p=axialToWorld(t.q,t.r);return {...p,angle:0,supportTile:eco.waterTiles[0]};
}
