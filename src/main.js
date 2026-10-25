import {renderBoard,renderPreviews,resizeCanvases} from './renderer.js';
import {createGame,place,undo,available,rotate,serialize,deserialize,scorePlacement,objectives} from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),preview=$('preview'),pctx=preview.getContext('2d'),dragCanvas=$('dragpreview'),dctx=dragCanvas.getContext('2d');

let game;try{game=deserialize(JSON.parse(localStorage.getItem('hexhaven-save-v3')))}catch{game=createGame(1)}
let camera={x:0,y:0,zoom:1},size=43,selected=null,drag=null,pan=null;
const spots=()=>available(game.board),valid=p=>p&&spots().some(s=>s.q===p.q&&s.r===p.r);
const save=()=>{try{localStorage.setItem('hexhaven-save-v3',JSON.stringify(serialize(game)))}catch{}};
// Single pointy-top hex geometry. The axial direction index and the terrain
// edge index are the SAME: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
// The old implementation painted edge 1 at SE, reversing the actual neighbors.

function screenToHex(clientX,clientY){const rect=canvas.getBoundingClientRect(),x=(clientX-rect.left-rect.width/2-camera.x)/camera.zoom,y=(clientY-rect.top-rect.height/2-camera.y)/camera.zoom;const q=(Math.sqrt(3)/3*x-y/3)/size,r=(2/3*y)/size;let cx=q,cz=r,cy=-cx-cz,rx=Math.round(cx),ry=Math.round(cy),rz=Math.round(cz);const dx=Math.abs(rx-cx),dy=Math.abs(ry-cy),dz=Math.abs(rz-cz);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return {q:rx,r:rz};}
function draw(){renderBoard(ctx,canvas,game,selected,camera,size);renderPreviews(pctx,dctx,game);}
function resize(){size=resizeCanvases(canvas,ctx,preview,pctx,dragCanvas,dctx,Math.min(window.devicePixelRatio||1,2));draw();}
function update(){const goal=objectives(game);$('objective').textContent=goal.forestTarget?`숲 연결 ${goal.forest} / ${goal.forestTarget}`:'';$('tilegrab').querySelector('span').textContent=game.deck[game.index]?.special?'★ 특별 타일':'다음 타일'; $('stage').textContent=game.stage;$('score').textContent=game.score;$('target').textContent=game.target;$('remaining').textContent=game.deck.length-game.index;$('progress').style.width=Math.min(100,100*game.score/game.target)+'%';$('undo').disabled=!game.history.length;$('left').disabled=$('right').disabled=game.status!=='playing';$('confirm').disabled=game.status!=='playing'||!valid(selected);$('next').hidden=game.status!=='won';$('tilegrab').style.opacity=game.status==='playing'?1:.4;
  if(valid(selected)&&game.status==='playing'){const s=scorePlacement(game.board,selected.q,selected.r,rotate(game.deck[game.index].edges,game.rotation),game.deck[game.index].special);$('selection').textContent=`예상 +${s.points}별 · 일치 ${s.matches}면`;}else $('selection').textContent='빈 칸을 터치해 미리보기';
  $('message').textContent=game.status==='won'?'🎉 스테이지 클리어!':game.status==='lost'?'타일 소진 · 되돌리거나 재시작':'빈 칸 터치 → 60° 회전 → 배치 확정';save();draw();}
function rotateCurrent(d){if(game.status!=='playing')return;game.rotation=(game.rotation-d+6)%6;update();}
$('left').onclick=()=>rotateCurrent(-1);$('right').onclick=()=>rotateCurrent(1);
$('confirm').onclick=()=>{if(valid(selected)&&place(game,selected.q,selected.r)){selected=null;update();}};
$('undo').onclick=()=>{if(undo(game)){selected=null;update();}};
$('restart').onclick=()=>{game=createGame(game.stage);camera={x:0,y:0,zoom:1};selected=null;update();};
$('center').onclick=()=>{camera={x:0,y:0,zoom:1};draw();};
$('next').onclick=()=>{game=createGame(game.stage+1);camera={x:0,y:0,zoom:1};selected=null;update();};
$('help').onclick=()=>$('dialog').showModal();$('close').onclick=()=>$('dialog').close();
// Touch drag is tracked on WINDOW, not the small tile element: it continues
// reliably after the finger leaves the dock. touch-action:none prevents iOS
// scrolling from canceling the gesture.
const grab=$('tilegrab'),badge=$('dragbadge');
function moveDragged(e){if(!drag||e.pointerId!==drag.id)return;drag.moved=true;badge.style.left=`${e.clientX}px`;badge.style.top=`${e.clientY-58}px`;const r=canvas.getBoundingClientRect();const inBoard=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;const p=inBoard?screenToHex(e.clientX,e.clientY-58):null;selected=valid(p)?p:null;draw();$('confirm').disabled=!valid(selected);if(valid(selected)){const s=scorePlacement(game.board,selected.q,selected.r,rotate(game.deck[game.index].edges,game.rotation),game.deck[game.index].special);$('selection').textContent=`예상 +${s.points}별 · 일치 ${s.matches}면`;}else $('selection').textContent='점선 육각형 위로 옮겨 보세요';}
function endDragged(e){if(!drag||e.pointerId!==drag.id)return;const wasValid=e.type!=='pointercancel'&&valid(selected);drag=null;badge.hidden=true;if(!wasValid)selected=null;update();}
grab.addEventListener('pointerdown',e=>{if(game.status!=='playing'||drag||pan||!e.isPrimary||e.button!==0)return;e.preventDefault();grab.setPointerCapture(e.pointerId);drag={id:e.pointerId,moved:false};badge.hidden=false;badge.style.left=`${e.clientX}px`;badge.style.top=`${e.clientY-58}px`;draw();});
window.addEventListener('pointermove',moveDragged,{passive:false});window.addEventListener('pointerup',endDragged);window.addEventListener('pointercancel',endDragged);grab.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.id)endDragged({pointerId:e.pointerId,type:'pointercancel'});});
// Tap an empty cell to preview. Dragging the background pans the board.
canvas.addEventListener('pointerdown',e=>{if(drag||pan||!e.isPrimary||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pan={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};});
canvas.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;const dx=e.clientX-pan.lastX,dy=e.clientY-pan.lastY;if(Math.hypot(e.clientX-pan.x,e.clientY-pan.y)>8)pan.moved=true;if(pan.moved){camera.x+=dx;camera.y+=dy;draw();}pan.lastX=e.clientX;pan.lastY=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(pan&&pan.id===e.pointerId&&!pan.moved&&Math.hypot(e.clientX-pan.x,e.clientY-pan.y)<=8&&game.status==='playing'){const p=screenToHex(e.clientX,e.clientY);if(valid(p)){selected=p;update();}}if(pan?.id===e.pointerId)pan=null;});canvas.addEventListener('pointercancel',e=>{if(pan?.id===e.pointerId)pan=null;});canvas.addEventListener('lostpointercapture',e=>{if(pan?.id===e.pointerId)pan=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.55,Math.min(2,camera.zoom*(e.deltaY<0?1.1:.9)));draw();},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='q'||e.key==='ArrowLeft')rotateCurrent(-1);if(e.key==='e'||e.key==='ArrowRight')rotateCurrent(1);if(e.key==='Escape'){selected=null;update();}});
window.addEventListener('resize',resize);resize();update();
