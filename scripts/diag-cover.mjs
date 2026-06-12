// Diagnose why a particular app state isn't visible. Boots the static
// dist server, opens the page, waits for window.SM.appReady, then dumps
// the splash / cover / mirror containers, the body data-* state, every
// direct child of <body>, and three viewport hit-test probes (center,
// top, right-pane) so you can see what's actually on top.
//
// Usage:
//   node scripts/diag-cover.mjs                       # cover, 1280x800
//   node scripts/diag-cover.mjs --route demo         # ?demo=1
//   node scripts/diag-cover.mjs --route autoclick=3
//   node scripts/diag-cover.mjs --width 375 --height 812
//   node scripts/diag-cover.mjs --wait 8000          # extra settle time
//
// Output: artifacts/diag-<route>.png + the JSON dump to stdout.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const host = '127.0.0.1';
let port = 4175;

function parseArgs(argv) {
  const args = { route: 'cover', width: 1280, height: 800, wait: 5000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--route') args.route = argv[++i];
    else if (a.startsWith('--route=')) args.route = a.slice('--route='.length);
    else if (a === '--width') args.width = parseInt(argv[++i], 10);
    else if (a === '--height') args.height = parseInt(argv[++i], 10);
    else if (a === '--wait') args.wait = parseInt(argv[++i], 10);
  }
  if (args.route === 'demo') args.query = '?demo=1';
  else if (args.route === 'autoclick' || args.route.startsWith('autoclick=')) {
    const tap = args.route.split('=')[1] ?? '3';
    args.query = `?autoclick=${tap}`;
    args.route = 'autoclick';
  } else if (args.route !== 'cover') {
    args.query = `?route=${encodeURIComponent(args.route)}`;
    args.route = 'custom';
  } else {
    args.query = '';
  }
  return args;
}

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

async function startServer() {
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
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });
  port = server.address().port;
  return server;
}

async function resolveExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error('No Chrome/Edge found.');
}

async function run() {
  const args = parseArgs(process.argv);
  const server = await startServer();
  const executablePath = await resolveExecutable();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: args.width, height: args.height });
    const consoleMsgs = [];
    page.on('console', (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));

    await page.goto(`http://${host}:${port}/${args.query}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SM?.appReady === true, { timeout: 30000 });
    // give the 720ms remove + 620ms css fade a comfortable margin
    await new Promise((r) => setTimeout(r, args.wait));

    const dump = await page.evaluate(() => {
      const splash = document.getElementById('boot-splash');
      const splashStyle = splash ? window.getComputedStyle(splash) : null;
      const splashRect = splash ? splash.getBoundingClientRect() : null;
      const coverContainer = document.getElementById('cover-container');
      const coverRect = coverContainer ? coverContainer.getBoundingClientRect() : null;
      const coverStyle = coverContainer ? window.getComputedStyle(coverContainer) : null;
      const mirrorContainer = document.getElementById('mirror-container');
      const mirrorRect = mirrorContainer ? mirrorContainer.getBoundingClientRect() : null;
      const mirrorStyle = mirrorContainer ? window.getComputedStyle(mirrorContainer) : null;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const cx = Math.floor(viewportW / 2);
      const cy = Math.floor(viewportH / 2);
      const topCenter = document.elementFromPoint(cx, cy);
      const topTop = document.elementFromPoint(cx, 100);
      const topAtRight = document.elementFromPoint(Math.floor(viewportW * 0.75), Math.floor(viewportH * 0.3));
      const stack = (() => {
        const els = [];
        let el = topCenter;
        for (let i = 0; el && i < 12; i++) {
          els.push(`${el.tagName.toLowerCase()}#${el.id || ''}.${[...el.classList].join('.') || '-'}`);
          el = el.parentElement;
        }
        return els;
      })();
      // Walk every direct child of body so we see who else is in the layout
      const bodyChildren = [...document.body.children].map((el) => {
        const s = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          cls: [...el.classList].join(' '),
          display: s.display,
          position: s.position,
          zIndex: s.zIndex,
          opacity: s.opacity,
          visibility: s.visibility,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          dataState: el.dataset?.state || null,
        };
      });
      const bodyDataset = { ...document.body.dataset };
      return {
        sm: {
          state: window.SM?.currentState ?? null,
          bootReady: !!window.SM?.bootReady,
          appReady: !!window.SM?.appReady,
          renderMode: window.SM?.renderMode ?? null,
          loadingProgress: window.SM?.loadingProgress ?? null,
        },
        splash: splash
          ? {
              exists: true,
              datasetDismissed: splash.dataset.dismissed ?? null,
              opacity: splashStyle.opacity,
              visibility: splashStyle.visibility,
              display: splashStyle.display,
              position: splashStyle.position,
              zIndex: splashStyle.zIndex,
              pointerEvents: splashStyle.pointerEvents,
              rect: splashRect ? {
                x: Math.round(splashRect.x),
                y: Math.round(splashRect.y),
                w: Math.round(splashRect.width),
                h: Math.round(splashRect.height),
              } : null,
            }
          : { exists: false },
        cover: coverContainer
          ? {
              exists: true,
              display: coverStyle.display,
              position: coverStyle.position,
              zIndex: coverStyle.zIndex,
              rect: coverRect ? {
                x: Math.round(coverRect.x),
                y: Math.round(coverRect.y),
                w: Math.round(coverRect.width),
                h: Math.round(coverRect.height),
              } : null,
            }
          : { exists: false },
        mirror: mirrorContainer
          ? {
              exists: true,
              childCount: mirrorContainer.children.length,
              childTags: [...mirrorContainer.children].map((c) => `${c.tagName.toLowerCase()}#${c.id || ''}.${[...c.classList].join('.') || '-'}`),
              display: mirrorStyle.display,
              position: mirrorStyle.position,
              zIndex: mirrorStyle.zIndex,
              rect: mirrorRect ? {
                x: Math.round(mirrorRect.x),
                y: Math.round(mirrorRect.y),
                w: Math.round(mirrorRect.width),
                h: Math.round(mirrorRect.height),
              } : null,
            }
          : { exists: false },
        topAtCenter: stack,
        topAtTop: (() => {
          const e = topTop;
          return e ? `${e.tagName.toLowerCase()}#${e.id || ''}.${[...e.classList].join('.') || '-'}` : null;
        })(),
        topAtRightPane: (() => {
          const e = topAtRight;
          return e ? `${e.tagName.toLowerCase()}#${e.id || ''}.${[...e.classList].join('.') || '-'}` : null;
        })(),
        bodyChildren,
        viewport: { w: viewportW, h: viewportH },
        bodyDataset,
      };
    });
    console.log('--- DUMP ---');
    console.log(JSON.stringify(dump, null, 2));
    console.log('--- CONSOLE (last 30) ---');
    console.log(consoleMsgs.slice(-30).join('\n'));
    await page.screenshot({ path: path.join(rootDir, 'artifacts', `diag-${args.route}.png`), fullPage: false });
    await page.screenshot({ path: path.join(rootDir, 'artifacts', `diag-${args.route}-full.png`), fullPage: true });
    console.log(`screenshot: artifacts/diag-${args.route}.png + diag-${args.route}-full.png`);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
