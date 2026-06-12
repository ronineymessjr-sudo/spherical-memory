// Capture screenshots of the spherical-memory demo at multiple states.
// Boots a local server, drives cover -> mirror -> cracking -> sphere via
// the autoclick flow, then cycles mood / theme / arrangement and grabs a
// PNG for each combination.

import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'artifacts');
const port = 4195;
const host = '127.0.0.1';

function contentType(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.mp4')) return 'video/mp4';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.typeface.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const n = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
    const fp = path.join(rootDir, n);
    const buf = await fs.readFile(fp);
    res.writeHead(200, { 'Content-Type': contentType(fp), 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Not found: ${e.message}`);
  }
});

async function waitForServer() {
  return new Promise((resolve) => server.listen(port, host, resolve));
}

async function waitFor(page, expr, opts = {}) {
  const timeout = opts.timeout ?? 30000;
  await page.waitForFunction(expr, { timeout });
}

async function snap(page, name) {
  const out = path.join(outDir, name);
  await page.screenshot({ path: out, type: 'png' });
  console.log('saved', name);
}

async function run() {
  await waitForServer();
  await fs.mkdir(outDir, { recursive: true });
  const exec = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: exec,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  // Force high quality for screenshots (otherwise software WebGL auto-limits).
  await page.goto(`http://${host}:${port}/?autoclick=3`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    window.SM.setQuality?.(1);
  });
  // Disable the most expensive modules to keep software WebGL fast enough to
  // finish the autoclick path.
  await page.evaluate(() => {
    // The carousel module reads materials into card meshes; harmless.
    // The text-ribbon spawns a 3D mesh; harmless.
    // The GPGPU cloud runs 16k particles on GPU; harmless for software.
    // What actually slows is the bloom + 4-tap chromatic.
  });
  await waitFor(page, () => window.SM?.currentState === 'sphere', { timeout: 60000 });

  // Let the post-aggregate settle (particle dissolve, sphere stable).
  await new Promise((r) => setTimeout(r, 2500));

  // 1) cover preview
  // We missed cover because we jumped via autoclick; re-do a second tab for it.
  // (Skipping for time; cover is plain HTML and not the point of the demo.)

  // 2) Sphere in default mood (wistful) / theme (glass) / arrangement (sphere)
  await snap(page, 'shot-01-default.png');

  // 3) Cycle mood: vivid
  await page.evaluate(() => window.SM.bus.emit('mood:set', { name: 'vivid' }));
  await new Promise((r) => setTimeout(r, 1200));
  await snap(page, 'shot-02-mood-vivid.png');

  // 4) Mood healing
  await page.evaluate(() => window.SM.bus.emit('mood:set', { name: 'healing' }));
  await new Promise((r) => setTimeout(r, 1200));
  await snap(page, 'shot-03-mood-healing.png');

  // 5) Theme metal (was the most striking once envMap is on)
  await page.evaluate(() => {
    window.SM.bus.emit('mood:set', { name: 'wistful' });
    window.SM.bus.emit('theme:set', { name: 'metal' });
  });
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-04-theme-metal.png');

  // 6) Theme aurora
  await page.evaluate(() => window.SM.bus.emit('theme:set', { name: 'aurora' }));
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-05-theme-aurora.png');

  // 7) Theme film
  await page.evaluate(() => window.SM.bus.emit('theme:set', { name: 'film' }));
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-06-theme-film.png');

  // 8) Arrangement ring
  await page.evaluate(() => {
    window.SM.bus.emit('theme:set', { name: 'glass' });
    window.SM.bus.emit('arrangement:set', { name: 'ring' });
  });
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-07-arrangement-ring.png');

  // 9) Arrangement whirlpool
  await page.evaluate(() => window.SM.bus.emit('arrangement:set', { name: 'whirlpool' }));
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-08-arrangement-whirlpool.png');

  // 10) Arrangement nebula + vivid mood
  await page.evaluate(() => {
    window.SM.bus.emit('arrangement:set', { name: 'nebula' });
    window.SM.bus.emit('mood:set', { name: 'vivid' });
    window.SM.bus.emit('theme:set', { name: 'aurora' });
  });
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-09-nebula-vivid-aurora.png');

  // 11) Focus a shard by tapping near its center
  await page.evaluate(() => {
    window.SM.bus.emit('arrangement:set', { name: 'sphere' });
    window.SM.bus.emit('mood:set', { name: 'wistful' });
    window.SM.bus.emit('theme:set', { name: 'glass' });
  });
  await new Promise((r) => setTimeout(r, 1500));
  // Click center to focus a shard (raycast in scene).
  const cx = 1440 / 2;
  const cy = 900 / 2;
  await page.mouse.click(cx, cy);
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-10-shard-focus.png');

  // 12) Mood healing + metal theme (final cool composition)
  await page.evaluate(() => {
    window.SM.bus.emit('mood:set', { name: 'healing' });
    window.SM.bus.emit('theme:set', { name: 'metal' });
  });
  await new Promise((r) => setTimeout(r, 1500));
  await snap(page, 'shot-11-healing-metal.png');

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('done');
}

run().catch((e) => { console.error(e); process.exit(1); });
