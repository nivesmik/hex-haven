import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExperiment,createGame,ecosystemProgress,place,undo,objectives,serialize,deserialize,restartGame,experimentResult,EXPERIMENT_MODES,habitatCapacity} from '../src/engine.js';
const all=t=>Array(6).fill(t);
const tile=(q,r,edges)=>({q,r,edges,id:`${q},${r}`});
function riverBoard(water=3,forest=2){
 const tiles=[];
 for(let q=0;q<water;q++)tiles.push(tile(q,0,all('water')));
 // E/W edges connect the forest, while edge 2 faces the river's SE edge.
 for(let q=0;q<forest;q++)tiles.push(tile(q,1,all('forest')));
 return new Map(tiles.map(t=>[t.id,t]));
}
function fixture(){const g=createExperiment('comfort',7);g.board=riverBoard();return g;}
test('river uses opposite water edges, not nearby water tiles',()=>{
 const g=fixture();assert.equal(ecosystemProgress(g).water,3);
 g.board.get('1,0').edges[3]='grass';
 assert.equal(ecosystemProgress(g).river,false);
});
test('bank forest must connect with forest edges and touch the same river',()=>{
 const g=fixture();assert.equal(ecosystemProgress(g).forest,2);assert.equal(ecosystemProgress(g).otter,true);
 g.board.get('1,1').edges[3]='grass';assert.equal(ecosystemProgress(g).otter,false);
 g.board=riverBoard(3,0);
 for(let q=0;q<5;q++)g.board.set(`${q},9`,tile(q,9,all('forest')));
 assert.equal(ecosystemProgress(g).forest,0);assert.equal(ecosystemProgress(g).otter,false);
 // Adjacency through grass is not a bank contact.
 g.board=riverBoard();for(let q=0;q<3;q++)g.board.get(`${q},0`).edges[5]='grass';
 g.board.get('1,0').edges[4]='grass';g.board.get('2,0').edges[4]='grass';
 assert.equal(ecosystemProgress(g).forest,0);
});
test('mixed river/forest tiles form a bank without adding a third otter condition',()=>{
 const g=fixture();g.board=new Map();
 for(let q=0;q<3;q++)g.board.set(`${q},0`,tile(q,0,['water','forest','forest','water','forest','forest']));
 // Water line is connected but forest on separate tiles is not.
 assert.equal(ecosystemProgress(g).water,3);assert.equal(ecosystemProgress(g).forest,1);
 assert.equal(ecosystemProgress(g).otter,false);
});
test('both star and ecosystem goals are mandatory; no rating or discovery bonus',()=>{
 const g=fixture();g.score=g.target-1;assert.equal(objectives(g).complete,false);
 g.score=g.target;assert.equal(objectives(g).complete,true);
 g.board=riverBoard(1,2);assert.equal(objectives(g).complete,false);
});
test('discovery events are once per attempt across undo, replay and save/load',()=>{
 const g=fixture();g.board.delete('1,1');g.deck=[{id:'bank',edges:all('forest')}];g.target=999;
 const result=place(g,1,1);assert.ok(result.events.some(e=>e.id==='otter'));
 assert.equal(g.score,result.points);assert.equal(g.ecosystem.seen.length,4);
 const saved=deserialize(JSON.parse(JSON.stringify(serialize(g))));
 assert.equal(undo(saved),true);assert.equal(ecosystemProgress(saved).otter,false);
 assert.deepEqual(place(saved,1,1).events,[]);assert.equal(saved.ecosystem.seen.length,4);
 assert.equal(saved.metrics.undos,1);assert.equal(ecosystemProgress(saved).otter,true);
});
test('undo reverts a river and status, while restart clears discoveries and retains counters',()=>{
 const g=fixture();g.board.delete('2,0');g.deck=[{id:'water',edges:all('water')}];g.target=0;
 place(g,2,0);assert.equal(g.status,'won');assert.equal(undo(g),true);
 assert.equal(g.status,'playing');assert.equal(ecosystemProgress(g).river,false);
 const restarted=restartGame(g);assert.deepEqual(restarted.ecosystem.seen,[]);
 assert.equal(restarted.metrics.restarts,1);assert.equal(restarted.metrics.undos,1);
 const result=experimentResult(restarted);assert.equal(result.usedTiles,0);assert.equal(result.result,'진행 중');
});
test('three modes reproduce decks, conditions and special positions, and keep ordinary saves unchanged',()=>{
 for(const mode of Object.keys(EXPERIMENT_MODES)){
  const a=createExperiment(mode,42),b=createExperiment(mode,42);
  assert.deepEqual(serialize(a),serialize(b));
  assert.equal(a.deck.length,createGame(2).deck.length);
  assert.equal(a.deck.filter(t=>t.special).length,EXPERIMENT_MODES[mode].specialCount);
  assert.deepEqual(serialize(deserialize(JSON.parse(JSON.stringify(serialize(a))))),serialize(a));
 }
 assert.equal('experiment' in serialize(createGame(2)),false);
 assert.notDeepEqual(createExperiment('standard',1).deck,createExperiment('standard',2).deck);
 assert.throws(()=>createExperiment('unknown',1));assert.throws(()=>createExperiment('standard',-1));
});
test('resource-deficient decks are detected; all 768 generated mode/seed decks meet necessary capacity',()=>{
 assert.equal(habitatCapacity([{edges:all('grass')}],{water:3,forest:2}).sufficient,false);
 for(const mode of Object.keys(EXPERIMENT_MODES))for(let seed=0;seed<256;seed++){
  const g=createExperiment(mode,seed);assert.equal(habitatCapacity(g.deck,g.experiment.goals).sufficient,true);
 }
});

test('unknown experiment versions and corrupt discovery state are rejected without affecting v3',()=>{
 const save=serialize(createExperiment('standard',42));
 const future=structuredClone(save);future.experiment.version=2;assert.throws(()=>deserialize(future));
 const broken=structuredClone(save);delete broken.ecosystem;assert.throws(()=>deserialize(broken));
 assert.deepEqual(serialize(deserialize(serialize(createGame(1)))),serialize(createGame(1)));
});

test('restarting a loaded experiment replays its stored conditions, not regenerated balance values',()=>{
 const game=createExperiment('standard',42);game.target=29;game.experiment.goals={water:3,forest:4};
 const loaded=deserialize(JSON.parse(JSON.stringify(serialize(game)))),restarted=restartGame(loaded);
 assert.deepEqual(restarted.experiment,game.experiment);assert.deepEqual(restarted.deck,game.deck);
 assert.equal(restarted.target,29);assert.equal(restarted.index,0);
});
