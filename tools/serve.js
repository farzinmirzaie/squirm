// A tiny static file server for dist/ (no dependencies), also used by test/smoke.js.
// usage: node tools/serve.js [dir=dist] [--port 8080] [--base /squirm/]
//   --base serves the site under a sub-path, like GitHub Pages does (default: /)
const http = require('http'), fs = require('fs'), path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

// Returns an http.Server (not yet listening) that serves `dir` under `base`.
function createServer(dir, base = '/') {
  const rootDir = path.resolve(dir);
  if (!base.endsWith('/')) base += '/';
  return http.createServer((req, res) => {
    let url;
    try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
    if (url === base.slice(0, -1)) { res.writeHead(301, { location: base }); return res.end(); }
    if (!url.startsWith(base)) { res.writeHead(404); return res.end(); }
    let file = path.join(rootDir, url.slice(base.length));
    if (file !== rootDir && !file.startsWith(rootDir + path.sep)) { res.writeHead(404); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    // no-cache so a rebuilt dist/ (and its service worker) is picked up on reload
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}
module.exports = { createServer };

if (require.main === module) {
  const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const port = +(opt('--port') || 8080), base = opt('--base') || '/';
  const dir = path.resolve(args[0] || path.join(__dirname, '..', 'dist'));
  if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`no index.html in ${dir}; run npm run build first`); process.exit(1); }
  const server = createServer(dir, base);
  server.on('error', e => { console.error(e.message); process.exit(1); });
  server.listen(port, () => console.log(`serving ${path.relative(process.cwd(), dir) || '.'} at http://localhost:${port}${base.endsWith('/') ? base : base + '/'}`));
}
