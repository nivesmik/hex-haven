"""Deterministic before/after capture and real mouse gesture regression checks.
python scripts/test-v08-pan-otter.py --root . --output /tmp/v08-after --assert-fixed
Requires the same Playwright environment as test-browser-v08.py.
"""
import argparse,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--root',default='.');parser.add_argument('--output',default='/tmp/v08-after');parser.add_argument('--assert-fixed',action='store_true');args=parser.parse_args()
root=Path(args.root).resolve();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
solution=next(r for r in json.loads((root/'test/fixtures/v07-simulation.json').read_text())['results'] if r['difficulty']=='standard' and r['seed']==202607)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height in [(1280,800),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<600,is_mobile=width<600,reduced_motion='reduce')
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'?play=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D !== undefined')
  # Use the unchanged v0.7 solution and fixed camera framing on both revisions.
  page.evaluate("""async path=>{const E=await import('./src/engine.js');const g=E.createExperiment('standard',202607);for(const m of path){g.rotation=m.rotation;E.place(g,m.q,m.r);}localStorage.setItem('hexhaven-v08-experiment',JSON.stringify(E.serialize(g)));}""",solution['path'])
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D !== undefined')
  assert page.locator('#message').inner_text().startswith('Pass')
  page.evaluate("""async()=>{
   const {Board3D}=await import('./src/renderer3d.js');const original=Board3D.prototype.setGame;
   Board3D.prototype.setGame=function(...args){const result=original.apply(this,args);window.__testBoard=this;return result;};
   window.dispatchEvent(new Event('resize'));
  }""")
  page.screenshot(path=str(out/f'otter-{width}.png'))
  center=page.evaluate("""async()=>{const T=await import('./vendor/three/three.module.js');const board=window.__testBoard,v=board.otter.getWorldPosition(new T.Vector3());v.y+=.4;v.project(board.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}""")
  clip={'x':max(0,min(width-210,center['x']-105)),'y':max(0,min(height-210,center['y']-105)),'width':210,'height':210}
  page.screenshot(path=str(out/f'otter-detail-{width}.png'),clip=clip)
  gestures=[]
  if width==1280:
   # Read camera matrices from the read-only diagnostic API when available.
   # Baseline reproduces framing from CameraControls.center without editing game state.
   def projected():
    return page.evaluate("""async()=>{
     const T=await import('./vendor/three/three.module.js'),v=new T.Vector3(0,.12,0).project(window.__testBoard.camera);
     return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
    }""")
   for orbit in [0,110,-210]:
    page.locator('#center').click()
    if orbit:
     page.mouse.move(640,400);page.mouse.down();page.mouse.move(640+orbit,400,steps=10);page.mouse.up()
    for dx,dy in [(50,0),(-50,0),(0,-45),(0,45)]:
     before=projected();page.mouse.move(before['x'],before['y']);page.mouse.down(button='right');page.mouse.move(before['x']+dx,before['y']+dy,steps=8);page.mouse.up(button='right');after=projected()
     result={'orbitDrag':orbit,'drag':[dx,dy],'screenDelta':[round(after['x']-before['x'],3),round(after['y']-before['y'],3)]};gestures.append(result)
     if args.assert_fixed:
      assert abs(result['screenDelta'][0]-dx)<.1 and abs(result['screenDelta'][1]-dy)<.1,result
   if args.assert_fixed:
    initial=page.evaluate('window.hexHaven3D.otterPose()');page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(600);first=page.evaluate('window.hexHaven3D.otterPose()');page.wait_for_timeout(600);second=page.evaluate('window.hexHaven3D.otterPose()')
    assert first['rootY']==second['rootY']==.12
    assert first['headYaw']!=second['headYaw'] and first['tailYaw']!=second['tailYaw']
    page.emulate_media(reduced_motion='reduce');page.wait_for_function('Math.abs(window.hexHaven3D.otterPose().headYaw)<1e-10 && Math.abs(window.hexHaven3D.otterPose().tailYaw)<1e-10')
  assert not errors,errors
  results.append({'viewport':f'{width}x{height}','pageErrors':errors,'pan':gestures})
  context.close()
 browser.close()
server.shutdown();print(json.dumps(results,indent=2))
