"""Integrated UX: actual Chromium touch/PC inputs and published HTTPS verification.
No production storage or GitHub writes. Screenshot scenes use saved deterministic v0.7 paths.
"""
import argparse,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from verified_pages import verified_pages
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--prefix',default='');parser.add_argument('--source-sha');parser.add_argument('--output',default='/tmp/v08-integrated');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None
if args.url:base=args.url;verified,manifest=verified_pages(base,args.source_sha);print('Public HTTPS verified',manifest['source_sha'],len(manifest['files']),flush=True)
else:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
key=args.prefix+'hexhaven-v08-experiment';reports=[]
solution=next(r for r in json.loads((root/'test/fixtures/v07-simulation.json').read_text())['results'] if r['difficulty']=='standard' and r['seed']==202607)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height,label in [(390,844,'iphone-portrait'),(844,390,'iphone-landscape'),(768,1024,'ipad-portrait'),(1024,768,'ipad-landscape')]:
  print('Testing',label,flush=True);c=b.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if args.url:page.route('https://nivesmik.github.io/**',verified)
  page.goto(base,wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.locator('#start-screen').is_visible();page.screenshot(path=str(out/(label+'-10-home.png')))
  page.locator('#open-experiment').tap();page.locator('#home-experiment-start').tap();assert page.locator('#start-screen').is_hidden()
  def state():return page.evaluate('(key)=>localStorage.getItem(key)',key)
  def point(q=1,r=0):return page.evaluate('p=>window.hexHaven3D.project(Math.sqrt(3)*(p.q+p.r/2),.12,1.5*p.r)',{'q':q,'r':r})
  def tap(pos):page.touchscreen.tap(pos['x'],pos['y'])
  def settled():page.wait_for_function('!window.hexHaven3D.camera().focusing');page.wait_for_timeout(100)
  def preview():return page.evaluate('window.hexHaven3D.preview()')
  def camera():return page.evaluate('window.hexHaven3D.camera()')
  session=c.new_cdp_session(page)
  def touch(kind,points):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(points)]})
  def camera_hold(dx=0,dy=0):
   pos=point(0,0);x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);touch('touchEnd',[]);touch('touchStart',[(x,y)]);page.wait_for_timeout(180);page.wait_for_function("window.hexHaven3D.gesture()==='camera'");
   if dx or dy:touch('touchMove',[(x+dx,y+dy)]);page.wait_for_timeout(90)
   return x,y
  for id in ['center','zoom-in','zoom-out','restart','left','right','confirm','floating-confirm','cancel-placement','undo']:assert page.locator('#'+id).is_hidden(),id
  before=state();page.screenshot(path=str(out/(label+'-01-landscape.png')));tap(point());settled();assert preview()['q']==1 and state()==before
  page.screenshot(path=str(out/(label+'-03-selected.png')))
  page.locator('.goal-card').first.tap();assert preview() is not None and state()==before
  page.locator('#tilegrab').tap();assert preview() is not None and state()==before
  pos=point();x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);page.wait_for_timeout(450);page.wait_for_function("window.hexHaven3D.gesture()==='rotate'");assert page.evaluate('window.hexHaven3D.previewPose().height')>0
  page.screenshot(path=str(out/(label+'-04-held.png')));touch('touchMove',[(x+45,y)]);page.wait_for_function('window.hexHaven3D.preview().rotation===5');assert '예상 +' in page.locator('#selection').inner_text();page.screenshot(path=str(out/(label+'-05-rotating.png')));touch('touchEnd',[]);assert json.loads(state())['index']==0 and preview()['rotation']==5
  page.wait_for_timeout(160);assert abs(page.evaluate('window.hexHaven3D.previewPose().height'))<1e-8
  # One-tap A->B relocation preserves the draft and leaves the snapshot untouched.
  tap(point(0,1));settled();assert preview()=={'q':0,'r':1,'rotation':5};assert state()==before
  tap(point(-1,1));settled();assert preview()=={'q':-1,'r':1,'rotation':5};assert state()==before
  page.screenshot(path=str(out/(label+'-06-relocated.png')))
  # Camera hold on a placed tile must retain that draft and suppress cancellation.
  prior=preview();cam=camera();x,y=camera_hold(45,-25);assert preview()==prior and state()==before;assert camera()['angle']!=cam['angle'] and camera()['distance']<cam['distance'];page.screenshot(path=str(out/(label+'-07-camera.png')));touch('touchEnd',[]);assert page.locator('#gesture-cue').is_hidden()
  # Short double tap is inert. Ordinary background tap cancels after the window.
  pos=point(0,0);x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);touch('touchEnd',[]);touch('touchStart',[(x,y)]);touch('touchEnd',[]);page.wait_for_timeout(300);assert preview()==prior and state()==before
  tap(point(0,0));page.wait_for_timeout(300);assert preview() is None and state()==before
  # Pan before the long press deadline. End is never a tap/placement.
  pos=point(0,0);x,y=pos['x'],pos['y'];touch('touchStart',[(x,y)]);touch('touchMove',[(x+30,y+10)]);page.wait_for_timeout(450);assert page.evaluate('window.hexHaven3D.gesture()')=='pan',(page.evaluate('window.hexHaven3D.gesture()'),x,y,camera());touch('touchEnd',[]);assert preview() is None and state()==before
  # Camera out then in drives strategic mode within the same 3D page.
  x,y=camera_hold(0,220);touch('touchEnd',[]);page.wait_for_function('window.hexHaven3D.camera().strategic');page.wait_for_timeout(300);page.screenshot(path=str(out/(label+'-08-strategy.png')))
  x,y=camera_hold(0,-220);touch('touchEnd',[]);page.wait_for_function('!window.hexHaven3D.camera().strategic');page.wait_for_timeout(300)
  # Native pinch and cancellation preserve the engine.
  x,y=width*.5,height*.55;old=camera()['distance'];touch('touchStart',[(x-30,y),(x+30,y)]);touch('touchMove',[(x-65,y),(x+65,y)]);touch('touchEnd',[]);assert camera()['distance']<old;assert state()==before
  # Stress screen panning: target remains within the board's world limits.
  for _ in range(3):touch('touchStart',[(x,y)]);touch('touchMove',[(x+width*.8,y+height*.5)]);touch('touchEnd',[])
  settled();cam=camera();assert cam['target'][0]<cam['bounds']['maxX']+2 and cam['target'][2]<cam['bounds']['maxZ']+2
  # Restore initial framing via a reload, keeping the same committed snapshot.
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert state()==before
  tap(point());settled();tap(point());assert json.loads(state())['index']==1 and preview() is None
  committed=state();page.evaluate("document.getElementById('undo').onclick()");assert state()==committed
  # Round trip via actual UI links must retain every committed field, no new game.
  page.locator('#menu-open').tap();page.locator('#renderer-switch').click();assert 'index-2d.html' in page.url;assert state()==committed
  page.locator('#menu-open').tap();page.locator('#renderer-switch').click();page.wait_for_function('window.hexHaven3D');assert state()==committed
  # Sidebar fields remain selectable/editable; board defaults are scoped.
  css=page.locator('#board').evaluate('(e)=>({select:getComputedStyle(e).userSelect,touch:getComputedStyle(e).touchAction})');assert css['select']=='none' and css['touch']=='none'
  assert page.locator('#board').evaluate("e=>!e.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))")
  page.locator('#menu-open').tap();page.locator('#settings-label').click();assert page.locator('#seed').evaluate("e=>e.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))")
  page.locator('#menu-resume').tap()
  # Exit confirmation: cancel preserves, confirm abandons and cannot resume/reload.
  other=c.new_page()
  if args.url:other.route('https://nivesmik.github.io/**',verified)
  other.goto(base,wait_until='networkidle');other.wait_for_function('window.hexHaven3D')
  page.locator('#menu-open').tap();page.locator('#menu-quit').tap();page.screenshot(path=str(out/(label+'-09-quit.png')));page.locator('#quit-cancel').tap();assert page.locator('#play-menu').is_hidden();assert state()==committed;page.locator('#menu-open').tap();page.locator('#menu-quit').tap();page.locator('#quit-confirm').tap();assert page.locator('#start-screen').is_visible();assert page.locator('#continue-run').is_hidden();assert page.evaluate('window.hexHaven3D.session().slots.experiment.status')=='abandoned';assert state()==committed
  other.wait_for_function("document.getElementById('start-screen').hidden===false");assert other.locator('#continue-run').is_hidden();other.evaluate("document.getElementById('confirm').onclick()");assert state()==committed;other.close()
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.locator('#start-screen').is_visible() and page.locator('#continue-run').is_hidden()
  # New regular attempt uses the existing engine. No stage unlocking or rules added.
  page.locator('#start-regular').tap();assert page.locator('#start-screen').is_hidden();assert page.locator('#stage').inner_text()=='1'
  assert not errors,errors;reports.append({'viewport':f'{width}x{height}','label':label,'checks':'selection/lift/rotation/relocation/camera hold/short double tap/pan/pinch/bounds/strategy/commit/undo/2D roundtrip/scoped selection/abandon/reload: passed','page_errors':errors});c.close()
 # PC regressions and rich scene captures use unchanged v0.7 moves.
 c=b.new_context(viewport={'width':1280,'height':800});page=c.new_page()
 if args.url:page.route('https://nivesmik.github.io/**',verified)
 page.goto(base+'?play=1&testUndo=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D')
 page.mouse.move(640,400);page.mouse.down();page.mouse.move(755,420,steps=10);page.mouse.up();pos=page.evaluate('window.hexHaven3D.project(Math.sqrt(3),.12,0)');page.mouse.click(pos['x'],pos['y']);page.locator('#right').click();page.locator('#confirm').click();assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).index',key)==1
 page.locator('#menu-open').click();page.locator('#undo').click();assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).index',key)==0;page.locator('#menu-resume').click()
 page.evaluate("""async ({path,key})=>{const E=await import('./src/engine.js'),g=E.createExperiment('standard',202607);for(const m of path){g.rotation=m.rotation;E.place(g,m.q,m.r);}localStorage.setItem(key,JSON.stringify(E.serialize(g)));}""",{'path':solution['path'],'key':key});page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.locator('#message').inner_text().startswith('Pass');page.screenshot(path=str(out/'pc-pass.png'));reports.append({'viewport':'1280x800','PC':'orbit/rotate/commit/test undo/existing Pass path: passed'});c.close();b.close()
if server:server.shutdown()
(out/'results.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False,indent=2))
