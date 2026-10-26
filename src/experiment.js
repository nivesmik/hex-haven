// Versioned balance experiments, separate from ordinary v0.6 progression.
export const EXPERIMENT_MODES=Object.freeze({
  comfort:Object.freeze({label:'편안함',starFactor:1,specialCount:5,water:3,forest:2}),
  standard:Object.freeze({label:'기본',starFactor:1.5,specialCount:3,water:4,forest:3}),
  challenge:Object.freeze({label:'도전',starFactor:1.8,specialCount:2,water:5,forest:4})
});
export function seededOrder(seed,count){
  let state=(seed^0x9e3779b9)>>>0;
  const order=Array.from({length:count},(_,i)=>i);
  for(let i=count-1;i>0;i--){state=(Math.imul(1664525,state)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return order;
}
// Necessary capacity check, not a proof of a realizable solution. Every tile
// used to extend a component needs terrain on two different edges.
export function habitatCapacity(deck,goals){
  const count=t=>deck.filter(tile=>tile.edges.filter(e=>e===t).length>=2).length;
  return {water:count('water'),forest:count('forest'),sufficient:count('water')>=goals.water&&count('forest')>=goals.forest};
}
