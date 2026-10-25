import {test} from 'node:test';
import assert from 'node:assert/strict';

test('browser adapter renders, selects, rotates, places, undoes and cancels touch',async()=>{
 const elements=new Map(),listeners=new Map(),storage=new Map();
 const context=new Proxy({}, {get:(target,name)=>target[name]??(()=>{})});
 function element(id){
  if(elements.has(id))return elements.get(id);
  const handlers=new Map(),el={style:{},hidden:false,disabled:false,clientWidth:390,clientHeight:844,
   getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:390,height:844}),
   setPointerCapture(){},querySelector:()=>element(id+'-span'),
   addEventListener:(name,fn)=>handlers.set(name,fn),handlers,
   showModal(){this.open=true;},close(){this.open=false;}};
  elements.set(id,el);return el;
 }
 globalThis.document={getElementById:element};
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 globalThis.window={devicePixelRatio:3,addEventListener:(name,fn)=>listeners.set(name,fn)};
 await import('../src/main.js');
 const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,isPrimary:true,button:0,preventDefault(){}});
 const board=element('board');
 board.handlers.get('pointerdown')(event(259,422));
 board.handlers.get('pointerup')(event(259,422));
 assert.equal(element('confirm').disabled,false);
 // Moving the preview requires no dock drag.
 board.handlers.get('pointerdown')(event(227,478));
 board.handlers.get('pointerup')(event(227,478));
 assert.equal(element('confirm').disabled,false);
 element('left').onclick();
 let leftState=JSON.parse(storage.get('hexhaven-save-v3'));assert.equal(leftState.rotation,1);
 element('right').onclick();
 assert.equal(JSON.parse(storage.get('hexhaven-save-v3')).rotation,0);
 element('right').onclick();
 let state=JSON.parse(storage.get('hexhaven-save-v3'));assert.equal(state.rotation,5);
 element('confirm').onclick();
 state=JSON.parse(storage.get('hexhaven-save-v3'));assert.equal(state.board.length,2);assert.equal(state.board[1].q,0);assert.equal(state.board[1].r,1);
 element('undo').onclick();
 state=JSON.parse(storage.get('hexhaven-save-v3'));assert.equal(state.board.length,1);
 element('tilegrab').handlers.get('pointerdown')(event(195,750));
 listeners.get('pointermove')(event(259,480));
 listeners.get('pointercancel')({...event(259,480),type:'pointercancel'});
 assert.equal(element('dragbadge').hidden,true);assert.equal(element('confirm').disabled,true);
 // Background drag must not select a cell or place a tile.
 const before=storage.get('hexhaven-save-v3');
 board.handlers.get('pointerdown')(event(195,422));
 board.handlers.get('pointermove')(event(225,422));
 board.handlers.get('pointerup')(event(225,422));
 assert.equal(element('confirm').disabled,true);
 assert.equal(storage.get('hexhaven-save-v3'),before);
 // A release far away without pointermove is also a drag, not a tap.
 board.handlers.get('pointerdown')(event(195,422));
 board.handlers.get('pointerup')(event(259,422));
 assert.equal(element('confirm').disabled,true);
 // Other fingers and cancellation cannot complete a primary tap.
 board.handlers.get('pointerdown')(event(195,422));
 board.handlers.get('pointerdown')({...event(259,422,2),isPrimary:false});
 board.handlers.get('pointerup')(event(259,422,2));
 board.handlers.get('pointercancel')(event(195,422));
 assert.equal(element('confirm').disabled,true);
 element('center').onclick();element('help').onclick();assert.equal(element('dialog').open,true);
 element('close').onclick();assert.equal(element('dialog').open,false);
 element('restart').onclick();assert.equal(element('remaining').textContent,16);
});
