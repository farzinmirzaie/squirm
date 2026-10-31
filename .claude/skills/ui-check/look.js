// Close-ups of the worm wearing wardrobe items, from five sides, to review 3D models (hats, extras, colours).
// usage: node .claude/skills/ui-check/look.js <outDir> '<json list>' [--dark]
//   list: [[name, hat id, extra id, {tints by item id}, colour index], ...], e.g.
//   '[["teacup","teacup","none",{"teacup":1},0],["patch","none","eyepatch",{},5]]'
//   saves <outDir>/<name>-{front,left,right,back,top}.png (top is about the in-patch camera) and
//   <outDir>/<name>.png, the five side by side. Everything is unlocked for the shots.
// needs playwright and its Chromium; with a global playwright: NODE_PATH=$(npm root -g) node ...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const root = path.join(__dirname, '..', '..', '..');
const { createServer } = require(path.join(root, 'tools/serve'));
const LEVELS = require(path.join(root, 'src/levels.js'));
const args = process.argv.slice(2), dark = args.includes('--dark'), [outDir, listJ] = args.filter(a => a !== '--dark');
if (!listJ) { console.error('usage: node look.js <outDir> \'[[name,hat,extra,{tints},colour],...]\' [--dark]'); process.exit(2); }
const list = JSON.parse(listJ);
const VIEWS = [['front', 0, .35], ['left', 1.1, .35], ['right', -1.1, .35], ['back', 2.6, .35], ['top', 0, 1.35]];

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'squirm-look-'));
  const server = createServer(tmp, '/squirm/'); let browser; const errors = [];
  try {
    cp.execFileSync(process.execPath, [path.join(root, 'tools/build.js'), '--debug', '--out', tmp], { stdio: 'ignore' });
    // an eval hook inside the game's scope, for this throwaway copy only: it moves the stage camera round the head
    const ip = path.join(tmp, 'index.html'); fs.writeFileSync(ip, fs.readFileSync(ip, 'utf8').replace('window.__squirm={', 'window.__squirm={ev:s=>eval(s),'));
    await new Promise((res, rej) => server.once('error', rej).listen(0, res));
    fs.mkdirSync(outDir, { recursive: true });
    browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const big = 1e6, progress = { v: 2, best: {}, stars: {}, clean: {}, badges: {}, stats: { taps: big, moves: big, burrows: big, naps: big, teatime: 1, days: big, rains: big, restarts: big, outfits: big, allPollen: 1, photos: big, dailies: big, fruit: big } };
    LEVELS.forEach(l => { progress.best[l.name] = l.par; progress.stars[l.name] = 3; progress.clean[l.name] = true; });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
    await ctx.addInitScript(p => { localStorage.setItem('squirm-tutorial', '1'); localStorage.setItem('squirm-progress', p); localStorage.setItem('squirm-news', '9.9.9'); }, JSON.stringify(progress));
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${server.address().port}/squirm/`); await page.waitForSelector('#homeOv.show', { timeout: 60000 });
    await page.click('.tab[data-tab="me"]'); await page.waitForTimeout(1500);
    const box = await (await page.$('#homeWorm')).boundingBox();
    for (const [name, hat, extra, tints, col] of list) {
      await page.evaluate(a => window.__squirm.ev(`tints=${JSON.stringify(a[2] || {})}; hatId=${JSON.stringify(a[0])}; extraId=${JSON.stringify(a[1])}; wormCol=${a[3] | 0}; applyWormColour(); dressHat(hHead); dressExtra(hHead);`), [hat, extra, tints, col]);
      const shots = [];
      for (const [v, yaw, el] of VIEWS) {
        await page.evaluate(([yaw, el]) => window.__squirm.ev(`{ const p=new THREE.Vector3(); hHead.getWorldPosition(p); const d=3.4; hCam.position.set(p.x+Math.sin(${yaw})*d*Math.cos(${el}),p.y+Math.sin(${el})*d,p.z+Math.cos(${yaw})*d*Math.cos(${el})); hCam.lookAt(p.x,p.y+.28,p.z); }`), [yaw, el]);
        await page.waitForTimeout(500);
        const f = path.join(outDir, `${name}-${v}.png`); await page.screenshot({ path: f, clip: box }); shots.push(f);
      }
      // the five views in one strip, so a model can be judged at a glance
      const strip = await browser.newPage({ viewport: { width: Math.round(box.width) * 5, height: Math.round(box.height) } });
      await strip.setContent(`<body style="margin:0;display:flex">${shots.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:${Math.round(box.width)}px">`).join('')}</body>`);
      await strip.screenshot({ path: path.join(outDir, `${name}.png`) }); await strip.close();
      console.log('  saved', name);
    }
    if (errors.length) { console.error('page errors:\n ' + errors.join('\n ')); process.exitCode = 1; }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
