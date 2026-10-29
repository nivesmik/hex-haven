import {available,rotate,scorePlacement,neighbors,key,objectives} from './engine.js';
export function placementPreview(game,cell){
 if(game.status!=='playing'||!cell||!available(game.board).some(p=>p.q===cell.q&&p.r===cell.r))return null;
 const source=game.deck[game.index],edges=rotate(source.edges,game.rotation);
 const connections=neighbors(cell.q,cell.r).flatMap(n=>{
  const other=game.board.get(key(n.q,n.r));
  return other?[{dir:n.dir,terrain:edges[n.dir],neighborTerrain:other.edges[(n.dir+3)%6],matches:edges[n.dir]===other.edges[(n.dir+3)%6]}]:[];
 });
 // Do not call place: forecasts must not record discoveries, metrics or saves.
 const board=new Map(game.board);board.set(key(cell.q,cell.r),{...cell,...source,edges});
 const result=scorePlacement(game.board,cell.q,cell.r,edges,source.special);
 return {edges,special:source.special,...result,connections,
  before:objectives(game),after:objectives({...game,board,score:game.score+result.points})};
}
