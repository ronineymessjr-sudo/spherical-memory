// Tiny static dev server for the built `dist/` directory.
// Same content-type / path-resolve behavior as scripts/smoke.mjs but
// without puppeteer and without auto-shutdown. Stays up until you Ctrl-C
// or close the terminal.
//
// Usage:  npm run dev
//         then open http://127.0.0.1:4175/   (or /?demo=1, /?autoclick=3)

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = Number(process.env.PORT) || 4175;

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.mp4')) return 'video/mp4';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
    let requestPath = decodeURIComponent(url.pathname);
    if (requestPath === '/') requestPath = '/index.html';

    const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(rootDir, normalized);
    const fileBuffer = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(fileBuffer);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Not found: ${error.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`Dev server up: http://${host}:${port}/`);
  console.log(`Try:  /  (cover)    /?autoclick=3   /?demo=1   /?debug=true`);
});
