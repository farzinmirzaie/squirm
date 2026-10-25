// Browser smoke test: builds a debug copy of the game, serves it under /squirm/ like GitHub Pages,
// and plays it in headless Chromium: boot, first patch to a win, saved progress, offline reload.
// usage: npm run smoke   (needs the playwright package and a Chromium it can launch:
//        npx playwright install chromium; with a global playwright, NODE_PATH=$(npm root -g) npm run smoke)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const assert = require('assert/strict');
const { createServer } = require('../tools/serve');

const root = path.join(__dirname, '..');
const errors = [];
(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'squirm-smoke-'));
  const server = createServer(out, '/squirm/');
  let browser;
  try {
    cp.execFileSync(process.execPath, [path.join(root, 'tools/build.js'), '--debug', '--out', out], { stdio: 'inherit' });
    await new Promise((resolve, reject) => server.once('error', reject).listen(0, resolve));
    const base = `http://localhost:${server.address().port}/squirm/`;
    browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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

    await page.click('#moves');
    await page.waitForSelector('#toast.show');
    assert.match(await page.textContent('#toast .msg'), /^Par is 6\./);
    assert.ok((await page.$eval('#toast', t => t.getBoundingClientRect().width)) > 150, 'toast is too narrow to read');
    step('tapping the move counter explains par in a readable toast');

    for (const d of 'SSEEES') {
      await page.waitForFunction(() => !window.__squirm.busy(), null, { timeout: 30000 });
      await page.evaluate(d => window.__squirm.move(d), d);
    }
    await page.waitForSelector('#winOv.show', { timeout: 60000 });
    const progress = JSON.parse(await page.evaluate(() => localStorage.getItem('squirm-progress')));
    assert.equal(progress.best['First wiggle'], 6);
    assert.equal(progress.stars['First wiggle'], 3);
    step('solves patch 1 on par and saves 3 stars');

    await page.keyboard.press('Escape');
    const mem = async () => { for (const i of [40, 60, 91, 100, 30]) { await page.evaluate(i => window.__squirm.load(i), i); await page.waitForTimeout(400); }
      return page.evaluate(() => window.__squirm.mem()); };
    const m1 = await mem(), m2 = await mem();
    assert.ok(m2.geometries - m1.geometries < 40, `GPU geometries grew from ${m1.geometries} to ${m2.geometries}`);
    assert.equal(m2.textures, m1.textures, 'GPU textures grew');
    step(`GPU memory stays flat across patches (${m1.geometries} -> ${m2.geometries} geometries)`);

    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('#homeOv.show', { timeout: 30000 });
    assert.equal(await page.textContent('#playTitle'), 'Continue');
    assert.match(await page.textContent('#playSub'), /Patch 2/);
    step('reloads offline and offers to continue with patch 2');

    assert.deepEqual(errors, [], 'console errors');
    step('no console errors');
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); if (errors.length) console.error('page errors:', errors); process.exit(1); });
