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
  assert.equal(sizes.filter(n=>n===1).length,Math.round(count*.25));
  assert.equal(sizes.filter(n=>n===3).length,Math.round(count*.05));
  assert.equal(sizes.filter(n=>n===2).length,count-Math.round(count*.25)-Math.round(count*.05));
 }
 const two=makeDeck(12345,300).filter(t=>new Set(t.edges).size===2);
 assert.ok(two.some(t=>t.edges.filter(x=>x===t.edges[0]).length===3));
 assert.ok(two.some(t=>t.edges.filter(x=>x===t.edges[0]).length===4));
});
