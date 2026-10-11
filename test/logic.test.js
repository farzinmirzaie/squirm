// Unit tests for the pure game rules in src/logic.js. Run with `npm test`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { initState, step, tileAt } = require('../src/logic');
const LEVELS = require('../src/levels');

const level = (map, worm, o = {}) => ({ name: 'test', par: 0, exitLen: worm.length, rain: false, map, worm, ...o });
// apply moves in order, failing on any blocked move; returns the last result
function play(s, moves) {
  let r = { state: s };
  for (const d of moves) { r = step(r.state, d); assert.ok(!r.blocked, `move ${d} was blocked: ${r.blocked}`); }
  return r;
}

test('the worm crawls and wins in the burrow at the right length', () => {
  const s = initState(level(['....E'], [[2, 0], [1, 0], [0, 0]]));
  const r = play(s, ['E', 'E']);
  assert.deepEqual(r.state.segs, [[4, 0], [3, 0], [2, 0]]);
  assert.equal(r.state.moves, 2);
  assert.equal(r.state.status, 'won');
});

test('soil, the board edge and the worm body block moves', () => {
  const s = initState(level(['.. ', '...'], [[1, 1], [1, 0], [0, 0]]));
  assert.equal(step(s, 'N').blocked, 'body');
  assert.equal(step(s, 'S').blocked, 'edge');
  assert.ok(!step(s, 'E').blocked);
  assert.ok(!step(s, 'W').blocked);
  // a short worm may follow its own tail, which moves out of the way
  assert.ok(!step(initState(level(['..'], [[1, 0], [0, 0]])), 'W').blocked);
});

test('peaches grow and mushrooms shrink, and both are eaten', () => {
  const s = initState(level(['..+-.'], [[1, 0], [0, 0]]));
  let r = play(s, ['E']);
  assert.equal(r.state.segs.length, 3);
  assert.equal(r.ev.eaten, '+');
  assert.equal(tileAt(r.state, 2, 0), '.');
  r = play(r.state, ['E']);
  assert.equal(r.state.segs.length, 2);
  assert.equal(r.ev.eaten, '-');
});

test('the burrow needs every flag and the exact length', () => {
  let r = step(initState(level(['E.C'], [[1, 0]])), 'W');
  assert.equal(r.ev.exitNote, 'flags');
  assert.equal(r.state.status, 'play');
  r = step(initState(level(['..E'], [[1, 0], [0, 0]], { exitLen: 3 })), 'E');
  assert.equal(r.ev.exitNote, 'length');
  r = play(initState(level(['C.E'], [[1, 0]])), ['W', 'E', 'E']);
  assert.equal(tileAt(r.state, 0, 0), 'c');
  assert.equal(r.state.status, 'won');
});

test('a gate stays locked until a key is picked up, and uses it up', () => {
  const s = initState(level(['.G.K'], [[2, 0]]));
  assert.equal(step(s, 'W').blocked, 'locked');
  let r = play(s, ['E']);
  assert.equal(r.state.keys, 1);
  r = play(r.state, ['W', 'W']);
  assert.equal(r.state.keys, 0);
  assert.equal(tileAt(r.state, 1, 0), '.');
});

test('a dry patch sinks once the tail leaves it', () => {
  const r = play(initState(level(['x...'], [[1, 0], [0, 0]])), ['E']);
  assert.equal(tileAt(r.state, 0, 0), ' ');
  assert.deepEqual(r.ev.crumbled, [[0, 0]]);
});

test('tunnels carry the head to their partner', () => {
  const r = play(initState(level(['1.', '  ', '.1'], [[1, 0]])), ['W']);
  assert.deepEqual(r.state.segs[0], [1, 2]);
  assert.ok(r.ev.portal);
});

test('rain grows seedlings into leaves and floods puddles', () => {
  const s = initState(level(['s.Rw'], [[1, 0]]));
  assert.equal(step(s, 'W').blocked, 'sprout');
  const r = play(s, ['E']);
  assert.equal(r.state.raining, true);
  assert.equal(step(r.state, 'E').blocked, 'flooded');
  play(r.state, ['W', 'W']);
});

test('bridges only go along their planks, and the crank swings them', () => {
  assert.equal(step(initState(level(['.', '=', '.'], [[0, 0]])), 'S').blocked, 'bridge');
  assert.ok(!step(initState(level(['.', '|', '.'], [[0, 0]])), 'S').blocked);
  assert.equal(step(initState(level(['.~.'], [[0, 0]])), 'E').blocked, 'water');
  const r = play(initState(level(['.L', '.~', '=~'], [[0, 0]])), ['E']);
  assert.equal(tileAt(r.state, 0, 2), '|');
  assert.deepEqual(r.ev.swung, [[0, 2]]);
});

test('snails slide after every move, turn around when blocked and block the worm', () => {
  const s = initState(level(['....>'], [[0, 0]]));
  let r = play(s, ['E']);
  assert.deepEqual([r.state.snails[0].x, r.state.snails[0].dx], [4, -1]);
  assert.equal(r.ev.snails[0].turned, true);
  r = play(r.state, ['E']);
  assert.deepEqual([r.state.snails[0].x, r.state.snails[0].dx], [3, -1]);
  assert.equal(step(r.state, 'E').blocked, 'snail');
});

test('moves never change the state they were given', () => {
  const s = initState(level(['.K+x.E'], [[1, 0], [0, 0]]));
  const before = JSON.stringify(s);
  play(s, ['E', 'E', 'E']);
  assert.equal(JSON.stringify(s), before);
});

test('level names are unique (progress is stored by name)', () => {
  const names = LEVELS.map(l => l.name);
  assert.equal(new Set(names).size, names.length);
});
