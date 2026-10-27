"""Linux Playwright WebKit compatibility smoke test, not physical iOS Safari.
Supports the same --url/--prefix flags as the Chromium mobile suite.
"""
import argparse,functools,http.server,json,os,threading,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from verified_pages import verified_pages
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--source-sha');parser.add_argument('--prefix',default='');parser.add_argument('--output',default='/tmp/v08-webkit');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None
if args.url:
 base=args.url;verified,manifest=verified_pages(base,args.source_sha);print('Verified public HTTPS assets:',len(manifest['files']),manifest['source_sha'],flush=True)
else:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
results=[];key=args.prefix+'hexhaven-v08-experiment'
with sync_playwright() as p:
 options={'headless':True}
 if os.environ.get('WEBKIT_EXECUTABLE_PATH'):options.update(executable_path=os.environ['WEBKIT_EXECUTABLE_PATH'],env=dict(os.environ))
 browser=p.webkit.launch(**options)
 for width,height in [(390,844),(768,1024),(1024,768)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if args.url:page.route('https://nivesmik.github.io/**',verified)
  page.goto(base+'?play=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D')
  def point(q=1,r=0):return page.evaluate('p=>window.hexHaven3D.project(Math.sqrt(3)*(p.q+p.r/2),.12,1.5*p.r)',{'q':q,'r':r})
  def tap(pos):page.touchscreen.tap(pos['x'],pos['y'])
  before=page.evaluate('k=>localStorage.getItem(k)',key);tap(point());page.wait_for_function('!window.hexHaven3D.camera().focusing');assert page.evaluate('window.hexHaven3D.preview()') is not None
  page.keyboard.press('ArrowRight');assert page.evaluate('k=>localStorage.getItem(k)',key)==before
  page.screenshot(path=str(out/f'webkit-{width}.png'))
  tap(point(0,0));page.wait_for_timeout(300);assert page.evaluate('window.hexHaven3D.preview()') is None;assert page.evaluate('k=>localStorage.getItem(k)',key)==before
  tap(point());page.wait_for_function('!window.hexHaven3D.camera().focusing');tap(point());assert page.evaluate('k=>JSON.parse(localStorage.getItem(k)).index',key)==1
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');assert page.evaluate('k=>JSON.parse(localStorage.getItem(k)).index',key)==1;assert page.locator('#undo').is_hidden()
  assert not errors,errors;results.append({'engine':'Linux WebKit WPE','viewport':f'{width}x{height}','WebGL_and_native_tap_select_cancel_confirm_reload':'passed','page_errors':errors,'physical_iOS_Safari':False});context.close()
 browser.close()
if server:server.shutdown()
(out/'results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
