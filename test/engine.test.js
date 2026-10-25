import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,place,undo,serialize,deserialize,rotate,available,scorePlacement,largestTerrainConnection,objectives,DIRECTIONS,key,makeDeck} from '../src/engine.js';
const edges=t=>Array(6).fill(t);
const tile=(q,r,e=edges('forest'))=>({q,r,edges:e});
test('all six axial directions compare the opposite edge',()=>{
 for(let dir=0;dir<6;dir++){
  const [q,r]=DIRECTIONS[dir],other=edges('water'),current=edges('grass');
  current[dir]='forest';other[(dir+3)%6]='forest';
  const board=new Map([[key(q,r),tile(q,r,other)]]);
  assert.deepEqual(scorePlacement(board,0,0,current),{matches:1,points:1});
  assert.equal(scorePlacement(board,0,0,current,true).points,2);
 }
});
test('zero and six matches have no legacy placement bonus',()=>{
 assert.equal(scorePlacement(new Map(),0,0,edges('forest')).points,0);
 const board=new Map(DIRECTIONS.map(([q,r])=>[key(q,r),tile(q,r)]));
 assert.equal(scorePlacement(board,0,0,edges('forest'),true).points,12);
});
test('terrain connectivity follows shared edges, counts cycles once and separates islands',()=>{
 const board=new Map([tile(0,0),tile(1,0),tile(0,1),tile(8,8)].map(t=>[key(t.q,t.r),t]));
 assert.equal(largestTerrainConnection(board),3);
 board.get('1,0').edges=edges('water');
 assert.equal(largestTerrainConnection(board),2);
 assert.equal(largestTerrainConnection(new Map()),0);
 const a=edges('grass'),b=edges('grass');a[1]='forest';b[1]='forest';
 assert.equal(largestTerrainConnection(new Map([['0,0',tile(0,0,a)],['1,0',tile(1,0,b)]])),1);
});
test('stage three requires five connected forest tiles as well as stars',()=>{
 const game=createGame(3);game.score=game.target;
 game.board=new Map(Array.from({length:4},(_,q)=>[key(q,0),tile(q,0)]));
 assert.equal(objectives(game).complete,false);
 game.board.set('4,0',tile(4,0));assert.equal(objectives(game).complete,true);
 game.score--;assert.equal(objectives(game).complete,false);
});
test('placement, invalid moves, special stars, terminal state and undo',()=>{
 const g=createGame(1);g.board=new Map([['0,0',tile(0,0)]]);
 g.deck=[{id:'special',edges:edges('forest'),special:true}];g.target=2;g.rotation=1;
 assert.equal(place(g,9,9),null);assert.equal(place(g,0,0),null);
 assert.equal(place(g,.5,0),null);
 assert.equal(place(g,1,0).points,2);assert.equal(g.status,'won');
 assert.equal(place(g,2,0),null);assert.equal(undo(g),true);
 assert.equal(g.score,0);assert.equal(g.rotation,1);assert.equal(g.index,0);
 g.target=99;place(g,1,0);assert.equal(g.status,'lost');
});
test('rotation, deterministic deck, frontier and JSON save round trip',()=>{
 const e=['grass','forest','water','village','grass','water'];
 assert.deepEqual(rotate(e,6),e);assert.deepEqual(rotate(rotate(e,1),-1),e);
 assert.deepEqual(makeDeck(7,30),makeDeck(7,30));
 const g=createGame(2);assert.equal(available(g.board).length,6);
 place(g,1,0);
 const restored=deserialize(JSON.parse(JSON.stringify(serialize(g))));
 assert.deepEqual(serialize(restored),serialize(g));assert.equal(undo(restored),true);
 assert.throws(()=>deserialize({version:2,board:[],deck:[]}));
});

test('stage decks enforce 70:25:5 terrain composition and include 3:3 tiles',()=>{
 for(const count of [16,18,20,30]){
  const deck=makeDeck(12345,count);
  const sizes=deck.map(t=>new Set(t.edges).size);
  const expected={16:[11,4,1],18:[13,4,1],20:[14,5,1],30:[21,8,1]}[count];
  assert.deepEqual([2,1,3].map(type=>sizes.filter(n=>n===type).length),expected);
 }
 const two=makeDeck(12345,300).filter(t=>new Set(t.edges).size===2);
 assert.ok(two.some(t=>t.edges.filter(x=>x===t.edges[0]).length===3));
 assert.ok(two.some(t=>t.edges.filter(x=>x===t.edges[0]).length===4));
});

test('one rotation moves exactly one edge; six individual rotations restore all edges',()=>{
 const original=['grass','forest','water','village','grass','water'];
 assert.deepEqual(rotate(original,1),[original[5],...original.slice(0,5)]);
 let current=original;
 for(let i=0;i<6;i++)current=rotate(current,1);
 assert.deepEqual(current,original);
});
test('composition quotas remain close for every stage size and terrain runs stay contiguous',()=>{
 for(let stage=1;stage<=12;stage++){
  const deck=createGame(stage).deck,count=deck.length;
  for(const [type,ratio] of [[2,.7],[1,.25],[3,.05]]){
   assert.ok(Math.abs(deck.filter(t=>new Set(t.edges).size===type).length-count*ratio)<1);
  }
  for(const t of deck){
   const types=new Set(t.edges);
   for(const terrain of types){
    const starts=t.edges.filter((e,i)=>e===terrain&&t.edges[(i+5)%6]!==terrain).length;
    assert.equal(starts,types.size===1?0:1);
   }
   if(types.size===2)assert.ok([2,3,4].includes(t.edges.filter(e=>e===t.edges[0]).length));
   if(types.size===3)for(const terrain of types)assert.equal(t.edges.filter(e=>e===terrain).length,2);
  }
  assert.deepEqual(makeDeck(stage,count),makeDeck(stage,count));
 }
 assert.notDeepEqual(makeDeck(1,30),makeDeck(2,30));
});
test('special neighbors do not multiply normal stars; stage 1 and 2 need only stars',()=>{
 const neighbor={...tile(0,0),special:true};
 assert.equal(scorePlacement(new Map([['0,0',neighbor]]),1,0,edges('forest')).points,1);
 for(const stage of [1,2]){
  const game=createGame(stage);game.score=game.target;
  assert.equal(objectives(game).complete,true);
  assert.equal(game.deck.filter(t=>t.special).length,stage===1?0:Math.floor(game.deck.length/5));
 }
});
test('five nearby forest tiles only connect through actual matching forest edges',()=>{
 const board=new Map(Array.from({length:5},(_,q)=>[key(q,0),tile(q,0)]));
 assert.equal(largestTerrainConnection(board),5);
 board.get('2,0').edges[3]='grass';
 assert.equal(largestTerrainConnection(board),3);
});

test('existing main v3 save retains deck, board, stars, target, history and can continue',async()=>{
 const {readFile}=await import('node:fs/promises');
 const data=JSON.parse(await readFile(new URL('./fixtures/main-v3-save.json',import.meta.url)));
 const restored=deserialize(structuredClone(data));
 assert.deepEqual(serialize(restored),data);
 const target=restored.target,deck=structuredClone(restored.deck);
 assert.equal(undo(restored),true);assert.equal(restored.rotation,1);
 const result=place(restored,1,0);assert.ok(result);
 assert.deepEqual(restored.deck,deck);assert.equal(restored.target,target);
 assert.equal(restored.score,data.score);
 assert.deepEqual(serialize(deserialize(JSON.parse(JSON.stringify(serialize(restored))))),serialize(restored));
});
