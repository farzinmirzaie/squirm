// Tests for the endless / daily patch generator (the code in src/game.js, loaded by tools/load-generator.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const loadGenerator = require('../tools/load-generator');
const analyze = require('../tools/analyze');

const { generateEndless } = loadGenerator();
// same options and seed recipe as startDaily() in game.js
const DAILY_OPTS = { flags: true, fruit: true, keys: true, dry: true, portals: true };
const dailySeed = key => { let seed = 0; for (const ch of 'daily' + key) seed = (seed * 31 + ch.charCodeAt(0)) | 0; return seed; };

test('the daily patch is the same for everyone on a given day', async () => {
  const a = await generateEndless('medium', { ...DAILY_OPTS }, dailySeed('2026-10-12'), 30);
  const b = await generateEndless('medium', { ...DAILY_OPTS }, dailySeed('2026-10-12'), 30);
  assert.deepEqual(a.map, b.map);
  assert.deepEqual(a.worm, b.worm);
  assert.equal(a.par, b.par);
  const c = await generateEndless('medium', { ...DAILY_OPTS }, dailySeed('2026-10-13'), 30);
  assert.notDeepEqual(c.map, a.map, 'different days should get different patches');
});

test('generated patches are solvable and their par is the true shortest solution', async () => {
  for (const [diff, seed] of [['easy', 11], ['medium', 22], ['daily', dailySeed('2026-01-01')]]) {
    const L = diff === 'daily'
      ? await generateEndless('medium', { ...DAILY_OPTS }, seed, 30)
      : await generateEndless(diff, { flags: true, fruit: true, dry: true }, seed, 12);
    const a = analyze(L);
    assert.ok(a.par, `${diff} patch is unsolvable`);
    assert.equal(L.par, a.par, `${diff} patch has the wrong par`);
    assert.ok(L.par >= 5, `${diff} patch is too short`);
  }
});

test('endless patches with flower buttons and wet leaves use them and are solvable', async () => {
  for (const [opts, seed] of [[{ flags: true, buttons: true }, 5], [{ flags: true, leaves: true }, 6]]) {
    const L = await generateEndless('medium', opts, seed, 15);
    const a = analyze(L);
    assert.ok(a.par, 'unsolvable');
    assert.equal(L.par, a.par);
    assert.ok(/[HBi]/.test(L.map.join('')), 'the mechanic is not on the board');
  }
});
