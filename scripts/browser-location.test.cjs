const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const compiled = ts.transpileModule(fs.readFileSync('src/lib/browser-location.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module('browser-location');
loaded._compile(compiled, 'browser-location.js');
const { getAccuratePosition } = loaded.exports;
const fix = (accuracy, timestamp = Date.now()) => ({ coords: { latitude: 5.6, longitude: -0.2, accuracy }, timestamp });
function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = { cleared: [], fallback: 0 };
  const geo = {
    watchPosition(success, failure) { calls.success = success; calls.failure = failure; return 7; },
    clearWatch(id) { calls.cleared.push(id); },
    getCurrentPosition(success, failure, options) { calls.fallback++; calls.network = success; calls.networkFailure = failure; calls.options = options; },
  };
  return { calls, geo };
}
test('precise fix settles promptly and cleans up acquisition', async t => {
  const { calls, geo } = setup(t); const promise = getAccuratePosition(15000, 35, geo);
  calls.success(fix(20)); assert.equal((await promise).coords.accuracy, 20);
  t.mock.timers.tick(15000); assert.equal(calls.fallback, 0); assert.deepEqual(calls.cleared, [7]);
});
test('transient high accuracy failure still permits a fresh network fix', async t => {
  const { calls, geo } = setup(t); const promise = getAccuratePosition(15000, 35, geo);
  calls.failure({ code: 2 }); t.mock.timers.tick(3000);
  assert.equal(calls.options.enableHighAccuracy, false); assert.equal(calls.options.maximumAge, 0);
  calls.network(fix(25)); assert.equal((await promise).coords.accuracy, 25);
});
test('deadline returns the most accurate available fix without inventing precision', async t => {
  const { calls, geo } = setup(t); const promise = getAccuratePosition(15000, 35, geo);
  calls.success(fix(90)); t.mock.timers.tick(3000); calls.network(fix(70)); calls.success(fix(110));
  t.mock.timers.tick(12000); assert.equal((await promise).coords.accuracy, 70);
});
test('permission denial stops both paths', async t => {
  const { calls, geo } = setup(t); const promise = getAccuratePosition(15000, 35, geo);
  calls.failure({ code: 1 }); await assert.rejects(promise, e => e.code === 1);
  t.mock.timers.tick(15000); assert.equal(calls.fallback, 0); assert.deepEqual(calls.cleared, [7]);
});
test('invalid or stale fixes cannot authorize attendance', async t => {
  const { calls, geo } = setup(t); const promise = getAccuratePosition(15000, 35, geo);
  calls.success(fix(0)); calls.success(fix(NaN)); calls.success(fix(10, Date.now() - 60000));
  t.mock.timers.tick(15000); await assert.rejects(promise, /No fresh location/);
});
test('coarse fix survives a transient error while waiting for improvement', async t => {
  const { calls, geo } = setup(t); const promise = getAccuratePosition(15000, 35, geo);
  calls.success(fix(80)); calls.failure({ code: 3 }); t.mock.timers.tick(15000);
  assert.equal((await promise).coords.accuracy, 80);
});
