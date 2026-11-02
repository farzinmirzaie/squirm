// The install metadata stays honest: the manifest parses, every icon, shortcut icon and screenshot it lists
// exists in public/ at the size it declares (PNG sizes read from the file header), and every local file the
// page's <head> points to exists. Run with `npm test`.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const manifest = JSON.parse(fs.readFileSync(path.join(pub, 'manifest.webmanifest'), 'utf8'));
const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'shell.html'), 'utf8');

// width x height from a PNG's IHDR chunk
const pngSize = f => { const b = fs.readFileSync(f); assert.equal(b.toString('ascii', 1, 4), 'PNG', `${f} is not a PNG`); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };
const check = (entry, what) => {
  const f = path.join(pub, entry.src);
  assert.ok(fs.existsSync(f), `${what} ${entry.src} is missing`);
  if (entry.type === 'image/png') assert.equal(pngSize(f), entry.sizes, `${what} ${entry.src} size`);
};

test('the manifest has what an install needs', () => {
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color']) assert.ok(manifest[k], `manifest.${k}`);
  assert.ok(manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'), 'a 512px maskable icon');
  assert.ok(manifest.icons.some(i => i.sizes === '192x192'), 'a 192px icon');
});
test('manifest icons exist at their declared sizes', () => manifest.icons.forEach(i => check(i, 'icon')));
test('shortcuts point at launch links the game handles, with icons that exist', () => {
  for (const s of manifest.shortcuts || []) {
    assert.match(s.url, /^\.\/\?play=(continue|daily|meadow)$/, `shortcut ${s.name}`);
    (s.icons || []).forEach(i => check(i, 'shortcut icon'));
  }
});
test('screenshots exist at their declared sizes, phone and desktop', () => {
  manifest.screenshots.forEach(s => check(s, 'screenshot'));
  for (const f of ['narrow', 'wide']) assert.ok(manifest.screenshots.some(s => s.form_factor === f), `a ${f} screenshot`);
});
test("the page's head only points at files that ship", () => {
  const head = shell.slice(0, shell.indexOf('</head>'));
  for (const [, href] of head.matchAll(/<link [^>]*href="([^"]+)"/g)) {
    if (/^https?:/.test(href) || href.startsWith('fonts/')) continue; // fonts come from @fontsource at build time
    assert.ok(fs.existsSync(path.join(pub, href)), `<link href="${href}"> is missing from public/`);
  }
  const og = head.match(/property="og:image" content="[^"]*\/squirm\/([^"]+)"/);
  assert.ok(og && fs.existsSync(path.join(pub, og[1])), 'og:image file');
  assert.equal(pngSize(path.join(pub, og[1])), '1200x630', 'og:image size');
});
