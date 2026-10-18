"""List folders inside a remote zip without downloading it. Usage: list_zip.py mendeley:<id> | zenodo:<record>"""
import collections, sys, zipfile
from remote_zip import HTTPRangeFile
from sources import mendeley_files, zenodo_files
kind, ident = sys.argv[1].split(':')
files = mendeley_files(ident) if kind == 'mendeley' else zenodo_files(ident)
for f in files:
    if not f['filename'].lower().endswith('.zip') or 'augment' in f['filename'].lower():
        continue
    print('==', f['filename'], round(f['size'] / 1e6), 'MB', flush=True)
    try:
        z = zipfile.ZipFile(HTTPRangeFile(f['url']))
    except Exception as e:
        print('   cannot read:', e, flush=True); continue
    infos = [i for i in z.infolist() if not i.is_dir()]
    dirs = collections.Counter('/'.join(i.filename.split('/')[:-1]) for i in infos)
    avg = sum(i.compress_size for i in infos) / max(1, len(infos))
    print(f'   {len(infos)} files, avg {avg/1e3:.0f} KB')
    for d, c in sorted(dirs.items()):
        if c > 5: print('   ', c, d, flush=True)
