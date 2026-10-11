// Browser smoke test: builds a debug copy of the game, serves it under /squirm/ like GitHub Pages,
// and plays it in headless Chromium: boot, first patch to a win, saved progress, offline reload.
// usage: npm run smoke   (needs the playwright package and a Chromium it can launch)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const assert = require('assert/strict');

const root = path.join(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'squirm-smoke-'));
cp.execFileSync(process.execPath, [path.join(root, 'tools/build.js'), '--debug', '--out', out], { stdio: 'inherit' });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/squirm/') && path.join(out, url.slice(8) || 'index.html');
  if (!file || !file.startsWith(out) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const errors = [];
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/squirm/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const step = msg => console.log('  ok', msg);

    await page.goto(base);
    await page.waitForSelector('#homeOv.show', { timeout: 30000 });
    assert.equal(await page.isVisible('#noGL'), false, 'WebGL fallback shown');
    step('boots to the home screen');

    await page.evaluate(() => navigator.serviceWorker.ready);
    step('service worker is ready');

    await page.click('#homePlay');
    await page.waitForSelector('#introOv.show', { timeout: 30000 });
    await page.click('#introOk');
    step('Play opens patch 1 with its intro');

    for (const d of 'SSEEES') {
      await page.waitForFunction(() => !window.__squirm.busy(), null, { timeout: 30000 });
      await page.evaluate(d => window.__squirm.move(d), d);
    }
    await page.waitForSelector('#winOv.show', { timeout: 60000 });
    const progress = JSON.parse(await page.evaluate(() => localStorage.getItem('squirm-progress')));
    assert.equal(progress.best['First wiggle'], 6);
    assert.equal(progress.stars['First wiggle'], 3);
    step('solves patch 1 on par and saves 3 stars');

    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('#homeOv.show', { timeout: 30000 });
    assert.equal(await page.textContent('#playTitle'), 'Continue');
    assert.match(await page.textContent('#playSub'), /Patch 2/);
    step('reloads offline and offers to continue with patch 2');

    assert.deepEqual(errors, [], 'console errors');
    step('no console errors');
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); if (errors.length) console.error('page errors:', errors); process.exit(1); });
