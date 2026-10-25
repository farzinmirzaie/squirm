// Loads the endless-mode generator and solver from src/game.js for use in Node (tools and tests),
// so they run exactly the code the game ships. game.js is one browser IIFE, so the section between
// the "endless meadow" marker and `const todayKey` is evaluated with logic.js in a sandbox.
// usage: const { genCandidate, analyzeCapped, usage, generateEndless, rng } = require('./load-generator')();
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function loadGenerator() {
  const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
  const game = src('game.js');
  // markers must start a line, so a comment that mentions them can't move the cut
  const at = re => { const m = re.exec(game); return m ? m.index : -1; };
  const start = at(/^\/\/ ---------- endless meadow ----------/m), end = at(/^const todayKey/m);
  if (start < 0 || end <= start) throw new Error('endless meadow section not found in src/game.js');
  const rng = game.match(/function rng\(seed\)\{[^\n]*\n?/)[0];
  const code = src('logic.js').replace(/if\(typeof module.*$/m, '') + '\n' + rng + '\n' + game.slice(start, end) +
    '\n;({ genCandidate, analyzeCapped, usage, generateEndless, rng })';
  // the generator only touches the page to show progress text; give it harmless stand-ins
  const sandbox = { performance: { now: () => Date.now() }, $: () => ({}), progress: {}, setTimeout, console };
  return vm.runInNewContext(code, sandbox, { filename: 'game.js (endless meadow)' });
};
