import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = 4175;

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

async function resolveExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    try {
      await fs.access(process.env.PUPPETEER_EXECUTABLE_PATH);
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    } catch {}
  }

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  throw new Error('No compatible Chrome/Edge executable found for smoke test.');
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${host}:${port}`);
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

  await new Promise((resolve) => server.listen(port, host, resolve));
  return server;
}

async function runSmoke() {
  const server = await startServer();
  const executablePath = await resolveExecutable();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  try {
    const uploadPage = await browser.newPage();
    const uploadErrors = [];
    const failedUploadRequests = [];
    uploadPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        uploadErrors.push(msg.text());
      }
    });
    uploadPage.on('pageerror', (error) => {
      uploadErrors.push(error.message);
    });
    uploadPage.on('response', (response) => {
      if (response.status() >= 400) {
        failedUploadRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await uploadPage.goto(`http://${host}:${port}/`, { waitUntil: 'networkidle2' });
    await uploadPage.waitForSelector('#upload-images', { timeout: 5000 });
    const uploadInput = await uploadPage.$('#upload-images');
    await uploadInput.uploadFile(
      path.join(rootDir, 'assets', 'fallback', 'travel-media', 'travel-01-seaside.webp'),
      path.join(rootDir, 'assets', 'fallback', 'travel-media', 'travel-05-seaside-loop.mp4'),
    );

    await uploadPage.waitForFunction(() => {
      return window.SM?.materials?.length === 2 && window.SM?.materialAssignments?.length === 6;
    }, { timeout: 10000 });

    await uploadPage.evaluate(() => {
      window.SM.go('mirror');
      const tap = () => window.SM.bus.emit('input:tap', {
        target: 'mirror',
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      tap();
      tap();
      tap();
    });

    await uploadPage.waitForFunction(() => window.SM?.currentState === 'sphere', { timeout: 15000 });
    await uploadPage.waitForFunction(() => {
      return window.SM?.modules?.render3d?.shardMesh?.getShards?.()
        ?.some((shard) => shard.mesh.userData.materialType === 'video');
    }, { timeout: 10000 });

    const uploadSnapshot = await uploadPage.evaluate(() => ({
      summary: document.querySelector('#upload-summary')?.textContent || '',
      focus: document.querySelector('#hud-library-detail')?.textContent || '',
      hasVideo: window.SM.materials.some((item) => item.type === 'video'),
    }));

    const blockingUploadRequests = failedUploadRequests.filter((entry) => !entry.endsWith('/favicon.ico'));
    if (uploadErrors.length || blockingUploadRequests.length || !uploadSnapshot.hasVideo) {
      throw new Error(
        `Smoke issues on upload route:\n${uploadErrors.join('\n')}\n${blockingUploadRequests.join('\n')}\n${JSON.stringify(uploadSnapshot)}`.trim(),
      );
    }

    const page = await browser.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`http://${host}:${port}/?autoclick=3`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window.SM?.currentState === 'sphere', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('#hud-container .hud-button').length === 3, { timeout: 5000 });

    const blockingAutoclickRequests = failedRequests.filter((entry) => !entry.endsWith('/favicon.ico'));
    if (consoleErrors.length || blockingAutoclickRequests.length) {
      throw new Error(
        `Smoke issues on autoclick route:\n${consoleErrors.join('\n')}\n${blockingAutoclickRequests.join('\n')}`.trim(),
      );
    }

    const demoPage = await browser.newPage();
    const demoErrors = [];
    const failedDemoRequests = [];
    demoPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        demoErrors.push(msg.text());
      }
    });
    demoPage.on('pageerror', (error) => {
      demoErrors.push(error.message);
    });
    demoPage.on('response', (response) => {
      if (response.status() >= 400) {
        failedDemoRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await demoPage.goto(`http://${host}:${port}/?demo=1`, { waitUntil: 'networkidle2' });
    await demoPage.waitForSelector('#demo-badge', { timeout: 5000 });
    await demoPage.waitForFunction(() => window.SM?.currentState === 'sphere', { timeout: 15000 });

    const blockingDemoRequests = failedDemoRequests.filter((entry) => !entry.endsWith('/favicon.ico'));
    if (demoErrors.length || blockingDemoRequests.length) {
      throw new Error(
        `Smoke issues on demo route:\n${demoErrors.join('\n')}\n${blockingDemoRequests.join('\n')}`.trim(),
      );
    }

    console.log('Smoke checks passed for ?autoclick=3 and ?demo=1');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runSmoke().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
