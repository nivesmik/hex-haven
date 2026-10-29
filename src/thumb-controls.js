// The gesture owns its initial pointer until release, even outside the pad.
export class ThumbRotation{
 constructor(){this.begin(0);}
 begin(x){this.anchor=x;this.direction=0;}
 move(x){const turns=[];let dx=x-this.anchor,sign=Math.sign(dx),limit=32+(this.direction&&sign!==this.direction?8:0);
 while(Math.abs(dx)>=limit){turns.push(sign);this.direction=sign;this.anchor+=sign*32;dx=x-this.anchor;sign=Math.sign(dx);limit=32+(sign!==this.direction?8:0);}return turns;}
}
export class ThumbControls{
 constructor({enabled,onStart,onTurn,onEnd,onConfirm,onCancel,onLearn}){
  Object.assign(this,{enabled,onStart,onTurn,onEnd,onConfirm,onCancel,onLearn});this.points=new Set();this.turns=0;this.epoch=0;this.rotation=new ThumbRotation();
  document.querySelector('main.game').insertAdjacentHTML('beforeend',`<section id="thumb-controls" aria-label="타일 회전 및 배치" hidden><div id="thumb-rotate" role="slider" tabindex="0" aria-label="좌우로 밀어 타일 회전" aria-valuemin="0" aria-valuemax="300" aria-valuenow="0"><span aria-hidden="true">↶</span><span id="thumb-instruction">좌우로 밀어 회전</span><span aria-hidden="true">↷</span></div><div class="thumb-buttons"><button id="thumb-cancel" aria-label="미리보기 취소">× <span>취소</span></button><small>방향 유지 · 자동 배치 없음</small><button id="thumb-confirm" aria-label="미리보기 배치">✓ <span>배치</span></button></div></section>`);
  this.panel=document.getElementById('thumb-controls');this.pad=document.getElementById('thumb-rotate');
  const down=e=>{
   this.points.add(e.pointerId);
   if((this.owner!=null||this.buttonOwner!=null)&&this.points.size>1){this.blocked=true;this.epoch++;this.finish();}
   if(this.blocked){e.preventDefault();e.stopImmediatePropagation();}
  };
  const release=e=>{this.points.delete(e.pointerId);if(this.blocked){e.preventDefault();e.stopImmediatePropagation();if(!this.points.size)this.blocked=false;}};
  window.addEventListener('pointerdown',down,true);window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);
  this.pad.addEventListener('pointerdown',e=>{
   if(this.blocked||this.points.size!==1||!this.enabled()||e.button!==0)return;
   e.preventDefault();this.owner=e.pointerId;this.rotation.begin(e.clientX);this.pad.setPointerCapture(e.pointerId);this.panel.dataset.rotating='true';this.onStart();
  });
  this.pad.addEventListener('pointermove',e=>{
   if(e.pointerId!==this.owner||this.blocked)return;e.preventDefault();
   for(const sign of this.rotation.move(e.clientX)){this.onTurn(sign);this.onLearn();}
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])this.pad.addEventListener(name,e=>{if(e.pointerId===this.owner)this.finish();});
  this.pad.addEventListener('keydown',e=>{if(!this.enabled()||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();this.onTurn(e.key==='ArrowRight'?1:-1);this.onLearn();});
  this.bindButton('thumb-confirm',()=>this.onConfirm());this.bindButton('thumb-cancel',()=>this.onCancel());
  window.addEventListener('blur',()=>this.pause());window.addEventListener('resize',()=>this.pause());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
 }
 bindButton(id,action){
  const button=document.getElementById(id);let press=null;
  button.addEventListener('pointerdown',e=>{if(this.blocked||this.owner!=null||this.points.size!==1||!this.enabled()||e.button!==0)return;e.preventDefault();this.buttonOwner=e.pointerId;press={id:e.pointerId,x:e.clientX,y:e.clientY,epoch:this.epoch};button.setPointerCapture(e.pointerId);});
  button.addEventListener('pointermove',e=>{if(press?.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press=null;});
  button.addEventListener('pointerup',e=>{const p=press;press=null;this.buttonOwner=null;const r=button.getBoundingClientRect();if(p?.id===e.pointerId&&p.epoch===this.epoch&&!this.blocked&&this.enabled()&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)action();});
  for(const event of ['pointercancel','lostpointercapture'])button.addEventListener(event,()=>{press=null;});
  button.addEventListener('click',e=>{e.preventDefault();if(e.detail===0&&!this.blocked&&this.owner==null&&this.enabled())action();});
 }
 finish(){this.owner=null;delete this.panel.dataset.rotating;this.onEnd();}
 pause(){this.epoch++;this.buttonOwner=null;this.finish();this.blocked=this.points.size>0;}
 update({visible,rotation,learned}){this.panel.hidden=!visible;document.body.dataset.tilePreview=visible?'true':'false';this.pad.setAttribute('aria-valuenow',String(rotation*60));this.pad.setAttribute('aria-valuetext',rotation*60+'도');this.panel.classList.toggle('teach',!learned);document.getElementById('thumb-instruction').textContent=learned?'밀어 회전':'좌우로 밀어 회전';}
}
