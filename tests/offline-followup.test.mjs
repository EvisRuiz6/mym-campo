import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function extract(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}
const code = extract('function offlineSnapshotKey(', '\nconst getOfflineSnapshot') +
  extract('function sameOfflineScope(', '\nfunction putRecords(') +
  extract('async function loadLotFollowup()', '\nlet weeklyCapture = null;') +
  '\n({ loadLotFollowup, offlineSnapshotKey })';

function harness() {
  const snapshots = new Map(), messages = [];
  const state = {
    configured: true,
    user: { id: 'one', role: 'supervisor', status: 'active', allowedZones: ['2', '1'] }
  };
  const navigator = { onLine: true };
  let failure = null;
  const context = runInNewContext(code, {
    state, navigator, normalizeZoneValue: value => String(value ?? '').trim(),
    canAccessLotFollowup: () => true,
    setLotFollowupStatus: text => messages.push(text),
    loadLotLookup: async () => {},
    fetchAllLotFollowupPlans: async () => {
      if (failure) throw failure;
      return [{ lot_code: '17' }];
    },
    fetchAllLotFollowupVisits: async () => [{ record_id: 'r1' }],
    putOfflineSnapshot: async value => snapshots.set(value.id, value),
    getOfflineSnapshot: async key => snapshots.get(key),
    renderLotFollowupLotOptions: () => {}, renderLotFollowup: () => {},
    console: { warn() {}, error() {} }
  });
  return { ...context, state, navigator, snapshots, messages, fail: error => { failure = error; } };
}

test('restores a previously downloaded follow-up after reconnecting offline', async () => {
  const h = harness();
  await h.loadLotFollowup();
  h.state.lotFollowupPlans = [];
  h.state.lotFollowupVisits = [];
  h.navigator.onLine = false;
  await h.loadLotFollowup();
  assert.equal(h.state.lotFollowupPlans[0].lot_code, '17');
  assert.equal(h.state.lotFollowupVisits[0].record_id, 'r1');
  assert.match(h.messages.at(-1), /Datos consultados el/);
});

test('does not reuse snapshots for another account, role or zone scope', async () => {
  const h = harness();
  await h.loadLotFollowup();
  const original = h.state.user;
  for (const user of [
    { ...original, id: 'two' },
    { ...original, role: 'admin' },
    { ...original, allowedZones: ['1'] }
  ]) {
    h.state.user = user;
    h.navigator.onLine = false;
    await assert.rejects(h.loadLotFollowup(), /No hay seguimiento guardado/);
    assert.equal(h.state.lotFollowupPlans.length, 0);
  }
  assert.equal(h.offlineSnapshotKey('x', original),
    h.offlineSnapshotKey('x', { ...original, allowedZones: ['1', '2'] }));
});

test('falls back on connection errors but not on permission errors', async () => {
  const h = harness();
  await h.loadLotFollowup();
  h.fail(Object.assign(new Error('red'), { connectionFailure: true }));
  await h.loadLotFollowup();
  assert.equal(h.state.lotFollowupPlans[0].lot_code, '17');
  h.fail(new Error('Sin permisos'));
  await assert.rejects(h.loadLotFollowup(), /Sin permisos/);
  assert.equal(h.state.lotFollowupPlans.length, 0);
});
