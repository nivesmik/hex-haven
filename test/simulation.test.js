import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExperiment,place,experimentResult} from '../src/engine.js';
const report=JSON.parse(readFileSync(new URL('./fixtures/v07-simulation.json',import.meta.url)));
test('all 15 deterministic simulation witnesses replay with exactly the reported outcome',()=>{
 const verified=new Map();
 for(const row of report.results){
  const game=createExperiment(row.difficulty,row.seed);
  for(const step of row.path){game.rotation=step.rotation;assert.ok(place(game,step.q,step.r));}
  assert.deepEqual(experimentResult(game),Object.fromEntries(Object.entries(row).filter(([k])=>!['verifiedSolution','verdict','path'].includes(k))));
  if(row.verifiedSolution){assert.equal(game.status,'won');verified.set(row.difficulty,true);}
  else{assert.notEqual(game.status,'won');assert.equal(row.verdict,'unknown-search-limit');}
 }
 assert.equal(report.results.length,15);assert.equal(verified.size,3);
});
