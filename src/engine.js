// HEX HAVEN rules module. No DOM, Canvas, assets or browser dependencies.
// Axial coordinates and terrain arrays are intentionally portable to Unity/C#.
export const TERRAIN=['grass','forest','water','village'];
export const DIRECTIONS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
export const key=(q,r)=>`${q},${r}`;
export const rotate=(edges,turns)=>Array.from({length:6},(_,i)=>edges[(i-((turns%6)+6)%6+6)%6]);
export const neighbors=(q,r)=>DIRECTIONS.map(([dq,dr],dir)=>({q:q+dq,r:r+dr,dir}));
export function available(board){const out=new Map();for(const tile of board.values())for(const n of neighbors(tile.q,tile.r)){const k=key(n.q,n.r);if(!board.has(k))out.set(k,{q:n.q,r:n.r});}return [...out.values()];}
// Each matching boundary earns stars from the newly placed tile only.
export function scorePlacement(board,q,r,edges,special=false){
  let matches=0;
  for(const n of neighbors(q,r)){
    const other=board.get(key(n.q,n.r));
    if(other&&edges[n.dir]===other.edges[(n.dir+3)%6])matches++;
  }
  return {matches,points:matches*(special?2:1)};
}
// A tile is one graph node. Only touching edges of the requested terrain connect.
export function largestTerrainConnection(board,terrain='forest'){
  const visited=new Set();let largest=0;
  for(const [id,tile] of board){
    if(visited.has(id)||!tile.edges.includes(terrain))continue;
    const stack=[tile];visited.add(id);let count=0;
    while(stack.length){
      const current=stack.pop();count++;
      for(const n of neighbors(current.q,current.r)){
        const nextId=key(n.q,n.r),next=board.get(nextId);
        if(!visited.has(nextId)&&next&&current.edges[n.dir]===terrain&&next.edges[(n.dir+3)%6]===terrain){
          visited.add(nextId);stack.push(next);
        }
      }
    }
    largest=Math.max(largest,count);
  }
  return largest;
}
export function objectives(game){
  const forest=largestTerrainConnection(game.board);
  const forestTarget=game.stage>=3?5:0;
  return {forest,forestTarget,complete:game.score>=game.target&&forest>=forestTarget};
}
// Deck composition is guaranteed per stage: 70% two-terrain, 25% single, 5% triple.
// Two-terrain tiles use contiguous 4:2 (60%) or 3:3 (40%) boundaries.
export function makeDeck(seed,count){
  let state=seed>>>0;
  const rand=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  const pick=()=>TERRAIN[Math.floor(rand()*TERRAIN.length)];
  const distinct=used=>{let t=pick();while(used.includes(t))t=pick();return t;};
  // Largest remainder allocation minimizes rounding drift across all three quotas.
  const quotas=[.70,.25,.05].map(ratio=>count*ratio),counts=quotas.map(Math.floor);
  const order=[0,1,2].sort((a,b)=>(quotas[b]-counts[b])-(quotas[a]-counts[a])||a-b);
  const remaining=count-counts.reduce((sum,n)=>sum+n,0);
  for(let i=0;i<remaining;i++)counts[order[i]]++;
  const [nDouble,nSingle,nTriple]=counts;
  const shapes=[...Array(nDouble).fill(2),...Array(nSingle).fill(1),...Array(nTriple).fill(3)];
  for(let i=shapes.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[shapes[i],shapes[j]]=[shapes[j],shapes[i]];}
  return shapes.map((shape,i)=>{
    const a=pick();let edges;
    if(shape===1)edges=Array(6).fill(a);
    else if(shape===2){const b=distinct([a]);edges=rand()<.6?[a,a,a,a,b,b]:[a,a,a,b,b,b];}
    else {const b=distinct([a]),c=distinct([a,b]);edges=[a,a,b,b,c,c];}
    return {id:`tile-${seed}-${i}`,edges};
  });
}
export function createGame(stage=1){const count=Math.min(14+stage*2,30),board=new Map();board.set('0,0',{q:0,r:0,edges:['grass','grass','grass','grass','forest','forest'],id:'start'});return {version:3,stage,board,deck:makeDeck(1271+stage*7919,count).map((tile,i)=>({...tile,special:stage>=2&&i%5===4})),index:0,rotation:0,score:0,target:Math.ceil(count*1.5),history:[],status:'playing'};}
export function place(game,q,r){if(!Number.isInteger(q)||!Number.isInteger(r)||game.index>=game.deck.length||game.status!=='playing'||game.board.has(key(q,r))||!available(game.board).some(p=>p.q===q&&p.r===r))return null;const source=game.deck[game.index],edges=rotate(source.edges,game.rotation),result=scorePlacement(game.board,q,r,edges,source.special);game.history.push({q,r,points:result.points,rotation:game.rotation});game.board.set(key(q,r),{q,r,edges,id:source.id,special:!!source.special});game.score+=result.points;game.index++;game.rotation=0;if(objectives(game).complete)game.status='won';else if(game.index>=game.deck.length)game.status='lost';return result;}
export function undo(game){const last=game.history.pop();if(!last)return false;game.board.delete(key(last.q,last.r));game.score-=last.points;game.index--;game.rotation=last.rotation;game.status='playing';return true;}
export function serialize(game){return {version:3,stage:game.stage,board:[...game.board.values()],deck:game.deck,index:game.index,rotation:game.rotation,score:game.score,target:game.target,history:game.history,status:game.status};}
export function deserialize(data){if(data?.version!==3||!Array.isArray(data.board)||!Array.isArray(data.deck))throw Error('Incompatible save');return {...data,board:new Map(data.board.map(t=>[key(t.q,t.r),t]))};}
