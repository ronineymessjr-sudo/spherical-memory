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
