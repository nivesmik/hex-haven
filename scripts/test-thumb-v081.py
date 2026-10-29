"""Approved thumb controls: real input, saved-state invariants, camera, HUD and results.
WebKit is Linux compatibility coverage, never physical iPad Safari.
"""
import argparse,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from verified_pages import verified_pages
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--source-sha');parser.add_argument('--prefix',default='');parser.add_argument('--engine',default='chromium',choices=['chromium','webkit']);parser.add_argument('--output',default='/tmp/v081-thumb');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None
if args.url:
 base=args.url;verified,manifest=verified_pages(base,args.source_sha);print('HTTPS manifest/hash verified',manifest['source_sha'],flush=True)
else:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
key=args.prefix+'hexhaven-v08-experiment';reports=[]
solution=next(r for r in json.loads((root/'test/fixtures/v07-simulation.json').read_text())['results'] if r['difficulty']=='standard' and r['seed']==202607)
with sync_playwright() as p:
 opts={'headless':True}
 if args.engine=='chromium':opts['args']=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
 b=getattr(p,args.engine).launch(**opts)
 for w,h in [(390,844),(844,390),(768,1024),(1024,768),(320,568)]:
  print('Testing',args.engine,w,h,flush=True);c=b.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if args.url:page.route('https://nivesmik.github.io/**',verified)
  page.goto(base,wait_until='networkidle');page.wait_for_function('window.hexHaven3D');page.locator('#open-experiment').tap();page.locator('#home-experiment-start').tap()
  def snap():return page.evaluate('k=>localStorage.getItem(k)',key)
  def preview():return page.evaluate('window.hexHaven3D.preview()')
  def cam():return page.evaluate('window.hexHaven3D.camera()')
  def pt(q=1,r=0):return page.evaluate('p=>window.hexHaven3D.project(Math.sqrt(3)*(p.q+p.r/2),.12,1.5*p.r)',{'q':q,'r':r})
  def tap(q=1,r=0):
   a=pt(q,r);page.touchscreen.tap(a['x'],a['y'])
  def settle():page.wait_for_function('!window.hexHaven3D.camera().focusing');page.wait_for_timeout(120)
  session=c.new_cdp_session(page) if args.engine=='chromium' else None
  def touch(kind,pts):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
  def padpos():
   r=page.locator('#thumb-rotate').bounding_box();return r['x']+r['width']/2,r['y']+r['height']/2
  def drag(dx=42,cancel=False):
   x,y=padpos()
   if session:
    touch('touchStart',[(x,y)]);touch('touchMove',[(x+dx,y)]);page.wait_for_timeout(50);touch('touchCancel' if cancel else 'touchEnd',[])
   else:page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y,steps=4);page.mouse.up()
  before=snap();assert page.locator('#thumb-controls').is_hidden();assert page.locator('#win-condition').is_visible();assert 'Pass' in page.locator('#win-condition').inner_text();page.screenshot(path=str(out/f'{w}x{h}-before.png'))
  tap();settle();assert preview()=={'q':1,'r':0,'rotation':0};assert snap()==before;assert page.locator('#thumb-controls').is_visible()
  for id in ['thumb-confirm','thumb-cancel']:
   rect=page.locator('#'+id).bounding_box();assert rect['width']>=44 and rect['height']>=44 and rect['y']+rect['height']<h
  # No wait: native touch moves immediately, camera and committed data stay fixed.
  prior=cam();drag();assert preview()['rotation']==5;assert cam()==prior;assert snap()==before;assert '예상 +' in page.locator('#selection').inner_text();page.screenshot(path=str(out/f'{w}x{h}-preview.png'))
  selected=preview();tap();settle();assert preview()==selected and snap()==before
  tap(0,0);page.wait_for_timeout(320);assert preview()==selected and snap()==before
  tap(0,1);settle();assert preview()=={'q':0,'r':1,'rotation':5} and snap()==before
  # Hold on selected board tile has no rotation/commit/cancel.
  a=pt(0,1)
  if session:
   touch('touchStart',[(a['x'],a['y'])]);page.wait_for_timeout(500);touch('touchMove',[(a['x']+45,a['y'])]);touch('touchEnd',[])
   assert preview()['rotation']==5 and snap()==before
  # Cancel preserves engine/score/deck/ecology; next selection starts fresh draft.
  page.locator('#thumb-cancel').tap();assert preview() is None and snap()==before
  tap();settle();prior=cam();drag(42,True);assert preview()['rotation']==5 and snap()==before;assert cam()==prior
  if session:
   # Leaving the pad keeps ownership; ending above confirm cannot activate it.
   x,y=padpos();touch('touchStart',[(x,y)]);touch('touchMove',[(x+40,y-140)]);touch('touchEnd',[]);assert snap()==before
   # Second finger cancels pad ownership, no camera fallback and no late commit.
   prior=cam();x,y=padpos();touch('touchStart',[(x,y)]);touch('touchStart',[(x,y),(x+20,y-100)]);touch('touchMove',[(x+50,y),(x+50,y-100)]);touch('touchEnd',[]);assert cam()==prior and snap()==before
  rotation=preview()['rotation'];page.locator('#thumb-confirm').tap();committed=snap();g=json.loads(committed);assert g['index']==1 and g['history'][-1]['rotation']==rotation;assert preview() is None
  page.evaluate("document.getElementById('undo').onclick()");assert snap()==committed
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert snap()==committed
  # Actual renderer links preserve every snapshot field.
  page.locator('#menu-open').tap();page.locator('#renderer-switch').click();assert snap()==committed
  page.locator('#menu-open').tap();page.locator('#renderer-switch').click();page.wait_for_function('window.hexHaven3D');assert snap()==committed
  if session:
   # Background camera hold, pinch, pan still work without placing.
   a=pt(0,0);x,y=a['x'],a['y'];prior=cam();touch('touchStart',[(x,y)]);touch('touchEnd',[]);touch('touchStart',[(x,y)]);page.wait_for_timeout(180);touch('touchMove',[(x+35,y-15)]);touch('touchEnd',[]);assert cam()['angle']!=prior['angle'] and snap()==committed
   x,y=w*.5,h*.52;old=cam()['distance'];touch('touchStart',[(x-25,y),(x+25,y)]);touch('touchMove',[(x-50,y),(x+50,y)]);touch('touchEnd',[]);assert cam()['distance']<old and snap()==committed
   old=cam()['target'];touch('touchStart',[(x,y)]);touch('touchMove',[(x+30,y+10)]);touch('touchEnd',[]);assert cam()['target']!=old and snap()==committed
  # Existing Pass path/result and unchanged loss rule; no new scoring.
  page.evaluate("""async ({path,key})=>{const E=await import('./src/engine.js'),g=E.createExperiment('standard',202607);for(const m of path){g.rotation=m.rotation;E.place(g,m.q,m.r);}localStorage.setItem(key,JSON.stringify(E.serialize(g)));}""",{'path':solution['path'],'key':key});page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.locator('#result-title').inner_text()=='Pass · 목표 달성';assert page.locator('#thumb-controls').is_hidden();page.screenshot(path=str(out/f'{w}x{h}-pass.png'))
  page.evaluate("""async key=>{const E=await import('./src/engine.js'),g=E.createExperiment('standard',202607);while(g.status==='playing'){const c=E.available(g.board)[0];E.place(g,c.q,c.r);}if(g.status!=='lost')throw Error('Expected existing loss path');localStorage.setItem(key,JSON.stringify(E.serialize(g)));}""",key);page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.locator('#result-title').inner_text()=='Fail · 타일 소진';page.screenshot(path=str(out/f'{w}x{h}-fail.png'))
  assert not errors,errors;reports.append({'viewport':f'{w}x{h}','engine':args.engine,'thumb_camera_save_HUD_PassFail':'passed','page_errors':errors});c.close()
 # PC orbit/rotation/placement and regular-stage HUD remain available.
 c=b.new_context(viewport={'width':1280,'height':800});page=c.new_page()
 if args.url:page.route('https://nivesmik.github.io/**',verified)
 page.goto(base+'?play=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.locator('#thumb-controls').is_hidden();a=page.evaluate('window.hexHaven3D.project(Math.sqrt(3),.12,0)');page.mouse.click(a['x'],a['y']);page.locator('#right').click();page.locator('#confirm').click();assert page.evaluate('k=>JSON.parse(localStorage.getItem(k)).index',key)==1
 page.locator('#menu-open').click();page.locator('#menu-quit').click();page.locator('#quit-confirm').click();page.locator('#start-regular').click();assert '수달' not in page.locator('#win-condition').inner_text();page.screenshot(path=str(out/'pc-regular.png'));c.close();b.close()
if server:server.shutdown()
(out/'results.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False,indent=2))
