"""Real Chromium touch input; no engine mutations except saved discovery fixtures.
Also runs against a published preview with --url and --prefix.
"""
import argparse,functools,http.server,json,threading,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from verified_pages import verified_pages
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--source-sha');parser.add_argument('--prefix',default='');parser.add_argument('--output',default='/tmp/v08-puzzle');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None
if args.url:
 base=args.url;verified,manifest=verified_pages(base,args.source_sha);print('Verified public HTTPS assets:',len(manifest['files']),manifest['source_sha'],flush=True)
else:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
key=args.prefix+'hexhaven-v08-experiment';report=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height,label in [(390,844,'phone-portrait'),(844,390,'phone-landscape'),(768,1024,'tablet-portrait'),(1024,768,'tablet-landscape'),(320,568,'small-phone')]:
  print('Testing',label,flush=True)
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if args.url:page.route('https://nivesmik.github.io/**',verified)
  page.goto(base+'?play=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D')
  session=c.new_cdp_session(page)
  def touch(kind,pts):
   session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
   if kind!='touchStart':page.wait_for_timeout(60)
  def state():return page.evaluate('(key)=>localStorage.getItem(key)',key)
  def point(q=1,r=0):return page.evaluate('p=>window.hexHaven3D.project(Math.sqrt(3)*(p.q+p.r/2),.12,1.5*p.r)',{'q':q,'r':r})
  def tap(pos):
   page.touchscreen.tap(pos['x'],pos['y']);page.wait_for_timeout(80)
  def wait_focus():page.wait_for_function('!window.hexHaven3D.camera().focusing')
  def preview():return page.evaluate('window.hexHaven3D.preview()')
  # No permanent or floating commit/cancel/rotate/undo controls on mobile.
  for id in ['confirm','cancel-placement','floating-confirm','left','right','undo']:assert page.locator('#'+id).is_hidden(),id
  before=state();pos=point();camera=page.evaluate('window.hexHaven3D.camera()');tap(pos)
  assert preview()=={'q':1,'r':0,'rotation':0};assert state()==before;wait_focus();after=page.evaluate('window.hexHaven3D.camera()')
  assert after['angle']==camera['angle'] and after['elevation']==camera['elevation'];assert after['distance']>=camera['distance']
  pos=point();area=after['playArea'];assert abs(pos['x']-(area['left']+area['right'])/2)<1
  assert abs(pos['y']-(area['top']+area['bottom'])/2)<1
  # All corners of all seven hexes lie inside the available viewport.
  bounds=page.evaluate('''()=>{let points=[];for(const [q,r] of [[1,0],[2,0],[2,-1],[1,-1],[0,0],[0,1],[1,1]])for(let i=0;i<6;i++)for(const y of [.12,.95])points.push(window.hexHaven3D.project(Math.sqrt(3)*(q+r/2)+Math.cos(i*Math.PI/3+Math.PI/6),y,1.5*r+Math.sin(i*Math.PI/3+Math.PI/6)));return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}''')
  assert bounds['left']>=area['left']-.2 and bounds['right']<=area['right']+.2 and bounds['top']>=area['top']-.2 and bounds['bottom']<=area['bottom']+.2,(label,bounds,area)
  # Approved change: another empty cell relocates once and preserves the draft.
  tap(point(0,1));assert preview()['r']==1;assert state()==before;wait_focus()
  tap(point(0,0));page.wait_for_timeout(300);assert preview() is None
  # Preview/camera stop at the next down; hold, rotate, release never commits.
  tap(point());pos=point();touch('touchStart',[(pos['x'],pos['y'])]);page.wait_for_timeout(450);assert page.evaluate('window.hexHaven3D.gesture()')=='rotate'
  frozen=page.evaluate('window.hexHaven3D.camera()');x,y=pos['x'],pos['y'];touch('touchMove',[(x+45,y)]);assert preview()['rotation']==5
  touch('touchMove',[(x+42,y)]);assert preview()['rotation']==5;assert page.evaluate('window.hexHaven3D.camera()')==frozen
  touch('touchMove',[(x-9,y)]);assert preview()['rotation']==0;touch('touchMove',[(x-45,y)]);assert preview()['rotation']==1
  touch('touchEnd',[]);assert state()==before and preview()['rotation']==1
  page.screenshot(path=str(out/(label+'.png')))
  # UI taps have priority and do not cancel. Score/terrain forecast updated.
  assert '예상 +' in page.locator('#selection').inner_text();page.locator('#menu-open').tap();page.locator('#menu-help').tap();assert preview() is not None;page.locator('#close').tap()
  # A second short tap commits exactly one tile using the draft orientation.
  tap(point());committed=json.loads(state());assert committed['index']==1;assert committed['history'][-1]['rotation']==1;assert preview() is None
  # No DOM invocation or reload/fallback switch bypasses normal undo policy.
  page.evaluate("document.getElementById('undo').onclick()");assert json.loads(state())['index']==1
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert json.loads(state())['index']==1
  page.goto(base+'index-2d.html',wait_until='networkidle');assert page.locator('#undo').is_hidden();page.evaluate("document.getElementById('undo').onclick()");assert json.loads(state())['index']==1
  page.goto(base+'?play=1&testUndo=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D');page.locator('#menu-open').tap();page.locator('#undo').tap();page.locator('#menu-resume').tap();assert json.loads(state())['index']==0
  page.goto(base+'?play=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D');before=state()
  # Pinch and pan cannot confirm/cancel a selected preview.
  tap(point());wait_focus();pos=point();x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);touch('touchMove',[(x+25,y)]);page.wait_for_timeout(450);assert page.evaluate('window.hexHaven3D.gesture()')=='pan';touch('touchEnd',[]);assert preview() is not None and state()==before
  # Background tap cancels only; now begin pan before 400ms on a fresh empty cell.
  tap(point(0,0));page.wait_for_timeout(300);assert preview() is None;pos=point();x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);touch('touchMove',[(x+25,y)]);page.wait_for_timeout(450);touch('touchEnd',[]);assert preview() is None and state()==before
  # A second finger interrupts rotation safely; pinch still zooms, never places.
  pos=point();x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);page.wait_for_timeout(450);touch('touchStart',[(x,y),(x+70,y)]);assert preview() is None
  dist=page.evaluate('window.hexHaven3D.camera().distance');touch('touchMove',[(x-20,y),(x+90,y)]);touch('touchEnd',[]);assert page.evaluate('window.hexHaven3D.camera().distance')<dist;assert state()==before
  pos=point();touch('touchStart',[(pos['x'],pos['y'])]);page.wait_for_timeout(450);touch('touchCancel',[]);assert preview() is None and state()==before
  # Excessive manual zoom is backed off just enough for seven tiles, not reset.
  page.locator('#board').hover()
  for i in range(8):page.mouse.wheel(0,-100)
  near=page.evaluate('window.hexHaven3D.camera().distance');tap(point());wait_focus();assert page.evaluate('window.hexHaven3D.camera().distance')>near
  tap(point(0,0));page.wait_for_timeout(300);assert preview() is None
  assert not errors,errors
  report.append({'viewport':f'{width}x{height}','label':label,'touch':'passed','camera_framing':bounds,'available_area':area,'save_reload_fallback_and_undo_flag':'passed','page_errors':errors})
  c.close()
 # Animal notification: real engine path, no intermediate alerts, close/timeout/no replay.
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page()
 if args.url:page.route('https://nivesmik.github.io/**',verified)
 page.goto(base+'?play=1&testUndo=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D')
 row=next(r for r in json.loads((root/'test/fixtures/v07-simulation.json').read_text())['results'] if r['difficulty']=='standard' and r['seed']==202607)
 page.evaluate("""async ({path,key})=>{const E=await import('./src/engine.js');const g=E.createExperiment('standard',202607);for(const m of path){g.rotation=m.rotation;E.place(g,m.q,m.r);}g.ecosystem.seen=g.ecosystem.seen.filter(id=>id!=='otter');E.undo(g);localStorage.setItem(key,JSON.stringify(E.serialize(g)));}""",{'path':row['path'],'key':key})
 page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');m=row['path'][-1]
 def discover():
  pos=page.evaluate('m=>window.hexHaven3D.project(Math.sqrt(3)*(m.q+m.r/2),.12,1.5*m.r)',m);page.touchscreen.tap(pos['x'],pos['y']);page.wait_for_function('!window.hexHaven3D.camera().focusing');pos=page.evaluate('m=>window.hexHaven3D.project(Math.sqrt(3)*(m.q+m.r/2),.12,1.5*m.r)',m);page.touchscreen.tap(pos['x'],pos['y'])
 pre=page.evaluate('(k)=>localStorage.getItem(k)',key);discover();assert page.locator('#discovery-text').inner_text()=='새로운 동물 발견! 수달이 강가에 나타났어요.';assert page.locator('#discovery').is_visible();page.locator('#discovery-close').tap();assert page.locator('#discovery').is_hidden()
 page.locator('#menu-open').tap();page.locator('#undo').tap();page.locator('#menu-resume').tap();discover();assert page.locator('#discovery').is_hidden()
 page.evaluate('({key,raw})=>localStorage.setItem(key,raw)',{'key':key,'raw':pre});page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');discover();assert page.locator('#discovery').is_visible();page.wait_for_timeout(3100);assert page.locator('#discovery').is_hidden()
 c.close();b.close()
if server:server.shutdown()
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'url':base,'cases':report,'animal_notice':'X / 3 seconds / no duplicate: passed'},ensure_ascii=False,indent=2))
