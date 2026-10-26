import {readFileSync} from 'node:fs';
export function browserHarness(initialStorage=[]){
 const elements=new Map(),listeners=new Map(),storage=new Map(initialStorage),timers=new Map();let timerId=0;
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 const context=new Proxy({}, {get:(target,name)=>target[name]??(()=>{})});
 function element(id){
  if(elements.has(id))return elements.get(id);
  if(!ids.has(id)&&!id.endsWith('-span'))throw Error(`Missing HTML element: ${id}`);
  const handlers=new Map(),el={style:{},hidden:['test-panel','discovery','next'].includes(id),disabled:false,clientWidth:390,clientHeight:844,value:'',
   getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:390,height:844}),
   setPointerCapture(){},querySelector:()=>element(id+'-span'),focus(){this.focused=true;},select(){this.selected=true;},
   addEventListener:(name,fn)=>handlers.set(name,fn),handlers,
   showModal(){this.open=true;},close(){this.open=false;}};
  elements.set(id,el);return el;
 }
 globalThis.document={getElementById:element};
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 globalThis.window={devicePixelRatio:3,addEventListener:(name,fn)=>listeners.set(name,fn),
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
 return {element,storage,listeners,timers,html};
}
export const pointer=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,isPrimary:true,button:0,preventDefault(){}});
