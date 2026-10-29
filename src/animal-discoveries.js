// Almanac view derived from the engine's persisted, deduplicated discovery IDs.
// No reward, extra eligibility condition or parallel discovery ledger.
export function animalDiscoveryRecords(game){
 return {version:1,animals:game.ecosystem?.seen.includes('otter')?[{id:'otter',name:'수달',theme:game.experiment.theme,experiment:game.experiment.id,seed:game.experiment.seed}]:[]};
}
