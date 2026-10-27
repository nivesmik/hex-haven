// App navigation metadata. The version-3 portable game snapshot is unchanged.
export const runStatus=game=>game?.status==='won'?'passed':game?.status==='lost'?'failed':game?'active':'idle';
export function restoreSession(data,saves={}){
 if(data?.version===1&&['home','play'].includes(data.screen)&&['regular','experiment'].every(k=>['idle','active','abandoned','passed','failed'].includes(data.slots?.[k]?.status)))return structuredClone(data);
 return {version:1,screen:'home',slots:{regular:{status:runStatus(saves.regular)},experiment:{status:runStatus(saves.experiment)}}};
}
export const slotFor=game=>game.experiment?'experiment':'regular';
export const mayContinue=(session,game)=>session.slots[slotFor(game)].status==='active'&&game.status==='playing';
export function startSession(session,game){session.slots[slotFor(game)]={status:runStatus(game)};session.screen='play';}
export function finishSession(session,game,abandoned=false){session.slots[slotFor(game)]={status:abandoned?'abandoned':runStatus(game)};if(abandoned)session.screen='home';}
