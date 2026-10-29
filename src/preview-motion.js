const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export class PreviewMotion{
 constructor(){this.reset();}
 reset(){this.held=false;this.at=-Infinity;this.from={scale:1,height:0};this.offset=0;this.turnAt=-Infinity;}
 sample(now,reduced=false){
  if(reduced)return {scale:1,height:0,turn:0,active:false};
  const age=now-this.at;let scale,height;
  if(this.held){const t=age<120?ease(age/120):ease((age-120)/120),a=age<120?this.from:{scale:1.07,height:.06},b=age<120?{scale:1.07,height:.06}:{scale:1.03,height:.04};scale=a.scale+(b.scale-a.scale)*t;height=a.height+(b.height-a.height)*t;}
  else {const t=ease(age/120);scale=this.from.scale+(1-this.from.scale)*t;height=this.from.height*(1-t);}
  return {scale,height,turn:this.offset*(1-ease((now-this.turnAt)/90)),active:age<(this.held?240:120)||now-this.turnAt<90};
 }
 setHeld(held,now){this.from=this.sample(now);this.at=now;this.held=held;}
 turn(direction,now){this.offset=this.sample(now).turn+direction*Math.PI/3;this.turnAt=now;}
}
