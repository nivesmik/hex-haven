import {createExperiment,experimentResult,EXPERIMENT_MODES} from '../src/engine.js';
import {solveExperiment} from '../test-support/solver.js';
import {writeFileSync} from 'node:fs';
const seeds=[1,7,42,1271,202607],width=6,results=[];
for(const difficulty of Object.keys(EXPERIMENT_MODES))for(const seed of seeds){
 const initial=createExperiment(difficulty,seed),solution=solveExperiment(initial,width);
 const row={...experimentResult(solution.game),verifiedSolution:solution.solved,
  verdict:solution.solved?'verified-pass':'unknown-search-limit',path:solution.path};
 results.push(row);console.log(`${difficulty} seed=${seed} ${row.verdict} tiles=${row.usedTiles} stars=${row.finalStars}/${row.targetStars} water=${row.water} forest=${row.forest}`);
}
const report={method:'deterministic-beam-search',width,seeds,results,
 caveat:'Found paths are constructive witnesses. Search failure is not impossibility. This sample is not a balance or universal solvability guarantee.'};
writeFileSync(new URL('../test/fixtures/v07-simulation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
