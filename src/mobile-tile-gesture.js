// Touch-only state machine. Timers and callbacks are injected for deterministic tests.
export class MobileTileGesture{
 constructor(callbacks,{delay=400,slop=8,step=36,hysteresis=8,setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id),now=()=>performance.now()}={}){Object.assign(this,{callbacks,delay,slop,step,hysteresis,setTimer,clearTimer,now});this.state='idle';}
 stopTimer(){if(this.timer!=null)this.clearTimer(this.timer);this.timer=null;}
 down(e,cell){this.cancel();this.startedAt=this.now();this.start={x:e.clientX,y:e.clientY};this.previous={...this.start};this.cell=cell;this.state='pending';this.direction=0;
  if(this.callbacks.canRotate(cell))this.timer=this.setTimer(()=>{if(this.state!=='pending')return;this.timer=null;this.state='rotate';this.anchor=this.previous.x;this.callbacks.start(cell);},this.delay);
 }
 move(e){const next={x:e.clientX,y:e.clientY};
  if(this.state==='pending'&&Math.hypot(next.x-this.start.x,next.y-this.start.y)>this.slop){this.stopTimer();this.state='pan';this.previous={...this.start};}
  if(this.state==='pan')this.callbacks.pan(next.x-this.previous.x,next.y-this.previous.y,this.previous.x,this.previous.y);
  if(this.state==='rotate'){
   let delta=next.x-this.anchor,sign=Math.sign(delta),threshold=this.step+(this.direction&&sign!==this.direction?this.hysteresis:0);
   while(Math.abs(delta)>=threshold){this.callbacks.rotate(sign);this.direction=sign;this.anchor+=sign*this.step;delta=next.x-this.anchor;sign=Math.sign(delta);threshold=this.step+(sign!==this.direction?this.hysteresis:0);}
  }
  this.previous=next;
 }
 up(e){this.stopTimer();if(this.state==='pending'&&this.now()-this.startedAt<this.delay&&Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)<=this.slop)this.callbacks.tap(this.cell,{pointerType:'touch'});
  const rotating=this.state==='rotate';this.state='idle';if(rotating)this.callbacks.end();
 }
 cancel(){this.stopTimer();if(this.state==='rotate')this.callbacks.cancel();this.state='idle';}
}
