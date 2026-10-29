"""Validate real public HTTPS bytes with the executor's CA trust before browser use.
Chromium's independent trust store does not trust the managed HTTPS proxy CA.
No TLS validation is disabled. Only manifest-verified bytes can be fulfilled.
"""
import concurrent.futures,hashlib,json,mimetypes,urllib.parse,urllib.request

def verified_pages(base,expected_sha=None):
 def read(name):
  with urllib.request.urlopen(base+name,timeout=45) as response:
   assert response.status==200,(name,response.status)
   return response.read(),response.headers.get('Content-Type',mimetypes.guess_type(name)[0] or 'application/octet-stream')
 raw,kind=read('preview.json');manifest=json.loads(raw)
 if expected_sha:assert manifest['source_sha']==expected_sha,manifest['source_sha']
 def check(item):
  name,digest=item;body,kind=read(name+'?rev='+manifest['source_sha'][:7]);assert hashlib.sha256(body).hexdigest()==digest,name
  return name,(body,kind)
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:cache=dict(pool.map(check,manifest['files'].items()))
 cache['preview.json']=(raw,kind);prefix=urllib.parse.urlparse(base).path
 def route(handler):
  url=urllib.parse.urlparse(handler.request.url);path=urllib.parse.unquote(url.path)
  name=path[len(prefix):] if path.startswith(prefix) else None
  if name=='':name='index.html'
  if name in cache:
   body,kind=cache[name];handler.fulfill(status=200,body=body,content_type=kind)
  else:handler.abort()
 return route,manifest
