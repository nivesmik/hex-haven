"""Run with installed Python Playwright, browsers and local socket access.
PLAYWRIGHT_BROWSERS_PATH=/tmp/hex-haven-browsers python scripts/test-browser-v08.py
Uses its own localhost server; never writes GitHub or production saves.
"""
import functools,http.server,json,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height,touch in [(1280,800,False),(390,844,True),(320,568,True)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch,device_scale_factor=2 if touch else 1)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("for(const k of ['hexhaven-save-v3','hexhaven-experiment-v07','hexhaven-view-v07'])localStorage.setItem(k,'OFFICIAL_SENTINEL')")
  page.goto(base,wait_until='networkidle');page.wait_for_function('window.hexHaven3D !== undefined')
  def state():return page.evaluate("JSON.parse(localStorage.getItem('hexhaven-v08-experiment'))")
  assert state()['experiment']['seed']==202607
  point=page.evaluate("""async()=>{
    const T=await import('./vendor/three/three.module.js');
    const c=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,180),a=.6,e=.9,d=17;
    c.position.set(Math.sin(a)*Math.cos(e)*d,Math.sin(e)*d,Math.cos(a)*Math.cos(e)*d);c.lookAt(0,0,0);c.updateMatrixWorld();
    const v=new T.Vector3(Math.sqrt(3),.12,0).project(c);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
  }""")
  page.mouse.click(point['x'],point['y']);assert page.locator('#confirm').is_enabled()
  (page.keyboard.press('ArrowRight') if touch else page.locator('#right').click());assert state()['rotation']==0 if touch else state()['rotation']==0
  baseline=page.evaluate('window.hexHaven3D.stats()')
  for i in range(24):
   if touch:page.keyboard.press('ArrowRight')
   else:page.locator('#right').click()
  after=page.evaluate('window.hexHaven3D.stats()');assert after['geometries']<=baseline['geometries']+1
  page.locator('#floating-confirm' if touch else '#confirm').click();assert state()['index']==1
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D !== undefined');assert state()['index']==1
  page.locator('#undo').click();assert state()['index']==0
  # Background orbit must not place a tile, and touch pinch must not select.
  page.mouse.move(width/2,height/2);page.mouse.down();page.mouse.move(width/2+45,height/2+10,steps=5);page.mouse.up();assert state()['index']==0
  if touch:
   session=context.new_cdp_session(page)
   for kind,points in [('touchStart',[{'x':width/2-30,'y':height/2},{'x':width/2+30,'y':height/2}]),('touchMove',[{'x':width/2-55,'y':height/2},{'x':width/2+55,'y':height/2}]),('touchEnd',[])]:
    session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
   assert state()['index']==0
  page.locator('#settings-label').click();page.locator('#difficulty').select_option('challenge');assert state()['experiment']['difficulty']=='challenge'
  page.locator('#difficulty').select_option('standard');page.locator('#settings-label').click()
  # Replay an existing v0.7 solution through the unchanged engine, then load it in 3D.
  solution=next(row for row in json.loads((ROOT/'test/fixtures/v07-simulation.json').read_text())['results'] if row['difficulty']=='standard' and row['seed']==202607)
  page.evaluate("""async path=>{const E=await import('./src/engine.js');const game=E.createExperiment('standard',202607);for(const move of path){game.rotation=move.rotation;E.place(game,move.q,move.r);}localStorage.setItem('hexhaven-v08-experiment',JSON.stringify(E.serialize(game)));}""",solution['path'])
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D !== undefined')
  assert page.locator('#message').inner_text().startswith('Pass');assert '수달 발견' in page.locator('#eco-state').inner_text()
  assert not errors,errors
  for key in ['hexhaven-save-v3','hexhaven-experiment-v07','hexhaven-view-v07']:assert page.evaluate('(key)=>localStorage.getItem(key)',key)=='OFFICIAL_SENTINEL'
  page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));")
  if width==1280:
   page.evaluate("const ext=document.getElementById('board').getContext('webgl2').getExtension('WEBGL_lose_context');ext.loseContext();setTimeout(()=>ext.restoreContext(),1500);")
   page.wait_for_function("document.getElementById('message').textContent.includes('복구 중')")
   page.wait_for_function("document.getElementById('message').textContent.startsWith('Pass')")
  stats=page.evaluate('window.hexHaven3D.stats()')
  # Desktop SwiftShader timing is diagnostic, not a mobile hardware benchmark.
  timing=page.evaluate("""()=>new Promise(resolve=>{const samples=[];let previous=performance.now();function frame(now){samples.push(now-previous);previous=now;if(samples.length<30)requestAnimationFrame(frame);else resolve(samples.slice(1).sort((a,b)=>a-b)[14]);}requestAnimationFrame(frame);})""")
  shot=Path('/tmp')/f'hex-haven-v08-{width}.png';page.screenshot(path=str(shot))
  report.append({'browser':'Chromium SwiftShader','viewport':f'{width}x{height}','touch':touch,'pageErrors':errors,'wonScene':stats,'medianRafMs':round(timing,2),'screenshot':str(shot)})
  context.close()
 # Explicit v0.7 import copies a valid save without modifying it.
 context=browser.new_context();page=context.new_page();page.goto(base,wait_until='networkidle');page.wait_for_function('window.hexHaven3D !== undefined')
 original=page.evaluate("""async()=>{const E=await import('./src/engine.js');const game=E.createExperiment('comfort',42);E.place(game,1,0);const raw=JSON.stringify(E.serialize(game));localStorage.setItem('hexhaven-experiment-v07',raw);return raw;}""")
 page.locator('#settings-label').click();page.locator('#import-v07').click()
 assert page.evaluate("localStorage.getItem('hexhaven-experiment-v07')")==original
 assert page.evaluate("JSON.parse(localStorage.getItem('hexhaven-v08-experiment')).experiment.seed")==42
 assert page.evaluate("JSON.parse(localStorage.getItem('hexhaven-v08-experiment')).index")==1
 context.close()
 # WebGL unavailable: fallback link must render, without pretending 3D ran.
 context=browser.new_context();page=context.new_page();page.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)}")
 page.goto(base,wait_until='networkidle');assert page.locator('a[href="index-2d.html"]').last.is_visible();context.close()
 browser.close()
server.shutdown()
print(json.dumps(report,indent=2))
