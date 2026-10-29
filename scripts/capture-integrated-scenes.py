"""Capture actual 3D screens from an unchanged seeded engine path (not mockups)."""
import functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path('/tmp/v08-integrated-scenes');out.mkdir(exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/'
row=next(r for r in json.loads((root/'test/fixtures/v07-simulation.json').read_text())['results'] if r['difficulty']=='standard' and r['seed']==202607)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height,label in [(390,844,'iphone'),(1024,768,'ipad')]:
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce');page=c.new_page();page.goto(base+'?play=1',wait_until='networkidle');page.wait_for_function('window.hexHaven3D')
  page.evaluate("""async path=>{const E=await import('./src/engine.js');const g=E.createExperiment('standard',202607);for(const m of path){g.rotation=m.rotation;E.place(g,m.q,m.r);}localStorage.setItem('hexhaven-v08-experiment',JSON.stringify(E.serialize(g)));}""",row['path'][:-1])
  page.reload(wait_until='networkidle');page.wait_for_function('window.hexHaven3D');page.screenshot(path=str(out/f'{label}-landscape.png'))
  cell=page.evaluate("""async()=>{const E=await import('./src/engine.js'),g=E.deserialize(JSON.parse(localStorage.getItem('hexhaven-v08-experiment')));return E.available(g.board).map(c=>({...c,...window.hexHaven3D.project(Math.sqrt(3)*(c.q+c.r/2),.12,1.5*c.r)})).filter(c=>c.x>30&&c.x<innerWidth-30&&c.y>130&&c.y<innerHeight-130).sort((a,b)=>Math.hypot(a.x-innerWidth/2,a.y-innerHeight/2)-Math.hypot(b.x-innerWidth/2,b.y-innerHeight/2))[0];}""")
  page.touchscreen.tap(cell['x'],cell['y']);page.wait_for_function('!window.hexHaven3D.camera().focusing');page.screenshot(path=str(out/f'{label}-selected.png'));c.close()
 b.close()
s.shutdown()
