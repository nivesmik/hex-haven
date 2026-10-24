import {createGame,place,undo,available,rotate,serialize,deserialize,key,scorePlacement} from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),preview=$('preview'),pctx=preview.getContext('2d'),dragCanvas=$('dragpreview'),dctx=dragCanvas.getContext('2d');
const colors={grass:'#a8ce83',forest:'#548b67',water:'#75b7d5',village:'#dcb17c'},icons={grass:'✿',forest:'♠',water:'≈',village:'⌂'};
let game;try{game=deserialize(JSON.parse(localStorage.getItem('hexhaven-save')))}catch{game=createGame(1)}
let camera={x:0,y:0,zoom:1},size=43,selected=null,drag=null,pan=null;
const spots=()=>available(game.board),valid=p=>p&&spots().some(s=>s.q===p.q&&s.r===p.r);
const save=()=>{try{localStorage.setItem('hexhaven-save',JSON.stringify(serialize(game)))}catch{}};
// Single pointy-top hex geometry. The axial direction index and the terrain
// edge index are the SAME: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
// The old implementation painted edge 1 at SE, reversing the actual neighbors.
const vertex=(x,y,s,angle)=>({x:x+s*Math.cos(angle*Math.PI/180),y:y+s*Math.sin(angle*Math.PI/180)});
function hexPath(c,x,y,s){c.beginPath();for(let i=0;i<6;i++){const p=vertex(x,y,s,-30+60*i);if(!i)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);}c.closePath();}
function drawTile(c,x,y,s,edges,ghost=false){c.save();c.globalAlpha=ghost?.76:1;for(let i=0;i<6;i++){
  const angle=-60*i,a=vertex(x,y,s,angle-30),b=vertex(x,y,s,angle+30),mid=vertex(x,y,s*.56,angle);
  c.beginPath();c.moveTo(x,y);c.lineTo(a.x,a.y);c.lineTo(b.x,b.y);c.closePath();c.fillStyle=colors[edges[i]];c.fill();
  c.strokeStyle='#ffffff6c';c.lineWidth=.9;c.stroke();c.fillStyle=edges[i]==='forest'?'#285c43':edges[i]==='water'?'#307f9c':'#63754e';c.font=`${Math.round(s*.29)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(icons[edges[i]],mid.x,mid.y);
}hexPath(c,x,y,s);c.strokeStyle=ghost?'#36875f':'#fff';c.lineWidth=ghost?2.5:1.8;c.stroke();c.restore();}
const xy=(q,r)=>({x:Math.sqrt(3)*size*(q+r/2),y:1.5*size*r});
function screenToHex(clientX,clientY){const rect=canvas.getBoundingClientRect(),x=(clientX-rect.left-rect.width/2-camera.x)/camera.zoom,y=(clientY-rect.top-rect.height/2-camera.y)/camera.zoom;const q=(Math.sqrt(3)/3*x-y/3)/size,r=(2/3*y)/size;let cx=q,cz=r,cy=-cx-cz,rx=Math.round(cx),ry=Math.round(cy),rz=Math.round(cz);const dx=Math.abs(rx-cx),dy=Math.abs(ry-cy),dz=Math.abs(rz-cz);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return {q:rx,r:rz};}
function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2+camera.x,h/2+camera.y);ctx.scale(camera.zoom,camera.zoom);
  for(const s of spots()){const p=xy(s.q,s.r);hexPath(ctx,p.x,p.y,size-1);ctx.fillStyle=selected&&s.q===selected.q&&s.r===selected.r?'#ffffffbd':'#ffffff55';ctx.fill();ctx.setLineDash([5,5]);ctx.strokeStyle='#80b695';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);}
  for(const tile of game.board.values()){const p=xy(tile.q,tile.r);drawTile(ctx,p.x,p.y,size-1,tile.edges);}
  if(valid(selected)&&game.status==='playing'){const p=xy(selected.q,selected.r),edges=rotate(game.deck[game.index].edges,game.rotation);drawTile(ctx,p.x,p.y,size-1,edges,true);const s=scorePlacement(game.board,selected.q,selected.r,edges);ctx.fillStyle='#286b4b';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText(`+${s.points}`,p.x,p.y-size-14);}
  ctx.restore();pctx.clearRect(0,0,100,100);dctx.clearRect(0,0,110,110);if(game.status==='playing'){const edges=rotate(game.deck[game.index].edges,game.rotation);drawTile(pctx,50,50,42,edges);drawTile(dctx,55,55,48,edges,true);}
}
function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);for(const [c,context,n] of [[preview,pctx,100],[dragCanvas,dctx,110]]){c.width=n;c.height=n;context.setTransform(1,0,0,1,0,0);}size=Math.min(48,Math.max(35,Math.min(r.width,r.height)*.095));draw();}
function update(){ $('stage').textContent=game.stage;$('score').textContent=game.score;$('target').textContent=game.target;$('remaining').textContent=game.deck.length-game.index;$('progress').style.width=Math.min(100,100*game.score/game.target)+'%';$('undo').disabled=!game.history.length;$('left').disabled=$('right').disabled=game.status!=='playing';$('confirm').disabled=game.status!=='playing'||!valid(selected);$('next').hidden=game.status!=='won';$('tilegrab').style.opacity=game.status==='playing'?1:.4;
  if(valid(selected)&&game.status==='playing'){const s=scorePlacement(game.board,selected.q,selected.r,rotate(game.deck[game.index].edges,game.rotation));$('selection').textContent=`예상 +${s.points}점 · 일치 ${s.matches}면`;}else $('selection').textContent='타일을 잡아 빈 칸으로 끌어 놓으세요';
  $('message').textContent=game.status==='won'?'🎉 스테이지 클리어!':game.status==='lost'?'타일 소진 · 되돌리거나 재시작':'드래그 → 위치 선택 · 회전 → 배치 확정';save();draw();}
function rotateCurrent(d){if(game.status!=='playing')return;game.rotation=(game.rotation+d*2+6)%6;update();}
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
function moveDragged(e){if(!drag||e.pointerId!==drag.id)return;drag.moved=true;badge.style.left=`${e.clientX}px`;badge.style.top=`${e.clientY-58}px`;const r=canvas.getBoundingClientRect();const inBoard=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;const p=inBoard?screenToHex(e.clientX,e.clientY-58):null;selected=valid(p)?p:null;draw();$('confirm').disabled=!valid(selected);if(valid(selected)){const s=scorePlacement(game.board,selected.q,selected.r,rotate(game.deck[game.index].edges,game.rotation));$('selection').textContent=`예상 +${s.points}점 · 일치 ${s.matches}면`;}else $('selection').textContent='점선 육각형 위로 옮겨 보세요';}
function endDragged(e){if(!drag||e.pointerId!==drag.id)return;const wasValid=valid(selected);drag=null;badge.hidden=true;if(!wasValid)selected=null;update();}
grab.addEventListener('pointerdown',e=>{if(game.status!=='playing')return;e.preventDefault();drag={id:e.pointerId,moved:false};badge.hidden=false;badge.style.left=`${e.clientX}px`;badge.style.top=`${e.clientY-58}px`;draw();});
window.addEventListener('pointermove',moveDragged,{passive:false});window.addEventListener('pointerup',endDragged);window.addEventListener('pointercancel',endDragged);
// Tap an empty cell to preview. Dragging the background pans the board.
canvas.addEventListener('pointerdown',e=>{if(drag)return;canvas.setPointerCapture(e.pointerId);pan={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};});
canvas.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;const dx=e.clientX-pan.lastX,dy=e.clientY-pan.lastY;if(Math.hypot(e.clientX-pan.x,e.clientY-pan.y)>8)pan.moved=true;if(pan.moved){camera.x+=dx;camera.y+=dy;draw();}pan.lastX=e.clientX;pan.lastY=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(pan&&pan.id===e.pointerId&&!pan.moved&&game.status==='playing'){const p=screenToHex(e.clientX,e.clientY);if(valid(p)){selected=p;update();}}pan=null;});canvas.addEventListener('pointercancel',()=>pan=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.55,Math.min(2,camera.zoom*(e.deltaY<0?1.1:.9)));draw();},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='q'||e.key==='ArrowLeft')rotateCurrent(-1);if(e.key==='e'||e.key==='ArrowRight')rotateCurrent(1);if(e.key==='Escape'){selected=null;update();}});
window.addEventListener('resize',resize);resize();update();
