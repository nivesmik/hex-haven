import {restoreSession,slotFor,mayContinue,startSession,finishSession} from './session-state.js';
const $=id=>document.getElementById(id);
export class AppShell{
 constructor({storageKey,game,saves,onRegular,onExperiment,onCancel,onPause=()=>{},renderer}){
  Object.assign(this,{storageKey,getGame:game,onRegular,onExperiment,onCancel,onPause,renderer});
  let stored;try{stored=JSON.parse(localStorage.getItem(storageKey));}catch{}
  this.session=restoreSession(stored,saves);
  document.body.insertAdjacentHTML('beforeend',`<button id="menu-open" aria-label="메뉴">☰</button>
  <section id="start-screen" aria-label="메인 화면"><div class="start-card"><small>작은 풍경, 깊은 선택</small><h1>HEX HAVEN</h1><p id="home-run"></p><button id="continue-run">이어하기</button><button id="start-regular">스테이지 시작</button><button id="open-experiment">실험 모드</button><div id="home-experiment" hidden><label>난이도 <select id="home-difficulty"><option value="comfort">편안함</option><option value="standard" selected>기본</option><option value="challenge">도전</option></select></label><label>시드 <input id="home-seed" inputmode="numeric" value="202607" maxlength="10"></label><button id="home-experiment-start">실험 시작</button><span id="home-error" role="status"></span></div></div></section>
  <dialog id="play-menu"><h2>메뉴</h2><button id="menu-resume">계속 플레이</button><a id="renderer-switch">${renderer==='3d'?'2D 보조 보기':'3D 보기'}</a><button id="menu-help">조작 도움말</button><div id="menu-settings"></div><button id="menu-quit">스테이지 포기</button><small id="menu-version">v0.8.1-test.1 · 엄지 조작</small></dialog>
  <dialog id="quit-dialog"><h2 id="quit-title">스테이지를 포기할까요?</h2><p id="quit-detail">이 시도는 이어할 수 없어요.</p><div class="quit-actions"><button id="quit-cancel" autofocus>계속 플레이</button><button id="quit-confirm">포기하고 나가기</button></div></dialog>`);
  $('menu-settings').append(document.querySelector('.experiment-settings'));
  if(new URLSearchParams(location.search).get('testUndo')==='1')$('menu-settings').append($('undo'));
  $('menu-open').onclick=()=>{this.onPause();$('play-menu').showModal();};
  $('menu-resume').onclick=()=>$('play-menu').close();
  $('menu-help').onclick=()=>{$('play-menu').close();$('dialog').showModal();};
  $('menu-quit').onclick=()=>this.requestQuit();
  $('quit-cancel').onclick=()=>{$('quit-dialog').close();$('play-menu').close();this.pending=null;this.onPause();};
  $('quit-confirm').onclick=()=>{const action=this.pending;this.pending=null;$('quit-dialog').close();$('play-menu').close();this.onCancel();finishSession(this.session,this.getGame(),true);this.persist();if(action)action();else this.home();};
  $('continue-run').onclick=()=>{if(mayContinue(this.session,this.getGame()))this.play();};
  $('start-regular').onclick=()=>this.replace(()=>{this.onRegular();this.begin();});
  $('open-experiment').onclick=()=>{$('home-experiment').hidden=!$('home-experiment').hidden;};
  $('home-experiment-start').onclick=()=>{
   const value=$('home-seed').value.trim(),seed=Number(value);if(!/^\d+$/.test(value)||!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('home-error').textContent='시드는 0~4294967295 정수입니다.';return;}
   this.replace(()=>{try{this.onExperiment($('home-difficulty').value,seed);$('home-error').textContent='';this.begin();}catch{$('home-error').textContent='이 설정으로 시작하지 못했습니다.';}});
  };
  const target=renderer==='3d'?'index-2d.html':'index.html',query=new URLSearchParams();if(new URLSearchParams(location.search).get('testUndo')==='1')query.set('testUndo','1');
  $('renderer-switch').href=target+(query.size?'?'+query:'');$('renderer-switch').onclick=()=>{this.onCancel();this.persist();};
  const testing=new URLSearchParams(location.search).get('play')==='1';
  if((this.session.screen==='play'&&this.session.slots[slotFor(game())].status!=='abandoned')||(testing&&this.session.slots[slotFor(game())].status!=='abandoned'))this.play();else this.home();
  window.addEventListener('storage',e=>{if(e.key===this.storageKey)this.readLatest();});
  this.refresh();
 }
 readLatest(){let data;try{data=JSON.parse(localStorage.getItem(this.storageKey));}catch{}if(data?.version===1){this.session=restoreSession(data);if(this.session.slots[slotFor(this.getGame())].status==='abandoned'&&this.playing)this.home();}return this.session.slots[slotFor(this.getGame())].status!=='abandoned';}
 persist(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.session));}catch{}}
 refresh(){const g=this.getGame(),state=this.session.slots[slotFor(g)].status;$('continue-run').hidden=!mayContinue(this.session,g);$('home-run').textContent=state==='abandoned'?'이전 시도 · 포기':state==='passed'?'이전 시도 · Pass':state==='failed'?'이전 시도 · Fail':state==='active'?'진행 중인 스테이지가 있어요.':'풍경을 연결하며 다음 수를 생각해 보세요.';}
 setScreen(playing){this.playing=playing;this.session.screen=playing?'play':'home';document.body.dataset.appScreen=this.session.screen;document.querySelector('main.game').inert=!playing;$('start-screen').hidden=playing;$('menu-open').hidden=!playing;this.persist();this.refresh();}
 play(){startSession(this.session,this.getGame());this.setScreen(true);}
 begin(){this.play();}
 home(){this.onCancel();this.setScreen(false);}
 update(game){if(this.session.slots[slotFor(game)].status==='active'){finishSession(this.session,game);this.persist();}this.refresh();}
 replace(action){if(mayContinue(this.session,this.getGame()))this.requestQuit(action);else action();}
 requestQuit(action=null){if(!action&&this.getGame().status!=='playing'){finishSession(this.session,this.getGame());this.home();return;}this.pending=action;$('quit-title').textContent=action?'새 시도를 시작할까요?':'스테이지를 포기할까요?';$('quit-detail').textContent='현재 시도는 포기로 기록되며 이어할 수 없어요.';$('quit-confirm').textContent=action?'포기하고 시작':'포기하고 나가기';$('quit-dialog').showModal();}
}
