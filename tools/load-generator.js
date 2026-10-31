// Loads the endless-mode generator and solver from src/game/endless/generator.js for use in Node (tools and
// tests), so they run exactly the code the game ships. The game's files share one browser scope, so the
// generator is evaluated with logic.js and the one-line rng (from src/game/core/state.js) in a sandbox.
// usage: const { genCandidate, analyzeCapped, usage, generateEndless, rng } = require('./load-generator')();
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function loadGenerator() {
  const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
  const m = src('game/core/state.js').match(/^function rng\(seed\)\{[^\n]*$/m);
  if (!m) throw new Error('the one-line function rng(seed){...} was not found in src/game/core/state.js');
  const code = src('logic.js').replace(/if\(typeof module.*$/m, '') + '\n' + m[0] + '\n' + src('game/endless/generator.js') +
    '\n;({ genCandidate, analyzeCapped, usage, generateEndless, rng })';
  // the generator only touches the page to show progress text; give it harmless stand-ins
  const sandbox = { performance: { now: () => Date.now() }, $: () => ({}), progress: {}, setTimeout, console };
  return vm.runInNewContext(code, sandbox, { filename: 'src/game/endless/generator.js' });
};
