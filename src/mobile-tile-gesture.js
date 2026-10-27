// Touch-only state machine. Timers and callbacks are injected for deterministic tests.
export class MobileTileGesture{
 constructor(callbacks,{delay=400,slop=8,step=36,hysteresis=8,setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id),now=()=>performance.now(),doubleDelay=240,doubleRadius=24,cameraHold=150}={}){Object.assign(this,{callbacks,delay,slop,step,hysteresis,setTimer,clearTimer,now,doubleDelay,doubleRadius,cameraHold});this.state='idle';}
 stopTimer(){if(this.timer!=null)this.clearTimer(this.timer);this.timer=null;}
 clearOutside(){if(this.outside)this.clearTimer(this.outside.timer);this.outside=null;}
 cameraStart(){this.stopTimer();this.state='camera';this.callbacks.cameraStart?.();}
 down(e,cell){
  const outside=this.outside,second=outside&&this.now()-outside.at<=this.doubleDelay&&Math.hypot(e.clientX-outside.x,e.clientY-outside.y)<=this.doubleRadius&&this.callbacks.canCamera?.(cell);
  this.clearOutside();if(outside&&!second)this.callbacks.tap(outside.cell,{pointerType:'touch'});
  this.cancel();this.startedAt=this.now();this.start={x:e.clientX,y:e.clientY};this.previous={...this.start};this.cell=cell;this.state=second?'cameraPending':'pending';this.direction=0;
  if(second){this.timer=this.setTimer(()=>{if(this.state==='cameraPending')this.cameraStart();},this.cameraHold);return;}
  if(this.callbacks.canRotate(cell))this.timer=this.setTimer(()=>{if(this.state!=='pending')return;this.timer=null;this.state='rotate';this.anchor=this.previous.x;this.callbacks.start(cell);},this.delay);
 }
 move(e){const next={x:e.clientX,y:e.clientY};
  if(this.state==='cameraPending'&&Math.hypot(next.x-this.start.x,next.y-this.start.y)>this.slop)this.cameraStart();
  if(this.state==='camera')this.callbacks.cameraMove?.(next.x-this.previous.x,next.y-this.previous.y);
  if(this.state==='pending'&&Math.hypot(next.x-this.start.x,next.y-this.start.y)>this.slop){this.stopTimer();this.state='pan';this.previous={...this.start};}
  if(this.state==='pan')this.callbacks.pan(next.x-this.previous.x,next.y-this.previous.y,this.previous.x,this.previous.y);
  if(this.state==='rotate'){
   let delta=next.x-this.anchor,sign=Math.sign(delta),threshold=this.step+(this.direction&&sign!==this.direction?this.hysteresis:0);
   while(Math.abs(delta)>=threshold){this.callbacks.rotate(sign);this.direction=sign;this.anchor+=sign*this.step;delta=next.x-this.anchor;sign=Math.sign(delta);threshold=this.step+(sign!==this.direction?this.hysteresis:0);}
  }
  this.previous=next;
 }
 up(e){this.stopTimer();if(this.state==='pending'&&this.now()-this.startedAt<this.delay&&Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)<=this.slop){if(this.callbacks.canCamera?.(this.cell)){const pending={cell:this.cell,x:e.clientX,y:e.clientY,at:this.now()};pending.timer=this.setTimer(()=>{if(this.outside===pending){this.outside=null;this.callbacks.tap(pending.cell,{pointerType:'touch'});}},this.doubleDelay);this.outside=pending;}else this.callbacks.tap(this.cell,{pointerType:'touch'});}
  const rotating=this.state==='rotate',camera=this.state==='camera';this.state='idle';if(rotating)this.callbacks.end();if(camera)this.callbacks.cameraEnd?.();
 }
 cancel(){this.clearOutside();this.stopTimer();if(this.state==='camera'||this.state==='cameraPending')this.callbacks.cameraEnd?.();if(this.state==='rotate')this.callbacks.cancel();this.state='idle';}
}
