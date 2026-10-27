"""Build an isolated, cache-versioned static preview; does not push or edit main.
python tools/build-pages-preview.py --sha <source-commit> --output /tmp/pages/pr-4-puzzle
"""
import argparse,hashlib,json,re,shutil
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--sha',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
if not re.fullmatch('[0-9a-f]{40}',args.sha):raise SystemExit('Expected full source commit SHA')
source=Path(__file__).resolve().parents[1];dest=Path(args.output).resolve();dest.mkdir(parents=True,exist_ok=True)
prefix='hexhaven-preview:pr-4-puzzle:';rev=args.sha[:7]
files=[source/n for n in ['index.html','index-2d.html','style.css','vendor/three/three.module.js','vendor/three/LICENSE','vendor/three/README.md']]
files+=sorted(p for p in (source/'src').rglob('*.js') if p.name!='main.js')
# Do not mix files from different releases if an existing staging path is reused.
for old in dest.iterdir():
 if old.is_dir():shutil.rmtree(old)
 else:old.unlink()
for file in files:
 name=file.relative_to(source);content=file.read_text()
 if name.as_posix() in ['src/main3d.js','src/main2d.js']:
  for key in ['hexhaven-v08-save-v3','hexhaven-v08-experiment','hexhaven-v08-view']:
   assert content.count("'"+key+"'")==1
   content=content.replace("'"+key+"'","'"+prefix+key+"'")
  content=content.replace("readGame('hexhaven-experiment-v07')","readGame('hexhaven-preview:pr-3:hexhaven-experiment-v07')")
 if name.suffix=='.html':
  content=re.sub('<title>.*?</title>',f'<title>HEX HAVEN v0.8 · {rev}</title>',content)
  content=re.sub(r'HEX HAVEN <span>.*?</span>',f'HEX HAVEN <span>v0.8 · {rev}</span>',content)
  content=content.replace('v0.7 저장 복사','PR #3 저장 복사')
  if name.name=='index.html':content=content.replace('src="src/boot3d.js"','src="preview-entry.js"')
  content=re.sub(r'(src|href)="((?:src/[^"?]+\.js|preview-entry\.js|style\.css))"',lambda m:f'{m[1]}="{m[2]}?rev={rev}"',content)
 if name.suffix=='.js':
  content=re.sub(r'''((?:from\s*|import\s*\(\s*|import\s*)['"])(\.{1,2}/[^'"?]+\.js)(['"])''',lambda m:m[1]+m[2]+'?rev='+rev+m[3],content)
 out=dest/name;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(content)
(dest/'preview-entry.js').write_text(f"import './src/boot3d.js?rev={rev}';\n")
manifest={'source_repository':'nivesmik/hex-haven','source_pr':4,'source_sha':args.sha,'default_difficulty':'standard','default_seed':202607,'storage_prefix':prefix,'undo_default':False,'undo_test_flag':'?testUndo=1','files':{str(p.relative_to(dest)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dest.rglob('*')) if p.is_file()}}
(dest/'preview.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'path':str(dest),'sha':args.sha,'assets':len(manifest['files']),'storage_prefix':prefix}))
