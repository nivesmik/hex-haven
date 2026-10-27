import functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{s.server_port}',wait_until='networkidle');page.wait_for_function('window.hexHaven3D')
 session=c.new_cdp_session(page)
 def touch(kind,pts):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
 def state():return page.evaluate("localStorage.getItem('hexhaven-v08-experiment')")
 def point():return page.evaluate('window.hexHaven3D.project(Math.sqrt(3),.12,0)')
 pos=point();x,y=pos['x'],pos['y'];before=state()
 touch('touchStart',[(x,y)]);touch('touchEnd',[]);assert page.locator('#placement-actions').is_visible()
 assert state()==before;page.locator('#cancel-placement').tap();assert page.evaluate('window.hexHaven3D.preview()') is None;assert state()==before
 touch('touchStart',[(x,y)]);page.wait_for_timeout(450);assert page.evaluate('window.hexHaven3D.gesture()')=='rotate'
 touch('touchMove',[(x+45,y)]);assert page.evaluate('window.hexHaven3D.preview().rotation')==5
 touch('touchMove',[(x+42,y)]);assert page.evaluate('window.hexHaven3D.preview().rotation')==5
 assert state()==before;touch('touchEnd',[]);assert state()==before
 page.screenshot(path='/tmp/v08-mobile-rotation.png');page.locator('#cancel-placement').tap();assert state()==before
 touch('touchStart',[(x,y)]);page.wait_for_timeout(450);touch('touchMove',[(x-45,y)]);touch('touchEnd',[]);page.locator('#floating-confirm').tap()
 assert json.loads(state())['index']==1 and json.loads(state())['board'][1]['edges']
 page.locator('#undo').tap();assert json.loads(state())['index']==0
 # A drag that wins the race stays a pan even after 400ms.
 page.locator('#center').tap();pos=point();x,y=pos['x'],pos['y']
 touch('touchStart',[(x,y)]);touch('touchMove',[(x+25,y)]);page.wait_for_timeout(450);assert page.evaluate('window.hexHaven3D.gesture()')=='pan';touch('touchEnd',[]);assert page.evaluate('window.hexHaven3D.preview()') is None
 page.locator('#center').tap();pos=point();x,y=pos['x'],pos['y']
 touch('touchStart',[(x,y)]);page.wait_for_timeout(450);touch('touchStart',[(x,y),(x+80,y)]);assert page.evaluate('window.hexHaven3D.preview()') is None;touch('touchMove',[(x-10,y),(x+100,y)]);touch('touchEnd',[])
 assert json.loads(state())['index']==0
 page.locator('#center').tap();pos=point();x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);page.wait_for_timeout(450);touch('touchCancel',[]);assert page.evaluate('window.hexHaven3D.preview()') is None
 # Produce a genuine final otter discovery from a saved penultimate board.
 row=next(r for r in json.loads((root/'test/fixtures/v07-simulation.json').read_text())['results'] if r['difficulty']=='standard' and r['seed']==202607)
 page.evaluate("""async path=>{const E=await import('./src/engine.js');const g=E.createExperiment('standard',202607);for(const m of path){g.rotation=m.rotation;E.place(g,m.q,m.r);}g.ecosystem.seen=g.ecosystem.seen.filter(id=>id!=='otter');E.undo(g);localStorage.setItem('hexhaven-v08-experiment',JSON.stringify(E.serialize(g)));}""",row['path'])
 page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');m=row['path'][-1]
 # Camera fits saved board; project selection using the actual renderer.
 pos=page.evaluate('(m)=>window.hexHaven3D.project(Math.sqrt(3)*(m.q+m.r/2),.12,1.5*m.r)',m)
 preDiscovery=state();page.touchscreen.tap(pos['x'],pos['y']);page.locator('#floating-confirm').tap()
 assert page.locator('#discovery').is_visible();assert page.locator('#discovery-text').inner_text()=='새로운 동물 발견! 수달이 강가에 나타났어요.'
 page.locator('#discovery-close').tap();assert page.locator('#discovery').is_hidden()
 page.locator('#undo').tap();page.touchscreen.tap(pos['x'],pos['y']);page.locator('#floating-confirm').tap();assert page.locator('#discovery').is_hidden()
 page.evaluate("raw=>localStorage.setItem('hexhaven-v08-experiment',raw)",preDiscovery);page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');page.touchscreen.tap(pos['x'],pos['y']);page.locator('#floating-confirm').tap();assert page.locator('#discovery').is_visible();page.wait_for_timeout(3100);assert page.locator('#discovery').is_hidden()
 assert not errors,errors;print('PASS mobile: tap/400ms rotation/hysteresis/cancel/confirm/pan-first/multitouch/pinch/pointercancel/otter dismissal/no replay')
 b.close()
s.shutdown()
