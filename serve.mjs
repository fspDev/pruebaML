// Servidor estático mínimo, sin dependencias.
//   node serve.mjs            -> http://localhost:5173
//   node serve.mjs 8080       -> otro puerto
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';

const PORT = Number(process.argv[2]) || 5173;
const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const rel = normalize(url === '/' ? '/index.html' : url).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(403).end('Forbidden'); return; }
    const file = join(ROOT, rel);
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\n  Photobooth listo:`);
  console.log(`  ->  http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`  ->  http://${ip}:${PORT}   (misma wifi; la cámara sólo anda por HTTPS)`));
  console.log('');
});
