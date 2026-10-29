import {ThumbControls} from './thumb-controls.js';
import {StageHUD} from './stage-hud.js';
import {AppShell} from './app-shell.js';
import {configureUndo} from './play-policy.js';
import {animalDiscoveryRecords} from './animal-discoveries.js';
import {renderPreviews} from './renderer.js';
import {Board3D} from './renderer3d.js';
import {CameraControls} from './camera-controls.js';
import {placementPreview} from './placement-preview.js';
import {createGame,place,undo,available,rotate,serialize,deserialize,scorePlacement,objectives,createExperiment,experimentResult,EXPERIMENT_MODES} from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('board'),preview=$('preview'),pctx=preview.getContext('2d');

const stageHUD=new StageHUD();
const allowUndo=configureUndo(document,location.search);
const mobile=()=>matchMedia('(pointer:coarse)').matches;
const SESSION_KEY='hexhaven-v08-session';
let shell=null,controls,thumb=null;
let learned=false;try{learned=localStorage.getItem(SESSION_KEY+':thumb-learned')==='1';}catch{}
const NORMAL_KEY='hexhaven-v08-save-v3',EXPERIMENT_KEY='hexhaven-v08-experiment',VIEW_KEY='hexhaven-v08-view';
function readGame(key){try{return deserialize(JSON.parse(localStorage.getItem(key)));}catch{return null;}}
let view;try{view=localStorage.getItem(VIEW_KEY)==='regular'?'regular':'experiment';}catch{view='experiment';}
let game=view==='regular'?(readGame(NORMAL_KEY)??createGame(1)):(readGame(EXPERIMENT_KEY)??createExperiment());
// Never put an ordinary save in the experiment slot or vice versa.
if((view==='experiment')!==!!game.experiment)game=view==='regular'?createGame(1):createExperiment();
const priorSaves={regular:readGame(NORMAL_KEY),experiment:readGame(EXPERIMENT_KEY)};
let selected=null,draftRotation=game.rotation;
const displayGame=()=>({...game,rotation:selected?draftRotation:game.rotation});
function playArea(){
 const hud=document.querySelector('.hud').getBoundingClientRect(),dock=document.querySelector('.dock').getBoundingClientRect();
 const hint=$('selection').getBoundingClientRect(),pad=$('thumb-controls')?.getBoundingClientRect(),bottomPad=pad?.height?pad.top:dock.top,left=16+(parseFloat(getComputedStyle($('game')).paddingLeft)||0);
 if(mobile()&&pad?.height&&innerHeight<600)return {left,right:Math.max(left+160,pad.left-16),top:hud.bottom+10,bottom:innerHeight-16};
 return {left,right:innerWidth-left,top:hud.bottom+12,bottom:Math.max(hud.bottom+100,Math.min(bottomPad,hint.height?hint.top:bottomPad)-16)};
}
function selectTile(cell,{focus=false}={}){if(valid(cell)&&game.status==='playing'){if(!selected)draftRotation=game.rotation;selected=cell;update();if(focus)controls.focusCell(cell,playArea(),{reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches});}}
function tapTile(cell,{pointerType}={}){
 if(pointerType!=='touch'){selectTile(cell);return;}
 if(valid(cell))selectTile(cell,{focus:true});
}
function cancelSelection(){thumb?.pause();controls?.touch?.clearOutside();controls?.stopFocus();board3d.setManipulating(false);selected=null;draftRotation=game.rotation;update();}
const board3d=new Board3D(canvas);
controls=new CameraControls(canvas,board3d.camera,()=>{board3d.invalidate();if(controls){board3d.setStrategic(!!controls.strategic);$('view-mode').hidden=!controls.strategic;}if(selected)positionActions();},tapTile,{
 canRotate:()=>false,
 canCamera:cell=>(!shell||shell.playing)&&!valid(cell),
 start:cell=>{selectTile(cell);board3d.setManipulating(true);$('gesture-cue').textContent='↶  좌우로 회전  ↷';$('gesture-cue').hidden=false;},
 rotate:rotateCurrent,end:()=>{board3d.setManipulating(false);$('gesture-cue').hidden=true;update();},cancel:()=>{$('gesture-cue').hidden=true;cancelSelection();},
 cameraStart:()=>{$('gesture-cue').textContent='↔ 회전 · ↕ 줌';$('gesture-cue').hidden=false;},cameraEnd:()=>{$('gesture-cue').hidden=true;}
});
canvas.addEventListener('hex-webgl-lost',()=>{$('message').hidden=false;$('message').textContent='3D 화면 복구 중입니다. 계속되지 않으면 2D 보기를 선택해 주세요.';});
window.addEventListener('pagehide',event=>{controls.cancelInputs();if(!event.persisted){controls.dispose();board3d.dispose();}});
window.addEventListener('pageshow',event=>{if(event.persisted)resize();});
canvas.addEventListener('hex-webgl-restored',()=>update());
const spots=()=>available(game.board),valid=p=>p&&spots().some(s=>s.q===p.q&&s.r===p.r);
const save=()=>{try{localStorage.setItem(game.experiment?EXPERIMENT_KEY:NORMAL_KEY,JSON.stringify(serialize(game)));localStorage.setItem(VIEW_KEY,game.experiment?'experiment':'regular')}catch{}};
function draw(){controls.setBoard(game.board);board3d.setGame(displayGame(),selected);renderPreviews(pctx,displayGame());positionActions();}
function resize(){thumb?.pause();controls.cancelInputs();preview.width=100;preview.height=100;board3d.resize();draw();}
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
  $('import-v07').disabled=!allowUndo&&game.index>0;
  $('left').disabled=$('right').disabled=game.status!=='playing';
  $('confirm').disabled=game.status!=='playing'||!valid(selected);
  $('next').hidden=!!experiment||game.status!=='won';
  $('tilegrab').style.opacity=game.status==='playing'?1:.4;
  $('difficulty').disabled=$('seed').disabled=$('new-experiment').disabled=!experiment;
  $('difficulty').value=experiment?.difficulty??'standard';
  $('seed').value=experiment?.seed??202607;
  $('settings-label').textContent=experiment?`${EXPERIMENT_MODES[experiment.difficulty].label} · 실험 설정`:'일반 v0.6 · 설정';
  $('switch-view').textContent=experiment?'일반 진행 보기':'강 실험으로';
  $('test-toggle').hidden=!experiment;
  if(!experiment)$('test-panel').hidden=true;
  $('test-result').value=experiment?JSON.stringify({...experimentResult(game),discoveries:animalDiscoveryRecords(game)},null,2):'';
  if(valid(selected)&&game.status==='playing'){
    const source=game.deck[game.index],result=scorePlacement(game.board,selected.q,selected.r,rotate(source.edges,draftRotation),source.special);
    const forecast=placementPreview(displayGame(),selected),before=forecast.before.ecosystem,after=forecast.after.ecosystem;
    const eco=after?` · 강 ${before.water}→${after.water}/${game.experiment.goals.water} · 숲 ${before.forest}→${after.forest}/${game.experiment.goals.forest}${after.otter?' · 수달 조건 충족':after.water===game.experiment.goals.water-1||after.forest===game.experiment.goals.forest-1?' · 목표에 가까워요':''}`:'';
    $('selection').textContent=`예상 +${result.points}별 · ${source.special?'특별 타일 · ':''}일치 ${result.matches}면${eco}`;
  }else $('selection').textContent='';
  $('selection').hidden=!selected;
  $('interaction-hint').textContent=selected?'다른 빈 칸 탭으로 위치 이동':'빈 칸을 탭해 타일을 선택하세요';
  $('message').textContent=game.status==='won'?'Pass · 목표 달성':game.status==='lost'?'Fail · 타일 소진':'';
  $('message').hidden=game.status==='playing';
  stageHUD.update(game);save();shell?.update(game);draw();
}
let eventTimer=null;
function clearEvents(){if(eventTimer!==null)window.clearTimeout(eventTimer);eventTimer=null;$('discovery').hidden=true;}
function showEvents(events){
 const event=events.find(e=>e.id==='otter');if(!event)return;
 clearEvents();$('discovery-text').textContent='새로운 동물 발견! 수달이 강가에 나타났어요.';$('discovery').hidden=false;
 eventTimer=window.setTimeout(clearEvents,3000);
}
$('discovery-close').onclick=clearEvents;
function positionActions(){
 thumb?.update({visible:mobile()&&!!valid(selected)&&game.status==='playing',rotation:draftRotation,learned});
 const panel=$('placement-actions');panel.hidden=mobile()||!valid(selected)||game.status!=='playing'||controls.touch?.state==='rotate';if(panel.hidden)return;
 const pos=board3d.projectWorld(Math.sqrt(3)*(selected.q+selected.r/2),.12,1.5*selected.r);
 const width=180,height=54,hud=document.querySelector('.hud').getBoundingClientRect();
 const x=Math.max(8,Math.min(innerWidth-width-64,pos.x-width/2));
 const minY=Math.min(hud.bottom+8,innerHeight-height-110),maxY=innerHeight-height-110;
 const y=Math.max(8,Math.min(maxY,Math.max(minY,pos.y+30)));
 panel.style.left=x+'px';panel.style.top=y+'px';
}
function resetView(next){clearEvents();game=next;controls.center(game.board);selected=null;draftRotation=game.rotation;update();}
function startExperiment(){
  const raw=String($('seed').value).trim(),seed=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('message').hidden=false;$('message').textContent='시드는 0~4294967295 정수입니다.';return;}
  const mode=$('difficulty').value;if(!EXPERIMENT_MODES[mode])return;
  try{const action=()=>{resetView(createExperiment(mode,seed));shell?.begin();};if(shell)shell.replace(action);else action();}
  catch{$('message').hidden=false;$('message').textContent='이 설정으로 덱을 만들지 못했습니다. 다른 시드로 시작해 주세요.';}
}
$('import-v07').onclick=()=>{
  if(!allowUndo&&game.index>0)return;
  const candidate=readGame('hexhaven-experiment-v07');
  if(candidate?.experiment)resetView(candidate);else {$('message').hidden=false;$('message').textContent='가져올 v0.7 실험 저장이 없습니다.';}
};
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
function rotateCurrent(d){if((shell&&!shell.playing)||game.status!=='playing')return;if(selected)board3d.turnPreview(d);draftRotation=((selected?draftRotation:game.rotation)-d+6)%6;if(!selected){game.rotation=draftRotation;}update();}
$('left').onclick=()=>rotateCurrent(-1);$('right').onclick=()=>rotateCurrent(1);
function syncSavedGame(){
 const key=game.experiment?EXPERIMENT_KEY:NORMAL_KEY,current=readGame(key);
 if(current&&JSON.stringify(serialize(current))!==JSON.stringify(serialize(game))){clearEvents();thumb?.pause();controls.stopFocus();game=current;selected=null;draftRotation=game.rotation;update();return true;}return false;
}
function confirmPlacement(){if((shell&&(!shell.playing||!shell.readLatest()))||syncSavedGame()||!valid(selected))return;controls.stopFocus();const previous=game.rotation;game.rotation=draftRotation;const result=place(game,selected.q,selected.r);if(!result)game.rotation=previous;if(result){selected=null;draftRotation=game.rotation;board3d.setManipulating(false);update();showEvents(result.events??[]);}}
$('confirm').onclick=confirmPlacement;
$('cancel-placement').onclick=cancelSelection;
$('floating-confirm').onclick=()=>$('confirm').onclick();
$('undo').onclick=()=>{if((shell&&!shell.playing)||!allowUndo||syncSavedGame())return;if(undo(game)){clearEvents();selected=null;draftRotation=game.rotation;update();shell?.begin();}};
$('restart').onclick=()=>shell?.requestQuit();
$('center').onclick=()=>controls.center(game.board);
$('zoom-in').onclick=()=>controls.zoom(.85);$('zoom-out').onclick=()=>controls.zoom(1/.85);
$('next').onclick=()=>{if(!game.experiment&&game.status==='won'){resetView(createGame(game.stage+1));shell?.begin();}};
$('help').onclick=()=>$('dialog').showModal();$('close').onclick=()=>$('dialog').close();
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;if(e.key==='q'||e.key==='ArrowLeft')rotateCurrent(-1);if(e.key==='e'||e.key==='ArrowRight')rotateCurrent(1);if(e.key==='Escape')cancelSelection();});
window.addEventListener('storage',e=>{if(e.key===(game.experiment?EXPERIMENT_KEY:NORMAL_KEY))syncSavedGame();});
window.addEventListener('pageshow',()=>syncSavedGame());
thumb=new ThumbControls({enabled:()=>mobile()&&!!selected&&game.status==='playing'&&(!shell||shell.playing)&&!document.querySelector('dialog[open]'),onStart:()=>{controls.cancelInputs();controls.stopFocus();board3d.setManipulating(true);},onTurn:rotateCurrent,onEnd:()=>board3d.setManipulating(false),onConfirm:confirmPlacement,onCancel:cancelSelection,onLearn:()=>{learned=true;thumb.update({visible:true,rotation:draftRotation,learned});try{localStorage.setItem(SESSION_KEY+':thumb-learned','1');}catch{}}});
window.addEventListener('resize',resize);resize();controls.center(game.board);
shell=new AppShell({storageKey:SESSION_KEY,game:()=>game,saves:priorSaves,renderer:'3d',onPause:()=>{thumb.pause();controls.pauseInputs();},onCancel:()=>{controls.cancelInputs();cancelSelection();},onRegular:()=>resetView(createGame(1)),onExperiment:(mode,seed)=>resetView(createExperiment(mode,seed))});update();
window.hexHaven3D={camera:()=>({distance:controls.distance,angle:controls.angle,elevation:controls.elevation,target:controls.target.toArray(),focusing:!!controls.focus,playArea:playArea(),strategic:!!controls.strategic,bounds:controls.bounds}),previewPose:()=>board3d.previewPose(),session:()=>structuredClone(shell.session),gesture:()=>controls.touch?.state,preview:()=>selected?{...selected,rotation:draftRotation}:null,stats:()=>board3d.stats(),project:(x,y,z)=>board3d.projectWorld(x,y,z),otterPose:()=>board3d.otterPose()};
