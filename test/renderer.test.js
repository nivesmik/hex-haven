import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawTile,hexPath} from '../src/renderer.js';
import {DIRECTIONS,rotate,scorePlacement,key} from '../src/engine.js';

test('rendered terrain wedge midpoints align with all six axial neighbors',()=>{
 const lines=[],fills=[];let path=[];
 const ctx=new Proxy({beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);lines.push([x,y]);},fill(){fills.push({path:[...path],color:this.fillStyle});}}, {get:(t,k)=>t[k]??(()=>{})});
 const edges=['grass','forest','water','village','grass','water'];
 drawTile(ctx,0,0,40,edges);
 assert.equal(fills.length,6);
 const colors={grass:'#a8ce83',forest:'#548b67',water:'#75b7d5',village:'#dcb17c'};
 for(let i=0;i<6;i++){
  const [a,b]=fills[i].path.slice(1),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  const [q,r]=DIRECTIONS[i],nx=Math.sqrt(3)*(q+r/2),ny=1.5*r;
  assert.ok(Math.abs(mx*ny-my*nx)<1e-9);assert.ok(mx*nx+my*ny>0);
  assert.equal(fills[i].color,colors[edges[i]]);
  const neighbor=Array(6).fill('village');neighbor[(i+3)%6]=edges[i];
  assert.equal(scorePlacement(new Map([[key(q,r),{q,r,edges:neighbor}]]),0,0,edges).matches,1);
 }
 // Screen y grows down: positive engine turns move E toward NE, so UI right uses -1.
 assert.equal(rotate(edges,-1)[5],edges[0]);
 lines.length=0;hexPath(ctx,0,0,40);
 assert.ok(lines.some(([x,y])=>Math.abs(x)<1e-9&&Math.abs(y+40)<1e-9));
});
