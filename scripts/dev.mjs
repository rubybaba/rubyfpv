import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { build, root } from './build.mjs';

const dist = join(root, 'dist');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4173;
await build({ includeDrafts: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp' };
mime['.mp4'] = 'video/mp4';
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(dist, `.${pathname}`);
    if (file !== dist && !file.startsWith(dist + sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(join(dist, '404.html')));
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}/blog/`));
let timer;
let running = false;
let queued = false;
async function rebuild() {
  if (running) { queued = true; return; }
  running = true;
  try { await build({ includeDrafts: true }); } catch (error) { console.error(error.message); }
  finally { running = false; if (queued) { queued = false; await rebuild(); } }
}
for (const path of ['content', 'blog', 'scripts', 'index.html']) watch(join(root, path), { recursive: true }, () => {
  clearTimeout(timer); timer = setTimeout(rebuild, 150);
});
