import {THEMES} from './ecosystem.js';
import {available,rotate,scorePlacement,ecosystemProgress} from './engine.js';
// Canvas presentation only; edge order is shared with the axial engine.
const colors={grass:'#a8ce83',forest:'#548b67',water:'#75b7d5',village:'#dcb17c'},icons={grass:'✿',forest:'♠',water:'≈',village:'⌂'};
const vertex=(x,y,s,angle)=>({x:x+s*Math.cos(angle*Math.PI/180),y:y+s*Math.sin(angle*Math.PI/180)});
export function hexPath(c,x,y,s){c.beginPath();for(let i=0;i<6;i++){const p=vertex(x,y,s,-30+60*i);if(!i)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);}c.closePath();}
export function drawTile(c,x,y,s,edges,ghost=false,special=false){c.save();c.globalAlpha=ghost?.76:1;for(let i=0;i<6;i++){
  const angle=-60*i,a=vertex(x,y,s,angle-30),b=vertex(x,y,s,angle+30),mid=vertex(x,y,s*.56,angle);
  c.beginPath();c.moveTo(x,y);c.lineTo(a.x,a.y);c.lineTo(b.x,b.y);c.closePath();c.fillStyle=colors[edges[i]];c.fill();
  c.strokeStyle='#ffffff6c';c.lineWidth=.9;c.stroke();c.fillStyle=edges[i]==='forest'?'#285c43':edges[i]==='water'?'#307f9c':'#63754e';c.font=`${Math.round(s*.29)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(icons[edges[i]],mid.x,mid.y);
}hexPath(c,x,y,s);c.strokeStyle=ghost?'#36875f':'#fff';c.lineWidth=ghost?2.5:1.8;c.stroke();if(special){c.fillStyle='#784f10';c.beginPath();c.arc(x,y,s*.19,0,Math.PI*2);c.fill();c.fillStyle='#fff4b8';c.font=`bold ${Math.round(s*.28)}px system-ui`;c.fillText('★',x,y);}c.restore();}

export function renderBoard(ctx,canvas,game,selected,camera,size){
  const spots=()=>available(game.board),valid=p=>p&&spots().some(s=>s.q===p.q&&s.r===p.r);
  const xy=(q,r)=>({x:Math.sqrt(3)*size*(q+r/2),y:1.5*size*r});
const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2+camera.x,h/2+camera.y);ctx.scale(camera.zoom,camera.zoom);
  for(const s of spots()){const p=xy(s.q,s.r);hexPath(ctx,p.x,p.y,size-1);ctx.fillStyle=selected&&s.q===selected.q&&s.r===selected.r?'#ffffffbd':'#ffffff55';ctx.fill();ctx.setLineDash([5,5]);ctx.strokeStyle='#80b695';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);}
  for(const tile of game.board.values()){const p=xy(tile.q,tile.r);drawTile(ctx,p.x,p.y,size-1,tile.edges,false,tile.special);}
  if(valid(selected)&&game.status==='playing'){const p=xy(selected.q,selected.r),edges=rotate(game.deck[game.index].edges,game.rotation);drawTile(ctx,p.x,p.y,size-1,edges,true,game.deck[game.index].special);const s=scorePlacement(game.board,selected.q,selected.r,edges,game.deck[game.index].special);ctx.fillStyle='#286b4b';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText(`+${s.points}`,p.x,p.y-size-14);}
  drawEcology(ctx,game,xy,size);
  ctx.restore();
}
export function renderPreviews(pctx,game){
  pctx.clearRect(0,0,100,100);
  if(game.status==='playing'){const tile=game.deck[game.index];drawTile(pctx,50,50,42,rotate(tile.edges,game.rotation),false,tile.special);}
}
export function resizeCanvases(canvas,ctx,preview,pctx,dpr){
  const r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  preview.width=100;preview.height=100;pctx.setTransform(1,0,0,1,0,0);
  return Math.min(48,Math.max(35,Math.min(r.width,r.height)*.095));
}
function drawEcology(ctx,game,xy,size){
  if(!game.experiment)return;
  const progress=ecosystemProgress(game),forest=new Set(progress.forestTiles),theme=THEMES[game.experiment.theme];
  const habitat=theme.plants.find(p=>p.kind==='habitat'),change=theme.plants.find(p=>p.kind==='change');
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.round(size*.32)}px system-ui`;
  for(const tile of game.board.values()){
    const p=xy(tile.q,tile.r);
    // Ordinary plants use small decorative strokes, never a permanent icon.
    if(tile.edges.includes(theme.plants.find(p=>p.kind==='ordinary').terrain)){
      ctx.strokeStyle='#4f865b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-size*.16,p.y+size*.15);ctx.lineTo(p.x-size*.16,p.y+size*.04);ctx.moveTo(p.x-size*.16,p.y+size*.11);ctx.lineTo(p.x-size*.23,p.y+size*.07);ctx.stroke();
    }
    if(forest.has(`${tile.q},${tile.r}`)&&progress.habitat){
      ctx.fillText(progress.vegetation?change.icon:habitat.icon,p.x+size*.18,p.y+size*.16);
    }
  }
  if(progress.river){
    const tile=game.board.get(progress.waterTiles[0]),p=xy(tile.q,tile.r);
    ctx.fillText(progress.otter?'🦦':'🐟',p.x-size*.18,p.y-size*.18);
  }
  ctx.restore();
}
