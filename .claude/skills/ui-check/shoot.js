// Screenshots the game in light and dark for a visual check: builds a debug copy into a temp folder,
// serves it under /squirm/ like GitHub Pages, and saves the home tabs and one patch at phone size.
// usage: node .claude/skills/ui-check/shoot.js [outDir=shots] [--level N] [--scale 2]
//   --level N  patch number to show in the game shots (1-based, default 151)
//   --scale    device pixel ratio (default 2)
// needs playwright and its Chromium (see test/smoke.js); with a global playwright: NODE_PATH=$(npm root -g) node ...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const root = path.join(__dirname, '..', '..', '..');
const { createServer } = require(path.join(root, 'tools/serve'));

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const level = +opt('--level', 151), scale = +opt('--scale', 2);
const outDir = path.resolve(args[0] || 'shots');
const TABS = ['play', 'garden', 'meadow', 'me', 'badges'];

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'squirm-shots-'));
  const server = createServer(tmp, '/squirm/');
  let browser; const errors = [];
  try {
    cp.execFileSync(process.execPath, [path.join(root, 'tools/build.js'), '--debug', '--out', tmp], { stdio: 'inherit' });
    await new Promise((res, rej) => server.once('error', rej).listen(0, res));
    const base = `http://localhost:${server.address().port}/squirm/`;
    fs.mkdirSync(outDir, { recursive: true });
    browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, colorScheme: scheme });
      // skip the first-time tutorial so it doesn't cover the shots
      await ctx.addInitScript(() => { try { localStorage.setItem('squirm-tutorial', '1'); } catch (e) {} });
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      const shot = async name => { await page.waitForTimeout(900); const f = path.join(outDir, `${name}-${scheme}.png`); await page.screenshot({ path: f }); console.log('  saved', path.relative(process.cwd(), f)); };
      await page.goto(base);
      await page.waitForSelector('#homeOv.show', { timeout: 30000 });
      for (const t of TABS) { await page.click(`.tab[data-tab="${t}"]`); await shot(`home-${t}`); }
      await page.evaluate(i => window.__squirm.load(i), level - 1);
      if (await page.isVisible('#introOv.show')) { await shot(`intro-${level}`); await page.click('#introOk'); }
      await shot(`patch-${level}`);
      await ctx.close();
    }
    if (errors.length) { console.error('page errors:\n ' + errors.join('\n ')); process.exitCode = 1; }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
