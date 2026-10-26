import {riverProgress,RIVER_THEME,THEMES} from './ecosystem.js';
import {EXPERIMENT_MODES,seededOrder,habitatCapacity} from './experiment.js';
export {EXPERIMENT_MODES,habitatCapacity};
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
export function ecosystemProgress(game){
  return game.experiment?riverProgress(game.board,game.experiment.goals,neighbors,key):null;
}
export function objectives(game){
  if(game.experiment){
    const ecosystem=ecosystemProgress(game);
    return {forest:ecosystem.forest,forestTarget:game.experiment.goals.forest,ecosystem,
      complete:game.score>=game.target&&ecosystem.otter};
  }
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
export function place(game,q,r){if(!Number.isInteger(q)||!Number.isInteger(r)||game.index>=game.deck.length||game.status!=='playing'||game.board.has(key(q,r))||!available(game.board).some(p=>p.q===q&&p.r===r))return null;const source=game.deck[game.index],edges=rotate(source.edges,game.rotation),result=scorePlacement(game.board,q,r,edges,source.special);game.history.push({q,r,points:result.points,rotation:game.rotation});game.board.set(key(q,r),{q,r,edges,id:source.id,special:!!source.special});game.score+=result.points;game.index++;game.rotation=0;const events=recordDiscoveries(game);if(objectives(game).complete)game.status='won';else if(game.index>=game.deck.length)game.status='lost';return game.experiment?{...result,events}:result;}
export function undo(game){const last=game.history.pop();if(!last)return false;game.board.delete(key(last.q,last.r));game.score-=last.points;game.index--;game.rotation=last.rotation;game.status='playing';if(game.experiment)game.metrics.undos++;return true;}
export function serialize(game){return {version:3,stage:game.stage,board:[...game.board.values()],deck:game.deck,index:game.index,rotation:game.rotation,score:game.score,target:game.target,history:game.history,status:game.status,...(game.experiment?{experiment:game.experiment,ecosystem:game.ecosystem,metrics:game.metrics}:{})};}
export function deserialize(data){
  if(data?.version!==3||!Array.isArray(data.board)||!Array.isArray(data.deck))throw Error('Incompatible save');
  if(data.experiment){
    const exp=data.experiment;
    if(exp.version!==1||exp.id!=='living-river'||!THEMES[exp.theme]||!EXPERIMENT_MODES[exp.difficulty]||
      !Number.isInteger(exp.seed)||exp.seed<0||exp.seed>0xffffffff||
      !Number.isInteger(exp.deckSeed)||!Number.isInteger(exp.goals?.water)||exp.goals.water<1||
      !Number.isInteger(exp.goals?.forest)||exp.goals.forest<1||
      !Array.isArray(data.ecosystem?.seen)||!data.ecosystem.seen.every(id=>Object.hasOwn(THEMES[exp.theme].events,id))||
      !Number.isInteger(data.metrics?.undos)||data.metrics.undos<0||!Number.isInteger(data.metrics?.restarts)||data.metrics.restarts<0)
      throw Error('Incompatible experiment save');
  }
  return {...data,board:new Map(data.board.map(t=>[key(t.q,t.r),t]))};
}

// Stage 2 retains the existing 18-tile baseline and enables special tiles.
export function createExperiment(difficulty='standard',seed=202607,previousMetrics=null){
  const mode=EXPERIMENT_MODES[difficulty];
  if(!Object.hasOwn(EXPERIMENT_MODES,difficulty)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid experiment settings');
  const game=createGame(2),count=game.deck.length;
  const goals={water:mode.water,forest:mode.forest};
  let deck,deckSeed=seed,attempt=0;
  // Reject resource-deficient decks deterministically without altering shapes.
  // Capacity is necessary but not sufficient; simulation results document limits.
  do {deckSeed=(seed+Math.imul(attempt,7919))>>>0;deck=makeDeck(deckSeed,count);attempt++;}
  while(!habitatCapacity(deck,goals).sufficient&&attempt<256);
  if(!habitatCapacity(deck,goals).sufficient)throw Error('No habitat-capable deck found');
  const special=new Set(seededOrder(seed,count).slice(0,mode.specialCount));
  game.deck=deck.map((tile,i)=>({...tile,special:special.has(i)}));
  game.target=Math.ceil(count*mode.starFactor);
  game.experiment={version:1,id:'living-river',theme:RIVER_THEME.id,difficulty,seed,deckSeed,
    rejectedDecks:attempt-1,goals,specialCount:mode.specialCount};
  game.ecosystem={seen:[]};
  game.metrics={restarts:previousMetrics?.restarts??0,undos:previousMetrics?.undos??0};
  return game;
}
function recordDiscoveries(game){
  if(!game.experiment)return [];
  const progress=ecosystemProgress(game),events=[];
  for(const id of ['river','habitat','vegetation','otter']){
    if(progress[id]&&!game.ecosystem.seen.includes(id)){
      game.ecosystem.seen.push(id);events.push({id,text:THEMES[game.experiment.theme].events[id]});
    }
  }
  return events;
}
export function restartGame(game){
  if(!game.experiment)return createGame(game.stage);
  // Replay the saved experiment snapshot, even after future balance tuning.
  return {...createGame(game.stage),deck:game.deck.map(tile=>({...tile,edges:[...tile.edges]})),target:game.target,
    experiment:{...game.experiment,goals:{...game.experiment.goals}},ecosystem:{seen:[]},
    metrics:{...game.metrics,restarts:game.metrics.restarts+1}};
}
export function experimentResult(game){
  if(!game.experiment)return null;
  const progress=ecosystemProgress(game);
  return {experiment:'living-river-v1',difficulty:game.experiment.difficulty,seed:game.experiment.seed,
    deckSeed:game.experiment.deckSeed,usedTiles:game.index,finalStars:game.score,targetStars:game.target,
    water:progress.water,forest:progress.forest,goals:{...game.experiment.goals},
    restarts:game.metrics.restarts,undos:game.metrics.undos,
    result:game.status==='won'?'Pass':game.status==='lost'?'Fail':'진행 중'};
}
