// What's new and the app version stay in step: the newest NEWS entry is package.json's version, versions are
// semver and newest first, and every entry has a date, a title and at least one line. Run with `npm test`.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const game = fs.readFileSync(path.join(__dirname, '..', 'src', 'game', 'ui', 'news.js'), 'utf8');
const pkg = require('../package.json');
const NEWS = eval(game.match(/^const NEWS=(\[[\s\S]*?\]\]\]);$/m)[1]);
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

test('package.json has a semver version', () => assert.match(pkg.version, /^\d+\.\d+\.\d+$/));
test("the newest What's new entry is this version", () => assert.equal(NEWS[0][0], pkg.version));
test("What's new entries are well formed and newest first", () => {
  NEWS.forEach(([v, date, title, lines], i) => {
    assert.match(v, /^\d+\.\d+\.\d+$/, `version ${v}`); assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `date of ${v}`);
    assert.ok(title && lines.length, `title and lines of ${v}`);
    if (i) { assert.ok(cmp(NEWS[i - 1][0], v) > 0, `${NEWS[i - 1][0]} after ${v}`); assert.ok(NEWS[i - 1][1] >= date, `date of ${NEWS[i - 1][0]}`); }
  });
});
