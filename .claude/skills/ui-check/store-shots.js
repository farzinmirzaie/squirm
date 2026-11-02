// Renders the PWA's install screenshots and the link preview straight into public/, from a garden with some
// progress and an outfit on, so they show the game as it looks today. Run it after every visual change
// (CLAUDE.md, "Screenshots"), look at the images, and commit them with the change.
// usage: node .claude/skills/ui-check/store-shots.js [--game N] [--moves K]
//   --game N   patch number for the in-game shots (1-based, default 155), --moves K  solution moves played first (default 8)
//   The clock is pinned to late morning, so the shots always show daytime and a morning greeting.
//   writes public/screenshots/{home,game,garden,wardrobe}.png (390x844, the manifest's "narrow" shots),
//   public/screenshots/{home,game}-wide.png (1280x800, "wide", for desktop install) and public/share.png
//   (1200x630, the og:image link preview)
// needs playwright and its Chromium (see test/smoke.js); with a global playwright: NODE_PATH=$(npm root -g) node ...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const root = path.join(__dirname, '..', '..', '..');
const { createServer } = require(path.join(root, 'tools/serve'));
const analyze = require(path.join(root, 'tools/analyze')), LEVELS = require(path.join(root, 'src/levels'));

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const game = +opt('--game', 155) - 1, moves = +opt('--moves', 8);
const shots = path.join(root, 'public/screenshots');

// a garden 15 chapters in: mostly three stars, a few two, a streak going, a beret on
function progress() {
  const p = { v: 2, best: {}, stars: {}, clean: {}, badges: {}, stats: { moves: 2400, fruit: 60, taps: 12 }, seeds: 5 };
  LEVELS.slice(0, 150).forEach((l, i) => { p.best[l.name] = l.par + (i % 7 === 3 ? 2 : 0); p.stars[l.name] = i % 7 === 3 ? 2 : 3; p.clean[l.name] = true; });
  const y = new Date(); y.setDate(y.getDate() - 1); const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  p.daily = { results: { [key(y)]: { moves: 14, stars: 3 } }, streak: 4, best: 6, last: key(y) };
  ['first', 'par', 'chapter', 'clean', 'stars50', 'stars150', 'daily', 'snacks', 'flags', 'gates'].forEach(b => p.badges[b] = 1);
  return p;
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'squirm-store-'));
  const server = createServer(tmp, '/squirm/');
  let browser; const errors = [];
  try {
    cp.execFileSync(process.execPath, [path.join(root, 'tools/build.js'), '--debug', '--out', tmp], { stdio: 'inherit' });
    await new Promise((res, rej) => server.once('error', rej).listen(0, res));
    const base = `http://localhost:${server.address().port}/squirm/`;
    browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const sol = analyze(LEVELS[game]).sol.slice(0, moves);
    const open = async (width, height) => {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: 'light' });
      await ctx.addInitScript(p => { Date.prototype.getHours = () => 11; const s = (k, v) => localStorage.setItem(k, v);
        s('squirm-progress', p); s('squirm-tutorial', '1'); s('squirm-news', '9.9.9'); s('squirm-offline-told', '1'); s('squirm-hat', 'beret');
        s('squirm-seen', JSON.stringify(Object.fromEntries('basics flags fruit keys dry portals rain rivers snails buttons beetles leaves pollen soil'.split(' ').map(k => [k, 1])))); },
        JSON.stringify(progress()));
      const page = await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
      await page.goto(base); await page.waitForSelector('#homeOv.show', { timeout: 30000 }); await page.waitForTimeout(4000);
      return { ctx, page };
    };
    const snap = async (page, file) => { await page.waitForTimeout(1200); await page.screenshot({ path: file }); console.log('  saved', path.relative(root, file)); };
    const play = async page => {
      await page.evaluate(i => window.__squirm.load(i), game); await page.waitForTimeout(1500);
      await page.waitForFunction(() => !window.__squirm.busy(), null, { timeout: 60000 });
      for (const d of sol) { await page.evaluate(k => window.__squirm.move(k), d); await page.waitForTimeout(300); await page.waitForFunction(() => !window.__squirm.busy(), null, { timeout: 60000 }); }
      await page.waitForTimeout(2500); };
    // the phone shots
    { const { ctx, page } = await open(390, 844);
      await snap(page, path.join(shots, 'home.png'));
      await page.click('.tab[data-tab="garden"]'); await snap(page, path.join(shots, 'garden.png'));
      await page.click('.tab[data-tab="me"]'); await snap(page, path.join(shots, 'wardrobe.png'));
      await page.click('.tab[data-tab="play"]'); await page.waitForTimeout(600);
      await play(page); await snap(page, path.join(shots, 'game.png'));
      await ctx.close(); }
    // the desktop shots
    { const { ctx, page } = await open(1280, 800);
      await snap(page, path.join(shots, 'home-wide.png'));
      await play(page); await snap(page, path.join(shots, 'game-wide.png'));
      await ctx.close(); }
    // the link preview: the logo and tagline beside the home and game shots, on the lawn
    { const b64 = f => fs.readFileSync(f).toString('base64');
      const font = b64(require.resolve('@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff2', { paths: [root] }));
      const html = `<style>@font-face{font-family:B;src:url(data:font/woff2;base64,${font})}
        body{margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(circle at 30% 40%,#A6D98C,#8CC673 60%,#7DB866);font-family:B}
        .t{position:absolute;left:72px;top:150px;width:500px;color:#5B4436}
        .t img{width:132px;height:132px;display:block;margin-bottom:22px;filter:drop-shadow(0 6px 0 rgba(91,68,54,.25))}
        h1{margin:0;font-size:104px;line-height:1;color:#FFF8EA;-webkit-text-stroke:10px #5B4436;paint-order:stroke fill;letter-spacing:1px}
        p{margin:16px 0 0;font-size:31px;line-height:1.25}
        .ph{position:absolute;top:66px;width:262px;height:567px;border-radius:30px;border:8px solid #5B4436;overflow:hidden;box-shadow:0 14px 0 rgba(91,68,54,.25)}
        .ph img{width:100%;height:100%;display:block}</style>
        <div class="t"><img src="data:image/svg+xml;base64,${b64(path.join(root, 'public/icons/icon.svg'))}"><h1>Squirm</h1><p>A cozy worm puzzle<br>in a little 3D garden</p></div>
        <div class="ph" style="left:612px;transform:rotate(-5deg)"><img src="data:image/png;base64,${b64(path.join(shots, 'home.png'))}"></div>
        <div class="ph" style="left:892px;top:40px;transform:rotate(4deg)"><img src="data:image/png;base64,${b64(path.join(shots, 'game.png'))}"></div>`;
      const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
      await page.setContent(html); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(root, 'public/share.png') }); console.log('  saved public/share.png'); }
    if (errors.length) { console.error('page errors:\n ' + errors.join('\n ')); process.exitCode = 1; }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
