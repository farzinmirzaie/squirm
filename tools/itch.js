// Packs the game for itch.io: builds dist/ and zips it (index.html at the zip's root) into squirm-itch.zip, the file to
// upload as an HTML game. The embedded copy knows it's on itch (ON_ITCH in core/base.js): its shared links point at the
// main site, its plays count as launch/itch, and it skips the offline worker.
// usage: node tools/itch.js        (needs the zip command)
const cp = require('child_process'), path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..'), out = path.join(root, 'squirm-itch.zip');
cp.execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
fs.rmSync(out, { force: true });
cp.execFileSync('zip', ['-qr', out, '.', '-x', 'screenshots/*', 'share.png', 'sitemap.xml', 'sw.js'], { cwd: path.join(root, 'dist'), stdio: 'inherit' });
console.log(`packed ${path.relative(root, out)} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
