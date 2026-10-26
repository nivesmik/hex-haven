import {available,place,objectives,largestTerrainConnection} from '../src/engine.js';
export function cloneGame(game){
 return {...game,board:new Map(game.board),history:[...game.history],
  ecosystem:{seen:[...game.ecosystem.seen]},metrics:{...game.metrics}};
}
function quality(game){
 const {ecosystem:p}=objectives(game),goals=game.experiment.goals;
 return 9*Math.min(1,game.score/game.target)+7*Math.min(1,p.water/goals.water)+7*Math.min(1,p.forest/goals.forest)+
   (p.otter?6:0)+.04*largestTerrainConnection(game.board,'forest');
}
// Bounded deterministic beam search: a found path is a concrete solution,
// an exhausted search is UNKNOWN, never proof that a puzzle is impossible.
export function solveExperiment(initial,width=6){
 let beam=[cloneGame(initial)],best=beam[0];
 for(let turn=0;turn<initial.deck.length;turn++){
  const choices=[];
  for(const game of beam){
   if(game.status!=='playing')continue;
   const uniqueRotations=new Set();
   for(let rotation=0;rotation<6;rotation++){
    const edges=game.deck[game.index].edges;
    const signature=edges.map((_,i)=>edges[(i-rotation+6)%6]).join(',');
    if(uniqueRotations.has(signature))continue;uniqueRotations.add(signature);
    for(const cell of available(game.board)){
     const candidate=cloneGame(game);candidate.rotation=rotation;
     place(candidate,cell.q,cell.r);
     if(candidate.status==='won')return {solved:true,game:candidate,path:candidate.history.map(({q,r,rotation})=>({q,r,rotation}))};
     choices.push({game:candidate,quality:quality(candidate)});
    }
   }
  }
  choices.sort((a,b)=>b.quality-a.quality);
  const seen=new Set();beam=[];
  for(const choice of choices){
   const signature=[...choice.game.board].map(([id,t])=>id+':'+t.edges.join(',')).sort().join(';');
   if(seen.has(signature))continue;seen.add(signature);beam.push(choice.game);
   if(beam.length>=width)break;
  }
  if(beam.length)best=beam[0];else break;
 }
 return {solved:false,game:best,path:best.history.map(({q,r,rotation})=>({q,r,rotation}))};
}
