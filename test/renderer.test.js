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

test('special tile marker and ecology decorations stay within tile centers',async()=>{
 const {createExperiment}=await import('../src/engine.js');
 const {renderBoard}=await import('../src/renderer.js');
 const labels=[],arcs=[];
 const ctx=new Proxy({fillText:(text,x,y)=>labels.push({text,x,y}),arc:(x,y,r)=>arcs.push({x,y,r})}, {get:(t,k)=>t[k]??(()=>{})});
 const edge=Array(6).fill('grass');
 drawTile(ctx,0,0,40,edge,false,true);
 assert.equal(labels.filter(l=>l.text==='★').length,1);assert.equal(arcs[0].r,40*.19);
 const g=createExperiment('comfort',7);g.board=new Map();
 for(let q=0;q<3;q++)g.board.set(`${q},0`,{q,r:0,edges:Array(6).fill('water')});
 for(let q=0;q<2;q++)g.board.set(`${q},1`,{q,r:1,edges:Array(6).fill('forest')});
 labels.length=0;renderBoard(ctx,{clientWidth:390,clientHeight:844},g,null,{x:0,y:0,zoom:1},40);
 assert.ok(labels.some(l=>l.text==='🦦'));assert.ok(labels.some(l=>l.text==='⟳'));
 const centers=[...g.board.values()].map(t=>({x:Math.sqrt(3)*40*(t.q+t.r/2),y:60*t.r}));
 for(const label of labels.filter(l=>['🦦','⟳','🌱'].includes(l.text)))
  assert.ok(centers.some(c=>Math.hypot(c.x-label.x,c.y-label.y)<40*.4));
});
