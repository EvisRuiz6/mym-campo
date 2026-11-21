import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function loadBoundariesForReport()');
const end = source.indexOf('\nfunction selectVisitMapLot(', start);
assert.ok(start >= 0 && end > start);

function harness() {
  const cache = new Map(), navigator = { onLine: true };
  const state = { configured: true, user: { id: 'one', role: 'supervisor', status: 'active', allowedZones: ['1'] } };
  let failure;
  const key = (type, user) => JSON.stringify([type, user.id, user.role, user.allowedZones]);
  const load = runInNewContext(source.slice(start, end) + '\nloadBoundariesForReport', {
    state, navigator, offlineSnapshotKey: key,
    sameOfflineScope: user => state.user.status === 'active' && key('s', state.user) === key('s', user),
    getOfflineSnapshot: async id => cache.get(id),
    putOfflineSnapshot: async snapshot => cache.set(snapshot.id, snapshot),
    loadVisitMapBoundaries: async () => {
      if (failure) throw failure;
      return [{ lot_code: '17', zone: '1' }];
    },
    toast() {}, console: { warn() {}, error() {} }
  });
  return { state, navigator, load, fail: error => { failure = error; } };
}

test('stores authorized boundaries and restores them offline for the same scope', async () => {
  const h = harness();
  await h.load();
  h.navigator.onLine = false;
  const snapshot = await h.load();
  assert.equal(snapshot.boundaries[0].lot_code, '17');
  assert.ok(snapshot.savedAt);
  h.state.user = { ...h.state.user, allowedZones: ['2'] };
  await assert.rejects(h.load(), /No hay límites guardados/);
});

test('does not use cached boundaries when the server rejects access', async () => {
  const h = harness();
  await h.load();
  h.fail(new Error('Sin permisos'));
  await assert.rejects(h.load(), /Sin permisos/);
});
