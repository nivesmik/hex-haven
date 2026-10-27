import {AppShell} from './app-shell.js';
import {configureUndo} from './play-policy.js';
import {renderBoard,renderPreviews,resizeCanvases} from './renderer.js';
import {createGame,place,undo,available,rotate,serialize,deserialize,scorePlacement,objectives,createExperiment,experimentResult,EXPERIMENT_MODES} from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),preview=$('preview'),pctx=preview.getContext('2d');

const allowUndo=configureUndo(document,location.search);
const SESSION_KEY='hexhaven-v08-session';
let shell=null;
const NORMAL_KEY='hexhaven-v08-save-v3',EXPERIMENT_KEY='hexhaven-v08-experiment',VIEW_KEY='hexhaven-v08-view';
function readGame(key){try{return deserialize(JSON.parse(localStorage.getItem(key)));}catch{return null;}}
let view;try{view=localStorage.getItem(VIEW_KEY)==='regular'?'regular':'experiment';}catch{view='experiment';}
let game=view==='regular'?(readGame(NORMAL_KEY)??createGame(1)):(readGame(EXPERIMENT_KEY)??createExperiment());
// Never put an ordinary save in the experiment slot or vice versa.
if((view==='experiment')!==!!game.experiment)game=view==='regular'?createGame(1):createExperiment();
const priorSaves={regular:readGame(NORMAL_KEY),experiment:readGame(EXPERIMENT_KEY)};
let draftRotation=game.rotation;const displayGame=()=>({...game,rotation:selected?draftRotation:game.rotation});
let camera={x:0,y:0,zoom:1},size=43,selected=null,pan=null;
const spots=()=>available(game.board),valid=p=>p&&spots().some(s=>s.q===p.q&&s.r===p.r);
const save=()=>{try{localStorage.setItem(game.experiment?EXPERIMENT_KEY:NORMAL_KEY,JSON.stringify(serialize(game)));localStorage.setItem(VIEW_KEY,game.experiment?'experiment':'regular')}catch{}};
// Single pointy-top hex geometry. The axial direction index and the terrain
// edge index are the SAME: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
// The old implementation painted edge 1 at SE, reversing the actual neighbors.

