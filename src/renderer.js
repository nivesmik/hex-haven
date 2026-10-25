// Canvas presentation only; edge order is shared with the axial engine.
const colors={grass:'#a8ce83',forest:'#548b67',water:'#75b7d5',village:'#dcb17c'},icons={grass:'✿',forest:'♠',water:'≈',village:'⌂'};
const vertex=(x,y,s,angle)=>({x:x+s*Math.cos(angle*Math.PI/180),y:y+s*Math.sin(angle*Math.PI/180)});
export function hexPath(c,x,y,s){c.beginPath();for(let i=0;i<6;i++){const p=vertex(x,y,s,-30+60*i);if(!i)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);}c.closePath();}
export function drawTile(c,x,y,s,edges,ghost=false){c.save();c.globalAlpha=ghost?.76:1;for(let i=0;i<6;i++){
  const angle=-60*i,a=vertex(x,y,s,angle-30),b=vertex(x,y,s,angle+30),mid=vertex(x,y,s*.56,angle);
  c.beginPath();c.moveTo(x,y);c.lineTo(a.x,a.y);c.lineTo(b.x,b.y);c.closePath();c.fillStyle=colors[edges[i]];c.fill();
  c.strokeStyle='#ffffff6c';c.lineWidth=.9;c.stroke();c.fillStyle=edges[i]==='forest'?'#285c43':edges[i]==='water'?'#307f9c':'#63754e';c.font=`${Math.round(s*.29)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(icons[edges[i]],mid.x,mid.y);
}hexPath(c,x,y,s);c.strokeStyle=ghost?'#36875f':'#fff';c.lineWidth=ghost?2.5:1.8;c.stroke();c.restore();}
