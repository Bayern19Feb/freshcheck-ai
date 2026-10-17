// Tiny dependency-free static file server for local development.
// Usage: node tools/serve.mjs <rootDir> [port] [mountPath=dir ...]
// Example: node tools/serve.mjs public 8080 /__test__/=tests/fixtures
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.bin': 'application/octet-stream',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

export function startServer(root, port = 8080, mounts = {}) {
  const roots = [['/', resolve(root)], ...Object.entries(mounts).map(([m, d]) => [m, resolve(d)])]
    .sort((a, b) => b[0].length - a[0].length);
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const [mount, dir] = roots.find(([m]) => urlPath.startsWith(m));
      let file = normalize(join(dir, urlPath.slice(mount.length)));
      if (!file.startsWith(dir)) { res.writeHead(403).end('Forbidden'); return; }
      if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) {
  const [root = 'public', port = '8080', ...rest] = process.argv.slice(2);
  const mounts = Object.fromEntries(rest.map((r) => r.split('=')));
  startServer(root, Number(port), mounts).then(() => {
    console.log(`FreshCheck AI running at http://localhost:${port}/  (Ctrl+C to stop)`);
  });
}
