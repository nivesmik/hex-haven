// Portable graph queries and theme data. These are simplified puzzle rules,
// not universal claims about real rivers or otter habitats.
export const RIVER_THEME=Object.freeze({
  id:'temperate-river',name:'온대 하천',
  plants:[
    {id:'meadow-flowers',kind:'ordinary',terrain:'grass',glyph:'·'},
    {id:'bank-sprouts',kind:'habitat',terrain:'forest',icon:'🌱',requires:'river-bank'},
    {id:'bank-canopy',kind:'change',terrain:'forest',icon:'⟳',requires:'vegetated-bank'}
  ],
  events:{
    river:'연결된 물이 강을 이루어 작은 물고기가 보입니다.',
    habitat:'강가의 연결된 숲에서 새싹 군락이 자라 서식지를 만듭니다.',
    vegetation:'강가 숲이 목표 크기에 도달해 식생이 발달했습니다. ⟳는 환경 변화 군락입니다.',
    otter:'강과 강가 숲 조건을 갖춰 수달을 발견했습니다. 게임적으로 단순화한 조건입니다.'
  }
});
export const THEMES=Object.freeze({[RIVER_THEME.id]:RIVER_THEME});
// Coordinates and neighbor functions are injected to keep this module acyclic.
export function terrainComponents(board,terrain,neighbors,key){
  const visited=new Set(),components=[];
  for(const [id,tile] of board){
    if(visited.has(id)||!tile.edges.includes(terrain))continue;
    const stack=[tile],component=[];visited.add(id);
    while(stack.length){
      const current=stack.pop();component.push(key(current.q,current.r));
      for(const n of neighbors(current.q,current.r)){
        const id=key(n.q,n.r),next=board.get(id);
        if(next&&!visited.has(id)&&current.edges[n.dir]===terrain&&next.edges[(n.dir+3)%6]===terrain){
          visited.add(id);stack.push(next);
        }
      }
    }
    components.push(component);
  }
  return components;
}
function touchesBank(board,water,forest,neighbors,key){
  const forestSet=new Set(forest);
  for(const id of water){
    if(forestSet.has(id))return true; // One mixed tile contains both river and bank.
    const tile=board.get(id);
    for(const n of neighbors(tile.q,tile.r)){
      const other=board.get(key(n.q,n.r));
      if(forestSet.has(key(n.q,n.r))&&tile.edges[n.dir]==='water'&&other.edges[(n.dir+3)%6]==='forest')return true;
    }
  }
  return false;
}
export function riverProgress(board,goals,neighbors,key){
  const waters=terrainComponents(board,'water',neighbors,key);
  const forests=terrainComponents(board,'forest',neighbors,key);
  let water=[],forest=[];
  // Favor a river meeting its threshold, then its bank forest. Never combine
  // a large remote forest with a different river's progress.
  const rank=(w,f)=>[w.length>=goals.water?1:0,Math.min(w.length,goals.water)+Math.min(f.length,goals.forest),f.length,w.length];
  const better=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;};
  for(const w of waters){
    const f=forests.filter(f=>touchesBank(board,w,f,neighbors,key)).sort((a,b)=>b.length-a.length)[0]??[];
    if(better(rank(w,f),rank(water,forest))){water=w;forest=f;}
  }
  const river=water.length>=goals.water,habitat=river&&forest.length>0;
  const vegetation=river&&forest.length>=goals.forest;
  return {water:water.length,forest:forest.length,waterTiles:water,forestTiles:forest,
    river,habitat,vegetation,otter:vegetation};
}
