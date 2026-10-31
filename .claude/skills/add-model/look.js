// Renders 3D models from several sides for review: wardrobe items on the worm, or board pieces in a patch.
// usage:
//   node .claude/skills/add-model/look.js <outDir> wardrobe '<list>' [--dark]
//     list: [[name, hat id, extra id, {colour option by item id}, worm colour index], ...]
//     e.g. '[["teacup","teacup","none",{"teacup":1},0],["patch","none","eyepatch",{},5]]'
//     views: front, left, right, back and top (top is about the in-patch camera), on the wardrobe stage
//   node .claude/skills/add-model/look.js <outDir> board '<list>' [--dark]
//     list: [[name, {map, worm, exitLen, rain}, [x, y] tile to look at, "moves" to play first], ...]
//     e.g. '[["gate",{"map":["P.p.E"],"worm":[[1,0],[0,0]],"exitLen":2},[2,0],"W"]]'
//     views: game (the normal patch camera, HUD hidden), then close orbits from the front, left, right and back
// saves <outDir>/<name>-<view>.png and <outDir>/<name>.png with the views side by side. Everything is unlocked.
// needs playwright and its Chromium; with a global playwright: NODE_PATH=$(npm root -g) node ...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const root = path.join(__dirname, '..', '..', '..');
const { createServer } = require(path.join(root, 'tools/serve'));
const LEVELS = require(path.join(root, 'src/levels.js'));
const args = process.argv.slice(2), dark = args.includes('--dark'), [outDir, mode, listJ] = args.filter(a => a !== '--dark');
if (!listJ || !['wardrobe', 'board'].includes(mode)) { console.error('usage: node look.js <outDir> wardrobe|board \'<json list>\' [--dark] (see the comment at the top)'); process.exit(2); }
const list = JSON.parse(listJ);
const ev = (page, code) => page.evaluate(c => window.__squirm.ev(c), code);
const idle = page => page.waitForFunction(() => !window.__squirm.busy(), null, { timeout: 60000 });

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'squirm-look-'));
  const server = createServer(tmp, '/squirm/'); let browser; const errors = [];
  try {
    cp.execFileSync(process.execPath, [path.join(root, 'tools/build.js'), '--debug', '--out', tmp], { stdio: 'ignore' });
    // an eval hook inside the game's scope, for this throwaway copy only: it dresses the worm and moves cameras
    const ip = path.join(tmp, 'index.html'); fs.writeFileSync(ip, fs.readFileSync(ip, 'utf8').replace('window.__squirm={', 'window.__squirm={ev:s=>eval(s),'));
    await new Promise((res, rej) => server.once('error', rej).listen(0, res));
    fs.mkdirSync(outDir, { recursive: true });
    browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const big = 1e6, progress = { v: 2, best: {}, stars: {}, clean: {}, badges: {}, stats: { taps: big, moves: big, burrows: big, naps: big, teatime: 1, days: big, rains: big, restarts: big, outfits: big, allPollen: 1, photos: big, dailies: big, fruit: big } };
    LEVELS.forEach(l => { progress.best[l.name] = l.par; progress.stars[l.name] = 3; progress.clean[l.name] = true; });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
    // every mechanic's intro already seen, so no card covers a board shot
    await ctx.addInitScript(p => { localStorage.setItem('squirm-tutorial', '1'); localStorage.setItem('squirm-progress', p); localStorage.setItem('squirm-news', '9.9.9');
      localStorage.setItem('squirm-seen', JSON.stringify(Object.fromEntries('basics flags fruit keys dry portals rain rivers snails buttons beetles leaves pollen soil'.split(' ').map(k => [k, 1])))); }, JSON.stringify(progress));
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${server.address().port}/squirm/`); await page.waitForSelector('#homeOv.show', { timeout: 60000 });
    // photo mode's buttons and its hint toast would cover the close-ups
    await page.addStyleTag({ content: '#photoBar,#toast{visibility:hidden!important}' });
    const strip = async (name, shots, w, h) => {
      const sp = await browser.newPage({ viewport: { width: w * shots.length, height: h } });
      await sp.setContent(`<body style="margin:0;display:flex">${shots.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:${w}px;height:${h}px">`).join('')}</body>`);
      await sp.screenshot({ path: path.join(outDir, `${name}.png`) }); await sp.close(); console.log('  saved', name);
    };
    if (mode === 'wardrobe') {
      await page.click('.tab[data-tab="me"]'); await page.waitForTimeout(1500);
      const box = await (await page.$('#homeWorm')).boundingBox();
      for (const [name, hat, extra, tints, col] of list) {
        await ev(page, `tints=${JSON.stringify(tints || {})}; hatId=${JSON.stringify(hat)}; extraId=${JSON.stringify(extra)}; wormCol=${col | 0}; applyWormColour(); dressHat(hHead); dressExtra(hHead);`);
        const shots = [];
        for (const [v, yaw, el] of [['front', 0, .35], ['left', 1.1, .35], ['right', -1.1, .35], ['back', 2.6, .35], ['top', 0, 1.35]]) {
          await ev(page, `{ const p=new THREE.Vector3(); hHead.getWorldPosition(p); const d=3.4; hCam.position.set(p.x+Math.sin(${yaw})*d*Math.cos(${el}),p.y+Math.sin(${el})*d,p.z+Math.cos(${yaw})*d*Math.cos(${el})); hCam.lookAt(p.x,p.y+.28,p.z); }`);
          await page.waitForTimeout(500);
          const f = path.join(outDir, `${name}-${v}.png`); await page.screenshot({ path: f, clip: box }); shots.push(f);
        }
        await strip(name, shots, Math.round(box.width), Math.round(box.height));
      }
    } else {
      for (const [name, level, focus, moves] of list) {
        const L = { name: 'Look ' + name, hint: '', par: 1, exitLen: 3, rain: false, ...level };
        await page.evaluate(l => { LEVELS.push(l); window.__squirm.load(LEVELS.length - 1); }, L);
        await page.waitForTimeout(500); await idle(page);
        for (const m of (moves || '')) { await page.evaluate(k => window.__squirm.move(k), m); await page.waitForTimeout(100); await idle(page); }
        await page.waitForTimeout(600);
        const shots = [path.join(outDir, `${name}-game.png`)];
        await ev(page, `document.body.classList.add('photo')`); await page.waitForTimeout(400);
        await page.screenshot({ path: shots[0] });
        // photo mode glides the camera to its framing first; let that finish (slow in software rendering)
        await ev(page, `document.body.classList.remove('photo'); enterPhoto();`);
        for (let k = 0, last = ''; k < 60; k++) { await page.waitForTimeout(250); const now = await ev(page, `camera.position.toArray().map(v=>v.toFixed(4)).join()`); if (now === last) break; last = now; }
        const [fx, fy] = focus || [0, 0];
        for (const [v, yaw, pitch] of [['front', 0, .75], ['left', 1.2, .5], ['right', -1.2, .5], ['back', Math.PI, .6]]) {
          for (let k = 0; k < 2; k++) { await ev(page, `orbitStart(); orbit.t.copy(wp(${fx},${fy})); orbit.yaw=${yaw}; orbit.pitch=${pitch}; orbit.d=orbit.d0*.35; orbitApply();`); await page.waitForTimeout(500); }
          const f = path.join(outDir, `${name}-${v}.png`); await page.screenshot({ path: f }); shots.push(f);
        }
        await ev(page, `exitPhoto();`); await page.waitForTimeout(600);
        await strip(name, shots, 260, 563);
      }
    }
    if (errors.length) { console.error('page errors:\n ' + errors.join('\n ')); process.exitCode = 1; }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
