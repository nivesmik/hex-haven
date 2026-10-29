import {objectives,EXPERIMENT_MODES} from './engine.js';
export class StageHUD{
 constructor(){
  document.querySelector('.hud').insertAdjacentHTML('beforeend','<p id="win-condition"></p><button id="result-open" hidden>결과 보기</button>');
  document.querySelector('main.game').insertAdjacentHTML('beforeend','<section id="stage-result" role="status" hidden><h2 id="result-title"></h2><p id="result-detail"></p><button id="result-close">풍경 보기</button><button id="result-exit">메인으로</button></section>');
  document.getElementById('result-close').onclick=()=>{document.getElementById('stage-result').hidden=true;this.collapsed=true;};
  document.getElementById('result-open').onclick=()=>{document.getElementById('stage-result').hidden=false;this.collapsed=false;};
  document.getElementById('result-exit').onclick=()=>document.getElementById('menu-quit').click();
 }
 update(game){
  const $=id=>document.getElementById(id),g=objectives(game),exp=game.experiment;
  $('stage').textContent=exp?EXPERIMENT_MODES[exp.difficulty].label+' 실험':game.stage;
  $('win-condition').textContent=exp?'별 목표 + 수달 발견 시 Pass · 타일 소진 전 달성':g.forestTarget?'별 목표 + 숲 5타일 연결 시 Pass':'별 목표 달성 시 Pass · 타일 소진 전 달성';
  const signature=[game.status,game.stage,game.experiment?.seed,game.index,game.score].join(':');if(signature!==this.signature)this.collapsed=false;this.signature=signature;
  $('result-open').hidden=game.status==='playing';$('stage-result').hidden=game.status==='playing'||this.collapsed;document.body.dataset.runStatus=game.status;
  if(game.status!=='playing'){
   $('result-title').textContent=game.status==='won'?'Pass · 목표 달성':'Fail · 타일 소진';
   $('result-detail').textContent=`별 ${game.score}/${game.target}`+(exp?` · 강 ${g.ecosystem.water}/${exp.goals.water} · 숲 ${g.ecosystem.forest}/${exp.goals.forest} · 수달 ${g.ecosystem.otter?'발견':'미발견'}`:g.forestTarget?` · 숲 ${g.forest}/${g.forestTarget}`:'');
  }
 }
}