function screenToHex(clientX,clientY){const rect=canvas.getBoundingClientRect(),x=(clientX-rect.left-rect.width/2-camera.x)/camera.zoom,y=(clientY-rect.top-rect.height/2-camera.y)/camera.zoom;const q=(Math.sqrt(3)/3*x-y/3)/size,r=(2/3*y)/size;let cx=q,cz=r,cy=-cx-cz,rx=Math.round(cx),ry=Math.round(cy),rz=Math.round(cz);const dx=Math.abs(rx-cx),dy=Math.abs(ry-cy),dz=Math.abs(rz-cz);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return {q:rx,r:rz};}
function draw(){renderBoard(ctx,canvas,displayGame(),selected,camera,size);renderPreviews(pctx,displayGame());}
function resize(){size=resizeCanvases(canvas,ctx,preview,pctx,Math.min(window.devicePixelRatio||1,2));draw();}
function update(){
  const goal=objectives(game),experiment=game.experiment;
  $('objective').textContent=experiment?`수달 발견 · 강 ${goal.ecosystem.water}/${experiment.goals.water} · 강가 숲 ${goal.ecosystem.forest}/${experiment.goals.forest}`:
    goal.forestTarget?`숲 연결 ${goal.forest}/${goal.forestTarget}`:'별 목표 달성';
  const ecoRatio=experiment?(Math.min(1,goal.ecosystem.water/experiment.goals.water)+Math.min(1,goal.ecosystem.forest/experiment.goals.forest))/2:
    goal.forestTarget?Math.min(1,goal.forest/goal.forestTarget):1;
  $('eco-progress').style.width=100*ecoRatio+'%';
  $('eco-state').textContent=experiment?(goal.ecosystem.otter?'수달 발견 ✓':'생태계 목표'):'일반 진행 목표';
  $('tilegrab').querySelector('span').textContent=game.deck[game.index]?.special?'★ 특별 · 일치당 2별':'다음 타일';
  $('stage').textContent=experiment?'실험':game.stage;
  $('score').textContent=game.score;$('target').textContent=game.target;
  $('remaining').textContent=game.deck.length-game.index;
  $('progress').style.width=Math.min(100,100*game.score/game.target)+'%';
  $('undo').disabled=!allowUndo||!game.history.length;
  $('left').disabled=$('right').disabled=game.status!=='playing';
  $('confirm').disabled=game.status!=='playing'||!valid(selected);
  $('next').hidden=!!experiment||game.status!=='won';
  $('tilegrab').style.opacity=game.status==='playing'?1:.4;
  $('difficulty').disabled=$('seed').disabled=$('new-experiment').disabled=!experiment;
  $('difficulty').value=experiment?.difficulty??'standard';
  $('seed').value=experiment?.seed??202607;
  $('settings-label').textContent=experiment?`${EXPERIMENT_MODES[experiment.difficulty].label} · 실험 설정`:'일반 v0.6 · 설정';
  $('switch-view').textContent=experiment?'일반 v0.6 보기':'v0.7 실험으로';
  $('test-toggle').hidden=!experiment;
  if(!experiment)$('test-panel').hidden=true;
  $('test-result').value=experiment?JSON.stringify(experimentResult(game),null,2):'';
  if(valid(selected)&&game.status==='playing'){
    const source=game.deck[game.index],result=scorePlacement(game.board,selected.q,selected.r,rotate(source.edges,draftRotation),source.special);
    $('selection').textContent=`예상 +${result.points}별 · 일치 ${result.matches}면`;
  }else $('selection').textContent='빈 칸 터치 → 회전 → 배치';
  $('message').textContent=game.status==='won'?'Pass · 목표 달성':game.status==='lost'?'Fail · 타일 소진':'별과 생태계 목표를 함께 완성하세요';
  if(!experiment&&game.status==='playing')$('message').textContent='빈 칸 터치 → 60° 회전 → 배치 확정';
  save();shell?.update(game);draw();
}
let eventTimer=null;
function clearEvents(){if(eventTimer!==null)window.clearTimeout(eventTimer);eventTimer=null;$('discovery').hidden=true;}
function showEvents(events){
 const event=events.find(e=>e.id==='otter');if(!event)return;
 clearEvents();$('discovery-text').textContent='새로운 동물 발견! 수달이 강가에 나타났어요.';$('discovery').hidden=false;
 eventTimer=window.setTimeout(clearEvents,3000);
}
$('discovery-close').onclick=clearEvents;
function resetView(next){clearEvents();game=next;camera={x:0,y:0,zoom:1};selected=null;draftRotation=game.rotation;pan=null;update();}
function startExperiment(){
  const raw=String($('seed').value).trim(),seed=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('message').textContent='시드는 0~4294967295 정수입니다.';return;}
  const mode=$('difficulty').value;if(!EXPERIMENT_MODES[mode])return;
  try{const action=()=>{resetView(createExperiment(mode,seed));shell?.begin();};if(shell)shell.replace(action);else action();}
  catch{$('message').textContent='이 설정으로 덱을 만들지 못했습니다. 다른 시드로 시작해 주세요.';}
}
$('difficulty').onchange=startExperiment;
$('new-experiment').onclick=startExperiment;
$('switch-view').onclick=()=>{
  save();
  const key=game.experiment?NORMAL_KEY:EXPERIMENT_KEY,next=readGame(key);
  resetView(game.experiment?(next&&!next.experiment?next:createGame(1)):(next?.experiment?next:createExperiment()));
};
$('test-toggle').onclick=()=>{$('test-panel').hidden=!$('test-panel').hidden;};
$('copy-result').onclick=async()=>{
  const value=$('test-result').value;
  try{await navigator.clipboard.writeText(value);$('copy-status').textContent='결과를 복사했습니다.';}
  catch{$('test-result').focus();$('test-result').select();$('copy-status').textContent='결과를 선택했습니다. 복사해 주세요.';}
};
function rotateCurrent(d){if(shell&&!shell.playing)return;if(game.status!=='playing')return;draftRotation=((selected?draftRotation:game.rotation)-d+6)%6;if(!selected)game.rotation=draftRotation;update();}
$('left').onclick=()=>rotateCurrent(-1);$('right').onclick=()=>rotateCurrent(1);
$('confirm').onclick=()=>{if((shell&&(!shell.playing||!shell.readLatest()))||syncSavedGame()||!valid(selected))return;game.rotation=draftRotation;const result=place(game,selected.q,selected.r);if(result){selected=null;update();showEvents(result.events??[]);}};
$('undo').onclick=()=>{if(!allowUndo||syncSavedGame())return;if(undo(game)){clearEvents();selected=null;update();shell?.begin();}};
$('restart').onclick=()=>shell?.requestQuit();
$('center').onclick=()=>{camera={x:0,y:0,zoom:1};draw();};
$('next').onclick=()=>{if(!game.experiment&&game.status==='won'){resetView(createGame(game.stage+1));shell?.begin();}};
$('help').onclick=()=>$('dialog').showModal();$('close').onclick=()=>$('dialog').close();
// Tap an empty cell to preview. Dragging the background pans the board.
canvas.addEventListener('pointerdown',e=>{if(pan||!e.isPrimary||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pan={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};});
canvas.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;const dx=e.clientX-pan.lastX,dy=e.clientY-pan.lastY;if(Math.hypot(e.clientX-pan.x,e.clientY-pan.y)>8)pan.moved=true;if(pan.moved){camera.x+=dx;camera.y+=dy;draw();}pan.lastX=e.clientX;pan.lastY=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(pan&&pan.id===e.pointerId&&!pan.moved&&Math.hypot(e.clientX-pan.x,e.clientY-pan.y)<=8&&game.status==='playing'){const p=screenToHex(e.clientX,e.clientY);if(valid(p)){if(!selected)draftRotation=game.rotation;selected=p;update();}else{selected=null;draftRotation=game.rotation;update();}}if(pan?.id===e.pointerId)pan=null;});canvas.addEventListener('pointercancel',e=>{if(pan?.id===e.pointerId)pan=null;});canvas.addEventListener('lostpointercapture',e=>{if(pan?.id===e.pointerId)pan=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.55,Math.min(2,camera.zoom*(e.deltaY<0?1.1:.9)));draw();},{passive:false});
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;if(e.key==='q'||e.key==='ArrowLeft')rotateCurrent(-1);if(e.key==='e'||e.key==='ArrowRight')rotateCurrent(1);if(e.key==='Escape'){selected=null;update();}});
function syncSavedGame(){const current=readGame(game.experiment?EXPERIMENT_KEY:NORMAL_KEY);if(current&&JSON.stringify(serialize(current))!==JSON.stringify(serialize(game))){game=current;selected=null;pan=null;clearEvents();update();return true;}return false;}
window.addEventListener('storage',e=>{if(e.key===(game.experiment?EXPERIMENT_KEY:NORMAL_KEY))syncSavedGame();});
window.addEventListener('pageshow',()=>syncSavedGame());
window.addEventListener('resize',resize);resize();
shell=new AppShell({storageKey:SESSION_KEY,game:()=>game,saves:priorSaves,renderer:'2d',onPause:()=>{pan=null;},onCancel:()=>{selected=null;draftRotation=game.rotation;pan=null;draw();},onRegular:()=>resetView(createGame(1)),onExperiment:(mode,seed)=>resetView(createExperiment(mode,seed))});update();
